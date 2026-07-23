-- =============================================
-- Migration 037: Fase C — despesas_filial RPCs SECURITY DEFINER token-validadas
-- =============================================
-- despesas_filial (669 linhas) = financeiro (despesas/créditos/indevidas por filial),
-- hoje lida/escrita/deletada pela anon key (4 policies anon USING(true)). Mesmo molde de
-- frete_conferencia (031). Sem escritor externo (só o app usa).
-- Go-live (drop das 4 policies) = migration 038, SÓ após deploy + prova no API log.

-- ── LEITURA ──────────────────────────────────────────────────────────────────
-- p_mes_ref null => todas as despesas da base (Painel evolução); senão base+mês.
CREATE OR REPLACE FUNCTION public.listar_despesas(p_token text, p_base_id text, p_mes_ref text DEFAULT NULL)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM despesas_filial
    WHERE base_id = p_base_id AND (p_mes_ref IS NULL OR mes_ref = p_mes_ref)
    ORDER BY mes_ref ASC, grupo ASC, valor DESC
  ) t; END; $$;

CREATE OR REPLACE FUNCTION public.listar_meses_despesas(p_token text, p_base_id text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT DISTINCT mes_ref FROM despesas_filial WHERE base_id = p_base_id ORDER BY mes_ref DESC
  ) t; END; $$;

-- p_base_id null => global (todas as filiais); senão só a base.
CREATE OR REPLACE FUNCTION public.listar_indevidas_despesas(p_token text, p_base_id text DEFAULT NULL)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM despesas_filial
    WHERE indevida = true AND credito_match_id IS NULL
      AND (p_base_id IS NULL OR base_id = p_base_id)
    ORDER BY mes_ref ASC, dt_mov ASC, valor DESC
  ) t; END; $$;

CREATE OR REPLACE FUNCTION public.listar_creditos_despesas(p_token text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM despesas_filial WHERE tipo = 'credito' ORDER BY mes_ref DESC, dt_mov DESC
  ) t; END; $$;

-- ── ESCRITA ──────────────────────────────────────────────────────────────────
-- Insert em bloco (import ou manual — a origem vem em cada row). Colunas omitidas
-- (id, criado_em, atualizado_em) usam default.
CREATE OR REPLACE FUNCTION public.inserir_despesas_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY
    INSERT INTO despesas_filial (
      base_id, mes_ref, aba_origem, grupo, dt_mov, valor, nat_cod, natureza, conta,
      historico, tipo, incluir, dup_flag, indevida, origem)
    SELECT
      e->>'base_id', e->>'mes_ref', e->>'aba_origem', e->>'grupo',
      NULLIF(e->>'dt_mov','')::date, (e->>'valor')::numeric, e->>'nat_cod', e->>'natureza',
      e->>'conta', e->>'historico', coalesce(e->>'tipo','debito'),
      coalesce((e->>'incluir')::boolean, true), coalesce((e->>'dup_flag')::boolean, false),
      coalesce((e->>'indevida')::boolean, false), coalesce(e->>'origem','import')
    FROM jsonb_array_elements(p_rows) e
    RETURNING row_to_json(despesas_filial.*); END; $$;

-- Patch dinâmico (edição manual + indevida/crédito/cobrança). atualizado_em = now() sempre.
CREATE OR REPLACE FUNCTION public.atualizar_despesa(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_set text; v_row despesas_filial;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  SELECT string_agg(
    CASE
      WHEN k = 'valor' THEN format('%I = ($1->>%L)::numeric', k, k)
      WHEN k IN ('incluir','dup_flag','indevida') THEN format('%I = ($1->>%L)::boolean', k, k)
      WHEN k = 'dt_mov' THEN format('%I = NULLIF($1->>%L,'''')::date', k, k)
      WHEN k = 'credito_match_id' THEN format('%I = NULLIF($1->>%L,'''')::uuid', k, k)
      WHEN k IN ('recuperado_em','cobrado_em') THEN format('%I = NULLIF($1->>%L,'''')::timestamptz', k, k)
      ELSE format('%I = ($1->>%L)', k, k)
    END, ', ')
  INTO v_set
  FROM unnest(ARRAY['grupo','dt_mov','valor','nat_cod','natureza','conta','historico','tipo',
    'incluir','dup_flag','indevida','credito_match_id','recuperado_em','cobrado_em',
    'cobranca_obs','aba_origem','base_id','mes_ref']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(d) FROM despesas_filial d WHERE id=p_id); END IF;
  EXECUTE format('UPDATE despesas_filial SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row); END; $$;

CREATE OR REPLACE FUNCTION public.excluir_despesa(p_token text, p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  DELETE FROM despesas_filial WHERE id = p_id; END; $$;

CREATE OR REPLACE FUNCTION public.excluir_despesas(p_token text, p_ids uuid[])
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  DELETE FROM despesas_filial WHERE id = ANY(p_ids); END; $$;

-- ── GRANTS ───────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.listar_despesas(text,text,text)          FROM public;
REVOKE ALL ON FUNCTION public.listar_meses_despesas(text,text)         FROM public;
REVOKE ALL ON FUNCTION public.listar_indevidas_despesas(text,text)     FROM public;
REVOKE ALL ON FUNCTION public.listar_creditos_despesas(text)           FROM public;
REVOKE ALL ON FUNCTION public.inserir_despesas_lote(text,jsonb)        FROM public;
REVOKE ALL ON FUNCTION public.atualizar_despesa(text,uuid,jsonb)       FROM public;
REVOKE ALL ON FUNCTION public.excluir_despesa(text,uuid)               FROM public;
REVOKE ALL ON FUNCTION public.excluir_despesas(text,uuid[])            FROM public;
GRANT EXECUTE ON FUNCTION public.listar_despesas(text,text,text)        TO anon;
GRANT EXECUTE ON FUNCTION public.listar_meses_despesas(text,text)       TO anon;
GRANT EXECUTE ON FUNCTION public.listar_indevidas_despesas(text,text)   TO anon;
GRANT EXECUTE ON FUNCTION public.listar_creditos_despesas(text)         TO anon;
GRANT EXECUTE ON FUNCTION public.inserir_despesas_lote(text,jsonb)      TO anon;
GRANT EXECUTE ON FUNCTION public.atualizar_despesa(text,uuid,jsonb)     TO anon;
GRANT EXECUTE ON FUNCTION public.excluir_despesa(text,uuid)             TO anon;
GRANT EXECUTE ON FUNCTION public.excluir_despesas(text,uuid[])          TO anon;

-- ── 038 GO-LIVE (aplicar SÓ após deploy + prova no API log) ─────────────────
-- DROP POLICY IF EXISTS anon_read_despesas  ON despesas_filial;
-- DROP POLICY IF EXISTS anon_write_despesas ON despesas_filial;
-- DROP POLICY IF EXISTS anon_upd_despesas   ON despesas_filial;
-- DROP POLICY IF EXISTS anon_del_despesas   ON despesas_filial;
