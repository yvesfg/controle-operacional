import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PieController, DoughnutController } from "chart.js";
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PieController, DoughnutController);

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
const TABLE_USUARIOS = "co_usuarios";
const TABLE_CONFIG   = "co_config";
const TABLE_OCORR    = "co_ocorrencias";
const TABLE_LOGS     = "co_logs_alteracoes";
const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERMS_PADRAO = {
  // ── Admin: acesso total ──
  admin:      {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:true,  usuarios:true,  ocorrencias:true },
  // ── Gerente: vê financeiro, edita tudo operacional, sem config de sistema ──
  gerente:    {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:true },
  // ── Operador: edita operacional, sem financeiro nem config ──
  operador:   {financeiro:false,editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:true },
  // ── Visualizador: somente leitura ──
  visualizador:{financeiro:false,editar:false,importar:false,dashboard:true,diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:false},
};
const PERMS_LISTA = [
  {key:"financeiro",lbl:"Financeiro"},{key:"editar",lbl:"Editar"},{key:"importar",lbl:"Importar"},
  {key:"dashboard",lbl:"Dashboard"},{key:"diarias",lbl:"Diárias"},{key:"descarga",lbl:"Descarga"},
  {key:"planilha",lbl:"Planilha"},{key:"ocorrencias",lbl:"Ocorrências"},{key:"config_db",lbl:"Config DB"},{key:"usuarios",lbl:"Usuários"},
];

// ══════════════════════════════════════════════
//  DEV CHANGELOG (histórico de sessões de desenvolvimento)
// ══════════════════════════════════════════════
const DEV_CHANGELOG = [
  {
    data: "2026-03-19 13:42", sessao: "Sessão 4",
    itens: [
      "01 · Admin Contatos: importar CSV Google Contacts ou vCard (.vcf); comparação com existentes; conflitos exibidos lado a lado com opção Manter atual / Usar importado; operações ≥5 contatos exigem digitar 'ESTOU DE ACORDO'",
      "02 · Cards Diárias/Descargas: campo RO (Registro de Ocorrência) e MAT adicionados ao formulário; chip 🔵 RO visível nos cards linha e bloco",
      "03 · Segundo botão WhatsApp (📄 DOC): formato documentário MOT/CTE/MDF/MAT/PLACAS/DT·NF·ID·RO; RO obrigatório; OBS opcional com memória do último valor",
    ],
  },
  {
    data: "2026-03-19 13:12", sessao: "Sessão 3",
    itens: [
      "00 · Modal Motorista: campo Vínculo → dropdown (Agregado/Terceiro/Frota); seção Dados Bancários adicionada (BCO, AGE, C/C, FAV, PIX c/ seletor de tipo)",
      "01 · Alertas de Descarga EVA: botão 📅 para adicionar ao calendário — gera .ics (celular) ou abre Google Calendar (notebook)",
      "02 · Log Admin: histórico de desenvolvimento (DEV_CHANGELOG) embutido no app; abas Desenvolvimento / Operacional no log",
      "03 · Motoristas: campo de busca por nome ou placa; exportação vCard (.vcf); script de normalização de contatos no Admin",
      "04 · WhatsApp card: modal rico com todos os campos da DT antes de abrir o WhatsApp; PGTO Cheque/Conta/Ambos com validação bancária e soma ≤ ADT",
    ],
  },
  {
    data: "2026-03-19 07:19", sessao: "Sessão 2",
    itens: [
      "BUG #1 · getConfigRemoto/setConfigRemoto: colunas corrigidas para 'chave'/'valor' (PostgREST retornava HTTP 400 com 'key'/'value')",
      "BUG #2 · getConexao: variáveis de ambiente VITE_SUPABASE_URL/KEY agora são PRIORIDADE (garante sync desktop + mobile)",
      "BUG #3 · setConfigRemoto: campo updated_at removido do payload (não existe na tabela co_config)",
      "FEAT · Login social: botões Google e Apple via Supabase Auth REST — redireciona para /auth/v1/authorize, captura hash #access_token no retorno",
    ],
  },
  {
    data: "2026-03-18 23:56", sessao: "Sessão 1",
    itens: [
      "FEAT · Sistema de backup automático: cria App.jsx.bckp_TIMESTAMP antes de cada sessão de mudanças",
      "FEAT · Log de alterações: tabela co_logs_alteracoes no Supabase + fallback localStorage (co_logs_local)",
      "FEAT · Acompanhamento dia a dia da DT: timeline com registro de texto e imagens por dia",
      "FEAT · Modal Detalhe / Ocorrências: timeline visual, ocorrências por tipo (info/alerta/status), acompanhamento persistido",
      "FEAT · Multi-perfil: admin, gerente, operador, visualizador com permissões granulares",
      "FEAT · Sync Supabase: paginação 1000 registros por página, override local/remoto",
      "FEAT · Export CSV / XLS / PDF; ExportMenu dropdown",
      "FEAT · Tema dark/light; logo customizável no primeiro login",
      "FEAT · Dashboard com gráficos Chart.js (bar/pie) agrupados por mês/motorista/destino/status",
    ],
  },
];

// ── Admin fixo ──
const ADMIN_EMAIL = "yvesfg@icloud.com";
const ADMIN_SENHA_PADRAO = "YFGroup@2024";

// ── Supabase padrão via variáveis de ambiente (Vite) ──
const ENV_SUPA_URL = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_SUPABASE_URL || "") : "";
const ENV_SUPA_KEY = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_SUPABASE_KEY || "") : "";

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

// ── Decodifica JWT sem biblioteca externa (para OAuth social) ──────────────
function decodeJWT(token) {
  try {
    const base64 = token.split(".")[1];
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch { return null; }
}

// ── Inicia login OAuth via Supabase Auth REST (sem SDK externo) ───────────
function iniciarOAuth(provider) {
  if (!ENV_SUPA_URL) { alert("Configure VITE_SUPABASE_URL no .env.local"); return; }
  const redirectTo = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href = `${ENV_SUPA_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
}

// ══════════════════════════════════════════════
//  EXPORT HELPERS
// ══════════════════════════════════════════════
function exportCSV(dados, cols, filename) {
  const header = cols.map(c => c.l).join(";");
  const rows = dados.map(r => cols.map(c => {
    const v = String(r[c.k] || "").replace(/"/g,'""');
    return `"${v}"`;
  }).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + [header,...rows].join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename+".csv"; a.click();
}

function exportODS(dados, cols, filename) {
  // ODS via XML spreadsheet (compatível com LibreOffice)
  const rows = dados.map(r =>
    `<Row>${cols.map(c => `<Cell><Data ss:Type="String">${esc(String(r[c.k]||""))}</Data></Cell>`).join("")}</Row>`
  ).join("");
  const header = `<Row>${cols.map(c=>`<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(c.l)}</Data></Cell>`).join("")}</Row>`;
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/></Style></Styles>
<Worksheet ss:Name="Dados"><Table>${header}${rows}</Table></Worksheet></Workbook>`;
  const blob = new Blob([xml], {type:"application/vnd.ms-excel"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename+".xls"; a.click();
}

function exportPDF(dados, cols, titulo) {
  const rows = dados.map(r =>
    `<tr>${cols.map(c=>`<td>${esc(String(r[c.k]||"—"))}</td>`).join("")}</tr>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title>
<style>
  @page{size:landscape;margin:12mm}
  body{font-family:Arial,sans-serif;font-size:10px;color:#222;padding:12px;margin:0}
  h1{font-size:16px;margin-bottom:4px}h2{font-size:10px;color:#666;font-weight:normal;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#1a1a2e;color:#fff;padding:7px 5px;font-size:8px;text-transform:uppercase;letter-spacing:.8px;text-align:left;border:1px solid #333}
  td{padding:5px;border:1px solid #ddd;font-size:9px}
  tr:nth-child(even){background:#f8f8f8}
  .footer{margin-top:14px;font-size:8px;color:#999;border-top:1px solid #ddd;padding-top:6px}
  @media print{body{padding:0}button{display:none}}
</style></head><body>
<h1>${titulo}</h1><h2>Exportado em ${new Date().toLocaleString("pt-BR")} — ${dados.length} registros</h2>
<table><thead><tr>${cols.map(c=>`<th>${c.l}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Controle Operacional · YFGroup — Gerado automaticamente</div>
<script>setTimeout(()=>window.print(),400)<\/script></body></html>`;
  const w = window.open("","_blank","width=960,height=720");
  if (w) { w.document.write(html); w.document.close(); }
}

function ExportMenu({ dados, cols, filename, titulo }) {
  const [open, setOpen] = React.useState(false);
  const t = themes.dark;
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(!open)} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:9,padding:"8px 12px",color:t.ouro,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
        📥 Exportar ▾
      </button>
      {open && (
        <div style={{position:"absolute",right:0,top:"110%",background:t.card,border:`1px solid ${t.borda}`,borderRadius:10,overflow:"hidden",zIndex:50,minWidth:150,boxShadow:`0 8px 24px rgba(0,0,0,.4)`}}>
          {[
            {ico:"📄",l:"CSV (.csv)",fn:()=>exportCSV(dados,cols,filename)},
            {ico:"📝",l:"Planilha (.xls)",fn:()=>exportODS(dados,cols,filename)},
            {ico:"📕",l:"PDF (impressão)",fn:()=>exportPDF(dados,cols,titulo)},
          ].map((opt,i,arr) => (
            <button key={opt.l} onClick={()=>{opt.fn();setOpen(false);}} style={{width:"100%",background:"transparent",border:"none",borderBottom:i<arr.length-1?`1px solid ${t.borda}`:"none",padding:"10px 14px",color:t.txt,fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
              {opt.ico} {opt.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
//  CALENDAR HELPERS (Item 1)
// ══════════════════════════════════════════════
function gerarICS(titulo, data, descricao, local) {
  // data no formato dd/mm/yyyy
  const parts = String(data).split("/");
  const dtStr = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : data.replace(/\D/g,"");
  const uid = `co-${Date.now()}@yfgroup.com`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YFGroup//ControleOperacional//PT",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${dtStr}`,
    `DTEND;VALUE=DATE:${dtStr}`,
    `SUMMARY:${titulo}`,
    `DESCRIPTION:${descricao.replace(/\n/g,"\\n")}`,
    local ? `LOCATION:${local}` : "",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete de descarga",
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([ics], {type:"text/calendar;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `descarga_${dtStr}.ics`;
  a.click();
}

function abrirGoogleCalendar(titulo, data, descricao) {
  const parts = String(data).split("/");
  const dtStr = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : data.replace(/\D/g,"");
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent(titulo)}`
    + `&dates=${dtStr}/${dtStr}`
    + `&details=${encodeURIComponent(descricao)}`;
  window.open(url, "_blank");
}

// Helper validação placa (Item 3)
function validarPlaca(p) {
  if (!p) return false;
  const s = p.toUpperCase().replace(/[^A-Z0-9]/g,"");
  return /^[A-Z]{3}[0-9]{4}$/.test(s) || /^[A-Z]{3}[0-9][A-Z0-9][0-9]{3}$/.test(s);
}
function normalizarPlaca(p) {
  if (!p) return "";
  return p.toUpperCase().replace(/[^A-Z0-9]/g,"");
}
function normalizarTelefone(t) {
  if (!t) return "";
  const d = t.replace(/\D/g,"");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return t;
}
function normalizarNome(n) {
  if (!n) return "";
  return n.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

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
//  ALTERAR SENHA ADMIN (colapsável)
// ══════════════════════════════════════════════
function AlterarSenhaAdmin({ t, css, showToast, onSalvar }) {
  const [open, setOpen] = React.useState(false);
  const [novaSenha, setNovaSenha] = React.useState("");
  const [confirmar, setConfirmar] = React.useState("");

  const salvar = async () => {
    if (!novaSenha) { showToast("⚠️ Digite a nova senha","warn"); return; }
    if (novaSenha.length < 6) { showToast("⚠️ Mínimo 6 caracteres","warn"); return; }
    if (novaSenha !== confirmar) { showToast("❌ Senhas não conferem","err"); return; }
    const hash = await hashSenha(novaSenha);
    saveJSON("co_admin_senha", hash);
    if (onSalvar) await onSalvar(hash); // ← salva no Supabase via callback
    setNovaSenha(""); setConfirmar("");
    showToast("✅ Senha atualizada e sincronizada!","ok");
  };

  return (
    <>
      <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={()=>setOpen(!open)}>
        🔑 Alterar Senha do Admin <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{open?"▲":"▼"}</span>
        <span style={{flex:1,height:1,background:t.borda}} />
      </div>
      {open && (
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} style={{...css.inp,fontSize:12}} />
          <input type="password" placeholder="Confirmar nova senha" value={confirmar} onChange={e=>setConfirmar(e.target.value)} onKeyDown={e=>e.key==="Enter"&&salvar()} style={{...css.inp,fontSize:12}} />
          <button onClick={salvar} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:8,padding:"10px 14px",color:t.ouro,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            💾 Salvar Nova Senha
          </button>
        </div>
      )}
    </>
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
  const [authEmail, setAuthEmail] = useState("");
  const [authSenha, setAuthSenha] = useState("");
  const [authMsg, setAuthMsg] = useState(null);
  const [primeiroLogin, setPrimeiroLogin] = useState(false);
  const [primLoginSenha, setPrimLoginSenha] = useState("");
  const [primLoginSenha2, setPrimLoginSenha2] = useState("");
  const [customLogo, setCustomLogo] = useState(() => loadJSON("co_custom_logo", null));
  const [usuarioLogado, setUsuarioLogado] = useState(null); // nome do usuário logado
  const [usuarios, setUsuarios] = useState(() => loadJSON("co_usuarios_local",[]));

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
  const [buscaRelacionados, setBuscaRelacionados] = useState([]);
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

  // View mode state (linhas | blocos) + colunas para Diarias e Descarga
  const [diariaView, setDiariaView] = useState(() => loadJSON("co_diaria_view","linhas"));
  const [diariaCols, setDiariaCols] = useState(() => loadJSON("co_diaria_cols", 2));
  const [descargaView, setDescargaView] = useState(() => loadJSON("co_descarga_view","linhas"));
  const [descargaCols, setDescargaCols] = useState(() => loadJSON("co_descarga_cols", 2));

  // Modal state
  const [modalOpen, setModalOpen] = useState(null); // 'edit'|'motorista'|'usuario'|'configdb'|'detalhe'
  const [editIdx, setEditIdx] = useState(-1);
  const [editStep, setEditStep] = useState(1);
  const [formData, setFormData] = useState({});

  // Detalhe / Ocorrências
  const [detalheDT, setDetalheDT] = useState(null);       // registro aberto no modal
  const [ocorrencias, setOcorrencias] = useState([]);      // lista de ocorrências do DT atual
  const [novaOcorr, setNovaOcorr] = useState("");
  const [novaOcorrTipo, setNovaOcorrTipo] = useState("info"); // info | alerta | status
  const [ocorrLoading, setOcorrLoading] = useState(false);

  // Item 4 - Acompanhamento dia a dia da DT
  const [acompDias, setAcompDias] = useState([]);
  const [acompDiaSel, setAcompDiaSel] = useState(null);
  const [acompTexto, setAcompTexto] = useState("");
  const [acompImagens, setAcompImagens] = useState([]);

  // Alerts
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [gsheetsOpen, setGsheetsOpen] = useState(false);

  // Item 7 — Email template e envio
  const [emailTemplateOpen, setEmailTemplateOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(() => loadJSON("co_email_template", {
    assunto: "Bem-vindo ao Controle Operacional — YFGroup",
    corpo: `Olá {nome},\n\nSeu acesso ao sistema de Controle Operacional da YFGroup foi criado com sucesso!\n\nSeus dados de acesso:\n- Email: {email}\n- Senha temporária: {senha}\n- Perfil: {perfil}\n\nAcesse o sistema em: https://controle-operacional-omega.vercel.app\n\nRecomendamos trocar sua senha no primeiro acesso.\n\nAtenciosamente,\nAdministração — YFGroup`,
  }));
  const [usuarioEmailPreview, setUsuarioEmailPreview] = useState(null);

  // Item 8 — Log de alterações
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [logsSubTab, setLogsSubTab] = useState("dev"); // 'dev' | 'op'

  // WhatsApp card modal (Item 4)
  const [wppModal, setWppModal] = useState(null); // {reg, mot}
  const [wppTel, setWppTel] = useState("");
  const [wppPgto, setWppPgto] = useState("cheque"); // 'cheque'|'conta'|'ambos'
  const [wppValCheque, setWppValCheque] = useState("");
  const [wppValConta, setWppValConta] = useState("");
  const [wppObs, setWppObs] = useState("");

  // Motoristas — busca local (Item 3)
  const [motBusca, setMotBusca] = useState("");

  // Importação de contatos (Item 1 sessão 4)
  const [motImportOpen, setMotImportOpen] = useState(false);
  const [motImportData, setMotImportData] = useState(null); // {novos:[], conflitos:[{atual,import,escolha}]}
  const [motImportConfirm, setMotImportConfirm] = useState("");

  // Segundo WhatsApp — formato documentário (Item 3 sessão 4)
  const [wppModal2, setWppModal2] = useState(null); // {reg, mot}
  const [wpp2Ro, setWpp2Ro] = useState("");
  const [wpp2Obs, setWpp2Obs] = useState(() => loadJSON("co_wpp2_obs_last",""));
  const [wpp2IncluirObs, setWpp2IncluirObs] = useState(false);
  const [wpp2Conflitos, setWpp2Conflitos] = useState([]); // para resolver conflitos de importação

  // Dashboard extras
  const [dashChartType, setDashChartType] = useState("bar"); // bar | pie
  const [dashGroupBy, setDashGroupBy] = useState("mes"); // mes | motorista | destino | status

  // Chart refs
  const chartCarregRef = useRef(null);
  const chartCTERef = useRef(null);
  const chartPieRef = useRef(null);
  const chartInstances = useRef({c:null,f:null,p:null});

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
      // Alerta de atraso na descarga — inclui ref. ao registro para botão de calendário
      if (da && !dd) { const dif = diffDias(da,hoje); if (dif>=1) list.push({tipo:"danger",cat:"descarga",txt:`🚨 ${r.nome} · DT ${r.dt} · Agenda ${r.data_agenda} sem descarga (${dif}d)`,reg:r}); }
      // Alerta de cobrança — saldo pendente após descarga
      const saldo = parseFloat(r.saldo);
      if (!isNaN(saldo) && saldo > 0 && dd) {
        list.push({tipo:"warn",cat:"cobranca",txt:`💰 Cobrança pendente: ${r.nome} · DT ${r.dt} · Saldo ${fmtMoeda(r.saldo)}`,reg:r});
      }
    });
    return list;
  }, [DADOS]);

  // Toast helper
  const showToast = useCallback((msg, type="") => {
    setToast({msg,type,visible:true});
    setTimeout(() => setToast(p => ({...p,visible:false})), 2800);
  }, []);

  // Connection — env vars têm PRIORIDADE (funcionam em todos os dispositivos sem config local)
  const getConexao = useCallback(() => {
    // Primário: variáveis de ambiente do Vite/Vercel — garante sync em desktop E mobile
    if (ENV_SUPA_URL && ENV_SUPA_KEY) return {url: ENV_SUPA_URL, key: ENV_SUPA_KEY, name:"Padrão"};
    // Fallback: conexões manuais salvas no localStorage (somente este dispositivo)
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
      setUsuarioLogado(s.nome || s.perfil);
      setAuthed(true);
    }
  }, []);

  // Sync on auth
  useEffect(() => {
    if (authed && getConexao()) {
      sincronizar();
      syncUsuariosRemoto(); // Sincronizar usuários do Supabase ao logar
    }
  }, [authed]);

  // Save theme
  useEffect(() => { saveJSON("co_theme", theme); }, [theme]);

  // ── Callback OAuth: detecta retorno do Google/Apple e loga automaticamente ──
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    if (!accessToken) return;

    // Limpa hash da URL (evita reprocessar no reload)
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

    const payload = decodeJWT(accessToken);
    if (!payload?.email) { setAuthMsg({t:"err",m:"❌ Email não encontrado no token OAuth"}); return; }

    const emailOAuth = payload.email.toLowerCase();
    const nomeOAuth = payload.user_metadata?.full_name || payload.user_metadata?.name || emailOAuth;

    // Admin via OAuth
    if (emailOAuth === ADMIN_EMAIL.toLowerCase()) {
      const p = "admin"; const pm = {...PERMS_PADRAO.admin};
      setPerfil(p); setPerms(pm); setAuthed(true);
      setUsuarioLogado(nomeOAuth);
      saveJSON("co_sessao", {perfil:p, perms:pm, nome:nomeOAuth});
      showToast(`✅ Login social realizado — bem-vindo, ${nomeOAuth}!`, "ok");
      return;
    }

    // Busca usuário no Supabase (sincronização real)
    if (ENV_SUPA_URL && ENV_SUPA_KEY) {
      supaFetch(ENV_SUPA_URL, ENV_SUPA_KEY, "GET",
        `${TABLE_USUARIOS}?email=eq.${encodeURIComponent(payload.email)}&select=*&limit=1`)
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const u = data[0];
            const p = u.perfil || "visualizador";
            const pm = typeof u.perms === "string" ? JSON.parse(u.perms) : (u.perms || {...PERMS_PADRAO[p]});
            setPerfil(p); setPerms(pm); setAuthed(true);
            setUsuarioLogado(u.nome || u.email);
            saveJSON("co_sessao", {perfil:p, perms:pm, nome:u.nome||u.email});
            showToast(`✅ Login social realizado — bem-vindo, ${u.nome||u.email}!`, "ok");
          } else {
            setAuthMsg({t:"err", m:`❌ Conta ${payload.email} não cadastrada no sistema`});
          }
        })
        .catch(() => setAuthMsg({t:"err", m:"❌ Erro ao verificar conta no banco"}));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Roda uma única vez no mount — processa hash OAuth do redirect

  // ── Helpers para co_config no Supabase ──
  // ── co_config: colunas reais = key (PK) + value + updated_at ────────────
  const getConfigRemoto = useCallback(async (key) => {
    const conn = getConexao();
    if (!conn) return null;
    try {
      const data = await supaFetch(conn.url, conn.key, "GET", `${TABLE_CONFIG}?key=eq.${key}&select=value`);
      return Array.isArray(data) && data.length > 0 ? data[0].value : null;
    } catch { return null; }
  }, [getConexao]);

  const setConfigRemoto = useCallback(async (key, value) => {
    const conn = getConexao();
    if (!conn) return;
    try {
      await supaFetch(conn.url, conn.key, "POST", `${TABLE_CONFIG}?on_conflict=key`, [{key, value, updated_at: new Date().toISOString()}]);
    } catch { /* silencioso */ }
  }, [getConexao]);

  // ── Log de alterações (Item 8) ──
  const registrarLog = useCallback(async (acao, descricao, dados_antes = null, dados_depois = null) => {
    const conn = getConexao();
    const entrada = {
      data_hora: new Date().toISOString(),
      usuario: usuarioLogado || perfil || "sistema",
      perfil_usuario: perfil || "desconhecido",
      acao,
      descricao,
      dados_antes: dados_antes ? JSON.stringify(dados_antes) : null,
      dados_depois: dados_depois ? JSON.stringify(dados_depois) : null,
    };
    // Salva local como fallback
    const logsLocal = loadJSON("co_logs_local", []);
    logsLocal.unshift(entrada);
    saveJSON("co_logs_local", logsLocal.slice(0, 200)); // máximo 200 entradas locais
    // Salva no Supabase
    if (conn) {
      try { await supaFetch(conn.url, conn.key, "POST", TABLE_LOGS, [entrada]); } catch { /* silencioso */ }
    }
  }, [getConexao, usuarioLogado, perfil]);

  // Item 7 — Gerar email de boas-vindas
  const gerarCorpoEmail = useCallback((template, usuario, senhaPlain = "") => {
    return (template.corpo || "")
      .replace(/{nome}/g, usuario.nome || "")
      .replace(/{email}/g, usuario.email || "")
      .replace(/{senha}/g, senhaPlain || "(senha definida no cadastro)")
      .replace(/{perfil}/g, usuario.perfil || "operador");
  }, []);

  const enviarEmailBoasVindas = useCallback((usuario, senhaPlain = "", forcarExterno = false) => {
    const corpo = gerarCorpoEmail(emailTemplate, usuario, senhaPlain);
    const assunto = (emailTemplate.assunto || "").replace(/{nome}/g, usuario.nome || "");
    if (forcarExterno) {
      // Abre cliente de email externo (Mail, Outlook, etc)
      const mailtoLink = `mailto:${usuario.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      window.open(mailtoLink, "_blank");
    } else {
      // Abre Gmail diretamente
      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(usuario.email)}&su=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      window.open(gmailUrl, "_blank");
    }
    showToast(`📧 Email preparado para ${usuario.email}`,"ok");
  }, [emailTemplate, gerarCorpoEmail, showToast]);

  // Item 8 — Carregar logs do Supabase
  const carregarLogs = useCallback(async () => {
    const conn = getConexao();
    if (!conn) {
      setLogsData(loadJSON("co_logs_local", []));
      return;
    }
    try {
      const data = await supaFetch(conn.url, conn.key, "GET",
        `${TABLE_LOGS}?order=data_hora.desc&limit=100&select=*`);
      if (Array.isArray(data)) setLogsData(data);
    } catch {
      setLogsData(loadJSON("co_logs_local", []));
    }
  }, [getConexao]);

  // Sincronizar usuários do Supabase
  const syncUsuariosRemoto = useCallback(async () => {
    const conn = getConexao();
    if (!conn) return;
    try {
      const data = await supaFetch(conn.url, conn.key, "GET", `${TABLE_USUARIOS}?select=*`);
      if (Array.isArray(data)) {
        setUsuarios(data);
        saveJSON("co_usuarios_local", data);
      }
    } catch { /* silencioso */ }
  }, [getConexao]);

  // ── Ocorrências ──
  const abrirDetalhe = useCallback(async (reg) => {
    setDetalheDT(reg);
    setOcorrencias([]);
    setNovaOcorr("");
    setAcompDias([]);
    setAcompDiaSel(null);
    setAcompTexto("");
    setAcompImagens([]);
    setModalOpen("detalhe");
    // Carregar acompanhamento local
    const acompLocal = JSON.parse(localStorage.getItem("co_acomp_"+reg.dt) || "[]");
    setAcompDias(acompLocal);
    // Carregar ocorrências locais
    const local = loadJSON(`co_ocorr_${reg.dt}`, []);
    setOcorrencias(local);
    // Carregar do Supabase
    const conn = getConexao();
    if (conn) {
      setOcorrLoading(true);
      try {
        const data = await supaFetch(conn.url, conn.key, "GET",
          `${TABLE_OCORR}?dt=eq.${encodeURIComponent(reg.dt)}&order=data_hora.asc&select=*`);
        if (Array.isArray(data)) {
          setOcorrencias(data);
          saveJSON(`co_ocorr_${reg.dt}`, data);
        }
      } catch { /* usa local */ }
      finally { setOcorrLoading(false); }
    }
  }, [getConexao]);

  const adicionarOcorrencia = useCallback(async () => {
    if (!novaOcorr.trim() || !detalheDT) return;
    const nova = {
      dt: detalheDT.dt,
      data_hora: new Date().toISOString(),
      texto: novaOcorr.trim(),
      tipo: novaOcorrTipo,
      usuario: usuarioLogado || perfil || "sistema",
    };
    const updated = [...ocorrencias, nova];
    setOcorrencias(updated);
    saveJSON(`co_ocorr_${detalheDT.dt}`, updated);
    setNovaOcorr("");
    // Salvar no Supabase
    const conn = getConexao();
    if (conn) {
      try {
        await supaFetch(conn.url, conn.key, "POST", TABLE_OCORR, [nova]);
      } catch { /* silencioso */ }
    }
    showToast("✅ Ocorrência registrada","ok");
  }, [novaOcorr, novaOcorrTipo, detalheDT, ocorrencias, getConexao, usuarioLogado, perfil, showToast]);

  // Login handler
  const handleLogin = async () => {
    setAuthMsg(null);
    const login = authEmail.trim().toLowerCase();
    if (!login) { setAuthMsg({t:"err",m:"⚠️ Digite seu email"}); return; }
    if (!authSenha) { setAuthMsg({t:"err",m:"⚠️ Digite a senha"}); return; }

    // ── Login ADMIN ──
    if (login === ADMIN_EMAIL.toLowerCase() || login === "admin") {
      // SEMPRE busca do Supabase primeiro — garante sincronização entre todos os dispositivos
      let storedHash = null;
      const conn = getConexao();
      if (conn) {
        try {
          storedHash = await getConfigRemoto("admin_senha_hash");
          if (storedHash) saveJSON("co_admin_senha", storedHash); // espelha localmente
        } catch { /* fallback local */ }
      }
      if (!storedHash) storedHash = loadJSON("co_admin_senha", null);

      let ok = false;
      if (!storedHash) {
        ok = authSenha === ADMIN_SENHA_PADRAO;
      } else {
        try { ok = await verificarSenha(authSenha, storedHash); } catch { ok = authSenha === storedHash; }
      }
      if (ok) {
        const p = "admin";
        const pm = {...PERMS_PADRAO.admin};
        setPerfil(p); setPerms(pm); setAuthed(true);
        setUsuarioLogado("Admin");
        saveJSON("co_sessao",{perfil:p,perms:pm,nome:"Admin"});
        setAuthSenha(""); setAuthEmail("");
        if (!storedHash) setPrimeiroLogin(true);
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
        const remote = await supaFetch(conn2.url, conn2.key, "GET",
          `${TABLE_USUARIOS}?email=eq.${encodeURIComponent(authEmail.trim())}&select=*&limit=1`);
        if (Array.isArray(remote) && remote.length > 0) {
          const u = remote[0];
          let m = false;
          try { m = await verificarSenha(authSenha, u.senha); } catch { m = authSenha === u.senha; }
          if (m) found = u;
          // Atualiza cache local com dados frescos do Supabase
          if (found) {
            const cacheAtual = loadJSON("co_usuarios_local", []);
            const cacheAtualizado = [...cacheAtual.filter(x => x.email !== u.email), u];
            saveJSON("co_usuarios_local", cacheAtualizado);
            setUsuarios(cacheAtualizado);
          }
        }
      } catch { /* fallback lista local */ }
    }

    // Fallback: lista local (offline)
    if (!found) {
      for (const u of usuarios) {
        if ((u.email||"").toLowerCase() === login) {
          let m = false;
          try { m = await verificarSenha(authSenha, u.senha); } catch { m = authSenha === u.senha; }
          if (m) { found = u; break; }
        }
      }
    }

    if (found) {
      const p = found.perfil || "visualizador";
      const pm = found.perms || {...PERMS_PADRAO[p]};
      setPerfil(p); setPerms(pm); setAuthed(true);
      setUsuarioLogado(found.nome || found.email);
      saveJSON("co_sessao",{perfil:p,perms:pm,nome:found.nome||found.email});
      setAuthSenha(""); setAuthEmail("");
    } else {
      // Checar se existe na lista local para dar mensagem correta
      const emailExiste = usuarios.some(u => (u.email||"").toLowerCase() === login);
      setAuthMsg({t:"err",m: emailExiste ? "❌ Senha incorreta" : "❌ Usuário não encontrado"});
      setAuthSenha("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("co_sessao");
    setAuthed(false); setPerfil(null); setPerms({});
    setActiveTab("busca"); setAuthSenha(""); setAuthEmail("");
    setUsuarioLogado(null);
  };

  // Salvar nova senha no primeiro login (local + Supabase)
  const handlePrimeiroLoginSalvar = async () => {
    if (!primLoginSenha || primLoginSenha.length < 6) { showToast("⚠️ Senha deve ter ao menos 6 caracteres","warn"); return; }
    if (primLoginSenha !== primLoginSenha2) { showToast("❌ Senhas não conferem","err"); return; }
    const hash = await hashSenha(primLoginSenha);
    saveJSON("co_admin_senha", hash);
    await setConfigRemoto("admin_senha_hash", hash); // ← sincroniza todos os dispositivos
    setPrimeiroLogin(false);
    setPrimLoginSenha(""); setPrimLoginSenha2("");
    showToast("✅ Senha atualizada e sincronizada!","ok");
  };

  // Search
  const buscar = () => {
    setBuscaResult(null); setBuscaError(null); setBuscaRelacionados([]);
    const v = buscaInput.trim();
    if (!v) return;
    let found = null;
    let relacionados = [];

    if (buscaTipo === "dt") {
      const c = v.replace(/\D/g,"");
      found = DADOS.find(r => r.dt?.replace(/\D/g,"") === c || dtBase(r.dt)?.replace(/\D/g,"") === c);
      if (found) {
        // Buscar outros registros com mesmo CPF ou mesma Placa
        const cpfN = found.cpf?.replace(/\D/g,"");
        const placaN = found.placa?.toUpperCase().replace(/\W/g,"");
        relacionados = DADOS.filter(r =>
          r.dt !== found.dt && (
            (cpfN && r.cpf?.replace(/\D/g,"") === cpfN) ||
            (placaN && r.placa?.toUpperCase().replace(/\W/g,"") === placaN)
          )
        ).sort((a,b) => {
          const da = parseData(a.data_carr), db = parseData(b.data_carr);
          return da && db ? db - da : 0; // mais recente primeiro
        });
      }
    } else if (buscaTipo === "cpf") {
      const cpfN = v.replace(/\D/g,"");
      const todos = DADOS.filter(r => r.cpf?.replace(/\D/g,"") === cpfN)
        .sort((a,b) => { const da=parseData(a.data_carr),db=parseData(b.data_carr); return da&&db?db-da:0; });
      found = todos[0] || null;
      relacionados = todos.slice(1);
    } else {
      const placaN = v.toUpperCase().replace(/\W/g,"");
      const todos = DADOS.filter(r => r.placa?.toUpperCase().replace(/\W/g,"") === placaN)
        .sort((a,b) => { const da=parseData(a.data_carr),db=parseData(b.data_carr); return da&&db?db-da:0; });
      found = todos[0] || null;
      relacionados = todos.slice(1);
    }

    if (found) {
      setBuscaResult(found);
      setBuscaRelacionados(relacionados);
      const newH = [{dt:found.dt,nome:found.nome||"—"},...historico.filter(h=>h.dt!==found.dt)].slice(0,5);
      setHistorico(newH);
      saveJSON("hist",newH);
    } else {
      // CPF/Placa não achou registro — checar se existe em dados com info parcial
      if (buscaTipo === "cpf") {
        const cpfN = v.replace(/\D/g,"");
        const temCpf = DADOS.some(r => r.cpf?.replace(/\D/g,"") === cpfN);
        setBuscaError(temCpf ? `__cpf_sem_dt__${v}` : v);
      } else {
        setBuscaError(v);
      }
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
    const isDark = theme === "dark";
    const gridC = isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.06)";
    const tickC = isDark ? "#848e9c" : "#6b7280";
    const PIE_COLORS = ["rgba(240,185,11,.8)","rgba(2,192,118,.8)","rgba(22,119,255,.8)","rgba(246,70,93,.8)","rgba(156,39,176,.8)","rgba(255,152,0,.8)","rgba(0,188,212,.8)","rgba(96,125,139,.8)"];

    if (chartInstances.current.c) chartInstances.current.c.destroy();
    if (chartInstances.current.f) chartInstances.current.f.destroy();
    if (chartInstances.current.p) chartInstances.current.p.destroy();

    // Dados agrupados dinamicamente
    let labelsC, dataC;
    if (dashGroupBy === "mes") {
      labelsC = meses.map(m => {const p=m.split("/"); return MESES_LABEL[+p[0]-1]+"/"+p[1].slice(2);});
      dataC = meses.map(m => grupos[m].regs.length);
    } else if (dashGroupBy === "motorista") {
      const motMap = {};
      dashData.filtrado.forEach(r => { if (r.nome) motMap[r.nome] = (motMap[r.nome]||0)+1; });
      const sorted = Object.entries(motMap).sort((a,b)=>b[1]-a[1]).slice(0,12);
      labelsC = sorted.map(([k])=>k.split(" ")[0]);
      dataC = sorted.map(([,v])=>v);
    } else if (dashGroupBy === "destino") {
      const ufMap = {};
      dashData.filtrado.forEach(r => { if (!r.destino) return; const uf=r.destino.split("-").pop().trim().toUpperCase(); if(uf.length===2) ufMap[uf]=(ufMap[uf]||0)+1; });
      const sorted = Object.entries(ufMap).sort((a,b)=>b[1]-a[1]).slice(0,12);
      labelsC = sorted.map(([k])=>k);
      dataC = sorted.map(([,v])=>v);
    } else {
      const stMap = {};
      dashData.filtrado.forEach(r => { const s=r.status||"Sem status"; stMap[s]=(stMap[s]||0)+1; });
      const sorted = Object.entries(stMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
      labelsC = sorted.map(([k])=>k);
      dataC = sorted.map(([,v])=>v);
    }

    if (dashChartType === "bar" && chartCarregRef.current) {
      chartInstances.current.c = new Chart(chartCarregRef.current, {
        type:"bar", data:{labels:labelsC, datasets:[{label:"Carregamentos",data:dataC,backgroundColor:"rgba(240,185,11,.65)",borderColor:"rgba(240,185,11,1)",borderWidth:1.5,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:tickC},grid:{color:gridC}},x:{ticks:{color:tickC,maxRotation:45},grid:{display:false}}}}
      });
    } else if (dashChartType === "pie" && chartPieRef.current) {
      chartInstances.current.p = new Chart(chartPieRef.current, {
        type:"doughnut",
        data:{labels:labelsC, datasets:[{data:dataC,backgroundColor:PIE_COLORS,borderColor:isDark?"#1e2026":"#fff",borderWidth:2}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:"bottom",labels:{color:tickC,padding:10,font:{size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/dataC.reduce((a,b)=>a+b,0)*100)}%)`}}}}
      });
    }

    const dcte = meses.map(m => Math.round(grupos[m].cte));
    if (chartCTERef.current && perms.financeiro) {
      const labelsM = meses.map(m => {const p=m.split("/"); return MESES_LABEL[+p[0]-1]+"/"+p[1].slice(2);});
      chartInstances.current.f = new Chart(chartCTERef.current, {
        type:"bar", data:{labels:labelsM, datasets:[{label:"CTE (R$)",data:dcte,backgroundColor:"rgba(2,192,118,.6)",borderColor:"rgba(2,192,118,1)",borderWidth:1.5,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:tickC,callback:v=>"R$"+v.toLocaleString("pt-BR")},grid:{color:gridC}},x:{ticks:{color:tickC},grid:{display:false}}}}
      });
    }
    return () => {
      if (chartInstances.current.c) chartInstances.current.c.destroy();
      if (chartInstances.current.f) chartInstances.current.f.destroy();
      if (chartInstances.current.p) chartInstances.current.p.destroy();
    };
  }, [activeTab, dashData, theme, perms.financeiro, dashChartType, dashGroupBy]);

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
      try {
        await supaUpsert(reg);
        await registrarLog(
          editIdx>=0 ? "EDITAR_REGISTRO" : "NOVO_REGISTRO",
          `DT ${reg.dt} — ${reg.nome||"sem nome"}`,
          editIdx>=0 ? DADOS[editIdx] : null,
          reg
        );
        showToast("✅ Salvo e sincronizado!","ok");
      }
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

        {/* Logo */}
        {customLogo
          ? <img src={customLogo} alt="Logo" style={{width:72,height:72,borderRadius:20,objectFit:"contain",marginBottom:12,boxShadow:"0 0 36px rgba(240,185,11,.35)",animation:"logoPop .5s cubic-bezier(.34,1.56,.64,1)"}} />
          : <div style={{width:72,height:72,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,marginBottom:12,boxShadow:"0 0 36px rgba(240,185,11,.35)",animation:"logoPop .5s cubic-bezier(.34,1.56,.64,1)"}}>🚛</div>
        }
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:4,color:t.txt,textAlign:"center"}}>CONTROLE OPERACIONAL</div>
        <div style={{fontSize:11,color:t.txt2,textAlign:"center",margin:"4px 0 18px"}}>YFGroup · Imperatriz</div>

        <div style={{width:"100%",maxWidth:340,...css.card,boxShadow:`0 24px 60px ${t.shadow}`}}>
          <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,background:theme==="dark"?"linear-gradient(135deg,#161a1e,#1e2026)":`linear-gradient(135deg,#f8f9fa,#fff)`}}>
            <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🔐</div>
            <div><div style={{fontWeight:700,fontSize:13,color:t.txt}}>Acesso ao Sistema</div><div style={{fontSize:10,color:t.txt2}}>Entre com suas credenciais</div></div>
          </div>

          <div style={{padding:16}}>
            {/* Email/Login */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Email</label>
              <input value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="seu@email.com" style={css.inp} onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="username" />
            </div>

            {/* Password */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Senha</label>
              <input type="password" value={authSenha} onChange={e=>setAuthSenha(e.target.value)} placeholder="Digite sua senha..." style={css.inp} onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="current-password" />
            </div>

            <button onClick={handleLogin} style={{...css.btnGold,width:"100%",justifyContent:"center",padding:14,fontSize:18,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>🔓 ENTRAR</button>

            {authMsg && (
              <div style={{padding:"10px 12px",borderRadius:8,fontSize:12,fontWeight:600,textAlign:"center",marginTop:8,lineHeight:1.5,background:authMsg.t==="err"?`rgba(246,70,93,.08)`:`rgba(2,192,118,.08)`,color:authMsg.t==="err"?t.danger:t.verde,border:`1px solid ${authMsg.t==="err"?"rgba(246,70,93,.2)":"rgba(2,192,118,.2)"}`}}>{authMsg.m}</div>
            )}

            {/* ── Login Social (OAuth) ── */}
            {ENV_SUPA_URL && (
              <>
                <div style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0 2px"}}>
                  <div style={{flex:1,height:1,background:t.borda}} />
                  <span style={{fontSize:10,color:t.txt2,fontWeight:600,letterSpacing:1}}>OU ENTRE COM</span>
                  <div style={{flex:1,height:1,background:t.borda}} />
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button
                    onClick={() => iniciarOAuth("google")}
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,background:theme==="dark"?"rgba(255,255,255,.07)":"rgba(0,0,0,.04)",border:`1px solid ${t.borda2}`,borderRadius:10,padding:"10px 8px",cursor:"pointer",fontSize:12,fontWeight:600,color:t.txt,fontFamily:"inherit",transition:"background .2s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=theme==="dark"?"rgba(255,255,255,.12)":"rgba(0,0,0,.08)"}
                    onMouseLeave={e=>e.currentTarget.style.background=theme==="dark"?"rgba(255,255,255,.07)":"rgba(0,0,0,.04)"}
                  >
                    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                    Google
                  </button>
                  <button
                    onClick={() => iniciarOAuth("apple")}
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,background:theme==="dark"?"rgba(255,255,255,.07)":"rgba(0,0,0,.04)",border:`1px solid ${t.borda2}`,borderRadius:10,padding:"10px 8px",cursor:"pointer",fontSize:12,fontWeight:600,color:t.txt,fontFamily:"inherit",transition:"background .2s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=theme==="dark"?"rgba(255,255,255,.12)":"rgba(0,0,0,.08)"}
                    onMouseLeave={e=>e.currentTarget.style.background=theme==="dark"?"rgba(255,255,255,.07)":"rgba(0,0,0,.04)"}
                  >
                    <svg width="15" height="18" viewBox="0 0 814 1000" fill={t.txt}><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-105L46.1 840.6C27.4 812.5 0 775.8 0 707.2c0-130.3 77.7-227.2 240-227.2 61.6 0 104.2 34.8 139.6 34.8 33.7 0 87.5-37 152.2-37zm-8.8-175.8c31-37 53.1-88.1 53.1-139.1 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.5-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.5z"/></svg>
                    Apple
                  </button>
                </div>
                <div style={{fontSize:9,color:t.txt2,textAlign:"center",marginTop:8,lineHeight:1.5}}>
                  ⚠️ OAuth requer configuração no painel Supabase → Authentication → Providers
                </div>
              </>
            )}
          </div>
        </div>
        <Toast {...toast} />
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  MODAL PRIMEIRO LOGIN (troca de senha + logo)
  // ══════════════════════════════════════════════
  if (primeiroLogin) {
    return (
      <div style={{...css.app, background:t.gradientAuth, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:${t.txt2}}`}</style>
        <div style={{width:64,height:64,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,marginBottom:14,boxShadow:"0 0 30px rgba(240,185,11,.35)"}}>🔑</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:3,color:t.txt,marginBottom:4}}>PRIMEIRO ACESSO</div>
        <div style={{fontSize:11,color:t.txt2,marginBottom:20,textAlign:"center"}}>Configure sua senha de administrador e, opcionalmente, sua logo.</div>

        <div style={{width:"100%",maxWidth:360,...css.card,boxShadow:`0 24px 60px ${t.shadow}`,padding:18,display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Nova Senha *</label>
            <input type="password" value={primLoginSenha} onChange={e=>setPrimLoginSenha(e.target.value)} placeholder="Mínimo 6 caracteres" style={css.inp} />
          </div>
          <div>
            <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Confirmar Senha *</label>
            <input type="password" value={primLoginSenha2} onChange={e=>setPrimLoginSenha2(e.target.value)} placeholder="Repita a senha" style={css.inp} onKeyDown={e=>e.key==="Enter"&&handlePrimeiroLoginSalvar()} />
          </div>
          <div>
            <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Logo da Empresa (opcional)</label>
            <input type="file" accept="image/*" onChange={e=>{
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = ev => { const b64 = ev.target.result; setCustomLogo(b64); saveJSON("co_custom_logo", b64); };
              reader.readAsDataURL(f);
            }} style={{...css.inp,padding:"7px 10px",fontSize:11}} />
            {customLogo && <img src={customLogo} alt="preview" style={{width:60,height:60,objectFit:"contain",borderRadius:10,marginTop:8,border:`1px solid ${t.borda}`}} />}
          </div>
          <button onClick={handlePrimeiroLoginSalvar} style={{...css.btnGold,justifyContent:"center",padding:13,fontSize:16,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>✅ CONFIRMAR E ENTRAR</button>
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
            perfil==="admin"?t.ouro:perfil==="gerente"?t.azulLt:perfil==="operador"?t.txt2:t.azulLt,
            perfil==="admin"?`rgba(240,185,11,.12)`:perfil==="gerente"?`rgba(22,119,255,.1)`:perfil==="operador"?`rgba(132,142,156,.12)`:`rgba(22,119,255,.1)`,
            perfil==="admin"?`rgba(240,185,11,.25)`:perfil==="gerente"?`rgba(22,119,255,.22)`:perfil==="operador"?t.borda:`rgba(22,119,255,.22)`,
          )} title={usuarioLogado||perfil}>{perfil==="admin"?"👑 ADMIN":perfil==="gerente"?`🏢 ${(usuarioLogado||"GER").split(" ")[0].substring(0,8).toUpperCase()}`:perfil==="operador"?`⚙️ ${(usuarioLogado||"OP").split(" ")[0].substring(0,8).toUpperCase()}`:`👁️ ${(usuarioLogado||"VIEW").split(" ")[0].substring(0,8).toUpperCase()}`}</span>

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
              <span style={{fontSize:11,color:t.txt2,lineHeight:1.5,flex:1}}>{a.txt}</span>
              {a.cat==="descarga" && a.reg && (
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  <button
                    title="Adicionar ao Calendário (celular/notebook)"
                    onClick={()=>{
                      const reg = a.reg;
                      const titulo = `📦 Descarga — ${reg.nome||"Motorista"} · DT ${reg.dt}`;
                      const desc = `DT: ${reg.dt}\nMotorista: ${reg.nome||"—"}\nRota: ${reg.origem||"—"} → ${reg.destino||"—"}\nPlaca: ${reg.placa||"—"}\nYFGroup Controle Operacional`;
                      const data = reg.data_agenda;
                      if (window.confirm(`📅 Adicionar ao calendário?\n"${titulo}"\nData: ${data}\n\nClique OK para baixar .ics (celular/notebook)\nou Cancelar para abrir no Google Calendar`)) {
                        gerarICS(titulo, data, desc, reg.destino||"");
                      } else {
                        abrirGoogleCalendar(titulo, data, desc);
                      }
                    }}
                    style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.2)`,borderRadius:6,padding:"4px 8px",color:t.azulLt,fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}
                  >📅 Calendário</button>
                </div>
              )}
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
                  {/* ── Banner: Motorista não cadastrado ── */}
                  {(() => {
                    const cpfN = buscaResult.cpf?.replace(/\D/g,"");
                    const placaN = buscaResult.placa?.toUpperCase().replace(/\W/g,"");
                    const motCadastrado = motoristas.find(m =>
                      (cpfN && m.cpf?.replace(/\D/g,"") === cpfN) ||
                      [m.placa1,m.placa2,m.placa3,m.placa4].some(p => p && p.toUpperCase().replace(/\W/g,"") === placaN)
                    );
                    if (motCadastrado) return null;
                    return (
                      <div style={{background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:t.ouro}}>Motorista não cadastrado</div>
                          <div style={{fontSize:10,color:t.txt2,marginTop:2}}>Este motorista não está no cadastro. Deseja cadastrar?</div>
                        </div>
                        {canEdit && (
                          <button onClick={()=>{
                            setFormData({
                              nome: buscaResult.nome || "",
                              cpf: buscaResult.cpf || "",
                              placa1: buscaResult.placa || "",
                              vinculo: buscaResult.vinculo || "",
                            });
                            setEditIdx(-1);
                            setModalOpen("motorista");
                          }} style={{background:`rgba(240,185,11,.12)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:8,padding:"7px 11px",color:t.ouro,fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",flexShrink:0}}>
                            ＋ Cadastrar
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {canEdit && (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button onClick={()=>{
                        const idx = DADOS.findIndex(r=>r.dt===buscaResult.dt);
                        setEditIdx(idx);setFormData({...buscaResult});setEditStep(1);setModalOpen("edit");
                      }} style={{...css.btnGold,justifyContent:"center",padding:11}}>✏️ EDITAR</button>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <button onClick={()=>{
                          // Abrir modal WhatsApp (Item 4)
                          const mot = motoristas.find(m =>
                            (buscaResult.cpf && m.cpf?.replace(/\D/g,"") === buscaResult.cpf?.replace(/\D/g,"")) ||
                            (buscaResult.nome && m.nome === buscaResult.nome) ||
                            [m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa)
                          );
                          setWppModal({reg: buscaResult, mot: mot||null});
                          setWppTel((mot?.tel||buscaResult.tel||""));
                          setWppPgto("cheque");
                          setWppValCheque("");
                          setWppValConta("");
                          setWppObs("");
                        }} style={{border:"none",borderRadius:10,padding:11,cursor:"pointer",background:`rgba(37,211,102,.1)`,border:`1px solid rgba(37,211,102,.25)`,color:"#25D366",fontWeight:700,fontSize:11,letterSpacing:.5,textTransform:"uppercase",fontFamily:"inherit"}}>📲 WHATSAPP</button>
                        <button onClick={()=>{
                          // Abrir modal WhatsApp DOC (Item 3 Sessão 4)
                          const mot = motoristas.find(m =>
                            (buscaResult.cpf && m.cpf?.replace(/\D/g,"") === buscaResult.cpf?.replace(/\D/g,"")) ||
                            (buscaResult.nome && m.nome === buscaResult.nome) ||
                            [m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa)
                          );
                          setWppModal2({reg: buscaResult, mot: mot||null});
                          setWpp2Ro(buscaResult.ro||"");
                          setWpp2IncluirObs(false);
                        }} style={{border:"none",borderRadius:10,padding:11,cursor:"pointer",background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.25)`,color:t.azulLt,fontWeight:700,fontSize:11,letterSpacing:.5,textTransform:"uppercase",fontFamily:"inherit"}}>📄 DOC</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Outros registros (mesmo CPF / mesma Placa) ── */}
            {buscaResult && buscaRelacionados.length > 0 && (
              <div style={{marginTop:12,animation:"slideUp .3s"}}>
                <div style={{...css.secTitle,marginBottom:8}}>
                  {buscaTipo==="cpf"?"🪪 Outros DTs com este CPF":buscaTipo==="placa"?"🚛 Outros DTs com esta Placa":"📋 Outros registros (mesmo CPF / Placa)"}
                  <span style={{flex:1,height:1,background:t.borda}} />
                  <span style={{fontSize:10,color:t.txt2,fontWeight:600}}>{buscaRelacionados.length} registro{buscaRelacionados.length>1?"s":""}</span>
                </div>
                {buscaRelacionados.slice(0,10).map((r,i) => {
                  const statusC = r.data_desc ? t.verde : r.data_agenda ? t.ouro : t.txt2;
                  const statusL = r.data_desc ? "✅ Descarregado" : r.data_agenda ? "⏳ Aguardando" : "—";
                  return (
                    <div key={i} onClick={()=>{
                      setBuscaInput(r.dt);
                      setBuscaTipo("dt");
                      setTimeout(()=>{
                        setBuscaResult(r);
                        // recalcular relacionados
                        const cpfN = r.cpf?.replace(/\D/g,"");
                        const placaN = r.placa?.toUpperCase().replace(/\W/g,"");
                        const rel = DADOS.filter(x =>
                          x.dt !== r.dt && (
                            (cpfN && x.cpf?.replace(/\D/g,"") === cpfN) ||
                            (placaN && x.placa?.toUpperCase().replace(/\W/g,"") === placaN)
                          )
                        ).sort((a,b) => { const da=parseData(a.data_carr),db=parseData(b.data_carr); return da&&db?db-da:0; });
                        setBuscaRelacionados(rel);
                      }, 0);
                    }} style={{background:t.card,borderRadius:10,padding:"10px 12px",marginBottom:6,border:`1px solid ${t.borda}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"border-color .2s"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:2,color:t.ouro}}>{r.dt}</span>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:t.verde}}>{r.placa||""}</span>
                        </div>
                        <div style={{fontSize:10,color:t.txt2,display:"flex",gap:10,flexWrap:"wrap"}}>
                          <span>📦 {r.data_carr||"—"}</span>
                          <span>📅 {r.data_agenda||"—"}</span>
                          <span style={{color:statusC,fontWeight:600}}>{statusL}</span>
                        </div>
                      </div>
                      <span style={{color:t.txt2,fontSize:14,flexShrink:0}}>›</span>
                    </div>
                  );
                })}
                {buscaRelacionados.length > 10 && (
                  <div style={{fontSize:10,color:t.txt2,textAlign:"center",padding:"6px 0"}}>… e mais {buscaRelacionados.length-10} registro(s)</div>
                )}
              </div>
            )}

            {/* Error */}
            {buscaError && !buscaError.startsWith("__cpf_sem_dt__") && (
              <div style={{...css.card,padding:"24px 16px",textAlign:"center",borderTop:`3px solid ${t.danger}`,animation:"slideUp .3s"}}>
                <div style={{fontSize:30,marginBottom:10}}>❌</div>
                <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.danger,marginBottom:5}}>NÃO ENCONTRADO</h3>
                <p style={{color:t.txt2,fontSize:11,marginBottom:4}}>Nenhum registro encontrado para <strong style={{color:t.txt}}>"{buscaError}"</strong></p>
                <p style={{color:t.txt2,fontSize:10,marginBottom:14}}>
                  {buscaTipo==="cpf"?"Nenhum motorista com este CPF nos registros.":buscaTipo==="placa"?"Nenhuma placa com este número nos registros.":"DT não localizada no sistema."}
                </p>
                {canEdit && (
                  <button onClick={()=>{
                    const fd = buscaTipo==="dt" ? {dt:buscaError}
                             : buscaTipo==="cpf" ? {cpf:buscaError}
                             : {placa:buscaError};
                    setFormData(fd); setEditIdx(-1); setEditStep(1); setModalOpen("edit");
                  }} style={{...css.btnGold,marginTop:4,background:`linear-gradient(135deg,${t.azul},${t.azulLt})`,color:"#fff",justifyContent:"center",width:"100%",fontSize:14}}>
                    ＋ CADASTRAR NOVO REGISTRO
                  </button>
                )}
              </div>
            )}

            {/* History */}
            {historico.length > 0 && !buscaResult && !buscaError && (
              <div style={{marginTop:16}}>
                <div style={css.secTitle}>Histórico Recente <span style={{flex:1,height:1,background:t.borda}} /></div>
                {historico.map((h,i) => (
                  <div key={i} onClick={()=>{
                    const dt=h.dt; setBuscaInput(dt); setBuscaTipo("dt");
                    setBuscaResult(null); setBuscaError(null); setBuscaRelacionados([]);
                    const c=dt.replace(/\D/g,"");
                    const found=DADOS.find(x=>x.dt?.replace(/\D/g,"")===c||dtBase(x.dt)?.replace(/\D/g,"")===c);
                    if(found){setBuscaResult(found);const cpfN=found.cpf?.replace(/\D/g,""),placaN=found.placa?.toUpperCase().replace(/\W/g,"");const rels=DADOS.filter(x=>x.dt!==found.dt&&((cpfN&&x.cpf?.replace(/\D/g,"")===cpfN)||(placaN&&x.placa?.toUpperCase().replace(/\W/g,"")===placaN))).sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;});setBuscaRelacionados(rels);}else{setBuscaError(dt);}
                  }} style={{background:t.card,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,border:`1px solid ${t.borda}`,cursor:"pointer",marginBottom:7}}>
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

            {(() => {
              const motsUniq = new Set(dashData.filtrado.map(r=>r.nome).filter(Boolean));
              return (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:10,marginBottom:14}}>
                  <div style={css.kpi(t.ouro)}><div style={{fontSize:20,marginBottom:4}}>🚛</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:t.ouro}}>{dashData.filtrado.length}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Carregamentos</div></div>
                  <div style={css.kpi(t.verde)}><div style={{fontSize:20,marginBottom:4}}>🔢</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:t.verde}}>{dashData.dtsU.size}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>DTs Únicas</div></div>
                  <div style={{...css.kpi(t.azulLt),cursor:"pointer"}} onClick={()=>setActiveTab("motoristas")}><div style={{fontSize:20,marginBottom:4}}>👨‍✈️</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:t.azulLt}}>{motsUniq.size}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Motoristas</div></div>
                  {canFin && <div style={css.kpi(t.azul)}><div style={{fontSize:20,marginBottom:4}}>💰</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,color:t.azulLt}}>R$ {(dashData.cteT/1000).toFixed(1)}k</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Total CTE</div></div>}
                  <div style={{...css.kpi(t.danger),cursor:"pointer"}} onClick={()=>setAlertasOpen(!alertasOpen)}><div style={{fontSize:20,marginBottom:4}}>🚨</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:t.danger}}>{alertas.length}</div><div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Alertas</div></div>
                </div>
              );
            })()}

            {/* Gráfico de Carregamentos — toggle bar/pizza */}
            <div style={{...css.card,padding:14,marginBottom:14}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:t.txt2,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                Carregamentos
                <span style={{flex:1,height:1,background:t.borda}} />
                {/* Toggle agrupamento */}
                {[{k:"mes",l:"Mês"},{k:"motorista",l:"Motorista"},{k:"destino",l:"Destino"},{k:"status",l:"Status"}].map(g=>(
                  <button key={g.k} onClick={()=>setDashGroupBy(g.k)} style={{padding:"3px 8px",fontSize:8,fontWeight:700,border:`1.5px solid ${dashGroupBy===g.k?t.ouro:t.borda}`,borderRadius:5,cursor:"pointer",background:dashGroupBy===g.k?`rgba(240,185,11,.07)`:t.card2,color:dashGroupBy===g.k?t.ouro:t.txt2,fontFamily:"inherit"}}>{g.l}</button>
                ))}
                {/* Toggle tipo de gráfico */}
                {[{k:"bar",ico:"📊"},{k:"pie",ico:"🥧"}].map(tp=>(
                  <button key={tp.k} onClick={()=>setDashChartType(tp.k)} style={{padding:"3px 8px",fontSize:11,fontWeight:700,border:`1.5px solid ${dashChartType===tp.k?t.azul:t.borda}`,borderRadius:5,cursor:"pointer",background:dashChartType===tp.k?`rgba(22,119,255,.09)`:t.card2,color:dashChartType===tp.k?t.azulLt:t.txt2,fontFamily:"inherit"}}>{tp.ico}</button>
                ))}
              </div>
              <div style={{height:dashChartType==="pie"?300:220}}>
                {dashChartType==="bar" ? <canvas ref={chartCarregRef} /> : <canvas ref={chartPieRef} />}
              </div>
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
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
              <ExportMenu
                dados={DADOS}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"cpf",l:"CPF"},{k:"placa",l:"Placa"},{k:"origem",l:"Origem"},{k:"destino",l:"Destino"},{k:"data_carr",l:"Carregamento"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"},{k:"status",l:"Status"},{k:"vl_cte",l:"VL CTE"},{k:"vl_contrato",l:"VL Contrato"},{k:"cte",l:"CTE"},{k:"mdf",l:"MDF"}]}
                filename="planilha-operacional"
                titulo="Planilha Operacional"
              />
            </div>
            <div style={{overflowX:"auto",borderRadius:11,border:`1px solid ${t.borda}`,maxHeight:"calc(100vh - 220px)",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600,tableLayout:"auto"}}>
                <thead>
                  <tr>{["DT","Motorista","Placa","Origem","Destino","Carregamento","Agenda","Descarga","Status"].map(h => (
                    <th key={h} style={{background:t.tableHeader,padding:"10px 10px",textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:1,color:t.txt2,borderBottom:`2px solid ${t.borda}`,whiteSpace:"nowrap",position:"sticky",top:0,zIndex:1}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {DADOS.slice(0,500).map((r,i) => (
                    <tr key={i} style={{cursor:"pointer"}} onClick={()=>{
                      const dt=r.dt; setBuscaInput(dt); setBuscaTipo("dt"); setActiveTab("busca");
                      setBuscaResult(null); setBuscaError(null); setBuscaRelacionados([]);
                      const c=dt.replace(/\D/g,"");
                      const found=DADOS.find(x=>x.dt?.replace(/\D/g,"")===c||dtBase(x.dt)?.replace(/\D/g,"")===c);
                      if(found){setBuscaResult(found);const cpfN=found.cpf?.replace(/\D/g,""),placaN=found.placa?.toUpperCase().replace(/\W/g,"");const rels=DADOS.filter(x=>x.dt!==found.dt&&((cpfN&&x.cpf?.replace(/\D/g,"")===cpfN)||(placaN&&x.placa?.toUpperCase().replace(/\W/g,"")===placaN))).sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;});setBuscaRelacionados(rels);const newH=[{dt:found.dt,nome:found.nome||"—"},...historico.filter(h=>h.dt!==found.dt)].slice(0,5);setHistorico(newH);saveJSON("hist",newH);}else{setBuscaError(dt);}
                    }}>
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
            <div style={{fontSize:10,color:t.txt2,marginTop:8,textAlign:"center"}}>{DADOS.length} registros total{DADOS.length>500?" (mostrando 500)":""}</div>
          </div>
        )}

        {/* ═══ DIÁRIAS ═══ */}
        {activeTab === "diarias" && (
          <div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <ExportMenu
                dados={diariasData.items.map(({r,tipo,dias})=>({...r,_tipo:tipo==="ok"?"No prazo":tipo==="atraso"?`Atraso ${dias||0}d`:"Aguardando"}))}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"placa",l:"Placa"},{k:"data_carr",l:"Carregamento"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"},{k:"_tipo",l:"Status"},{k:"diaria_prev",l:"Diária Prev."},{k:"diaria_pg",l:"Diária Paga"}]}
                filename="diarias"
                titulo="Relatório de Diárias"
              />
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12,justifyContent:"center",flexWrap:"wrap"}}>
              {[{k:"resumo",ico:"📊",l:"Resumo"},{k:"planilha",ico:"📋",l:"Planilha"}].map(s => (
                <button key={s.k} onClick={()=>setDSubTab(s.k)} style={{padding:"10px 20px",fontSize:12,fontWeight:700,border:`1.5px solid ${dSubTab===s.k?t.ouro:t.borda}`,borderRadius:8,cursor:"pointer",background:dSubTab===s.k?`rgba(240,185,11,.08)`:t.card2,color:dSubTab===s.k?t.ouro:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:16}}>{s.ico}</span> {s.l}
                </button>
              ))}
            </div>

            {/* KPI clicáveis — filtram a lista abaixo */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              <div style={{...css.kpi(t.verde),cursor:"pointer",outline:dFiltro==="ok"?`2px solid ${t.verde}`:"none"}} onClick={()=>{setDFiltro(dFiltro==="ok"?"todos":"ok");setDSubTab("resumo");}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:t.verde}}>{diariasData.ok}</div>
                <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:2}}>✅ No Prazo</div>
                <div style={{fontSize:8,color:t.verde,marginTop:2,opacity:.7}}>{dFiltro==="ok"?"● filtrado":"toque p/ filtrar"}</div>
              </div>
              <div style={{...css.kpi(t.danger),cursor:"pointer",outline:dFiltro==="atraso"?`2px solid ${t.danger}`:"none"}} onClick={()=>{setDFiltro(dFiltro==="atraso"?"todos":"atraso");setDSubTab("resumo");}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:t.danger}}>{diariasData.atraso}</div>
                <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:2}}>⚠️ Perdeu Agenda</div>
                <div style={{fontSize:8,color:t.danger,marginTop:2,opacity:.7}}>{dFiltro==="atraso"?"● filtrado":"toque p/ filtrar"}</div>
              </div>
              <div style={{...css.kpi(t.ouro),cursor:"pointer",outline:dFiltro==="pendente"?`2px solid ${t.ouro}`:"none"}} onClick={()=>{setDFiltro(dFiltro==="pendente"?"todos":"pendente");setDSubTab("resumo");}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:t.ouro}}>{diariasData.pend}</div>
                <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:2}}>⏳ Sem Descarga</div>
                <div style={{fontSize:8,color:t.ouro,marginTop:2,opacity:.7}}>{dFiltro==="pendente"?"● filtrado":"toque p/ filtrar"}</div>
              </div>
            </div>

            {dSubTab === "resumo" && (
              <div>
                {/* Filtro + toolbar de view */}
                <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                  {[{k:"todos",l:"Todos"},{k:"atraso",l:"⚠️ Perdeu agenda"},{k:"pendente",l:"⏳ Sem descarga"},{k:"ok",l:"✅ No prazo"}].map(f => (
                    <button key={f.k} onClick={()=>setDFiltro(f.k)} style={{padding:"5px 10px",fontSize:9,fontWeight:700,border:`1.5px solid ${dFiltro===f.k?t.ouro:t.borda}`,borderRadius:7,cursor:"pointer",background:dFiltro===f.k?`rgba(240,185,11,.07)`:t.card2,color:dFiltro===f.k?t.ouro:t.txt2,fontFamily:"inherit"}}>{f.l}</button>
                  ))}
                </div>
                {/* Toolbar view */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  {[{v:"linhas",ico:"☰",l:"Linhas"},{v:"blocos",ico:"⊞",l:"Blocos"}].map(m => (
                    <button key={m.v} onClick={()=>{setDiariaView(m.v);saveJSON("co_diaria_view",m.v);}} style={{padding:"5px 11px",fontSize:10,fontWeight:700,border:`1.5px solid ${diariaView===m.v?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:diariaView===m.v?`rgba(22,119,255,.09)`:t.card2,color:diariaView===m.v?t.azulLt:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                      {m.ico} {m.l}
                    </button>
                  ))}
                  {diariaView==="blocos" && (
                    <>
                      <span style={{fontSize:9,color:t.txt2,marginLeft:6}}>Colunas:</span>
                      {[1,2,3,4].map(n => (
                        <button key={n} onClick={()=>{setDiariaCols(n);saveJSON("co_diaria_cols",n);}} style={{width:28,height:28,fontSize:11,fontWeight:700,border:`1.5px solid ${diariaCols===n?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:diariaCols===n?`rgba(22,119,255,.09)`:t.card2,color:diariaCols===n?t.azulLt:t.txt2,fontFamily:"inherit"}}>{n}</button>
                      ))}
                    </>
                  )}
                </div>

                {/* Lista de itens */}
                {diariaView==="linhas" ? (
                  // ── MODO LINHAS (original) ──
                  diariasData.items.filter(i => dFiltro==="todos" || i.tipo===dFiltro).slice(0,80).map((item,idx) => {
                    const {r,tipo,dias} = item;
                    const borderC = tipo==="ok"?t.verde:tipo==="atraso"?t.danger:t.ouro;
                    const saldoPg = parseFloat(r.diaria_pg), saldoPrev = parseFloat(r.diaria_prev);
                    const pgStatus = !isNaN(saldoPg)&&saldoPg>0 ? "pago" : !isNaN(saldoPrev)&&saldoPrev>0 ? "pendente" : null;
                    return (
                      <div key={idx} onClick={()=>abrirDetalhe(r)} style={{background:t.card,borderRadius:11,padding:13,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${borderC}`,marginBottom:8,animation:"slideUp .3s",cursor:"pointer"}}>
                        <div style={{fontSize:14,fontWeight:700,color:t.txt,marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          {r.nome||"—"}
                          <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:tipo==="ok"?`rgba(2,192,118,.08)`:tipo==="atraso"?`rgba(246,70,93,.06)`:`rgba(240,185,11,.06)`,color:borderC,border:`1px solid ${borderC}33`}}>
                            {tipo==="ok"?"✅ No prazo":tipo==="atraso"?`⚠️ ${dias>0?dias+"d":""}`:  "⏳ Aguardando"}
                          </span>
                          {pgStatus && <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>{pgStatus==="pago"?"💳 Pago":"💸 Não Pago"}</span>}
                          {r.ro && <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:`rgba(255,152,0,.08)`,color:"#f57c00",border:`1px solid rgba(255,152,0,.25)`}}>RO {r.ro}</span>}
                          <span style={{marginLeft:"auto",fontSize:11,color:t.txt2}}>ver detalhes ›</span>
                        </div>
                        <div style={{fontSize:12,color:t.txt2,lineHeight:1.7}}>
                          🔢 <strong style={{color:t.txt}}>{r.dt}</strong> · 🚛 {r.placa||"—"}<br/>
                          📅 Agenda: <strong style={{color:t.ouro}}>{r.data_agenda||"—"}</strong> · 🏁 Descarga: <strong style={{color:r.data_desc?t.verde:t.txt2}}>{r.data_desc||"Não informada"}</strong>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // ── MODO BLOCOS (Opção C com avatar) ──
                  <div style={{display:"grid",gridTemplateColumns:`repeat(${diariaCols},minmax(0,1fr))`,gap:10}}>
                    {diariasData.items.filter(i => dFiltro==="todos" || i.tipo===dFiltro || (dFiltro==="pendente"&&i.tipo==="pendente")).slice(0,80).map((item,idx) => {
                      const {r,tipo,dias} = item;
                      const borderC = tipo==="ok"?t.verde:tipo==="atraso"?t.danger:t.ouro;
                      const avatarBg = tipo==="ok"?`rgba(2,192,118,.12)`:tipo==="atraso"?`rgba(246,70,93,.1)`:`rgba(240,185,11,.1)`;
                      const initials = (r.nome||"?").split(" ").filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join("");
                      const saldoPg = parseFloat(r.diaria_pg), saldoPrev = parseFloat(r.diaria_prev);
                      const pgStatus = !isNaN(saldoPg)&&saldoPg>0 ? "pago" : !isNaN(saldoPrev)&&saldoPrev>0 ? "pendente" : null;
                      const chips = [
                        {l:"DT",v:r.dt,c:t.ouro},
                        {l:"Placa",v:r.placa||"—",c:t.verde},
                        {l:"Agenda",v:r.data_agenda||"—",c:t.txt2},
                        {l:"Descarga",v:r.data_desc||"Pendente",c:r.data_desc?t.verde:t.txt2},
                        {l:"Origem",v:r.origem||"—",c:t.txt2},
                        {l:"Destino",v:r.destino||"—",c:t.txt2},
                        ...(r.ro?[{l:"RO",v:r.ro,c:"#f57c00"}]:[]),
                      ];
                      return (
                        <div key={idx} onClick={()=>abrirDetalhe(r)} style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,padding:12,display:"flex",flexDirection:"column",gap:8,animation:"slideUp .3s",cursor:"pointer"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                            <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg,border:`1.5px solid ${borderC}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:borderC,flexShrink:0}}>{initials}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:700,color:t.txt,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{r.nome||"—"}</div>
                              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>
                                <span style={{display:"inline-block",padding:"3px 8px",borderRadius:4,fontSize:9,fontWeight:700,background:tipo==="ok"?`rgba(2,192,118,.08)`:tipo==="atraso"?`rgba(246,70,93,.06)`:`rgba(240,185,11,.06)`,color:borderC,border:`1px solid ${borderC}33`}}>
                                  {tipo==="ok"?"✅ No prazo":tipo==="atraso"?`⚠️ ${dias>0?dias+"d":"atrasado"}`:"⏳ Aguardando"}
                                </span>
                                {pgStatus && <span style={{display:"inline-block",padding:"3px 8px",borderRadius:4,fontSize:9,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>
                                  {pgStatus==="pago"?"💳 Pago":"💸 Não Pago"}
                                </span>}
                              </div>
                            </div>
                            <span style={{fontSize:12,color:t.txt2,flexShrink:0}}>›</span>
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                            {chips.map((ch,ci) => (
                              <div key={ci} style={{background:t.card2,borderRadius:6,padding:"4px 9px",fontSize:11}}>
                                <span style={{color:t.txt2,fontSize:9}}>{ch.l} </span>
                                <span style={{color:ch.c,fontWeight:600}}>{ch.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <ExportMenu
                dados={dscTab==="hoje"?descargaData.hoje:descargaData.atrasados}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"placa",l:"Placa"},{k:"destino",l:"Destino"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"}]}
                filename={`descarga-${dscData}`}
                titulo={`Descarga ${dscTab==="hoje"?"do Dia":"- Atrasos"} · ${dscData}`}
              />
            </div>
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

            {/* Toolbar view Descarga */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {[{v:"linhas",ico:"☰",l:"Linhas"},{v:"blocos",ico:"⊞",l:"Blocos"}].map(m => (
                <button key={m.v} onClick={()=>{setDescargaView(m.v);saveJSON("co_descarga_view",m.v);}} style={{padding:"5px 11px",fontSize:10,fontWeight:700,border:`1.5px solid ${descargaView===m.v?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:descargaView===m.v?`rgba(22,119,255,.09)`:t.card2,color:descargaView===m.v?t.azulLt:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                  {m.ico} {m.l}
                </button>
              ))}
              {descargaView==="blocos" && (
                <>
                  <span style={{fontSize:9,color:t.txt2,marginLeft:6}}>Colunas:</span>
                  {[1,2,3,4].map(n => (
                    <button key={n} onClick={()=>{setDescargaCols(n);saveJSON("co_descarga_cols",n);}} style={{width:28,height:28,fontSize:11,fontWeight:700,border:`1.5px solid ${descargaCols===n?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:descargaCols===n?`rgba(22,119,255,.09)`:t.card2,color:descargaCols===n?t.azulLt:t.txt2,fontFamily:"inherit"}}>{n}</button>
                  ))}
                </>
              )}
            </div>

            {descargaView==="linhas" ? (
              // ── MODO LINHAS (original) ──
              <>
                {(dscTab==="hoje"?descargaData.hoje:descargaData.atrasados).slice(0,50).map((r,i) => {
                  const da = parseData(r.data_agenda);
                  const dias = da ? diffDias(da, new Date(dscData+"T00:00:00")) : null;
                  const isAtrasado = dscTab === "atrasado";
                  return (
                    <div key={i} onClick={()=>abrirDetalhe(r)} style={{background:t.card,borderRadius:11,padding:12,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${isAtrasado?t.danger:t.azul}`,marginBottom:8,animation:"slideUp .3s",cursor:"pointer"}}>
                      <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        {isAtrasado && dias !== null && <span style={{background:`rgba(246,70,93,.07)`,color:t.danger,border:`1px solid rgba(246,70,93,.18)`,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>🚨 {dias}d</span>}
                        {r.nome||"—"}
                        {r.ro && <span style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:700,background:`rgba(255,152,0,.08)`,color:"#f57c00",border:`1px solid rgba(255,152,0,.25)`}}>RO {r.ro}</span>}
                        <span style={{marginLeft:"auto",fontSize:10,color:t.txt2}}>ver detalhes ›</span>
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
              </>
            ) : (
              // ── MODO BLOCOS (Opção C com avatar) ──
              <div style={{display:"grid",gridTemplateColumns:`repeat(${descargaCols},minmax(0,1fr))`,gap:10}}>
                {(dscTab==="hoje"?descargaData.hoje:descargaData.atrasados).slice(0,80).map((r,i) => {
                  const da = parseData(r.data_agenda);
                  const dias = da ? diffDias(da, new Date(dscData+"T00:00:00")) : null;
                  const isAtrasado = dscTab === "atrasado";
                  const accentC = isAtrasado ? t.danger : t.azul;
                  const avatarBg = isAtrasado ? `rgba(246,70,93,.1)` : `rgba(22,119,255,.1)`;
                  const initials = (r.nome||"?").split(" ").filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join("");
                  const saldoPg = parseFloat(r.saldo), vl = parseFloat(r.vl_contrato);
                  const pgStatus = !isNaN(saldoPg)&&saldoPg===0&&!isNaN(vl)&&vl>0 ? "pago" : !isNaN(saldoPg)&&saldoPg>0 ? "pendente" : null;
                  const chips = [
                    {l:"DT",v:r.dt,c:t.ouro},
                    {l:"Placa",v:r.placa||"—",c:t.verde},
                    {l:"Destino",v:r.destino||"—",c:t.txt2},
                    {l:"Agenda",v:r.data_agenda||"—",c:isAtrasado?t.danger:t.ouro},
                    {l:"Descarga",v:r.data_desc||"Pendente",c:r.data_desc?t.verde:t.txt2},
                    ...(r.origem?[{l:"Origem",v:r.origem,c:t.txt2}]:[]),
                    ...(r.ro?[{l:"RO",v:r.ro,c:"#f57c00"}]:[]),
                  ];
                  return (
                    <div key={i} onClick={()=>abrirDetalhe(r)} style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,padding:12,display:"flex",flexDirection:"column",gap:8,animation:"slideUp .3s",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg,border:`1.5px solid ${accentC}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:accentC,flexShrink:0}}>{initials}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:t.txt,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{r.nome||"—"}</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>
                            {isAtrasado && dias !== null && (
                              <span style={{display:"inline-block",padding:"3px 8px",borderRadius:4,fontSize:9,fontWeight:700,background:`rgba(246,70,93,.07)`,color:t.danger,border:`1px solid rgba(246,70,93,.18)`}}>🚨 {dias}d atraso</span>
                            )}
                            {pgStatus && <span style={{display:"inline-block",padding:"3px 8px",borderRadius:4,fontSize:9,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>
                              {pgStatus==="pago"?"💳 Pago":"💸 Pendente"}
                            </span>}
                          </div>
                        </div>
                        <span style={{fontSize:12,color:t.txt2,flexShrink:0}}>›</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {chips.map((ch,ci) => (
                          <div key={ci} style={{background:t.card2,borderRadius:6,padding:"4px 9px",fontSize:11}}>
                            <span style={{color:t.txt2,fontSize:9}}>{ch.l} </span>
                            <span style={{color:ch.c,fontWeight:600}}>{ch.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {(dscTab==="hoje"?descargaData.hoje:descargaData.atrasados).length === 0 && (
              <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>{dscTab==="hoje"?"📅":"✅"}</div><h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt2}}>{dscTab==="hoje"?"NENHUMA DESCARGA HOJE":"SEM ATRASOS"}</h3></div>
            )}
          </div>
        )}

        {/* ═══ MOTORISTAS ═══ */}
        {activeTab === "motoristas" && (()=>{
          // filtro de busca por nome ou placa (Item 3)
          const motFiltrados = motoristas.filter(m => {
            if (!motBusca.trim()) return true;
            const q = motBusca.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
            const nome = (m.nome||"").toUpperCase();
            const placas = [m.placa1,m.placa2,m.placa3,m.placa4].map(p=>(p||"").toUpperCase().replace(/[^A-Z0-9]/g,""));
            return nome.includes(motBusca.trim().toUpperCase()) || placas.some(p=>p.includes(q));
          });

          // exportar vCard
          const exportarVCard = () => {
            const vCards = motoristas.map(m => {
              const tel = (m.tel||"").replace(/\D/g,"");
              const nomeN = (m.nome||"").split(" "); const sobrenome = nomeN.pop()||""; const primeiro = nomeN.join(" ");
              return [
                "BEGIN:VCARD","VERSION:3.0",
                `FN:${m.nome||""}`,`N:${sobrenome};${primeiro};;;`,
                tel?`TEL;TYPE=CELL:+55${tel}`:"",
                m.cpf?`X-CPF:${m.cpf}`:"",
                m.placa1?`NOTE:Placa: ${[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).join(" | ")} | Vínculo: ${m.vinculo||"—"}`:"",
                "END:VCARD"
              ].filter(Boolean).join("\r\n");
            }).join("\r\n");
            const blob = new Blob([vCards], {type:"text/vcard;charset=utf-8"});
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "motoristas_yfgroup.vcf"; a.click();
            showToast(`📤 ${motoristas.length} contatos exportados!`,"ok");
          };

          return (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <input
                  value={motBusca}
                  onChange={e=>setMotBusca(e.target.value)}
                  placeholder="Buscar por nome ou placa cavalo..."
                  style={{...css.inp,flex:1,minWidth:140}}
                />
                <button onClick={exportarVCard} title="Exportar todos como vCard (.vcf) para importar no Google Contacts" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11}}>📤 vCard</button>
                {canEdit && <button onClick={()=>{setFormData({});setEditIdx(-1);setModalOpen("motorista")}} style={{...css.btnGold,whiteSpace:"nowrap"}}>＋ NOVO</button>}
              </div>
              {motBusca && <div style={{fontSize:10,color:t.txt2,marginBottom:8}}>{motFiltrados.length} resultado{motFiltrados.length!==1?"s":""} encontrado{motFiltrados.length!==1?"s":""}</div>}
              {motoristas.length === 0 ? (
                <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>🚛</div><h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt2}}>SEM MOTORISTAS</h3><p style={{fontSize:11,color:t.txt2}}>Clique em + NOVO para cadastrar.</p></div>
              ) : motFiltrados.length === 0 ? (
                <div style={css.empty}><div style={{fontSize:30,marginBottom:8}}>🔍</div><p style={{fontSize:12,color:t.txt2}}>Nenhum motorista encontrado para "{motBusca}"</p></div>
              ) : motFiltrados.map((m,i) => {
                const idxReal = motoristas.indexOf(m);
                const vincBadgeC = m.vinculo==="Frota"?t.azulLt:m.vinculo==="Agregado"?t.ouro:m.vinculo==="Terceiro"?t.verde:t.txt2;
                const vincBadgeBg = m.vinculo==="Frota"?`rgba(22,119,255,.08)`:m.vinculo==="Agregado"?`rgba(240,185,11,.08)`:m.vinculo==="Terceiro"?`rgba(2,192,118,.08)`:`rgba(128,128,128,.06)`;
                return (
                  <div key={i} style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,padding:12,marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:38,height:38,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#000",flexShrink:0}}>{(m.nome||"M")[0].toUpperCase()}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:t.txt}}>{m.nome||"—"}</div>
                        <div style={{fontSize:10,color:t.txt2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          {m.cpf && <span>{m.cpf}</span>}
                          {m.vinculo && <span style={{background:vincBadgeBg,border:`1px solid ${vincBadgeC}33`,borderRadius:4,padding:"1px 6px",color:vincBadgeC,fontWeight:700,fontSize:9,textTransform:"uppercase"}}>{m.vinculo}</span>}
                        </div>
                      </div>
                      {canEdit && <>
                        <button onClick={()=>{setFormData({...m});setEditIdx(idxReal);setModalOpen("motorista")}} style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                        <button onClick={()=>{if(window.confirm(`Excluir "${m.nome}"?`)){const nm=[...motoristas];nm.splice(idxReal,1);saveMotoristasLS(nm);showToast("🗑️ Removido");}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                      </>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:m.tel||m.banco?6:0}}>
                      {[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).map((p,j) => (
                        <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:4,padding:"2px 7px"}}>{p}</span>
                      ))}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:10,fontSize:10,color:t.txt2}}>
                      {m.tel && <span>📞 {m.tel}</span>}
                      {m.banco && <span>🏦 {m.banco}{m.agencia?` · Ag ${m.agencia}`:""}{m.conta?` · CC ${m.conta}`:""}</span>}
                      {m.pix_tipo && <span style={{color:t.azulLt}}>PIX {m.pix_tipo}: {m.pix_chave||"—"}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ═══ ADMIN ═══ */}
        {activeTab === "admin" && isAdmin && (
          <div>
            <div style={css.secTitle}>🗄️ Banco de Dados <span style={{flex:1,height:1,background:t.borda}} /></div>            <div style={{...css.card,marginBottom:16}}>
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
                  <div style={{width:34,height:34,borderRadius:9,background:u.perfil==="admin"?`linear-gradient(135deg,${t.ouroDk},${t.ouro})`:u.perfil==="gerente"?`linear-gradient(135deg,${t.azul},${t.azulLt})`:u.perfil==="operador"?`linear-gradient(135deg,#555,#848e9c)`:`linear-gradient(135deg,#444,#666)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#000",flexShrink:0}}>{u.nome?.[0]?.toUpperCase()||"U"}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:t.txt}}>{u.nome}</div><div style={{fontSize:10,color:t.txt2}}>📧 {u.email} · <span style={{color:t.ouro}}>{u.perfil}</span></div></div>
                  <button onClick={()=>{setFormData({...u});setEditIdx(i);setModalOpen("usuario")}} style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                  <button onClick={()=>{if(confirm(`Excluir "${u.nome}"?`)){const nu=[...usuarios];nu.splice(i,1);setUsuarios(nu);saveJSON("co_usuarios_local",nu);
                    // Remove do Supabase também
                    const conn=getConexao();
                    if(conn){supaFetch(conn.url,conn.key,"DELETE",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(u.email)}`).catch(()=>{});}
                    showToast("🗑️ Removido");}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
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

            {/* Google Sheets */}
            <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={()=>setGsheetsOpen(!gsheetsOpen)}>
              🟢 Sincronização Google Sheets <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{gsheetsOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {gsheetsOpen && (
              <div style={{...css.card,padding:14,marginBottom:16,background:t.card2}}>
                <p style={{fontSize:11,color:t.txt2,lineHeight:1.7,marginBottom:10}}>
                  Sincronize sua planilha Google Sheets com o Supabase automaticamente usando Apps Script.<br/>
                  Cole o script abaixo em <strong style={{color:t.txt}}>Extensões → Apps Script</strong> na sua planilha.
                </p>
                <div style={{background:t.bg,borderRadius:8,padding:10,marginBottom:10,border:`1px solid ${t.borda}`,overflowX:"auto"}}>
                  <pre style={{fontSize:9,color:t.verde,margin:0,whiteSpace:"pre-wrap",lineHeight:1.6}}>{`function sincronizarComSupabase() {
  var SUPA_URL = 'SUA_URL_SUPABASE';
  var SUPA_KEY = 'SUA_ANON_KEY';
  var TABELA   = 'controle_operacional';

  var sheet  = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dados  = sheet.getDataRange().getValues();
  var header = dados[0];
  var mapa   = {};
  header.forEach(function(col,i){
    var c = mapearColuna(col.toString().toLowerCase().trim());
    if(c) mapa[i]=c;
  });

  var registros = [];
  for(var r=1;r<dados.length;r++){
    var reg={};var temDT=false;
    Object.keys(mapa).forEach(function(i){
      var v=dados[r][i];
      if(v instanceof Date) v=Utilities.formatDate(v,'America/Sao_Paulo','dd/MM/yyyy');
      reg[mapa[i]]=v?v.toString().trim():'';
      if(mapa[i]==='dt'&&reg.dt) temDT=true;
    });
    if(temDT) registros.push(reg);
  }
  // Envia em lotes de 50
  for(var i=0;i<registros.length;i+=50){
    UrlFetchApp.fetch(SUPA_URL+'/rest/v1/'+TABELA+'?on_conflict=dt',{
      method:'POST',
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,
        'Content-Type':'application/json',
        Prefer:'return=minimal,resolution=merge-duplicates'},
      payload:JSON.stringify(registros.slice(i,i+50)),
      muteHttpExceptions:true
    });
  }
  Logger.log('Sincronizados '+registros.length+' registros');
}

function mapearColuna(n){
  var m={'dt espelho':'dt','espelho':'dt','dt':'dt','nome':'nome',
    'cpf':'cpf','placa':'placa','vinculo':'vinculo','status':'status',
    'origem':'origem','destino':'destino',
    'data carr.':'data_carr','data_carr':'data_carr',
    'data agenda':'data_agenda','data_agenda':'data_agenda',
    'data desc.':'data_desc','data_desc':'data_desc',
    'vl cte':'vl_cte','valor cte':'vl_cte','vl_cte':'vl_cte',
    'vl contrato':'vl_contrato','vl_contrato':'vl_contrato',
    'adiant':'adiant','adiantamento':'adiant',
    'cte':'cte','mdf':'mdf','nf':'nf','cliente':'cliente'};
  return m[n]||null;
}`}</pre>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:t.bg,borderRadius:8,padding:10,border:`1px solid ${t.borda}`}}>
                    <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:4}}>⏱️ Disparo automático</div>
                    <div style={{fontSize:10,color:t.txt2,lineHeight:1.6}}>No Apps Script, clique no ícone de relógio → Adicionar acionador → sincronizarComSupabase → A cada hora</div>
                  </div>
                  <div style={{background:t.bg,borderRadius:8,padding:10,border:`1px solid ${t.borda}`}}>
                    <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:4}}>🔑 Credenciais</div>
                    <div style={{fontSize:10,color:t.txt2,lineHeight:1.6}}>Substitua <strong style={{color:t.ouro}}>SUA_URL_SUPABASE</strong> e <strong style={{color:t.ouro}}>SUA_ANON_KEY</strong> pelos valores do seu projeto Supabase.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Alterar senha do Admin */}
            <AlterarSenhaAdmin t={t} css={css} showToast={showToast} onSalvar={async hash=>{await setConfigRemoto("admin_senha_hash",hash);await registrarLog("ALTERAR_SENHA_ADMIN","Senha do Admin alterada");}} />

            {/* EMAIL BOAS-VINDAS */}
            <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={()=>setEmailTemplateOpen(!emailTemplateOpen)}>
              {"📧 Email de Boas-vindas"}<span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{emailTemplateOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {emailTemplateOpen && (
              <div style={{...css.card,padding:14,marginBottom:16,background:t.card2}}>
                <p style={{fontSize:11,color:t.txt2,lineHeight:1.6,marginBottom:10}}>
                  Configure o email enviado ao criar novo usuario. Use <strong style={{color:t.ouro}}>&#123;nome&#125;</strong>, <strong style={{color:t.ouro}}>&#123;email&#125;</strong>, <strong style={{color:t.ouro}}>&#123;senha&#125;</strong>, <strong style={{color:t.ouro}}>&#123;perfil&#125;</strong>.
                </p>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Assunto</label>
                  <input value={emailTemplate.assunto} onChange={e=>setEmailTemplate(p=>({...p,assunto:e.target.value}))} style={{...css.inp,fontSize:12}} />
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Corpo do Email</label>
                  <textarea value={emailTemplate.corpo} onChange={e=>setEmailTemplate(p=>({...p,corpo:e.target.value}))} rows={9} style={{...css.inp,resize:"vertical",fontSize:11,lineHeight:1.6,fontFamily:"monospace"}} />
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>{saveJSON("co_email_template",emailTemplate);showToast("✅ Template salvo!","ok");registrarLog("EDITAR_EMAIL_TEMPLATE","Template de email atualizado");}} style={{...css.btnGreen,flex:1,justifyContent:"center",fontSize:12}}>💾 Salvar Template</button>
                  <button onClick={()=>enviarEmailBoasVindas({nome:"Teste",email:ADMIN_EMAIL,perfil:"operador"},"senha123",false)} style={{...css.btnGold,flex:1,justifyContent:"center",fontSize:12}}>📧 Testar (Gmail)</button>
                  <button onClick={()=>enviarEmailBoasVindas({nome:"Teste",email:ADMIN_EMAIL,perfil:"operador"},"senha123",true)} style={{...css.hBtn,flex:1,justifyContent:"center",fontSize:12}}>✉️ Outro Cliente</button>
                </div>
                <div style={{marginTop:8,padding:"8px 10px",background:t.bg,borderRadius:8,border:"1px solid "+t.borda,fontSize:10,color:t.txt2,lineHeight:1.6}}>
                  O email abre no seu cliente de email ja preenchido. Para usuarios novos, clique no botao Email no cadastro.
                </div>
              </div>
            )}

            {/* NORMALIZAR CONTATOS (Item 3) */}
            <div style={{...css.secTitle,marginTop:24}}>
              📇 Contatos / Motoristas <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            <div style={{...css.card,padding:14,marginBottom:16,background:t.card2}}>
              <p style={{fontSize:11,color:t.txt2,lineHeight:1.6,marginBottom:10}}>
                Normaliza os dados de todos os motoristas cadastrados: capitalização dos nomes, formato de telefone <strong style={{color:t.txt}}>(XX) XXXXX-XXXX</strong> e placas em maiúsculas sem caracteres extras.
              </p>
              {/* ── Exportar ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700,marginBottom:6}}>📤 Exportar</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                <button onClick={()=>{
                  if(motoristas.length>=5){const ok=window.prompt(`Você está exportando ${motoristas.length} contatos. Digite ESTOU DE ACORDO para confirmar:`);if(!ok||ok.trim()!=="ESTOU DE ACORDO"){showToast("❌ Exportação cancelada","err");return;}}
                  const vcards=motoristas.map(m=>{const tel=(m.tel||"").replace(/\D/g,"");const nomeN=(m.nome||"").split(" ");const sob=nomeN.pop()||"";const prim=nomeN.join(" ");
                    return["BEGIN:VCARD","VERSION:3.0",`FN:${m.nome||""}`,`N:${sob};${prim};;;`,tel?`TEL;TYPE=CELL:+55${tel}`:"",m.cpf?`X-CPF:${m.cpf}`:"",`NOTE:Placa: ${[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).join(" | ")} | Vínculo: ${m.vinculo||"—"}`,"END:VCARD"].filter(Boolean).join("\r\n");
                  }).join("\r\n");
                  const blob=new Blob([vcards],{type:"text/vcard;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="motoristas_yfgroup.vcf";a.click();
                  showToast(`📤 ${motoristas.length} contatos exportados como vCard!`,"ok");
                }} style={{...css.hBtn,fontSize:12}}>📤 vCard (.vcf)</button>
                <button onClick={()=>{
                  if(motoristas.length>=5){const ok=window.prompt(`Você está exportando ${motoristas.length} contatos. Digite ESTOU DE ACORDO para confirmar:`);if(!ok||ok.trim()!=="ESTOU DE ACORDO"){showToast("❌ Exportação cancelada","err");return;}}
                  const header="Name,Given Name,Family Name,Phone 1 - Type,Phone 1 - Value,Notes";
                  const rows=motoristas.map(m=>{
                    const nomeN=(m.nome||"").split(" ");const sob=nomeN.pop()||"";const prim=nomeN.join(" ");
                    const tel=(m.tel||"").replace(/\D/g,"");
                    const nota=`CPF:${m.cpf||""} | Placa:${[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).join("/")} | Vínculo:${m.vinculo||""} | Banco:${m.banco||""} AGE:${m.agencia||""} CC:${m.conta||""}`;
                    return `"${m.nome||""}","${prim}","${sob}","Mobile","${tel?"+55"+tel:""}","${nota}"`;
                  });
                  const bom="\uFEFF";const blob=new Blob([bom+[header,...rows].join("\n")],{type:"text/csv;charset=utf-8"});
                  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="motoristas_google.csv";a.click();
                  showToast(`📤 ${motoristas.length} contatos exportados como CSV Google!`,"ok");
                }} style={{...css.hBtn,fontSize:12}}>📊 CSV Google</button>
                <button onClick={()=>{
                  const normalizados=motoristas.map(m=>({...m,nome:normalizarNome(m.nome),tel:normalizarTelefone(m.tel),placa1:normalizarPlaca(m.placa1),placa2:normalizarPlaca(m.placa2),placa3:normalizarPlaca(m.placa3),placa4:normalizarPlaca(m.placa4),favorecido:normalizarNome(m.favorecido)}));
                  saveMotoristasLS(normalizados);registrarLog("NORMALIZAR_CONTATOS",`${normalizados.length} motoristas normalizados`);showToast(`✅ ${normalizados.length} contatos normalizados!`,"ok");
                }} style={{...css.btnGold,fontSize:12}}>🔧 Normalizar</button>
              </div>

              {/* ── Importar ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700,marginBottom:6,marginTop:8}}>📥 Importar</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <label style={{...css.hBtn,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                  📥 CSV Google / vCard
                  <input type="file" accept=".csv,.vcf,.vcard" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files?.[0]; if(!f){return;}
                    const reader=new FileReader();
                    reader.onload=ev=>{
                      const txt=ev.target.result;
                      const parseVCard=(raw)=>{
                        const contatos=[];const blocos=raw.split(/END:VCARD/i);
                        blocos.forEach(bloco=>{
                          if(!bloco.toUpperCase().includes("BEGIN:VCARD"))return;
                          const fn=(bloco.match(/^FN:(.+)$/mi)||[])[1]?.trim()||"";
                          const n=(bloco.match(/^N:(.+)$/mi)||[])[1]?.trim()||"";
                          const nParts=n.split(";");const sobV=nParts[0]||"";const primV=nParts[1]||"";
                          const nomeV=fn||(primV+" "+sobV).trim();
                          const telM=bloco.match(/^TEL[^:]*:(.+)$/mi);
                          const telV=(telM?.[1]||"").replace(/\D/g,"").replace(/^55/,"");
                          const cpfM=bloco.match(/X-CPF:(.+)/i);const cpfV=(cpfM?.[1]||"").trim();
                          const noteM=bloco.match(/^NOTE:(.+)$/mi);const noteV=(noteM?.[1]||"");
                          const placaM=noteV.match(/Placa:\s*([\w/| ]+)/i);
                          const placas=(placaM?.[1]||"").split(/[|\/]/).map(p=>p.trim()).filter(Boolean);
                          if(nomeV)contatos.push({nome:nomeV,tel:telV,cpf:cpfV,placa1:placas[0]||"",placa2:placas[1]||"",placa3:placas[2]||"",placa4:placas[3]||""});
                        });
                        return contatos;
                      };
                      const parseCSV=(raw)=>{
                        const lines=raw.trim().split("\n");if(lines.length<2)return[];
                        const headers=lines[0].split(",").map(h=>h.replace(/"/g,"").trim().toLowerCase());
                        const nameIdx=headers.findIndex(h=>h==="name"||h==="full name"||h==="nome");
                        const phoneIdx=headers.findIndex(h=>h.includes("phone")||h.includes("fone")||h.includes("tel"));
                        const noteIdx=headers.findIndex(h=>h.includes("note")||h.includes("obs"));
                        return lines.slice(1).map(line=>{
                          const cols=line.split(",").map(c=>c.replace(/^"|"$/g,"").trim());
                          const nome=nameIdx>=0?cols[nameIdx]||"":"";
                          const tel=(phoneIdx>=0?cols[phoneIdx]||"":"").replace(/\D/g,"").replace(/^55/,"");
                          const nota=noteIdx>=0?cols[noteIdx]||"":"";
                          const placaM=nota.match(/Placa[:\s]*([\w/| ]+)/i);
                          const placas=(placaM?.[1]||"").split(/[|\/]/).map(p=>p.trim()).filter(Boolean);
                          const cpfM=nota.match(/CPF[:\s]*([0-9./-]+)/i);
                          return nome?{nome,tel,cpf:(cpfM?.[1]||"").trim(),placa1:placas[0]||"",placa2:placas[1]||"",placa3:placas[2]||"",placa4:placas[3]||""}:null;
                        }).filter(Boolean);
                      };
                      const isVCard=txt.toUpperCase().includes("BEGIN:VCARD");
                      const importados=isVCard?parseVCard(txt):parseCSV(txt);
                      if(!importados.length){showToast("⚠️ Nenhum contato encontrado no arquivo","warn");return;}
                      // Comparar com existentes
                      const novos=[], conflitos=[];
                      importados.forEach(imp=>{
                        const nomeN=imp.nome.toUpperCase();
                        const cpfN=(imp.cpf||"").replace(/\D/g,"");
                        const placa1N=(imp.placa1||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
                        const existente=motoristas.find(m=>{
                          if(cpfN&&m.cpf&&m.cpf.replace(/\D/g,"")===cpfN)return true;
                          if(placa1N&&m.placa1&&m.placa1.toUpperCase().replace(/[^A-Z0-9]/g,"")===placa1N)return true;
                          return m.nome&&m.nome.toUpperCase()===nomeN;
                        });
                        if(existente){conflitos.push({atual:existente,imp,escolha:"manter"});}
                        else{novos.push(imp);}
                      });
                      setMotImportData({novos,conflitos});
                      setMotImportConfirm("");
                      setMotImportOpen(true);
                    };
                    reader.readAsText(f,"utf-8");
                    e.target.value="";
                  }} />
                </label>
              </div>
              <div style={{padding:"8px 10px",background:t.bg,borderRadius:8,border:`1px solid ${t.borda}`,fontSize:10,color:t.txt2,lineHeight:1.5}}>
                💡 Google Contacts: <strong style={{color:t.txt}}>contacts.google.com</strong> → Exportar → CSV Google. Para importar, exporte da aba Motoristas ou baixe o .csv/.vcf e importe aqui.
              </div>
            </div>

            {/* LOG DE ALTERACOES */}
            <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={async()=>{const next=!logsOpen;setLogsOpen(next);if(next)await carregarLogs();}}>
              {"📋 Log de Alterações"}<span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{logsOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {logsOpen && (
              <div style={{marginBottom:16}}>
                {/* Sub-abas */}
                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {[{k:"dev",l:"🧑‍💻 Desenvolvimento"},{k:"op",l:"⚙️ Operacional"}].map(st=>(
                    <button key={st.k} onClick={()=>setLogsSubTab(st.k)} style={{padding:"6px 12px",fontSize:10,fontWeight:700,border:`1.5px solid ${logsSubTab===st.k?t.ouro:t.borda}`,borderRadius:7,cursor:"pointer",background:logsSubTab===st.k?`rgba(240,185,11,.08)`:t.card2,color:logsSubTab===st.k?t.ouro:t.txt2,fontFamily:"inherit"}}>{st.l}</button>
                  ))}
                  {logsSubTab==="op" && <button onClick={carregarLogs} style={{...css.hBtn,fontSize:10,padding:"5px 10px",marginLeft:"auto"}}>↺ Atualizar</button>}
                </div>

                {/* ABA DESENVOLVIMENTO */}
                {logsSubTab==="dev" && (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {DEV_CHANGELOG.map((sessao,si)=>(
                      <div key={si} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${t.azulLt}`,overflow:"hidden"}}>
                        <div style={{padding:"8px 12px",background:t.card2,display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12}}>🧑‍💻</span>
                          <span style={{fontSize:11,fontWeight:700,color:t.txt}}>{sessao.sessao}</span>
                          <span style={{fontSize:9,color:t.txt2,marginLeft:"auto"}}>{sessao.data}</span>
                        </div>
                        <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:5}}>
                          {sessao.itens.map((item,ii)=>(
                            <div key={ii} style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                              <span style={{color:t.verde,fontSize:10,flexShrink:0,marginTop:1}}>✓</span>
                              <span style={{fontSize:10,color:t.txt2,lineHeight:1.55}}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ABA OPERACIONAL */}
                {logsSubTab==="op" && (
                  <>
                    <div style={{fontSize:10,color:t.txt2,marginBottom:8}}>{logsData.length} eventos operacionais · tabela: co_logs_alteracoes</div>
                    {logsData.length===0?(
                      <div style={{...css.empty,padding:"16px 0",fontSize:11,color:t.txt2}}>
                        <div style={{fontSize:28,marginBottom:8}}>📭</div>
                        Nenhum evento operacional registrado ainda.<br/>
                        <span style={{fontSize:9}}>Eventos são criados ao editar, criar ou excluir registros no app.</span>
                      </div>
                    ):(
                      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:360,overflowY:"auto"}}>
                        {logsData.map((log,li)=>(
                          <div key={li} style={{background:t.card,borderRadius:9,padding:"8px 12px",border:"1px solid "+t.borda,borderLeft:"3px solid "+(log.acao&&log.acao.includes("DELETAR")?t.danger:log.acao&&log.acao.includes("NOVO")?t.verde:t.ouro)}}>
                            <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:2}}>
                              <span style={{fontSize:10,fontWeight:700,color:t.txt}}>{log.acao}</span>
                              <span style={{fontSize:8,color:t.txt2,flexShrink:0}}>{new Date(log.data_hora).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span>
                            </div>
                            <div style={{fontSize:11,color:t.txt2}}>{log.descricao}</div>
                            <div style={{fontSize:9,color:t.txt2,marginTop:2}}>Autor: {log.usuario} ({log.perfil_usuario})</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
                {s:"📄 Documentação",fields:[{k:"cte",l:"CTE"},{k:"mdf",l:"MDF"},{k:"nf",l:"Nota Fiscal"},{k:"mat",l:"MAT"},{k:"ro",l:"RO (Reg. Ocorrência)"},{k:"cliente",l:"Cliente"},{k:"sgs",l:"Chamado SGS"}]},
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
            <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>

              {/* ── Identificação ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>👤 Identificação<span style={{flex:1,height:1,background:"rgba(22,119,255,.12)"}} /></div>
              {[{k:"nome",l:"Nome Completo",req:true},{k:"cpf",l:"CPF",req:true},{k:"tel",l:"Telefone"}].map(f=>(
                <div key={f.k}>
                  <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>{f.l}{f.req&&<span style={{color:t.danger}}> *</span>}</label>
                  <input value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} style={css.inp} />
                </div>
              ))}

              {/* ── Vínculo dropdown ── */}
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>Vínculo</label>
                <select value={formData.vinculo||""} onChange={e=>setFormData(p=>({...p,vinculo:e.target.value}))} style={{...css.inp,appearance:"none",cursor:"pointer"}}>
                  <option value="">— Selecione —</option>
                  <option value="Agregado">Agregado</option>
                  <option value="Terceiro">Terceiro</option>
                  <option value="Frota">Frota</option>
                </select>
              </div>

              {/* ── Placas ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,display:"flex",alignItems:"center",gap:6,marginTop:4}}>🚛 Placas<span style={{flex:1,height:1,background:"rgba(22,119,255,.12)"}} /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{k:"placa1",l:"Placa Cavalo",req:true},{k:"placa2",l:"Placa Carreta 1"},{k:"placa3",l:"Placa Carreta 2"},{k:"placa4",l:"Placa Carreta 3"}].map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>{f.l}{f.req&&<span style={{color:t.danger}}> *</span>}</label>
                    <input value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value.toUpperCase()}))} style={{...css.inp,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:3,fontSize:15}} placeholder="AAA0000" />
                  </div>
                ))}
              </div>

              {/* ── Dados Bancários ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.ouro,fontWeight:700,display:"flex",alignItems:"center",gap:6,marginTop:4}}>💳 Dados Bancários<span style={{flex:1,height:1,background:`rgba(240,185,11,.15)`}} /></div>
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>BCO · Nome do Banco</label>
                <input value={formData.banco||""} onChange={e=>setFormData(p=>({...p,banco:e.target.value}))} placeholder="Ex: Banco do Brasil, Bradesco, Nubank..." style={css.inp} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>AGE · Agência</label>
                  <input value={formData.agencia||""} onChange={e=>setFormData(p=>({...p,agencia:e.target.value}))} placeholder="0000-0" style={css.inp} />
                </div>
                <div>
                  <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>C/C · Conta Corrente</label>
                  <input value={formData.conta||""} onChange={e=>setFormData(p=>({...p,conta:e.target.value}))} placeholder="00000-0" style={css.inp} />
                </div>
              </div>
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>FAV · Favorecido</label>
                <input value={formData.favorecido||""} onChange={e=>setFormData(p=>({...p,favorecido:e.target.value}))} placeholder="Nome do titular" style={css.inp} />
              </div>
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>PIX · Tipo de Chave</label>
                <select value={formData.pix_tipo||""} onChange={e=>setFormData(p=>({...p,pix_tipo:e.target.value,pix_chave:""}))} style={{...css.inp,appearance:"none",cursor:"pointer",marginBottom:6}}>
                  <option value="">— Sem PIX —</option>
                  <option value="CPF">CPF</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Email">E-mail</option>
                  <option value="Aleatória">Chave Aleatória</option>
                </select>
                {formData.pix_tipo && (
                  <input
                    value={formData.pix_chave||""}
                    onChange={e=>setFormData(p=>({...p,pix_chave:e.target.value}))}
                    placeholder={
                      formData.pix_tipo==="CPF"?"000.000.000-00":
                      formData.pix_tipo==="Telefone"?"(00) 00000-0000":
                      formData.pix_tipo==="Email"?"email@exemplo.com":
                      "Chave aleatória (UUID)"
                    }
                    style={css.inp}
                  />
                )}
              </div>

              {/* ── Observações ── */}
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>Observações</label>
                <textarea value={formData.obs||""} onChange={e=>setFormData(p=>({...p,obs:e.target.value}))} rows={2} style={{...css.inp,resize:"vertical",fontSize:12}} />
              </div>
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button onClick={()=>{
                const m = {...formData};
                if (!m.nome) { showToast("⚠️ Nome obrigatório","warn"); return; }
                if (!m.cpf) { showToast("⚠️ CPF obrigatório","warn"); return; }
                if (!m.placa1) { showToast("⚠️ Placa Cavalo obrigatória","warn"); return; }
                const nm = [...motoristas];
                if (editIdx>=0) nm[editIdx] = m; else nm.push(m);
                saveMotoristasLS(nm);
                registrarLog(editIdx>=0?"EDITAR_MOTORISTA":"NOVO_MOTORISTA",`${m.nome} · CPF ${m.cpf} · Vínculo: ${m.vinculo||"—"}`);
                showToast(editIdx>=0?"✅ Atualizado!":"✅ Cadastrado!","ok");
                setModalOpen(null);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETALHE + OCORRÊNCIAS MODAL ═══ */}
      {modalOpen === "detalhe" && detalheDT && (()=>{
        const r = detalheDT;
        const canEditDetalhe = isAdmin || perms.editar;
        const canOcorr = isAdmin || perms.ocorrencias;
        // Timeline steps
        const steps = [
          {ico:"📦",lbl:"Carregamento",val:r.data_carr,  c:t.ouro,  done:!!r.data_carr},
          {ico:"📍",lbl:"Em Trânsito",  val:r.origem&&r.destino?`${r.origem}→${r.destino}`:r.origem||r.destino||null, c:t.azulLt,done:!!r.data_carr},
          {ico:"📅",lbl:"Agenda Desc.", val:r.data_agenda,c:t.warn,  done:!!r.data_agenda},
          {ico:"🏁",lbl:"Descarga",     val:r.data_desc,  c:t.verde, done:!!r.data_desc},
        ];
        const tipoColors = {info:t.azulLt, alerta:t.danger, status:t.verde};
        const tipoIcos   = {info:"💬", alerta:"🚨", status:"✅"};
        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
            <div style={{...css.modal,maxHeight:"96vh"}}>
              {/* Header */}
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:theme==="dark"?"linear-gradient(135deg,#161a1e,#1e2026)":`linear-gradient(135deg,#f8f9fa,#fff)`}}>
                <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🚛</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.txt,lineHeight:1}}>{r.nome||"—"}</div>
                  <div style={{fontSize:9,color:t.txt2,letterSpacing:1}}>DT {r.dt} · {r.placa||"—"} · {r.cpf||"—"}</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  {canEditDetalhe && (
                    <button onClick={()=>{
                      const idx=DADOS.findIndex(x=>x.dt===r.dt);
                      setEditIdx(idx);setFormData({...r});setEditStep(1);setModalOpen("edit");
                    }} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:8,padding:"9px 16px",color:t.ouro,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✏️ Editar</button>
                  )}
                  <button onClick={()=>setModalOpen(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              </div>

              <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:14}}>

                {/* ── Timeline ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:10}}>📊 Timeline <span style={{flex:1,height:1,background:t.borda}} /></div>
                  <div style={{display:"flex",alignItems:"flex-start",gap:0,position:"relative",padding:"0 8px"}}>
                    {steps.map((s,si) => (
                      <div key={si} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
                        {/* Linha conectora */}
                        {si < steps.length-1 && (
                          <div style={{position:"absolute",top:14,left:"50%",width:"100%",height:2,background:steps[si+1].done?s.c:`${t.borda}`,zIndex:0,transition:"background .3s"}} />
                        )}
                        {/* Círculo */}
                        <div style={{width:28,height:28,borderRadius:"50%",background:s.done?s.c:t.card2,border:`2px solid ${s.done?s.c:t.borda}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,zIndex:1,flexShrink:0,transition:"all .3s"}}>{s.done?<span style={{fontSize:11}}>✓</span>:<span style={{fontSize:12}}>{s.ico}</span>}</div>
                        <div style={{fontSize:8,color:s.done?s.c:t.txt2,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginTop:4,textAlign:"center",lineHeight:1.3}}>{s.lbl}</div>
                        {s.val && <div style={{fontSize:8,color:t.txt2,marginTop:2,textAlign:"center",maxWidth:60,wordBreak:"break-word"}}>{s.val}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ITEM 4 */}
                {(()=>{
                  const dcArr = acompDias;
                  const toISO = s => { if(!s)return null; const p=s.split("/"); return p.length===3?p[2]+"-"+p[1]+"-"+p[0]:s; };
                  const dIni = toISO(detalheDT.data_carr); const dFimS = toISO(detalheDT.data_desc);
                  const dFim = dFimS ? new Date(dFimS+"T12:00:00") : new Date();
                  const dias = []; if(dIni){let c=new Date(dIni+"T12:00:00");while(c<=dFim&&dias.length<60){dias.push(c.toISOString().slice(0,10));c.setDate(c.getDate()+1);}}
                  const getE = d => dcArr.find(x=>x.data===d)||null;
                  const salvarDia = (data,texto,imgs) => {
                    const e={data,texto,imagens:imgs||[],usuario:usuarioLogado||"sistema",at:new Date().toISOString()};
                    const nv=(texto.trim()||imgs.length)?[...dcArr.filter(x=>x.data!==data),e].sort((a,b)=>a.data.localeCompare(b.data)):dcArr.filter(x=>x.data!==data);
                    setAcompDias(nv); localStorage.setItem("co_acomp_"+detalheDT.dt,JSON.stringify(nv));
                    const conn2=getConexao(); if(conn2&&(texto.trim()||imgs.length)){supaFetch(conn2.url,conn2.key,"POST","co_acompanhamento_dt",[{dt:detalheDT.dt,data,texto,imagens:JSON.stringify(imgs||[]),usuario:e.usuario,atualizado_em:e.at}]).catch(()=>{});}
                  };
                  return (
                    <div>
                      <div style={{...css.secTitle,marginBottom:10}}>
                        📅 Acompanhamento Dia a Dia
                        {dias.length>0&&<span style={{fontSize:9,color:t.txt2,fontWeight:400,marginLeft:4}}>{dias.length} dias</span>}
                        <span style={{flex:1,height:1,background:t.borda}} />
                      </div>
                      {dias.length===0?(
                        <div style={{fontSize:11,color:t.txt2,textAlign:"center",padding:"8px 0"}}>Informe data de carregamento para ver o acompanhamento.</div>
                      ):(
                        <div>
                          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,marginBottom:8,scrollbarWidth:"none"}}>
                            {dias.map(d=>{
                              const ent=getE(d);const isHoje=d===new Date().toISOString().slice(0,10);const isSel=acompDiaSel===d;
                              return(<button key={d} onClick={()=>{setAcompDiaSel(isSel?null:d);setAcompTexto(ent?ent.texto:"");setAcompImagens(ent?ent.imagens:[]);}} style={{flexShrink:0,padding:"5px 7px",borderRadius:8,border:"1.5px solid "+(isSel?t.azul:ent?t.verde:t.borda),background:isSel?"rgba(22,119,255,.1)":ent?"rgba(2,192,118,.06)":"transparent",cursor:"pointer",minWidth:46,textAlign:"center"}}>
                                <div style={{fontSize:8,color:isSel?t.azulLt:ent?t.verde:t.txt2,fontWeight:700}}>{new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</div>
                                {isHoje&&<div style={{fontSize:7,color:t.ouro,fontWeight:700}}>HOJE</div>}
                                {ent&&<div style={{fontSize:9}}>{"\u2705"}</div>}
                              </button>);
                            })}
                          </div>
                          {acompDiaSel&&(
                            <div style={{background:t.card2,borderRadius:10,padding:12,border:"1px solid "+t.borda,marginBottom:6}}>
                              <div style={{fontSize:10,fontWeight:700,color:t.azulLt,marginBottom:8}}>{"\U0001F4C5"} {new Date(acompDiaSel+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</div>
                              <textarea value={acompTexto} onChange={e=>setAcompTexto(e.target.value)} placeholder="Status, localização, ocorrências deste dia..." rows={3} style={{...css.inp,resize:"vertical",fontSize:12,lineHeight:1.5,marginBottom:8}} />
                              <label style={{fontSize:9,color:t.txt2,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Anexar Fotos</label>
                              <input type="file" accept="image/*" multiple onChange={e=>{Array.from(e.target.files||[]).forEach(f=>{const rd=new FileReader();rd.onload=ev=>setAcompImagens(p=>[...p,{nome:f.name,base64:ev.target.result}]);rd.readAsDataURL(f);});e.target.value="";}} style={{...css.inp,padding:"7px 10px",fontSize:11,marginBottom:8}} />
                              {acompImagens.length>0&&(
                                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                                  {acompImagens.map((img,ii)=>(
                                    <div key={ii} style={{position:"relative"}}>
                                      <img src={img.base64} alt={img.nome} style={{width:60,height:60,objectFit:"cover",borderRadius:8,border:"1px solid "+t.borda}} />
                                      <button onClick={()=>setAcompImagens(p=>p.filter((_,j)=>j!==ii))} style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:t.danger,border:"none",color:"#fff",fontSize:9,cursor:"pointer",lineHeight:"1"}}>{"x"}</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <button onClick={()=>{salvarDia(acompDiaSel,acompTexto,acompImagens);showToast("{"+"\u2705"+"} Dia salvo!","ok");}} style={{...css.btnGreen,width:"100%",justifyContent:"center",fontSize:12}}>{"\U0001F4BE"} Salvar Dia</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Dados completos ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:8}}>📋 Dados do Registro <span style={{flex:1,height:1,background:t.borda}} /></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {l:"Motorista",v:r.nome},{l:"CPF",v:r.cpf},{l:"Placa",v:r.placa},{l:"Vínculo",v:r.vinculo},
                      {l:"Origem",v:r.origem},{l:"Destino",v:r.destino},{l:"Status",v:r.status},{l:"Dias",v:r.dias},
                      {l:"Carregamento",v:r.data_carr},{l:"Agenda",v:r.data_agenda},{l:"Descarga",v:r.data_desc},{l:"Chegada",v:r.chegada},
                      ...(isAdmin||perms.financeiro?[{l:"VL CTE",v:fmtMoeda(r.vl_cte)},{l:"VL Contrato",v:fmtMoeda(r.vl_contrato)},{l:"Adiant.",v:fmtMoeda(r.adiant)},{l:"Saldo",v:fmtMoeda(r.saldo)}]:[]),
                      {l:"CTE",v:r.cte},{l:"MDF",v:r.mdf},{l:"NF",v:r.nf},{l:"Cliente",v:r.cliente},
                    ].filter(f=>f.v).map((f,fi)=>(
                      <div key={fi} style={{background:t.bg,borderRadius:7,padding:"6px 9px",border:`1px solid ${t.borda}`}}>
                        <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600}}>{f.l}</div>
                        <div style={{fontSize:12,fontWeight:600,color:t.txt,marginTop:1}}>{f.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Histórico de Ocorrências ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:8}}>
                    📝 Histórico de Ocorrências
                    {ocorrLoading && <span style={{fontSize:9,color:t.txt2,fontWeight:400}}> carregando…</span>}
                    <span style={{flex:1,height:1,background:t.borda}} />
                  </div>

                  {/* Lista de ocorrências */}
                  {ocorrencias.length === 0 ? (
                    <div style={{fontSize:11,color:t.txt2,textAlign:"center",padding:"12px 0"}}>Nenhuma ocorrência registrada.</div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {ocorrencias.map((o,oi)=>(
                        <div key={oi} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                          {/* Linha vertical */}
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                            <div style={{width:24,height:24,borderRadius:"50%",background:`${tipoColors[o.tipo]||t.azulLt}18`,border:`1.5px solid ${tipoColors[o.tipo]||t.azulLt}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{tipoIcos[o.tipo]||"💬"}</div>
                            {oi < ocorrencias.length-1 && <div style={{width:1,flex:1,minHeight:12,background:t.borda,margin:"3px 0"}} />}
                          </div>
                          <div style={{flex:1,background:t.card2,borderRadius:8,padding:"8px 10px",border:`1px solid ${t.borda}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:3}}>
                              <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:tipoColors[o.tipo]||t.azulLt}}>{o.tipo||"info"}</span>
                              <span style={{fontSize:8,color:t.txt2,whiteSpace:"nowrap"}}>{o.usuario||"—"} · {new Date(o.data_hora).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span>
                            </div>
                            <div style={{fontSize:12,color:t.txt,lineHeight:1.5}}>{o.texto}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar nova ocorrência */}
                  {canOcorr && (
                    <div style={{marginTop:10,background:t.card2,borderRadius:10,padding:10,border:`1px solid ${t.borda}`}}>
                      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginBottom:9}}>＋ Nova Ocorrência</div>
                      {/* Tipo */}
                      <div style={{display:"flex",gap:6,marginBottom:9}}>
                        {[{k:"info",l:"💬 Info"},{k:"status",l:"✅ Status"},{k:"alerta",l:"🚨 Alerta"}].map(tp=>(
                          <button key={tp.k} onClick={()=>setNovaOcorrTipo(tp.k)} style={{flex:1,padding:"10px 6px",fontSize:12,fontWeight:700,border:`1.5px solid ${novaOcorrTipo===tp.k?tipoColors[tp.k]:t.borda}`,borderRadius:8,cursor:"pointer",background:novaOcorrTipo===tp.k?`${tipoColors[tp.k]}15`:t.card,color:novaOcorrTipo===tp.k?tipoColors[tp.k]:t.txt2,fontFamily:"inherit"}}>{tp.l}</button>
                        ))}
                      </div>
                      <textarea
                        value={novaOcorr}
                        onChange={e=>setNovaOcorr(e.target.value)}
                        placeholder="Descreva a ocorrência, atualização ou observação…"
                        rows={3}
                        style={{...css.inp,resize:"vertical",fontSize:12,lineHeight:1.5,padding:"8px 10px"}}
                      />
                      <button onClick={adicionarOcorrencia} disabled={!novaOcorr.trim()} style={{...css.btnGreen,width:"100%",justifyContent:"center",marginTop:7,opacity:novaOcorr.trim()?1:.5}}>
                        💾 Registrar Ocorrência
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ USUARIO MODAL ═══ */}
      {modalOpen === "usuario" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={css.modal}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>👤</div>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0?"EDITAR":"NOVO"} USUÁRIO</div>
                <div style={{fontSize:9,color:t.txt2}}>Preencha os dados do usuário</div>
              </div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {/* Dados básicos */}
              {[{k:"nome",l:"Nome Completo",req:true},{k:"email",l:"Email",req:true,type:"email"},{k:"tel",l:"Telefone"}].map(f => (
                <div key={f.k} style={{marginBottom:12}}>
                  <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>{f.l}{f.req&&<span style={{color:t.danger}}> *</span>}</label>
                  <input type={f.type||"text"} value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} style={css.inp} />
                </div>
              ))}
              {/* Senha */}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>
                  Senha{editIdx<0&&<span style={{color:t.danger}}> *</span>}
                  {editIdx>=0&&<span style={{color:t.txt2,fontWeight:400,textTransform:"none"}}> (deixe em branco para manter)</span>}
                </label>
                <input type="password" value={formData._senhaPlain||""} onChange={e=>setFormData(p=>({...p,_senhaPlain:e.target.value}))} placeholder={editIdx>=0?"Nova senha (opcional)":"Mínimo 6 caracteres"} style={css.inp} />
              </div>
              {/* Perfil */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:6}}>Perfil</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {[
                    {k:"gerente",ico:"🏢",l:"Gerente",desc:"Financeiro + edita tudo"},
                    {k:"operador",ico:"⚙️",l:"Operador",desc:"Edita operacional"},
                    {k:"visualizador",ico:"👁️",l:"Visual.",desc:"Somente leitura"},
                  ].map(r => (
                    <div key={r.k} onClick={()=>setFormData(p=>({...p,perfil:r.k,perms:{...PERMS_PADRAO[r.k]}}))} style={{border:`1.5px solid ${(formData.perfil||"operador")===r.k?t.ouro:t.borda}`,borderRadius:8,padding:"8px 4px",cursor:"pointer",background:(formData.perfil||"operador")===r.k?`rgba(240,185,11,.08)`:t.card2,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .2s",textAlign:"center"}}>
                      <span style={{fontSize:16}}>{r.ico}</span>
                      <span style={{fontSize:10,fontWeight:700,color:(formData.perfil||"operador")===r.k?t.ouro:t.txt2}}>{r.l}</span>
                      <span style={{fontSize:8,color:t.txt2,lineHeight:1.2}}>{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Permissões */}
              <div>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:8}}>Permissões</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {PERMS_LISTA.filter(p=>p.key!=="config_db"&&p.key!=="usuarios").map(p => {
                    const val = (formData.perms||PERMS_PADRAO[formData.perfil||"operador"])[p.key];
                    return (
                      <div key={p.key} onClick={()=>setFormData(prev=>({...prev,perms:{...(prev.perms||PERMS_PADRAO[prev.perfil||"operador"]),[p.key]:!val}}))}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${val?t.verde:t.borda}`,cursor:"pointer",background:val?`rgba(2,192,118,.06)`:"transparent"}}>
                        <div style={{width:16,height:16,borderRadius:4,background:val?t.verde:t.borda2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                          {val&&<span style={{fontSize:10,color:"#fff",fontWeight:700}}>✓</span>}
                        </div>
                        <span style={{fontSize:11,fontWeight:600,color:val?t.txt:t.txt2}}>{p.lbl}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",flexShrink:0,borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button onClick={async ()=>{
                const u = {...formData};
                if (!u.nome) { showToast("⚠️ Nome obrigatório","warn"); return; }
                if (!u.email) { showToast("⚠️ Email obrigatório","warn"); return; }
                if (editIdx<0 && !u._senhaPlain) { showToast("⚠️ Senha obrigatória","warn"); return; }
                if (u._senhaPlain) {
                  if (u._senhaPlain.length < 6) { showToast("⚠️ Senha deve ter ao menos 6 caracteres","warn"); return; }
                  u.senha = await hashSenha(u._senhaPlain);
                }
                delete u._senhaPlain;
                if (!u.perfil) u.perfil = "operador";
                if (!u.perms) u.perms = {...PERMS_PADRAO[u.perfil]};
                // Garantir que perms seja string JSON para Supabase (coluna jsonb)
                const uParaSupa = {...u, perms: u.perms};
                const nu = [...usuarios];
                if (editIdx>=0) nu[editIdx] = u; else nu.push(u);
                setUsuarios(nu);
                saveJSON("co_usuarios_local", nu); // chave consistente
                // Salvar no Supabase com upsert real
                const conn = getConexao();
                if (conn) {
                  try {
                    await supaFetch(conn.url, conn.key, "POST",
                      `${TABLE_USUARIOS}?on_conflict=email`, [uParaSupa]);
                    await registrarLog(editIdx>=0?"EDITAR_USUARIO":"NOVO_USUARIO", `${u.nome} (${u.email}) - perfil: ${u.perfil}`);
                    if (editIdx < 0) { setUsuarioEmailPreview({...u, _senhaRaw: formData._senhaPlain||""}); }
                    showToast(editIdx>=0?"✅ Usuário atualizado e sincronizado!":"✅ Usuário criado! Envie o email de boas-vindas.","ok");
                  } catch(e) {
                    showToast("✅ Salvo local. Supabase: "+e.message.slice(0,40),"warn");
                  }
                } else {
                  showToast(editIdx>=0?"✅ Usuário atualizado!":"✅ Usuário criado!","ok");
                }
                setModalOpen(null);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EMAIL BOAS-VINDAS PROMPT ═══ */}
      {usuarioEmailPreview && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setUsuarioEmailPreview(null)}>
          <div style={{...css.modal,maxWidth:420}}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${t.azul},${t.azulLt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>📧</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>EMAIL DE BOAS-VINDAS</div><div style={{fontSize:9,color:t.txt2}}>Notificar o novo usuário?</div></div>
              <button onClick={()=>setUsuarioEmailPreview(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2}}>✕</button>
            </div>
            <div style={{padding:16}}>
              <div style={{background:t.card2,borderRadius:10,padding:12,marginBottom:14,border:`1px solid ${t.borda}`}}>
                <div style={{fontSize:11,fontWeight:700,color:t.txt,marginBottom:4}}>{usuarioEmailPreview.nome}</div>
                <div style={{fontSize:10,color:t.txt2}}>📧 {usuarioEmailPreview.email}</div>
                <div style={{fontSize:10,color:t.ouro}}>🔑 Perfil: {usuarioEmailPreview.perfil}</div>
              </div>
              <p style={{fontSize:11,color:t.txt2,lineHeight:1.6,marginBottom:14}}>
                O email será aberto no seu cliente de email (Mail, Outlook, Gmail) já preenchido com os dados de acesso. Basta clicar em <strong style={{color:t.txt}}>Enviar</strong>.
              </p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setUsuarioEmailPreview(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Agora não</button>
                <button onClick={()=>{enviarEmailBoasVindas(usuarioEmailPreview, usuarioEmailPreview._senhaRaw||"");setUsuarioEmailPreview(null);}} style={{...css.btnGold,flex:1,justifyContent:"center"}}>
                  📧 Enviar Email de Boas-vindas
                </button>
              </div>
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

      {/* ═══ IMPORT CONTACTS MODAL (Item 1 Sessão 4) ═══ */}
      {motImportOpen && motImportData && (()=>{
        const {novos, conflitos} = motImportData;
        const totalOps = novos.length + conflitos.length;
        const needsConfirm = totalOps >= 5;
        const confirmOk = !needsConfirm || motImportConfirm.trim() === "ESTOU DE ACORDO";
        const inpS = {...css.inp, fontSize:11, padding:"6px 9px"};
        const lblS = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:2};

        const aplicar = () => {
          if (!confirmOk) { showToast("⚠️ Digite ESTOU DE ACORDO para confirmar","warn"); return; }
          const updated = [...motoristas];
          novos.forEach(n => { if (!updated.find(m=>m.nome===n.nome)) updated.push(n); });
          conflitos.forEach(c => {
            if (c.escolha === "usar") {
              const idx = updated.findIndex(m =>
                (c.atual.cpf && m.cpf && m.cpf.replace(/\D/g,"")===c.atual.cpf.replace(/\D/g,"")) ||
                (c.atual.placa1 && m.placa1 && m.placa1.toUpperCase()===c.atual.placa1.toUpperCase()) ||
                m.nome === c.atual.nome
              );
              if (idx >= 0) updated[idx] = {...updated[idx], ...c.imp};
            }
          });
          saveMotoristasLS(updated);
          registrarLog("IMPORTAR_CONTATOS", `${novos.length} novos + ${conflitos.filter(c=>c.escolha==="usar").length} atualizados`);
          showToast(`✅ ${novos.length} novos importados, ${conflitos.filter(c=>c.escolha==="usar").length} atualizados`, "ok");
          setMotImportOpen(false);
          setMotImportData(null);
          setMotImportConfirm("");
        };

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setMotImportOpen(false)}>
            <div style={{...css.modal, maxHeight:"94vh"}}>
              {/* Header */}
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:`rgba(22,119,255,.06)`}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(22,119,255,.15)",border:"1px solid rgba(22,119,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>📥</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.azulLt}}>IMPORTAR CONTATOS</div>
                  <div style={{fontSize:9,color:t.txt2}}>{novos.length} novos · {conflitos.length} conflito{conflitos.length!==1?"s":""}</div>
                </div>
                <button onClick={()=>setMotImportOpen(false)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>

                {/* NOVOS */}
                {novos.length > 0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:t.verde,marginBottom:6}}>✅ {novos.length} novo{novos.length!==1?"s":""} a adicionar</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {novos.map((n,i)=>(
                        <div key={i} style={{background:t.card2,borderRadius:8,padding:"7px 10px",border:`1px solid ${t.borda}`,borderLeft:`3px solid ${t.verde}`,fontSize:10,color:t.txt}}>
                          <strong>{n.nome}</strong>
                          {n.tel && <span style={{color:t.txt2,marginLeft:8}}>📞 {n.tel}</span>}
                          {n.placa1 && <span style={{color:t.ouro,marginLeft:8}}>🚛 {n.placa1}</span>}
                          {n.cpf && <span style={{color:t.txt2,marginLeft:8}}>🪪 {n.cpf}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONFLITOS */}
                {conflitos.length > 0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:t.warn,marginBottom:6}}>⚠️ {conflitos.length} conflito{conflitos.length!==1?"s":""} — escolha o que manter</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {conflitos.map((c,ci)=>(
                        <div key={ci} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,overflow:"hidden"}}>
                          {/* Compare header */}
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${t.borda}`}}>
                            <div style={{padding:"6px 10px",background:c.escolha==="manter"?`rgba(2,192,118,.08)`:t.card2,borderRight:`1px solid ${t.borda}`,cursor:"pointer",transition:"background .2s"}} onClick={()=>{
                              const nc=[...conflitos]; nc[ci]={...nc[ci],escolha:"manter"}; setMotImportData({novos,conflitos:nc});
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                                <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${c.escolha==="manter"?t.verde:t.borda}`,background:c.escolha==="manter"?t.verde:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {c.escolha==="manter" && <div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}} />}
                                </div>
                                <span style={{fontSize:9,fontWeight:700,color:c.escolha==="manter"?t.verde:t.txt2,textTransform:"uppercase",letterSpacing:.8}}>Manter atual</span>
                              </div>
                              {[{l:"Nome",v:c.atual.nome},{l:"Tel",v:c.atual.tel},{l:"Placa",v:c.atual.placa1},{l:"CPF",v:c.atual.cpf}].filter(f=>f.v).map(f=>(
                                <div key={f.l} style={{fontSize:9,color:t.txt2}}>{f.l}: <strong style={{color:t.txt}}>{f.v}</strong></div>
                              ))}
                            </div>
                            <div style={{padding:"6px 10px",background:c.escolha==="usar"?`rgba(22,119,255,.08)`:t.card2,cursor:"pointer",transition:"background .2s"}} onClick={()=>{
                              const nc=[...conflitos]; nc[ci]={...nc[ci],escolha:"usar"}; setMotImportData({novos,conflitos:nc});
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                                <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${c.escolha==="usar"?t.azulLt:t.borda}`,background:c.escolha==="usar"?t.azulLt:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {c.escolha==="usar" && <div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}} />}
                                </div>
                                <span style={{fontSize:9,fontWeight:700,color:c.escolha==="usar"?t.azulLt:t.txt2,textTransform:"uppercase",letterSpacing:.8}}>Usar importado</span>
                              </div>
                              {[{l:"Nome",v:c.imp.nome},{l:"Tel",v:c.imp.tel},{l:"Placa",v:c.imp.placa1},{l:"CPF",v:c.imp.cpf}].filter(f=>f.v).map(f=>(
                                <div key={f.l} style={{fontSize:9,color:t.txt2}}>{f.l}: <strong style={{color:t.azulLt}}>{f.v}</strong></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmação para operações grandes */}
                {needsConfirm && (
                  <div style={{background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.warn,marginBottom:6}}>🔐 Operação com {totalOps} contato{totalOps!==1?"s":""} — confirmação obrigatória</div>
                    <div style={{marginBottom:6}}>
                      <label style={lblS}>Digite <strong style={{color:t.ouro}}>ESTOU DE ACORDO</strong> para prosseguir</label>
                      <input value={motImportConfirm} onChange={e=>setMotImportConfirm(e.target.value)} placeholder="ESTOU DE ACORDO" style={{...inpS,width:"100%",boxSizing:"border-box",border:`1.5px solid ${confirmOk?t.verde:t.borda}`,color:confirmOk?t.verde:t.txt}} />
                    </div>
                    {confirmOk && <div style={{fontSize:9,color:t.verde}}>✅ Confirmado</div>}
                  </div>
                )}

              </div>

              {/* Footer */}
              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8,flexShrink:0}}>
                <button onClick={()=>setMotImportOpen(false)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={aplicar} disabled={!confirmOk} style={{flex:1,border:`1.5px solid ${confirmOk?t.azulLt:t.borda}`,borderRadius:10,padding:"12px 18px",cursor:confirmOk?"pointer":"not-allowed",background:confirmOk?`rgba(22,119,255,.12)`:`rgba(128,128,128,.08)`,color:confirmOk?t.azulLt:t.txt2,fontWeight:700,fontSize:13,letterSpacing:.5,fontFamily:"inherit"}}>
                  📥 IMPORTAR ({novos.length} novos + {conflitos.filter(c=>c.escolha==="usar").length} atualizações)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ WHATSAPP CARD MODAL (Item 4) ═══ */}
      {wppModal && (()=>{
        const {reg, mot} = wppModal;
        const adtNum = parseFloat(reg.adiant||0)||0;
        const chequeNum = parseFloat(wppValCheque||0)||0;
        const contaNum = parseFloat(wppValConta||0)||0;
        const somaExcede = wppPgto==="ambos" && (chequeNum+contaNum) > adtNum && adtNum > 0;
        const temConta = !!(mot?.banco || mot?.conta);
        const placas = [mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).join(" / ") || reg.placa || "—";

        const gerarMsg = () => {
          const ln = "\n";
          let msg = `DT: ${reg.dt||"—"}    DESTINO: ${reg.destino||"—"}${ln}`;
          msg += `NOME: ${reg.nome||"—"}${ln}`;
          msg += `CPF: ${reg.cpf||"—"}${ln}`;
          msg += `TELEFONE: ${wppTel||"—"}${ln}`;
          msg += `PLACAS: ${placas}${ln}`;
          msg += `CARREGAR: ${reg.data_carr||"—"}${ln}`;
          msg += `AG DESCARGA: ${reg.data_agenda||"—"}${ln}`;
          msg += `VLR EMPRESA: ${fmtMoeda(reg.vl_cte)}${ln}`;
          msg += `VLR MOT: ${fmtMoeda(reg.vl_contrato)}${ln}`;
          msg += `ADT: ${fmtMoeda(reg.adiant)}${ln}`;
          if (wppPgto==="cheque") {
            msg += `PGTO: ✅ CHEQUE${ln}`;
          } else if (wppPgto==="conta") {
            msg += `PGTO: ✅ CONTA${ln}`;
            if (temConta) {
              msg += `  BCO: ${mot.banco||"—"}${ln}`;
              msg += `  AGE: ${mot.agencia||"—"}${ln}`;
              msg += `  C/C: ${mot.conta||"—"}${ln}`;
              msg += `  FAV: ${mot.favorecido||mot?.nome||reg.nome||"—"}${ln}`;
              if (mot?.pix_tipo) msg += `  PIX (${mot.pix_tipo}): ${mot.pix_chave||"—"}${ln}`;
            }
          } else {
            msg += `PGTO: ✅ CHEQUE + CONTA${ln}`;
            msg += `  Cheque: ${fmtMoeda(wppValCheque)}${ln}`;
            msg += `  Conta: ${fmtMoeda(wppValConta)}${ln}`;
            if (temConta) {
              msg += `  BCO: ${mot.banco||"—"}${ln}`;
              msg += `  AGE: ${mot.agencia||"—"}${ln}`;
              msg += `  C/C: ${mot.conta||"—"}${ln}`;
              msg += `  FAV: ${mot.favorecido||mot?.nome||reg.nome||"—"}${ln}`;
              if (mot?.pix_tipo) msg += `  PIX (${mot.pix_tipo}): ${mot.pix_chave||"—"}${ln}`;
            }
          }
          if (wppObs.trim()) msg += `OBSERVAÇÃO: ${wppObs.trim()}${ln}`;
          msg += `${ln}YFGroup · Controle Operacional`;
          return msg;
        };

        const enviar = () => {
          if (somaExcede) { showToast("⚠️ Soma Cheque + Conta excede o ADT!","warn"); return; }
          const tel = wppTel.replace(/\D/g,"");
          const msg = encodeURIComponent(gerarMsg());
          const url = tel ? `https://wa.me/55${tel}?text=${msg}` : `https://wa.me/?text=${msg}`;
          window.open(url, "_blank");
          if (!tel) showToast("⚠️ Sem telefone — WhatsApp aberto sem número","warn");
          setWppModal(null);
        };

        const inpStyle = {...css.inp, fontSize:12, padding:"7px 10px"};
        const labelStyle = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};
        const pgtoOptions = [{k:"cheque",l:"📝 Cheque"},{k:"conta",l:"🏦 Conta"},{k:"ambos",l:"📝 + 🏦 Ambos"}];

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppModal(null)}>
            <div style={{...css.modal,maxHeight:"96vh"}}>
              {/* Header */}
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:"rgba(37,211,102,.06)"}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(37,211,102,.15)",border:"1px solid rgba(37,211,102,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>📲</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:"#25D366"}}>WHATSAPP</div>
                  <div style={{fontSize:9,color:t.txt2}}>Revise os dados antes de enviar</div>
                </div>
                <button onClick={()=>setWppModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>

                {/* Linha DT + DESTINO */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={labelStyle}>DT</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,color:t.ouro}}>{reg.dt||"—"}</div></div>
                  <div><label style={labelStyle}>Destino</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontSize:11,color:t.txt}}>{reg.destino||"—"}</div></div>
                </div>

                {/* Nome, CPF */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={labelStyle}>Nome</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontSize:12,color:t.txt,fontWeight:700}}>{reg.nome||"—"}</div></div>
                  <div><label style={labelStyle}>CPF</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontSize:11,color:t.txt}}>{reg.cpf||"—"}</div></div>
                </div>

                {/* Telefone — editável */}
                <div>
                  <label style={labelStyle}>Telefone <span style={{color:t.verde,fontSize:8}}>(editável)</span></label>
                  <input value={wppTel} onChange={e=>setWppTel(e.target.value)} placeholder="(XX) XXXXX-XXXX" style={inpStyle} />
                  {!wppTel && <div style={{fontSize:9,color:t.warn,marginTop:3}}>⚠️ Motorista sem telefone cadastrado — o WhatsApp abrirá sem número</div>}
                </div>

                {/* Placas */}
                <div>
                  <label style={labelStyle}>Placas</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {[mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).map((p,j)=>(
                      <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:2.5,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:5,padding:"3px 9px"}}>{p}</span>
                    ))}
                  </div>
                </div>

                {/* Datas + Financeiro */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {l:"Carregar",v:reg.data_carr},
                    {l:"Ag. Descarga",v:reg.data_agenda},
                  ].map(f=>(
                    <div key={f.l}><label style={labelStyle}>{f.l}</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1.5,color:t.ouro}}>{f.v||"—"}</div></div>
                  ))}
                </div>
                {canFin && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{l:"VLR EMPRESA",v:reg.vl_cte,c:t.verde},{l:"VLR MOT",v:reg.vl_contrato,c:t.azulLt},{l:"ADT",v:reg.adiant,c:t.ouro}].map(f=>(
                      <div key={f.l} style={{background:t.card2,borderRadius:9,padding:"8px 10px",border:`1px solid ${t.borda}`,textAlign:"center"}}>
                        <div style={{fontSize:7,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:3}}>{f.l}</div>
                        <div style={{fontSize:11,fontWeight:700,color:f.c}}>{fmtMoeda(f.v)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PGTO */}
                <div>
                  <label style={{...labelStyle,marginBottom:7}}>PGTO · Forma de Pagamento</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {pgtoOptions.map(op=>(
                      <button key={op.k} onClick={()=>setWppPgto(op.k)} style={{padding:"9px 6px",borderRadius:9,border:`1.5px solid ${wppPgto===op.k?t.verde:t.borda}`,background:wppPgto===op.k?`rgba(2,192,118,.1)`:t.card2,color:wppPgto===op.k?t.verde:t.txt2,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all .2s"}}>
                        {op.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conta — verificar dados bancários */}
                {(wppPgto==="conta" || wppPgto==="ambos") && (
                  <div style={{background:t.card2,borderRadius:10,padding:12,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${temConta?t.verde:t.warn}`}}>
                    {temConta ? (
                      <>
                        <div style={{fontSize:10,fontWeight:700,color:t.verde,marginBottom:6}}>✅ Conta bancária cadastrada</div>
                        <div style={{display:"grid",gap:3,fontSize:10,color:t.txt2}}>
                          <div>BCO: <strong style={{color:t.txt}}>{mot.banco||"—"}</strong></div>
                          <div>AGE: <strong style={{color:t.txt}}>{mot.agencia||"—"}</strong> · C/C: <strong style={{color:t.txt}}>{mot.conta||"—"}</strong></div>
                          <div>FAV: <strong style={{color:t.txt}}>{mot.favorecido||mot?.nome||reg.nome||"—"}</strong></div>
                          {mot?.pix_tipo && <div style={{color:t.azulLt}}>PIX ({mot.pix_tipo}): <strong>{mot.pix_chave||"—"}</strong></div>}
                        </div>
                      </>
                    ) : (
                      <div style={{fontSize:10,color:t.warn}}>⚠️ Motorista sem conta bancária cadastrada. Cadastre na aba Motoristas antes de enviar.</div>
                    )}
                  </div>
                )}

                {/* Valores Cheque + Conta */}
                {wppPgto==="ambos" && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div>
                      <label style={labelStyle}>Valor Cheque (R$)</label>
                      <input type="number" value={wppValCheque} onChange={e=>setWppValCheque(e.target.value)} placeholder="0,00" style={inpStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Valor Conta (R$)</label>
                      <input type="number" value={wppValConta} onChange={e=>setWppValConta(e.target.value)} placeholder="0,00" style={inpStyle} />
                    </div>
                    {somaExcede && (
                      <div style={{gridColumn:"1/-1",background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.25)`,borderRadius:8,padding:"8px 10px",fontSize:11,color:t.danger,fontWeight:600}}>
                        ⚠️ Soma ({fmtMoeda((chequeNum+contaNum).toFixed(2))}) excede o ADT ({fmtMoeda(reg.adiant)})!
                      </div>
                    )}
                    {!somaExcede && (chequeNum+contaNum)>0 && adtNum>0 && (
                      <div style={{gridColumn:"1/-1",background:`rgba(2,192,118,.06)`,border:`1px solid rgba(2,192,118,.2)`,borderRadius:8,padding:"8px 10px",fontSize:11,color:t.verde}}>
                        ✅ Total: {fmtMoeda((chequeNum+contaNum).toFixed(2))} de {fmtMoeda(reg.adiant)}
                      </div>
                    )}
                  </div>
                )}

                {/* Observação */}
                <div>
                  <label style={labelStyle}>Observação</label>
                  <textarea value={wppObs} onChange={e=>setWppObs(e.target.value)} rows={2} placeholder="Qualquer observação relevante..." style={{...inpStyle,resize:"vertical",lineHeight:1.5}} />
                </div>

              </div>

              {/* Botão enviar */}
              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8}}>
                <button onClick={()=>setWppModal(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={enviar} disabled={somaExcede} style={{flex:1,border:"none",borderRadius:10,padding:"12px 18px",cursor:somaExcede?"not-allowed":"pointer",background:somaExcede?`rgba(128,128,128,.2)`:`rgba(37,211,102,.15)`,border:`1.5px solid ${somaExcede?t.borda:"rgba(37,211,102,.4)"}`,color:somaExcede?t.txt2:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  📲 ENVIAR NO WHATSAPP
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ WHATSAPP DOC MODAL (Item 3 Sessão 4) ═══ */}
      {wppModal2 && (()=>{
        const {reg, mot} = wppModal2;
        const nomeMotorista = mot?.nome || reg.nome || "";
        const placas = [mot?.placa1||reg.placa, mot?.placa2, mot?.placa3, mot?.placa4].filter(Boolean).join(" / ") || reg.placa || "—";
        const telMot = mot?.tel || reg.tel || "";
        const roOk = wpp2Ro.trim().length > 0;

        const inpStyle2 = {...css.inp, fontSize:12, padding:"7px 10px"};
        const lbl2 = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};

        const gerarMsgDoc = () => {
          const ln = "%0A";
          const b = (s) => `*${s}*`;
          let msg = `${b("📄 DOCUMENTO")}${ln}`;
          msg += `────────────────${ln}`;
          msg += `${b("MOT:")} ${nomeMotorista}${ln}`;
          msg += `${b("CTE:")} ${reg.cte||"—"}${ln}`;
          msg += `${b("MDF:")} ${reg.mdf||"—"}${ln}`;
          msg += `${b("MAT:")} ${reg.mat||"—"}${ln}`;
          msg += `${b("PLACAS:")} ${placas}${ln}`;
          msg += `────────────────${ln}`;
          msg += `${b("DT:")} ${reg.dt||"—"}  ${b("NF:")} ${reg.nf||"—"}  ${b("ID:")} ${reg.id||"—"}${ln}`;
          msg += `${b("RO:")} ${wpp2Ro.trim()}${ln}`;
          if (wpp2IncluirObs && wpp2Obs.trim()) msg += `${b("OBS:")} ${wpp2Obs.trim()}${ln}`;
          msg += `────────────────${ln}`;
          msg += `YFGroup · Controle Operacional`;
          return msg;
        };

        const enviarDoc = () => {
          if (!roOk) { showToast("⚠️ RO é obrigatório","warn"); return; }
          // Memoriza OBS se preenchido e incluído
          if (wpp2IncluirObs && wpp2Obs.trim()) saveJSON("co_wpp2_obs_last", wpp2Obs.trim());
          const tel = telMot.replace(/\D/g,"");
          const msg = gerarMsgDoc();
          const url = tel ? `https://wa.me/55${tel}?text=${msg}` : `https://wa.me/?text=${msg}`;
          window.open(url, "_blank");
          if (!tel) showToast("⚠️ Sem telefone — WhatsApp aberto sem número","warn");
          setWppModal2(null);
        };

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppModal2(null)}>
            <div style={{...css.modal, maxHeight:"96vh"}}>
              {/* Header */}
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:`rgba(22,119,255,.06)`}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(22,119,255,.15)",border:"1px solid rgba(22,119,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>📄</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.azulLt}}>WHATSAPP DOC</div>
                  <div style={{fontSize:9,color:t.txt2}}>Mensagem documentária · RO obrigatório</div>
                </div>
                <button onClick={()=>setWppModal2(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>

                {/* Motorista + Placas */}
                <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700}}>Motorista</div>
                    {telMot && <div style={{fontSize:9,color:t.txt2}}>📞 {telMot}</div>}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:3}}>{nomeMotorista||"—"}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                    {[mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).map((p,j)=>(
                      <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:5,padding:"2px 8px"}}>{p}</span>
                    ))}
                  </div>
                </div>

                {/* Documentos */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {[{l:"CTE",v:reg.cte},{l:"MDF",v:reg.mdf},{l:"MAT",v:reg.mat}].map(f=>(
                    <div key={f.l} style={{background:t.card2,borderRadius:8,padding:"7px 9px",border:`1px solid ${t.borda}`,textAlign:"center"}}>
                      <div style={{fontSize:7,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                      <div style={{fontSize:11,fontWeight:700,color:f.v?t.txt:t.txt2}}>{f.v||"—"}</div>
                    </div>
                  ))}
                </div>

                {/* DT / NF / ID */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {[{l:"DT",v:reg.dt},{l:"NF",v:reg.nf},{l:"ID",v:reg.id}].map(f=>(
                    <div key={f.l} style={{background:t.card2,borderRadius:8,padding:"7px 9px",border:`1px solid ${t.borda}`,textAlign:"center"}}>
                      <div style={{fontSize:7,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1.5,color:t.ouro}}>{f.v||"—"}</div>
                    </div>
                  ))}
                </div>

                {/* RO — obrigatório */}
                <div>
                  <label style={{...lbl2,color:roOk?t.verde:t.danger}}>RO — Registro de Ocorrência <span style={{color:t.danger}}>*obrigatório</span></label>
                  <input value={wpp2Ro} onChange={e=>setWpp2Ro(e.target.value)} placeholder="Nº do Registro de Ocorrência" style={{...inpStyle2,border:`1.5px solid ${roOk?t.verde:t.danger}`,width:"100%",boxSizing:"border-box"}} />
                  {!roOk && <div style={{fontSize:9,color:t.danger,marginTop:3}}>⚠️ Informe o número do RO para prosseguir</div>}
                </div>

                {/* OBS — opcional com memória */}
                <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <label style={{...lbl2,margin:0,flex:1}}>OBS — Observação <span style={{color:t.txt2,fontSize:7}}>(opcional)</span></label>
                    <button onClick={()=>setWpp2IncluirObs(v=>!v)} style={{background:wpp2IncluirObs?`rgba(2,192,118,.12)`:`rgba(128,128,128,.08)`,border:`1.5px solid ${wpp2IncluirObs?t.verde:t.borda}`,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:9,fontWeight:700,color:wpp2IncluirObs?t.verde:t.txt2,fontFamily:"inherit"}}>
                      {wpp2IncluirObs?"✅ Incluir":"⬜ Incluir"}
                    </button>
                  </div>
                  <textarea value={wpp2Obs} onChange={e=>setWpp2Obs(e.target.value)} rows={2} placeholder={wpp2Obs?"Última OBS salva — edite se necessário":"Digite uma observação..."}
                    style={{...inpStyle2,resize:"vertical",lineHeight:1.5,width:"100%",boxSizing:"border-box",opacity:wpp2IncluirObs?1:.55}} />
                  {!wpp2IncluirObs && wpp2Obs && (
                    <div style={{fontSize:8,color:t.txt2,marginTop:3}}>💾 Última OBS salva — clique em "Incluir" para adicionar à mensagem</div>
                  )}
                </div>

                {/* Preview da mensagem */}
                <div style={{background:t.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:7}}>Preview da mensagem</div>
                  <div style={{fontFamily:"monospace",fontSize:9,color:t.txt,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
                    {`📄 DOCUMENTO\n────────────────\nMOT: ${nomeMotorista||"—"}\nCTE: ${reg.cte||"—"}\nMDF: ${reg.mdf||"—"}\nMAT: ${reg.mat||"—"}\nPLACAS: ${placas}\n────────────────\nDT: ${reg.dt||"—"}  NF: ${reg.nf||"—"}  ID: ${reg.id||"—"}\nRO: ${wpp2Ro||"[obrigatório]"}${wpp2IncluirObs&&wpp2Obs?`\nOBS: ${wpp2Obs}`:""}\n────────────────\nYFGroup · Controle Operacional`}
                  </div>
                </div>

              </div>

              {/* Botão enviar */}
              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8,flexShrink:0}}>
                <button onClick={()=>setWppModal2(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={enviarDoc} disabled={!roOk} style={{flex:1,border:`1.5px solid ${roOk?"rgba(37,211,102,.4)":t.borda}`,borderRadius:10,padding:"12px 18px",cursor:roOk?"pointer":"not-allowed",background:roOk?`rgba(37,211,102,.15)`:`rgba(128,128,128,.08)`,color:roOk?"#25D366":t.txt2,fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  📄 ENVIAR DOC NO WHATSAPP
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast {...toast} />
    </div>
  );
}
