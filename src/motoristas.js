// ── motoristas.js ──
// CRUD do cadastro de motoristas (tabela `motoristas`, Supabase). Substitui a
// fonte de dados que estava em localStorage (`co_motoristas`) — a lista de
// consumidores (App.jsx e ~15 telas) continua enxergando o mesmo formato de
// sempre (array com nome/cpf/tel/placa1..placa4/...); ver useMotoristas.js
// pra como isso é montado a partir daqui + veiculos.js.
//
// SEGURANÇA (V2): motoristas guarda CPF + dados bancários. O acesso passou a ser
// via RPCs SECURITY DEFINER token-validadas (migration 025). Modelo DUAL-PATH:
// se há token de sessão, usa a RPC; senão cai no REST anon (que ainda funciona
// enquanto as policies abertas não forem derrubadas no go-live). Assim o front
// novo pode subir e ser testado antes do lockdown, sem janela de quebra.
// O token é injetado por App.jsx via setMotoristasToken() quando a sessão gera.
import { supaFetch } from "./supabase.js";

const TABELA = "motoristas";

let _sessionToken = null;
export function setMotoristasToken(t) { _sessionToken = t || null; }

export async function listarMotoristas(conn) {
  if (_sessionToken) {
    const r = await supaFetch(conn.url, conn.key, "POST", "rpc/listar_motoristas", { p_token: _sessionToken });
    return Array.isArray(r) ? r : [];
  }
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?order=nome.asc`)) || [];
}

// dados: { nome, cpf, tel, status_risco, observacao, vinculo, banco, agencia, conta, favorecido, criado_por }
export async function criarMotorista(conn, dados) {
  if (_sessionToken) {
    return await supaFetch(conn.url, conn.key, "POST", "rpc/criar_motorista", { p_token: _sessionToken, p_dados: dados });
  }
  const res = await supaFetch(conn.url, conn.key, "POST", TABELA, [dados]);
  return Array.isArray(res) ? res[0] : res;
}

// Insert em lote (usado pela importação da agenda — um a um seria inviável pra
// milhares de contatos). Não confiar na ordem de retorno pra casar id x contato;
// quem chama deve re-buscar por `criado_por` (ver motoristasImport.js).
export async function criarMotoristasEmLote(conn, lista) {
  if (!lista.length) return [];
  if (_sessionToken) {
    return (await supaFetch(conn.url, conn.key, "POST", "rpc/criar_motoristas_lote", { p_token: _sessionToken, p_rows: lista })) || [];
  }
  return (await supaFetch(conn.url, conn.key, "POST", TABELA, lista)) || [];
}

// Usado logo após criarMotoristasEmLote pra recuperar os ids de forma confiável
// (sem depender da ordem de retorno do insert) — filtra pela tag de lote.
export async function listarMotoristasPorCriadoPor(conn, criadoPor) {
  if (_sessionToken) {
    return (await supaFetch(conn.url, conn.key, "POST", "rpc/listar_motoristas_por_criado_por", { p_token: _sessionToken, p_criado_por: criadoPor })) || [];
  }
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?criado_por=eq.${encodeURIComponent(criadoPor)}`)) || [];
}

export async function atualizarMotorista(conn, id, patch) {
  if (_sessionToken) {
    return await supaFetch(conn.url, conn.key, "POST", "rpc/atualizar_motorista", { p_token: _sessionToken, p_id: id, p_patch: patch });
  }
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${encodeURIComponent(id)}`, patch);
  return Array.isArray(res) ? res[0] : res;
}

export async function excluirMotorista(conn, id) {
  if (_sessionToken) {
    return await supaFetch(conn.url, conn.key, "POST", "rpc/excluir_motorista", { p_token: _sessionToken, p_id: id });
  }
  return supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=eq.${encodeURIComponent(id)}`);
}
