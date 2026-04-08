import { useRef } from 'react';
import { Upload, CloudUpload } from 'lucide-react';
import './DragDrop.css';

export default function DragDrop({
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
  accept = '*',
  multiple = true,
  label = 'Drag & drop files here',
  subLabel = 'or click to browse',
  inputId = 'file-input',
}) {
  const inputRef = useRef(null);

  return (
    <div
      className={`dragdrop${isDragging ? ' dragdrop--active' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label="File upload area"
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onInputChange}
        className="dragdrop__input"
        aria-label="File input"
      />
      <div className="dragdrop__content">
        <div className={`dragdrop__icon-wrap${isDragging ? ' bouncing' : ''}`}>
          {isDragging ? (
            <CloudUpload size={40} strokeWidth={1.5} />
          ) : (
            <Upload size={40} strokeWidth={1.5} />
          )}
        </div>
        <p className="dragdrop__label">{isDragging ? 'Release to upload' : label}</p>
        <p className="dragdrop__sub">{subLabel}</p>
        <div className="dragdrop__hint">
          <span>{accept === 'image/*' ? 'JPG, PNG, WEBP, GIF' : accept === '.pdf' ? 'PDF files only' : 'PDF, JPG, PNG, WEBP'}</span>
          <span className="dragdrop__dot">&middot;</span>
          <span>Max 50MB each</span>
        </div>
      </div>
    </div>
  );
}
