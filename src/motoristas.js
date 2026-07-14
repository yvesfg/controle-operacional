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

export async function atualizarMotorista(conn, id, patch) {
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${id}`, patch);
  return Array.isArray(res) ? res[0] : res;
}

export function excluirMotorista(conn, id) {
  return supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=eq.${id}`);
}
