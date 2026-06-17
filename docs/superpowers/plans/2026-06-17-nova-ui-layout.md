# Nova UI Layout — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar redesign visual (dark glass, sidebar icon-only, toolbar compacta, cards expansíveis) sem alterar lógica de negócio, queries Supabase ou modais existentes.

**Architecture:** Três camadas de mudança — (1) tokens CSS novos em `tokens.css`, (2) overrides de shell/sidebar em `layout.css` via CSS puro sem tocar App.jsx, (3) substituição da tabela em `PlanilhaView.jsx` por div-cards expansíveis com toolbar pill + KPI strip. App.jsx não é tocado.

**Tech Stack:** React (JSX), CSS custom properties, Vite. Edições em PlanilhaView.jsx usam Edit tool direto (arquivo tem ~400 linhas — seguro). CSS editado com Edit tool.

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/design-system/tokens.css` | Modificar | Adicionar tokens `--glass-*` e `--row-card-*` |
| `src/design-system/layout.css` | Modificar | Gradient no shell, sidebar glass, CSS das row-cards |
| `src/views/PlanilhaView.jsx` | Modificar | Toolbar pills + KPI strip + tabela → div cards expansíveis |

App.jsx, modais, outras views: **não tocados**.

---

## Task 1: Tokens glass em `tokens.css`

**Files:**
- Modify: `src/design-system/tokens.css` (após linha 225, antes do fechamento de `:root`)

- [ ] **Step 1: Backup**

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "src/design-system/tokens.css" "src/design-system/tokens.css.bak_glass_$ts"
```

- [ ] **Step 2: Adicionar tokens glass ao final do bloco `:root`**

Abrir `src/design-system/tokens.css` e inserir antes da linha `}` de fechamento do `:root`:

```css
  /* ── Glass UI (nova UI 2026-06) ────────────────────────────────── */
  --glass-bg          : rgba(255,255,255,0.04);
  --glass-border      : rgba(255,255,255,0.07);
  --glass-blur        : blur(12px);
  --app-gradient      : linear-gradient(135deg,#0f1923 0%,#1a1040 55%,#0d1f15 100%);
  --blob-1            : rgba(79,70,229,0.18);
  --blob-2            : rgba(34,197,94,0.10);
  --blob-3            : rgba(239,68,68,0.08);
  --sidebar-glass-w   : 56px;
  --row-card-expanded-bg    : rgba(79,70,229,0.10);
  --row-card-expanded-border: #4f46e5;
  --row-card-hover-bg       : rgba(255,255,255,0.03);
  --kpi-chip-bg             : rgba(255,255,255,0.03);
  --kpi-chip-border         : rgba(255,255,255,0.07);
  --filter-pill-bg          : rgba(255,255,255,0.06);
  --filter-pill-border      : rgba(255,255,255,0.10);
  --filter-pill-active-bg   : rgba(79,70,229,0.15);
  --filter-pill-active-border: rgba(79,70,229,0.35);
  --filter-pill-active-text : #a5b4fc;
  --accent-indigo     : #4f46e5;
  --accent-indigo-glow: rgba(79,70,229,0.25);
```

- [ ] **Step 3: Verificar sintaxe**

```powershell
# Confirmar que o arquivo fecha corretamente (última linha deve ser "}")
Get-Content "src/design-system/tokens.css" | Select-Object -Last 5
```

Esperado: última linha é `}`

- [ ] **Step 4: Commit**

```powershell
git add src/design-system/tokens.css
git commit -m "feat(tokens): adicionar tokens glass UI (sidebar, row-card, kpi-chip)"
```

---

## Task 2: App shell gradient + sidebar glass em `layout.css`

**Files:**
- Modify: `src/design-system/layout.css`

- [ ] **Step 1: Backup**

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "src/design-system/layout.css" "src/design-system/layout.css.bak_glass_$ts"
```

- [ ] **Step 2: App shell — gradient de fundo**

Adicionar ao final do bloco `.co-app-wrap` existente (após a última propriedade, antes de `}`). Localizar a linha com `.co-app-wrap {` e adicionar override via seletor novo logo abaixo do bloco existente:

```css
/* ── Glass shell: gradient de fundo (override inline style via !important) ── */
[data-theme="dark"] .co-app-wrap {
  background: var(--app-gradient) !important;
  min-height: 100vh;
  position: relative;
}

/* ── Blobs decorativos ── */
[data-theme="dark"] .co-app-wrap::before,
[data-theme="dark"] .co-app-wrap::after {
  content: '';
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  filter: blur(60px);
}
[data-theme="dark"] .co-app-wrap::before {
  width: 300px; height: 240px;
  background: var(--blob-1);
  top: -60px; left: 80px;
}
[data-theme="dark"] .co-app-wrap::after {
  width: 200px; height: 160px;
  background: var(--blob-2);
  bottom: 40px; right: 60px;
}
```

- [ ] **Step 3: Sidebar — glass style**

Adicionar bloco novo logo após as regras de `.co-sidebar` existentes:

```css
/* ── Sidebar glass (nova UI 2026-06) ── */
[data-theme="dark"] .co-sidebar {
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-right: 1px solid var(--glass-border) !important;
  width: var(--sidebar-glass-w) !important;
  z-index: var(--z-sidebar);
}
[data-theme="dark"] .co-sidebar--collapsed {
  width: var(--sidebar-glass-w) !important;
}
/* Esconder labels de texto na sidebar — ícone-only */
[data-theme="dark"] .co-sidebar .co-sidebar__item-lbl,
[data-theme="dark"] .co-sidebar .co-sidebar__logo-name,
[data-theme="dark"] .co-sidebar .co-sidebar__logo-sub,
[data-theme="dark"] .co-sidebar .co-sidebar__section-lbl,
[data-theme="dark"] .co-sidebar .co-sidebar__footer-lbl,
[data-theme="dark"] .co-sidebar .co-sidebar__user-info,
[data-theme="dark"] .co-sidebar .co-sidebar__toggle {
  display: none !important;
}
[data-theme="dark"] .co-sidebar .co-sidebar__logo {
  justify-content: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--glass-border);
}
[data-theme="dark"] .co-sidebar__logo-ico {
  width: 30px; height: 30px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
  border-radius: 8px !important;
  border: none !important;
}
[data-theme="dark"] .co-sidebar .co-sidebar__item {
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
}
[data-theme="dark"] .co-sidebar .co-sidebar__item--active {
  background: rgba(79,70,229,0.30) !important;
  border: 1px solid rgba(79,70,229,0.45) !important;
}
[data-theme="dark"] .co-sidebar .co-sidebar__item--active::before {
  display: none; /* remove borda-left — substituída por fundo */
}
[data-theme="dark"] .co-sidebar .co-sidebar__item--active .co-sidebar__ico svg {
  stroke: #a5b4fc !important;
  opacity: 1 !important;
}
[data-theme="dark"] .co-sidebar .co-sidebar__ico svg {
  opacity: 0.55;
}
[data-theme="dark"] .co-sidebar .co-sidebar__item:hover .co-sidebar__ico svg {
  opacity: 0.9;
}
[data-theme="dark"] .co-sidebar .co-sidebar__footer {
  padding: 10px 0;
  border-top: 1px solid var(--glass-border);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
[data-theme="dark"] .co-sidebar .co-sidebar__user {
  flex-direction: column;
  padding: 4px 0;
}
/* co-main: ajustar margem para sidebar 56px */
[data-theme="dark"] .co-main {
  margin-left: var(--sidebar-glass-w) !important;
}
[data-theme="dark"] .co-main--collapsed {
  margin-left: var(--sidebar-glass-w) !important;
}
```

- [ ] **Step 4: Row-card CSS (usado pela PlanilhaView)**

Adicionar ao final do arquivo:

```css
/* ════════════════════════════════════════════════════════════════════
   ROW CARDS — PlanilhaView nova UI (2026-06)
   ════════════════════════════════════════════════════════════════════ */
.pv-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 14px 16px;
  box-sizing: border-box;
}

/* Toolbar com filtros pill */
.pv-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  flex-shrink: 0;
}
.pv-filter-pill {
  background: var(--filter-pill-bg);
  border: 1px solid var(--filter-pill-border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  color: rgba(255,255,255,0.65);
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--font-body);
  transition: all 150ms ease;
}
.pv-filter-pill:hover {
  background: rgba(255,255,255,0.09);
  color: var(--text);
}
.pv-filter-pill.active {
  background: var(--filter-pill-active-bg);
  border-color: var(--filter-pill-active-border);
  color: var(--filter-pill-active-text);
}
.pv-btn-new {
  background: rgba(79,70,229,0.25);
  border: 1px solid rgba(79,70,229,0.5);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 11px;
  color: #a5b4fc;
  cursor: pointer;
  font-weight: 600;
  font-family: var(--font-body);
  transition: all 150ms ease;
}
.pv-btn-new:hover {
  background: rgba(79,70,229,0.4);
}
.pv-spacer { flex: 1; }

/* KPI strip */
.pv-kpi-strip {
  display: flex;
  gap: 8px;
  height: 34px;
  flex-shrink: 0;
}
.pv-kpi-chip {
  flex: 1;
  background: var(--kpi-chip-bg);
  border: 1px solid var(--kpi-chip-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 6px;
}
.pv-kpi-value {
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-mono);
}
.pv-kpi-label {
  font-size: 10px;
  color: rgba(255,255,255,0.3);
  font-family: var(--font-body);
}

/* Tabela container */
.pv-table-wrap {
  flex: 1;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.pv-table-header {
  display: flex;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.pv-th {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--font-mono);
}
.pv-rows {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.pv-rows::-webkit-scrollbar { width: 4px; }
.pv-rows::-webkit-scrollbar-track { background: transparent; }
.pv-rows::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }

/* Row card */
.pv-row-card {
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.pv-row-main {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 120ms ease;
  gap: 0;
  user-select: none;
}
.pv-row-main:hover { background: var(--row-card-hover-bg); }
.pv-row-card.expanded .pv-row-main {
  background: var(--row-card-expanded-bg);
  border-left: 2px solid var(--row-card-expanded-border);
  padding-left: 12px;
}
.pv-row-detail {
  display: none;
  padding: 0 14px 10px 14px;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.pv-row-card.expanded .pv-row-detail { display: flex; }
.pv-detail-chip {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 6px;
  padding: 5px 10px;
}
.pv-detail-chip .dc-label {
  font-size: 9px;
  color: rgba(255,255,255,0.3);
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-family: var(--font-mono);
}
.pv-detail-chip .dc-val {
  font-size: 11px;
  color: rgba(255,255,255,0.8);
  font-family: var(--font-body);
}
.pv-detail-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
  align-items: center;
}
.pv-btn-action {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 120ms ease;
}
.pv-btn-action:hover { background: rgba(255,255,255,0.10); color: var(--text); }
.pv-btn-action.primary {
  background: rgba(79,70,229,0.20);
  border-color: rgba(79,70,229,0.40);
  color: #a5b4fc;
}
.pv-btn-action.primary:hover { background: rgba(79,70,229,0.35); }

/* Status badges pill */
.pv-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px;
  border-radius: 20px;
  padding: 2px 8px;
  font-family: var(--font-body);
  white-space: nowrap;
}
.pv-badge-ok      { background:rgba(34,197,94,0.12);  color:#86efac;  border:1px solid rgba(34,197,94,0.20); }
.pv-badge-pend    { background:rgba(234,179,8,0.12);  color:#fde68a;  border:1px solid rgba(234,179,8,0.20); }
.pv-badge-atraso  { background:rgba(239,68,68,0.12);  color:#fca5a5;  border:1px solid rgba(239,68,68,0.20); }
.pv-badge-transito{ background:rgba(79,70,229,0.12);  color:#a5b4fc;  border:1px solid rgba(79,70,229,0.20); }
.pv-badge-default { background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.10); }

/* Toggle arrow */
.pv-toggle { font-size: 10px; color: rgba(255,255,255,0.25); user-select: none; }

/* Paginação */
.pv-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  font-family: var(--font-body);
}
.pv-page-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  font-family: var(--font-body);
}
.pv-page-btn:disabled { opacity: 0.35; cursor: default; }

/* Tema light: não aplicar glass */
[data-theme="light"] .pv-shell,
[data-theme="light"] .pv-toolbar,
[data-theme="light"] .pv-kpi-strip,
[data-theme="light"] .pv-table-wrap { /* herda estilos existentes via fallback */ }
```

- [ ] **Step 5: Verificar no browser**

```powershell
# Já deve estar rodando. Se não:
cd "C:/Users/yvesf/DevYFGroup/controle-operacional"
npm run dev
```

Abrir http://localhost:5173, fazer login, verificar:
- Fundo do app: gradiente escuro azul/roxo/verde ✓
- Sidebar: estreita (56px), ícones centrados, sem labels ✓
- Aba ativa: fundo roxo translúcido com borda ✓

- [ ] **Step 6: Commit**

```powershell
git add src/design-system/layout.css
git commit -m "feat(layout): glass shell gradient + sidebar icon-only + row-card CSS"
```

---

## Task 3: PlanilhaView — Toolbar + KPI Strip + Cards expansíveis

**Files:**
- Modify: `src/views/PlanilhaView.jsx`

Esta task substitui o `<table>` atual por div-cards expansíveis, mantendo toda a lógica de filtro/sort/paginação existente e todos os `ctx.*` callbacks inalterados.

- [ ] **Step 1: Ler PlanilhaView completa para mapear estrutura atual**

```powershell
Get-Content "src/views/PlanilhaView.jsx" | Select-Object -First 50
```

Identificar: onde começa o `return (`, onde está o `<table>`, quais colunas são renderizadas, como o status é exibido atualmente.

- [ ] **Step 2: Backup**

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "src/views/PlanilhaView.jsx" "src/views/PlanilhaView.jsx.bak_glass_$ts"
```

- [ ] **Step 3: Adicionar estado de expanded rows e helpers de badge**

Adicionar após os imports existentes e antes do `export default`:

```jsx
// ── Estado de linhas expandidas ────────────────────────────────────────────
// Mantido em Set para O(1) toggle
import { useState as _useState } from "react"; // já importado via React

function usePvExpanded() {
  const [expanded, setExpanded] = _useState(() => new Set());
  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  return [expanded, toggle];
}

// ── Badge de status ────────────────────────────────────────────────────────
function PvBadge({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "pv-badge pv-badge-default";
  if (s.includes("ok") || s.includes("concluí") || s.includes("normal")) cls = "pv-badge pv-badge-ok";
  else if (s.includes("pend") || s.includes("aguard")) cls = "pv-badge pv-badge-pend";
  else if (s.includes("atraso") || s.includes("atrasad")) cls = "pv-badge pv-badge-atraso";
  else if (s.includes("trânsito") || s.includes("transito") || s.includes("viagem")) cls = "pv-badge pv-badge-transito";
  return <span className={cls}>● {status || "—"}</span>;
}

// ── Formata moeda sem ctx ──────────────────────────────────────────────────
function fmtR(v) {
  const n = parseFloat(String(v || "0").replace(/\./g,"").replace(",","."));
  if (isNaN(n)) return "—";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Calcula margem de um registro ─────────────────────────────────────────
function calcMargem(row) {
  const cte = parseFloat(String(row.vl_cte || row.cte || 0).replace(/\./g,"").replace(",",".")) || 0;
  const cont = parseFloat(String(row.vl_contrato || row.contrato || 0).replace(/\./g,"").replace(",",".")) || 0;
  if (!cte && !cont) return null;
  return cte - cont;
}
```

**Atenção:** O `useState` já é importado via `import React from "react"` — se o arquivo já usa `const [x,setX] = React.useState(...)` ou desestruturado, ajustar o helper `usePvExpanded` para usar o mesmo padrão. Se o arquivo usa `import React, { useState } from "react"`, remover o `import { useState as _useState }` e usar `useState` diretamente.

- [ ] **Step 4: Substituir o componente principal exportado**

Localizar a função principal exportada (geralmente `export default function PlanilhaView({ ctx })` ou similar). Substituir o bloco do `return (...)` para usar as novas classes CSS, mantendo toda a lógica de filtragem/sort/paginação inalterada.

O novo retorno deve seguir esta estrutura (adaptar nomes de variáveis conforme o que existir no arquivo):

```jsx
// Dentro da função PlanilhaView, após toda a lógica de filtro/sort/page existente:

const [pvExpanded, pvToggle] = usePvExpanded();

// KPI computados a partir dos dados filtrados (pageRows = registros da página atual)
const totalViagens = filteredRows.length; // usar o nome da variável de rows filtradas
const totalMargem  = filteredRows.reduce((acc, r) => {
  const m = calcMargem(r); return acc + (m || 0);
}, 0);
const pendentes    = filteredRows.filter(r => {
  const s = (r.status || "").toLowerCase();
  return s.includes("pend") || s.includes("aguard") || s.includes("atraso");
}).length;

// Callback para abrir modal de edição (usar o existente ctx.abrirDetalhe ou similar)
const handleEditar = (row, e) => {
  e.stopPropagation();
  if (ctx.abrirDetalhe) ctx.abrirDetalhe(row);
};

return (
  <div className="pv-shell">
    {/* ── Toolbar ── */}
    <div className="pv-toolbar">
      {/* Filtro de base — se houver, já vem do ctx como baseAtual */}
      {ctx.baseAtual && (
        <span className="pv-filter-pill active">{ctx.baseAtual.nome || ctx.baseAtual.label} ▾</span>
      )}
      {/* Filtro de mês existente — reutilizar o select existente mas estilizado como pill */}
      <select
        className="pv-filter-pill"
        value={ctx.planilhaFiltroMes || ""}
        onChange={e => { ctx.setPlanilhaFiltroMes(e.target.value); ctx.setPlanilhaPagina(1); }}
        style={{ appearance: "none", paddingRight: 20 }}
      >
        <option value="">Todos os meses</option>
        {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
          <option key={m} value={m}>{MESES_PT[m]}</option>
        ))}
      </select>
      {/* Filtro de ano */}
      <select
        className="pv-filter-pill"
        value={ctx.planilhaFiltroAno || ""}
        onChange={e => { ctx.setPlanilhaFiltroAno(e.target.value); ctx.setPlanilhaPagina(1); }}
        style={{ appearance: "none" }}
      >
        <option value="">Todos os anos</option>
        {["2024","2025","2026"].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <div className="pv-spacer" />
      {/* Botão nova operação — se ctx tiver callback de nova entrada */}
      {ctx.abrirNovaEntrada && (
        <button className="pv-btn-new" onClick={ctx.abrirNovaEntrada}>+ Nova operação</button>
      )}
    </div>

    {/* ── KPI strip ── */}
    <div className="pv-kpi-strip">
      <div className="pv-kpi-chip">
        <span className="pv-kpi-value" style={{ color: "#a5b4fc" }}>{totalViagens}</span>
        <span className="pv-kpi-label">viagens</span>
      </div>
      <div className="pv-kpi-chip">
        <span className="pv-kpi-value" style={{ color: totalMargem >= 0 ? "#86efac" : "#fca5a5" }}>
          {fmtR(totalMargem)}
        </span>
        <span className="pv-kpi-label">margem total</span>
      </div>
      <div className="pv-kpi-chip">
        <span className="pv-kpi-value" style={{ color: pendentes > 0 ? "#fca5a5" : "#86efac" }}>{pendentes}</span>
        <span className="pv-kpi-label">pendentes/atraso</span>
      </div>
      <div className="pv-kpi-chip">
        <span className="pv-kpi-value" style={{ color: "#fde68a" }}>{pageRows.length}</span>
        <span className="pv-kpi-label">nesta página</span>
      </div>
    </div>

    {/* ── Tabela / Cards ── */}
    <div className="pv-table-wrap">
      {/* Header */}
      <div className="pv-table-header">
        <div className="pv-th" style={{ flex: "1.2" }}>Código</div>
        <div className="pv-th" style={{ flex: "2" }}>Motorista</div>
        <div className="pv-th" style={{ flex: "2" }}>Rota</div>
        <div className="pv-th" style={{ flex: "1.2" }}>Status</div>
        <div className="pv-th" style={{ flex: "1.2" }}>Margem</div>
        <div className="pv-th" style={{ width: 28 }}></div>
      </div>

      {/* Rows */}
      <div className="pv-rows">
        {pageRows.map((row, i) => {
          const rowId = row.id || row.codigo || i;
          const isExpanded = pvExpanded.has(rowId);
          const margem = calcMargem(row);
          const margemColor = margem == null ? "inherit"
            : margem >= 0 ? "#86efac" : "#fca5a5";
          const rota = [row.origem, row.destino].filter(Boolean).join(" → ") || "—";

          return (
            <div key={rowId} className={`pv-row-card${isExpanded ? " expanded" : ""}`}>
              {/* Linha principal — clicável para expandir */}
              <div className="pv-row-main" onClick={() => pvToggle(rowId)}>
                <div style={{ flex: "1.2", fontSize: 11, color: "#a5b4fc", fontFamily: "var(--font-mono)" }}>
                  {row.codigo || row.id || `#${i+1}`}
                </div>
                <div style={{ flex: 2, fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                  {row.nome || row.motorista || "—"}
                </div>
                <div style={{ flex: 2, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{rota}</div>
                <div style={{ flex: "1.2" }}>
                  <PvBadge status={row.status} />
                </div>
                <div style={{ flex: "1.2", fontSize: 11, fontWeight: 600, color: margemColor }}>
                  {margem != null ? fmtR(margem) : "—"}
                </div>
                <div className="pv-toggle" style={{ width: 28, textAlign: "center" }}>
                  {isExpanded ? "▴" : "▾"}
                </div>
              </div>

              {/* Detalhe expandido */}
              <div className="pv-row-detail">
                {row.placa && (
                  <div className="pv-detail-chip">
                    <div className="dc-label">Placa</div>
                    <div className="dc-val">{row.placa}</div>
                  </div>
                )}
                {(row.vl_cte || row.cte) && (
                  <div className="pv-detail-chip">
                    <div className="dc-label">CTE</div>
                    <div className="dc-val">{fmtR(row.vl_cte || row.cte)}</div>
                  </div>
                )}
                {(row.vl_contrato || row.contrato) && (
                  <div className="pv-detail-chip">
                    <div className="dc-label">Contrato</div>
                    <div className="dc-val">{fmtR(row.vl_contrato || row.contrato)}</div>
                  </div>
                )}
                {row.data_carr && (
                  <div className="pv-detail-chip">
                    <div className="dc-label">Carreg.</div>
                    <div className="dc-val">{row.data_carr}</div>
                  </div>
                )}
                {(row.data_desc || row.data_final) && (
                  <div className="pv-detail-chip">
                    <div className="dc-label">Descarga</div>
                    <div className="dc-val">{row.data_desc || row.data_final}</div>
                  </div>
                )}
                {row.contratante && (
                  <div className="pv-detail-chip">
                    <div className="dc-label">Contratante</div>
                    <div className="dc-val">{row.contratante}</div>
                  </div>
                )}
                <div className="pv-detail-actions">
                  {ctx.abrirDetalhe && (
                    <button className="pv-btn-action primary" onClick={e => handleEditar(row, e)}>
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {pageRows.length === 0 && (
          <div style={{ padding: "40px 14px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
            Nenhum registro encontrado
          </div>
        )}
      </div>

      {/* Paginação */}
      {filteredRows.length > REGISTROS_POR_PAGINA && (
        <div className="pv-pagination">
          <button
            className="pv-page-btn"
            disabled={ctx.planilhaPagina <= 1}
            onClick={() => ctx.setPlanilhaPagina(p => p - 1)}
          >← Ant</button>
          <span>Pág {ctx.planilhaPagina} / {Math.ceil(filteredRows.length / REGISTROS_POR_PAGINA)}</span>
          <button
            className="pv-page-btn"
            disabled={ctx.planilhaPagina >= Math.ceil(filteredRows.length / REGISTROS_POR_PAGINA)}
            onClick={() => ctx.setPlanilhaPagina(p => p + 1)}
          >Próx →</button>
          <div className="pv-spacer" />
          <span>{filteredRows.length} registros</span>
        </div>
      )}
    </div>
  </div>
);
```

**Nota importante:** Os nomes `filteredRows` e `pageRows` devem ser substituídos pelos nomes reais usados no arquivo atual. Ler o arquivo antes de editar (Step 1) para mapear esses nomes. Tipicamente são `dados`, `filtrados`, `linhas`, etc.

- [ ] **Step 5: Ajuste fino — verificar variáveis**

Após editar, verificar no console do browser se há erros de `undefined`. Ajustar nomes conforme necessário.

- [ ] **Step 6: Verificar no browser**

Abrir a aba "Planilha" (ou "Operacional") no app. Verificar:
- KPI strip mostra contagens corretas ✓
- Filtros de mês/ano funcionam ✓
- Clicar em uma linha expande/colapsa o detalhe ✓
- Campos de detalhe (placa, CTE, contrato) aparecem quando disponíveis ✓
- Botão Editar chama o modal existente ✓

- [ ] **Step 7: Commit**

```powershell
git add src/views/PlanilhaView.jsx
git commit -m "feat(planilha): toolbar pill + KPI strip + cards expansíveis (glass UI)"
```

---

## Task 4: Ajustes finais e revisão visual

- [ ] **Step 1: Verificar sidebar mobile**

Em tela menor (< 768px), a sidebar em modo mobile pode ter comportamento diferente. Verificar se o overlay mobile ainda funciona. Se a sidebar sumir completamente no mobile, adicionar override:

```css
/* em layout.css — mobile: não aplicar glass (sidebar modal overlay) */
@media (max-width: 767px) {
  [data-theme="dark"] .co-sidebar {
    width: 220px !important; /* restaura largura para overlay mobile */
  }
  [data-theme="dark"] .co-sidebar .co-sidebar__item-lbl,
  [data-theme="dark"] .co-sidebar .co-sidebar__logo-name,
  [data-theme="dark"] .co-sidebar .co-sidebar__logo-sub {
    display: inline !important; /* mostra labels no mobile overlay */
  }
  [data-theme="dark"] .co-main {
    margin-left: 0 !important;
  }
}
```

- [ ] **Step 2: Verificar tema light**

Trocar para tema claro no app. Os overrides usam `[data-theme="dark"]` então o tema claro deve continuar funcionando normalmente com o design anterior.

- [ ] **Step 3: Commit final**

```powershell
git add src/design-system/layout.css
git commit -m "fix(ui): mobile sidebar overlay + light theme não afetado"
```

---

## Notas de Implementação

- **Nomes de variáveis em PlanilhaView:** Antes de editar, sempre ler o arquivo atual pois os nomes exatos (`filteredRows`, `pageRows`, etc.) podem diferir.
- **App.jsx:** Nunca editar diretamente nesta implementação — todas as mudanças visuais são via CSS ou PlanilhaView.jsx.
- **Modais:** O botão "Editar" no detalhe expandido usa `ctx.abrirDetalhe(row)` — o mesmo callback que a tabela antiga usava. Nenhum modal é alterado.
- **Dados AVB vs outros:** `COLS_AVB` tem campos como `vl_contrato`, `codigo`, `contratante`. A lógica de fallback no `calcMargem` e nos chips de detalhe cobre ambos os formatos.
