-- =============================================
-- Migration 076: corrige a placa onde o formato não deixa dúvida
-- =============================================
-- A mesma peça aparecia escrita de dois jeitos — "OLL2I68" na viagem e
-- "OLL2168" no cadastro — e o `=` não casa I com 1. Efeito: a carreta da DT não
-- achava o cadastro, entrava como casca sem documento e travava o motorista
-- como incompleto (foi o caso da DT 1413058).
--
-- O formato da placa diz quem errou, mas SÓ EM PARTE. Nos dois padrões (antigo
-- LLLNNNN e Mercosul LLLNLNN) as 3 primeiras são letra, a 4ª é dígito e as 2
-- últimas são dígito — ali O só pode ser 0 e I só pode ser 1, e vice-versa.
-- A 5ª posição é letra no Mercosul e dígito no antigo: AMBÍGUA, fica intocada.
--
-- Por isso o app compara pela CANÔNICA (placaCanonica em src/veiculos.js, que
-- colapsa I em 1 e O em 0 em qualquer posição) — conferido antes: nenhuma das
-- 729 placas cadastradas colide com outra ao colapsar. A correção abaixo é só
-- de grafia, no que é inequívoco.
--
-- Medido antes de rodar: 3 linhas em controle_operacional.placa (IFRO304,
-- IKWO680, KLPOC31 — todas com O na casa do dígito), 0 em placa2 e 0 em
-- veiculos. O caso OLL2I68 x OLL2168 NÃO é tocado: cai na 5ª posição, e decidir
-- ali seria chute — quem resolve é a comparação canônica.

CREATE OR REPLACE FUNCTION public._placa_normaliza(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  WITH x AS (SELECT upper(regexp_replace(coalesce(p,''),'[^A-Za-z0-9]','','g')) AS v)
  SELECT CASE WHEN length(v) <> 7 THEN v ELSE
    translate(substr(v,1,3),'01','OI') ||   -- 1-3: sempre letra
    translate(substr(v,4,1),'OI','01') ||   -- 4:   sempre dígito
    substr(v,5,1) ||                        -- 5:   ambígua, não se toca
    translate(substr(v,6,2),'OI','01')      -- 6-7: sempre dígito
  END FROM x;
$$;

CREATE TABLE IF NOT EXISTS placa_backfill_log (
  id           bigserial PRIMARY KEY,
  tabela       text NOT NULL,
  chave        text NOT NULL,
  coluna       text NOT NULL,
  placa_antes  text NOT NULL,
  placa_depois text NOT NULL,
  em           timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE r record; t text; chave_col text; col text; nova text; n int;
BEGIN
  FOREACH t IN ARRAY ARRAY['controle_operacional','controle_operacional_maracanau','controle_operacional_avb','controle_operacional_sem_dt']
  LOOP
    chave_col := CASE WHEN t = 'controle_operacional_avb' THEN 'codigo'
                      WHEN t = 'controle_operacional_sem_dt' THEN 'id'
                      ELSE 'dt' END;
    FOREACH col IN ARRAY ARRAY['placa','placa2','placa3']
    LOOP
      -- nem toda tabela tem as três colunas
      CONTINUE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=t AND column_name=col);
      n := 0;
      FOR r IN EXECUTE format(
        'SELECT %I::text AS chave, %I AS placa FROM %I
          WHERE coalesce(%I,'''') <> ''''
            AND _placa_normaliza(%I) <> upper(regexp_replace(%I,''[^A-Za-z0-9]'','''',''g''))',
        chave_col, col, t, col, col, col)
      LOOP
        nova := _placa_normaliza(r.placa);
        INSERT INTO placa_backfill_log (tabela, chave, coluna, placa_antes, placa_depois)
        VALUES (t, r.chave, col, r.placa, nova);
        EXECUTE format('UPDATE %I SET %I = $1 WHERE %I::text = $2', t, col, chave_col)
          USING nova, r.chave;
        n := n + 1;
      END LOOP;
      IF n > 0 THEN RAISE NOTICE '%.%: % corrigidas', t, col, n; END IF;
    END LOOP;
  END LOOP;
END $$;
