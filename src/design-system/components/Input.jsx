/**
 * Input / Select / Textarea — campos de formulário
 * Consome somente tokens globais via classes CSS (components.css)
 * ─────────────────────────────────────────────────────────────────
 * Exportações:
 *   <Field>    — container label + input + hint/error
 *   <Input>    — <input> estilizado
 *   <Select>   — <select> estilizado
 *   <Textarea> — <textarea> estilizado
 *
 * Props comuns (Input / Select / Textarea):
 *   size    : 'sm' | 'md' | 'lg'          (default: 'md')
 *   state   : 'error' | 'success' | null
 *   icon    : ReactNode — ícone à esquerda (só em Input)
 *   className, ...rest → passados ao elemento nativo
 *
 * Props de Field:
 *   label    : string
 *   required : boolean
 *   hint     : string
 *   error    : string
 *   children : o input/select/textarea filho
 */
import React from 'react';

/* ── Field ─────────────────────────────────────────────────────── */
export function Field({ label, required, hint, error, className = '', children, ...rest }) {
  return (
    <div className={`ds-field ${className}`.trim()} {...rest}>
      {label && (
        <label className={`ds-label${required ? ' ds-label--required' : ''}`}>
          {label}
        </label>
      )}
      {children}
      {error && <span className="ds-field__error" role="alert">{error}</span>}
      {hint && !error && <span className="ds-field__hint">{hint}</span>}
    </div>
  );
}

/* ── Input ─────────────────────────────────────────────────────── */
export const Input = React.forwardRef(function Input(
  { size = 'md', state, icon, className = '', ...rest },
  ref
) {
  const classes = [
    'ds-input',
    size !== 'md'   ? `ds-input--${size}`  : '',
    state           ? `ds-input--${state}` : '',
    className,
  ].filter(Boolean).join(' ');

  if (icon) {
    return (
      <div className="ds-input-wrap">
        <span className="ds-input-icon" aria-hidden="true">{icon}</span>
        <input ref={ref} className={classes} {...rest} />
      </div>
    );
  }

  return <input ref={ref} className={classes} {...rest} />;
});

/* ── Select ────────────────────────────────────────────────────── */
export const Select = React.forwardRef(function Select(
  { size = 'md', state, className = '', children, ...rest },
  ref
) {
  const classes = [
    'ds-select',
    size !== 'md'   ? `ds-select--${size}`  : '',
    state           ? `ds-select--${state}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <select ref={ref} className={classes} {...rest}>
      {children}
    </select>
  );
});

/* ── Textarea ──────────────────────────────────────────────────── */
export const Textarea = React.forwardRef(function Textarea(
  { state, className = '', ...rest },
  ref
) {
  const classes = [
    'ds-textarea',
    state ? `ds-textarea--${state}` : '',
    className,
  ].filter(Boolean).join(' ');

  return <textarea ref={ref} className={classes} {...rest} />;
});

export default Input;
