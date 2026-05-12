# Design Spec — Command Center UI/UX
**Data:** 2026-05-12  
**Projeto:** Controle Operacional — webapp logístico React/Vite  
**Abordagem aprovada:** Opção B — Command Center  

---

## 1. Arquitetura Visual

O app é estruturado em 3 camadas independentes:

| Camada | Conteúdo |
|--------|----------|
| **Tokens** | `tokens.css` → `theme-dark.css` / `theme-light.css` → `components.css`. Zero valores hardcoded nas views. |
| **Shell** | `App.jsx` → Sidebar + Header + `<Outlet>`. Z-index hierárquico: sidebar=100, header=200, modal=300, toast=400. |
| **Views** | Dashboard / Planilha / Ocorrências / Descargas / Motoristas / Relatórios. Modais em `/modals/*.jsx`. |

---

## 2. Layout Desktop

- **Sidebar:** 220px expandida, 64px colapsada. Colapsada em tablet (768–1023px).
- **Header:** 64px. Busca global à esquerda; ícones de notificação + perfil à direita.
- **Conteúdo principal:** área flexível à direita da sidebar.
- **Dashboard como home:** 4 KPI cards no topo + lista de motoristas ao vivo + painel de ações rápidas à direita.

**Grid do dashboard:**
```
[ KPI ] [ KPI ] [ KPI ] [ KPI ]
[ Lista motoristas (flex:1) ] [ Ações rápidas + Financeiro (240px) ]
```

---

## 3. Layout Mobile (< 768px)

- Sidebar **não existe** no mobile.
- **Bottom Navigation:** 5 tabs fixos no rodapé (Home · Planilha · Ocorrências · Motoristas · Mais). Tab ativo = amber, inativo = `--text2`.
- **Conteúdo:** `padding-bottom: 64px` para não sobrepor o BottomNav.
- **Home mobile:** 4 KPIs em grid 2×2 + 4 botões de ação rápida em grid 2×2 + feed de atividades recentes (lista cronológica, sem tabela).
- **Objetivo:** 3–4 ações rápidas acessíveis sem navegação. Não é réplica do desktop.

**Breakpoints:**
```css
@media (max-width: 767px)   { .co-sidebar { display: none } .co-bottom-nav { display: flex } }
@media (768px–1023px)       { --sidebar-w: var(--sidebar-collapsed-w) /* 64px */ }
```

---

## 4. Design System Base

### Cores semânticas

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#07090d` | Fundo app |
| `--card` | `#101620` | Cards, modais |
| `--card2` | `#172030` | Hover, inputs |
| `--accent` | `#f5c53a` | CTA primário, estado ativo, amber |
| `--green` | `#0ecb81` | Sucesso, no prazo |
| `--red` | `#f6465d` | Erro, ocorrência, RO pendente |
| `--cyan` | `#2dbdb6` | Info, secundário |
| `--text` | `#dde4ed` | Texto principal |
| `--text2` | `#5a6a7a` | Labels, meta, inativo |

### Tipografia

| Token | Tamanho | Fonte | Uso |
|-------|---------|-------|-----|
| `--text-4xl` | 40px | `--font-heading` (Syne) | KPI display hero |
| `--text-2xl` | 24px | `--font-heading` | Título de página |
| `--text-md` | 14px | `--font-body` (Barlow) | Corpo, tabelas |
| `--text-sm` | 12px | `--font-body` | Meta, captions |
| `--font-mono` | 12px | IBM Plex Mono | Valores monetários, códigos (NF, RO, placas) |
| label | 9–10px | `--font-body` | Labels de seção (uppercase, letter-spacing) |

### Radius

| Valor | Uso |
|-------|-----|
| 2px | Badges muito pequenos |
| 4px | Badges padrão, ícones |
| 6px | Botões, inputs |
| 8px | Cards, content areas |
| 12px | Modais, containers elevated |

### Espaçamento (base 4px)
`4 · 8 · 12 · 16 · 24 · 32 · 48px` — nenhum valor fora dessa escala.

### Botões

| Variante | Estilo | Uso |
|----------|--------|-----|
| Primary | `background: var(--accent); color: var(--on-primary)` | Ação principal do modal/form |
| Secondary | `border: 1.5px solid var(--accent); color: var(--accent)` | Ação alternativa |
| Ghost | `background: var(--card2); border: 1px solid var(--border)` | Ações neutras |
| Danger | `background: rgba(246,70,93,.12); color: var(--red)` | Exclusão/cancelamento destrutivo |

### Inputs
- Background: `var(--color-input-bg)` (`#0d1219`)
- Border padrão: `1px solid var(--border)`
- Border focus: `1.5px solid rgba(245,197,58,.4)`
- Radius: `var(--radius-inp)` (6px)
- Height: `var(--inp-h-md)` (40px)

### Status → Cor → Badge

| Status | Cor texto | Background | Token |
|--------|-----------|------------|-------|
| `no-prazo` | `var(--green)` | `rgba(14,203,129,.1)` | `--green` |
| `aguardando` | `var(--accent)` | `rgba(245,197,58,.1)` | `--accent` |
| `ro-pendente` | `var(--red)` | `rgba(246,70,93,.1)` | `--red` |
| `em-transito` | `var(--cyan)` | `rgba(45,189,182,.1)` | `--cyan` |
| `encerrado` | `var(--text2)` | `var(--card2)` | `--text2` |

---

## 5. Componentes Reutilizáveis

### Novos (a criar em `src/components/`)

#### `KpiCard`
```jsx
<KpiCard
  label="Em Rota"
  value={24}
  delta="+3 hoje"
  deltaColor="green"   // green | red | neutral
  accent={false}       // true = borda amber
  onClick={fn}
/>
```

#### `StatusBadge`
```jsx
<StatusBadge status="no-prazo" />
// status: 'no-prazo' | 'aguardando' | 'ro-pendente' | 'em-transito' | 'encerrado'
```
Mapeado via `STATUS_MAP` interno — nunca inline ad hoc.

#### `DataRow`
```jsx
<DataRow
  leading={<DotIndicator color="green" />}
  title="João Silva"
  meta="ABC-1234 · NF 45.231"
  trailing={<StatusBadge status="no-prazo" />}
  action={<IconButton icon={ChevronRight} />}
  onClick={fn}
/>
```

#### `SectionCard`
```jsx
<SectionCard title="Motoristas em Rota" actions={[<Badge>Ao Vivo</Badge>, <Button>Filtrar</Button>]}>
  {rows}
</SectionCard>
```

#### `PageHeader`
```jsx
<PageHeader
  title="Ocorrências"
  subtitle="3 abertas · 2 pendentes RO"
  action={<Button variant="primary">+ Nova</Button>}
/>
```

#### `EmptyState`
```jsx
<EmptyState
  icon={AlertCircle}
  title="Nenhuma ocorrência"
  description="Nenhuma ocorrência aberta no momento."
  action={<Button>+ Nova Ocorrência</Button>}
/>
```

### Componentes de Shell

#### `AppShell` (refatorar App.jsx progressivamente)
- Gerencia `sidebarCollapsed` state
- `< 768px`: esconde Sidebar, renderiza BottomNav
- `768–1023px`: sidebar colapsada (64px)
- `≥ 1024px`: sidebar expandida (220px)

#### `BottomNav` (novo — mobile only)
- 5 tabs: Home · Planilha · Ocorrências · Motoristas · Mais
- `position: fixed; bottom: 0` com `z-index: var(--z-sidebar)`
- Tab ativo: `color: var(--accent)`, ícone preenchido
- Tab inativo: `color: var(--text2)`

#### `ModalBase` (já existe via `.co-modal-overlay`)
- Variantes: `center` | `bottom-sheet` | `top`
- Animação: `slideUp` (center/top) | `mslide` (bottom-sheet)
- Todos os novos modais: arquivo próprio em `src/modals/Modal*.jsx`, props via `ctx` object

---

## 6. Tela de Exemplo — Dashboard

**Componentes usados:** `PageHeader`, `KpiCard` ×4, `SectionCard`, `DataRow` ×N, `StatusBadge`, botões Ghost.

**Layout:**
```
PageHeader (título + data + botão "Nova Ocorrência")
KpiCard[Em Rota] KpiCard[Chegadas] KpiCard[Ocorrências*] KpiCard[NFDs]
SectionCard[Motoristas em Rota] | Ações Rápidas + Financeiro
  DataRow × N com StatusBadge    | 4 botões Ghost verticais
                                  | Mini tabela financeiro
```
`*` KpiCard de Ocorrências tem `accent=true` (borda vermelha) quando `value > 0`.

---

## 7. Tela de Exemplo — Listagem (Ocorrências)

**Componentes usados:** `PageHeader`, filtros por tabs, `SectionCard` com tabela CSS grid (não `DataRow` — colunas fixas exigem grid próprio), `StatusBadge`, ações inline.

**Layout:**
```
PageHeader (título + contador + botão "+ Nova Ocorrência")
Filtros: [input busca] + [tabs: Abertas | Todas | Encerradas]
SectionCard com tabela:
  [dot] [Motorista/Placa] [NF/Descrição] [Data] [Nº RO] [StatusBadge] [Ação]
EmptyState se lista vazia
```

Colunas fixas via `grid-template-columns`. `Nº RO` em `--font-mono` quando preenchido, `—` quando vazio.

---

## 8. Tela de Exemplo — Formulário (Modal Nova Ocorrência)

**Componentes usados:** `.co-modal-overlay--center` (padrão já existente), inputs, selects, botões Primary + Ghost.

**Layout do modal (max-width: 480px):**
```
[Ícone de alerta] Título "Nova Ocorrência" | Subtítulo "NF 45.218"  [×]
─────────────────────────────────────────────────────────────────────
Campo: Motorista (readonly, pré-preenchido)
Campo: Tipo de Ocorrência (select)
Campo: Nº RO (input texto, opcional)
Campo: Descrição (textarea)
─────────────────────────────────────────────────────────────────────
[Cancelar (Ghost)]                    [Registrar Ocorrência (Primary)]
```

---

## 9. Regras de Consistência

### Nunca fazer
- Hardcodar cor (`#f5c53a`) — usar `var(--accent)`
- Hardcodar z-index (`9999`) — usar `var(--z-modal)`
- Usar `'Space Grotesk'` ou `'DM Mono'` — fontes fora do sistema
- Criar overlay `position:fixed` inline — usar `.co-modal-overlay`
- Radius fora da escala 2/4/6/8/12px
- Espaçamento fora da base 4px (ex: 7px, 11px, 15px)
- Lógica de negócio dentro de componentes de UI

### Sempre fazer
- Toda cor via CSS var
- Toda fonte via `var(--font-heading)`, `var(--font-body)`, `var(--font-mono)`
- Modais via `.co-modal-overlay` + variante (`--center`, `--top`, sem modificador = bottom-sheet)
- Animação de entrada: `slideUp` (center/top) ou `mslide` (bottom-sheet)
- Novos modais → arquivo próprio em `src/modals/Modal*.jsx` com props via `ctx`
- `StatusBadge` para todo indicador de status — nunca span inline ad hoc

---

## 10. React + Tailwind — Guia de Implementação

### Estrutura de arquivos (delta)

```
src/components/
  KpiCard.jsx       ← novo
  StatusBadge.jsx   ← novo
  DataRow.jsx       ← novo
  SectionCard.jsx   ← novo
  PageHeader.jsx    ← novo
  EmptyState.jsx    ← novo
  BottomNav.jsx     ← novo (mobile shell)
```

### Tailwind: quando usar

| ✅ Usar | ❌ Não usar |
|---------|------------|
| Layout utilitário: `flex gap-2 items-center` | Cores: usar `var(--accent)`, não `text-yellow-400` |
| Responsividade: `hidden md:flex`, `grid-cols-2 md:grid-cols-4` | Fontes: usar tokens, não classes Tailwind de font-family |
| Estados hover: `hover:opacity-80` | Z-index: usar `var(--z-modal)`, não `z-50` |

### Ordem de implementação

1. **StatusBadge + KpiCard** — usados em 100% das telas; criar primeiro
2. **DataRow + SectionCard** — base de todas as listagens
3. **BottomNav** — responsividade mobile (breakpoint 768px)
4. **PageHeader + EmptyState** — aplicar nas views existentes progressivamente
5. **Quebrar App.jsx** — extrair views e hooks para módulos (9k linhas → módulos independentes)

### Invariante de implementação

> Cada componente novo deve ser testável de forma isolada: props entram, UI sai, zero side effects. Lógica de dados fica nas views ou hooks. Componentes de UI são burros por design.
