-- =============================================
-- Migration 023: LOCKDOWN co_usuarios (fecha V1 — takeover via anon UPDATE/INSERT)
-- =============================================
-- RASCUNHO — NÃO APLICAR isolado. Precisa subir JUNTO com a troca do front
-- (ModalUsuario.jsx passa a chamar a RPC abaixo em vez de POST direto).
-- Aplicar só isto QUEBRA o cadastro/edição de usuário pelo painel admin.
--
-- Problema (snapshot 2026-07-22): co_usuarios tem
--   allow_anon_insert (INSERT, public, WITH CHECK true)
--   allow_anon_update (UPDATE, public, USING true, sem WITH CHECK)
-- → qualquer um com a anon key reescreve perfil/senha/status de qualquer usuário
--   (escalada p/ admin) ou cria um admin aprovado do zero. Sem policy de SELECT,
--   a leitura já é bloqueada — aqui fechamos a ESCRITA e a movemos p/ uma RPC
--   que confirma, via token de sessão, que o chamador é admin.
--
-- Auditoria confirmou: a ÚNICA escrita do front em co_usuarios é o painel admin
-- (ModalUsuario). Não há insert self-service no cliente; usuários "pendentes"
-- (quando existem) nascem de trigger SECURITY DEFINER, que ignora RLS. Logo,
-- derrubar as policies abertas só afeta ModalUsuario — que passa a usar a RPC.

-- ── RPC: upsert de usuário, só admin ────────────────────────────────────────
-- _validar_token_e_base(token, null) devolve o id do dono do token (e valida
-- expiração). Confirmamos que esse usuário tem perfil 'admin' antes de gravar.
-- Branch explícito UPDATE/INSERT (não ON CONFLICT): num edit parcial, o payload
-- pode não trazer nome/senha; alimentar null numa coluna NOT NULL estoura ANTES
-- do ON CONFLICT resolver. Aqui, edição preserva com coalesce; criação exige os
-- obrigatórios (nome, email, senha, bases_permitidas são NOT NULL).
CREATE OR REPLACE FUNCTION public.admin_upsert_usuario(p_token text, p_dados jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_perfil text;
  v_email  text;
  v_existe boolean;
BEGIN
  v_caller := _validar_token_e_base(p_token, null);   -- valida sessão/expiração
  SELECT perfil INTO v_perfil FROM co_usuarios WHERE id = v_caller;
  IF v_perfil IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode gerenciar usuários' USING ERRCODE = 'P0001';
  END IF;

  v_email := lower(coalesce(p_dados->>'email',''));
  IF position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'e-mail inválido' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (SELECT 1 FROM co_usuarios WHERE email = v_email) INTO v_existe;

  IF v_existe THEN
    -- Edição: só sobrescreve o que veio no payload; senha só troca se preenchida.
    UPDATE co_usuarios u SET
      nome   = coalesce(p_dados->>'nome',   u.nome),
      senha  = coalesce(nullif(p_dados->>'senha',''), u.senha),
      perfil = coalesce(p_dados->>'perfil', u.perfil),
      tel    = coalesce(p_dados->>'tel',    u.tel),
      perms  = coalesce(p_dados->'perms',   u.perms),
      status = coalesce(p_dados->>'status', u.status),
      bases_permitidas = coalesce(p_dados->'bases_permitidas', u.bases_permitidas)
    WHERE u.email = v_email;
  ELSE
    -- Criação: valida os NOT NULL antes de inserir.
    IF coalesce(p_dados->>'nome','')  = '' THEN RAISE EXCEPTION 'nome obrigatório'  USING ERRCODE = 'P0001'; END IF;
    IF coalesce(p_dados->>'senha','') = '' THEN RAISE EXCEPTION 'senha obrigatória' USING ERRCODE = 'P0001'; END IF;
    INSERT INTO co_usuarios (nome, email, senha, perfil, tel, perms, status, bases_permitidas)
    VALUES (p_dados->>'nome', v_email, p_dados->>'senha',
            coalesce(p_dados->>'perfil','visualizador'), p_dados->>'tel',
            coalesce(p_dados->'perms','{}'::jsonb),
            coalesce(p_dados->>'status','aprovado'),
            coalesce(p_dados->'bases_permitidas','["imperatriz_belem"]'::jsonb));
  END IF;
END;
$function$;

-- Executável por anon (a autz real é o token dentro da função)
REVOKE ALL ON FUNCTION public.admin_upsert_usuario(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_upsert_usuario(text, jsonb) TO anon;

-- ── Fecha as policies abertas de escrita ────────────────────────────────────
-- Depois disto, INSERT/UPDATE direto por anon em co_usuarios é negado (deny-all).
-- Leitura já era bloqueada (sem policy SELECT); segue via RPC listar_usuarios.
DROP POLICY IF EXISTS allow_anon_insert ON co_usuarios;
DROP POLICY IF EXISTS allow_anon_update ON co_usuarios;

-- ── ROLLBACK de emergência (destravar em incidente) ─────────────────────────
-- CREATE POLICY allow_anon_insert ON co_usuarios FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY allow_anon_update ON co_usuarios FOR UPDATE TO public USING (true);
