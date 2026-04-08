import { useState } from 'react';
import { Download, Minimize2, RefreshCw } from 'lucide-react';
import DragDrop from '../../components/common/DragDrop';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useApp } from '../../context/useApp';
import { useFileUpload } from '../../hooks/useFileUpload';
import { compressImage } from './compressService';
import { downloadBlob, formatBytes } from '../../utils/fileHelpers';
import '../feature.css';
import './CompressImage.css';

export default function CompressImage() {
  const { startProcessing, stopProcessing, addNotification, isProcessing } = useApp();
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, clearFiles } =
    useFileUpload('image', false);

  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [convError, setConvError] = useState(null);
  const [maxSizeMB, setMaxSizeMB] = useState(1);
  const [quality, setQuality] = useState(0.8);

  const handleCompress = async () => {
    if (files.length === 0) return;

    startProcessing('Compressing image...');
    setConvError(null);
    setResult(null);
    setProgress(0);

    try {
      const compressed = await compressImage(files[0], { maxSizeMB, quality }, (value) => {
        setProgress(value);
      });

      setResult({ file: compressed, original: files[0] });
    } catch (err) {
      setConvError(err.message || 'Compression failed.');
      addNotification(`Compression failed: ${err.message}`, 'error');
    } finally {
      stopProcessing();
    }
  };

  const handleDownload = () => {
    const name = result.file.name || `compressed.${result.original.name.split('.').pop()}`;
    downloadBlob(result.file, name);
  };

  const handleReset = () => {
    clearFiles();
    setResult(null);
    setConvError(null);
    setProgress(0);
  };

  const savings = result ? Math.round((1 - result.file.size / result.original.size) * 100) : 0;

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon"><Minimize2 size={24} /></div>
        <h1>Compress <span className="gradient-text">Image</span></h1>
        <p>Reduce file size while maintaining visual quality</p>
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
              accept="image/*"
              multiple={false}
              label="Drag & drop an image here"
              subLabel="JPG, PNG, WEBP supported"
              inputId="compress-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            {files.length > 0 && (
              <p className="feature-hint">
                Original: <strong>{files[0].name}</strong> - {formatBytes(files[0].size)}
              </p>
            )}
          </div>

          <div className="card feature-options">
            <div className="compress-options">
              <label className="compress-slider-label">
                <span>Max size: <strong>{maxSizeMB} MB</strong></span>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={maxSizeMB}
                  onChange={(e) => setMaxSizeMB(Number(e.target.value))}
                />
              </label>
              <label className="compress-slider-label">
                <span>Quality: <strong>{Math.round(quality * 100)}%</strong></span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          {isProcessing ? (
            <Loader progress={progress} label="Compressing image..." />
          ) : (
            <div className="action-row">
              <Button variant="primary" size="lg" onClick={handleCompress} disabled={files.length === 0} icon={Minimize2}>
                Compress Image
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="result-section card">
          <div className="result-success">
            <div className="result-success__icon" aria-hidden="true">&check;</div>
            <h3>Image Compressed!</h3>
          </div>
          <div className="compress-stats">
            <div className="compress-stat">
              <span>Before</span>
              <strong>{formatBytes(result.original.size)}</strong>
            </div>
            <div className="compress-stat compress-stat--arrow" aria-hidden="true">-&gt;</div>
            <div className="compress-stat">
              <span>After</span>
              <strong>{formatBytes(result.file.size)}</strong>
            </div>
            <div className="compress-stat compress-stat--savings">
              <span>Saved</span>
              <strong className="savings-pct">{savings}%</strong>
            </div>
          </div>
          <div className="action-row">
            <Button variant="primary" size="lg" onClick={handleDownload} icon={Download}>Download</Button>
            <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>Compress another</Button>
          </div>
        </div>
      )}
    </div>
  );
}
