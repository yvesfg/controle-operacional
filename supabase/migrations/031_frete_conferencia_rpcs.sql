-- =============================================
-- Migration 031: Fase C — frete_conferencia RPCs SECURITY DEFINER token-validadas
-- =============================================
-- frete_conferencia (3192 linhas) guarda financeiro (CTes, contratos, margens) e hoje
-- é lida/escrita/DELETADA pela anon key (4 policies public USING(true)). Estas RPCs
-- movem o CRUD para trás de _validar_token_e_base (sessão válida) — mesmo molde de
-- motoristas (025). Sem escritor externo (só o app usa esta tabela).
--
-- Autz = sessão válida (mesmo nível de listar_operacional): conferência de frete é
-- operada por operador/gerente/admin, não se restringe a admin.
--
-- 6 RPCs consolidam as 10 funções de acesso do freteConferencia.js:
--   listar_frete_periodos  ← listarPorPeriodo / listarPorPeriodos / listarTodosPeriodo
--   listar_frete_pendentes ← listarPendentesRevisao (corte do mês anterior calc. no SQL)
--   listar_frete_sinalizados ← listarSinalizados
--   inserir_frete_lote     ← inserirFrete (insert em bloco; defaults id/criado_em/origem)
--   patch_frete            ← decidir / estornarRevisao (mesmo conjunto fixo de 5 campos)
--   excluir_frete          ← excluirFrete
--
-- Go-live (drop das 4 policies anon) é a migration 032, aplicada SÓ depois do front
-- dual-path (freteConferencia.js) no ar e testado. Ver 032 comentada no fim.

-- ── LEITURA ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.listar_frete_periodos(p_token text, p_periodos text[], p_cliente text DEFAULT NULL)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM frete_conferencia
    WHERE periodo_ref = ANY(p_periodos)
      AND (p_cliente IS NULL OR cliente = p_cliente)
  ) t; END; $$;

CREATE OR REPLACE FUNCTION public.listar_frete_pendentes(p_token text, p_cliente text DEFAULT NULL)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM frete_conferencia
    WHERE decisao_manual IS NULL
      AND periodo_ref >= to_char(date_trunc('month', now()) - interval '1 month','YYYY-MM')
      AND (flag_negativa OR flag_baixa OR flag_ambigua OR flag_duplicidade)
      AND (p_cliente IS NULL OR cliente = p_cliente)
    ORDER BY periodo_ref DESC, margem_lucro ASC
  ) t; END; $$;

CREATE OR REPLACE FUNCTION public.listar_frete_sinalizados(p_token text, p_cliente text DEFAULT NULL)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM frete_conferencia
    WHERE decisao_manual = 'sinalizar_correcao'
      AND (p_cliente IS NULL OR cliente = p_cliente)
    ORDER BY revisado_em DESC
  ) t; END; $$;

-- ── ESCRITA ──────────────────────────────────────────────────────────────────
-- Insert em bloco. Colunas omitidas (id, criado_em, atualizado_em, origem) usam default.
CREATE OR REPLACE FUNCTION public.inserir_frete_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY
    INSERT INTO frete_conferencia (
      base_id, cliente, cnpj_remetente, categoria, periodo_ref, ctrc, empresa_cod,
      data_emissao, trecho, nfs, placa, nome_usuario, numero_manifesto, numero_contrato,
      valor_nf, peso_nf, frete_peso, total_frete, valor_contrato_frete, saldo, margem_lucro,
      flag_negativa, flag_baixa, flag_ambigua, flag_duplicidade, dup_grupo_chave,
      is_devolucao, modalidade)
    SELECT
      e->>'base_id', e->>'cliente', e->>'cnpj_remetente', e->>'categoria', e->>'periodo_ref',
      e->>'ctrc', e->>'empresa_cod', (e->>'data_emissao')::date, e->>'trecho', e->>'nfs',
      e->>'placa', e->>'nome_usuario', e->>'numero_manifesto', e->>'numero_contrato',
      (e->>'valor_nf')::numeric, (e->>'peso_nf')::numeric, (e->>'frete_peso')::numeric,
      (e->>'total_frete')::numeric, (e->>'valor_contrato_frete')::numeric, (e->>'saldo')::numeric,
      (e->>'margem_lucro')::numeric,
      coalesce((e->>'flag_negativa')::boolean,false), coalesce((e->>'flag_baixa')::boolean,false),
      coalesce((e->>'flag_ambigua')::boolean,false), coalesce((e->>'flag_duplicidade')::boolean,false),
      e->>'dup_grupo_chave',
      coalesce((e->>'is_devolucao')::boolean,false), coalesce(e->>'modalidade','CIF')
    FROM jsonb_array_elements(p_rows) e
    RETURNING row_to_json(frete_conferencia.*); END; $$;

-- decidir + estornarRevisao: sempre mandam o mesmo conjunto fixo de 5 campos (decidir
-- com valores, estornar com nulls + atualizado_em). Explícito (sem SET dinâmico) porque
-- o conjunto é fixo e 2 campos são timestamptz.
CREATE OR REPLACE FUNCTION public.patch_frete(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row frete_conferencia;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  UPDATE frete_conferencia SET
    decisao_manual = p_patch->>'decisao_manual',
    revisado_em    = (p_patch->>'revisado_em')::timestamptz,
    revisado_obs   = p_patch->>'revisado_obs',
    revisado_por   = p_patch->>'revisado_por',
    atualizado_em  = coalesce((p_patch->>'atualizado_em')::timestamptz, now())
  WHERE id = p_id
  RETURNING * INTO v_row;
  RETURN row_to_json(v_row); END; $$;

CREATE OR REPLACE FUNCTION public.excluir_frete(p_token text, p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  DELETE FROM frete_conferencia WHERE id = p_id; END; $$;

-- ── GRANTS (revoga public, concede só anon — o app usa a anon key + token na RPC) ──
REVOKE ALL ON FUNCTION public.listar_frete_periodos(text,text[],text)  FROM public;
REVOKE ALL ON FUNCTION public.listar_frete_pendentes(text,text)        FROM public;
REVOKE ALL ON FUNCTION public.listar_frete_sinalizados(text,text)      FROM public;
REVOKE ALL ON FUNCTION public.inserir_frete_lote(text,jsonb)           FROM public;
REVOKE ALL ON FUNCTION public.patch_frete(text,uuid,jsonb)             FROM public;
REVOKE ALL ON FUNCTION public.excluir_frete(text,uuid)                 FROM public;
GRANT EXECUTE ON FUNCTION public.listar_frete_periodos(text,text[],text) TO anon;
GRANT EXECUTE ON FUNCTION public.listar_frete_pendentes(text,text)       TO anon;
GRANT EXECUTE ON FUNCTION public.listar_frete_sinalizados(text,text)     TO anon;
GRANT EXECUTE ON FUNCTION public.inserir_frete_lote(text,jsonb)          TO anon;
GRANT EXECUTE ON FUNCTION public.patch_frete(text,uuid,jsonb)            TO anon;
GRANT EXECUTE ON FUNCTION public.excluir_frete(text,uuid)               TO anon;

-- ── 032 GO-LIVE (aplicar SÓ depois do front dual-path no ar + testado) ──────────
-- Fecha o acesso anon direto a frete_conferencia. Sem token válido a tabela não
-- devolve/aceita nada; o front injeta o token via setFreteToken().
-- DROP POLICY IF EXISTS anon_read_frete_conf  ON frete_conferencia;
-- DROP POLICY IF EXISTS anon_write_frete_conf ON frete_conferencia;
-- DROP POLICY IF EXISTS anon_upd_frete_conf   ON frete_conferencia;
-- DROP POLICY IF EXISTS anon_del_frete_conf   ON frete_conferencia;
