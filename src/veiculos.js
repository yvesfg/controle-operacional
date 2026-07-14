// ── veiculos.js ──
// CRUD do cadastro de veículos (tabela `veiculos`, Supabase) — cavalos e
// carretas, vinculados a um motorista via `motorista_id` (null = sem
// vínculo atual). Ver migration 008 pra por que config_eixos/carroceria/
// capacidade_m3 só fazem sentido pra tipo='carreta'.
import { supaFetch } from "./supabase.js";

const TABELA = "veiculos";

export const soDigitosPlaca = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function listarVeiculos(conn) {
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?order=placa.asc`)) || [];
}

// dados: { placa, tipo, config_eixos, carroceria, capacidade_m3, motorista_id, criado_por }
export async function criarVeiculo(conn, dados) {
  const res = await supaFetch(conn.url, conn.key, "POST", TABELA, [{ ...dados, placa: soDigitosPlaca(dados.placa) }]);
  return Array.isArray(res) ? res[0] : res;
}

export async function atualizarVeiculo(conn, placa, patch) {
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?placa=eq.${soDigitosPlaca(placa)}`, patch);
  return Array.isArray(res) ? res[0] : res;
}

export function excluirVeiculo(conn, placa) {
  return supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?placa=eq.${soDigitosPlaca(placa)}`);
}

// Desvincula todos os veículos de um motorista (usado antes de excluir um motorista,
// pra não deixar veiculo.motorista_id apontando pra um id que sumiu — apesar da FK já
// ter ON DELETE SET NULL, fazer explícito evita depender só do banco em telas de UI).
export function desvincularVeiculosDoMotorista(conn, motoristaId) {
  return supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?motorista_id=eq.${motoristaId}`, { motorista_id: null });
}
