-- =============================================
-- Migration 048: ciclo de vida do CTe (substituição / cancelamento / complementar)
-- =============================================
-- PROBLEMA: a planilha bruta do TMS traz TODOS os CTes emitidos, inclusive o que foi
-- cancelado e o que foi substituído por outro. Hoje o app soma tudo, então quando um
-- CTe é refeito o faturamento do mês conta o valor 2x (e o par ainda cai na fila como
-- "duplicidade", que não é o caso — é substituição).
--
-- MODELO (aditivo, nada quebra):
--   tipo_doc   'normal' (default) | 'substituto' | 'complementar'  → o que ESTE CTe é
--   status_doc 'ativo'  (default) | 'substituido' | 'cancelado'    → se ENTRA no faturamento
--   ctrc_ref   o outro CTe do par (número do CTRC, mesma embarcadora+categoria)
--
-- Regras:
--   • substituição → o CTe novo fica tipo_doc='substituto' + ctrc_ref=<antigo>; o ANTIGO
--     vira status_doc='substituido' e sai dos somatórios (continua na base e na tela).
--   • cancelamento → o próprio CTe vira status_doc='cancelado' e sai dos somatórios;
--     ctrc_ref (opcional) guarda o CTe emitido no lugar dele.
--   • complementar → o novo fica tipo_doc='complementar' + ctrc_ref=<original>, mas os
--     DOIS seguem 'ativo': o faturamento é original + complementar (soma). Só ganha o
--     vínculo visual, nenhum número muda.
--
-- Linhas antigas assumem 'normal'/'ativo' pelo default, então todos os totais que já
-- existem continuam idênticos até alguém marcar um vínculo na tela.
--
-- Fase 1 (esta): marcação MANUAL na Conferência de Faturamento + sugestão de candidatos
-- calculada no front. Fase 2 (quando o export do TMS tiver coluna de tipo/CTe referenciado):
-- o parser passa a preencher tipo_doc/ctrc_ref sozinho e o manual vira exceção.

ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS tipo_doc    text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status_doc  text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS ctrc_ref    text,
  ADD COLUMN IF NOT EXISTS vinculo_em  timestamptz,
  ADD COLUMN IF NOT EXISTS vinculo_por text;

-- Os resumos filtram status_doc='ativo' dentro de um periodo_ref.
CREATE INDEX IF NOT EXISTS idx_frete_conf_status_doc ON frete_conferencia (periodo_ref, status_doc);
-- Busca do par pelo número do CTRC (o vínculo cruza períodos: o substituto pode ser de
-- outro mês que o substituído).
CREATE INDEX IF NOT EXISTS idx_frete_conf_ctrc_par ON frete_conferencia (cnpj_remetente, categoria, ctrc);

-- ── RPC: grava o vínculo dos dois lados numa transação ──────────────────────────
-- Autz = sessão válida (mesmo nível de patch_frete/decidir — é decisão de conferência,
-- não é edição de CTe, que é só admin via editar_frete).
-- p_tipo: 'substituto' | 'complementar' | 'cancelado' | 'normal' (desfaz o vínculo).
-- p_id_ref (opcional): id do par, quando o app JÁ sabe qual é a linha (ex.: escolhido no
--   grupo de duplicidade). Tem precedência sobre p_ctrc_ref — necessário porque o par pode
--   estar em OUTRA categoria (o caso clássico: mesma carga lançada como Descarga e Local) e
--   o mesmo número de CTRC pode existir em mais de uma categoria.
-- Devolve as linhas afetadas (a própria + o par, quando existe).
CREATE OR REPLACE FUNCTION public.vincular_cte(p_token text, p_id uuid, p_tipo text,
                                               p_ctrc_ref text DEFAULT NULL, p_por text DEFAULT NULL,
                                               p_id_ref uuid DEFAULT NULL)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row frete_conferencia; v_ref text;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  SELECT * INTO v_row FROM frete_conferencia WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CTe não encontrado' USING ERRCODE='P0001'; END IF;
  -- Par indicado por id: o número do CTRC vem dele (o app não precisa mandar os dois).
  IF p_id_ref IS NOT NULL THEN
    SELECT ctrc INTO p_ctrc_ref FROM frete_conferencia WHERE id = p_id_ref;
    IF p_ctrc_ref IS NULL THEN RAISE EXCEPTION 'CTe de origem não encontrado' USING ERRCODE='P0001'; END IF;
  END IF;
  IF p_tipo NOT IN ('substituto','complementar','cancelado','normal') THEN
    RAISE EXCEPTION 'Tipo de vínculo inválido: %', p_tipo USING ERRCODE='P0001';
  END IF;
  IF p_tipo IN ('substituto','complementar') AND coalesce(btrim(p_ctrc_ref),'') = '' THEN
    RAISE EXCEPTION 'Informe o CTRC de origem' USING ERRCODE='P0001';
  END IF;
  v_ref := nullif(btrim(p_ctrc_ref), '');

  -- Desfaz o vínculo anterior desta linha: se ela substituía alguém, aquele volta a 'ativo'.
  -- Acha o antigo pelo vínculo REVERSO (ctrc_ref apontando pra cá), não pela categoria — o
  -- par pode ser de outra categoria.
  IF v_row.tipo_doc = 'substituto' AND v_row.ctrc_ref IS NOT NULL THEN
    UPDATE frete_conferencia
       SET status_doc = 'ativo', ctrc_ref = NULL, vinculo_em = NULL, vinculo_por = NULL, atualizado_em = now()
     WHERE cnpj_remetente = v_row.cnpj_remetente AND ctrc = v_row.ctrc_ref
       AND ctrc_ref = v_row.ctrc AND status_doc = 'substituido';
  END IF;

  IF p_tipo = 'normal' THEN
    UPDATE frete_conferencia
       SET tipo_doc='normal', status_doc='ativo', ctrc_ref=NULL, vinculo_em=NULL, vinculo_por=NULL, atualizado_em=now()
     WHERE id = p_id;
  ELSIF p_tipo = 'cancelado' THEN
    -- O CTe cancelado é a PRÓPRIA linha; ctrc_ref (se vier) é o que entrou no lugar.
    UPDATE frete_conferencia
       SET status_doc='cancelado', ctrc_ref=v_ref, vinculo_em=now(), vinculo_por=p_por, atualizado_em=now()
     WHERE id = p_id;
  ELSE
    UPDATE frete_conferencia
       SET tipo_doc=p_tipo, status_doc='ativo', ctrc_ref=v_ref, vinculo_em=now(), vinculo_por=p_por, atualizado_em=now()
     WHERE id = p_id;
    -- Só a substituição derruba o antigo; complementar soma com o original (ambos ativos).
    IF p_tipo = 'substituto' THEN
      UPDATE frete_conferencia
         SET status_doc='substituido', ctrc_ref=v_row.ctrc, vinculo_em=now(), vinculo_por=p_por, atualizado_em=now()
       WHERE id <> p_id AND (
              (p_id_ref IS NOT NULL AND id = p_id_ref)
           -- Sem id do par: casa por número dentro da MESMA categoria (o mesmo CTRC pode
           -- existir em categorias diferentes; sem esse recorte derrubaria as duas linhas).
           OR (p_id_ref IS NULL AND cnpj_remetente = v_row.cnpj_remetente
               AND categoria = v_row.categoria AND ctrc = v_ref));
      -- Se o CTe antigo não estiver na base (mês não importado), nada acontece aqui —
      -- o número fica registrado em ctrc_ref e o vínculo se completa na próxima importação.
    END IF;
  END IF;

  RETURN QUERY SELECT row_to_json(f) FROM frete_conferencia f
   WHERE f.id = p_id OR f.id = p_id_ref
      OR (f.cnpj_remetente = v_row.cnpj_remetente
          AND f.ctrc IN (coalesce(v_ref, ''), coalesce(v_row.ctrc_ref, '')));
END; $$;

REVOKE ALL ON FUNCTION public.vincular_cte(text,uuid,text,text,text,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.vincular_cte(text,uuid,text,text,text,uuid) TO anon;
