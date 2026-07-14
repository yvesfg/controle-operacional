-- =============================================
-- Migration 009: carga inicial de motoristas/veiculos a partir do Sheets
-- =============================================
-- `co_motoristas` (localStorage) estava vazio na prática — a base real de
-- motoristas é quem já rodou frete, presente em controle_operacional /
-- controle_operacional_maracanau / controle_operacional_avb (sync do Google
-- Sheets). Este seed roda uma vez: cria 1 motorista por nome distinto (com o
-- CPF mais frequente associado a ele) e 1 veículo tipo 'cavalo' por placa em
-- formato válido, vinculado ao motorista que mais recentemente a usou
-- (por data_carr). Resultado real (2026-07-14): 848 motoristas, 727 cavalos.
--
-- Placas fora do formato Mercosul/antigo (~10 de 1706 registros) são
-- ignoradas na criação de veículo, mas o motorista ainda é criado. A agenda
-- do Google Contacts entra POR CIMA disso (fase seguinte, fora desta
-- migration) enriquecendo com carreta/config_eixos/carroceria/status_risco.

CREATE TEMP TABLE _todos AS
SELECT
  nome,
  upper(trim(nome)) AS nome_norm,
  upper(regexp_replace(coalesce(placa,''), '[^A-Za-z0-9]', '', 'g')) AS placa_norm,
  regexp_replace(coalesce(cpf,''), '[^0-9]', '', 'g') AS cpf_norm,
  CASE WHEN data_carr ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date(data_carr, 'DD/MM/YYYY') ELSE NULL END AS data_carr_d
FROM (
  SELECT nome, placa, cpf, data_carr FROM controle_operacional
  UNION ALL
  SELECT nome, placa, cpf, data_carr FROM controle_operacional_maracanau
  UNION ALL
  SELECT nome, placa, cpf, data_carr FROM controle_operacional_avb
) t
WHERE nome IS NOT NULL AND trim(nome) <> '';

UPDATE _todos SET placa_norm = '' WHERE placa_norm !~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$';

CREATE TEMP TABLE _cpf_por_nome AS
SELECT DISTINCT ON (nome_norm) nome_norm, cpf_norm
FROM (
  SELECT nome_norm, cpf_norm, count(*) as freq
  FROM _todos
  WHERE cpf_norm <> ''
  GROUP BY nome_norm, cpf_norm
) x
ORDER BY nome_norm, freq DESC;

CREATE TEMP TABLE _nomes AS
SELECT DISTINCT ON (nome_norm) nome_norm, nome AS nome_display
FROM _todos
ORDER BY nome_norm, length(nome) DESC;

CREATE TEMP TABLE _placa_atual AS
SELECT DISTINCT ON (placa_norm) placa_norm, nome_norm, data_carr_d
FROM _todos
WHERE placa_norm <> ''
ORDER BY placa_norm, data_carr_d DESC NULLS LAST;

INSERT INTO motoristas (nome, cpf, criado_por)
SELECT n.nome_display, NULLIF(c.cpf_norm,''), 'seed_sheets_2026-07-14'
FROM _nomes n
LEFT JOIN _cpf_por_nome c USING (nome_norm);

INSERT INTO veiculos (placa, tipo, motorista_id, criado_por)
SELECT pa.placa_norm, 'cavalo', m.id, 'seed_sheets_2026-07-14'
FROM _placa_atual pa
JOIN motoristas m ON upper(trim(m.nome)) = pa.nome_norm AND m.criado_por = 'seed_sheets_2026-07-14'
ON CONFLICT (placa) DO NOTHING;
