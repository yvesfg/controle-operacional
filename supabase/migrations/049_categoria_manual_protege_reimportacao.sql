-- =============================================
-- Migration 049: categoria editada à mão não volta na reimportação
-- =============================================
-- PROBLEMA (achado em prod, CTRC 2591 · Suzano Imperatriz · 07/2026):
--   `bonificacao` NÃO existe na planilha bruta — classificarLinhasCliente só produz
--   frete/descarga/local/diaria. Ela só aparece quando um admin edita a categoria.
--   Como a chave de dedupe (front e UNIQUE da tabela) inclui `categoria`, toda
--   reimportação que contém aquele CTRC reclassifica pra Local, não casa com a linha
--   'bonificacao' já gravada e INSERE UMA SEGUNDA LINHA. O CTe "volta a aparecer" na
--   fila e, ao corrigir a categoria de novo, bate na UNIQUE:
--     Key (cnpj_remetente, categoria, ctrc, periodo_ref)=(...,bonificacao,2591,2026-07)
--     already exists  → HTTP 409 / 23505
--
-- MESMO PRINCÍPIO JÁ ADOTADO NA FILA: decisão manual nunca é sobrescrita por
-- reimportação. Aqui a decisão manual é a CATEGORIA.
--
--   categoria_manual = true  → a linha teve a categoria definida por uma pessoa.
--   O diff de importação (diffImportFrete) passa a pular qualquer linha cujo
--   (cnpj_remetente, ctrc, periodo_ref) já exista com categoria_manual — em vez de
--   inserir uma cópia na categoria que a planilha sugere.
--
-- Aditivo: default false, então nada muda pra quem nunca editou categoria.

ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS categoria_manual boolean NOT NULL DEFAULT false;

-- Backfill seguro: 'bonificacao' só pode ter vindo de edição manual (a planilha nunca
-- gera essa categoria), então essas linhas já nascem protegidas.
UPDATE frete_conferencia SET categoria_manual = true
 WHERE categoria = 'bonificacao' AND categoria_manual = false;

-- Achar rápido o documento (independente da categoria) no diff de importação.
CREATE INDEX IF NOT EXISTS idx_frete_conf_doc ON frete_conferencia (cnpj_remetente, ctrc, periodo_ref);

-- ── DIAGNÓSTICO (rodar à parte; NÃO apaga nada) ───────────────────────────────
-- Lista os CTes que já ficaram com mais de uma categoria no mesmo mês — as cópias que a
-- reimportação criou antes desta proteção. A limpeza é manual pela tela (botão "Excluir
-- CTe" no modal), pra ninguém apagar às cegas a linha errada:
--
-- SELECT cnpj_remetente, ctrc, periodo_ref, count(*) AS linhas,
--        string_agg(categoria || CASE WHEN categoria_manual THEN ' (manual)' ELSE '' END
--                   || ' = ' || coalesce(saldo,0)::text, ' | ' ORDER BY categoria) AS detalhe
--   FROM frete_conferencia
--  GROUP BY cnpj_remetente, ctrc, periodo_ref
-- HAVING count(*) > 1
--  ORDER BY periodo_ref DESC, ctrc;

-- ── editar_frete: whitelist + categoria_manual ─────────────────────────────────
-- Mesma função da migration 036, só com 'categoria_manual' no array e no grupo boolean.
-- O front manda categoria_manual=true quando a edição TROCA a categoria.
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
      WHEN k IN ('flag_negativa','flag_baixa','flag_ambigua','flag_duplicidade','is_devolucao','categoria_manual')
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
    'is_devolucao','modalidade','periodo_ref','categoria_manual']) k
  WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM frete_conferencia m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE frete_conferencia SET %s, atualizado_em = now() WHERE id=$2 RETURNING *', v_set)
    USING p_patch, p_id INTO v_row;
  RETURN row_to_json(v_row);
END; $$;
REVOKE ALL ON FUNCTION public.editar_frete(text,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.editar_frete(text,uuid,jsonb) TO anon;
