# Spec: Nova UI — Layout & Design System
**Data:** 2026-06-17  
**Status:** Aprovado pelo usuário

---

## Resumo

Redesign visual do app Controle Operacional com foco em:
- Navegação lateral moderna (sidebar glass)
- Máximo espaço para dados operacionais (tabela dominante)
- Cards expansíveis que eliminam modais desnecessários para consulta rápida

---

## Decisões de Design

### 1. Estrutura de Navegação — Sidebar vertical com ícones

- Sidebar fixa à esquerda, largura **56px**
- Fundo **glassmorphism** (`rgba(255,255,255,0.04)` + `backdrop-filter: blur(12px)`)
- Borda direita sutil: `1px solid rgba(255,255,255,0.06)`
- Ícone ativo: fundo `rgba(79,70,229,0.3)` + borda `rgba(79,70,229,0.45)` + ícone em `#a5b4fc`
- Ícones inativos: opacidade 55%, sem fundo
- Tooltip com nome da aba no hover (nativo HTML `title`)
- Logo no topo (30×30px, gradiente `#4f46e5 → #7c3aed`, border-radius 8px)
- Avatar do usuário no rodapé

**Abas (ordem):** Operacional · Resultado · Créditos Pendentes · Despesas · Dashboard · Admin

### 2. Fundo Global — Dark glass

- Background body: `#070b10`
- App shell: `linear-gradient(135deg, #0f1923 0%, #1a1040 55%, #0d1f15 100%)`
- Blobs de blur decorativos (3 círculos com `filter: blur(50px)`, opacidade baixa em roxo, verde e vermelho)
- Sem bordas pesadas — hierarquia via transparência e blur

### 3. Topo de Conteúdo — Toolbar compacta + KPI strip

**Toolbar (altura 32px):**
- Filtros como pills: base (`AVB ▾`), mês (`Jun 2026 ▾`), status (`Todos ▾`)
- Pill ativo: fundo `rgba(79,70,229,0.15)`, borda `rgba(79,70,229,0.35)`, texto `#a5b4fc`
- Pill inativo: fundo `rgba(255,255,255,0.06)`, texto `rgba(255,255,255,0.65)`
- Botão "+ Nova operação" à direita: fundo `rgba(79,70,229,0.25)`, borda `rgba(79,70,229,0.5)`

**KPI Strip (altura 34px, abaixo da toolbar):**
- 4 chips horizontais em flex: Viagens · Margem · Pendentes · Créditos
- Fundo `rgba(255,255,255,0.03)`, borda `rgba(255,255,255,0.07)`, border-radius 6px
- Valores coloridos por semântica: azul (neutro), verde (positivo), vermelho (alerta), amarelo (atenção)
- Labels em `rgba(255,255,255,0.3)` tamanho 10px

### 4. Tabela — Cards expansíveis com detalhe inline

**Container da tabela:**
- Fundo `rgba(255,255,255,0.02)`, borda `rgba(255,255,255,0.06)`, border-radius 10px
- Header com colunas: Código · Motorista · Rota · Status · Margem · (toggle)
- Texto do header: uppercase, letter-spacing 0.6px, `rgba(255,255,255,0.25)`

**Cada linha (row-card):**
- Estado colapsado: linha simples com padding 9px vertical, separador `1px solid rgba(255,255,255,0.04)`
- Hover: `background rgba(255,255,255,0.03)`
- Estado expandido: borda esquerda `2px solid #4f46e5`, fundo `rgba(79,70,229,0.1)`, padding-left ajustado
- Toggle ▾/▴ à direita para indicar estado

**Detalhe expandido (inline, sem modal):**
- Chips de detalhe: Placa · CTE · Contrato · Saída · Chegada/Previsão
- Cada chip: fundo `rgba(255,255,255,0.04)`, borda `rgba(255,255,255,0.07)`, border-radius 6px
- Ações à direita: Ocorrência · WhatsApp · **Editar** (primário em roxo)
- Botão Editar abre o modal existente (sem substituir)

**Badges de status (pill arredondado):**
| Status | Fundo | Texto | Borda |
|--------|-------|-------|-------|
| OK | `rgba(34,197,94,0.12)` | `#86efac` | `rgba(34,197,94,0.2)` |
| Pendente | `rgba(234,179,8,0.12)` | `#fde68a` | `rgba(234,179,8,0.2)` |
| Atraso | `rgba(239,68,68,0.12)` | `#fca5a5` | `rgba(239,68,68,0.2)` |
| Em trânsito | `rgba(79,70,229,0.12)` | `#a5b4fc` | `rgba(79,70,229,0.2)` |

---

## Colunas visíveis na tabela (OperacionalView)

- `codigo` (monospace, `#a5b4fc`)
- `motorista`
- `rota` (origem → destino, texto secundário)
- `status` (badge pill)
- `margem` = `vl_cte − vl_contrato` (colorida por sinal)

**Detalhe expandido expõe:**
- `placa`, `vl_cte`, `vl_contrato`, `data_saida`, `data_final` ou previsão

---

## Tokens de Cor (extensões ao design system existente)

Os valores abaixo são **adições** ao `tokens.css` existente — não substituem os tokens atuais.

```css
--glass-bg: rgba(255,255,255,0.04);
--glass-border: rgba(255,255,255,0.06);
--glass-blur: blur(12px);
--app-gradient: linear-gradient(135deg, #0f1923 0%, #1a1040 55%, #0d1f15 100%);
--accent-primary: #4f46e5;
--accent-primary-glow: rgba(79,70,229,0.25);
--row-expanded-bg: rgba(79,70,229,0.10);
--row-expanded-border: #4f46e5;
```

---

## Escopo de Implementação

Esta spec cobre **apenas a camada visual/layout**. Nenhuma lógica de negócio, queries Supabase ou cálculos são alterados.

**Arquivos afetados (estimativa):**
- `src/design-system/tokens.css` — adicionar tokens glass
- `src/App.jsx` — substituir nav/tabs atual por sidebar + shell glass (via patch Python)
- `src/views/OperacionalView.jsx` — substituir tabela por cards expansíveis
- `src/components/PageHeader.jsx` — adaptar para toolbar compacta + KPI strip

**Fora do escopo:**
- Outras views (Resultado, Créditos, Despesas) recebem apenas o novo shell/sidebar; conteúdo interno fica para próxima iteração
- Nenhuma alteração em modais existentes (ModalEdit, ModalDetalhe, etc.)
- Sem mudança em lógica de permissões, autenticação ou sync Supabase

---

## Referência Visual

Preview interativo salvo em:
`.superpowers/brainstorm/844-1781699691/content/preview-final.html`
