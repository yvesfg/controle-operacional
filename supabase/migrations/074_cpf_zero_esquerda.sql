-- =============================================
-- Migration 074: devolve o zero à esquerda que o Sheets comeu do CPF
-- =============================================
-- A coluna CPF da planilha é NUMÉRICA, e número não guarda zero à esquerda:
-- 00582481376 chega como 582481376. O efeito não é cosmético — CPF curto não
-- casa com CPF completo, então o app criou um SEGUNDO cadastro do mesmo
-- motorista (90 CPFs, 210 registros). Foi assim que o RICARDO SILVA RODRIGUES
-- apareceu duas vezes: o do Sheets com a DT e sem documento, o da leitura da
-- CNH com documento e sem DT.
--
-- REGRA: só completa o zero quando o DÍGITO VERIFICADOR fecha depois do
-- padding. Aí é prova de que o número está certo e só perdeu o zero. Medido
-- antes de rodar: 129 dos 137 motoristas fecham; os outros 8 são erro de
-- digitação de verdade e ficam INTOCADOS, pra revisão humana — completar zero
-- em número errado inventaria o CPF de outra pessoa.
--
-- ⚠️ A ORIGEM CONTINUA ERRADA: enquanto o SyncSupabase*.gs mandar a coluna como
-- número, cada rodada (15 min) repõe CPF curto nas tabelas de viagem. Esta
-- migration conserta o passado; o .gs precisa mandar como TEXTO.

CREATE OR REPLACE FUNCTION public._cpf_dv_confere(p_cpf text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE d text; s1 int := 0; s2 int := 0; v1 int; v2 int; i int;
BEGIN
  d := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  IF length(d) <> 11 OR d ~ '^(\d)\1{10}$' THEN RETURN false; END IF;
  FOR i IN 1..9 LOOP s1 := s1 + substr(d,i,1)::int * (10 - i + 1); END LOOP;
  v1 := (s1 * 10) % 11; IF v1 = 10 THEN v1 := 0; END IF;
  FOR i IN 1..10 LOOP s2 := s2 + substr(d,i,1)::int * (11 - i + 1); END LOOP;
  v2 := (s2 * 10) % 11; IF v2 = 10 THEN v2 := 0; END IF;
  RETURN v1 = substr(d,10,1)::int AND v2 = substr(d,11,1)::int;
END; $$;

-- Guarda o antes de tudo que for tocado — é dado de pessoa, não se altera sem
-- deixar rastro.
CREATE TABLE IF NOT EXISTS cpf_backfill_log (
  id         bigserial PRIMARY KEY,
  tabela     text NOT NULL,
  chave      text NOT NULL,
  cpf_antes  text NOT NULL,
  cpf_depois text NOT NULL,
  em         timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE r record; novo text; n int := 0;
BEGIN
  -- motoristas (chave = id)
  FOR r IN
    SELECT id::text AS chave, cpf FROM motoristas
    WHERE coalesce(cpf,'') <> ''
      AND length(regexp_replace(cpf,'\D','','g')) BETWEEN 8 AND 10
  LOOP
    novo := lpad(regexp_replace(r.cpf,'\D','','g'), 11, '0');
    IF _cpf_dv_confere(novo) THEN
      INSERT INTO cpf_backfill_log (tabela, chave, cpf_antes, cpf_depois)
      VALUES ('motoristas', r.chave, r.cpf, novo);
      UPDATE motoristas SET cpf = novo WHERE id = r.chave::uuid;
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'motoristas corrigidos: %', n;
END $$;

-- Tabelas de viagem: mesma regra, chave própria de cada uma.
DO $$
DECLARE r record; novo text; t text; chave_col text; n int;
BEGIN
  FOREACH t IN ARRAY ARRAY['controle_operacional','controle_operacional_maracanau','controle_operacional_avb','controle_operacional_sem_dt']
  LOOP
    chave_col := CASE WHEN t = 'controle_operacional_avb' THEN 'codigo'
                      WHEN t = 'controle_operacional_sem_dt' THEN 'id'
                      ELSE 'dt' END;
    n := 0;
    FOR r IN EXECUTE format(
      'SELECT %I::text AS chave, cpf FROM %I WHERE coalesce(cpf,'''') <> '''' AND length(regexp_replace(cpf,''\D'','''',''g'')) BETWEEN 8 AND 10',
      chave_col, t)
    LOOP
      novo := lpad(regexp_replace(r.cpf,'\D','','g'), 11, '0');
      IF _cpf_dv_confere(novo) THEN
        INSERT INTO cpf_backfill_log (tabela, chave, cpf_antes, cpf_depois)
        VALUES (t, r.chave, r.cpf, novo);
        EXECUTE format('UPDATE %I SET cpf = $1 WHERE %I::text = $2', t, chave_col) USING novo, r.chave;
        n := n + 1;
      END IF;
    END LOOP;
    RAISE NOTICE '% corrigidos: %', t, n;
  END LOOP;
END $$;
