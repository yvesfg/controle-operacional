-- =============================================
-- Migration 078: transbordo — dois contratos no mesmo CTe
-- =============================================
-- REGRA DE NEGÓCIO (Yves, 01/09/2026): quando a carga precisa de TRANSBORDO, o TMS obriga a
-- emitir um contrato NOVO para o segundo veículo. Depois que o motorista descarrega, um dos
-- dois contratos é cancelado no TMS. Enquanto isso não acontece, o mesmo CTe fica com dois
-- lançamentos de contrato e o Saldo do relatório vem descontando os dois.
--
-- Casos reais em 08/2026 (base MAT):
--   • CTRC 35244 — contrato 27152 (R$ 11.000). Coluna "Valor Contrato Frete" mostra 11.000,
--     mas o Saldo veio -9.059,60 = 12.940,40 - 11.000 - 11.000 (desconto em dobro).
--   • CTRC 35188 — contratos 27094 + 27112 (R$ 8.000 cada). Aqui a própria coluna veio somada
--     (16.000) e o Saldo -6.588,48. Margem -70% nos dois.
--   • CTRC 35090 — contratos 26999 + 27038 no relatório, mas o Saldo já desconta um só
--     (margem 11,59%): nada a estornar, só marcar qual contrato cai.
--
-- MODELO: o CTe está certo — quem sobra é um LANÇAMENTO de contrato. Em vez de reescrever o
-- Saldo do TMS (que é a fonte), guarda-se um ESTORNO ao lado. Quem lê usa saldo_efetivo.
--   transbordo_estorno = 0        → linha normal, saldo_efetivo = saldo do TMS
--   transbordo_estorno > 0        → contrato descartado devolvido ao Saldo
--   transbordo_saldo_tms          → o Saldo do TMS no momento da decisão. Se a reimportação
--                                   trouxer outro Saldo, o TMS mexeu: o ajuste cai sozinho
--                                   (senão o estorno contaria duas vezes).

ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS transbordo_contrato_valido     text,
  ADD COLUMN IF NOT EXISTS transbordo_contrato_descartado text,
  ADD COLUMN IF NOT EXISTS transbordo_estorno             numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transbordo_saldo_tms           numeric,
  ADD COLUMN IF NOT EXISTS transbordo_em                  timestamptz,
  ADD COLUMN IF NOT EXISTS transbordo_por                 text;

COMMENT ON COLUMN frete_conferencia.transbordo_estorno IS
  'Valor do contrato descartado no transbordo, devolvido ao Saldo. 0 = linha normal.';
COMMENT ON COLUMN frete_conferencia.transbordo_saldo_tms IS
  'Saldo do TMS quando o ajuste foi feito. Reimportacao com Saldo diferente derruba o ajuste.';

-- Saldo que vale para totais/comissão/exportação. Coluna gerada: qualquer SQL fora do app
-- (relatório, conferência manual) enxerga o mesmo número da tela.
ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS saldo_efetivo numeric
  GENERATED ALWAYS AS (coalesce(saldo, 0) + coalesce(transbordo_estorno, 0)) STORED;

-- ── Marcar o transbordo ───────────────────────────────────────────────────────
-- p_estorno = valor do contrato descartado que ENTROU no Saldo (0 quando o TMS já descontou
-- um só e o número está certo — aí o registro serve só para apontar qual contrato cai).
-- Margem e flags são recalculadas pelo saldo efetivo, senão a linha volta para a fila
-- de margem negativa toda vez que a tela recarrega.
CREATE OR REPLACE FUNCTION public.marcar_transbordo_frete(
  p_token text, p_id uuid, p_valido text, p_descartado text,
  p_estorno numeric, p_por text DEFAULT NULL, p_obs text DEFAULT NULL)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row frete_conferencia; v_margem numeric; v_flex boolean;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  SELECT * INTO v_row FROM frete_conferencia WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CTe nao encontrado' USING ERRCODE='P0001'; END IF;

  v_flex := v_row.categoria IN ('diaria','descarga','bonificacao','diaria_emitida');
  v_margem := CASE WHEN coalesce(v_row.frete_peso,0) > 0
    THEN round(((coalesce(v_row.saldo,0) + coalesce(p_estorno,0)) / v_row.frete_peso) * 100, 2)
    ELSE 0 END;

  UPDATE frete_conferencia SET
    transbordo_contrato_valido     = nullif(btrim(coalesce(p_valido,'')), ''),
    transbordo_contrato_descartado = nullif(btrim(coalesce(p_descartado,'')), ''),
    transbordo_estorno             = coalesce(p_estorno, 0),
    transbordo_saldo_tms           = coalesce(saldo, 0),
    transbordo_em                  = now(),
    transbordo_por                 = p_por,
    margem_lucro                   = v_margem,
    flag_negativa                  = (NOT v_flex) AND v_margem < 0,
    flag_baixa                     = (NOT v_flex) AND v_margem >= 0 AND v_margem < 10,
    -- Item já sinalizado pra correção CONTINUA sinalizado: o contrato ainda precisa ser
    -- cancelado no TMS e some da lista se a decisão for trocada aqui. O ajuste do Saldo é
    -- independente do acompanhamento da correção na origem.
    decisao_manual = CASE WHEN decisao_manual = 'sinalizar_correcao' THEN decisao_manual
                          ELSE 'transbordo_ajustado' END,
    revisado_em    = CASE WHEN decisao_manual = 'sinalizar_correcao' THEN revisado_em ELSE now() END,
    revisado_por   = CASE WHEN decisao_manual = 'sinalizar_correcao' THEN revisado_por ELSE p_por END,
    revisado_obs   = CASE WHEN decisao_manual = 'sinalizar_correcao' THEN revisado_obs ELSE p_obs END,
    atualizado_em                  = now()
  WHERE id = p_id RETURNING * INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;

REVOKE ALL ON FUNCTION public.marcar_transbordo_frete(text,uuid,text,text,numeric,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.marcar_transbordo_frete(text,uuid,text,text,numeric,text,text) TO anon;

-- ── Desfazer ──────────────────────────────────────────────────────────────────
-- Volta a linha ao número cru do TMS e devolve à fila se a margem ainda estiver ruim.
CREATE OR REPLACE FUNCTION public.limpar_transbordo_frete(p_token text, p_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row frete_conferencia; v_margem numeric; v_flex boolean;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  SELECT * INTO v_row FROM frete_conferencia WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CTe nao encontrado' USING ERRCODE='P0001'; END IF;

  v_flex := v_row.categoria IN ('diaria','descarga','bonificacao','diaria_emitida');
  v_margem := CASE WHEN coalesce(v_row.frete_peso,0) > 0
    THEN round((coalesce(v_row.saldo,0) / v_row.frete_peso) * 100, 2) ELSE 0 END;

  UPDATE frete_conferencia SET
    transbordo_contrato_valido = NULL, transbordo_contrato_descartado = NULL,
    transbordo_estorno = 0, transbordo_saldo_tms = NULL,
    transbordo_em = NULL, transbordo_por = NULL,
    margem_lucro  = v_margem,
    flag_negativa = (NOT v_flex) AND v_margem < 0,
    flag_baixa    = (NOT v_flex) AND v_margem >= 0 AND v_margem < 10,
    decisao_manual = CASE WHEN decisao_manual = 'transbordo_ajustado' THEN NULL ELSE decisao_manual END,
    revisado_em    = CASE WHEN decisao_manual = 'transbordo_ajustado' THEN NULL ELSE revisado_em END,
    revisado_por   = CASE WHEN decisao_manual = 'transbordo_ajustado' THEN NULL ELSE revisado_por END,
    revisado_obs   = CASE WHEN decisao_manual = 'transbordo_ajustado' THEN NULL ELSE revisado_obs END,
    atualizado_em  = now()
  WHERE id = p_id RETURNING * INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;

REVOKE ALL ON FUNCTION public.limpar_transbordo_frete(text,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.limpar_transbordo_frete(text,uuid) TO anon;

-- ── Reimportação: o ajuste cai sozinho quando o TMS corrige ───────────────────
-- Mesma função da migration 031/058, com o bloco de transbordo:
--   • Saldo do TMS mudou desde o ajuste  → o TMS cancelou o contrato (ou mexeu no valor):
--     zera o estorno e deixa margem/flags virem do app, calculadas sobre o Saldo novo.
--   • Saldo do TMS igual ao do ajuste    → nada mudou lá: mantém o estorno e recalcula
--     margem/flags pelo saldo efetivo (o app manda a margem crua e ela ficaria negativa).
CREATE OR REPLACE FUNCTION public.atualizar_frete_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY
    WITH src AS (SELECT elem FROM jsonb_array_elements(p_rows) AS t(elem)),
    calc AS (
      SELECT f.id,
        (s.elem->>'saldo')::numeric AS saldo_novo,
        -- ajuste continua valendo só enquanto o Saldo do TMS for o mesmo de quando foi feito
        (coalesce(f.transbordo_estorno,0) <> 0
         AND f.transbordo_saldo_tms IS NOT DISTINCT FROM (s.elem->>'saldo')::numeric) AS mantem,
        s.elem AS e
      FROM frete_conferencia f JOIN src s ON f.id = (s.elem->>'id')::uuid
    )
    UPDATE frete_conferencia f SET
      data_emissao         = nullif(c.e->>'data_emissao','')::date,
      trecho               = c.e->>'trecho',
      nfs                  = c.e->>'nfs',
      placa                = c.e->>'placa',
      nome_usuario         = c.e->>'nome_usuario',
      numero_manifesto     = c.e->>'numero_manifesto',
      numero_contrato      = c.e->>'numero_contrato',
      valor_nf             = (c.e->>'valor_nf')::numeric,
      peso_nf              = (c.e->>'peso_nf')::numeric,
      frete_peso           = (c.e->>'frete_peso')::numeric,
      total_frete          = (c.e->>'total_frete')::numeric,
      valor_contrato_frete = (c.e->>'valor_contrato_frete')::numeric,
      saldo                = c.saldo_novo,
      transbordo_estorno   = CASE WHEN c.mantem THEN f.transbordo_estorno ELSE 0 END,
      transbordo_contrato_valido     = CASE WHEN c.mantem THEN f.transbordo_contrato_valido ELSE NULL END,
      transbordo_contrato_descartado = CASE WHEN c.mantem THEN f.transbordo_contrato_descartado ELSE NULL END,
      transbordo_saldo_tms = CASE WHEN c.mantem THEN f.transbordo_saldo_tms ELSE NULL END,
      transbordo_em        = CASE WHEN c.mantem THEN f.transbordo_em ELSE NULL END,
      transbordo_por       = CASE WHEN c.mantem THEN f.transbordo_por ELSE NULL END,
      decisao_manual       = CASE WHEN NOT c.mantem AND f.decisao_manual = 'transbordo_ajustado'
                                  THEN NULL ELSE f.decisao_manual END,
      margem_lucro         = CASE
        WHEN c.mantem AND coalesce((c.e->>'frete_peso')::numeric,0) > 0
          THEN round(((c.saldo_novo + f.transbordo_estorno) / (c.e->>'frete_peso')::numeric) * 100, 2)
        ELSE (c.e->>'margem_lucro')::numeric END,
      flag_negativa        = CASE
        WHEN c.mantem THEN (f.categoria NOT IN ('diaria','descarga','bonificacao','diaria_emitida'))
          AND (c.saldo_novo + f.transbordo_estorno) < 0
        ELSE coalesce((c.e->>'flag_negativa')::boolean,false) END,
      flag_baixa           = CASE
        WHEN c.mantem THEN (f.categoria NOT IN ('diaria','descarga','bonificacao','diaria_emitida'))
          AND (c.saldo_novo + f.transbordo_estorno) >= 0
          AND coalesce((c.e->>'frete_peso')::numeric,0) > 0
          AND ((c.saldo_novo + f.transbordo_estorno) / (c.e->>'frete_peso')::numeric) * 100 < 10
        ELSE coalesce((c.e->>'flag_baixa')::boolean,false) END,
      flag_ambigua         = coalesce((c.e->>'flag_ambigua')::boolean,false),
      flag_sem_contrato    = CASE WHEN f.contrato_ref IS NOT NULL THEN false
                                  ELSE coalesce((c.e->>'flag_sem_contrato')::boolean,false) END,
      flag_duplicidade     = coalesce((c.e->>'flag_duplicidade')::boolean,false),
      dup_grupo_chave      = c.e->>'dup_grupo_chave',
      atualizado_em        = now()
    FROM calc c
    WHERE f.id = c.id
    RETURNING row_to_json(f.*); END; $function$;

-- editar_frete (admin) precisa enxergar os campos novos, senão uma correção de valores
-- deixa o estorno pendurado sem ninguém conseguir mexer por lá.
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
      WHEN k IN ('valor_nf','peso_nf','frete_peso','total_frete','valor_contrato_frete','saldo','margem_lucro','transbordo_estorno','transbordo_saldo_tms')
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
    'is_devolucao','modalidade','periodo_ref','categoria_manual','competencia_ref','contrato_ref',
    'transbordo_contrato_valido','transbordo_contrato_descartado','transbordo_estorno','transbordo_saldo_tms']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM frete_conferencia m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE frete_conferencia SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;
