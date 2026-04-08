import { useState, useCallback } from 'react';
import { Download, Scissors, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import DragDrop from '../../components/common/DragDrop';
import FilePreview from '../../components/common/FilePreview';
import Button from '../../components/common/Button';
import { useFileUpload } from '../../hooks/useFileUpload';
import { splitPdfByRanges, splitPdfAllPages } from './splitPdfService';
import { downloadBlob } from '../../utils/fileHelpers';
import { loadPdfDocument } from '../../utils/pdfHelpers';
import '../feature.css';
import './SplitPdf.css';

export default function SplitPdf() {
  const { startProcessing, stopProcessing, addNotification } = useApp();
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, clearFiles } =
    useFileUpload('pdf', false);

  const [totalPages, setTotalPages] = useState(0);
  const [ranges, setRanges] = useState([{ start: 1, end: 1, name: '' }]);
  const [results, setResults] = useState([]);
  const [convError, setConvError] = useState(null);
  const [mode, setMode] = useState('ranges');

  const handleFilesLoaded = useCallback(async (incoming) => {
    if (incoming.length === 0) return;

    try {
      const pdf = await loadPdfDocument(incoming[0]);
      setTotalPages(pdf.numPages);
      setRanges([{ start: 1, end: pdf.numPages, name: '' }]);
    } catch {
      setTotalPages(0);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const incoming = Array.from(e.dataTransfer.files);
    onDrop(e);
    handleFilesLoaded(incoming);
  }, [handleFilesLoaded, onDrop]);

  const handleInput = useCallback((e) => {
    onInputChange(e);
    handleFilesLoaded(Array.from(e.target.files));
  }, [handleFilesLoaded, onInputChange]);

  const addRange = () => setRanges((currentRanges) => [...currentRanges, { start: 1, end: totalPages || 1, name: '' }]);
  const removeRange = (index) => setRanges((currentRanges) => currentRanges.filter((_, currentIndex) => currentIndex !== index));
  const updateRange = (index, field, value) => {
    setRanges((currentRanges) =>
      currentRanges.map((range, currentIndex) => (currentIndex === index ? { ...range, [field]: value } : range))
    );
  };

  const handleSplit = async () => {
    if (files.length === 0) return;

    startProcessing('Splitting PDF...');
    setConvError(null);

    try {
      if (mode === 'all') {
        await splitPdfAllPages(files[0]);
        setResults([{ name: 'all-pages.zip', downloaded: true }]);
      } else {
        const namedRanges = ranges.map((range, index) => ({
          ...range,
          name: range.name || `part-${index + 1}-pages-${range.start}-${range.end}.pdf`,
        }));

        const result = await splitPdfByRanges(files[0], namedRanges);
        setResults(result);
      }
    } catch (err) {
      setConvError(err.message || 'Split failed.');
      addNotification(`Split failed: ${err.message}`, 'error');
    } finally {
      stopProcessing();
    }
  };

  const handleDownload = (item) => {
    const blob = new Blob([item.bytes], { type: 'application/pdf' });
    downloadBlob(blob, item.name);
  };

  const handleReset = () => {
    clearFiles();
    setResults([]);
    setRanges([{ start: 1, end: 1, name: '' }]);
    setTotalPages(0);
  };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon"><Scissors size={24} /></div>
        <h1>Split <span className="gradient-text">PDF</span></h1>
        <p>Extract pages or split a PDF into multiple files</p>
      </div>

      {results.length === 0 ? (
        <>
          <div className="card">
            <DragDrop
              isDragging={isDragging}
              onDrop={handleDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onInputChange={handleInput}
              accept=".pdf"
              multiple={false}
              label="Drag & drop a PDF here"
              inputId="split-pdf-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            {totalPages > 0 && <p className="feature-hint">Total pages: <strong>{totalPages}</strong></p>}
            <FilePreview files={files} />
          </div>

          {files.length > 0 && (
            <div className="card">
              <div className="feature-options">
                <p className="feature-options__label">Split mode</p>
                <div className="feature-toggle-group">
                  <button className={`feature-toggle${mode === 'ranges' ? ' active' : ''}`} onClick={() => setMode('ranges')}>By page range</button>
                  <button className={`feature-toggle${mode === 'all' ? ' active' : ''}`} onClick={() => setMode('all')}>Every page separately</button>
                </div>
              </div>

              {mode === 'ranges' && (
                <div className="split-ranges">
                  {ranges.map((range, index) => (
                    <div key={index} className="split-range-row">
                      <span className="split-range-num">{index + 1}</span>
                      <div className="split-range-fields">
                        <label>
                          <span>From</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages || 999}
                            value={range.start}
                            onChange={(e) => updateRange(index, 'start', Number(e.target.value))}
                          />
                        </label>
                        <label>
                          <span>To</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages || 999}
                            value={range.end}
                            onChange={(e) => updateRange(index, 'end', Number(e.target.value))}
                          />
                        </label>
                        <label className="split-range-name">
                          <span>Filename (optional)</span>
                          <input
                            type="text"
                            placeholder={`part-${index + 1}.pdf`}
                            value={range.name}
                            onChange={(e) => updateRange(index, 'name', e.target.value)}
                          />
                        </label>
                      </div>
                      {ranges.length > 1 && (
                        <button className="split-range-remove" onClick={() => removeRange(index)} aria-label="Remove range">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" icon={Plus} onClick={addRange}>Add range</Button>
                </div>
              )}
            </div>
          )}

          <div className="action-row">
            <Button variant="primary" size="lg" onClick={handleSplit} disabled={files.length === 0} icon={Scissors}>
              Split PDF
            </Button>
            {files.length > 0 && <Button variant="ghost" onClick={handleReset}>Clear</Button>}
          </div>
        </>
      ) : (
        <div className="result-section card">
          <div className="result-success">
            <div className="result-success__icon" aria-hidden="true">&check;</div>
            <h3>PDF Split Successfully!</h3>
            {results[0]?.downloaded ? (
              <p>All pages downloaded as a ZIP archive.</p>
            ) : (
              <p>{results.length} file{results.length !== 1 ? 's' : ''} created</p>
            )}
          </div>
          {!results[0]?.downloaded && (
            <div className="split-results">
              {results.map((item, index) => (
                <div key={index} className="split-result-item">
                  <span>{item.name}</span>
                  <Button variant="secondary" size="sm" icon={Download} onClick={() => handleDownload(item)}>Download</Button>
                </div>
              ))}
            </div>
          )}
          <div className="action-row">
            <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>Split more</Button>
          </div>
        </div>
      )}
    </div>
  );
}
