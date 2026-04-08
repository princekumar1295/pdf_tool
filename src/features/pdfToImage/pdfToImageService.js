import { loadPdfDocument, renderAllPagesToDataUrls } from '../../utils/pdfHelpers';
import JSZip from 'jszip';
import { downloadBlob } from '../../utils/fileHelpers';

/**
 * Convert a PDF file to images (data URLs), one per page
 */
export async function pdfToImages(file, format = 'image/png', scale = 2.0, onProgress) {
  const pdf = await loadPdfDocument(file);
  const pages = await renderAllPagesToDataUrls(pdf, scale, format, onProgress);
  return { pages, totalPages: pdf.numPages };
}

/**
 * Download all pages as a ZIP archive
 */
export async function downloadAllAsZip(pages, baseName = 'pdf-pages', format = 'image/png') {
  const ext = format === 'image/jpeg' ? 'jpg' : 'png';
  const zip = new JSZip();

  for (const { page, dataUrl } of pages) {
    const base64 = dataUrl.split(',')[1];
    zip.file(`page-${String(page).padStart(3, '0')}.${ext}`, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${baseName}.zip`);
}
