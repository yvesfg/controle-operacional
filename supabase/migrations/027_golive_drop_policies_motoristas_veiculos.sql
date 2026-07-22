-- =============================================
-- Migration 027: GO-LIVE V2 — fecha acesso anon a motoristas + veiculos
-- =============================================
-- Aplicada em prod 2026-07-22 após o front dual-path (025/026) no ar e testado
-- (cadastro de motoristas e veículos: criar e editar OK). Provado antes de aplicar:
-- listar_motoristas/listar_veiculos com token de admin retornam os dados reais
-- (849 / 728). Pós-aplicação: anon lê 0 linhas (RLS deny-all).
--
-- A partir daqui, motoristas (CPF + dados bancários) e veiculos só são acessíveis
-- pelas RPCs SECURITY DEFINER token-validadas (migrations 025/026).

DROP POLICY IF EXISTS anon_read_motoristas  ON motoristas;
DROP POLICY IF EXISTS anon_write_motoristas ON motoristas;
DROP POLICY IF EXISTS anon_upd_motoristas   ON motoristas;
DROP POLICY IF EXISTS anon_del_motoristas   ON motoristas;

DROP POLICY IF EXISTS anon_read_veiculos  ON veiculos;
DROP POLICY IF EXISTS anon_write_veiculos ON veiculos;
DROP POLICY IF EXISTS anon_upd_veiculos   ON veiculos;
DROP POLICY IF EXISTS anon_del_veiculos   ON veiculos;

-- ROLLBACK de emergência (destravar acesso anon num incidente):
-- CREATE POLICY anon_read_motoristas  ON motoristas FOR SELECT TO public USING (true);
-- CREATE POLICY anon_write_motoristas ON motoristas FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY anon_upd_motoristas   ON motoristas FOR UPDATE TO public USING (true) WITH CHECK (true);
-- CREATE POLICY anon_del_motoristas   ON motoristas FOR DELETE TO public USING (true);
-- CREATE POLICY anon_read_veiculos  ON veiculos FOR SELECT TO public USING (true);
-- CREATE POLICY anon_write_veiculos ON veiculos FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY anon_upd_veiculos   ON veiculos FOR UPDATE TO public USING (true) WITH CHECK (true);
-- CREATE POLICY anon_del_veiculos   ON veiculos FOR DELETE TO public USING (true);
