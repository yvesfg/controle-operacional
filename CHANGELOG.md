
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
