import imageCompression from 'browser-image-compression';

/**
 * Compress an image file
 * @param {File} file
 * @param {object} options
 * @returns {Promise<File>}
 */
export async function compressImage(file, options = {}, onProgress) {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    useWebWorker = true,
    quality = 0.8,
    fileType = file.type,
  } = options;

  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker,
    initialQuality: quality,
    fileType,
    onProgress,
  });
}
