---
target: DashboardView
total_score: 26
p0_count: 0
p1_count: 3
timestamp: 2026-06-16T13-48-06Z
slug: src-views-dashboardview-jsx
---
# Critique — DashboardView (`src/views/DashboardView.jsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading state in-view; empty handled only as "Sem dados". |
| 2 | Match System / Real World | 3 | Strong PT domain language; jargon (DT/CTE/MDF/NF/ATR) fits internal operators. |
| 3 | User Control and Freedom | 3 | Card drilldowns + clearable origin filter; no in-view back/undo needed. |
| 4 | Consistency and Standards | 2 | Same status renders different colors across widgets; hardcoded hex vs tokens. |
| 5 | Error Prevention | 3 | Read-only surface; navigations are safe. |
| 6 | Recognition Rather Than Recall | 3 | Labeled KPIs; but status meaning is color-only (dot). |
| 7 | Flexibility and Efficiency | 3 | Good click-through accelerators; no keyboard shortcuts. |
| 8 | Aesthetic and Minimalist Design | 2 | Flat label treatment; AVB stacks ~11 KPI cards before content. |
| 9 | Error Recovery | 3 | "Sem dados" empty states present. |
| 10 | Help and Documentation | 2 | None; low need for internal tool. |
| **Total** | | **26/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**Does this look AI-generated?** Mostly no. It's a dense, genuinely domain-specific dark operations dashboard with real logic — it avoids the worst tells (no cream bg, no marketing eyebrows, radii 8–12px, no gradient text, no side-stripes, no ghost-card shadows). Two soft tells: (1) every card header is the same 11px mono UPPERCASE 0.06em-tracked label — the eyebrow trope repeated ~12× as section grammar; (2) the KPI strip is the identical-card / hero-metric template, multiplied into three stacked rows for AVB.

**Deterministic scan:** bundled detector unavailable (crash: `lib/impeccable-config.mjs` missing from the skill install). Manual ban-list pass over the source found no banned structures (no `background-clip:text`, no `borderLeft/Right` stripes, no `border+box-shadow≥16px`, no `repeating-linear-gradient`, no radius ≥32px). One decorative gradient on the AVB route bars (`linear-gradient(90deg,var(--accent),azulLt)`) — minor, not banned.

**Visual overlays:** none. The app is an auth-gated Supabase SPA; DashboardView isn't reachable in a headless browser without a live session, so no overlay was injected.

## Overall Impression

This is a capable, information-rich operations dashboard that respects the "density as a feature" principle. The single biggest opportunity is **legibility under the product's own real conditions**: text3 labels sit at ~2.6:1 contrast and body details drop to 8–9px — exactly what fails an operator reading a phone in a bright galpão. Fix contrast + type floors + status-color consistency and this jumps a full band.

## What's Working

- **Drill-through everywhere.** Clicking a KPI, a status bar, or a recent row jumps to the filtered planilha/diárias/motoristas view. Genuinely efficient for power users.
- **Semantic status color intent.** Colors mean something (prazo/atraso/pendente/crítico) rather than decorating — the right instinct, just inconsistently applied.
- **Density with restraint.** Tokenized cards, tabular-nums on figures, tight 8–14px gaps — it reads as a real ops tool, not a SaaS template.

## Priority Issues

- **[P1] Label contrast fails AA (`--text3` ≈ 2.6:1).** `#4e5e78` on `--card #131c28` is used for nearly every section header (mono uppercase) and many sublabels at 9–11px.
  - **Why it matters:** Fails WCAG AA (needs 4.5:1) and directly breaks PRODUCT.md's field-light principle — the operator on a phone in a galpão can't read it.
  - **Fix:** Lift `--text3` toward ~`#7d8db0` (≈4.5:1) or promote card-header labels to `--text2` (already 5.4:1). Fix once in the token; it propagates.
  - **Suggested command:** `$impeccable audit`

- **[P1] Interactive `<div onClick>` with no button semantics.** KPI cards, status-legend rows, recent rows, top-motorista rows are clickable divs — no `role`, `tabIndex`, focus ring, or keyboard handler.
  - **Why it matters:** Keyboard and screen-reader users (Sam) cannot operate the primary drilldowns at all; no visible focus state.
  - **Fix:** Render clickable elements as `<button>` (or add `role="button"` + `tabIndex={0}` + Enter/Space + `:focus-visible` ring). A shared clickable-card component keeps it consistent.
  - **Suggested command:** `$impeccable harden`

- **[P1] Status → color is inconsistent across widgets.** Four different mappings coexist: `STATUS_COLOR_MAP` (ouro/warn/danger), `sc()` (hardcoded `#22c55e/#f59e0b/#ef4444`), `DONUT_LEGEND` (`#a855f7/#ec4899/...`), and the donut/bar fallback.
  - **Why it matters:** The same status can appear in different colors on the same screen, undermining "cor significa estado" and operator trust.
  - **Fix:** One token-based `STATUS_COLORS` map, consumed by every widget (bar, legend, recent badge, donut).
  - **Suggested command:** `$impeccable colorize`

- **[P2] Sub-11px typography everywhere (8–9px).** Placa, UF, "viagens", doc%, route text, and most secondary labels render at 8–9px.
  - **Why it matters:** Below comfortable reading even on desktop; unusable in mobile/field, compounding the contrast issue.
  - **Fix:** Floor secondary text at 11px and micro-labels at 10px; reserve 9px for true badges only.
  - **Suggested command:** `$impeccable typeset`

- **[P2] AVB stacks three KPI strips (~11 cards) before any content.** For `acailandia_avb`, the financeiro + operacional strips stack under the base strip with no separators or section labels.
  - **Why it matters:** Wall-of-metrics; the user scrolls past 11 same-weight cards to reach charts. No grouping cue explains why there are three rows.
  - **Fix:** Label/group the strips (e.g. "Operação" / "Financeiro") or collapse secondary metrics behind a toggle.
  - **Suggested command:** `$impeccable layout`

## Persona Red Flags

**Sam (Accessibility-dependent):** Primary drilldowns are click-only `<div>`s — no keyboard focus, no role, no Enter/Space. Status is conveyed by a colored dot alone (no text/shape), invisible to color-blind users. `--text3` labels at 2.6:1 fail contrast; 8px text breaks 200% zoom. This persona is largely locked out of the dashboard's core interactions.

**Casey (Distracted mobile/field — project persona, operator on phone in galpão):** 8–9px text under bright ambient light is the killer; tiny "Ver ›" / "Ver Tudo ›" tap targets (fontSize 9, padding 0) sit well under 44×44. KPI cards themselves are large, thumb-friendly targets — good — but the secondary actions and dense rows fight one-handed use.

**Alex (Power user):** Click-through drilldowns are excellent, but there are no keyboard shortcuts and no way to reorder/hide the dense AVB metric stack. Fine for daily use; no acceleration beyond the mouse.

## Minor Observations

- Hardcoded hexes (`#22c55e`, `#a855f7`, `rgba(255,255,255,.05)`, `rgba(246,70,93,…)`) bypass tokens and will not adapt to `theme-light.css`.
- `heroNum` (28px) is shown twice — KPI card and the area-chart header — mild redundancy of the screen's largest figure.
- Emoji medals (🥇🥈🥉) in the contratantes podium read slightly playful against the "sóbrio · técnico · premium" brand; consider numerals or a token accent.
- Inline-style sprawl (every element styled inline) is a maintainability cost, not a user-facing defect — note for future extraction.

## Questions to Consider

- What would the dashboard look like if every label were as readable as the numbers?
- Do AVB operators need all three metric strips at once, or a default + drill-in?
- If status color is meaning, why does it live in four places?
