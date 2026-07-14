// ── motoristas.js ──
// CRUD do cadastro de motoristas (tabela `motoristas`, Supabase). Substitui a
// fonte de dados que estava em localStorage (`co_motoristas`) — a lista de
// consumidores (App.jsx e ~15 telas) continua enxergando o mesmo formato de
// sempre (array com nome/cpf/tel/placa1..placa4/...); ver useMotoristas.js
// pra como isso é montado a partir daqui + veiculos.js.
import { supaFetch } from "./supabase.js";

const TABELA = "motoristas";

export async function listarMotoristas(conn) {
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?order=nome.asc`)) || [];
}

// dados: { nome, cpf, tel, status_risco, observacao, vinculo, banco, agencia, conta, favorecido, criado_por }
export async function criarMotorista(conn, dados) {
  const res = await supaFetch(conn.url, conn.key, "POST", TABELA, [dados]);
  return Array.isArray(res) ? res[0] : res;
}

// Insert em lote (usado pela importação da agenda — um a um seria inviável pra
// milhares de contatos). Não confiar na ordem de retorno pra casar id x contato;
// quem chama deve re-buscar por `criado_por` (ver motoristasImport.js).
export async function criarMotoristasEmLote(conn, lista) {
  if (!lista.length) return [];
  return (await supaFetch(conn.url, conn.key, "POST", TABELA, lista)) || [];
}

// Usado logo após criarMotoristasEmLote pra recuperar os ids de forma confiável
// (sem depender da ordem de retorno do insert) — filtra pela tag de lote.
export async function listarMotoristasPorCriadoPor(conn, criadoPor) {
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?criado_por=eq.${encodeURIComponent(criadoPor)}`)) || [];
}

export async function atualizarMotorista(conn, id, patch) {
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${id}`, patch);
  return Array.isArray(res) ? res[0] : res;
}

export function excluirMotorista(conn, id) {
  return supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=eq.${id}`);
}
