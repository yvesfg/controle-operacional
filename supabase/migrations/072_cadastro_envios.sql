-- =============================================
-- Migration 072: histórico de envio do cadastro à embarcadora
-- =============================================
-- O envio é recorrente: toda semana entram DTs novas e voltam motoristas que já
-- foram mandados antes. Sem registro, o analista reenvia tudo (a embarcadora
-- recebe repetido) ou reenvia nada (o motorista novo fica de fora) — e a única
-- forma de saber era lembrar.
--
-- Guarda o ÚLTIMO envio por (embarcadora, dt): a pergunta que a tela faz é "esta
-- DT já foi, e mudou desde então?", não "quantas vezes foi". Por isso é upsert,
-- e não log — o PostgREST já manda resolution=merge-duplicates em todo POST.
--
-- `assinatura` é o hash dos campos que foram pro arquivo. É o que separa "já
-- enviado, igual" (não precisa reenviar) de "já enviado, mas a carreta mudou"
-- (precisa). Comparar data de alteração não serviria: salvar o cadastro sem
-- mexer em nada marcaria tudo como pendente de reenvio.

CREATE TABLE IF NOT EXISTS cadastro_envios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embarcadora  text NOT NULL,
  dt           text NOT NULL,
  template     text,
  motorista_id uuid REFERENCES motoristas(id) ON DELETE SET NULL,
  nome         text,
  placas       text,
  assinatura   text NOT NULL,
  enviado_em   timestamptz NOT NULL DEFAULT now(),
  enviado_por  text,
  UNIQUE (embarcadora, dt)
);

CREATE INDEX IF NOT EXISTS idx_cadastro_envios_embarcadora ON cadastro_envios (embarcadora, enviado_em DESC);

-- Mesmo RLS anon-permissivo de cadastro_templates/embarcadoras: guarda DT, nome
-- e placas — o mesmo que a tela de cadastro já expõe —, não documento.
ALTER TABLE cadastro_envios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY anon_read_cadastro_envios  ON cadastro_envios FOR SELECT USING (true);
  CREATE POLICY anon_write_cadastro_envios ON cadastro_envios FOR INSERT WITH CHECK (true);
  CREATE POLICY anon_upd_cadastro_envios   ON cadastro_envios FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY anon_del_cadastro_envios   ON cadastro_envios FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
