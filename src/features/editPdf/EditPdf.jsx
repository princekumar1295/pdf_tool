import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Download, Type, Image as ImageIcon, Trash2, ArrowLeft, RefreshCw,
  Bold, Italic, Palette, MousePointer2, Check, Square, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2,
  ScanText, Loader2, PenTool, Layout, Search, Circle, Minus,
  AlignStartVertical, AlignCenterVertical, AlignStartHorizontal,
  Layers as LayersIcon, MoveUp, MoveDown,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import DragDrop from '../../components/common/DragDrop';
import Button from '../../components/common/Button';
import { useFileUpload } from '../../hooks/useFileUpload';
import { applyModificationsToPdf } from './editPdfService';
import { performOcr, needsOcr } from './ocrService';
import { downloadBlob, readFileAsDataURL } from '../../utils/fileHelpers';
import PdfEditorCanvas from './PdfEditorCanvas';
import SignaturePad from './SignaturePad';
import '../feature.css';
import './EditPdf.css';

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5];
const STORAGE_KEY = 'pdfcraft_editor_state';

const FONT_FAMILIES = [
  { id: 'helvetica', label: 'Helvetica' },
  { id: 'times', label: 'Times New Roman' },
  { id: 'courier', label: 'Courier Mono' },
  { id: 'inter', label: 'Inter (Premium)' },
  { id: 'montserrat', label: 'Montserrat' },
];

export default function EditPdf() {
  const { files, error: uploadError, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, clearFiles } =
    useFileUpload('pdf', false);

  const [pdfProxy, setPdfProxy] = useState(null);
  const [modifications, setModifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const historyIdxRef = useRef(-1);

  const [activeTool, setActiveTool] = useState('select');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDone, setIsDone] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [rightSidebar, setRightSidebar] = useState('layers');
  const [searchQuery, setSearchQuery] = useState('');

  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [suggestOcr, setSuggestOcr] = useState(false);

  const hiddenImageInput = useRef(null);
  const [pendingImagePos, setPendingImagePos] = useState(null);

  useEffect(() => {
    historyIdxRef.current = historyIdx;
  }, [historyIdx]);

  const clearEditorState = useCallback(() => {
    setPdfProxy(null);
    setModifications([]);
    setHistory([]);
    setHistoryIdx(-1);
    historyIdxRef.current = -1;
    setActiveTool('select');
    setSelectedIds([]);
    setIsDone(false);
    setResultBytes(null);
    setIsCreatingPdf(false);
    setZoom(1);
    setShowSignaturePad(false);
    setRightSidebar('layers');
    setSearchQuery('');
    setIsOcrRunning(false);
    setOcrProgress(0);
    setSuggestOcr(false);
    setPendingImagePos(null);
  }, []);

  const selectedMods = useMemo(
    () => modifications.filter((mod) => selectedIds.includes(mod.id)),
    [modifications, selectedIds]
  );

  const firstSelectedMod = selectedMods[0];

  const addToHistory = useCallback((mods) => {
    setHistory((prevHistory) => {
      const nextHistory = prevHistory.slice(0, historyIdxRef.current + 1);
      nextHistory.push([...mods]);

      if (nextHistory.length > 50) {
        nextHistory.shift();
      }

      const nextIndex = nextHistory.length - 1;
      historyIdxRef.current = nextIndex;
      setHistoryIdx(nextIndex);

      return nextHistory;
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadDoc = async () => {
      if (files.length === 0) {
        clearEditorState();
        return;
      }

      clearEditorState();

      try {
        const currentFile = files[0];
        const arrayBuffer = await currentFile.arrayBuffer();
        if (isCancelled) return;

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) return;
        setPdfProxy(pdf);

        const page = await pdf.getPage(1);
        if (isCancelled) return;
        setSuggestOcr(await needsOcr(page));

        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        try {
          const { pdfName, mods } = JSON.parse(saved);

          if (pdfName === currentFile.name && Array.isArray(mods)) {
            if (isCancelled) return;
            setModifications(mods);
            setHistory([[...mods]]);
            setHistoryIdx(0);
            historyIdxRef.current = 0;
          }
        } catch (recoveryError) {
          console.error('Recovery failed', recoveryError);
        }
      } catch (loadError) {
        console.error('Failed to load PDF', loadError);
        if (!isCancelled) {
          clearEditorState();
        }
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [clearEditorState, files]);

  useEffect(() => {
    if (!files[0]) return;

    if (modifications.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ pdfName: files[0].name, mods: modifications })
    );
  }, [files, modifications]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;

    const nextIndex = historyIdxRef.current - 1;
    setModifications([...history[nextIndex]]);
    setHistoryIdx(nextIndex);
    historyIdxRef.current = nextIndex;
    setSelectedIds([]);
  }, [history]);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= history.length - 1) return;

    const nextIndex = historyIdxRef.current + 1;
    setModifications([...history[nextIndex]]);
    setHistoryIdx(nextIndex);
    historyIdxRef.current = nextIndex;
    setSelectedIds([]);
  }, [history]);

  const updateMod = useCallback((id, updates) => {
    setModifications((prev) => prev.map((mod) => (mod.id === id ? { ...mod, ...updates } : mod)));
  }, []);

  const updateSelected = useCallback((updates) => {
    setModifications((prev) =>
      prev.map((mod) => (selectedIds.includes(mod.id) ? { ...mod, ...updates } : mod))
    );
  }, [selectedIds]);

  const commitToHistory = useCallback(() => {
    addToHistory(modifications);
  }, [addToHistory, modifications]);

  const removeSelected = useCallback(() => {
    if (selectedIds.length === 0) return;

    const next = modifications.filter((mod) => !selectedIds.includes(mod.id));
    setModifications(next);
    addToHistory(next);
    setSelectedIds([]);
  }, [addToHistory, modifications, selectedIds]);

  const removeById = useCallback((id) => {
    const next = modifications.filter((mod) => mod.id !== id);
    setModifications(next);
    addToHistory(next);
    setSelectedIds((prev) => prev.filter((currentId) => currentId !== id));
  }, [addToHistory, modifications]);

  useEffect(() => {
    const handleKeys = (e) => {
      const tagName = e.target?.tagName;

      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && tagName !== 'INPUT' && tagName !== 'TEXTAREA') {
        removeSelected();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [redo, removeSelected, selectedIds.length, undo]);

  const addText = (pageIndex, x, y) => {
    const newMod = {
      id: Date.now(),
      type: 'text',
      pageIndex,
      x,
      y,
      content: '',
      fontSize: 18,
      color: '#000000',
      bold: false,
      italic: false,
      fontFamily: 'helvetica',
      textAlign: 'left',
      showBackground: false,
      lineHeight: 1.2,
      letterSpacing: 0,
      shadow: false,
      opacity: 1,
    };
    const next = [...modifications, newMod];
    setModifications(next);
    addToHistory(next);
    setSelectedIds([newMod.id]);
  };

  const addShape = (shape) => setActiveTool(`shape-${shape}`);

  const placeToolElement = (pageIndex, x, y) => {
    if (activeTool === 'image') {
      setPendingImagePos({ pageIndex, x, y });
      hiddenImageInput.current?.click();
      return;
    }

    if (activeTool.startsWith('shape-')) {
      const type = activeTool.split('-')[1];
      const newMod = {
        id: Date.now(),
        type: 'shape',
        shape: type,
        pageIndex,
        x,
        y,
        width: type === 'line' ? 100 : 80,
        height: type === 'line' ? 2 : 80,
        radius: 40,
        color: '#d4af37',
        borderSize: 2,
        shadow: false,
        opacity: 1,
      };
      const next = [...modifications, newMod];
      setModifications(next);
      addToHistory(next);
      setSelectedIds([newMod.id]);
      setActiveTool('select');
    }
  };

  const handleSignatureSave = (dataUrl) => {
    const newMod = {
      id: Date.now(),
      type: 'signature',
      pageIndex: 0,
      x: 100,
      y: 100,
      preview: dataUrl,
      width: 200,
      opacity: 1,
    };
    const next = [...modifications, newMod];
    setModifications(next);
    addToHistory(next);
    setSelectedIds([newMod.id]);
    setShowSignaturePad(false);
  };

  const onImageSelected = async (e) => {
    const file = e.target.files[0];
    const nextPosition = pendingImagePos;
    if (!file || !nextPosition) return;

    const preview = await readFileAsDataURL(file);
    const newMod = {
      id: Date.now(),
      type: 'image',
      file,
      preview,
      pageIndex: nextPosition.pageIndex,
      x: nextPosition.x,
      y: nextPosition.y,
      width: 150,
      opacity: 1,
    };
    const next = [...modifications, newMod];
    setModifications(next);
    addToHistory(next);
    setSelectedIds([newMod.id]);
    setPendingImagePos(null);
    e.target.value = '';
    setActiveTool('select');
  };

  const alignSelected = (direction) => {
    if (selectedIds.length < 2) return;

    const anchor = modifications.find((mod) => mod.id === selectedIds[0]);
    if (!anchor) return;

    const next = modifications.map((mod) => {
      if (!selectedIds.includes(mod.id)) return mod;
      if (direction === 'left') return { ...mod, x: anchor.x };
      if (direction === 'top') return { ...mod, y: anchor.y };
      return mod;
    });

    setModifications(next);
    addToHistory(next);
  };

  const bringToFront = () => {
    const remaining = modifications.filter((mod) => !selectedIds.includes(mod.id));
    const selected = modifications.filter((mod) => selectedIds.includes(mod.id));
    const next = [...remaining, ...selected];
    setModifications(next);
    addToHistory(next);
  };

  const sendToBack = () => {
    const remaining = modifications.filter((mod) => !selectedIds.includes(mod.id));
    const selected = modifications.filter((mod) => selectedIds.includes(mod.id));
    const next = [...selected, ...remaining];
    setModifications(next);
    addToHistory(next);
  };

  const handleOcr = async () => {
    if (!pdfProxy) return;

    setIsOcrRunning(true);
    setOcrProgress(0);

    try {
      const page = await pdfProxy.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

      const result = await performOcr(canvas, (progress) => {
        setOcrProgress(Math.round(progress * 100));
      });

      const ocrMods = result.words
        .filter((word) => word.confidence > 70)
        .map((word) => ({
          id: Date.now() + Math.random(),
          type: 'text',
          pageIndex: 0,
          x: word.bbox.x0 / 2.0,
          y: word.bbox.y0 / 2.0,
          content: word.text,
          fontSize: (word.bbox.y1 - word.bbox.y0) / 2.0,
          color: '#000000',
          bold: false,
          italic: false,
          fontFamily: 'helvetica',
          textAlign: 'left',
          showBackground: true,
          isOcrGenerated: true,
          opacity: 1,
        }));

      const next = [...modifications, ...ocrMods];
      setModifications(next);
      addToHistory(next);
      setSuggestOcr(false);
    } catch (err) {
      console.error('OCR Error', err);
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleExport = async () => {
    if (!files[0]) return;

    setIsCreatingPdf(true);

    try {
      const bytes = await applyModificationsToPdf(files[0], modifications);
      setResultBytes(bytes);
      setIsDone(true);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsCreatingPdf(false);
    }
  };

  const resetAll = useCallback(() => {
    clearFiles();
    clearEditorState();
    localStorage.removeItem(STORAGE_KEY);
  }, [clearEditorState, clearFiles]);

  if (isDone) {
    return (
      <div className="feature-page">
        <div className="result-section card document-shadow animate-in">
          <div className="result-success">
            <div className="result-success__icon" aria-hidden="true">&check;</div>
            <h3>Supreme Studio Export complete</h3>
            <p>Your document is ready with all advanced layouts and layers saved.</p>
          </div>
          <div className="action-row">
            <Button
              variant="primary"
              size="lg"
              onClick={() => downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), `supreme_${files[0].name}`)}
              icon={Download}
            >
              Download PDF
            </Button>
            <Button variant="ghost" onClick={resetAll} icon={RefreshCw}>
              New Supreme Project
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pdfProxy) {
    return (
      <div className="studio-workspace supreme-level">
        <div className="docs-toolbar">
          <button className="toolbar-btn" onClick={resetAll}><ArrowLeft size={18} /></button>

          <div className="toolbar-divider" />
          <button className={`toolbar-tool ${historyIdx > 0 ? '' : 'disabled'}`} onClick={undo}><Undo2 size={16} /></button>
          <button className={`toolbar-tool ${historyIdx < history.length - 1 ? '' : 'disabled'}`} onClick={redo}><Redo2 size={16} /></button>

          <div className="toolbar-divider" />
          <button className={`toolbar-tool ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Selection (V)"><MousePointer2 size={18} /></button>
          <button className={`toolbar-tool ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setActiveTool('text')} title="Text (T)"><Type size={18} /></button>
          <button className={`toolbar-tool ${activeTool === 'image' ? 'active' : ''}`} onClick={() => setActiveTool('image')} title="Image (I)"><ImageIcon size={18} /></button>

          <div className="toolbar-divider" />
          <button className={`toolbar-tool ${activeTool === 'shape-rect' ? 'active' : ''}`} onClick={() => addShape('rect')}><Square size={18} /></button>
          <button className={`toolbar-tool ${activeTool === 'shape-circle' ? 'active' : ''}`} onClick={() => addShape('circle')}><Circle size={18} /></button>
          <button className={`toolbar-tool ${activeTool === 'shape-line' ? 'active' : ''}`} onClick={() => addShape('line')}><Minus size={18} title="Line/Arrow" style={{ transform: 'rotate(-45deg)' }} /></button>

          <div className="toolbar-divider" />
          <button className="toolbar-tool signature-btn" onClick={() => setShowSignaturePad(true)}><PenTool size={18} /><span>Sign</span></button>

          {selectedIds.length > 0 && firstSelectedMod && (
            <div className="context-toolbar animate-in" onMouseUp={commitToHistory}>
              {selectedIds.length === 1 && firstSelectedMod.type === 'text' && (
                <>
                  <select className="docs-select" value={firstSelectedMod.fontFamily} onChange={(e) => updateSelected({ fontFamily: e.target.value })}>
                    {FONT_FAMILIES.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
                  </select>
                  <div className="format-divider" />
                  <button className={`format-btn ${firstSelectedMod.bold ? 'active' : ''}`} onClick={() => updateSelected({ bold: !firstSelectedMod.bold })}><Bold size={16} /></button>
                  <button className={`format-btn ${firstSelectedMod.italic ? 'active' : ''}`} onClick={() => updateSelected({ italic: !firstSelectedMod.italic })}><Italic size={16} /></button>
                  <div className="format-divider" />
                  <button className={`format-btn ${firstSelectedMod.textAlign === 'left' ? 'active' : ''}`} onClick={() => updateSelected({ textAlign: 'left' })}><AlignLeft size={16} /></button>
                  <button className={`format-btn ${firstSelectedMod.textAlign === 'center' ? 'active' : ''}`} onClick={() => updateSelected({ textAlign: 'center' })}><AlignCenter size={16} /></button>
                  <button className={`format-btn ${firstSelectedMod.textAlign === 'right' ? 'active' : ''}`} onClick={() => updateSelected({ textAlign: 'right' })}><AlignRight size={16} /></button>
                </>
              )}

              <div className="format-divider" />
              <div className="opacity-control" title="Opacity">
                <Layout size={14} />
                <input type="range" min="0" max="1" step="0.1" value={firstSelectedMod.opacity || 1} onChange={(e) => updateSelected({ opacity: parseFloat(e.target.value) })} />
              </div>

              <div className="format-divider" />
              <button className="format-btn" onClick={bringToFront} title="Bring to Front"><MoveUp size={16} /></button>
              <button className="format-btn" onClick={sendToBack} title="Send to Back"><MoveDown size={16} /></button>

              <div className="format-divider" />
              <input type="color" value={firstSelectedMod.color || '#000000'} onChange={(e) => updateSelected({ color: e.target.value })} className="color-picker-dot" />

              <div className="format-divider" />
              <button className={`format-btn ${firstSelectedMod.shadow ? 'active' : ''}`} onClick={() => updateSelected({ shadow: !firstSelectedMod.shadow })} title="Glow/Shadow"><Palette size={16} /></button>

              {selectedIds.length === 1 && firstSelectedMod.type === 'text' && (
                <div className="typo-controls">
                  <div className="format-divider" />
                  <div className="range-tool" title="Line Height">
                    <AlignCenterVertical size={14} />
                    <input type="range" min="0.8" max="2.5" step="0.1" value={firstSelectedMod.lineHeight || 1.2} onChange={(e) => updateSelected({ lineHeight: parseFloat(e.target.value) })} />
                  </div>
                </div>
              )}

              <button className="format-btn danger" onClick={removeSelected}><Trash2 size={16} /></button>

              {selectedIds.length > 1 && (
                <>
                  <div className="format-divider" />
                  <button className="format-btn" onClick={() => alignSelected('left')} title="Align Left"><AlignStartHorizontal size={16} /></button>
                  <button className="format-btn" onClick={() => alignSelected('top')} title="Align Top"><AlignStartVertical size={16} /></button>
                </>
              )}
            </div>
          )}

          <div className="toolbar-spacer" />
          <button className={`toolbar-tool ocr-tool ${isOcrRunning ? 'active' : ''}`} onClick={handleOcr} disabled={isOcrRunning}>
            {isOcrRunning ? <Loader2 size={16} className="rotating" /> : <ScanText size={16} />}
            <span style={{ fontSize: '0.6rem' }}>{isOcrRunning ? `${ocrProgress}%` : 'OCR'}</span>
          </button>

          <div className="toolbar-divider" />
          <button className="toolbar-btn" onClick={() => setZoom((prev) => ZOOM_LEVELS[(ZOOM_LEVELS.indexOf(prev) + 1) % ZOOM_LEVELS.length])}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800' }}>{zoom * 100}%</span>
          </button>
          <div className="toolbar-divider" />
          <Button variant="primary" size="sm" onClick={handleExport} loading={isCreatingPdf} icon={Check}>Finish</Button>
        </div>

        <div className="docs-main">
          {suggestOcr && (
            <div className="ocr-suggestion animate-in">
              <span>Tip: this scan can be improved. Use <strong>OCR</strong> for better extraction.</span>
              <button onClick={handleOcr} disabled={isOcrRunning}>Scan Now</button>
            </div>
          )}

          <div className="studio-sidebar left">
            <div className="sidebar-header"><Layout size={14} /><span>Navigation</span></div>
            <div className="sidebar-scroll">
              {Array.from({ length: pdfProxy.numPages }, (_, index) => (
                <a
                  href={`#page-${index}`}
                  key={index}
                  className="sidebar-page-thumb"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`page-${index}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span>{index + 1}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="docs-content studio-grid-bg">
            <div className="docs-scroll-container">
              {Array.from({ length: pdfProxy.numPages }, (_, index) => (
                <PdfEditorCanvas
                  key={index}
                  pdf={pdfProxy}
                  pageIndex={index}
                  modifications={modifications}
                  activeTool={activeTool}
                  selectedIds={selectedIds}
                  zoom={zoom}
                  onAddText={addText}
                  onAddImage={placeToolElement}
                  onUpdateMod={updateMod}
                  onCommitHistory={commitToHistory}
                  onSelectMod={(id) => setSelectedIds(id ? [id] : [])}
                  onSelectMultiple={setSelectedIds}
                />
              ))}
            </div>
          </div>

          <div className="studio-sidebar right">
            <div className="sidebar-tabs">
              <button className={rightSidebar === 'layers' ? 'active' : ''} onClick={() => setRightSidebar('layers')}><LayersIcon size={14} /></button>
              <button className={rightSidebar === 'search' ? 'active' : ''} onClick={() => setRightSidebar('search')}><Search size={14} /></button>
            </div>
            {rightSidebar === 'layers' ? (
              <div className="layers-list animate-fade-in">
                <div className="sidebar-header"><span>Layers</span></div>
                <div className="sidebar-search-box">
                  <Search size={12} />
                  <input type="text" placeholder="Filter layers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {[...modifications].reverse()
                  .filter((mod) => !searchQuery || (mod.type === 'text' && mod.content.toLowerCase().includes(searchQuery.toLowerCase())) || mod.type.includes(searchQuery.toLowerCase()))
                  .map((mod) => (
                    <div
                      key={mod.id}
                      className={`layer-item ${selectedIds.includes(mod.id) ? 'active' : ''}`}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          setSelectedIds((prev) => [...prev, mod.id]);
                        } else {
                          setSelectedIds([mod.id]);
                        }
                      }}
                    >
                      {mod.type === 'image' || mod.type === 'signature' ? <ImageIcon size={14} /> : mod.type === 'text' ? <Type size={14} /> : <Square size={14} />}
                      <span className="layer-name">{mod.type === 'text' ? (mod.content.substring(0, 15) || 'Text Box') : mod.type}</span>
                      <div className="layer-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeById(mod.id);
                          }}
                          className="danger"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="search-tool animate-fade-in">
                <div className="sidebar-header"><span>Find</span></div>
                <div className="search-field"><input type="text" placeholder="Search document..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              </div>
            )}
          </div>
        </div>
        {showSignaturePad && <SignaturePad onSave={handleSignatureSave} onCancel={() => setShowSignaturePad(false)} />}
        <input type="file" ref={hiddenImageInput} style={{ display: 'none' }} accept="image/*" onChange={onImageSelected} />
      </div>
    );
  }

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon"><PenTool size={24} /></div>
        <h1>Supreme <span className="gradient-text">Studio</span></h1>
        <p>The ultimate browser-based PDF workspace with multi-layer alignment and opacity controls.</p>
      </div>
      <div className="card">
        <DragDrop
          isDragging={isDragging}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onInputChange={onInputChange}
          accept=".pdf"
          multiple={false}
          label="Open PDF to start Supreme Session"
        />
        {uploadError && <p className="feature-error">{uploadError}</p>}
      </div>
    </div>
  );
}
