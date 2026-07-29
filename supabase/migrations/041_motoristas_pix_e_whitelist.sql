-- 041_motoristas_pix_e_whitelist.sql  (APLICADA em prod 2026-07-29)
--
-- Duplicação corrigida: dados de pagamento do motorista viviam em DOIS lugares —
-- no cadastro `motoristas` (canônico) e copiados POR VIAGEM em
-- controle_operacional_avb (banco/agencia/conta/chave_pix/cpf_cnpj/favorecido/telefone),
-- escritos pelo SyncSupabase_AVB.gs a partir das colunas da planilha.
--
-- O app NUNCA leu as cópias: `SUPA_KNOWN_COLS` (useDTHandlers) não as inclui e a
-- mensagem de pagamento do ModalWhatsApp monta tudo a partir de `motoristas`.
-- Efeito prático: o dado existia no banco e a mensagem mostrava "—".
--
-- PIX: ModalMotorista (formulário) e ModalWhatsApp já referenciavam pix_tipo/pix_chave,
-- colunas que nunca existiram — o cadastro salvava tudo menos o PIX, em silêncio.
-- Criadas aqui com exatamente esses nomes para o código existente passar a funcionar.

ALTER TABLE motoristas
  ADD COLUMN IF NOT EXISTS pix_tipo  text,
  ADD COLUMN IF NOT EXISTS pix_chave text;

-- Whitelists das RPCs token-validadas (migration 025a) precisam conhecer os campos novos.
CREATE OR REPLACE FUNCTION public.atualizar_motorista(p_token text, p_id uuid, p_patch jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_set text; v_row motoristas;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  SELECT string_agg(format('%I = ($1->>%L)',k,k),', ') INTO v_set
    FROM unnest(ARRAY['nome','cpf','tel','vinculo','banco','agencia','conta','favorecido',
                      'status_risco','observacao','pix_tipo','pix_chave']) k
    WHERE p_patch ? k;
  IF v_set IS NULL THEN RETURN (SELECT row_to_json(m) FROM motoristas m WHERE id=p_id); END IF;
  EXECUTE format('UPDATE motoristas SET %s WHERE id=$2 RETURNING *',v_set) USING p_patch,p_id INTO v_row;
  RETURN row_to_json(v_row); END; $function$;

CREATE OR REPLACE FUNCTION public.criar_motorista(p_token text, p_dados jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row motoristas;
BEGIN PERFORM _validar_token_e_base(p_token,null);
  IF coalesce(p_dados->>'nome','')='' THEN RAISE EXCEPTION 'nome obrigatório' USING ERRCODE='P0001'; END IF;
  INSERT INTO motoristas (nome,cpf,tel,vinculo,banco,agencia,conta,favorecido,status_risco,
                          observacao,pix_tipo,pix_chave,criado_por)
  VALUES (p_dados->>'nome',p_dados->>'cpf',p_dados->>'tel',p_dados->>'vinculo',p_dados->>'banco',
          p_dados->>'agencia',p_dados->>'conta',p_dados->>'favorecido',p_dados->>'status_risco',
          p_dados->>'observacao',p_dados->>'pix_tipo',p_dados->>'pix_chave',p_dados->>'criado_por')
  RETURNING * INTO v_row; RETURN row_to_json(v_row); END; $function$;

-- ── Backfill (executado em prod junto com esta migration) ────────────────────
-- Resgata o que estava preso na tabela de viagens para o cadastro. NUNCA sobrescreve
-- valor já preenchido em `motoristas` — só completa nulo/vazio.
-- Resultado medido: tel 1 -> 184, banco 1 -> 9, conta 0 -> 6, pix 0 -> 7 (de 849 motoristas).
-- pix_tipo é inferido: chave == CPF do motorista -> 'CPF'; 10/11 dígitos -> 'Telefone';
-- senão 'Chave'. Conferido nos 7 casos reais.
WITH avb AS (
  SELECT regexp_replace(coalesce(cpf,''),'\D','','g') cpf_num,
         max(nullif(btrim(coalesce(banco,'')),''))      banco,
         max(nullif(btrim(coalesce(agencia,'')),''))    agencia,
         max(nullif(btrim(coalesce(conta,'')),''))      conta,
         max(nullif(btrim(coalesce(favorecido,'')),'')) favorecido,
         max(nullif(btrim(coalesce(telefone,'')),''))   tel,
         max(nullif(btrim(coalesce(chave_pix,'')),''))  pix
  FROM controle_operacional_avb WHERE coalesce(btrim(cpf),'') <> '' GROUP BY 1
)
UPDATE motoristas m SET
  banco      = coalesce(nullif(btrim(coalesce(m.banco,'')),''),      a.banco),
  agencia    = coalesce(nullif(btrim(coalesce(m.agencia,'')),''),    a.agencia),
  conta      = coalesce(nullif(btrim(coalesce(m.conta,'')),''),      a.conta),
  favorecido = coalesce(nullif(btrim(coalesce(m.favorecido,'')),''), a.favorecido),
  tel        = coalesce(nullif(btrim(coalesce(m.tel,'')),''),        a.tel),
  pix_chave  = coalesce(nullif(btrim(coalesce(m.pix_chave,'')),''),  a.pix),
  pix_tipo   = coalesce(nullif(btrim(coalesce(m.pix_tipo,'')),''),
                 CASE WHEN a.pix IS NULL THEN NULL
                      WHEN regexp_replace(a.pix,'\D','','g') = a.cpf_num THEN 'CPF'
                      WHEN length(regexp_replace(a.pix,'\D','','g')) IN (10,11) THEN 'Telefone'
                      ELSE 'Chave' END)
FROM avb a
WHERE regexp_replace(coalesce(m.cpf,''),'\D','','g') = a.cpf_num
  AND a.cpf_num <> ''
  AND (a.banco IS NOT NULL OR a.agencia IS NOT NULL OR a.conta IS NOT NULL
       OR a.favorecido IS NOT NULL OR a.tel IS NOT NULL OR a.pix IS NOT NULL);
