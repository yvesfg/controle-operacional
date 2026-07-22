-- =============================================
-- Migration 028: Fase A — read-lockdown de controle_operacional (3 bases)
-- =============================================
-- Aplicada em prod 2026-07-22. Fecha a LEITURA anon do core (CPF + financeiro).
-- O app lê via RPC listar_operacional (token) — ponto único useSyncHandlers.js:26;
-- App.jsx re-sincroniza quando o sessionToken chega (efeito [authed, sessionToken]).
-- O SyncSupabase.gs só ESCREVE, então INSERT/UPDATE anon PERMANECEM (Fase B trata a
-- escrita via .gs). Provado: RPC lê os dados; anon SELECT = 0; write intacto (INSERT,UPDATE).

DROP POLICY IF EXISTS anon_read_controle  ON controle_operacional;
DROP POLICY IF EXISTS anon_read_avb        ON controle_operacional_avb;
DROP POLICY IF EXISTS anon_read_maracanau  ON controle_operacional_maracanau;

-- ROLLBACK de emergência:
-- CREATE POLICY anon_read_controle  ON controle_operacional             FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_read_avb        ON controle_operacional_avb         FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_read_maracanau  ON controle_operacional_maracanau   FOR SELECT TO anon USING (true);
