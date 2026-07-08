-- =============================================
-- Migration 005: Cadastro de clientes/embarcadoras (frete_clientes)
-- =============================================
-- Substitui o cadastro hardcoded em src/freteConferencia.js:CLIENTES por uma
-- tabela editável pela tela — resolve o gargalo de precisar mexer em código
-- pra reconhecer um CNPJ novo. parseFreteXLSX passa a classificar por LINHA
-- (agrupando por CNPJ Remetente dentro do próprio arquivo), então um arquivo
-- pode conter várias embarcadoras misturadas sem ser barrado.
--
-- frete_cod / desc_local_cod / diaria_cod = valor da coluna "Empresa" na
-- planilha bruta que corresponde a cada categoria (ex.: Suzano Imperatriz usa
-- MAT=frete, MAM=descarga/local, D01=diária). desc_local_cod é um único
-- código que depois se divide em descarga/local pela Margem Lucro (==0 vira
-- descarga) — mesma regra que já existia.

CREATE TABLE IF NOT EXISTS frete_clientes (
  cnpj            text PRIMARY KEY,     -- só dígitos, 14 posições (mesmo formato de soDigitos())
  nome            text NOT NULL,
  base_id         text,                 -- 'imperatriz_belem' | 'maracanau' | 'acailandia_avb' | null (sem base vinculada, ex.: Couro)
  frete_cod       text NOT NULL,
  desc_local_cod  text,
  diaria_cod      text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  criado_por      text
);

-- Seed com o cadastro que já existia hardcoded, pra não quebrar nada do que já roda hoje.
INSERT INTO frete_clientes (cnpj, nome, base_id, frete_cod, desc_local_cod, diaria_cod) VALUES
  ('16404287022205', 'Suzano Imperatriz', 'imperatriz_belem', 'MAT', 'MAM', 'D01'),
  ('16404287069864', 'Suzano Belem',      'imperatriz_belem', 'MAR', 'MRM', 'D05'),
  ('07636657000270', 'AVB Acailandia',    'acailandia_avb',   'MAT', NULL,  NULL),
  ('10481071000107', 'Couro',             NULL,               'MAT', NULL,  NULL)
ON CONFLICT (cnpj) DO NOTHING;

-- RLS: mesmo padrão anon-permissivo já usado em frete_conferencia/controle_operacional.
ALTER TABLE frete_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_read_frete_clientes  ON frete_clientes FOR SELECT USING (true);
CREATE POLICY anon_write_frete_clientes ON frete_clientes FOR INSERT WITH CHECK (true);
CREATE POLICY anon_upd_frete_clientes   ON frete_clientes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY anon_del_frete_clientes   ON frete_clientes FOR DELETE USING (true);
