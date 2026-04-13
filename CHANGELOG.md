
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
