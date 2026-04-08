import { loadPdfDocument, extractTextFromPdf } from '../../utils/pdfHelpers';
import { downloadBlob } from '../../utils/fileHelpers';

/**
 * Extract text from PDF and return it as a string
 */
export async function extractPdfText(file, onProgress) {
  const pdf = await loadPdfDocument(file);
  const text = await extractTextFromPdf(pdf, onProgress);
  return { text, totalPages: pdf.numPages };
}

/**
 * Download extracted text as a .txt file
 */
export function downloadAsText(text, filename = 'document.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}
