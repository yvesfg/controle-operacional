-- =============================================
-- Migration 033: ROLLBACK DE EMERGÊNCIA da 030 (core) e 032 (frete_conferencia)
-- =============================================
-- Aplicada em prod 2026-07-23 ~11h. App em prod ficou SEM DADOS (dashboard, planilha
-- e conferência vazios). Duas causas SOMADAS:
--
-- 1. TESTE INVALIDOU A SESSÃO REAL: durante a validação das RPCs (031/032), os testes
--    no banco chamaram gerar_token_sessao('admin@sistema') várias vezes. Essa função
--    ROTACIONA o token (gen_random_uuid + UPDATE em co_usuarios.session_token) — cada
--    chamada derrubou a sessão viva do navegador do Yves (logado como admin). Com a 030
--    ativa, o path RPC passou a falhar ('Sessão inválida') e o GET anon retornava [].
--
-- 2. GO-LIVE 032 COM FRONT ERRADO NO AR: o dual-path de freteConferencia.js só subiu
--    no commit a086109 (10:45) — DEPOIS do "confirmado" do Yves (que testou com o
--    front antigo + policies abertas, mascarando o GET). A 032 foi aplicada com o
--    front deployado ainda lendo por GET anon → conferência zerou.
--
-- LIÇÕES para a próxima tentativa (ver PLANO_V2_CONTINUACAO.md):
--   a. NUNCA testar RPCs com gerar_token_sessao de usuário real — criar usuário de
--      teste temporário (e apagar no fim) ou ler o token vigente sem rotacionar.
--   b. Antes de derrubar policy: conferir que o COMMIT com o dual-path está no
--      origin/main E deployado (data do deploy > data do commit), e provar pelo
--      Supabase API log que o app está chamando rpc/... (não GET na tabela).
--   c. Confirmação visual do usuário com policy aberta NÃO prova o path RPC.

-- desfaz 030 (leitura anon do core)
CREATE POLICY anon_read_controle  ON controle_operacional             FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_avb        ON controle_operacional_avb         FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_maracanau  ON controle_operacional_maracanau   FOR SELECT TO anon USING (true);

-- desfaz 032 (4 policies de frete_conferencia)
CREATE POLICY anon_read_frete_conf  ON frete_conferencia FOR SELECT TO public USING (true);
CREATE POLICY anon_write_frete_conf ON frete_conferencia FOR INSERT TO public WITH CHECK (true);
CREATE POLICY anon_upd_frete_conf   ON frete_conferencia FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY anon_del_frete_conf   ON frete_conferencia FOR DELETE TO public USING (true);

-- Provado após aplicar: anon lê 1071/417/371 (core) + 3192 (frete) de novo.
