/**
 * Table — tabela de dados com toolbar, ordenação e estado vazio
 * Consome somente tokens globais via classes CSS (components.css)
 * ─────────────────────────────────────────────────────────────────
 * Exportações:
 *   <Table>           — componente completo (controlled ou uncontrolled)
 *   <TableToolbar>    — barra acima da tabela (count + ações)
 *
 * Props de Table:
 *   columns  : Array<{ key, label, sortable?, render?, mono?, align? }>
 *   data     : Array<object>
 *   rowKey   : string | fn(row) → key    (default: 'id')
 *   compact  : boolean
 *   onRowClick: fn(row)
 *   emptyText: string
 *   toolbar  : ReactNode — conteúdo da toolbar
 *   sortKey  : string (controlled)
 *   sortDir  : 'asc' | 'desc' (controlled)
 *   onSort   : fn(key) (controlled)
 *   className: string
 */
import React, { useState, useCallback } from 'react';

/* ── Ícones de ordenação inline (sem dependências) ─────────────── */
function SortIcon({ active, dir }) {
  const color = active ? 'var(--color-primary)' : 'var(--color-text-disabled)';
  if (active && dir === 'asc') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M5 2L9 8H1L5 2Z" fill={color}/>
      </svg>
    );
  }
  if (active && dir === 'desc') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M5 8L1 2H9L5 8Z" fill={color}/>
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M5 1L8 5H2L5 1Z" fill={color}/>
      <path d="M5 9L2 5H8L5 9Z" fill={color}/>
    </svg>
  );
}

/* ── TableToolbar ──────────────────────────────────────────────── */
export function TableToolbar({ count, label = 'registro', children, className = '' }) {
  return (
    <div className={`ds-table-toolbar ${className}`.trim()}>
      {count !== undefined && (
        <span className="ds-table-toolbar__count">
          {count} {count === 1 ? label : `${label}s`}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Table ─────────────────────────────────────────────────────── */
export function Table({
  columns    = [],
  data       = [],
  rowKey     = 'id',
  compact    = false,
  onRowClick,
  emptyText  = 'Nenhum registro encontrado.',
  toolbar,
  /* ordenação controlled */
  sortKey    : sortKeyProp,
  sortDir    : sortDirProp,
  onSort,
  className  = '',
  ...rest
}) {
  /* ordenação interna (uncontrolled) */
  const [internalSortKey, setInternalSortKey] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState('asc');

  const isControlled = sortKeyProp !== undefined;
  const sortKey = isControlled ? sortKeyProp : internalSortKey;
  const sortDir = isControlled ? sortDirProp : internalSortDir;

  const handleSort = useCallback((key) => {
    if (isControlled) {
      onSort?.(key);
      return;
    }
    setInternalSortDir(prev => (internalSortKey === key && prev === 'asc') ? 'desc' : 'asc');
    setInternalSortKey(key);
  }, [isControlled, internalSortKey, onSort]);

  /* ordenação interna dos dados */
  const rows = React.useMemo(() => {
    if (!sortKey || isControlled) return data;
    return [...data].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, isControlled]);

  const getKey = typeof rowKey === 'function'
    ? rowKey
    : (row, i) => row[rowKey] ?? i;

  const wrapClasses = [
    'ds-table-wrap',
    className,
  ].filter(Boolean).join(' ');

  const tableClasses = [
    'ds-table',
    compact ? 'ds-table--compact' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapClasses} {...rest}>
      {toolbar}
      <table className={tableClasses}>
        <thead>
          <tr>
            {columns.map(col => {
              const isActive = sortKey === col.key;
              const thClass  = [
                col.sortable ? 'ds-table__th--sortable' : '',
                isActive     ? 'ds-table__th--active'   : '',
              ].filter(Boolean).join(' ');
              return (
                <th
                  key={col.key}
                  className={thClass}
                  style={{ textAlign: col.align ?? 'left' }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {col.label}
                    {col.sortable && <SortIcon active={isActive} dir={sortDir} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="ds-table-empty">{emptyText}</div>
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={col.mono ? 'ds-table__td--mono' : ''}
                    style={{ textAlign: col.align ?? 'left' }}
                  >
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
