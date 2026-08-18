-- ── 064: cada usuário salva o PRÓPRIO layout do Dashboard ────────────────────
--
-- Contexto: config.dash (hub_user_modulos) já dizia quais KPIs/blocos a pessoa
-- vê, mas só o admin conseguia escrever, via hub_admin_set_acesso. Para o
-- usuário arrastar/ocultar os cards no próprio Dashboard falta uma escrita que
-- ele possa fazer — sem virar brecha para ele mexer em perfil, perms ou bases,
-- que moram no MESMO jsonb config.
--
-- Por isso não abrimos policy de UPDATE em hub_user_modulos: esta RPC troca
-- exclusivamente a chave `dash`, preservando o resto do config, e só na linha
-- do próprio auth.uid().
--
-- Formato de config.dash (tudo opcional; ausência = visível / ordem natural):
--   { kpis:   { <id>: false },        -- só o que está DESLIGADO é gravado
--     blocos: { <id>: false },
--     ordem:  { kpis: [<id>,...], blocos: [<id>,...] } }
-- Ids vêm de src/dashboardConfig.js (DASH_KPIS / DASH_BLOCOS).

CREATE OR REPLACE FUNCTION public.hub_set_meu_dash(
  p_slug text,
  p_dash jsonb
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_config jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem sessão';
  END IF;
  IF p_dash IS NULL OR jsonb_typeof(p_dash) <> 'object' THEN
    RAISE EXCEPTION 'p_dash precisa ser um objeto JSON';
  END IF;

  -- Só mexe em quem JÁ tem acesso ao módulo: sem linha, não há layout a salvar
  -- (e criar uma aqui seria conceder acesso por caminho torto).
  SELECT config INTO v_config
    FROM hub_user_modulos
   WHERE user_id = v_uid AND modulo_slug = p_slug
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sem acesso ao módulo %', p_slug;
  END IF;

  v_config := coalesce(v_config, '{}'::jsonb) || jsonb_build_object('dash', p_dash);

  UPDATE hub_user_modulos
     SET config = v_config
   WHERE user_id = v_uid AND modulo_slug = p_slug;

  RETURN v_config -> 'dash';
END;
$function$;

REVOKE ALL ON FUNCTION public.hub_set_meu_dash(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.hub_set_meu_dash(text, jsonb) TO authenticated;
