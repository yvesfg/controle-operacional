-- =============================================
-- Migration 071: templates de cadastro por embarcadora
-- =============================================
-- A Suzano pede o MESMO dado em dois arquivos diferentes: um com três abas
-- tabulares (MOTORISTA / VEICULOS / CARRETA) e outro com blocos empilhados
-- (cabeçalho repetido a cada motorista). E não é só o formato que muda — o
-- mesmo campo sai escrito diferente: ESTADO CNH é "MA" num e "MARANHÃO" no
-- outro, TIPO DO VEÍCULO é "CAVALO" num e "TRACAO CAMINHAO TRATOR" no outro,
-- tanque é "540" num e "560 LITROS" no outro.
--
-- Por isso o layout é DADO, não código: a próxima embarcadora entra com um
-- INSERT aqui, sem deploy. `definicao` guarda as seções (uma por escopo) e,
-- em cada uma, as colunas na ordem, com o campo de origem e o formato.
--
-- Sem PII: é configuração de layout. Segue o mesmo RLS anon-permissivo de
-- `embarcadoras` (migration 006), não o modelo de RPC token-validada de
-- motoristas/veiculos.
--
-- A mesma definição existe em src/cadastroTemplates.js como fallback, pra
-- instalação nova (ou leitura falha) não deixar o analista sem modelo.

CREATE TABLE IF NOT EXISTS cadastro_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embarcadora text NOT NULL,
  nome        text NOT NULL,
  layout      text NOT NULL CHECK (layout IN ('abas', 'blocos')),
  definicao   jsonb NOT NULL,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  criado_por  text,
  UNIQUE (embarcadora, nome)
);

ALTER TABLE cadastro_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY anon_read_cadastro_templates  ON cadastro_templates FOR SELECT USING (true);
  CREATE POLICY anon_write_cadastro_templates ON cadastro_templates FOR INSERT WITH CHECK (true);
  CREATE POLICY anon_upd_cadastro_templates   ON cadastro_templates FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY anon_del_cadastro_templates   ON cadastro_templates FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Os dois modelos reais da Suzano ────────────────────────────────────────
INSERT INTO cadastro_templates (embarcadora, nome, layout, definicao, criado_por)
VALUES
('SUZANO', 'Três abas (MOTORISTA / VEICULOS / CARRETA)', 'abas', $json${
  "secoes": [
    {"nome": "MOTORISTA", "escopo": "motorista", "colunas": [
      {"titulo": "NOME COMPLETO", "campo": "nome"},
      {"titulo": "CPF", "campo": "cpf", "formato": "cpf"},
      {"titulo": "CNH", "campo": "cnh_numero"},
      {"titulo": "CATEGORIA CNH", "campo": "cnh_categoria"},
      {"titulo": "VALIDADE CNH", "campo": "cnh_validade", "formato": "data"},
      {"titulo": "ESTADO CNH", "campo": "cnh_uf", "formato": "uf_extenso"},
      {"titulo": "GÊNERO", "campo": "genero"},
      {"titulo": "DATA DE NASCIMENTO", "campo": "data_nascimento", "formato": "data"},
      {"titulo": "TELEFONE", "campo": "tel", "formato": "telefone"},
      {"titulo": "QUALIFICAÇÃO", "campo": "qualificacao", "padrao": "X"},
      {"titulo": "FUNÇÃO", "campo": "funcao"}
    ]},
    {"nome": "VEICULOS", "escopo": "cavalo", "colunas": [
      {"titulo": "PLACA", "campo": "placa"},
      {"titulo": "TIPO DO VEÍCULO", "campo": "tipo", "fixo": "TRACAO CAMINHAO TRATOR"},
      {"titulo": "MARCA", "campo": "marca"},
      {"titulo": "MODELO", "campo": "modelo"},
      {"titulo": "COR", "campo": "cor"},
      {"titulo": "ANO", "campo": "ano"},
      {"titulo": "RENAVAM", "campo": "renavam", "formato": "renavam"},
      {"titulo": "CAPACIDADE TANQUE COMBUSTÍVEL", "campo": "tanque_litros", "formato": "tanque", "sufixo": " LITROS"},
      {"titulo": "CPF / CNPJ RESPONSÁVEL", "campo": "cpf_cnpj_responsavel", "formato": "cpf_cnpj"}
    ]},
    {"nome": "CARRETA", "escopo": "carreta", "colunas": [
      {"titulo": "CARRETA 1", "campo": "placa"},
      {"titulo": "TIPO DO VEÍCULO", "campo": "tipo", "fixo": "CARGA SEMI-REBOQUE"},
      {"titulo": "MARCA", "campo": "marca"},
      {"titulo": "MODELO", "campo": "modelo"},
      {"titulo": "COR", "campo": "cor"},
      {"titulo": "ANO", "campo": "ano"},
      {"titulo": "RENAVAM", "campo": "renavam", "formato": "renavam"},
      {"titulo": "CAPACIDADE TANQUE COMBUSTÍVEL", "campo": "tanque_litros", "formato": "tanque", "padrao": "X"},
      {"titulo": "CPF / CNPJ RESPONSÁVEL", "campo": "cpf_cnpj_responsavel", "formato": "cpf_cnpj"}
    ]}
  ]
}$json$, 'migration-071'),
('SUZANO', 'Blocos empilhados (uma aba)', 'blocos', $json${
  "aba": "VEICULOS",
  "secoes": [
    {"nome": "MOTORISTA", "escopo": "motorista", "colunas": [
      {"titulo": "NOME COMPLETO", "campo": "nome"},
      {"titulo": "CPF", "campo": "cpf", "formato": "cpf"},
      {"titulo": "CNH", "campo": "cnh_numero"},
      {"titulo": "CATEGORIA CNH", "campo": "cnh_categoria"},
      {"titulo": "VALIDADE CNH", "campo": "cnh_validade", "formato": "data"},
      {"titulo": "ESTADO CNH", "campo": "cnh_uf", "formato": "uf_sigla"},
      {"titulo": "GÊNERO", "campo": "genero"},
      {"titulo": "DATA DE NASCIMENTO", "campo": "data_nascimento", "formato": "data"},
      {"titulo": "TELEFONE", "campo": "tel", "formato": "telefone"},
      {"titulo": "FUNÇÃO", "campo": "funcao"}
    ]},
    {"nome": "PLACA", "escopo": "cavalo", "colunas": [
      {"titulo": "PLACA", "campo": "placa"},
      {"titulo": "TIPO DO VEÍCULO", "campo": "tipo", "fixo": "CAVALO"},
      {"titulo": "MARCA", "campo": "marca"},
      {"titulo": "MODELO", "campo": "modelo"},
      {"titulo": "COR", "campo": "cor"},
      {"titulo": "ANO", "campo": "ano"},
      {"titulo": "RENAVAM", "campo": "renavam", "formato": "renavam"},
      {"titulo": "CAPACIDADE TANQUE COMBUSTÍVEL", "campo": "tanque_litros", "formato": "tanque"},
      {"titulo": "CPF / CNPJ RESPONSÁVEL", "campo": "cpf_cnpj_responsavel", "formato": "cpf_cnpj"}
    ]},
    {"nome": "CARRETA 1", "escopo": "carreta", "colunas": [
      {"titulo": "CARRETA 1", "campo": "placa"},
      {"titulo": "TIPO DO VEÍCULO", "campo": "tipo", "fixo": "CARRETA"},
      {"titulo": "MARCA", "campo": "marca"},
      {"titulo": "MODELO", "campo": "modelo"},
      {"titulo": "COR", "campo": "cor"},
      {"titulo": "ANO", "campo": "ano"},
      {"titulo": "RENAVAM", "campo": "renavam", "formato": "renavam"},
      {"titulo": "CAPACIDADE TANQUE COMBUSTÍVEL", "campo": "tanque_litros", "formato": "tanque", "padrao": "XXXXX"},
      {"titulo": "CPF / CNPJ RESPONSÁVEL", "campo": "cpf_cnpj_responsavel", "formato": "cpf_cnpj"}
    ]}
  ]
}$json$, 'migration-071')
ON CONFLICT (embarcadora, nome) DO NOTHING;
