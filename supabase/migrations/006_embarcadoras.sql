-- =============================================
-- Migration 006: frete_clientes -> embarcadoras (cadastro global)
-- =============================================
-- O cadastro nasceu dentro da Conferencia de Faturamento (migration 005), com
-- nome e vocabulario do modulo de frete. A ideia agora e usa-lo em outras telas
-- (Operacional, Divulgacao, etc.), entao a tabela vira `embarcadoras` — nome
-- neutro — enquanto ainda so um arquivo do codigo a referencia (freteConferencia.js).
--
-- frete_cod / desc_local_cod / diaria_cod CONTINUAM aqui: sao os codigos da
-- coluna "Empresa" da planilha do TMS e so a Conferencia le. Ficam como colunas
-- opcionais do cadastro; nenhuma outra tela precisa saber que existem.
--
-- Campos novos: razao_social, cidade, uf (a planta/unidade do CNPJ — cada CNPJ
-- aqui e uma unidade, nao o grupo: Suzano Imperatriz e Suzano Belem sao CNPJs
-- distintos) e ativo (aposentar embarcadora sem apagar historico).

ALTER TABLE frete_clientes RENAME TO embarcadoras;

ALTER TABLE embarcadoras
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS cidade       text,
  ADD COLUMN IF NOT EXISTS uf           text,
  ADD COLUMN IF NOT EXISTS ativo        boolean NOT NULL DEFAULT true;

-- Policies acompanham a tabela no RENAME, mas os nomes ficariam com o rotulo antigo.
ALTER POLICY anon_read_frete_clientes  ON embarcadoras RENAME TO anon_read_embarcadoras;
ALTER POLICY anon_write_frete_clientes ON embarcadoras RENAME TO anon_write_embarcadoras;
ALTER POLICY anon_upd_frete_clientes   ON embarcadoras RENAME TO anon_upd_embarcadoras;
ALTER POLICY anon_del_frete_clientes   ON embarcadoras RENAME TO anon_del_embarcadoras;

-- Cidade/UF das 4 embarcadoras que ja existiam (seed da 005), pra tabela nao nascer vazia
-- nesses campos. Razao social fica em branco de proposito — preencher pela tela (fase 3).
UPDATE embarcadoras SET cidade = 'Imperatriz',  uf = 'MA' WHERE cnpj = '16404287022205';
UPDATE embarcadoras SET cidade = 'Belem',       uf = 'PA' WHERE cnpj = '16404287069864';
UPDATE embarcadoras SET cidade = 'Acailandia',  uf = 'MA' WHERE cnpj = '07636657000270';
