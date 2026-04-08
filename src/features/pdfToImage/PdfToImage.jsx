import { useState } from 'react';
import { Download, FileImage, RefreshCw, Package } from 'lucide-react';
import { useApp } from '../../context/useApp';
import DragDrop from '../../components/common/DragDrop';
import FilePreview from '../../components/common/FilePreview';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useFileUpload } from '../../hooks/useFileUpload';
import { pdfToImages, downloadAllAsZip } from './pdfToImageService';
import { downloadDataUrl } from '../../utils/fileHelpers';
import '../feature.css';

export default function PdfToImage() {
  const { startProcessing, stopProcessing, addNotification, isProcessing } = useApp();
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, clearFiles } =
    useFileUpload('pdf', false);

  const [pages, setPages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [convError, setConvError] = useState(null);
  const [format, setFormat] = useState('image/png');

  const handleConvert = async () => {
    if (files.length === 0) return;

    startProcessing('Converting PDF to images...');
    setConvError(null);
    setPages([]);
    setProgress(0);

    try {
      const { pages: result } = await pdfToImages(files[0], format, 2.0, (current, total) => {
        setProgress(Math.round((current / total) * 100));
      });
      setPages(result);
    } catch (err) {
      setConvError(err.message || 'Conversion failed.');
      addNotification(`Conversion failed: ${err.message}`, 'error');
    } finally {
      stopProcessing();
    }
  };

  const handleReset = () => {
    clearFiles();
    setPages([]);
    setConvError(null);
    setProgress(0);
  };

  const ext = format === 'image/jpeg' ? 'jpg' : 'png';

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon">
          <FileImage size={24} />
        </div>
        <h1>PDF to <span className="gradient-text">Image</span></h1>
        <p>Export every page of your PDF as a high-quality PNG or JPEG image</p>
      </div>

      {pages.length === 0 ? (
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
              subLabel="Single PDF file"
              inputId="pdf-to-image-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            <FilePreview files={files} />
          </div>

          <div className="card feature-options">
            <p className="feature-options__label">Output format</p>
            <div className="feature-toggle-group">
              <button
                className={`feature-toggle${format === 'image/png' ? ' active' : ''}`}
                onClick={() => setFormat('image/png')}
              >
                PNG
              </button>
              <button
                className={`feature-toggle${format === 'image/jpeg' ? ' active' : ''}`}
                onClick={() => setFormat('image/jpeg')}
              >
                JPEG
              </button>
            </div>
          </div>

          {isProcessing ? (
            <Loader progress={progress} label="Converting PDF pages..." />
          ) : (
            <div className="action-row">
              <Button variant="primary" size="lg" onClick={handleConvert} disabled={files.length === 0} icon={FileImage}>
                Convert to Images
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="result-section">
          <div className="card">
            <div className="result-success">
              <div className="result-success__icon" aria-hidden="true">&check;</div>
              <h3>{pages.length} Page{pages.length !== 1 ? 's' : ''} Converted!</h3>
            </div>
            <div className="action-row">
              <Button
                variant="primary"
                size="lg"
                icon={Package}
                onClick={() => downloadAllAsZip(pages, files[0]?.name?.replace('.pdf', '') || 'pages', format)}
              >
                Download all as ZIP
              </Button>
              <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>
                Convert another
              </Button>
            </div>
          </div>

          <div className="pdf-image-grid">
            {pages.map(({ page, dataUrl }) => (
              <div key={page} className="pdf-image-item">
                <img src={dataUrl} alt={`Page ${page}`} />
                <div className="pdf-image-item__footer">
                  <span>Page {page}</span>
                  <button
                    onClick={() => downloadDataUrl(dataUrl, `page-${page}.${ext}`)}
                    className="pdf-image-download-btn"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
