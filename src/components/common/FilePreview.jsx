import { useEffect, useMemo } from 'react';
import { X, FileIcon, FileImage } from 'lucide-react';
import { formatBytes } from '../../utils/fileHelpers';
import './FilePreview.css';

function FileIcon2({ file }) {
  if (file.type.startsWith('image/')) {
    return <FileImage size={20} />;
  }

  return <FileIcon size={20} />;
}

export default function FilePreview({ files, onRemove, showThumbnails = false }) {
  const thumbnailUrls = useMemo(() => {
    if (!showThumbnails) return {};

    const nextThumbnailUrls = {};

    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        nextThumbnailUrls[getFileKey(file, index)] = URL.createObjectURL(file);
      }
    });

    return nextThumbnailUrls;
  }, [files, showThumbnails]);

  useEffect(() => {
    return () => {
      Object.values(thumbnailUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [thumbnailUrls]);

  if (!files || files.length === 0) return null;

  return (
    <div className="file-preview fade-in">
      <div className="file-preview__header">
        <span className="file-preview__count">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
      </div>
      <ul className="file-preview__list">
        {files.map((file, index) => {
          const fileKey = getFileKey(file, index);

          return (
            <li key={fileKey} className="file-preview__item">
              {showThumbnails && file.type.startsWith('image/') ? (
                <img
                  src={thumbnailUrls[fileKey]}
                  alt={file.name}
                  className="file-preview__thumb"
                />
              ) : (
                <div className="file-preview__icon">
                  <FileIcon2 file={file} />
                </div>
              )}
              <div className="file-preview__info">
                <span className="file-preview__name" title={file.name}>{file.name}</span>
                <span className="file-preview__size">{formatBytes(file.size)}</span>
              </div>
              {onRemove && (
                <button
                  className="file-preview__remove"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function getFileKey(file, index) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}
