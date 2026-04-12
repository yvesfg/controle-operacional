/**
 * design-system/index.js — barrel export
 * Importe tudo de um único ponto:
 *   import { Button, Card, Badge, ... } from '@/design-system'
 *
 * CSS deve ser importado separadamente no entry-point do app (main.jsx):
 *   import './design-system/tokens.css'
 *   import './design-system/theme-dark.css'
 *   import './design-system/theme-light.css'
 *   import './design-system/components.css'
 */

/* ── Componentes ─────────────────────────────────────────────── */
export { Button }                         from './components/Button.jsx';
export { Card, KpiCard }                  from './components/Card.jsx';
export { Field, Input, Select, Textarea } from './components/Input.jsx';
export { Badge, StatusBadge, BADGE_STATUS } from './components/Badge.jsx';
export { Table, TableToolbar }            from './components/Table.jsx';
export { Sidebar }                        from './components/Sidebar.jsx';

/* ── Default exports (conveniência) ─────────────────────────── */
export { default as ButtonDefault }  from './components/Button.jsx';
export { default as CardDefault }    from './components/Card.jsx';
export { default as InputDefault }   from './components/Input.jsx';
export { default as BadgeDefault }   from './components/Badge.jsx';
export { default as TableDefault }   from './components/Table.jsx';
export { default as SidebarDefault } from './components/Sidebar.jsx';
