// ── cadastroTemplates.js ──
// Leitura dos modelos de arquivo por embarcadora (tabela `cadastro_templates`,
// migration 071). Modelo novo é INSERT no banco, não deploy.
//
// TEMPLATES_PADRAO é a cópia dos dois modelos da Suzano que a migration semeia:
// serve de rede quando a tabela ainda não existe (instalação nova) ou a leitura
// falha — sem isso o analista fica sem gerar arquivo por causa de infraestrutura.
// Foi GERADO a partir do SQL da migration, então os dois nascem iguais.
import { supaFetch } from "./supabase.js";

export const TEMPLATES_PADRAO = [
  {
    "id": "padrao-abas",
    "embarcadora": "SUZANO",
    "nome": "Três abas (MOTORISTA / VEICULOS / CARRETA)",
    "layout": "abas",
    "ativo": true,
    "definicao": {
      "secoes": [
        {
          "nome": "MOTORISTA",
          "escopo": "motorista",
          "colunas": [
            {
              "titulo": "NOME COMPLETO",
              "campo": "nome"
            },
            {
              "titulo": "CPF",
              "campo": "cpf",
              "formato": "cpf"
            },
            {
              "titulo": "CNH",
              "campo": "cnh_numero"
            },
            {
              "titulo": "CATEGORIA CNH",
              "campo": "cnh_categoria"
            },
            {
              "titulo": "VALIDADE CNH",
              "campo": "cnh_validade",
              "formato": "data"
            },
            {
              "titulo": "ESTADO CNH",
              "campo": "cnh_uf",
              "formato": "uf_extenso"
            },
            {
              "titulo": "GÊNERO",
              "campo": "genero"
            },
            {
              "titulo": "DATA DE NASCIMENTO",
              "campo": "data_nascimento",
              "formato": "data"
            },
            {
              "titulo": "TELEFONE",
              "campo": "tel",
              "formato": "telefone"
            },
            {
              "titulo": "QUALIFICAÇÃO",
              "campo": "qualificacao",
              "padrao": "X"
            },
            {
              "titulo": "FUNÇÃO",
              "campo": "funcao"
            }
          ]
        },
        {
          "nome": "VEICULOS",
          "escopo": "cavalo",
          "colunas": [
            {
              "titulo": "PLACA",
              "campo": "placa"
            },
            {
              "titulo": "TIPO DO VEÍCULO",
              "campo": "tipo",
              "fixo": "TRACAO CAMINHAO TRATOR"
            },
            {
              "titulo": "MARCA",
              "campo": "marca"
            },
            {
              "titulo": "MODELO",
              "campo": "modelo"
            },
            {
              "titulo": "COR",
              "campo": "cor"
            },
            {
              "titulo": "ANO",
              "campo": "ano"
            },
            {
              "titulo": "RENAVAM",
              "campo": "renavam",
              "formato": "renavam"
            },
            {
              "titulo": "CAPACIDADE TANQUE COMBUSTÍVEL",
              "campo": "tanque_litros",
              "formato": "tanque",
              "sufixo": " LITROS"
            },
            {
              "titulo": "CPF / CNPJ RESPONSÁVEL",
              "campo": "cpf_cnpj_responsavel",
              "formato": "cpf_cnpj"
            }
          ]
        },
        {
          "nome": "CARRETA",
          "escopo": "carreta",
          "colunas": [
            {
              "titulo": "CARRETA 1",
              "campo": "placa"
            },
            {
              "titulo": "TIPO DO VEÍCULO",
              "campo": "tipo",
              "fixo": "CARGA SEMI-REBOQUE"
            },
            {
              "titulo": "MARCA",
              "campo": "marca"
            },
            {
              "titulo": "MODELO",
              "campo": "modelo"
            },
            {
              "titulo": "COR",
              "campo": "cor"
            },
            {
              "titulo": "ANO",
              "campo": "ano"
            },
            {
              "titulo": "RENAVAM",
              "campo": "renavam",
              "formato": "renavam"
            },
            {
              "titulo": "CAPACIDADE TANQUE COMBUSTÍVEL",
              "campo": "tanque_litros",
              "formato": "tanque",
              "padrao": "X"
            },
            {
              "titulo": "CPF / CNPJ RESPONSÁVEL",
              "campo": "cpf_cnpj_responsavel",
              "formato": "cpf_cnpj"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "padrao-blocos",
    "embarcadora": "SUZANO",
    "nome": "Blocos empilhados (uma aba)",
    "layout": "blocos",
    "ativo": true,
    "definicao": {
      "aba": "VEICULOS",
      "secoes": [
        {
          "nome": "MOTORISTA",
          "escopo": "motorista",
          "colunas": [
            {
              "titulo": "NOME COMPLETO",
              "campo": "nome"
            },
            {
              "titulo": "CPF",
              "campo": "cpf",
              "formato": "cpf"
            },
            {
              "titulo": "CNH",
              "campo": "cnh_numero"
            },
            {
              "titulo": "CATEGORIA CNH",
              "campo": "cnh_categoria"
            },
            {
              "titulo": "VALIDADE CNH",
              "campo": "cnh_validade",
              "formato": "data"
            },
            {
              "titulo": "ESTADO CNH",
              "campo": "cnh_uf",
              "formato": "uf_sigla"
            },
            {
              "titulo": "GÊNERO",
              "campo": "genero"
            },
            {
              "titulo": "DATA DE NASCIMENTO",
              "campo": "data_nascimento",
              "formato": "data"
            },
            {
              "titulo": "TELEFONE",
              "campo": "tel",
              "formato": "telefone"
            },
            {
              "titulo": "FUNÇÃO",
              "campo": "funcao"
            }
          ]
        },
        {
          "nome": "PLACA",
          "escopo": "cavalo",
          "colunas": [
            {
              "titulo": "PLACA",
              "campo": "placa"
            },
            {
              "titulo": "TIPO DO VEÍCULO",
              "campo": "tipo",
              "fixo": "CAVALO"
            },
            {
              "titulo": "MARCA",
              "campo": "marca"
            },
            {
              "titulo": "MODELO",
              "campo": "modelo"
            },
            {
              "titulo": "COR",
              "campo": "cor"
            },
            {
              "titulo": "ANO",
              "campo": "ano"
            },
            {
              "titulo": "RENAVAM",
              "campo": "renavam",
              "formato": "renavam"
            },
            {
              "titulo": "CAPACIDADE TANQUE COMBUSTÍVEL",
              "campo": "tanque_litros",
              "formato": "tanque"
            },
            {
              "titulo": "CPF / CNPJ RESPONSÁVEL",
              "campo": "cpf_cnpj_responsavel",
              "formato": "cpf_cnpj"
            }
          ]
        },
        {
          "nome": "CARRETA 1",
          "escopo": "carreta",
          "colunas": [
            {
              "titulo": "CARRETA 1",
              "campo": "placa"
            },
            {
              "titulo": "TIPO DO VEÍCULO",
              "campo": "tipo",
              "fixo": "CARRETA"
            },
            {
              "titulo": "MARCA",
              "campo": "marca"
            },
            {
              "titulo": "MODELO",
              "campo": "modelo"
            },
            {
              "titulo": "COR",
              "campo": "cor"
            },
            {
              "titulo": "ANO",
              "campo": "ano"
            },
            {
              "titulo": "RENAVAM",
              "campo": "renavam",
              "formato": "renavam"
            },
            {
              "titulo": "CAPACIDADE TANQUE COMBUSTÍVEL",
              "campo": "tanque_litros",
              "formato": "tanque",
              "padrao": "XXXXX"
            },
            {
              "titulo": "CPF / CNPJ RESPONSÁVEL",
              "campo": "cpf_cnpj_responsavel",
              "formato": "cpf_cnpj"
            }
          ]
        }
      ]
    }
  }
];

export async function listarTemplates(conn) {
  try {
    const rows = await supaFetch(conn.url, conn.key, "GET", "cadastro_templates?ativo=eq.true&order=embarcadora.asc,nome.asc");
    return rows?.length ? rows : TEMPLATES_PADRAO;
  } catch {
    return TEMPLATES_PADRAO;
  }
}
