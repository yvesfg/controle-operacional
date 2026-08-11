-- =============================================
-- Migration 055: relatório de CONTRATOS de frete (o outro lado do CTe)
-- =============================================
-- O relatório de CTes (frete_conferencia) mostra o que se COBRA do cliente; ele não diz
-- quem levou a carga nem quanto custou de encargo. Quem tem isso é o relatório de contratos
-- do TMS, que traz por contrato: CPF/CNPJ do agregado (11 dígitos = pessoa física),
-- Valor INSS, SEST/SENAT, Custos Externos e o número do CTe emitido (CTe Ctrc) — a chave
-- que casa 1:1 com frete_conferencia.ctrc.
--
-- POR QUE IMPORTA (medido no relatório de 01-06/08/2026, empresa MAT, 54 linhas):
--   • 35 contratos com pessoa física, 19 com PJ; nenhum PJ tem encargo (correto);
--   • INSS = 2,2% e SEST/SENAT = 0,5% do contrato, sempre presentes nos 32 PF com valor;
--   • Custos Externos = 4,00% do contrato, mas presente em só 13 dos 32 — R$ 4.587,49 de
--     encargo patronal não lançado em 6 dias, que hoje não aparece em lugar nenhum e faz a
--     margem do frete parecer melhor do que é;
--   • CTRC 34939: o CTe veio com contrato ZERADO (a flag_sem_contrato da migration 052 pegou)
--     e o contrato existe aqui, R$ 10.284,52 — o cruzamento resolve o que a flag só aponta.
--
-- MAT é a MATRIZ e mistura clientes (Imperatriz, Açailândia, Maranhão Ind. de Couros), então
-- o casamento é sempre por CTRC + empresa, nunca por cliente. A filial do Pará (MAR) sai em
-- relatório separado e entra na mesma tabela.
--
-- Acesso: igual frete_conferencia — RLS ligado e SEM policy, tudo passa por RPC
-- SECURITY DEFINER validando o token de sessão (nada de REST anon aqui).

CREATE TABLE IF NOT EXISTS frete_contratos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_emissao   text NOT NULL,              -- MAT (matriz) | MAR (filial PA) | ...
  contrato          text NOT NULL,              -- "Contrato de Frete"
  periodo_ref       text NOT NULL,              -- YYYY-MM da data de emissão do contrato
  data_emissao      date,
  -- CTe gerado a partir deste contrato (chave do cruzamento)
  cte_ctrc          text,
  cte_empresa       text,
  cte_serie         text,
  -- quem levou
  cpf_cnpj          text,                       -- só dígitos
  eh_pf             boolean NOT NULL DEFAULT false,  -- 11 dígitos = pessoa física (TAC)
  nome_agregado     text,
  motorista         text,
  veiculo           text,                       -- placa
  trecho            text,
  -- dinheiro do contrato (o que se paga)
  valor             numeric DEFAULT 0,          -- "Valor" = contrato do motorista
  valor_pedagio     numeric DEFAULT 0,
  adiantamento      numeric DEFAULT 0,
  outras_deducoes   numeric DEFAULT 0,
  valor_saldo_carta numeric DEFAULT 0,
  data_baixa        date,
  status            text,
  -- encargos de pessoa física
  valor_inss        numeric DEFAULT 0,          -- 2,2% do contrato (11% sobre base de 20%)
  sest_senat        numeric DEFAULT 0,          -- 0,5% do contrato (2,5% sobre a mesma base)
  custos_externos   numeric DEFAULT 0,          -- 4% do contrato (patronal) — o que mais falta
  -- espelho do faturamento, pra conferir contra o CTe sem depender do outro relatório
  valor_total_frete numeric DEFAULT 0,
  valor_icms        numeric DEFAULT 0,
  valor_frete_peso  numeric DEFAULT 0,
  criado_em         timestamptz DEFAULT now(),
  atualizado_em     timestamptz DEFAULT now()
);

-- Um contrato pode ratear em mais de um CTe (o TMS repete a linha por CTe), então a chave
-- inclui o CTRC. Contrato sem CTe emitido ainda entra uma vez só.
CREATE UNIQUE INDEX IF NOT EXISTS uq_frete_contratos_doc
  ON frete_contratos (empresa_emissao, contrato, coalesce(cte_ctrc, ''));
CREATE INDEX IF NOT EXISTS idx_frete_contratos_periodo ON frete_contratos (periodo_ref);
-- O cruzamento entra por aqui: CTRC + empresa do CTe.
CREATE INDEX IF NOT EXISTS idx_frete_contratos_cte ON frete_contratos (cte_ctrc, cte_empresa);

ALTER TABLE frete_contratos ENABLE ROW LEVEL SECURITY;
-- Sem policy de propósito: só as RPCs abaixo (SECURITY DEFINER) enxergam a tabela.

-- ── RPCs ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.listar_contratos_periodos(p_token text, p_periodos text[])
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM frete_contratos
     WHERE periodo_ref = ANY(p_periodos)
     ORDER BY data_emissao, contrato
  ) t; END; $function$;

-- Insere o lote já deduplicado no cliente. ON CONFLICT atualiza os valores: reimportar o
-- mesmo período com o relatório corrigido (ex.: depois de lançar os Custos Externos que
-- faltavam) tem que refletir, senão a conferência ficaria presa na primeira versão.
CREATE OR REPLACE FUNCTION public.inserir_contratos_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY
    INSERT INTO frete_contratos (
      empresa_emissao, contrato, periodo_ref, data_emissao, cte_ctrc, cte_empresa, cte_serie,
      cpf_cnpj, eh_pf, nome_agregado, motorista, veiculo, trecho,
      valor, valor_pedagio, adiantamento, outras_deducoes, valor_saldo_carta, data_baixa, status,
      valor_inss, sest_senat, custos_externos,
      valor_total_frete, valor_icms, valor_frete_peso)
    SELECT
      e->>'empresa_emissao', e->>'contrato', e->>'periodo_ref', nullif(e->>'data_emissao','')::date,
      nullif(e->>'cte_ctrc',''), e->>'cte_empresa', e->>'cte_serie',
      e->>'cpf_cnpj', coalesce((e->>'eh_pf')::boolean, false), e->>'nome_agregado', e->>'motorista',
      e->>'veiculo', e->>'trecho',
      (e->>'valor')::numeric, (e->>'valor_pedagio')::numeric, (e->>'adiantamento')::numeric,
      (e->>'outras_deducoes')::numeric, (e->>'valor_saldo_carta')::numeric,
      nullif(e->>'data_baixa','')::date, e->>'status',
      (e->>'valor_inss')::numeric, (e->>'sest_senat')::numeric, (e->>'custos_externos')::numeric,
      (e->>'valor_total_frete')::numeric, (e->>'valor_icms')::numeric, (e->>'valor_frete_peso')::numeric
    FROM jsonb_array_elements(p_rows) e
    ON CONFLICT (empresa_emissao, contrato, coalesce(cte_ctrc, '')) DO UPDATE SET
      periodo_ref = EXCLUDED.periodo_ref, data_emissao = EXCLUDED.data_emissao,
      cte_empresa = EXCLUDED.cte_empresa, cte_serie = EXCLUDED.cte_serie,
      cpf_cnpj = EXCLUDED.cpf_cnpj, eh_pf = EXCLUDED.eh_pf, nome_agregado = EXCLUDED.nome_agregado,
      motorista = EXCLUDED.motorista, veiculo = EXCLUDED.veiculo, trecho = EXCLUDED.trecho,
      valor = EXCLUDED.valor, valor_pedagio = EXCLUDED.valor_pedagio,
      adiantamento = EXCLUDED.adiantamento, outras_deducoes = EXCLUDED.outras_deducoes,
      valor_saldo_carta = EXCLUDED.valor_saldo_carta, data_baixa = EXCLUDED.data_baixa,
      status = EXCLUDED.status, valor_inss = EXCLUDED.valor_inss, sest_senat = EXCLUDED.sest_senat,
      custos_externos = EXCLUDED.custos_externos, valor_total_frete = EXCLUDED.valor_total_frete,
      valor_icms = EXCLUDED.valor_icms, valor_frete_peso = EXCLUDED.valor_frete_peso,
      atualizado_em = now()
    RETURNING row_to_json(frete_contratos.*); END; $function$;

CREATE OR REPLACE FUNCTION public.excluir_contrato(p_token text, p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  DELETE FROM frete_contratos WHERE id = p_id; END; $function$;

REVOKE ALL ON FUNCTION public.listar_contratos_periodos(text,text[]) FROM public;
REVOKE ALL ON FUNCTION public.inserir_contratos_lote(text,jsonb) FROM public;
REVOKE ALL ON FUNCTION public.excluir_contrato(text,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.listar_contratos_periodos(text,text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.inserir_contratos_lote(text,jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.excluir_contrato(text,uuid) TO anon;
