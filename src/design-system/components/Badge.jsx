/**
 * Badge — etiqueta de status / categoria
 * Consome somente tokens globais via classes CSS (components.css)
 * ─────────────────────────────────────────────────────────────────
 * Props:
 *   variant : 'default' | 'primary' | 'primary-solid' |
 *             'success' | 'danger' | 'warning' | 'info'  (default: 'default')
 *   size    : 'sm' | 'md'                                (default: 'md')
 *   pill    : boolean — border-radius full
 *   dot     : boolean — adiciona indicador circular
 *   as      : tag HTML                                    (default: 'span')
 */
import React from 'react';

/* Mapeamento semântico para facilitar uso no app */
export const BADGE_STATUS = {
  // Entregas / logística
  entregue    : 'success',
  transito    : 'info',
  pendente    : 'warning',
  cancelado   : 'danger',
  atrasado    : 'danger',
  agendado    : 'primary',
  // Diárias
  com_diaria  : 'warning',
  sem_diaria  : 'default',
  perda_agenda: 'danger',
  // Genérico
  ativo       : 'success',
  inativo     : 'default',
  alerta      : 'warning',
  erro        : 'danger',
};

export function Badge({
  variant   = 'default',
  size      = 'md',
  pill      = false,
  dot       = false,
  as        : Tag = 'span',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'ds-badge',
    `ds-badge--${variant}`,
    size === 'sm' ? 'ds-badge--sm' : '',
    pill          ? 'ds-badge--pill' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag className={classes} {...rest}>
      {dot && <span className="ds-badge__dot" aria-hidden="true" />}
      {children}
    </Tag>
  );
}

/**
 * StatusBadge — atalho semântico
 * Uso: <StatusBadge status="entregue">Entregue</StatusBadge>
 */
export function StatusBadge({ status, ...rest }) {
  const variant = BADGE_STATUS[status] ?? 'default';
  return <Badge variant={variant} dot {...rest} />;
}

export default Badge;
