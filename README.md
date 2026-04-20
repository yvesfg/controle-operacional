# Handoff: YFGroup — Controle Operacional

## Overview
Redesign completo do sistema de controle logístico operacional da YFGroup Transportes. Cobre login, dashboard, gestão de viagens, pós-carga (diárias, carga/descarga, ocorrências), operacional (SGS) e administração do sistema.

## Sobre os Arquivos de Design
Os arquivos neste pacote são **protótipos de referência criados em HTML/React** — eles mostram a aparência e comportamento pretendidos, mas **não são código de produção**. A tarefa é **recriar esses designs no codebase existente do app** (seu projeto em desenvolvimento), usando seus padrões, bibliotecas e componentes já estabelecidos.

## Fidelidade
**Alta fidelidade (hifi)** — O protótipo é pixel-perfect com cores finais, tipografia, espaçamentos e interações completas. O desenvolvedor deve recriar a UI com a maior fidelidade possível usando as bibliotecas e padrões existentes no codebase.

---

## Design Tokens

### Cores
```css
--bg:        #080810          /* Fundo principal */
--surface:   #0f0f1a          /* Fundo de surface / sidebar */
--card:      #13131f          /* Fundo de cards */
--card2:     #181826          /* Fundo de cards secundários */
--border:    #23233a          /* Borda padrão */
--border2:   #2e2e4a          /* Borda de foco/hover */
--text:      #e8e8f0          /* Texto primário */
--text2:     #9090b0          /* Texto secundário */
--text3:     #5a5a7a          /* Texto terciário / labels */

/* Acentos (oklch para harmonia) */
--accent:    oklch(0.62 0.22 280)   /* Violeta principal — YFGroup brand */
--accent2:   oklch(0.62 0.22 280 / 0.15)  /* Violeta bg leve */
--cyan:      oklch(0.68 0.18 200)   /* Cyan — info / em rota */
--green:     oklch(0.68 0.18 145)   /* Verde — sucesso / no prazo */
--orange:    oklch(0.72 0.2  55)    /* Laranja — atenção / atraso */
--red:       oklch(0.65 0.22 20)    /* Vermelho — alerta / crítico */
--yellow:    oklch(0.78 0.18 90)    /* Amarelo — aviso */
```

### Tipografia
```
Display / Headings:  Space Grotesk — weights 400, 500, 600, 700
Body / Labels:       DM Sans       — weights 400, 500, 600
Mono / Códigos:      DM Mono       — weights 400, 500

Hierarquia de tamanhos:
  Page title:    20px / Space Grotesk 700 / tracking -0.03em
  Card value:    26–40px / Space Grotesk 700 / tracking -0.04em
  Section label: 11px / DM Mono 400 / tracking 0.06em / UPPERCASE
  Body:          13–14px / DM Sans 400
  Badge/tag:     9–11px / DM Mono 500 / tracking 0.06em
```

### Espaçamento
```
Card padding:     18–24px
Section gap:      12–14px (entre cards)
Content padding:  24px (padding lateral das páginas)
Border radius:    10px (cards), 6–8px (botões/inputs), 4px (badges)
```

### Sombras
```
Modal overlay:  background rgba(0,0,0,0.7) + backdrop-filter blur(4px)
Tweaks panel:   box-shadow 0 8px 32px rgba(0,0,0,0.5)
```

---

## Telas / Views

### 1. Login
**Propósito:** Autenticação de operadores autorizados.

**Layout:**
- Fundo: `--bg` com radial-gradient de acento violeta a 12% de opacidade
- Grid de pontos como textura: `radial-gradient(--border 1px, transparent 1px)` / `background-size: 28px 28px` / `opacity 0.35`
- Card centralizado: `max-width 420px`, padding `32px 28px`, `border-radius 14px`

**Componentes:**
- Logo: ícone truck (20px) em caixa violeta 38×38px `border-radius 8px` + texto "YFGroup" Space Grotesk 700 22px
- Subtítulo: "CONTROLE OPERACIONAL" — DM Mono 13px, `--text3`
- Inputs: `background --surface`, `border 1px solid --border2`, `border-radius 8px`, padding `10px 14px`, `border-color --accent` no focus
- Botão submit: `background --accent`, border-radius 8px, padding 12px, branco, Space Grotesk 600 15px
- Indicador online: dot 6px verde com CSS `animation: pulse 2s infinite`

**Behavior:**
- Loading state: botão muda para "Autenticando..." + `background --border2` por 1.2s
- Sessão persiste em `localStorage` key `yfg_loggedin`

---

### 2. Dashboard
**Propósito:** Visão geral operacional — métricas do período, status de DTs, top motoristas, registros recentes.

**Layout:**
- Padding: 24px
- Period selector: row de botões pill no topo
- KPI row: `grid auto-fill minmax(170px,1fr)` gap 12px
- Charts row: `grid 1fr 220px 240px` gap 14px
- Bottom row: `grid 1fr 280px` gap 14px

**Componentes KpiCard:**
```
background: --card
border: 1px solid --border
border-radius: --radius (10px)
padding: 18px 20px
Barra de cor no topo: height 2px, background = cor do card, opacity 0.7

Conteúdo:
  label:   11px DM Mono UPPERCASE tracking 0.06em --text3
  value:   28px Space Grotesk 700 tracking -0.04em
  sub:     12px DM Sans --text2
  delta:   11px DM Mono, verde se >0, vermelho se <0
  spark:   MiniSparkline SVG 80×30px direita superior
```

**Componente DonutChart:**
- SVG 120×120 com slices como paths radiais
- Círculo central vazio (r=28) com fundo `--card`
- Total centralizado: 20px Space Grotesk 700

**Componente LineChart:**
- SVG com path de linha + área gradient
- Gradiente de `--accent` 30% opacidade até 0%
- strokeWidth 2.5, strokeLinejoin round

**Top Motoristas:**
- Avatar 28px circular com background `cor/cor22` e iniciais
- Barra de progresso: height 3px, `--border` bg, cor do motorista fill
- Valor numérico em cor do motorista, DM Mono 600 13px

**Tabela Registros Recentes:**
- Header row: `background --surface`, font DM Mono 10px UPPERCASE tracking 0.06em
- Row hover: `background --surface`
- StatusBadge: `background cor/0.15`, `color cor`, DM Mono 10px 500

---

### 3. Viagens
**Propósito:** Gerenciamento completo de DTs — filtro por status, busca, visualização e criação.

**Layout:**
- Filter bar + search + botão "Nova Viagem"
- Tabela full-width com 8 colunas

**Status e cores:**
```
pendente:  bg oklch(0.72 0.2 55 / 0.15)   text --orange  label "PENDENTE"
carregado: bg oklch(0.62 0.22 280 / 0.15) text --accent  label "CARREGADO"
em rota:   bg oklch(0.68 0.18 200 / 0.15) text --cyan    label "EM ROTA"
entregue:  bg oklch(0.68 0.18 145 / 0.15) text --green   label "ENTREGUE"
cancelado: bg oklch(0.65 0.22 20 / 0.15)  text --red     label "CANCELADO"
```

**Modal Nova Viagem:**
- `backdrop-filter blur(4px)` + `rgba(0,0,0,0.7)`
- Card `max-width 520px`, `border-radius 14px`, `border --border2`
- Grid 2 colunas para campos, campo tipo carga full-width
- Botões: Cancelar (ghost) + Criar Viagem (violeta)

---

### 4. Ocorrências
**Propósito:** Lista e gestão de incidentes operacionais com filtros por status e gravidade.

**Layout:**
- Stats row: 4 cards (Total, Abertas, Em Andamento, Resolvidas)
- Filter tabs + search bar + botão Nova Ocorrência
- Lista de cards expansíveis

**Gravidade e cores:**
```
baixa:   --green   label "BAIXA"
media:   --yellow  label "MÉDIA"
alta:    --orange  label "ALTA"
critica: --red     label "CRÍTICA"
```

**Status de ocorrência:**
```
aberta:        --red    label "ABERTA"
em_andamento:  --orange label "EM ANDAMENTO"
resolvida:     --green  label "RESOLVIDA"
```

**Card de ocorrência:**
- Dot colorido pela gravidade (8px, esquerda)
- Expandível ao clicar: mostra botões Encaminhar / Resolver / Escalar
- Border muda para `--accent` quando selecionado

**Modal Nova Ocorrência:**
- Campos: Tipo (select), Gravidade (select), Motorista (input), Descrição (textarea)
- Grid 2 colunas para tipo + gravidade

---

### 5. Diárias (Pós-Carga)
**Propósito:** Controle financeiro de diárias — o que deve ser pago, foi pago e está pendente.

**Layout:**
- 3 KPI cards financeiros (Total Devido / Total Pago / A Pagar) com border colorida
- Tabs: Resumo / Planilha / Conferência
- 3 status cards clicáveis como filtro (No Prazo / Perdeu Agenda / Sem Descarga)
- Filter bar com selects de período + toggle Linhas/Blocos
- Grid de cards OU tabela

**Status de diária:**
```
no_prazo:       --green   "NO PRAZO"
perdeu_agenda:  --orange  "PERDEU AGENDA"
sem_descarga:   --yellow  "SEM DESCARGA"
aguardando:     --accent  "AGUARDANDO"
```

**Status de pagamento:**
```
pago:     --green  "PAGO"
nao_pago: --red    "NÃO PAGO"
```

**Card de motorista (modo blocos):**
- Avatar 32px circular com background `cor/0.22` e iniciais em 2 chars
- Nome truncado (overflow ellipsis), RO, badges de status
- Diária em violeta Space Grotesk 700 14px
- Grid 2 colunas para metadados (DT, Placa, Agenda, Descarga, Origem, RO)

---

### 6. Carga/Descarga (Pós-Carga)
**Propósito:** Controle de descargas do dia — quem descarrega hoje, quem está em atraso, quem aguarda.

**Layout:**
- 4 KPI cards com border colorida
- Filter bar + toggle view
- Header de data com ícone calendar
- Grid de cards OU tabela

**Status de descarga:**
```
prêmio:     --green   "PRÊMIO"
pendente:   --orange  "PENDENTE"
conferência: --cyan   "CONFERÊNCIA"
```

**Card de motorista:** igual ao de Diárias, mas com campo Destino ao invés de campo financeiro.

---

### 7. Operac. — SGS
**Propósito:** Central de operações — chamados SGS, diárias de vinculação, ocorrências, apontamentos de carga/checkin.

**Layout:**
- Grid de 4 módulos (máx 500px width) no topo
- Seção de Chamados SGS abaixo com empty state

**Cards de módulo:**
- 40×40px ícone em caixa com `cor/0.18` background, border-radius 10px
- Border `cor/0.33`, hover: border sólida + `background --card2`
- Label DM Mono 11px UPPERCASE, subtitle DM Sans 11px `--text3`

**Empty state:** ícone 48px em caixa circular, texto explicativo, botão ghost

---

### 8. Admin
**Propósito:** Configurações do sistema — banco de dados, usuários, integrações, segurança.

**Layout:**
- Grid 2 colunas `max-width 900px`
- Card Supabase PostgreSQL full-width no topo
- Acordeões expansíveis para cada seção

**Card Supabase:**
- Logo "SB" em caixa verde 32×32px `border-radius 8px`
- Badge ONLINE: fundo `green/0.12`, border `green/0.4`, dot verde + DM Mono
- Botões Sincronizar + Config DB em grid 2 colunas

**Acordeões:**
- Header com ícone + label + chevron (rotaciona 270deg quando aberto)
- Transição: `transform 0.2s`
- Seções: Gestão de Usuários, Conexões Supabase, Google Sheets, Alterar Senha, Email de Boas-Vindas, Contatos/Motoristas, Log de Alterações

---

## Sidebar

**Estrutura:**
```
width expandida:  220px
width colapsada:  64px
transition:       width 0.25s cubic-bezier(0.4,0,0.2,1)
background:       --surface
border-right:     1px solid --border
```

**Header:** Logo truck 30×30px violeta + "YFGroup" Space Grotesk 700 14px + "OPERACIONAL" DM Mono 9px

**Nav items:**
```
padding:         9px 10px (expandido) | 10px 0 (colapsado, centralizado)
border-radius:   7px
active bg:       --accent2
active color:    --accent
active weight:   600
hover bg:        rgba(255,255,255,0.04)
```

**Separador de seção (PÓS-CARGA):**
- Expandido: label "PÓS-CARGA" em DM Mono 9px `--text3` tracking 0.1em, padding `14px 10px 6px`
- Colapsado: linha horizontal 24px `--border`

**Badge de notificação:**
- Expandido: pill vermelho DM Mono 9px 700
- Colapsado: dot 7px vermelho no canto superior direito

**Ordem dos itens:**
```
Dashboard
Viagens
Planilha
Motoristas
Relatórios
Operac.
Admin
── PÓS-CARGA ──
Carga/Descarga
Diárias
Ocorrências
```

**Footer:** Avatar gradiente `--accent → --cyan` com iniciais "YF", nome + role, botão logout

---

## Topbar
```
height:     64px (minHeight)
padding:    16px 24px
border-bottom: 1px solid --border

Page title:   Space Grotesk 700 20px tracking -0.03em
Subtitle:     DM Mono 12px --text3 tracking 0.04em

Direita: botão de alertas + avatar do usuário
Botão alertas: background red/0.1, border red/0.3, color --red, DM Mono 12px
```

---

## Interações e Comportamento

### Navegação
- Estado da página persiste em `localStorage` key `yfg_page`
- Sidebar pode ser colapsada/expandida; estado controlado por prop

### Tabelas
- Row hover: `background --surface`, transition 0.1s
- Clique em linha abre detalhes (onde aplicável)

### Filtros
- Toggle de tabs: pill container com `background --card`, padding 3px, border-radius 8px
- Tab ativa: `background --surface`, `border 1px solid --border2`

### Modais
- Overlay: `rgba(0,0,0,0.7)` + `backdrop-filter blur(4px)`
- Click fora fecha o modal
- Inputs: focus muda border para `--accent`, blur volta para `--border2`
- Transição de inputs: `transition: border 0.2s`

### Cards expansíveis (Ocorrências)
- Click no card alterna seleção
- Border muda para `--accent` quando selecionado
- Área de ações aparece com `border-top 1px solid --border`

### Botões primários
```
background: --accent
border: none
border-radius: 7–8px
padding: 8–12px 16px
color: #fff
font: Space Grotesk 600 13–15px
```

### Botões ghost
```
background: none
border: 1px solid --border2
color: --text2
```

---

## Assets e Ícones
- Ícones: SVG inline próprio (stroke, não fill), `strokeWidth 1.8`, `strokeLinecap round`, `strokeLinejoin round`
- Ícones usados: dashboard, truck, alert, chart, users, doc, settings, logout, bell, plus, search, filter, x, chevron, chevronLeft, eye, check, warning, download, calendar, menu, planilha, descarga
- Fonte: Google Fonts — Space Grotesk, DM Sans, DM Mono

---

## Arquivos de Referência

| Arquivo | Descrição |
|---|---|
| `YFGroup Operacional.html` | Protótipo completo interativo — todas as telas |

---

## Notas para o Desenvolvedor

1. **Não copiar o HTML diretamente** — é referência de design, não código de produção
2. **Usar os tokens CSS** acima como base para o design system existente
3. **Prioridade de implementação sugerida:** Dashboard → Diárias → Carga/Descarga → Ocorrências → Admin → Operac. → Viagens
4. **Os dados mock** no protótipo mostram o formato esperado das entidades (motorista, viagem, ocorrência, diária, descarga)
5. **Responsividade:** O design foi pensado para desktop (1440px+) como primário, tablet como secundário. Mobile é simplificado.
6. **Estado de sidebar:** `collapsed` state deve ser persistido em `localStorage`
7. **Animações:** `transition: all 0.15s` nos hover states, `transition: width 0.25s cubic-bezier(0.4,0,0.2,1)` na sidebar
