-- =============================================
-- Migration 025: V2 (motoristas) — RPCs SECURITY DEFINER token-validadas
-- =============================================
-- Aplicada em prod como 025a (aditiva). motoristas guarda CPF + dados bancários
-- (banco/agência/conta/favorecido) e hoje é lida/escrita/DELETADA pela anon key.
-- Estas RPCs movem o CRUD para trás de _validar_token_e_base (sessão válida).
--
-- Autz = sessão válida (mesmo nível de listar_operacional); motoristas é editável
-- por operador/gerente/admin, então não se restringe a admin aqui.
--
-- Go-live (drop das policies anon de motoristas) é a migration 025b, aplicada
-- SÓ depois do front dual-path (motoristas.js) estar no ar. Ver 025b abaixo,
-- comentada — descomentar/aplicar no go-live.

CREATE OR REPLACE FUNCTION public.listar_motoristas(p_token text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (SELECT * FROM motoristas ORDER BY nome ASC) t; END; $$;

CREATE OR REPLACE FUNCTION public.listar_motoristas_por_criado_por(p_token text, p_criado_por text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (SELECT * FROM motoristas WHERE criado_por=p_criado_por) t; END; $$;

CREATE OR REPLACE FUNCTION public.criar_motorista(p_token text, p_dados jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row motoristas;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  IF coalesce(p_dados->>'nome','')='' THEN RAISE EXCEPTION 'nome obrigatório' USING ERRCODE='P0001'; END IF;
  INSERT INTO motoristas (nome,cpf,tel,vinculo,banco,agencia,conta,favorecido,status_risco,observacao,criado_por)
  VALUES (p_dados->>'nome',p_dados->>'cpf',p_dados->>'tel',p_dados->>'vinculo',p_dados->>'banco',
          p_dados->>'agencia',p_dados->>'conta',p_dados->>'favorecido',p_dados->>'status_risco',
          p_dados->>'observacao',p_dados->>'criado_por')
  RETURNING * INTO v_row; RETURN row_to_json(v_row); END; $$;

CREATE OR REPLACE FUNCTION public.criar_motoristas_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY
    INSERT INTO motoristas (nome,cpf,tel,vinculo,banco,agencia,conta,favorecido,status_risco,observacao,criado_por)
    SELECT e->>'nome',e->>'cpf',e->>'tel',e->>'vinculo',e->>'banco',e->>'agencia',e->>'conta',
           e->>'favorecido',e->>'status_risco',e->>'observacao',e->>'criado_por'
    FROM jsonb_array_elements(p_rows) e
    RETURNING row_to_json(motoristas.*); END; $$;

CREATE OR REPLACE FUNCTION public.atualizar_motorista(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_set text; v_row motoristas;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  SELECT string_agg(format('%I = ($1->>%L)',k,k),', ') INTO v_set
    FROM unnest(ARRAY['nome','cpf','tel','vinculo','banco','agencia','conta','favorecido','status_risco','observacao']) k
    WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM motoristas m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE motoristas SET %s WHERE id=$2 RETURNING *',v_set) USING p_patch,p_id INTO v_row;
  RETURN row_to_json(v_row); END; $$;

CREATE OR REPLACE FUNCTION public.excluir_motorista(p_token text, p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  DELETE FROM motoristas WHERE id=p_id; END; $$;

REVOKE ALL ON FUNCTION public.listar_motoristas(text)                        FROM public;
REVOKE ALL ON FUNCTION public.listar_motoristas_por_criado_por(text,text)    FROM public;
REVOKE ALL ON FUNCTION public.criar_motorista(text,jsonb)                    FROM public;
REVOKE ALL ON FUNCTION public.criar_motoristas_lote(text,jsonb)             FROM public;
REVOKE ALL ON FUNCTION public.atualizar_motorista(text,uuid,jsonb)          FROM public;
REVOKE ALL ON FUNCTION public.excluir_motorista(text,uuid)                  FROM public;
GRANT EXECUTE ON FUNCTION public.listar_motoristas(text)                     TO anon;
GRANT EXECUTE ON FUNCTION public.listar_motoristas_por_criado_por(text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.criar_motorista(text,jsonb)                 TO anon;
GRANT EXECUTE ON FUNCTION public.criar_motoristas_lote(text,jsonb)          TO anon;
GRANT EXECUTE ON FUNCTION public.atualizar_motorista(text,uuid,jsonb)       TO anon;
GRANT EXECUTE ON FUNCTION public.excluir_motorista(text,uuid)              TO anon;

-- ── 025b GO-LIVE (aplicar SÓ depois do front dual-path no ar) ───────────────
-- Fecha o acesso anon direto a motoristas. Depois disto, sem token válido a
-- tabela não devolve nada (o front injeta o token via setMotoristasToken).
-- DROP POLICY IF EXISTS anon_read_motoristas  ON motoristas;
-- DROP POLICY IF EXISTS anon_write_motoristas ON motoristas;
-- DROP POLICY IF EXISTS anon_upd_motoristas   ON motoristas;
-- DROP POLICY IF EXISTS anon_del_motoristas   ON motoristas;
