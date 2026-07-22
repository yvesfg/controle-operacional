// ── veiculos.js ──
// CRUD do cadastro de veículos (tabela `veiculos`, Supabase) — cavalos e
// carretas, vinculados a um motorista via `motorista_id` (null = sem
// vínculo atual). Ver migration 008 pra por que config_eixos/carroceria/
// capacidade_m3 só fazem sentido pra tipo='carreta'.
// SEGURANÇA (V2): acesso via RPCs SECURITY DEFINER token-validadas (migration 026),
// mesmo modelo DUAL-PATH de motoristas.js: com token de sessão usa a RPC; sem token
// cai no REST anon (enquanto as policies abertas não forem derrubadas no go-live).
// Token injetado por App.jsx via setVeiculosToken().
import { supaFetch } from "./supabase.js";

const TABELA = "veiculos";

let _sessionToken = null;
export function setVeiculosToken(t) { _sessionToken = t || null; }

export const soDigitosPlaca = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function listarVeiculos(conn) {
  if (_sessionToken) {
    const r = await supaFetch(conn.url, conn.key, "POST", "rpc/listar_veiculos", { p_token: _sessionToken });
    return Array.isArray(r) ? r : [];
  }
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?order=placa.asc`)) || [];
}

// dados: { placa, tipo, config_eixos, carroceria, capacidade_m3, motorista_id, criado_por }
export async function criarVeiculo(conn, dados) {
  if (_sessionToken) {
    return await supaFetch(conn.url, conn.key, "POST", "rpc/criar_veiculo", { p_token: _sessionToken, p_dados: dados });
  }
  const res = await supaFetch(conn.url, conn.key, "POST", TABELA, [{ ...dados, placa: soDigitosPlaca(dados.placa) }]);
  return Array.isArray(res) ? res[0] : res;
}

// Insert/upsert em lote (placa é PK — reatribuir uma placa existente é só mandar
// ela de novo com outro motorista_id). Usado pela importação da agenda; chunka
// pra não estourar o payload de uma request.
export async function criarVeiculosEmLote(conn, lista, chunkSize = 300) {
  const normalizados = lista.map((d) => ({ ...d, placa: soDigitosPlaca(d.placa) }));
  const out = [];
  for (let i = 0; i < normalizados.length; i += chunkSize) {
    const bloco = normalizados.slice(i, i + chunkSize);
    const res = _sessionToken
      ? await supaFetch(conn.url, conn.key, "POST", "rpc/criar_veiculos_lote", { p_token: _sessionToken, p_rows: bloco })
      : await supaFetch(conn.url, conn.key, "POST", TABELA, bloco);
    if (Array.isArray(res)) out.push(...res);
  }
  return out;
}

export async function atualizarVeiculo(conn, placa, patch) {
  if (_sessionToken) {
    return await supaFetch(conn.url, conn.key, "POST", "rpc/atualizar_veiculo", { p_token: _sessionToken, p_placa: soDigitosPlaca(placa), p_patch: patch });
  }
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?placa=eq.${soDigitosPlaca(placa)}`, patch);
  return Array.isArray(res) ? res[0] : res;
}

export function excluirVeiculo(conn, placa) {
  if (_sessionToken) {
    return supaFetch(conn.url, conn.key, "POST", "rpc/excluir_veiculo", { p_token: _sessionToken, p_placa: soDigitosPlaca(placa) });
  }
  return supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?placa=eq.${soDigitosPlaca(placa)}`);
}

// Desvincula todos os veículos de um motorista (usado antes de excluir um motorista,
// pra não deixar veiculo.motorista_id apontando pra um id que sumiu — apesar da FK já
// ter ON DELETE SET NULL, fazer explícito evita depender só do banco em telas de UI).
export function desvincularVeiculosDoMotorista(conn, motoristaId) {
  if (_sessionToken) {
    return supaFetch(conn.url, conn.key, "POST", "rpc/desvincular_veiculos_motorista", { p_token: _sessionToken, p_motorista_id: motoristaId });
  }
  return supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?motorista_id=eq.${encodeURIComponent(motoristaId)}`, { motorista_id: null });
}
