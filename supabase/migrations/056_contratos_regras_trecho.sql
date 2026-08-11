-- =============================================
-- Migration 056: quais contratos são da nossa operação (regra por trecho)
-- =============================================
-- PROBLEMA: o relatório de contratos do TMS vem com TUDO que a empresa de emissão rodou, não
-- só a nossa operação. No relatório MAR de 01-11/08/2026 são 81 contratos e só 11 batem com
-- CTe da base — os outros 69 (trechos MAB* de Marabá e ANN*, R$ 623.429 contratados) são de
-- outra operação. Sem separar isso, o "encargo faltando" viraria um número inventado.
--
-- POR QUE NÃO FILTRAR POR CNPJ DA EMBARCADORA (pedido explícito do Yves): travar em
-- "só Suzano 16404287069864" obrigaria a mexer no código quando entrar embarcadora nova.
-- O vínculo continua sendo o CTe (quem casa herda o cliente do CTe, seja quem for), e o que
-- esta migration resolve é o outro lado: o contrato que NÃO casa pode ser (a) de outra
-- operação ou (b) nosso, com o CTe ainda não importado — e só uma pessoa sabe qual é.
--
-- MODELO: regra por (empresa de emissão, trecho), decidida uma vez e reaproveitada nas
-- próximas importações. Trecho que nunca apareceu entra como PENDENTE e a tela pergunta —
-- é assim que uma embarcadora nova avisa que chegou, em vez de sumir em silêncio.
--   ignorar = true  → não é nossa operação: fora dos KPIs e da fila
--   ignorar = false → é nossa: se não casou, é CTe ainda não importado (fica na fila avisando)
--   sem regra       → pendente de decisão

CREATE TABLE IF NOT EXISTS contratos_regras_trecho (
  empresa_emissao text NOT NULL,
  trecho          text NOT NULL,
  ignorar         boolean NOT NULL,
  decidido_por    text,
  decidido_em     timestamptz DEFAULT now(),
  PRIMARY KEY (empresa_emissao, trecho)
);

ALTER TABLE contratos_regras_trecho ENABLE ROW LEVEL SECURITY;
-- Sem policy: só as RPCs abaixo (SECURITY DEFINER), igual frete_contratos.

CREATE OR REPLACE FUNCTION public.listar_regras_trecho(p_token text)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY SELECT row_to_json(t) FROM (
    SELECT * FROM contratos_regras_trecho ORDER BY empresa_emissao, trecho
  ) t; END; $function$;

-- p_ignorar NULL apaga a regra (volta a perguntar na próxima importação).
CREATE OR REPLACE FUNCTION public.definir_regra_trecho(p_token text, p_empresa text, p_trecho text,
                                                       p_ignorar boolean, p_por text DEFAULT NULL)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row contratos_regras_trecho;
BEGIN
  PERFORM _validar_token_e_base(p_token, null);
  IF coalesce(btrim(p_empresa),'') = '' OR coalesce(btrim(p_trecho),'') = '' THEN
    RAISE EXCEPTION 'Empresa e trecho são obrigatórios' USING ERRCODE='P0001';
  END IF;
  IF p_ignorar IS NULL THEN
    DELETE FROM contratos_regras_trecho
     WHERE empresa_emissao = upper(btrim(p_empresa)) AND trecho = upper(btrim(p_trecho));
    RETURN NULL;
  END IF;
  INSERT INTO contratos_regras_trecho (empresa_emissao, trecho, ignorar, decidido_por)
  VALUES (upper(btrim(p_empresa)), upper(btrim(p_trecho)), p_ignorar, p_por)
  ON CONFLICT (empresa_emissao, trecho) DO UPDATE
    SET ignorar = EXCLUDED.ignorar, decidido_por = EXCLUDED.decidido_por, decidido_em = now()
  RETURNING * INTO v_row;
  RETURN row_to_json(v_row);
END; $function$;

REVOKE ALL ON FUNCTION public.listar_regras_trecho(text) FROM public;
REVOKE ALL ON FUNCTION public.definir_regra_trecho(text,text,text,boolean,text) FROM public;
GRANT EXECUTE ON FUNCTION public.listar_regras_trecho(text) TO anon;
GRANT EXECUTE ON FUNCTION public.definir_regra_trecho(text,text,text,boolean,text) TO anon;

-- Decisão do Yves em 11/08/2026 sobre o relatório MAR: BEMSZP (Belém → Suzano) é a nossa
-- operação; o resto do arquivo é de outra e fica de fora.
INSERT INTO contratos_regras_trecho (empresa_emissao, trecho, ignorar, decidido_por) VALUES
  ('MAR','BEMSZP',false,'decisao inicial 11/08/2026'),
  ('MAR','MABCUC',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABUSI',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABMAC',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABFOR',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABJUA',true ,'decisao inicial 11/08/2026'),
  ('MAR','ANNHGN',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABSTL',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABGRJ',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABTIA',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABPCT',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABLDV',true ,'decisao inicial 11/08/2026'),
  ('MAR','MABCTU',true ,'decisao inicial 11/08/2026')
ON CONFLICT (empresa_emissao, trecho) DO NOTHING;
