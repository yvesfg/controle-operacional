-- =============================================
-- Migration 038: GO-LIVE Fase C — drop das policies anon de despesas_filial
-- =============================================
-- Fecha o acesso anon direto a despesas_filial (financeiro). O front usa as RPCs da
-- migration 037 via token (setDespesasToken no efeito [sessionToken] do App.jsx).
--
-- PRÉ-CONDIÇÕES (checklist pós-incidente):
--   1. Front dual-path (despesas.js + setDespesasToken) DEPLOYADO na Vercel.
--   2. Provado no Supabase API log que a sessão do usuário chama rpc/listar_despesas,
--      rpc/listar_meses_despesas, rpc/listar_indevidas_despesas, rpc/listar_creditos_despesas
--      (e NÃO GET despesas_filial). Confirmação visual com policy aberta NÃO prova o path.
--
-- Sem escritor externo (só o app usa a tabela).

DROP POLICY IF EXISTS anon_read_despesas  ON despesas_filial;
DROP POLICY IF EXISTS anon_write_despesas ON despesas_filial;
DROP POLICY IF EXISTS anon_upd_despesas   ON despesas_filial;
DROP POLICY IF EXISTS anon_del_despesas   ON despesas_filial;

-- ROLLBACK de emergência:
-- CREATE POLICY anon_read_despesas  ON despesas_filial FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_write_despesas ON despesas_filial FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY anon_upd_despesas   ON despesas_filial FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_del_despesas   ON despesas_filial FOR DELETE TO anon USING (true);
