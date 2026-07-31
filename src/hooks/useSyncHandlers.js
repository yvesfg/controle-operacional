import { useCallback } from "react";
import { loadJSON, saveJSON } from "../utils.js";
import { supaFetch } from "../supabase.js";
import { TABLE_APOINTS, TABLE_USUARIOS } from "../constants.js";
import { apontFromSupabase } from "../utils/apontMappers.js";

export function useSyncHandlers({
  getConexao, showToast, tblRef, sessionToken, baseAtual, basesPermitidas,
  dadosExtras, setDadosBase, setDadosExtras, setConnStatus, setUltimaSync,
  setApontItems, setApontLoading, setUsuarios, setUsuariosPendentes,
}) {
// Sync
const sincronizar = useCallback(async () => {
  const conn = getConexao();
  if (!conn) { showToast("Sem conexão — configure o Supabase","warn"); return; }
  setConnStatus("syncing");
  try {
    // Modo consolidado ("Todas as bases"): carrega uma base por vez e marca a
    // origem em cada linha. O RPC já recebe a base, e o token valida cada uma
    // contra co_usuarios.bases_permitidas — quem não tem a base simplesmente
    // não recebe as linhas dela, sem precisar de regra nova aqui.
    const alvos = baseAtual?.consolidado
      ? (basesPermitidas || []).filter(b => b && !b.consolidado)
      : [baseAtual];

    // Consolidado sem bases ainda (Hub carregando) — nao zera o que ja esta na
    // tela; a sync roda de novo quando a lista chegar.
    if (!alvos.length || alvos.some(b => !b)) { setConnStatus("online"); return; }

    let all = [];
    const limit = 1000;
    for (const base of alvos) {
      let offset = 0;
      while (true) {
        const data = sessionToken
          ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_operacional",
              {p_token: sessionToken, p_base: base?.id ?? "imperatriz_belem", p_limit: limit, p_offset: offset})
              .then(r => Array.isArray(r) ? r.map(x => typeof x === "string" ? JSON.parse(x) : x) : [])
          : await supaFetch(conn.url, conn.key, "GET", `${base?.table ?? tblRef.current}?select=*&order=id.asc&limit=${limit}&offset=${offset}`);
        if (!Array.isArray(data) || !data.length) break;
        // Só marca no consolidado: numa base só, `_baseId` seria peso morto em
        // milhares de linhas e mais um campo pra vazar pros upserts.
        if (baseAtual?.consolidado) data.forEach(r => { r._baseId = base.id; r._baseLabel = base.label; });
        all = [...all, ...data];
        if (data.length < limit) break;
        offset += limit;
      }
    }
    setDadosBase(all);
    // Permite DT sem motorista sincronizarem normalmente
    const dts = new Set(all.map(r => r.dt));
    const newExtras = dadosExtras.filter(r => !dts.has(r.dt) && !dts.has(r._overrideDT) && r.nome);
    setDadosExtras(newExtras);
    saveJSON("dados_extras", newExtras);
    const now = new Date().toLocaleString("pt-BR");
    localStorage.setItem("ultima_sync", JSON.stringify(now));
    setUltimaSync(now);
    setConnStatus("online");
    showToast(`✅ ${all.length} registros sincronizados!`,"ok");
  } catch(e) {
    setConnStatus("error");
    showToast(`⚠️ ${e.message}`,"warn");
  }
}, [getConexao, dadosExtras, showToast, sessionToken, baseAtual, basesPermitidas]);

const carregarAponts = useCallback(async () => {
  const conn = getConexao();
  if (!conn) return;
  try {
    setApontLoading(true);
    const data = await supaFetch(conn.url, conn.key, "GET",
      `${TABLE_APOINTS}?select=*&order=created_at.desc&limit=500`);
    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map(apontFromSupabase);
      setApontItems(mapped);
      saveJSON("co_aponts", mapped);
    }
  } catch { /* usa localStorage */ }
  finally { setApontLoading(false); }
}, [getConexao]);

const syncUsuariosRemoto = useCallback(async () => {
  const conn = getConexao();
  if (!conn) return;
  try {
    const data = sessionToken
      ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_usuarios", {p_token: sessionToken})
      : await supaFetch(conn.url, conn.key, "GET", `${TABLE_USUARIOS}?select=*`);
    if (Array.isArray(data)) {
      const aprovados = data.filter(u => !u.status || u.status === "aprovado");
      const pendentes = data.filter(u => u.status === "pendente");
      const lista = sessionToken ? data : aprovados;
      setUsuarios(lista);
      saveJSON("co_usuarios_local", lista.map(({senha:_s,...r})=>r));
      if (!sessionToken) setUsuariosPendentes(pendentes);
    }
  } catch { /* silencioso */ }
}, [getConexao]);

// Recarrega apenas os pendentes de aprovação (uso no painel admin)
const carregarPendentes = useCallback(async () => {
  const conn = getConexao();
  if (!conn) return;
  try {
    const data = sessionToken
      ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_usuarios_pendentes", {p_token: sessionToken})
      : await supaFetch(conn.url, conn.key, "GET", `${TABLE_USUARIOS}?status=eq.pendente&select=*&order=solicitado_em.desc`);
    if (Array.isArray(data)) setUsuariosPendentes(data);
  } catch { /* silencioso */ }
}, [getConexao]);

  return { sincronizar, carregarAponts, syncUsuariosRemoto, carregarPendentes };
}
