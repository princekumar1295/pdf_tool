import { useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import DragDrop from '../../components/common/DragDrop';
import FilePreview from '../../components/common/FilePreview';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useFileUpload } from '../../hooks/useFileUpload';
import { downloadAsDocx, PDF_DOCUMENT_MODES, preparePdfDocument } from './pdfToDocumentService';
import '../feature.css';
import './PdfToDocument.css';

const PREVIEW_PAGE_LIMIT = 6;
const MAX_DOCUMENT_SIZE_MB = 200;

function getConversionErrorMessage(error) {
  const message = String(error?.message || '');

  if (/password/i.test(message)) {
    return 'This PDF is password protected. Unlock it first, then try again.';
  }

  if (/docx package is invalid|docx is empty|invalid docx|docx xml|generated docx xml|control characters/i.test(message)) {
    return 'The document package was invalid for this PDF. Try again; the converter uses a compatibility fallback automatically.';
  }

  if (/invalid|corrupt|malformed/i.test(message)) {
    return 'This PDF could not be opened. It may be damaged or use an unsupported structure.';
  }

  if (/render|export|resize|document|blob|image|memory|quota|size/i.test(message)) {
    return 'The PDF opened, but the DOCX could not be prepared. Try a smaller file or a simpler PDF.';
  }

  return 'Document conversion failed. Try another PDF file.';
}

export default function PdfToDocument() {
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, clearFiles } =
    useFileUpload('pdf', false, {
      maxFileSizeBytes: MAX_DOCUMENT_SIZE_MB * 1024 * 1024,
      sizeLimitLabel: `${MAX_DOCUMENT_SIZE_MB}MB`,
    });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [convError, setConvError] = useState(null);
  const [conversionMode, setConversionMode] = useState(PDF_DOCUMENT_MODES.PRESERVE);

  const handleExtract = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setConvError(null);
    setResult(null);
    setProgress(0);

    try {
      const output = await preparePdfDocument(
        files[0],
        (cur, total) => {
          setProgress(Math.round((cur / total) * 100));
        },
        { mode: conversionMode, previewLimit: PREVIEW_PAGE_LIMIT }
      );

      setResult(output);
    } catch (err) {
      setConvError(getConversionErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const name = files[0]?.name?.replace(/\.pdf$/i, '.docx') || 'document.docx';
    downloadAsDocx(result.blob, name);
  };

  const handleReset = () => {
    clearFiles();
    setResult(null);
    setConvError(null);
  };

  const previewPages = result ? result.pages.slice(0, PREVIEW_PAGE_LIMIT) : [];

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon"><FileText size={24} /></div>
        <h1>PDF to <span className="gradient-text">Document</span></h1>
        <p>Convert text, scanned, image-based, and mixed-layout PDFs into a DOCX while keeping the original page design</p>
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
              inputId="pdf-to-document-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            <FilePreview files={files} />
          </div>

          <div className="info-banner">
            Works with most PDF types, including text PDFs, scanned PDFs, image-only PDFs, forms, and design-heavy layouts.
            {conversionMode === PDF_DOCUMENT_MODES.OCR
              ? ' OCR mode extracts editable text from scanned pages.'
              : ' Preserve mode keeps the page format unchanged by placing each PDF page into the DOCX exactly as it appears.'}
            PDF size limit for this tool: {MAX_DOCUMENT_SIZE_MB}MB.
          </div>

          <div className="card feature-options">
            <p className="feature-options__label">Conversion mode</p>
            <div className="feature-toggle-group">
              <button
                className={`feature-toggle${conversionMode === PDF_DOCUMENT_MODES.PRESERVE ? ' active' : ''}`}
                onClick={() => setConversionMode(PDF_DOCUMENT_MODES.PRESERVE)}
              >
                Preserve layout
              </button>
              <button
                className={`feature-toggle${conversionMode === PDF_DOCUMENT_MODES.OCR ? ' active' : ''}`}
                onClick={() => setConversionMode(PDF_DOCUMENT_MODES.OCR)}
              >
                OCR editable text
              </button>
            </div>
          </div>

          {isProcessing ? (
            <Loader
              progress={progress}
              label={
                conversionMode === PDF_DOCUMENT_MODES.OCR
                  ? `Running OCR... ${progress}%`
                  : `Preparing document... ${progress}%`
              }
            />
          ) : (
            <div className="action-row">
              <Button
                variant="primary"
                size="lg"
                onClick={handleExtract}
                disabled={files.length === 0}
                icon={FileText}
              >
                {conversionMode === PDF_DOCUMENT_MODES.OCR ? 'Convert with OCR' : 'Convert PDF'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="result-section">
          <div className="card">
            <div className="result-success">
              <div className="result-success__icon">OK</div>
              <h3>Document Ready!</h3>
              <p>
                {result.totalPages} page{result.totalPages !== 1 ? 's' : ''}{' '}
                {result.mode === PDF_DOCUMENT_MODES.OCR ? 'processed with OCR editable text' : 'preserved with original formatting'}
              </p>
              {result.fallbackUsed && (
                <p className="pdf-document-preview__hint">
                  Compatibility fallback applied to keep conversion stable for this PDF.
                </p>
              )}
            </div>
            <div className="action-row">
              <Button variant="primary" size="lg" onClick={handleDownload} icon={Download}>
                Download .docx
              </Button>
              <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>
                Convert another
              </Button>
            </div>
          </div>

          <div className="card pdf-document-preview">
            <p className="pdf-document-preview__label">Page Preview</p>
            {result.pages.length > PREVIEW_PAGE_LIMIT && (
              <p className="pdf-document-preview__hint">
                Showing the first {PREVIEW_PAGE_LIMIT} pages of {result.totalPages}.
              </p>
            )}
            <div className="pdf-document-page-grid">
              {previewPages.map((page) => (
                <div key={page.pageNumber} className="pdf-document-page">
                  {page.previewDataUrl ? (
                    <img src={page.previewDataUrl} alt={`PDF page ${page.pageNumber}`} />
                  ) : (
                    <p>Preview unavailable</p>
                  )}
                  <div className="pdf-document-page__footer">Page {page.pageNumber}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
