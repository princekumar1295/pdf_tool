import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker so PDF features keep working offline.
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

/**
 * Load a PDF document from a File object
 */
export async function loadPdfDocument(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return loadingTask.promise;
}

/**
 * Render a single PDF page to a canvas
 * @param {PDFPageProxy} page
 * @param {number} scale
 */
export async function renderPdfPageToCanvas(page, scale = 2.0) {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to render PDF page preview.');
  }

  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas;
}

function canvasToBlob(canvas, format = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Unable to export rendered PDF page.'));
    }, format, quality);
  });
}

export function createPreviewDataUrlFromCanvas(canvas, maxWidth = 320, format = 'image/jpeg', quality = 0.82) {
  const scale = Math.min(1, maxWidth / canvas.width);

  if (scale === 1) {
    return canvas.toDataURL(format, quality);
  }

  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  previewCanvas.height = Math.max(1, Math.round(canvas.height * scale));

  const previewContext = previewCanvas.getContext('2d');
  if (!previewContext) {
    throw new Error('Unable to create PDF page preview.');
  }

  previewContext.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);

  return previewCanvas.toDataURL(format, quality);
}

/**
 * Render a single PDF page to binary image data
 * @param {PDFPageProxy} page
 * @param {number} scale
 * @param {string} format - 'image/png' | 'image/jpeg'
 */
export async function renderPdfPageToImageBytes(page, scale = 2.0, format = 'image/png') {
  const canvas = await renderPdfPageToCanvas(page, scale);
  const blob = await canvasToBlob(canvas, format);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  return { bytes, canvas };
}

/**
 * Render a single PDF page to a canvas data URL
 * @param {PDFPageProxy} page
 * @param {number} scale
 * @param {string} format - 'image/png' | 'image/jpeg'
 */
export async function renderPdfPageToDataUrl(page, scale = 2.0, format = 'image/png') {
  const canvas = await renderPdfPageToCanvas(page, scale);

  return canvas.toDataURL(format, 0.92);
}

/**
 * Render a single PDF page to a canvas data URL
 * @param {PDFDocumentProxy} pdf
 * @param {number} pageNum - 1-indexed
 * @param {number} scale
 * @param {string} format - 'image/png' | 'image/jpeg'
 */
export async function renderPageToDataUrl(pdf, pageNum, scale = 2.0, format = 'image/png') {
  const page = await pdf.getPage(pageNum);
  return renderPdfPageToDataUrl(page, scale, format);
}

/**
 * Render all pages of a PDF to data URLs
 */
export async function renderAllPagesToDataUrls(pdf, scale = 1.5, format = 'image/png', onProgress) {
  const results = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const dataUrl = await renderPageToDataUrl(pdf, i, scale, format);
    results.push({ page: i, dataUrl });

    if (onProgress) onProgress(i, pdf.numPages);
  }

  return results;
}

/**
 * Extract all text content from a PDF
 */
function normalizeTextItem(item) {
  const transform = Array.isArray(item.transform) ? item.transform : [0, 0, 0, 0, 0, 0];
  const x = Number.isFinite(transform[4]) ? transform[4] : 0;
  const y = Number.isFinite(transform[5]) ? transform[5] : 0;
  const width = Number.isFinite(item.width) ? Math.abs(item.width) : 0;
  const fallbackHeight = Math.max(Math.abs(transform[0] || 0), Math.abs(transform[3] || 0), 10);
  const height = Number.isFinite(item.height) ? Math.abs(item.height) : fallbackHeight;

  return {
    text: item.str,
    x,
    y,
    width,
    height: height || fallbackHeight,
    endX: x + width,
    hasEOL: Boolean(item.hasEOL),
    fontSize: Math.max(6, Math.min(72, height || fallbackHeight)),
  };
}

function isSameVisualLine(prevItem, item) {
  const avgHeight = ((prevItem?.height || 0) + (item?.height || 0)) / 2 || 10;
  return Math.abs(prevItem.y - item.y) <= Math.max(2, avgHeight * 0.5);
}

function estimateCharWidth(item) {
  const visibleLength = item.text.replace(/\s+/g, '').length || item.text.length || 1;
  return item.width > 0 ? item.width / visibleLength : 4;
}

function getSpacingBetweenItems(prevItem, item) {
  if (!prevItem) return '';
  if (/\s$/.test(prevItem.text) || /^\s/.test(item.text)) return '';
  if (/[-/]$/.test(prevItem.text)) return '';
  if (/^[,.;:!?%)\]}]/.test(item.text)) return '';

  const gap = item.x - prevItem.endX;
  const avgCharWidth = Math.max(1, (estimateCharWidth(prevItem) + estimateCharWidth(item)) / 2);

  if (gap <= avgCharWidth * 0.2) return '';
  if (gap <= avgCharWidth * 1.6) return ' ';

  return ' '.repeat(Math.min(6, Math.max(1, Math.round(gap / avgCharWidth))));
}

function appendRun(runs, text, fontSize) {
  if (!text) return;

  const size = Math.max(12, Math.round(fontSize * 2));
  const previousRun = runs[runs.length - 1];

  if (previousRun && previousRun.size === size) {
    previousRun.text += text;
    return;
  }

  runs.push({ text, size });
}

function trimTrailingWhitespaceFromRuns(runs) {
  const nextRuns = runs.map((run) => ({ ...run }));

  while (nextRuns.length > 0) {
    const lastRun = nextRuns[nextRuns.length - 1];
    const trimmedText = lastRun.text.replace(/[ \t]+$/g, '');

    if (trimmedText) {
      lastRun.text = trimmedText;
      break;
    }

    nextRuns.pop();
  }

  return nextRuns;
}

function buildLineText(items) {
  const sortedItems = [...items].sort((a, b) => a.x - b.x);
  let lineText = '';
  let prevItem = null;
  const runs = [];

  for (const item of sortedItems) {
    const segmentText = `${getSpacingBetweenItems(prevItem, item)}${item.text}`;
    lineText += segmentText;
    appendRun(runs, segmentText, item.fontSize);
    prevItem = item;
  }

  return {
    text: lineText.replace(/[ \t]+$/g, ''),
    runs: trimTrailingWhitespaceFromRuns(runs),
  };
}

function trimBlankLines(lines) {
  const getLineText = (line) => (typeof line === 'string' ? line : line?.text ?? '');
  let start = 0;
  let end = lines.length;

  while (start < end && !getLineText(lines[start]).trim()) start += 1;
  while (end > start && !getLineText(lines[end - 1]).trim()) end -= 1;

  return lines.slice(start, end);
}

function buildPageLines(items) {
  const normalizedItems = items
    .filter((item) => typeof item?.str === 'string' && item.str.length > 0)
    .map(normalizeTextItem);

  if (normalizedItems.length === 0) return [];

  const groupedLines = [];
  let currentLine = [];

  for (const item of normalizedItems) {
    const prevItem = currentLine[currentLine.length - 1];

    if (prevItem && !isSameVisualLine(prevItem, item)) {
      groupedLines.push(currentLine);
      currentLine = [];
    }

    currentLine.push(item);

    if (item.hasEOL) {
      groupedLines.push(currentLine);
      currentLine = [];
    }
  }

  if (currentLine.length > 0) {
    groupedLines.push(currentLine);
  }

  const lines = [];
  let previousLineMeta = null;

  for (const lineItems of groupedLines) {
    const lineContent = buildLineText(lineItems);
    const avgY = lineItems.reduce((sum, item) => sum + item.y, 0) / lineItems.length;
    const avgHeight = lineItems.reduce((sum, item) => sum + item.height, 0) / lineItems.length;

    if (previousLineMeta) {
      const verticalGap = Math.abs(previousLineMeta.y - avgY);
      const paragraphGap = Math.max(previousLineMeta.height, avgHeight) * 1.8;

      if (verticalGap > paragraphGap && lines[lines.length - 1] !== '') {
        lines.push({ text: '', runs: [] });
      }
    }

    lines.push(lineContent);
    previousLineMeta = { y: avgY, height: avgHeight };
  }

  return trimBlankLines(lines);
}

export async function extractTextPagesFromPdf(pdf, onProgress) {
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const contentLines = buildPageLines(textContent.items);
    pages.push({
      pageNumber: i,
      lines: contentLines.map((line) => line.text),
      contentLines,
    });

    if (onProgress) onProgress(i, pdf.numPages);
  }

  return pages;
}

export async function extractTextFromPdf(pdf, onProgress) {
  const pages = await extractTextPagesFromPdf(pdf, onProgress);
  return pages.map((page) => page.lines.join('\n')).join('\n\n');
}

/**
 * Get PDF thumbnail (first page) as data URL
 */
export async function getPdfThumbnail(file, scale = 0.5) {
  const pdf = await loadPdfDocument(file);
  return renderPageToDataUrl(pdf, 1, scale, 'image/jpeg');
}
