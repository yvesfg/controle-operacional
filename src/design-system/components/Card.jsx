/**
 * Card — superfície de conteúdo
 * Consome somente tokens globais via classes CSS (components.css)
 * ─────────────────────────────────────────────────────────────────
 * Subcomponentes exportados:
 *   <Card>           — container principal
 *   <Card.Header>    — cabeçalho com borda inferior
 *   <Card.Title>     — título
 *   <Card.Subtitle>  — subtítulo
 *   <Card.Body>      — corpo (flex:1)
 *   <Card.Footer>    — rodapé com borda superior
 *   <KpiCard>        — tile de indicador (label + valor + sub)
 *
 * Props de Card:
 *   size     : 'sm' | 'md' | 'lg'                     (default: 'md')
 *   variant  : 'flat' | 'elevated' | 'hoverable'      (default: 'flat')
 *   accent   : 'primary' | 'success' | 'danger' | 'warning' | 'info'
 *   as       : tag HTML                                (default: 'div')
 */
import React from 'react';

function Card({
  size      = 'md',
  variant   = 'flat',
  accent,
  as        : Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'ds-card',
    size !== 'md'  ? `ds-card--${size}`    : '',
    variant        ? `ds-card--${variant}` : '',
    accent         ? `ds-card--accent-${accent}` : '',
    className,
  ].filter(Boolean).join(' ');

  return <Tag className={classes} {...rest}>{children}</Tag>;
}

function CardHeader({ className = '', children, ...rest }) {
  return (
    <div className={`ds-card__header ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function CardTitle({ as: Tag = 'h3', className = '', children, ...rest }) {
  return (
    <Tag className={`ds-card__title ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

function CardSubtitle({ className = '', children, ...rest }) {
  return (
    <p className={`ds-card__subtitle ${className}`.trim()} {...rest}>
      {children}
    </p>
  );
}

function CardBody({ className = '', children, ...rest }) {
  return (
    <div className={`ds-card__body ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ className = '', children, ...rest }) {
  return (
    <div className={`ds-card__footer ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

Card.Header   = CardHeader;
Card.Title    = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Body     = CardBody;
Card.Footer   = CardFooter;

export { Card };
export default Card;

/* ── KpiCard ────────────────────────────────────────────────────── */
/**
 * Props:
 *   label   : string
 *   value   : string | number
 *   sub     : string          — linha auxiliar abaixo do valor
 *   icon    : ReactNode
 *   accent  : 'primary' | 'success' | 'danger' | 'warning' | 'info'
 */
export function KpiCard({ label, value, sub, icon, accent, className = '', ...rest }) {
  const classes = [
    'ds-kpi',
    accent ? `ds-card--accent-${accent}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {icon && (
        <div style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
          {icon}
        </div>
      )}
      <span className="ds-kpi__label">{label}</span>
      <span className="ds-kpi__value">{value}</span>
      {sub && <span className="ds-kpi__sub">{sub}</span>}
    </div>
  );
}
