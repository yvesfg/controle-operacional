---
target: DashboardView
total_score: 28
p0_count: 0
p1_count: 0
timestamp: 2026-06-16T14-27-24Z
slug: src-views-dashboardview-jsx
---
# Critique (re-run pós-fixes) — DashboardView (`src/views/DashboardView.jsx`)

## Design Health Score

| # | Heuristic | Score | Δ | Key Issue |
|---|-----------|-------|---|-----------|
| 1 | Visibility of System Status | 2 | — | Sem loading/skeleton na view. |
| 2 | Match System / Real World | 3 | — | PT de domínio adequado. |
| 3 | User Control and Freedom | 3 | — | Drilldowns + filtro removível. |
| 4 | Consistency and Standards | 3 | ▲ | Cor de status unificada nos tokens (era 2). |
| 5 | Error Prevention | 3 | — | Read-only; navegação segura. |
| 6 | Recognition Rather Than Recall | 3 | — | KPIs rotulados; clicáveis agora operáveis. |
| 7 | Flexibility and Efficiency | 3 | — | Teclado funciona nos drilldowns; sem atalhos. |
| 8 | Aesthetic and Minimalist | 3 | ▲ | Piso tipográfico + grupos AVB + paleta on-token (era 2). |
| 9 | Error Recovery | 3 | — | Estados "Sem dados" presentes. |
| 10 | Help and Documentation | 2 | — | Inexistente; baixa necessidade. |
| **Total** | | **28/40** | **▲ +2** | **Good — base sólida** |

## Anti-Patterns Verdict

**Parece IA?** Não — e melhorou. Os tells anteriores (4 sistemas de cor de status, contraste falhando, 8px) sumiram.

**Scan determinístico (detector, agora funcional):** 2 findings, ambos `layout-transition` (warning) — animar `width` nas barras de progresso (L374 rota AVB, L420 diárias). Resíduo de performance, não estético. Nada banido (sem gradient-text, side-stripe, ghost-card, radius ≥32px).

**Browser/overlay:** pulado — SPA auth-gated, Dashboard inalcançável sem sessão.

## O Que Melhorou (vs. run anterior, 26/40)

- **Contraste resolvido (P1→ok):** `--text3` 2.6:1 → 4.6:1; rótulos legíveis no campo.
- **Cor de status única (P1→ok):** `sc()` + `STATUS_COLOR_MAP` + `DONUT_LEGEND` agora falam a mesma língua de token; alpha via `hexRgb` (theme-safe).
- **Acessibilidade (P1→ok):** 8 clicáveis viraram `role=button` com teclado (Enter/Espaço) + foco visível via helper reutilizável `clickable()`.
- **Tipografia (P2→ok):** fim dos 8px; pisos de mobile elevados a 10px.
- **Layout AVB (P2→ok):** rótulos "Visão Geral / Financeiro / Operação" quebram a muralha de ~11 KPIs.

## Issues Remanescentes (todos P2/P3)

- **[P2] Sem estados de loading/skeleton.** Heurística 1 travada em 2; durante sync Sheets↔Supabase não há feedback de carregamento na view. **Fix:** skeleton/placeholder nos cards enquanto `dashData` carrega. **Comando:** `$impeccable harden`.
- **[P2] `layout-transition` nas barras (L374/420).** `transition:"width .4s"` anima propriedade de layout. **Fix:** animar `transform:scaleX()` + `transform-origin:left`. **Comando:** `$impeccable optimize`.
- **[P2] Status por cor-only na barra fina e nos dots.** O badge da linha recente tem texto (ok), mas a barra de status e os dots da legenda comunicam só por cor. **Fix:** manter o rótulo textual adjacente (já existe na legenda) e garantir par cor+texto. **Comando:** `$impeccable colorize`.
- **[P3] Medalhas emoji (🥇🥈🥉) no pódio de contratantes.** Levemente lúdico para "sóbrio · técnico · premium". **Fix:** numerais 1/2/3 com cor de tier. **Comando:** `$impeccable polish`.
- **(fora deste alvo)** ~600 hexes hardcoded em outras views (App.jsx/Descarga/Diárias…) — backlog de centralização documentado no DESIGN.md.

## Persona Red Flags (residual)

**Sam (acessibilidade):** grande avanço — drilldowns operáveis por teclado/leitor de tela, foco visível. Resíduos: barra de status fina é cor-only; o anel de foco do segmento da barra pode ser cortado pelo `overflow:hidden` do contêiner.

**Casey (mobile/campo):** contraste e pisos de fonte resolvem o pior; ainda há alvos pequenos ("Ver ›" a 9px, padding 0) abaixo de 44×44.

**Alex (power user):** navegação por teclado agora funciona; segue sem atalhos/customização da pilha densa.

## Questions to Consider
- Vale um skeleton de loading durante o sync, ou o estado atual é aceitável?
- A barra de status fina precisa de rótulo, ou a legenda abaixo já basta?
