import { useApp } from '../../context/useApp';
import { RefreshCw } from 'lucide-react';
import './GlobalLoader.css';

export default function GlobalLoader() {
  const { isProcessing, loadingMessage } = useApp();

  if (!isProcessing) return null;

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-content glass">
        <div className="global-loader-icon">
          <RefreshCw size={32} />
        </div>
        <p className="global-loader-message">{loadingMessage}</p>
        <p className="global-loader-subtext">All processing happens locally in your browser.</p>
      </div>
    </div>
  );
}
