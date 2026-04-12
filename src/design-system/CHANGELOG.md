# Design System — Changelog

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
