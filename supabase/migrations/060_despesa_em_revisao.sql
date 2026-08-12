-- =============================================
-- Migration 060: despesa "em revisão" (dúvida antes de decidir)
-- =============================================
-- A despesa só tinha os dois estados FINAIS: correta (incluir) ou indevida (aguardar crédito).
-- Faltava o meio do caminho — "achei estranho, vou verificar e decido depois". Sem isso, quem
-- conferia tinha que decidir na hora ou anotar fora do app, e o caso sumia da tela.
-- Pedido do Yves em 12/08/2026, olhando duas linhas iguais de R$ 670,24 marcadas DUPLICIDADE?.
--
-- em_revisao NÃO muda número nenhum: a despesa continua entrando (ou não) no resultado como
-- já estava. É só a marca de "isto ainda vai ser conferido", igual às flags da Conferência de
-- Faturamento — decidir é sempre ato humano, e depois vira incluir/indevida.

ALTER TABLE despesas_filial
  ADD COLUMN IF NOT EXISTS em_revisao  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisao_obs text,
  ADD COLUMN IF NOT EXISTS revisao_por text,
  ADD COLUMN IF NOT EXISTS revisao_em  timestamptz;

COMMENT ON COLUMN despesas_filial.em_revisao IS
  'Marcada para conferir depois. Nao altera o calculo; ao decidir (correta/indevida) volta a false.';

CREATE INDEX IF NOT EXISTS idx_despesas_em_revisao ON despesas_filial (base_id, em_revisao)
  WHERE em_revisao;

-- A whitelist do patch precisa aceitar os campos novos, senão a tela salva e nada muda.
CREATE OR REPLACE FUNCTION public.atualizar_despesa(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_set text; v_row despesas_filial;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  SELECT string_agg(
    CASE
      WHEN k = 'valor' THEN format('%I = ($1->>%L)::numeric', k, k)
      WHEN k IN ('incluir','dup_flag','indevida','em_revisao') THEN format('%I = ($1->>%L)::boolean', k, k)
      WHEN k = 'dt_mov' THEN format('%I = NULLIF($1->>%L,'''')::date', k, k)
      WHEN k = 'credito_match_id' THEN format('%I = NULLIF($1->>%L,'''')::uuid', k, k)
      WHEN k = 'classe_credito' THEN format('%I = NULLIF($1->>%L,'''')', k, k)
      WHEN k IN ('recuperado_em','cobrado_em','revisao_em') THEN format('%I = NULLIF($1->>%L,'''')::timestamptz', k, k)
      ELSE format('%I = ($1->>%L)', k, k)
    END, ', ')
  INTO v_set
  FROM unnest(ARRAY['grupo','dt_mov','valor','nat_cod','natureza','conta','historico','tipo',
    'incluir','dup_flag','indevida','credito_match_id','recuperado_em','cobrado_em',
    'cobranca_obs','aba_origem','base_id','mes_ref','classe_credito',
    'em_revisao','revisao_obs','revisao_por','revisao_em']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(d) FROM despesas_filial d WHERE id=p_id); END IF;
  EXECUTE format('UPDATE despesas_filial SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row); END; $function$;
