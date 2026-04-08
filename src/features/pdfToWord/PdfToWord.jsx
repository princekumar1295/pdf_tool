import { useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import DragDrop from '../../components/common/DragDrop';
import FilePreview from '../../components/common/FilePreview';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useFileUpload } from '../../hooks/useFileUpload';
import { extractPdfText, downloadAsText } from './pdfToWordService';
import '../feature.css';
import './PdfToWord.css';

export default function PdfToWord() {
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, clearFiles } =
    useFileUpload('pdf', false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [convError, setConvError] = useState(null);

  const handleExtract = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setConvError(null);
    setResult(null);
    setProgress(0);
    try {
      const { text, totalPages } = await extractPdfText(files[0], (cur, total) => {
        setProgress(Math.round((cur / total) * 100));
      });
      setResult({ text, totalPages });
    } catch (err) {
      setConvError(err.message || 'Extraction failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const name = files[0]?.name?.replace(/\.pdf$/i, '.txt') || 'document.txt';
    downloadAsText(result.text, name);
  };

  const handleReset = () => { clearFiles(); setResult(null); setConvError(null); };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon"><FileText size={24} /></div>
        <h1>PDF to <span className="gradient-text">Text</span></h1>
        <p>Extract all text content from your PDF and export it as a document</p>
      </div>

      {!result ? (
        <>
          <div className="card">
            <DragDrop
              isDragging={isDragging}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onInputChange={onInputChange}
              accept=".pdf"
              multiple={false}
              label="Drag & drop a PDF here"
              inputId="pdf-to-word-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            <FilePreview files={files} />
          </div>

          {isProcessing ? (
            <Loader progress={progress} label={`Extracting text... ${progress}%`} />
          ) : (
            <div className="action-row">
              <Button variant="primary" size="lg" onClick={handleExtract} disabled={files.length === 0} icon={FileText}>
                Extract Text
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="result-section">
          <div className="card">
            <div className="result-success">
              <div className="result-success__icon">✓</div>
              <h3>Text Extracted!</h3>
              <p>{result.totalPages} page{result.totalPages !== 1 ? 's' : ''} processed</p>
            </div>
            <div className="action-row">
              <Button variant="primary" size="lg" onClick={handleDownload} icon={Download}>Download .txt</Button>
              <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>Extract another</Button>
            </div>
          </div>
          <div className="card pdf-word-preview">
            <p className="pdf-word-preview__label">Preview</p>
            <pre className="pdf-word-preview__text">{result.text.slice(0, 2000)}{result.text.length > 2000 ? '\n\n[... truncated for preview ...]' : ''}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
