import { createWorker } from 'tesseract.js';

/**
 * Perform OCR on a canvas or image URL
 * @param {HTMLCanvasElement|string} image - The source to scan
 * @param {function} onProgress - Progress callback (0 to 1)
 */
export async function performOcr(image, onProgress) {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress);
      }
    },
  });

  try {
    const { data: { text, words } } = await worker.recognize(image);
    
    // Convert Tesseract word-level coordinates to scaled PDF coordinates if needed
    // For now, we return the raw word data with bounding boxes
    return {
      fullText: text,
      words: words.map(w => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox, // { x0, y0, x1, y1 } in image px
      })),
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Detect if a PDF page likely needs OCR (contains no selectable text)
 * @param {PDFPageProxy} page 
 */
export async function needsOcr(page) {
  const textContent = await page.getTextContent();
  return textContent.items.length === 0;
}
