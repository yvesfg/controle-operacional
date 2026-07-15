-- =============================================
-- Migration 015: recalcular margem_lucro (bruta) + flags de frete_conferencia
-- =============================================
-- A coluna "Margem Lucro" da planilha bruta divide o Saldo pelo Total do Frete (Frete Peso
-- + pedágio/gris/etc.) e subestima a margem — jogava CTRCs ok pra fila de revisão (ex.:
-- Frete Peso 15.123,30, Contrato 13.576,18, Saldo 1.547,12 dava 9,0% sobre o Total do Frete,
-- quando a margem sobre o Frete Peso é 10,2%). Agora a margem é calculada no app como
-- Saldo / Frete Peso (ver src/freteConferencia.js:margemBruta).
--
-- Usa-se o Saldo (sobra que o sistema já calcula) em vez de (frete_peso − contrato) porque
-- o Contrato da planilha é inconsistente em ~665 linhas de Frete (0, inflado, ou = frete_peso
-- no Local — o que zeraria margens reais). No Frete o Saldo é justamente frete_peso − contrato.
--
-- Este backfill recompõe margem_lucro E as flags de revisão nas linhas JÁ importadas, pra a
-- fila refletir a nova regra sem reimportar. Não toca em decisao_manual (a decisão humana é
-- preservada; a query da fila já ignora quem tem decisão).

UPDATE frete_conferencia SET
  margem_lucro = CASE
    WHEN frete_peso > 0 THEN round((saldo / frete_peso * 100)::numeric, 2)
    ELSE 0
  END;

UPDATE frete_conferencia SET
  flag_negativa = (categoria NOT IN ('diaria', 'descarga')) AND margem_lucro < 0,
  flag_baixa    = (categoria NOT IN ('diaria', 'descarga')) AND margem_lucro >= 0 AND margem_lucro < 10,
  flag_ambigua  = (categoria IN ('descarga', 'local'))
                  AND ((margem_lucro > 0 AND margem_lucro < 1)
                       OR (COALESCE(valor_contrato_frete, 0) = 0 AND total_frete > 0));
