-- =============================================
-- Migration 030: Fase A (RE-TENTATIVA) — read-lockdown de controle_operacional (3 bases)
-- =============================================
-- Reaplica o que a 028 tentou e a 029 reverteu. Agora com a CAUSA RAIZ corrigida:
-- `sincronizar` (useSyncHandlers.js) passou a ter `sessionToken` e `baseAtual` nas
-- deps (commit do fix, 2026-07-23) — antes o closure congelava sessionToken=null e
-- caía no GET anon, que a trava zerava (dashboard vazio). Ver CHANGELOG 2026-07-23.
--
-- PRÉ-CONDIÇÕES (obrigatórias antes de rodar esta migration):
--   1. Fix deployado na Vercel (commit+push da main).
--   2. Confirmado NO NAVEGADOR, logado como admin, que o dashboard carrega cheio
--      (path RPC listar_operacional em uso quando há token).
-- Prova de banco (2026-07-23, policy ainda aberta):
--   listar_operacional(gerar_token_sessao('admin@sistema'),'imperatriz_belem',100000,0) = 1071 linhas.
--
-- O SyncSupabase.gs só ESCREVE (INSERT/UPDATE anon), então mantemos as policies de
-- escrita — a Fase B tratará a escrita via RPC. Aqui derrubamos SÓ o SELECT anon.

DROP POLICY IF EXISTS anon_read_controle  ON controle_operacional;
DROP POLICY IF EXISTS anon_read_avb        ON controle_operacional_avb;
DROP POLICY IF EXISTS anon_read_maracanau  ON controle_operacional_maracanau;

-- Provar depois: anon SELECT nas 3 tabelas = 0 linhas; RPC com token = linhas normais.
--
-- ROLLBACK de emergência (idêntico à 029):
-- CREATE POLICY anon_read_controle  ON controle_operacional             FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_read_avb        ON controle_operacional_avb         FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_read_maracanau  ON controle_operacional_maracanau   FOR SELECT TO anon USING (true);
