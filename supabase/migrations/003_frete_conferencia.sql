-- =============================================
-- Migration 003: Conferência de Faturamento (frete_conferencia)
-- =============================================
-- Tabela ISOLADA de `controle_operacional` (que vem do Google Sheets/Apps
-- Script). Esta tabela vem das planilhas BRUTAS de faturamento (TMS/ERP,
-- Empresa=MAT/MAM/MAR/MRM/D01/D05) que os clientes/CTes exportam.
-- Os valores DEVERIAM bater com o operacional, mas hoje são fontes
-- independentes — não cruzar/deduplicar entre as duas tabelas ainda.
--
-- Identificação do cliente = CNPJ Remetente (determinístico). Ver
-- src/freteConferencia.js:CLIENTES para o cadastro de regras por cliente.

CREATE TABLE IF NOT EXISTS frete_conferencia (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- identificação
  base_id            text,               -- 'imperatriz_belem' | 'acailandia_avb' | null (clientes sem base mapeada, ex.: Couro)
  cliente             text NOT NULL,       -- 'Suzano Imperatriz' | 'Suzano Belem' | 'AVB Acailandia' | 'Couro' | ...
  cnpj_remetente     text NOT NULL,
  categoria          text NOT NULL,       -- 'frete' | 'descarga' | 'local' | 'diaria'
  periodo_ref        text NOT NULL,       -- 'AAAA-MM' (competência, derivada do nome do arquivo/data de emissão)

  -- chave de origem (dedupe)
  ctrc               text NOT NULL,
  empresa_cod        text,                -- MAT/MAM/MAR/MRM/D01/D05 (código bruto original)

  -- campos da planilha bruta
  data_emissao       date,
  trecho             text,
  nfs                text,
  placa              text,
  nome_usuario       text,
  numero_manifesto   text,
  numero_contrato    text,
  valor_nf           numeric,
  peso_nf            numeric,
  frete_peso         numeric,
  total_frete        numeric,
  valor_contrato_frete numeric,
  saldo              numeric,
  margem_lucro       numeric,

  -- flags de revisão (calculadas na importação, não sobrescrevem decisão manual)
  flag_negativa      boolean NOT NULL DEFAULT false,  -- margem_lucro < 0
  flag_baixa         boolean NOT NULL DEFAULT false,  -- 0 <= margem_lucro < 10
  flag_ambigua       boolean NOT NULL DEFAULT false,  -- 0 < margem_lucro < 1 (perto do corte descarga/local) OU valor_contrato_frete = 0 com frete cobrado
  flag_duplicidade   boolean NOT NULL DEFAULT false,  -- mesma Placa+Valor NF+Peso NF+Trecho+Total do Frete em >1 CTRC
  dup_grupo_chave    text,                             -- chave usada p/ agrupar as duplicatas na revisão

  -- decisão humana (nunca sobrescrita automaticamente após setada)
  decisao_manual     text,               -- 'confirmar_descarga' | 'confirmar_local' | 'ignorar_duplicidade' | 'confirmar_ambas' | null
  revisado_em        timestamptz,
  revisado_obs       text,

  origem             text NOT NULL DEFAULT 'import', -- 'import' | 'manual'
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cliente, categoria, ctrc, periodo_ref)
);

CREATE INDEX IF NOT EXISTS idx_frete_conf_periodo ON frete_conferencia (periodo_ref);
CREATE INDEX IF NOT EXISTS idx_frete_conf_cliente ON frete_conferencia (cliente);
CREATE INDEX IF NOT EXISTS idx_frete_conf_flags ON frete_conferencia (flag_negativa, flag_baixa, flag_ambigua, flag_duplicidade) WHERE decisao_manual IS NULL;

-- RLS: mesmo padrao (policy por comando, qual/with_check=true via anon key)
-- ja usado em despesas_filial/controle_operacional neste projeto.
ALTER TABLE frete_conferencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_read_frete_conf  ON frete_conferencia FOR SELECT USING (true);
CREATE POLICY anon_write_frete_conf ON frete_conferencia FOR INSERT WITH CHECK (true);
CREATE POLICY anon_upd_frete_conf   ON frete_conferencia FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY anon_del_frete_conf   ON frete_conferencia FOR DELETE USING (true);
