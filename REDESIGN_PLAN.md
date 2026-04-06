# REDESIGN UI/UX — Controle Operacional
## Enterprise Dark · Binance-inspired · v22

---

## 1. DIAGNÓSTICO ATUAL

### 1.1 Estrutura Geral

| Elemento | Estado Atual | Problema |
|---|---|---|
| Navegação | Bottom-nav fixa (8 abas, overflow oculto) | Sem sidebar em desktop; abas truncadas em mobile |
| Header | Fixed top, altura ~48px, logo + botões à direita | Sem breadcrumb; sem identidade em desktop |
| Modais | Bottom-sheet em mobile **e** desktop | Desktop recebeu fix parcial; sem sidebar context |
| Layout | Single-column, 100% width | Não aproveita espaço em telas ≥ 1200px |
| Breakpoint | Único: 600px (mobile/desktop) | Sem zona tablet (601–1199px); sem desktop grande |
| Responsividade | `isMobile` booleano | Não há isTablet, isDesktop, isLarge |
| Tokens | `DESIGN.*` centralizado | Bom — mas `ouro: "#e9b84a"` deve virar `#F3BA2F` |
| Animações | mslide, fadeIn | Boas — manter e estender para sidebar |

### 1.2 Problemas Críticos

**DESKTOP**
- Não há sidebar → espaço lateral desperdiçado
- NavBar de rodapé em desktop é antipadrão enterprise
- Header sem título/breadcrumb da seção ativa
- Modais com maxWidth 520px em tela 1920px = visual minimalista demais
- Tabela ocupa 100% sem painel lateral de filtros

**MOBILE**
- 8 abas na NavBar → labels truncadas a 6–9px = ilegível
- Scroll horizontal da nav não existe → abas "escondidas"
- Ícones 20px com label 8px = área de toque abaixo do recomendado (44px)
- Sem gesto swipe para trocar abas
- Sem feedback háptico/visual ao abrir modal

**VISUAL**
- Cor ouro atual `#e9b84a` — deve migrar para `#F3BA2F` (Binance exato)
- Dark bg `#09090f` — manter (já alinhado ao estilo Binance)
- Radius dos cards (10px) está OK para estilo enterprise
- Typography: Bebas Neue no header OK; Inter no body OK
- Labels de formulário em 8–9px: ilegível — mínimo 11px

### 1.3 Pontos Fortes a Preservar

- Sistema de tokens `DESIGN.*` bem estruturado ✓
- Temas dark/light com WCAG AA ✓
- SVG ícones stroke (estilo Lucide) ✓
- Animações suaves (mslide, fadeIn) ✓
- `supaFetch` pattern consistente ✓
- Permissões por perfil granulares ✓

---

## 2. PLANO POR BREAKPOINT

### Breakpoints Propostos

```
xs:  0–479px      → Mobile pequeno (iPhone SE)
sm:  480–767px    → Mobile padrão (iPhone 14, Android)
md:  768–1199px   → Tablet (iPad, landscape mobile)
lg:  1200–1535px  → Desktop padrão
xl:  1536px+      → Desktop grande (Full HD+)
```

**No código**: substituir booleano `isMobile` por:
```js
const isMobile = width < 768;      // xs + sm
const isTablet = width >= 768 && width < 1200;
const isDesktop = width >= 1200;
```

---

### 2.1 DESKTOP (≥ 1200px)

#### Layout Geral
```
┌──────────────────────────────────────────────────────┐
│  HEADER  (fixo, height: 56px)                        │
│  [Logo] [App name] [Breadcrumb] ···[Notif][Theme][⏻] │
├──────┬───────────────────────────────────────────────┤
│      │                                               │
│  S   │   CONTEÚDO PRINCIPAL                          │
│  I   │   (scroll vertical interno)                   │
│  D   │                                               │
│  E   │   padding: 24px                               │
│  B   │   maxWidth: 1400px (planilha: 100%)           │
│  A   │                                               │
│  R   │                                               │
│      │                                               │
└──────┴───────────────────────────────────────────────┘
```

#### Sidebar Recolhível

**Estado expandido** (width: 220px):
```
┌─────────────┐
│ [🏢] CTRL   │  ← Logo + Nome (20px)
│─────────────│
│ [📊] Dashboard    │
│ [📋] Planilha     │  ← Item ativo: bg card, borda-left 3px #F3BA2F
│ [📅] Diárias      │
│ [🚚] Descarga     │
│ [⚙️] Operacional  │
│ [🚛] Motoristas   │
│             │
│ [👤] Admin  │  ← grupo separado
│ [🔍] Buscar │
│─────────────│
│ [◄] Recolher│  ← botão no rodapé da sidebar
└─────────────┘
```

**Estado recolhido** (width: 64px):
```
┌──────┐
│  🏢  │  ← Só ícone + tooltip hover
│──────│
│  📊  │  ← Tooltip "Dashboard"
│  📋  │
│  📅  │
│  🚚  │
│  ⚙️  │
│  🚛  │
│      │
│  👤  │
│  🔍  │
│──────│
│  ►   │  ← Expandir
└──────┘
```

**Comportamento**:
- Estado salvo em `localStorage("co_sidebar_collapsed", false)`
- Transição `width 250ms cubic-bezier(0.4,0,0.2,1)` (Material/Binance)
- Conteúdo principal: `marginLeft: sidebarW` (responsivo ao estado)
- Tooltips no estado recolhido (title nativo ou micro-tooltip)
- Nenhuma mudança no mobile (sidebar não existe em mobile/tablet)

#### Header Desktop
```
┌──────────────────────────────────────────────────────┐
│        │  Controle Operacional > {aba ativa}          │  [🔔 171] [☀️] [⏻]
└──────────────────────────────────────────────────────┘
```
- Height: 56px (vs 48px atual)
- Sem logo (fica na sidebar)
- Breadcrumb simples: nome app > aba ativa
- Notificações badge (aproveitando o badge 171 já existente)
- Sem botões WPP/Relatório no header — movem para dentro de cada seção ou menu contexto

#### Modais Desktop
- `maxWidth: 640px` (padrão), `720px` (detalhe DT), `900px` (já existe para detalhe)
- `borderRadius: 16px` em todos os cantos
- Slide-in da direita ou fade (não bottom-sheet)
- Backdrop: `rgba(0,0,0,0.6)` + `blur(8px)`

---

### 2.2 TABLET (768–1199px)

#### Layout Geral
```
┌──────────────────────────────────────┐
│  HEADER (52px) — Logo + Título + btns│
├──────────────────────────────────────┤
│                                      │
│   CONTEÚDO (padding: 16px)           │
│   maxWidth: 900px, centrado          │
│                                      │
├──────────────────────────────────────┤
│  BOTTOM NAV (60px) — 5 itens + "..."  │
└──────────────────────────────────────┘
```

**Sem sidebar** — bottom-nav com max 5 abas visíveis + overflow em "Mais"
**Modais**: Centralizados (50–80% tela), borderRadius 16px

#### Bottom Nav Tablet
- Mesma lógica do mobile abaixo
- Ícones 22px, labels 10px

---

### 2.3 MOBILE (< 768px)

#### Layout Geral
```
┌─────────────────────┐
│  HEADER (48px)      │
│  [Logo] [App] [btns]│
├─────────────────────┤
│                     │
│   CONTEÚDO          │
│   padding: 12px     │
│   100% width        │
│                     │
├─────────────────────┤
│  BOTTOM NAV (60px)  │
└─────────────────────┘
```

#### Bottom Nav Mobile — Nova Lógica

**Regra**: Máximo 5 itens visíveis na nav. Se o usuário tem acesso a mais, o 5º item vira "Mais ···" com um menu/drawer.

```
┌──────────────────────────────────────────────────┐
│  [📊]    [📋]    [📅]    [🚚]    [···]            │
│  Dash   Planilha  Diárias  Desc   Mais           │
└──────────────────────────────────────────────────┘
```

**Menu "Mais"** (bottom-sheet ao tocar):
```
┌────────────────────────────────┐
│  ⚙️ Operacional                │
│  🚛 Motoristas                 │
│  🔍 Buscar                     │
│  👤 Admin            (se adm)  │
└────────────────────────────────┘
```

**Especificações da NavBar Mobile**:
- Height: 60px + safe-area-inset-bottom
- Ícones: 22px (stroke 1.8)
- Label: 10px, Inter, uppercase, letter-spacing 0.5px
- Área de toque mínima: 48x48px por item
- Item ativo: borda-top 2.5px `#F3BA2F` + ícone/label em `#F3BA2F` + glow sutil
- Indicador ativo: barra top 2.5px (mantém o padrão atual, apenas refinado)

**Scroll horizontal** (alternativa ao "Mais"):
- Se todas as abas do usuário ≤ 6: scroll horizontal com snap
- Se > 6: usar menu "Mais"
- `overflowX: auto`, `scrollSnapType: x mandatory`
- Cada item: `scrollSnapAlign: start`, `minWidth: 72px`
- Scrollbar: oculta (`::-webkit-scrollbar { display: none }`)

#### Modais Mobile
- **Manter** bottom-sheet (padrão atual)
- Adicionar "drag handle" (barra cinza de 4px no topo do modal)
- `borderRadius: 20px 20px 0 0`
- Altura: `min-content`, max 92vh
- Fundo escuro com blur

---

## 3. SISTEMA VISUAL — BINANCE ENTERPRISE DARK

### 3.1 Paleta de Cores

```
Principal:   #F3BA2F   ← Binance yellow exato (era #e9b84a)
Escuro:      #C99923   ← Hover/pressed state
Fundo:       #09090f   ← Já correto ✓
Card:        #111119   ← Já correto ✓
Card Alt:    #181825   ← Já correto ✓
Borda:       #1c1c2a   ← Já correto ✓
Borda Alt:   #262638   ← Já correto ✓
Txt:         #e8e8f2   ← Já correto ✓
Txt2:        #8888b0   ← Já correto ✓
Sucesso:     #22c55e   ← Manter
Erro:        #ef4444   ← Manter
Aviso:       #f59e0b   ← Manter
Binance Red: #f6465d   ← Usar para alertas críticos
Binance Grn: #0ecb81   ← Usar para confirmações positivas
```

### 3.2 Typography

```
Headlines:   'Bebas Neue', sans-serif → Manter
Body:        'Inter', sans-serif → Manter

Tamanhos (escala mínima):
  h1:     24px  (Bebas Neue, letter-spacing 2px)
  h2:     18px  (Bebas Neue)
  h3:     14px  (Inter Bold)
  body:   13px  (Inter Regular)
  small:  11px  (Inter Regular) ← MÍNIMO para labels
  micro:  10px  (Inter, somente badges/chips)
  nano:    9px  ← BANIR (era usado em labels de formulário)
```

### 3.3 Elevation / Sombras

```
Nível 0 (flat):   sem sombra → fundo
Nível 1 (card):   0 1px 3px rgba(0,0,0,0.4) → cards
Nível 2 (modal):  0 8px 32px rgba(0,0,0,0.6) → modais
Nível 3 (tooltip):0 4px 12px rgba(0,0,0,0.5) → tooltips
```

### 3.4 Border Radius (Refinado)

```
DESIGN.r atual → Proposta:
  btn:    7px  → 8px
  card:  10px  → 12px   (mais arredondado = mais premium)
  modal: 14px  → 16px
  tile:   9px  → 10px
  badge:  4px  → 6px    (mais legível)
  inp:    8px  → 10px
  ico:    8px  → 10px
  logo:  10px  → 12px
  sidebar item: 8px (novo)
```

### 3.5 Spacing (Sistema 8pt)

```
4px  → micro gap (ícone-label)
8px  → item padding vertical
12px → card padding mobile
16px → card padding tablet
20px → card padding desktop
24px → section gap desktop
32px → section gap header
```

---

## 4. ARQUIVOS QUE PRECISAM MUDAR

### 4.1 Impacto Alto — Mexer com cuidado

| Arquivo | O que muda | Risco |
|---|---|---|
| `src/App.jsx` | Tudo — ver seções abaixo | Alto |
| `src/constants.js` | Tokens de cor/radius/DESIGN | Médio |

### 4.2 Alterações em `constants.js`

1. **Cor principal**: `ouro: "#e9b84a"` → `"#F3BA2F"`; `ouroDk: "#c49535"` → `"#C99923"`
2. **Light ouro**: `"#8f6518"` → `"#a07018"` (ajuste de contraste pós-mudança)
3. **DESIGN.r**: Atualizar conforme seção 3.4
4. **Adicionar breakpoints**: `export const BP = { sm:480, md:768, lg:1200, xl:1536 }`
5. **Novos tokens sidebar**: `SIDEBAR_W = 220`, `SIDEBAR_COLLAPSED_W = 64`

### 4.3 Alterações em `App.jsx` (por seção)

#### GRUPO A — Detecção de breakpoints (baixo risco)
```
[A1] Substituir booleano isMobile por trio: isMobile / isTablet / isDesktop
[A2] useEffect listener com 3 zonas baseado em BP.* do constants
```

#### GRUPO B — Sidebar Desktop (risco médio — não toca mobile)
```
[B1] Estado: const [sidebarCollapsed, setSidebarCollapsed] = useState(loadJSON(...))
[B2] Render condicional: isDesktop ? <Sidebar /> : null
[B3] CSS sidebar: width, transition, overflow hidden, position fixed
[B4] Ajuste do paddingLeft do conteúdo baseado no sidebarCollapsed
[B5] Tooltips no estado recolhido
[B6] Mover TabBar para: isDesktop ? <Sidebar /> : <BottomNav />
```

#### GRUPO C — Header Responsivo (risco médio)
```
[C1] Desktop: sem logo, breadcrumb, apenas ações contextuais
[C2] Mobile/Tablet: logo + ações (manter próximo ao atual)
[C3] Height: 56px desktop, 48px mobile
[C4] Mover botões WPP/Rel para menus internos (não no header desktop)
```

#### GRUPO D — Bottom Nav Mobile (baixo risco — isola por !isDesktop)
```
[D1] Lógica de 5 visíveis + "Mais" drawer
[D2] Scroll horizontal como alternativa (opção configurável)
[D3] Área de toque 48px mínimo
[D4] Drag handle nos bottom-sheets
```

#### GRUPO E — Tokens visuais (baixo risco — propagação automática)
```
[E1] Aplicar nova cor #F3BA2F (via constants.js — propaga todo css.*)
[E2] Atualizar borderRadius conforme seção 3.4
[E3] Aumentar fontSize mínimo para 11px (labels, badges)
[E4] Adicionar drag handle style para bottom-sheets
```

#### GRUPO F — Modais e Overlays (baixo risco — já tem base)
```
[F1] Animação de entrada desktop: slide da direita (slideInRight keyframe)
[F2] maxWidth modal padrão: 640px desktop (já tem 520)
[F3] Drag handle visual no mobile bottom-sheet
```

---

## 5. ORDEM IDEAL DE IMPLEMENTAÇÃO

### Sprint 1 — Fundações (sem quebrar nada)
> Alterações em constants.js apenas + tipografia mínima

```
[E1] constants.js: cor #F3BA2F
[E2] constants.js: DESIGN.r atualizado
[E3] constants.js: adicionar BP + SIDEBAR_W
[E5] App.jsx: fontSize mínimo 11px em labels (grep por fontSize:8 e :9)
→ Build + Deploy → Testar visualmente
```

### Sprint 2 — Breakpoints (isolado, baixo risco)
> Não toca layout, só a detecção

```
[A1] Substituir isMobile pelo trio + isTablet + isDesktop
[A2] Adapter: isMobile como alias de !isDesktop (preserva todos os usos atuais)
→ Build + Deploy → Testar regressão
```

### Sprint 3 — Bottom Nav Mobile (não afeta desktop)
> Condicional !isDesktop — sem risco para desktop

```
[D1] Lógica 5 visíveis + drawer "Mais"
[D2] Scroll horizontal com snap (fallback)
[D3] Área de toque 48px
[D4] Drag handle bottom-sheets
→ Build + Deploy → Testar em mobile/tablet
```

### Sprint 4 — Sidebar Desktop (não afeta mobile)
> Condicional isDesktop — sem risco para mobile

```
[B1] Estado sidebarCollapsed
[B2] Componente Sidebar inline (ainda no App.jsx — sem novo arquivo)
[B3] CSS sidebar com transição
[B4] paddingLeft conteúdo responsivo
[B5] Tooltips recolhido
[B6] Renderização condicional: sidebar vs bottom-nav
→ Build + Deploy → Testar em desktop
```

### Sprint 5 — Header Responsivo
> Após sidebar estar funcionando

```
[C1] Header desktop: breadcrumb + ações mínimas
[C2] Header mobile: manter próximo ao atual
[C3] Height unificado
→ Build + Deploy
```

### Sprint 6 — Modais e Polimento
> Refinamento final

```
[F1] Animação slideInRight desktop
[F2] maxWidth 640px padrão
[F3] Drag handle visual mobile
[E4] Revisão geral de spacing (sistema 8pt)
→ Build + Deploy Final
```

---

## 6. REFERÊNCIAS VISUAIS BINANCE

### Padrões a replicar do Binance

| Elemento | Como a Binance faz | Aplicação aqui |
|---|---|---|
| Sidebar | 220px expandido, 64px ícone-only, bg #0B0E11 | Igual, com bg #09090f |
| Ícone ativo | Fill amarelo, sem outline | Stroke amarelo + glow (mantém nosso padrão) |
| Hover sidebar | bg levemente mais claro, radius 8px | `hexRgb(ouro, 0.05)` bg, radius 8px |
| Header | 64px, sem separador visual forte | 56px, borda sutil `1px solid borda` |
| Tabelas | Full-width, sem padding lateral | Manter planilha atual |
| Cards KPI | Sem sombra, apenas borda sutil | Manter css.kpi |
| Botão primário | Amarelo sólido, texto preto, radius 8px | Manter css.btnGold |
| Bottom nav iOS | 5 itens, safe-area, ícone+label | Igual proposta D1 |
| Modais | Centralizados, overlay escuro | Já fixado |
| Typography | Compact, dados numéricos em mono | Bebas Neue para números ✓ |

---

## 7. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Sidebar quebra mobile | Baixo | Condicional `isDesktop` rígido |
| Cor #F3BA2F quebra WCAG AA light | Médio | Testar contraste; ajustar `ouro` light para `#a07018` |
| Bottom nav "Mais" confunde usuário | Baixo | Salvar a última aba extra acessada no localStorage |
| Breakpoint isTablet conflita com isMobile | Baixo | Usar alias `!isDesktop` para todos os usos atuais |
| Sidebar state não sincroniza entre rotas | N/A | App SPA, sem rotas reais |
| Tooltip hover em touch device | Médio | Tooltip apenas quando `isDesktop`; touch usa rótulo |

---

## RESUMO EXECUTIVO

**6 sprints, ~12 sessões estimadas, sem reescrita do App.jsx.**

O redesign é feito em camadas isoladas por condicional de breakpoint, preservando 100% da lógica existente. A estratégia é:

1. **Tokens primeiro** (sem risco) → cor, radius, tipografia
2. **Breakpoints** (adapters) → sem alterar nenhum comportamento
3. **Mobile nav** (isolado por !isDesktop) → evolui bottom-nav atual
4. **Sidebar** (isolado por isDesktop) → novo componente apenas para desktop
5. **Header** (refinamento) → diferencia mobile/desktop
6. **Polimento** (modais, animações, spacing) → último

A abordagem garante que em nenhum sprint o mobile é afetado por mudanças desktop, e vice-versa.
