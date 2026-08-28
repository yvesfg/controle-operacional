-- 077 · Ordem estável nas RPCs de listagem por período (paginação)
--
-- Motivo: o PostgREST corta a resposta em 1000 linhas (db-max-rows) e não avisa — vale
-- também para RPC que retorna SETOF. A Conferência de Faturamento pedia 3 meses numa
-- chamada só (1.549 linhas em 06-08/2026) e recebia 1.000, então o mês corrente aparecia
-- pela metade no comparativo (08/2026: 108 CTRCs / R$ 493.558,90 no lugar de 492 CTRCs /
-- R$ 2.854.056,28) sem nenhum erro na tela.
--
-- O app passou a paginar (limit/offset) por período. Paginar sem ORDER BY determinístico
-- pode repetir ou perder linha entre páginas, então as funções ganham ordem por `id`
-- (e `id` como desempate onde já havia ordenação). Só a cláusula ORDER BY muda.

CREATE OR REPLACE FUNCTION public.listar_frete_periodos(p_token text, p_periodos text[], p_cliente text DEFAULT NULL::text)
 RETURNS SETOF json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM frete_conferencia
    WHERE periodo_ref = ANY(p_periodos)
      AND (p_cliente IS NULL OR cliente = p_cliente)
    ORDER BY id
  ) t; END; $function$;

CREATE OR REPLACE FUNCTION public.listar_contratos_periodos(p_token text, p_periodos text[])
 RETURNS SETOF json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM frete_contratos
     WHERE periodo_ref = ANY(p_periodos)
     ORDER BY data_emissao, contrato, id
  ) t; END; $function$;
