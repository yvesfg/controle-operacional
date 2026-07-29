-- 040_fix_race_gerar_token_sessao.sql
-- Corrige race condition em gerar_token_sessao (aplicada em prod 2026-07-29).
--
-- Bug: a versao anterior (migration 034) fazia SELECT -> IF -> UPDATE em passos
-- separados. Quando o bootstrap SSO do front disparava 2-3 chamadas concorrentes
-- (visto no API log: 3x POST rpc/gerar_token_sessao em ~37ms), cada chamada lia o
-- mesmo estado "sem token valido", gerava um gen_random_uuid() PROPRIO e gravava
-- por cima da anterior. So a ultima gravacao valia no banco, mas o front podia ter
-- guardado em memoria o token de retorno de uma chamada que "perdeu" a corrida.
-- Resultado: token em memoria != co_usuarios.session_token -> toda leitura via RPC
-- (listar_operacional/listar_motoristas/listar_veiculos/listar_despesas) falhava
-- com "Sessao invalida ou expirada" (P0001) ate recarregar a pagina (e podia
-- repetir a corrida no reload seguinte).
--
-- Fix: UPDATE...RETURNING atomico. O lock de linha do Postgres serializa chamadas
-- concorrentes pro mesmo email; a 2a/3a chamada so roda o UPDATE depois que a 1a
-- comita, ve o token que a 1a ja gravou (via CASE) e devolve o MESMO valor.
CREATE OR REPLACE FUNCTION public.gerar_token_sessao(p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
BEGIN
  UPDATE co_usuarios
     SET session_token = CASE
           WHEN session_token IS NOT NULL AND session_expires_at > NOW() + INTERVAL '1 hour'
           THEN session_token
           ELSE gen_random_uuid()::text
         END,
         session_expires_at = CASE
           WHEN session_token IS NOT NULL AND session_expires_at > NOW() + INTERVAL '1 hour'
           THEN session_expires_at
           ELSE NOW() + INTERVAL '24 hours'
         END
   WHERE email = p_email AND (status IS NULL OR status = 'aprovado')
  RETURNING session_token INTO v_token;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado ou não aprovado' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_token;
END;
$function$;
