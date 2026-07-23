-- =============================================
-- Migration 032: GO-LIVE Fase C — drop das policies anon de frete_conferencia
-- =============================================
-- Fecha o acesso anon direto a frete_conferencia (financeiro). Depois disto, sem token
-- válido a tabela não devolve/aceita nada — o front injeta o token via setFreteToken()
-- (App.jsx no efeito [sessionToken]) e usa as RPCs da migration 031.
--
-- PRÉ-CONDIÇÕES (obrigatórias antes de rodar):
--   1. Front dual-path (freteConferencia.js + setFreteToken no App.jsx) DEPLOYADO na Vercel.
--   2. Confirmado NO NAVEGADOR, logado, que a Conferência de Frete funciona:
--      lista/dashboard carregam, decidir/estornar revisão, importar planilha, sinalizados.
--
-- Sem escritor externo (só o app usa a tabela) — não depende do SyncSupabase.gs.

DROP POLICY IF EXISTS anon_read_frete_conf  ON frete_conferencia;
DROP POLICY IF EXISTS anon_write_frete_conf ON frete_conferencia;
DROP POLICY IF EXISTS anon_upd_frete_conf   ON frete_conferencia;
DROP POLICY IF EXISTS anon_del_frete_conf   ON frete_conferencia;

-- Provar depois: anon SELECT/INSERT/UPDATE/DELETE = bloqueado; RPC com token = ok.
--
-- ROLLBACK de emergência:
-- CREATE POLICY anon_read_frete_conf  ON frete_conferencia FOR SELECT TO public USING (true);
-- CREATE POLICY anon_write_frete_conf ON frete_conferencia FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY anon_upd_frete_conf   ON frete_conferencia FOR UPDATE TO public USING (true) WITH CHECK (true);
-- CREATE POLICY anon_del_frete_conf   ON frete_conferencia FOR DELETE TO public USING (true);
