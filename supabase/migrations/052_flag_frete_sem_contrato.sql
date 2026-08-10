-- =============================================
-- Migration 052: flag "frete sem contrato" (Valor Contrato Frete = 0)
-- =============================================
-- PROBLEMA (achado em 10/08/2026, SUZANO FAB IMPERATRIZ): CTe de FRETE que chega do TMS
-- com Valor Contrato Frete = 0 fica com Saldo = o CTe inteiro e margem ~100%, inflando o
-- resultado do mês sem que ninguém veja. No mês 08/2026 dois CTes assim (34942 = R$ 38.800
-- e 34973 = R$ 568,18) respondiam por R$ 39.300 — 31% do saldo do cliente no mês; tirando
-- os dois, a margem do frete cai de 34,6% para 27,0%, em linha com 07/2026 (23,6%).
--
-- Nenhuma flag existente pegava esses casos:
--   • flag_baixa/flag_negativa   → margem ALTA não é alerta hoje;
--   • flag_ambigua               → só descarga/local (contrato 0) e candidato a diária emitida;
--   • régua da diária emitida    → tem teto de R$ 5.000 (o CTe de R$ 38.800 passa batido).
--
-- REGRA (idêntica no front, ver recalcularFlagsEPeriodo em src/freteConferencia.js):
--   categoria = 'frete' AND valor_contrato_frete = 0 AND total_frete > 0
-- Não é erro por definição (pode ser contrato ainda não lançado no TMS) — por isso é flag
-- de FILA DE REVISÃO, não bloqueio, e não muda nenhum somatório.

ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS flag_sem_contrato boolean NOT NULL DEFAULT false;

-- Backfill do histórico (78 linhas em 01-08/2026). Só entram na fila as do mês anterior
-- ao corrente pra cá (o filtro de período de listar_frete_pendentes não mudou), então o
-- backfill não ressuscita meses já fechados.
UPDATE frete_conferencia
   SET flag_sem_contrato = true
 WHERE categoria = 'frete'
   AND coalesce(valor_contrato_frete, 0) = 0
   AND coalesce(total_frete, 0) > 0
   AND flag_sem_contrato IS DISTINCT FROM true;

-- ── Fila de revisão: passa a considerar a flag nova ─────────────────────────────
CREATE OR REPLACE FUNCTION public.listar_frete_pendentes(p_token text, p_cliente text DEFAULT NULL::text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM frete_conferencia
    WHERE decisao_manual IS NULL
      AND periodo_ref >= to_char(date_trunc('month', now()) - interval '1 month','YYYY-MM')
      AND (flag_negativa OR flag_baixa OR flag_ambigua OR flag_duplicidade OR flag_sem_contrato)
      AND (p_cliente IS NULL OR cliente = p_cliente)
    ORDER BY periodo_ref DESC, margem_lucro ASC
  ) t; END; $function$;

-- ── Importação: grava a flag vinda do parser ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inserir_frete_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY
    INSERT INTO frete_conferencia (
      base_id, cliente, cnpj_remetente, categoria, periodo_ref, ctrc, empresa_cod,
      data_emissao, trecho, nfs, placa, nome_usuario, numero_manifesto, numero_contrato,
      valor_nf, peso_nf, frete_peso, total_frete, valor_contrato_frete, saldo, margem_lucro,
      flag_negativa, flag_baixa, flag_ambigua, flag_duplicidade, flag_sem_contrato, dup_grupo_chave,
      is_devolucao, modalidade)
    SELECT
      e->>'base_id', e->>'cliente', e->>'cnpj_remetente', e->>'categoria', e->>'periodo_ref',
      e->>'ctrc', e->>'empresa_cod', (e->>'data_emissao')::date, e->>'trecho', e->>'nfs',
      e->>'placa', e->>'nome_usuario', e->>'numero_manifesto', e->>'numero_contrato',
      (e->>'valor_nf')::numeric, (e->>'peso_nf')::numeric, (e->>'frete_peso')::numeric,
      (e->>'total_frete')::numeric, (e->>'valor_contrato_frete')::numeric, (e->>'saldo')::numeric,
      (e->>'margem_lucro')::numeric,
      coalesce((e->>'flag_negativa')::boolean,false), coalesce((e->>'flag_baixa')::boolean,false),
      coalesce((e->>'flag_ambigua')::boolean,false), coalesce((e->>'flag_duplicidade')::boolean,false),
      coalesce((e->>'flag_sem_contrato')::boolean,false),
      e->>'dup_grupo_chave',
      coalesce((e->>'is_devolucao')::boolean,false), coalesce(e->>'modalidade','CIF')
    FROM jsonb_array_elements(p_rows) e
    RETURNING row_to_json(frete_conferencia.*); END; $function$;

-- ── Edição admin: a flag entra na whitelist (o front recalcula ao salvar) ───────
CREATE OR REPLACE FUNCTION public.editar_frete(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid; v_perfil text; v_set text; v_row frete_conferencia;
BEGIN
  v_uid := _validar_token_e_base(p_token, null);
  SELECT perfil INTO v_perfil FROM co_usuarios WHERE id = v_uid;
  IF v_perfil IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode editar CTe' USING ERRCODE='P0001';
  END IF;
  SELECT string_agg(
    CASE
      WHEN k IN ('valor_nf','peso_nf','frete_peso','total_frete','valor_contrato_frete','saldo','margem_lucro')
        THEN format('%I = ($1->>%L)::numeric', k, k)
      WHEN k IN ('flag_negativa','flag_baixa','flag_ambigua','flag_duplicidade','flag_sem_contrato','is_devolucao','categoria_manual')
        THEN format('%I = ($1->>%L)::boolean', k, k)
      WHEN k = 'data_emissao'
        THEN format('%I = NULLIF($1->>%L,'''')::date', k, k)
      ELSE format('%I = ($1->>%L)', k, k)
    END, ', ')
  INTO v_set
  FROM unnest(ARRAY['cliente','base_id','cnpj_remetente','categoria','empresa_cod','data_emissao',
    'trecho','nfs','placa','nome_usuario','numero_manifesto','numero_contrato',
    'valor_nf','peso_nf','frete_peso','total_frete','valor_contrato_frete','saldo','margem_lucro',
    'flag_negativa','flag_baixa','flag_ambigua','flag_duplicidade','flag_sem_contrato','dup_grupo_chave',
    'is_devolucao','modalidade','periodo_ref','categoria_manual']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM frete_conferencia m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE frete_conferencia SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;
