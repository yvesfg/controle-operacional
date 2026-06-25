import { useCallback } from "react";
import { loadJSON, saveJSON, hashSenha, verificarSenha } from "../utils.js";
import { supaFetch } from "../supabase.js";
import { BASES, TABLE_CONFIG, ENV_SUPA_URL, ENV_SUPA_KEY, PERMS_PADRAO } from "../constants.js";
import { logoutSupa } from "../supabaseAuth.js";

export function useAuthHandlers({
  getConexao, showToast, registrarLog,
  sessionToken, usuarioLogado, perfil,
  authEmail, authSenha, setAuthEmail, setAuthSenha, setAuthMsg,
  setPerfil, setPerms, setAuthed, setUsuarioLogado,
  usuarios, setUsuarios,
  setAguardandoAprovacao, setPendingUserInfo,
  setPrimeiroLogin, primLoginSenha, primLoginSenha2, setPrimLoginSenha, setPrimLoginSenha2,
  setSessionToken, setBasesPermitidas, setBaseAtual, setHubScreen, setActiveTab,
}) {
// ── Helpers para co_config no Supabase ──
// ── co_config: colunas reais = chave + valor + updated_at ────────────────
const getConfigRemoto = useCallback(async (key) => {
  const conn = getConexao();
  if (!conn) return null;
  try {
    // Tenta convenção pt-BR (chave/valor) — usada pelo app internamente
    const d1 = await supaFetch(conn.url, conn.key, "GET", `${TABLE_CONFIG}?chave=eq.${key}&select=valor`);
    if (Array.isArray(d1) && d1.length > 0 && d1[0].valor != null) return d1[0].valor;
    // Fallback: convenção en (key/value) — usada pelo Apps Script legado
    const d2 = await supaFetch(conn.url, conn.key, "GET", `${TABLE_CONFIG}?key=eq.${key}&select=value`);
    if (Array.isArray(d2) && d2.length > 0 && d2[0].value != null) return d2[0].value;
    return null;
  } catch { return null; }
}, [getConexao]);

const setConfigRemoto = useCallback(async (key, value) => {
  const conn = getConexao();
  if (!conn) return;
  try {
    await supaFetch(conn.url, conn.key, "POST", `${TABLE_CONFIG}?on_conflict=chave`, [{chave: key, valor: value, updated_at: new Date().toISOString()}]);
  } catch { /* silencioso */ }
}, [getConexao]);

// Login handler
const handleLogin = async () => {
  setAuthMsg(null);
  const login = authEmail.trim().toLowerCase();
  if (!login) { setAuthMsg({t:"err",m:"⚠️ Digite seu email"}); return; }
  if (!authSenha) { setAuthMsg({t:"err",m:"⚠️ Digite a senha"}); return; }

  // ── Login ADMIN ──
  const adminEmailCfg = loadJSON("co_admin_email","").toLowerCase();
  if (login === "admin" || (adminEmailCfg && login === adminEmailCfg)) {
    // SEMPRE busca do Supabase primeiro — garante sincronização entre todos os dispositivos
    let storedHash = null;
    const conn = getConexao();
    if (conn) {
      try {
        storedHash = await getConfigRemoto("admin_senha_hash");
      } catch { /* fallback local */ }
    }
    // Fallback local removido por segurança — hash admin apenas no Supabase

    if (!storedHash) {
      setAuthMsg({t:"err",m:"⚠️ Senha admin não foi configurada. Acesse o painel admin e defina a senha."});
      setAuthSenha("");
      return;
    }
    let ok = false;
    try { ok = await verificarSenha(authSenha, storedHash); } catch { ok = authSenha === storedHash; }
    if (ok) {
      const p = "admin";
      const pm = {...PERMS_PADRAO.admin};
      setPerfil(p); setPerms(pm); setAuthed(true);
      setUsuarioLogado("Admin");
      saveJSON("co_sessao",{perfil:p,nome:"Admin",email:"admin@sistema",ts:Date.now(),baseIds:Object.keys(BASES)});
      registrarLog("LOGIN", `Admin logou no sistema (admin) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
      setAuthSenha(""); setAuthEmail("");
      // Admin tem acesso a todas as bases
      const _todasAdmin = Object.values(BASES);
      setBasesPermitidas(_todasAdmin);
      setBaseAtual(_todasAdmin.length === 1 ? _todasAdmin[0] : null);
      // Gera session token para admin (necessario para RPCs autenticadas)
      const connAdm = getConexao();
      if (connAdm) {
        supaFetch(connAdm.url, connAdm.key, "POST", "rpc/gerar_token_sessao", {p_email: "admin@sistema"})
          .then(tok => { if (typeof tok === "string") setSessionToken(tok); })
          .catch(() => {});
      }
    } else {
      setAuthMsg({t:"err",m:"❌ Senha incorreta"});
      setAuthSenha("");
    }
    return;
  }

  // ── Login USUÁRIO — busca SEMPRE do Supabase primeiro (sincronização real entre dispositivos) ──
  let found = null;
  const conn2 = getConexao();
  if (conn2) {
    try {
      // Tentar Supabase Auth com mesmas credenciais (para SSO no hub — não bloqueia)
      try {
        const _surl = conn2.url.replace(/\/$/,"");
        const _sr = await fetch(`${_surl}/auth/v1/token?grant_type=password`, {
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":conn2.key},
          body:JSON.stringify({email:authEmail.trim().toLowerCase(),password:authSenha})
        });
        if (_sr.ok) {
          const _st = await _sr.json();
          if (_st.access_token) try { sessionStorage.setItem("co_supa_tokens", JSON.stringify({access_token:_st.access_token,refresh_token:_st.refresh_token||""})); } catch {}
        }
      } catch (e) { console.error("[SSO] token fetch falhou:", e); }
      // RPC: hash calculado aqui, verificação feita no servidor — senha nunca retorna ao cliente
      const hashInformado = await hashSenha(authSenha);
      const remote = await supaFetch(conn2.url, conn2.key, "POST",
        `rpc/autenticar_usuario`,
        {p_email: authEmail.trim().toLowerCase(), p_hash: hashInformado});
      if (Array.isArray(remote) && remote.length > 0) {
        found = remote[0];
        // Atualiza cache local (sem senha, RPC já não retorna esse campo)
        const cacheAtual = loadJSON("co_usuarios_local", []);
        const {senha: _fs, ...foundSemSenha} = found;
        const cacheAtualizado = [...cacheAtual.filter(x => x.email !== found.email), foundSemSenha];
        saveJSON("co_usuarios_local", cacheAtualizado);
        setUsuarios(cacheAtualizado);
      }
    } catch { /* fallback lista local */ }
  }

  // Fallback offline: cache não armazena senha por segurança — exige conexão
  if (!found) {
    for (const u of usuarios) {
      if ((u.email||"").toLowerCase() === login) {
        // Senha não é cacheada localmente — não é possível autenticar offline
        let m = false;
        try { m = await verificarSenha(authSenha, u.senha); } catch { m = false; }
        if (m) { found = u; break; }
      }
    }
  }

  if (found) {
    const p = found.perfil || "visualizador";
    const pm = found.perms || {...PERMS_PADRAO[p]};
    setPerfil(p); setPerms(pm); setAuthed(true);
    setUsuarioLogado(found.nome || found.email);
    // Salva session_token em memória (nunca em localStorage)
    if (found.session_token) setSessionToken(found.session_token);
    saveJSON("co_sessao",{perfil:p,nome:found.nome||found.email,email:found.email,ts:Date.now(),baseIds:_idsUsr,perms:PERMS_PADRAO[p]||{}});
    registrarLog("LOGIN", `${found.nome||found.email} logou no sistema (${p}) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
    setAuthSenha(""); setAuthEmail("");
    // Carregar bases permitidas do usuario
    const _idsUsr = Array.isArray(found.bases_permitidas) ? found.bases_permitidas
      : (typeof found.bases_permitidas === "string" ? JSON.parse(found.bases_permitidas || '["imperatriz_belem"]') : ["imperatriz_belem"]);
    const _basesUsr = _idsUsr.map(id => BASES[id]).filter(Boolean);
    const _permitidasUsr = _basesUsr.length ? _basesUsr : [BASES.imperatriz_belem];
    setBasesPermitidas(_permitidasUsr);
    setBaseAtual(_permitidasUsr.length === 1 ? _permitidasUsr[0] : null);
  } else {
    // Checar se existe na lista local para dar mensagem correta
    const emailExiste = usuarios.some(u => (u.email||"").toLowerCase() === login);
    setAuthMsg({t:"err",m: emailExiste ? "❌ Senha incorreta" : "❌ Usuário não encontrado"});
    setAuthSenha("");
  }
};

const handleLogout = () => {
  registrarLog("LOGOUT", `${usuarioLogado||perfil||"usuário"} saiu do sistema · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
  // Invalida token server-side (M2/M3)
  const conn = getConexao();
  if (conn && sessionToken) {
    supaFetch(conn.url, conn.key, "POST", "rpc/logout_usuario", {p_token: sessionToken}).catch(()=>{});
  }
  setSessionToken(null);
  localStorage.removeItem("co_sessao");
  setAuthed(false); setPerfil(null); setPerms({});
  setActiveTab("dashboard"); setAuthSenha(""); setAuthEmail("");
  setUsuarioLogado(null);
  setBasesPermitidas([]);
  setBaseAtual(null);
  setHubScreen(null);
  sessionStorage.removeItem("co_supa_tokens");
  localStorage.removeItem("co_pending_user");
  logoutSupa();
};

// Salvar nova senha no primeiro login (local + Supabase)
const handlePrimeiroLoginSalvar = async () => {
  if (!primLoginSenha || primLoginSenha.length < 6) { showToast("⚠️ Senha deve ter ao menos 6 caracteres","warn"); return; }
  if (primLoginSenha !== primLoginSenha2) { showToast("❌ Senhas não conferem","err"); return; }
  const hash = await hashSenha(primLoginSenha);
  // Hash admin não é mais salvo localmente — apenas no Supabase
  await setConfigRemoto("admin_senha_hash", hash); // ← sincroniza todos os dispositivos
  setPrimeiroLogin(false);
  setPrimLoginSenha(""); setPrimLoginSenha2("");
  showToast("✅ Senha atualizada e sincronizada!","ok");
};

  return { getConfigRemoto, setConfigRemoto, handleLogin, handleLogout, handlePrimeiroLoginSalvar };
}
