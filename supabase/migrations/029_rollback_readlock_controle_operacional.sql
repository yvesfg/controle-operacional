-- =============================================
-- Migration 029: ROLLBACK da 028 (read-lockdown do core)
-- =============================================
-- A 028 travou a leitura anon de controle_operacional, mas quebrou o carregamento
-- do core no app (dashboard vazio, DTS=0). Causa raiz: TIMING de deploy + sessão.
--
-- No BANCO listar_operacional funciona (retorna as linhas com token de admin, que
-- tem as 3 bases em bases_permitidas). No FRONT, porém, o sync roda em [authed] e
-- o sessionToken é gerado de forma ASSÍNCRONA (gerar_token_sessao().then(setSessionToken)),
-- então no 1º sync o token costuma ser null → cai no GET anon → que a 028 zerou.
-- O fix de re-sync ([authed, sessionToken], commit ebf2138) resolve isso, MAS ainda
-- não estava publicado na Vercel quando a 028 já valia no banco.
--
-- Lição p/ refazer a Fase A com segurança (ver docs/PLANO_V2_CONTINUACAO.md):
--   1. Garantir que o front SEMPRE tenha o token antes do 1º sync (ou aguardar o
--      token antes de sincronizar), e que ebf2138 esteja DEPLOYADO.
--   2. Validar no app (com policy ainda aberta) que os dados carregam de fato pela
--      RPC — ex.: logar e conferir o dashboard cheio — ANTES de derrubar o SELECT.
--   3. Só então re-aplicar o DROP das 3 policies de leitura.

CREATE POLICY anon_read_controle  ON controle_operacional             FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_avb        ON controle_operacional_avb         FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_maracanau  ON controle_operacional_maracanau   FOR SELECT TO anon USING (true);
