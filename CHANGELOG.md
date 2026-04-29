## 2026-04-20 — Passo 4: Redesign Diárias

**Solicitado:** Redesign da view Diárias seguindo documentação.

**Implementado (App.jsx):**
- KPI financeiros (Total Devido/Pago/A Pagar): labels DM Mono uppercase tracking 0.06em `var(--text3)`; valores Space Grotesk 700 tracking -0.03em
- Status cards clicáveis (No Prazo/Perdeu Agenda/Sem Descarga): contador Space Grotesk 700 48px tracking -0.04em
- Tabs Resumo/Planilha/Conferência: active `var(--surface)` + border `var(--border2)` + cor `var(--accent)`
- Toggle Linhas/Blocos: active `var(--accent2)` + cor `var(--accent)`, font Space Grotesk
- Dashboard mini panels Diárias/Descargas: valor Space Grotesk 700 tracking -0.03em
- Build: ✓ 0 erros, 0 warnings

## 2026-04-20 — Passo 3: Dashboard + Fix CSS Warning

**Solicitado:** Redesign do Dashboard e eliminar warning CSS do build.

**Implementado:**
- `theme-dark.css`: oklch convertidos para hex (--accent #7c3aed, --cyan #06b6d4, --green #22c55e, --orange #f97316, --red #ef4444, --yellow #eab308); elimina warning do esbuild
- `tokens.css`: restaurado `}` de fechamento do :root que estava truncado — raiz do warning
- `App.jsx` — Dashboard:
  - KPI label: DM Mono 11px uppercase tracking 0.06em `var(--text3)`
  - KPI value: Space Grotesk 700 28px tracking -0.04em
  - KPI sub: DM Sans 12px `var(--text2)`
  - Section labels (charts): DM Mono uppercase tracking 0.06em
  - Top Motoristas avatar: 28px circular (border-radius 50%)
  - Top Motoristas count: DM Mono 600 13px na cor do motorista
  - Tabela header: DM Mono 10px uppercase tracking 0.06em
  - Status badge: DM Mono 10px 500, fundo `cor/0.15` (bg leve)
  - Row hover: `var(--surface)` em vez de gold
  - Hero number: Space Grotesk 700 28px tracking -0.04em
- Build: ✓ 0 erros, 0 warnings

## 2026-04-20 — Passo 2: Redesign Sidebar e Topbar

**Solicitado:** Implementar Passo 2 do redesign — Sidebar e Topbar seguindo documentação.

**Implementado (App.jsx):**
- Sidebar: bg `var(--surface)`, border `var(--border)`, transition `cubic-bezier(0.4,0,0.2,1)`
- Logo: truck SVG em caixa `var(--accent)` 36×36px + "YFGroup" Space Grotesk 700 + "CONTROLE OPERACIONAL" DM Mono
- Nav: separador PÓS-CARGA entre tabs principais e Descarga/Diárias; tab "busca" oculta no sidebar
- Items: hover `rgba(255,255,255,0.04)`, active `var(--accent2)` / `var(--accent)`, font Space Grotesk 13px
- CSS adicionado: `.co-sidebar__section-lbl`, `.co-sidebar__section-line`, `.co-sidebar__badge-pill`, `.co-sidebar__badge-dot`
- Footer: avatar gradiente `accent → cyan` com 2 iniciais do usuário
- Topbar desktop/mobile: título Space Grotesk 700 20px `letter-spacing:-0.03em`, subtítulo DM Mono
- index.html: corrigido byte `<\\!DOCTYPE` → `<\!DOCTYPE`


## 2026-04-20 — Passo 1: Design Tokens e Fontes (Redesign YFGroup)

**Solicitado:** Implementar Passo 1 do redesign — tokens de cor/tipografia seguindo documentação Claude Design.

**Implementado:**
- `tokens.css`: fontes atualizadas para Space Grotesk / DM Sans / DM Mono; adicionados `--ls-page-title`, `--ls-card-value`, `--ls-section-lbl`
- `theme-dark.css`: adicionados semantic tokens `--bg`, `--surface`, `--card`, `--card2`, `--border`, `--border2`, `--text`, `--text2`, `--text3`, `--accent`, `--accent2`, `--cyan`, `--green`, `--orange`, `--red`, `--yellow` (oklch)
- `index.html`: Google Fonts para Space Grotesk (400–700), DM Sans (400–600), DM Mono (400–500); `theme-color` atualizado para `#080810`


## [2026-04-09] — Filtros Planilha + Relatório Geral

**Solicitado:** Dropdowns Ano/Mês/Origem na Planilha (default: data mais recente + todas origens); Relatório Geral com filtro Status, orientação paisagem garantida e design inovador.

**Implementado:**
- `Planilha`: barra de filtros com selects Ano, Mês, Origem acima da toolbar. Ao carregar dados, auto-seleciona o ano e mês mais recente com `useEffect`. Export respeita os filtros ativos.
- `Relatório Geral de Operações`: novo campo "Status Operacional" no modal (CARREGADO, PENDENTE, EM ABERTO, NO-SHOW, NÃO ACEITE, CANCELADO); filtro aplicado em `gerarRelatorioGeral`; coluna "Status Oper." adicionada na tabela; bloco visual de distribuição de status com barras de progresso CSS por categoria; CSS do relatório renovado (section-title com fundo azul degradê, tabela com gradiente no header, subheader com gradiente dourado). Orientação paisagem já estava configurada (`@page{size:landscape}`).

**Backup:** `src/backups/App.jsx.bak_20260409_193919`

## 2026-04-10
**Solicitado:** Corrigir erro HTTP 400 / 22P02 ao salvar registro da descarga (campo numérico recebia string vazia).
**Implementado:** Em `supaUpsert` (App.jsx), adicionada sanitização que converte todos os campos `""` para `null` antes do POST ao Supabase.

## 2026-04-10
**Solicitado:** 4 melhorias na tela de Motoristas.
**Implementado:**
1. **Tel múltiplos:** Campos `tel` com vários números separados por `,;/\|` ou newline agora exibem cada número numa span própria no card.
2. **Sugerir Compatíveis:** Botão 🔗 na toolbar cruza placas dos motoristas × registros DADOS e abre modal com sugestões de vínculo (aceitar/ignorar/aplicar).
3. **Duplicata no cadastro:** Ao salvar NOVO motorista, verifica nome/CPF/placa1 duplicados e exibe aviso com opção de editar existente ou salvar mesmo assim.
4. **Seleção em lote:** Checkbox à esquerda de cada card; barra de ação aparece ao selecionar; exclusão em lote exige digitar `EXCLUIR` para confirmar. Delete individual mantido.

## 2026-04-13
**Solicitado:** 4 ajustes de UI — select-all motoristas, ícones SVG, layout full-width dashboard/diárias/descargas.
**Implementado:**
- Motoristas: botão "Selecionar Todos (N)" aparece na barra de lote ao selecionar 2+ itens (seleciona todos, incluindo fora da tela).
- Motoristas: ícones 📄✏️🗑️ substituídos por SVG via hIco() (documento ouro, lápis azul, lixeira vermelha), alinhados ao design system.
- Content wrapper: adicionados "dashboard", "diarias" e "descarga" ao grupo maxWidth:100%, eliminando espaços laterais no desktop.
- Descarga: removido maxWidth:560 fixo do seletor de abas (Hoje/Atraso/Aguardando) — agora preenche a largura disponível.

## 2026-04-13 (Dashboard Redesign)
**Solicitado:** Dashboard não ocupa a tela — ideias para mais índices e layout full-screen.
**Implementado:**
- KPI Strip horizontal (7 cards): Carregamentos/CTE, Taxa Eficiência, DTs Únicas, Motoristas Ativos, CTE Médio/Viagem, Diárias a Pagar, Alertas Ativos — todos com borda colorida por status e clicáveis.
- Grid principal 3 colunas: Gráfico de Evolução (maior, com toggle Carregamentos/CTE) | Status DTs (donut + barras de progresso com %) | Top 5 Motoristas (ranking com barra de % e avatares coloridos).
- Grid inferior 2 colunas: Registros Recentes (agora com coluna Destino) | Painel Operacional com Diárias (No Prazo/Perdeu/Aguardando + saldo) e Descargas (Hoje/Atraso/Aguardando + lista dos atrasados).
- Arquivo recuperado de truncamento via backup + tail para preservar integridade.

## 2026-04-14 — Mobile Layout & Sidebar

**Solicitado:** ajustar layout mobile do dashboard, relatórios, sidebar colapsável, motoristas visíveis no mobile e ícone superior esquerdo igual ao desktop.

**Implementado:**
- **Sidebar mobile:** sempre visível como mini-barra (icons, 64 px). Ao clicar no toggle expande para 220 px com overlay+scrim. Clique em item navega e colapsa de volta.
- **Bottom nav removida:** substituída pela sidebar mini.
- **Dashboard KPIs mobile (Modo B):** grade 2 colunas com cards compactos (padding, fonte e ícone reduzidos).
- **Motoristas mobile:** aba agora sempre acessível via sidebar mini (ícone visível sem precisar scrollar).
- **Relatórios mobile:** seletor de campos colapsável (hidden por default), botões Imprimir/CSV no header, tabela com `maxHeight:60vh`.
- **Ícone superior esquerdo:** sidebar logo unificado em 36×36 px em desktop e mobile; topbar mobile agora exibe nome da aba ativa (sem duplicar logo).

## 2026-04-15 — Logo YFGroup (fix definitivo)
**Solicitado:** Substituir logo Rodorrica pela nova logo YFGroup; corrigir logo antiga persistindo no desktop (localStorage); corrigir logo irregular no mobile ao colapsar sidebar. Gerar 3 opções de cor.

**Implementado:**
- **FIX 1 (desktop):** `App.jsx` linha 38 — migração one-shot via `co_logo_migrated_v1`: na primeira carga limpa `co_custom_logo` do localStorage, eliminando definitivamente a logo antiga Rodorrica cacheada.
- **FIX 2 (mobile):** CSS `.co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__logo` → adicionado `gap:0\!important` (elimina espaço irregular). Botão toggle hidden (`display:none\!important`) na sidebar colapsada mobile.
- **FIX 3 (desktop collapsed):** CSS `.co-sidebar--collapsed .co-sidebar__logo` → adicionado `gap:0` para centralização limpa.
- **Preview:** `logo_preview_opcoes.html` gerado com 3 variantes de cor para escolha (Ouro Total / Azul+Ouro / Verde+Ouro). `defaultLogo.js` será atualizado após confirmação da cor.
- **Backup:** `src/backups/App_backup_20260415_logo_fix.jsx`

## 2026-04-15 — Logo YFGroup Azul+Ouro (definitivo)
**Solicitado:** Usar nova_logo.png com variante Azul+Ouro; fundo preto ocupar todo o ícone; maximizar tamanho da logo no ícone.
**Implementado:**
- `defaultLogo.js`: nova logo YFGroup (azul #60a5fa wireframe + ouro #F3BA2F texto/badge), crop apertado, exportada 256×256px quadrada com fundo preto.
- `App.jsx` sidebar icon: `padding:4→0`, `background: gradiente→#000`, `overflow:hidden`, `objectFit:contain→cover` — logo preenche 100% do ícone sem borda visível.

## 2026-04-15 — 3 melhorias (login logo + buscar topo + filtro CARREGADO)
**Solicitado:**
1. Aplicar nova logo YFGroup na tela de login
2. Mover Buscar para topo no desktop (e mobile onde couber)
3. Diárias e Descargas: não contabilizar quando status ≠ CARREGADO

**Implementado:**
- **Login**: ícone 🚛 + caixa azul → `<img src={DEFAULT_LOGO}>` 96×96px, fundo preto, borda dourada
- **Buscar topo**: item `{k:"busca"}` movido para 1ª posição em `const tabs` — aparece no topo da sidebar desktop e mobile
- **Filtro CARREGADO Descarga**: `STATUS_EXCLUIR` (blacklist) substituído por `SOMENTE_CARREGADO` (whitelist). `hoje`, `atrasados` e `aguardando` agora filtram somente status=CARREGADO
- **Diárias**: já filtrava somente CARREGADO (linha 1045) — sem alteração necessária
- **Backup**: `src/backups/App_backup_20260415_3fixes.jsx`

## 2026-04-15 — Conferência de Extrato de Diárias
**Solicitado:** Upload do extrato .xlsx mensal e conferência automática contra dados do app.
**Implementado:**
- Instalado `xlsx` (SheetJS) como dependência
- Nova sub-aba **"Conferência"** em Diárias
- Upload via drag-and-drop ou clique (.xlsx/.xls)
- Cruzamento automático por Numero DT com status: BATE / DIVERGE / SEM CUSTO OK / SEM CUSTO DIV / NAO ENCONTRADA / FORA EXTRATO
- KPIs clicáveis + filtro por status + tabela completa
- Alerta visual de "Valor em risco" quando há divergências
- Clique na linha abre o registro no Buscar
- Backup: `src/backups/App_backup_20260415_extrato.jsx`

## 2026-04-16 — Conferência Planilha RODORRICA (Descarga + Stretch)
**Solicitado:** Validar automaticamente a planilha de controle de descargas (RODORRICA) contra os dados do app, similar ao que existe em Diárias.
**Implementado:**
- 3 novos estados: `rodorricaRows`, `rodorricaFileName`, `rodorricaFiltro`
- `useMemo rodorricaResultado`: agrupa planilha por DT (coluna ID), compara com `apontItems` (tipo descarga/stretch) — retorna BATE, DIVERGE, SEM_APONT, FORA_PLANILHA + valor em risco e totais
- `parseRodorricaXLSX(file)`: parser da aba BASE — lê ID, TIPO DO CUSTO, VALOR APROVADO, VALOR FINAL, NF, CENTRO
- Nova sub-aba "Conferência" no tab Descarga: upload drag-drop, KPIs clicáveis (4 status), tabela com colunas Desc/Stretch plan vs app por DT, colorização por divergência

## 2026-04-16 — Descarga: tabs compactos em linha única
**Solicitado:** 4 blocos de tab (Hoje/Atraso/Aguardando/Conferência) em uma só linha, menores, responsivos.
**Implementado:** grid repeat(4,1fr), padding reduzido, ícone oculto no mobile, label abreviada no mobile (primeira palavra), fonte menor — corrigido também o grid do resumo de Diárias que havia sido alterado por engano.

## 2026-04-16 — Diárias KPIs: fonte máxima desktop + compacto mobile
**Solicitado:** Aumentar fonte dos números (No Prazo/Perdeu Agenda/Sem Descarga) ao máximo no desktop; mobile em linha única com ícones e fontes ajustados.
**Implementado:** Desktop fontSize 26→56 (Bebas Neue), label 8→10px, ícone 10→11px; Mobile fontSize 32, padding reduzido, ícones e hint ocultos — blocos ficam em linha única.

## 2026-04-17 — Fix: DT com data_agenda inválida aparecia como "SEM DESCARGA"
**Solicitado:** DT 23003322 aparecia como "sem descarga" mesmo com data_desc preenchida.
**Causa:** data_agenda = "OC" → parseData retornava null → nenhum `if/else if` em `diariasData` capturava o caso, tipo ficava "pendente".
**Implementado:** Adicionado `else if (\!da && dd)` em `diariasData` (App.jsx ~linha 1093) → registros sem data_agenda válida mas com data_desc preenchida classificados como "ok".
**Backup:** src/backups/App_backup_20260417_fix_diarias_sem_agenda.jsx

## Passo 5 — Carga/Descarga (2026-04-20)
**Solicitado:** redesign tipográfico da view Descarga seguindo spec YFGroup
**Implementado:**
- KPI tabs big number: Bebas Neue → Space Grotesk 700 34px tracking -0.04em
- KPI tabs label: → DM Mono 11px uppercase tracking 0.06em
- Toggle view (lista/kanban): azul t.azul → var(--accent) / var(--accent2)
- Toggle cols (1/2/3): azul t.azul → var(--accent) / var(--accent2)
- Empty state h3 (2x): Bebas Neue 17px → Space Grotesk 600 15px tracking -0.02em

## 2026-04-20 — Passo 9: Extração de Views (Planilha / Operacional / Ocorrências)
**Solicitado:** Atualizar App.jsx com imports, nova tab Ocorrências e renderização via componentes externos.
**Implementado:**
- `App.jsx`: imports de `OcorrenciasView`, `OperacionalView`, `PlanilhaView`
- Sidebar `posCarga` set expandido: inclui `"ocorrencias"` (aparece na seção Pós-Carga)
- Tab `ocorrencias` adicionada antes de `operacional` com ícone triângulo-alerta
- Bloco `activeTab==="planilha"` (173 linhas) → `<PlanilhaView ctx={{...}} />`
- Bloco `activeTab==="operacional"` (522 linhas) → `<OperacionalView ctx={{...}} />`
- `activeTab==="ocorrencias"` adicionado → `<OcorrenciasView dados filtroOcorr abrirDetalhe />`
- Build: ✓ 0 erros, 0 warnings

## 2026-04-20 — 6 melhorias UI/UX

**Solicitado:** Diárias blocos iguais Descarga / Ocorrências só obs / Admin footer / Sidebar limpa / Tema ícone / Relatórios view.

**Implementado:**
- **Diárias KPI**: blocos No Prazo/Perdeu Agenda/Sem Descarga convertidos para estilo flat idêntico ao Descarga (ícone 22px → label DM Mono → número Space Grotesk 34px, sem círculo)
- **Ocorrências**: filtro `dados.filter(r => obs_chegada || obs_descarga)` — só exibe DTs com obs preenchida; texto truncado a 100 chars
- **Sidebar footer**: removidos Sincronizar, Alertas e Relatórios; Admin movido para footer (ícone + label "Admin", acende em `var(--accent)` quando ativo, visível só para admin)
- **Tema**: botão icon-only (sem label de texto), permanece no footer
- **Relatórios**: substituído `<ReportBuilder>` por `<RelatoriosView>` (dashboard com KPIs + botão Exportar abre modais de filtro)
- Build: ✓ 0 erros

## [2026-04-20] — Layout & UX

**Solicitado:** 6 melhorias visuais e de layout

**Implementado:**
1. **PlanilhaView** — todas as colunas com `textAlign: center` (DT, Placa, datas, status, origem, destino)
2. **RelatoriosView** — tab "Visão Geral" com cards estilo Dashboard (borda-left colorida, número grande); modal Exportar agora lista todas as **colunas** do `fieldCatalog` por grupo com export CSV direto
3. **OcorrenciasView** — filtro de data inicial/final adicionado; seletor de colunas 1/2/3/4; `maxWidth:900` removido (preenche tela completa); grid usa coluna selecionada
4. **App.jsx — Diárias > Planilha** — tabela e filtros com `margin: 0 -16px` para preencher lado a lado
5. **App.jsx — Diárias > Conferência** — tabela de extrato com `margin: 0 -16px` para preencher lado a lado

**Arquivos alterados:** PlanilhaView.jsx · OcorrenciasView.jsx · RelatoriosView.jsx · App.jsx

## 2026-04-21 — Responsividade, Consistência Visual e UX

**Solicitado:** Ajustes de consistência visual, responsividade, usabilidade — mobile/tablet seguindo padrão desktop. Correções em Ocorrências, Carga/Descarga, Modo Claro, WhatsApp, Sidebar, Alertas e Relatórios.

**Implementado:**
- **Alertas:** Ícone de sino removido; substituído por badge pill "N alertas" (triângulo de alerta + contagem) no topbar desktop e mobile
- **WhatsApp:** Movido do rodapé da sidebar para acima da seção "Pós-Carga" como item de navegação (com dropdown de tipos ao clicar)
- **Sidebar — Usuário:** Bloco de usuário agora clicável (admin → abre aba Admin; outros → abre modal de usuário); ícone "Sair" inline ao lado do nome
- **Sidebar — Sair:** Botão separado removido; consolidado inline no bloco do usuário
- **Modo claro:** Adicionados tokens semânticos faltantes (--bg, --surface, --card, --accent, --accent2, --cyan, --green, --red, --yellow, --orange) ao theme-light.css; sidebar com hover/active visíveis no tema claro; bordas de cards restauradas
- **Responsividade:** CSS extras para full-viewport (min-height:100dvh mobile, co-main preenchendo viewport); Carga/Descarga e Relatórios usam minHeight:calc(100vh-56px)
- **Ocorrências:** Card exibe telefone do motorista (lookup por CPF/nome/placa) abaixo do DT/placa
- **Relatórios:** Tela inicia no modo "Tudo" (todos os blocos visíveis); filtros do modal de PDF convertidos para selects dinâmicos derivados dos dados reais do Supabase (motoristas, origens, destinos, status operacional, vínculo)

## Session 4 — 2026-04-21

**Solicitado:**
1. Regra geral de preenchimento de viewport (`className="co-content"`)
2. Botão "Nova Ocorrência" em Ocorrências com modal de busca + formulário

**Implementado:**
- `App.jsx`: adicionado `className="co-content"` no wrapper de conteúdo principal — aplica `flex:1; overflow-y:auto; min-height:0` em todas as telas sem necessidade de ajuste individual
- `App.jsx`: novo callback `salvarOcorrenciaExterna(dt, texto, tipo)` — segue o mesmo padrão de `adicionarOcorrencia` (localStorage + Supabase) 
- `App.jsx`: prop `onSalvarOcorrencia={salvarOcorrenciaExterna}` passada para `OcorrenciasView`
- `OcorrenciasView.jsx`: botão "Nova Ocorrência" (roxo, top-right dos stats) abre modal `NovaOcorrModal`
- `NovaOcorrModal`: passo 1 = busca por DT ou nome (filtra `dados`, lista até 8 resultados); passo 2 = seleção + tipo (Info/Alerta/Status) + textarea com Ctrl+Enter para salvar

## Session 5 — 2026-04-21

**Solicitado:** Layout global sistêmico, dropdown dark theme, Nova Ocorrência inline nos cards

**Implementado:**
- `App.jsx`: removido `maxWidth:1100` do wrapper de conteúdo — todas as telas usam `maxWidth:"100%"`, eliminando vazio lateral em monitores largos
- `App.jsx`: CSS global para `select` — `color-scheme: dark/light` por tema; `option` herda background e color da paleta do app (fim do fundo branco no dropdown escuro)
- `OcorrenciasView.jsx`: botão `+` inline em cada OcorrCard, ao lado de Obs Chegada e Obs Descarga, abre `NovaOcorrModal` com o DT pré-selecionado (sem etapa de busca)
- `NovaOcorrModal`: aceita `initialEntry` prop — quando chamado do card pula direto ao formulário; quando chamado do botão do header mantém a busca manual

## Session 6 — 2026-04-21 (Layout Global Sistêmico)

**Solicitado:** Padronização global de layout — desktop/tablet/mobile sem espaços vazios, sidebar colapsável, mobile sem ícones extras no topo.

**Implementado:**
- **CSS global**: `co-content` com `flex:1; overflow-y:auto; min-height:0`; conteúdo sempre `maxWidth:100%`; `co-content>*` herda `box-sizing:border-box`
- **Tablet (768-1199px)**: sidebar CSS icon-only por padrão (width:64px); `co-main{margin-left:64px\!important}`; classe `co-sidebar--expanded` para expansão manual; `sidebarCollapsed` inicializa `true` em tablets automaticamente
- **Mobile topbar**: removidos user badge, sync, theme toggle, reports, WhatsApp, logout do topo direito; mantidos apenas alerta + Nova DT; navegação concentrada no sidebar esquerdo
- **select/dropdown**: `color-scheme:dark/light` global — fim do fundo branco em dropdowns
- **Removed**: `co-mobile-nav` render (era CSS-hidden); `minHeight:calc(100vh-140px)` hacks inline substituídos pelo flex global; padding `68px` bottom obsoleto removido
- **Adicionado**: `.co-auto-grid` utilitário para grids responsivos automáticos

## Session 7 — 2026-04-21
**Solicitado:** (1) Corrigir WPP mobile que abria duas telas. (2) Melhorar modal Nova Ocorrência com mais contexto. (3) Apresentar resultado interativo desktop/mobile.
**Implementado:**
- WPP: substituído dropdown dentro da sidebar por modal root-level (`position:fixed, zIndex:1100`) — elimina conflito de z-index/scrim no mobile
- OcorrenciasView: modal reformulado com painel de contexto da DT (status badge, rota, datas, obs_chegada/obs_descarga), histórico de ocorrências anteriores, seletor de tipo visual (Info/Alerta/Status), textarea com borda colorida por tipo, navegação em 2 passos (busca → registrar)
- Build verificado: ✓ 2.94s
- Artifact interativo criado: preview com toggle desktop/mobile e tema claro/escuro

## Session 8 — 2026-04-21
**Solicitado:** Relatórios ainda com void lateral. Todas as telas: ajustar mobile/tablet, reduzir blocos/fontes para caber na tela.
**Implementado:**
- RelatoriosView: removido `maxWidth:1100` → `width:100%`; padding, fontes, gaps e números KPI responsivos via `isMobile`; tabela motoristas com `overflow-x:auto`; tabs com scroll horizontal; KpiCard usa `clamp()` para fontes
- App.jsx CSS: adicionadas regras globais `@media(max-width:767px)` e `@media(768-1199px)` — sem void lateral em todas as views, `co-content padding:0` mobile, tabelas com scroll, `co-auto-grid` 2 colunas mobile/tablet
- Build verificado: ✓ 2.87s

## Session 9 — 2026-04-21
**Solicitado:** WPP modal — busca de DT/motorista/placa direto no modal, sem depender de marcação prévia na planilha.
**Implementado:**
- Adicionados estados `wppSearchTxt` e `wppSearchReg`
- Modal substituiu bloco "Busque na Planilha primeiro" por campo de busca inline: digita 2+ chars → lista até 5 resultados (DT + nome + placa); clica → seleciona e exibe contexto verde com botão de limpar
- Se já havia seleção prévia (`buscaResult`), exibe direto — pode limpar para buscar outra
- Botões de opção usam `wppSearchReg || buscaResult` como registro efetivo
- Ao fechar/usar modal: reset automático da busca
- Build: ✓ 3.58s

## Session 10 — 2026-04-21
**Solicitado:** Exportar PDF abria dois modais (ExportModal + relGeralOpen/relOperOpen). Unificar em um modal. Relatório deve permitir selecionar quais colunas do Supabase incluir.
**Implementado:**
- RelatoriosView: removido ExportModal; botão "Exportar PDF" abre diretamente o modal relGeralOpen via prop onExportClick
- relGeralOpen: adicionada seção "Apontamentos (Descarga/Stretch)" na lista de seções
- relGeralOpen: adicionado seletor colapsável "Colunas da Tabela de Registros" — 25 colunas do Supabase com toggle individual + botões Todas/Nenhuma
- gerarRelatorioGeral: tabela de registros agora dinâmica usando colunas selecionadas
- Quando seção "Apontamentos" ativada: também dispara gerarRelatorioOperacional
- Build: ✓ 3.07s

## Session 11 — 2026-04-22
**Solicitado:** WPP trava em tela preta ao clicar. Relatórios não rola.
**Implementado:**
- WPP: substituído padrão IIFE aninhado por JSX condicional simples — eliminado risco de erro em render; removido autoFocus do input de busca
- Relatórios: removido overflow:"hidden" que bloqueava o scroll do co-content; agora a view rola normalmente
- Build: ✓ 17s

## 2026-04-24 — Design fixes (3 críticos)

**Solicitado:** Executar os 3 ajustes de maior impacto identificados na critique de design do App.jsx.

**Implementado:**
- **Fix 1 — Banner de truncamento:** adicionado aviso amarelo "Mostrando 80 de N — refine os filtros para ver todos" nos 3 locais com `.slice(0,80)` (diárias modo linhas, diárias modo blocos, descarga).
- **Fix 2 — Touch targets mínimos:** chips de filtro de diárias passaram de `padding:5px 10px` + `fontSize:9` para `padding:10px 14px` + `fontSize:11` + `minHeight:44px`; botões de colunas (diárias e descarga) passaram de `28×28px` para `36×36px` com `minWidth/minHeight:36`.
- **Fix 3 — KPI labels acessíveis:** labels dos cards KPI do dashboard ("No Prazo", "Perdeu Agenda", "Aguardando", "Hoje", "Em Atraso") passaram de `fontSize:7` para `fontSize:11` (2 ocorrências).

## 2026-04-24 — Touch targets completos

**Solicitado:** Corrigir todos os touch targets abaixo de 44px restantes no App.jsx.

**Implementado:**
- **16 botões ✕ de fechar modais:** `width:28,height:28` → `width:44,height:44` e `fontSize:14` → `fontSize:16` (todos os modais: editar, motorista, usuário, configdb, importação, WhatsApp, FAT, PAG, drill dashboard, planilha detalhe).
- **3 botões de ação de motoristas** (PDF, editar, excluir): `width:28,height:28` → `width:36,height:36,minWidth:36,minHeight:36` (tamanho 36 mantém o layout de linha sem quebrar).
- Resultado: 0 botões interativos com cursor:pointer abaixo de 36px.

## 2026-04-24 — Batch críticos + moderados + sidebar mobile

**Solicitado:** Executar todos os pendentes críticos e moderados. Aceitar proposta de sidebar 48px no mobile.

**Implementado:**

**Críticos:**
- C1: 4 cards clicáveis (diárias linhas/blocos, descarga linhas/blocos) receberam `tabIndex="0"`, `role="button"` e `onKeyDown` (Enter/Espaço) — acessíveis por teclado e leitor de tela.
- C2: 9 ocorrências restantes de `fontSize:7` → `fontSize:11` (badge ATRASADO, badge NOVO, label HOJE, labels modais WhatsApp ×5, "(opcional)"). Zero `fontSize:7` no arquivo.

**Moderados:**
- M1: Tokens `laranja` e `roxo` adicionados ao `constants.js` (dark: #f57c00/#a855f7; light: #c45500/#6d28d9). Substituídos 6 × `t.laranja` e 3 × `t.roxo` no App.jsx — saíram do inline hardcode.
- M2: Badge de status nos cards de blocos: `fontSize:8` → `fontSize:11` (texto agora legível).
- M3: Separador visual "ou período:" com `border-left` inserido antes dos date inputs nas barras de filtro de Diárias e Descarga. Os date inputs agora também limpam Ano/Mês ao serem usados.
- M4: KPIs de Diárias não forçam mais `setDSubTab("resumo")` ao clicar — filtro e navegação de sub-aba agora são independentes.
- M5: Emojis de campo nos cards de modo linhas (🔢 🚛 📅 🛬 🏁) receberam `role="img"` e `aria-label` semântico.

**Sidebar mobile:**
- A: Mini-sidebar reduzida de 64px → 48px abaixo de 600px, e `margin-left` do main ajustado de 64 → 48px — 16px a mais de área de conteúdo sem mudar o paradigma de navegação.

## 2026-04-26 — NFD: Upload de fotos no Supabase Storage
**Solicitado:** melhor forma de anexar fotos ao registrar uma NFD (avaria, falta, devolução ou sobra sem documento).
**Implementado:**
- `supabase.js`: nova função `supaStorageUpload` — upload direto via REST API do Supabase Storage (sem client oficial), retorna URL pública. Bucket alvo: `nfd-fotos`, path: `{DT}/{timestamp}_{filename}`.
- `App.jsx`: novos states `nfdFotos` (array de arquivos+preview) e `nfdUploadando` (flag de loading).
- Modal NFD reescrito: 4 tipos em grid 2×2 (avaria🔴, falta🟡, devolução🔵, **sobra🟢**); para "sobra" o Nº NFD é opcional e fotos são recomendadas; seletor de fotos com preview inline (máx. 5); botão "Registrar NFD" faz upload sequencial → salva URLs em `nfd.fotos`; estado visual "Enviando fotos…" durante upload.
- Pré-requisito: criar bucket `nfd-fotos` no Supabase (Storage > New bucket, public).

## 2026-04-26 — Conferência Rodorrica: análise descarga/stretch + modal de período

**Solicitado:** upload da planilha Rodorrica não retornava análise (0 registros); análise de compatibilidade descarga/stretch; modal de período pós-upload.

**Implementado:**
- `parseRodorricaXLSX`: lê aba `Aprovados` (antes tentava `BASE` → caía em `Detalhado` com formato pivot = 0 rows válidas); chave alterada de `ID` → `NF CARREGAMENTO`; captura `dtCarregamento`, `cliente`, `mesAno`, `rsFardo`, `rsStrech`; abre modal de período automaticamente após upload
- `rodorricaResultado`: agrupa por NF (antes por DT numérico que não batia com `apontItems`); cruza com `apontItems.nf_numero`; classifica cada tipo separadamente: BATE / MAIOR (planilha > app) / MENOR (planilha < app) / SEM_APONT / FORA_PLANILHA; detecta NFs sem Stretch e NFs sem Descarga
- UI: 5 KPI cards (Bate, Planilha Maior, Planilha Menor, Sem Apont., Fora Plan.); alertas de NFs incompletos; tabela com colunas Desc.Plan/Desc.App/Dif + Str.Plan/Str.App/Dif + status por tipo; modal de período re-abrível pelo botão 📅

## 2026-04-26 — Rodorrica: Comparação por DT vs DADOS (pag_descarga / pag_stretch)
**Solicitado:** Comparação Rodorrica por DT (col. "DT CARREGAMENTO"), contra colunas AP/AQ do Google Sheets (PAG. DESCARGA / PAG. STRETCH)
**Implementado:**
- `parseRodorricaXLSX`: corrigido — `DT CARREGAMENTO` agora mapeado como campo `dt` (número DT real, ex: 22593705); `DATA DE FATURAMENTO` usado como data de período
- `rodorricaResultado`: reescrito — agrupa por DT, faz lookup no DADOS, compara `pag_descarga`/`pag_stretch`; detecta `SEM_DADOS` (DT não encontrada no app) e `SEM_SYNC` (campos ainda não sincronizados)
- `mapearColuna` (Apps Script): adicionado `pag. descarga → pag_descarga` e `pag. stretch → pag_stretch` para próxima sync
- UI: tabela mostra DT como chave primária, NF como campo secundário, aviso de sync pendente quando campos não existem ainda

## 2026-04-27 — TELA PRETA DIÁRIAS / DESCARGA FIX
**Solicitado:** Diárias e Carga/Descarga exibindo tela preta.
**Causa:** React error #31 ("Objects are not valid as a React child") — duas IIFEs órfãs no modo "blocos" de cada aba retornavam arrays de objetos JS diretamente como filhos JSX.
**Implementado:** Removidas as IIFEs redundantes em `src/App.jsx` (linha 4115–4128 no bloco blocos-Diárias e linha 4612 no bloco blocos-Descarga). Build verificado ✓

## 2026-04-29 — Dashboard tela preta FIX
**Solicitado:** Dashboard exibindo tela preta.
**Causa:** `cores` definida dentro da IIFE do "Main Grid" mas usada fora do seu escopo no bloco "Registros Recentes" — ReferenceError em runtime crashava o render.
**Implementado:** Substituído `cores[i%cores.length]` por `CORES_DASH` definida localmente no próprio `.map()`. Build ✓

## 2026-04-29 — Dashboard Opção C: layout bottom + preenchimento sem corte
**Solicitado:** Opção C — Registros Recentes preenche altura sem cortar linha nem deixar espaço vazio; rota no meio; barra de progresso diárias; 3 atrasados; novo bloco Top Diárias Pendentes.
**Implementado:**
- `dashRecentesN` state + `dashRecCardRef` + ResizeObserver: calcula quantas linhas de 40px cabem exatamente e limita com `slice(0,dashRecentesN)` — sem corte, sem espaço vazio
- Cada linha fixada em `height:40px` — previsível para o cálculo
- Rota `origem → destino` adicionada no centro de cada linha
- Diárias: barra de progresso pago/total com cor dinâmica (verde≥80% / ouro≥40% / vermelho<40%)
- Descargas: lista de atrasados expandida de 2 → 3
- Novo bloco "Top Diárias Pendentes": agrupa saldo pendente por motorista, top 4 com barra horizontal
- Build ✓ 51 módulos
