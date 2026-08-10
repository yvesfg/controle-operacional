-- =============================================
-- Migration 053: mês de competência da diária emitida
-- =============================================
-- PROBLEMA: o CTe que cobra a diária sai no mês SEGUINTE ao pagamento, e às vezes UM CTe
-- cobra as diárias de um mês inteiro (caso real: CTRC 34942, emitido em 08/2026, R$ 38.800
-- cobrindo as diárias pagas em 07/2026). Como o app atribuía a emitida ao mês de EMISSÃO,
-- "quanto da diária voltou" só fechava no acumulado de 3 meses — nunca por mês.
--
-- MODELO: competencia_ref ('YYYY-MM') = o mês das diárias PAGAS que aquele CTe cobre.
-- Vazio (o caso normal) = a própria periodo_ref, o comportamento de antes. Um único campo
-- em vez de tabela N:N: a conferência precisa saber DE QUE MÊS é a cobrança, não amarrar
-- CTe a CTe (o TMS não dá esse elo, e a conciliação 1:1 já se mostrou inviável).
--
-- O vínculo 1:1 que já existe (tipo_doc='complementar' + ctrc_ref, migration 048) continua
-- valendo pro caso simples "este CTe cobra AQUELA diária"; competencia_ref cobre o 1:N.

ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS competencia_ref text;

COMMENT ON COLUMN frete_conferencia.competencia_ref IS
  'Diária emitida: mês (YYYY-MM) das diárias pagas que este CTe cobra. NULL = mês de emissão.';

-- ── RPC: define/limpa a competência ─────────────────────────────────────────────
-- Autz = sessão válida (é decisão de conferência, mesmo nível de decidir/vincular_cte —
-- não é edição de valores, que segue só admin via editar_frete).
CREATE OR REPLACE FUNCTION public.definir_competencia_frete(p_token text, p_id uuid, p_ref text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row frete_conferencia; v_ref text;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  v_ref := nullif(btrim(coalesce(p_ref, '')), '');
  IF v_ref IS NOT NULL AND v_ref !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Competência inválida: % (use YYYY-MM)', p_ref USING ERRCODE='P0001';
  END IF;
  SELECT * INTO v_row FROM frete_conferencia WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CTe não encontrado' USING ERRCODE='P0001'; END IF;
  IF v_row.categoria <> 'diaria_emitida' THEN
    RAISE EXCEPTION 'Competência só se aplica a diária emitida (categoria atual: %)', v_row.categoria USING ERRCODE='P0001';
  END IF;
  UPDATE frete_conferencia SET competencia_ref = v_ref, atualizado_em = now()
   WHERE id = p_id RETURNING * INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;

REVOKE ALL ON FUNCTION public.definir_competencia_frete(text,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.definir_competencia_frete(text,uuid,text) TO anon;

-- ── Edição admin: campo entra na whitelist ─────────────────────────────────────
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
    'is_devolucao','modalidade','periodo_ref','categoria_manual','competencia_ref']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM frete_conferencia m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE frete_conferencia SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;
