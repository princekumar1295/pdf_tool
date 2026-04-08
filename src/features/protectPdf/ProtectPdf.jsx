import { useState } from 'react';
import { Lock, Download, RefreshCw, Eye, EyeOff, Info } from 'lucide-react';
import DragDrop from '../../components/common/DragDrop';
import FilePreview from '../../components/common/FilePreview';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useFileUpload } from '../../hooks/useFileUpload';
import { lockPdfWithPassword } from './protectPdfService';
import { downloadBlob } from '../../utils/fileHelpers';
import '../feature.css';
import './ProtectPdf.css';

export default function ProtectPdf() {
  const { files, error, isDragging, onDrop, onDragOver, onDragLeave, onInputChange, clearFiles } =
    useFileUpload('pdf', false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const [convError, setConvError] = useState(null);

  const handleProtect = async () => {
    if (files.length === 0 || !password || password !== confirmPassword) return;

    setIsProcessing(true);
    setProgress(0);
    setConvError(null);

    try {
      const bytes = await lockPdfWithPassword(files[0], password, (cur, total) => {
        const safeTotal = total > 0 ? total : 1;
        setProgress(Math.round((cur / safeTotal) * 100));
      });

      setResultBytes(bytes);
      setIsDone(true);
    } catch (err) {
      setConvError(err.message || 'Protection failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isPasswordStrong = getPasswordScore(password) >= 3;
  const passwordsMatch = password === confirmPassword;

  const handleDownload = () => {
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const name = files[0]?.name?.replace(/\.pdf$/i, '-protected.pdf') || 'protected.pdf';
    downloadBlob(blob, name);
  };

  const handleReset = () => {
    clearFiles();
    setPassword('');
    setConfirmPassword('');
    setIsDone(false);
    setResultBytes(null);
    setConvError(null);
    setProgress(0);
  };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <div className="feature-header__icon"><Lock size={24} /></div>
        <h1>Secure <span className="gradient-text">PDF</span></h1>
        <p>Lock your PDF with a real open-password</p>
      </div>

      <div className="info-banner warning">
        <Info size={14} />
        <span>
          Applies real PDF password protection in-browser. To maximize compatibility, pages are rebuilt as images, so file size may increase and text may not stay selectable.
        </span>
      </div>

      {!isDone ? (
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
              inputId="protect-pdf-input"
            />
            {(error || convError) && <p className="feature-error">{error || convError}</p>}
            <FilePreview files={files} />
          </div>

          <div className="card">
            <form onSubmit={(e) => e.preventDefault()}>
              <label className="protect-label">Set a password <span className="required">*</span></label>
              <div className="protect-input-wrap">
                <Lock size={16} className="protect-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`protect-input ${!isPasswordStrong ? 'weak' : ''}`}
                  placeholder="Enter strong password (8+ chars, uppercase, number, special)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="protect-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Toggle visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label className="protect-label">Confirm password <span className="required">*</span></label>
              <div className="protect-input-wrap">
                <Lock size={16} className="protect-input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`protect-input ${!passwordsMatch ? 'mismatch' : ''}`}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="protect-eye"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  aria-label="Toggle visibility"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </form>
            {password && <PasswordStrengthBar password={password} />}
          </div>

          {isProcessing ? (
            <Loader progress={progress} label={`Applying password lock... ${progress}%`} />
          ) : (
            <div className="action-row">
              <Button
                variant="primary"
                size="lg"
                onClick={handleProtect}
                disabled={files.length === 0 || !isPasswordStrong || !passwordsMatch || password.length < 8}
                icon={Lock}
              >
                Secure PDF
              </Button>
              {(!isPasswordStrong || !passwordsMatch) && (
                <p className="validation-error">
                  {password.length < 8 && 'Password too short. '}
                  {!isPasswordStrong && 'Password not strong enough. '}
                  {!passwordsMatch && 'Passwords do not match.'}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="result-section card">
          <div className="result-success">
            <div className="result-success__icon" aria-hidden="true">&check;</div>
            <h3>PDF Secured!</h3>
            <p>Password lock applied successfully. This file now requires the password to open.</p>
          </div>
          <div className="action-row">
            <Button variant="primary" size="lg" onClick={handleDownload} icon={Download}>Download Protected PDF</Button>
            <Button variant="ghost" onClick={handleReset} icon={RefreshCw}>Protect another</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordStrengthBar({ password }) {
  const score = getPasswordScore(password);
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#f43f5e', '#f59e0b', '#22d3ee', '#10b981'];

  return (
    <div className="password-strength">
      <div className="password-strength__bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="password-strength__bar"
            style={{ background: i <= score ? colors[score] : 'var(--border-card)' }}
          />
        ))}
      </div>
      <span style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

function getPasswordScore(pw) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[a-z]/.test(pw)) score += 0.5;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.floor(Math.min(score, 3));
}
