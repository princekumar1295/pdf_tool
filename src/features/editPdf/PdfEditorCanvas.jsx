import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { GripHorizontal, Maximize2 } from 'lucide-react';
import './PdfEditorCanvas.css';

/**
 * Renders a single PDF page and its interactive modifications layer.
 * Supports multi-selection marquee and group dragging.
 */
export default function PdfEditorCanvas({
  pdf,
  pageIndex,
  modifications,
  onAddText,
  onAddImage,
  onUpdateMod,
  onCommitHistory,
  onSelectMultiple,
  onSelectMod,
  selectedIds = [],
  activeTool,
  zoom = 1,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textLayerRef = useRef(null);
  const didTransformRef = useRef(false);
  const [viewport, setViewport] = useState(null);

  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);
  const [marquee, setMarquee] = useState(null);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdf) return;

      const page = await pdf.getPage(pageIndex + 1);
      const scale = 1.25 * zoom;
      const nextViewport = page.getViewport({ scale });
      setViewport(nextViewport);

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = nextViewport.width;
      canvas.height = nextViewport.height;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: nextViewport }).promise;

      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = '';
        const textContent = await page.getTextContent();
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerRef.current,
          viewport: nextViewport,
        });
        await textLayer.render();
      }
    };

    renderPage();
  }, [pdf, pageIndex, zoom]);

  const handlePageMouseDown = (e) => {
    if (!viewport) return;

    const isLayer = e.target.classList.contains('pdf-interaction-layer') || e.target.classList.contains('textLayer');
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isLayer && activeTool === 'select') {
      setMarquee({ startX: x, startY: y, curX: x, curY: y });

      if (!e.shiftKey) {
        onSelectMultiple([]);
      }
    }
  };

  const handlePageClick = (e) => {
    if (marquee && (Math.abs(marquee.startX - marquee.curX) > 5 || Math.abs(marquee.startY - marquee.curY) > 5)) {
      return;
    }

    if (e.target.classList.contains('pdf-interaction-layer') || e.target.classList.contains('textLayer')) {
      if (!viewport) return;

      const rect = containerRef.current.getBoundingClientRect();
      const pdfX = (e.clientX - rect.left) / viewport.scale;
      const pdfY = (e.clientY - rect.top) / viewport.scale;

      if (activeTool === 'text') onAddText(pageIndex, pdfX, pdfY);
      else if (activeTool === 'image' || activeTool.startsWith('shape-')) onAddImage(pageIndex, pdfX, pdfY);
      else onSelectMod(null);
    }
  };

  const startDrag = (e, mod) => {
    const isHandle = e.target.closest('.mod-drag-handle');
    const isTextarea = e.target.tagName === 'TEXTAREA';
    const isResize = e.target.closest('.resize-handle');

    if (isResize) return;
    if (isTextarea && !isHandle) return;

    e.stopPropagation();

    const isAlreadySelected = selectedIds.includes(mod.id);
    const nextSelection = e.shiftKey
      ? (isAlreadySelected ? selectedIds.filter((id) => id !== mod.id) : [...selectedIds, mod.id])
      : (isAlreadySelected ? selectedIds : [mod.id]);

    onSelectMultiple(nextSelection);

    const targets = modifications.filter((item) => nextSelection.includes(item.id));
    setDragInfo({
      startX: e.clientX,
      startY: e.clientY,
      targets: targets.map((target) => ({ id: target.id, origX: target.x, origY: target.y })),
    });
  };

  const startResize = (e, mod) => {
    e.stopPropagation();
    onSelectMod(mod.id);
    setResizeInfo({
      id: mod.id,
      startX: e.clientX,
      startWidth: mod.width || (mod.type === 'shape' && mod.shape === 'circle' ? mod.radius * 2 : 150),
      startHeight: mod.height || (mod.type === 'shape' && mod.shape === 'circle' ? mod.radius * 2 : 100),
    });
  };

  const onMouseMove = useCallback((e) => {
    if (!viewport) return;

    const rect = containerRef.current.getBoundingClientRect();

    if (marquee) {
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      setMarquee((prev) => ({ ...prev, curX, curY }));

      const x0 = Math.min(marquee.startX, curX) / viewport.scale;
      const x1 = Math.max(marquee.startX, curX) / viewport.scale;
      const y0 = Math.min(marquee.startY, curY) / viewport.scale;
      const y1 = Math.max(marquee.startY, curY) / viewport.scale;

      const inBounds = modifications
        .filter((mod) => mod.pageIndex === pageIndex)
        .filter((mod) => mod.x >= x0 && mod.x <= x1 && mod.y >= y0 && mod.y <= y1)
        .map((mod) => mod.id);

      if (inBounds.length > 0) {
        onSelectMultiple(inBounds);
      }
    }

    if (dragInfo) {
      const deltaX = (e.clientX - dragInfo.startX) / viewport.scale;
      const deltaY = (e.clientY - dragInfo.startY) / viewport.scale;
      didTransformRef.current = true;

      window.requestAnimationFrame(() => {
        dragInfo.targets.forEach((target) => {
          onUpdateMod(target.id, { x: target.origX + deltaX, y: target.origY + deltaY });
        });
      });
    }

    if (resizeInfo) {
      const deltaWidth = (e.clientX - resizeInfo.startX) / viewport.scale;
      didTransformRef.current = true;

      window.requestAnimationFrame(() => {
        const nextWidth = Math.max(20, resizeInfo.startWidth + deltaWidth);
        const updates = { width: nextWidth };
        const mod = modifications.find((item) => item.id === resizeInfo.id);

        if (mod && mod.type === 'shape' && mod.shape === 'circle') {
          updates.radius = nextWidth / 2;
        } else if (mod && mod.type === 'shape') {
          updates.height = (resizeInfo.startHeight / resizeInfo.startWidth) * nextWidth || nextWidth;
        }

        onUpdateMod(resizeInfo.id, updates);
      });
    }
  }, [dragInfo, marquee, modifications, onSelectMultiple, onUpdateMod, pageIndex, resizeInfo, viewport]);

  const onMouseUp = useCallback(() => {
    const shouldCommit = didTransformRef.current;
    didTransformRef.current = false;
    setDragInfo(null);
    setResizeInfo(null);
    setMarquee(null);

    if (shouldCommit) {
      onCommitHistory();
    }
  }, [onCommitHistory]);

  useEffect(() => {
    if (dragInfo || resizeInfo || marquee) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragInfo, marquee, onMouseMove, onMouseUp, resizeInfo]);

  if (!viewport) {
    return <div className="page-skeleton" style={{ height: 800 * zoom }} />;
  }

  return (
    <div className="pdf-page-wrapper" ref={containerRef} id={`page-${pageIndex}`}>
      <div className="pdf-page-container document-shadow">
        <canvas ref={canvasRef} className="pdf-page-canvas" />
        <div ref={textLayerRef} className="textLayer" style={{ width: viewport.width, height: viewport.height }} />

        <div
          className="pdf-interaction-layer"
          onMouseDown={handlePageMouseDown}
          onClick={handlePageClick}
          style={{ width: viewport.width, height: viewport.height }}
        >
          {marquee && (
            <div
              className="selection-marquee"
              style={{
                left: Math.min(marquee.startX, marquee.curX),
                top: Math.min(marquee.startY, marquee.curY),
                width: Math.abs(marquee.startX - marquee.curX),
                height: Math.abs(marquee.startY - marquee.curY),
              }}
            />
          )}

          {modifications
            .filter((mod) => mod.pageIndex === pageIndex)
            .map((mod) => {
              const isSelected = selectedIds.includes(mod.id);
              const scale = viewport.scale;

              return (
                <div
                  key={mod.id}
                  className={`mod-element mod-${mod.type} ${isSelected ? 'mod-selected' : ''}`}
                  style={{
                    left: mod.x * scale,
                    top: mod.y * scale,
                    zIndex: isSelected ? 200 : 100,
                  }}
                  onMouseDown={(e) => startDrag(e, mod)}
                >
                  {mod.type === 'text' ? (
                    <div
                      className="mod-text-wrapper premium-mod"
                      style={{
                        backgroundColor: mod.showBackground ? 'white' : 'transparent',
                        textAlign: mod.textAlign || 'left',
                        opacity: mod.opacity || 1,
                      }}
                    >
                      <textarea
                        value={mod.content}
                        onChange={(e) => {
                          onUpdateMod(mod.id, { content: e.target.value });
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        autoFocus={isSelected && selectedIds.length === 1}
                        placeholder="..."
                        rows="1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMod(mod.id);
                        }}
                        className={`mod-text-textarea ${mod.bold ? 'bold' : ''} ${mod.italic ? 'italic' : ''}`}
                        style={{
                          fontSize: (mod.fontSize || 18) * scale,
                          color: mod.color,
                          textAlign: mod.textAlign || 'left',
                          fontFamily: mod.fontFamily === 'courier'
                            ? 'Courier New, Courier, monospace'
                            : mod.fontFamily === 'times'
                              ? 'Times New Roman, Times, serif'
                              : 'Arial, sans-serif',
                        }}
                      />
                      {isSelected && <div className="mod-drag-handle animate-fade-in"><GripHorizontal size={14} /></div>}
                    </div>
                  ) : mod.type === 'image' || mod.type === 'signature' ? (
                    <div className="mod-image-wrapper premium-mod" style={{ width: (mod.width || 150) * scale, opacity: mod.opacity || 1 }}>
                      <img src={mod.preview} alt="Overlay" draggable={false} onMouseDown={(e) => e.preventDefault()} />
                      {isSelected && (
                        <>
                          <div className="mod-drag-handle image-handle animate-fade-in"><GripHorizontal size={14} /></div>
                          <div className="resize-handle corner-br" onMouseDown={(e) => startResize(e, mod)}><Maximize2 size={10} /></div>
                        </>
                      )}
                    </div>
                  ) : mod.type === 'shape' ? (
                    <div
                      className="mod-shape-wrapper premium-mod"
                      style={{
                        width: (mod.shape === 'circle' ? mod.radius * 2 : mod.width) * scale,
                        height: (mod.shape === 'circle' ? mod.radius * 2 : mod.height) * scale,
                        borderColor: mod.color,
                        borderStyle: 'solid',
                        borderWidth: (mod.borderSize || 2) * scale,
                        borderRadius: mod.shape === 'circle' ? '50%' : '0',
                        opacity: mod.opacity || 1,
                      }}
                    >
                      {isSelected && (
                        <>
                          <div className="mod-drag-handle animate-fade-in"><GripHorizontal size={14} /></div>
                          <div className="resize-handle corner-br" onMouseDown={(e) => startResize(e, mod)}><Maximize2 size={10} /></div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
