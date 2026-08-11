-- =============================================
-- Migration 058: vincular à mão um contrato ao CTe
-- =============================================
-- O relatório de CTes traz "Nº Contrato Frete" vazio (ou 0) quando o TMS não amarrou os dois,
-- e aí o CTe aparece com contrato zerado e margem 100% mesmo existindo contrato lançado.
-- Caso real: CTRC 34939 (AVB) chegou com contrato 0, mas o relatório de CONTRATOS tem o
-- contrato 26844 (ARISUL, R$ 10.284,52) apontando exatamente para esse CTe — mesma placa,
-- mesmo trecho, mesma data. Faltava só o vínculo.
--
-- MODELO: coluna `contrato_ref` separada do `numero_contrato`. O número do TMS NÃO é
-- sobrescrito — se amanhã o relatório vier corrigido, dá pra ver que os dois batem (ou não).
-- Quem lê usa o vinculado quando existe, senão o do TMS.
--   contrato_ref NULL  → nada vinculado à mão (estado normal)
--   contrato_ref '...' → alguém apontou o contrato; flag_sem_contrato sai da fila

ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS contrato_ref         text,
  ADD COLUMN IF NOT EXISTS contrato_vinculo_em  timestamptz,
  ADD COLUMN IF NOT EXISTS contrato_vinculo_por text;

COMMENT ON COLUMN frete_conferencia.contrato_ref IS
  'Contrato apontado a mao quando o TMS nao amarrou (numero_contrato vazio/0). Nao sobrescreve o numero do TMS.';

-- Autz = sessão válida (é decisão de conferência, como decidir/vincular_cte — não é edição
-- de valores, que segue só admin em editar_frete).
-- p_contrato NULL/'' desfaz o vínculo e devolve a linha à regra automática.
CREATE OR REPLACE FUNCTION public.vincular_contrato_frete(p_token text, p_id uuid, p_contrato text, p_por text DEFAULT NULL)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row frete_conferencia; v_ref text;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  v_ref := nullif(btrim(coalesce(p_contrato, '')), '');
  SELECT * INTO v_row FROM frete_conferencia WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CTe nao encontrado' USING ERRCODE='P0001'; END IF;

  UPDATE frete_conferencia SET
    contrato_ref = v_ref,
    contrato_vinculo_em  = CASE WHEN v_ref IS NULL THEN NULL ELSE now() END,
    contrato_vinculo_por = CASE WHEN v_ref IS NULL THEN NULL ELSE p_por END,
    -- Com contrato apontado, o CTe deixa de ser "sem contrato". Desfazendo, a flag volta
    -- pela mesma regra da importação (frete + contrato zerado + total > 0).
    flag_sem_contrato = CASE
      WHEN v_ref IS NOT NULL THEN false
      ELSE (v_row.categoria = 'frete' AND coalesce(v_row.valor_contrato_frete,0) = 0 AND coalesce(v_row.total_frete,0) > 0)
    END,
    atualizado_em = now()
  WHERE id = p_id RETURNING * INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;

REVOKE ALL ON FUNCTION public.vincular_contrato_frete(text,uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.vincular_contrato_frete(text,uuid,text,text) TO anon;

-- editar_frete passa a aceitar o campo (correção admin em lote, sem passar pelo modal).
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
    'is_devolucao','modalidade','periodo_ref','categoria_manual','competencia_ref','contrato_ref']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM frete_conferencia m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE frete_conferencia SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;
