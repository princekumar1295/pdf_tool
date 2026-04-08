import { useRef, useEffect, useState } from 'react';
import { X, Check, Eraser } from 'lucide-react';
import Button from '../../components/common/Button';

/**
 * A drawing canvas for digital signatures
 */
export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const save = () => {
    if (!hasContent) return;
    const canvas = canvasRef.current;
    // Get high-res signature with transparent bg
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="signature-modal-overlay">
      <div className="signature-modal animate-in">
        <div className="modal-header">
          <h3>Draw Your Signature</h3>
          <button onClick={onCancel} className="close-btn"><X size={20} /></button>
        </div>
        
        <div className="signature-canvas-container">
          <canvas
            ref={canvasRef}
            width={500}
            height={250}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          {!hasContent && <div className="canvas-placeholder">Sign Here</div>}
        </div>

        <div className="modal-footer">
          <Button variant="ghost" size="sm" onClick={clear} icon={Eraser}>Clear</Button>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!hasContent} icon={Check}>Add to PDF</Button>
        </div>
      </div>
    </div>
  );
}
