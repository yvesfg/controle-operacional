
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
