import React from 'react';
import './Button.css';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  success: 'btn-success',
};

const SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  fullWidth = false,
  icon: Icon,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'btn',
        VARIANTS[variant] || 'btn-primary',
        SIZES[size] || 'btn-md',
        fullWidth ? 'btn-full' : '',
        loading ? 'btn-loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true" />
      )}
      {!loading && Icon && <Icon size={16} className="btn-icon" />}
      <span>{children}</span>
    </button>
  );
}
