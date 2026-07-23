-- =============================================
-- Migration 036: editar_frete — edição COMPLETA de CTe restrita a ADMIN
-- =============================================
-- Aplicada em prod 2026-07-23. Complementa o CRUD de frete_conferencia (031): as
-- decisões/revisão continuam no patch_frete; ESTA edita os campos de negócio do CTe
-- (cliente, categoria, modalidade/is_devolucao, valores, etc.) — só pra admin.
-- Gate: perfil do co_usuarios do token (via _validar_token_e_base). Whitelist dinâmica
-- com cast por tipo. Front recalcula margem/flags e manda no patch (recalcularLinhaEditada).
-- Testado com usuários de teste temporários (admin edita OK; operador bloqueado); dados
-- de teste apagados. NUNCA usar gerar_token_sessao de usuário real em teste (lição do
-- incidente 2026-07-23).
CREATE OR REPLACE FUNCTION public.editar_frete(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid; v_perfil text; v_set text; v_row frete_conferencia;
BEGIN
  v_uid := _validar_token_e_base(p_token, null);
  SELECT perfil INTO v_perfil FROM co_usuarios WHERE id = v_uid;
  IF v_perfil IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode editar CTe' USING ERRCODE='P0001';
  END IF;
  SELECT string_agg(
    CASE
      WHEN k IN ('valor_nf','peso_nf','frete_peso','total_frete','valor_contrato_frete','saldo','margem_lucro')
        THEN format('%I = ($1->>%L)::numeric', k, k)
      WHEN k IN ('flag_negativa','flag_baixa','flag_ambigua','flag_duplicidade','is_devolucao')
        THEN format('%I = ($1->>%L)::boolean', k, k)
      WHEN k = 'data_emissao'
        THEN format('%I = NULLIF($1->>%L,'''')::date', k, k)
      ELSE format('%I = ($1->>%L)', k, k)
    END, ', ')
  INTO v_set
  FROM unnest(ARRAY['cliente','base_id','cnpj_remetente','categoria','empresa_cod','data_emissao',
    'trecho','nfs','placa','nome_usuario','numero_manifesto','numero_contrato',
    'valor_nf','peso_nf','frete_peso','total_frete','valor_contrato_frete','saldo','margem_lucro',
    'flag_negativa','flag_baixa','flag_ambigua','flag_duplicidade','dup_grupo_chave',
    'is_devolucao','modalidade','periodo_ref']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM frete_conferencia m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE frete_conferencia SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row);
END; $$;
REVOKE ALL ON FUNCTION public.editar_frete(text,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.editar_frete(text,uuid,jsonb) TO anon;
