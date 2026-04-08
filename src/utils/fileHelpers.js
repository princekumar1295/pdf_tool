import { MAX_FILE_SIZE_BYTES, ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPE } from './constants';

const DOWNLOAD_URL_REVOKE_DELAY_MS = 120000;

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Get file extension (lowercase, no dot)
 */
export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExt(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Check if file is valid image
 */
export function isValidImage(file) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Check if file is valid PDF
 */
export function isValidPdf(file) {
  return file.type === ACCEPTED_PDF_TYPE || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check if file size is within limit
 */
export function isFileSizeValid(file, maxFileSizeBytes = MAX_FILE_SIZE_BYTES) {
  return file.size <= maxFileSizeBytes;
}

/**
 * Read file as ArrayBuffer
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read file as Data URL
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Trigger browser download of a blob
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_REVOKE_DELAY_MS);
}

/**
 * Download a data URL
 */
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Validate a list of files with a given type checker
 */
export function validateFiles(files, typeChecker, options = {}) {
  const errors = [];
  const valid = [];
  const maxFileSizeBytes = options.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES;
  const sizeLimitLabel = options.sizeLimitLabel ?? `${Math.round(maxFileSizeBytes / (1024 * 1024))}MB`;

  for (const file of files) {
    if (!isFileSizeValid(file, maxFileSizeBytes)) {
      errors.push(`"${file.name}" exceeds the ${sizeLimitLabel} size limit.`);
    } else if (!typeChecker(file)) {
      errors.push(`"${file.name}" is not a supported file type.`);
    } else {
      valid.push(file);
    }
  }

  return { valid, errors };
}
