-- =============================================
-- Migration 013: tira as tabelas de backup AVB do schema public
-- =============================================
-- _backup_avb_orfaos_20260611 (4 linhas) e _backup_avb_dups_20260611 (75)
-- são sobra de uma limpeza de 11/06/2026. Apareciam no Advisor (no_primary_key)
-- e ficavam expostas na API REST à toa.
--
-- NÃO são dropadas: conferido linha a linha, 78 dos 79 registros NÃO existem
-- mais em controle_operacional_avb (todos os 75 "dups" e 3 dos 4 "órfãos").
-- São viagens reais (CTe/MDF/cliente/motorista/valores, abr-mai/2026) e este é
-- o ÚNICO lugar onde sobraram — DROP seria perda definitiva, não limpeza de
-- redundância. Movidas pro schema `arquivo`, que não é exposto na API (não está
-- em PGRST_DB_SCHEMAS): saem do public e do Advisor, dado preservado.
--
-- Pra dropar de vez depois (decisão do Yves, ciente da perda):
--   DROP SCHEMA arquivo CASCADE;

CREATE SCHEMA IF NOT EXISTS arquivo;

ALTER TABLE public._backup_avb_orfaos_20260611 SET SCHEMA arquivo;
ALTER TABLE public._backup_avb_dups_20260611   SET SCHEMA arquivo;

-- Ninguém acessa via API; só o dono (postgres/service_role) enxerga.
REVOKE ALL ON ALL TABLES IN SCHEMA arquivo FROM anon, authenticated;
