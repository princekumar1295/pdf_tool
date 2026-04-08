import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer, downloadBlob } from '../../utils/fileHelpers';
import JSZip from 'jszip';

/**
 * Split a PDF by page ranges
 * @param {File} file
 * @param {Array<{start: number, end: number, name: string}>} ranges - 1-indexed
 */
export async function splitPdfByRanges(file, ranges) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const results = [];

  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const start = Math.max(0, range.start - 1);
    const end = Math.min(sourcePdf.getPageCount() - 1, range.end - 1);
    const indices = [];

    for (let i = start; i <= end; i++) indices.push(i);

    const copiedPages = await newPdf.copyPages(sourcePdf, indices);
    copiedPages.forEach((p) => newPdf.addPage(p));

    const bytes = await newPdf.save();
    results.push({ name: range.name || `pages-${range.start}-${range.end}.pdf`, bytes });
  }

  return results;
}

/**
 * Split each page into its own PDF and zip them
 */
export async function splitPdfAllPages(file) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const zip = new JSZip();
  const baseName = file.name.replace('.pdf', '');

  for (let i = 0; i < sourcePdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(sourcePdf, [i]);
    newPdf.addPage(page);
    const bytes = await newPdf.save();
    zip.file(`${baseName}-page-${String(i + 1).padStart(3, '0')}.pdf`, bytes);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${baseName}-split.zip`);
}
