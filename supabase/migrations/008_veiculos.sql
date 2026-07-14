-- =============================================
-- Migration 008: veiculos (cadastro de cavalos/carretas, vinculado a motoristas)
-- =============================================
-- Motorista, cavalo e carreta são entidades separadas: motorista troca de
-- carreta, carreta pode ficar sem motorista, etc. `motoristas.placa1..placa4`
-- (migration 007) vira um CACHE de leitura rápida sincronizado a partir daqui
-- (fase 2 do useMotoristas) — mantido pra não reescrever os ~15 arquivos que
-- já leem `m.placa1` direto; a fonte da verdade do vínculo é `veiculos.motorista_id`.
--
-- Simplificação proposital: config_eixos (SIMPLES/LS/LS4EIXO/BITREM/RODOTREM) é,
-- na prática, propriedade do CONJUNTO cavalo+carreta (a contagem soma os eixos
-- dos dois), mas como não existe uma terceira entidade "combo" nem foi pedida,
-- ele e carroceria/capacidade_m3 vivem no registro da CARRETA — ficam null pra
-- tipo='cavalo'.

CREATE TABLE IF NOT EXISTS veiculos (
  placa          text PRIMARY KEY,   -- só letras/números maiúsculos, sem pontuação
  tipo           text NOT NULL,      -- 'cavalo' | 'carreta'
  config_eixos   text,               -- SIMPLES | LS | LS4EIXO | BITREM | RODOTREM (só carreta)
  carroceria     text,               -- GA | GB | GRA | SIDER | BAU (só carreta)
  capacidade_m3  numeric,            -- metragem cúbica do sider/baú (só carreta)
  motorista_id   uuid REFERENCES motoristas(id) ON DELETE SET NULL,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  criado_por     text
);

CREATE INDEX IF NOT EXISTS idx_veiculos_motorista ON veiculos (motorista_id);

ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_read_veiculos  ON veiculos FOR SELECT USING (true);
CREATE POLICY anon_write_veiculos ON veiculos FOR INSERT WITH CHECK (true);
CREATE POLICY anon_upd_veiculos   ON veiculos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY anon_del_veiculos   ON veiculos FOR DELETE USING (true);
