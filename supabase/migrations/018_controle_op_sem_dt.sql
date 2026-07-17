-- =============================================
-- Migration 018: fila de cargas SEM DT (Imperatriz/Belém)
-- =============================================
-- Contexto: a Suzano ficou sem sistema e algumas cargas foram carregadas sem DT. O DT é a
-- âncora do upsert em controle_operacional (on_conflict=dt), então linha sem DT era
-- descartada em silêncio pelo SyncSupabase.gs ("DT vazio"). Raro, mas não pode sumir.
--
-- Estas linhas passam a ser CAPTURADAS aqui (só as que têm placa = carga real; sem placa é
-- template/rascunho e segue ignorada), numa fila de revisão própria que NÃO polui os totais
-- de controle_operacional. O sync detecta tipo_carga pela origem (papel/celulose) e marca
-- 'pendente'; um humano confirma (carga válida) ou marca 'erro' (descarta). Quando o DT
-- verdadeiro aparecer na planilha, o gatilho abaixo concilia por placa+data_carr+origem e
-- fecha a pendência (status 'conciliado'), sem duplicar a carga.
--
-- Validado via SQL (2026-07-17): captura + conciliação com caixa/espaços divergentes casa
-- corretamente; pendência sem DT correspondente permanece 'pendente' (sem falso positivo).

CREATE TABLE IF NOT EXISTS controle_operacional_sem_dt (
  id             bigserial PRIMARY KEY,
  -- chave de dedupe do sync (sem DT não há PK natural): placa|data_carr|origem|cpf, upper.
  chave_natural  text NOT NULL UNIQUE,
  nome           text,
  cpf            text,
  placa          text,
  origem         text,
  destino        text,
  data_carr      text,
  data_agenda    text,
  vl_cte         text,
  vl_contrato    text,
  adiant         text,
  saldo          text,
  tipo_carga     text NOT NULL DEFAULT 'papel',
  -- 'pendente' (recém-capturada) | 'confirmado' (humano validou) | 'erro' (descartar) | 'conciliado' (ganhou DT)
  status         text NOT NULL DEFAULT 'pendente',
  dt_conciliado  text,
  revisado_por   text,
  revisado_em    timestamptz,
  revisado_obs   text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sem_dt_status ON controle_operacional_sem_dt (status);
CREATE INDEX IF NOT EXISTS idx_sem_dt_match ON controle_operacional_sem_dt (placa, data_carr, origem);

-- RLS no mesmo padrão das demais tabelas do projeto (anon key, policy permissiva por comando).
ALTER TABLE controle_operacional_sem_dt ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sem_dt_all ON controle_operacional_sem_dt;
CREATE POLICY sem_dt_all ON controle_operacional_sem_dt
  FOR ALL USING (true) WITH CHECK (true);

-- ── Conciliação automática ──
-- Quando uma linha COM DT entra/atualiza em controle_operacional, fecha qualquer pendência
-- que case por placa+data_carr+origem (ignorando caixa/espaços) e ainda esteja aberta.
-- Só reconcilia com identidade real (placa não vazia) pra não casar linhas-fantasma.
CREATE OR REPLACE FUNCTION conciliar_sem_dt_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.dt IS NULL OR btrim(NEW.dt) = '' OR NEW.placa IS NULL OR btrim(NEW.placa) = '' THEN
    RETURN NEW;
  END IF;
  UPDATE controle_operacional_sem_dt p
     SET status = 'conciliado',
         dt_conciliado = NEW.dt,
         atualizado_em = now()
   WHERE p.status IN ('pendente','confirmado')
     AND upper(btrim(p.placa))  = upper(btrim(NEW.placa))
     AND btrim(coalesce(p.data_carr,'')) = btrim(coalesce(NEW.data_carr,''))
     AND upper(btrim(coalesce(p.origem,''))) = upper(btrim(coalesce(NEW.origem,'')));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conciliar_sem_dt ON controle_operacional;
CREATE TRIGGER trg_conciliar_sem_dt
  AFTER INSERT OR UPDATE OF dt, placa, data_carr, origem ON controle_operacional
  FOR EACH ROW EXECUTE FUNCTION conciliar_sem_dt_trg();
