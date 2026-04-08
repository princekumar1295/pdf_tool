import { useState, useCallback } from 'react';
import { validateFiles, isValidPdf, isValidImage } from '../utils/fileHelpers';

/**
 * useFileUpload — manages drag-drop + file input state
 * @param {'pdf' | 'image' | 'any'} fileType
 * @param {boolean} multiple
 */
export function useFileUpload(fileType = 'any', multiple = true, options = {}) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const typeChecker = useCallback(
    (file) => {
      if (fileType === 'pdf') return isValidPdf(file);
      if (fileType === 'image') return isValidImage(file);
      return true;
    },
    [fileType]
  );

  const processFiles = useCallback(
    (incoming) => {
      setError(null);
      const list = Array.from(incoming ?? []);
      if (list.length === 0) return;

      const { valid, errors } = validateFiles(list, typeChecker, options);
      const nextValid = multiple ? valid : valid.slice(0, 1);
      const nextErrors = [...errors];

      if (!multiple && valid.length > 1) {
        nextErrors.push('Only one file is allowed for this tool; the first valid file was selected.');
      }

      if (nextErrors.length) {
        setError(nextErrors.join(' '));
      }

      if (nextValid.length) {
        setFiles((prev) => (multiple ? [...prev, ...nextValid] : nextValid));
      }
    },
    [multiple, options, typeChecker]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onInputChange = useCallback(
    (e) => {
      processFiles(e.target.files);
      e.target.value = '';
    },
    [processFiles]
  );

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  return {
    files,
    error,
    isDragging,
    setFiles,
    onDrop,
    onDragOver,
    onDragLeave,
    onInputChange,
    removeFile,
    clearFiles,
  };
}
