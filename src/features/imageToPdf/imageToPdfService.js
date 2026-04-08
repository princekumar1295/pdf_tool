import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer } from '../../utils/fileHelpers';

/**
 * Convert an array of image Files to a single PDF
 * Supports A4, Letter, and Original (image) page sizes.
 */
export async function imagesToPdf(imageFiles, options = {}) {
  const { pageSize = 'A4', margin = 0 } = options;

  const pdfDoc = await PDFDocument.create();

  for (const file of imageFiles) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const ext = file.name.split('.').pop().toLowerCase();

    let image;
    try {
      if (ext === 'jpg' || ext === 'jpeg' || file.type === 'image/jpeg') {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } else if (ext === 'png' || file.type === 'image/png') {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else {
        // Optimized conversion for other types (WEBP, etc)
        const blob = await convertToBlob(file);
        const buf = await blob.arrayBuffer();
        image = await pdfDoc.embedPng(buf);
      }
    } catch (err) {
      console.error(`Error embedding image ${file.name}:`, err);
      continue;
    }

    const { width: imgW, height: imgH } = image;

    let pageW, pageH;

    if (pageSize === 'Original') {
      pageW = imgW + margin * 2;
      pageH = imgH + margin * 2;
    } else {
      // Standard points: A4 (595x842), Letter (612x792)
      if (pageSize === 'Letter') {
        pageW = 612;
        pageH = 792;
      } else {
        // Default to A4
        pageW = 595;
        pageH = 842;
      }

      // Auto-orient based on image aspect ratio
      if (imgW > imgH && pageH > pageW) {
        [pageW, pageH] = [pageH, pageW];
      }
    }

    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;

    // Scale to fit while preserving aspect ratio
    const scale = Math.min(availW / imgW, availH / imgH, 1);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(image, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  return pdfDoc.save();
}

/**
 * More memory-efficient conversion than toDataURL
 */
async function convertToBlob(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}
