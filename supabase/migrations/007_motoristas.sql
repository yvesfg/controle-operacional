-- =============================================
-- Migration 007: motoristas (cadastro global no Supabase)
-- =============================================
-- Motoristas hoje vive só em localStorage (`co_motoristas`) — cada navegador
-- tem sua própria cópia, sem sincronizar entre pessoas/dispositivos. Esta
-- tabela vira a fonte da verdade; a camada de acesso (fase 2, useMotoristas)
-- mantém a MESMA assinatura que os ~15 arquivos consumidores já usam
-- (array `motoristas` + `saveMotoristasLS(novoArray)`), só troca o que tem
-- por trás — não deveria exigir mudança nesses arquivos.
--
-- config_eixos / carroceria / capacidade_m3 vêm da agenda de contatos (nome
-- do motorista costuma trazer isso junto com a placa) — são dois eixos
-- INDEPENDENTES de classificação de veículo, não um só campo:
--   config_eixos: SIMPLES (5 eixos) | LS (6) | LS4EIXO (7) | BITREM (7, duas
--                 carretas) | RODOTREM (9, 25 ou 30m)
--   carroceria:   GA (grade alta) | GB (grade baixa) | GRA (graneleira) |
--                 SIDER | BAU
--   capacidade_m3: metragem cúbica do sider/baú (ex.: 108, 110)
-- Sem CHECK/enum de propósito — mesmo padrão de `embarcadoras.base_id`
-- (texto livre documentado aqui; vocabulário validado na tela de cadastro).
--
-- status_risco vem das flags soltas na agenda (VERMELHO/BLOQUEADO/BOM/GOLPE)
-- — hoje é sinal informal enterrado no nome do contato; aqui vira campo
-- pesquisável.

CREATE TABLE IF NOT EXISTS motoristas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  cpf            text,
  tel            text,
  placa1         text,
  placa2         text,
  placa3         text,
  placa4         text,
  config_eixos   text,   -- SIMPLES | LS | LS4EIXO | BITREM | RODOTREM
  carroceria     text,   -- GA | GB | GRA | SIDER | BAU
  capacidade_m3  numeric,
  status_risco   text,   -- bom | vermelho | bloqueado | golpe | null
  observacao     text,
  vinculo        text,
  banco          text,
  agencia        text,
  conta          text,
  favorecido     text,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  criado_por     text
);

CREATE INDEX IF NOT EXISTS idx_motoristas_placa1 ON motoristas (placa1);
CREATE INDEX IF NOT EXISTS idx_motoristas_cpf    ON motoristas (cpf);

-- RLS: mesmo padrão anon-permissivo já usado em embarcadoras/frete_conferencia/controle_operacional.
ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_read_motoristas  ON motoristas FOR SELECT USING (true);
CREATE POLICY anon_write_motoristas ON motoristas FOR INSERT WITH CHECK (true);
CREATE POLICY anon_upd_motoristas   ON motoristas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY anon_del_motoristas   ON motoristas FOR DELETE USING (true);
