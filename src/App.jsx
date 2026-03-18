import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ══════════════════════════════════════════════
//  THEME & COLOR SYSTEM
// ══════════════════════════════════════════════
const themes = {
  dark: {
    bg: "#0b0e11", bgAlt: "#0f1217", card: "#1e2026", card2: "#2b2f36",
    borda: "#2b2f36", borda2: "#3c4047", txt: "#eaecef", txt2: "#848e9c",
    ouro: "#f0b90b", ouroDk: "#d4a017", verde: "#02c076", verdeDk: "#019a60",
    danger: "#f6465d", warn: "#f0b90b", azul: "#1677ff", azulLt: "#47a8ff",
    headerBg: "#161a1e", modalBg: "#1a1e24", inputBg: "#2b2f36",
    shadow: "rgba(0,0,0,.5)", gradientAuth: "linear-gradient(160deg,#0b0e11,#161a1e 60%,#0b0e11)",
    scrollThumb: "#3c4047", tableHeader: "#161a1e",
  },
  light: {
    bg: "#f4f5f7", bgAlt: "#eef0f3", card: "#ffffff", card2: "#f0f1f3",
    borda: "#e2e4e8", borda2: "#d1d5db", txt: "#1a1d21", txt2: "#6b7280",
    ouro: "#d4a017", ouroDk: "#b8860b", verde: "#019a60", verdeDk: "#017a4c",
    danger: "#dc3545", warn: "#d4a017", azul: "#1677ff", azulLt: "#3b8efc",
    headerBg: "#ffffff", modalBg: "#ffffff", inputBg: "#f0f1f3",
    shadow: "rgba(0,0,0,.08)", gradientAuth: "linear-gradient(160deg,#f4f5f7,#e8eaed 60%,#f4f5f7)",
    scrollThumb: "#c5c8ce", tableHeader: "#f0f1f3",
  },
};

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const TABLE = "controle_operacional";
const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERMS_PADRAO = {
  admin:{financeiro:true,editar:true,importar:true,dashboard:true,diarias:true,descarga:true,planilha:true,config_db:true,usuarios:true},
  operador:{financeiro:false,editar:true,importar:true,dashboard:true,diarias:true,descarga:true,planilha:true,config_db:false,usuarios:false},
  visualizador:{financeiro:false,editar:false,importar:false,dashboard:true,diarias:true,descarga:true,planilha:true,config_db:false,usuarios:false},
};
const PERMS_LISTA = [
  {key:"financeiro",lbl:"Financeiro"},{key:"editar",lbl:"Editar"},{key:"importar",lbl:"Importar"},
  {key:"dashboard",lbl:"Dashboard"},{key:"diarias",lbl:"Diárias"},{key:"descarga",lbl:"Descarga"},
  {key:"planilha",lbl:"Planilha"},{key:"config_db",lbl:"Config DB"},{key:"usuarios",lbl:"Usuários"},
];
const SENHAS_PADRAO = {admin:"admin123",operador:"op123",visualizador:"view123"};

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function parseData(d) {
  if (!d) return null;
  d = String(d).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) { const p = d.split("/"); return new Date(+p[2], +p[1]-1, +p[0]); }
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const p = d.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
  return null;
}
function diffDias(d1, d2) { return d1 && d2 ? Math.round((d2-d1)/(864e5)) : null; }
function fmtMoeda(v) { const n = parseFloat(v); return !v || isNaN(n) ? "—" : "R$ "+n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function brToInput(d) { if (!d) return ""; d = String(d).trim(); if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0,10); const p = d.split("/"); return p.length===3 ? `${p[2]}-${p[1]}-${p[0]}` : ""; }
function inputToBr(v) { if (!v) return ""; const p = v.split("-"); return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : ""; }
function dtBase(dt) { return dt ? dt.replace(/[.\-\/\s]/g,"") : ""; }
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
async function hashSenha(s) {
  try { const e = new TextEncoder().encode(s); const h = await crypto.subtle.digest("SHA-256",e); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join(""); } catch { return s; }
}
async function verificarSenha(plain, stored) {
  if (plain === stored) return true;
  try { return (await hashSenha(plain)) === stored; } catch { return false; }
}

function loadJSON(key, def) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; } }
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ══════════════════════════════════════════════
//  SUPABASE HELPERS
// ══════════════════════════════════════════════
async function supaFetch(url, key, method, path, body) {
  if (!url || !key) throw new Error("Sem conexão configurada");
  const u = url.replace(/\/$/,"")+"/rest/v1/"+path;
  const h = {"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Prefer":method==="POST"?"return=representation,resolution=merge-duplicates":"return=representation"};
  const r = await fetch(u, {method, headers:h, ...(body?{body:JSON.stringify(body)}:{})});
  if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0,200)}`); }
  const ct = r.headers.get("content-type");
  return ct?.includes("json") ? r.json() : null;
}

// ══════════════════════════════════════════════
//  TOAST COMPONENT
// ══════════════════════════════════════════════
function Toast({ msg, type, visible }) {
  const t = themes.dark;
  const colors = { ok: t.verde, warn: t.ouro, err: t.danger, "": t.ouro };
  return (
    <div style={{
      position:"fixed",bottom:24,left:"50%",
      transform:`translateX(-50%) translateY(${visible?0:110}px)`,
      background:t.card,border:`1px solid ${colors[type]||t.ouro}`,borderRadius:12,
      padding:"10px 18px",fontSize:13,color:colors[type]||t.ouro,fontWeight:600,
      zIndex:9999,transition:"transform .3s cubic-bezier(.34,1.56,.64,1)",
      whiteSpace:"nowrap",pointerEvents:"none",backdropFilter:"blur(12px)",
      boxShadow:`0 8px 32px ${t.shadow}`,
    }}>{msg}</div>
  );
}

// ══════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState(() => loadJSON("co_theme","dark"));
  const t = themes[theme] || themes.dark;

  // Auth state
  const [authed, setAuthed] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [perms, setPerms] = useState({});
  const [authMode, setAuthMode] = useState("master");
  const [perfilSel, setPerfilSel] = useState("admin");
  const [authEmail, setAuthEmail] = useState("");
  const [authSenha, setAuthSenha] = useState("");
  const [authMsg, setAuthMsg] = useState(null);
  const [senhas, setSenhas] = useState(() => {
    const raw = loadJSON("co_senhas", null);
    if (raw?.admin && raw?.operador && raw?.visualizador) return raw;
    return {...SENHAS_PADRAO};
  });
  const [usuarios, setUsuarios] = useState(() => loadJSON("co_usuarios",[]));

  // Data state
  const [dadosBase, setDadosBase] = useState([]);
  const [dadosExtras, setDadosExtras] = useState(() => loadJSON("dados_extras",[]));
  const [motoristas, setMotoristas] = useState(() => loadJSON("co_motoristas",[]));
  const [conexoes, setConexoes] = useState(() => loadJSON("co_conexoes",[]));

  // UI state
  const [activeTab, setActiveTab] = useState("busca");
  const [toast, setToast] = useState({msg:"",type:"",visible:false});
  const [connStatus, setConnStatus] = useState("offline");
  const [ultimaSync, setUltimaSync] = useState(loadJSON("ultima_sync",""));

  // Search state
  const [buscaTipo, setBuscaTipo] = useState("dt");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaResult, setBuscaResult] = useState(null);
  const [buscaError, setBuscaError] = useState(null);
  const [historico, setHistorico] = useState(() => loadJSON("hist",[]));

  // Dashboard state
  const [dashMes, setDashMes] = useState("todos");

  // Diarias state
  const [dFiltro, setDFiltro] = useState("todos");
  const [dSubTab, setDSubTab] = useState("resumo");

  // Descarga state
  const [dscTab, setDscTab] = useState("hoje");
  const [dscData, setDscData] = useState(new Date().toISOString().slice(0,10));

  // Modal state
  const [modalOpen, setModalOpen] = useState(null); // 'edit' | 'motorista' | 'usuario' | 'wa' | 'import' | 'configdb'
  const [editIdx, setEditIdx] = useState(-1);
  const [editStep, setEditStep] = useState(1);
  const [formData, setFormData] = useState({});

  // Alerts
  const [alertasOpen, setAlertasOpen] = useState(false);

  // Chart refs
  const chartCarregRef = useRef(null);
  const chartCTERef = useRef(null);
  const chartInstances = useRef({c:null,f:null});

  // Combined data
  const DADOS = useMemo(() => {
    const base = dadosBase.map(r => {
      const o = {};
      Object.keys(r).forEach(k => o[k] = r[k]===null?"":String(r[k]));
      return o;
    });
    const extras = [...dadosExtras];
    const overrides = new Map();
    extras.filter(x => x._override).forEach(x => overrides.set(x._overrideDT, x));
    const merged = base.map(r => overrides.has(r.dt) ? overrides.get(r.dt) : r);
    const baseDTs = new Set(merged.map(r => r.dt));
    const additions = extras.filter(x => !x._override && !baseDTs.has(x.dt));
    return [...merged, ...additions];
  }, [dadosBase, dadosExtras]);

  // Alertas calculation
  const alertas = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const list = [];
    DADOS.forEach(r => {
      if (!r.nome?.trim()) return;
      const da = parseData(r.data_agenda), dd = parseData(r.data_desc);
      if (da && !dd) { const dif = diffDias(da,hoje); if (dif>=1) list.push({tipo:"danger",txt:`${r.nome} · DT ${r.dt} · Agenda ${r.data_agenda} sem descarga (${dif}d)`}); }
    });
    return list;
  }, [DADOS]);

  // Toast helper
  const showToast = useCallback((msg, type="") => {
    setToast({msg,type,visible:true});
    setTimeout(() => setToast(p => ({...p,visible:false})), 2800);
  }, []);

  // Connection
  const getConexao = useCallback(() => {
    const ativa = loadJSON("co_conexao_ativa",0);
    return conexoes[ativa] || conexoes[0] || null;
  }, [conexoes]);

  // Sync
  const sincronizar = useCallback(async () => {
    const conn = getConexao();
    if (!conn) { showToast("Sem conexão — configure o Supabase","warn"); return; }
    setConnStatus("syncing");
    try {
      let all = [];
      let offset = 0;
      const limit = 1000;
      while (true) {
        const data = await supaFetch(conn.url, conn.key, "GET", `${TABLE}?select=*&order=id.asc&limit=${limit}&offset=${offset}`);
        if (!Array.isArray(data) || !data.length) break;
        all = [...all, ...data];
        if (data.length < limit) break;
        offset += limit;
      }
      setDadosBase(all);
      const dts = new Set(all.map(r => r.dt));
      const newExtras = dadosExtras.filter(r => !dts.has(r.dt) && !dts.has(r._overrideDT));
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
  }, [getConexao, dadosExtras, showToast]);

  // Auto-login from session
  useEffect(() => {
    const s = loadJSON("co_sessao", null);
    if (s?.perfil) {
      setPerfil(s.perfil);
      setPerms(s.perms || PERMS_PADRAO[s.perfil] || {});
      setAuthed(true);
    }
  }, []);

  // Sync on auth
  useEffect(() => {
    if (authed && getConexao()) sincronizar();
  }, [authed]);

  // Save theme
  useEffect(() => { saveJSON("co_theme", theme); }, [theme]);

  // Login handler
  const handleLogin = async () => {
    setAuthMsg(null);
    if (!authSenha) { setAuthMsg({t:"err",m:"⚠️ Digite a senha"}); return; }
    if (authMode === "master") {
      const stored = senhas[perfilSel];
      let ok = false;
      try { ok = await verificarSenha(authSenha, stored); } catch { ok = authSenha === stored; }
      if (ok) {
        const p = perfilSel;
        const pm = {...PERMS_PADRAO[p]};
        setPerfil(p); setPerms(pm); setAuthed(true);
        saveJSON("co_sessao",{perfil:p,perms:pm,nome:p});
        setAuthSenha("");
      } else {
        setAuthMsg({t:"err",m:`❌ Senha incorreta para ${perfilSel.toUpperCase()}`});
        setAuthSenha("");
      }
    } else {
      if (!authEmail) { setAuthMsg({t:"err",m:"⚠️ Digite seu email"}); return; }
      let found = null;
      for (const u of usuarios) {
        if (u.email === authEmail) {
          let m = false;
          try { m = await verificarSenha(authSenha, u.senha); } catch { m = authSenha === u.senha; }
          if (m) { found = u; break; }
        }
      }
      if (found) {
        const p = found.perfil || "visualizador";
        const pm = found.perms || {...PERMS_PADRAO[p]};
        setPerfil(p); setPerms(pm); setAuthed(true);
        saveJSON("co_sessao",{perfil:p,perms:pm,nome:found.nome});
        setAuthSenha(""); setAuthEmail("");
      } else {
        const emailExists = usuarios.some(u => u.email === authEmail);
        setAuthMsg({t:"err",m: emailExists ? "❌ Senha incorreta" : "❌ Email não encontrado"});
        setAuthSenha("");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("co_sessao");
    setAuthed(false); setPerfil(null); setPerms({});
    setActiveTab("busca"); setAuthSenha("");
  };

  // Search
  const buscar = () => {
    setBuscaResult(null); setBuscaError(null);
    const v = buscaInput.trim();
    if (!v) return;
    let found = null;
    if (buscaTipo === "dt") {
      const c = v.replace(/\D/g,"");
      found = DADOS.find(r => r.dt?.replace(/\D/g,"") === c || dtBase(r.dt)?.replace(/\D/g,"") === c);
    } else if (buscaTipo === "cpf") {
      found = DADOS.find(r => r.cpf?.replace(/\D/g,"") === v.replace(/\D/g,""));
    } else {
      found = DADOS.find(r => r.placa?.toUpperCase().replace(/\W/g,"") === v.toUpperCase().replace(/\W/g,""));
    }
    if (found) {
      setBuscaResult(found);
      const newH = [{dt:found.dt,nome:found.nome||"—"},...historico.filter(h=>h.dt!==found.dt)].slice(0,5);
      setHistorico(newH);
      saveJSON("hist",newH);
    } else {
      setBuscaError(v);
    }
  };

  // Dashboard data
  const dashData = useMemo(() => {
    const grupos = {};
    DADOS.forEach(r => {
      const dc = r.data_carr || "";
      let mes = "";
      if (/^\d{2}\/\d{2}\/\d{4}/.test(dc)) { const p = dc.split("/"); mes = p[1]+"/"+p[2]; }
      else if (/^\d{4}-\d{2}/.test(dc)) { const p = dc.split("-"); mes = p[1]+"/"+p[0]; }
      if (!mes) return;
      if (!grupos[mes]) grupos[mes] = {regs:[],dts:new Set(),mots:new Set(),cte:0};
      grupos[mes].regs.push(r);
      grupos[mes].dts.add(dtBase(r.dt));
      if (r.nome) grupos[mes].mots.add(r.nome);
      const v = parseFloat(r.vl_cte); if (!isNaN(v)) grupos[mes].cte += v;
    });
    const meses = Object.keys(grupos).sort((a,b) => {
      const pa=a.split("/"),pb=b.split("/");
      return (+pa[1]*12+ +pa[0])-(+pb[1]*12+ +pb[0]);
    });
    const filtrado = dashMes==="todos" ? DADOS : (grupos[dashMes]?.regs||[]);
    const dtsU = new Set(filtrado.map(r=>dtBase(r.dt)));
    let cteT = 0; filtrado.forEach(r=>{ const v=parseFloat(r.vl_cte); if(!isNaN(v)) cteT+=v; });
    return { grupos, meses, filtrado, dtsU, cteT };
  }, [DADOS, dashMes]);

  // Diarias data
  const diariasData = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const regs = DADOS.filter(r => r.data_agenda || r.data_desc);
    let ok=0, atraso=0, pend=0;
    const items = regs.map(r => {
      const da = parseData(r.data_agenda), dd = parseData(r.data_desc);
      let tipo = "pendente", dias = null;
      if (da && dd) { dias = diffDias(da,dd); tipo = dias>0?"atraso":"ok"; }
      else if (da && !dd) { const dp = diffDias(da,hoje); tipo = dp>0?"atraso":"pendente"; dias = dp; }
      if (tipo==="ok") ok++; else if (tipo==="atraso") atraso++; else pend++;
      return {r, tipo, dias};
    });
    return { items, ok, atraso, pend };
  }, [DADOS]);

  // Descarga data
  const descargaData = useMemo(() => {
    const dataBusca = new Date(dscData+"T00:00:00");
    const hoje = DADOS.filter(r => {
      const d = parseData(r.data_desc) || parseData(r.data_agenda);
      return d && d.toISOString().slice(0,10) === dscData;
    });
    const atrasados = DADOS.filter(r => {
      const da = parseData(r.data_agenda);
      if (!da || da >= dataBusca) return false;
      return !r.data_desc?.trim();
    }).sort((a,b) => {
      const da = parseData(a.data_agenda), db = parseData(b.data_agenda);
      return da && db ? da-db : 0;
    });
    return { hoje, atrasados };
  }, [DADOS, dscData]);

  // Charts
  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const { grupos, meses } = dashData;
    const labels = meses.map(m => {const p=m.split("/"); return MESES_LABEL[+p[0]-1]+"/"+p[1].slice(2);});
    const dc = meses.map(m => grupos[m].regs.length);
    const dcte = meses.map(m => Math.round(grupos[m].cte));
    const isDark = theme === "dark";
    const gridC = isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.06)";
    const tickC = isDark ? "#848e9c" : "#6b7280";

    if (chartInstances.current.c) chartInstances.current.c.destroy();
    if (chartInstances.current.f) chartInstances.current.f.destroy();

    if (chartCarregRef.current) {
      chartInstances.current.c = new Chart(chartCarregRef.current, {
        type:"bar", data:{labels, datasets:[{label:"Carregamentos",data:dc,backgroundColor:"rgba(240,185,11,.65)",borderColor:"rgba(240,185,11,1)",borderWidth:1.5,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:tickC},grid:{color:gridC}},x:{ticks:{color:tickC},grid:{display:false}}}}
      });
    }
    if (chartCTERef.current && perms.financeiro) {
      chartInstances.current.f = new Chart(chartCTERef.current, {
        type:"bar", data:{labels, datasets:[{label:"CTE (R$)",data:dcte,backgroundColor:"rgba(2,192,118,.6)",borderColor:"rgba(2,192,118,1)",borderWidth:1.5,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:tickC,callback:v=>"R$"+v.toLocaleString("pt-BR")},grid:{color:gridC}},x:{ticks:{color:tickC},grid:{display:false}}}}
      });
    }
    return () => {
      if (chartInstances.current.c) chartInstances.current.c.destroy();
      if (chartInstances.current.f) chartInstances.current.f.destroy();
    };
  }, [activeTab, dashData, theme, perms.financeiro]);

  // Save motoristas
  const saveMotoristasLS = (m) => { setMotoristas(m); saveJSON("co_motoristas",m); };

  // Save conexoes
  const saveConexoesLS = (c) => { setConexoes(c); saveJSON("co_conexoes",c); };

  // Supabase upsert
  const supaUpsert = async (reg) => {
    const conn = getConexao();
    if (!conn) throw new Error("Sem conexão");
    const clean = {...reg}; delete clean._override; delete clean._overrideDT;
    if (!clean.dt) throw new Error("DT obrigatório");
    await supaFetch(conn.url, conn.key, "POST", TABLE, [clean]);
  };

  // Save record
  const salvarRegistro = async () => {
    const reg = {...formData};
    if (!reg.dt) { showToast("⚠️ DT obrigatório","warn"); return; }

    // local save
    const newExtras = [...dadosExtras];
    const existIdx = DADOS.findIndex(r => r.dt === reg.dt);
    if (editIdx >= 0) {
      if (editIdx < dadosBase.length) {
        reg._override = true;
        reg._overrideDT = dadosBase[editIdx].dt;
        const filtered = newExtras.filter(x => x._overrideDT !== reg._overrideDT);
        filtered.push(reg);
        setDadosExtras(filtered);
        saveJSON("dados_extras", filtered);
      } else {
        newExtras[editIdx - dadosBase.length] = reg;
        setDadosExtras(newExtras);
        saveJSON("dados_extras", newExtras);
      }
    } else {
      newExtras.push(reg);
      setDadosExtras(newExtras);
      saveJSON("dados_extras", newExtras);
    }

    // Supabase sync
    const conn = getConexao();
    if (conn) {
      try { await supaUpsert(reg); showToast("✅ Salvo e sincronizado!","ok"); }
      catch(e) { showToast("⚠️ Salvo local. Sync: "+e.message,"warn"); }
    } else {
      showToast("✅ Salvo localmente!","ok");
    }
    setModalOpen(null);
  };

  const isAdmin = perfil === "admin";
  const canEdit = isAdmin || perms.editar;
  const canFin = perms.financeiro;

  // ══════════════════════════════════════════════
  //  STYLES
  // ══════════════════════════════════════════════
  const css = {
    app: { minHeight:"100vh", background:t.bg, color:t.txt, fontFamily:"'Barlow','Segoe UI',system-ui,sans-serif", transition:"background .3s, color .3s" },
    // Header
    header: { background:t.headerBg, padding:"12px 16px", borderBottom:`2px solid ${t.ouro}`, position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", gap:10, boxShadow:`0 2px 12px ${t.shadow}`, transition:"background .3s" },
    logo: { width:38, height:38, background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, boxShadow:`0 2px 8px rgba(240,185,11,.3)` },
    hBtn: { background:"rgba(128,128,128,.08)", border:`1.5px solid ${t.borda}`, borderRadius:10, padding:"8px 12px", color:t.txt2, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:600, transition:"all .2s" },
    // Tabs
    tabBar: { display:"flex", background:t.headerBg, borderBottom:`1px solid ${t.borda}`, overflowX:"auto", padding:"6px 10px", gap:4, scrollbarWidth:"none", transition:"background .3s" },
    tab: (a) => ({ flex:"0 0 auto", padding:"10px 16px", fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:a?t.ouro:t.txt2, border:"none", background:a?`rgba(240,185,11,.1)`:"transparent", cursor:"pointer", borderRadius:10, whiteSpace:"nowrap", transition:"all .2s", boxShadow:a?`0 0 0 1.5px rgba(240,185,11,.22) inset`:"none" }),
    // Cards
    card: { background:t.card, borderRadius:14, border:`1px solid ${t.borda}`, overflow:"hidden", transition:"background .3s, border-color .3s" },
    kpi: (color) => ({ background:t.card, borderRadius:14, padding:16, border:`1px solid ${t.borda}`, textAlign:"center", borderTop:`3px solid ${color}`, cursor:"default", transition:"all .2s, background .3s" }),
    // Inputs
    inp: { background:t.inputBg, border:`1.5px solid ${t.borda2}`, borderRadius:9, padding:"10px 12px", color:t.txt, fontSize:13, outline:"none", width:"100%", fontFamily:"inherit", transition:"border-color .2s, background .3s" },
    // Buttons
    btnGold: { border:"none", borderRadius:10, padding:"10px 18px", color:"#000", fontWeight:700, fontSize:14, letterSpacing:1, cursor:"pointer", background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`, display:"inline-flex", alignItems:"center", gap:6, boxShadow:`0 4px 14px rgba(240,185,11,.25)` },
    btnGreen: { border:"none", borderRadius:10, padding:"10px 18px", color:"#000", fontWeight:700, fontSize:14, letterSpacing:1, cursor:"pointer", background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`, display:"inline-flex", alignItems:"center", gap:6 },
    // Section
    secTitle: { fontSize:9, textTransform:"uppercase", letterSpacing:2, color:t.txt2, marginBottom:10, fontWeight:600, display:"flex", alignItems:"center", gap:8 },
    // Badge
    badge: (c,bg,bc) => ({ padding:"2px 8px", borderRadius:5, fontSize:8, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:c, background:bg, border:`1px solid ${bc}` }),
    // Empty state
    empty: { textAlign:"center", padding:"36px 16px", color:t.txt2 },
    // Modal overlay
    overlay: { position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end", justifyContent:"center" },
    modal: { width:"100%", maxWidth:520, maxHeight:"94vh", background:t.modalBg, borderRadius:"18px 18px 0 0", display:"flex", flexDirection:"column", overflow:"hidden", animation:"mslide .32s cubic-bezier(.34,1.3,.64,1)", transition:"background .3s" },
  };

  // ══════════════════════════════════════════════
  //  AUTH SCREEN
  // ══════════════════════════════════════════════
  if (!authed) {
    return (
      <div style={{...css.app, background:t.gradientAuth, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh"}}>
        <style>{`
          @keyframes logoPop{from{transform:scale(0) rotate(-20deg)}to{transform:scale(1) rotate(0)}}
          @keyframes mslide{from{transform:translateY(100%)}to{transform:none}}
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
          input::placeholder{color:${t.txt2}}
        `}</style>
        {/* Theme toggle */}
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{position:"absolute",top:16,right:16,...css.hBtn,fontSize:16,padding:"8px 12px"}}>
          {theme==="dark"?"☀️":"🌙"}
        </button>
        <div style={{width:72,height:72,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,marginBottom:12,boxShadow:"0 0 36px rgba(240,185,11,.35)",animation:"logoPop .5s cubic-bezier(.34,1.56,.64,1)"}}>🚛</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:4,color:t.txt,textAlign:"center"}}>CONTROLE OPERACIONAL</div>
        <div style={{fontSize:11,color:t.txt2,textAlign:"center",margin:"4px 0 18px"}}>YFGroup · Imperatriz</div>

        <div style={{width:"100%",maxWidth:340,...css.card,boxShadow:`0 24px 60px ${t.shadow}`}}>
          <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,background:theme==="dark"?"linear-gradient(135deg,#161a1e,#1e2026)":`linear-gradient(135deg,#f8f9fa,#fff)`}}>
            <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🔐</div>
            <div><div style={{fontWeight:700,fontSize:13,color:t.txt}}>Acesso ao Sistema</div><div style={{fontSize:10,color:t.txt2}}>Entre com suas credenciais</div></div>
          </div>

          <div style={{padding:16}}>
            {/* Mode tabs */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[{k:"master",l:"🔑 Master"},{k:"user",l:"👤 Usuário"}].map(m => (
                <button key={m.k} onClick={()=>setAuthMode(m.k)} style={{flex:1,border:`1.5px solid ${authMode===m.k?t.ouro:t.borda}`,borderRadius:8,padding:9,fontSize:10,fontWeight:700,cursor:"pointer",background:authMode===m.k?`rgba(240,185,11,.08)`:t.card2,color:authMode===m.k?t.ouro:t.txt2,letterSpacing:.5,textTransform:"uppercase",fontFamily:"inherit"}}>{m.l}</button>
              ))}
            </div>

            {/* Role tabs (master mode) */}
            {authMode === "master" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
                {[{k:"admin",ico:"👑",l:"Admin"},{k:"operador",ico:"⚙️",l:"Operador"},{k:"visualizador",ico:"👁️",l:"Visual."}].map(r => (
                  <div key={r.k} onClick={()=>setPerfilSel(r.k)} style={{border:`1.5px solid ${perfilSel===r.k?t.ouro:t.borda}`,borderRadius:8,padding:"9px 6px",cursor:"pointer",background:perfilSel===r.k?`rgba(240,185,11,.08)`:t.card2,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .2s"}}>
                    <span style={{fontSize:16}}>{r.ico}</span>
                    <span style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:perfilSel===r.k?t.ouro:t.txt2}}>{r.l}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Email field (user mode) */}
            {authMode === "user" && (
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Email</label>
                <input value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="seu@email.com" style={css.inp} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
              </div>
            )}

            {/* Password */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Senha</label>
              <input type="password" value={authSenha} onChange={e=>setAuthSenha(e.target.value)} placeholder="Digite sua senha..." style={css.inp} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            </div>

            <button onClick={handleLogin} style={{...css.btnGold,width:"100%",justifyContent:"center",padding:14,fontSize:18,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>🔓 ENTRAR</button>

            {authMsg && (
              <div style={{padding:"10px 12px",borderRadius:8,fontSize:12,fontWeight:600,textAlign:"center",marginTop:8,lineHeight:1.5,background:authMsg.t==="err"?`rgba(246,70,93,.08)`:`rgba(2,192,118,.08)`,color:authMsg.t==="err"?t.danger:t.verde,border:`1px solid ${authMsg.t==="err"?"rgba(246,70,93,.2)":"rgba(2,192,118,.2)"}`}}>{authMsg.m}</div>
            )}
          </div>
        </div>
        <Toast {...toast} />
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  MAIN APP RENDER
  // ══════════════════════════════════════════════
  const tabs = [
    {k:"busca",ico:"🔍",l:"Busca"},
    {k:"dashboard",ico:"📊",l:"Dashboard",perm:"dashboard"},
    {k:"planilha",ico:"📋",l:"Planilha",perm:"planilha"},
    {k:"diarias",ico:"🛏️",l:"Diárias",perm:"diarias"},
    {k:"descarga",ico:"📦",l:"Descarga",perm:"descarga"},
    {k:"motoristas",ico:"🚛",l:"Motoristas"},
    ...(isAdmin ? [{k:"admin",ico:"⚙️",l:"Admin"}] : []),
  ].filter(tb => !tb.perm || perms[tb.perm] !== false);

  return (
    <div style={css.app}>
      <style>{`
        @keyframes logoPop{from{transform:scale(0) rotate(-20deg)}to{transform:scale(1) rotate(0)}}
        @keyframes mslide{from{transform:translateY(100%)}to{transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
        input::placeholder,textarea::placeholder{color:${t.txt2}!important}
        input[type=date]{color-scheme:${theme}}
        body{overflow-x:hidden}
      `}</style>

      {/* HEADER */}
      <div style={css.header}>
        <div style={css.logo}>🚛</div>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:2.5,color:t.txt,lineHeight:1}}>CONTROLE OPERACIONAL</div>
          <div style={{fontSize:9,color:t.ouro,letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>Imperatriz · YFGroup</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:7}}>
          <span style={css.badge(
            perfil==="admin"?t.ouro:perfil==="operador"?t.txt2:t.azulLt,
            perfil==="admin"?`rgba(240,185,11,.12)`:perfil==="operador"?`rgba(132,142,156,.12)`:`rgba(22,119,255,.1)`,
            perfil==="admin"?`rgba(240,185,11,.25)`:perfil==="operador"?t.borda:`rgba(22,119,255,.22)`,
          )}>{perfil==="admin"?"👑 ADMIN":perfil==="operador"?"⚙️ OP":"👁️ VIEW"}</span>

          <button onClick={sincronizar} style={css.hBtn}>
            <span style={{width:6,height:6,borderRadius:"50%",background:connStatus==="online"?t.verde:connStatus==="syncing"?t.ouro:t.borda,boxShadow:connStatus==="online"?`0 0 5px rgba(2,192,118,.6)`:"none",flexShrink:0}} />
            <span>{connStatus==="syncing"?"⏳":"☁️"}</span>
            <span style={{fontSize:10}}>SYNC</span>
          </button>

          {alertas.length > 0 && (
            <button onClick={()=>setAlertasOpen(!alertasOpen)} style={{...css.hBtn,borderColor:"rgba(246,70,93,.4)",color:t.danger,position:"relative"}}>
              🔔
              <span style={{position:"absolute",top:-6,right:-6,background:t.danger,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${t.bg}`}}>{alertas.length}</span>
            </button>
          )}

          <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{...css.hBtn,fontSize:14,padding:"6px 10px"}}>{theme==="dark"?"☀️":"🌙"}</button>
          <button onClick={handleLogout} style={css.hBtn}>🚪</button>
        </div>
      </div>

      {/* ALERTAS PANEL */}
      {alertasOpen && alertas.length > 0 && (
        <div style={{background:t.card,borderBottom:`1px solid ${t.borda}`,animation:"fadeIn .2s"}}>
          {alertas.slice(0,10).map((a,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 16px",borderBottom:`1px solid ${t.borda}`}}>
              <span style={{fontSize:16,flexShrink:0}}>{a.tipo==="danger"?"🚨":"⚠️"}</span>
              <span style={{fontSize:11,color:t.txt2,lineHeight:1.5}}>{a.txt}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB BAR */}
      <div style={css.tabBar}>
        {tabs.map(tb => (
          <button key={tb.k} onClick={()=>setActiveTab(tb.k)} style={css.tab(activeTab===tb.k)}>
            <span style={{fontSize:14,verticalAlign:"middle",marginRight:3}}>{tb.ico}</span> {tb.l}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{padding:"16px 16px 100px",maxWidth:1100,margin:"0 auto",animation:"fadeIn .2s"}}>

        {/* ═══ BUSCA ═══ */}
        {activeTab === "busca" && (
          <div>
            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:t.txt2,marginBottom:8,fontWeight:600}}>🔍 Buscar Registro</div>
            <div style={{display:"flex",gap:6,marginBottom:10,justifyContent:"center"}}>
              {[{k:"dt",ico:"🔢",l:"DT"},{k:"cpf",ico:"🪪",l:"CPF"},{k:"placa",ico:"🚛",l:"PLACA"}].map(b => (
                <button key={b.k} onClick={()=>{setBuscaTipo(b.k);setBuscaInput("");setBuscaResult(null);setBuscaError(null)}} style={{padding:"10px 22px",fontSize:12,fontWeight:700,border:`1.5px solid ${buscaTipo===b.k?t.ouro:t.borda}`,borderRadius:8,cursor:"pointer",background:buscaTipo===b.k?`rgba(240,185,11,.08)`:t.card2,color:buscaTipo===b.k?t.ouro:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:16}}>{b.ico}</span> {b.l}
                </button>
              ))}
            </div>

            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input value={buscaInput} onChange={e=>setBuscaInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscar()} placeholder={buscaTipo==="dt"?"00000000":buscaTipo==="cpf"?"000.000.000-00":"AAA0A00"} style={{...css.inp,flex:1,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:3,textTransform:buscaTipo==="placa"?"uppercase":"none"}} />
              <button onClick={buscar} style={{...css.btnGold,padding:"0 20px",fontSize:20}}>🔍</button>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14,padding:"8px 12px",background:t.card,borderRadius:9,borderLeft:`3px solid ${t.verde}`}}>
              <span style={{width:6,height:6,background:t.verde,borderRadius:"50%",animation:"pulse 2s infinite"}} />
              <span style={{fontSize:11,color:t.txt2,fontWeight:500}}><strong style={{color:t.verde}}>{DADOS.length}</strong> registros · <span style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.2)`,borderRadius:4,padding:"1px 6px",fontSize:9,color:t.azulLt,fontWeight:700}}>{connStatus==="online"?"🟢 ONLINE":"⚫ LOCAL"}</span></span>
            </div>

            {/* Result card */}
            {buscaResult && (
              <div style={{...css.card,animation:"slideUp .3s ease"}}>
                <div style={{background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:44,height:44,background:"rgba(0,0,0,.2)",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🚛</div>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:1.5,color:"#000",lineHeight:1.1}}>{buscaResult.nome||"—"}</div>
                    <div style={{fontSize:9,color:"rgba(0,0,0,.55)",fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>DT {buscaResult.dt}</div>
                  </div>
                </div>
                <div style={{padding:14,display:"grid",gap:8}}>
                  {[
                    {ico:"🪪",lbl:"CPF",val:buscaResult.cpf},
                    {ico:"🚛",lbl:"Placa",val:buscaResult.placa,highlight:true},
                    {ico:"📍",lbl:"Rota",val:`${buscaResult.origem||"—"} → ${buscaResult.destino||"—"}`},
                    {ico:"📋",lbl:"Status",val:buscaResult.status},
                  ].map((item,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:10,background:t.bg,borderRadius:9,border:`1px solid ${t.borda}`}}>
                      <span style={{fontSize:16,width:28,textAlign:"center"}}>{item.ico}</span>
                      <div>
                        <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginBottom:2}}>{item.lbl}</div>
                        <div style={{fontSize:13,fontWeight:600,color:item.highlight?t.verde:t.txt,fontFamily:item.highlight?"'Bebas Neue',sans-serif":"inherit",letterSpacing:item.highlight?3:0,fontSize:item.highlight?17:13}}>{item.val||"—"}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{background:t.bg,borderRadius:9,padding:12,border:`1px solid ${t.borda}`,textAlign:"center",borderTop:`3px solid ${t.ouro}`}}>
                      <span style={{fontSize:13}}>📦</span>
                      <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,margin:"4px 0"}}>Carregamento</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.ouro}}>{buscaResult.data_carr||"—"}</div>
                    </div>
                    <div style={{background:t.bg,borderRadius:9,padding:12,border:`1px solid ${t.borda}`,textAlign:"center",borderTop:`3px solid ${t.verde}`}}>
                      <span style={{fontSize:13}}>🏁</span>
                      <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,margin:"4px 0"}}>Agenda Desc.</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.verde}}>{buscaResult.data_agenda||"—"}</div>
                    </div>
                  </div>
                  {canFin && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:10,background:t.bg,borderRadius:9,border:`1px solid ${t.borda}`}}>
                      <div style={{textAlign:"center"}}><div style={{fontSize:8,textTransform:"uppercase",color:t.txt2,fontWeight:600,marginBottom:2}}>Empresa</div><div style={{fontSize:11,fontWeight:700,color:t.verde}}>{fmtMoeda(buscaResult.vl_cte)}</div></div>
                      <div style={{textAlign:"center"}}><div style={{fontSize:8,textTransform:"uppercase",color:t.txt2,fontWeight:600,marginBottom:2}}>Motorista</div><div style={{fontSize:11,fontWeight:700,color:t.azulLt}}>{fmtMoeda(buscaResult.vl_contrato)}</div></div>
                      <div style={{textAlign:"center"}}><div style={{fontSize:8,textTransform:"uppercase",color:t.txt2,fontWeight:600,marginBottom:2}}>Adiant.</div><div style={{fontSize:11,fontWeight:700,color:t.ouro}}>{fmtMoeda(buscaResult.adiant)}</div></div>
                    </div>
                  )}
                  {canEdit && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <button onClick={()=>{
                        const idx = DADOS.findIndex(r=>r.dt===buscaResult.dt);
                        setEditIdx(idx);setFormData({...buscaResult});setEditStep(1);setModalOpen("edit");
                      }} style={{...css.btnGold,justifyContent:"center",padding:11}}>✏️ EDITAR</button>
                      <button style={{border:"none",borderRadius:10,padding:11,cursor:"pointer",background:`rgba(37,211,102,.1)`,border:`1px solid rgba(37,211,102,.25)`,color:"#25D366",fontWeight:700,fontSize:11,letterSpacing:.5,textTransform:"uppercase"}}>📲 WHATSAPP</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {buscaError && (
              <div style={{...css.card,padding:"24px 16px",textAlign:"center",borderTop:`3px solid ${t.danger}`,animation:"slideUp .3s"}}>
                <div style={{fontSize:30,marginBottom:10}}>❌</div>
                <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.danger,marginBottom:5}}>NÃO ENCONTRADO</h3>
                <p style={{color:t.txt2,fontSize:11}}>Nenhum registro para "{buscaError}"</p>
                {canEdit && <button onClick={()=>{setFormData({dt:buscaError});setEditIdx(-1);setEditStep(1);setModalOpen("edit");}} style={{...css.btnGold,marginTop:14,background:`linear-gradient(135deg,${t.azul},${t.azulLt})`,color:"#fff",justifyContent:"center",width:"100%"}}>＋ CADASTRAR</button>}
              </div>
            )}

            {/* History */}
            {historico.length > 0 && !buscaResult && !buscaError && (
              <div style={{marginTop:16}}>
                <div style={css.secTitle}>Histórico Recente <span style={{flex:1,height:1,background:t.borda}} /></div>
                {historico.map((h,i) => (
                  <div key={i} onClick={()=>{setBuscaInput(h.dt);setTimeout(buscar,50)}} style={{background:t.card,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,border:`1px solid ${t.borda}`,cursor:"pointer",marginBottom:7}}>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,color:t.ouro,minWidth:80}}>{h.dt}</span>
                    <span style={{fontSize:11,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t.txt}}>{h.nome}</span>
                    <span style={{marginLeft:"auto",color:t.borda,fontSize:12}}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{...css.card,padding:12,marginBottom:14}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginBottom:8}}>🔍 Filtros</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                <button onClick={()=>setDashMes("todos")} style={{padding:"5px 10px",fontSize:9,fontWeight:700,border:`1.5px solid ${dashMes==="todos"?t.ouro:t.borda}`,borderRadius:7,cursor:"pointer",background:dashMes==="todos"?`rgba(240,185,11,.07)`:t.card2,color:dashMes==="todos"?t.ouro:t.txt2,fontFamily:"inherit"}}>Todos</button>
                {dashData.meses.map(m => (
                  <button key={m} onClick={()=>setDashMes(m)} style={{padding:"5px 10px",fontSize:9,fontWeight:700,border:`1.5px solid ${dashMes===m?t.ouro:t.borda}`,borderRadius:7,cursor:"pointer",background:dashMes===m?`rgba(240,185,11,.07)`:t.card2,color:dashMes===m?t.ouro:t.txt2,fontFamily:"inherit"}}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,marginBottom:14}}>
              <div style={css.kpi(t.ouro)}><div style={{fontSize:22,marginBottom:6}}>🚛</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:1,color:t.ouro}}>{dashData.filtrado.length}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Carregamentos</div></div>
              <div style={css.kpi(t.verde)}><div style={{fontSize:22,marginBottom:6}}>🔢</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:1,color:t.verde}}>{dashData.dtsU.size}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>DTs Únicas</div></div>
              {canFin && <div style={css.kpi(t.azulLt)}><div style={{fontSize:22,marginBottom:6}}>💰</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,color:t.azulLt}}>R$ {(dashData.cteT/1000).toFixed(1)}k</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Total CTE</div></div>}
              <div style={css.kpi(t.danger)}><div style={{fontSize:22,marginBottom:6}}>🚨</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:1,color:t.danger}}>{alertas.length}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Alertas</div></div>
            </div>

            <div style={{...css.card,padding:14,marginBottom:14}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:t.txt2,fontWeight:600,marginBottom:12,display:"flex",alignItems:"center",gap:7}}>Carregamentos por Mês<span style={{flex:1,height:1,background:t.borda}} /></div>
              <div style={{height:220}}><canvas ref={chartCarregRef} /></div>
            </div>

            {canFin && (
              <div style={{...css.card,padding:14,marginBottom:14}}>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:t.txt2,fontWeight:600,marginBottom:12,display:"flex",alignItems:"center",gap:7}}>Valor CTE por Mês (R$)<span style={{flex:1,height:1,background:t.borda}} /></div>
                <div style={{height:200}}><canvas ref={chartCTERef} /></div>
              </div>
            )}

            {/* Top UF */}
            <div style={{...css.card,padding:14,marginBottom:14}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:t.txt2,fontWeight:600,marginBottom:10}}>Por UF Destino</div>
              {(() => {
                const ufMap = {};
                dashData.filtrado.forEach(r => { if (!r.destino) return; const uf=r.destino.split("-").pop().trim().toUpperCase(); if (uf.length===2) ufMap[uf]=(ufMap[uf]||0)+1; });
                const ufArr = Object.keys(ufMap).sort((a,b)=>ufMap[b]-ufMap[a]).slice(0,8);
                const maxUF = ufArr.length ? ufMap[ufArr[0]] : 1;
                return ufArr.length ? ufArr.map(uf => (
                  <div key={uf} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                    <span style={{width:28,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:t.ouro,textAlign:"right",flexShrink:0}}>{uf}</span>
                    <div style={{flex:1,background:t.borda,borderRadius:4,height:8,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round(ufMap[uf]/maxUF*100)}%`,background:`linear-gradient(90deg,${t.ouroDk},${t.ouro})`,borderRadius:4,transition:"width .4s"}} /></div>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:t.txt2,width:24,textAlign:"right",flexShrink:0}}>{ufMap[uf]}</span>
                  </div>
                )) : <div style={{color:t.txt2,fontSize:11,textAlign:"center",padding:14}}>Sem dados</div>;
              })()}
            </div>
          </div>
        )}

        {/* ═══ PLANILHA ═══ */}
        {activeTab === "planilha" && (
          <div>
            <div style={{overflowX:"auto",borderRadius:11,border:`1px solid ${t.borda}`,maxHeight:"70vh",overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:500}}>
                <thead>
                  <tr>{["DT","Motorista","Placa","Origem","Destino","Carregamento","Agenda","Descarga","Status"].map(h => (
                    <th key={h} style={{background:t.tableHeader,padding:"9px 10px",textAlign:"left",fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,borderBottom:`1px solid ${t.borda}`,whiteSpace:"nowrap",position:"sticky",top:0,zIndex:1}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {DADOS.slice(0,200).map((r,i) => (
                    <tr key={i} style={{cursor:"pointer"}} onClick={()=>{setBuscaInput(r.dt);setActiveTab("busca");setTimeout(buscar,100)}}>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:t.txt,whiteSpace:"nowrap",fontWeight:700}}>{r.dt}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:t.txt,whiteSpace:"nowrap"}}>{r.nome||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:2,color:t.verde}}>{r.placa||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2,whiteSpace:"nowrap"}}>{r.origem||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2,whiteSpace:"nowrap"}}>{r.destino||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:t.ouro}}>{r.data_carr||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2}}>{r.data_agenda||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:r.data_desc?t.verde:t.danger}}>{r.data_desc||"Pendente"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2}}>{r.status||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{fontSize:10,color:t.txt2,marginTop:8,textAlign:"center"}}>{DADOS.length} registros total{DADOS.length>200?" (mostrando 200)":""}</div>
          </div>
        )}

        {/* ═══ DIÁRIAS ═══ */}
        {activeTab === "diarias" && (
          <div>
            <div style={{display:"flex",gap:6,marginBottom:12,justifyContent:"center",flexWrap:"wrap"}}>
              {[{k:"resumo",ico:"📊",l:"Resumo"},{k:"planilha",ico:"📋",l:"Planilha"}].map(s => (
                <button key={s.k} onClick={()=>setDSubTab(s.k)} style={{padding:"10px 20px",fontSize:12,fontWeight:700,border:`1.5px solid ${dSubTab===s.k?t.ouro:t.borda}`,borderRadius:8,cursor:"pointer",background:dSubTab===s.k?`rgba(240,185,11,.08)`:t.card2,color:dSubTab===s.k?t.ouro:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:16}}>{s.ico}</span> {s.l}
                </button>
              ))}
            </div>

            {/* KPI */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              <div style={css.kpi(t.verde)}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:t.verde}}>{diariasData.ok}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2}}>No Prazo</div></div>
              <div style={css.kpi(t.danger)}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:t.danger}}>{diariasData.atraso}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2}}>Perdeu Agenda</div></div>
              <div style={css.kpi(t.ouro)}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:t.ouro}}>{diariasData.pend}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2}}>Sem Descarga</div></div>
            </div>

            {dSubTab === "resumo" && (
              <div>
                <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
                  {[{k:"todos",l:"Todos"},{k:"atraso",l:"⚠️ Perdeu agenda"},{k:"pendente",l:"⏳ Sem descarga"},{k:"ok",l:"✅ No prazo"}].map(f => (
                    <button key={f.k} onClick={()=>setDFiltro(f.k)} style={{padding:"5px 10px",fontSize:9,fontWeight:700,border:`1.5px solid ${dFiltro===f.k?t.ouro:t.borda}`,borderRadius:7,cursor:"pointer",background:dFiltro===f.k?`rgba(240,185,11,.07)`:t.card2,color:dFiltro===f.k?t.ouro:t.txt2,fontFamily:"inherit"}}>{f.l}</button>
                  ))}
                </div>
                {diariasData.items.filter(i => dFiltro==="todos" || i.tipo===dFiltro).slice(0,50).map((item,idx) => {
                  const {r,tipo,dias} = item;
                  const borderC = tipo==="ok"?t.verde:tipo==="atraso"?t.danger:t.ouro;
                  return (
                    <div key={idx} style={{background:t.card,borderRadius:11,padding:12,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${borderC}`,marginBottom:8,animation:"slideUp .3s"}}>
                      <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:3,display:"flex",alignItems:"center",gap:6}}>
                        {r.nome||"—"}
                        <span style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,background:tipo==="ok"?`rgba(2,192,118,.08)`:tipo==="atraso"?`rgba(246,70,93,.06)`:`rgba(240,185,11,.06)`,color:borderC,border:`1px solid ${borderC}33`}}>
                          {tipo==="ok"?"✅ No prazo":tipo==="atraso"?`⚠️ ${dias>0?dias+"d":""}`:  "⏳ Aguardando"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:t.txt2,lineHeight:1.7}}>
                        🔢 <strong style={{color:t.txt}}>{r.dt}</strong> · 🚛 {r.placa||"—"}<br/>
                        📅 Agenda: <strong style={{color:t.ouro}}>{r.data_agenda||"—"}</strong> · 🏁 Descarga: <strong style={{color:r.data_desc?t.verde:t.txt2}}>{r.data_desc||"Não informada"}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {dSubTab === "planilha" && (
              <div style={{overflowX:"auto",borderRadius:11,border:`1px solid ${t.borda}`,maxHeight:"70vh",overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:600}}>
                  <thead><tr>{["DT","Motorista","Placa","Agenda","Descarga","Atraso","Prev.","Pago"].map(h => (
                    <th key={h} style={{background:t.tableHeader,padding:"9px 10px",textAlign:"left",fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,borderBottom:`1px solid ${t.borda}`,whiteSpace:"nowrap",position:"sticky",top:0}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{diariasData.items.slice(0,100).map(({r,tipo,dias},i) => (
                    <tr key={i}>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,fontWeight:700}}>{r.dt}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{r.nome||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2,color:t.verde}}>{r.placa||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{r.data_agenda||"—"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:r.data_desc?t.verde:t.ouro}}>{r.data_desc||"Pendente"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:tipo==="atraso"?t.danger:t.verde,fontWeight:600}}>{dias===null?"—":dias>0?`+${dias}d`:"✅"}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{fmtMoeda(r.diaria_prev)}</td>
                      <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{fmtMoeda(r.diaria_pg)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ DESCARGA ═══ */}
        {activeTab === "descarga" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxWidth:400,margin:"0 auto 14px"}}>
              {[{k:"hoje",ico:"📅",l:"Descarrega Hoje",ct:descargaData.hoje.length},{k:"atrasado",ico:"🚨",l:"Em Atraso",ct:descargaData.atrasados.length}].map(tb => (
                <div key={tb.k} onClick={()=>setDscTab(tb.k)} style={{border:`1.5px solid ${dscTab===tb.k?t.azul:t.borda}`,borderRadius:10,padding:12,cursor:"pointer",background:dscTab===tb.k?`rgba(22,119,255,.07)`:t.card2,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .2s"}}>
                  <span style={{fontSize:22}}>{tb.ico}</span>
                  <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:dscTab===tb.k?t.azulLt:t.txt2}}>{tb.l}</span>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,color:dscTab===tb.k?t.azulLt:t.txt2}}>{tb.ct}</span>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
              <input type="date" value={dscData} onChange={e=>setDscData(e.target.value)} style={{...css.inp,flex:1}} />
              <button onClick={()=>{}} style={{...css.btnGreen,padding:"10px 14px",fontSize:12}}>🔍</button>
            </div>

            {(dscTab==="hoje"?descargaData.hoje:descargaData.atrasados).slice(0,50).map((r,i) => {
              const da = parseData(r.data_agenda);
              const dias = da ? diffDias(da, new Date(dscData+"T00:00:00")) : null;
              const isAtrasado = dscTab === "atrasado";
              return (
                <div key={i} style={{background:t.card,borderRadius:11,padding:12,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${isAtrasado?t.danger:t.azul}`,marginBottom:8,animation:"slideUp .3s"}}>
                  <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                    {isAtrasado && dias !== null && <span style={{background:`rgba(246,70,93,.07)`,color:t.danger,border:`1px solid rgba(246,70,93,.18)`,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>🚨 {dias}d</span>}
                    {r.nome||"—"}
                  </div>
                  <div style={{fontSize:11,color:t.txt2,lineHeight:1.7}}>
                    🔢 <strong style={{color:t.txt}}>{r.dt}</strong> · 🚛 {r.placa||"—"}<br/>
                    📍 {r.destino||"—"}<br/>
                    📅 Agenda: <strong style={{color:isAtrasado?t.danger:t.ouro}}>{r.data_agenda||"—"}</strong>
                    {r.data_desc && <> · 🏁 Descarga: <strong style={{color:t.verde}}>{r.data_desc}</strong></>}
                  </div>
                </div>
              );
            })}
            {(dscTab==="hoje"?descargaData.hoje:descargaData.atrasados).length === 0 && (
              <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>{dscTab==="hoje"?"📅":"✅"}</div><h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt2}}>{dscTab==="hoje"?"NENHUMA DESCARGA HOJE":"SEM ATRASOS"}</h3></div>
            )}
          </div>
        )}

        {/* ═══ MOTORISTAS ═══ */}
        {activeTab === "motoristas" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input placeholder="Buscar motorista..." style={{...css.inp,flex:1}} onChange={e=>e.target.value} />
              {canEdit && <button onClick={()=>{setFormData({});setEditIdx(-1);setModalOpen("motorista")}} style={css.btnGold}>＋ NOVO</button>}
            </div>
            {motoristas.length === 0 ? (
              <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>🚛</div><h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt2}}>SEM MOTORISTAS</h3><p style={{fontSize:11,color:t.txt2}}>Clique em + NOVO para cadastrar.</p></div>
            ) : motoristas.map((m,i) => (
              <div key={i} style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,padding:12,marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:38,height:38,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#000",flexShrink:0}}>{(m.nome||"M")[0].toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:t.txt}}>{m.nome||"—"}</div>
                    <div style={{fontSize:10,color:t.txt2}}>{m.cpf||""}{m.vinculo?" · "+m.vinculo:""}</div>
                  </div>
                  {canEdit && <>
                    <button onClick={()=>{setFormData({...m});setEditIdx(i);setModalOpen("motorista")}} style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                    <button onClick={()=>{if(confirm(`Excluir "${m.nome}"?`)){const nm=[...motoristas];nm.splice(i,1);saveMotoristasLS(nm);showToast("🗑️ Removido");}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                  </>}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                  {[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).map((p,j) => (
                    <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:t.verde,background:`rgba(2,192,118,.07)`,border:`1px solid rgba(2,192,118,.15)`,borderRadius:4,padding:"1px 6px"}}>{p}</span>
                  ))}
                </div>
                {m.tel && <div style={{fontSize:11,color:t.txt2}}>📞 {m.tel}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ═══ ADMIN ═══ */}
        {activeTab === "admin" && isAdmin && (
          <div>
            <div style={css.secTitle}>🗄️ Banco de Dados <span style={{flex:1,height:1,background:t.borda}} /></div>
            <div style={{...css.card,marginBottom:16}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${t.borda}`}}>
                <div style={{width:24,height:24,background:t.azul,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🗄️</div>
                <div><div style={{fontSize:12,fontWeight:600,color:t.txt}}>Supabase PostgreSQL</div><div style={{fontSize:9,color:t.txt2}}>{ultimaSync?`Sync: ${ultimaSync}`:"Nunca sincronizado"}</div></div>
                <span style={{marginLeft:"auto",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:5,...(connStatus==="online"?{background:`rgba(2,192,118,.08)`,color:t.verde,border:`1px solid rgba(2,192,118,.2)`}:{background:`rgba(246,70,93,.06)`,color:t.danger,border:`1px solid rgba(246,70,93,.15)`})}}>{connStatus==="online"?"ONLINE":"OFFLINE"}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:t.borda}}>
                <button onClick={sincronizar} style={{background:t.card,border:"none",padding:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit"}}><span style={{fontSize:20}}>🔄</span><span style={{fontSize:9,color:t.txt2,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>Sincronizar</span></button>
                <button onClick={()=>setModalOpen("configdb")} style={{background:t.card,border:"none",padding:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit"}}><span style={{fontSize:20}}>⚙️</span><span style={{fontSize:9,color:t.txt2,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>Config DB</span></button>
              </div>
            </div>

            <div style={css.secTitle}>👥 Usuários <span style={{flex:1,height:1,background:t.borda}} /></div>
            <button onClick={()=>{setFormData({perfil:"visualizador",perms:{financeiro:true,editar:false,dashboard:true,diarias:true,descarga:true,planilha:true}});setEditIdx(-1);setModalOpen("usuario")}} style={{...css.btnGold,width:"100%",justifyContent:"center",marginBottom:14}}>＋ NOVO USUÁRIO</button>
            {usuarios.map((u,i) => (
              <div key={i} style={{background:t.card,borderRadius:11,border:`1px solid ${t.borda}`,padding:12,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{width:34,height:34,borderRadius:9,background:u.perfil==="admin"?`linear-gradient(135deg,${t.ouroDk},${t.ouro})`:`linear-gradient(135deg,#555,#848e9c)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#000",flexShrink:0}}>{u.nome?.[0]?.toUpperCase()||"U"}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:t.txt}}>{u.nome}</div><div style={{fontSize:10,color:t.txt2}}>📧 {u.email} · <span style={{color:t.ouro}}>{u.perfil}</span></div></div>
                  <button onClick={()=>{setFormData({...u});setEditIdx(i);setModalOpen("usuario")}} style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                  <button onClick={()=>{if(confirm(`Excluir "${u.nome}"?`)){const nu=[...usuarios];nu.splice(i,1);setUsuarios(nu);saveJSON("co_usuarios",nu);showToast("🗑️ Removido");}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                </div>
              </div>
            ))}

            {/* Conexões */}
            <div style={{...css.secTitle,marginTop:20}}>🔌 Conexões Supabase <span style={{flex:1,height:1,background:t.borda}} /></div>
            {conexoes.map((c,i) => (
              <div key={i} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,padding:10,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:14}}>🗄️</span>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||c.url}</div></div>
                <button onClick={()=>{const nc=[...conexoes];nc.splice(i,1);saveConexoesLS(nc);showToast("Removido");}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:5,padding:"4px 8px",cursor:"pointer",fontSize:10,color:t.danger}}>✕</button>
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
              <input id="newSupaUrl" placeholder="https://xxx.supabase.co" style={css.inp} />
              <input id="newSupaKey" placeholder="anon key" style={css.inp} />
              <input id="newSupaName" placeholder="Nome da conexão" style={css.inp} />
              <button onClick={()=>{
                const url = document.getElementById("newSupaUrl").value.trim();
                const key = document.getElementById("newSupaKey").value.trim();
                const name = document.getElementById("newSupaName").value.trim() || "Conexão";
                if (!url || !key) { showToast("⚠️ URL e Key obrigatórios","warn"); return; }
                const nc = [...conexoes, {url,key,name}];
                saveConexoesLS(nc);
                saveJSON("co_conexao_ativa", nc.length-1);
                showToast("✅ Conexão adicionada!","ok");
              }} style={{...css.btnGreen,justifyContent:"center"}}>🗄️ CONECTAR</button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ FAB ═══ */}
      {canEdit && (
        <div style={{position:"fixed",bottom:20,right:14,zIndex:200}}>
          <button onClick={()=>{setFormData({});setEditIdx(-1);setEditStep(1);setModalOpen("edit")}} style={{width:54,height:54,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,borderRadius:15,border:"none",boxShadow:"0 5px 20px rgba(240,185,11,.4)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
            <span style={{fontSize:19,color:"#000"}}>＋</span>
            <span style={{fontSize:7,fontWeight:700,color:"#000",letterSpacing:.8,textTransform:"uppercase"}}>NOVO</span>
          </button>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {modalOpen === "edit" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={css.modal}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${editIdx>=0?t.ouroDk:t.azul},${editIdx>=0?t.ouro:t.azulLt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{editIdx>=0?"✏️":"📋"}</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0?"EDITAR":"NOVO REGISTRO"}</div><div style={{fontSize:9,color:t.txt2}}>Preencha os dados</div></div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {[
                {s:"👤 Identificação",fields:[{k:"nome",l:"Nome",span:2},{k:"cpf",l:"CPF"},{k:"placa",l:"Placa"},{k:"dt",l:"DT / Espelho"},{k:"vinculo",l:"Vínculo"}]},
                {s:"📍 Rota e Agenda",fields:[{k:"origem",l:"Origem"},{k:"destino",l:"Destino"},{k:"data_carr",l:"Carregamento",type:"date"},{k:"data_agenda",l:"Agenda",type:"date"},{k:"status",l:"Status"},{k:"dias",l:"Dias"}]},
                {s:"💰 Financeiro",fields:[{k:"vl_cte",l:"Valor CTE"},{k:"vl_contrato",l:"Valor Contrato"},{k:"adiant",l:"Adiantamento"},{k:"saldo",l:"Saldo"}]},
                {s:"📄 Documentação",fields:[{k:"cte",l:"CTE"},{k:"mdf",l:"MDF"},{k:"nf",l:"Nota Fiscal"},{k:"cliente",l:"Cliente"}]},
                {s:"🏁 Operacional",fields:[{k:"data_desc",l:"Descarga",type:"date"},{k:"data_manifesto",l:"Manifesto",type:"date"},{k:"chegada",l:"Chegada",type:"date"},{k:"gerenc",l:"Gerenciadora"}]},
              ].map((section,si) => (
                <div key={si}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,margin:"14px 0 8px",display:"flex",alignItems:"center",gap:6}}>{section.s}<span style={{flex:1,height:1,background:`rgba(22,119,255,.12)`}} /></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                    {section.fields.map(f => (
                      <div key={f.k} style={{gridColumn:f.span===2?"1/-1":"auto",display:"flex",flexDirection:"column",gap:3}}>
                        <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600}}>{f.l}</label>
                        <input type={f.type||"text"} value={formData[f.k]||(f.type==="date"?brToInput(formData[f.k]):"" )||""} onChange={e=>{
                          const v = f.type==="date" ? e.target.value : e.target.value;
                          setFormData(p=>({...p,[f.k]:f.type==="date"?inputToBr(v):v}));
                        }} style={{...css.inp,padding:"8px 10px",fontSize:12}} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",flexShrink:0,borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button onClick={salvarRegistro} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MOTORISTA MODAL ═══ */}
      {modalOpen === "motorista" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={css.modal}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🚛</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0?"EDITAR":"NOVO"} MOTORISTA</div></div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {[{k:"nome",l:"Nome Completo",req:true},{k:"cpf",l:"CPF",req:true},{k:"tel",l:"Telefone"},{k:"placa1",l:"Placa Cavalo",req:true},{k:"placa2",l:"Placa Carreta 1"},{k:"placa3",l:"Placa Carreta 2"},{k:"vinculo",l:"Vínculo"},{k:"obs",l:"Observações"}].map(f => (
                <div key={f.k} style={{marginBottom:10}}>
                  <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>{f.l}{f.req&&<span style={{color:t.danger}}> *</span>}</label>
                  <input value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} style={{...css.inp,textTransform:f.k.startsWith("placa")?"uppercase":"none"}} />
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button onClick={()=>{
                const m = {...formData};
                if (!m.nome) { showToast("⚠️ Nome obrigatório","warn"); return; }
                if (!m.cpf) { showToast("⚠️ CPF obrigatório","warn"); return; }
                const nm = [...motoristas];
                if (editIdx>=0) nm[editIdx] = m; else nm.push(m);
                saveMotoristasLS(nm);
                showToast(editIdx>=0?"✅ Atualizado!":"✅ Cadastrado!","ok");
                setModalOpen(null);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONFIG DB MODAL ═══ */}
      {modalOpen === "configdb" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={{...css.modal,maxWidth:480}}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <span style={{fontSize:19}}>🗄️</span>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.txt}}>BANCO DE DADOS</div><div style={{fontSize:10,color:t.txt2}}>Conexões Supabase</div></div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {conexoes.map((c,i) => (
                <div key={i} style={{background:t.card2,borderRadius:9,padding:10,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                  <span>🗄️</span>
                  <span style={{flex:1,fontSize:11,fontWeight:600,color:t.txt}}>{c.name||"Conexão"}</span>
                  <span style={{fontSize:9,color:t.verde}}>✅</span>
                </div>
              ))}
              <div style={{marginTop:12}}>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginBottom:7}}>Adicionar Conexão</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <input id="cdbUrl" placeholder="https://xxx.supabase.co" style={css.inp} />
                  <input id="cdbKey" placeholder="anon key" style={css.inp} />
                  <input id="cdbName" placeholder="Nome" style={css.inp} />
                  <button onClick={()=>{
                    const url=document.getElementById("cdbUrl").value.trim();
                    const key=document.getElementById("cdbKey").value.trim();
                    const name=document.getElementById("cdbName").value.trim()||"Conexão";
                    if(!url||!key){showToast("⚠️ URL e Key obrigatórios","warn");return;}
                    const nc=[...conexoes,{url,key,name}];
                    saveConexoesLS(nc);
                    saveJSON("co_conexao_ativa",nc.length-1);
                    showToast("✅ Conexão adicionada!","ok");
                    setModalOpen(null);
                  }} style={{...css.btnGreen,justifyContent:"center"}}>🗄️ CONECTAR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast {...toast} />
    </div>
  );
}
