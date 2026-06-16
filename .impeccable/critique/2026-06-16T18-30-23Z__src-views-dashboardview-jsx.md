---
target: src/views/DashboardView.jsx
total_score: 30
p0_count: 0
p1_count: 3
timestamp: 2026-06-16T18-30-23Z
slug: src-views-dashboardview-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading/skeleton/stale-data indicator while Sheets↔Supabase sync runs |
| 2 | Match System / Real World | 4 | n/a — domain vocabulary (DT/CTE/MDF/ATR/Diária) matches ops staff's mental model |
| 3 | User Control and Freedom | 3 | Origin filter has a clear `✕`; month filter has no equivalent one-click reset |
| 4 | Consistency and Standards | 3 | Status color now centralized via `sc()`/`STATUS_COLOR_MAP`; unmapped status falls back to fragile index-based legend color |
| 5 | Error Prevention | 4 | n/a — read-only/navigational surface, no destructive actions |
| 6 | Recognition Rather Than Recall | 3 | Status bar segments communicate by color swatch alone; label only in the row below |
| 7 | Flexibility and Efficiency | 3 | Strong click-accelerators throughout; no keyboard shortcuts, no collapsible AVB strips |
| 8 | Aesthetic and Minimalist Design | 3 | Held back by repeated identical card-header pattern and AVB's ~11-card KPI wall before any chart |
| 9 | Error Recovery | 3 | Empty states worded in context ("Sem dados"); no signposting for malformed data |
| 10 | Help and Documentation | 2 | No tooltips for computed metrics (Taxa Eficiência, Taxa Documental, Tempo Médio Liberação) |
| **Total** | | **30/40** | **Good — up from 28 in the prior snapshot** |

## Anti-Patterns Verdict

**Does this look AI-generated?** Mostly no. The AVB-conditional KPI strips, contratante podium logic, and route-efficiency math are clearly real business rules, not template filler — no gradient text, no oversized radii, no decorative glow. Residual tells: every card header uses the identical 11px-mono-uppercase eyebrow pattern (11 repeats), the page composition defaults to stacked identical KPI-card grids before any chart, and the podium uses stock 🥇🥈🥉 emoji that clash with the "sóbrio · técnico · premium" brand voice.

**Deterministic scan**: `detect.mjs` returns **zero findings** in `DashboardView.jsx` itself. The only CLI hit anywhere in its dependency chain is `components.css:559` (`transition: width`, sidebar collapse) — already documented in DESIGN.md as an intentional, accepted exception, unrelated to this view. Manual read caught what the regex detector structurally can't: `podColors=["var(--accent)","#94a3b8","#cd7c32"]` (line 525) hardcodes silver/bronze outside the token system, and ~12-14 occurrences of `fontSize:9` on plain text/labels/links (not badges) violate DESIGN.md's own documented floor ("9px só para badges"). Side-tab borders and unkeyboarded `onClick` divs are both confirmed clean — `clickable()` is correctly imported and applied everywhere a non-button div is clickable.

**Browser visualization**: skipped — no browser automation available in this environment.

## Overall Impression

This view has visibly absorbed the last two rounds of fixes: drill-through is keyboard-operable, progress bars animate via `transform`, status color is centralized, AVB sections now have text labels. What's left is less about correctness and more about *intent* — the page doesn't yet escalate visual weight toward what's actually urgent (alerts look exactly like neutral counts), motion has no reduced-motion fallback despite PRODUCT.md mandating one, and a handful of text elements still sit below the project's own legibility floor. The single biggest opportunity: let severity drive layout, not just color.

## What's Working

1. **Drill-through is real, consistent, and now keyboard-accessible.** Every clickable surface routes to a sensibly filtered destination via the shared `clickable()` helper, which gives `role="button"` + `tabIndex` + Enter/Space for free — a meaningful accessibility upgrade from the original snapshot.
2. **AVB business logic is genuinely domain-specific.** "Em Trânsito"/"Aguardando Liberação"/"Tempo Médio Liberação" compute real operational state from raw dates with sensible guards — not generic dashboard filler.
3. **Progress bars now animate correctly.** Both instances use `transform:scaleX()` + `transformOrigin:left` instead of animating `width` — the exact right fix, applied consistently.

## Priority Issues

**[P1] No `prefers-reduced-motion` fallback anywhere in the app.**
- **Why it matters**: PRODUCT.md explicitly mandates this ("`prefers-reduced-motion` respeitado... alternativa de crossfade/instantânea"); a grep across all of `src/design-system/*.css` returns zero matches. This is a stated, unmet product requirement, not a style nitpick.
- **Fix**: One global `@media (prefers-reduced-motion: reduce)` block in `tokens.css` collapsing transition/animation durations app-wide — fixes every view at once, not just this one.
- **Suggested command**: `$impeccable harden`

**[P1] ~12-14 text elements sit below the project's own 9px-is-for-badges-only floor.**
- **Why it matters**: DESIGN.md line 97 explicitly reserves 9px for badges and sets ≥10px for micro-labels. Plain captions, "Ver ›" links, filter selects, and tab toggles in this file use `fontSize:9` — a direct violation of a rule this same project fought hard to establish (the whole `--text-3` contrast fix earlier this session existed to protect field legibility).
- **Fix**: Bump the non-badge 9px occurrences to the 10px floor (lines ~75, 83, 201-202, 207, 242, 348, 365, 370, 388, 431, 478, 531, 556).
- **Suggested command**: `$impeccable typeset`

**[P1] Visual weight doesn't escalate with operational stakes.**
- **Why it matters**: "Alertas Ativos" is the single most consequential number on the page, yet it's the same card size/weight as "Motoristas Ativos" — only the color shifts. This undermines "Confiança pela precisão": trust comes from the system flagging risk, not just reporting it neutrally alongside everything else.
- **Fix**: Give the alerts KPI a distinct escalation treatment when count > 0 (stronger border, reordering to first position, or size bump) rather than relying on color alone.
- **Suggested command**: `$impeccable bolder`

**[P2] Touch targets for secondary actions remain under 44px; podium uses hardcoded hex + off-brand emoji.**
- **Why it matters**: Every "Ver ›"/"Ver Tudo ›" link is ~20px tall — a real one-handed mis-tap risk for the field/mobile context PRODUCT.md explicitly designs for. Separately, `podColors` hardcodes `#94a3b8`/`#cd7c32` outside the token system, and the 🥇🥈🥉 emoji read as gamified-consumer, at odds with "sóbrio · técnico · premium."
- **Fix**: Wrap "Ver ›" controls with a real 44px-tall hit area; replace medal emoji with numeral badges styled via existing `podColors` (tokenized as `--cat-gray`/a bronze token instead of raw hex).
- **Suggested command**: `$impeccable harden` (touch targets), `$impeccable colorize` (token + brand fix)

**[P2] Status communicated by color-only in the stacked bar segments.**
- **Why it matters**: DESIGN.md requires "Status nunca só por cor (par cor+texto/ícone)" — the bar segments themselves (not the legend row below) are bare colored divs with a `title` attribute only, which doesn't satisfy color-blind accessibility for the segment in isolation.
- **Fix**: Thicken segments and pair more tightly with the legend, or add a pattern-fill differentiator.
- **Suggested command**: `$impeccable colorize`

## Persona Red Flags

**Sam (accessibility/keyboard)**: Drill-through is keyboard-operable and has a visible focus ring — real progress. Remaining gap: status-bar segments are focusable colored divs with no text content and no `aria-label`, so a screen reader announces only "button" with nothing else; a keyboard user tabbing through them can barely perceive which segment is focused inside the thin, clipped bar.

**Casey (mobile/field operator)**: The typography-floor and contrast fixes from prior rounds have genuinely fixed the worst field-legibility problems. Remaining red flags: "Ver ›" links and filter dropdowns (`height:26`, `fontSize:9`) are both sub-44px tap targets — real mis-tap risk one-handed in a moving vehicle or galpão; the Top Motoristas/Recentes rows pack avatar+name+placa+route+badge+value+chevron into one 44px row, and route text is the first thing to truncate under real mobile width.

## Minor Observations

- `heroNum` renders twice at the same 28px weight (KPI strip + chart header) — redundant emphasis, flagged previously, still present.
- `DONUT_LEGEND` is a stale name — the visualization is a stacked bar now, not a donut.
- `STATUS_COLOR_MAP` duplicates uppercase/titlecase key pairs per status instead of normalizing the lookup once.
- Hover handlers at lines 227/262 hardcode `rgba(255,255,255,0.05)` inline instead of referencing the existing `--color-sidebar-item-hover`/`--chip-neutral-bg` token that already holds this exact value.

## Questions to Consider

1. If "Alertas Ativos" is the number that should change a manager's behavior, what would the page look like if severity drove layout position, not just color?
2. Is "always show all three AVB KPI strips" the right call for a tool checked many times a day, or is there a case for a collapsible secondary strip?
3. Was `prefers-reduced-motion` scoped out of the recent accessibility work intentionally, or simply not yet on anyone's list?
