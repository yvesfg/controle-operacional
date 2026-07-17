-- =============================================
-- Migration 016: controle_operacional.tipo_carga (produto da carga)
-- =============================================
-- Dimensão de PRODUTO da carga na base Imperatriz/Belém: 'papel' (maioria esmagadora)
-- x 'celulose' (poucas, mas com controle próprio). Separada da ORIGEM de propósito:
-- origem é ROTA (IMPERATRIZ-MA) e alimenta Top Rotas, filtros e dashboard; o produto é
-- outra dimensão. Antes o produto vinha grudado na origem ("IMPERATRIZ-MA, CELULOSE"),
-- o que reprovava a linha na validação de origem do SyncSupabase.gs e a descartava em
-- silêncio — nenhuma carga de celulose tinha chegado ao banco.
--
-- Default 'papel': as ~1024 linhas já existentes (870 IMPERATRIZ-MA + 154 BELEM-PA)
-- ficam corretas sem backfill. O SyncSupabase.gs passa a separar "…, CELULOSE" da origem
-- e gravar tipo_carga='celulose', devolvendo a origem limpa pra validação.

ALTER TABLE controle_operacional
  ADD COLUMN IF NOT EXISTS tipo_carga text NOT NULL DEFAULT 'papel';

CREATE INDEX IF NOT EXISTS idx_controle_op_tipo_carga ON controle_operacional (tipo_carga);
