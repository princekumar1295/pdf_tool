import './Loader.css';

export default function Loader({ progress = null, label = 'Processing...' }) {
  return (
    <div className="loader-wrapper fade-scale">
      <div className="loader-ring">
        <div className="loader-inner" />
        {progress !== null && (
          <span className="loader-percent">{Math.round(progress)}%</span>
        )}
      </div>
      <p className="loader-label">{label}</p>
      {progress !== null && (
        <div className="loader-bar-track">
          <div
            className="loader-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
