import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileAsArrayBuffer } from '../../utils/fileHelpers';

/**
 * Apply a set of modifications (text, images, shapes, signatures) to a PDF
 * Supports multi-line text, alignment, opacity, and primitive shapes.
 */
export async function applyModificationsToPdf(pdfFile, modifications) {
  const pdfBytes = await readFileAsArrayBuffer(pdfFile);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  const fontLib = {
    helvetica: {
      normal: await pdfDoc.embedFont(StandardFonts.Helvetica),
      bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
      boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
    },
    times: {
      normal: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
      boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
    },
    courier: {
      normal: await pdfDoc.embedFont(StandardFonts.Courier),
      bold: await pdfDoc.embedFont(StandardFonts.CourierBold),
      italic: await pdfDoc.embedFont(StandardFonts.CourierOblique),
      boldItalic: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
    }
    // Note: To support Inter/Roboto, we'd need to fetch and embed the actual TTF/OTF files.
    // For this client-side demo, we'll map them to the closest high-quality standard fonts 
    // or assume we are fallbacking to Helvetica for now. (StandardFonts only includes 14)
  };

  for (const mod of modifications) {
    const page = pages[mod.pageIndex];
    if (!page) continue;

    const { height: pH } = page.getSize();
    const xBase = mod.x;
    const yTop = pH - mod.y;
    const op = mod.opacity !== undefined ? mod.opacity : 1;

    if (mod.type === 'text') {
      const family = fontLib[mod.fontFamily] || fontLib.helvetica;
      let font = family.normal;
      if (mod.bold && mod.italic) font = family.boldItalic;
      else if (mod.bold) font = family.bold;
      else if (mod.italic) font = family.italic;

      const fontSize = mod.fontSize || 12;
      const lines = (mod.content || '').split('\n');
      const lineHeight = fontSize * 1.2;
      const align = mod.textAlign || 'left';

      const lineWidths = lines.map(line => font.widthOfTextAtSize(line || ' ', fontSize));
      const maxWidth = Math.max(...lineWidths, 0);

      if (mod.showBackground) {
        page.drawRectangle({
          x: xBase - 4,
          y: yTop - (lines.length * lineHeight) - 4,
          width: maxWidth + 12,
          height: (lines.length * lineHeight) + 8,
          color: rgb(1, 1, 1), 
          opacity: op,
        });
      }

      lines.forEach((line, i) => {
        let xOffset = 0;
        if (align === 'center') xOffset = (maxWidth - lineWidths[i]) / 2;
        else if (align === 'right') xOffset = maxWidth - lineWidths[i];

        page.drawText(line || '', {
          x: xBase + xOffset,
          y: yTop - (i + 1) * lineHeight + (lineHeight * 0.15),
          size: fontSize,
          font,
          color: hexToRgb(mod.color || '#000000'),
          opacity: op,
        });
      });
    } else if (mod.type === 'image' || mod.type === 'signature') {
      let image;
      if (mod.type === 'signature' && typeof mod.preview === 'string') {
          const resp = await fetch(mod.preview);
          const buf = await resp.arrayBuffer();
          image = await pdfDoc.embedPng(buf);
      } else {
          image = await embedAnyImage(pdfDoc, mod.file);
      }
      
      const { width: imgW, height: imgH } = image;
      const drawW = mod.width || 150;
      const drawH = (imgH / imgW) * drawW;

      page.drawImage(image, {
        x: xBase,
        y: yTop - drawH,
        width: drawW,
        height: drawH,
        opacity: op,
      });
    } else if (mod.type === 'shape') {
      const color = hexToRgb(mod.color || '#000000');
      const borderSize = mod.borderSize || 2;
      
      if (mod.shape === 'rect') {
        page.drawRectangle({
          x: xBase,
          y: yTop - (mod.height || 100),
          width: mod.width || 100,
          height: mod.height || 100,
          borderColor: color,
          borderWidth: borderSize,
          opacity: op,
        });
      } else if (mod.shape === 'circle') {
        page.drawCircle({
            x: xBase + (mod.radius || 50),
            y: yTop - (mod.radius || 50),
            radius: mod.radius || 50,
            borderColor: color,
            borderWidth: borderSize,
            opacity: op,
        });
      } else if (mod.shape === 'line') {
          page.drawLine({
              start: { x: xBase, y: yTop },
              end: { x: xBase + (mod.width || 100), y: yTop - (mod.height || 100) },
              color,
              thickness: borderSize,
              opacity: op,
          });
      }
    }
  }

  return pdfDoc.save();
}

async function embedAnyImage(pdfDoc, file) {
  const bytes = await readFileAsArrayBuffer(file);
  const ext = file.name.split('.').pop().toLowerCase();
  try {
    if (ext === 'jpg' || ext === 'jpeg') return await pdfDoc.embedJpg(bytes);
    if (ext === 'png') return await pdfDoc.embedPng(bytes);
  } catch (e) { console.warn('Direct embedding failed', e); }
  const dataUrl = await convertToPng(file);
  const resp = await fetch(dataUrl);
  const buf = await resp.arrayBuffer();
  return await pdfDoc.embedPng(buf);
}

async function convertToPng(file) {
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
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}
