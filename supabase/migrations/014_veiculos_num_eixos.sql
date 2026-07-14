-- =============================================
-- Migration 014: num_eixos por veículo (cavalo TAMBÉM tem eixos)
-- =============================================
-- A 008 pôs config_eixos (SIMPLES/LS/LS4EIXO/BITREM/RODOTREM) só na carreta e
-- deixou o cavalo sem nenhum campo de eixo. Está errado: o cavalo tem 2 ou 3
-- eixos, e a CATEGORIA é a SOMA dos dois (regra do Yves):
--   cavalo 2 + carreta 3 = 5 eixos -> SIMPLES
--   cavalo 3 + carreta 3 = 6 eixos -> LS
--   cavalo 3 + carreta 4 = 7 eixos -> LS4EIXO
--   BITREM   = 7 eixos (duas carretas)
--   RODOTREM = 9 eixos (25m ou 30m)
--
-- num_eixos passa a existir nos DOIS tipos (é atributo físico da peça).
-- config_eixos continua na carreta como o RÓTULO do conjunto (é o que vem escrito
-- na agenda de contatos e o que a Conferência entende), agora conferível contra a
-- soma real.

ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS num_eixos smallint;

COMMENT ON COLUMN veiculos.num_eixos IS
  'Eixos da peça em si: cavalo 2-3, carreta 3-4. A categoria (SIMPLES/LS/LS4EIXO) é a soma cavalo+carreta.';

-- Semeia o que dá pra inferir com segurança a partir do config_eixos já importado
-- da agenda (só as carretas; cavalo fica null pra ser preenchido na tela).
UPDATE veiculos SET num_eixos = 3 WHERE tipo = 'carreta' AND num_eixos IS NULL AND config_eixos IN ('SIMPLES', 'LS');
UPDATE veiculos SET num_eixos = 4 WHERE tipo = 'carreta' AND num_eixos IS NULL AND config_eixos = 'LS4EIXO';
