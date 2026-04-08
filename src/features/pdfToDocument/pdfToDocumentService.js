import { AlignmentType, Document, ImageRun, Packer, Paragraph, PageOrientation } from 'docx';
import JSZip from 'jszip';
import { createWorker } from 'tesseract.js';
import { downloadBlob } from '../../utils/fileHelpers';
import { createPreviewDataUrlFromCanvas, loadPdfDocument, renderPdfPageToCanvas } from '../../utils/pdfHelpers';

const PDF_POINTS_TO_TWIPS = 20;
const PDF_POINTS_TO_PIXELS = 96 / 72;
const RENDER_SCALE = 2.5;
const MIN_RENDER_SCALE = 0.05;
const PREVIEW_MAX_WIDTH = 320;
const MAX_WORD_PAGE_TWIPS = 31680;
const MAX_RENDER_PIXELS = 12000000;
const MAX_RENDER_EDGE_PIXELS = 8192;
const RENDER_RETRY_ATTEMPTS = 3;
const RENDER_RETRY_SCALE_FACTOR = 0.72;
const COMPACT_RENDER_SCALE_CAP = 1.15;
const PRESERVE_IMAGE_FORMAT = 'image/png';
const PRESERVE_IMAGE_QUALITY = 0.92;
const MIN_PRESERVE_PAGE_IMAGE_BYTES = 350 * 1024;
const MAX_PRESERVE_PAGE_IMAGE_BYTES = 14 * 1024 * 1024;
const MAX_DOCX_IMAGE_BYTES_TARGET = 120 * 1024 * 1024;
const MAX_DOCX_IMAGE_BYTES_TARGET_COMPACT = 90 * 1024 * 1024;
const MAX_DOCX_BLOB_BYTES_SOFT_LIMIT = 150 * 1024 * 1024;
const PREVIEW_DATA_URL_MAX_PAGES_DEFAULT = 6;
const PRESERVE_SCALE_STEPS_STRICT = [1];
const PRESERVE_SCALE_STEPS_BALANCED = [1, 0.95, 0.9, 0.85];
const PRESERVE_SCALE_STEPS_COMPACT_FIRST = [0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.8, 0.9, 1];
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_BLOB_RETRY_ATTEMPTS = 2;
const BASE64_DECODE_CHUNK_SIZE = 8192;
const DOCX_DEEP_VALIDATION_MAX_BYTES = 90 * 1024 * 1024;
const DOCX_REQUIRED_ENTRIES = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'];
const DOCX_XML_ENTRIES_TO_VALIDATE = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'];
const ZIP_FILE_HEADER_P = 0x50;
const ZIP_FILE_HEADER_K = 0x4b;
const NON_RECOVERABLE_PDF_ERROR_PATTERN = /password|corrupt|malformed|invalid pdf|unable to open|unsupported|encrypted/i;
const OCR_FALLBACK_ERROR_PATTERN = /ocr|tesseract|worker|recognize|language|failed to fetch|network|download/i;

function sanitizeDocxText(value) {
  const input = String(value ?? '');
  let output = '';

  for (let i = 0; i < input.length; i++) {
    const codeUnit = input.charCodeAt(i);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = input.charCodeAt(i + 1);

      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        output += input[i] + input[i + 1];
        i += 1;
      }

      continue;
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      continue;
    }

    const isXmlSafeChar =
      codeUnit === 0x09 ||
      codeUnit === 0x0a ||
      codeUnit === 0x0d ||
      (codeUnit >= 0x20 && codeUnit <= 0xd7ff) ||
      (codeUnit >= 0xe000 && codeUnit <= 0xfffd);

    if (isXmlSafeChar) {
      output += input[i];
    }
  }

  return output;
}

function hasInvalidXmlControlChars(value) {
  const input = String(value ?? '');

  for (let i = 0; i < input.length; i++) {
    const codeUnit = input.charCodeAt(i);
    const isAsciiControl = codeUnit <= 0x1f && codeUnit !== 0x09 && codeUnit !== 0x0a && codeUnit !== 0x0d;
    const isC1Control = codeUnit >= 0x7f && codeUnit <= 0x9f;

    if (isAsciiControl || isC1Control) {
      return true;
    }
  }

  return false;
}

export const PDF_DOCUMENT_MODES = {
  PRESERVE: 'preserve',
  OCR: 'ocr',
};

function getPageLayout(page) {
  const viewport = page.getViewport({ scale: 1 });
  const wordScale = Math.min(
    1,
    MAX_WORD_PAGE_TWIPS / Math.max(viewport.width * PDF_POINTS_TO_TWIPS, viewport.height * PDF_POINTS_TO_TWIPS)
  );
  const pageWidthTwips = Math.round(viewport.width * PDF_POINTS_TO_TWIPS * wordScale);
  const pageHeightTwips = Math.round(viewport.height * PDF_POINTS_TO_TWIPS * wordScale);
  const imageWidth = Math.max(1, Math.round(viewport.width * PDF_POINTS_TO_PIXELS * wordScale));
  const imageHeight = Math.max(1, Math.round(viewport.height * PDF_POINTS_TO_PIXELS * wordScale));

  return {
    pageWidthTwips,
    pageHeightTwips,
    imageWidth,
    imageHeight,
    orientation: pageWidthTwips > pageHeightTwips ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
  };
}

function getRenderScale(page, preferCompact = false) {
  const viewport = page.getViewport({ scale: 1 });
  const basePixels = Math.max(1, viewport.width * viewport.height);
  const maxEdge = Math.max(1, viewport.width, viewport.height);
  const byPixelsScale = Math.sqrt(MAX_RENDER_PIXELS / basePixels);
  const byEdgeScale = MAX_RENDER_EDGE_PIXELS / maxEdge;
  const preferredCap = preferCompact ? COMPACT_RENDER_SCALE_CAP : RENDER_SCALE;

  return Math.max(MIN_RENDER_SCALE, Math.min(preferredCap, byPixelsScale, byEdgeScale));
}

function normalizeOcrText(text) {
  return sanitizeDocxText(text)
    .split('\u000c')
    .join('')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function renderPdfPageWithRetry(page, scale) {
  let attemptScale = scale;
  let lastError = null;

  for (let attempt = 0; attempt < RENDER_RETRY_ATTEMPTS; attempt++) {
    try {
      return await renderPdfPageToCanvas(page, attemptScale);
    } catch (error) {
      lastError = error;
      attemptScale = Math.max(MIN_RENDER_SCALE, attemptScale * RENDER_RETRY_SCALE_FACTOR);
    }
  }

  throw new Error(lastError?.message || 'Unable to render PDF page.');
}

function canvasToBlob(canvas, format = PRESERVE_IMAGE_FORMAT, quality = PRESERVE_IMAGE_QUALITY) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to export rendered PDF page.'));
          return;
        }
        resolve(blob);
      },
      format,
      quality
    );
  });
}

function dataUrlToBytes(dataUrl) {
  const base64Marker = ';base64,';
  const markerIndex = dataUrl.indexOf(base64Marker);
  const base64 = markerIndex >= 0 ? dataUrl.slice(markerIndex + base64Marker.length) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function emitProgress(onProgress, cur, total) {
  if (!onProgress) return;
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;
  const safeCur = clampNumber(Number.isFinite(cur) ? cur : 0, 0, safeTotal);
  onProgress(safeCur, safeTotal);
}

function getPerPageImageByteLimit(totalPages, preferCompact = false) {
  const safePages = Math.max(1, Number.isFinite(totalPages) ? Math.floor(totalPages) : 1);
  const totalBudget = preferCompact ? MAX_DOCX_IMAGE_BYTES_TARGET_COMPACT : MAX_DOCX_IMAGE_BYTES_TARGET;
  const perPageTarget = Math.floor(totalBudget / safePages);
  return clampNumber(perPageTarget, MIN_PRESERVE_PAGE_IMAGE_BYTES, MAX_PRESERVE_PAGE_IMAGE_BYTES);
}

function createPreviewDataUrlSafely(canvas, pageNumber, previewLimit) {
  if (pageNumber > previewLimit) return null;

  try {
    return createPreviewDataUrlFromCanvas(canvas, PREVIEW_MAX_WIDTH);
  } catch {
    return null;
  }
}

function normalizeBase64Payload(value) {
  const input = String(value || '').trim();
  const commaIndex = input.indexOf(',');
  return commaIndex >= 0 ? input.slice(commaIndex + 1) : input;
}

function base64ToBytes(base64Input) {
  const base64 = normalizeBase64Payload(base64Input);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let offset = 0; offset < binary.length; offset += BASE64_DECODE_CHUNK_SIZE) {
    const end = Math.min(binary.length, offset + BASE64_DECODE_CHUNK_SIZE);
    for (let index = offset; index < end; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
  }

  return bytes;
}

async function canvasToImageBytes(canvas, format = PRESERVE_IMAGE_FORMAT, quality = PRESERVE_IMAGE_QUALITY) {
  try {
    const blob = await canvasToBlob(canvas, format, quality);
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    try {
      return dataUrlToBytes(canvas.toDataURL(format, quality));
    } catch {
      throw new Error('Unable to export rendered PDF page.');
    }
  }
}

function createScaledCanvas(sourceCanvas, scale) {
  const nextScale = Math.max(0.1, Math.min(1, scale));
  if (nextScale >= 0.999) {
    return sourceCanvas;
  }

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = Math.max(1, Math.round(sourceCanvas.width * nextScale));
  scaledCanvas.height = Math.max(1, Math.round(sourceCanvas.height * nextScale));
  const context = scaledCanvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to resize rendered PDF page.');
  }

  context.drawImage(sourceCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
  return scaledCanvas;
}

async function encodePageImageBytes(canvas, options = {}) {
  const preferCompact = Boolean(options.preferCompact);
  const preserveStrict = options.preserveStrict !== false;
  const maxBytes = Number.isFinite(options.maxBytes)
    ? clampNumber(options.maxBytes, MIN_PRESERVE_PAGE_IMAGE_BYTES, MAX_PRESERVE_PAGE_IMAGE_BYTES)
    : MAX_PRESERVE_PAGE_IMAGE_BYTES;
  const scaleSteps = preferCompact
    ? PRESERVE_SCALE_STEPS_COMPACT_FIRST
    : preserveStrict
      ? PRESERVE_SCALE_STEPS_STRICT
      : PRESERVE_SCALE_STEPS_BALANCED;
  let smallestBytes = null;

  for (const scaleStep of scaleSteps) {
    const workingCanvas = createScaledCanvas(canvas, scaleStep);
    try {
      const bytes = await canvasToImageBytes(workingCanvas, PRESERVE_IMAGE_FORMAT, PRESERVE_IMAGE_QUALITY);

      if (!smallestBytes || bytes.byteLength < smallestBytes.byteLength) {
        smallestBytes = bytes;
      }

      if (bytes.byteLength <= maxBytes) {
        return bytes;
      }
    } finally {
      if (workingCanvas !== canvas) {
        releaseCanvas(workingCanvas);
      }
    }
  }

  if (smallestBytes) {
    return smallestBytes;
  }

  throw new Error('Unable to export rendered PDF page.');
}

function releaseCanvas(canvas) {
  canvas.width = 1;
  canvas.height = 1;
}

async function ensureDocxBlob(blob) {
  if (!blob || typeof blob.size !== 'number' || blob.size < 4) {
    throw new Error('Generated DOCX is empty or invalid.');
  }

  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const isZipHeader =
    header[0] === ZIP_FILE_HEADER_P &&
    header[1] === ZIP_FILE_HEADER_K &&
    ((header[2] === 0x03 && header[3] === 0x04) ||
      (header[2] === 0x05 && header[3] === 0x06) ||
      (header[2] === 0x07 && header[3] === 0x08));

  if (!isZipHeader) {
    throw new Error('Generated DOCX package is invalid.');
  }

  if (blob.size > DOCX_DEEP_VALIDATION_MAX_BYTES) {
    return;
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(blob);
  } catch {
    throw new Error('Generated DOCX package is invalid.');
  }

  for (const entry of DOCX_REQUIRED_ENTRIES) {
    if (!zip.file(entry)) {
      throw new Error('Generated DOCX package is invalid.');
    }
  }

  for (const entry of DOCX_XML_ENTRIES_TO_VALIDATE) {
    const zipFile = zip.file(entry);
    if (!zipFile) {
      throw new Error('Generated DOCX package is invalid.');
    }

    const xmlText = await zipFile.async('text').catch(() => null);
    if (typeof xmlText !== 'string' || !xmlText.trim()) {
      throw new Error('Generated DOCX XML is invalid.');
    }

    if (hasInvalidXmlControlChars(xmlText)) {
      throw new Error('Generated DOCX XML contains invalid control characters.');
    }

    if (typeof DOMParser === 'function') {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(xmlText, 'application/xml');
      if (parsed.querySelector('parsererror')) {
        throw new Error('Generated DOCX XML is malformed.');
      }
    }
  }
}

async function packDocxBlob(doc) {
  let lastBlobError = null;

  for (let attempt = 0; attempt < DOCX_BLOB_RETRY_ATTEMPTS; attempt++) {
    try {
      return await Packer.toBlob(doc);
    } catch (error) {
      lastBlobError = error;
    }
  }

  try {
    const base64 = await Packer.toBase64String(doc);
    const bytes = base64ToBytes(base64);
    return new Blob([bytes], { type: DOCX_MIME_TYPE });
  } catch (base64Error) {
    if (lastBlobError) {
      throw lastBlobError;
    }
    throw base64Error;
  }
}

function shouldRetryInCompactMode(error) {
  if (typeof error?.code === 'string') {
    return true;
  }

  const rawMessage = String(error?.message || '');
  if (NON_RECOVERABLE_PDF_ERROR_PATTERN.test(rawMessage)) {
    return false;
  }

  const message = rawMessage.toLowerCase();
  return /render|export|image|docx|memory|quota|size|blob|invalid|failed|timeout|abort|large/.test(message);
}

function shouldFallbackFromOcrToPreserve(error) {
  const message = String(error?.message || '');
  if (NON_RECOVERABLE_PDF_ERROR_PATTERN.test(message)) {
    return false;
  }

  if (typeof error?.code === 'string') {
    return true;
  }

  return (
    OCR_FALLBACK_ERROR_PATTERN.test(message) ||
    /xml|docx|package|malformed|invalid|control characters|parsererror/i.test(message)
  );
}

function clampProgress(cur, total) {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;
  const safeCur = Number.isFinite(cur) ? cur : 0;
  return Math.max(0, Math.min(1, safeCur / safeTotal));
}

function mapProgressFromBaseline(onProgress, baseline = 0) {
  return (cur, total) => {
    if (!onProgress) return;

    const mappedRatio = baseline + clampProgress(cur, total) * (1 - baseline);
    onProgress(Math.round(mappedRatio * 1000), 1000);
  };
}

function createMonotonicProgressReporter(onProgress) {
  let maxRatio = 0;

  return {
    getRatio: () => maxRatio,
    report(cur, total) {
      if (!onProgress) return;

      maxRatio = Math.max(maxRatio, clampProgress(cur, total));
      onProgress(Math.round(maxRatio * 1000), 1000);
    },
    fromCurrentBaseline() {
      return mapProgressFromBaseline((cur, total) => this.report(cur, total), maxRatio);
    },
  };
}

/**
 * Convert PDF pages into layout-preserved images and optional OCR text.
 */
export async function extractPdfDocument(file, onProgress, options = {}) {
  const mode = options.mode === PDF_DOCUMENT_MODES.OCR ? PDF_DOCUMENT_MODES.OCR : PDF_DOCUMENT_MODES.PRESERVE;
  const preferCompactImages = options.preferCompactImages === true;
  const preserveStrict = options.preserveStrict !== false;
  const previewLimit =
    Number.isFinite(options.previewLimit) && options.previewLimit >= 0
      ? Math.floor(options.previewLimit)
      : PREVIEW_DATA_URL_MAX_PAGES_DEFAULT;
  const pdf = await loadPdfDocument(file);
  const pages = [];
  const totalWork = mode === PDF_DOCUMENT_MODES.OCR ? pdf.numPages * 2 : pdf.numPages;
  const perPageImageByteLimit =
    mode !== PDF_DOCUMENT_MODES.PRESERVE
      ? null
      : preferCompactImages
        ? getPerPageImageByteLimit(pdf.numPages, true)
        : MAX_PRESERVE_PAGE_IMAGE_BYTES;
  const worker = mode === PDF_DOCUMENT_MODES.OCR ? await createWorker('eng', 1) : null;

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const layout = getPageLayout(page);
      const renderScale = getRenderScale(page, preferCompactImages);
      const canvas = await renderPdfPageWithRetry(page, renderScale);
      try {
        const previewDataUrl = createPreviewDataUrlSafely(canvas, i, previewLimit);

        if (mode === PDF_DOCUMENT_MODES.OCR) {
          emitProgress(onProgress, i, totalWork);

          const { data } = await worker.recognize(canvas);

          pages.push({
            pageNumber: i,
            previewDataUrl,
            ocrText: normalizeOcrText(data?.text),
            ...layout,
          });

          emitProgress(onProgress, pdf.numPages + i, totalWork);
          continue;
        }

        const imageBytes = await encodePageImageBytes(canvas, {
          preferCompact: preferCompactImages,
          preserveStrict,
          maxBytes: perPageImageByteLimit,
        });

        pages.push({
          pageNumber: i,
          imageBytes,
          previewDataUrl,
          ...layout,
        });

        emitProgress(onProgress, i, totalWork);
      } finally {
        releaseCanvas(canvas);
      }
    }
  } finally {
    if (worker) await worker.terminate();
  }

  return { pages, totalPages: pdf.numPages, mode };
}

function stripBinaryPageData(pages) {
  return pages.map((page) => {
    const nextPage = { ...page };
    delete nextPage.imageBytes;
    return nextPage;
  });
}

function createImageSectionsFromPages(pages) {
  if (pages.length === 0) {
    return [
      {
        properties: {},
        children: [new Paragraph('')],
      },
    ];
  }

  return pages.map((page) => {
    if (!(page.imageBytes instanceof Uint8Array) || page.imageBytes.byteLength === 0) {
      throw new Error(`Unable to embed PDF page ${page.pageNumber} into DOCX.`);
    }

    return {
      properties: {
        page: {
          size: {
            width: page.pageWidthTwips,
            height: page.pageHeightTwips,
            orientation: page.orientation,
          },
          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            header: 0,
            footer: 0,
            gutter: 0,
          },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 0,
            after: 0,
          },
          children: [
            new ImageRun({
              data: page.imageBytes,
              transformation: {
                width: page.imageWidth,
                height: page.imageHeight,
              },
              altText: {
                title: `PDF page ${page.pageNumber}`,
                description: `PDF page ${page.pageNumber}`,
              },
            }),
          ],
        }),
      ],
    };
  });
}

function createOcrSectionsFromPages(pages) {
  if (pages.length === 0) {
    return [
      {
        properties: {},
        children: [new Paragraph('')],
      },
    ];
  }

  return pages.map((page) => {
    const rawText = normalizeOcrText(page.ocrText);
    const lines = rawText ? rawText.split('\n') : [''];
    const paragraphs = lines.map((line) => new Paragraph(sanitizeDocxText(line) || ''));

    return {
      properties: {
        page: {
          size: {
            width: page.pageWidthTwips,
            height: page.pageHeightTwips,
            orientation: page.orientation,
          },
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
            header: 0,
            footer: 0,
            gutter: 0,
          },
        },
      },
      children: paragraphs.length > 0 ? paragraphs : [new Paragraph('')],
    };
  });
}

export function createDocx(pages, mode = PDF_DOCUMENT_MODES.PRESERVE) {
  const sections =
    mode === PDF_DOCUMENT_MODES.OCR ? createOcrSectionsFromPages(pages) : createImageSectionsFromPages(pages);

  const doc = new Document({ sections });
  return packDocxBlob(doc);
}

export async function preparePdfDocument(file, onProgress, options = {}) {
  const requestedMode = options.mode === PDF_DOCUMENT_MODES.OCR ? PDF_DOCUMENT_MODES.OCR : PDF_DOCUMENT_MODES.PRESERVE;
  const previewLimit =
    Number.isFinite(options.previewLimit) && options.previewLimit >= 0
      ? Math.floor(options.previewLimit)
      : PREVIEW_DATA_URL_MAX_PAGES_DEFAULT;
  const progressReporter = createMonotonicProgressReporter(onProgress);
  const firstPassProgress = (cur, total) => progressReporter.report(cur, total);

  const buildOutput = async (mode, preferCompactImages, progressHandler, fallbackType = null) => {
    const { pages, totalPages } = await extractPdfDocument(file, progressHandler, {
      mode,
      preferCompactImages,
      preserveStrict: mode === PDF_DOCUMENT_MODES.PRESERVE && !preferCompactImages,
      previewLimit,
    });
    const blob = await createDocx(pages, mode);
    await ensureDocxBlob(blob);
    if (mode === PDF_DOCUMENT_MODES.PRESERVE && !preferCompactImages && blob.size > MAX_DOCX_BLOB_BYTES_SOFT_LIMIT) {
      throw new Error('Generated DOCX is too large; retrying with compact preserve mode.');
    }

    return {
      blob,
      pages: stripBinaryPageData(pages),
      totalPages,
      mode,
      requestedMode,
      fallbackUsed: Boolean(fallbackType),
      fallbackType,
    };
  };

  const buildPreserveWithFallback = async (initialProgressHandler, fallbackType) => {
    try {
      return await buildOutput(PDF_DOCUMENT_MODES.PRESERVE, false, initialProgressHandler, fallbackType);
    } catch (error) {
      if (!shouldRetryInCompactMode(error)) {
        throw error;
      }

      return buildOutput(
        PDF_DOCUMENT_MODES.PRESERVE,
        true,
        progressReporter.fromCurrentBaseline(),
        fallbackType ? `${fallbackType}_compact_retry` : 'preserve_compact_retry'
      );
    }
  };

  try {
    if (requestedMode === PDF_DOCUMENT_MODES.PRESERVE) {
      return await buildPreserveWithFallback(firstPassProgress, null);
    }

    return await buildOutput(PDF_DOCUMENT_MODES.OCR, false, firstPassProgress, null);
  } catch (error) {
    if (requestedMode === PDF_DOCUMENT_MODES.OCR && shouldFallbackFromOcrToPreserve(error)) {
      return buildPreserveWithFallback(progressReporter.fromCurrentBaseline(), 'ocr_to_preserve');
    }

    throw error;
  }
}

/**
 * Download DOCX file.
 */
export function downloadAsDocx(blob, filename = 'document.docx') {
  downloadBlob(blob, filename);
}
