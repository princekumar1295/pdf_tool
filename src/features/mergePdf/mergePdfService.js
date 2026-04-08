import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer } from '../../utils/fileHelpers';

/**
 * Merge multiple PDF files into one PDF bytes array
 */
export async function mergePdfs(files) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
}
