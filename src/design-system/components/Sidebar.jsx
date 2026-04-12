/**
 * Sidebar — navegação lateral colapsável
 * Consome somente tokens globais via classes CSS (components.css)
 * ─────────────────────────────────────────────────────────────────
 * Exportações:
 *   <Sidebar>         — container lateral
 *   <Sidebar.Logo>    — área do logo/nome no topo
 *   <Sidebar.Nav>     — lista de itens
 *   <Sidebar.Section> — label de seção
 *   <Sidebar.Item>    — item de navegação
 *   <Sidebar.Footer>  — rodapé com ações (perfil, tema, logout)
 *
 * Props de Sidebar:
 *   collapsed : boolean
 *   className : string
 *
 * Props de Sidebar.Item:
 *   icon     : ReactNode
 *   label    : string
 *   active   : boolean
 *   badge    : ReactNode
 *   onClick  : fn
 *   as       : tag/componente (default: 'button')
 */
import React from 'react';

/* ── Sidebar container ─────────────────────────────────────────── */
function Sidebar({ collapsed = false, className = '', children, ...rest }) {
  const classes = [
    'ds-sidebar',
    collapsed ? 'ds-sidebar--collapsed' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <aside className={classes} aria-label="Navegação lateral" {...rest}>
      {children}
    </aside>
  );
}

/* ── Logo ──────────────────────────────────────────────────────── */
function SidebarLogo({ icon, text, className = '', children, ...rest }) {
  return (
    <div className={`ds-sidebar__logo ${className}`.trim()} {...rest}>
      {icon && (
        <span style={{ flexShrink: 0, color: 'var(--color-primary)' }}>
          {icon}
        </span>
      )}
      {text && <span className="ds-sidebar__logo-text">{text}</span>}
      {children}
    </div>
  );
}

/* ── Nav ───────────────────────────────────────────────────────── */
function SidebarNav({ className = '', children, ...rest }) {
  return (
    <nav className={`ds-sidebar__nav ${className}`.trim()} {...rest}>
      {children}
    </nav>
  );
}

/* ── Section label ─────────────────────────────────────────────── */
function SidebarSection({ label, className = '', ...rest }) {
  return (
    <div className={`ds-sidebar__section-label ${className}`.trim()} {...rest}>
      {label}
    </div>
  );
}

/* ── Item ──────────────────────────────────────────────────────── */
function SidebarItem({
  icon,
  label,
  active    = false,
  badge,
  as        : Tag = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'ds-sidebar__item',
    active ? 'ds-sidebar__item--active' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag
      className={classes}
      aria-current={active ? 'page' : undefined}
      type={Tag === 'button' ? 'button' : undefined}
      {...rest}
    >
      {icon && (
        <span className="ds-sidebar__item-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ds-sidebar__item-label">{label ?? children}</span>
      {badge && <span className="ds-sidebar__item-badge">{badge}</span>}
    </Tag>
  );
}

/* ── Footer ────────────────────────────────────────────────────── */
function SidebarFooter({ className = '', children, ...rest }) {
  return (
    <div className={`ds-sidebar__footer ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

/* Atribuição dos subcomponentes */
Sidebar.Logo    = SidebarLogo;
Sidebar.Nav     = SidebarNav;
Sidebar.Section = SidebarSection;
Sidebar.Item    = SidebarItem;
Sidebar.Footer  = SidebarFooter;

export { Sidebar };
export default Sidebar;
