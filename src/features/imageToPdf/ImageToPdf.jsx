import { useState, useCallback } from 'react';
import { Download, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/useApp';
import DragDrop from '../../components/common/DragDrop';
import FilePreview from '../../components/common/FilePreview';
import Button from '../../components/common/Button';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useConverter } from '../../hooks/useConverter';
import { imagesToPdf } from './imageToPdfService';
import { downloadBlob } from '../../utils/fileHelpers';
import '../feature.css';

export default function ImageToPdf() {
  const { startProcessing, stopProcessing, addNotification } = useApp();
  const [pageSize, setPageSize] = useState('A4');
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, removeFile, clearFiles } =
    useFileUpload('image', true);

  const convertFn = useCallback(async (selectedFiles) => {
    return imagesToPdf(selectedFiles, { pageSize });
  }, [pageSize]);

  const { run, isProcessing, result, error: convError, isDone, reset } = useConverter(convertFn);

  const handleConvert = async () => {
    if (files.length === 0) return;

    startProcessing('Converting images to PDF...');

    try {
      await run(files);
    } catch (err) {
      addNotification(`Failed to convert images: ${err.message}`, 'error');
    } finally {
      stopProcessing();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'application/pdf' });
    downloadBlob(blob, 'converted.pdf');
  };

  const handleReset = () => {
    clearFiles();
    reset();
  };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon">
          <ImageIcon size={24} />
        </div>
        <h1>Image to <span className="gradient-text">PDF</span></h1>
        <p>Convert JPG, PNG, WEBP images into a single PDF document</p>
      </div>

      {!isDone ? (
        <>
          <div className="card">
            <DragDrop
              isDragging={isDragging}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onInputChange={onInputChange}
              accept="image/*"
              multiple
              label="Drag & drop images here"
              subLabel="JPG, PNG, WEBP supported"
              inputId="image-to-pdf-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            <FilePreview files={files} onRemove={removeFile} showThumbnails />
          </div>

          {files.length > 0 && (
            <div className="card feature-options">
              <p className="feature-options__label">Page Size</p>
              <div className="feature-toggle-group">
                <button
                  className={`feature-toggle${pageSize === 'A4' ? ' active' : ''}`}
                  onClick={() => setPageSize('A4')}
                >
                  A4 (Standard)
                </button>
                <button
                  className={`feature-toggle${pageSize === 'Letter' ? ' active' : ''}`}
                  onClick={() => setPageSize('Letter')}
                >
                  Letter
                </button>
                <button
                  className={`feature-toggle${pageSize === 'Original' ? ' active' : ''}`}
                  onClick={() => setPageSize('Original')}
                >
                  Fit Image
                </button>
              </div>
            </div>
          )}

          <div className="action-row">
            <Button
              variant="primary"
              size="lg"
              onClick={handleConvert}
              disabled={files.length === 0}
              loading={isProcessing}
              icon={ImageIcon}
            >
              Convert to PDF
            </Button>
            {files.length > 0 && (
              <Button variant="ghost" onClick={clearFiles} disabled={isProcessing}>
                Clear all
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="result-section card">
          <div className="result-success">
            <div className="result-success__icon" aria-hidden="true">&check;</div>
            <h3>PDF Created Successfully!</h3>
            <p>{files.length} image{files.length !== 1 ? 's' : ''} converted into a PDF</p>
          </div>
          <div className="action-row">
            <Button variant="primary" size="lg" onClick={handleDownload} icon={Download}>
              Download PDF
            </Button>
            <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>
              Convert more
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
