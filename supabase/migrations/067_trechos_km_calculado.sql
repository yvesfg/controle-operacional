-- =============================================
-- Migration 067: distancia rodoviaria calculada, ao lado da distancia do TMS
-- =============================================
-- MOTIVO: nos relatorios de trechos de Belem e Imperatriz (19/08/2026) a coluna Distancia
-- e inservivel -- 230 das 298 rotas vieram ZERADAS, e varias das preenchidas estao erradas
-- por ordem de grandeza (BEM/SLU Belem->Sao Luis = 1 km; IMP/OLI Imperatriz->Olinda =
-- 17.136 km; IMP/DRD Dourados = 120 km). O relatorio de Acailandia nao tinha esse problema.
--
-- DECISAO: nao sobrescrever o que veio da fonte. `km` continua sendo o numero do TMS, tal
-- como exportado, e o calculado entra em coluna propria com a fonte declarada. Quem le
-- decide (o app prefere o calculado quando existe). Assim da para auditar a divergencia em
-- vez de descobrir tarde que um numero "oficial" era chute.
--
-- COMO E CALCULADO: geocodificacao da cidade no Nominatim (OpenStreetMap) + roteamento
-- rodoviario no OSRM publico -- os dois gratuitos e sem chave. Validacao antes de rodar:
-- Imperatriz->Sao Luis deu 631 km contra 633 do TMS. `destino_resolvido` guarda o nome
-- completo que o Nominatim devolveu (com UF), porque o export do TMS trunca o destino em
-- 20 caracteres e cidade homonima e risco real -- e o que permite auditar depois.
--
-- NAO E map-grabber: a skill que o Yves indicou (mcpmarket) baixa malha viaria e
-- edificacoes do OSM para CAD/Rhino (SVG/GeoPackage/DXF). Ela nao faz roteamento entre
-- cidades, entao nao serve para distancia de trecho.
ALTER TABLE trechos
  ADD COLUMN IF NOT EXISTS km_calc           integer,
  ADD COLUMN IF NOT EXISTS km_calc_fonte     text,
  ADD COLUMN IF NOT EXISTS destino_resolvido text,
  ADD COLUMN IF NOT EXISTS km_calc_em        timestamptz;

CREATE OR REPLACE FUNCTION public.listar_trechos(p_token text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT codigo, origem, destino, km, km_calc, km_calc_fonte, destino_resolvido
      FROM trechos ORDER BY codigo
  ) t; END; $function$;

-- Gravacao do lote calculado. Separada do upsert do relatorio de proposito: uma coisa e
-- importar o que o TMS diz, outra e anotar o que foi medido.
CREATE OR REPLACE FUNCTION public.upsert_trechos_km_calc(p_token text, p_linhas jsonb)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_n integer;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  IF p_linhas IS NULL OR jsonb_typeof(p_linhas) <> 'array' THEN
    RAISE EXCEPTION 'p_linhas deve ser um array json' USING ERRCODE='P0001';
  END IF;
  WITH novos AS (
    SELECT upper(btrim(x->>'codigo')) codigo,
           nullif(x->>'km_calc','')::integer km_calc,
           coalesce(nullif(btrim(x->>'fonte'),''), 'osrm') fonte,
           nullif(btrim(x->>'destino_resolvido'),'') destino_resolvido
      FROM jsonb_array_elements(p_linhas) x
     WHERE coalesce(btrim(x->>'codigo'),'') <> ''
  ), gravados AS (
    UPDATE trechos t SET km_calc = n.km_calc, km_calc_fonte = n.fonte,
                         destino_resolvido = coalesce(n.destino_resolvido, t.destino_resolvido),
                         km_calc_em = now()
      FROM novos n WHERE t.codigo = n.codigo
    RETURNING 1
  ) SELECT count(*) INTO v_n FROM gravados;
  RETURN v_n;
END; $function$;

REVOKE ALL ON FUNCTION public.upsert_trechos_km_calc(text,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_trechos_km_calc(text,jsonb) TO anon;

-- Os valores medidos entram por 068 (lote), para esta migration continuar sendo so estrutura.
