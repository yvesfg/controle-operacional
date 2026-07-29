// ── operacao/bases.js ──
// Registro de bases: junta o que vem do BANCO (tabela co_bases, migration 043) com o
// que está fixo em constants.js (BASES). O banco vence; o código é o fallback.
//
// É o que torna "cadastrar uma transportadora nova" possível SEM deploy: a base passa a
// existir pra escolher (id/label/tabela) e o perfil dela (features/vocabulário) já vem
// junto. Se a chamada falhar — offline, RPC fora do ar, banco vazio — nada acontece:
// o app segue com as bases do código, exatamente como antes.
//
// Bootstrap: `listar_bases()` NÃO exige token (migration 044), porque o mapeamento
// id -> base acontece no login/Hub, antes de existir sessão. O conteúdo é o mesmo que
// já viaja no bundle público.
import { supaFetch } from "../supabase.js";
import { BASES } from "../constants.js";
import { setPerfisRemotos } from "./perfil.js";

// { [id]: {id, label, table} } — só o que veio do banco.
let _remotas = {};

// Chamado uma vez no boot. Devolve true se trouxe algo (útil pra decidir re-render).
export async function carregarBases(conn) {
  if (!conn) return false;
  const linhas = await supaFetch(conn.url, conn.key, "POST", "rpc/listar_bases", {});
  const lista = Array.isArray(linhas)
    ? linhas.map((x) => (typeof x === "string" ? JSON.parse(x) : x))
    : [];
  if (!lista.length) return false;

  const bases = {}, perfis = {};
  for (const b of lista) {
    if (!b?.id) continue;
    // `table` (nome usado no front, vindo de BASES) x `tabela` (coluna do banco).
    bases[b.id] = { id: b.id, label: b.label || b.id, table: b.tabela };
    if (b.perfil && typeof b.perfil === "object") perfis[b.id] = b.perfil;
  }
  _remotas = bases;
  setPerfisRemotos(perfis);
  return true;
}

// Substitui `BASES[id]` nos pontos que montam a lista de bases do usuário.
export function getBase(id) {
  return _remotas[id] || BASES[id] || null;
}

// Todas as bases conhecidas (banco + código), sem duplicar id.
export function getTodasBases() {
  return { ...BASES, ..._remotas };
}

// Escrita: só admin (gate no servidor, migration 043). Usada pela tela do Admin.
export async function salvarBase(conn, token, id, dados) {
  return supaFetch(conn.url, conn.key, "POST", "rpc/salvar_base", {
    p_token: token, p_id: id, p_dados: dados,
  });
}
