-- =============================================
-- Migration 034: sessão para entrada via Hub/SSO + reuso de token
-- =============================================
-- Aplicada em prod 2026-07-23. Descoberta pós-incidente (via Supabase API log):
-- quem entra pelo HUB (SSO Supabase Auth / Google) nunca gerava sessionToken do
-- co_usuarios — o bootstrap SSO do App.jsx só fazia setAuthed(true). Resultado:
-- TODA a camada dual-path caía no GET anon (motoristas/veiculos já apareciam
-- vazios nessas sessões desde a 027 — "0 cadastrados" no dashboard).
--
-- 1) Cria o co_usuarios do Yves (yvesfg@gmail.com, admin, 3 bases). Senha = hash
--    aleatório inutilizável (acesso dele é via SSO; login clássico não bate nunca).
INSERT INTO co_usuarios (nome, email, senha, perfil, status, bases_permitidas, aprovado_em)
SELECT 'Yves Feitosa Gomes', 'yvesfg@gmail.com',
       encode(gen_random_bytes(32),'hex'), 'admin', 'aprovado',
       '["imperatriz_belem","acailandia_avb","maracanau"]'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM co_usuarios WHERE email='yvesfg@gmail.com');

-- 2) gerar_token_sessao REUSA token vigente (>1h restante) em vez de rotacionar
--    sempre. Elimina guerra de token entre abas/dispositivos e a classe de bug do
--    incidente (testes/segunda aba matando a sessão viva).
CREATE OR REPLACE FUNCTION public.gerar_token_sessao(p_email text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_token text; v_exp timestamptz;
BEGIN
  SELECT session_token, session_expires_at INTO v_token, v_exp
    FROM co_usuarios WHERE email = p_email AND (status IS NULL OR status = 'aprovado');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado ou não aprovado' USING ERRCODE = 'P0001';
  END IF;
  IF v_token IS NOT NULL AND v_exp IS NOT NULL AND v_exp > NOW() + INTERVAL '1 hour' THEN
    RETURN v_token;  -- reusa a sessão vigente
  END IF;
  v_token := gen_random_uuid()::text;
  UPDATE co_usuarios SET session_token = v_token, session_expires_at = NOW() + INTERVAL '24 hours'
   WHERE email = p_email;
  RETURN v_token;
END; $$;

-- Front (mesmo commit): App.jsx bootstrap SSO chama gerar_token_sessao(email do SSO)
-- guardado por sessionTokenRef (não repete em cada onAuthStateChange).
-- Provado: 2 chamadas seguidas = mesmo token; listar_operacional=1071 e
-- listar_frete_periodos=368 com o token do Yves.
