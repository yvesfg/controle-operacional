// ── embarcadoras.js ──
// Cadastro de embarcadoras (tabela `embarcadoras` no Supabase) — CRUD puro, sem React.
// Global de propósito: qualquer tela pode importar daqui. Nasceu dentro da Conferência
// de Faturamento (freteConferencia.js), saiu pra cá na migration 006.
//
// frete_cod / desc_local_cod / diaria_cod são os códigos da coluna "Empresa" da planilha
// do TMS. Só a Conferência lê esses campos; as demais telas usam nome/cnpj/cidade/uf.
import { supaFetch } from "./supabase.js";

const TABELA = "embarcadoras";

export const soDigitosCNPJ = (v) => String(v ?? "").replace(/\D/g, "").padStart(14, "0");

// "16404287022205" -> "16.404.287/0222-05"
export const formatCNPJ = (v) => {
  const d = soDigitosCNPJ(v);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

// Por padrão devolve só as ativas — é o que quase toda tela quer. A tela de cadastro
// passa incluirInativas pra poder reativar quem foi desligada.
export async function listarEmbarcadoras(conn, { incluirInativas = false } = {}) {
  const filtro = incluirInativas ? "" : "ativo=eq.true&";
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?${filtro}order=nome.asc`)) || [];
}

// dados: { cnpj, nome, razao_social, cidade, uf, base_id, frete_cod, desc_local_cod, diaria_cod, criado_por }
export async function criarEmbarcadora(conn, dados) {
  const res = await supaFetch(conn.url, conn.key, "POST", TABELA, [{ ...dados, cnpj: soDigitosCNPJ(dados.cnpj) }]);
  return Array.isArray(res) ? res[0] : res;
}

// patch: só os campos que mudaram (cnpj é a PK, não se altera — pra "trocar" o CNPJ,
// desativa a antiga e cadastra outra, senão o histórico de frete_conferencia fica órfão).
export async function atualizarEmbarcadora(conn, cnpj, patch) {
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?cnpj=eq.${soDigitosCNPJ(cnpj)}`, patch);
  return Array.isArray(res) ? res[0] : res;
}

// Desativar em vez de excluir: as linhas já importadas em frete_conferencia guardam o
// cnpj_remetente, e apagar o cadastro deixaria esse histórico sem nome.
export function setAtivoEmbarcadora(conn, cnpj, ativo) {
  return atualizarEmbarcadora(conn, cnpj, { ativo });
}

// [{cnpj, nome, ...}] -> { [cnpjSóDígitos]: {...} } — formato que parseFreteXLSX espera.
export function mapaEmbarcadoras(lista) {
  const out = {};
  (lista || []).forEach((e) => { out[soDigitosCNPJ(e.cnpj)] = e; });
  return out;
}
