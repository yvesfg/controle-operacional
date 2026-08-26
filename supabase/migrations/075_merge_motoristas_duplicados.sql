-- =============================================
-- Migration 075: junta os cadastros que o CPF curto duplicou
-- =============================================
-- Depois da 074 devolver o zero à esquerda, 90 CPFs ficaram com mais de um
-- cadastro (210 registros) — o mesmo motorista duas vezes, porque "582481376"
-- nunca casava com "00582481376". O caso que apareceu na tela: o cadastro do
-- Sheets ficou com a DT e sem documento, e o criado pela leitura da CNH ficou
-- com documento e sem DT.
--
-- QUEM VENCE: o cadastro mais completo — primeiro quem tem CNH, depois quem foi
-- concluído, depois quem tem mais campo preenchido, e por último o mais novo.
-- O perdedor não some sem antes DOAR o que só ele tinha: cada campo vazio do
-- vencedor é preenchido pelo valor do perdedor, e os veículos mudam de dono.
--
-- A viagem não guarda motorista_id (casa por CPF/nome/placa), então juntar os
-- cadastros não deixa DT órfã — a DT passa a apontar pro cadastro que ficou.
--
-- Nenhum gatilho cria motorista a partir da viagem (só as RPCs criar_motorista/
-- criar_motoristas_lote, chamadas pelo app), então a sync não recria o duplicado.

CREATE TABLE IF NOT EXISTS motoristas_merge_log (
  id            bigserial PRIMARY KEY,
  cpf           text NOT NULL,
  vencedor_id   uuid NOT NULL,
  perdedor_id   uuid NOT NULL,
  perdedor_json jsonb NOT NULL,   -- o registro inteiro, pra dar pra voltar atrás
  veiculos      text,
  em            timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  g record; v record; p record;
  campos text[] := ARRAY['tel','vinculo','banco','agencia','conta','favorecido','status_risco',
                         'observacao','pix_tipo','pix_chave','cnh_numero','cnh_categoria',
                         'cnh_validade','cnh_primeira_habilitacao','cnh_uf','genero',
                         'data_nascimento','funcao','qualificacao','cadastro_concluido_em'];
  c text; placas text; n_merge int := 0;
BEGIN
  FOR g IN
    SELECT regexp_replace(cpf,'\D','','g') AS cpf11
    FROM motoristas WHERE coalesce(cpf,'') <> ''
    GROUP BY 1 HAVING count(*) > 1
  LOOP
    -- vencedor
    SELECT * INTO v FROM motoristas
    WHERE regexp_replace(cpf,'\D','','g') = g.cpf11
    ORDER BY (cnh_numero IS NOT NULL) DESC,
             (cadastro_concluido_em IS NOT NULL) DESC,
             (coalesce(nullif(tel,''),'') <> '')::int
             + (coalesce(nullif(banco,''),'') <> '')::int
             + (coalesce(nullif(conta,''),'') <> '')::int
             + (coalesce(nullif(pix_chave,''),'') <> '')::int DESC,
             criado_em DESC NULLS LAST
    LIMIT 1;

    FOR p IN
      SELECT * FROM motoristas
      WHERE regexp_replace(cpf,'\D','','g') = g.cpf11 AND id <> v.id
    LOOP
      SELECT string_agg(placa, ' / ') INTO placas FROM veiculos WHERE motorista_id = p.id;

      INSERT INTO motoristas_merge_log (cpf, vencedor_id, perdedor_id, perdedor_json, veiculos)
      VALUES (g.cpf11, v.id, p.id, row_to_json(p)::jsonb, placas);

      -- o perdedor doa o que só ele tinha
      FOREACH c IN ARRAY campos LOOP
        EXECUTE format(
          'UPDATE motoristas SET %I = (SELECT %I FROM motoristas WHERE id = $1)
             WHERE id = $2 AND (%I IS NULL OR %I::text = '''')
               AND (SELECT %I FROM motoristas WHERE id = $1) IS NOT NULL', c, c, c, c, c)
        USING p.id, v.id;
      END LOOP;

      UPDATE veiculos SET motorista_id = v.id WHERE motorista_id = p.id;
      DELETE FROM motoristas WHERE id = p.id;
      n_merge := n_merge + 1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'cadastros duplicados absorvidos: %', n_merge;
END $$;

-- Daqui pra frente o banco recusa o segundo cadastro do mesmo CPF, em vez de
-- deixar a tela descobrir a duplicidade depois.
CREATE UNIQUE INDEX IF NOT EXISTS idx_motoristas_cpf_unico
  ON motoristas (regexp_replace(cpf,'\D','','g'))
  WHERE coalesce(cpf,'') <> '';

-- A importação da agenda manda dezenas de contatos de uma vez: sem isto, UM CPF
-- repetido derrubaria o lote inteiro por causa do índice novo. Pular o repetido
-- é o comportamento certo — o contato já está cadastrado.
CREATE OR REPLACE FUNCTION public.criar_motoristas_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM _validar_token_e_base(p_token,null);
  RETURN QUERY
    INSERT INTO motoristas (nome,cpf,tel,vinculo,banco,agencia,conta,favorecido,status_risco,observacao,criado_por)
    SELECT e->>'nome',e->>'cpf',e->>'tel',e->>'vinculo',e->>'banco',e->>'agencia',e->>'conta',
           e->>'favorecido',e->>'status_risco',e->>'observacao',e->>'criado_por'
    FROM jsonb_array_elements(p_rows) e
    ON CONFLICT DO NOTHING
    RETURNING row_to_json(motoristas.*); END; $$;
