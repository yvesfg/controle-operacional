-- =============================================
-- Migration 079: Remetente/Destinatário, Deduções e tipo de carga no CTe
-- =============================================
-- ACHADO (01/09/2026, sobre o export "0108-3108 SUZ ITZ", 409 linhas): o relatório do TMS traz
-- colunas que a importação NUNCA leu — Remetente, Destinatario, Local de Coleta, Local de
-- Entrega e Valor Total Deduções. Duas consequências:
--
-- 1) PAPEL × CELULOSE. Hoje o tipo vem da planilha operacional (origem escrita como
--    "IMPERATRIZ-MA, CELULOSE") e chega na Conferência por cruzamento de CTe × DT. CTe sem DT
--    casado não entra em nenhum dos dois filtros. Medido em 08/2026, Suzano Imperatriz:
--      • Destinatário = SUZANO SA → 130 CTes de frete, R$ 1.314.097,57
--        (50 marcados celulose na planilha, 14 marcados papel POR ENGANO, 66 sem DT);
--      • Destinatário ≠ SUZANO SA → 118 CTes, R$ 1.010.262,93, ZERO marcados celulose.
--    Ou seja: o critério do destinatário reproduz 100% do que já estava marcado certo e
--    recupera os 80 que faltavam. A tela mostrava R$ 499.969,80 de celulose em vez de ~1,31 mi.
--    Regra: carga que sai e chega na MESMA empresa é transferência da fábrica (celulose);
--    o resto é venda (papel). Só trecho não resolve — IMPSLU também leva papel pro Armazém
--    Mateus (46 CTes no mesmo arquivo).
--
-- 2) DEDUÇÕES. Saldo = Total do Frete − Valor Total Deduções em 408 das 409 linhas. No CTRC
--    35244 (transbordo, migration 078) as deduções são R$ 22.000,00 = o contrato de R$ 11.000
--    duas vezes. Com a coluna importada, o excedente deixa de ser inferido por aritmética.

ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS remetente      text,
  ADD COLUMN IF NOT EXISTS destinatario   text,
  ADD COLUMN IF NOT EXISTS local_coleta   text,
  ADD COLUMN IF NOT EXISTS local_entrega  text,
  ADD COLUMN IF NOT EXISTS valor_deducoes numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_carga     text;

COMMENT ON COLUMN frete_conferencia.tipo_carga IS
  'Produto do CTe (papel/celulose), classificado na importacao pelo Remetente x Destinatario. NULL = importado antes da migration 079 (cai no cruzamento por DT).';
COMMENT ON COLUMN frete_conferencia.valor_deducoes IS
  'Coluna "Valor Total Deducoes" do TMS. Saldo = Total do Frete - Deducoes.';

CREATE INDEX IF NOT EXISTS idx_frete_conf_tipo_carga ON frete_conferencia (periodo_ref, tipo_carga);

-- Inserção: campos novos entram junto (linha sem eles continua válida — arquivo antigo,
-- sem as colunas, grava NULL/0 e a tela cai no cruzamento por DT como antes).
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
      is_devolucao, modalidade,
      remetente, destinatario, local_coleta, local_entrega, valor_deducoes, tipo_carga)
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
      coalesce((e->>'is_devolucao')::boolean,false), coalesce(e->>'modalidade','CIF'),
      e->>'remetente', e->>'destinatario', e->>'local_coleta', e->>'local_entrega',
      coalesce((e->>'valor_deducoes')::numeric, 0), e->>'tipo_carga'
    FROM jsonb_array_elements(p_rows) e
    RETURNING row_to_json(frete_conferencia.*); END; $function$;

-- Reimportação corretiva: é por ela que os meses já importados ganham destinatário e tipo.
-- Campo ausente no arquivo não apaga o que já existe (coalesce com o valor atual) — arquivo
-- antigo, sem as colunas novas, não desclassifica um CTe já classificado.
-- O bloco de transbordo da migration 078 segue intacto.
CREATE OR REPLACE FUNCTION public.atualizar_frete_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY
    WITH src AS (SELECT elem FROM jsonb_array_elements(p_rows) AS t(elem)),
    calc AS (
      SELECT f.id,
        (s.elem->>'saldo')::numeric AS saldo_novo,
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
      remetente            = coalesce(nullif(c.e->>'remetente',''),     f.remetente),
      destinatario         = coalesce(nullif(c.e->>'destinatario',''),  f.destinatario),
      local_coleta         = coalesce(nullif(c.e->>'local_coleta',''),  f.local_coleta),
      local_entrega        = coalesce(nullif(c.e->>'local_entrega',''), f.local_entrega),
      valor_deducoes       = coalesce((c.e->>'valor_deducoes')::numeric, f.valor_deducoes),
      tipo_carga           = coalesce(nullif(c.e->>'tipo_carga',''),    f.tipo_carga),
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

-- editar_frete (admin) enxerga os campos novos — inclusive pra corrigir à mão um tipo_carga
-- que a regra classificou errado (ex.: transferência que não é celulose).
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
      WHEN k IN ('valor_nf','peso_nf','frete_peso','total_frete','valor_contrato_frete','saldo','margem_lucro','transbordo_estorno','transbordo_saldo_tms','valor_deducoes')
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
    'transbordo_contrato_valido','transbordo_contrato_descartado','transbordo_estorno','transbordo_saldo_tms',
    'remetente','destinatario','local_coleta','local_entrega','valor_deducoes','tipo_carga']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM frete_conferencia m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE frete_conferencia SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;
