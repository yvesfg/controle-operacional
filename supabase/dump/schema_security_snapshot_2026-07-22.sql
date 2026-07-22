-- ============================================================================
-- CONTROLE OPERACIONAL — SNAPSHOT DE SEGURANÇA DO SCHEMA (produção)
-- Projeto Supabase: controle-operacional (ref qdrhkkjawklqfsoyxhpd, sa-east-1)
-- Gerado: 2026-07-22 via MCP (pg_policies / pg_proc / advisors)
-- Objetivo: versionar o estado real de RLS + RPCs que hoje só existem no banco
--           (as migrations 003–022 no repo NÃO cobrem estas funções nem estas
--            policies). Serve de base para a migration de lockdown (Fase 1).
--
-- ATENÇÃO: este arquivo é um RETRATO do que está no ar, não o alvo desejado.
--          Vários pontos abaixo são justamente as vulnerabilidades a corrigir.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 1. MATRIZ DE RLS (pg_policies) — estado atual
-- ─────────────────────────────────────────────────────────────────────────
-- Legenda: role {anon}/{public} + qual=true  ⇒  acesso irrestrito via anon key.
--          co_usuarios NÃO tem policy de SELECT (leitura bloqueada por REST),
--          mas TEM INSERT e UPDATE abertos (escrita irrestrita) — ver §4.

-- TABELAS DE DADOS OPERACIONAIS — anon SELECT/INSERT/UPDATE = true, sem DELETE
--   controle_operacional            : anon_read/write/upd_controle   (true)
--   controle_operacional_avb        : anon_read/write/upd_avb        (true)
--   controle_operacional_maracanau  : anon_read/write/upd_maracanau  (true)
--   controle_operacional_sem_dt     : sem_dt_all  FOR ALL public     (true/true)
--   co_ocorrencias                  : anon_read/write/upd_ocorr      (true)
--   co_acompanhamento_dt            : anon_read/write/upd_acomp       (true)
--   co_logs_alteracoes              : logs_select/insert public       (true)

-- CADASTROS COM PII/DADOS BANCÁRIOS — public CRUD COMPLETO (inclui DELETE)
--   motoristas   : anon_read/write/upd/del_motoristas   (true)  ← cpf, tel, banco, agencia, conta, favorecido
--   veiculos     : anon_read/write/upd/del_veiculos      (true)
--   embarcadoras : anon_read/write/upd/del_embarcadoras  (true)
--   frete_conferencia : anon_read/write/upd/del_frete_conf (true)
--   despesas_filial   : anon_read/write/upd/del_despesas   (true)
--   frete_usuarios    : frete_usuarios_select/insert/delete (true)

-- USUÁRIOS / CONFIG — parcialmente protegidos
--   co_usuarios : allow_anon_insert (INSERT true) + allow_anon_update (UPDATE true)
--                 >> SEM policy de SELECT  → leitura via REST bloqueada (bom)
--                 >> INSERT/UPDATE abertos → escalonamento/takeover (crítico, §4)
--   co_config   : config_select/update com qual que EXCLUI
--                 ('admin_senha_hash','service_key','secret')  → hash admin protegido (bom)
--                 config_upsert (INSERT) with_check=true irrestrito (chave é PK ⇒ upsert cai no UPDATE bloqueado)

-- APONTAMENTOS / HUB — bem escopados
--   co_apontamentos  : auth_full_access FOR ALL {authenticated} (true)   ← exige login
--   hub_profiles     : select (uid=id OR is_hub_admin), insert/update (uid=id), delete (uid=id)
--   hub_user_modulos : select (uid=user_id OR is_hub_admin), ins/upd/del (is_hub_admin())
--   hub_modulos      : read {authenticated}

-- OUTROS APPS no mesmo banco (fora do escopo deste app, mas mesmo padrão aberto)
--   antt_consultas, closet_calendar/history/items/usage : public/true


-- ─────────────────────────────────────────────────────────────────────────
-- 2. CAMADA RPC (SECURITY DEFINER) — a "porta da frente" desenhada p/ auth
-- ─────────────────────────────────────────────────────────────────────────
-- Estas funções implementam o controle de acesso REAL por token de sessão e
-- base. São BEM-FEITAS (validam token, checam base, EXECUTE parametrizado).
-- O problema NÃO está nelas — está em §1: como as tabelas aceitam anon direto,
-- toda esta camada pode ser CONTORNADA batendo no PostgREST /rest/v1.

CREATE OR REPLACE FUNCTION public._validar_token_e_base(p_token text, p_base text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_bases_permitidas jsonb; v_expires_at timestamptz;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    RAISE EXCEPTION 'Token de sessão ausente' USING ERRCODE = 'P0001';
  END IF;
  SELECT id, bases_permitidas, session_expires_at
    INTO v_user_id, v_bases_permitidas, v_expires_at
    FROM co_usuarios
   WHERE session_token = p_token AND (status IS NULL OR status = 'aprovado') LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada' USING ERRCODE = 'P0001';
  END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    UPDATE co_usuarios SET session_token = NULL, session_expires_at = NULL WHERE id = v_user_id;
    RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = 'P0001';
  END IF;
  IF p_base IS NOT NULL AND p_base != '' THEN
    IF NOT (v_bases_permitidas @> to_jsonb(p_base::text)) THEN
      RAISE EXCEPTION 'Acesso negado à base: %', p_base USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN v_user_id;
END;
$function$;

-- autenticar_usuario: cliente manda SHA-256 (p_hash); servidor faz igualdade simples
-- (u.senha = p_hash). Coluna co_usuarios.senha guarda o hash. SHA-256 SEM SALT.
CREATE OR REPLACE FUNCTION public.autenticar_usuario(p_email text, p_hash text)
 RETURNS TABLE(id uuid, nome text, email text, perfil text, tel text, perms jsonb,
               status text, bases_permitidas jsonb, solicitado_em timestamptz,
               aprovado_em timestamptz, session_token text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_token text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM co_usuarios u
     WHERE u.email = p_email AND u.senha = p_hash
       AND (u.status IS NULL OR u.status = 'aprovado')) THEN
    RETURN;
  END IF;
  v_token := gen_random_uuid()::text;
  UPDATE co_usuarios SET session_token = v_token,
         session_expires_at = NOW() + INTERVAL '24 hours' WHERE email = p_email;
  RETURN QUERY SELECT u.id,u.nome,u.email,u.perfil,u.tel,u.perms,u.status,
    u.bases_permitidas,u.solicitado_em,u.aprovado_em,v_token FROM co_usuarios u WHERE u.email = p_email;
END;
$function$;

-- gerar_token_sessao: emite token só pelo e-mail, SEM reverificar senha.
-- Usado no auto-login (App.jsx). Consequência: quem souber um e-mail aprovado
-- e conseguir chamar a RPC recebe um token de 24h. Ver §4.
CREATE OR REPLACE FUNCTION public.gerar_token_sessao(p_email text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_token text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM co_usuarios WHERE email = p_email AND (status IS NULL OR status = 'aprovado')) THEN
    RAISE EXCEPTION 'Usuário não encontrado ou não aprovado' USING ERRCODE = 'P0001';
  END IF;
  v_token := gen_random_uuid()::text;
  UPDATE co_usuarios SET session_token = v_token,
         session_expires_at = NOW() + INTERVAL '24 hours' WHERE email = p_email;
  RETURN v_token;
END;
$function$;

-- Write path — TODAS validam token+base e usam EXECUTE format(... USING ...) parametrizado.
-- _base_para_tabela mapeia base→tabela por whitelist (sem injeção de nome de tabela).
--   listar_operacional(p_token,p_base,p_limit,p_offset)   [SECURITY DEFINER, SEM search_path]  ⚠ advisor
--   upsert_operacional(p_token,p_base,p_dados jsonb)       [search_path=public]
--   upsert_operacional_cod(p_token,p_base,p_dados jsonb)   [search_path=public]
--   patch_operacional(p_token,p_base,p_dt,p_dados jsonb)   [search_path=public]
--   delete_operacional(p_token,p_base,p_dt)               [search_path=public]
--   listar_usuarios(p_token) / listar_usuarios_pendentes(p_token)  [SEM search_path] ⚠
--   listar_ocorrencias(p_token,p_dt) / _bulk(p_token,p_dts[])      [SEM search_path] ⚠
--   is_hub_admin() / hub_admin_set_status(uuid,text)      [search_path=public]
--   buscar_usuario_por_email(p_email)                     [search_path=public]  (não exige token) ⚠


-- ─────────────────────────────────────────────────────────────────────────
-- 3. ADVISORS DE SEGURANÇA DO SUPABASE (110 achados) — resumo por título
-- ─────────────────────────────────────────────────────────────────────────
--   45x  RLS Policy Always True                        (as policies USING(true) de §1)
--   21x  Function Search Path Mutable                  (SECURITY DEFINER sem search_path fixo)
--   19x  Public Can Execute SECURITY DEFINER Function  (RPCs executáveis por anon)
--   19x  Signed-In Users Can Execute SECURITY DEFINER Function
--    3x  Public Bucket Allows Listing                  (buckets de storage listáveis)
--    2x  RLS Enabled No Policy                         (tabela c/ RLS e nenhuma policy = deny-all)
--    1x  Leaked Password Protection Disabled           (Supabase Auth: HIBP desligado)


-- ─────────────────────────────────────────────────────────────────────────
-- 4. VETORES DE ATAQUE CONFIRMADOS (só com a anon key, extraível do bundle JS)
-- ─────────────────────────────────────────────────────────────────────────
-- V1 [CRÍTICO] Escalada de privilégio / account takeover via co_usuarios:
--     policy allow_anon_update (UPDATE, public, qual=true, sem with_check).
--     PATCH /rest/v1/co_usuarios?email=eq.<vítima>  { "perfil":"admin",
--            "senha":"<sha256 escolhido>", "status":"aprovado",
--            "bases_permitidas":["imperatriz_belem","maracanau","acailandia_avb"] }
--     → reescreve o hash de qualquer usuário e vira admin. allow_anon_insert
--       ainda permite CRIAR um usuário admin aprovado do zero.
--
-- V2 [ALTO/LGPD] Vazamento e adulteração de dados operacionais e PII:
--     GET/PATCH /rest/v1/controle_operacional (cpf, placa, nome, valores),
--     GET/DELETE /rest/v1/motoristas (cpf, tel, banco, agencia, conta, favorecido).
--     Leitura e escrita (motoristas: até DELETE) liberadas para anon.
--
-- V3 [MÉDIO] A camada RPC de token é sólida, mas IRRELEVANTE enquanto §1 existir:
--     o atacante não precisa de token — fala direto no PostgREST.


-- ─────────────────────────────────────────────────────────────────────────
-- 5. PONTOS JÁ CORRETOS (não regredir na correção)
-- ─────────────────────────────────────────────────────────────────────────
--   • co_usuarios SEM policy de SELECT  → hash não é lido por REST anon.
--   • co_config protege admin_senha_hash/service_key/secret no SELECT e UPDATE.
--   • RPCs de escrita: token+base validados, EXECUTE parametrizado, whitelist de tabela.
--   • hub_* e co_apontamentos escopados por auth.uid()/authenticated.
--   • Segredos de IA (api/*) server-only, sem prefixo VITE_.
-- ============================================================================
