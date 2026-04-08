import { jsPDF } from 'jspdf';
import { loadPdfDocument, renderPdfPageToCanvas } from '../../utils/pdfHelpers';

const MIN_PASSWORD_LENGTH = 8;
const DEFAULT_RENDER_SCALE = 2;
const MIN_RENDER_SCALE = 0.75;
const MAX_RENDER_PIXELS = 8_000_000;
const JPEG_QUALITY = 0.9;
const USER_PERMISSIONS = ['print', 'modify', 'copy', 'annot-forms'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function releaseCanvas(canvas) {
  canvas.width = 1;
  canvas.height = 1;
}

function createOwnerPassword(userPassword) {
  const randomChunk = Math.random().toString(36).slice(2, 10);
  return `${userPassword}::owner::${Date.now()}::${randomChunk}`;
}

function getSafeRenderScale(page) {
  const baseViewport = page.getViewport({ scale: 1 });
  const basePixels = Math.max(1, baseViewport.width * baseViewport.height);
  const scaleByPixels = Math.sqrt(MAX_RENDER_PIXELS / basePixels);
  return clamp(scaleByPixels, MIN_RENDER_SCALE, DEFAULT_RENDER_SCALE);
}

function getPageSizeInPoints(page) {
  const viewport = page.getViewport({ scale: 1 });

  return {
    width: Math.max(1, Math.round(viewport.width)),
    height: Math.max(1, Math.round(viewport.height)),
  };
}

function toJpegDataUrl(canvas) {
  const flattenedCanvas = document.createElement('canvas');
  flattenedCanvas.width = canvas.width;
  flattenedCanvas.height = canvas.height;

  const context = flattenedCanvas.getContext('2d');
  if (!context) {
    releaseCanvas(flattenedCanvas);
    throw new Error('Unable to process page image for encryption.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, flattenedCanvas.width, flattenedCanvas.height);
  context.drawImage(canvas, 0, 0);

  const dataUrl = flattenedCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
  releaseCanvas(flattenedCanvas);
  return dataUrl;
}

/**
 * Apply a real open-password lock to a PDF.
 * Note: To ensure reliable browser compatibility, pages are rasterized.
 */
export async function lockPdfWithPassword(file, password, onProgress) {
  const normalizedPassword = String(password ?? '').trim();

  if (!normalizedPassword) {
    throw new Error('A password is required.');
  }

  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const pdf = await loadPdfDocument(file);
  const totalPages = pdf.numPages || 0;
  if (totalPages === 0) {
    throw new Error('The PDF has no pages to protect.');
  }

  let encryptedDoc = null;
  const ownerPassword = createOwnerPassword(normalizedPassword);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const renderScale = getSafeRenderScale(page);
    const canvas = await renderPdfPageToCanvas(page, renderScale);

    try {
      const pageSize = getPageSizeInPoints(page);
      const orientation = pageSize.width > pageSize.height ? 'landscape' : 'portrait';
      const imageDataUrl = toJpegDataUrl(canvas);

      if (!encryptedDoc) {
        encryptedDoc = new jsPDF({
          orientation,
          unit: 'pt',
          format: [pageSize.width, pageSize.height],
          compress: true,
          putOnlyUsedFonts: true,
          encryption: {
            userPassword: normalizedPassword,
            ownerPassword,
            userPermissions: USER_PERMISSIONS,
          },
        });
      } else {
        encryptedDoc.addPage([pageSize.width, pageSize.height], orientation);
      }

      encryptedDoc.addImage(
        imageDataUrl,
        'JPEG',
        0,
        0,
        pageSize.width,
        pageSize.height,
        undefined,
        'FAST'
      );
    } finally {
      releaseCanvas(canvas);
    }

    if (onProgress) {
      onProgress(pageNumber, totalPages);
    }
  }

  if (!encryptedDoc) {
    throw new Error('Unable to build protected PDF.');
  }

  const output = encryptedDoc.output('arraybuffer');
  return new Uint8Array(output);
}
