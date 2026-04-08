import { readFileAsDataURL, readFileAsArrayBuffer } from '../utils/fileHelpers';

/**
 * Centralized file reading service
 */
export const fileService = {
  readAsDataURL: readFileAsDataURL,
  readAsArrayBuffer: readFileAsArrayBuffer,

  /**
   * Read multiple files as data URLs
   */
  readMultipleAsDataUrls: async (files) => {
    return Promise.all(files.map((f) => readFileAsDataURL(f)));
  },

  /**
   * Read multiple files as ArrayBuffers
   */
  readMultipleAsArrayBuffers: async (files) => {
    return Promise.all(files.map((f) => readFileAsArrayBuffer(f)));
  },
};
