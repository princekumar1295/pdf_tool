import { useCallback } from 'react';
import { Download, Layers, RefreshCw } from 'lucide-react';
import DragDrop from '../../components/common/DragDrop';
import FilePreview from '../../components/common/FilePreview';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useApp } from '../../context/useApp';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useConverter } from '../../hooks/useConverter';
import { mergePdfs } from './mergePdfService';
import { downloadBlob } from '../../utils/fileHelpers';
import '../feature.css';

export default function MergePdf() {
  const { startProcessing, stopProcessing, addNotification } = useApp();
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, removeFile, clearFiles } =
    useFileUpload('pdf', true);

  const convertFn = useCallback(async (selectedFiles) => mergePdfs(selectedFiles), []);
  const { run, isProcessing, result, error: convError, isDone, reset } = useConverter(convertFn);

  const handleMerge = async () => {
    if (files.length < 2) return;

    startProcessing('Merging PDFs...');

    try {
      await run(files);
    } catch (err) {
      addNotification(`Failed to merge PDFs: ${err.message}`, 'error');
    } finally {
      stopProcessing();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'application/pdf' });
    downloadBlob(blob, 'merged.pdf');
  };

  const handleReset = () => {
    clearFiles();
    reset();
  };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon"><Layers size={24} /></div>
        <h1>Merge <span className="gradient-text">PDFs</span></h1>
        <p>Combine multiple PDF files into one document in seconds</p>
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
              accept=".pdf"
              multiple
              label="Drag & drop PDF files here"
              subLabel={`${files.length} file${files.length !== 1 ? 's' : ''} selected - add more to merge`}
              inputId="merge-pdf-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            {files.length < 2 && files.length > 0 && <p className="feature-hint">Add at least 2 PDF files to merge.</p>}
            <FilePreview files={files} onRemove={removeFile} />
          </div>

          {isProcessing ? (
            <Loader label="Merging PDFs..." />
          ) : (
            <div className="action-row">
              <Button variant="primary" size="lg" onClick={handleMerge} disabled={files.length < 2} icon={Layers}>
                Merge {files.length > 0 ? `${files.length} ` : ''}PDFs
              </Button>
              {files.length > 0 && <Button variant="ghost" onClick={clearFiles}>Clear all</Button>}
            </div>
          )}
        </>
      ) : (
        <div className="result-section card">
          <div className="result-success">
            <div className="result-success__icon" aria-hidden="true">&check;</div>
            <h3>PDFs Merged Successfully!</h3>
            <p>{files.length} files merged into one document</p>
          </div>
          <div className="action-row">
            <Button variant="primary" size="lg" onClick={handleDownload} icon={Download}>Download Merged PDF</Button>
            <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>Merge more</Button>
          </div>
        </div>
      )}
    </div>
  );
}
