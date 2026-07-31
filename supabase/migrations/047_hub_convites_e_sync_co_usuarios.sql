-- 047_hub_convites_e_sync_co_usuarios.sql
-- ============================================================================
-- Convite por e-mail (pré-aprovação) + fim da divergência Hub x co_usuarios.
--
-- PROBLEMA 1 — fluxo de acesso invertido.
--   Hoje só existe "o cara loga, vira pendente, o admin aprova". Não dá pra
--   liberar um e-mail ANTES: quem chega novo bate numa tela de espera e precisa
--   avisar o admin. Aqui nasce `hub_convites`: o admin cadastra o e-mail com os
--   módulos/perfil/bases já definidos, e no PRIMEIRO login com aquele e-mail o
--   acesso é aplicado automaticamente (trigger em auth.users).
--
-- PROBLEMA 2 — os chips de base da tela de acessos não valem nada.
--   Quem decide o que o usuário consegue LER é co_usuarios.bases_permitidas
--   (_validar_token_e_base, migration 035). A tela de acessos só escreve em
--   hub_user_modulos.config. As duas estavam soltas — e divergiram de verdade
--   em produção:
--     · ocimarnunes98@gmail.com  → acesso no Hub, SEM linha em co_usuarios
--                                  (nunca recebe token; o app abre vazio)
--     · imperatriz@rodorrica...  → Hub diz 1 base, co_usuarios diz 2
--   A partir daqui toda escrita de acesso passa por hub_admin_set_acesso, que
--   grava nos DOIS lugares.
--
-- Nada aqui afeta o login por e-mail/senha (autenticar_usuario) nem as RPCs de
-- leitura: co_usuarios continua sendo a fonte do token, só passa a ser
-- alimentada pelo Hub em vez de na mão.
-- ============================================================================

-- PROBLEMA 3 — achado no meio do caminho, e o mais grave dos três.
--   Dois usuários tinham bases_permitidas gravado como STRING JSON
--   ("[\"imperatriz_belem\",\"maracanau\"]") em vez de array. O
--   _validar_token_e_base testa com `@>`, que num escalar NUNCA casa: os dois
--   levavam "Acesso negado à base" em toda leitura. Era dado legado (o cliente
--   atual manda array; useAuthHandlers.js:154 tem até um JSON.parse defensivo
--   pra ler esse formato). Aqui o dado é normalizado e um CHECK impede a volta.

-- ── 0. Helper: comprimento seguro de array jsonb ────────────────────────────
-- jsonb_array_length() estoura em escalar, e o Postgres não garante que o
-- `jsonb_typeof(x)='array' AND ...` de um WHERE seja avaliado da esquerda pra
-- direita (foi exatamente assim que a 1ª tentativa desta migration abortou).
-- Dentro de uma função SQL o CASE garante a ordem.
CREATE OR REPLACE FUNCTION public._jsonb_len(x jsonb) RETURNS int
  LANGUAGE sql IMMUTABLE
  SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN jsonb_typeof(x) = 'array' THEN jsonb_array_length(x) ELSE 0 END;
$function$;

-- ── 1. Tabela de convites ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hub_convites (
  email      text PRIMARY KEY,
  nome       text,
  -- [{slug, role, config}] — mesmo formato que vai pra hub_user_modulos.
  modulos    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  criado_por uuid,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  expira_em  timestamptz,
  usado_em   timestamptz,
  usado_por  uuid
);

-- RLS ligada e SEM policy: ninguém lê/escreve direto. O acesso é só pelas RPCs
-- SECURITY DEFINER abaixo, todas com gate de is_hub_admin(). Um convite carrega
-- o desenho do acesso de alguém — não é dado pra ficar exposto ao anon.
ALTER TABLE public.hub_convites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.hub_convites IS
  'E-mails pré-aprovados. Consumido no primeiro login (handle_hub_new_user).';

-- ── 2. Espelho Hub -> co_usuarios ───────────────────────────────────────────
-- co_usuarios é o que o _validar_token_e_base consulta. Sem linha aqui, o
-- usuário loga no Hub e vê tela vazia; com bases erradas, vê "Acesso negado à
-- base". Esta função é o único ponto que traduz a config do Hub pra lá.
--
-- `senha` é NOT NULL e guarda um HASH (autenticar_usuario compara o hash que o
-- front calcula). Usuário de Google não tem senha: grava-se um uuid aleatório,
-- que não é hash de nada — nenhuma senha digitada bate com ele.
--
-- Guarda-corpo: nunca rebaixa um perfil 'admin' já existente.
CREATE OR REPLACE FUNCTION public._hub_sync_co_usuario(
  p_email  text,
  p_nome   text,
  p_perfil text,
  p_bases  jsonb
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_email  text := lower(trim(p_email));
  v_perfil text := coalesce(nullif(p_perfil, ''), 'visualizador');
  v_bases  jsonb := CASE WHEN _jsonb_len(p_bases) = 0 THEN NULL ELSE p_bases END;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN RETURN; END IF;

  INSERT INTO co_usuarios (nome, email, senha, perfil, status, bases_permitidas, aprovado_em)
  VALUES (
    coalesce(nullif(trim(p_nome), ''), split_part(v_email, '@', 1)),
    v_email,
    gen_random_uuid()::text,           -- sem senha utilizável (login é por Google)
    v_perfil,
    'aprovado',
    coalesce(v_bases, '["imperatriz_belem"]'::jsonb),
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    status           = 'aprovado',
    aprovado_em      = coalesce(co_usuarios.aprovado_em, now()),
    -- admin nunca é rebaixado por uma edição de acesso
    perfil           = CASE WHEN co_usuarios.perfil = 'admin' THEN 'admin' ELSE v_perfil END,
    -- bases só são sobrescritas quando o Hub tem uma lista de verdade
    bases_permitidas = coalesce(v_bases, co_usuarios.bases_permitidas);
END;
$function$;

-- ── 3. Aplicar uma lista de módulos a um usuário que JÁ existe ──────────────
-- Usado tanto pelo convite (no primeiro login) quanto pela tela de acessos.
CREATE OR REPLACE FUNCTION public._hub_aplicar_modulos(
  p_user_id uuid,
  p_email   text,
  p_nome    text,
  p_modulos jsonb
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  m      jsonb;
  v_cfg  jsonb;
BEGIN
  UPDATE hub_profiles SET status = 'aprovado' WHERE id = p_user_id;

  FOR m IN SELECT * FROM jsonb_array_elements(coalesce(p_modulos, '[]'::jsonb))
  LOOP
    v_cfg := coalesce(m->'config', '{}'::jsonb);

    INSERT INTO hub_user_modulos (user_id, modulo_slug, role, ativo, config)
    VALUES (p_user_id, m->>'slug', coalesce(nullif(m->>'role',''), 'viewer'), true, v_cfg)
    ON CONFLICT (user_id, modulo_slug) DO UPDATE SET
      role   = excluded.role,
      ativo  = true,
      config = excluded.config;

    -- Só o Controle Operacional tem espelho em co_usuarios.
    IF m->>'slug' = 'controle_op' THEN
      PERFORM _hub_sync_co_usuario(p_email, p_nome, v_cfg->>'perfil', v_cfg->'bases');
    END IF;
  END LOOP;
END;
$function$;

-- ── 4. Convidar (admin) ─────────────────────────────────────────────────────
-- Se o e-mail JÁ tem conta, aplica na hora (é o "aprovar já configurado").
-- Se não tem, guarda o convite e espera o primeiro login.
CREATE OR REPLACE FUNCTION public.hub_admin_convidar(
  p_email   text,
  p_nome    text,
  p_modulos jsonb
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(p_email));
  v_uid   uuid;
BEGIN
  IF NOT is_hub_admin() THEN
    RAISE EXCEPTION 'Apenas admin do hub pode convidar';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'E-mail inválido: %', p_email;
  END IF;

  SELECT id INTO v_uid FROM hub_profiles WHERE lower(email) = v_email LIMIT 1;

  IF v_uid IS NOT NULL THEN
    PERFORM _hub_aplicar_modulos(v_uid, v_email, p_nome, p_modulos);
    DELETE FROM hub_convites WHERE email = v_email;
    RETURN jsonb_build_object('aplicado', true, 'user_id', v_uid);
  END IF;

  INSERT INTO hub_convites (email, nome, modulos, criado_por)
  VALUES (v_email, nullif(trim(p_nome), ''), coalesce(p_modulos, '[]'::jsonb), auth.uid())
  ON CONFLICT (email) DO UPDATE SET
    nome       = excluded.nome,
    modulos    = excluded.modulos,
    criado_por = excluded.criado_por,
    criado_em  = now(),
    usado_em   = NULL,
    usado_por  = NULL;

  RETURN jsonb_build_object('aplicado', false, 'email', v_email);
END;
$function$;

-- ── 5. Listar / cancelar convites (admin) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.hub_admin_listar_convites()
RETURNS TABLE(email text, nome text, modulos jsonb, criado_em timestamptz)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_hub_admin() THEN
    RAISE EXCEPTION 'Apenas admin do hub pode listar convites';
  END IF;
  RETURN QUERY
    SELECT c.email, c.nome, c.modulos, c.criado_em
      FROM hub_convites c
     WHERE c.usado_em IS NULL
     ORDER BY c.criado_em DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hub_admin_cancelar_convite(p_email text)
RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_hub_admin() THEN
    RAISE EXCEPTION 'Apenas admin do hub pode cancelar convite';
  END IF;
  DELETE FROM hub_convites WHERE email = lower(trim(p_email));
END;
$function$;

-- ── 6. Editar acesso de quem já existe (admin) ──────────────────────────────
-- Substitui o UPDATE direto em hub_user_modulos que a tela fazia. A diferença
-- que importa: aqui o co_usuarios acompanha, então mudar as bases na tela passa
-- a mudar de fato o que a pessoa consegue ler.
CREATE OR REPLACE FUNCTION public.hub_admin_set_acesso(
  p_user_id uuid,
  p_slug    text,
  p_role    text,
  p_config  jsonb,
  p_ativo   boolean DEFAULT true
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_nome  text;
BEGIN
  IF NOT is_hub_admin() THEN
    RAISE EXCEPTION 'Apenas admin do hub pode alterar acessos';
  END IF;

  SELECT email, nome INTO v_email, v_nome FROM hub_profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  INSERT INTO hub_user_modulos (user_id, modulo_slug, role, ativo, config)
  VALUES (p_user_id, p_slug, coalesce(nullif(p_role,''), 'viewer'), p_ativo, coalesce(p_config, '{}'::jsonb))
  ON CONFLICT (user_id, modulo_slug) DO UPDATE SET
    role   = excluded.role,
    ativo  = excluded.ativo,
    config = excluded.config;

  IF p_slug = 'controle_op' AND p_ativo THEN
    PERFORM _hub_sync_co_usuario(v_email, v_nome, p_config->>'perfil', p_config->'bases');
  END IF;

  -- Tirar o acesso ao CO também derruba a sessão ativa: sem isso o token
  -- continua válido por até 24h depois de o acesso ser revogado.
  IF p_slug = 'controle_op' AND NOT p_ativo THEN
    UPDATE co_usuarios
       SET status = 'negado', session_token = NULL, session_expires_at = NULL
     WHERE lower(email) = lower(v_email);
  END IF;
END;
$function$;

-- ── 7. Reivindicar o convite no primeiro login ──────────────────────────────
-- Estende o trigger que já criava o hub_profiles. Envolvido em EXCEPTION: se
-- qualquer coisa der errado no convite, o cadastro do usuário NÃO pode falhar
-- junto (seria login quebrado pra todo mundo).
CREATE OR REPLACE FUNCTION public.handle_hub_new_user()
RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_email   text := lower(NEW.email);
  v_nome    text := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_convite hub_convites%ROWTYPE;
BEGIN
  INSERT INTO public.hub_profiles (id, nome, email)
  VALUES (NEW.id, v_nome, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    SELECT * INTO v_convite
      FROM hub_convites
     WHERE email = v_email
       AND usado_em IS NULL
       AND (expira_em IS NULL OR expira_em > now())
     LIMIT 1;

    IF FOUND THEN
      PERFORM _hub_aplicar_modulos(NEW.id, v_email, COALESCE(v_convite.nome, v_nome), v_convite.modulos);
      UPDATE hub_convites SET usado_em = now(), usado_por = NEW.id WHERE email = v_email;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'convite de % não aplicado: %', v_email, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- ── 8. Backfill dos casos quebrados ─────────────────────────────────────────
-- Só ADITIVO de propósito: cria o que falta e completa o que está vazio, nunca
-- remove acesso existente. Onde Hub e co_usuarios divergem (Hub 1 base x
-- co_usuarios 2), o co_usuarios vence e é copiado PRO Hub — tirar base de quem
-- usa hoje seria um efeito colateral silencioso desta migration.

-- 8.0 PRIMEIRO: desfaz o double-encode (string JSON -> array). Sem isto, os
-- passos seguintes comparam maçã com laranja e os dois usuários seguem sem ler
-- nada. O regex evita tentar converter um texto que não seja um array JSON.
UPDATE co_usuarios
   SET bases_permitidas = (bases_permitidas #>> '{}')::jsonb
 WHERE jsonb_typeof(bases_permitidas) = 'string'
   AND (bases_permitidas #>> '{}') ~ '^\s*\[';

-- Impede a volta do formato errado. NOT VALID: só vale pra escrita nova — não
-- quero que uma linha legada esquecida derrube a migration inteira.
ALTER TABLE co_usuarios DROP CONSTRAINT IF EXISTS co_usuarios_bases_array;
ALTER TABLE co_usuarios ADD CONSTRAINT co_usuarios_bases_array
  CHECK (jsonb_typeof(bases_permitidas) = 'array') NOT VALID;

-- 8a. Quem tem acesso no Hub e nenhuma linha em co_usuarios (o app abre vazio).
INSERT INTO co_usuarios (nome, email, senha, perfil, status, bases_permitidas, aprovado_em)
SELECT
  coalesce(nullif(trim(p.nome), ''), split_part(p.email, '@', 1)),
  lower(p.email),
  gen_random_uuid()::text,
  coalesce(um.config->>'perfil', 'visualizador'),
  'aprovado',
  CASE WHEN _jsonb_len(um.config->'bases') > 0
       THEN um.config->'bases'
       ELSE '["imperatriz_belem"]'::jsonb END,
  now()
FROM hub_user_modulos um
JOIN hub_profiles p ON p.id = um.user_id
WHERE um.modulo_slug = 'controle_op'
  AND um.ativo = true
  AND NOT EXISTS (SELECT 1 FROM co_usuarios c WHERE lower(c.email) = lower(p.email))
ON CONFLICT (email) DO NOTHING;

-- 8b. Hub sem bases (config.bases vazio) mas co_usuarios com bases: copia pro Hub.
UPDATE hub_user_modulos um
   SET config = coalesce(um.config, '{}'::jsonb) || jsonb_build_object('bases', c.bases_permitidas)
  FROM hub_profiles p, co_usuarios c
 WHERE um.user_id = p.id
   AND lower(c.email) = lower(p.email)
   AND um.modulo_slug = 'controle_op'
   AND um.ativo = true
   AND _jsonb_len(c.bases_permitidas) > 0
   AND _jsonb_len(um.config->'bases') = 0;

-- 8c. Hub com bases que o co_usuarios não tem: UNIÃO das duas listas.
-- Subquery correlacionada no SET (e não LATERAL no FROM): num UPDATE...FROM a
-- tabela alvo não é visível de dentro do FROM, só do SET e do WHERE.
UPDATE hub_user_modulos um
   SET config = coalesce(um.config, '{}'::jsonb) || jsonb_build_object('bases', (
         SELECT jsonb_agg(DISTINCT b)
           FROM (
             SELECT jsonb_array_elements(um.config->'bases') AS b
             UNION
             SELECT jsonb_array_elements(c.bases_permitidas) AS b
           ) x
       ))
  FROM hub_profiles p, co_usuarios c
 WHERE um.user_id = p.id
   AND lower(c.email) = lower(p.email)
   AND um.modulo_slug = 'controle_op'
   AND um.ativo = true
   AND _jsonb_len(um.config->'bases') > 0
   AND _jsonb_len(c.bases_permitidas) > 0
   AND NOT (um.config->'bases' @> c.bases_permitidas);

-- 8d. E o co_usuarios recebe a lista final (agora igual à do Hub).
UPDATE co_usuarios c
   SET bases_permitidas = um.config->'bases'
  FROM hub_user_modulos um
  JOIN hub_profiles p ON p.id = um.user_id
 WHERE lower(c.email) = lower(p.email)
   AND um.modulo_slug = 'controle_op'
   AND um.ativo = true
   AND _jsonb_len(um.config->'bases') > 0
   AND c.bases_permitidas <> um.config->'bases';
