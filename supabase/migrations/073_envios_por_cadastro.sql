-- =============================================
-- Migration 073: o envio é por CADASTRO, não por DT
-- =============================================
-- Erro de modelagem da 072, apontado no uso (Yves): a chave era (embarcadora, dt).
-- Mas a embarcadora não cadastra viagem — cadastra MOTORISTA + CONJUNTO. O mesmo
-- motorista com o mesmo cavalo e a mesma carreta roda dez DTs no mês: com a chave
-- na DT, as dez apareciam como "novo" e o arquivo saía com o mesmo cadastro
-- repetido dez vezes. E quando ele troca UMA peça do conjunto, aí sim é cadastro
-- novo — o que a chave por DT também não sabia dizer.
--
-- A chave passa a ser (embarcadora, assinatura), onde assinatura é o hash dos
-- campos do motorista + das peças. Mesmo conjunto = mesma assinatura = já
-- enviado. Peça trocada = assinatura diferente = precisa ir.
--
-- `dt` (uma) vira `dts` (as viagens em que aquele cadastro apareceu): serve pro
-- analista reconhecer a linha, não pra identificar o envio.
--
-- A tabela está VAZIA em produção (nenhum envio foi feito ainda), então a troca
-- é direta, sem backfill.

ALTER TABLE cadastro_envios DROP CONSTRAINT IF EXISTS cadastro_envios_embarcadora_dt_key;
ALTER TABLE cadastro_envios DROP COLUMN IF EXISTS dt;
ALTER TABLE cadastro_envios ADD COLUMN IF NOT EXISTS dts text;

DO $$ BEGIN
  ALTER TABLE cadastro_envios ADD CONSTRAINT cadastro_envios_embarcadora_assinatura_key
    UNIQUE (embarcadora, assinatura);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- "Este motorista já foi mandado alguma vez?" é a segunda pergunta da tela
-- (a primeira é "este conjunto exato já foi?"), e é ela que separa
-- "cadastro novo" de "mudou o conjunto de quem já está lá".
CREATE INDEX IF NOT EXISTS idx_cadastro_envios_motorista ON cadastro_envios (embarcadora, motorista_id);
