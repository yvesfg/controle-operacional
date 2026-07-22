-- =============================================
-- Migration 026: V2 (veiculos) — RPCs SECURITY DEFINER token-validadas
-- =============================================
-- Aplicada em prod como 026a (aditiva). veiculos não tem PII, mas é editada junto
-- com motoristas (saveMotoristasLS) e faz parte do mesmo cadastro — fecha o par.
-- Mesmo modelo do 025: dual-path no front (veiculos.js), go-live 026b depois.
--
-- Notas de robustez (achadas em teste):
--  • placa e tipo são NOT NULL. criar_veiculo faz branch UPDATE/INSERT (preserva
--    no update via coalesce; exige tipo no insert) pra não estourar NOT NULL.
--  • atualizar_veiculo monta SET tipado (numeric/uuid/smallint), permite null
--    (ex.: desvincular motorista_id) igual ao PATCH anterior.
--  • criar_veiculos_lote mantém ON CONFLICT (paridade com o upsert atual; a
--    importação sempre envia tipo).

CREATE OR REPLACE FUNCTION public.listar_veiculos(p_token text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (SELECT * FROM veiculos ORDER BY placa ASC) t; END; $$;

CREATE OR REPLACE FUNCTION public.criar_veiculo(p_token text, p_dados jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row veiculos; v_placa text; v_existe boolean;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  v_placa := upper(regexp_replace(coalesce(p_dados->>'placa',''),'[^A-Za-z0-9]','','g'));
  IF v_placa='' THEN RAISE EXCEPTION 'placa obrigatória' USING ERRCODE='P0001'; END IF;
  SELECT EXISTS(SELECT 1 FROM veiculos WHERE placa=v_placa) INTO v_existe;
  IF v_existe THEN
    UPDATE veiculos SET
      tipo=coalesce(p_dados->>'tipo',tipo),
      config_eixos=coalesce(p_dados->>'config_eixos',config_eixos),
      carroceria=coalesce(p_dados->>'carroceria',carroceria),
      capacidade_m3=coalesce((p_dados->>'capacidade_m3')::numeric,capacidade_m3),
      motorista_id=coalesce((p_dados->>'motorista_id')::uuid,motorista_id),
      num_eixos=coalesce((p_dados->>'num_eixos')::smallint,num_eixos)
    WHERE placa=v_placa RETURNING * INTO v_row;
  ELSE
    IF coalesce(p_dados->>'tipo','')='' THEN RAISE EXCEPTION 'tipo obrigatório' USING ERRCODE='P0001'; END IF;
    INSERT INTO veiculos (placa,tipo,config_eixos,carroceria,capacidade_m3,motorista_id,criado_por,num_eixos)
    VALUES (v_placa,p_dados->>'tipo',p_dados->>'config_eixos',p_dados->>'carroceria',
            (p_dados->>'capacidade_m3')::numeric,(p_dados->>'motorista_id')::uuid,
            p_dados->>'criado_por',(p_dados->>'num_eixos')::smallint)
    RETURNING * INTO v_row;
  END IF;
  RETURN row_to_json(v_row); END; $$;

CREATE OR REPLACE FUNCTION public.criar_veiculos_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY
    INSERT INTO veiculos (placa,tipo,config_eixos,carroceria,capacidade_m3,motorista_id,criado_por,num_eixos)
    SELECT upper(regexp_replace(coalesce(e->>'placa',''),'[^A-Za-z0-9]','','g')),
           e->>'tipo',e->>'config_eixos',e->>'carroceria',(e->>'capacidade_m3')::numeric,
           (e->>'motorista_id')::uuid,e->>'criado_por',(e->>'num_eixos')::smallint
    FROM jsonb_array_elements(p_rows) e
    WHERE upper(regexp_replace(coalesce(e->>'placa',''),'[^A-Za-z0-9]','','g')) <> ''
    ON CONFLICT (placa) DO UPDATE SET
      tipo=coalesce(excluded.tipo,veiculos.tipo),
      config_eixos=coalesce(excluded.config_eixos,veiculos.config_eixos),
      carroceria=coalesce(excluded.carroceria,veiculos.carroceria),
      capacidade_m3=coalesce(excluded.capacidade_m3,veiculos.capacidade_m3),
      motorista_id=coalesce(excluded.motorista_id,veiculos.motorista_id),
      num_eixos=coalesce(excluded.num_eixos,veiculos.num_eixos)
    RETURNING row_to_json(veiculos.*); END; $$;

CREATE OR REPLACE FUNCTION public.atualizar_veiculo(p_token text, p_placa text, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_set text; v_row veiculos; v_placa text;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  v_placa := upper(regexp_replace(coalesce(p_placa,''),'[^A-Za-z0-9]','','g'));
  SELECT string_agg(format('%I = ($1->>%L)::%s',col,col,typ),', ') INTO v_set
    FROM (VALUES ('tipo','text'),('config_eixos','text'),('carroceria','text'),
                 ('capacidade_m3','numeric'),('motorista_id','uuid'),('num_eixos','smallint'),
                 ('criado_por','text'),('ativo','boolean')) AS allowed(col,typ)
    WHERE p_patch ? col;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(v) FROM veiculos v WHERE placa=v_placa); END IF;
  EXECUTE format('UPDATE veiculos SET %s WHERE placa=$2 RETURNING *',v_set) USING p_patch,v_placa INTO v_row;
  RETURN row_to_json(v_row); END; $$;

CREATE OR REPLACE FUNCTION public.excluir_veiculo(p_token text, p_placa text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  DELETE FROM veiculos WHERE placa=upper(regexp_replace(coalesce(p_placa,''),'[^A-Za-z0-9]','','g')); END; $$;

CREATE OR REPLACE FUNCTION public.desvincular_veiculos_motorista(p_token text, p_motorista_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  UPDATE veiculos SET motorista_id=null WHERE motorista_id=p_motorista_id; END; $$;

REVOKE ALL ON FUNCTION public.listar_veiculos(text)                         FROM public;
REVOKE ALL ON FUNCTION public.criar_veiculo(text,jsonb)                     FROM public;
REVOKE ALL ON FUNCTION public.criar_veiculos_lote(text,jsonb)              FROM public;
REVOKE ALL ON FUNCTION public.atualizar_veiculo(text,text,jsonb)           FROM public;
REVOKE ALL ON FUNCTION public.excluir_veiculo(text,text)                   FROM public;
REVOKE ALL ON FUNCTION public.desvincular_veiculos_motorista(text,uuid)    FROM public;
GRANT EXECUTE ON FUNCTION public.listar_veiculos(text)                      TO anon;
GRANT EXECUTE ON FUNCTION public.criar_veiculo(text,jsonb)                  TO anon;
GRANT EXECUTE ON FUNCTION public.criar_veiculos_lote(text,jsonb)           TO anon;
GRANT EXECUTE ON FUNCTION public.atualizar_veiculo(text,text,jsonb)        TO anon;
GRANT EXECUTE ON FUNCTION public.excluir_veiculo(text,text)                TO anon;
GRANT EXECUTE ON FUNCTION public.desvincular_veiculos_motorista(text,uuid) TO anon;

-- ── 026b GO-LIVE (aplicar SÓ depois do front dual-path no ar) ───────────────
-- DROP POLICY IF EXISTS anon_read_veiculos  ON veiculos;
-- DROP POLICY IF EXISTS anon_write_veiculos ON veiculos;
-- DROP POLICY IF EXISTS anon_upd_veiculos   ON veiculos;
-- DROP POLICY IF EXISTS anon_del_veiculos   ON veiculos;
