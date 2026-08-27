/**
 * Button — componente reutilizável
 * Consome somente tokens globais via classes CSS (components.css)
 * ─────────────────────────────────────────────────────────────────
 * Props:
 *   variant : 'primary' | 'secondary' | 'ghost' | 'outline' |
 *             'danger' | 'danger-ghost' | 'success' | 'success-outline' |
 *             'info' | 'info-outline' |
 *             'danger-outline' | 'warning-outline'   (default: 'primary')
 *   size    : 'sm' | 'md' | 'lg' | 'xl' | 'touch'    (default: 'md')
 *   loading : boolean
 *   pill    : boolean — borda arredondada total (chip clicável de filtro)
 *   iconOnly: boolean — remove padding, aplica aspect-ratio:1
 *   as      : tag HTML ou componente ('button' | 'a' | ...)
 *   className, children, ...rest → passados ao elemento raiz
 */
import React from 'react';

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  pill      = false,
  iconOnly  = false,
  as        : Tag = 'button',
  disabled,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'ds-btn',
    `ds-btn--${variant}`,
    `ds-btn--${size}`,
    pill      ? 'ds-btn--pill'      : '',
    iconOnly  ? 'ds-btn--icon-only' : '',
    loading   ? 'ds-btn--loading'   : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag
      className={classes}
      disabled={Tag === 'button' ? (disabled || loading) : undefined}
      aria-disabled={disabled || loading || undefined}
      {...rest}
    >
      {loading && <span className="ds-btn__spinner" aria-hidden="true" />}
      {children}
    </Tag>
  );
}

export default Button;
