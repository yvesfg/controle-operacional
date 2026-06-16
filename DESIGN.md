# DESIGN.md — Controle Operacional YFGroup

> **Fonte única de verdade do design.** Este documento descreve o sistema **realmente em produção**.
> Os valores vivem em `src/design-system/` (CSS) e são espelhados em JS por `src/constants.js`.
> Docs antigos (Mercury, Binance-yellow) foram arquivados em `docs/design-archive/` — não use.

**Register:** product · **Tema:** dark (padrão) + light · **Identidade:** Steel Blue Premium

---

## Arquitetura — como o design é centralizado

Toda alteração de cor/tipografia/espaçamento deve passar por **uma** das camadas abaixo, nunca por hex solto no JSX.

```
src/design-system/
  tokens.css        ← tipografia, espaçamento, radii, z-index, transições, dimensões (NÃO tem cor)
  theme-dark.css    ← TODAS as cores do tema escuro  (+ override [data-base="avb"])
  theme-light.css   ← TODAS as cores do tema claro
src/constants.js
  _t   (objeto `t`) ← proxy JS: cada chave aponta para uma CSS var  (ex.: t.ouro = "var(--accent)")
  DESIGN           ← radii + fontes via var(--…)
  css              ← presets de estilo inline (css.card, css.inp, css.kpi…)
```

**Regra de ouro:** mudar um token em `theme-dark.css` / `theme-light.css` / `tokens.css` propaga para todo o app — tanto para `var(--…)` quanto para `t.*` (que é só um proxy de CSS var). Foi assim que a migração Binance-yellow → Steel Blue não exigiu tocar JSX (ver CHANGELOG em constants.js).

**Troca de tema:** `data-theme="dark|light"` no `<html>` (persistido em `localStorage.co_theme`).
**Identidade por filial:** `data-base="avb"` troca o accent para laranja operacional (Açailândia).

---

## Tokens — Cores (tema dark)

### Backgrounds (camadas com profundidade)
| Token | Valor | Papel |
|---|---|---|
| `--color-bg` / `--bg` | `#080c12` | base da página |
| `--color-bg-alt` / `--surface` | `#0f1520` | surface acima do bg |
| `--color-card` / `--card` | `#131c28` | card padrão |
| `--color-card-2` / `--card2` | `#1a2540` | card elevado / hover fill |
| `--color-modal-bg` | `#0f1722` | modal |
| `--color-input-bg` | `#0b1219` | input (mais fundo que card) |
| `--color-table-header` | `#0b1016` | thead |

### Texto (3 níveis) — **contraste verificado WCAG AA**
| Token | Valor | Contraste s/ card | Uso |
|---|---|---|---|
| `--color-text` / `--text` | `#dde5f0` | ~13:1 | texto primário |
| `--color-text-2` / `--text2` | `#8892a8` | ~5.4:1 ✅ | secundário, labels, meta |
| `--color-text-3` / `--text3` | `#7c89a6` | ~4.6:1 ✅ | terciário / placeholder / labels pequenos |
| `--color-text-disabled` | `#2e3e56` | — | desabilitado |

> ⚠️ `--text-3` foi `#4e5e78` (2.6:1, **falhava AA**) e foi corrigido para `#7c89a6`. Como muitos rótulos
> (headers mono uppercase de card) usam `var(--text3)`, este token precisa ficar legível mesmo a 9–11px.
> Regra: rótulo pequeno e importante usa `--text2` ou `--text3`; **nunca** abaixo de 4.5:1.

### Accent (Steel Blue) + por-filial
| Token | dark | papel |
|---|---|---|
| `--color-primary` / `--accent` | `#3b82f6` | accent principal |
| `--color-primary-dk` | `#2563eb` | hover/pressed |
| `--color-primary-lt` | `#60a5fa` | realce |
| `--color-primary-text` | `#93c5fd` | texto sobre fundo azul escuro |
| **AVB** `[data-base="avb"]` `--accent` | `#FF6B35` | laranja operacional (Açailândia) |

### Status — **semântico, fonte única**
A mesma situação deve ter a mesma cor em todo widget. Use **só** estes tokens:
| Estado | Token | dark |
|---|---|---|
| sucesso / no prazo / entregue | `--color-success` / `--green` | `#10b981` |
| atenção / pendente | `--color-warning` / `--orange` | `#f59e0b` |
| erro / atraso / crítico | `--color-danger` / `--red` | `#ef4444` |
| info / em rota | `--color-info` / `--cyan` | `#06b6d4` |

Não introduza novos hexes de status no JSX (ver leak conhecido abaixo). `--yellow` (`#eab308`) existe por retrocompat; para "atenção" prefira `--orange`/`--color-warning`.

### Categorias — `--cat-*` (não confundir com status)
Paleta para **mapas multi-estado** que precisam de mais hues que os 4 status (tipos de ocorrência, reconciliação RODORRICA, badges, tiles). Os mapas (`tipoColors`, `TIPOS`/`TIPOS_NFD`, `STATUS_COR`/`_confCor`, `BADGE_COLORS`) apontam pra estes tokens — mude o token e propaga em todos:
`--cat-blue` `--cat-red` `--cat-coral` `--cat-orange` `--cat-amber` `--cat-gold` `--cat-purple` `--cat-pink` `--cat-green` `--cat-mint` `--cat-gray`. Dark = valores históricos (refactor sem mudança visual); light = variantes mais escuras p/ contraste em branco. **Status** (prazo/atraso/pendente/crítico) continua usando `--green/--orange/--red/--cyan`; `--cat-*` é só para diferenciação de categoria.

### Bordas / chips / sombras
- Bordas: `--border #1a2436`, `--border2 #243348`, `--color-border-subtle rgba(255,255,255,.04)`.
- Chips de status: `--chip-{success,danger,warning,info,neutral}-{bg,border,text}` (bg sutil + borda semântica).
- Sombras contidas: `--shadow-lg 0 8px 32px rgba(0,0,0,.6)`; sem glow excessivo. Elevação por cor/opacidade, não sombra.

### Tema light (resumo)
bg `#f5f8fc`, card `#ffffff`, text `#0f1825`, text-2 `#4a5a72`, **text-3 `#5f6f88`** (corrigido p/ ≥5:1 em branco), mesmo accent `#3b82f6`, status em variantes mais escuras (success `#059669`, danger `#dc2626`, warning `#d97706`, info `#0891b2`).

---

## Tokens — Tipografia
- **Display/Headings:** Satoshi (`--font-heading`) — 400/500/600/700/900.
- **Body/Labels:** Satoshi (`--font-body`).
- **Mono/Dados/Códigos:** IBM Plex Mono (`--font-mono`) — números, placas, labels uppercase.
- Escala: `--text-2xs 10` · `xs 11` · `sm 12` · `base 13` · `md 14` · `lg 16` · `xl 20` · `2xl 24` · `3xl 32` · `4xl 40`.
- **Piso de legibilidade:** texto secundário ≥ 11px; micro-label ≥ 10px; 9px só para badges. (Densidade é feature, ilegibilidade não.)
- Tracking: `--ls-tighter -0.04em` (display, piso) … `--ls-label 0.08em` (labels uppercase). Nunca abaixo de -0.04em em display.
- `tabular-nums` em toda figura numérica.

## Tokens — Espaçamento, Radii, Layout
- Espaço base 4px: `--space-1 4` … `--space-20 80`.
- **Radii (hierarquia):** tag/badge 2–4px · botões/inputs `--radius-btn 6` · cards `--radius-card 8` · modais `--radius-modal 12` · pill `--radius-full 9999`. **Teto de card = 12px.**
- Layout: `--sidebar-w 220`, `--header-h 64`, mobile `--header-h-mobile 56`.
- **Z-index semântico:** base 1 · dropdown 50 · sidebar 100 · header 200 · modal 300 · toast 400. Nunca usar valores arbitrários (999/9999).
- Transições: fast 100ms · base 180ms · slow 320ms (ease).

---

## Princípios (de PRODUCT.md)
1. **Densidade a serviço da decisão** — densa com hierarquia e respiro, nunca apertada.
2. **A cor significa estado** — status via tokens `--color-{success,warning,danger,info}`; accent = identidade, não enfeite.
3. **Confiança pela precisão** — estados inequívocos.
4. **Adaptar à superfície** — campo/celular e escritório/desktop; alvos de toque ≥ 44px no mobile.
5. **Consistência global** — mudança visual vale pro app todo; sempre via token.

## Acessibilidade
- Contraste **WCAG AA**: corpo ≥ 4.5:1, texto grande ≥ 3:1, placeholder ≥ 4.5:1. (Crítico p/ uso no campo sob luz forte.)
- Elementos interativos precisam de semântica real (`<button>`/role + foco visível + teclado). Status nunca só por cor (par cor+texto/ícone).
- `prefers-reduced-motion`: toda animação tem alternativa de crossfade/instantânea.

---

## Leak conhecido (centralização incompleta)
~600 literais de cor hardcoded (`#hex` / `rgba(...)`) ainda existem fora dos tokens, concentrados em
`App.jsx` (154), `DescargaView` (60), `ModalWhatsApp` (47), `DiariasView` (46), `OcorrenciasView` (45), `ModalDetalhe` (33), `AdminView` (24)…
**Consequência:** mudar um token corrige a maior parte do app, mas esses pontos ficam defasados (não trocam de tema, não respondem ao token). Backlog: varrer e substituir por `var(--…)`/`t.*`, priorizando os maiores ofensores. Não introduzir novos.

## Anti-patterns — estado e exceções conscientes
Varredura concluída (jun/2026): **side-stripe (`border-left` colorido) eliminado** em toda a produção — cards usam borda completa 1px na cor do status; KPIs usam **borda superior** (acento premium, ban-compliant); bounce-easing trocado por ease-out-quint. Restam **5 findings do detector, todos exceções intencionais e corretas** (não corrigir):
- **Sidebar `transition: width`** (`components.css`, `layout.css` ×2) — o collapse da sidebar reflui o conteúdo; `transform` não substitui. Mantido.
- **`font-family: Arial`** (`exportHelpers`, `ReportBuilder`) — contexto de exportação/PDF/impressão; Arial é a fonte correta para documentos. Mantido.

Os protótipos em `src/design-system/*.html` não são código de produção — findings ali são ignorados.
