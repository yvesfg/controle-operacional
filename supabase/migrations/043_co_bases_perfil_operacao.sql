-- 043_co_bases_perfil_operacao.sql  (APLICADA em prod 2026-07-29)
--
-- Fase 4a do app generico: o Perfil de Operacao sai do codigo e passa a viver no banco,
-- para cadastrar/ajustar uma base (transportadora, filial, operacao) SEM deploy.
--
-- O front mantem `src/operacao/perfil.js` como PADRAO embutido — o que vem daqui so
-- SOBREPOE (precedencia: PADRAO -> POR_BASE do codigo -> banco). Se a tabela estiver
-- vazia, fora do ar ou com JSON incompleto, o app segue identico ao de hoje.
-- Provado em teste: o seed abaixo produz perfis IDENTICOS aos do codigo nas 3 bases.

CREATE TABLE IF NOT EXISTS co_bases (
  id            text PRIMARY KEY,          -- casa com BASES[id] do front
  label         text NOT NULL,
  tabela        text NOT NULL,             -- tabela Supabase da operacao
  perfil        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- so o que DIVERGE do padrao
  ordem         int  NOT NULL DEFAULT 0,
  ativo         boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por text
);

-- Sem policy = deny-all para anon. Acesso so pelas RPCs SECURITY DEFINER,
-- no mesmo padrao das migrations 023/025/031/037.
ALTER TABLE co_bases ENABLE ROW LEVEL SECURITY;

-- Escrita: so admin — mesmo gate do editar_frete (migration 036).
-- Testado: operador barrado, token falso barrado, admin cria e edita.
CREATE OR REPLACE FUNCTION public.salvar_base(p_token text, p_id text, p_dados jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid; v_perfil text; v_row co_bases;
BEGIN
  v_uid := _validar_token_e_base(p_token, null);
  SELECT perfil INTO v_perfil FROM co_usuarios WHERE id = v_uid;
  IF v_perfil IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode editar bases' USING ERRCODE='P0001';
  END IF;
  IF coalesce(btrim(p_id),'') = '' THEN
    RAISE EXCEPTION 'id da base e obrigatorio' USING ERRCODE='P0001';
  END IF;

  INSERT INTO co_bases (id, label, tabela, perfil, ordem, ativo, atualizado_em, atualizado_por)
  VALUES (
    btrim(p_id),
    coalesce(nullif(btrim(p_dados->>'label'),''), btrim(p_id)),
    coalesce(nullif(btrim(p_dados->>'tabela'),''), 'controle_operacional'),
    coalesce(p_dados->'perfil', '{}'::jsonb),
    coalesce((p_dados->>'ordem')::int, 0),
    coalesce((p_dados->>'ativo')::boolean, true),
    now(),
    (SELECT email FROM co_usuarios WHERE id = v_uid)
  )
  ON CONFLICT (id) DO UPDATE SET
    label  = coalesce(nullif(btrim(EXCLUDED.label),''), co_bases.label),
    tabela = coalesce(nullif(btrim(EXCLUDED.tabela),''), co_bases.tabela),
    perfil = EXCLUDED.perfil,
    ordem  = EXCLUDED.ordem,
    ativo  = EXCLUDED.ativo,
    atualizado_em = now(),
    atualizado_por = EXCLUDED.atualizado_por
  RETURNING * INTO v_row;

  RETURN row_to_json(v_row);
END;
$function$;

REVOKE ALL ON FUNCTION public.salvar_base(text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.salvar_base(text, text, jsonb) TO anon;

-- Seed: espelha exatamente constants.js (BASES) + operacao/perfil.js (POR_BASE).
INSERT INTO co_bases (id, label, tabela, ordem, perfil) VALUES
 ('imperatriz_belem', 'Imperatriz / Belem', 'controle_operacional', 1, '{
    "features": {"semDt": true, "classificadores": true, "filialNasDespesas": true},
    "financeiro": {"incluirComplementarPadrao": true},
    "vocab": {"origem": ["IMPERATRIZ-MA", "BELEM-PA"]},
    "classificador": {
      "campo": "tipo_carga", "label": "Tipo de carga", "padrao": "papel",
      "valores": [{"valor": "papel", "label": "Papel"},
                  {"valor": "celulose", "label": "Celulose"}]
    }
  }'::jsonb),
 ('maracanau', 'Maracanau', 'controle_operacional_maracanau', 2, '{}'::jsonb),
 ('acailandia_avb', 'Acailandia - AVB', 'controle_operacional_avb', 3, '{
    "ancora": "codigo",
    "rotuloCliente": "Contratante",
    "features": {"diarias": false, "descargaAgendada": false, "cobrancaSaldo": false,
                 "sgs": false, "operacional": false, "gestao": true},
    "financeiro": {"complementarMargemZero": true, "filialDespesas": "ACA"},
    "alertas": "avb"
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- NOTA: a versao aplicada em prod tem os acentos corretos nos labels
-- ("Imperatriz / Belem" -> "Belem" com acento, "ACA" -> "ACA" com cedilha).
-- Ver 044 para a versao final de listar_bases.
