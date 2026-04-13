# Design System — Changelog

## 2026-04-12 · Sessão DS-02

**Solicitado:** Refatoração global de layout — sidebar lateral colapsável desktop, nav mobile scrollável estilo Binance, dark mode corporativo dourado, padronização completa de cores/tipografia/espaçamentos/radius/componentes.

**Implementado:**

### App.jsx — Layout Shell
- Adicionados estados `isWide` (≥768px) e `sidebarCollapsed` (persistido em localStorage)
- Outer wrapper recebeu classe `co-app-wrap` (flex row)
- Desktop (≥768px): sidebar fixa esquerda 220px (ou 64px colapsada) com logo, nav items, footer utilitário (sync, alertas, relatórios, WPP, tema, logout)
- Topbar desktop: sticky, mostra título da aba ativa + pill de status de conexão + botão "Nova DT"
- Mobile (<768px): topbar com logo + ações compactas; bottom nav scrollável com `overflow-x:auto`
- FAB removido do desktop (substituído pelo botão "Nova DT" no topbar); mantido no mobile

### CSS injetado no `<style>` do App.jsx
- `.co-app-wrap`, `.co-sidebar`, `.co-sidebar--collapsed`, `.co-sidebar__logo`, `.co-sidebar__nav`, `.co-sidebar__item`, `.co-sidebar__footer`
- `.co-main`, `.co-main--collapsed` com `margin-left` dinâmico
- `.co-mobile-nav`, `.co-mobile-nav__item`, `.co-mobile-nav__lbl` — nav horizontal scrollável
- Media queries: sidebar oculta ≤767px, mobile nav oculta ≥768px

### Backups
- `src/App.jsx.bckp_20260412_214525`
- `src/design-system/components.css.bckp_20260412_214525`

---

## 2026-04-12 · Sessão DS-01

**Solicitado:** Refatorar o app para usar um design system centralizado com tokens CSS, temas dark/light e componentes reutilizáveis proibindo cores hardcoded.

**Implementado:**

### Arquivos criados em `src/design-system/`

| Arquivo | Conteúdo |
|---|---|
| `tokens.css` | CSS custom properties imutáveis: tipografia, espaçamento, radius, ícones, layout, z-index, transições, dimensões de componente |
| `theme-dark.css` | Tema escuro: todas as cores como `var(--color-*)` + sombras. Ativação: `data-theme="dark"` |
| `theme-light.css` | Tema claro: mesmas variáveis, valores ajustados para contraste AA. Ativação: `data-theme="light"` |
| `components.css` | Estilos base de todos os componentes usando **somente** `var(--)` — proibição de hardcode enforced |
| `components/Button.jsx` | Variantes: primary, secondary, ghost, outline, danger, danger-ghost, success. Tamanhos sm/md/lg/xl. Props: loading, iconOnly, as |
| `components/Card.jsx` | Subcomponentes: Header, Title, Subtitle, Body, Footer. Variantes: flat, elevated, hoverable, accent-*. Export extra: `KpiCard` |
| `components/Input.jsx` | `<Field>` (label+hint+error), `<Input>` (com suporte a ícone), `<Select>`, `<Textarea>`. forwardRef em todos |
| `components/Badge.jsx` | Variantes: default, primary, primary-solid, success, danger, warning, info. `<StatusBadge>` com mapeamento semântico |
| `components/Table.jsx` | Colunas configuráveis, ordenação interna/controlled, toolbar integrada, estado vazio, compact mode |
| `components/Sidebar.jsx` | Colapsável, subcomponentes: Logo, Nav, Section, Item (active/badge), Footer |
| `index.js` | Barrel export de todos os componentes |

### Como ativar o tema no app

```jsx
// main.jsx ou App.jsx — aplicar data-theme dinamicamente
document.documentElement.setAttribute('data-theme', tema); // 'dark' ou 'light'
```

### Como importar os CSS (em main.jsx)

```js
import './design-system/tokens.css'
import './design-system/theme-dark.css'
import './design-system/theme-light.css'
import './design-system/components.css'
```

### Regra central

> Altere uma variável em `tokens.css` ou `theme-dark.css` → todo o app muda visualmente.
> Nenhum componente contém cor, radius ou sombra hardcoded.

## DS-03 — Módulo de Relatórios Dinâmicos (2026-04-12)

**Solicitado:** Criar módulo de relatórios configuráveis com catálogo de campos, seletor visual, filtros, agrupamento, preview e exportação em paisagem A4.

**Implementado:**
- `src/relatorios/fieldCatalog.js` — catálogo central com 50+ campos (Planilha, Diárias, Apontamentos, SGS, Motoristas). Estrutura: id, label, key, origem, tipo, modulo, visivelPadrao, exportavel, filtravel, agrupavel, largura, alinhamento, formato, ordem. Formatters: data-br, datetime-br, moeda, upper, numero.
- `src/relatorios/ReportBuilder.jsx` — componente autônomo: sidebar de seleção de campos agrupados por módulo, toolbar com filtros (nome, origem, destino, intervalo de datas, status pills), seletor de módulo/origem, agrupamento dinâmico com collapse, ordenação por clique em coluna, paginação (50/pág), exportação CSV (UTF-8 BOM) e impressão A4 landscape via nova janela (`@page { size: A4 landscape; }`).
- `src/App.jsx` — import + tab "Relatórios" adicionada ao array `tabs` (ícone documento) + bloco `{activeTab === "relatorios" && <ReportBuilder .../>}` com full-width e altura calculada. Build: ✓ 2.19s.
- Backup anterior: `App.jsx.bckp_relat_20260412_220502`
