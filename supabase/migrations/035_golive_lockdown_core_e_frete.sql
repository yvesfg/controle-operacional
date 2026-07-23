-- =============================================
-- Migration 035: GO-LIVE (3ª tentativa) — fecha leitura anon do core + frete_conferencia
-- =============================================
-- Refaz 030 (core read) + 032 (frete). Agora com a causa raiz REAL corrigida (034 +
-- App.jsx bootstrap SSO gera sessionToken). Prova antes de aplicar:
--   - Supabase API log: navegador do Yves chamando POST /rpc/listar_operacional (200);
--   - Teste banco: listar_frete_periodos = 368 com o token do Yves;
--   - setFreteToken usa o MESMO sessionToken do sync do core (mesma variável/efeito).
-- Provado depois de aplicar: anon SELECT = 0 (core 3 bases + frete); RPC c/ token
--   = 1073 (core) / 368 (frete). Sem incidente.

DROP POLICY IF EXISTS anon_read_controle   ON controle_operacional;
DROP POLICY IF EXISTS anon_read_avb         ON controle_operacional_avb;
DROP POLICY IF EXISTS anon_read_maracanau   ON controle_operacional_maracanau;

DROP POLICY IF EXISTS anon_read_frete_conf  ON frete_conferencia;
DROP POLICY IF EXISTS anon_write_frete_conf ON frete_conferencia;
DROP POLICY IF EXISTS anon_upd_frete_conf   ON frete_conferencia;
DROP POLICY IF EXISTS anon_del_frete_conf   ON frete_conferencia;

-- INSERT/UPDATE anon do core PERMANECEM (o SyncSupabase.gs escreve direto até a Fase B).
-- ROLLBACK de emergência: ver migration 033.
