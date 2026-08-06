-- =============================================
-- Migration 050: crédito = estorno de despesa OU receita
-- =============================================
-- Até aqui TODO valor negativo da planilha de débitos virava tipo='credito' e abatia a
-- despesa do mês (Resultado.jsx: despLiq = débitos + créditos), o que joga o negativo
-- direto no resultado como se fosse lucro operacional. Só que os negativos são de duas
-- naturezas MUITO diferentes:
--
--   estorno — dinheiro que volta de uma despesa que a empresa pagou (devolução de
--             fornecedor, frete pago a maior, peça devolvida). Abate despesa: certo.
--   receita — dinheiro que ENTRA por outra via (indenização de sinistro, venda de
--             gancho/cinta, venda de avaria, CTe faturado). Não é despesa negativa;
--             tratar como tal infla o Resultado.
--
-- Caso que motivou: julho/2026 traz −R$ 93.838,50 de "Receitas com Sinistro" (Berkley) na
-- aba AÇA. Sozinho ele derruba a despesa de Açailândia de R$ 88.250,79 para −R$ 8.174,99
-- (despesa negativa) e sobe o Resultado em R$ 96.425,78. Mesmo padrão já gravado em
-- 03/2026 (−58.613,19 de sinistro) e 04/2026 (−284.211,47 em linhas "CTE .../...").
--
-- Coluna só faz sentido para tipo='credito'; débito fica NULL.
-- Default 'estorno' = o comportamento de hoje, então nada muda sozinho: só as naturezas
-- reconhecidas como receita saem do cálculo de despesa.

ALTER TABLE despesas_filial
  ADD COLUMN IF NOT EXISTS classe_credito text;

ALTER TABLE despesas_filial
  DROP CONSTRAINT IF EXISTS despesas_filial_classe_credito_chk;
ALTER TABLE despesas_filial
  ADD CONSTRAINT despesas_filial_classe_credito_chk
  CHECK (classe_credito IS NULL OR classe_credito IN ('estorno','receita'));

COMMENT ON COLUMN despesas_filial.classe_credito IS
  'Só para tipo=credito: estorno (abate a despesa do mês) ou receita (fica fora do cálculo de despesa, entra só como indicador). NULL em débitos.';

-- ── Backfill dos créditos já gravados ────────────────────────────────────────
-- Mesma regra do parser (src/despesas.js, ehReceita): natureza começando com
-- "Receita", "Venda" ou "CTE " é receita; todo o resto é estorno. Conservador de
-- propósito — só reclassifica o que é inequívoco, o resto continua abatendo despesa
-- e pode ser corrigido linha a linha no ModalDespesa.
UPDATE despesas_filial
   SET classe_credito = CASE
         WHEN coalesce(natureza,'') ~* '^\s*(receita|venda|cte )' THEN 'receita'
         ELSE 'estorno' END
 WHERE tipo = 'credito' AND classe_credito IS NULL;

-- ── RPCs (037) precisam conhecer a coluna nova ───────────────────────────────
-- Insert: crédito sem classe explícita cai em 'estorno' (comportamento atual);
-- débito nunca recebe classe.
CREATE OR REPLACE FUNCTION public.inserir_despesas_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY
    INSERT INTO despesas_filial (
      base_id, mes_ref, aba_origem, grupo, dt_mov, valor, nat_cod, natureza, conta,
      historico, tipo, incluir, dup_flag, indevida, origem, classe_credito)
    SELECT
      e->>'base_id', e->>'mes_ref', e->>'aba_origem', e->>'grupo',
      NULLIF(e->>'dt_mov','')::date, (e->>'valor')::numeric, e->>'nat_cod', e->>'natureza',
      e->>'conta', e->>'historico', coalesce(e->>'tipo','debito'),
      coalesce((e->>'incluir')::boolean, true), coalesce((e->>'dup_flag')::boolean, false),
      coalesce((e->>'indevida')::boolean, false), coalesce(e->>'origem','import'),
      CASE WHEN coalesce(e->>'tipo','debito') = 'credito'
           THEN coalesce(NULLIF(e->>'classe_credito',''), 'estorno') END
    FROM jsonb_array_elements(p_rows) e
    RETURNING row_to_json(despesas_filial.*); END; $$;

-- Patch: só acrescenta 'classe_credito' à whitelist de colunas editáveis.
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
      WHEN k = 'classe_credito' THEN format('%I = NULLIF($1->>%L,'''')', k, k)
      WHEN k IN ('recuperado_em','cobrado_em') THEN format('%I = NULLIF($1->>%L,'''')::timestamptz', k, k)
      ELSE format('%I = ($1->>%L)', k, k)
    END, ', ')
  INTO v_set
  FROM unnest(ARRAY['grupo','dt_mov','valor','nat_cod','natureza','conta','historico','tipo',
    'incluir','dup_flag','indevida','credito_match_id','recuperado_em','cobrado_em',
    'cobranca_obs','aba_origem','base_id','mes_ref','classe_credito']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(d) FROM despesas_filial d WHERE id=p_id); END IF;
  EXECUTE format('UPDATE despesas_filial SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row); END; $$;
