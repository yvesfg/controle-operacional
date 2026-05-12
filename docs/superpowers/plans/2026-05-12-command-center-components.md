# Command Center — UI Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar os 7 componentes reutilizáveis do Command Center (StatusBadge, KpiCard, DataRow, SectionCard, PageHeader, EmptyState, BottomNav) e adicionar o CSS de responsividade mobile, substituindo usos ad-hoc em DashboardView.

**Architecture:** Cada componente é um arquivo JSX puro em `src/components/` — sem lógica de negócio, sem acesso a Supabase, sem estado global. Recebem dados via props e devolvem JSX. Toda estilização usa `var(--token)` do design system existente. O DashboardView é atualizado para consumir os novos componentes como prova de uso.

**Tech Stack:** React 18.3, Vite 5.4, CSS Custom Properties (`src/design-system/tokens.css`), sem framework de testes instalado — verificação via `npm run build` (zero erros) + inspeção visual no dev server.

> **Nota:** App.jsx (~3987 linhas) não será quebrado neste plano. Isso é escopo de um plano separado.

---

## Mapa de arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `src/components/StatusBadge.jsx` | Badge semântico de status com mapa interno |
| Criar | `src/components/KpiCard.jsx` | Card de KPI com label, valor, delta e acento |
| Criar | `src/components/DataRow.jsx` | Linha de lista com leading/title/meta/trailing/action |
| Criar | `src/components/SectionCard.jsx` | Wrapper de seção com header + actions + children |
| Criar | `src/components/PageHeader.jsx` | Cabeçalho de view com título, subtítulo e ação |
| Criar | `src/components/EmptyState.jsx` | Estado vazio com ícone, mensagem e CTA |
| Criar | `src/components/BottomNav.jsx` | Navegação inferior mobile (5 tabs) |
| Modificar | `src/design-system/layout.css` | Adicionar `.co-bottom-nav` e regras responsive |
| Modificar | `src/views/DashboardView.jsx` | Substituir KPIs e lista de motoristas pelos novos componentes |

---

## Task 1: StatusBadge

**Files:**
- Criar: `src/components/StatusBadge.jsx`

O StatusBadge mapeia um `status` string para cor, background e label. Nenhum valor de cor é hardcoded — tudo via `var(--)`.

- [ ] **Step 1: Criar o arquivo**

```jsx
// src/components/StatusBadge.jsx
import React from "react";

const STATUS_MAP = {
  "no-prazo":    { label: "No prazo",    color: "var(--green)",  bg: "rgba(14,203,129,.1)"  },
  "aguardando":  { label: "Aguardando",  color: "var(--accent)", bg: "rgba(245,197,58,.1)"  },
  "ro-pendente": { label: "RO Pendente", color: "var(--red)",    bg: "rgba(246,70,93,.1)"   },
  "em-transito": { label: "Em trânsito", color: "var(--cyan)",   bg: "rgba(45,189,182,.1)"  },
  "encerrado":   { label: "Encerrado",   color: "var(--text2)",  bg: "var(--card2)"         },
  "no-cliente":  { label: "No cliente",  color: "var(--accent)", bg: "rgba(245,197,58,.1)"  },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "var(--text2)", bg: "var(--card2)" };
  return (
    <span style={{
      background:    s.bg,
      color:         s.color,
      borderRadius:  "var(--radius-badge)",
      padding:       "3px 10px",
      fontSize:      "var(--text-2xs)",
      fontWeight:    "var(--fw-bold)",
      whiteSpace:    "nowrap",
      fontFamily:    "var(--font-body)",
    }}>
      {s.label}
    </span>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
cd "controle operacional" && npm run build
```
Esperado: saída sem erros, arquivo em `dist/`.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusBadge.jsx
git commit -m "feat: add StatusBadge component with semantic status map"
```

---

## Task 2: KpiCard

**Files:**
- Criar: `src/components/KpiCard.jsx`

Card de KPI com label superior, valor grande, delta colorido e variante `accent` (borda amber).

- [ ] **Step 1: Criar o arquivo**

```jsx
// src/components/KpiCard.jsx
import React from "react";

const DELTA_COLORS = {
  green:   "var(--green)",
  red:     "var(--red)",
  neutral: "var(--text2)",
};

export default function KpiCard({
  label,
  value,
  delta,
  deltaColor = "neutral",
  accent = false,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background:    "var(--card)",
        border:        accent
          ? "1px solid rgba(245,197,58,.35)"
          : "1px solid var(--border)",
        borderRadius:  "var(--radius-card)",
        padding:       "var(--card-p-sm)",
        cursor:        onClick ? "pointer" : "default",
      }}
    >
      <div style={{
        fontSize:      "var(--text-2xs)",
        fontWeight:    "var(--fw-bold)",
        color:         "var(--text2)",
        textTransform: "uppercase",
        letterSpacing: "var(--ls-label)",
        marginBottom:  "var(--space-1)",
        fontFamily:    "var(--font-body)",
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   "var(--text-3xl)",
        fontWeight: "var(--fw-bold)",
        color:      accent ? "var(--accent)" : "var(--text)",
        lineHeight: "var(--leading-tight)",
        fontFamily: "var(--font-heading)",
      }}>
        {value}
      </div>
      {delta && (
        <div style={{
          fontSize:   "var(--text-xs)",
          color:      DELTA_COLORS[deltaColor] ?? DELTA_COLORS.neutral,
          marginTop:  "var(--space-1)",
          fontFamily: "var(--font-body)",
        }}>
          {delta}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/KpiCard.jsx
git commit -m "feat: add KpiCard component with delta and accent variant"
```

---

## Task 3: DataRow

**Files:**
- Criar: `src/components/DataRow.jsx`

Linha de lista genérica. `leading` e `trailing` e `action` são slots de ReactNode — o componente não sabe o que é passado, só posiciona.

- [ ] **Step 1: Criar o arquivo**

```jsx
// src/components/DataRow.jsx
import React from "react";

export default function DataRow({
  leading,
  title,
  meta,
  trailing,
  action,
  onClick,
  noBorder = false,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "var(--space-3)",
        padding:       "10px var(--space-4)",
        borderBottom:  noBorder ? "none" : "1px solid var(--card2)",
        cursor:        onClick ? "pointer" : "default",
      }}
    >
      {leading && (
        <div style={{ flexShrink: 0 }}>{leading}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:     "var(--text-sm)",
          fontWeight:   "var(--fw-semibold)",
          color:        "var(--text)",
          whiteSpace:   "nowrap",
          overflow:     "hidden",
          textOverflow: "ellipsis",
          fontFamily:   "var(--font-body)",
        }}>
          {title}
        </div>
        {meta && (
          <div style={{
            fontSize:  "var(--text-xs)",
            color:     "var(--text2)",
            marginTop: "2px",
            fontFamily: "var(--font-body)",
          }}>
            {meta}
          </div>
        )}
      </div>
      {trailing && (
        <div style={{ flexShrink: 0 }}>{trailing}</div>
      )}
      {action && (
        <div style={{ flexShrink: 0 }}>{action}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/DataRow.jsx
git commit -m "feat: add DataRow component for list items"
```

---

## Task 4: SectionCard

**Files:**
- Criar: `src/components/SectionCard.jsx`

Wrapper de seção com header (título + actions opcionais) e área de conteúdo para children.

- [ ] **Step 1: Criar o arquivo**

```jsx
// src/components/SectionCard.jsx
import React from "react";

export default function SectionCard({ title, actions, children, style }) {
  return (
    <div style={{
      background:   "var(--card)",
      border:       "1px solid var(--border)",
      borderRadius: "var(--radius-card)",
      overflow:     "hidden",
      display:      "flex",
      flexDirection:"column",
      ...style,
    }}>
      <div style={{
        padding:        "10px var(--space-4)",
        borderBottom:   "1px solid var(--border)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        flexShrink:     0,
      }}>
        <span style={{
          fontSize:   "var(--text-sm)",
          fontWeight: "var(--fw-bold)",
          color:      "var(--text)",
          fontFamily: "var(--font-heading)",
        }}>
          {title}
        </span>
        {actions && (
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {actions}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/SectionCard.jsx
git commit -m "feat: add SectionCard wrapper component"
```

---

## Task 5: PageHeader

**Files:**
- Criar: `src/components/PageHeader.jsx`

Cabeçalho de view com título, subtítulo opcional e ação primária opcional.

- [ ] **Step 1: Criar o arquivo**

```jsx
// src/components/PageHeader.jsx
import React from "react";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      marginBottom:   "var(--space-4)",
    }}>
      <div>
        <div style={{
          fontSize:   "var(--text-lg)",
          fontWeight: "var(--fw-bold)",
          color:      "var(--text)",
          fontFamily: "var(--font-heading)",
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize:  "var(--text-xs)",
            color:     "var(--text2)",
            marginTop: "2px",
            fontFamily:"var(--font-body)",
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/PageHeader.jsx
git commit -m "feat: add PageHeader component"
```

---

## Task 6: EmptyState

**Files:**
- Criar: `src/components/EmptyState.jsx`

Estado vazio para listas e seções sem dados.

- [ ] **Step 1: Criar o arquivo**

```jsx
// src/components/EmptyState.jsx
import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "var(--space-10) var(--space-6)",
      gap:            "var(--space-2)",
      textAlign:      "center",
    }}>
      {Icon && (
        <div style={{
          width:          "40px",
          height:         "40px",
          background:     "var(--card2)",
          borderRadius:   "var(--radius-tile)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          marginBottom:   "var(--space-2)",
        }}>
          <Icon size={20} color="var(--text2)" />
        </div>
      )}
      <div style={{
        fontSize:   "var(--text-md)",
        fontWeight: "var(--fw-semibold)",
        color:      "var(--text)",
        fontFamily: "var(--font-heading)",
      }}>
        {title}
      </div>
      {description && (
        <div style={{
          fontSize:  "var(--text-sm)",
          color:     "var(--text2)",
          maxWidth:  "280px",
          fontFamily:"var(--font-body)",
        }}>
          {description}
        </div>
      )}
      {action && (
        <div style={{ marginTop: "var(--space-3)" }}>{action}</div>
      )}
    </div>
  );
}
```

> **Nota sobre `Icon`:** O projeto usa SVG inline via `hIco()` helper em App.jsx. O `EmptyState` aceita qualquer ReactNode como `icon` — se o projeto não usa componentes de ícone com `size` prop, passe o SVG direto: `icon={() => hIco(...)}`.

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/EmptyState.jsx
git commit -m "feat: add EmptyState component"
```

---

## Task 7: BottomNav + CSS responsivo

**Files:**
- Criar: `src/components/BottomNav.jsx`
- Modificar: `src/design-system/layout.css`

O BottomNav é fixo no rodapé no mobile. Recebe `activeTab` e `onNavigate` — não lê de roteador, não lê estado global.

- [ ] **Step 1: Backup do layout.css**

```bash
cp "src/design-system/layout.css" "src/design-system/layout.css.bak_$(date +%Y%m%d_%H%M%S)"
```

- [ ] **Step 2: Criar BottomNav.jsx**

```jsx
// src/components/BottomNav.jsx
import React from "react";

const TABS = [
  { id: "dashboard",    label: "Home"        },
  { id: "planilha",     label: "Planilha"    },
  { id: "ocorrencias",  label: "Ocorrências" },
  { id: "motoristas",   label: "Motoristas"  },
  { id: "mais",         label: "Mais"        },
];

export default function BottomNav({ activeTab, onNavigate }) {
  return (
    <nav className="co-bottom-nav">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            "4px",
              background:     "transparent",
              border:         "none",
              cursor:         "pointer",
              padding:        "8px 4px",
              color:          isActive ? "var(--accent)" : "var(--text2)",
              fontFamily:     "var(--font-body)",
              fontSize:       "var(--text-2xs)",
              fontWeight:     isActive ? "var(--fw-bold)" : "var(--fw-normal)",
              flex:           1,
            }}
          >
            <div style={{
              width:        "20px",
              height:       "20px",
              background:   isActive ? "rgba(245,197,58,.15)" : "transparent",
              borderRadius: "var(--radius-btn)",
              transition:   "background var(--transition-fast)",
            }} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
```

> **Ícones:** Os `<div>` placeholder nas posições de ícone devem ser substituídos pelo `hIco()` ou SVGs reais quando integrado ao App.jsx. O componente estrutural está completo.

- [ ] **Step 3: Adicionar CSS do BottomNav ao layout.css**

Adicionar ao final do arquivo `src/design-system/layout.css`, antes do último `}` ou no final do arquivo:

```css
/* ── Bottom Navigation — mobile only ─────────────────────── */
.co-bottom-nav {
  display: none; /* hidden by default — shown only on mobile */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--color-sidebar-bg);
  border-top: 1px solid var(--color-border);
  z-index: var(--z-sidebar);
  align-items: center;
  justify-content: space-around;
  padding: 0 var(--space-2);
  padding-bottom: env(safe-area-inset-bottom, 0px); /* iPhone notch */
}

/* ── Responsive breakpoints ───────────────────────────────── */
@media (max-width: 767px) {
  .co-bottom-nav {
    display: flex;
  }

  /* Views need bottom padding so content doesn't hide behind BottomNav */
  .co-main-content {
    padding-bottom: 72px;
  }

  /* Sidebar is never shown on mobile */
  .co-sidebar {
    display: none !important;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  /* Tablet: collapse sidebar to icon-only width */
  :root {
    --sidebar-w: var(--sidebar-collapsed-w);
  }
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.jsx src/design-system/layout.css
git commit -m "feat: add BottomNav component and mobile responsive CSS"
```

---

## Task 8: Aplicar KpiCard + DataRow + SectionCard no DashboardView

**Files:**
- Modificar: `src/views/DashboardView.jsx`

Substituir os cards de KPI e a lista de motoristas inline pelos novos componentes. **Não alterar lógica de dados — só substituir a renderização.** Usar Python conforme CLAUDE.md (arquivo grande).

- [ ] **Step 1: Verificar imports atuais do DashboardView**

```bash
head -20 "src/views/DashboardView.jsx"
```

Anote quais imports existem para não duplicar.

- [ ] **Step 2: Adicionar imports dos novos componentes**

No topo do `src/views/DashboardView.jsx`, adicionar (via Python conforme CLAUDE.md):

```python
# fix_dashboard_imports.py
import re

path = "src/views/DashboardView.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_imports = '''import KpiCard     from '../components/KpiCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import DataRow     from '../components/DataRow.jsx';
import SectionCard from '../components/SectionCard.jsx';
import PageHeader  from '../components/PageHeader.jsx';
'''

# Insert after the first import line
first_import_end = content.index('\n', content.index('import ')) + 1
content = content[:first_import_end] + new_imports + content[first_import_end:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
```

Salvar o script na raiz do projeto e executar a partir daí:
```bash
# na raiz de "controle operacional/"
python fix_dashboard_imports.py
```

- [ ] **Step 3: Localizar os KPI cards inline no DashboardView**

```bash
grep -n "Em Rota\|Chegadas\|Ocorrências\|NFD" src/views/DashboardView.jsx | head -20
```

Anote os números de linha dos 4 cards KPI inline.

- [ ] **Step 4: Substituir KPI cards inline pelos componentes**

Identificar o bloco dos 4 cards KPI inline (normalmente um grid com `display:"grid",gridTemplateColumns:"repeat(4,1fr)"`) e substituir pela versão com `KpiCard`.

Exemplo do padrão a substituir (adapte às linhas reais encontradas no Step 3):
```jsx
// ANTES — inline ad hoc (exemplo)
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
  <div style={{background:t.card,border:`1px solid ${t.borda}`,borderRadius:8,padding:12}}>
    <div style={{fontSize:9,color:t.txt2,...}}>Em Rota</div>
    <div style={{fontSize:22,fontWeight:700,color:"#f5c53a"}}>{emRota}</div>
    ...
  </div>
  {/* × 4 */}
</div>

// DEPOIS — com KpiCard
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"var(--space-2)"}}>
  <KpiCard label="Em Rota"      value={emRota}      delta={`↑ ${deltaRota} hoje`}    deltaColor="green"   accent />
  <KpiCard label="Chegadas"     value={chegadas}    delta={`${chegadasConf} confirmadas`} deltaColor="neutral" />
  <KpiCard label="Ocorrências"  value={ocorrAbertas} delta={`${ocorrRO} RO pendentes`}  deltaColor="red"    accent={ocorrAbertas > 0} />
  <KpiCard label="NFDs"         value={nfdsHoje}    delta={`${descargasPend} descarga pend.`} deltaColor="neutral" />
</div>
```

> **Importante:** Os nomes de variáveis (`emRota`, `chegadas`, etc.) devem ser os que já existem no DashboardView — não invente nomes novos. Leia o código existente para identificar as variáveis corretas antes de escrever o Python.

- [ ] **Step 5: Verificar build e inspecionar visualmente**

```bash
npm run build && npm run dev
```

Abrir `http://localhost:5173` e verificar que os KPI cards aparecem corretamente no Dashboard.

- [ ] **Step 6: Commit**

```bash
git add src/views/DashboardView.jsx
git commit -m "feat: replace inline KPI cards with KpiCard component in DashboardView"
```

---

## Checklist pós-implementação

- [ ] `npm run build` passa sem erros após cada task
- [ ] Nenhum `#f5c53a`, `'Space Grotesk'`, `9999` hardcoded nos novos arquivos
- [ ] StatusBadge cobre todos os 5 status semânticos definidos no spec
- [ ] KpiCard `accent=true` produz borda amber visível
- [ ] DataRow trunca `title` longo com ellipsis (overflow: hidden + text-overflow: ellipsis)
- [ ] SectionCard `overflow: hidden` evita conteúdo vazando do card
- [ ] BottomNav é `display: none` em desktop e `display: flex` em `< 768px`
- [ ] `.co-main-content` tem `padding-bottom: 72px` em mobile
- [ ] Abrir GitHub Desktop e fazer commit/push

---

## Próximo plano (fora deste escopo)

- Aplicar `PageHeader` + `EmptyState` + `DataRow` nas views de Ocorrências, Planilha e Motoristas
- Adicionar ícones reais ao BottomNav via o helper `hIco()` do App.jsx
- Quebrar App.jsx em módulos (`useAuth`, `useData`, `AppShell`)
