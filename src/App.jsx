import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PieController, DoughnutController, LineController, LineElement, PointElement, Filler } from "chart.js";
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PieController, DoughnutController, LineController, LineElement, PointElement, Filler);

import { themes, TABLE, TABLE_USUARIOS, TABLE_CONFIG, TABLE_OCORR, TABLE_LOGS, TABLE_APOINTS,
  MESES_LABEL, PERMS_PADRAO, PERMS_LISTA, DESIGN, hexRgb,
  DEV_CHANGELOG, ENV_SUPA_URL, ENV_SUPA_KEY } from './constants.js';
import { DEFAULT_LOGO } from './defaultLogo.js';
import { parseData, diffDias, fmtMoeda, brToInput, inputToBr,
  brToInputDT, inputToBrDT, dtBase, esc, hashSenha, verificarSenha,
  loadJSON, saveJSON, decodeJWT, iniciarOAuth,
  validarPlaca, normalizarPlaca, normalizarTelefone, normalizarNome } from './utils.js';
import { supaFetch } from './supabase.js';
import { exportCSV, exportODS, exportPDF, ExportMenu,
  gerarICS, abrirGoogleCalendar } from './exportHelpers.jsx';
import Toast from './components/Toast.jsx';
import AlterarSenhaAdmin from './components/AlterarSenhaAdmin.jsx';
import ReportBuilder from './relatorios/ReportBuilder.jsx';


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
  // Aprovação de acesso Google
  const [aguardandoAprovacao, setAguardandoAprovacao] = useState(false);
  const [pendingUserInfo, setPendingUserInfo] = useState(null); // {email, nome}
  const [usuariosPendentes, setUsuariosPendentes] = useState([]);
  const [aprovarModal, setAprovarModal] = useState(null); // usuário pendente a ser aprovado
  const [aprovarPerfil, setAprovarPerfil] = useState("operador");

  // Data state
  const [dadosBase, setDadosBase] = useState([]);
  const [dadosExtras, setDadosExtras] = useState(() => loadJSON("dados_extras",[]));
  const [motoristas, setMotoristas] = useState(() => loadJSON("co_motoristas",[]));
  const [conexoes, setConexoes] = useState(() => loadJSON("co_conexoes",[]));

  // UI state
  const [activeTab, setActiveTab] = useState("planilha");
  const [planilhaSortKey, setPlanilhaSortKey] = useState(null);   // coluna ativa: 'dt'|'nome'|'placa'|...
  const [planilhaSortDir, setPlanilhaSortDir] = useState("asc");  // 'asc'|'desc'
  const [planilhaPagina, setPlanilhaPagina] = useState(1);        // página atual (começa em 1)
  const [planilhaDetalheReg, setPlanilhaDetalheReg] = useState(null); // modal detalhe da planilha
  const [planilhaFiltroAno, setPlanilhaFiltroAno] = useState("");    // "" = aguardando default automático
  const [planilhaFiltroMes, setPlanilhaFiltroMes] = useState("");    // "" = aguardando default automático
  const [planilhaFiltroOrigem, setPlanilhaFiltroOrigem] = useState("todas"); // "todas" = sem filtro
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
  const [dashOrigem, setDashOrigem] = useState("todos");

  // Diarias state
  const [dFiltro, setDFiltro] = useState("todos");
  const [dSubTab, setDSubTab] = useState("resumo");

  // Descarga state
  const [dscTab, setDscTab] = useState("hoje");
  const [dscData, setDscData] = useState(new Date().toISOString().slice(0,10));

  // View mode state (linhas | blocos) + colunas para Diarias e Descarga
  const [diariaView, setDiariaView] = useState(() => loadJSON("co_diaria_view","blocos"));
  const [diariaCols, setDiariaCols] = useState(() => loadJSON("co_diaria_cols", 2));
  const [descargaView, setDescargaView] = useState(() => loadJSON("co_descarga_view","blocos"));
  const [descargaCols, setDescargaCols] = useState(() => loadJSON("co_descarga_cols", 2));
  const [diariaNavDT, setDiariaNavDT] = useState(null);    // DT destacada ao navegar do modal
  const [descargaNavDT, setDescargaNavDT] = useState(null); // DT destacada ao navegar do modal

  // Modal state
  const [modalOpen, setModalOpen] = useState(null); // 'edit'|'motorista'|'usuario'|'configdb'|'detalhe'
  const [editIdx, setEditIdx] = useState(-1);
  const [editStep, setEditStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [excluirConfirm, setExcluirConfirm] = useState(null); // null | 'edit' | 'detalhe'
  const [excluirTexto, setExcluirTexto] = useState("");

  // Detalhe / Ocorrências
  const [detalheDT, setDetalheDT] = useState(null);       // registro aberto no modal
  const [ocorrencias, setOcorrencias] = useState([]);      // lista de ocorrências do DT atual
  const [novaOcorr, setNovaOcorr] = useState("");
  const [novaOcorrTipo, setNovaOcorrTipo] = useState("info"); // info | alerta | status
  const [ocorrLoading, setOcorrLoading] = useState(false);
  const [ocorrListExpanded, setOcorrListExpanded] = useState(false); // expande lista no modal detalhe
  // Mini-modal de ocorrências na tela de busca (planilha)
  const [ocorrModalDT, setOcorrModalDT] = useState(null);
  const [ocorrModalList, setOcorrModalList] = useState([]);
  const [ocorrModalLoading, setOcorrModalLoading] = useState(false);
  const [ocorrModalExpanded, setOcorrModalExpanded] = useState(false);
  const [ocorrModalNova, setOcorrModalNova] = useState("");
  const [ocorrModalTipo, setOcorrModalTipo] = useState("info");

  // Minutas no modal de detalhe (Supabase)
  const [detalheMinDcc, setDetalheMinDcc] = useState([{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}]);
  const [detalheCteComp, setDetalheCteComp] = useState({cte:"",mdf:"",mat:""});
  const [detalheMinDsc, setDetalheMinDsc] = useState([{tipo:"MAM",cte:"",mdf:"",num:""}]);
  const [salvandoMins, setSalvandoMins] = useState(false);
  const [detalheTemDcc, setDetalheTemDcc] = useState(null); // null=auto | "sim" | "nao"
  // Seções colapsáveis do modal de detalhe
  const [detalheSecDcc,    setDetalheSecDcc]    = useState(true);
  const [detalheSecCteComp,setDetalheSecCteComp]= useState(false);
  const [detalheSecMinDsc, setDetalheSecMinDsc] = useState(true);
  // NFD — Nota de Devolução
  const [nfdAlertOpen, setNfdAlertOpen] = useState(false);
  const [nfdForm, setNfdForm]           = useState({numero:"",valor:"",tipo:"avaria"});
  // Alerta de Ocorrência/RO na chegada do motorista
  const [ocorrChegadaAlert, setOcorrChegadaAlert] = useState(false);

  // Item 4 - Acompanhamento dia a dia da DT
  const [acompDias, setAcompDias] = useState([]);
  const [acompDiaSel, setAcompDiaSel] = useState(null);
  const [acompTexto, setAcompTexto] = useState("");
  const [acompImagens, setAcompImagens] = useState([]);

  // Alerts
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [conexoesOpen, setConexoesOpen] = useState(false);
  const [contatosAdminOpen, setContatosAdminOpen] = useState(false);
  const [gsheetsOpen, setGsheetsOpen] = useState(false);
  const [oauthAccessOpen, setOauthAccessOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);       // último status gravado pelo Apps Script
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [adminEmailVal, setAdminEmailVal] = useState(()=>loadJSON("co_admin_email","yvesfg@gmail.com"));
  const [isMobile, setIsMobile] = useState(()=>window.innerWidth<=600);
  const [isWide,   setIsWide]   = useState(()=>window.innerWidth>=768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(()=>loadJSON("co_sidebar_collapsed",false));
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);
  useEffect(()=>{
    const fn=()=>{setIsMobile(window.innerWidth<=600);setIsWide(window.innerWidth>=768);};
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  useEffect(()=>{ saveJSON("co_sidebar_collapsed", sidebarCollapsed); },[sidebarCollapsed]);

  // Auto-default planilha filters: ano/mês mais recente ao carregar dados
  useEffect(()=>{
    if(!dadosBase||dadosBase.length===0) return;
    const parseYM = s => {
      if(!s) return null;
      if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1]};}
      if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1]};}
      return null;
    };
    const dates = dadosBase.map(r=>parseYM(r.data_carr||r.data_desc||"")).filter(Boolean);
    if(dates.length===0) return;
    dates.sort((a,b)=>a.ano!==b.ano?b.ano.localeCompare(a.ano):b.mes.localeCompare(a.mes));
    const latest = dates[0];
    setPlanilhaFiltroAno(prev=>prev===""?latest.ano:prev);
    setPlanilhaFiltroMes(prev=>prev===""?latest.mes:prev);
  },[dadosBase]);

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
  const [motImportData, setMotImportData] = useState(null); // {novos:[], conflitos:[{atual,import,escolha}], vinculos:[]}
  const [motImportConfirm, setMotImportConfirm] = useState("");
  const [motImportStep, setMotImportStep] = useState(1); // 1=revisão, 2=sugestões de vínculo
  // Sugestão de compatíveis (pós-importação)
  const [motSugestOpen, setMotSugestOpen] = useState(false);
  const [motSugestData, setMotSugestData] = useState([]); // [{mot, reg, placa, aceito}]
  // Seleção em lote
  const [motSelecionados, setMotSelecionados] = useState(new Set());
  const [motExcluirLoteTexto, setMotExcluirLoteTexto] = useState("");
  const [motExcluirLoteOpen, setMotExcluirLoteOpen] = useState(false);
  // Excluir TODOS (admin)
  const [motExcluirTodosOpen, setMotExcluirTodosOpen] = useState(false);
  const [motExcluirTodosTexto, setMotExcluirTodosTexto] = useState("");
  // Paginacao da lista de motoristas
  const [motPagina, setMotPagina] = useState(1);
  // Filtro de prefixos na importacao
  const [motImportPrefOpen, setMotImportPrefOpen] = useState(false);
  const [motImportRaw, setMotImportRaw] = useState([]);
  const [motImportPrefSel, setMotImportPrefSel] = useState(new Set());
  const [motImportPrefBusca, setMotImportPrefBusca] = useState("");
  // Duplicata no cadastro
  const [motDupSugest, setMotDupSugest] = useState(null); // motorista existente similar

  // Segundo WhatsApp — formato documentário (Item 3 sessão 4)
  const [wppModal2, setWppModal2] = useState(null); // {reg, mot}
  const [wpp2Ro, setWpp2Ro] = useState("");
  const [wpp2Obs, setWpp2Obs] = useState(() => loadJSON("co_wpp2_obs_last",""));
  const [wpp2IncluirObs, setWpp2IncluirObs] = useState(false);
  const [wpp2Conflitos, setWpp2Conflitos] = useState([]); // para resolver conflitos de importação

  // Dashboard extras
  const [dashChartType, setDashChartType] = useState("bar"); // bar | pie
  const [dashGroupBy, setDashGroupBy] = useState("mes"); // mes | motorista | destino | status
  const [dashDrillModal, setDashDrillModal] = useState(null); // {type, label, regs}
  const [dashHeroTab, setDashHeroTab] = useState("carr"); // 'carr' | 'cte'

  // ── Aba Operacional ──
  const [operSubTab, setOperSubTab] = useState("sgs");
  const [filtroOcorr, setFiltroOcorr] = useState(null); // null = todos | "SGS" | "Ocorrência" | "Diária/Atraso" | "DCC"
  const [sgsItems, setSgsItems] = useState(() => loadJSON("co_sgs", []));
  const [sgsFormOpen, setSgsFormOpen] = useState(false);
  const [sgsForm, setSgsForm] = useState({numero:"", data_chamado:"", ultimo_retorno:"", descricao:"", dt_rel:"", status:"aberto"});
  const [apontItems, setApontItems] = useState(() => loadJSON("co_aponts", []));
  const [apontFormOpen, setApontFormOpen] = useState(false);
  const [apontLoading, setApontLoading] = useState(false);
  const [apontForm, setApontForm] = useState({
    numero:"", item:"", linha:"", descricao_apontamento:"",
    pedido:"", mes_ref:"", filial:"", valor:"", frs_folha:"",
    tipo:"descarga", dt_rel:"", cidade:"",
    nf_numero:"", data_emissao:"",
    data_apontamento: new Date().toISOString().split("T")[0],
  });

  // ── WhatsApp tipos ──
  const [wppTipoOpen, setWppTipoOpen] = useState(false);
  const [wppFatModal, setWppFatModal] = useState(null); // {reg, mot}
  const [wppPagModal, setWppPagModal] = useState(null); // {reg, mot, tipo:'descarga'|'diarias'}
  const [wppFortes, setWppFortes] = useState(false);
  // DCC Minutas (Diárias) — suporta múltiplas minutas
  const _initDcc = () => [{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}];
  const [wppDccMinutas, setWppDccMinutas] = useState(_initDcc());
  const [wppCteComp, setWppCteComp] = useState({cte:"",mdf:"",mat:""});
  // Minutas Descarga (MAM/MRM) — suporta múltiplas minutas
  const _initDsc = () => [{tipo:"MAM",cte:"",mdf:"",num:""}];
  const [wppDscMinutas, setWppDscMinutas] = useState(_initDsc());
  // SGS: retornos interativos
  const [expandedSgsId, setExpandedSgsId] = useState(null);
  const [sgsRetornoForm, setSgsRetornoForm] = useState({data:"",descricao:""});
  // ── Relatórios PDF ──
  const [relGeralOpen, setRelGeralOpen] = useState(false);
  const [relGeralFrom, setRelGeralFrom] = useState("");
  const [relGeralTo, setRelGeralTo] = useState("");
  const [relGeralMotorista, setRelGeralMotorista] = useState("");
  const [relGeralStatus, setRelGeralStatus] = useState("");
  const [relGeralOrigem, setRelGeralOrigem] = useState("");
  const [relGeralDestino, setRelGeralDestino] = useState("");
  const [relGeralVinculo, setRelGeralVinculo] = useState("");
  const [relGeralSecoes, setRelGeralSecoes] = useState({kpi:true,sumario:true,registros:true,sgs:true,ocorr_dt:true,diarias:false,descargas:false});
  const [relGeralLoading, setRelGeralLoading] = useState(false);
  const [relGeralStatusOper, setRelGeralStatusOper] = useState(""); // filtro por r.status
  const [relMenuOpen, setRelMenuOpen] = useState(false);
  const [relOperOpen, setRelOperOpen] = useState(false);
  const [relOperFrom, setRelOperFrom] = useState("");
  const [relOperTo, setRelOperTo] = useState("");
  const [relOperSecoes, setRelOperSecoes] = useState({sgs:true,apontamentos:true});
  const [relDiariaOpen, setRelDiariaOpen] = useState(false);
  const [relDiariaFrom, setRelDiariaFrom] = useState("");
  const [relDiariaTo, setRelDiariaTo] = useState("");
  const [relDiariaMotorista, setRelDiariaMotorista] = useState("");
  const [relDiariaVinculo, setRelDiariaVinculo] = useState("");
  const [relDiariaStatus, setRelDiariaStatus] = useState("");
  const [relDescargaOpen, setRelDescargaOpen] = useState(false);
  // Planilha Controle Financeiro Descargas
  const [relCtrlDccOpen, setRelCtrlDccOpen] = useState(false);
  const [relCtrlDccFrom, setRelCtrlDccFrom] = useState("");
  const [relCtrlDccTo, setRelCtrlDccTo] = useState("");
  const [auditReport, setAuditReport] = useState(null); // resultado da auditoria de design
  const [relDescargaFrom, setRelDescargaFrom] = useState("");
  const [relDescargaTo, setRelDescargaTo] = useState("");
  const [relDescargaMotorista, setRelDescargaMotorista] = useState("");
  const [relDescargaStatus, setRelDescargaStatus] = useState("");

  // Chart refs
  const chartCarregRef = useRef(null);
  const chartCTERef = useRef(null);
  const chartPieRef = useRef(null);
  const chartAreaRef = useRef(null);
  const chartDonutRef = useRef(null);
  const chartInstances = useRef({c:null,f:null,p:null,a:null,d:null});
  const dashChartItemsRef = useRef([]); // armazena [{label, fullLabel, regs}] para clique

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
  }, [getConexao, dadosExtras, showToast]);

  // Auto-login from session (com expiração de 24h)
  useEffect(() => {
    const s = loadJSON("co_sessao", null);
    if (s?.perfil) {
      const SESSION_TTL = 24 * 3600 * 1000; // 24 horas
      if (s.ts && (Date.now() - s.ts) > SESSION_TTL) {
        localStorage.removeItem("co_sessao");
      } else {
        setPerfil(s.perfil);
        setPerms(s.perms || PERMS_PADRAO[s.perfil] || {});
        setUsuarioLogado(s.nome || s.perfil);
        setAuthed(true);
        return; // sessão válida — não verifica pendentes
      }
    }
    // Verifica se há solicitação de acesso pendente de aprovação
    const pending = loadJSON("co_pending_user", null);
    if (pending?.email) {
      setPendingUserInfo(pending);
      setAguardandoAprovacao(true);
    }
  }, []);

  // Sync on auth
  useEffect(() => {
    if (authed && getConexao()) {
      sincronizar();
      syncUsuariosRemoto();
      carregarAponts();
    }
  }, [authed]);

  // Auto-refresh a cada 15 minutos enquanto logado
  useEffect(() => {
    if (!authed) return;
    const QUINZE_MIN = 15 * 60 * 1000;
    const timer = setInterval(() => {
      if (getConexao()) sincronizar();
    }, QUINZE_MIN);
    return () => clearInterval(timer);
  }, [authed, sincronizar, getConexao]);

  // Reset minutas quando detalheDT muda
  useEffect(() => {
    if (!detalheDT) return;
    const pj = (v, def) => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : def); } catch { return def; } };
    const dccArr = pj(detalheDT.minutas_dcc, [{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}]);
    setDetalheMinDcc(dccArr);
    setDetalheCteComp({cte:detalheDT.cte_comp||"", mdf:detalheDT.mdf_comp||"", mat:detalheDT.mat_comp||""});
    setDetalheMinDsc(pj(detalheDT.minutas_dsc, [{tipo:"MAM",cte:"",mdf:"",num:""}]));
    // Auto-detecta existência de DCC: se alguma minuta tem dados → "sim", senão → null (para usuário informar)
    const hasDcc = dccArr.some(m => m.cte||m.mdf||m.num||m.valor) || !!(detalheDT.cte_comp||detalheDT.mdf_comp);
    setDetalheTemDcc(hasDcc ? "sim" : null);
    // Reset seções colapsáveis
    setDetalheSecDcc(true);
    setDetalheSecCteComp(false);
    setDetalheSecMinDsc(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalheDT?.dt]);

  // Save theme + sincroniza data-theme no <html> para o design system CSS
  useEffect(() => {
    saveJSON("co_theme", theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

    // Admin via OAuth (email configurável — sem hardcode)
    const adminEmailOAuth = loadJSON("co_admin_email","yvesfg@gmail.com").toLowerCase();
    if (adminEmailOAuth && emailOAuth === adminEmailOAuth) {
      const p = "admin"; const pm = {...PERMS_PADRAO.admin};
      setPerfil(p); setPerms(pm); setAuthed(true);
      setUsuarioLogado(nomeOAuth);
      saveJSON("co_sessao", {perfil:p, perms:pm, nome:nomeOAuth, ts:Date.now()});
      showToast(`✅ Login social realizado — bem-vindo, ${nomeOAuth}!`, "ok");
      return;
    }

    // Busca usuário no Supabase (sincronização real)
    if (ENV_SUPA_URL && ENV_SUPA_KEY) {
      supaFetch(ENV_SUPA_URL, ENV_SUPA_KEY, "GET",
        `${TABLE_USUARIOS}?email=eq.${encodeURIComponent(payload.email)}&select=*&limit=1`)
        .then(async data => {
          if (Array.isArray(data) && data.length > 0) {
            const u = data[0];
            // Verifica se usuário ainda está aguardando aprovação
            if (u.status === "pendente") {
              const info = {email: emailOAuth, nome: nomeOAuth};
              saveJSON("co_pending_user", info);
              setPendingUserInfo(info);
              setAguardandoAprovacao(true);
              showToast("⏳ Aguardando aprovação do administrador", "warn");
              return;
            }
            const p = u.perfil || "visualizador";
            const pm = typeof u.perms === "string" ? JSON.parse(u.perms) : (u.perms || {...PERMS_PADRAO[p]});
            setPerfil(p); setPerms(pm); setAuthed(true);
            setUsuarioLogado(u.nome || u.email);
            saveJSON("co_sessao", {perfil:p, perms:pm, nome:u.nome||u.email, ts:Date.now()});
            showToast(`✅ Login social realizado — bem-vindo, ${u.nome||u.email}!`, "ok");
          } else {
            // Usuário novo — registrar como pendente de aprovação
            const info = {email: emailOAuth, nome: nomeOAuth};
            saveJSON("co_pending_user", info);
            setPendingUserInfo(info);
            setAguardandoAprovacao(true);
            showToast("✅ Solicitação registrada! Aguardando aprovação.", "ok");
            // Persiste no Supabase para o admin visualizar
            supaFetch(ENV_SUPA_URL, ENV_SUPA_KEY, "POST",
              `${TABLE_USUARIOS}?on_conflict=email`,
              [{email: emailOAuth, nome: nomeOAuth, perfil: "pendente", status: "pendente",
                perms: JSON.stringify({}), solicitado_em: new Date().toISOString()}]
            ).catch(() => {});
          }
        })
        .catch(() => setAuthMsg({t:"err", m:"❌ Erro ao verificar conta no banco"}));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Roda uma única vez no mount — processa hash OAuth do redirect

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
  // ── Helpers de mapeamento co_apontamentos ──────────────────────────────
  const apontToSupabase = (a) => ({
    apontamento:           a.numero || a.apontamento,
    item:                  a.item   ? parseInt(a.item)  : null,
    linha:                 a.linha  ? parseInt(a.linha) : null,
    descricao_apontamento: a.descricao_apontamento || null,
    pedido:                a.pedido || null,
    valor_rs:              a.valor  ? parseFloat(String(a.valor).replace(",",".")) : null,
    filial:                a.filial || null,
    tipo:                  a.tipo   || "descarga",
    dt_relacionado:        a.dt_rel || a.dt_relacionado || null,
    folha_registro:        a.frs_folha || a.folha_registro || null,
    nf_numero:             a.nf_numero || null,
    data_emissao:          a.data_emissao || null,
    cidade:                a.cidade || null,
    periodo_referente:     a.mes_ref || a.periodo_referente || null,
    data_apontamento:      a.data_apontamento || null,
  });
  const apontFromSupabase = (r) => ({
    id:                    r.id,
    numero:                r.apontamento,
    apontamento:           r.apontamento,
    item:                  r.item   != null ? String(r.item)  : "",
    linha:                 r.linha  != null ? String(r.linha) : "",
    descricao_apontamento: r.descricao_apontamento || "",
    pedido:                r.pedido || "",
    mes_ref:               r.periodo_referente || "",
    periodo_referente:     r.periodo_referente || "",
    filial:                r.filial || "",
    valor:                 r.valor_rs != null ? String(r.valor_rs) : "",
    frs_folha:             r.folha_registro || "",
    folha_registro:        r.folha_registro || "",
    tipo:                  r.tipo || "descarga",
    dt_rel:                r.dt_relacionado || "",
    dt_relacionado:        r.dt_relacionado || "",
    nf_numero:             r.nf_numero || "",
    data_emissao:          r.data_emissao || "",
    cidade:                r.cidade || "",
    data_apontamento:      r.data_apontamento || "",
    criado_em:             r.created_at || "",
    updated_at:            r.updated_at || "",
    status_alerta:         r.status_alerta || false,
  });

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
      const data = await supaFetch(conn.url, conn.key, "GET", `${TABLE_USUARIOS}?select=*`);
      if (Array.isArray(data)) {
        // Separa aprovados de pendentes
        const aprovados = data.filter(u => !u.status || u.status === "aprovado");
        const pendentes = data.filter(u => u.status === "pendente");
        setUsuarios(aprovados);
        saveJSON("co_usuarios_local", aprovados);
        setUsuariosPendentes(pendentes);
      }
    } catch { /* silencioso */ }
  }, [getConexao]);

  // Recarrega apenas os pendentes de aprovação (uso no painel admin)
  const carregarPendentes = useCallback(async () => {
    const conn = getConexao();
    if (!conn) return;
    try {
      const data = await supaFetch(conn.url, conn.key, "GET",
        `${TABLE_USUARIOS}?status=eq.pendente&select=*&order=solicitado_em.desc`);
      if (Array.isArray(data)) setUsuariosPendentes(data);
    } catch { /* silencioso */ }
  }, [getConexao]);

  // ── Ocorrências ──
  const abrirDetalhe = useCallback(async (reg) => {
    setDetalheDT(reg);
    setOcorrencias([]);
    setNovaOcorr("");
    setOcorrListExpanded(false);
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

  // Abre mini-modal de ocorrências a partir da tela de busca (planilha)
  const abrirOcorrModal = useCallback(async (reg) => {
    setOcorrModalDT(reg);
    setOcorrModalList([]);
    setOcorrModalNova("");
    setOcorrModalTipo("info");
    setOcorrModalExpanded(false);
    const local = loadJSON(`co_ocorr_${reg.dt}`, []);
    setOcorrModalList(local);
    const conn = getConexao();
    if (conn) {
      setOcorrModalLoading(true);
      try {
        const data = await supaFetch(conn.url, conn.key, "GET",
          `${TABLE_OCORR}?dt=eq.${encodeURIComponent(reg.dt)}&order=data_hora.asc&select=*`);
        if (Array.isArray(data)) {
          setOcorrModalList(data);
          saveJSON(`co_ocorr_${reg.dt}`, data);
        }
      } catch { /* usa local */ }
      finally { setOcorrModalLoading(false); }
    }
  }, [getConexao]);

  const adicionarOcorrenciaModal = useCallback(async () => {
    if (!ocorrModalNova.trim() || !ocorrModalDT) return;
    const nova = {
      dt: ocorrModalDT.dt,
      data_hora: new Date().toISOString(),
      texto: ocorrModalNova.trim(),
      tipo: ocorrModalTipo,
      usuario: usuarioLogado || perfil || "sistema",
    };
    const updated = [...ocorrModalList, nova];
    setOcorrModalList(updated);
    saveJSON(`co_ocorr_${ocorrModalDT.dt}`, updated);
    setOcorrModalNova("");
    const conn = getConexao();
    if (conn) {
      try { await supaFetch(conn.url, conn.key, "POST", TABLE_OCORR, [nova]); }
      catch { /* silencioso */ }
    }
    showToast("✅ Ocorrência registrada","ok");
  }, [ocorrModalNova, ocorrModalTipo, ocorrModalDT, ocorrModalList, getConexao, usuarioLogado, perfil, showToast]);

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
          if (storedHash) saveJSON("co_admin_senha", storedHash); // espelha localmente
        } catch { /* fallback local */ }
      }
      if (!storedHash) storedHash = loadJSON("co_admin_senha", null);

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
        saveJSON("co_sessao",{perfil:p,perms:pm,nome:"Admin",ts:Date.now()});
        registrarLog("LOGIN", `Admin logou no sistema (admin) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
        setAuthSenha(""); setAuthEmail("");
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
      saveJSON("co_sessao",{perfil:p,perms:pm,nome:found.nome||found.email,ts:Date.now()});
      registrarLog("LOGIN", `${found.nome||found.email} logou no sistema (${p}) · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
      setAuthSenha(""); setAuthEmail("");
    } else {
      // Checar se existe na lista local para dar mensagem correta
      const emailExiste = usuarios.some(u => (u.email||"").toLowerCase() === login);
      setAuthMsg({t:"err",m: emailExiste ? "❌ Senha incorreta" : "❌ Usuário não encontrado"});
      setAuthSenha("");
    }
  };

  const handleLogout = () => {
    registrarLog("LOGOUT", `${usuarioLogado||perfil||"usuário"} saiu do sistema · ${new Date().toLocaleString("pt-BR")}`).catch(()=>{});
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
    // Normaliza origem: remove acentos, split em "-" ou espaço isolado, retorna só cidade
    const normOrigem = (s) => {
      const sem = (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim();
      return sem.split(/\s*[-–]\s*|\s+(?=[A-Z]{2}$)/)[0].trim();
    };
    // Origens fixas: apenas BELEM-PA e IMPERATRIZ-MA (confirmado no Supabase)
    const ORIGENS_PERMITIDAS = [
      { norm: "BELEM",      label: "BELEM-PA" },
      { norm: "IMPERATRIZ", label: "IMPERATRIZ-MA" },
    ];
    // Filtra cidades pelo mês selecionado — mês seletor como origem dos filtros disponíveis
    const mesRegs = dashMes === "todos" ? DADOS : (grupos[dashMes]?.regs || []);
    const cidades = ORIGENS_PERMITIDAS
      .filter(o => mesRegs.some(r => normOrigem(r.origem) === o.norm))
      .map(o => o.norm);

    // Aplica filtros: mês + cidade origem
    let filtrado = dashMes==="todos" ? DADOS : (grupos[dashMes]?.regs||[]);
    if (dashOrigem !== "todos") filtrado = filtrado.filter(r => normOrigem(r.origem) === dashOrigem);

    const dtsU = new Set(filtrado.map(r=>dtBase(r.dt)));
    let cteT = 0; filtrado.forEach(r=>{ const v=parseFloat(r.vl_cte); if(!isNaN(v)) cteT+=v; });
    return { grupos, meses, filtrado, dtsU, cteT, cidades, normOrigem };
  }, [DADOS, dashMes, dashOrigem]);

  // Reset dashOrigem quando o mês selecionado não contém a cidade atual
  useEffect(() => {
    if (dashOrigem !== "todos" && !dashData.cidades.includes(dashOrigem)) {
      setDashOrigem("todos");
    }
  }, [dashMes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diarias data — lógica simplificada Sessão 16:
  // REGRA 1: chegada <= agenda E descarga > agenda → COM DIÁRIA (dias = descarga - agenda)
  // REGRA 2: chegada <= agenda E descarga <= agenda → SEM DIÁRIA (chegou e descarregou no prazo)
  // REGRA 3: chegada > agenda → PERDA DE AGENDA (tipo="atraso"), SEM DIÁRIA
  // REGRA 4: sem chegada → lógica legado (compara agenda vs descarga)
  const diariasData = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const regs = DADOS.filter(r => (r.data_agenda || r.data_desc) && (r.status||"").toUpperCase() === "CARREGADO");
    let ok=0, atraso=0, pend=0;
    const items = regs.map(r => {
      const da = parseData(r.data_agenda);
      const dd = parseData(r.data_desc);
      const dc = parseData(r.chegada);
      let tipo = "pendente", dias = null, temDiaria = false;

      if (da && dc) {
        // Tem data de chegada — aplica regras definitivas
        if (dc <= da) {
          // Chegou NA DATA ou ANTES da agenda
          if (dd && dd > da) {
            // Descarregou DEPOIS da agenda → COM DIÁRIA
            dias = diffDias(da, dd);
            tipo = "diaria"; temDiaria = true;
          } else {
            // Descarregou antes/na agenda ou ainda não descarregou
            tipo = dd ? "sem_diaria" : "pendente";
          }
        } else {
          // Chegou DEPOIS da agenda → PERDA DE AGENDA
          tipo = "atraso"; temDiaria = false;
        }
      } else if (da && dd) {
        // Sem chegada → lógica legado (agenda vs descarga)
        dias = diffDias(da, dd);
        tipo = dias > 0 ? "atraso" : "ok";
      } else if (da && !dd) {
        const dp = diffDias(da, hoje);
        tipo = dp > 0 ? "atraso" : "pendente";
        dias = dp;
      }

      if (tipo==="ok" || tipo==="sem_diaria") ok++;
      else if (tipo==="atraso" || tipo==="diaria") atraso++;
      else pend++;
      return {r, tipo, dias, temDiaria};
    });
    return { items, ok, atraso, pend };
  }, [DADOS]);

  // Descarga data
  // Regra: mostrar todos os registros EXCETO os explicitamente encerrados/cancelados
  // (Diárias usam filtro mais restrito: somente CARREGADO)
  const descargaData = useMemo(() => {
    const dataBusca = new Date(dscData+"T00:00:00");
    const STATUS_EXCLUIR = ["CANCELADO","NO-SHOW","NÃO ACEITE","NAO ACEITE"];
    const naoEncerrado = r => !STATUS_EXCLUIR.includes((r.status||"").toUpperCase().trim());
    // Descarga real = data_desc tem valor que parseData consegue interpretar como data
    // Valores como "AG" (Aguardando) sao ignorados — tratados como vazio
    const temDescReal = r => !!parseData(r.data_desc);
    // Hoje: data_agenda = dscData E sem data descarga real
    const hoje = DADOS.filter(r => {
      if (!naoEncerrado(r)) return false;
      if (temDescReal(r)) return false;
      const da = parseData(r.data_agenda);
      return da && da.toISOString().slice(0,10) === dscData;
    });
    const atrasados = DADOS.filter(r => {
      if (!naoEncerrado(r)) return false;
      const da = parseData(r.data_agenda);
      if (!da || da >= dataBusca) return false;
      return !temDescReal(r);
    }).sort((a,b) => {
      const da = parseData(a.data_agenda), db = parseData(b.data_agenda);
      return da && db ? da-db : 0;
    });
    // Aguardando: chegada preenchida, chegada <= data_agenda, sem data descarga real
    const aguardando = DADOS.filter(r => {
      if (!naoEncerrado(r)) return false;
      if (temDescReal(r)) return false;
      const ch = parseData(r.chegada);
      if (!ch) return false;
      const da = parseData(r.data_agenda);
      if (!da) return false;
      return ch <= da;
    }).sort((a,b) => {
      const ca = parseData(a.chegada), cb = parseData(b.chegada);
      return ca && cb ? ca-cb : 0;
    });
    return { hoje, atrasados, aguardando };
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
    if (chartInstances.current.a) chartInstances.current.a.destroy();
    if (chartInstances.current.d) chartInstances.current.d.destroy();

    // Dados agrupados dinamicamente
    let labelsC, dataC;
    // ── Armazena itens completos para clique interativo ──
    if (dashGroupBy === "mes") {
      labelsC = meses.map(m => {const p=m.split("/"); return MESES_LABEL[+p[0]-1]+"/"+p[1].slice(2);});
      dataC = meses.map(m => grupos[m].regs.length);
      dashChartItemsRef.current = [];
    } else if (dashGroupBy === "motorista") {
      const motMap = {};
      dashData.filtrado.forEach(r => { if (r.nome) motMap[r.nome] = (motMap[r.nome]||0)+1; });
      const sorted = Object.entries(motMap).sort((a,b)=>b[1]-a[1]).slice(0,12);
      labelsC = sorted.map(([k])=>k.split(" ")[0]);
      dataC = sorted.map(([,v])=>v);
      dashChartItemsRef.current = sorted.map(([k,v])=>({label:k.split(" ")[0], fullLabel:k, count:v, regs:dashData.filtrado.filter(r=>r.nome===k)}));
    } else if (dashGroupBy === "destino") {
      const ufMap = {};
      dashData.filtrado.forEach(r => { if (!r.destino) return; const uf=r.destino.split("-").pop().trim().toUpperCase(); if(uf.length===2) ufMap[uf]=(ufMap[uf]||0)+1; });
      const sorted = Object.entries(ufMap).sort((a,b)=>b[1]-a[1]).slice(0,12);
      labelsC = sorted.map(([k])=>k);
      dataC = sorted.map(([,v])=>v);
      dashChartItemsRef.current = sorted.map(([k,v])=>({label:k, fullLabel:k, count:v, regs:dashData.filtrado.filter(r=>{const uf=(r.destino||"").split("-").pop().trim().toUpperCase();return uf===k;})}));
    } else {
      const stMap = {};
      dashData.filtrado.forEach(r => { const s=r.status||"Sem status"; stMap[s]=(stMap[s]||0)+1; });
      const sorted = Object.entries(stMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
      labelsC = sorted.map(([k])=>k);
      dataC = sorted.map(([,v])=>v);
      dashChartItemsRef.current = sorted.map(([k,v])=>({label:k, fullLabel:k, count:v, regs:dashData.filtrado.filter(r=>(r.status||"Sem status")===k)}));
    }

    // Função de clique no gráfico
    const onChartClick = (e, elements) => {
      if (!elements || elements.length === 0 || dashGroupBy === "mes") return;
      const item = dashChartItemsRef.current[elements[0].index];
      if (item) setDashDrillModal({type: dashGroupBy, label: item.fullLabel, regs: item.regs});
    };

    if (dashChartType === "bar" && chartCarregRef.current) {
      chartInstances.current.c = new Chart(chartCarregRef.current, {
        type:"bar", data:{labels:labelsC, datasets:[{label:"Carregamentos",data:dataC,backgroundColor:"rgba(240,185,11,.65)",borderColor:"rgba(240,185,11,1)",borderWidth:1.5,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,onClick:onChartClick,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>dashGroupBy!=="mes"?`${ctx.raw} viagens · toque para detalhes`:`${ctx.raw}`}}},scales:{y:{ticks:{color:tickC},grid:{color:gridC}},x:{ticks:{color:tickC,maxRotation:45},grid:{display:false}}}}
      });
      if (dashGroupBy !== "mes" && chartCarregRef.current) chartCarregRef.current.style.cursor = "pointer";
      else if (chartCarregRef.current) chartCarregRef.current.style.cursor = "default";
    } else if (dashChartType === "pie" && chartPieRef.current) {
      chartInstances.current.p = new Chart(chartPieRef.current, {
        type:"doughnut",
        data:{labels:labelsC, datasets:[{data:dataC,backgroundColor:PIE_COLORS,borderColor:isDark?"#1e2026":"#fff",borderWidth:2}]},
        options:{responsive:true,maintainAspectRatio:false,onClick:onChartClick,plugins:{legend:{display:true,position:"bottom",labels:{color:tickC,padding:10,font:{size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/dataC.reduce((a,b)=>a+b,0)*100)}%)${dashGroupBy!=="mes"?" · clique para detalhes":""}`}}}}
      });
      if (dashGroupBy !== "mes" && chartPieRef.current) chartPieRef.current.style.cursor = "pointer";
    }

    const dcte = meses.map(m => Math.round(grupos[m].cte));
    if (chartCTERef.current && perms.financeiro) {
      const labelsM = meses.map(m => {const p=m.split("/"); return MESES_LABEL[+p[0]-1]+"/"+p[1].slice(2);});
      chartInstances.current.f = new Chart(chartCTERef.current, {
        type:"bar", data:{labels:labelsM, datasets:[{label:"CTE (R$)",data:dcte,backgroundColor:"rgba(2,192,118,.6)",borderColor:"rgba(2,192,118,1)",borderWidth:1.5,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:tickC,callback:v=>"R$"+v.toLocaleString("pt-BR")},grid:{color:gridC}},x:{ticks:{color:tickC},grid:{display:false}}}}
      });
    }
    // ── Area chart (hero card) ──
    if (chartAreaRef.current) {
      const areaLabels = meses.map(m=>{const p=m.split("/"); return MESES_LABEL[+p[0]-1]+"/"+p[1].slice(2);});
      const areaData = dashHeroTab === "cte"
        ? meses.map(m=>Math.round(grupos[m].cte))
        : meses.map(m=>grupos[m].regs.length);
      chartInstances.current.a = new Chart(chartAreaRef.current, {
        type:"line",
        data:{labels:areaLabels,datasets:[{data:areaData,borderColor:"#a855f7",borderWidth:2.5,pointRadius:0,pointHoverRadius:5,pointHoverBackgroundColor:"#a855f7",tension:.4,fill:true,
          backgroundColor:(ctx)=>{
            const c=ctx.chart.ctx, h=ctx.chart.height;
            const g=c.createLinearGradient(0,0,0,h);
            g.addColorStop(0,"rgba(168,85,247,.30)"); g.addColorStop(1,"rgba(168,85,247,0)");
            return g;
          }
        }]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>dashHeroTab==="cte"?"R$ "+ctx.raw.toLocaleString("pt-BR"):ctx.raw+" viagens"}}},
          scales:{
            y:{display:false},
            x:{ticks:{color:tickC,font:{size:10}},grid:{display:false},border:{display:false}}
          }
        }
      });
    }

    // ── Donut status ──
    if (chartDonutRef.current) {
      const stMap={};
      dashData.filtrado.forEach(r=>{const s=(r.status||"Sem Status");stMap[s]=(stMap[s]||0)+1;});
      const sortedSt=Object.entries(stMap).sort((a,b)=>b[1]-a[1]).slice(0,4);
      const DONUT_C=["#a855f7","#ec4899","#ef4444","#22c55e"];
      chartInstances.current.d = new Chart(chartDonutRef.current, {
        type:"doughnut",
        data:{labels:sortedSt.map(([k])=>k),datasets:[{data:sortedSt.map(([,v])=>v),backgroundColor:DONUT_C,borderColor:isDark?"#111119":"#fff",borderWidth:3}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:"55%",plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.parsed}`}}}}
      });
    }

    return () => {
      if (chartInstances.current.c) chartInstances.current.c.destroy();
      if (chartInstances.current.f) chartInstances.current.f.destroy();
      if (chartInstances.current.p) chartInstances.current.p.destroy();
      if (chartInstances.current.a) chartInstances.current.a.destroy();
      if (chartInstances.current.d) chartInstances.current.d.destroy();
    };
  }, [activeTab, dashData, theme, perms.financeiro, dashChartType, dashGroupBy, dashHeroTab]);

  // Save motoristas
  const saveMotoristasLS = (m) => { setMotoristas(m); saveJSON("co_motoristas",m); };

  // Save conexoes
  const saveConexoesLS = (c) => { setConexoes(c); saveJSON("co_conexoes",c); };

  // Supabase upsert
  // Colunas conhecidas do Supabase. Se a tabela não tiver desc_aguardando ainda,
  // o retry remove campos desconhecidos automaticamente para não bloquear o save.
  const SUPA_KNOWN_COLS = [
    "dt","nome","cpf","placa","placa2","placa3","vinculo","origem","destino",
    "data_carr","data_agenda","status","dias",
    "vl_cte","vl_contrato","adiant","saldo","diaria_prev","diaria_pg","vl_cte_comp",
    "cte","mdf","nf","mat","ro","ro_hora","cliente","sgs",
    "chegada","obs_chegada","desc_aguardando","data_desc","obs_descarga","informou_analista","data_manifesto","gerenc","forms","updated_at",
    "data_criacao","minutas_dcc","cte_comp","mdf_comp","mat_comp",
    "obs","sinistro","ocorrencias"
  ];
  const supaUpsert = async (reg) => {
    const conn = getConexao();
    if (!conn) throw new Error("Sem conexão");
    const clean = {...reg}; delete clean._override; delete clean._overrideDT;
    if (!clean.dt) throw new Error("DT obrigatório");
    // Converte strings vazias para null — evita erro 22P02 em campos numéricos do Postgres
    for (const k of Object.keys(clean)) { if (clean[k] === "") clean[k] = null; }
    try {
      await supaFetch(conn.url, conn.key, "POST", TABLE, [clean]);
    } catch(e) {
      // PGRST204: coluna não existe no schema cache → tenta novamente só com colunas conhecidas
      if (e.message && (e.message.includes("PGRST204") || e.message.includes("column") || e.message.includes("schema cache") || e.message.includes("400"))) {
        const safeClean = {};
        for (const k of SUPA_KNOWN_COLS) { if (clean[k] !== undefined) safeClean[k] = clean[k]; }
        await supaFetch(conn.url, conn.key, "POST", TABLE, [safeClean]);
      } else {
        throw e;
      }
    }
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
      // Novo registro: registra data/hora de criação
      if (!reg.data_criacao) reg.data_criacao = new Date().toISOString();
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

  // Delete record
  const deletarRegistro = async (dt) => {
    const newExtras = dadosExtras.filter(x => x._overrideDT !== dt && x.dt !== dt);
    setDadosExtras(newExtras);
    saveJSON("dados_extras", newExtras);
    setDadosBase(prev => prev.filter(r => r.dt !== dt));
    const conn = getConexao();
    if (conn) {
      try {
        await supaFetch(conn.url, conn.key, "DELETE", `${TABLE}?dt=eq.${encodeURIComponent(dt)}`);
        await registrarLog("EXCLUIR_REGISTRO", `DT ${dt} excluido`);
        showToast("🗑️ Registro excluído!", "ok");
      } catch(e) { showToast("⚠️ Excluído local. Sync: "+e.message, "warn"); }
    } else { showToast("🗑️ Registro excluído localmente!", "ok"); }
    setModalOpen(null); setDetalheDT(null);
    setExcluirConfirm(null); setExcluirTexto("");
  };

  // Salva minutas DCC / MAM-MRM no Supabase via PATCH
  const salvarMinutasDetalhe = async () => {
    if (!detalheDT) return;
    const conn = getConexao();
    if (!conn) { showToast("⚠️ Sem conexão","warn"); return; }
    setSalvandoMins(true);
    try {
      const payload = {
        minutas_dcc: JSON.stringify(detalheMinDcc),
        cte_comp:  detalheCteComp.cte||null,
        mdf_comp:  detalheCteComp.mdf||null,
        mat_comp:  detalheCteComp.mat||null,
        minutas_dsc: JSON.stringify(detalheMinDsc),
      };
      await supaFetch(conn.url, conn.key, "PATCH", `${TABLE}?dt=eq.${encodeURIComponent(detalheDT.dt)}`, payload);
      const updated = {...detalheDT, ...payload};
      setDetalheDT(updated);
      setDadosBase(prev => prev.map(r => r.dt === detalheDT.dt ? {...r, ...payload} : r));
      showToast("✅ Documentos salvos!","ok");
    } catch(e) {
      showToast("⚠️ Erro: "+e.message,"warn");
    } finally {
      setSalvandoMins(false);
    }
  };

  // Abre o modal WPP pré-preenchido com minutas salvas no registro
  const abrirWppPagModal = (reg, mot, tipo) => {
    const pj = (v, def) => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : def); } catch { return def; } };
    const dcc = pj(reg?.minutas_dcc, [{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}]);
    const comp = {cte:reg?.cte_comp||"", mdf:reg?.mdf_comp||"", mat:reg?.mat_comp||""};
    const dsc = pj(reg?.minutas_dsc, [{tipo:"MAM",cte:"",mdf:"",num:""}]);
    const temDados = dcc.some(m=>m.cte||m.mdf||m.num) || comp.cte || dsc.some(m=>m.cte||m.mdf||m.num);
    setWppPagModal({reg, mot: mot||null, tipo});
    setWppFortes(temDados);
    setWppDccMinutas(dcc);
    setWppCteComp(comp);
    setWppDscMinutas(dsc);
  };

  const isAdmin = perfil === "admin";
  const canEdit = isAdmin || perms.editar;
  const canFin = perms.financeiro;

  // ══════════════════════════════════════════════
  //  STYLES
  // ══════════════════════════════════════════════
  // Mapeamento de status para cores de borda kanban
  const statusBorderColor = (tipo) => {
    if(tipo==="sem_diaria"||tipo==="ok") return t.verde;
    if(tipo==="diaria"||tipo==="atraso") return t.danger;
    if(tipo==="pendente") return t.ouro;
    return t.borda;
  };

  // ── css: todos os valores de design derivam de DESIGN.* e t.*
  // ── Para alterar globalmente: edite DESIGN no topo do arquivo
  const css = {
    app:       { minHeight:"100vh", background:t.bg, color:t.txt, fontFamily:DESIGN.fnt.b, transition:"background .25s, color .25s" },
    // Topbar — sticky dentro do co-main (desktop) ou fixed no mobile
    header:    { background:t.headerBg, padding:"0 16px", borderBottom:`1px solid ${t.borda}`, position:"sticky", top:0, left:0, right:0, zIndex:90, display:"flex", alignItems:"center", gap:8, height:56, boxShadow:`0 1px 0 ${t.borda}`, transition:"background .25s", flexShrink:0 },
    // Logo flat — sem gradiente, borda dourada sutil define o acento
    logo:      { width:40, height:40, background:t.card2, borderRadius:DESIGN.r.logo, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1px solid ${hexRgb(t.ouro,.28)}` },
    // Botão header — transparente, borda mínima
    hBtn:      { background:"transparent", border:`1px solid ${t.borda2}`, borderRadius:DESIGN.r.sm, padding:"7px 9px", color:t.txt2, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:500, transition:"all .15s" },
    tabBar:    { display:"flex", background:t.headerBg, borderBottom:`1px solid ${t.borda}`, overflow:"visible", padding:"0 12px", gap:2, scrollbarWidth:"none", transition:"background .25s", justifyContent:"space-between" },
    tab:       (a) => ({ flex:"0 0 auto", padding:"13px 16px", fontSize:10, fontWeight:a?700:500, letterSpacing:.5, textTransform:"uppercase", color:a?t.ouro:t.txt2, border:"none", background:"transparent", cursor:"pointer", borderRadius:0, whiteSpace:"nowrap", transition:"all .15s", borderBottom:a?`2px solid ${t.ouro}`:"2px solid transparent", marginBottom:"-1px", display:"flex", alignItems:"center", gap:5 }),
    card:      { background:t.card, borderRadius:DESIGN.r.card, border:`1px solid ${t.borda}`, overflow:"hidden", transition:"all .2s, background .25s, border-color .25s" },
    cardKanban:(c) => ({ background:t.card, borderRadius:DESIGN.r.card, border:`1px solid ${t.borda}`, borderLeft:`3px solid ${c}`, overflow:"visible", transition:"all .2s, background .25s" }),
    // KPI com borda lateral (mais premium que borda superior)
    kpi:       (c) => ({ background:t.card, borderRadius:DESIGN.r.card, padding:"20px 16px", border:`1px solid ${t.borda}`, borderLeft:`3px solid ${c}`, textAlign:"center", cursor:"default", transition:"all .2s, background .25s" }),
    // tile-card colorido — grade WPP, ações em grade
    btnCard:   (c) => ({ background:t.card, borderRadius:DESIGN.r.tile, padding:"14px 10px", border:`1px solid ${t.borda}`, borderTop:`2px solid ${c}`, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6, color:c, fontWeight:700, fontSize:12, fontFamily:DESIGN.fnt.b, cursor:"pointer", transition:"all .15s", lineHeight:1.3 }),
    // Inputs — borda mais definida, sem efeito de blur
    inp:       { background:t.inputBg, border:`1px solid ${t.borda2}`, borderRadius:DESIGN.r.inp, padding:"11px 13px", color:t.txt, fontSize:13, outline:"none", width:"100%", fontFamily:DESIGN.fnt.b, transition:"border-color .15s, background .25s" },
    // Botões — cor sólida (sem gradiente), mais limpos
    // cor do texto adapta ao tema: dark=preto sobre ouro claro / light=branco sobre ouro escuro
    btnGold:   { border:"none", borderRadius:DESIGN.r.btn, padding:"11px 20px", color:theme==="dark"?"#0a0a0a":"#ffffff", fontWeight:700, fontSize:13, letterSpacing:DESIGN.ls.btn, cursor:"pointer", background:t.ouro, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnGreen:  { border:"none", borderRadius:DESIGN.r.btn, padding:"11px 20px", color:"#fff", fontWeight:700, fontSize:13, letterSpacing:DESIGN.ls.btn, cursor:"pointer", background:t.verde, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnOutline:{ borderRadius:DESIGN.r.btn, padding:"10px 18px", color:t.ouro, fontWeight:600, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${hexRgb(t.ouro,.4)}`, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnDanger: { borderRadius:DESIGN.r.btn, padding:"10px 18px", color:t.danger, fontWeight:600, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${hexRgb(t.danger,.3)}`, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    secTitle:  { fontSize:9, textTransform:"uppercase", letterSpacing:DESIGN.ls.label, color:t.ouro, marginBottom:12, fontWeight:700, display:"flex", alignItems:"center", gap:8 },
    badge:     (c,bg,bc) => ({ padding:"2px 8px", borderRadius:DESIGN.r.badge, fontSize:9, fontWeight:700, letterSpacing:DESIGN.ls.badge, textTransform:"uppercase", color:c, background:bg, border:`1px solid ${bc}` }),
    empty:     { textAlign:"center", padding:"48px 20px", color:t.txt2 },
    // Overlay com blur mais pronunciado para foco no modal
    overlay:   { position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.82)", backdropFilter:"blur(14px)", display:"flex", alignItems:"flex-end", justifyContent:"center" },
    // Modal — borda fina define a separação do overlay
    modal:     { width:"100%", maxWidth:520, maxHeight:"94vh", background:t.modalBg, borderRadius:"16px 16px 0 0", border:`1px solid ${t.borda}`, borderBottom:"none", display:"flex", flexDirection:"column", overflow:"hidden", animation:"mslide .26s cubic-bezier(.34,1.1,.64,1)", transition:"background .25s" },
  };

  // ══════════════════════════════════════════════
  //  AUDITORIA DE DESIGN
  //  Detecta estilos fora do padrão DESIGN.*
  //  Acessível via: Admin > Desenvolvimento > Auditar
  //  Ou no console do navegador: auditarDesign()
  // ══════════════════════════════════════════════
  const auditarDesign = React.useCallback(() => {
    const allowedRadii = new Set(Object.values(DESIGN.r));
    const allowedFonts = new Set(Object.values(DESIGN.fnt));
    const violations = [];

    document.querySelectorAll('[style]').forEach(el => {
      // ── Verificação 1: borderRadius fora de DESIGN.r ──
      const br = el.style.borderRadius;
      if (br && !/px\s+/.test(br)) { // ignora "X Y Z W" (canto individual)
        const v = parseInt(br);
        if (v && !allowedRadii.has(v)) {
          const label = (el.textContent||"").trim().slice(0,28)||el.tagName.toLowerCase();
          violations.push({ tipo:"borderRadius", valor:`${v}px`, sugestao:closest(allowedRadii,v), label });
        }
      }
      // ── Verificação 2: fontFamily hardcoded fora de DESIGN.fnt ──
      const ff = el.style.fontFamily;
      if (ff && ff.trim()) {
        const norm = ff.replace(/\s/g,"");
        const inDesign = [...allowedFonts].some(f => norm.includes(f.replace(/\s/g,"").split(",")[0].replace(/'/g,"")));
        if (!inDesign) {
          violations.push({ tipo:"fontFamily", valor:ff.slice(0,40), sugestao:"DESIGN.fnt.h ou DESIGN.fnt.b", label:(el.textContent||"").trim().slice(0,28)||el.tagName.toLowerCase() });
        }
      }
    });

    // Auxiliar: raio mais próximo permitido
    function closest(set, v) {
      let best = null, diff = Infinity;
      set.forEach(r => { if(Math.abs(r-v)<diff){diff=Math.abs(r-v);best=r;} });
      const key = Object.entries(DESIGN.r).find(([,val])=>val===best)?.[0]||"?";
      return `DESIGN.r.${key} (${best}px)`;
    }

    const tipos = {};
    violations.forEach(v => { tipos[v.tipo] = (tipos[v.tipo]||0)+1; });
    const report = {
      timestamp: new Date().toLocaleString("pt-BR"),
      total: violations.length,
      tipos,
      items: violations.slice(0, 30),
    };
    setAuditReport(report);
    // Também acessível pelo console
    if (typeof window !== "undefined") window.__auditReport = report;
    return report;
  }, []);

  // Expor auditarDesign() no console do navegador (somente admin)
  React.useEffect(() => {
    if (perfil === "admin") {
      window.auditarDesign = auditarDesign;
      return () => { try { delete window.auditarDesign; } catch(_){} };
    }
  }, [perfil, auditarDesign]);

  // ══════════════════════════════════════════════
  //  TELA: AGUARDANDO APROVAÇÃO
  // ══════════════════════════════════════════════
  if (aguardandoAprovacao && !authed) {
    return (
      <div style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{position:"absolute",top:16,right:16,...css.hBtn,fontSize:16,padding:"8px 12px",zIndex:10}}>{theme==="dark"?"☀️":"🌙"}</button>
        <div style={{width:"100%",maxWidth:340,background:t.card,border:`1px solid ${t.borda}`,borderRadius:16,padding:"36px 28px",boxShadow:`0 24px 64px ${t.shadow}`,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
          <div style={{fontSize:9,background:hexRgb(t.ouro,.1),border:`1px solid ${hexRgb(t.ouro,.3)}`,color:t.ouro,borderRadius:DESIGN.r.badge,padding:"3px 10px",letterSpacing:DESIGN.ls.label,fontWeight:700,marginBottom:24,textTransform:"uppercase"}}>YFGROUP</div>
          <div style={{width:68,height:68,background:t.card2,borderRadius:DESIGN.r.card,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,border:`1px solid ${hexRgb(t.ouro,.25)}`}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={t.ouro} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:21,letterSpacing:3,color:t.txt,textAlign:"center",lineHeight:1.1,marginBottom:8}}>Aguardando Aprovação</div>
          <div style={{fontSize:12,color:t.txt2,textAlign:"center",marginBottom:10,lineHeight:1.7}}>
            Sua solicitação de acesso foi registrada.<br/>
            Aguarde o administrador liberar seu acesso.
          </div>
          {pendingUserInfo?.email && (
            <div style={{fontSize:11,color:t.ouro,fontWeight:600,marginBottom:22,padding:"7px 14px",background:hexRgb(t.ouro,.07),borderRadius:DESIGN.r.inp,border:`1px solid ${hexRgb(t.ouro,.2)}`}}>
              📧 {pendingUserInfo.email}
            </div>
          )}
          <button onClick={async()=>{
            const conn=getConexao();
            if(!conn){showToast("⚠️ Sem conexão com banco","warn");return;}
            showToast("🔄 Verificando status...","ok");
            try{
              const data=await supaFetch(conn.url,conn.key,"GET",
                `${TABLE_USUARIOS}?email=eq.${encodeURIComponent(pendingUserInfo.email)}&select=*&limit=1`);
              if(Array.isArray(data)&&data.length>0){
                const u=data[0];
                if(u.status!=="pendente"){
                  const p=u.perfil||"visualizador";
                  const pm=typeof u.perms==="string"?JSON.parse(u.perms):(u.perms||{...PERMS_PADRAO[p]});
                  setPerfil(p);setPerms(pm);setAuthed(true);
                  setUsuarioLogado(u.nome||u.email);
                  setAguardandoAprovacao(false);
                  localStorage.removeItem("co_pending_user");
                  saveJSON("co_sessao",{perfil:p,perms:pm,nome:u.nome||u.email,ts:Date.now()});
                  showToast(`✅ Acesso aprovado! Bem-vindo, ${u.nome||u.email}!`,"ok");
                } else {
                  showToast("⏳ Ainda aguardando aprovação...","warn");
                }
              } else {
                showToast("⚠️ Solicitação não encontrada. Tente fazer login novamente.","warn");
              }
            }catch{showToast("❌ Erro ao verificar status","err");}
          }} style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:12,color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10,letterSpacing:.5,fontFamily:"inherit"}}>
            🔄 Verificar Status
          </button>
          <button onClick={()=>{setAguardandoAprovacao(false);localStorage.removeItem("co_pending_user");setPendingUserInfo(null);}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:10,padding:"10px",color:t.txt2,fontSize:12,cursor:"pointer",width:"100%",fontFamily:"inherit"}}>
            ← Voltar ao Login
          </button>
        </div>
        <Toast {...toast} />
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  AUTH SCREEN
  // ══════════════════════════════════════════════
  if (!authed) {
    return (
      <div style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
        <style>{`
          @keyframes logoPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
          input::placeholder{color:${t.txt2}}
        `}</style>

        {/* Acento de fundo — sutil, estático */}
        <div style={{position:"absolute",top:"10%",left:"50%",transform:"translateX(-50%)",width:"600px",height:"300px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.04)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}} />

        {/* Theme toggle */}
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{position:"absolute",top:16,right:16,...css.hBtn,fontSize:16,padding:"8px 12px",zIndex:10}}>
          {theme==="dark"?"☀️":"🌙"}
        </button>

        {/* Card de login */}
        <div style={{width:"100%",maxWidth:360,background:t.card,border:`1px solid ${t.borda}`,borderRadius:20,padding:"40px 32px 32px",boxShadow:`0 32px 80px ${t.shadow}`,display:"flex",flexDirection:"column",alignItems:"center",gap:0,animation:"fadeUp .4s ease-out",position:"relative",zIndex:1}}>

          {/* Ícone caminhão — tile colorido clean */}
          <div style={{width:80,height:80,borderRadius:18,background:"linear-gradient(135deg,#3b7dd8,#5a9ff5)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:22,boxShadow:"0 8px 28px rgba(59,125,216,.38)",animation:"logoPop .4s ease-out",flexShrink:0}}>
            <span style={{fontSize:40,lineHeight:1,userSelect:"none"}}>🚛</span>
          </div>

          {/* Title */}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:3,color:t.txt,textAlign:"center",lineHeight:1.1}}>Controle Operacional</div>
          <div style={{fontSize:10,color:t.txt2,textAlign:"center",marginTop:5,marginBottom:6,letterSpacing:2,textTransform:"uppercase"}}>Logística · Transporte</div>
          <div style={{fontSize:9,background:hexRgb(t.ouro,.1),border:`1px solid ${hexRgb(t.ouro,.3)}`,color:t.ouro,borderRadius:DESIGN.r.badge,padding:"3px 10px",letterSpacing:DESIGN.ls.label,fontWeight:700,marginBottom:28,textTransform:"uppercase"}}>YFGroup</div>

          {/* Auth message */}
          {authMsg && (
            <div style={{padding:"10px 12px",borderRadius:DESIGN.r.inp,fontSize:12,fontWeight:600,textAlign:"center",marginBottom:16,lineHeight:1.5,width:"100%",background:authMsg.t==="err"?hexRgb(t.danger,.08):hexRgb(t.verde,.08),color:authMsg.t==="err"?t.danger:t.verde,border:`1px solid ${authMsg.t==="err"?hexRgb(t.danger,.2):hexRgb(t.verde,.2)}`}}>{authMsg.m}</div>
          )}

          {/* Google button */}
          <button
            onClick={() => iniciarOAuth("google")}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:t.card2,border:`1px solid ${t.borda2}`,borderRadius:DESIGN.r.inp,padding:"14px 12px",cursor:"pointer",fontSize:14,fontWeight:600,color:t.txt,fontFamily:DESIGN.fnt.b,transition:"all .15s",letterSpacing:.3}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=hexRgb(t.ouro,.4);e.currentTarget.style.background=t.bgAlt}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borda2;e.currentTarget.style.background=t.card2}}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
            Continuar com Google
          </button>

          <div style={{fontSize:9,color:t.txt2,textAlign:"center",marginTop:14,lineHeight:1.6,opacity:.6}}>
            Apenas contas autorizadas têm acesso ao sistema.
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
      <div style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:${t.txt2}}`}</style>
        <div style={{width:56,height:56,background:t.card2,borderRadius:DESIGN.r.card,border:`1px solid ${hexRgb(t.ouro,.3)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:14}}>🔑</div>
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
  // ── Ícones SVG Stroke Clean (Opção A) ──
  const svgIco = (a, paths, extra) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={a ? t.ouro : t.txt2} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      style={{display:"block",transition:"stroke .18s",filter:a?"drop-shadow(0 0 5px rgba(240,185,11,.55))":"none"}}
      {...extra}>
      {paths}
    </svg>
  );
  // ── Ícone SVG para o header (16px, cor customizável) ──
  const hIco = (paths, color, size=16, sw=1.8) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color||t.txt2} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{display:"block",flexShrink:0}}>
      {paths}
    </svg>
  );
  const tabs = [
    {k:"dashboard", l:"Dashboard", perm:"dashboard",
      ico:(a)=>svgIco(a,<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>)},
    {k:"planilha", l:"Planilha", perm:"planilha",
      ico:(a)=>svgIco(a,<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></>)},
    {k:"diarias", l:"Diárias", perm:"diarias",
      ico:(a)=>svgIco(a,<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>)},
    {k:"descarga", l:"Descarga", perm:"descarga",
      ico:(a)=>svgIco(a,<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04M12 22V12"/></>)},
    {k:"operacional", l:"Operac.",
      ico:(a)=>svgIco(a,<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>)},
    {k:"motoristas", l:"Motori.",
      ico:(a)=>svgIco(a,<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>)},
    ...(isAdmin ? [{k:"admin", l:"Admin",
      ico:(a)=>svgIco(a,<><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>)}] : []),
    {k:"relatorios", l:"Relatórios",
      ico:(a)=>svgIco(a,<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>)},
    // Buscar — último ícone à direita
    {k:"busca", l:"Buscar",
      ico:(a)=>svgIco(a,<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>)},
  ].filter(tb => !tb.perm || perms[tb.perm] !== false);

  // ══════════════════════════════════════════════════════
  // RELATÓRIOS PDF — gera HTML completo em nova janela
  // ══════════════════════════════════════════════════════
  const relHtmlBase = (titulo, subtitulo, corpo) => {
    const now = new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"});
    const logoBlock = customLogo
      ? `<img src="${customLogo}" style="height:42px;object-fit:contain" />`
      : `<div style="width:44px;height:44px;background:linear-gradient(135deg,#f0b90b,#e5a800);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(240,185,11,.38)"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`;
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=1200">
<title>${titulo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html{width:297mm}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0d1421;color:#1a202c;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact;min-width:900px}
  .page{max-width:1050px;margin:0 auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.3)}
  .header{background:linear-gradient(135deg,#0d1421 0%,#1a2744 60%,#0d1e3a 100%);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .header-brand{display:flex;align-items:center;gap:14px}
  .brand-name{font-size:17px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1.1;font-family:'Segoe UI',Arial,sans-serif}
  .brand-sub{font-size:10px;color:rgba(255,255,255,.45);font-weight:400;margin-top:3px}
  .brand-sub strong{color:#f0b90b;font-weight:700}
  .header-right{text-align:right;color:rgba(255,255,255,.6);font-size:10px;line-height:1.8;flex-shrink:0}
  .header-right strong{color:#f0b90b;font-size:12px;display:block;margin-bottom:2px;font-weight:800;letter-spacing:.5px}
  .subheader{background:linear-gradient(90deg,#f0b90b 0%,#f5cc3c 100%);padding:10px 32px;display:flex;align-items:center;gap:16px;border-bottom:3px solid #d9a50a}
  .subheader-title{font-size:15px;font-weight:900;color:#0a1628;letter-spacing:.8px;text-transform:uppercase}
  .subheader-sub{font-size:10px;color:#5a4200;font-weight:600;margin-top:2px}
  .content{padding:22px 32px}
  .section-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2.5px;color:#fff;margin:20px 0 12px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,#1a3a6b,#2d5aa0);padding:7px 14px;border-radius:6px}
  .section-title::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.2)}
  .kpi-row{display:grid;gap:12px;margin-bottom:8px}
  .kpi-row.cols3{grid-template-columns:repeat(3,1fr)}
  .kpi-row.cols4{grid-template-columns:repeat(4,1fr)}
  .kpi-row.cols5{grid-template-columns:repeat(5,1fr)}
  .kpi{background:#f8faff;border:1.5px solid #dce8ff;border-radius:10px;padding:14px 16px;text-align:center}
  .kpi-val{font-size:22px;font-weight:900;color:#1a3a6b;line-height:1.1;font-variant-numeric:tabular-nums}
  .kpi-lbl{font-size:9px;color:#6b7a99;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-weight:600}
  .kpi.green{border-color:#c3f0da;background:#f0faf5}.kpi.green .kpi-val{color:#0a7a45}
  .kpi.yellow{border-color:#f7e6a0;background:#fffbec}.kpi.yellow .kpi-val{color:#a07000}
  .kpi.red{border-color:#ffd0d0;background:#fff5f5}.kpi.red .kpi-val{color:#c0392b}
  .kpi.blue{border-color:#bcd4ff;background:#f0f5ff}.kpi.blue .kpi-val{color:#1a3a6b}
  table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08)}
  thead tr{background:linear-gradient(90deg,#0a1628,#1a3a6b);color:#fff}
  thead th{padding:9px 10px;text-align:left;font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.08)}
  thead th:last-child{border-right:none}
  tbody tr:nth-child(even){background:#f7f9ff}
  tbody tr:hover{background:#e8f0ff}
  tbody td{padding:7px 10px;border-bottom:1px solid #e8edf5;vertical-align:middle;line-height:1.4}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .badge-ok{background:#d4f5e6;color:#0a7a45}
  .badge-pend{background:#fff3cc;color:#a07000}
  .badge-atraso{background:#ffe0d0;color:#c0392b}
  .badge-diaria{background:#e0e8ff;color:#2c4aab}
  .badge-sem{background:#e8ffe8;color:#0a7a45}
  .dt-chip{background:#1a3a6b;color:#f0b90b;border-radius:5px;padding:2px 7px;font-weight:800;font-size:10px;letter-spacing:1px;font-family:monospace}
  .driver-card{background:linear-gradient(135deg,#f0f5ff,#e8f0ff);border:1.5px solid #bcd4ff;border-radius:12px;padding:20px 24px;margin-bottom:6px;display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center}
  .driver-avatar{width:64px;height:64px;background:linear-gradient(135deg,#1a3a6b,#2d5aa0);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#f0b90b}
  .driver-name{font-size:20px;font-weight:800;color:#0a1628;margin-bottom:4px}
  .driver-info{font-size:10px;color:#4a5568;line-height:2}
  .driver-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#f0b90b22;color:#7a5500;border:1px solid #f0b90b55}
  .trip-row-ok td:first-child{border-left:3px solid #22c55e}
  .trip-row-atraso td:first-child{border-left:3px solid #ef4444}
  .trip-row-diaria td:first-child{border-left:3px solid #3b82f6}
  .trip-row-pend td:first-child{border-left:3px solid #f59e0b}
  .sgs-item{background:#fff8ec;border:1px solid #f5dfa0;border-radius:8px;padding:10px 14px;margin-bottom:6px;display:flex;gap:14px;align-items:flex-start}
  .sgs-num{background:#f0b90b;color:#0a1628;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;white-space:nowrap}
  .sgs-info{font-size:10px;color:#5a4200;line-height:1.8}
  .footer{background:#0a1628;padding:14px 36px;display:flex;align-items:center;justify-content:space-between}
  .footer-txt{color:rgba(255,255,255,.4);font-size:9px}
  .footer-brand{color:#f0b90b;font-size:10px;font-weight:700;letter-spacing:1px}
  .info-box{background:#f0f8ff;border:1.5px solid #bcd4ff;border-radius:8px;padding:12px 16px;font-size:10px;color:#2c4aab;margin-bottom:12px}
  @page{size:landscape;margin:10mm 8mm}
  @media print{
    @page{size:landscape!important;margin:10mm 8mm}
    body{background:#fff}
    .page{box-shadow:none;max-width:100%;width:100%}
    .no-print{display:none!important}
    table{font-size:9px}
    thead th{font-size:8px;padding:6px 6px}
    tbody td{padding:5px 6px}
  }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div class="header-brand">
      ${logoBlock}
      <div>
        <div class="brand-name">CONTROLE OPERACIONAL</div>
        <div class="brand-sub">by <strong>YFGroup</strong> · Imperatriz Logística</div>
      </div>
    </div>
    <div class="header-right">
      <strong>${titulo}</strong>
      ${subtitulo}<br>Gerado em ${now}
    </div>
  </div>
  ${corpo}
  <div class="footer">
    <span class="footer-txt">Documento gerado automaticamente — Controle Operacional · YFGroup</span>
    <span class="footer-brand">YF GROUP LOGÍSTICA</span>
  </div>
</div>
<div class="no-print" style="text-align:center;padding:18px 20px;background:#0d1421;border-top:2px solid #f0b90b22">
  <button onclick="window.print()" style="background:#f0b90b;color:#0a1628;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:1px">IMPRIMIR / SALVAR PDF</button>
  <button onclick="window.close()" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.15);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:10px">Fechar</button>
</div>
</body></html>`;
  };

  const gerarRelatorioMotorista = (mot) => {
    // Mapa DT → tipo de diária (calculado no useMemo diariasData)
    const diariasMap = new Map(diariasData.items.map(item=>[item.r.dt, item.tipo]));
    const viagens = DADOS.filter(r => {
      const nomeMatch = mot.nome && r.nome && r.nome.toUpperCase().trim() === mot.nome.toUpperCase().trim();
      const cpfMatch = mot.cpf && r.cpf && r.cpf.replace(/\D/g,"") === mot.cpf.replace(/\D/g,"");
      return nomeMatch || cpfMatch;
    }).sort((a,b) => {
      const da = a.data_carr||"", db = b.data_carr||"";
      const toSort = s => { if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return `${p[2]}-${p[1]}-${p[0]}`} return s; };
      return toSort(da).localeCompare(toSort(db));
    });
    const totalVlCte = viagens.reduce((s,r)=>s+(parseFloat(r.vl_cte)||0),0);
    const totalContrato = viagens.reduce((s,r)=>s+(parseFloat(r.vl_contrato)||0),0);
    const totalAdiant = viagens.reduce((s,r)=>s+(parseFloat(r.adiant)||0),0);
    const totalSaldo = viagens.reduce((s,r)=>s+(parseFloat(r.saldo)||0),0);
    const comDiaria = viagens.filter(r=>{const tp=diariasMap.get(r.dt)||"";return tp==="diaria"||tp==="atraso";}).length;
    const comSGS = viagens.filter(r=>r.sgs).length;
    const statusCount = {};
    viagens.forEach(r=>{const s=r.status||"—";statusCount[s]=(statusCount[s]||0)+1;});
    const fmt = v => v>0?`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
    const placas = [mot.placa1,mot.placa2,mot.placa3,mot.placa4].filter(Boolean);
    const badgeCor = {diaria:"badge-diaria",sem_diaria:"badge-sem",atraso:"badge-atraso",pendente:"badge-pend",ok:"badge-ok"};
    const statusBadge = s => {
      const m = {diaria:{c:"badge-diaria",l:"Com Diária"},sem_diaria:{c:"badge-sem",l:"Sem Diária"},atraso:{c:"badge-atraso",l:"Perdeu Agenda"},pendente:{c:"badge-pend",l:"Pendente"},ok:{c:"badge-ok",l:"OK"}};
      const x = m[s]||{c:"badge-pend",l:s||"—"};
      return `<span class="badge ${x.c}">${x.l}</span>`;
    };
    const corpo = `
  <div class="subheader">
    <div>
      <div class="subheader-title">📋 Relatório Individual do Motorista</div>
      <div class="subheader-sub">${viagens.length} viagem${viagens.length!==1?"s":""} registrada${viagens.length!==1?"s":""}</div>
    </div>
  </div>
  <div class="content">
    <div class="driver-card">
      <div class="driver-avatar">${(mot.nome||"M")[0].toUpperCase()}</div>
      <div>
        <div class="driver-name">${mot.nome||"—"}</div>
        <div class="driver-info">
          ${mot.cpf?`<span>🪪 CPF: <strong>${mot.cpf}</strong></span>&nbsp;&nbsp;`:""}
          ${mot.tel?`<span>📞 ${mot.tel}</span>&nbsp;&nbsp;`:""}
          ${mot.vinculo?`<span class="driver-badge">${mot.vinculo}</span>&nbsp;&nbsp;`:""}
        </div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          ${placas.map((p,i)=>`<span style="background:${i===0?"#f0b90b22":"#d4f5e6"};color:${i===0?"#7a5500":"#0a7a45"};border:1px solid ${i===0?"#f0b90b55":"#a0e0c0"};border-radius:4px;padding:2px 8px;font-weight:800;font-size:11px;letter-spacing:2px">${p}</span>`).join("")}
        </div>
        ${mot.banco?`<div style="margin-top:4px;font-size:10px;color:#4a5568">🏦 ${mot.banco}${mot.agencia?` · Ag ${mot.agencia}`:""}${mot.conta?` · CC ${mot.conta}`:""}</div>`:""}
        ${mot.pix_tipo?`<div style="margin-top:2px;font-size:10px;color:#2c4aab">PIX ${mot.pix_tipo}: ${mot.pix_chave||"—"}</div>`:""}
      </div>
    </div>
    <div class="section-title">📊 Resumo Financeiro e Operacional</div>
    <div class="kpi-row cols5">
      <div class="kpi blue"><div class="kpi-val">${viagens.length}</div><div class="kpi-lbl">Total Viagens</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalVlCte)}</div><div class="kpi-lbl">Valor CTE Total</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalContrato)}</div><div class="kpi-lbl">Valor Contrato</div></div>
      <div class="kpi ${comDiaria>0?"yellow":"green"}"><div class="kpi-val">${comDiaria}</div><div class="kpi-lbl">Com Diárias</div></div>
      <div class="kpi ${comSGS>0?"red":"green"}"><div class="kpi-val">${comSGS}</div><div class="kpi-lbl">SGS Abertos</div></div>
    </div>
    <div class="section-title">🚛 Histórico de Viagens</div>
    ${viagens.length===0?`<div class="info-box">Nenhuma viagem registrada para este motorista.</div>`:`
    <table>
      <thead><tr>
        <th>DT</th><th>Origem</th><th>Destino</th><th>Carregamento</th><th>Agenda</th>
        <th>Chegada</th><th>Descarga</th><th>Status</th><th>CTE</th><th>Contrato</th><th>Saldo</th><th>SGS</th>
      </tr></thead>
      <tbody>
        ${viagens.map(r=>{
          const tipo = diariasMap.get(r.dt)||"";
          const rowClass = tipo==="diaria"?"trip-row-diaria":tipo==="atraso"?"trip-row-atraso":tipo==="sem_diaria"?"trip-row-ok":"trip-row-pend";
          return `<tr class="${rowClass}">
            <td><span class="dt-chip">${r.dt||"—"}</span></td>
            <td>${r.origem||"—"}</td>
            <td>${r.destino||"—"}</td>
            <td>${r.data_carr||"—"}</td>
            <td>${r.data_agenda||"—"}</td>
            <td>${r.chegada||"—"}</td>
            <td>${r.data_desc||"—"}</td>
            <td>${statusBadge(tipo)}</td>
            <td>${r.vl_cte?`R$ ${parseFloat(r.vl_cte).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
            <td>${r.vl_contrato?`R$ ${parseFloat(r.vl_contrato).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
            <td>${r.saldo?`R$ ${parseFloat(r.saldo).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
            <td>${r.sgs?`<span class="badge badge-atraso">${r.sgs}</span>`:"—"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`}
    ${viagens.some(r=>r.cte||r.mdf||r.nf||r.mat)?`
    <div class="section-title">📄 Documentação das Viagens</div>
    <table>
      <thead><tr><th>DT</th><th>CTE</th><th>MDF</th><th>NF</th><th>MAT</th><th>RO</th><th>Cliente</th><th>Gerenciadora</th></tr></thead>
      <tbody>
        ${viagens.filter(r=>r.cte||r.mdf||r.nf||r.mat).map(r=>`<tr>
          <td><span class="dt-chip">${r.dt||"—"}</span></td>
          <td>${r.cte||"—"}</td><td>${r.mdf||"—"}</td><td>${r.nf||"—"}</td><td>${r.mat||"—"}</td>
          <td>${r.ro||"—"}</td><td>${r.cliente||"—"}</td><td>${r.gerenc||"—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>`:""}
  </div>`;
    const _html = relHtmlBase(`Motorista: ${mot.nome||"—"}`, `Relatório Individual · ${mot.nome||"—"}`, corpo);
    const _blob = new Blob([_html], {type:"text/html;charset=utf-8"});
    const _url  = URL.createObjectURL(_blob);
    window.open(_url, "_blank", "width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_url), 120000);
  };

  // Pré-carrega ocorrências do Supabase para uma lista de DTs antes de gerar o relatório
  const preCarregarOcorrencias = async (dtList) => {
    if (!dtList || dtList.length === 0) return;
    const conn = getConexao();
    if (!conn) return;
    try {
      // Busca todas as ocorrências dos DTs em uma única query (PostgREST IN filter)
      const dtsCod = dtList.map(dt => dt.replace(/'/g,"''")).join(",");
      const data = await supaFetch(conn.url, conn.key, "GET",
        `${TABLE_OCORR}?dt=in.(${encodeURIComponent(dtsCod)})&order=data_hora.asc&select=*`);
      if (Array.isArray(data)) {
        // Agrupa por DT e salva no localStorage
        const porDt = {};
        data.forEach(o => { if(!porDt[o.dt]) porDt[o.dt]=[]; porDt[o.dt].push(o); });
        dtList.forEach(dt => {
          if (porDt[dt]) saveJSON(`co_ocorr_${dt}`, porDt[dt]);
        });
      }
    } catch { /* silencioso — usa cache local se falhar */ }
  };

  const gerarRelatorioGeral = (from, to, filtros={}) => {
    // Mapa DT → tipo de diária (calculado no useMemo diariasData)
    const diariasMapG = new Map(diariasData.items.map(item=>[item.r.dt, item.tipo]));
    const parseD = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const {motorista:fMot="",statusDiaria:fStatus="",statusOper:fStatusOper="",origem:fOrigem="",destino:fDest="",vinculo:fVinc="",secoes:fSecoes={kpi:true,sumario:true,registros:true,sgs:true,ocorr_dt:true,diarias:false,descargas:false}} = filtros;
    // Mapa nome→vínculo para filtro de vínculo
    const motVincMap = new Map(motoristas.map(m=>[m.nome?.toUpperCase()?.trim()||"",m.vinculo||""]));
    const inRange = r => {
      const dateStr = r.data_carr || r.data_desc || r.chegada || "";
      const d = parseD(dateStr);
      if(!d) return !fromD && !toD;
      if(fromD && d < fromD) return false;
      if(toD   && d > toD)   return false;
      return true;
    };
    const regs = DADOS.filter(r => {
      if(!inRange(r)) return false;
      if(fMot && !(r.nome||"").toUpperCase().includes(fMot.toUpperCase())) return false;
      if(fOrigem && !(r.origem||"").toUpperCase().includes(fOrigem.toUpperCase())) return false;
      if(fDest && !(r.destino||"").toUpperCase().includes(fDest.toUpperCase())) return false;
      if(fVinc) { const v = motVincMap.get((r.nome||"").toUpperCase().trim()); if(v!==fVinc) return false; }
      if(fStatus) { const tp=diariasMapG.get(r.dt)||""; if(tp!==fStatus) return false; }
      if(fStatusOper && (r.status||"").toUpperCase().trim()!==fStatusOper.toUpperCase().trim()) return false;
      return true;
    }).sort((a,b)=>{
      const toSort = s => { if(!s)return ""; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return `${p[2]}-${p[1]}-${p[0]}`} return s; };
      return toSort(a.data_carr||"").localeCompare(toSort(b.data_carr||""));
    });
    const motoristasUnicos = new Set(regs.map(r=>r.nome).filter(Boolean));
    const totalCte = regs.reduce((s,r)=>s+(parseFloat(r.vl_cte)||0),0);
    const totalContrato = regs.reduce((s,r)=>s+(parseFloat(r.vl_contrato)||0),0);
    const totalAdiant = regs.reduce((s,r)=>s+(parseFloat(r.adiant)||0),0);
    const totalSaldo = regs.reduce((s,r)=>s+(parseFloat(r.saldo)||0),0);
    const comDiaria = regs.filter(r=>{const tp=diariasMapG.get(r.dt)||"";return tp==="diaria"||tp==="atraso";}).length;
    const comSGS = regs.filter(r=>r.sgs).length;
    // SGS items in range
    const sgsRange = sgsItems.filter(s=>{
      const d = parseD(s.data_chamado||s.ultimo_retorno||"");
      if(!d) return true;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    });
    const fmt = v => v>0?`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
    const periodoStr = fromD||toD ? `${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}` : "Todos os registros";
    const statusBadgeG = tipo => {
      const m = {diaria:{c:"badge-diaria",l:"Com Diária"},sem_diaria:{c:"badge-sem",l:"Sem Diária"},atraso:{c:"badge-atraso",l:"Perdeu Agenda"},pendente:{c:"badge-pend",l:"Pendente"},ok:{c:"badge-ok",l:"OK"}};
      const x = m[tipo]||{c:"badge-pend",l:tipo||"—"};
      return `<span class="badge ${x.c}">${x.l}</span>`;
    };
    // Agrupar por motorista para sumário
    const totalDiariaPrev = regs.reduce((s,r)=>{const tp=diariasMapG.get(r.dt)||"";return(tp==="diaria"||tp==="atraso")?s+(parseFloat(r.diaria_prev)||0):s;},0);
    const totalDiariaPg   = regs.reduce((s,r)=>{const tp=diariasMapG.get(r.dt)||"";return(tp==="diaria"||tp==="atraso")?s+(parseFloat(r.diaria_pg)||0):s;},0);
    const porMotorista = {};
    regs.forEach(r=>{
      const n=r.nome||"—";
      if(!porMotorista[n]) porMotorista[n]={viagens:0,cte:0,diarias:0,diariaPrev:0,diariaPg:0};
      porMotorista[n].viagens++;
      porMotorista[n].cte+=(parseFloat(r.vl_cte)||0);
      const tpG=diariasMapG.get(r.dt)||"";
      if(tpG==="diaria"||tpG==="atraso"){
        porMotorista[n].diarias++;
        porMotorista[n].diariaPrev+=(parseFloat(r.diaria_prev)||0);
        porMotorista[n].diariaPg+=(parseFloat(r.diaria_pg)||0);
      }
    });
    // Filtros ativos para exibição no cabeçalho do relatório
    const filtrosAtivos = [
      fMot?`Motorista: ${fMot}`:"",
      fStatusOper?`Status: ${fStatusOper}`:"",
      fStatus?`Diária: ${({diaria:"Com Diária",sem_diaria:"Sem Diária",atraso:"Perdeu Agenda",pendente:"Pendente"}[fStatus]||fStatus)}`:"",
      fOrigem?`Origem: ${fOrigem}`:"",
      fDest?`Destino: ${fDest}`:"",
      fVinc?`Vínculo: ${fVinc}`:"",
    ].filter(Boolean).join(" · ");
    const statusDistrib = {};
    regs.forEach(r=>{const s=(r.status||"—").trim();statusDistrib[s]=(statusDistrib[s]||0)+1;});
    const statusDistribArr = Object.entries(statusDistrib).sort((a,b)=>b[1]-a[1]);
    const statusOperBadge = s => {
      const map = {CARREGADO:{bg:"#d4f5e6",c:"#0a7a45"},PENDENTE:{bg:"#fff3cc",c:"#a07000"},"EM ABERTO":{bg:"#e0e8ff",c:"#2c4aab"},CANCELADO:{bg:"#ffe0d0",c:"#c0392b"},"NO-SHOW":{bg:"#ffe0d0",c:"#c0392b"},"NÃO ACEITE":{bg:"#ffd0d0",c:"#c0392b"}};
      const st = map[(s||"").toUpperCase()]||{bg:"#f0f0f0",c:"#666"};
      return `<span style="background:${st.bg};color:${st.c};border-radius:4px;padding:2px 7px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.5px">${s||"—"}</span>`;
    };
    const corpo = `
  <div class="subheader">
    <div>
      <div class="subheader-title">Relatório Geral de Operações</div>
      <div class="subheader-sub">Período: ${periodoStr} · ${regs.length} registro${regs.length!==1?"s":""}${filtrosAtivos?` · ${filtrosAtivos}`:""}</div>
    </div>
  </div>
  <div class="content">
    ${fSecoes.kpi!==false?`
    <div class="section-title">Indicadores do Período</div>
    <div class="kpi-row cols4">
      <div class="kpi blue"><div class="kpi-val">${regs.length}</div><div class="kpi-lbl">Total de Viagens</div></div>
      <div class="kpi blue"><div class="kpi-val">${motoristasUnicos.size}</div><div class="kpi-lbl">Motoristas Ativos</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalCte)}</div><div class="kpi-lbl">Valor CTE Total</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalContrato)}</div><div class="kpi-lbl">Valor Contrato</div></div>
    </div>
    <div class="kpi-row cols4">
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalAdiant)}</div><div class="kpi-lbl">Adiantamentos</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:14px">${fmt(totalSaldo)}</div><div class="kpi-lbl">Saldos</div></div>
      <div class="kpi ${comDiaria>0?"yellow":"green"}"><div class="kpi-val">${comDiaria}</div><div class="kpi-lbl">Com Diárias</div></div>
      <div class="kpi ${comSGS>0?"red":"green"}"><div class="kpi-val">${comSGS}</div><div class="kpi-lbl">Ocorr. SGS</div></div>
    </div>
    ${totalDiariaPrev>0||totalDiariaPg>0?`
    <div class="section-title">Financeiro de Diárias</div>
    <div class="kpi-row cols3">
      <div class="kpi red"><div class="kpi-val" style="font-size:15px">${fmt(totalDiariaPrev)}</div><div class="kpi-lbl">Total Devido (Diárias)</div></div>
      <div class="kpi green"><div class="kpi-val" style="font-size:15px">${fmt(totalDiariaPg)}</div><div class="kpi-lbl">Total Pago (Diárias)</div></div>
      <div class="kpi ${(totalDiariaPrev-totalDiariaPg)>0?"red":"green"}"><div class="kpi-val" style="font-size:15px">${fmt(Math.abs(totalDiariaPrev-totalDiariaPg))}</div><div class="kpi-lbl">${(totalDiariaPrev-totalDiariaPg)>0?"A Pagar":"Quitado"}</div></div>
    </div>`:""}`:""}
    ${statusDistribArr.length>1?`
    <div class="section-title">Distribuição por Status Operacional</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      ${statusDistribArr.map(([s,n])=>{
        const pct=Math.round(n/regs.length*100);
        const mapC={CARREGADO:{bg:"#d4f5e6",bar:"#0a7a45",c:"#0a7a45"},PENDENTE:{bg:"#fff3cc",bar:"#f0b90b",c:"#a07000"},"EM ABERTO":{bg:"#e0e8ff",bar:"#3b82f6",c:"#2c4aab"},CANCELADO:{bg:"#ffe0d0",bar:"#ef4444",c:"#c0392b"},"NO-SHOW":{bg:"#ffe0d0",bar:"#ef4444",c:"#c0392b"},"NÃO ACEITE":{bg:"#ffd0d0",bar:"#c0392b",c:"#c0392b"}};
        const cl=mapC[(s||"").toUpperCase()]||{bg:"#f0f0f0",bar:"#aaa",c:"#555"};
        return '<div style="flex:1;min-width:130px;background:'+cl.bg+';border-radius:10px;padding:12px 14px;border:1px solid '+cl.bar+'33"><div style="font-size:18px;font-weight:900;color:'+cl.c+';line-height:1">'+n+'</div><div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:'+cl.c+';opacity:.8;margin:3px 0 6px">'+s+'</div><div style="height:4px;background:rgba(0,0,0,.08);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+cl.bar+';border-radius:2px"></div></div><div style="font-size:8px;color:'+cl.c+';opacity:.7;margin-top:3px">'+pct+'%</div></div>';
      }).join("")}
    </div>`:""}
    ${fSecoes.sumario!==false && Object.keys(porMotorista).length>0?`
    <div class="section-title">Resumo por Motorista</div>
    <table>
      <thead><tr><th>Motorista</th><th>Vínculo</th><th style="text-align:right">Viagens</th><th style="text-align:right">Valor CTE</th><th style="text-align:right">Diárias</th><th style="text-align:right">Devido</th><th style="text-align:right">Pago</th></tr></thead>
      <tbody>
        ${Object.entries(porMotorista).sort((a,b)=>b[1].viagens-a[1].viagens).map(([n,v])=>`<tr>
          <td><strong>${n}</strong></td>
          <td style="font-size:9px;color:#4a5568">${motVincMap.get(n.toUpperCase().trim())||"—"}</td>
          <td style="text-align:right;font-weight:700;color:#1a3a6b">${v.viagens}</td>
          <td style="text-align:right">${v.cte>0?`R$ ${v.cte.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="text-align:right">${v.diarias>0?`<span class="badge badge-diaria">${v.diarias}</span>`:"<span class='badge badge-ok'>0</span>"}</td>
          <td style="text-align:right;color:#c0392b">${v.diariaPrev>0?`R$ ${v.diariaPrev.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="text-align:right;color:#0a7a45">${v.diariaPg>0?`R$ ${v.diariaPg.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>`:""}
    ${fSecoes.registros!==false?`
    <div class="section-title">Todos os Registros no Período</div>
    ${regs.length===0?`<div class="info-box">Nenhum registro encontrado para os filtros selecionados.</div>`:`
    <table>
      <thead><tr>
        <th>ID</th><th>Espelho</th><th>Motorista</th><th>Placa</th><th>Origem</th><th>Destino</th>
        <th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Descarga</th>
        <th>Status Oper.</th><th>Status Diária</th><th>Vl. CTE</th><th>SGS</th><th>RO</th>
      </tr></thead>
      <tbody>
        ${regs.map(r=>{
          const tipo=diariasMapG.get(r.dt)||"";
          const rowClass=tipo==="diaria"?"trip-row-diaria":tipo==="atraso"?"trip-row-atraso":tipo==="sem_diaria"?"trip-row-ok":"trip-row-pend";
          return `<tr class="${rowClass}">
            <td style="font-family:monospace;font-size:9px;color:#6b7a99">${r.id_doc||"—"}</td>
            <td><span class="dt-chip">${r.dt||"—"}</span></td>
            <td><strong>${r.nome||"—"}</strong></td>
            <td style="font-family:monospace;font-size:9px">${r.placa||"—"}</td>
            <td>${r.origem||"—"}</td>
            <td>${r.destino||"—"}</td>
            <td>${r.data_carr||"—"}</td>
            <td>${r.data_agenda||"—"}</td>
            <td>${r.chegada||"—"}</td>
            <td>${r.data_desc||"—"}</td>
            <td>${statusOperBadge(r.status)}</td>
            <td>${statusBadgeG(tipo)}</td>
            <td>${r.vl_cte?`R$ ${parseFloat(r.vl_cte).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
            <td>${r.sgs?`<span class="badge badge-atraso">${r.sgs}</span>`:"—"}</td>
            <td>${r.ro||"—"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`}`:""}
    ${fSecoes.sgs!==false && sgsRange.length>0?`
    <div class="section-title">Ocorrências SGS no Período</div>
    ${sgsRange.map(s=>`<div class="sgs-item">
      <div><span class="sgs-num">SGS ${s.numero||"—"}</span></div>
      <div class="sgs-info">
        <strong style="color:#0a1628">${s.descricao||"—"}</strong><br>
        Abertura: ${s.data_chamado||"—"} · Último Retorno: ${s.ultimo_retorno||"—"}<br>
        Status: <span class="badge ${s.status==="encerrado"?"badge-ok":s.status==="andamento"?"badge-diaria":"badge-atraso"}">${s.status||"aberto"}</span>
        ${s.dt_rel?` · Espelho Relacionado: <span class="dt-chip">${s.dt_rel}</span>`:""}
      </div>
    </div>`).join("")}`:""}
    ${fSecoes.ocorr_dt!==false?(()=>{
      // Ocorrências registradas por DT (localStorage co_ocorr_XX)
      const ocorrDtList = [];
      regs.forEach(r => {
        const ocs = loadJSON(`co_ocorr_${r.dt}`,[]);
        if(ocs.length>0) ocorrDtList.push({r, ocs});
      });
      if(ocorrDtList.length===0) return "";
      return `<div class="section-title">Ocorrências por DT (Acompanhamento)</div>
      <table>
        <thead><tr><th>Espelho</th><th>Motorista</th><th>Tipo</th><th>Data/Hora</th><th>Texto</th><th>Usuário</th></tr></thead>
        <tbody>
          ${ocorrDtList.map(({r,ocs})=>ocs.map(o=>`<tr>
            <td><span class="dt-chip">${r.dt||"—"}</span></td>
            <td style="font-size:10px">${r.nome||"—"}</td>
            <td><span class="badge ${o.tipo==="alerta"?"badge-atraso":o.tipo==="status"?"badge-ok":"badge-pend"}">${o.tipo||"info"}</span></td>
            <td style="font-size:9px;white-space:nowrap">${o.data_hora?new Date(o.data_hora).toLocaleString("pt-BR"):"—"}</td>
            <td style="max-width:280px">${o.texto||"—"}</td>
            <td style="font-size:9px;color:#6b7a99">${o.usuario||"—"}</td>
          </tr>`).join("")).join("")}
        </tbody>
      </table>`;
    })():""}
    ${fSecoes.diarias!==false?(()=>{
      const diariasMapD2 = new Map(diariasData.items.map(i=>[i.r.dt,{tipo:i.tipo,dias:i.dias}]));
      const regsDiaria = regs.filter(r=>{const i=diariasMapD2.get(r.dt);return i&&(i.tipo==="diaria"||i.tipo==="atraso");});
      if(regsDiaria.length===0) return `<div class="section-title">Diárias no Período</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhuma diária registrada no período.</p>`;
      const totD = regsDiaria.reduce((s,r)=>s+(parseFloat(r.diaria_prev)||0),0);
      const totPgD = regsDiaria.reduce((s,r)=>s+(parseFloat(r.diaria_pg)||0),0);
      const fmtD2 = v=>v>0?`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—";
      return `<div class="section-title">Diárias no Período</div>
      <div class="kpi-row cols3" style="margin-bottom:10px">
        <div class="kpi yellow"><div class="kpi-val">${regsDiaria.length}</div><div class="kpi-lbl">Com Diária</div></div>
        <div class="kpi red"><div class="kpi-val" style="font-size:14px">${fmtD2(totD)}</div><div class="kpi-lbl">Total Devido</div></div>
        <div class="kpi green"><div class="kpi-val" style="font-size:14px">${fmtD2(totPgD)}</div><div class="kpi-lbl">Total Pago</div></div>
      </div>
      <table>
        <thead><tr><th>Espelho</th><th>Motorista</th><th>Placa</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Descarga</th><th>Dias</th><th>Diária Prev.</th><th>Diária Paga</th><th>Saldo</th></tr></thead>
        <tbody>
          ${regsDiaria.map(r=>{
            const info=diariasMapD2.get(r.dt)||{};
            return `<tr class="trip-row-diaria">
              <td><span class="dt-chip">${r.dt||"—"}</span></td>
              <td><strong>${r.nome||"—"}</strong></td>
              <td style="font-size:9px;font-family:monospace">${r.placa||"—"}</td>
              <td>${r.data_carr||"—"}</td>
              <td>${r.data_agenda||"—"}</td>
              <td>${r.chegada||"—"}</td>
              <td>${r.data_desc||"—"}</td>
              <td style="text-align:center;font-weight:700">${info.dias!=null?info.dias:"—"}</td>
              <td>${r.diaria_prev?`R$ ${parseFloat(r.diaria_prev).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
              <td>${r.diaria_pg?`R$ ${parseFloat(r.diaria_pg).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
              <td style="font-weight:700;color:${(parseFloat(r.diaria_prev)||0)-(parseFloat(r.diaria_pg)||0)>0?"#c0392b":"#0a7a45"}">${fmtD2((parseFloat(r.diaria_prev)||0)-(parseFloat(r.diaria_pg)||0))}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    })():""}
    ${fSecoes.descargas!==false?(()=>{
      const hojeG = new Date(); hojeG.setHours(0,0,0,0);
      const parseDA = s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);}if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s);return null;};
      const regsDesc = regs.filter(r=>r.data_agenda||r.data_desc);
      if(regsDesc.length===0) return `<div class="section-title">Descargas no Período</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhuma descarga registrada no período.</p>`;
      const descOK=regsDesc.filter(r=>r.data_desc).length;
      const descAtrs=regsDesc.filter(r=>!r.data_desc&&parseDA(r.data_agenda)&&parseDA(r.data_agenda)<hojeG).length;
      const descPend=regsDesc.length-descOK-descAtrs;
      return `<div class="section-title">Descargas no Período</div>
      <div class="kpi-row cols3" style="margin-bottom:10px">
        <div class="kpi green"><div class="kpi-val">${descOK}</div><div class="kpi-lbl">Descarregados</div></div>
        <div class="kpi ${descAtrs>0?"red":"green"}"><div class="kpi-val">${descAtrs}</div><div class="kpi-lbl">Atrasados</div></div>
        <div class="kpi yellow"><div class="kpi-val">${descPend}</div><div class="kpi-lbl">Aguardando</div></div>
      </div>
      <table>
        <thead><tr><th>Espelho</th><th>Motorista</th><th>Destino</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Data Descarga</th><th>Status</th><th>RO</th></tr></thead>
        <tbody>
          ${regsDesc.map(r=>{
            const dd=parseDA(r.data_desc),da=parseDA(r.data_agenda);
            const st=dd?"descarregado":(da&&da<hojeG?"atrasado":"pendente");
            const rc=st==="descarregado"?"trip-row-ok":st==="atrasado"?"trip-row-atraso":"trip-row-pend";
            const sbD=st==="descarregado"?`<span class="badge badge-ok">Descarregado</span>`:st==="atrasado"?`<span class="badge badge-atraso">Atrasado</span>`:`<span class="badge badge-pend">Aguardando</span>`;
            return `<tr class="${rc}">
              <td><span class="dt-chip">${r.dt||"—"}</span></td>
              <td><strong>${r.nome||"—"}</strong></td>
              <td>${r.destino||"—"}</td>
              <td>${r.data_carr||"—"}</td>
              <td>${r.data_agenda||"—"}</td>
              <td>${r.chegada||"—"}</td>
              <td>${r.data_desc||"—"}</td>
              <td>${sbD}</td>
              <td>${r.ro||"—"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    })():""}
  </div>`;
    const _html = relHtmlBase(`Relatório Geral · ${periodoStr}`, periodoStr, corpo);
    const _blob = new Blob([_html], {type:"text/html;charset=utf-8"});
    const _url  = URL.createObjectURL(_blob);
    window.open(_url, "_blank", "width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_url), 120000);
  };

  // ─── RELATÓRIO DE DIÁRIAS ──────────────────────────────────────────────────
  const gerarRelatorioDiarias = (from, to, filtros={}) => {
    const parseD2 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const {motorista:fMot="", vinculo:fVinc="", status:fStatus=""} = filtros;
    const diariasMapD = new Map(diariasData.items.map(i=>[i.r.dt,{tipo:i.tipo,dias:i.dias}]));
    const motVincMapD = new Map(motoristas.map(m=>[m.nome?.toUpperCase()?.trim()||"",m.vinculo||""]));
    const inRangeD = r => {
      const d = parseD2(r.data_carr||r.data_desc||r.data_agenda||"");
      if(!d) return !fromD && !toD;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    };
    const regs = DADOS.filter(r => {
      if(!diariasMapD.has(r.dt)) return false;
      if(!inRangeD(r)) return false;
      const info = diariasMapD.get(r.dt);
      if(fStatus && info.tipo!==fStatus) return false;
      if(fMot && !(r.nome||"").toUpperCase().includes(fMot.toUpperCase())) return false;
      if(fVinc && motVincMapD.get((r.nome||"").toUpperCase().trim())!==fVinc) return false;
      return true;
    }).sort((a,b)=>{const toSortD=s=>{if(!s)return"";if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return`${p[2]}-${p[1]}-${p[0]}`}return s;};return toSortD(a.data_carr||"").localeCompare(toSortD(b.data_carr||""));});
    const comD = regs.filter(r=>{const i=diariasMapD.get(r.dt)||{};return i.tipo==="diaria"||i.tipo==="atraso";});
    const totalDevido = comD.reduce((s,r)=>s+(parseFloat(r.diaria_prev)||0),0);
    const totalPago   = comD.reduce((s,r)=>s+(parseFloat(r.diaria_pg)||0),0);
    const aPagar = totalDevido-totalPago;
    const fmtD = v => `R$ ${Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    const periodoStr = fromD||toD?`${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}`:"Todos os registros";
    const sbD = tipo=>{const m={diaria:{c:"badge-diaria",l:"Com Diária"},sem_diaria:{c:"badge-sem",l:"Sem Diária"},atraso:{c:"badge-atraso",l:"Perdeu Agenda"},pendente:{c:"badge-pend",l:"Pendente"},ok:{c:"badge-ok",l:"OK"}};const x=m[tipo]||{c:"badge-pend",l:tipo||"—"};return`<span class="badge ${x.c}">${x.l}</span>`;};
    const porMotD={};
    comD.forEach(r=>{const n=r.nome||"—";if(!porMotD[n])porMotD[n]={qtd:0,dev:0,pag:0};porMotD[n].qtd++;porMotD[n].dev+=(parseFloat(r.diaria_prev)||0);porMotD[n].pag+=(parseFloat(r.diaria_pg)||0);});
    const corpo=`
  <div class="subheader">
    <div>
      <div class="subheader-title">🛏️ Relatório de Diárias</div>
      <div class="subheader-sub">Período: ${periodoStr} · ${regs.length} registro${regs.length!==1?"s":""} · ${comD.length} com diária</div>
    </div>
  </div>
  <div class="content">
    <div class="section-title">Indicadores Financeiros de Diárias</div>
    <div class="kpi-row cols4">
      <div class="kpi blue"><div class="kpi-val">${regs.length}</div><div class="kpi-lbl">Registros no Período</div></div>
      <div class="kpi ${comD.length>0?"yellow":"green"}"><div class="kpi-val">${comD.length}</div><div class="kpi-lbl">Com Diária</div></div>
      <div class="kpi red"><div class="kpi-val" style="font-size:15px">${fmtD(totalDevido)}</div><div class="kpi-lbl">Total Devido</div></div>
      <div class="kpi green"><div class="kpi-val" style="font-size:15px">${fmtD(totalPago)}</div><div class="kpi-lbl">Total Pago</div></div>
    </div>
    <div class="kpi-row cols3">
      <div class="kpi ${aPagar>0?"red":"green"}"><div class="kpi-val" style="font-size:18px;font-weight:900">${fmtD(aPagar)}</div><div class="kpi-lbl">${aPagar>0?"💰 A Pagar":"✅ Quitado"}</div></div>
      <div class="kpi blue"><div class="kpi-val">${regs.filter(r=>{const i=diariasMapD.get(r.dt)||{};return i.tipo==="sem_diaria";}).length}</div><div class="kpi-lbl">Sem Diária</div></div>
      <div class="kpi"><div class="kpi-val">${regs.filter(r=>{const i=diariasMapD.get(r.dt)||{};return i.tipo==="pendente";}).length}</div><div class="kpi-lbl">Pendentes</div></div>
    </div>
    ${Object.keys(porMotD).length>0?`
    <div class="section-title">Resumo por Motorista</div>
    <table>
      <thead><tr><th>Motorista</th><th>Vínculo</th><th style="text-align:right">Diárias</th><th style="text-align:right">Devido</th><th style="text-align:right">Pago</th><th style="text-align:right">A Pagar</th></tr></thead>
      <tbody>${Object.entries(porMotD).sort((a,b)=>b[1].dev-a[1].dev).map(([n,v])=>`<tr>
        <td><strong>${n}</strong></td>
        <td style="font-size:9px;color:#4a5568">${motVincMapD.get(n.toUpperCase().trim())||"—"}</td>
        <td style="text-align:right;font-weight:700">${v.qtd}</td>
        <td style="text-align:right;color:#c0392b">${v.dev>0?`R$ ${v.dev.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
        <td style="text-align:right;color:#0a7a45">${v.pag>0?`R$ ${v.pag.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
        <td style="text-align:right;font-weight:800;color:${(v.dev-v.pag)>0?"#c0392b":"#0a7a45"}">${fmtD(v.dev-v.pag)}</td>
      </tr>`).join("")}</tbody>
    </table>`:""}
    <div class="section-title">Todos os Registros</div>
    ${regs.length===0?`<div class="info-box">Nenhum registro encontrado para os filtros selecionados.</div>`:`
    <table>
      <thead><tr><th>ID</th><th>Espelho</th><th>Motorista</th><th>Placa</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Descarga</th><th>Status</th><th>Dias</th><th>Devido</th><th>Pago</th><th>A Pagar</th><th>CTE DCC</th><th>MDF DCC</th><th>DCC nº</th><th>Valor DCC</th><th>CTE COMP</th><th>MDF COMP</th><th>MAT COMP</th></tr></thead>
      <tbody>${regs.map(r=>{
        const info=diariasMapD.get(r.dt)||{tipo:"pendente",dias:null};
        const rc=info.tipo==="diaria"?"trip-row-diaria":info.tipo==="atraso"?"trip-row-atraso":info.tipo==="sem_diaria"?"trip-row-ok":"trip-row-pend";
        const temD=info.tipo==="diaria"||info.tipo==="atraso";
        const dev=parseFloat(r.diaria_prev)||0;
        const pag=parseFloat(r.diaria_pg)||0;
        const sal=dev-pag;
        let dccArr=[]; try{dccArr=Array.isArray(r.minutas_dcc)?r.minutas_dcc:(r.minutas_dcc?JSON.parse(r.minutas_dcc):[]);}catch{}
        const dcc0=dccArr[0]||{};
        const moreD=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.cte||""}</span>`).join("");
        const moreMdf=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.mdf||""}</span>`).join("");
        const moreNum=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.num||""}</span>`).join("");
        const moreVal=dccArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.valor||""}</span>`).join("");
        return`<tr class="${rc}">
          <td style="font-family:monospace;font-size:9px;color:#6b7a99">${r.id_doc||"—"}</td>
          <td><span class="dt-chip">${r.dt||"—"}</span></td>
          <td><strong>${r.nome||"—"}</strong></td>
          <td style="font-family:monospace;font-size:9px">${r.placa||"—"}</td>
          <td>${r.data_carr||"—"}</td>
          <td>${r.data_agenda||"—"}</td>
          <td>${r.chegada||"—"}</td>
          <td>${r.data_desc||"—"}</td>
          <td>${sbD(info.tipo)}</td>
          <td style="text-align:center">${info.dias!=null?`<span class="badge badge-atraso">${info.dias}d</span>`:"—"}</td>
          <td style="color:#c0392b;font-weight:700">${temD&&dev>0?`R$ ${dev.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="color:#0a7a45;font-weight:700">${temD&&pag>0?`R$ ${pag.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—"}</td>
          <td style="font-weight:800;color:${sal>0?"#c0392b":"#0a7a45"}">${temD?fmtD(sal):"—"}</td>
          <td style="font-size:9px;font-family:monospace">${dcc0.cte||"—"}${moreD}</td>
          <td style="font-size:9px;font-family:monospace">${dcc0.mdf||"—"}${moreMdf}</td>
          <td style="font-size:9px;font-family:monospace">${dcc0.num||"—"}${moreNum}</td>
          <td style="font-size:9px;color:#c0392b">${dcc0.valor||"—"}${moreVal}</td>
          <td style="font-size:9px;font-family:monospace">${r.cte_comp||"—"}</td>
          <td style="font-size:9px;font-family:monospace">${r.mdf_comp||"—"}</td>
          <td style="font-size:9px;font-family:monospace">${r.mat_comp||"—"}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`}
  </div>`;
    const _htmlD=relHtmlBase(`Relatório de Diárias · ${periodoStr}`,periodoStr,corpo);
    const _blobD=new Blob([_htmlD],{type:"text/html;charset=utf-8"});
    const _urlD=URL.createObjectURL(_blobD);
    window.open(_urlD,"_blank","width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_urlD),120000);
  };

  // ─── RELATÓRIO DE DESCARGAS ────────────────────────────────────────────────
  const gerarRelatorioDescargas = (from, to, filtros={}) => {
    const parseD3 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const hojeD = new Date(); hojeD.setHours(0,0,0,0);
    const {motorista:fMot3="", status:fStatus3=""} = filtros;
    const inRange3 = r => {
      const d = parseD3(r.data_desc||r.data_agenda||r.chegada||"");
      if(!d) return !fromD && !toD;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    };
    const getStatusDsc = r => {
      const dd = parseD3(r.data_desc); const da = parseD3(r.data_agenda);
      if(dd) return "descarregado";
      if(da && da<hojeD) return "atrasado";
      return "pendente";
    };
    const regs = DADOS.filter(r => {
      if(!r.data_agenda && !r.data_desc) return false;
      if(!inRange3(r)) return false;
      if(fMot3 && !(r.nome||"").toUpperCase().includes(fMot3.toUpperCase())) return false;
      if(fStatus3 && getStatusDsc(r)!==fStatus3) return false;
      return true;
    }).sort((a,b)=>{const toSort3=s=>{if(!s)return"";if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return`${p[2]}-${p[1]}-${p[0]}`}return s;};return toSort3(a.data_agenda||"").localeCompare(toSort3(b.data_agenda||""));});
    const descarregados=regs.filter(r=>!!r.data_desc);
    const atrasados=regs.filter(r=>!r.data_desc&&parseD3(r.data_agenda)&&parseD3(r.data_agenda)<hojeD);
    const pendentes=regs.filter(r=>!r.data_desc&&!(parseD3(r.data_agenda)&&parseD3(r.data_agenda)<hojeD));
    const periodoStr=fromD||toD?`${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}`:"Todos os registros";
    const sbDsc=r=>{const s=getStatusDsc(r);if(s==="descarregado")return`<span class="badge badge-ok">Descarregado</span>`;if(s==="atrasado")return`<span class="badge badge-atraso">Atrasado</span>`;return`<span class="badge badge-pend">Aguardando</span>`;};
    const getDias=r=>{const da=parseD3(r.data_agenda);const dd=parseD3(r.data_desc);if(!da)return null;const ref=dd||hojeD;const diff=Math.floor((ref-da)/86400000);return diff>0?diff:null;};
    const txPercDesc = regs.length>0?Math.round(descarregados.length/regs.length*100):0;
    const corpo=`
  <div class="subheader">
    <div>
      <div class="subheader-title">📦 Relatório de Descargas</div>
      <div class="subheader-sub">Período: ${periodoStr} · ${regs.length} registro${regs.length!==1?"s":""} · ${txPercDesc}% descarregados</div>
    </div>
  </div>
  <div class="content">
    <div class="section-title">Indicadores de Descarga</div>
    <div class="kpi-row cols4">
      <div class="kpi blue"><div class="kpi-val">${regs.length}</div><div class="kpi-lbl">Total de Registros</div></div>
      <div class="kpi green"><div class="kpi-val">${descarregados.length}</div><div class="kpi-lbl">Descarregados</div></div>
      <div class="kpi ${atrasados.length>0?"red":"green"}"><div class="kpi-val">${atrasados.length}</div><div class="kpi-lbl">Atrasados</div></div>
      <div class="kpi yellow"><div class="kpi-val">${pendentes.length}</div><div class="kpi-lbl">Aguardando</div></div>
    </div>
    <div class="section-title">Registros de Descarga</div>
    ${regs.length===0?`<div class="info-box">Nenhum registro encontrado para os filtros selecionados.</div>`:`
    <table>
      <thead><tr><th>ID</th><th>Espelho</th><th>Motorista</th><th>Placa</th><th>Origem</th><th>Destino</th><th>Carregamento</th><th>Agenda</th><th>Chegada</th><th>Data Descarga</th><th>Status</th><th>Dias</th><th>RO</th><th>Tipo</th><th>CTE</th><th>MDF</th><th>Nº</th></tr></thead>
      <tbody>${regs.map(r=>{
        const st=getStatusDsc(r);
        const rc=st==="descarregado"?"trip-row-ok":st==="atrasado"?"trip-row-atraso":"trip-row-pend";
        const dias=getDias(r);
        let dscArr=[]; try{dscArr=Array.isArray(r.minutas_dsc)?r.minutas_dsc:(r.minutas_dsc?JSON.parse(r.minutas_dsc):[]);}catch{}
        const dsc0=dscArr[0]||{};
        const moreTyp=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.tipo||""}</span>`).join("");
        const moreCte=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.cte||""}</span>`).join("");
        const moreMdf=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.mdf||""}</span>`).join("");
        const moreNum=dscArr.slice(1).map(m=>`<br/><span style="font-size:8px;color:#888">${m.num||""}</span>`).join("");
        return`<tr class="${rc}">
          <td style="font-family:monospace;font-size:9px;color:#6b7a99">${r.id_doc||"—"}</td>
          <td><span class="dt-chip">${r.dt||"—"}</span></td>
          <td><strong>${r.nome||"—"}</strong></td>
          <td style="font-family:monospace;font-size:9px">${r.placa||"—"}</td>
          <td>${r.origem||"—"}</td>
          <td>${r.destino||"—"}</td>
          <td>${r.data_carr||"—"}</td>
          <td>${r.data_agenda||"—"}</td>
          <td>${r.chegada||"—"}</td>
          <td>${r.data_desc||"—"}</td>
          <td>${sbDsc(r)}</td>
          <td style="text-align:center">${dias!=null?`<span class="badge badge-atraso">${dias}d</span>`:"—"}</td>
          <td>${r.ro||"—"}</td>
          <td style="font-size:9px;font-weight:700;color:#1677ff">${dsc0.tipo||"—"}${moreTyp}</td>
          <td style="font-size:9px;font-family:monospace">${dsc0.cte||"—"}${moreCte}</td>
          <td style="font-size:9px;font-family:monospace">${dsc0.mdf||"—"}${moreMdf}</td>
          <td style="font-size:9px;font-family:monospace">${dsc0.num||"—"}${moreNum}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`}
  </div>`;
    const _htmlDsc=relHtmlBase(`Relatório de Descargas · ${periodoStr}`,periodoStr,corpo);
    const _blobDsc=new Blob([_htmlDsc],{type:"text/html;charset=utf-8"});
    const _urlDsc=URL.createObjectURL(_blobDsc);
    window.open(_urlDsc,"_blank","width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_urlDsc),120000);
  };

  // ─── RELATÓRIO OPERACIONAL (SGS + Apontamentos) ────────────────────────────
  const gerarRelatorioOperacional = (from, to, secoes={sgs:true,apontamentos:true}) => {
    const parseD4 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    if(toD) toD.setHours(23,59,59,999);
    const inRangeOp = (dateStr) => {
      const d = parseD4(dateStr||"");
      if(!d) return !fromD && !toD;
      if(fromD && d<fromD) return false;
      if(toD && d>toD) return false;
      return true;
    };
    const periodoStr4 = fromD||toD ? `${fromD?fromD.toLocaleDateString("pt-BR"):"início"} a ${toD?toD.toLocaleDateString("pt-BR"):"hoje"}` : "Todos os registros";
    // Filtrar SGS
    const sgsOp = sgsItems.filter(s => inRangeOp(s.data_chamado||s.ultimo_retorno||s.criado_em||""));
    // Filtrar Apontamentos
    const apontOp = apontItems.filter(a => inRangeOp(a.criado_em||a.mes_ref||""));
    // Badge de status SGS
    const sgsBadge = s => {
      if(s==="encerrado") return `<span class="badge badge-ok">Encerrado</span>`;
      if(s==="andamento") return `<span class="badge badge-diaria">Em Andamento</span>`;
      return `<span class="badge badge-atraso">Aberto</span>`;
    };
    const fmtVal = v => v?`R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—";
    const corpo4 = `
  <div class="subheader">
    <div>
      <div class="subheader-title">📋 Relatório Operacional</div>
      <div class="subheader-sub">Período: ${periodoStr4} · SGS: ${sgsOp.length} · Apontamentos: ${apontOp.length}</div>
    </div>
  </div>
  <div class="content">
    <div class="section-title">Resumo do Período</div>
    <div class="kpi-row cols3">
      <div class="kpi blue"><div class="kpi-val">${sgsOp.length}</div><div class="kpi-lbl">Chamados SGS</div></div>
      <div class="kpi ${sgsOp.filter(s=>s.status!=="encerrado").length>0?"red":"green"}"><div class="kpi-val">${sgsOp.filter(s=>s.status!=="encerrado").length}</div><div class="kpi-lbl">SGS em Aberto</div></div>
      <div class="kpi yellow"><div class="kpi-val">${apontOp.length}</div><div class="kpi-lbl">Apontamentos</div></div>
    </div>
    ${secoes.sgs!==false && sgsOp.length>0?`
    <div class="section-title">SGS — Chamados de Ocorrência</div>
    <table>
      <thead><tr><th>SGS</th><th>Descrição</th><th>Abertura</th><th>Último Retorno</th><th>Status</th><th>DT Relacionado</th><th>Retornos</th></tr></thead>
      <tbody>
      ${sgsOp.map(s=>{
        const rets = Array.isArray(s.retornos)?s.retornos:[];
        const rc = s.status==="encerrado"?"trip-row-ok":s.status==="andamento"?"trip-row-pend":"trip-row-atraso";
        return `<tr class="${rc}">
          <td><strong>SGS ${s.numero||"—"}</strong></td>
          <td>${s.descricao||"—"}</td>
          <td>${s.data_chamado||"—"}</td>
          <td>${s.ultimo_retorno||"—"}</td>
          <td>${sgsBadge(s.status)}</td>
          <td>${s.dt_rel?`<span class="dt-chip">${s.dt_rel}</span>`:"—"}</td>
          <td style="font-size:9px;max-width:220px">${rets.length>0?rets.map(r=>`<div style="margin-bottom:3px"><strong>${r.data||""}</strong>: ${r.descricao||""}</div>`).join(""):"—"}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>`:secoes.sgs!==false?`<div class="section-title">SGS — Chamados de Ocorrência</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhum chamado SGS no período.</p>`:""}
    ${secoes.apontamentos!==false && apontOp.length>0?`
    <div class="section-title">Apontamentos (Descarga / Stretch)</div>
    <table>
      <thead><tr><th>Nº</th><th>Pedido</th><th>Mês Ref.</th><th>Filial</th><th>Tipo</th><th>FRS · Folha</th><th>Valor</th><th>DT Relacionado</th><th>Cadastrado em</th></tr></thead>
      <tbody>
      ${apontOp.map(a=>{
        const rc = !a.frs_folha?"trip-row-atraso":"trip-row-ok";
        return `<tr class="${rc}">
          <td><strong>${a.numero||"—"}</strong></td>
          <td>${a.pedido||"—"}</td>
          <td>${a.mes_ref||"—"}</td>
          <td>${a.filial||"—"}</td>
          <td>${a.tipo||"—"}</td>
          <td>${a.frs_folha||`<span style="color:#c0392b;font-weight:700">⚠️ PENDENTE</span>`}</td>
          <td>${fmtVal(a.valor)}</td>
          <td>${a.dt_rel?`<span class="dt-chip">${a.dt_rel}</span>`:"—"}</td>
          <td style="font-size:9px">${a.criado_em?new Date(a.criado_em).toLocaleDateString("pt-BR"):"—"}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>`:secoes.apontamentos!==false?`<div class="section-title">Apontamentos</div><p style="color:#666;font-size:11px;margin:8px 0">Nenhum apontamento no período.</p>`:""}
  </div>`;
    const _htmlOp = relHtmlBase(`Relatório Operacional · ${periodoStr4}`, periodoStr4, corpo4);
    const _blobOp = new Blob([_htmlOp],{type:"text/html;charset=utf-8"});
    const _urlOp = URL.createObjectURL(_blobOp);
    window.open(_urlOp,"_blank","width=1200,height=850");
    setTimeout(()=>URL.revokeObjectURL(_urlOp),120000);
  };

  // Classe do co-main muda conforme largura + collapse state
  const coMainCls = `co-main${isWide?(sidebarCollapsed?" co-main--collapsed":""):""}${!isWide?" co-main--mobile":""}`;

  return (
    <div style={css.app} className="co-app-wrap">
      <style>{`
        @keyframes logoPop{from{transform:scale(0) rotate(-20deg)}to{transform:scale(1) rotate(0)}}
        @keyframes mslide{from{transform:translateY(100%)}to{transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:3px}
        input::placeholder,textarea::placeholder{color:${t.txt2}!important}
        input[type=date]{color-scheme:${theme}}
        html{background:${t.bg}!important}
        body{background:${t.bg};overflow-x:hidden;overscroll-behavior-x:none}
        /* ─── Hover lift nos cards ─── */
        .co-card{transition:transform .15s ease,box-shadow .15s ease!important}
        .co-card:hover{transform:translateY(-1px)!important;box-shadow:0 6px 20px rgba(0,0,0,.18)!important}
        /* ─── Press effect nos botões ─── */
        button:active{transform:scale(0.97)!important;transition:transform .07s!important}
        /* ─── Tab hover ─── */
        .co-tab:hover{color:${t.ouro}!important;background:${hexRgb(t.ouro,.04)}!important}
        /* ─── Section divider ─── */
        .sec-divider::after{content:'';flex:1;height:1px;background:${t.borda}}
        /* ─── Input focus ─── */
        input:focus,textarea:focus,select:focus{border-color:${t.ouro}!important;box-shadow:0 0 0 2px ${hexRgb(t.ouro,.1)}!important;outline:none!important}
        /* ─── hBtn hover ─── */
        .co-hbtn:hover{border-color:${t.borda2}!important;color:${t.txt}!important;background:${t.card2}!important}
        /* ─── KPI hover ─── */
        .co-kpi:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.12)!important}
        /* ─── Row table hover ─── */
        .co-tr:hover td{background:${hexRgb(t.ouro,.03)}!important}
        /* ─── Tooltip chip DT ─── */
        .dt-chip{font-family:'Bebas Neue',monospace;font-size:13px;letter-spacing:1.5px;color:${t.ouro};background:${hexRgb(t.ouro,.1)};border:1px solid ${hexRgb(t.ouro,.22)};border-radius:${DESIGN.r.tag}px;padding:2px 8px;font-weight:700}
        /* ════════════════════════════════════════
           LAYOUT SHELL — sidebar + main
        ════════════════════════════════════════ */
        .co-app-wrap{display:flex;min-height:100vh;position:relative}

        /* ── Desktop Sidebar ── */
        .co-sidebar{
          position:fixed;top:0;left:0;bottom:0;z-index:100;
          width:220px;display:flex;flex-direction:column;
          background:${t.headerBg};border-right:1px solid ${t.borda};
          transition:width 200ms ease;overflow:hidden;flex-shrink:0;
        }
        .co-sidebar--collapsed{width:64px}

        .co-sidebar__logo{
          display:flex;align-items:center;gap:10px;
          padding:8px 12px;height:56px;border-bottom:1px solid ${t.borda};
          flex-shrink:0;overflow:hidden;
        }
        .co-sidebar--collapsed .co-sidebar__logo{justify-content:center;padding:8px}
        .co-sidebar__logo-name{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2.5px;color:${t.txt};line-height:1;white-space:nowrap;overflow:hidden}
        .co-sidebar__logo-sub{font-size:8px;color:${t.txt2};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;white-space:nowrap;margin-top:2px}
        .co-sidebar__logo-sub span{color:${t.ouro};font-weight:700}
        .co-sidebar--collapsed .co-sidebar__logo-name,
        .co-sidebar--collapsed .co-sidebar__logo-sub{display:none}

        .co-sidebar__toggle{
          margin-left:auto;flex-shrink:0;
          background:transparent;border:none;cursor:pointer;
          color:${t.txt2};display:flex;align-items:center;justify-content:center;
          padding:4px;border-radius:6px;transition:all .15s;
        }
        .co-sidebar__toggle:hover{background:${t.card2};color:${t.txt}}
        .co-sidebar--collapsed .co-sidebar__toggle{margin-left:0;margin-top:0}

        .co-sidebar__nav{
          flex:1;padding:6px;overflow-y:auto;overflow-x:hidden;
          display:flex;flex-direction:column;gap:2px;scrollbar-width:thin;
        }
        .co-sidebar__item{
          display:flex;align-items:center;gap:10px;
          padding:8px 10px;border-radius:${DESIGN.r.sidebar}px;
          background:transparent;border:none;cursor:pointer;
          color:${t.txt2};font-family:${DESIGN.fnt.b};font-size:12px;font-weight:500;
          text-align:left;width:100%;white-space:nowrap;
          transition:all 180ms ease;min-height:36px;overflow:hidden;
        }
        .co-sidebar__item:hover{background:${hexRgb(t.ouro,.05)};color:${t.txt}}
        .co-sidebar__item--active{background:${hexRgb(t.ouro,.1)};color:${t.ouro}}
        .co-sidebar__item--active .co-sidebar__ico svg{stroke:${t.ouro}}
        .co-sidebar--collapsed .co-sidebar__item{justify-content:center;padding:8px}
        .co-sidebar--collapsed .co-sidebar__item-lbl{display:none}
        .co-sidebar__ico{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:20px;height:20px}
        .co-sidebar__item-lbl{flex:1}

        .co-sidebar__footer{
          padding:8px 6px;border-top:1px solid ${t.borda};
          display:flex;flex-direction:column;gap:3px;flex-shrink:0;
        }
        .co-sidebar--collapsed .co-sidebar__footer{align-items:center}
        .co-sidebar__footer-item{
          display:flex;align-items:center;gap:8px;
          padding:7px 10px;border-radius:${DESIGN.r.sm}px;
          background:transparent;border:none;cursor:pointer;
          color:${t.txt2};font-family:${DESIGN.fnt.b};font-size:11px;font-weight:500;
          text-align:left;width:100%;white-space:nowrap;overflow:hidden;
          transition:all .15s;
        }
        .co-sidebar__footer-item:hover{background:${t.card2};color:${t.txt}}
        .co-sidebar--collapsed .co-sidebar__footer-item{justify-content:center;padding:7px}
        .co-sidebar--collapsed .co-sidebar__footer-lbl{display:none}
        .co-sidebar__user{
          padding:8px 10px;border-radius:${DESIGN.r.sm}px;background:${t.card2};
          border:1px solid ${t.borda};margin-bottom:2px;
          display:flex;align-items:center;gap:8px;overflow:hidden;
        }
        .co-sidebar__user-name{font-size:11px;font-weight:700;color:${t.txt};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .co-sidebar__user-role{font-size:9px;color:${t.txt2};text-transform:uppercase;letter-spacing:.8px}
        .co-sidebar--collapsed .co-sidebar__user-info{display:none}
        .co-sidebar--collapsed .co-sidebar__user{justify-content:center;padding:8px}

        /* ── Main content area (desktop) ── */
        .co-main{display:flex;flex-direction:column;flex:1;min-width:0;min-height:100vh}
        @media(min-width:768px){
          .co-main{margin-left:220px;transition:margin-left 200ms ease}
          .co-main--collapsed{margin-left:64px}
          .co-mobile-nav{display:none!important}
        }
        @media(max-width:767px){
          /* Sidebar sempre visível como mini (icons) no mobile */
          .co-sidebar{display:flex!important;z-index:200;width:64px!important;transition:width 220ms ease}
          .co-sidebar--mob-expanded{width:220px!important;box-shadow:4px 0 28px rgba(0,0,0,.55)}
          /* Icons-only quando não expandido */
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__logo{justify-content:center!important;padding:8px!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__logo-name,
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__logo-sub{display:none!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__toggle{margin-left:0!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__item{justify-content:center!important;padding:8px!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__item-lbl{display:none!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__footer{align-items:center!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__footer-item{justify-content:center!important;padding:7px!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__footer-lbl{display:none!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__user{justify-content:center!important;padding:8px!important}
          .co-sidebar:not(.co-sidebar--mob-expanded) .co-sidebar__user-info{display:none!important}
          /* Main offset para mini-sidebar */
          .co-main{margin-left:0!important}
          .co-main--mobile{margin-left:64px!important}
          /* Remove bottom nav */
          .co-mobile-nav{display:none!important}
        }

        /* ── Mobile Nav (horizontal scroll, Binance-style) ── */
        .co-mobile-nav{
          position:fixed;bottom:0;left:0;right:0;z-index:190;
          display:flex;align-items:stretch;
          overflow-x:auto;overflow-y:hidden;
          height:62px;
          background:${t.headerBg};border-top:1px solid ${t.borda};
          -webkit-overflow-scrolling:touch;scrollbar-width:none;
          padding-bottom:env(safe-area-inset-bottom,0);
          box-shadow:0 -4px 20px ${t.shadow};
        }
        .co-mobile-nav::-webkit-scrollbar{display:none}
        .co-mobile-nav__item{
          flex:1 1 0;min-width:0;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:3px;padding:6px 4px 4px;background:transparent;border:none;
          cursor:pointer;position:relative;transition:all .18s;
          font-family:${DESIGN.fnt.b};color:${t.txt2};
        }
        .co-mobile-nav__item--active{color:${t.ouro}}
        .co-mobile-nav__item--active::before{
          content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
          width:28px;height:2.5px;border-radius:0 0 3px 3px;
          background:${t.ouro};box-shadow:0 0 8px ${hexRgb(t.ouro,.5)};
        }
        .co-mobile-nav__lbl{
          font-size:clamp(6px,2.2vw,9px);font-weight:inherit;
          letter-spacing:.3px;text-transform:uppercase;line-height:1;
          white-space:nowrap;overflow:hidden;max-width:100%;
          transition:color .18s;font-weight:500;
        }
        .co-mobile-nav__item--active .co-mobile-nav__lbl{font-weight:700}

        /* ─── Ajuste do content dentro do co-main ─── */
        .co-content{flex:1;width:100%}

        /* ─── Modal Detalhe Responsivo ─── */
        .co-dt-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.82);backdrop-filter:blur(14px);display:flex;align-items:flex-end;justify-content:center}
        .co-dt-modal{width:100%;max-width:520px;max-height:96vh;background:${t.modalBg};border:1px solid ${t.borda};border-bottom:none;border-radius:16px 16px 0 0;display:flex;flex-direction:column;overflow:hidden;animation:mslide .26s cubic-bezier(.34,1.1,.64,1)}
        .co-dt-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:0}
        .co-dt-close-bar{display:block!important}
        .co-dt-panel{padding:14px;display:flex;flex-direction:column;gap:14px}
        .co-dt-right{padding:14px;display:flex;flex-direction:column;gap:14px}
        .co-dados-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
        .co-min-g4{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
        .co-min-g3{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
        @media(min-width:640px){
          .co-dt-overlay{align-items:center!important}
          .co-dt-modal{max-width:620px;border-radius:20px!important;max-height:90vh!important}
          .co-dados-grid{grid-template-columns:repeat(3,1fr)!important}
          .co-min-g4{grid-template-columns:repeat(3,1fr)!important}
          .co-min-g3{grid-template-columns:repeat(3,1fr)!important}
          .co-dt-close-bar{display:none!important}
        }
        @media(min-width:1024px){
          .co-dt-modal{max-width:900px!important;width:88vw!important;max-height:88vh!important}
          .co-dt-body{flex-direction:row!important;align-items:stretch!important}
          .co-dt-panel{flex:0 0 52%;border-right:1px solid ${t.borda};overflow-y:auto;max-height:calc(88vh - 65px)}
          .co-dt-right{flex:1;overflow-y:auto;max-height:calc(88vh - 65px);border-left:none}
          .co-dados-grid{grid-template-columns:repeat(4,1fr)!important}
          .co-min-g4{grid-template-columns:repeat(4,1fr)!important}
          .co-min-g3{grid-template-columns:repeat(3,1fr)!important}
        }
        @media(min-width:1280px){
          .co-dt-modal{max-width:1060px!important;width:86vw!important}
          .co-dt-panel{flex:0 0 54%}
        }
      `}</style>

      {/* ════════════════════════════════════════════
          SIDEBAR — sempre visível; icons no mobile, expand ao clicar
      ════════════════════════════════════════════ */}
      <aside className={`co-sidebar${isWide&&sidebarCollapsed?" co-sidebar--collapsed":""}${!isWide&&mobileSidebarExpanded?" co-sidebar--mob-expanded":""}`}>
          {/* ── Logo ── */}
          <div className="co-sidebar__logo">
            <div style={{width:36,height:36,borderRadius:DESIGN.r.logo,background:"linear-gradient(145deg,#1a150a,#231c0d)",border:"1px solid rgba(243,186,47,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:4}}>
              <img src={customLogo||DEFAULT_LOGO} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
            </div>
            {(isWide?!sidebarCollapsed:mobileSidebarExpanded) && (
              <div style={{overflow:"hidden",flex:1,minWidth:0}}>
                <div className="co-sidebar__logo-name">CONTROLE OPS</div>
                <div className="co-sidebar__logo-sub">by <span>YFGroup</span></div>
              </div>
            )}
            <button
              className="co-sidebar__toggle"
              onClick={()=>isWide?setSidebarCollapsed(v=>!v):setMobileSidebarExpanded(v=>!v)}
              title={(isWide?sidebarCollapsed:!mobileSidebarExpanded)?"Expandir":"Recolher"}
            >
              {(isWide?sidebarCollapsed:!mobileSidebarExpanded)
                ? hIco(<><polyline points="9 18 15 12 9 6"/></>,t.txt2,14,2)
                : hIco(<><polyline points="15 18 9 12 15 6"/></>,t.txt2,14,2)
              }
            </button>
          </div>

          {/* ── Nav items ── */}
          <nav className="co-sidebar__nav">
            {tabs.map(tb=>{
              const ativo = activeTab===tb.k;
              return (
                <button
                  key={tb.k}
                  className={`co-sidebar__item${ativo?" co-sidebar__item--active":""}`}
                  onClick={()=>{setActiveTab(tb.k);if(!isWide)setMobileSidebarExpanded(false);}}
                  title={(isWide&&sidebarCollapsed)||!isWide?tb.l:undefined}
                >
                  <span className="co-sidebar__ico">
                    {typeof tb.ico==="function" ? tb.ico(ativo) : <span style={{fontSize:18}}>{tb.ico}</span>}
                  </span>
                  <span className="co-sidebar__item-lbl">{tb.l}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Footer — utilitários + usuário ── */}
          <div className="co-sidebar__footer">
            {/* User info */}
            <div className="co-sidebar__user">
              <span style={{flexShrink:0}}>
                {perfil==="admin"
                  ? hIco(<><path d="M2 22l2-10 5 5 3-10 3 10 5-5 2 10z"/><circle cx="4" cy="12" r="1.2" fill={t.ouro} stroke="none"/><circle cx="12" cy="7" r="1.5" fill={t.ouro} stroke="none"/><circle cx="20" cy="12" r="1.2" fill={t.ouro} stroke="none"/></>,t.ouro,16,1.8)
                  : hIco(<><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></>,t.txt2,16,2)
                }
              </span>
              <div className="co-sidebar__user-info">
                <div className="co-sidebar__user-name">{usuarioLogado||perfil}</div>
                <div className="co-sidebar__user-role">{perfil}</div>
              </div>
            </div>

            {/* Sync */}
            <button className="co-sidebar__footer-item co-hbtn" onClick={sincronizar} title={connStatus==="online"?"Sincronizado":connStatus==="syncing"?"Sincronizando…":"Offline"} style={{position:"relative"}}>
              <span style={{flexShrink:0,position:"relative"}}>
                {connStatus==="syncing"
                  ? hIco(<><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></>,t.ouro,14)
                  : hIco(<><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></>,t.txt2,14)
                }
                <span style={{position:"absolute",bottom:-1,right:-1,width:5,height:5,borderRadius:"50%",background:connStatus==="online"?t.verde:connStatus==="syncing"?t.ouro:t.danger}}/>
              </span>
              <span className="co-sidebar__footer-lbl">Sincronizar</span>
            </button>

            {/* Alertas */}
            {alertas.length>0 && (
              <button className="co-sidebar__footer-item" onClick={()=>setAlertasOpen(!alertasOpen)} style={{position:"relative"}}>
                {hIco(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></>,t.danger,14)}
                <span className="co-sidebar__footer-lbl" style={{color:t.danger,fontWeight:700}}>{alertas.length} {alertas.length===1?"alerta":"alertas"}</span>
                <span style={{marginLeft:"auto",background:t.danger,color:"#fff",borderRadius:10,padding:"0 5px",fontSize:9,fontWeight:700,flexShrink:0}}>{alertas.length}</span>
              </button>
            )}

            {/* Relatórios */}
            <div style={{position:"relative"}}>
              <button className="co-sidebar__footer-item" onClick={()=>setRelMenuOpen(v=>!v)} style={{border:`1px solid rgba(240,185,11,.2)`,borderRadius:DESIGN.r.sm}}>
                {hIco(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,t.ouro,14)}
                <span className="co-sidebar__footer-lbl" style={{color:t.ouro}}>Relatórios</span>
              </button>
              {relMenuOpen && (
                <>
                  <div style={{position:"fixed",inset:0,zIndex:199}} onClick={()=>setRelMenuOpen(false)}/>
                  <div style={{position:"absolute",left:"100%",bottom:0,background:t.card,border:`1px solid ${t.borda}`,borderRadius:12,overflow:"hidden",zIndex:200,minWidth:220,boxShadow:`0 8px 28px ${t.shadow}`,animation:"slideUp .15s",marginLeft:4}}>
                    <div style={{padding:"7px 14px",background:`rgba(240,185,11,.07)`,borderBottom:`1px solid ${t.borda}`,fontSize:9,color:t.ouro,fontWeight:700,letterSpacing:.8}}>RELATÓRIOS PDF</div>
                    {[
                      {ico:hIco(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,t.azulLt,14),l:"Geral de Operações",sub:"KPIs, resumo e tabela completa",fn:()=>{setRelMenuOpen(false);setRelGeralOpen(true);}},
                      {ico:hIco(<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>,t.azulLt,14),l:"Operacional",sub:"SGS, Apontamentos e ID Diárias",fn:()=>{setRelMenuOpen(false);setRelOperOpen(true);}},
                      {ico:hIco(<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,t.azulLt,14),l:"Diárias",sub:"Financeiro e status de diárias",fn:()=>{setRelMenuOpen(false);setRelDiariaOpen(true);}},
                      {ico:hIco(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,t.azulLt,14),l:"Descargas",sub:"Agenda, status e atrasos",fn:()=>{setRelMenuOpen(false);setRelDescargaOpen(true);}},
                    ].map((op,i,arr)=>(
                      <button key={op.l} onClick={op.fn} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",background:"transparent",border:"none",borderBottom:i<arr.length-1?`1px solid ${t.borda}`:"none",cursor:"pointer",textAlign:"left",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background=`rgba(240,185,11,.06)`}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{flexShrink:0}}>{op.ico}</span>
                        <div><div style={{fontSize:12,fontWeight:700,color:t.txt}}>{op.l}</div><div style={{fontSize:9,color:t.txt2,marginTop:1}}>{op.sub}</div></div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* WhatsApp */}
            <div style={{position:"relative"}}>
              <button className="co-sidebar__footer-item" onClick={()=>setWppTipoOpen(v=>!v)} style={{border:`1px solid rgba(37,211,102,.2)`,borderRadius:DESIGN.r.sm}}>
                {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </>,"#25D366",14)}
                <span className="co-sidebar__footer-lbl" style={{color:"#25D366"}}>WhatsApp</span>
              </button>
              {wppTipoOpen && (
                <>
                  <div style={{position:"fixed",inset:0,zIndex:199}} onClick={()=>setWppTipoOpen(false)}/>
                  <div style={{position:"absolute",left:"100%",bottom:0,background:t.card,border:`1px solid ${t.borda}`,borderRadius:12,overflow:"hidden",zIndex:200,minWidth:230,boxShadow:`0 8px 28px ${t.shadow}`,animation:"slideUp .2s",marginLeft:4}}>
                    {buscaResult
                      ? <div style={{padding:"7px 14px",background:`rgba(37,211,102,.07)`,borderBottom:`1px solid ${t.borda}`,fontSize:9,color:"#25D366",fontWeight:700}}>DT {buscaResult.dt} · {buscaResult.nome||"—"}</div>
                      : <div style={{padding:"7px 14px",background:`rgba(240,185,11,.07)`,borderBottom:`1px solid ${t.borda}`,fontSize:9,color:t.ouro,fontWeight:700}}>Busque um registro primeiro</div>
                    }
                    {[
                      {k:"faturamento",svg:<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="16" y1="8" x2="8" y2="8"/><line x1="16" y1="12" x2="8" y2="12"/></>,l:"Faturamento",sub:"CTE · MDF · MAT · DT · NF · ID"},
                      {k:"contratacao",svg:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,l:"Contratação",sub:"Modelo completo de pagamento"},
                      {k:"descarga",svg:<><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,l:"Descarga / Stretch",sub:"Solicitar pagamento descarga"},
                      {k:"diarias",svg:<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>,l:"Diárias",sub:"Solicitar pagamento diária"},
                    ].map((op,i,arr)=>(
                      <button key={op.k} onClick={()=>{
                        setWppTipoOpen(false);
                        if(!buscaResult){setActiveTab("busca");showToast("Busque um registro primeiro","warn");return;}
                        const mot=motoristas.find(m=>(buscaResult.cpf&&m.cpf?.replace(/\D/g,"")===buscaResult.cpf?.replace(/\D/g,""))||(buscaResult.nome&&m.nome===buscaResult.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa));
                        if(op.k==="faturamento"){setWppFatModal({reg:buscaResult,mot:mot||null});}
                        else if(op.k==="contratacao"){setWppModal({reg:buscaResult,mot:mot||null});setWppTel((mot?.tel||buscaResult.tel||""));setWppPgto("cheque");setWppValCheque("");setWppValConta("");setWppObs("");}
                        else if(op.k==="descarga"){abrirWppPagModal(buscaResult,mot,"descarga");}
                        else if(op.k==="diarias"){abrirWppPagModal(buscaResult,mot,"diarias");}
                      }} style={{width:"100%",background:"transparent",border:"none",borderBottom:i<arr.length-1?`1px solid ${t.borda}`:"none",padding:"10px 14px",color:t.txt,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10,transition:"background .15s"}}
                        onMouseOver={e=>e.currentTarget.style.background=t.card2}
                        onMouseOut={e=>e.currentTarget.style.background="transparent"}
                      >
                        <div style={{flexShrink:0,width:30,height:30,borderRadius:7,background:"rgba(37,211,102,.08)",border:"1px solid rgba(37,211,102,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(op.svg,"#25D366",14)}</div>
                        <div><div style={{fontWeight:700}}>{op.l}</div><div style={{fontSize:9,color:t.txt2,marginTop:1}}>{op.sub}</div></div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tema */}
            <button className="co-sidebar__footer-item" onClick={()=>setTheme(theme==="dark"?"light":"dark")} title={theme==="dark"?"Tema claro":"Tema escuro"}>
              {theme==="dark"
                ? hIco(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,t.txt2,14)
                : hIco(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,t.txt2,14)
              }
              <span className="co-sidebar__footer-lbl">{theme==="dark"?"Tema Claro":"Tema Escuro"}</span>
            </button>

            {/* Sair */}
            <button className="co-sidebar__footer-item" onClick={handleLogout} title="Sair">
              {hIco(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,t.txt2,14)}
              <span className="co-sidebar__footer-lbl">Sair</span>
            </button>
          </div>
      </aside>

      {/* Scrim mobile — fecha sidebar ao clicar fora */}
      {!isWide && mobileSidebarExpanded && (
        <div style={{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.52)",backdropFilter:"blur(1px)"}}
          onClick={()=>setMobileSidebarExpanded(false)}
        />
      )}

      {/* ════════════════════════════════════════════
          MAIN COLUMN — topbar + conteúdo
      ════════════════════════════════════════════ */}
      <div className={coMainCls}>

      {/* TOPBAR — sticky dentro do co-main */}
      <div style={css.header}>
        {isWide ? (
          /* ── Desktop topbar: título da aba + status + alertas ── */
          <>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:t.txt,lineHeight:1}}>
                {tabs.find(tb=>tb.k===activeTab)?.l||"Dashboard"}
              </div>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:.8,padding:"2px 8px",borderRadius:DESIGN.r.badge,
                background:connStatus==="online"?`rgba(34,197,94,.12)`:connStatus==="syncing"?`rgba(240,185,11,.12)`:`rgba(239,68,68,.12)`,
                color:connStatus==="online"?t.verde:connStatus==="syncing"?t.ouro:t.danger,
                border:`1px solid ${connStatus==="online"?`rgba(34,197,94,.3)`:connStatus==="syncing"?`rgba(240,185,11,.3)`:`rgba(239,68,68,.3)`}`,
                textTransform:"uppercase",
              }}>
                {connStatus==="online"?"Online":connStatus==="syncing"?"Sincronizando":"Offline"}
              </span>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5}}>
              {alertas.length > 0 && (
                <button onClick={()=>setAlertasOpen(!alertasOpen)} style={{...css.hBtn,borderColor:"rgba(246,70,93,.4)",position:"relative",padding:"7px 9px",overflow:"visible"}}>
                  {hIco(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></>,t.danger,15)}
                  <span style={{position:"absolute",top:-2,right:-2,background:t.danger,color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${t.bg}`}}>{alertas.length}</span>
                </button>
              )}
              {canEdit && (
                <button onClick={()=>{setFormData({});setEditIdx(-1);setEditStep(1);setModalOpen("edit")}} style={{...css.btnGold,padding:"8px 16px",fontSize:12,gap:6}}>
                  {hIco(<><path d="M12 5v14M5 12h14"/></>,theme==="dark"?"#000":"#fff",14,2.5)} Nova DT
                </button>
              )}
            </div>
          </>
        ) : (
          /* ── Mobile topbar: aba ativa + ações ── */
          <>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,color:t.txt,lineHeight:1}}>{tabs.find(tb=>tb.k===activeTab)?.l||"Dashboard"}</div>
              <div style={{fontSize:8,color:t.txt2,letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>CONTROLE OPS · <span style={{color:t.ouro}}>YFGroup</span></div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
              <div title={usuarioLogado||perfil} style={{...css.hBtn,borderColor:perfil==="admin"?`rgba(240,185,11,.45)`:t.borda,color:perfil==="admin"?t.ouro:t.txt2,padding:"6px 7px",background:perfil==="admin"?`rgba(240,185,11,.07)`:"transparent"}}>
                {perfil==="admin"
                  ? hIco(<><path d="M2 22l2-10 5 5 3-10 3 10 5-5 2 10z"/><circle cx="4" cy="12" r="1.2" fill={t.ouro} stroke="none"/><circle cx="12" cy="7" r="1.5" fill={t.ouro} stroke="none"/><circle cx="20" cy="12" r="1.2" fill={t.ouro} stroke="none"/></>,t.ouro,14,1.8)
                  : hIco(<><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></>,t.txt2,13,2)
                }
              </div>
              <button onClick={sincronizar} className="co-hbtn" style={{...css.hBtn,padding:"6px 7px",position:"relative"}}>
                {connStatus==="syncing"
                  ? hIco(<><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></>,t.ouro,13)
                  : hIco(<><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></>,t.txt2,13)
                }
                <span style={{position:"absolute",bottom:4,right:4,width:4,height:4,borderRadius:"50%",background:connStatus==="online"?t.verde:connStatus==="syncing"?t.ouro:t.danger}}/>
              </button>
              {alertas.length > 0 && (
                <button onClick={()=>setAlertasOpen(!alertasOpen)} style={{...css.hBtn,borderColor:"rgba(246,70,93,.4)",position:"relative",padding:"6px 7px"}}>
                  {hIco(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></>,t.danger,13)}
                  <span style={{position:"absolute",top:-2,right:-2,background:t.danger,color:"#fff",borderRadius:"50%",width:15,height:15,fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${t.bg}`}}>{alertas.length}</span>
                </button>
              )}
              <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{...css.hBtn,padding:"6px 7px"}}>
                {theme==="dark"
                  ? hIco(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,t.txt2,13)
                  : hIco(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,t.txt2,13)
                }
              </button>
              {/* Relatórios mobile */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setRelMenuOpen(v=>!v)} style={{...css.hBtn,border:`1.5px solid rgba(240,185,11,.3)`,padding:"6px 7px"}}>
                  {hIco(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,t.ouro,13)}
                </button>
                {relMenuOpen && (
                  <>
                    <div style={{position:"fixed",inset:0,zIndex:199}} onClick={()=>setRelMenuOpen(false)}/>
                    <div style={{position:"absolute",right:0,top:"110%",background:t.card,border:`1px solid ${t.borda}`,borderRadius:12,overflow:"hidden",zIndex:200,minWidth:220,boxShadow:`0 8px 28px ${t.shadow}`,animation:"slideUp .15s"}}>
                      <div style={{padding:"7px 14px",background:`rgba(240,185,11,.07)`,borderBottom:`1px solid ${t.borda}`,fontSize:9,color:t.ouro,fontWeight:700,letterSpacing:.8}}>RELATÓRIOS PDF</div>
                      {[
                        {l:"Geral de Operações",fn:()=>{setRelMenuOpen(false);setRelGeralOpen(true);}},
                        {l:"Operacional",fn:()=>{setRelMenuOpen(false);setRelOperOpen(true);}},
                        {l:"Diárias",fn:()=>{setRelMenuOpen(false);setRelDiariaOpen(true);}},
                        {l:"Descargas",fn:()=>{setRelMenuOpen(false);setRelDescargaOpen(true);}},
                      ].map((op,i,arr)=>(
                        <button key={op.l} onClick={op.fn} style={{display:"flex",alignItems:"center",width:"100%",padding:"10px 14px",background:"transparent",border:"none",borderBottom:i<arr.length-1?`1px solid ${t.borda}`:"none",cursor:"pointer",textAlign:"left",transition:"background .15s",fontSize:12,fontWeight:600,color:t.txt,fontFamily:"inherit"}}
                          onMouseEnter={e=>e.currentTarget.style.background=`rgba(240,185,11,.06)`}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          {op.l}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* WhatsApp mobile */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setWppTipoOpen(v=>!v)} style={{...css.hBtn,border:`1.5px solid rgba(37,211,102,.3)`,padding:"6px 7px"}}>
                  {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </>,"#25D366",13)}
                </button>
                {wppTipoOpen && (
                  <>
                    <div style={{position:"fixed",inset:0,zIndex:199}} onClick={()=>setWppTipoOpen(false)}/>
                    <div style={{position:"absolute",right:0,top:"110%",background:t.card,border:`1px solid ${t.borda}`,borderRadius:12,overflow:"hidden",zIndex:200,minWidth:230,boxShadow:`0 8px 28px ${t.shadow}`,animation:"slideUp .2s"}}>
                      {buscaResult
                        ? <div style={{padding:"7px 14px",background:`rgba(37,211,102,.07)`,borderBottom:`1px solid ${t.borda}`,fontSize:9,color:"#25D366",fontWeight:700}}>DT {buscaResult.dt} · {buscaResult.nome||"—"}</div>
                        : <div style={{padding:"7px 14px",background:`rgba(240,185,11,.07)`,borderBottom:`1px solid ${t.borda}`,fontSize:9,color:t.ouro,fontWeight:700}}>Busque um registro primeiro</div>
                      }
                      {[
                        {k:"faturamento",svg:<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="16" y1="8" x2="8" y2="8"/><line x1="16" y1="12" x2="8" y2="12"/></>,l:"Faturamento",sub:"CTE · MDF · MAT"},
                        {k:"contratacao",svg:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,l:"Contratação",sub:"Modelo de pagamento"},
                        {k:"descarga",svg:<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,l:"Descarga / Stretch",sub:"Solicitar pagamento"},
                        {k:"diarias",svg:<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>,l:"Diárias",sub:"Solicitar pagamento"},
                      ].map((op,i,arr)=>(
                        <button key={op.k} onClick={()=>{
                          setWppTipoOpen(false);
                          if(!buscaResult){setActiveTab("busca");showToast("Busque um registro primeiro","warn");return;}
                          const mot=motoristas.find(m=>(buscaResult.cpf&&m.cpf?.replace(/\D/g,"")===buscaResult.cpf?.replace(/\D/g,""))||(buscaResult.nome&&m.nome===buscaResult.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa));
                          if(op.k==="faturamento"){setWppFatModal({reg:buscaResult,mot:mot||null});}
                          else if(op.k==="contratacao"){setWppModal({reg:buscaResult,mot:mot||null});setWppTel((mot?.tel||buscaResult.tel||""));setWppPgto("cheque");setWppValCheque("");setWppValConta("");setWppObs("");}
                          else if(op.k==="descarga"){abrirWppPagModal(buscaResult,mot,"descarga");}
                          else if(op.k==="diarias"){abrirWppPagModal(buscaResult,mot,"diarias");}
                        }} style={{width:"100%",background:"transparent",border:"none",borderBottom:i<arr.length-1?`1px solid ${t.borda}`:"none",padding:"10px 14px",color:t.txt,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10,transition:"background .15s"}}
                          onMouseOver={e=>e.currentTarget.style.background=t.card2}
                          onMouseOut={e=>e.currentTarget.style.background="transparent"}
                        >
                          <div style={{flexShrink:0,width:30,height:30,borderRadius:7,background:"rgba(37,211,102,.08)",border:"1px solid rgba(37,211,102,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(op.svg,"#25D366",14)}</div>
                          <div><div style={{fontWeight:700}}>{op.l}</div><div style={{fontSize:9,color:t.txt2,marginTop:1}}>{op.sub}</div></div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button onClick={handleLogout} style={{...css.hBtn,padding:"6px 7px"}}>
                {hIco(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,t.txt2,13)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ALERTAS PANEL */}
      {alertasOpen && alertas.length > 0 && (
        <div style={{background:t.card,borderBottom:`1px solid ${t.borda}`,animation:"fadeIn .2s",position:"sticky",top:56,zIndex:89,maxHeight:"50vh",overflowY:"auto",boxShadow:`0 8px 24px ${t.shadow}`}}>
          {alertas.slice(0,10).map((a,i) => (
            <div key={i} onClick={()=>{ if(a.reg){ abrirDetalhe(a.reg); setAlertasOpen(false); } }} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 16px",borderBottom:`1px solid ${t.borda}`,cursor:a.reg?"pointer":"default",transition:"background .15s"}} onMouseEnter={e=>{ if(a.reg) e.currentTarget.style.background=t.card2; }} onMouseLeave={e=>{ e.currentTarget.style.background=""; }}>
              <span style={{flexShrink:0}}>{a.tipo==="danger"?hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,16):hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.ouro,16)}</span>
              <span style={{fontSize:11,color:t.txt2,lineHeight:1.5,flex:1}}>{a.txt}{a.reg&&<span style={{color:t.azulLt,fontSize:10,marginLeft:6}}>↗ ver DT</span>}</span>
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

      {/* CONTENT */}
      {/* CONTENT — topbar é sticky; padding-bottom só necessário no mobile (nav bottom) */}
      <div style={{padding:(activeTab==="planilha"||activeTab==="relatorios")?(isMobile?"0 0 68px":"0"):(isMobile?"16px 16px 68px":"16px 16px 24px"),maxWidth:(activeTab==="planilha"||activeTab==="relatorios"||activeTab==="dashboard"||activeTab==="diarias"||activeTab==="descarga")?"100%":1100,margin:"0 auto",animation:"fadeIn .2s",...(activeTab==="relatorios"?{display:"flex",flexDirection:"column",height:"calc(100vh - 56px)",overflow:"hidden"}:{})}}>

        {/* ═══ RELATÓRIOS ═══ */}
        {activeTab === "relatorios" && (
          <ReportBuilder
            dados={DADOS}
            motoristas={motoristas}
            apontItems={apontItems}
            sgsItems={sgsItems}
            t={t}
            DESIGN={DESIGN}
            isMobile={isMobile}
            isWide={isWide}
          />
        )}

        {/* ═══ BUSCA ═══ */}
        {activeTab === "busca" && (
          <div>
            <div style={{...css.secTitle,marginBottom:12}}>
              {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.ouro,13,2)} Buscar Registro
              <span style={{flex:1,height:1,background:t.borda,marginLeft:4}}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:10,justifyContent:"center"}}>
              {[
                {k:"dt",    ico:<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,    l:"DT"},
                {k:"cpf",   ico:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,                  l:"CPF"},
                {k:"placa", ico:<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>, l:"PLACA"},
              ].map(b => (
                <button key={b.k} onClick={()=>{setBuscaTipo(b.k);setBuscaInput("");setBuscaResult(null);setBuscaError(null)}} style={{padding:"10px 18px",fontSize:12,fontWeight:700,border:`1.5px solid ${buscaTipo===b.k?t.ouro:t.borda}`,borderRadius:DESIGN.r.btn,cursor:"pointer",background:buscaTipo===b.k?`rgba(240,185,11,.08)`:t.card2,color:buscaTipo===b.k?t.ouro:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all .18s"}}>
                  {hIco(b.ico,buscaTipo===b.k?t.ouro:t.txt2,15,2)} {b.l}
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
              <div className="co-card" style={{...css.card,animation:"slideUp .3s ease"}}>
                <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,background:t.headerBg}}>
                  <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 14px rgba(240,185,11,.3)`}}>
                    {hIco(<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,t.headerBg,18,2)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.txt,lineHeight:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{buscaResult.nome||"—"}</div>
                    <div style={{fontSize:9,color:t.txt2,fontWeight:600,letterSpacing:1.5,marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:DESIGN.r.badge,padding:"3px 10px",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:t.ouro,fontFamily:"'Bebas Neue',sans-serif"}}>DT {buscaResult.dt}</span>
                      {buscaResult.placa&&<span style={{background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:DESIGN.r.badge,padding:"3px 10px",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:t.verde,fontFamily:"'Bebas Neue',sans-serif"}}>{buscaResult.placa}</span>}
                      {buscaResult.data_desc?<span style={{...css.badge(t.verde,`rgba(2,192,118,.1)`,`rgba(2,192,118,.3)`)}}> DESCARREGADO</span>:buscaResult.data_agenda?<span style={{...css.badge(t.ouro,`rgba(240,185,11,.08)`,`rgba(240,185,11,.3)`)}}>AGUARDANDO</span>:<span style={{...css.badge(t.danger,`rgba(246,70,93,.08)`,`rgba(246,70,93,.3)`)}}>SEM AGENDA</span>}
                    </div>
                  </div>
                </div>
                <div style={{padding:14,display:"grid",gap:8}}>
                  {[
                    {ico:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,lbl:"CPF",val:buscaResult.cpf},
                    {ico:<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,lbl:"Placa",val:buscaResult.placa,highlight:true,cor:t.verde},
                    {ico:<><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></>,lbl:"Rota",val:`${buscaResult.origem||"—"} → ${buscaResult.destino||"—"}`},
                    {ico:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,lbl:"Status",val:buscaResult.status},
                  ].map((item,i)=>(
                    <div key={i} style={{...css.card,padding:"9px 11px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flexShrink:0}}>{hIco(item.ico,item.cor||t.txt2,16,1.8)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700,marginBottom:2}}>{item.lbl}</div>
                        <div style={{fontWeight:600,color:item.cor||t.txt,fontFamily:item.highlight?"'Bebas Neue',sans-serif":"inherit",letterSpacing:item.highlight?3:0,fontSize:item.highlight?17:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.val||"—"}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{...css.kpi(t.ouro),padding:"12px 10px"}}>
                      {hIco(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,t.ouro,14,2)}
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.ouro,marginTop:4}}>{buscaResult.data_carr||"—"}</div>
                      <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Carregamento</div>
                    </div>
                    <div style={{...css.kpi(t.verde),padding:"12px 10px"}}>
                      {hIco(<><polyline points="20 6 9 17 4 12"/></>,t.verde,14,2)}
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.verde,marginTop:4}}>{buscaResult.data_agenda||"—"}</div>
                      <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Agenda Desc.</div>
                    </div>
                  </div>
                  {canFin && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[
                        {lbl:"Empresa",val:fmtMoeda(buscaResult.vl_cte),cor:t.verde},
                        {lbl:"Motorista",val:fmtMoeda(buscaResult.vl_contrato),cor:t.azulLt},
                        {lbl:"Adiantam.",val:fmtMoeda(buscaResult.adiant),cor:t.ouro},
                      ].map((f,i)=>(
                        <div key={i} style={{...css.kpi(f.cor),padding:"10px 8px"}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,color:f.cor,lineHeight:1}}>{f.val}</div>
                          <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginTop:4}}>{f.lbl}</div>
                        </div>
                      ))}
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
                        <div style={{flexShrink:0}}>{hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.ouro,18,2)}</div>
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
                      }} style={{...css.btnGold,justifyContent:"center",padding:11,width:"100%"}}>
                        {hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,t.bg,16,2)} EDITAR
                      </button>

                      {/* WhatsApp - 4 modelos (css.btnCard — alteração aqui propaga para todos os tiles WPP) */}
                      <div style={{background:t.card2,borderRadius:12,padding:12,border:`1px solid rgba(37,211,102,.25)`}}>
                        <div style={{...css.secTitle,color:"#25D366",marginBottom:10}}>
                          {hIco(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.05-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,`#25D366`,13,2)}
                          WHATSAPP · Escolha o modelo
                          <span style={{flex:1,height:1,background:"rgba(37,211,102,.2)",marginLeft:4}}/>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {[
                            {l:"Faturamento", sub:"CTE · MDF · MAT",   cor:"#25D366",
                             ico:<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="16" y1="8" x2="8" y2="8"/><line x1="16" y1="12" x2="8" y2="12"/></>,
                             fn:(mot)=>setWppFatModal({reg:buscaResult,mot})},
                            {l:"Contratação", sub:"Pgto completo",     cor:"#25D366",
                             ico:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
                             fn:(mot)=>{setWppModal({reg:buscaResult,mot});setWppTel((mot?.tel||buscaResult.tel||""));setWppPgto("cheque");setWppValCheque("");setWppValConta("");setWppObs("");}},
                            {l:"Descarga",    sub:"Stretch",           cor:t.azulLt,
                             ico:<><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
                             fn:(mot)=>abrirWppPagModal(buscaResult,mot,"descarga")},
                            {l:"Diárias",    sub:"Pgto diária",        cor:t.danger,
                             ico:<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>,
                             fn:(mot)=>abrirWppPagModal(buscaResult,mot,"diarias")},
                          ].map((op,i)=>(
                            <button key={i} onClick={()=>{
                              const mot=motoristas.find(m=>(buscaResult.cpf&&m.cpf?.replace(/\D/g,"")===buscaResult.cpf?.replace(/\D/g,""))||(buscaResult.nome&&m.nome===buscaResult.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa));
                              op.fn(mot||null);
                            }} style={{...css.btnCard(op.cor)}}>
                              {hIco(op.ico, op.cor, 22, 2)}
                              <span>{op.l}</span>
                              <span style={{fontSize:9,opacity:.65,fontWeight:400,marginTop:-2}}>{op.sub}</span>
                            </button>
                          ))}
                        </div>
                        {/* DOC (com RO) */}
                        <button onClick={()=>{
                          const mot=motoristas.find(m=>(buscaResult.cpf&&m.cpf?.replace(/\D/g,"")===buscaResult.cpf?.replace(/\D/g,""))||(buscaResult.nome&&m.nome===buscaResult.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa));
                          setWppModal2({reg:buscaResult,mot:mot||null});setWpp2Ro(buscaResult.ro||"");setWpp2IncluirObs(false);
                        }} style={{...css.btnCard(t.txt2),width:"100%",marginTop:8,flexDirection:"row",justifyContent:"center",gap:8}}>
                          {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.txt2,16,2)} DOC (com RO)
                        </button>
                      </div>
                    </div>
                  )}
                  {/* ── Botão Ocorrências (visível para todos) ── */}
                  <button
                    onClick={()=>abrirOcorrModal(buscaResult)}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(232,130,12,.2)";e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 12px rgba(232,130,12,.3)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(232,130,12,.08)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
                    style={{width:"100%",borderRadius:11,padding:"12px 8px",cursor:"pointer",background:"rgba(232,130,12,.08)",border:"1px solid rgba(232,130,12,.35)",color:"#E8820C",fontWeight:700,fontSize:12,fontFamily:"inherit",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .15s"}}>
                    {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,`#E8820C`,16,2)} Ocorrências
                  </button>
                </div>
              </div>
            )}

            {/* ── Outros registros (mesmo CPF / mesma Placa) ── */}
            {buscaResult && buscaRelacionados.length > 0 && (
              <div style={{marginTop:12,animation:"slideUp .3s"}}>
                <div style={{...css.secTitle,marginBottom:8}}>
                  {buscaTipo==="cpf"?<>{hIco(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,t.ouro,11,2)}&nbsp;Outros DTs com este CPF</>:buscaTipo==="placa"?<>{hIco(<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,t.ouro,11,2)}&nbsp;Outros DTs com esta Placa</>:<>{hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.ouro,11,2)}&nbsp;Outros registros (mesmo CPF / Placa)</>}
                  <span style={{flex:1,height:1,background:t.borda}} />
                  <span style={{fontSize:10,color:t.txt2,fontWeight:600}}>{buscaRelacionados.length} registro{buscaRelacionados.length>1?"s":""}</span>
                </div>
                {buscaRelacionados.slice(0,10).map((r,i) => {
                  const statusC = r.data_desc ? t.verde : r.data_agenda ? t.ouro : t.txt2;
                  const statusL = r.data_desc ? "Descarregado" : r.data_agenda ? "Aguardando" : "—";
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
                        <div style={{fontSize:10,color:t.txt2,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                          <span style={{display:"flex",alignItems:"center",gap:3}}>{hIco(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,t.txt2,10,2)} {r.data_carr||"—"}</span>
                          <span style={{display:"flex",alignItems:"center",gap:3}}>{hIco(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,t.txt2,10,2)} {r.data_agenda||"—"}</span>
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
                <div style={{marginBottom:10,display:"flex",justifyContent:"center"}}>{hIco(<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,t.danger,32,2)}</div>
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
        {activeTab === "dashboard" && (() => {
          const motsUniq = new Set(dashData.filtrado.map(r=>r.nome).filter(Boolean));
          const heroNum = dashHeroTab==="cte" && canFin
            ? (dashData.cteT>=1000 ? "R$ "+(dashData.cteT/1000).toFixed(1)+"k" : "R$ "+Math.round(dashData.cteT).toLocaleString("pt-BR"))
            : String(dashData.filtrado.length);
          const heroLabel = dashHeroTab==="cte" ? "Receita CTE no Período" : "Carregamentos no Período";

          // Status p/ legenda do donut
          const statusMapDash={};
          dashData.filtrado.forEach(r=>{const s=(r.status||"Sem Status");statusMapDash[s]=(statusMapDash[s]||0)+1;});
          const statusArrDash = Object.entries(statusMapDash).sort((a,b)=>b[1]-a[1]).slice(0,4);
          const DONUT_LEGEND = ["#a855f7","#ec4899","#ef4444","#22c55e"];
          const totalStatusDash = statusArrDash.reduce((a,[,v])=>a+v,0);

          // Recentes
          const recentesDash = [...dashData.filtrado]
            .filter(r=>r.nome)
            .sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return db&&da?db-da:0;})
            .slice(0,5);

          // Status badge color
          const sc = s => {
            const u=(s||"").toUpperCase();
            if(u.includes("CARREGAD")) return "#a855f7";
            if(u.includes("ENTREG")) return "#22c55e";
            if(u.includes("AGUARD")||u.includes("PEND")) return "#f59e0b";
            if(u.includes("CANCEL")||u.includes("NO-SHOW")) return "#ef4444";
            return "#3b82f6";
          };

          return (
            <div>
              {/* ── Filtros compactos ── */}
              <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
                <select value={dashMes} onChange={e=>setDashMes(e.target.value)} style={{...css.inp,width:"auto",padding:"3px 8px",fontSize:9,height:26,cursor:"pointer",border:`1.5px solid ${dashMes!=="todos"?t.ouro:t.borda}`,color:dashMes!=="todos"?t.ouro:t.txt2,fontWeight:700,fontFamily:DESIGN.fnt.b}}>
                  <option value="todos">Mês: Todos</option>
                  {dashData.meses.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
                {dashOrigem!=="todos" && (
                  <button onClick={()=>setDashOrigem("todos")} style={{marginLeft:4,fontSize:9,background:"transparent",border:`1px solid ${hexRgb(t.danger,.3)}`,borderRadius:DESIGN.r.tag,color:t.danger,cursor:"pointer",padding:"3px 9px",fontFamily:DESIGN.fnt.b}}>✕ {dashOrigem==="BELEM"?"BELEM-PA":dashOrigem==="IMPERATRIZ"?"IMPERATRIZ-MA":dashOrigem}</button>
                )}
                {dashOrigem==="todos" && dashData.cidades.length>0 && (
                  <select onChange={e=>setDashOrigem(e.target.value)} value={dashOrigem} style={{...css.inp,width:"auto",padding:"3px 8px",fontSize:9,height:26,cursor:"pointer",marginLeft:4}}>
                    <option value="todos">Origem: Todas</option>
                    {dashData.cidades.map(c=><option key={c} value={c}>{c==="BELEM"?"BELEM-PA":c==="IMPERATRIZ"?"IMPERATRIZ-MA":c}</option>)}
                  </select>
                )}
              </div>

              {/* ── KPI Strip ── */}
              {(()=>{
                const carregadoN = statusMapDash["Carregado"]||statusMapDash["CARREGADO"]||0;
                const taxaEfic = totalStatusDash>0?Math.round(carregadoN/totalStatusDash*100):0;
                const cteMed = dashData.filtrado.length>0&&canFin ? dashData.cteT/dashData.filtrado.length : 0;
                const comD = diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso");
                const totalDevD = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_prev)||0),0);
                const totalPgD  = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_pg)||0),0);
                const saldoD = totalDevD-totalPgD;
                const kpis = [
                  {label:dashHeroTab==="cte"?"Receita CTE":"Carregamentos",value:heroNum,sub:"no período",color:t.azulLt,border:`rgba(22,119,255,.2)`,icon:<><path d="M1 3h15v13H1z"/><path d="M16 8l4 2v5h-4V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,click:()=>setDashHeroTab(dashHeroTab==="cte"?"carr":"cte")},
                  {label:"Taxa Eficiência",value:`${taxaEfic}%`,sub:`${carregadoN} carregados`,color:taxaEfic>=90?t.verde:taxaEfic>=70?t.ouro:t.danger,border:taxaEfic>=90?`rgba(2,192,118,.2)`:taxaEfic>=70?`rgba(240,185,11,.2)`:`rgba(246,70,93,.2)`,icon:<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>},
                  {label:"DTs Únicas",value:String(dashData.dtsU.size),sub:"documentos",color:"#a855f7",border:`rgba(168,85,247,.2)`,icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,click:()=>setActiveTab("planilha")},
                  {label:"Motoristas Ativos",value:String(motsUniq.size),sub:`de ${motoristas.length} cadastrados`,color:t.verde,border:`rgba(2,192,118,.2)`,icon:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,click:()=>setActiveTab("motoristas")},
                  ...(canFin?[{label:"CTE Médio/Viagem",value:cteMed>=1000?"R$"+(cteMed/1000).toFixed(1)+"k":cteMed>0?"R$"+Math.round(cteMed).toLocaleString("pt-BR"):"—",sub:"por carregamento",color:t.verde,border:`rgba(2,192,118,.2)`,icon:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>}]:[]),
                  ...(canFin?[{label:"Diárias a Pagar",value:saldoD>0?(saldoD>=1000?"R$"+(saldoD/1000).toFixed(1)+"k":"R$"+Math.round(saldoD).toLocaleString("pt-BR")):"Quitado",sub:`de ${fmtMoeda(totalDevD)} devido`,color:saldoD>0?t.danger:t.verde,border:saldoD>0?`rgba(246,70,93,.2)`:`rgba(2,192,118,.2)`,icon:<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,click:()=>setActiveTab("diarias")}]:[]),
                  {label:"Alertas Ativos",value:String(alertas.length),sub:alertas.length===0?"tudo em ordem":"atenção necessária",color:alertas.length===0?t.verde:t.danger,border:alertas.length===0?`rgba(2,192,118,.2)`:`rgba(246,70,93,.2)`,icon:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,click:()=>setAlertasOpen(!alertasOpen)},
                ];
                return (
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":`repeat(${kpis.length},1fr)`,gap:isMobile?6:8,marginBottom:12}}>
                    {kpis.map((k,i)=>(
                      <div key={i} onClick={k.click} style={{background:t.card,borderRadius:isMobile?8:12,border:`1px solid ${t.borda}`,borderTop:`3px solid ${k.color}`,padding:isMobile?"8px 10px":"12px 14px",cursor:k.click?"pointer":"default",transition:"all .15s"}}
                        onMouseEnter={e=>k.click&&(e.currentTarget.style.background=t.card2)}
                        onMouseLeave={e=>k.click&&(e.currentTarget.style.background=t.card)}
                      >
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:isMobile?3:8}}>
                          <div style={{fontSize:isMobile?7:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,lineHeight:1.4,paddingRight:4}}>{k.label}</div>
                          <div style={{width:isMobile?16:22,height:isMobile?16:22,borderRadius:6,background:`${k.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{hIco(k.icon,k.color,isMobile?9:11)}</div>
                        </div>
                        <div style={{fontFamily:DESIGN.fnt.h,fontSize:isMobile?15:20,letterSpacing:.5,color:k.color,lineHeight:1,marginBottom:2}}>{k.value}</div>
                        <div style={{fontSize:isMobile?8:9,color:t.txt2,lineHeight:1.3}}>{k.sub}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Main Grid: Chart | Status DTs | Top Motoristas ── */}
              {(()=>{
                const motCount={};
                dashData.filtrado.forEach(r=>{if(r.nome){motCount[r.nome]=(motCount[r.nome]||0)+1;}});
                const topMot=Object.entries(motCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
                const maxMot=topMot[0]?.[1]||1;
                const cores=[t.ouro,t.azulLt,t.verde,"#a855f7","#ec4899"];
                return (
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:12,marginBottom:12}}>
                    {/* ─ Area Chart ─ */}
                    <div style={{...css.card,padding:16}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                        <div>
                          <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Evolução do Período</div>
                          <div style={{display:"flex",gap:6,marginTop:6}}>
                            <button onClick={()=>setDashHeroTab("carr")} style={{padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,borderRadius:20,border:`1px solid ${dashHeroTab==="carr"?t.txt:hexRgb(t.txt,.18)}`,background:dashHeroTab==="carr"?t.txt:"transparent",color:dashHeroTab==="carr"?t.bg:t.txt2}}>Carregamentos</button>
                            {canFin&&<button onClick={()=>setDashHeroTab("cte")} style={{padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,borderRadius:20,border:`1px solid ${dashHeroTab==="cte"?t.txt:hexRgb(t.txt,.18)}`,background:dashHeroTab==="cte"?t.txt:"transparent",color:dashHeroTab==="cte"?t.bg:t.txt2}}>Receita CTE</button>}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontFamily:DESIGN.fnt.h,fontSize:28,letterSpacing:1,color:t.txt,lineHeight:1}}>{heroNum}</div>
                          <div style={{fontSize:9,color:"#22c55e"}}>↗ {heroLabel}</div>
                        </div>
                      </div>
                      <div style={{height:200}}><canvas ref={chartAreaRef} /></div>
                    </div>
                    {/* ─ Status DTs ─ */}
                    <div style={{...css.card,padding:14}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Status das DTs</span>
                        <button onClick={()=>setActiveTab("planilha")} style={{fontSize:9,color:"#a855f7",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Detalhes ›</button>
                      </div>
                      <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                        <div style={{width:90,height:90}}><canvas ref={chartDonutRef} /></div>
                      </div>
                      <div style={{textAlign:"center",marginBottom:10}}>
                        <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:.5}}>Total de DTs</div>
                        <div style={{fontFamily:DESIGN.fnt.h,fontSize:24,letterSpacing:1,color:t.txt,lineHeight:1.1}}>{totalStatusDash}</div>
                      </div>
                      {statusArrDash.map(([s,v],i)=>{
                        const pct=totalStatusDash>0?Math.round(v/totalStatusDash*100):0;
                        return (
                          <div key={s} style={{marginBottom:8}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:DONUT_LEGEND[i]||"#666"}}/>
                                <span style={{fontSize:9,color:t.txt2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:70}}>{s}</span>
                              </div>
                              <span style={{fontSize:10,fontWeight:700,color:t.txt,flexShrink:0}}>{v} <span style={{fontSize:8,color:t.txt2,fontWeight:400}}>{pct}%</span></span>
                            </div>
                            <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${pct}%`,background:DONUT_LEGEND[i]||"#666",borderRadius:2}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* ─ Top Motoristas ─ */}
                    <div style={{...css.card,padding:14}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                        <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Top Motoristas</span>
                        <button onClick={()=>setActiveTab("motoristas")} style={{fontSize:9,color:t.ouro,background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver todos ›</button>
                      </div>
                      {topMot.length===0?(
                        <div style={{textAlign:"center",padding:20,color:t.txt2,fontSize:11}}>Sem dados</div>
                      ):topMot.map(([nome,ct],i)=>{
                        const initials=(nome||"?").split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase();
                        const pct=Math.round(ct/maxMot*100);
                        return (
                          <div key={nome} style={{marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <div style={{width:26,height:26,borderRadius:7,background:`${cores[i]}22`,border:`1px solid ${cores[i]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:cores[i],flexShrink:0}}>{initials}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:10,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nome.split(" ")[0]}</div>
                              </div>
                              <span style={{fontSize:11,fontWeight:700,color:t.txt,flexShrink:0}}>{ct}</span>
                            </div>
                            <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${pct}%`,background:cores[i],borderRadius:2}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Bottom: Registros Recentes + Painel Operacional ── */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 2fr",gap:12}}>
                {/* Registros Recentes */}
                <div style={{...css.card,padding:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Registros Recentes</span>
                    <button onClick={()=>setActiveTab("planilha")} style={{fontSize:10,color:"#a855f7",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver Tudo ›</button>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:320}}>
                      <thead>
                        <tr>
                          {["DT","Motorista","Origem","Destino","Status",canFin?"CTE":""].filter(Boolean).map(h=>(
                            <th key={h} style={{padding:"0 6px 8px",textAlign:"left",fontSize:8,fontWeight:600,textTransform:"uppercase",letterSpacing:.6,color:t.txt2,borderBottom:`1px solid ${t.borda}`,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentesDash.length===0?(
                          <tr><td colSpan={6} style={{textAlign:"center",padding:16,color:t.txt2,fontSize:11}}>Sem dados no período</td></tr>
                        ):recentesDash.map((r,i)=>(
                          <tr key={i} style={{borderTop:i===0?"none":`1px solid ${hexRgb(t.borda,.5)}`,cursor:"pointer",transition:"background .1s"}}
                            onClick={()=>{setDetalheDT(r);setModalOpen("detalhe");}}
                            onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.04)}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                          >
                            <td style={{padding:"7px 6px",color:t.txt2,fontFamily:"monospace",fontSize:9,whiteSpace:"nowrap"}}>{r.dt||"–"}</td>
                            <td style={{padding:"7px 6px",fontWeight:500,color:t.txt,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(r.nome||"–").split(" ")[0]}</td>
                            <td style={{padding:"7px 6px",color:t.txt2,fontSize:9,whiteSpace:"nowrap"}}>{(r.origem||"–").split(/[-–]/)[0].trim().slice(0,9)}</td>
                            <td style={{padding:"7px 6px",color:t.txt2,fontSize:9,whiteSpace:"nowrap",maxWidth:90,overflow:"hidden",textOverflow:"ellipsis"}}>{(r.destino||"–").split(/[-–]/)[0].trim().slice(0,9)}</td>
                            <td style={{padding:"7px 6px"}}>
                              <span style={{padding:"2px 6px",borderRadius:DESIGN.r.badge,fontSize:7,fontWeight:700,textTransform:"uppercase",color:"#fff",background:sc(r.status),whiteSpace:"nowrap",letterSpacing:.3}}>{(r.status||"–").slice(0,9)}</span>
                            </td>
                            {canFin&&<td style={{padding:"7px 6px",textAlign:"right",fontWeight:600,color:t.txt,fontSize:10,whiteSpace:"nowrap"}}>{r.vl_cte&&parseFloat(r.vl_cte)>0?"R$"+(parseFloat(r.vl_cte)/1000).toFixed(1)+"k":"–"}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Painel Operacional: Diárias + Descargas */}
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {/* Diárias */}
                  <div style={{...css.card,padding:14,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Diárias</span>
                      <button onClick={()=>setActiveTab("diarias")} style={{fontSize:9,color:t.ouro,background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver ›</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                      {[{l:"No Prazo",v:diariasData.ok,c:t.verde,bg:`rgba(2,192,118,.08)`},{l:"Perdeu Agenda",v:diariasData.atraso,c:t.danger,bg:`rgba(246,70,93,.08)`},{l:"Aguardando",v:diariasData.pend,c:t.ouro,bg:`rgba(240,185,11,.08)`}].map(d=>(
                        <div key={d.l} onClick={()=>setActiveTab("diarias")} style={{background:d.bg,borderRadius:8,padding:"8px 6px",textAlign:"center",cursor:"pointer"}}>
                          <div style={{fontFamily:DESIGN.fnt.h,fontSize:20,color:d.c,lineHeight:1}}>{d.v}</div>
                          <div style={{fontSize:7,textTransform:"uppercase",letterSpacing:.5,color:t.txt2,marginTop:3,lineHeight:1.3}}>{d.l}</div>
                        </div>
                      ))}
                    </div>
                    {canFin&&(()=>{
                      const comD2=diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso");
                      const dev2=comD2.reduce((s,{r})=>s+(parseFloat(r.diaria_prev)||0),0);
                      const pg2=comD2.reduce((s,{r})=>s+(parseFloat(r.diaria_pg)||0),0);
                      const sld2=dev2-pg2;
                      if(!dev2)return null;
                      return <div style={{padding:"8px 10px",borderRadius:8,background:t.card2,border:`1px solid ${t.borda}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:9,color:t.txt2}}>Saldo a pagar</div><div style={{fontSize:13,fontWeight:700,color:sld2>0?t.danger:t.verde,fontFamily:DESIGN.fnt.b}}>{fmtMoeda(Math.abs(sld2))}</div></div>;
                    })()}
                  </div>
                  {/* Descargas */}
                  <div style={{...css.card,padding:14,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Descargas</span>
                      <button onClick={()=>setActiveTab("descarga")} style={{fontSize:9,color:t.azulLt,background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver ›</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                      {[{l:"Hoje",v:descargaData.hoje.length,c:t.azulLt,bg:`rgba(22,119,255,.08)`},{l:"Em Atraso",v:descargaData.atrasados.length,c:t.danger,bg:`rgba(246,70,93,.08)`},{l:"Aguardando",v:descargaData.aguardando.length,c:t.ouro,bg:`rgba(240,185,11,.08)`}].map(d=>(
                        <div key={d.l} onClick={()=>setActiveTab("descarga")} style={{background:d.bg,borderRadius:8,padding:"8px 6px",textAlign:"center",cursor:"pointer"}}>
                          <div style={{fontFamily:DESIGN.fnt.h,fontSize:20,color:d.c,lineHeight:1}}>{d.v}</div>
                          <div style={{fontSize:7,textTransform:"uppercase",letterSpacing:.5,color:t.txt2,marginTop:3,lineHeight:1.3}}>{d.l}</div>
                        </div>
                      ))}
                    </div>
                    {descargaData.atrasados.length>0&&(
                      <div>
                        {descargaData.atrasados.slice(0,3).map((r,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderTop:i>0?`1px solid ${hexRgb(t.borda,.5)}`:"none"}}>
                            <span style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:4,padding:"1px 5px",fontSize:7,fontWeight:700,color:t.danger,whiteSpace:"nowrap"}}>ATRASADO</span>
                            <span style={{fontSize:9,color:t.txt,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(r.nome||"—").split(" ")[0]}</span>
                            <span style={{fontSize:9,color:t.txt2,whiteSpace:"nowrap"}}>{r.destino?.slice(0,8)||"—"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

        {/* ═══ PLANILHA ═══ */}
        {activeTab === "planilha" && (()=>{
          // colunas com chave de campo para ordenação
          const COLS = [
            {h:"DT",        k:"dt",         w:"11%"},
            {h:"Motorista", k:"nome",        w:"18%"},
            {h:"Placa",     k:"placa",       w:"11%"},
            {h:"Origem",    k:"origem",      w:"13%"},
            {h:"Destino",   k:"destino",     w:"13%"},
            {h:"Carreg.",   k:"data_carr",   w:"11%"},
            {h:"Agenda",    k:"data_agenda", w:"11%"},
            {h:"Desc.",     k:"data_desc",   w:"11%"},
            {h:"Status",    k:"status",      w:"11%"},
          ];
          // --- função de ordenação ---
          const sortarDados = (dados) => {
            if (!planilhaSortKey) return dados;
            return [...dados].sort((a, b) => {
              const va = (a[planilhaSortKey] || "").toString().toLowerCase();
              const vb = (b[planilhaSortKey] || "").toString().toLowerCase();
              // datas no formato DD/MM/YYYY → converte para comparação correta
              const isDate = /^\d{2}\/\d{2}\/\d{4}/.test(va) || /^\d{2}\/\d{2}\/\d{4}/.test(vb);
              if (isDate) {
                const toYMD = s => { if(!s) return ""; const p=s.split("/"); return p.length===3?`${p[2]}${p[1]}${p[0]}`:s; };
                const da = toYMD(va), db = toYMD(vb);
                return planilhaSortDir==="asc" ? da.localeCompare(db) : db.localeCompare(da);
              }
              return planilhaSortDir==="asc" ? va.localeCompare(vb,"pt-BR",{numeric:true}) : vb.localeCompare(va,"pt-BR",{numeric:true});
            });
          };
          // ── Filtros de Ano / Mês / Origem ──
          const parseYMfilt = s => {
            if(!s) return null;
            if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1]};}
            if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1]};}
            return null;
          };
          const anosDisp   = [...new Set(DADOS.map(r=>{const ym=parseYMfilt(r.data_carr||r.data_desc||"");return ym?.ano;}).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
          const mesesDisp  = [...new Set(DADOS.filter(r=>{if(!planilhaFiltroAno)return true;const ym=parseYMfilt(r.data_carr||r.data_desc||"");return ym?.ano===planilhaFiltroAno;}).map(r=>{const ym=parseYMfilt(r.data_carr||r.data_desc||"");return ym?.mes;}).filter(Boolean))].sort();
          const origensDisp= [...new Set(DADOS.map(r=>(r.origem||"").trim()).filter(Boolean))].sort();
          const MESES_PT = {"01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez"};
          const dadosFiltrados = DADOS.filter(r => {
            const ym = parseYMfilt(r.data_carr||r.data_desc||"");
            if(planilhaFiltroAno  && ym?.ano  !== planilhaFiltroAno)  return false;
            if(planilhaFiltroMes  && ym?.mes  !== planilhaFiltroMes)  return false;
            if(planilhaFiltroOrigem && planilhaFiltroOrigem!=="todas" && (r.origem||"").trim()!==planilhaFiltroOrigem) return false;
            return true;
          });
          const dadosSortados = sortarDados(dadosFiltrados);
          const REGISTROS_POR_PAGINA = 200;
          const totalPaginas = Math.ceil(dadosSortados.length / REGISTROS_POR_PAGINA);
          const paginaAtual = Math.max(1, Math.min(planilhaPagina, totalPaginas || 1));
          const inicio = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
          const fim = inicio + REGISTROS_POR_PAGINA;
          const dadosExibir = dadosSortados.slice(inicio, fim);
          const toggleSort = (k) => {
            if (planilhaSortKey === k) {
              setPlanilhaSortDir(d => d==="asc"?"desc":"asc");
            } else {
              setPlanilhaSortKey(k);
              setPlanilhaSortDir("asc");
            }
          };
          return (
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
            {/* ── barra de filtros: Ano / Mês / Origem ── */}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:t.card,borderBottom:`1px solid ${t.borda}`,flexShrink:0,flexWrap:"wrap"}}>
              <span style={{fontSize:9,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:.8,marginRight:2}}>Filtrar:</span>
              <select value={planilhaFiltroAno} onChange={e=>{setPlanilhaFiltroAno(e.target.value);setPlanilhaPagina(1);}}
                style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${planilhaFiltroAno?t.ouro:t.borda}`,background:planilhaFiltroAno?`rgba(240,185,11,.08)`:t.bg,color:planilhaFiltroAno?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                <option value="">Todos os Anos</option>
                {anosDisp.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
              <select value={planilhaFiltroMes} onChange={e=>{setPlanilhaFiltroMes(e.target.value);setPlanilhaPagina(1);}}
                style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${planilhaFiltroMes?t.ouro:t.borda}`,background:planilhaFiltroMes?`rgba(240,185,11,.08)`:t.bg,color:planilhaFiltroMes?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                <option value="">Todos os Meses</option>
                {mesesDisp.map(m=><option key={m} value={m}>{MESES_PT[m]||m}</option>)}
              </select>
              <select value={planilhaFiltroOrigem} onChange={e=>{setPlanilhaFiltroOrigem(e.target.value);setPlanilhaPagina(1);}}
                style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${planilhaFiltroOrigem!=="todas"?t.ouro:t.borda}`,background:planilhaFiltroOrigem!=="todas"?`rgba(240,185,11,.08)`:t.bg,color:planilhaFiltroOrigem!=="todas"?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit",maxWidth:200}}>
                <option value="todas">Todas as Origens</option>
                {origensDisp.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
              {(planilhaFiltroAno||planilhaFiltroMes||planilhaFiltroOrigem!=="todas") && (
                <button onClick={()=>{setPlanilhaFiltroAno("");setPlanilhaFiltroMes("");setPlanilhaFiltroOrigem("todas");setPlanilhaPagina(1);}}
                  style={{fontSize:9,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>
                  ✕ Limpar
                </button>
              )}
              <span style={{marginLeft:"auto",fontSize:10,color:t.txt2,fontWeight:600}}>
                {dadosFiltrados.length} de {DADOS.length} registros
              </span>
            </div>
            {/* toolbar da planilha */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:t.headerBg,borderBottom:`1px solid ${t.borda}`,flexShrink:0,flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:10,color:t.txt2,fontWeight:600,letterSpacing:.5}}>
                {dadosFiltrados.length} registros · página {paginaAtual} de {totalPaginas}
                {planilhaSortKey && <span style={{color:t.ouro,marginLeft:8}}>ordenado por {planilhaSortKey} {planilhaSortDir==="asc"?"↑":"↓"} <button onClick={()=>{setPlanilhaSortKey(null);setPlanilhaSortDir("asc");}} style={{background:"none",border:"none",color:t.txt2,cursor:"pointer",fontSize:10,padding:"0 2px",verticalAlign:"middle"}}>✕</button></span>}
              </span>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <button onClick={()=>setPlanilhaPagina(1)} disabled={paginaAtual===1} style={{padding:"4px 8px",fontSize:9,border:`1px solid ${paginaAtual===1?t.borda:t.ouro}`,borderRadius:4,cursor:paginaAtual===1?"not-allowed":"pointer",background:"transparent",color:paginaAtual===1?t.txt2:t.ouro,fontWeight:600}}>⏮</button>
                <button onClick={()=>setPlanilhaPagina(p=>Math.max(1,p-1))} disabled={paginaAtual===1} style={{padding:"4px 8px",fontSize:9,border:`1px solid ${paginaAtual===1?t.borda:t.ouro}`,borderRadius:4,cursor:paginaAtual===1?"not-allowed":"pointer",background:"transparent",color:paginaAtual===1?t.txt2:t.ouro,fontWeight:600}}>◀</button>
                <button onClick={()=>setPlanilhaPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaAtual===totalPaginas} style={{padding:"4px 8px",fontSize:9,border:`1px solid ${paginaAtual===totalPaginas?t.borda:t.ouro}`,borderRadius:4,cursor:paginaAtual===totalPaginas?"not-allowed":"pointer",background:"transparent",color:paginaAtual===totalPaginas?t.txt2:t.ouro,fontWeight:600}}>▶</button>
                <button onClick={()=>setPlanilhaPagina(totalPaginas)} disabled={paginaAtual===totalPaginas} style={{padding:"4px 8px",fontSize:9,border:`1px solid ${paginaAtual===totalPaginas?t.borda:t.ouro}`,borderRadius:4,cursor:paginaAtual===totalPaginas?"not-allowed":"pointer",background:"transparent",color:paginaAtual===totalPaginas?t.txt2:t.ouro,fontWeight:600}}>⏭</button>
              </div>
              <ExportMenu
                dados={dadosFiltrados}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"cpf",l:"CPF"},{k:"placa",l:"Placa"},{k:"origem",l:"Origem"},{k:"destino",l:"Destino"},{k:"data_carr",l:"Carregamento"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"},{k:"status",l:"Status"},{k:"vl_cte",l:"VL CTE"},{k:"vl_contrato",l:"VL Contrato"},{k:"cte",l:"CTE"},{k:"mdf",l:"MDF"}]}
                filename="planilha-operacional"
                titulo="Planilha Operacional"
              />
            </div>
            {/* tabela full-width */}
            <div style={{flex:1,overflowX:"auto",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,tableLayout:"fixed",minWidth:480}}>
                <colgroup>
                  {COLS.map(c => <col key={c.k} style={{width:c.w}} />)}
                </colgroup>
                <thead>
                  <tr style={{background:t.tableHeader}}>
                    {COLS.map(c => {
                      const ativo = planilhaSortKey === c.k;
                      return (
                        <th key={c.k}
                          onClick={()=>toggleSort(c.k)}
                          title={`Ordenar por ${c.h}`}
                          style={{
                            padding:"9px 6px",textAlign:"left",fontSize:8,textTransform:"uppercase",
                            letterSpacing:.8,color:ativo?t.ouro:t.txt2,
                            borderBottom:`2px solid ${ativo?t.ouro:t.borda}`,
                            whiteSpace:"nowrap",position:"sticky",top:0,zIndex:1,
                            background:t.tableHeader,overflow:"hidden",textOverflow:"ellipsis",
                            cursor:"pointer",userSelect:"none",
                            transition:"color .15s, border-color .15s",
                          }}
                        >
                          <span style={{display:"flex",alignItems:"center",gap:3}}>
                            {c.h}
                            <span style={{fontSize:9,lineHeight:1,opacity:ativo?1:.35,color:ativo?t.ouro:t.txt2}}>
                              {ativo ? (planilhaSortDir==="asc"?"▲":"▼") : "⇅"}
                            </span>
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {dadosExibir.map((r,i) => (
                    <tr key={i} style={{cursor:"pointer",background:i%2===0?t.bg:t.bgAlt}} onClick={()=>{
                      setPlanilhaDetalheReg(r);
                    }}
                    onMouseOver={e=>{e.currentTarget.style.background=`rgba(240,185,11,.05)`;}}
                    onMouseOut={e=>{e.currentTarget.style.background=i%2===0?t.bg:t.bgAlt;}}
                    >
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:t.ouro,fontWeight:700,fontSize:11,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.dt}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:t.txt,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.nome||"—"}>{r.nome||"—"}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:1.5,color:t.verde,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.placa||"—"}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.origem||"—"}>{r.origem||"—"}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.destino||"—"}>{r.destino||"—"}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:t.ouro,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.data_carr||"—"}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.data_agenda||"—"}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:r.data_desc?t.verde:t.danger,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.data_desc||"—"}</td>
                      <td style={{padding:"6px 6px",borderBottom:`1px solid ${t.borda}22`,color:t.txt2,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.status||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* ═══ DIÁRIAS ═══ */}
        {activeTab === "diarias" && (
          <div>
            {diariaNavDT && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",borderRadius:10,background:`rgba(240,185,11,.08)`,border:`1px solid rgba(240,185,11,.3)`}}>
                {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.ouro,13)}
                <span style={{fontSize:11,fontWeight:700,color:t.ouro}}>DT {diariaNavDT}</span>
                <span style={{fontSize:10,color:t.txt2}}>em destaque</span>
                <button onClick={()=>setDiariaNavDT(null)} style={{marginLeft:"auto",background:"transparent",border:`1px solid rgba(240,185,11,.3)`,borderRadius:6,padding:"2px 8px",fontSize:10,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>✕ Limpar</button>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <ExportMenu
                dados={diariasData.items.map(({r,tipo,dias})=>({...r,_tipo:tipo==="ok"?"No prazo":tipo==="atraso"?`Atraso ${dias||0}d`:"Aguardando"}))}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"placa",l:"Placa"},{k:"data_carr",l:"Carregamento"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"},{k:"_tipo",l:"Status"},{k:"diaria_prev",l:"Diária Prev."},{k:"diaria_pg",l:"Diária Paga"}]}
                filename="diarias"
                titulo="Relatório de Diárias"
              />
            </div>
            {/* ── Resumo financeiro de diárias (admin/gerente) ── */}
            {(perfil==="admin"||perms.financeiro) && (()=>{
              const comD = diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso");
              const totalDevido = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_prev)||0),0);
              const totalPago   = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_pg)||0),0);
              const saldoD = totalDevido - totalPago;
              if(comD.length===0) return null;
              return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                  <div style={{background:t.card,borderRadius:12,border:`1px solid rgba(246,70,93,.25)`,padding:"12px 10px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:t.danger,lineHeight:1}}>{fmtMoeda(totalDevido)}</div>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                      {hIco(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,t.danger,9)} Total Devido
                    </div>
                  </div>
                  <div style={{background:t.card,borderRadius:12,border:`1px solid rgba(2,192,118,.25)`,padding:"12px 10px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:t.verde,lineHeight:1}}>{fmtMoeda(totalPago)}</div>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                      {hIco(<><polyline points="20 6 9 17 4 12"/></>,t.verde,9)} Total Pago
                    </div>
                  </div>
                  <div style={{background:t.card,borderRadius:12,border:`1px solid ${saldoD>0?`rgba(246,70,93,.25)`:`rgba(2,192,118,.25)`}`,padding:"12px 10px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:saldoD>0?t.danger:t.verde,lineHeight:1}}>{fmtMoeda(Math.abs(saldoD))}</div>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                      {hIco(saldoD>0?<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>:<><polyline points="22 11 12 22 2 11"/><line x1="12" y1="2" x2="12" y2="22"/></>,saldoD>0?t.danger:t.verde,9)}
                      {saldoD>0 ? "A Pagar" : "Quitado"}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{display:"flex",gap:6,marginBottom:12,justifyContent:"center",flexWrap:"wrap"}}>
              {[
                {k:"resumo",l:"Resumo",svg:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>},
                {k:"planilha",l:"Planilha",svg:<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/></>}
              ].map(s => (
                <button key={s.k} onClick={()=>setDSubTab(s.k)} style={{padding:"10px 20px",fontSize:12,fontWeight:700,border:`1.5px solid ${dSubTab===s.k?t.ouro:t.borda}`,borderRadius:8,cursor:"pointer",background:dSubTab===s.k?`rgba(240,185,11,.08)`:t.card2,color:dSubTab===s.k?t.ouro:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  {hIco(s.svg,dSubTab===s.k?t.ouro:t.txt2,18)} {s.l}
                </button>
              ))}
            </div>

            {/* KPI clicáveis — filtram a lista abaixo */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              <div style={{...css.kpi(t.verde),cursor:"pointer",outline:dFiltro==="ok"?`2px solid ${t.verde}`:"none"}} onClick={()=>{setDFiltro(dFiltro==="ok"?"todos":"ok");setDSubTab("resumo");}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:t.verde}}>{diariasData.ok}</div>
                <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:2,display:"flex",alignItems:"center",gap:3}}>{hIco(<><polyline points="20 6 9 17 4 12"/></>,t.verde,10)} No Prazo</div>
                <div style={{fontSize:8,color:t.verde,marginTop:2,opacity:.7}}>{dFiltro==="ok"?"● filtrado":"toque p/ filtrar"}</div>
              </div>
              <div style={{...css.kpi(t.danger),cursor:"pointer",outline:dFiltro==="atraso"?`2px solid ${t.danger}`:"none"}} onClick={()=>{setDFiltro(dFiltro==="atraso"?"todos":"atraso");setDSubTab("resumo");}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:t.danger}}>{diariasData.atraso}</div>
                <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:2,display:"flex",alignItems:"center",gap:3}}>{hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,10)} Perdeu Agenda</div>
                <div style={{fontSize:8,color:t.danger,marginTop:2,opacity:.7}}>{dFiltro==="atraso"?"● filtrado":"toque p/ filtrar"}</div>
              </div>
              <div style={{...css.kpi(t.ouro),cursor:"pointer",outline:dFiltro==="pendente"?`2px solid ${t.ouro}`:"none"}} onClick={()=>{setDFiltro(dFiltro==="pendente"?"todos":"pendente");setDSubTab("resumo");}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:t.ouro}}>{diariasData.pend}</div>
                <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginTop:2,display:"flex",alignItems:"center",gap:3}}>{hIco(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,t.ouro,10)} Sem Descarga</div>
                <div style={{fontSize:8,color:t.ouro,marginTop:2,opacity:.7}}>{dFiltro==="pendente"?"● filtrado":"toque p/ filtrar"}</div>
              </div>
            </div>

            {dSubTab === "resumo" && (
              <div>
                {/* Filtro + toolbar de view */}
                <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                  {[{k:"todos",l:"Todos"},{k:"diaria",l:"Com Diária"},{k:"atraso",l:"Perdeu Agenda"},{k:"sem_diaria",l:"Sem Diária"},{k:"pendente",l:"Aguardando"}].map(f => (
                    <button key={f.k} onClick={()=>setDFiltro(f.k)} style={{padding:"5px 10px",fontSize:9,fontWeight:700,border:`1.5px solid ${dFiltro===f.k?t.ouro:t.borda}`,borderRadius:7,cursor:"pointer",background:dFiltro===f.k?`rgba(240,185,11,.07)`:t.card2,color:dFiltro===f.k?t.ouro:t.txt2,fontFamily:"inherit"}}>{f.l}</button>
                  ))}
                </div>
                {/* Toolbar view */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  {[
                    {v:"linhas",l:"Linhas",svg:<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>},
                    {v:"blocos",l:"Blocos",svg:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>}
                  ].map(m => (
                    <button key={m.v} onClick={()=>{setDiariaView(m.v);saveJSON("co_diaria_view",m.v);}} style={{padding:"5px 11px",fontSize:10,fontWeight:700,border:`1.5px solid ${diariaView===m.v?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:diariaView===m.v?`rgba(22,119,255,.09)`:t.card2,color:diariaView===m.v?t.azulLt:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                      {hIco(m.svg,diariaView===m.v?t.azulLt:t.txt2,14)} {m.l}
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
                  (()=>{const _dAll=diariasData.items.filter(i=>dFiltro==="todos"||i.tipo===dFiltro);return diariaNavDT?[..._dAll].sort((a,b)=>a.r.dt===diariaNavDT?-1:b.r.dt===diariaNavDT?1:0):_dAll;})().slice(0,80).map((item,idx) => {
                    const {r,tipo,dias,temDiaria} = item;
                    const _isDHL = diariaNavDT && r.dt === diariaNavDT;
                    const borderC = _isDHL?t.ouro:tipo==="diaria"?t.danger:tipo==="atraso"?t.ouro:tipo==="sem_diaria"?t.verde:tipo==="ok"?t.verde:t.txt2;
                    const saldoPg = parseFloat(r.diaria_pg), saldoPrev = parseFloat(r.diaria_prev);
                    const pgStatus = !isNaN(saldoPg)&&saldoPg>0 ? "pago" : !isNaN(saldoPrev)&&saldoPrev>0 ? "pendente" : null;
                    const tipoLabel = tipo==="diaria"?`🛏️ DIÁRIA ${dias>0?dias+"d":""}`
                      :tipo==="atraso"?`⚠️ Atraso ${dias>0?dias+"d":""}`
                      :tipo==="sem_diaria"?"✅ Sem diária"
                      :tipo==="ok"?"✅ No prazo"
                      :"⏳ Aguardando";
                    const tipoColor = tipo==="diaria"?`rgba(246,70,93,.08)`:tipo==="atraso"?`rgba(240,185,11,.08)`:tipo==="sem_diaria"?`rgba(2,192,118,.08)`:tipo==="ok"?`rgba(2,192,118,.08)`:`rgba(240,185,11,.06)`;
                    return (
                      <div key={idx} onClick={()=>abrirDetalhe(r)} className="co-card" style={{background:_isDHL?`rgba(240,185,11,.06)`:t.card,borderRadius:12,padding:14,border:`1px solid ${_isDHL?t.ouro:t.borda}`,borderLeft:`4px solid ${borderC}`,marginBottom:10,animation:"slideUp .3s",cursor:"pointer",boxShadow:_isDHL?`0 0 0 2px rgba(240,185,11,.22)`:"none"}}>
                        <div style={{fontSize:14,fontWeight:700,color:t.txt,marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          {r.nome||"—"}
                          <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:tipoColor,color:borderC,border:`1px solid ${borderC}33`}}>
                            {tipoLabel}
                          </span>
                          {pgStatus && <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>{pgStatus==="pago"?"💳 Pago":"💸 Não Pago"}</span>}
                          {r.ro && <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:`rgba(255,152,0,.08)`,color:"#f57c00",border:`1px solid rgba(255,152,0,.25)`}}>RO {r.ro}</span>}
                          <span style={{marginLeft:"auto",fontSize:11,color:t.txt2}}>ver detalhes ›</span>
                        </div>
                        <div style={{fontSize:12,color:t.txt2,lineHeight:1.7}}>
                          🔢 <strong style={{color:t.txt}}>{r.dt}</strong> · 🚛 {r.placa||"—"}<br/>
                          📅 Agenda: <strong style={{color:t.ouro}}>{r.data_agenda||"—"}</strong> · 🛬 Chegada: <strong style={{color:r.chegada?t.azulLt:t.txt2}}>{r.chegada||"Não informada"}</strong><br/>
                          🏁 Descarga: <strong style={{color:r.data_desc?t.verde:t.txt2}}>{r.data_desc||"Não informada"}</strong>
                          {r.informou_analista && <> · <span style={{color:r.informou_analista==="sim"?t.verde:t.danger,fontSize:11}}>{r.informou_analista==="sim"?"✅ Informou analista":"❌ Não informou analista"}</span></>}
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
                        <div key={idx} onClick={()=>abrirDetalhe(r)} className="co-card" style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,borderLeft:`4px solid ${borderC}`,padding:12,display:"flex",flexDirection:"column",gap:8,animation:"slideUp .3s",cursor:"pointer"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                            <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg,border:`1.5px solid ${borderC}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:borderC,flexShrink:0}}>{initials}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:700,color:t.txt,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{r.nome||"—"}</div>
                              {/* Diária + RO abaixo do nome */}
                              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:2}}>
                                {(r.diaria_prev||r.diaria_pg) && <span style={{fontSize:9,color:t.txt2}}>Diária: <strong style={{color:r.diaria_pg?t.verde:t.ouro}}>{r.diaria_pg ? `R$${r.diaria_pg}` : `R$${r.diaria_prev}`}</strong></span>}
                                {r.ro && <span style={{fontSize:9,color:"#f57c00",fontWeight:600}}>RO: {r.ro}</span>}
                              </div>
                              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>
                                <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:8,fontWeight:700,background:tipo==="ok"?`rgba(2,192,118,.08)`:tipo==="atraso"?`rgba(246,70,93,.06)`:`rgba(240,185,11,.06)`,color:borderC,border:`1px solid ${borderC}33`}}>
                                  {tipo==="ok"?hIco(<><polyline points="20 6 9 17 4 12"/></>,t.verde,9):tipo==="atraso"?hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,9):hIco(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,t.ouro,9)}
                                  {tipo==="ok"?"No prazo":tipo==="atraso"?`${dias>0?dias+"d":"Atrasado"}`:"Aguardando"}
                                </span>
                                {pgStatus && <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:8,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>
                                  {pgStatus==="pago"?hIco(<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,t.verde,9):hIco(<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,t.danger,9)}
                                  {pgStatus==="pago"?"Pago":"Não Pago"}
                                </span>}
                              </div>
                            </div>
                            <span style={{fontSize:12,color:t.txt2,flexShrink:0}}>›</span>
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {chips.map((ch,ci) => (
                              <div key={ci} style={{background:t.card2,borderRadius:6,padding:"3px 7px",fontSize:10}}>
                                <span style={{color:t.txt2,fontSize:8}}>{ch.l} </span>
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
            {descargaNavDT && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",borderRadius:10,background:`rgba(22,119,255,.08)`,border:`1px solid rgba(22,119,255,.3)`}}>
                {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.azulLt,13)}
                <span style={{fontSize:11,fontWeight:700,color:t.azulLt}}>DT {descargaNavDT}</span>
                <span style={{fontSize:10,color:t.txt2}}>em destaque</span>
                <button onClick={()=>setDescargaNavDT(null)} style={{marginLeft:"auto",background:"transparent",border:`1px solid rgba(22,119,255,.3)`,borderRadius:6,padding:"2px 8px",fontSize:10,color:t.azulLt,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>✕ Limpar</button>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <ExportMenu
                dados={dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:descargaData.atrasados}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"placa",l:"Placa"},{k:"destino",l:"Destino"},{k:"chegada",l:"Chegada"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"}]}
                filename={`descarga-${dscData}`}
                titulo={`Descarga ${dscTab==="hoje"?"do Dia":dscTab==="aguardando"?"- Aguardando":"- Atrasos"} · ${dscData}`}
              />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[
                {k:"hoje",svg:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,l:"Descarrega Hoje",ct:descargaData.hoje.length,cor:t.azul,corLt:t.azulLt,bg:"rgba(22,119,255,.07)"},
                {k:"atrasado",svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,l:"Em Atraso",ct:descargaData.atrasados.length,cor:t.danger,corLt:"#f6465d",bg:"rgba(246,70,93,.07)"},
                {k:"aguardando",svg:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,l:"Aguardando Agenda",ct:descargaData.aguardando.length,cor:"#f0b90b",corLt:"#ffe57a",bg:"rgba(240,185,11,.07)"}
              ].map(tb => (
                <div key={tb.k} onClick={()=>setDscTab(tb.k)} style={{border:`1.5px solid ${dscTab===tb.k?tb.cor:t.borda}`,borderRadius:10,padding:12,cursor:"pointer",background:dscTab===tb.k?tb.bg:t.card2,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .2s"}}>
                  {hIco(tb.svg,dscTab===tb.k?tb.corLt:t.txt2,24)}
                  <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:dscTab===tb.k?tb.corLt:t.txt2}}>{tb.l}</span>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,color:dscTab===tb.k?tb.corLt:t.txt2}}>{tb.ct}</span>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
              <input type="date" value={dscData} onChange={e=>setDscData(e.target.value)} style={{...css.inp,flex:1}} />
              <button onClick={()=>{}} style={{...css.btnGold,padding:"10px 14px",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.card,16)}</button>
            </div>

            {/* Toolbar view Descarga */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {[
                {v:"linhas",l:"Linhas",svg:<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>},
                {v:"blocos",l:"Blocos",svg:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>}
              ].map(m => (
                <button key={m.v} onClick={()=>{setDescargaView(m.v);saveJSON("co_descarga_view",m.v);}} style={{padding:"5px 11px",fontSize:10,fontWeight:700,border:`1.5px solid ${descargaView===m.v?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:descargaView===m.v?`rgba(22,119,255,.09)`:t.card2,color:descargaView===m.v?t.azulLt:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                  {hIco(m.svg,descargaView===m.v?t.azulLt:t.txt2,14)} {m.l}
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
                {(()=>{const _dl=dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:descargaData.atrasados;return descargaNavDT?[..._dl].sort((a,b)=>a.dt===descargaNavDT?-1:b.dt===descargaNavDT?1:0):_dl;})().slice(0,50).map((r,i) => {
                  const da = parseData(r.data_agenda);
                  const dias = da ? diffDias(da, new Date(dscData+"T00:00:00")) : null;
                  const isAtrasado = dscTab === "atrasado";
                  const _isDHL2 = descargaNavDT && r.dt === descargaNavDT;
                  return (
                    <div key={i} onClick={()=>abrirDetalhe(r)} style={{background:_isDHL2?`rgba(22,119,255,.06)`:t.card,borderRadius:11,padding:12,border:`1px solid ${_isDHL2?t.azulLt:t.borda}`,borderLeft:`3px solid ${_isDHL2?t.azulLt:isAtrasado?t.danger:t.azul}`,marginBottom:8,animation:"slideUp .3s",cursor:"pointer",boxShadow:_isDHL2?`0 0 0 2px rgba(22,119,255,.18)`:"none"}}>
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
                {(()=>{const _db=dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:descargaData.atrasados;return descargaNavDT?[..._db].sort((a,b)=>a.dt===descargaNavDT?-1:b.dt===descargaNavDT?1:0):_db;})().slice(0,80).map((r,i) => {
                  const da = parseData(r.data_agenda);
                  const dias = da ? diffDias(da, new Date(dscData+"T00:00:00")) : null;
                  const isAtrasado = dscTab === "atrasado";
                  const isAguardando = dscTab === "aguardando";
                  const _isDHL3 = descargaNavDT && r.dt === descargaNavDT;
                  const accentC = _isDHL3?t.azulLt:isAtrasado ? t.danger : isAguardando ? "#f0b90b" : t.azul;
                  const avatarBg = isAtrasado ? `rgba(246,70,93,.1)` : isAguardando ? `rgba(240,185,11,.1)` : `rgba(22,119,255,.1)`;
                  const initials = (r.nome||"?").split(" ").filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join("");
                  const saldoPg = parseFloat(r.saldo), vl = parseFloat(r.vl_contrato);
                  const pgStatus = !isNaN(saldoPg)&&saldoPg===0&&!isNaN(vl)&&vl>0 ? "pago" : !isNaN(saldoPg)&&saldoPg>0 ? "pendente" : null;
                  const chips = [
                    {l:"DT",v:r.dt,c:t.ouro},
                    {l:"Placa",v:r.placa||"—",c:t.verde},
                    {l:"Destino",v:r.destino||"—",c:t.txt2},
                    ...(isAguardando&&r.chegada?[{l:"Chegada",v:r.chegada,c:"#f0b90b"}]:[]),
                    {l:"Agenda",v:r.data_agenda||"—",c:isAtrasado?t.danger:isAguardando?"#f0b90b":t.ouro},
                    {l:"Descarga",v:r.data_desc||"Pendente",c:r.data_desc?t.verde:t.txt2},
                    ...(r.origem?[{l:"Origem",v:r.origem,c:t.txt2}]:[]),
                    ...(r.ro?[{l:"RO",v:r.ro,c:"#f57c00"}]:[]),
                  ];
                  return (
                    <div key={i} onClick={()=>abrirDetalhe(r)} style={{background:_isDHL3?`rgba(22,119,255,.06)`:t.card,borderRadius:12,border:`1px solid ${_isDHL3?t.azulLt:t.borda}`,borderLeft:`4px solid ${accentC}`,padding:12,display:"flex",flexDirection:"column",gap:8,animation:"slideUp .3s",cursor:"pointer",boxShadow:_isDHL3?`0 0 0 2px rgba(22,119,255,.18)`:"none"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg,border:`1.5px solid ${accentC}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:accentC,flexShrink:0}}>{initials}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:t.txt,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{r.nome||"—"}</div>
                          {/* Diária + RO abaixo do nome */}
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:2}}>
                            {r.diaria_prev && <span style={{fontSize:9,color:t.txt2}}>Diária: <strong style={{color:t.ouro}}>R${r.diaria_prev}</strong></span>}
                            {r.ro && <span style={{fontSize:9,color:"#f57c00",fontWeight:600}}>RO: {r.ro}</span>}
                          </div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>
                            {isAtrasado && dias !== null && (
                              <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:8,fontWeight:700,background:`rgba(246,70,93,.07)`,color:t.danger,border:`1px solid rgba(246,70,93,.18)`}}>{hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,9)} {dias}d atraso</span>
                            )}
                            {pgStatus && <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:8,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>
                              {pgStatus==="pago"?hIco(<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,t.verde,9):hIco(<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,t.danger,9)}
                              {pgStatus==="pago"?"Pago":"Pendente"}
                            </span>}
                          </div>
                        </div>
                        <span style={{fontSize:12,color:t.txt2,flexShrink:0}}>›</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {chips.map((ch,ci) => (
                          <div key={ci} style={{background:t.card2,borderRadius:6,padding:"3px 7px",fontSize:10}}>
                            <span style={{color:t.txt2,fontSize:8}}>{ch.l} </span>
                            <span style={{color:ch.c,fontWeight:600}}>{ch.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {(dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:descargaData.atrasados).length === 0 && (
              <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>{dscTab==="hoje"?"📅":dscTab==="aguardando"?"⏳":"✅"}</div><h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt2}}>{dscTab==="hoje"?"NENHUMA DESCARGA HOJE":dscTab==="aguardando"?"NENHUM AGUARDANDO AGENDA":"SEM ATRASOS"}</h3></div>
            )}
          </div>
        )}

        {/* ═══ OPERACIONAL ═══ */}
        {activeTab === "operacional" && (()=>{
          const inpO = {...css.inp, fontSize:12, padding:"8px 10px"};
          const lblO = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};
          const saveSGS = (arr) => { setSgsItems(arr); saveJSON("co_sgs", arr); };
          const saveAponts = async (arr, novoItem = null) => {
            setApontItems(arr);
            saveJSON("co_aponts", arr);
            if (novoItem) {
              const conn = getConexao();
              if (conn) {
                try {
                  await supaFetch(conn.url, conn.key, "POST",
                    `${TABLE_APOINTS}?on_conflict=apontamento`,
                    [apontToSupabase(novoItem)]);
                } catch(e) { console.warn("Apontamento salvo apenas local:", e.message); }
              }
            }
          };
          const deleteApontSupabase = async (apontamento) => {
            const conn = getConexao();
            if (conn && apontamento) {
              try {
                await supaFetch(conn.url, conn.key, "DELETE",
                  `${TABLE_APOINTS}?apontamento=eq.${encodeURIComponent(apontamento)}`);
              } catch(e) { console.warn("Erro ao excluir no Supabase:", e.message); }
            }
          };

          const subBtns = [
            {k:"sgs",svg:<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,l:"SGS · Chamados",sub:"Chamados SGS"},
            {k:"diarias_id",svg:<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>,l:"ID Diárias",sub:"IDs vinculados"},
            {k:"ocorrencias",svg:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,l:"Ocorrências",sub:"Histórico geral"},
            {k:"apontamentos",svg:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,l:"Apontamentos",sub:"Descargas/Stretch"},
          ];

          return (
            <div>
              {/* Sub-botões */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
                {subBtns.map(sb=>(
                  <button key={sb.k} onClick={()=>setOperSubTab(sb.k)} style={{border:`1.5px solid ${operSubTab===sb.k?t.azul:t.borda}`,borderRadius:11,padding:"12px 10px",cursor:"pointer",background:operSubTab===sb.k?`rgba(22,119,255,.08)`:t.card,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .2s",fontFamily:"inherit"}}>
                    {hIco(sb.svg,operSubTab===sb.k?t.azulLt:t.txt2,24)}
                    <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:operSubTab===sb.k?t.azulLt:t.txt}}>{sb.l}</span>
                    <span style={{fontSize:8,color:t.txt2}}>{sb.sub}</span>
                  </button>
                ))}
              </div>

              {/* ──── SGS CHAMADOS ──── */}
              {operSubTab==="sgs" && (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{...css.secTitle,margin:0}}>{hIco(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,t.ouro,12)} Chamados SGS <span style={{flex:1,height:1,background:t.borda}} /></div>
                    <button onClick={()=>{setSgsForm({numero:"",data_chamado:"",ultimo_retorno:"",descricao:"",dt_rel:"",status:"aberto"});setSgsFormOpen(true);}} style={{...css.btnGold,padding:"8px 12px",fontSize:11}}>＋ Novo</button>
                  </div>

                  {sgsFormOpen && (
                    <div style={{background:t.card,borderRadius:12,border:`1px solid ${t.azul}44`,padding:14,marginBottom:14}}>
                      <div style={{fontWeight:700,color:t.azulLt,fontSize:12,marginBottom:10}}>📞 Registrar Chamado SGS</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div><label style={lblO}>Nº do Chamado</label><input value={sgsForm.numero} onChange={e=>setSgsForm(p=>({...p,numero:e.target.value}))} placeholder="SGS-000000" style={inpO} /></div>
                        <div><label style={lblO}>DT Relacionado</label><input value={sgsForm.dt_rel} onChange={e=>setSgsForm(p=>({...p,dt_rel:e.target.value}))} placeholder="Ex: 12345678" style={inpO} /></div>
                        <div><label style={lblO}>Data do Chamado</label><input type="date" value={sgsForm.data_chamado} onChange={e=>setSgsForm(p=>({...p,data_chamado:e.target.value}))} style={inpO} /></div>
                        <div><label style={lblO}>Último Retorno</label><input type="date" value={sgsForm.ultimo_retorno} onChange={e=>setSgsForm(p=>({...p,ultimo_retorno:e.target.value}))} style={inpO} /></div>
                        <div style={{gridColumn:"1/-1"}}><label style={lblO}>Descrição</label><textarea value={sgsForm.descricao} onChange={e=>setSgsForm(p=>({...p,descricao:e.target.value}))} rows={2} style={{...inpO,resize:"vertical"}} /></div>
                        <div>
                          <label style={lblO}>Status</label>
                          <select value={sgsForm.status} onChange={e=>setSgsForm(p=>({...p,status:e.target.value}))} style={{...inpO,appearance:"none"}}>
                            <option value="aberto">🔴 Aberto</option>
                            <option value="andamento">🟡 Em Andamento</option>
                            <option value="encerrado">🟢 Encerrado</option>
                          </select>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>setSgsFormOpen(false)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:8,padding:"8px 12px",color:t.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                        <button onClick={()=>{
                          if(!sgsForm.numero){showToast("⚠️ Informe o nº do chamado","warn");return;}
                          const id = Date.now();
                          const nova=[{...sgsForm,id,criado_em:new Date().toISOString(),usuario:usuarioLogado||perfil},...sgsItems];
                          saveSGS(nova); setSgsFormOpen(false);
                          showToast("✅ Chamado registrado!","ok");
                        }} style={{...css.btnGold,flex:1,justifyContent:"center",fontSize:12}}>💾 Salvar Chamado</button>
                      </div>
                    </div>
                  )}

                  {sgsItems.length===0?(
                    <div style={css.empty}><div style={{fontSize:36,marginBottom:8}}>📞</div><div style={{fontSize:13,color:t.txt2}}>Nenhum chamado SGS registrado</div></div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {sgsItems.map((s,i)=>{
                        const statusC = s.status==="encerrado"?t.verde:s.status==="andamento"?t.ouro:t.danger;
                        const statusIco = s.status==="encerrado"?"🟢":s.status==="andamento"?"🟡":"🔴";
                        const retornos = Array.isArray(s.retornos) ? s.retornos : [];
                        const ultimoRet = retornos.length>0 ? retornos[retornos.length-1] : null;
                        const dataUltimoRet = ultimoRet?.data || s.ultimo_retorno;
                        const diasSemRetorno = dataUltimoRet ? diffDias(parseData(inputToBr(dataUltimoRet)), new Date()) : null;
                        const alertaRetorno = diasSemRetorno !== null && diasSemRetorno > 5;
                        const isExpanded = expandedSgsId === (s.id||i);
                        const toggleExpand = () => {
                          setExpandedSgsId(isExpanded ? null : (s.id||i));
                          setSgsRetornoForm({data:"",descricao:""});
                        };
                        return (
                          <div key={s.id||i} style={{background:t.card,borderRadius:11,border:`1px solid ${isExpanded?statusC:t.borda}`,borderLeft:`3px solid ${statusC}`,overflow:"hidden",transition:"border .2s"}}>
                            {/* Cabeçalho do card — clicável para expandir */}
                            <div onClick={toggleExpand} style={{padding:12,cursor:"pointer"}}>
                              <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                <div style={{flex:1}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1,color:t.ouro}}>{s.numero||"—"}</span>
                                    <span style={{fontSize:9,fontWeight:700,color:statusC,background:`${statusC}18`,border:`1px solid ${statusC}33`,borderRadius:4,padding:"2px 7px"}}>{statusIco} {s.status?.toUpperCase()||"ABERTO"}</span>
                                    {s.dt_rel && <span style={{fontSize:9,color:t.txt2}}>DT: {s.dt_rel}</span>}
                                    {alertaRetorno && <span style={{fontSize:9,color:t.danger,fontWeight:700,background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:4,padding:"2px 7px"}}>⚠️ {diasSemRetorno}d sem retorno</span>}
                                    <span style={{marginLeft:"auto",fontSize:10,color:t.txt2,flexShrink:0}}>{isExpanded?"▲":"▼"}</span>
                                  </div>
                                  <div style={{fontSize:11,color:t.txt2,marginTop:3,lineHeight:1.5}}>
                                    📅 Chamado: <strong style={{color:t.txt}}>{s.data_chamado?new Date(s.data_chamado+"T12:00:00").toLocaleDateString("pt-BR"):"-"}</strong>
                                    {dataUltimoRet && <> · 🔄 Último retorno: <strong style={{color:t.txt}}>{new Date(dataUltimoRet+"T12:00:00").toLocaleDateString("pt-BR")}</strong></>}
                                    {retornos.length>0 && <span style={{marginLeft:6,fontSize:9,background:`rgba(240,185,11,.1)`,color:t.ouro,borderRadius:4,padding:"1px 5px"}}>{retornos.length} retorno{retornos.length>1?"s":""}</span>}
                                  </div>
                                  {s.descricao && <div style={{fontSize:11,color:t.txt,marginTop:4,lineHeight:1.4}}>{s.descricao}</div>}
                                </div>
                                <div style={{display:"flex",gap:5,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                                  <button onClick={()=>{const a=[...sgsItems];a[i]={...a[i],status:a[i].status==="encerrado"?"aberto":"encerrado"};saveSGS(a);}} style={{background:s.status==="encerrado"?`rgba(246,70,93,.08)`:`rgba(2,192,118,.08)`,border:`1px solid ${s.status==="encerrado"?t.danger:t.verde}33`,borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{s.status==="encerrado"?"🔴":"🟢"}</button>
                                  <button onClick={()=>{if(confirm("Excluir este chamado?")){const n=[...sgsItems];n.splice(i,1);saveSGS(n);}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                                </div>
                              </div>
                            </div>
                            {/* Seção expandida: retornos + form */}
                            {isExpanded && (
                              <div style={{borderTop:`1px solid ${t.borda}`,padding:"10px 12px",background:`rgba(240,185,11,.02)`}}>
                                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.ouro,marginBottom:8}}>🔄 Histórico de Retornos</div>
                                {retornos.length===0 ? (
                                  <div style={{fontSize:10,color:t.txt2,marginBottom:10}}>Nenhum retorno registrado ainda.</div>
                                ) : (
                                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
                                    {retornos.map((r,ri)=>(
                                      <div key={ri} style={{display:"flex",alignItems:"flex-start",gap:8,background:t.card2,borderRadius:7,padding:"7px 10px",border:`1px solid ${t.borda}`}}>
                                        <span style={{fontSize:9,fontWeight:700,color:t.azulLt,whiteSpace:"nowrap"}}>{r.data?new Date(r.data+"T12:00:00").toLocaleDateString("pt-BR"):"-"}</span>
                                        <span style={{fontSize:10,color:t.txt,flex:1}}>{r.descricao||"-"}</span>
                                        <button onClick={()=>{const a=[...sgsItems];a[i]={...a[i],retornos:retornos.filter((_,j)=>j!==ri),ultimo_retorno:retornos.filter((_,j)=>j!==ri).at(-1)?.data||s.data_chamado||""};saveSGS(a);}} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",fontSize:11,flexShrink:0,padding:2}}>✕</button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Form inline para novo retorno */}
                                <div style={{background:t.card2,borderRadius:8,padding:"8px 10px",border:`1px solid rgba(240,185,11,.2)`}}>
                                  <div style={{fontSize:9,fontWeight:700,color:t.ouro,marginBottom:6}}>＋ NOVO RETORNO</div>
                                  <div style={{display:"grid",gridTemplateColumns:"130px 1fr auto",gap:6,alignItems:"end"}}>
                                    <div>
                                      <div style={{fontSize:8,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Data</div>
                                      <input type="date" value={sgsRetornoForm.data} onChange={e=>setSgsRetornoForm(p=>({...p,data:e.target.value}))} style={{...css.inp,fontSize:11,padding:"6px 8px",width:"100%"}} />
                                    </div>
                                    <div>
                                      <div style={{fontSize:8,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Descrição</div>
                                      <input value={sgsRetornoForm.descricao} onChange={e=>setSgsRetornoForm(p=>({...p,descricao:e.target.value}))} placeholder="Resumo do retorno..." style={{...css.inp,fontSize:11,padding:"6px 8px",width:"100%"}} onKeyDown={e=>{
                                        if(e.key==="Enter"&&sgsRetornoForm.data){
                                          const novoRet={data:sgsRetornoForm.data,descricao:sgsRetornoForm.descricao};
                                          const novosRets=[...retornos,novoRet];
                                          const a=[...sgsItems];a[i]={...a[i],retornos:novosRets,ultimo_retorno:sgsRetornoForm.data};saveSGS(a);setSgsRetornoForm({data:"",descricao:""});
                                        }
                                      }} />
                                    </div>
                                    <button onClick={()=>{
                                      if(!sgsRetornoForm.data){showToast("⚠️ Informe a data do retorno","warn");return;}
                                      const novoRet={data:sgsRetornoForm.data,descricao:sgsRetornoForm.descricao};
                                      const novosRets=[...retornos,novoRet];
                                      const a=[...sgsItems];a[i]={...a[i],retornos:novosRets,ultimo_retorno:sgsRetornoForm.data};saveSGS(a);setSgsRetornoForm({data:"",descricao:""});
                                    }} style={{...css.btnGold,padding:"6px 12px",fontSize:11,flexShrink:0}}>Salvar</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ──── ID DIÁRIAS ──── */}
              {operSubTab==="diarias_id" && (
                <div>
                  <div style={{...css.secTitle,marginBottom:12}}>{hIco(<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>,t.ouro,12)} ID Diárias <span style={{flex:1,height:1,background:t.borda}} /></div>
                  {diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso").length===0?(
                    <div style={css.empty}><div style={{fontSize:36,marginBottom:8}}>🛏️</div><div style={{fontSize:13,color:t.txt2}}>Nenhum registro com diária identificado</div><div style={{fontSize:10,color:t.txt2,marginTop:4}}>Preencha o campo "Chegada" para calcular diárias.</div></div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {/* Alerta de verificação: RO pendente */}
                      {(()=>{
                        const semRo = diariasData.items.filter(i=>(i.tipo==="diaria"||i.tipo==="atraso")&&!i.r.ro);
                        if(semRo.length===0) return null;
                        return (
                          <div style={{background:`rgba(255,152,0,.07)`,border:`1px solid rgba(255,152,0,.28)`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                            <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
                            <div>
                              <div style={{fontSize:11,color:"#f57c00",fontWeight:700}}>{semRo.length} DT{semRo.length>1?"s":""} com diária sem RO preenchido</div>
                              <div style={{fontSize:9,color:t.txt2,marginTop:2}}>Preencha o campo RO em Documentação para cada DT. DTs: {semRo.map(i=>i.r.dt).join(", ")}</div>
                            </div>
                          </div>
                        );
                      })()}
                      {diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso").map(({r,tipo,dias},i)=>{
                        const semRo = !r.ro;
                        const tipoLabel = tipo==="diaria" ? `🛏️ ${dias||0}d de diária` : `⚠️ Perdeu Agenda`;
                        const tipoColor = tipo==="diaria" ? t.danger : t.ouro;
                        return (
                        <div key={i} onClick={()=>abrirDetalhe(r)} style={{background:t.card,borderRadius:11,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${tipoColor}`,padding:12,cursor:"pointer"}}>
                          <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            {r.nome||"—"}
                            <span style={{padding:"2px 8px",borderRadius:4,fontSize:9,fontWeight:700,background:`rgba(246,70,93,.08)`,color:tipoColor,border:`1px solid ${tipoColor}33`}}>{tipoLabel}</span>
                            {semRo && <span style={{padding:"2px 8px",borderRadius:4,fontSize:9,fontWeight:700,background:`rgba(255,152,0,.07)`,color:"#f57c00",border:`1px solid rgba(255,152,0,.3)`}}>⚠️ RO vazio</span>}
                            <span style={{marginLeft:"auto",fontSize:10,color:t.txt2}}>›</span>
                          </div>
                          <div style={{fontSize:11,color:t.txt2}}>
                            🔢 {r.dt} · 📅 Agenda: {r.data_agenda||"—"} · 🏁 Descarga: {r.data_desc||"—"}
                          </div>
                          {(r.diaria_prev||r.diaria_pg) && (
                            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                              <span style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:6,padding:"3px 8px",fontSize:10,color:t.danger}}>
                                Devido: <strong>{fmtMoeda(r.diaria_prev)}</strong>
                              </span>
                              <span style={{background:`rgba(2,192,118,.08)`,border:`1px solid rgba(2,192,118,.2)`,borderRadius:6,padding:"3px 8px",fontSize:10,color:t.verde}}>
                                Pago: <strong>{fmtMoeda(r.diaria_pg)}</strong>
                              </span>
                              {r.diaria_prev && r.diaria_pg && (()=>{
                                const saldo = (parseFloat(r.diaria_pg)||0)-(parseFloat(r.diaria_prev)||0);
                                return saldo < 0 ? (
                                  <span style={{background:`rgba(240,185,11,.08)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:6,padding:"3px 8px",fontSize:10,color:t.ouro}}>
                                    A pagar: <strong>{fmtMoeda(Math.abs(saldo))}</strong>
                                  </span>
                                ) : (
                                  <span style={{background:`rgba(2,192,118,.06)`,border:`1px solid rgba(2,192,118,.15)`,borderRadius:6,padding:"3px 8px",fontSize:10,color:t.verde}}>
                                    ✓ Quitado
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ──── OCORRÊNCIAS ──── */}
              {operSubTab==="ocorrencias" && (()=>{
                // Monta lista de DTs com qualquer tipo de ocorrência
                const pjOcorr = (v, def) => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : def); } catch { return def; } };
                const diariasSet = new Set(diariasData.items.filter(it=>it.tipo==="diaria"||it.tipo==="atraso").map(it=>it.r.dt));
                const dccSet = new Set(DADOS.filter(r=>{
                  if((r.status||"").toUpperCase()==="CANCELADA") return false;
                  const dccs = pjOcorr(r.minutas_dcc,[]);
                  return dccs.some(m=>m.cte||m.mdf||m.num||m.valor)||!!(r.cte_comp||r.mdf_comp);
                }).map(r=>r.dt));
                // Build entries (excluir DTs Canceladas)
                const ocorrEntries = DADOS.filter(r=>(r.status||"").toUpperCase()!=="CANCELADA").map(r=>{
                  const badges = [];
                  const hasOcorrLocal = (()=>{try{const v=localStorage.getItem(`co_ocorr_${r.dt}`);if(!v)return false;const arr=JSON.parse(v);return Array.isArray(arr)&&arr.length>0;}catch{return false;}})();
                  if(r.sgs)               badges.push({cor:t.ouro,   label:`SGS: ${r.sgs}`});
                  if(hasOcorrLocal)       badges.push({cor:"#E8820C", label:"Ocorrência"});
                  if(diariasSet.has(r.dt)) badges.push({cor:t.danger, label:"Diária"});
                  if(dccSet.has(r.dt))    badges.push({cor:t.azulLt,  label:"DCC"});
                  if(r.data_agenda&&!r.data_desc){
                    const da=parseData(r.data_agenda),hoje2=new Date();hoje2.setHours(0,0,0,0);
                    const dif=da?Math.floor((hoje2-da)/(1000*60*60*24)):0;
                    if(dif>=1) badges.push({cor:t.danger,label:`Atraso ${dif}d`});
                  }
                  return badges.length>0 ? {r, badges} : null;
                }).filter(Boolean);
                // Sort: atraso/diaria first, then sgs, then dcc, then ocorr
                const prioScore = b => {
                  if(b.label.startsWith("Atraso")||b.label==="Diária") return 0;
                  if(b.label.startsWith("SGS"))    return 1;
                  if(b.label==="DCC")              return 2;
                  return 3;
                };
                ocorrEntries.sort((a,b)=>Math.min(...a.badges.map(prioScore))-Math.min(...b.badges.map(prioScore)));
                return (
                  <div>
                    <div style={{...css.secTitle,marginBottom:8}}>
                      {hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.ouro,12)} Ocorrências por DT
                      <span style={{fontSize:9,background:"rgba(240,185,11,.12)",border:"1px solid rgba(240,185,11,.25)",borderRadius:10,padding:"1px 7px",color:t.ouro,fontWeight:700,marginLeft:4}}>{ocorrEntries.length}</span>
                      <span style={{flex:1,height:1,background:t.borda}} />
                    </div>
                    <div style={{fontSize:9,color:t.txt2,marginBottom:10,lineHeight:1.6}}>
                      DTs com ocorrências registradas (SGS · Ocorrência · Diária · DCC · Atraso). Clique para abrir o detalhe.
                    </div>
                    {/* Legenda */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                      {[{cor:t.ouro,l:"SGS"},{cor:"#E8820C",l:"Ocorrência"},{cor:t.danger,l:"Diária/Atraso"},{cor:t.azulLt,l:"DCC"}].map(({cor,l})=>{
                        const ativo = filtroOcorr===l;
                        return (
                          <span key={l} onClick={()=>setFiltroOcorr(ativo?null:l)} style={{fontSize:8,background:ativo?`${cor}35`:`${cor}18`,border:`1.5px solid ${ativo?cor:cor+"44"}`,borderRadius:10,padding:"2px 7px",color:cor,fontWeight:700,cursor:"pointer",userSelect:"none",transition:"all .15s",boxShadow:ativo?`0 0 6px ${cor}55`:"none"}}>
                            {l}{ativo?" ✕":""}
                          </span>
                        );
                      })}
                      {filtroOcorr && <span onClick={()=>setFiltroOcorr(null)} style={{fontSize:8,background:"rgba(128,128,128,.1)",border:"1px solid rgba(128,128,128,.3)",borderRadius:10,padding:"2px 7px",color:t.txt2,fontWeight:700,cursor:"pointer"}}>Limpar filtro</span>}
                    </div>
                    {(()=>{
                      const labelMap = {"SGS":(b)=>b.label.startsWith("SGS"),"Ocorrência":(b)=>b.label==="Ocorrência","Diária/Atraso":(b)=>b.label==="Diária"||b.label.startsWith("Atraso"),"DCC":(b)=>b.label==="DCC"};
                      const entradaFiltrada = filtroOcorr
                        ? ocorrEntries.filter(({badges})=>badges.some(labelMap[filtroOcorr]||(_=>false)))
                        : ocorrEntries;
                    return entradaFiltrada.length===0 ? (
                      <div style={css.empty}><div style={{fontSize:36,marginBottom:8}}>📭</div><div style={{fontSize:12,color:t.txt2}}>{filtroOcorr?`Nenhum DT com ocorrência do tipo "${filtroOcorr}"`:"Nenhum DT com ocorrências registradas"}</div></div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {entradaFiltrada.map(({r,badges},i)=>{
                          const topBadge = badges.sort((a,b)=>prioScore(a)-prioScore(b))[0];
                          return (
                            <div key={i} onClick={()=>abrirDetalhe(r)} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${topBadge.cor}`,padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:700,color:t.txt,marginBottom:3}}>
                                  {r.nome||"—"} <span style={{fontSize:9,color:t.txt2,fontWeight:400}}>· DT {r.dt}</span>
                                  {r.placa&&<span style={{fontSize:9,color:t.txt2,fontWeight:400}}> · {r.placa}</span>}
                                </div>
                                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                  {badges.map((b,bi)=>(
                                    <span key={bi} style={{fontSize:8,background:`${b.cor}18`,border:`1px solid ${b.cor}44`,borderRadius:8,padding:"1px 6px",color:b.cor,fontWeight:700}}>{b.label}</span>
                                  ))}
                                </div>
                              </div>
                              {hIco(<><polyline points="9 18 15 12 9 6"/></>,t.txt2,14,2)}
                            </div>
                          );
                        })}
                      </div>
                    )
                    ;})()}
                  </div>
                );
              })()}

              {/* ──── APONTAMENTOS ──── */}
              {operSubTab==="apontamentos" && (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{...css.secTitle,margin:0}}>{hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.ouro,12)} Apontamentos <span style={{fontSize:8,color:t.txt2,fontWeight:400,marginLeft:4}}>Descargas/Stretch</span> <span style={{flex:1,height:1,background:t.borda}} /></div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setRelCtrlDccOpen(true)} style={{background:`rgba(22,119,255,.08)`,border:`1px solid rgba(22,119,255,.28)`,borderRadius:8,padding:"8px 12px",color:t.azulLt,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>📊 Planilha Financeiro</button>
                      <button onClick={()=>{setApontForm({numero:"",item:"",linha:"",descricao_apontamento:"",pedido:"",mes_ref:"",filial:"",valor:"",frs_folha:"",tipo:"descarga",dt_rel:"",cidade:"",nf_numero:"",data_emissao:"",data_apontamento:new Date().toISOString().split("T")[0]});setApontFormOpen(true);}} style={{...css.btnGold,padding:"8px 12px",fontSize:11}}>＋ Novo</button>
                    </div>
                  </div>

                  {/* ── RESUMO MENSAL DE VALORES ── */}
                  {apontItems.length > 0 && (()=>{
                    // Agrupa por mes_ref e tipo, soma valores
                    const meses = [...new Set(apontItems.map(a=>a.mes_ref).filter(Boolean))].sort().reverse();
                    const mesSel = meses[0] || "";
                    const itensMes = apontItems.filter(a=>!mesSel || a.mes_ref===mesSel);
                    const tipos = ["descarga","stretch","deslocamento","outros"];
                    const tipoLabel = {descarga:"📦 Descarga",stretch:"📏 Stretch",deslocamento:"🚗 Deslocamento",outros:"📋 Outros"};
                    const tipoColor = {descarga:t.azulLt,stretch:t.verde,deslocamento:t.ouro,outros:t.txt2};
                    const totais = tipos.map(tp=>({tp,total:itensMes.filter(a=>a.tipo===tp).reduce((s,a)=>s+(parseFloat(a.valor)||0),0),qtd:itensMes.filter(a=>a.tipo===tp).length})).filter(x=>x.qtd>0);
                    const grandTotal = totais.reduce((s,x)=>s+x.total,0);
                    if(totais.length===0) return null;
                    return (
                      <div style={{background:`rgba(240,185,11,.04)`,border:`1px solid rgba(240,185,11,.18)`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                        <div style={{fontSize:9,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                          {hIco(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,t.ouro,10)} Resumo Mensal {mesSel?`— ${mesSel}`:""}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8,marginBottom:10}}>
                          {totais.map(({tp,total,qtd})=>(
                            <div key={tp} style={{background:t.card2,borderRadius:8,padding:"8px 10px",border:`1px solid ${t.borda}`}}>
                              <div style={{fontSize:10,color:tipoColor[tp],fontWeight:700,marginBottom:2}}>{tipoLabel[tp]}</div>
                              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:t.txt,lineHeight:1}}>{fmtMoeda(total)}</div>
                              <div style={{fontSize:8,color:t.txt2,marginTop:2}}>{qtd} apontamento{qtd!==1?"s":""}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{borderTop:`1px solid ${t.borda}`,paddingTop:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{fontSize:10,color:t.txt2,fontWeight:600}}>TOTAL DO MÊS</span>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:t.verde,letterSpacing:1}}>{fmtMoeda(grandTotal)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {(()=>{
                    const semFrs = apontItems.filter(a=>!a.frs_folha);
                    if(semFrs.length===0) return null;
                    const agora = Date.now();
                    const urgentes = semFrs.filter(a=>{
                      if(!a.criado_em) return false;
                      const dias = (agora - new Date(a.criado_em).getTime()) / 86400000;
                      return dias >= 2;
                    });
                    return (
                      <div style={{marginBottom:12}}>
                        {/* Banner geral */}
                        <div style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.25)`,borderRadius:10,padding:"10px 14px",marginBottom:urgentes.length>0?8:0,display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:18,flexShrink:0}}>🚨</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,color:t.danger,fontWeight:700}}>{semFrs.length} apontamento(s) sem FRS · Folha</div>
                            {urgentes.length>0 && <div style={{fontSize:10,color:t.danger,opacity:.8,marginTop:2}}>{urgentes.length} deles já passaram de <strong>2 dias</strong> sem FRS!</div>}
                          </div>
                        </div>
                        {/* Lista de urgentes (> 2 dias sem FRS) */}
                        {urgentes.map((a,i)=>{
                          const dias = Math.floor((agora - new Date(a.criado_em).getTime()) / 86400000);
                          return (
                            <div key={a.id||i} style={{background:`rgba(246,70,93,.05)`,border:`1.5px solid rgba(246,70,93,.35)`,borderRadius:8,padding:"8px 12px",marginBottom:4,display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:16,flexShrink:0}}>⏰</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,fontWeight:700,color:t.txt}}>Apontamento {a.numero||"s/nº"}{a.dt_rel?` · DT ${a.dt_rel}`:""}</div>
                                <div style={{fontSize:10,color:t.danger,marginTop:2}}>Sem FRS há <strong>{dias} dia{dias!==1?"s":""}</strong> — emitir urgente!</div>
                              </div>
                              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:t.danger,lineHeight:1}}>{dias}d</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {apontFormOpen && (
                    <div style={{background:t.card,borderRadius:12,border:`1px solid ${t.ouro}44`,padding:14,marginBottom:14}}>
                      <div style={{fontWeight:700,color:t.ouro,fontSize:12,marginBottom:10}}>📑 Novo Apontamento</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        {/* Linha 1 */}
                        <div><label style={lblO}>Nº Apontamento</label><input value={apontForm.numero} onChange={e=>setApontForm(p=>({...p,numero:e.target.value}))} placeholder="Ex: 1000000002580650" style={inpO} /></div>
                        <div><label style={lblO}>Pedido</label><input value={apontForm.pedido} onChange={e=>setApontForm(p=>({...p,pedido:e.target.value}))} placeholder="Ex: 4502384474" style={inpO} /></div>
                        {/* Linha 2 */}
                        <div><label style={lblO}>Item</label><input type="number" value={apontForm.item} onChange={e=>setApontForm(p=>({...p,item:e.target.value}))} placeholder="Ex: 1" style={inpO} /></div>
                        <div><label style={lblO}>Linha</label><input type="number" value={apontForm.linha} onChange={e=>setApontForm(p=>({...p,linha:e.target.value}))} placeholder="Ex: 10" style={inpO} /></div>
                        {/* Linha 3 — Descrição full width */}
                        <div style={{gridColumn:"1/-1"}}><label style={lblO}>Descrição do Apontamento</label><input value={apontForm.descricao_apontamento} onChange={e=>setApontForm(p=>({...p,descricao_apontamento:e.target.value}))} placeholder="Ex: ARMAZENAGEM OU CARGA E DESCARGA S/ M.O." style={inpO} /></div>
                        {/* Linha 4 */}
                        <div><label style={lblO}>Mês Referência</label><input value={apontForm.mes_ref} onChange={e=>setApontForm(p=>({...p,mes_ref:e.target.value}))} placeholder="MM/AAAA" style={inpO} /></div>
                        <div><label style={lblO}>Filial</label><input value={apontForm.filial} onChange={e=>setApontForm(p=>({...p,filial:e.target.value}))} style={inpO} /></div>
                        {/* Linha 5 */}
                        <div><label style={lblO}>Valor (R$)</label><input type="number" value={apontForm.valor} onChange={e=>setApontForm(p=>({...p,valor:e.target.value}))} placeholder="0,00" style={inpO} /></div>
                        <div>
                          <label style={{...lblO,color:apontForm.frs_folha?"":t.danger}}>FRS · Folha {!apontForm.frs_folha&&<span style={{color:t.danger}}>⚠️ obrigatório</span>}</label>
                          <input value={apontForm.frs_folha} onChange={e=>setApontForm(p=>({...p,frs_folha:e.target.value}))} style={{...inpO,border:`1.5px solid ${apontForm.frs_folha?t.borda2:t.danger}`}} />
                        </div>
                        {/* Linha 6 */}
                        <div><label style={lblO}>Tipo</label>
                          <select value={apontForm.tipo} onChange={e=>setApontForm(p=>({...p,tipo:e.target.value}))} style={{...inpO,appearance:"none"}}>
                            <option value="descarga">📦 Descarga</option>
                            <option value="stretch">📏 Stretch</option>
                            <option value="deslocamento">🚗 Deslocamento</option>
                            <option value="outros">📋 Outros</option>
                          </select>
                        </div>
                        <div><label style={lblO}>DT Relacionado</label><input value={apontForm.dt_rel} onChange={e=>setApontForm(p=>({...p,dt_rel:e.target.value}))} style={inpO} /></div>
                        {/* Linha 7 */}
                        <div><label style={lblO}>Cidade</label><input value={apontForm.cidade} onChange={e=>setApontForm(p=>({...p,cidade:e.target.value}))} style={inpO} /></div>
                        <div><label style={lblO}>Data Apontamento</label><input type="date" value={apontForm.data_apontamento} onChange={e=>setApontForm(p=>({...p,data_apontamento:e.target.value}))} style={inpO} /></div>
                        {/* Linha 8 — NF (preencher depois) */}
                        <div><label style={{...lblO,color:t.txt2}}>NF-e / NFS-e <span style={{fontSize:8,opacity:.7}}>(depois)</span></label><input value={apontForm.nf_numero} onChange={e=>setApontForm(p=>({...p,nf_numero:e.target.value}))} placeholder="Preencher depois" style={inpO} /></div>
                        <div><label style={{...lblO,color:t.txt2}}>Data Emissão NF <span style={{fontSize:8,opacity:.7}}>(depois)</span></label><input type="date" value={apontForm.data_emissao} onChange={e=>setApontForm(p=>({...p,data_emissao:e.target.value}))} style={inpO} /></div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>setApontFormOpen(false)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:8,padding:"8px 12px",color:t.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                        <button onClick={async ()=>{
                          if(!apontForm.numero){showToast("⚠️ Informe o nº do apontamento","warn");return;}
                          const novoItem={...apontForm,id:Date.now(),criado_em:new Date().toISOString()};
                          const nova=[novoItem,...apontItems];
                          await saveAponts(nova, novoItem);
                          setApontFormOpen(false);
                          setApontForm({numero:"",item:"",linha:"",descricao_apontamento:"",pedido:"",mes_ref:"",filial:"",valor:"",frs_folha:"",tipo:"descarga",dt_rel:"",cidade:"",nf_numero:"",data_emissao:"",data_apontamento:new Date().toISOString().split("T")[0]});
                          showToast("✅ Apontamento salvo!","ok");
                        }} style={{...css.btnGold,flex:1,justifyContent:"center",fontSize:12}}>💾 Salvar Apontamento</button>
                      </div>
                    </div>
                  )}

                  {apontLoading?(
                    <div style={{textAlign:"center",padding:20,color:t.txt2,fontSize:12}}>Carregando apontamentos...</div>
                  ):apontItems.length===0?(
                    <div style={css.empty}><div style={{fontSize:36,marginBottom:8}}>📑</div><div style={{fontSize:13,color:t.txt2}}>Nenhum apontamento registrado</div></div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {apontItems.map((a,i)=>{
                        const semNF = !a.nf_numero;
                        const semFRS = !a.frs_folha;
                        const bordaC = semFRS ? t.danger : semNF ? t.warn : t.verde;
                        return (
                        <div key={a.id||i} style={{background:t.card,borderRadius:11,border:`1px solid ${t.borda}`,borderLeft:`3px solid ${bordaC}`,padding:12}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1,color:t.ouro}}>{a.numero||a.apontamento||"—"}</span>
                            {(a.item||a.linha)&&<span style={{fontSize:9,color:t.txt2,background:t.card2,border:`1px solid ${t.borda}`,borderRadius:4,padding:"2px 6px"}}>It.{a.item||"?"} / Ln.{a.linha||"?"}</span>}
                            <span style={{fontSize:9,fontWeight:700,color:t.txt2,background:t.card2,border:`1px solid ${t.borda}`,borderRadius:4,padding:"2px 7px"}}>{a.tipo==="stretch"?"📏 Stretch":a.tipo==="deslocamento"?"🚗 Deslocamento":a.tipo==="outros"?"📋 Outros":"📦 Descarga"}</span>
                            {semFRS && <span style={{fontSize:9,fontWeight:700,color:t.danger,background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:4,padding:"2px 7px"}}>⚠️ FRS vazio!</span>}
                            {semNF && !semFRS && <span style={{fontSize:9,fontWeight:700,color:t.warn,background:`rgba(245,158,11,.08)`,border:`1px solid rgba(245,158,11,.2)`,borderRadius:4,padding:"2px 7px"}}>📄 NF pendente</span>}
                            {a.status_alerta && <span style={{fontSize:9,fontWeight:700,color:t.danger,background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:4,padding:"2px 7px"}}>🚨 ALERTA</span>}
                          </div>
                          {a.descricao_apontamento&&<div style={{fontSize:10,color:t.txt2,marginBottom:6,fontStyle:"italic"}}>{a.descricao_apontamento}</div>}
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:t.txt2}}>
                            <div>Pedido: <strong style={{color:t.txt}}>{a.pedido||"—"}</strong></div>
                            <div>Mês ref: <strong style={{color:t.txt}}>{a.mes_ref||a.periodo_referente||"—"}</strong></div>
                            <div>Filial: <strong style={{color:t.txt}}>{a.filial||"—"}</strong></div>
                            <div>Valor: <strong style={{color:t.verde}}>{a.valor?fmtMoeda(a.valor):"—"}</strong></div>
                            {a.cidade&&<div>Cidade: <strong style={{color:t.txt}}>{a.cidade}</strong></div>}
                            {(a.dt_rel||a.dt_relacionado)&&<div>DT: <strong style={{color:t.ouro}}>{a.dt_rel||a.dt_relacionado}</strong></div>}
                            <div style={{gridColumn:"1/-1"}}>FRS · Folha: <strong style={{color:semFRS?t.danger:t.verde}}>{a.frs_folha||a.folha_registro||"⚠️ NÃO PREENCHIDO"}</strong></div>
                            {(a.nf_numero)&&<div>NF-e/NFS-e: <strong style={{color:t.azulLt}}>{a.nf_numero}</strong></div>}
                            {(a.data_emissao)&&<div>Emissão NF: <strong style={{color:t.txt}}>{a.data_emissao}</strong></div>}
                            {a.data_apontamento&&<div style={{gridColumn:"1/-1",fontSize:9,color:t.txt2,marginTop:2}}>📅 {a.data_apontamento}{a.updated_at?` · Atualizado: ${new Date(a.updated_at).toLocaleDateString("pt-BR")}`:""}</div>}
                          </div>
                          <button onClick={async()=>{if(confirm("Excluir apontamento?")){const n=[...apontItems];n.splice(i,1);await deleteApontSupabase(a.numero||a.apontamento);await saveAponts(n);}}} style={{marginTop:8,background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:10,color:t.danger,fontFamily:"inherit"}}>🗑️ Excluir</button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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
                  onChange={e=>{setMotBusca(e.target.value);setMotPagina(1);}}
                  placeholder="Buscar por nome ou placa cavalo..."
                  style={{...css.inp,flex:1,minWidth:140}}
                />
                <button onClick={exportarVCard} title="Exportar todos como vCard (.vcf) para importar no Google Contacts" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11}}>📤 vCard</button>
                <button onClick={()=>{
                  // Gerar sugestões de vínculo cruzando motoristas × DADOS
                  const PLACA_RE=/\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/g;
                  const sugs=[];
                  motoristas.forEach(mot=>{
                    const impPlacas=[mot.placa1,mot.placa2,mot.placa3,mot.placa4].filter(Boolean).map(p=>p.toUpperCase().replace(/[^A-Z0-9]/g,""));
                    if(!impPlacas.length)return;
                    DADOS.forEach(reg=>{
                      const regPlaca=(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
                      if(!regPlaca||!impPlacas.includes(regPlaca))return;
                      const nomeReg=(reg.nome||"").toUpperCase().trim();
                      const nomeM=(mot.nome||"").toUpperCase().trim();
                      if(nomeReg&&nomeReg===nomeM)return;
                      sugs.push({mot,reg,placa:regPlaca,aceito:null});
                    });
                  });
                  const uniq=sugs.filter((s,i)=>sugs.findIndex(x=>x.reg.dt===s.reg.dt&&x.mot.nome===s.mot.nome)===i);
                  if(!uniq.length){showToast("✅ Nenhuma nova sugestão de vínculo encontrada","ok");return;}
                  setMotSugestData(uniq.map(s=>({...s,aceito:null})));
                  setMotSugestOpen(true);
                }} title="Cruzar placas dos motoristas com registros de viagem e sugerir vínculos" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11,background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,color:t.verde}}>🔗 Sugerir Compatíveis</button>
                <button onClick={()=>setRelGeralOpen(true)} title="Gerar relatório geral de operações em PDF" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11,background:`rgba(240,185,11,.12)`,border:`1px solid rgba(240,185,11,.3)`,color:t.ouro}}>📊 Rel. Geral</button>
                {canEdit && <button onClick={()=>{setFormData({});setEditIdx(-1);setMotDupSugest(null);setModalOpen("motorista")}} style={{...css.btnGold,whiteSpace:"nowrap"}}>＋ NOVO</button>}
                {perfil==="admin" && motoristas.length>0 && (
                  <button onClick={()=>{setMotExcluirTodosTexto("");setMotExcluirTodosOpen(true);}} title="Excluir TODOS os motoristas salvos" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11,background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.3)`,color:t.danger}}>
                    🗑️ Excluir Todos
                  </button>
                )}
              </div>
              {/* Barra de seleção em lote */}
              {canEdit && motSelecionados.size > 0 && (
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:`rgba(246,70,93,.07)`,border:`1px solid rgba(246,70,93,.25)`,borderRadius:9,padding:"8px 12px"}}>
                  <span style={{fontSize:11,fontWeight:700,color:t.danger,flex:1}}>{motSelecionados.size} selecionado(s)</span>
                  {motSelecionados.size >= 2 && motSelecionados.size < motoristas.length && (
                    <button onClick={()=>setMotSelecionados(new Set(motoristas.map((_,i)=>i)))} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:6,padding:"4px 12px",fontSize:10,color:t.ouro,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Selecionar Todos ({motoristas.length})</button>
                  )}
                  <button onClick={()=>setMotSelecionados(new Set())} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:6,padding:"4px 10px",fontSize:10,color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>Desmarcar</button>
                  <button onClick={()=>{setMotExcluirLoteTexto("");setMotExcluirLoteOpen(true);}} style={{background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.3)`,borderRadius:6,padding:"4px 12px",fontSize:10,color:t.danger,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,12)} Excluir selecionados</button>
                </div>
              )}
              <div style={{fontSize:10,color:t.txt2,marginBottom:8,display:"flex",gap:8,alignItems:"center"}}>
                {motBusca
                  ? <span>{motFiltrados.length} resultado{motFiltrados.length!==1?"s":""}</span>
                  : <span>{motoristas.length} motorista{motoristas.length!==1?"s":""} cadastrado{motoristas.length!==1?"s":""}</span>
                }
                {motoristas.length>0 && <span style={{opacity:.6}}>· exibindo {Math.min(motPagina*50,motFiltrados.length)} de {motFiltrados.length}</span>}
              </div>
              {motoristas.length === 0 ? (
                <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>🚛</div><h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt2}}>SEM MOTORISTAS</h3><p style={{fontSize:11,color:t.txt2}}>Clique em + NOVO para cadastrar.</p></div>
              ) : motFiltrados.length === 0 ? (
                <div style={css.empty}><div style={{fontSize:30,marginBottom:8}}>🔍</div><p style={{fontSize:12,color:t.txt2}}>Nenhum motorista encontrado para "{motBusca}"</p></div>
              ) : motFiltrados.slice(0, motPagina * 50).map((m,i) => {
                const idxReal = motoristas.indexOf(m);
                const selecionado = motSelecionados.has(idxReal);
                const vincBadgeC = m.vinculo==="Frota"?t.azulLt:m.vinculo==="Agregado"?t.ouro:m.vinculo==="Terceiro"?t.verde:t.txt2;
                const vincBadgeBg = m.vinculo==="Frota"?`rgba(22,119,255,.08)`:m.vinculo==="Agregado"?`rgba(240,185,11,.08)`:m.vinculo==="Terceiro"?`rgba(2,192,118,.08)`:`rgba(128,128,128,.06)`;
                return (
                  <div key={i} className="co-card" style={{background:t.card,borderRadius:12,border:`1px solid ${selecionado?`rgba(246,70,93,.4)`:t.borda}`,borderLeft:`4px solid ${selecionado?t.danger:vincBadgeC}`,padding:12,marginBottom:10,transition:"border .15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      {canEdit && (
                        <input type="checkbox" checked={selecionado} onChange={()=>{
                          const ns=new Set(motSelecionados);
                          if(ns.has(idxReal))ns.delete(idxReal);else ns.add(idxReal);
                          setMotSelecionados(ns);
                        }} style={{width:16,height:16,cursor:"pointer",accentColor:t.danger,flexShrink:0}} />
                      )}
                      <div style={{width:38,height:38,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#000",flexShrink:0}}>{(m.nome||"M")[0].toUpperCase()}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:t.txt}}>{m.nome||"—"}</div>
                        <div style={{fontSize:10,color:t.txt2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          {m.cpf && <span>{m.cpf}</span>}
                          {m.vinculo && <span style={{background:vincBadgeBg,border:`1px solid ${vincBadgeC}33`,borderRadius:4,padding:"1px 6px",color:vincBadgeC,fontWeight:700,fontSize:9,textTransform:"uppercase"}}>{m.vinculo}</span>}
                        </div>
                      </div>
                      <button onClick={()=>gerarRelatorioMotorista(m)} title="Relatório PDF deste motorista" style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:6,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.ouro,14)}</button>
                      {canEdit && <>
                        <button onClick={()=>{setFormData({...m});setEditIdx(idxReal);setMotDupSugest(null);setModalOpen("motorista")}} style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:6,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,t.azulLt,14)}</button>
                        <button onClick={()=>{if(window.confirm(`Excluir "${m.nome}"?`)){const nm=[...motoristas];nm.splice(idxReal,1);saveMotoristasLS(nm);showToast("🗑️ Removido");}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,14)}</button>
                      </>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:m.tel||m.banco?6:0}}>
                      {[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).map((p,j) => (
                        <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:4,padding:"2px 7px"}}>{p}</span>
                      ))}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:10,fontSize:10,color:t.txt2}}>
                      {m.tel && (m.tel.split(/[,;\n\/\\|]+/).map(s=>s.trim()).filter(Boolean)).map((tel,ti)=>(
                        <span key={ti}>📞 {tel}</span>
                      ))}
                      {m.banco && <span>🏦 {m.banco}{m.agencia?` · Ag ${m.agencia}`:""}{m.conta?` · CC ${m.conta}`:""}</span>}
                      {m.pix_tipo && <span style={{color:t.azulLt}}>PIX {m.pix_tipo}: {m.pix_chave||"—"}</span>}
                    </div>
                  </div>
                );
              })}
              {motFiltrados.length > motPagina * 50 && (
                <button onClick={()=>setMotPagina(p=>p+1)} style={{width:"100%",padding:12,borderRadius:10,border:`1px solid ${t.borda}`,background:t.card2,color:t.ouro,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
                  ▼ Carregar mais ({motFiltrados.length - motPagina*50} restantes)
                </button>
              )}
            </div>
          );
        })()}

        {/* ═══ ADMIN ═══ */}
        {activeTab === "admin" && isAdmin && (
          <div>
            <div style={css.secTitle} className="sec-divider">{hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.ouro,12)} Banco de Dados</div>            <div style={{...css.card,marginBottom:16}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${t.borda}`}}>
                <div style={{width:24,height:24,background:t.azul,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.azulLt,12)}</div>
                <div><div style={{fontSize:12,fontWeight:600,color:t.txt}}>Supabase PostgreSQL</div><div style={{fontSize:9,color:t.txt2}}>{ultimaSync?`Sync: ${ultimaSync}`:"Nunca sincronizado"}</div></div>
                <span style={{marginLeft:"auto",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:DESIGN.r.badge,...(connStatus==="online"?{background:`rgba(2,192,118,.08)`,color:t.verde,border:`1px solid rgba(2,192,118,.2)`}:{background:`rgba(246,70,93,.06)`,color:t.danger,border:`1px solid rgba(246,70,93,.15)`})}}>{connStatus==="online"?"ONLINE":"OFFLINE"}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:t.borda}}>
                <button onClick={sincronizar} style={{background:t.card,border:"none",padding:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:DESIGN.fnt.b}}>{hIco(<><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></>,t.azulLt,20)}<span style={{fontSize:9,color:t.txt2,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>Sincronizar</span></button>
                <button onClick={()=>setModalOpen("configdb")} style={{background:t.card,border:"none",padding:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:DESIGN.fnt.b}}>{hIco(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,t.txt2,20)}<span style={{fontSize:9,color:t.txt2,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>Config DB</span></button>
              </div>
            </div>

            {/* ── GESTÃO DE USUÁRIOS ─────────────────────────── */}
            <div style={css.secTitle}>{hIco(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,t.ouro,12)} Gestão de Usuários <span style={{flex:1,height:1,background:t.borda}} /></div>

            {/* ── Pendentes de Aprovação ── */}
            {usuariosPendentes.length > 0 ? (
              <div style={{...css.card,marginBottom:12,border:`1px solid rgba(240,185,11,.28)`,background:`rgba(240,185,11,.03)`}}>
                <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid rgba(240,185,11,.14)`}}>
                  <span style={{fontSize:11,fontWeight:700,color:t.ouro,letterSpacing:.5}}>⏳ AGUARDANDO APROVAÇÃO ({usuariosPendentes.length})</span>
                  <button onClick={carregarPendentes} title="Atualizar lista" style={{marginLeft:"auto",background:"transparent",border:`1px solid ${t.borda}`,borderRadius:DESIGN.r.badge,padding:"2px 9px",fontSize:10,color:t.txt2,cursor:"pointer",fontFamily:DESIGN.fnt.b}}>↻</button>
                </div>
                {usuariosPendentes.map((u,i)=>(
                  <div key={i} style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:i<usuariosPendentes.length-1?`1px solid ${t.borda}`:"none"}}>
                    <div style={{width:38,height:38,borderRadius:10,background:"rgba(240,185,11,.1)",border:"1.5px solid rgba(240,185,11,.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:t.ouro,flexShrink:0}}>{u.nome?.[0]?.toUpperCase()||"?"}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:t.txt}}>{u.nome||u.email}</div>
                      <div style={{fontSize:10,color:t.txt2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📧 {u.email}</div>
                      {u.solicitado_em&&<div style={{fontSize:9,color:t.txt2,marginTop:1}}>Solicitado: {new Date(u.solicitado_em).toLocaleString("pt-BR")}</div>}
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>{setAprovarModal(u);setAprovarPerfil("operador");}} style={{background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:8,padding:"5px 10px",fontSize:10,color:t.verde,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>✓ Aprovar</button>
                      <button onClick={async()=>{if(!confirm(`Rejeitar acesso de "${u.nome||u.email}"?`))return;const conn=getConexao();if(conn)await supaFetch(conn.url,conn.key,"DELETE",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(u.email)}`).catch(()=>{});setUsuariosPendentes(p=>p.filter(x=>x.email!==u.email));showToast("🚫 Acesso rejeitado");}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.danger,12)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{textAlign:"center",marginBottom:10}}>
                <button onClick={carregarPendentes} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:6,padding:"4px 14px",fontSize:10,color:t.txt2,cursor:"pointer"}}>↻ Verificar solicitações pendentes</button>
              </div>
            )}

            {/* ── Modal de Aprovação com seleção de perfil ── */}
            {aprovarModal&&(
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20}}>
                <div style={{background:t.card,borderRadius:18,padding:"24px 22px",width:"100%",maxWidth:340,border:`1px solid ${t.borda}`,boxShadow:`0 24px 60px ${t.shadow}`}}>
                  <div style={{fontSize:15,fontWeight:700,color:t.txt,marginBottom:4}}>✅ Aprovar Acesso</div>
                  <div style={{fontSize:11,color:t.txt2,marginBottom:16,lineHeight:1.5}}>Definindo tipo de acesso para <b style={{color:t.ouro}}>{aprovarModal.nome||aprovarModal.email}</b></div>
                  <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:6}}>Tipo de Usuário</label>
                  <select value={aprovarPerfil} onChange={e=>setAprovarPerfil(e.target.value)} style={{...css.inp,marginBottom:10,color:t.ouro,fontWeight:700}}>
                    <option value="visualizador">Visualizador — Apenas visualiza dados</option>
                    <option value="operador">Operador — Edita registros operacionais</option>
                    <option value="gerente">Gerente — Acesso amplo (exceto DB/Usuários)</option>
                    <option value="admin">Admin — Acesso total ao sistema</option>
                  </select>
                  <div style={{background:t.card2,borderRadius:9,padding:"10px 12px",marginBottom:16,border:`1px solid ${t.borda}`}}>
                    <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,marginBottom:7}}>Permissões incluídas neste perfil</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 10px"}}>
                      {Object.entries(PERMS_PADRAO[aprovarPerfil]||{}).map(([k,v])=>(
                        <div key={k} style={{fontSize:10,color:v?t.verde:t.txt2,display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontWeight:700,fontSize:11}}>{v?"✓":"✗"}</span>
                          <span style={{textTransform:"capitalize"}}>{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setAprovarModal(null)} style={{flex:1,padding:"10px",background:"transparent",border:`1px solid ${t.borda}`,borderRadius:9,color:t.txt2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
                    <button onClick={async()=>{
                      const pm={...PERMS_PADRAO[aprovarPerfil]};
                      const conn=getConexao();
                      if(conn){await supaFetch(conn.url,conn.key,"PATCH",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(aprovarModal.email)}`,{status:"aprovado",perfil:aprovarPerfil,perms:JSON.stringify(pm),aprovado_em:new Date().toISOString()}).catch(()=>{});}
                      const novoUser={...aprovarModal,status:"aprovado",perfil:aprovarPerfil,perms:pm};
                      setUsuariosPendentes(p=>p.filter(u=>u.email!==aprovarModal.email));
                      setUsuarios(p=>{const nova=[...p,novoUser];saveJSON("co_usuarios_local",nova);return nova;});
                      await registrarLog("APROVAR_USUARIO",`Acesso concedido para ${aprovarModal.email} como ${aprovarPerfil}`);
                      showToast(`✅ ${aprovarModal.nome||aprovarModal.email} aprovado como ${aprovarPerfil}!`,"ok");
                      setAprovarModal(null);
                    }} style={{flex:2,padding:"10px",background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:9,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      ✅ Confirmar Aprovação
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Usuários com Acesso Ativo — colapsável ── */}
            <div style={{...css.secTitle,marginTop:10,cursor:"pointer",userSelect:"none"}} onClick={()=>setOauthAccessOpen(!oauthAccessOpen)}>
              <svg width="14" height="14" viewBox="0 0 48 48" style={{flexShrink:0,marginRight:2}}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Usuários com Acesso ({usuarios.length}) <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{oauthAccessOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {oauthAccessOpen&&(
              <div style={{...css.card,padding:14,marginBottom:16,background:t.card2}}>
                <div style={{fontSize:10,color:t.txt2,marginBottom:10,lineHeight:1.6,padding:"7px 10px",background:`rgba(240,185,11,.05)`,borderRadius:7,border:`1px solid rgba(240,185,11,.12)`}}>
                  ℹ️ Acesso via Google. Altere o <b>Tipo</b> para redefinir o que o usuário pode ver e fazer.
                </div>
                {usuarios.length===0&&<div style={{textAlign:"center",color:t.txt2,fontSize:11,padding:"12px 0"}}>Nenhum usuário aprovado ainda.</div>}
                {usuarios.map((u,i)=>{
                  const corPerfil=u.perfil==="admin"?`linear-gradient(135deg,${t.ouroDk},${t.ouro})`:u.perfil==="gerente"?`linear-gradient(135deg,${t.azul},${t.azulLt})`:u.perfil==="operador"?`linear-gradient(135deg,#555,#848e9c)`:`linear-gradient(135deg,#444,#666)`;
                  return(
                    <div key={i} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:9,background:corPerfil,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#000",flexShrink:0}}>{u.nome?.[0]?.toUpperCase()||"?"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.nome||u.email}</div>
                        <div style={{fontSize:10,color:t.txt2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📧 {u.email}</div>
                      </div>
                      <select value={u.perfil||"visualizador"} onChange={async e=>{
                        const np=e.target.value;const pm={...PERMS_PADRAO[np]||PERMS_PADRAO.visualizador};
                        const nu=[...usuarios];nu[i]={...nu[i],perfil:np,perms:pm};
                        setUsuarios(nu);saveJSON("co_usuarios_local",nu);
                        const conn=getConexao();
                        if(conn)await supaFetch(conn.url,conn.key,"PATCH",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(u.email)}`,{perfil:np,perms:JSON.stringify(pm)}).catch(()=>{});
                        showToast(`✅ ${u.nome||u.email} → ${np}`,"ok");
                      }} style={{background:t.card2,border:`1px solid ${t.borda2||t.borda}`,borderRadius:6,padding:"4px 8px",fontSize:10,color:t.ouro,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                        <option value="visualizador">Visualizador</option>
                        <option value="operador">Operador</option>
                        <option value="gerente">Gerente</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={()=>{if(confirm(`Revogar acesso de "${u.nome||u.email}"?`)){const nu=[...usuarios];nu.splice(i,1);setUsuarios(nu);saveJSON("co_usuarios_local",nu);const conn=getConexao();if(conn)supaFetch(conn.url,conn.key,"DELETE",`${TABLE_USUARIOS}?email=eq.${encodeURIComponent(u.email)}`).catch(()=>{});showToast("🚫 Acesso revogado");}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.danger,12)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Conexões Supabase — colapsável */}
            <div style={{...css.secTitle,marginTop:20,cursor:"pointer",userSelect:"none"}} onClick={()=>setConexoesOpen(!conexoesOpen)}>
              {hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.ouro,12)} Conexões Supabase <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{conexoesOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {conexoesOpen && (
              <div style={{marginBottom:16}}>
                {conexoes.map((c,i) => (
                  <div key={i} style={{background:t.card,borderRadius:10,border:`1px solid ${t.borda}`,padding:10,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                    {hIco(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,t.txt2,14)}
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||c.url}</div></div>
                    <button onClick={()=>{const nc=[...conexoes];nc.splice(i,1);saveConexoesLS(nc);showToast("Removido");}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:DESIGN.r.badge,padding:"4px 8px",cursor:"pointer",fontSize:10,color:t.danger,fontFamily:DESIGN.fnt.b}}>✕</button>
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

            {/* Google Sheets */}
            <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={async()=>{
              const next=!gsheetsOpen; setGsheetsOpen(next);
              if(next&&!syncStatus){
                setSyncStatusLoading(true);
                const v=await getConfigRemoto("gsheet_sync_status");
                setSyncStatus(v?JSON.parse(v):null);
                setSyncStatusLoading(false);
              }
            }}>
              {hIco(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,t.verde,12)} Sincronização Google Sheets <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{gsheetsOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {gsheetsOpen && (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>

                {/* ── PAINEL DE STATUS DA ÚLTIMA SINCRONIZAÇÃO ── */}
                <div style={{...css.card,padding:12,borderLeft:`3px solid ${syncStatus?(syncStatus.ok?t.verde:(syncStatus.erros_http>0?t.danger:t.ouro)):t.borda}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:t.txt}}>📡 Última Sincronização</div>
                    <button onClick={async()=>{setSyncStatusLoading(true);const v=await getConfigRemoto("gsheet_sync_status");setSyncStatus(v?JSON.parse(v):null);setSyncStatusLoading(false);}} style={{...css.hBtn,fontSize:10,padding:"3px 8px",marginLeft:"auto"}}>{syncStatusLoading?"⏳":"↺ Atualizar"}</button>
                  </div>
                  {syncStatusLoading && <div style={{fontSize:10,color:t.txt2}}>Buscando status...</div>}
                  {!syncStatusLoading && !syncStatus && (
                    <div style={{fontSize:10,color:t.txt2}}>⚠️ Nenhum status encontrado — o script ainda não rodou ou não está gravando no Supabase.</div>
                  )}
                  {!syncStatusLoading && syncStatus && (
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{...css.badge(syncStatus.ok?t.verde:t.danger,syncStatus.ok?`rgba(2,192,118,.1)`:`rgba(246,70,93,.1)`,syncStatus.ok?`rgba(2,192,118,.3)`:`rgba(246,70,93,.3)`)}}>{syncStatus.ok?"✅ OK":"❌ COM ERROS"}</span>
                        <span style={{fontSize:10,color:t.txt2}}>🕐 {syncStatus.timestamp}</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                        <div style={{background:t.card2,borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,fontWeight:700,color:t.azulLt}}>{syncStatus.total_planilha||0}</div>
                          <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:1}}>Linhas na planilha</div>
                        </div>
                        <div style={{background:t.card2,borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,fontWeight:700,color:t.verde}}>{syncStatus.sincronizados||0}</div>
                          <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:1}}>Sincronizados</div>
                        </div>
                        <div style={{background:t.card2,borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,fontWeight:700,color:syncStatus.ignorados>0?t.ouro:t.txt2}}>{syncStatus.ignorados||0}</div>
                          <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:1}}>Ignorados</div>
                        </div>
                      </div>
                      {syncStatus.motivos_ignorados?.length>0&&(
                        <div style={{background:`rgba(240,185,11,.06)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:7,padding:"8px 10px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:t.ouro,marginBottom:4}}>⚠️ Linhas ignoradas (sem DT preenchida):</div>
                          {syncStatus.motivos_ignorados.map((m,i)=><div key={i} style={{fontSize:9,color:t.txt2,lineHeight:1.6}}>• {m}</div>)}
                        </div>
                      )}
                      {syncStatus.info?.length>0&&(
                        <div style={{background:`rgba(59,130,246,.06)`,border:`1px solid rgba(59,130,246,.2)`,borderRadius:7,padding:"8px 10px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:t.azulLt,marginBottom:4}}>📋 Abas processadas:</div>
                          {syncStatus.info.map((m,i)=><div key={i} style={{fontSize:9,color:t.txt2,lineHeight:1.6}}>• {m}</div>)}
                        </div>
                      )}
                      {syncStatus.erros_detalhes?.length>0&&(
                        <div style={{background:`rgba(246,70,93,.06)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:7,padding:"8px 10px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:t.danger,marginBottom:4}}>❌ Erros de envio:</div>
                          {syncStatus.erros_detalhes.map((e,i)=><div key={i} style={{fontSize:9,color:t.txt2,lineHeight:1.6}}>• {e}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SCRIPT APPS SCRIPT v2 ── */}
                <div style={{...css.card,padding:12,background:t.card2}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.txt,marginBottom:4}}>📋 Apps Script v2 — Cole na planilha</div>
                  <div style={{fontSize:10,color:t.txt2,lineHeight:1.6,marginBottom:8}}>
                    <strong style={{color:t.ouro}}>Planilha → Extensões → Apps Script</strong> → cole o código abaixo → salve → rode <code style={{background:t.bg,padding:"1px 5px",borderRadius:4,color:t.verde}}>configurarGatilho()</code> <strong>UMA VEZ</strong> para ativar o sync automático de 15 em 15 min.
                  </div>
                  <div style={{background:t.bg,borderRadius:8,padding:10,border:`1px solid ${t.borda}`,overflowX:"auto",maxHeight:260,overflowY:"auto"}}>
                    <pre style={{fontSize:8.5,color:t.verde,margin:0,whiteSpace:"pre",lineHeight:1.55}}>{`// ═══════════════════════════════════════════════════════
// CONTROLE OPERACIONAL — Apps Script v2
// 1) Cole aqui  2) Preencha SUPA_URL e SUPA_KEY
// 3) Rode configurarGatilho() UMA VEZ → sync automático
// ═══════════════════════════════════════════════════════

var SUPA_URL = 'SUA_URL_SUPABASE';  // https://xxx.supabase.co
var SUPA_KEY = 'SUA_ANON_KEY';
var TABELA   = 'controle_operacional';
var TAB_CFG  = 'co_config';

// ── Função principal (chamada automaticamente a cada 15min) ──
function sincronizarComSupabase() {
  var inicio = new Date();
  var status = {
    timestamp: Utilities.formatDate(inicio,'America/Sao_Paulo','dd/MM/yyyy HH:mm:ss'),
    total_planilha:0, sincronizados:0, ignorados:0, erros_http:0,
    motivos_ignorados:[], erros_detalhes:[], ok:false
  };
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var dados = sheet.getDataRange().getValues();
    var header = dados[0];
    var mapa = {};
    header.forEach(function(col,i){
      var c=mapearColuna(col.toString().toLowerCase().trim());
      if(c) mapa[i]=c;
    });
    var temColDT = Object.values(mapa).indexOf('dt')>=0;
    if(!temColDT){
      status.erros_detalhes.push('CRÍTICO: coluna DT/Espelho não encontrada. Cabeçalhos: '+header.slice(0,8).join(', '));
      return gravarStatus(status);
    }
    status.total_planilha = dados.length-1;
    var registros = [];
    for(var r=1;r<dados.length;r++){
      var reg={}; var temDT=false; var linhaVazia=true;
      Object.keys(mapa).forEach(function(i){
        var v=dados[r][i];
        if(v instanceof Date) v=Utilities.formatDate(v,'America/Sao_Paulo','dd/MM/yyyy');
        var vs=v?v.toString().trim():'';
        reg[mapa[i]]=vs;
        if(vs) linhaVazia=false;
        if(mapa[i]==='dt'&&vs) temDT=true;
      });
      if(linhaVazia) continue;
      if(!temDT){
        status.ignorados++;
        if(status.motivos_ignorados.length<20)
          status.motivos_ignorados.push('Linha '+(r+1)+': DT/Espelho vazio');
        continue;
      }
      registros.push(reg);
    }
    // Envia em lotes de 50
    for(var i=0;i<registros.length;i+=50){
      try {
        var resp=UrlFetchApp.fetch(SUPA_URL+'/rest/v1/'+TABELA+'?on_conflict=dt',{
          method:'POST',
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,
            'Content-Type':'application/json',
            Prefer:'return=minimal,resolution=merge-duplicates'},
          payload:JSON.stringify(registros.slice(i,i+50)),
          muteHttpExceptions:true
        });
        var code=resp.getResponseCode();
        if(code>=200&&code<300){ status.sincronizados+=Math.min(50,registros.length-i); }
        else {
          status.erros_http++;
          var msg='Lote '+(Math.floor(i/50)+1)+': HTTP '+code;
          try{var b=JSON.parse(resp.getContentText());if(b.message)msg+=' — '+b.message;}catch(e){}
          if(status.erros_detalhes.length<10) status.erros_detalhes.push(msg);
        }
      } catch(he){
        status.erros_http++;
        if(status.erros_detalhes.length<10) status.erros_detalhes.push('Lote '+(Math.floor(i/50)+1)+': '+he.message);
      }
    }
    status.ok = status.erros_http===0;
  } catch(e) {
    status.erros_detalhes.push('ERRO GERAL: '+e.message);
    status.ok=false;
  }
  gravarStatus(status);
  Logger.log(JSON.stringify(status,null,2));
}

// ── Grava status no Supabase para o app ler ──────────────────
function gravarStatus(status){
  try{
    UrlFetchApp.fetch(SUPA_URL+'/rest/v1/'+TAB_CFG+'?on_conflict=chave',{
      method:'POST',
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,
        'Content-Type':'application/json',
        Prefer:'return=minimal,resolution=merge-duplicates'},
      payload:JSON.stringify([{chave:'gsheet_sync_status',
        valor:JSON.stringify(status),updated_at:new Date().toISOString()}]),
      muteHttpExceptions:true
    });
  }catch(e){Logger.log('Erro ao gravar status: '+e.message);}
}

// ── Rodar UMA VEZ para ativar sync automático ────────────────
function configurarGatilho(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='sincronizarComSupabase') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarComSupabase').timeBased().everyMinutes(15).create();
  Logger.log('✅ Gatilho de 15 min criado! Rodando sincronização agora...');
  sincronizarComSupabase();
}

// ── Mapeamento de colunas da planilha ────────────────────────
function mapearColuna(n){
  var m={
    'dt espelho':'dt','espelho':'dt','dt':'dt',
    // Motorista / nome (aceita variações)
    'nome':'nome','motorista':'nome','nome motorista':'nome','nome do motorista':'nome',
    'cpf':'cpf','placa':'placa','vinculo':'vinculo','status':'status',
    // Origem / Destino (aceita "- CIDADE/UF" e variações)
    'origem':'origem','origem - cidade/uf':'origem','origem cidade/uf':'origem','origem/uf':'origem','origem cidade':'origem',
    'destino':'destino','destino - cidade/uf':'destino','destino cidade/uf':'destino','destino/uf':'destino','destino cidade':'destino',
    'data carr.':'data_carr','data carregamento':'data_carr','data_carr':'data_carr',
    'data agenda':'data_agenda','data_agenda':'data_agenda','agenda':'data_agenda',
    'data desc.':'data_desc','data descarga':'data_desc','data_desc':'data_desc',
    // Valores (aceita "VALOR DO CTE", "VL CTE", etc.)
    'vl cte':'vl_cte','valor cte':'vl_cte','vl_cte':'vl_cte','valor do cte':'vl_cte',
    'vl contrato':'vl_contrato','vl_contrato':'vl_contrato','valor contrato':'vl_contrato','valor do contrato':'vl_contrato',
    'adiant':'adiant','adiantamento':'adiant',
    // Dias (aceita "QUANT. DIAS", "DIAS", etc.)
    'dias':'dias','quant. dias':'dias','quant dias':'dias','quantidade dias':'dias','qtd dias':'dias',
    'saldo':'saldo',
    'cte':'cte','mdf':'mdf','nf':'nf','nota fiscal':'nf','cliente':'cliente',
    'shipmente id':'id_doc','shipment id':'id_doc','id_doc':'id_doc','id doc':'id_doc',
    'ro':'ro','r.o.':'ro','reg. ocorrencia':'ro','reg ocorrencia':'ro',
    'mat':'mat','contrato':'mat','contrato [mat ou mar]':'mat',
    'sgs':'sgs','alguma ocorrencia / sgs':'sgs','alguma ocorrencia':'sgs',
    'chegada':'chegada','chegada no cliente':'chegada','data chegada':'chegada',
    'gerenc':'gerenc','gerenciadora':'gerenc',
    'data manifesto':'data_manifesto','data do manifesto':'data_manifesto',
    'diaria_prev':'diaria_prev','diarias devida':'diaria_prev','diarias (devida r$)':'diaria_prev',
    'diaria_pg':'diaria_pg','diarias paga':'diaria_pg','diarias (paga r$)':'diaria_pg',
    'informou analista':'informou_analista','informou_analista':'informou_analista',
    'desc_aguardando':'desc_aguardando','aguardando descarga':'desc_aguardando'
  };
  return m[n]||null;
}`}</pre>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                    <div style={{background:`rgba(2,192,118,.06)`,border:`1px solid rgba(2,192,118,.2)`,borderRadius:7,padding:"8px 10px"}}>
                      <div style={{fontSize:9,fontWeight:700,color:t.verde,marginBottom:3}}>▶ Como ativar (1x apenas)</div>
                      <div style={{fontSize:9,color:t.txt2,lineHeight:1.7}}>1. Cole o script acima no Apps Script<br/>2. Preencha <code>SUPA_URL</code> e <code>SUPA_KEY</code><br/>3. No menu <strong style={{color:t.txt}}>Executar</strong> → <strong style={{color:t.verde}}>configurarGatilho</strong><br/>4. Autorize quando pedido<br/>✅ Pronto — sync automático a cada 15min</div>
                    </div>
                    <div style={{background:`rgba(246,70,93,.06)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:7,padding:"8px 10px"}}>
                      <div style={{fontSize:9,fontWeight:700,color:t.danger,marginBottom:3}}>🔍 Diagnóstico de registros ausentes</div>
                      <div style={{fontSize:9,color:t.txt2,lineHeight:1.7}}>Se uma DT está na planilha mas não no app:<br/>• Verifique a coluna DT/Espelho da linha<br/>• Rode o script manualmente e veja o painel acima<br/>• "Ignorados" lista as linhas com problema<br/>• Confirme que SUPA_URL e SUPA_KEY estão corretos</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alterar senha do Admin */}
            <AlterarSenhaAdmin t={t} css={css} showToast={showToast} onSalvar={async hash=>{await setConfigRemoto("admin_senha_hash",hash);await registrarLog("ALTERAR_SENHA_ADMIN","Senha do Admin alterada");}} />

            {/* Email do Admin (para login e OAuth) */}
            <div style={{marginTop:8,marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Email do Admin (login OAuth / identificação)</div>
              <div style={{display:"flex",gap:8}}>
                <input value={adminEmailVal} onChange={e=>setAdminEmailVal(e.target.value)} placeholder="seu@email.com" style={{...css.inp,flex:1,fontSize:11}} />
                <button onClick={()=>{saveJSON("co_admin_email",adminEmailVal.trim().toLowerCase());showToast("✅ Email admin salvo","ok");}} style={{...css.btnGold,whiteSpace:"nowrap",fontSize:11}}>
                  {hIco(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,t.bg,13,1.8)}
                  Salvar
                </button>
              </div>
              <div style={{fontSize:9,color:t.txt2,marginTop:4,lineHeight:1.6}}>Este email é usado para identificar o admin no login e via OAuth Google. Não fica visível no código-fonte.</div>
            </div>

            {/* EMAIL BOAS-VINDAS */}
            <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={()=>setEmailTemplateOpen(!emailTemplateOpen)}>
              {hIco(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,t.ouro,12)} Email de Boas-vindas<span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{emailTemplateOpen?"▲":"▼"}</span>
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
                  <button onClick={()=>enviarEmailBoasVindas({nome:"Teste",email:loadJSON("co_admin_email",""),perfil:"operador"},"senha123",false)} style={{...css.btnGold,flex:1,justifyContent:"center",fontSize:12}}>📧 Testar (Gmail)</button>
                  <button onClick={()=>enviarEmailBoasVindas({nome:"Teste",email:loadJSON("co_admin_email",""),perfil:"operador"},"senha123",true)} style={{...css.hBtn,flex:1,justifyContent:"center",fontSize:12}}>✉️ Outro Cliente</button>
                </div>
                <div style={{marginTop:8,padding:"8px 10px",background:t.bg,borderRadius:8,border:"1px solid "+t.borda,fontSize:10,color:t.txt2,lineHeight:1.6}}>
                  O email abre no seu cliente de email ja preenchido. Para usuarios novos, clique no botao Email no cadastro.
                </div>
              </div>
            )}

            {/* NORMALIZAR CONTATOS (Item 3) — colapsável */}
            <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={()=>setContatosAdminOpen(!contatosAdminOpen)}>
              {hIco(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,t.ouro,12)} Contatos / Motoristas <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{contatosAdminOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {contatosAdminOpen && <div style={{...css.card,padding:14,marginBottom:16,background:t.card2}}>
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
                        // FIX: normalizar \r\n e \r (Google exporta Windows line endings)
                        const norm=raw.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
                        const lines=norm.trim().split("\n");
                        if(lines.length<2)return[];
                        // parser CSV real — suporta campos entre aspas com vírgulas internas
                        const parseRow=(line)=>{
                          const res=[];let cur="",inQ=false;
                          for(let i=0;i<line.length;i++){
                            const ch=line[i];
                            if(ch==='"'){
                              if(inQ&&line[i+1]==='"'){cur+='"';i++;}
                              else inQ=!inQ;
                            }else if(ch===','&&!inQ){res.push(cur.trim());cur="";}
                            else cur+=ch;
                          }
                          res.push(cur.trim());return res;
                        };
                        const headers=parseRow(lines[0]).map(h=>h.replace(/"/g,"").toLowerCase().trim());
                        // Suporte ao formato Google Contacts (First Name / Middle Name / Last Name)
                        const nameIdx    = headers.findIndex(h=>h==="name"||h==="full name"||h==="nome"||h==="nome completo");
                        const firstIdx   = headers.findIndex(h=>h==="first name");
                        const midIdx     = headers.findIndex(h=>h==="middle name");
                        const lastIdx    = headers.findIndex(h=>h==="last name");
                        // Todos os índices de telefone (Phone 1 - Value, Phone 2 - Value, ...)
                        const phoneIdxs  = headers.map((h,i)=>((h.includes("phone")&&h.includes("value"))||h==="phone"||h.includes("fone")||h==="telefone")?i:-1).filter(i=>i>=0);
                        const noteIdx    = headers.findIndex(h=>h.includes("note")||h.includes("obs")||h==="notas");
                        // Regex placa brasileira: antiga ABC1234 e Mercosul ABC1D23
                        const PLACA_RE   = /\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/g;
                        const extractPlacas=(txt)=>[...txt.toUpperCase().matchAll(PLACA_RE)].map(m=>m[1]);
                        return lines.slice(1).map(line=>{
                          if(!line.trim())return null;
                          const cols=parseRow(line);
                          // Montar nome: campo único ou concatenar First+Middle+Last
                          let nome="";
                          if(nameIdx>=0){ nome=cols[nameIdx]||""; }
                          else if(firstIdx>=0){
                            nome=[cols[firstIdx]||"", cols[midIdx>=0?midIdx:0]||"", cols[lastIdx>=0?lastIdx:0]||""]
                              .filter(Boolean).join(" ").trim();
                          }
                          // Primeiro telefone válido (≥8 dígitos)
                          let tel="";
                          for(const pi of phoneIdxs){
                            const v=(cols[pi]||"").replace(/\D/g,"").replace(/^55/,"");
                            if(v.length>=8){tel=v;break;}
                          }
                          const nota=noteIdx>=0?(cols[noteIdx]||""):"";
                          // Placas: extrair da nota E do nome (evitar duplicatas)
                          const allPlacas=[...new Set([...extractPlacas(nota),...extractPlacas(nome)])];
                          const cpfM=nota.match(/CPF[:\s]*([0-9./-]+)/i);
                          return nome?{nome,tel,cpf:(cpfM?.[1]||"").trim(),placa1:allPlacas[0]||"",placa2:allPlacas[1]||"",placa3:allPlacas[2]||"",placa4:allPlacas[3]||""}:null;
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
                      // ── Sugestões de vínculo: contato importado × DADOS (por placa) ──
                      const vinculos=[];
                      const allImportados=[...novos,...conflitos.map(c=>c.imp)];
                      allImportados.forEach(imp=>{
                        const impPlacas=[imp.placa1,imp.placa2,imp.placa3,imp.placa4].filter(Boolean).map(p=>p.toUpperCase().replace(/[^A-Z0-9]/g,""));
                        if(!impPlacas.length)return;
                        DADOS.forEach(reg=>{
                          const regPlaca=(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
                          if(!regPlaca)return;
                          if(impPlacas.includes(regPlaca)){
                            // Só sugerir se o nome no registro for diferente ou vazio
                            const nomeReg=(reg.nome||"").toUpperCase().trim();
                            const nomeImp=imp.nome.toUpperCase().trim();
                            if(!nomeReg||nomeReg!==nomeImp){
                              vinculos.push({contato:imp,reg,placa:regPlaca,aceito:null});
                            }
                          }
                        });
                      });
                      // Deduplicar por DT (pegar só a 1ª sugestão por DT)
                      const vinculosUniq=vinculos.filter((v,i)=>vinculos.findIndex(x=>x.reg.dt===v.reg.dt&&x.contato.nome===v.contato.nome)===i);
                      // Guardar raw e abrir modal de filtro de prefixos
                      setMotImportRaw(importados);
                      const _pm = new Map();
                      importados.forEach(c=>{const p=(c.nome||"").trim().split(/\s+/)[0].toUpperCase();if(p)_pm.set(p,(_pm.get(p)||0)+1);});
                      const _pOrd = [..._pm.keys()].sort((a,b)=>_pm.get(b)-_pm.get(a));
                      const _PEXCL = new Set(["AGENC","AGENCIA","POSTO","SEGURO","BANCO","FILIAL","COOP","ASSOC","TRANS","TRANSP"]);
                      setMotImportPrefSel(new Set(_pOrd.filter(p=>!_PEXCL.has(p))));
                      setMotImportPrefBusca("");
                      setMotImportPrefOpen(true);
                    };
                    reader.readAsText(f,"utf-8");
                    e.target.value="";
                  }} />
                </label>
              </div>
              <div style={{padding:"8px 10px",background:t.bg,borderRadius:8,border:`1px solid ${t.borda}`,fontSize:10,color:t.txt2,lineHeight:1.5}}>
                💡 Google Contacts: <strong style={{color:t.txt}}>contacts.google.com</strong> → Exportar → CSV Google. Para importar, exporte da aba Motoristas ou baixe o .csv/.vcf e importe aqui.
              </div>
            </div>}

            {/* LOG DE ALTERACOES */}
            <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={async()=>{const next=!logsOpen;setLogsOpen(next);if(next)await carregarLogs();}}>
              {hIco(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.ouro,12)} Log de Alterações<span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{logsOpen?"▲":"▼"}</span>
              <span style={{flex:1,height:1,background:t.borda}} />
            </div>
            {logsOpen && (
              <div style={{marginBottom:16}}>
                {/* Sub-abas */}
                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {[{k:"dev",l:"🧑‍💻 Desenvolvimento"},{k:"op",l:"⚙️ Operacional"}].map(st=>(
                    <button key={st.k} onClick={()=>setLogsSubTab(st.k)} style={{padding:"6px 12px",fontSize:10,fontWeight:700,border:`1.5px solid ${logsSubTab===st.k?t.ouro:t.borda}`,borderRadius:DESIGN.r.badge,cursor:"pointer",background:logsSubTab===st.k?`rgba(240,185,11,.08)`:t.card2,color:logsSubTab===st.k?t.ouro:t.txt2,fontFamily:DESIGN.fnt.b}}>{st.l}</button>
                  ))}
                  {logsSubTab==="op" && <button onClick={carregarLogs} style={{...css.hBtn,fontSize:10,padding:"5px 10px",marginLeft:"auto"}}>↺ Atualizar</button>}
                </div>

                {/* ABA DESENVOLVIMENTO */}
                {logsSubTab==="dev" && (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>

                    {/* ── PAINEL AUDITORIA DE DESIGN ── */}
                    <div style={{...css.card,borderLeft:`3px solid ${t.ouro}`,overflow:"visible"}}>
                      <div style={{padding:"10px 14px 8px",borderBottom:`1px solid ${t.borda}`}}>
                        <div style={{...css.secTitle,marginBottom:4}}>
                          {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>,t.ouro,13,2)}
                          Auditoria de Design
                          <span style={{flex:1,height:1,background:t.borda,marginLeft:4}}/>
                        </div>
                        <div style={{fontSize:10,color:t.txt2,lineHeight:1.6,marginBottom:8}}>
                          Detecta elementos com estilos fora do padrão <strong style={{color:t.ouro}}>DESIGN.*</strong>.<br/>
                          Para alterar qualquer elemento globalmente: edite <strong style={{color:t.ouro}}>DESIGN</strong> no topo do arquivo → propaga em todo o código que usa <strong style={{color:t.ouro}}>css.*</strong>.
                        </div>
                        <div style={{background:t.card2,borderRadius:DESIGN.r.sm,padding:"8px 10px",fontSize:9,color:t.txt2,fontFamily:DESIGN.fnt.b,marginBottom:10,lineHeight:1.8}}>
                          {Object.entries(DESIGN).filter(([k])=>k!=="c").map(([k,v])=>(
                            <div key={k}><span style={{color:t.ouro}}>DESIGN.{k}</span> = {JSON.stringify(v)}</div>
                          ))}
                        </div>
                        <button onClick={auditarDesign} style={{...css.btnOutline,fontSize:11,padding:"8px 16px",minHeight:36}}>
                          {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.ouro,14,2)} Executar Auditoria
                        </button>
                      </div>
                      {auditReport && (
                        <div style={{padding:"10px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <span style={{...css.badge(auditReport.total===0?t.verde:t.danger, auditReport.total===0?`rgba(2,192,118,.1)`:`rgba(246,70,93,.1)`, auditReport.total===0?`rgba(2,192,118,.3)`:`rgba(246,70,93,.3)`)}}>
                              {auditReport.total===0?"✓ TUDO OK":`${auditReport.total} VIOLAÇÕES`}
                            </span>
                            <span style={{fontSize:9,color:t.txt2}}>{auditReport.timestamp}</span>
                          </div>
                          {auditReport.total > 0 && (
                            <>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                                {Object.entries(auditReport.tipos).map(([tipo,count])=>(
                                  <span key={tipo} style={{...css.badge(t.ouro,`rgba(240,185,11,.08)`,`rgba(240,185,11,.25)`)}}>{tipo}: {count}</span>
                                ))}
                              </div>
                              <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                                {auditReport.items.map((item,i)=>(
                                  <div key={i} style={{background:t.card2,borderRadius:DESIGN.r.tag,padding:"5px 8px",fontSize:9,color:t.txt2,display:"flex",gap:8,alignItems:"flex-start"}}>
                                    <span style={{color:t.danger,fontWeight:700,flexShrink:0}}>{item.tipo}</span>
                                    <span style={{color:t.txt,fontWeight:600}}>{item.valor}</span>
                                    <span style={{color:t.txt2,flex:1}}>→ {item.sugestao}</span>
                                    <span style={{color:t.txt2,flexShrink:0,fontStyle:"italic"}}>{item.label}</span>
                                  </div>
                                ))}
                              </div>
                              {auditReport.total > 30 && (
                                <div style={{fontSize:9,color:t.txt2,marginTop:4,textAlign:"center"}}>… e mais {auditReport.total-30} (ver window.__auditReport no console)</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

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

      {/* ═══ FAB — só mobile (desktop tem botão "Nova DT" no topbar) ═══ */}
      {canEdit && !isWide && (
        <div style={{position:"fixed",bottom:74,right:14,zIndex:200}}>
          <button onClick={()=>{setFormData({});setEditIdx(-1);setEditStep(1);setModalOpen("edit")}} style={{width:50,height:50,background:t.ouro,borderRadius:14,border:"none",boxShadow:"0 5px 20px rgba(240,185,11,.4)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
            <span style={{fontSize:18,color:"#000"}}>＋</span>
            <span style={{fontSize:7,fontWeight:700,color:"#000",letterSpacing:.8,textTransform:"uppercase"}}>NOVO</span>
          </button>
        </div>
      )}

      </div>{/* end .co-main */}

      {/* ═══ MOBILE NAV — horizontal scroll, estilo Binance ═══ */}
      {/* Oculto automaticamente no desktop via CSS @media(min-width:768px) */}
      <nav className="co-mobile-nav">
        {tabs.map(tb => {
          const ativo = activeTab === tb.k;
          return (
            <button
              key={tb.k}
              className={`co-mobile-nav__item${ativo?" co-mobile-nav__item--active":""}`}
              onClick={()=>setActiveTab(tb.k)}
            >
              <span style={{lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {typeof tb.ico === "function" ? tb.ico(ativo) : <span style={{fontSize:18}}>{tb.ico}</span>}
              </span>
              <span className="co-mobile-nav__lbl">{tb.l}</span>
            </button>
          );
        })}
      </nav>

      {/* ═══ EDIT MODAL ═══ */}
      {modalOpen === "edit" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={css.modal}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${editIdx>=0?t.ouroDk:t.azul},${editIdx>=0?t.ouro:t.azulLt})`,display:"flex",alignItems:"center",justifyContent:"center"}}>{editIdx>=0?hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,null,18,2):hIco(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/></>,null,18,2)}</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0?"EDITAR":"NOVO REGISTRO"}</div><div style={{fontSize:9,color:t.txt2}}>Preencha os dados</div></div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,maxHeight:"calc(96vh - 120px)"}}>
              {[
                {s:"Identificação",ico:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,fields:[{k:"nome",l:"Motorista",span:2},{k:"cpf",l:"CPF"},{k:"placa",l:"PLACA 01"},{k:"placa2",l:"PLACA 02"},{k:"placa3",l:"PLACA 03"},{k:"dt",l:"DT / Espelho",lock:editIdx>=0},{k:"vinculo",l:"Vínculo",type:"select_opts",opts:["TERCEIRO","FROTA","AGREGADO"]}]},
                {s:"Rota e Agenda",ico:<><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></>,fields:[{k:"origem",l:"Origem"},{k:"destino",l:"Destino"},{k:"data_carr",l:"Carregamento",type:"date"},{k:"data_agenda",l:"Agenda (DT PRV. P/ DESCARREGAR)",type:"date_or_oc"},{k:"status",l:"Status",type:"select_status"},{k:"dias",l:"Dias",type:"computed_dias",lock:true}]},
                {s:"Financeiro",ico:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,fields:[{k:"vl_cte",l:"Valor CTE"},{k:"vl_contrato",l:"Valor Contrato"},{k:"adiant",l:"Adiantamento"},{k:"saldo",l:"Saldo"},{k:"diaria_prev",l:"Diária Devida (R$)"},{k:"diaria_pg",l:"Diária Paga (R$)"},{k:"vl_cte_comp",l:"Valor CTE Comp."}]},
                {s:"Documentação",ico:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,fields:[{k:"cte",l:"CTE"},{k:"mdf",l:"MDF"},{k:"nf",l:"Nota Fiscal"},{k:"mat",l:"MAT"},{k:"ro",l:"RO (Reg. Ocorrência)"},{k:"ro_hora",l:"Hora RO"},{k:"cliente",l:"Cliente"},{k:"sgs",l:"Chamado SGS"}]},
                {s:"Operacional",ico:<><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></>,fields:[{k:"chegada",l:"Chegada (data real de chegada)",type:"date"},{k:"desc_aguardando",l:"Aguardando Descarga (marcar enquanto aguarda)",type:"checkbox",span:2},{k:"data_desc",l:"Data e Hora da Descarga",type:"datetime"},{k:"informou_analista",l:"Informou analista até 9h?",type:"select_sim_nao"},{k:"data_manifesto",l:"Manifesto",type:"date"},{k:"gerenc",l:"Gerenciadora",type:"select_opts",opts:["SKYMARK (FRETEBRAS)","INFINITY","MUNDIAL","OPENTECH"],span:2},{k:"forms",l:"FORMS",type:"select_sim_nao"}]},
              ].map((section,si) => (
                <div key={si}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,margin:"14px 0 8px",display:"flex",alignItems:"center",gap:6}}>{hIco(section.ico,t.azulLt,10)} {section.s}<span style={{flex:1,height:1,background:`rgba(22,119,255,.12)`}} /></div>
                  {section.s==="Financeiro" && !canFin && (
                    <div style={{background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:8,padding:"8px 10px",fontSize:10,color:t.ouro,marginBottom:8}}>
                      🔒 Campos financeiros visíveis apenas para Admin/Gerente. Contate o administrador para alterar.
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                    {section.fields.map(f => {
                      const isLocked = f.lock || (section.s==="Financeiro" && !canFin);
                      // Descarga aguardando: bloqueia data_desc quando desc_aguardando="sim"
                      const isDescAguardando = f.k==="data_desc" && formData.desc_aguardando==="sim";
                      const fieldVal = f.type==="date" ? brToInput(formData[f.k]) : f.type==="datetime" ? brToInputDT(formData[f.k]) : (formData[f.k]||"");
                      return (
                        <div key={f.k} style={{gridColumn:f.span===2?"1/-1":"auto",display:"flex",flexDirection:"column",gap:3}}>
                          <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:isLocked?t.txt2:t.txt2,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                            {f.l} {isLocked && <span style={{color:t.ouro,fontSize:9}}>🔒</span>}
                          </label>
                          {f.type==="checkbox" ? (
                            // ── CHECKBOX (ex: desc_aguardando) ──
                            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",borderRadius:DESIGN.r.inp,border:`1.5px solid ${formData[f.k]==="sim"?t.ouro:t.borda}`,background:formData[f.k]==="sim"?`rgba(240,185,11,.07)`:t.inputBg,transition:"border-color .15s"}}>
                              <input
                                type="checkbox"
                                checked={formData[f.k]==="sim"}
                                onChange={e=>{
                                  const checked = e.target.checked;
                                  setFormData(p=>({...p,[f.k]:checked?"sim":"", ...(checked?{data_desc:""}:{})}));
                                }}
                                style={{width:15,height:15,accentColor:t.ouro,cursor:"pointer"}}
                              />
                              <span style={{fontSize:11,color:formData[f.k]==="sim"?t.ouro:t.txt2,fontWeight:formData[f.k]==="sim"?700:400}}>
                                {formData[f.k]==="sim" ? "⏳ Aguardando descarga" : "Marcar como Aguardando"}
                              </span>
                            </label>
                          ) : f.type==="select_sim_nao" ? (
                            <select
                              value={formData[f.k]||""}
                              onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))}
                              disabled={isLocked}
                              style={{...css.inp,padding:"8px 10px",fontSize:12,appearance:"none",cursor:isLocked?"not-allowed":"pointer",opacity:isLocked?.6:1}}
                            >
                              <option value="">— Selecione —</option>
                              <option value="sim">✅ Sim</option>
                              <option value="nao">❌ Não</option>
                            </select>
                          ) : f.type==="select_status" ? (
                            <select
                              value={formData[f.k]||""}
                              onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))}
                              disabled={isLocked}
                              style={{...css.inp,padding:"8px 10px",fontSize:12,appearance:"none",cursor:isLocked?"not-allowed":"pointer",opacity:isLocked?.6:1}}
                            >
                              <option value="">— Selecione —</option>
                              <option value="CARREGADO">📦 CARREGADO</option>
                              <option value="PENDENTE">⏳ PENDENTE</option>
                              <option value="NO-SHOW">🚫 NO-SHOW</option>
                              <option value="NÃO ACEITE">❌ NÃO ACEITE</option>
                              <option value="EM ABERTO">🔓 EM ABERTO</option>
                              <option value="CANCELADO">🛑 CANCELADO</option>
                            </select>
                          ) : f.type==="select_opts" ? (
                            <select
                              value={formData[f.k]||""}
                              onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))}
                              disabled={isLocked}
                              style={{...css.inp,padding:"8px 10px",fontSize:12,appearance:"none",cursor:isLocked?"not-allowed":"pointer",opacity:isLocked?.6:1}}
                            >
                              <option value="">— Selecione —</option>
                              {(f.opts||[]).map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type==="date_or_oc" ? (
                            (() => {
                              const isOC = (formData[f.k]||"").toUpperCase().trim() === "OC";
                              return (
                                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                  {/* Toggle OC */}
                                  <label style={{display:"flex",alignItems:"center",gap:7,cursor:isLocked?"not-allowed":"pointer",padding:"6px 10px",borderRadius:DESIGN.r.inp,border:`1.5px solid ${isOC?t.ouro:t.borda}`,background:isOC?`rgba(240,185,11,.07)`:t.inputBg,transition:"border-color .15s"}}>
                                    <input
                                      type="checkbox"
                                      disabled={isLocked}
                                      checked={isOC}
                                      onChange={e=>{
                                        setFormData(p=>({...p,[f.k]:e.target.checked?"OC":""}));
                                      }}
                                      style={{width:13,height:13,accentColor:t.ouro,cursor:isLocked?"not-allowed":"pointer"}}
                                    />
                                    <span style={{fontSize:10,color:isOC?t.ouro:t.txt2,fontWeight:isOC?700:400,letterSpacing:.3}}>
                                      {isOC?"📋 OC – Ordem de Chegada":"OC (sem data fixa)"}
                                    </span>
                                    {isLocked && <span style={{color:t.ouro,fontSize:9,marginLeft:"auto"}}>🔒</span>}
                                  </label>
                                  {/* Date picker — só exibe quando não é OC */}
                                  {!isOC && (
                                    <input
                                      type="date"
                                      value={brToInput(formData[f.k])}
                                      readOnly={isLocked}
                                      onClick={isLocked?()=>alert(`🔒 Este campo não pode ser alterado por este perfil.\nContate o administrador para realizar esta alteração.`):undefined}
                                      onChange={isLocked?undefined:e=>{
                                        setFormData(p=>({...p,[f.k]:inputToBr(e.target.value)}));
                                      }}
                                      style={{...css.inp,padding:"8px 10px",fontSize:12,cursor:isLocked?"not-allowed":"text",opacity:isLocked?.5:1,background:t.inputBg}}
                                    />
                                  )}
                                </div>
                              );
                            })()
                          ) : f.type==="computed_dias" ? (
                            (() => {
                              const parseFormD = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
                              const da = parseFormD(formData.data_agenda);
                              const dd = parseFormD(formData.data_desc);
                              const ref = dd || new Date();
                              const diasCalc = da ? Math.max(0, Math.floor((ref - da) / 86400000)) : null;
                              const diasLabel = diasCalc !== null ? String(diasCalc) : "—";
                              const diasColor = diasCalc === null ? t.txt2 : diasCalc > 3 ? t.danger : diasCalc > 1 ? t.ouro : t.verde;
                              return (
                                <div style={{...css.inp,padding:"8px 10px",fontSize:12,cursor:"default",color:diasColor,fontWeight:700,background:t.inputBg,display:"flex",alignItems:"center",gap:6}}>
                                  📅 {diasLabel} {diasCalc !== null && (diasCalc === 1 ? "dia" : "dias")}
                                  <span style={{fontSize:9,color:t.txt2,fontWeight:400,marginLeft:4}}>auto</span>
                                </div>
                              );
                            })()
                          ) : (
                            <input
                              type={f.type==="datetime"?"datetime-local":(f.type||"text")}
                              value={fieldVal}
                              readOnly={isLocked || isDescAguardando}
                              onClick={isLocked?()=>alert(`🔒 Este campo não pode ser alterado por este perfil.\nContate o administrador para realizar esta alteração.`):isDescAguardando?()=>alert("⏳ Desmarque 'Aguardando Descarga' para inserir a data/hora."):undefined}
                              onChange={(isLocked || isDescAguardando)?undefined:e=>{
                                const v = e.target.value;
                                const newVal = f.type==="date"?inputToBr(v):f.type==="datetime"?inputToBrDT(v):v;
                                setFormData(p=>({...p,[f.k]:newVal}));
                                // NFD alert: ao preencher data da descarga real
                                if(f.k==="data_desc" && v){
                                  setNfdForm({numero:"",valor:"",tipo:"avaria"});
                                  setNfdAlertOpen(true);
                                  // Remove o flag aguardando quando a descarga é preenchida
                                  setFormData(p=>({...p,[f.k]:newVal, desc_aguardando:""}));
                                }
                                // Ocorrência/RO: ao preencher chegada, sugerir registro se RO ainda vazio
                                if(f.k==="chegada" && v){
                                  setOcorrChegadaAlert(true);
                                }
                              }}
                              style={{...css.inp,padding:"8px 10px",fontSize:12,cursor:(isLocked||isDescAguardando)?"not-allowed":"text",opacity:(isLocked||isDescAguardando)?.5:1,background:isDescAguardando?`rgba(240,185,11,.04)`:t.inputBg}}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:0,flexShrink:0,borderTop:`1px solid ${t.borda}`}}>
              {excluirConfirm==="edit" && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px 8px",background:"rgba(220,38,38,.06)",borderBottom:`1px solid rgba(220,38,38,.2)`}}>
                  <span style={{fontSize:11,color:"#ef4444",fontWeight:600,whiteSpace:"nowrap"}}>Digite EXCLUIR para confirmar:</span>
                  <input
                    autoFocus
                    value={excluirTexto}
                    onChange={e=>setExcluirTexto(e.target.value.toUpperCase())}
                    onKeyDown={e=>{if(e.key==="Escape"){setExcluirConfirm(null);setExcluirTexto("");}}}
                    placeholder="EXCLUIR"
                    style={{flex:1,background:"rgba(220,38,38,.08)",border:`1.5px solid ${excluirTexto==="EXCLUIR"?"#ef4444":"rgba(220,38,38,.3)"}`,borderRadius:7,padding:"7px 10px",color:"#ef4444",fontSize:12,fontFamily:"inherit",fontWeight:700,letterSpacing:1,outline:"none"}}
                  />
                  <button
                    onClick={()=>{ if(excluirTexto==="EXCLUIR") deletarRegistro(DADOS[editIdx]?.dt); }}
                    disabled={excluirTexto!=="EXCLUIR"}
                    style={{background:excluirTexto==="EXCLUIR"?"#ef4444":"rgba(220,38,38,.2)",border:"none",borderRadius:7,padding:"7px 14px",color:"#fff",fontSize:11,fontWeight:700,cursor:excluirTexto==="EXCLUIR"?"pointer":"not-allowed",fontFamily:"inherit",opacity:excluirTexto==="EXCLUIR"?1:.6}}
                  >CONFIRMAR</button>
                  <button onClick={()=>{setExcluirConfirm(null);setExcluirTexto("");}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:7,padding:"7px 10px",color:t.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                </div>
              )}
              <div style={{display:"flex",gap:8,padding:"10px 16px 18px"}}>
                <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                {editIdx>=0 && excluirConfirm!=="edit" && (
                  <button onClick={()=>{setExcluirConfirm("edit");setExcluirTexto("");}} style={{flex:"0 0 auto",background:"rgba(220,38,38,.08)",border:`1.5px solid rgba(220,38,38,.3)`,borderRadius:9,padding:"10px 14px",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🗑️ EXCLUIR</button>
                )}
                <button onClick={salvarRegistro} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EXCLUIR TODOS (admin) ═══ */}
      {motExcluirTodosOpen && (
        <div style={{...css.overlay,alignItems:"center",backdropFilter:"blur(10px)",padding:20}} onClick={()=>setMotExcluirTodosOpen(false)}>
          <div style={{...css.modal,borderRadius:16,maxWidth:400,padding:24}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:10,background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.3)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,20,2)}
              </div>
              <div><div style={{fontSize:15,fontWeight:800,color:t.danger}}>Excluir Todos os Motoristas</div><div style={{fontSize:10,color:t.txt2,marginTop:2}}>Esta ação é irreversível</div></div>
            </div>
            <div style={{background:`rgba(246,70,93,.06)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:10,padding:"10px 12px",fontSize:11,color:t.txt,lineHeight:1.6,marginBottom:16}}>
              Você está prestes a <strong style={{color:t.danger}}>excluir permanentemente {motoristas.length} motorista{motoristas.length!==1?"s":""}</strong> salvos localmente.
            </div>
            <div style={{fontSize:11,color:t.txt2,marginBottom:8}}>Para confirmar, digite <strong style={{color:t.danger,letterSpacing:2}}>EXCLUIR</strong>:</div>
            <input value={motExcluirTodosTexto} onChange={e=>setMotExcluirTodosTexto(e.target.value.toUpperCase())} placeholder="EXCLUIR" autoFocus
              style={{...css.inp,marginBottom:14,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:motExcluirTodosTexto==="EXCLUIR"?t.danger:t.txt}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setMotExcluirTodosOpen(false)} style={{...css.btnOutline,flex:1,justifyContent:"center",padding:11}}>Cancelar</button>
              <button disabled={motExcluirTodosTexto!="EXCLUIR"} onClick={()=>{
                if(motExcluirTodosTexto!=="EXCLUIR")return;
                saveMotoristasLS([]);setMotSelecionados(new Set());
                setMotExcluirTodosOpen(false);
                registrarLog("EXCLUIR_TODOS_MOTORISTAS",`${motoristas.length} motoristas removidos`);
                showToast(`🗑️ ${motoristas.length} motorista(s) excluído(s)`,"ok");
              }} style={{...css.btnGold,flex:1,justifyContent:"center",padding:11,background:motExcluirTodosTexto==="EXCLUIR"?t.danger:"rgba(246,70,93,.3)",color:motExcluirTodosTexto==="EXCLUIR"?"#fff":"rgba(255,255,255,.4)",cursor:motExcluirTodosTexto==="EXCLUIR"?"pointer":"not-allowed",border:"none"}}>
                Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MOTORISTA MODAL ═══ */}
      {modalOpen === "motorista" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={css.modal}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,null,20,2)}</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0?"EDITAR":"NOVO"} MOTORISTA</div></div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>

              {/* ── Identificação ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>{hIco(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,t.azulLt,10)} Identificação<span style={{flex:1,height:1,background:"rgba(22,119,255,.12)"}} /></div>
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

              {/* ── Aviso de duplicata ── */}
              {motDupSugest && editIdx<0 && (
                <div style={{background:`rgba(246,70,93,.07)`,border:`1px solid rgba(246,70,93,.3)`,borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.danger,marginBottom:6}}>⚠️ Motorista similar já cadastrado</div>
                  <div style={{fontSize:10,color:t.txt,marginBottom:4}}><b>{motDupSugest.nome}</b> · CPF: {motDupSugest.cpf||"—"} · Placa: {motDupSugest.placa1||"—"}</div>
                  <div style={{fontSize:9,color:t.txt2,marginBottom:8}}>Deseja ver o cadastro existente ou continuar salvando mesmo assim?</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setFormData({...motDupSugest});setEditIdx(motoristas.indexOf(motDupSugest));setMotDupSugest(null);}} style={{flex:1,background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.25)`,borderRadius:7,padding:"6px 0",fontSize:10,color:t.azulLt,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✏️ Editar existente</button>
                    <button onClick={()=>setMotDupSugest(null)} style={{flex:1,background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.25)`,borderRadius:7,padding:"6px 0",fontSize:10,color:t.danger,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>⚠️ Salvar mesmo assim</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button onClick={()=>{
                const m = {...formData};
                if (!m.nome) { showToast("⚠️ Nome obrigatório","warn"); return; }
                if (!m.cpf) { showToast("⚠️ CPF obrigatório","warn"); return; }
                if (!m.placa1) { showToast("⚠️ Placa Cavalo obrigatória","warn"); return; }
                // Verificar duplicatas ao cadastrar NOVO motorista
                if (editIdx < 0) {
                  const nomeN = m.nome.toUpperCase().trim();
                  const placa1N = (m.placa1||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
                  const cpfN = (m.cpf||"").replace(/\D/g,"");
                  const dup = motoristas.find((x,xi) => {
                    if(cpfN && x.cpf && x.cpf.replace(/\D/g,"")===cpfN) return true;
                    if(placa1N && x.placa1 && x.placa1.toUpperCase().replace(/[^A-Z0-9]/g,"")===placa1N) return true;
                    return x.nome && x.nome.toUpperCase().trim()===nomeN;
                  });
                  if (dup && !motDupSugest) { setMotDupSugest(dup); return; }
                }
                const nm = [...motoristas];
                if (editIdx>=0) nm[editIdx] = m; else nm.push(m);
                saveMotoristasLS(nm);
                setMotDupSugest(null);
                registrarLog(editIdx>=0?"EDITAR_MOTORISTA":"NOVO_MOTORISTA",`${m.nome} · CPF ${m.cpf} · Vínculo: ${m.vinculo||"—"}`);
                showToast(editIdx>=0?"✅ Atualizado!":"✅ Cadastrado!","ok");
                setModalOpen(null);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL SUGERIR COMPATÍVEIS ═══ */}
      {motSugestOpen && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setMotSugestOpen(false)}>
          <div style={{...css.modal,maxWidth:480}}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.verde}}>🔗 SUGESTÕES DE VÍNCULO</div>
              <button onClick={()=>setMotSugestOpen(false)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:8,maxHeight:"calc(96vh - 120px)"}}>
              <div style={{fontSize:10,color:t.txt2,marginBottom:4}}>Placas dos motoristas cadastrados foram encontradas em registros de viagem com nomes diferentes. Aceite para atualizar o nome no registro.</div>
              {motSugestData.map((s,i)=>(
                <div key={i} style={{background:s.aceito===true?`rgba(2,192,118,.07)`:s.aceito===false?`rgba(128,128,128,.04)`:`rgba(240,185,11,.04)`,border:`1px solid ${s.aceito===true?`rgba(2,192,118,.25)`:s.aceito===false?t.borda:`rgba(240,185,11,.2)`}`,borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:t.txt,marginBottom:4}}>
                    <span style={{color:t.ouro,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>{s.placa}</span>
                    {" · DT "}<span style={{color:t.azulLt}}>{s.reg.dt}</span>
                  </div>
                  <div style={{fontSize:10,color:t.txt2,marginBottom:6}}>
                    Nome no registro: <b style={{color:t.danger}}>{s.reg.nome||"—"}</b><br/>
                    Motorista cadastrado: <b style={{color:t.verde}}>{s.mot.nome}</b>
                  </div>
                  {s.aceito===null && (
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{const nd=[...motSugestData];nd[i]={...nd[i],aceito:true};setMotSugestData(nd);}} style={{flex:1,background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:7,padding:"5px 0",fontSize:10,color:t.verde,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Aceitar</button>
                      <button onClick={()=>{const nd=[...motSugestData];nd[i]={...nd[i],aceito:false};setMotSugestData(nd);}} style={{flex:1,background:`rgba(128,128,128,.07)`,border:`1px solid ${t.borda}`,borderRadius:7,padding:"5px 0",fontSize:10,color:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✗ Ignorar</button>
                    </div>
                  )}
                  {s.aceito===true && <div style={{fontSize:10,color:t.verde,fontWeight:700}}>✓ Aceito — será aplicado ao salvar</div>}
                  {s.aceito===false && <div style={{fontSize:10,color:t.txt2}}>Ignorado</div>}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setMotSugestOpen(false)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>FECHAR</button>
              <button onClick={()=>{
                const aceitos=motSugestData.filter(s=>s.aceito===true);
                if(!aceitos.length){setMotSugestOpen(false);return;}
                const nd=[...DADOS];
                aceitos.forEach(s=>{
                  const idx=nd.findIndex(r=>r.dt===s.reg.dt);
                  if(idx>=0)nd[idx]={...nd[idx],nome:s.mot.nome};
                });
                setDadosBase(nd);
                showToast(`✅ ${aceitos.length} registro(s) atualizado(s)!`,"ok");
                setMotSugestOpen(false);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 APLICAR ACEITOS</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EXCLUSÃO EM LOTE ═══ */}
      {motExcluirLoteOpen && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setMotExcluirLoteOpen(false)}>
          <div style={{...css.modal,maxWidth:360}}>
            <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid rgba(246,70,93,.25)`}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.danger}}>🗑️ EXCLUIR EM LOTE</div>
              <button onClick={()=>{setMotExcluirLoteOpen(false);setMotExcluirLoteTexto("");}} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{padding:16}}>
              <div style={{fontSize:12,color:t.txt,marginBottom:8}}>Você está prestes a excluir <b style={{color:t.danger}}>{motSelecionados.size} motorista(s)</b>. Esta ação não pode ser desfeita.</div>
              <div style={{fontSize:10,color:t.txt2,marginBottom:10}}>Digite <b style={{color:t.danger}}>EXCLUIR</b> para confirmar:</div>
              <input
                value={motExcluirLoteTexto}
                onChange={e=>setMotExcluirLoteTexto(e.target.value.toUpperCase())}
                placeholder="EXCLUIR"
                style={{...css.inp,textAlign:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:4,color:t.danger,border:`1.5px solid ${motExcluirLoteTexto==="EXCLUIR"?"rgba(246,70,93,.5)":t.borda}`}}
              />
            </div>
            <div style={{display:"flex",gap:8,padding:"0 16px 18px"}}>
              <button onClick={()=>{setMotExcluirLoteOpen(false);setMotExcluirLoteTexto("");}} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button disabled={motExcluirLoteTexto!=="EXCLUIR"} onClick={()=>{
                if(motExcluirLoteTexto!=="EXCLUIR")return;
                const nm=motoristas.filter((_,i)=>!motSelecionados.has(i));
                saveMotoristasLS(nm);
                registrarLog("EXCLUIR_MOTORISTAS_LOTE",`${motSelecionados.size} motorista(s) removido(s)`);
                showToast(`🗑️ ${motSelecionados.size} motorista(s) excluído(s)`);
                setMotSelecionados(new Set());
                setMotExcluirLoteOpen(false);
                setMotExcluirLoteTexto("");
              }} style={{flex:1,background:motExcluirLoteTexto==="EXCLUIR"?`rgba(246,70,93,.9)`:`rgba(246,70,93,.2)`,border:`1.5px solid rgba(246,70,93,.4)`,borderRadius:9,padding:"10px 0",color:motExcluirLoteTexto==="EXCLUIR"?"#fff":t.danger,fontSize:12,fontWeight:700,cursor:motExcluirLoteTexto==="EXCLUIR"?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .2s"}}>🗑️ CONFIRMAR EXCLUSÃO</button>
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
        const ocorrSinteticas = [
          ...(r.obs_chegada ? [{tipo:"info",   texto:r.obs_chegada,  _origem:"chegada",  usuario:"—", data_hora:r.chegada||""}] : []),
          ...(r.obs_descarga? [{tipo:"status", texto:r.obs_descarga, _origem:"descarga", usuario:"—", data_hora:r.data_desc||""}] : []),
        ];
        const ocorrAll = [...ocorrSinteticas, ...ocorrencias];
        return (
          <div className="co-dt-overlay" onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
            <div className="co-dt-modal">
              {/* Header */}
              <div style={{flexShrink:0,background:theme==="dark"?"linear-gradient(135deg,#161a1e,#1e2026)":`linear-gradient(135deg,#f8f9fa,#fff)`}}>
                <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:excluirConfirm==="detalhe"?`1px solid rgba(220,38,38,.25)`:`1px solid ${t.borda}`}}>
                  <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🚛</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.txt,lineHeight:1}}>{r.nome||"—"}</div>
                    <div style={{fontSize:9,color:t.txt2,letterSpacing:1}}>DT {r.dt} · {r.placa||"—"} · {r.cpf||"—"}</div>
                    {r.data_criacao && <div style={{fontSize:8,color:t.txt2,opacity:.7,marginTop:1}}>📥 Registrado em {new Date(r.data_criacao).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>}
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    {canEditDetalhe && (
                      <button onClick={()=>{
                        const idx=DADOS.findIndex(x=>x.dt===r.dt);
                        setEditIdx(idx);setFormData({...r});setEditStep(1);setModalOpen("edit");
                      }} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:8,padding:"9px 16px",color:t.ouro,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>{hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,t.ouro,14)} Editar</button>
                    )}
                    {canEditDetalhe && excluirConfirm!=="detalhe" && (
                      <button onClick={()=>{setExcluirConfirm("detalhe");setExcluirTexto("");}} style={{background:"rgba(220,38,38,.08)",border:`1px solid rgba(220,38,38,.3)`,borderRadius:8,padding:"9px 16px",color:"#ef4444",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>🗑️ Excluir</button>
                    )}
                    <button onClick={()=>{setModalOpen(null);setExcluirConfirm(null);setExcluirTexto("");}} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                </div>
                {excluirConfirm==="detalhe" && (
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"rgba(220,38,38,.06)",borderBottom:`1px solid rgba(220,38,38,.2)`}}>
                    <span style={{fontSize:11,color:"#ef4444",fontWeight:600,whiteSpace:"nowrap"}}>Digite EXCLUIR para confirmar:</span>
                    <input
                      autoFocus
                      value={excluirTexto}
                      onChange={e=>setExcluirTexto(e.target.value.toUpperCase())}
                      onKeyDown={e=>{if(e.key==="Escape"){setExcluirConfirm(null);setExcluirTexto("");}}}
                      placeholder="EXCLUIR"
                      style={{flex:1,background:"rgba(220,38,38,.08)",border:`1.5px solid ${excluirTexto==="EXCLUIR"?"#ef4444":"rgba(220,38,38,.3)"}`,borderRadius:7,padding:"7px 10px",color:"#ef4444",fontSize:12,fontFamily:"inherit",fontWeight:700,letterSpacing:1,outline:"none"}}
                    />
                    <button
                      onClick={()=>{ if(excluirTexto==="EXCLUIR") deletarRegistro(r.dt); }}
                      disabled={excluirTexto!=="EXCLUIR"}
                      style={{background:excluirTexto==="EXCLUIR"?"#ef4444":"rgba(220,38,38,.2)",border:"none",borderRadius:7,padding:"7px 14px",color:"#fff",fontSize:11,fontWeight:700,cursor:excluirTexto==="EXCLUIR"?"pointer":"not-allowed",fontFamily:"inherit",opacity:excluirTexto==="EXCLUIR"?1:.6}}
                    >CONFIRMAR</button>
                    <button onClick={()=>{setExcluirConfirm(null);setExcluirTexto("");}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:7,padding:"7px 10px",color:t.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                  </div>
                )}
              </div>

              <div className="co-dt-body" style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
              {/* ── PAINEL ESQUERDO: Timeline + Dados + Minutas ── */}
              <div className="co-dt-panel">

                {/* ── Timeline ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:10}}>{hIco(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,t.ouro,12)} Timeline <span style={{flex:1,height:1,background:t.borda}} /></div>
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

                {/* ── Dados completos ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:8}}>{hIco(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/></>,t.ouro,12)} Dados do Registro <span style={{flex:1,height:1,background:t.borda}} /></div>
                  <div className="co-dados-grid">
                    {[
                      {l:"Motorista",v:r.nome},{l:"CPF",v:r.cpf},{l:"Placa",v:r.placa},{l:"Vínculo",v:r.vinculo},
                      {l:"Origem",v:r.origem},{l:"Destino",v:r.destino},{l:"Status",v:r.status},{l:"Dias",v:r.dias},
                      {l:"Carregamento",v:r.data_carr},{l:"Agenda",v:r.data_agenda},{l:"Descarga",v:r.data_desc},{l:"Chegada",v:r.chegada},
                      ...(isAdmin||perms.financeiro?[{l:"VL CTE",v:fmtMoeda(r.vl_cte)},{l:"VL Contrato",v:fmtMoeda(r.vl_contrato)},{l:"Adiant.",v:fmtMoeda(r.adiant)},{l:"Saldo",v:fmtMoeda(r.saldo)}]:[]),
                      {l:"CTE",v:r.cte},{l:"MDF",v:r.mdf},{l:"NF",v:r.nf},{l:"MAT",v:r.mat},
                      {l:"RO",v:r.ro},{l:"SGS",v:r.sgs},{l:"Gerenciadora",v:r.gerenc},{l:"Cliente",v:r.cliente},
                      {l:"ID (Shipmente)",v:r.id_doc},
                    ].filter(f=>f.v).map((f,fi)=>(
                      <div key={fi} style={{background:t.bg,borderRadius:7,padding:"6px 9px",border:`1px solid ${t.borda}`}}>
                        <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600}}>{f.l}</div>
                        <div style={{fontSize:12,fontWeight:600,color:t.txt,marginTop:1}}>{f.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Documentos / Minutas ── */}
                {(()=>{
                  const isDiariaReg = diariasData.items.some(it=>it.r.dt===r.dt&&(it.tipo==="diaria"||it.tipo==="atraso"));
                  const isDescargaReg = !!(r.data_agenda||r.data_desc);
                  const lblP2 = {fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:t.txt2,marginBottom:3};
                  const inpP2 = {...css.inp,fontSize:12,padding:"7px 9px",height:"auto"};
                  return (
                    <div>
                      <div style={{...css.secTitle,marginBottom:10}}>
                        {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.azulLt,12)} Documentos / Minutas
                        {isDiariaReg&&<span style={{fontSize:9,background:"rgba(240,185,11,.15)",border:"1px solid rgba(240,185,11,.3)",borderRadius:4,padding:"1px 6px",color:t.ouro,fontWeight:700,marginLeft:4}}>🛏️ DIÁRIA</span>}
                        {isDescargaReg&&<span style={{fontSize:9,background:"rgba(22,119,255,.12)",border:"1px solid rgba(22,119,255,.25)",borderRadius:4,padding:"1px 6px",color:t.azulLt,fontWeight:700,marginLeft:4}}>📦 DESCARGA</span>}
                        <span style={{flex:1,height:1,background:t.borda}} />
                      </div>

                      {/* ─ Pergunta DCC ─ */}
                      <div style={{background:`rgba(240,185,11,.05)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:9,padding:"9px 12px",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,fontWeight:700,color:t.ouro}}>🟡 Existe DCC?</span>
                          <span style={{fontSize:9,color:t.txt2,flex:1}}>Documento de Cobrança Complementar</span>
                          {["sim","nao"].map(op=>(
                            <button key={op} onClick={()=>setDetalheTemDcc(op)} style={{padding:"5px 14px",borderRadius:7,border:`1.5px solid ${detalheTemDcc===op?(op==="sim"?t.ouro:t.danger):t.borda}`,background:detalheTemDcc===op?(op==="sim"?`rgba(240,185,11,.12)`:`rgba(246,70,93,.08)`):`transparent`,color:detalheTemDcc===op?(op==="sim"?t.ouro:t.danger):t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:11,textTransform:"uppercase",transition:"all .15s"}}>{op==="sim"?"✅ Sim":"❌ Não"}</button>
                          ))}
                        </div>
                        {detalheTemDcc===null&&<div style={{fontSize:9,color:t.txt2,marginTop:5}}>Informe se há DCC para liberar o formulário de minutas.</div>}
                      </div>

                      {/* ─ Minutas DCC — colapsável (aberto por padrão) ─ */}
                      {detalheTemDcc==="sim"&&<div style={{marginBottom:10}}>
                        <button onClick={()=>setDetalheSecDcc(p=>!p)} style={{width:"100%",background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontFamily:"inherit",marginBottom:detalheSecDcc?6:0}}>
                          {hIco(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,t.ouro,13,2)}
                          <span style={{fontSize:10,fontWeight:700,color:t.ouro,letterSpacing:.5,flex:1,textAlign:"left"}}>MINUTAS DCC</span>
                          <span style={{fontSize:9,color:t.txt2,fontWeight:400}}>{detalheMinDcc.length} minuta(s)</span>
                          {hIco(detalheSecDcc?<><polyline points="18 15 12 9 6 15"/></>:<><polyline points="6 9 12 15 18 9"/></>,t.txt2,13,2)}
                        </button>
                        {detalheSecDcc&&<div>
                          {detalheMinDcc.map((mn,idx)=>(
                            <div key={idx} style={{background:`rgba(240,185,11,.05)`,border:`1px solid rgba(240,185,11,.18)`,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                                <div style={{display:"flex",gap:5}}>
                                  {["D01-MAT","D05-MAR"].map(tp=>(
                                    <button key={tp} onClick={()=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,tipo:tp}:m))} style={{padding:"4px 10px",borderRadius:6,border:`1.5px solid ${mn.tipo===tp?t.ouro:t.borda}`,background:mn.tipo===tp?`rgba(240,185,11,.15)`:t.card,color:mn.tipo===tp?t.ouro:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:11}}>{tp}</button>
                                  ))}
                                  <span style={{fontSize:10,color:t.txt2,marginLeft:4,alignSelf:"center"}}>Minuta {detalheMinDcc.length>1?idx+1:""}</span>
                                </div>
                                {detalheMinDcc.length>1&&<button onClick={()=>setDetalheMinDcc(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",fontSize:12,padding:2}}>✕</button>}
                              </div>
                              <div className="co-min-g4">
                                <div><div style={lblP2}>CTE DCC</div><input value={mn.cte} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>MDF DCC</div><input value={mn.mdf} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>{mn.tipo} (nº)</div><input value={mn.num} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>Valor</div><input value={mn.valor} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,valor:e.target.value}:m))} style={inpP2} placeholder="0,00" /></div>
                              </div>
                            </div>
                          ))}
                          <button onClick={()=>setDetalheMinDcc(p=>[...p,{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}])} style={{background:`rgba(240,185,11,.06)`,border:`1px dashed rgba(240,185,11,.35)`,borderRadius:7,padding:"5px 10px",color:t.ouro,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>＋ Outra Minuta DCC</button>
                        </div>}
                      </div>}

                      {/* ─ CTE Complementar — colapsável (fechado por padrão) ─ */}
                      <div style={{marginBottom:10}}>
                        <button onClick={()=>setDetalheSecCteComp(p=>!p)} style={{width:"100%",background:`rgba(22,119,255,.06)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontFamily:"inherit",marginBottom:detalheSecCteComp?6:0}}>
                          {hIco(<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,t.azulLt,13,2)}
                          <span style={{fontSize:10,fontWeight:700,color:t.azulLt,letterSpacing:.5,flex:1,textAlign:"left"}}>CTE COMPLEMENTAR</span>
                          {(detalheCteComp.cte||detalheCteComp.mdf||detalheCteComp.mat)&&<span style={{fontSize:8,background:"rgba(22,119,255,.12)",borderRadius:8,padding:"1px 6px",color:t.azulLt,fontWeight:700}}>preenchido</span>}
                          {hIco(detalheSecCteComp?<><polyline points="18 15 12 9 6 15"/></>:<><polyline points="6 9 12 15 18 9"/></>,t.txt2,13,2)}
                        </button>
                        {detalheSecCteComp&&<div style={{background:`rgba(22,119,255,.04)`,border:`1px solid rgba(22,119,255,.15)`,borderRadius:8,padding:"8px 10px"}}>
                          <div className="co-min-g3">
                            <div><div style={lblP2}>CTE COMP</div><input value={detalheCteComp.cte} onChange={e=>setDetalheCteComp(p=>({...p,cte:e.target.value}))} style={inpP2} /></div>
                            <div><div style={lblP2}>MDF COMP</div><input value={detalheCteComp.mdf} onChange={e=>setDetalheCteComp(p=>({...p,mdf:e.target.value}))} style={inpP2} /></div>
                            <div><div style={lblP2}>MAT COMP</div><input value={detalheCteComp.mat} onChange={e=>setDetalheCteComp(p=>({...p,mat:e.target.value}))} style={inpP2} /></div>
                          </div>
                        </div>}
                      </div>

                      {/* ─ Minutas Descarga — colapsável (aberto por padrão) ─ */}
                      <div style={{marginBottom:10}}>
                        <button onClick={()=>setDetalheSecMinDsc(p=>!p)} style={{width:"100%",background:`rgba(22,119,255,.06)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontFamily:"inherit",marginBottom:detalheSecMinDsc?6:0}}>
                          {hIco(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04M12 22V12"/></>,t.azulLt,13,2)}
                          <span style={{fontSize:10,fontWeight:700,color:t.azulLt,letterSpacing:.5,flex:1,textAlign:"left"}}>MINUTAS DESCARGA</span>
                          <span style={{fontSize:9,color:t.txt2,fontWeight:400}}>{detalheMinDsc.length} minuta(s)</span>
                          {hIco(detalheSecMinDsc?<><polyline points="18 15 12 9 6 15"/></>:<><polyline points="6 9 12 15 18 9"/></>,t.txt2,13,2)}
                        </button>
                        {detalheSecMinDsc&&<div>
                          {detalheMinDsc.map((mn,idx)=>(
                            <div key={idx} style={{background:`rgba(22,119,255,.04)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                                <div style={{display:"flex",gap:5}}>
                                  {["MAM","MRM"].map(tp=>(
                                    <button key={tp} onClick={()=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,tipo:tp}:m))} style={{padding:"4px 10px",borderRadius:6,border:`1.5px solid ${mn.tipo===tp?t.azulLt:t.borda}`,background:mn.tipo===tp?`rgba(22,119,255,.12)`:t.card,color:mn.tipo===tp?t.azulLt:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:11}}>{tp}</button>
                                  ))}
                                  <span style={{fontSize:10,color:t.txt2,marginLeft:4,alignSelf:"center"}}>Minuta {detalheMinDsc.length>1?idx+1:""}</span>
                                </div>
                                {detalheMinDsc.length>1&&<button onClick={()=>setDetalheMinDsc(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",fontSize:12,padding:2}}>✕</button>}
                              </div>
                              <div className="co-min-g3">
                                <div><div style={lblP2}>CTE {mn.tipo}</div><input value={mn.cte} onChange={e=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>MDF {mn.tipo}</div><input value={mn.mdf} onChange={e=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>{mn.tipo} (nº)</div><input value={mn.num} onChange={e=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP2} /></div>
                              </div>
                            </div>
                          ))}
                          <button onClick={()=>setDetalheMinDsc(p=>[...p,{tipo:"MAM",cte:"",mdf:"",num:""}])} style={{background:`rgba(22,119,255,.05)`,border:`1px dashed rgba(22,119,255,.35)`,borderRadius:7,padding:"5px 10px",color:t.azulLt,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>＋ Outra Minuta Descarga</button>
                        </div>}
                      </div>

                      {/* ─ Diárias & Descargas desta DT ─ */}
                      {(()=>{
                        const diariaItem = diariasData.items.find(it=>it.r.dt===r.dt);
                        const tipoLabel = {ok:"✅ No Prazo",atraso:"⚠️ Perdeu Agenda",diaria:"🛏️ Com Diária",sem_diaria:"✓ Sem Diária",pendente:"⏳ Aguardando"};
                        const tipoColor = {ok:t.verde,atraso:t.danger,diaria:t.danger,sem_diaria:t.verde,pendente:t.ouro};
                        const temDescarga = !!(r.data_agenda||r.data_desc);
                        const hoje = new Date().toISOString().slice(0,10);
                        const toISO = s=>{if(!s)return null;const p=s.split("/");return p.length===3?p[2]+"-"+p[1]+"-"+p[0]:s;};
                        const agendaISO = toISO(r.data_agenda);
                        const descISO = toISO(r.data_desc);
                        let descStatus = null, descColor = t.txt2;
                        if(descISO){descStatus="✅ Descarregado";descColor=t.verde;}
                        else if(agendaISO&&agendaISO<hoje){descStatus="🔴 Em Atraso";descColor=t.danger;}
                        else if(agendaISO){descStatus="📅 Agendado";descColor=t.ouro;}
                        else if(r.status==="CARREGADO"){descStatus="⏱️ Aguardando Agenda";descColor=t.ouro;}
                        if(!diariaItem && !temDescarga) return null;
                        return (
                          <div style={{background:`rgba(240,185,11,.04)`,border:`1px solid rgba(240,185,11,.18)`,borderRadius:9,padding:"10px 12px",marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                              {hIco(<><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></>,t.ouro,12)} Diárias & Descargas
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                              {diariaItem && (
                                <div style={{background:t.bg,borderRadius:8,padding:"8px 10px",border:`1px solid ${tipoColor[diariaItem.tipo]||t.borda}33`}}>
                                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginBottom:4}}>Status Diária</div>
                                  <div style={{fontSize:11,fontWeight:700,color:tipoColor[diariaItem.tipo]||t.txt}}>{tipoLabel[diariaItem.tipo]||diariaItem.tipo}</div>
                                  {diariaItem.dias!=null&&diariaItem.dias>0&&<div style={{fontSize:9,color:t.danger,marginTop:2}}>{diariaItem.dias} dia(s) de atraso</div>}
                                  {r.diaria_prev&&<div style={{fontSize:9,color:t.txt2,marginTop:4}}>Devida: <strong style={{color:t.ouro}}>{fmtMoeda(r.diaria_prev)}</strong></div>}
                                  {r.diaria_pg&&<div style={{fontSize:9,color:t.txt2,marginTop:2}}>Paga: <strong style={{color:t.verde}}>{fmtMoeda(r.diaria_pg)}</strong></div>}
                                  {r.diaria_prev&&r.diaria_pg&&(()=>{const saldo=(parseFloat(r.diaria_pg)||0)-(parseFloat(r.diaria_prev)||0);return saldo!==0&&<div style={{fontSize:9,color:saldo<0?t.danger:t.verde,marginTop:2,fontWeight:700}}>Saldo: {fmtMoeda(Math.abs(saldo))} {saldo<0?"a pagar":"a favor"}</div>;})()}
                                  <button onClick={()=>{setModalOpen(null);setActiveTab("diarias");}} style={{marginTop:8,width:"100%",padding:"5px 0",borderRadius:6,border:`1px solid ${t.ouro}44`,background:`rgba(240,185,11,.08)`,color:t.ouro,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:.3}}>📋 Ver Diárias →</button>
                                </div>
                              )}
                              {temDescarga && (
                                <div style={{background:t.bg,borderRadius:8,padding:"8px 10px",border:`1px solid ${descColor}33`}}>
                                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginBottom:4}}>Status Descarga</div>
                                  {descStatus&&<div style={{fontSize:11,fontWeight:700,color:descColor}}>{descStatus}</div>}
                                  {r.data_agenda&&<div style={{fontSize:9,color:t.txt2,marginTop:4}}>Agenda: <strong style={{color:t.txt}}>{r.data_agenda}</strong></div>}
                                  {r.data_desc&&<div style={{fontSize:9,color:t.txt2,marginTop:2}}>Descarga: <strong style={{color:t.verde}}>{r.data_desc}</strong></div>}
                                  {r.chegada&&<div style={{fontSize:9,color:t.txt2,marginTop:2}}>Chegada: <strong style={{color:t.txt}}>{r.chegada}</strong></div>}
                                  {r.destino&&<div style={{fontSize:9,color:t.txt2,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Destino: <strong style={{color:t.txt}}>{r.destino}</strong></div>}
                                  <button onClick={()=>{setModalOpen(null);setActiveTab("descarga");}} style={{marginTop:8,width:"100%",padding:"5px 0",borderRadius:6,border:`1px solid ${t.azulLt}44`,background:`rgba(22,119,255,.08)`,color:t.azulLt,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:.3}}>📦 Ver Descargas →</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ─ Botão Salvar ─ */}
                      <button onClick={salvarMinutasDetalhe} disabled={salvandoMins} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:salvandoMins?t.card:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,color:salvandoMins?t.txt2:"#fff",fontWeight:700,fontSize:13,cursor:salvandoMins?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:.5}}>
                        {salvandoMins?"⏳ Salvando...":"💾 SALVAR DOCUMENTOS"}
                      </button>
                    </div>
                  );
                })()}

              </div>{/* fim co-dt-panel (esquerdo) */}

              {/* ── PAINEL DIREITO: Acompanhamento + Ocorrências ── */}
              <div className="co-dt-right">

                {/* Acompanhamento Dia a Dia */}
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
                        {hIco(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,t.ouro,12)} Acompanhamento Dia a Dia
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

                {/* ── Histórico de Ocorrências ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:8}}>
                    {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.ouro,12)} Histórico de Ocorrências
                    {ocorrLoading && <span style={{fontSize:9,color:t.txt2,fontWeight:400}}> carregando…</span>}
                    <span style={{flex:1,height:1,background:t.borda}} />
                  </div>

                  {/* Lista de ocorrências */}
                  {ocorrAll.length === 0 ? (
                    <div style={{fontSize:11,color:t.txt2,textAlign:"center",padding:"12px 0"}}>Nenhuma ocorrência registrada.</div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {(ocorrListExpanded ? ocorrAll : ocorrAll.slice(0,3)).map((o,oi,arr)=>(
                        <div key={oi} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                            <div style={{width:24,height:24,borderRadius:"50%",background:`${tipoColors[o.tipo]||t.azulLt}18`,border:`1.5px solid ${tipoColors[o.tipo]||t.azulLt}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{tipoIcos[o.tipo]||"💬"}</div>
                            {oi < arr.length-1 && <div style={{width:1,flex:1,minHeight:12,background:t.borda,margin:"3px 0"}} />}
                          </div>
                          <div style={{flex:1,background:t.card2,borderRadius:8,padding:"8px 10px",border:`1px solid ${t.borda}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:3}}>
                              <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:tipoColors[o.tipo]||t.azulLt}}>{o.tipo||"info"}</span>
                              <span style={{fontSize:8,color:t.txt2,whiteSpace:"nowrap"}}>{o.usuario||"—"}{o.data_hora?" · "+new Date(o.data_hora).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):""}</span>
                            </div>
                            <div style={{fontSize:12,color:t.txt,lineHeight:1.5}}>{o.texto}</div>
                            {o._origem && <div style={{fontSize:9,color:t.txt2,marginTop:4,fontStyle:"italic",opacity:.8}}>obs de {o._origem==="chegada"?"chegada":"descarga"}</div>}
                          </div>
                        </div>
                      ))}
                      {ocorrAll.length > 3 && (
                        <button onClick={()=>setOcorrListExpanded(v=>!v)} style={{fontSize:11,color:"#E8820C",background:"transparent",border:"none",cursor:"pointer",padding:"4px 0",textAlign:"center",fontFamily:"inherit",fontWeight:700}}>
                          {ocorrListExpanded ? "▲ Ver menos" : `▼ Ver mais (${ocorrAll.length - 3} ocultas)`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Adicionar nova ocorrência */}
                  {canOcorr && (
                    <div style={{marginTop:10,background:t.card2,borderRadius:10,padding:10,border:`1px solid ${t.borda}`}}>
                      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginBottom:9}}>＋ Nova Ocorrência</div>
                      {/* Tipo */}
                      <div style={{display:"flex",gap:6,marginBottom:9}}>
                        {[{k:"info",l:"Chegada",svg:<><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4M12 16h.01"/></>,c:tipoColors.info},{k:"status",l:"Descarga",svg:<><polyline points="20 6 9 17 4 12"/></>,c:tipoColors.status},{k:"alerta",l:"Alerta",svg:<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/></>,c:tipoColors.alerta}].map(tp=>{
                          const ativo=novaOcorrTipo===tp.k;
                          return (
                            <button key={tp.k} onClick={()=>setNovaOcorrTipo(tp.k)} style={{flex:1,background:ativo?`${tp.c}14`:"transparent",border:`1.5px solid ${ativo?tp.c:t.borda}`,borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"10px 4px 8px",position:"relative",transition:"all .18s",fontFamily:"inherit",overflow:"hidden"}}>
                              {ativo&&<span style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:22,height:2.5,borderRadius:"0 0 3px 3px",background:tp.c,boxShadow:`0 0 6px ${tp.c}88`}} />}
                              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={ativo?tp.c:t.txt2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{tp.svg}</svg>
                              <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",color:ativo?tp.c:t.txt2,lineHeight:1}}>{tp.l}</span>
                            </button>
                          );
                        })}
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
              </div>{/* fim co-dt-right */}
            </div>{/* fim co-dt-body */}

            {/* Botão fechar — sticky no fundo, visível no mobile */}
            <div style={{flexShrink:0,padding:"10px 16px",borderTop:`1px solid ${t.borda}`,background:t.modalBg,display:"none"}} className="co-dt-close-bar">
              <button onClick={()=>{setModalOpen(null);setExcluirConfirm(null);setExcluirTexto("");}} style={{width:"100%",padding:"13px",background:"rgba(128,128,128,.12)",border:`1px solid ${t.borda2}`,borderRadius:DESIGN.r.btn,color:t.txt2,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,letterSpacing:.5}}>✕ FECHAR</button>
            </div>
          </div>{/* fim co-dt-modal */}
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
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,maxHeight:"calc(96vh - 120px)"}}>
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
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,maxHeight:"calc(96vh - 120px)"}}>
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

      {/* ═══ MODAL FILTRO DE PREFIXOS ═══ */}
      {motImportPrefOpen && (()=>{
        const _pm2 = new Map();
        motImportRaw.forEach(c=>{const p=(c.nome||"").trim().split(/\s+/)[0].toUpperCase();if(p)_pm2.set(p,(_pm2.get(p)||0)+1);});
        const _allP = [..._pm2.keys()].sort((a,b)=>_pm2.get(b)-_pm2.get(a));
        const _filtP = motImportPrefBusca.trim() ? _allP.filter(p=>p.includes(motImportPrefBusca.trim().toUpperCase())) : _allP;
        const _PAVISO = new Set(["AGENC","AGENCIA","POSTO","SEGURO","BANCO","FILIAL","COOP","ASSOC","TRANS","TRANSP"]);
        const _totalSel = motImportRaw.filter(c=>motImportPrefSel.has((c.nome||"").trim().split(/\s+/)[0].toUpperCase())).length;
        const _prosseguir = () => {
          const _importados = motImportRaw.filter(c=>motImportPrefSel.has((c.nome||"").trim().split(/\s+/)[0].toUpperCase()));
          if(!_importados.length){showToast("⚠️ Nenhum contato selecionado","warn");return;}
          const _novos=[],_conflitos=[];
          _importados.forEach(imp=>{
            const nN=imp.nome.toUpperCase(),cN=(imp.cpf||"").replace(/\D/g,""),p1N=(imp.placa1||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
            const ex=motoristas.find(m=>{
              if(cN&&m.cpf&&m.cpf.replace(/\D/g,"")=== cN)return true;
              if(p1N&&m.placa1&&m.placa1.toUpperCase().replace(/[^A-Z0-9]/g,"")=== p1N)return true;
              return m.nome&&m.nome.toUpperCase()===nN;
            });
            if(ex){_conflitos.push({atual:ex,imp,escolha:"manter"});}else{_novos.push(imp);}
          });
          const _vinc=[];
          [..._novos,..._conflitos.map(c=>c.imp)].forEach(imp=>{
            const iP=[imp.placa1,imp.placa2,imp.placa3,imp.placa4].filter(Boolean).map(p=>p.toUpperCase().replace(/[^A-Z0-9]/g,""));
            if(!iP.length)return;
            DADOS.forEach(reg=>{
              const rP=(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
              if(!rP||!iP.includes(rP))return;
              const nR=(reg.nome||"").toUpperCase().trim(),nI=imp.nome.toUpperCase().trim();
              if(!nR||nR!==nI)_vinc.push({contato:imp,reg,placa:rP,aceito:null});
            });
          });
          const _vU=_vinc.filter((v,i)=>_vinc.findIndex(x=>x.reg.dt===v.reg.dt&&x.contato.nome===v.contato.nome)===i);
          setMotImportData({novos:_novos,conflitos:_conflitos,vinculos:_vU});
          setMotImportConfirm(""); setMotImportStep(1);
          setMotImportPrefOpen(false); setMotImportOpen(true);
        };
        return (
          <div style={{...css.overlay,alignItems:"center",backdropFilter:"blur(10px)",padding:16}} onClick={()=>setMotImportPrefOpen(false)}>
            <div style={{...css.modal,borderRadius:18,maxWidth:540,maxHeight:"90vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
              <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:9,background:`rgba(22,119,255,.15)`,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></>,t.azulLt,18,2)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:t.txt}}>Filtrar por Prefixo</div>
                  <div style={{fontSize:10,color:t.txt2,marginTop:1}}>{motImportRaw.length} contatos · {_allP.length} prefixos únicos</div>
                </div>
                <button onClick={()=>setMotImportPrefOpen(false)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${t.borda}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
                <input value={motImportPrefBusca} onChange={e=>setMotImportPrefBusca(e.target.value)} placeholder="Buscar prefixo..." style={{...css.inp,flex:1,minWidth:120,fontSize:11}}/>
                <button onClick={()=>setMotImportPrefSel(new Set(_allP))} style={{...css.hBtn,fontSize:10,padding:"5px 10px"}}>✅ Todos</button>
                <button onClick={()=>setMotImportPrefSel(new Set())} style={{...css.hBtn,fontSize:10,padding:"5px 10px"}}>☐ Nenhum</button>
              </div>
              <div style={{padding:"8px 14px",background:`rgba(240,185,11,.05)`,borderBottom:`1px solid ${t.borda}`,fontSize:10,color:t.ouro,flexShrink:0}}>
                ⚠️ Prefixos em <span style={{color:t.danger}}>vermelho</span> são comumente não-motoristas e foram pré-desmarcados. Ajuste conforme necessário.
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
                {_filtP.map(pref=>{
                  const sel=motImportPrefSel.has(pref),isAv=_PAVISO.has(pref),qt=_pm2.get(pref)||0;
                  return (
                    <div key={pref} onClick={()=>{const ns=new Set(motImportPrefSel);if(ns.has(pref))ns.delete(pref);else ns.add(pref);setMotImportPrefSel(ns);}} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",background:sel?`rgba(2,192,118,.05)`:`rgba(246,70,93,.03)`,border:`1px solid ${sel?`rgba(2,192,118,.2)`:`rgba(246,70,93,.15)`}`}}>
                      <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${sel?t.verde:t.danger}`,background:sel?t.verde:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#000",fontWeight:700}}>{sel?"✓":""}</div>
                      <span style={{flex:1,fontSize:12,fontWeight:700,color:isAv&&!sel?t.danger:t.txt}}>{pref}</span>
                      {isAv && <span style={{fontSize:9,color:t.danger,background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:4,padding:"1px 5px"}}>⚠️ não-motorista</span>}
                      <span style={{fontSize:10,color:t.txt2}}>{qt} contato{qt!==1?"s":""}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{padding:"12px 14px",borderTop:`1px solid ${t.borda}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:t.verde}}>{_totalSel} selecionados</div><div style={{fontSize:9,color:t.txt2}}>{motImportRaw.length-_totalSel} ignorados</div></div>
                <button onClick={()=>setMotImportPrefOpen(false)} style={{...css.btnOutline,padding:"9px 16px",fontSize:12}}>Cancelar</button>
                <button onClick={_prosseguir} disabled={_totalSel===0} style={{...css.btnGold,padding:"9px 18px",fontSize:12,opacity:_totalSel===0?.5:1}}>Prosseguir ({_totalSel}) →</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ IMPORT CONTACTS MODAL (Item 1 Sessão 4) ═══ */}
      {motImportOpen && motImportData && (()=>{
        const {novos, conflitos, vinculos=[]} = motImportData;
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
          // Se há sugestões de vínculo, ir para etapa 2; caso contrário, fechar
          if(vinculos.length>0){
            setMotImportStep(2);
          } else {
            setMotImportOpen(false);
            setMotImportData(null);
            setMotImportConfirm("");
          }
        };

        const aplicarVinculos = () => {
          const aceitos = vinculos.filter(v=>v.aceito===true);
          if(!aceitos.length){ setMotImportOpen(false); setMotImportData(null); return; }
          // Atualizar DADOS: preencher nome do motorista nos registros vinculados
          const novosD = DADOS.map(reg=>{
            const match = aceitos.find(v=>v.reg.dt===reg.dt&&v.placa===(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,""));
            if(!match)return reg;
            return {...reg, nome:match.contato.nome, cpf:match.contato.cpf||reg.cpf||""};
          });
          setDadosBase(novosD.filter(r=>!dadosExtras.find(e=>e.dt===r.dt)));
          registrarLog("VINCULAR_CONTATOS", `${aceitos.length} DT(s) vinculadas via placa`);
          showToast(`🔗 ${aceitos.length} DT${aceitos.length>1?"s":""} vinculada${aceitos.length>1?"s":""}`, "ok");
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
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.azulLt}}>
                    {motImportStep===1?"IMPORTAR CONTATOS":"SUGESTÕES DE VÍNCULO"}
                  </div>
                  <div style={{fontSize:9,color:t.txt2}}>
                    {motImportStep===1
                      ? `${novos.length} novos · ${conflitos.length} conflito${conflitos.length!==1?"s":""}`
                      : `${vinculos.length} DT${vinculos.length!==1?"s":""} com placa correspondente`}
                  </div>
                </div>
                <button onClick={()=>setMotImportOpen(false)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:12,maxHeight:"calc(96vh - 120px)"}}>

                {/* ══ ETAPA 2: SUGESTÕES DE VÍNCULO ══ */}
                {motImportStep===2 && (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{background:`rgba(22,119,255,.06)`,border:`1px solid rgba(22,119,255,.2)`,borderRadius:10,padding:"10px 12px",fontSize:10,color:t.azulLt,lineHeight:1.5}}>
                      🔗 Encontramos placas dos contatos importados em DTs do sistema. Aceite para preencher o nome do motorista automaticamente.
                    </div>
                    {vinculos.map((v,vi)=>(
                      <div key={vi} style={{background:t.card,borderRadius:10,border:`1px solid ${v.aceito===true?t.verde:v.aceito===false?t.borda:t.borda}`,borderLeft:`3px solid ${v.aceito===true?t.verde:v.aceito===false?`rgba(128,128,128,.3)`:t.azulLt}`,padding:"10px 12px",opacity:v.aceito===false?.5:1,transition:"all .18s"}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,fontWeight:700,color:t.txt,marginBottom:3}}>{v.contato.nome}</div>
                            <div style={{fontSize:9,color:t.txt2,display:"flex",gap:8,flexWrap:"wrap"}}>
                              {v.contato.tel&&<span>📞 {v.contato.tel}</span>}
                              <span style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:4,padding:"1px 6px",color:t.ouro,fontWeight:700}}>🚛 {v.placa}</span>
                            </div>
                            <div style={{fontSize:9,color:t.txt2,marginTop:5,paddingTop:5,borderTop:`1px solid ${t.borda}`}}>
                              <span style={{color:t.azulLt,fontWeight:700}}>DT {v.reg.dt}</span>
                              {" · "}{v.reg.origem||"?"} → {v.reg.destino||"?"}
                              {v.reg.nome&&<span style={{color:t.txt2}}> · atual: <em>{v.reg.nome}</em></span>}
                            </div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                            <button onClick={()=>{const nv=[...vinculos];nv[vi]={...nv[vi],aceito:true};setMotImportData({...motImportData,vinculos:nv});}} style={{padding:"5px 12px",fontSize:10,fontWeight:700,borderRadius:7,border:`1.5px solid ${t.verde}`,background:v.aceito===true?`rgba(2,192,118,.2)`:`rgba(2,192,118,.07)`,color:t.verde,cursor:"pointer",fontFamily:"inherit"}}>✔ Vincular</button>
                            <button onClick={()=>{const nv=[...vinculos];nv[vi]={...nv[vi],aceito:false};setMotImportData({...motImportData,vinculos:nv});}} style={{padding:"5px 12px",fontSize:10,fontWeight:700,borderRadius:7,border:`1.5px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>✕ Pular</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* NOVOS */}
                {motImportStep===1 && novos.length > 0 && (
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
                {motImportStep===1 && conflitos.length > 0 && (
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
                {motImportStep===1 && needsConfirm && (
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
                <button onClick={()=>{setMotImportOpen(false);setMotImportData(null);setMotImportConfirm("");}} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                {motImportStep===1 ? (
                  <button onClick={aplicar} disabled={!confirmOk} style={{flex:1,border:`1.5px solid ${confirmOk?t.azulLt:t.borda}`,borderRadius:10,padding:"12px 18px",cursor:confirmOk?"pointer":"not-allowed",background:confirmOk?`rgba(22,119,255,.12)`:`rgba(128,128,128,.08)`,color:confirmOk?t.azulLt:t.txt2,fontWeight:700,fontSize:13,letterSpacing:.5,fontFamily:"inherit"}}>
                    📥 IMPORTAR ({novos.length} novos + {conflitos.filter(c=>c.escolha==="usar").length} atualizações)
                    {vinculos.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:6}}>→ depois {vinculos.length} sugestão{vinculos.length>1?"ões":""}</span>}
                  </button>
                ) : (
                  <button onClick={aplicarVinculos} style={{flex:1,border:`1.5px solid ${t.verde}`,borderRadius:10,padding:"12px 18px",cursor:"pointer",background:`rgba(2,192,118,.1)`,color:t.verde,fontWeight:700,fontSize:13,letterSpacing:.5,fontFamily:"inherit"}}>
                    🔗 CONFIRMAR {vinculos.filter(v=>v.aceito===true).length} VÍNCULO{vinculos.filter(v=>v.aceito===true).length!==1?"S":""}
                    {vinculos.some(v=>v.aceito===null)&&<span style={{fontSize:10,opacity:.7,marginLeft:6}}>(pular restantes)</span>}
                  </button>
                )}
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

              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>

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
                      <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:2.5,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:DESIGN.r.badge,padding:"3px 9px"}}>{p}</span>
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
                      <button key={op.k} onClick={()=>setWppPgto(op.k)} style={{padding:"9px 6px",borderRadius:DESIGN.r.btn,border:`1.5px solid ${wppPgto===op.k?t.verde:t.borda}`,background:wppPgto===op.k?`rgba(2,192,118,.1)`:t.card2,color:wppPgto===op.k?t.verde:t.txt2,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,textAlign:"center",transition:"all .2s"}}>
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
                <button onClick={enviar} disabled={somaExcede} style={{flex:1,borderRadius:10,padding:"12px 18px",cursor:somaExcede?"not-allowed":"pointer",background:somaExcede?`rgba(128,128,128,.2)`:`rgba(37,211,102,.15)`,border:`1.5px solid ${somaExcede?t.borda:"rgba(37,211,102,.4)"}`,color:somaExcede?t.txt2:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
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
          msg += `${b("DT:")} ${reg.dt||"—"}  ${b("NF:")} ${reg.nf||"—"}  ${b("ID:")} ${reg.id_doc||"—"}${ln}`;
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

              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>

                {/* Motorista + Placas */}
                <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700}}>Motorista</div>
                    {telMot && <div style={{fontSize:9,color:t.txt2}}>📞 {telMot}</div>}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:3}}>{nomeMotorista||"—"}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                    {[mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).map((p,j)=>(
                      <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:DESIGN.r.badge,padding:"2px 8px"}}>{p}</span>
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
                  {[{l:"DT",v:reg.dt},{l:"NF",v:reg.nf},{l:"ID",v:reg.id_doc}].map(f=>(
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
                    {`📄 DOCUMENTO\n────────────────\nMOT: ${nomeMotorista||"—"}\nCTE: ${reg.cte||"—"}\nMDF: ${reg.mdf||"—"}\nMAT: ${reg.mat||"—"}\nPLACAS: ${placas}\n────────────────\nDT: ${reg.dt||"—"}  NF: ${reg.nf||"—"}  ID: ${reg.id_doc||"—"}\nRO: ${wpp2Ro||"[obrigatório]"}${wpp2IncluirObs&&wpp2Obs?`\nOBS: ${wpp2Obs}`:""}\n────────────────\nYFGroup · Controle Operacional`}
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

      {/* ═══ WHATSAPP FATURAMENTO MODAL ═══ */}
      {wppFatModal && (()=>{
        const {reg,mot} = wppFatModal;
        const placas = [mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).join(" / ")||reg.placa||"—";
        const inpF = {...css.inp,fontSize:12,padding:"7px 10px"};
        const lblF = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};

        const gerarFat = () => {
          const cleanNome = s => (s||"").replace(/^[^a-zA-ZÀ-ÿ0-9]+/,"").trim();
          const ln = "\n";
          let m = `MOT: ${cleanNome(reg.nome)||"—"}${ln}`;
          m += `CTE: ${reg.cte||"—"}${ln}`;
          m += `MDF: ${reg.mdf||"—"}${ln}`;
          m += `MAT: ${reg.mat||"—"}${ln}`;
          m += `DT: ${reg.dt||"—"}${ln}`;
          m += `NF: ${reg.nf||"—"}${ln}`;
          m += `ID: ${reg.id_doc||"—"}${ln}`;
          return m;
        };

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppFatModal(null)}>
            <div style={{...css.modal,maxHeight:"90vh"}}>
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:"rgba(37,211,102,.05)"}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(37,211,102,.15)",border:"1px solid rgba(37,211,102,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>🧾</div>
                <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:"#25D366"}}>FATURAMENTO</div><div style={{fontSize:9,color:t.txt2}}>CTE · MDF · MAT · DT · NF · ID</div></div>
                <button onClick={()=>setWppFatModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>
                <div style={{background:t.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:8}}>Preview</div>
                  <div style={{fontFamily:"monospace",fontSize:11,color:t.txt,lineHeight:2,whiteSpace:"pre"}}>
                    {(()=>{const cn=s=>(s||"").replace(/^[^a-zA-ZÀ-ÿ0-9]+/,"").trim();return`MOT: ${cn(reg.nome)||"—"}\nCTE: ${reg.cte||"—"}\nMDF: ${reg.mdf||"—"}\nMAT: ${reg.mat||"—"}\nDT: ${reg.dt||"—"}\nNF: ${reg.nf||"—"}\nID: ${reg.id_doc||"—"}`;})()}
                  </div>
                </div>
                {(()=>{
                  const faltando=[];
                  if(!reg.nome)faltando.push("Motorista");if(!reg.cte)faltando.push("CTE");if(!reg.mdf)faltando.push("MDF");if(!reg.mat)faltando.push("MAT");if(!reg.nf)faltando.push("NF");if(!reg.dt)faltando.push("DT");
                  return faltando.length>0?(
                    <div style={{background:`rgba(246,70,93,.07)`,border:`1.5px solid rgba(246,70,93,.3)`,borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,fontWeight:700,color:t.danger,marginBottom:5}}>⚠️ Campos obrigatórios vazios — edite o registro antes de enviar:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {faltando.map(f=><span key={f} style={{background:`rgba(246,70,93,.12)`,border:`1px solid rgba(246,70,93,.3)`,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,color:t.danger}}>{f}</span>)}
                      </div>
                    </div>
                  ):(<div style={{background:`rgba(2,192,118,.07)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.verde,fontWeight:700}}>✅ Todos os campos estão preenchidos!</div>);
                })()}
              </div>
              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8}}>
                <button onClick={()=>setWppFatModal(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={()=>{
                  const faltando=[];
                  if(!reg.cte)faltando.push("CTE");if(!reg.mdf)faltando.push("MDF");if(!reg.nf)faltando.push("NF");
                  if(faltando.length>0){if(!window.confirm(`⚠️ Campos vazios: ${faltando.join(", ")}.\nEnviar mesmo assim?`))return;}
                  const tel=(mot?.tel||"").replace(/\D/g,"");
                  const msg=encodeURIComponent(gerarFat());
                  window.open(tel?`https://wa.me/55${tel}?text=${msg}`:`https://wa.me/?text=${msg}`,"_blank");
                  setWppFatModal(null);
                }} style={{flex:1,borderRadius:10,padding:"12px 18px",cursor:"pointer",background:`rgba(37,211,102,.15)`,border:`1.5px solid rgba(37,211,102,.4)`,color:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  📲 ENVIAR NO WHATSAPP
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ WHATSAPP PAGAMENTO (Descarga / Diárias) MODAL ═══ */}
      {wppPagModal && (()=>{
        const {reg,mot,tipo} = wppPagModal;
        const isDiaria = tipo === "diarias";
        const nomeLabel = isDiaria ? "DIÁRIAS" : "DESCARGA / STRETCH";
        const headerColor = isDiaria ? t.danger : t.azulLt;
        const headerBg = isDiaria ? "rgba(246,70,93,.06)" : "rgba(22,119,255,.06)";
        const placas = [mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).join(" / ")||reg.placa||"—";
        const pixLabel = mot?.pix_tipo ? `${mot.pix_tipo}: ${mot.pix_chave||"—"}` : "—";
        const inpP = {...css.inp,fontSize:12,padding:"7px 10px"};
        const lblP = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};

        const cleanNome = s => (s||"").replace(/^[^a-zA-ZÀ-ÿ0-9]+/,"").trim();
        const gerarPag = () => {
          const ln = "\n";
          let m = `PREZADAS,${ln}SOLICITO O PAGAMENTO:${ln}`;
          m += `MOT: ${cleanNome(reg.nome)||"—"}${ln}`;
          m += `CTE: ${reg.cte||"—"}${ln}`;
          m += `MDF: ${reg.mdf||"—"}${ln}`;
          m += `MAR: ${reg.mat||"—"}${ln}`;
          m += `PLACAS: ${placas}${ln}`;
          m += `DT: ${reg.dt||"—"} NF: ${reg.nf||"—"} ID: ${reg.id_doc||"—"}${ln}`;
          m += `${ln}`;
          m += `BCO: ${mot?.banco||"—"}${ln}`;
          m += `FAV: ${cleanNome(mot?.favorecido||mot?.nome||reg.nome)||"—"}${ln}`;
          m += `PIX: ${pixLabel}${ln}`;
          m += `AGE: ${mot?.agencia||"—"}${ln}`;
          m += `C/C: ${mot?.conta||"—"}${ln}`;
          if (wppFortes) {
            m += `${ln}`;
            if (isDiaria) {
              wppDccMinutas.forEach((mn,idx)=>{
                const td = mn.tipo||"D01-MAT";
                m += `MINUTA DCC${wppDccMinutas.length>1?` (${idx+1})`:""}${ln}`;
                m += `CTE ${td}: ${mn.cte||"—"}${ln}`;
                m += `MDF ${td}: ${mn.mdf||"—"}${ln}`;
                m += `${td}: ${mn.num||"—"}${ln}`;
                if(mn.valor) m += `VALOR: ${fmtMoeda(mn.valor)}${ln}`;
                m += `${ln}`;
              });
              if(wppCteComp.cte||wppCteComp.mdf||wppCteComp.mat){
                m += `CTE COMPLEMENTAR:${ln}`;
                if(wppCteComp.cte) m += `CTE COMP: ${wppCteComp.cte}${ln}`;
                if(wppCteComp.mdf) m += `MDF COMP: ${wppCteComp.mdf}${ln}`;
                if(wppCteComp.mat) m += `MAT COMP: ${wppCteComp.mat}${ln}`;
              }
            } else {
              wppDscMinutas.forEach((mn,idx)=>{
                const tp = mn.tipo||"MAM";
                m += `MINUTA ${tp}${wppDscMinutas.length>1?` (${idx+1})`:""}${ln}`;
                m += `CTE ${tp}: ${mn.cte||"—"}${ln}`;
                m += `MDF ${tp}: ${mn.mdf||"—"}${ln}`;
                m += `${tp}: ${mn.num||"—"}${ln}`;
                m += `${ln}`;
              });
            }
          }
          return m.trim();
        };

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppPagModal(null)}>
            <div style={{...css.modal,maxHeight:"96vh"}}>
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:headerBg}}>
                <div style={{width:36,height:36,borderRadius:9,background:`${headerColor}22`,border:`1px solid ${headerColor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>{isDiaria?"🛏️":"📦"}</div>
                <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:headerColor}}>{nomeLabel}</div><div style={{fontSize:9,color:t.txt2}}>Solicitar pagamento · {reg.nome||"—"}</div></div>
                <button onClick={()=>setWppPagModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{flex:1,minHeight:0,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10}}>
                {/* Dados do registro */}
                <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {[{l:"DT",v:reg.dt,c:t.ouro},{l:"NF",v:reg.nf,c:t.txt},{l:"ID",v:reg.id_doc,c:t.txt}].map(f=>(
                      <div key={f.l} style={{textAlign:"center"}}>
                        <div style={{fontSize:7,textTransform:"uppercase",color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1,color:f.c}}>{f.v||"—"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                    {[{l:"CTE",v:reg.cte},{l:"MDF",v:reg.mdf},{l:"MAR/MAT",v:reg.mat}].map(f=>(
                      <div key={f.l} style={{textAlign:"center"}}>
                        <div style={{fontSize:7,textTransform:"uppercase",color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                        <div style={{fontSize:11,fontWeight:600,color:t.txt}}>{f.v||"—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dados bancários */}
                {mot?.banco ? (
                  <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.verde}33`,borderLeft:`3px solid ${t.verde}`}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.verde,marginBottom:6}}>✅ Dados bancários</div>
                    <div style={{display:"grid",gap:3,fontSize:10,color:t.txt2}}>
                      <div>BCO: <strong style={{color:t.txt}}>{mot.banco}</strong></div>
                      <div>FAV: <strong style={{color:t.txt}}>{mot.favorecido||mot.nome||reg.nome||"—"}</strong></div>
                      {mot.pix_tipo && <div style={{color:t.azulLt}}>PIX ({mot.pix_tipo}): <strong>{mot.pix_chave||"—"}</strong></div>}
                      <div>AGE: <strong style={{color:t.txt}}>{mot.agencia||"—"}</strong> · C/C: <strong style={{color:t.txt}}>{mot.conta||"—"}</strong></div>
                    </div>
                  </div>
                ):(
                  <div style={{background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:10,padding:"10px 12px",fontSize:10,color:t.ouro}}>⚠️ Motorista sem dados bancários. Cadastre na aba Motoristas.</div>
                )}

                {/* ── Minutas (DCC para Diárias / MAM-MRM para Descarga) ── */}
                <div style={{background:t.card2,borderRadius:10,border:`1px solid ${t.borda}`,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setWppFortes(v=>!v)}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${wppFortes?t.verde:t.borda}`,background:wppFortes?t.verde:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                      {wppFortes && <span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:wppFortes?t.verde:t.txt2}}>{isDiaria?"Incluir Minuta DCC + CTE Complementar":"Incluir Minuta Descarga (MAM/MRM)"}</span>
                  </div>
                  {wppFortes && (
                    <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:10,borderTop:`1px solid ${t.borda}`}}>
                      {isDiaria ? (<>
                        {/* Minutas DCC */}
                        {wppDccMinutas.map((mn,idx)=>(
                          <div key={idx} style={{background:`rgba(240,185,11,.04)`,borderRadius:8,border:`1px solid rgba(240,185,11,.2)`,padding:"8px 10px",marginTop:idx===0?8:0}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                              <span style={{fontSize:10,fontWeight:700,color:t.ouro}}>{"MINUTA DCC "+(wppDccMinutas.length>1?"("+(idx+1)+")":"")}</span>
                              {wppDccMinutas.length>1 && <button onClick={()=>setWppDccMinutas(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",fontSize:12,padding:2}}>✕</button>}
                            </div>
                            <div style={{display:"flex",gap:6,marginBottom:6}}>
                              {["D01-MAT","D05-MAR"].map(d=>(
                                <button key={d} onClick={()=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,tipo:d}:m))} style={{flex:1,padding:"6px",borderRadius:7,border:`1.5px solid ${mn.tipo===d?t.ouro:t.borda}`,background:mn.tipo===d?`rgba(240,185,11,.12)`:t.card,color:mn.tipo===d?t.ouro:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{d}</button>
                              ))}
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                              <div><label style={lblP}>CTE {mn.tipo}</label><input value={mn.cte} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>MDF {mn.tipo}</label><input value={mn.mdf} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>{mn.tipo} (nº)</label><input value={mn.num} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>Valor (R$)</label><input type="number" value={mn.valor} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,valor:e.target.value}:m))} placeholder="0,00" style={inpP} /></div>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>setWppDccMinutas(p=>[...p,{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}])} style={{background:`rgba(240,185,11,.07)`,border:`1px dashed rgba(240,185,11,.4)`,borderRadius:8,padding:"7px",color:t.ouro,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ Outra Minuta DCC</button>
                        {/* CTE Complementar */}
                        <div style={{background:`rgba(22,119,255,.04)`,borderRadius:8,border:`1px solid rgba(22,119,255,.2)`,padding:"8px 10px"}}>
                          <div style={{fontSize:10,fontWeight:700,color:t.azulLt,marginBottom:8}}>CTE COMPLEMENTAR DE DIÁRIAS</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                            <div><label style={lblP}>CTE COMP</label><input value={wppCteComp.cte} onChange={e=>setWppCteComp(p=>({...p,cte:e.target.value}))} style={inpP} /></div>
                            <div><label style={lblP}>MDF COMP</label><input value={wppCteComp.mdf} onChange={e=>setWppCteComp(p=>({...p,mdf:e.target.value}))} style={inpP} /></div>
                            <div><label style={lblP}>MAT COMP</label><input value={wppCteComp.mat} onChange={e=>setWppCteComp(p=>({...p,mat:e.target.value}))} style={inpP} /></div>
                          </div>
                        </div>
                      </>) : (<>
                        {/* Minutas Descarga MAM/MRM */}
                        {wppDscMinutas.map((mn,idx)=>(
                          <div key={idx} style={{background:`rgba(22,119,255,.04)`,borderRadius:8,border:`1px solid rgba(22,119,255,.2)`,padding:"8px 10px",marginTop:idx===0?8:0}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                              <span style={{fontSize:10,fontWeight:700,color:t.azulLt}}>{"MINUTA DESCARGA "+(wppDscMinutas.length>1?"("+(idx+1)+")":"")}</span>
                              {wppDscMinutas.length>1 && <button onClick={()=>setWppDscMinutas(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",fontSize:12,padding:2}}>✕</button>}
                            </div>
                            <div style={{display:"flex",gap:6,marginBottom:6}}>
                              {["MAM","MRM"].map(tp=>(
                                <button key={tp} onClick={()=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,tipo:tp}:m))} style={{flex:1,padding:"6px",borderRadius:7,border:`1.5px solid ${mn.tipo===tp?t.azulLt:t.borda}`,background:mn.tipo===tp?`rgba(22,119,255,.12)`:t.card,color:mn.tipo===tp?t.azulLt:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{tp}</button>
                              ))}
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                              <div><label style={lblP}>CTE {mn.tipo}</label><input value={mn.cte} onChange={e=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>MDF {mn.tipo}</label><input value={mn.mdf} onChange={e=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>{mn.tipo} (nº)</label><input value={mn.num} onChange={e=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP} /></div>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>setWppDscMinutas(p=>[...p,{tipo:"MAM",cte:"",mdf:"",num:""}])} style={{background:`rgba(22,119,255,.07)`,border:`1px dashed rgba(22,119,255,.4)`,borderRadius:8,padding:"7px",color:t.azulLt,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ Outra Minuta Descarga</button>
                      </>)}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div style={{background:t.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:7}}>Preview da mensagem</div>
                  <div style={{fontFamily:"monospace",fontSize:9,color:t.txt,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{gerarPag()}</div>
                </div>
              </div>

              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8,flexShrink:0}}>
                <button onClick={()=>setWppPagModal(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={()=>{
                  const tel=(mot?.tel||"").replace(/\D/g,"");
                  const msg=encodeURIComponent(gerarPag());
                  window.open(tel?`https://wa.me/55${tel}?text=${msg}`:`https://wa.me/?text=${msg}`,"_blank");
                  setWppPagModal(null); setWppFortes(false); setWppDccMinutas([{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}]); setWppCteComp({cte:"",mdf:"",mat:""}); setWppDscMinutas([{tipo:"MAM",cte:"",mdf:"",num:""}]);
                }} style={{flex:1,borderRadius:10,padding:"12px 18px",cursor:"pointer",background:`rgba(37,211,102,.15)`,border:`1.5px solid rgba(37,211,102,.4)`,color:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  📲 ENVIAR NO WHATSAPP
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ MODAL: DASHBOARD DRILL-DOWN ═══ */}
      {dashDrillModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",zIndex:9990,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 68px"}} onClick={()=>setDashDrillModal(null)}>
          <div style={{background:t.card,borderRadius:"18px 18px 0 0",width:"100%",maxWidth:640,border:`1px solid ${t.borda}`,boxShadow:"0 -12px 48px rgba(0,0,0,.5)",maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{padding:"14px 18px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`rgba(240,185,11,.12)`,border:`1.5px solid rgba(240,185,11,.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                {dashDrillModal.type==="motorista"?"👨‍✈️":dashDrillModal.type==="destino"?"📍":"📊"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:800,color:t.txt,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dashDrillModal.label}</div>
                <div style={{fontSize:9,color:t.txt2,marginTop:2}}>{dashDrillModal.regs.length} viagem{dashDrillModal.regs.length!==1?"s":""} · {dashDrillModal.type==="motorista"?"Histórico do motorista":dashDrillModal.type==="destino"?"Motoristas nesta rota":"Registros com este status"}</div>
              </div>
              <button onClick={()=>setDashDrillModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✕</button>
            </div>
            {/* Conteúdo */}
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"10px 14px 14px",maxHeight:"calc(96vh - 120px)"}}>
              {dashDrillModal.type==="destino"?(
                /* Destino: lista de motoristas únicos com contagem */
                (() => {
                  const motMap = {};
                  dashDrillModal.regs.forEach(r=>{if(r.nome){if(!motMap[r.nome])motMap[r.nome]={count:0,dts:[],destinos:new Set()};motMap[r.nome].count++;motMap[r.nome].dts.push(r.dt);motMap[r.nome].destinos.add(r.destino||"—");}});
                  return Object.entries(motMap).sort((a,b)=>b[1].count-a[1].count).map(([nome,info])=>(
                    <div key={nome} style={{background:t.card2,borderRadius:10,padding:"10px 12px",marginBottom:7,border:`1px solid ${t.borda}`,display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:`rgba(240,185,11,.12)`,border:`1.5px solid rgba(240,185,11,.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:t.ouro,flexShrink:0}}>{nome.charAt(0)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nome}</div>
                        <div style={{fontSize:9,color:t.txt2,marginTop:1}}>{info.count} viagem{info.count!==1?"s":""} · DTs: {info.dts.slice(0,3).join(", ")}{info.dts.length>3?`... +${info.dts.length-3}`:""}</div>
                      </div>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:t.ouro,flexShrink:0}}>{info.count}</span>
                    </div>
                  ));
                })()
              ):(
                /* Motorista ou Status: lista de viagens resumida */
                dashDrillModal.regs.sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;}).map((r,i)=>(
                  <div key={i} onClick={()=>{setDashDrillModal(null);abrirDetalhe(r);}} style={{background:t.card2,borderRadius:10,padding:"9px 12px",marginBottom:6,border:`1px solid ${t.borda}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background=`rgba(240,185,11,.06)`} onMouseLeave={e=>e.currentTarget.style.background=t.card2}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:t.ouro,letterSpacing:1}}>{r.dt}</span>
                        {dashDrillModal.type==="motorista"&&<span style={{fontSize:11,color:t.txt,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nome||"—"}</span>}
                        {r.status&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:4,background:`rgba(128,128,128,.12)`,color:t.txt2,fontWeight:600}}>{r.status}</span>}
                      </div>
                      <div style={{fontSize:9,color:t.txt2,lineHeight:1.5}}>
                        📍 {r.destino||"—"} · 📦 {r.data_carr||"—"} · {r.data_desc?`✅ ${r.data_desc}`:"⏳ Pendente"}
                      </div>
                    </div>
                    <span style={{fontSize:9,color:t.txt2,flexShrink:0}}>›</span>
                  </div>
                ))
              )}
              {dashDrillModal.regs.length===0&&<div style={{textAlign:"center",color:t.txt2,fontSize:12,padding:20}}>Nenhum registro encontrado.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RELATÓRIO GERAL ═══ */}
      {relGeralOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setRelGeralOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:600,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            {/* Cabeçalho */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(240,185,11,.12)`,border:`1.5px solid rgba(240,185,11,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {hIco(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,t.ouro,20,1.8)}
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório Geral de Operações</div>
                <div style={{fontSize:10,color:t.txt2}}>Configure os filtros e seções do relatório PDF</div>
              </div>
              <button onClick={()=>setRelGeralOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>

            {/* Período */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relGeralFrom} onChange={e=>setRelGeralFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relGeralTo} onChange={e=>setRelGeralTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>

            {/* Filtros */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Filtros</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Motorista</label>
                <input type="text" value={relGeralMotorista} onChange={e=>setRelGeralMotorista(e.target.value)} placeholder="Nome do motorista..." style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status Operacional</label>
                <select value={relGeralStatusOper} onChange={e=>setRelGeralStatusOper(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="CARREGADO">CARREGADO</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="EM ABERTO">EM ABERTO</option>
                  <option value="NO-SHOW">NO-SHOW</option>
                  <option value="NÃO ACEITE">NÃO ACEITE</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status Diária</label>
                <select value={relGeralStatus} onChange={e=>setRelGeralStatus(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="diaria">Com Diária</option>
                  <option value="sem_diaria">Sem Diária</option>
                  <option value="atraso">Perdeu Agenda</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Origem contém</label>
                <input type="text" value={relGeralOrigem} onChange={e=>setRelGeralOrigem(e.target.value)} placeholder="Cidade / UF..." style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Destino contém</label>
                <input type="text" value={relGeralDestino} onChange={e=>setRelGeralDestino(e.target.value)} placeholder="Cidade / UF..." style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Vínculo</label>
                <select value={relGeralVinculo} onChange={e=>setRelGeralVinculo(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="Agregado">Agregado</option>
                  <option value="Terceiro">Terceiro</option>
                  <option value="Frota">Frota</option>
                </select>
              </div>
            </div>

            {/* Seções */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Seções do Relatório</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
              {[
                {k:"kpi",l:"Indicadores / KPIs"},
                {k:"sumario",l:"Resumo por Motorista"},
                {k:"registros",l:"Tabela de Registros"},
                {k:"sgs",l:"Ocorrências SGS"},
                {k:"ocorr_dt",l:"Ocorrências por DT"},
                {k:"diarias",l:"Diárias do Período"},
                {k:"descargas",l:"Descargas do Período"},
              ].map(({k,l})=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:`rgba(128,128,128,.05)`,borderRadius:8,border:`1px solid ${relGeralSecoes[k]?t.ouro+"44":t.borda}`,cursor:"pointer",transition:"all .15s"}}>
                  <input type="checkbox" checked={!!relGeralSecoes[k]} onChange={e=>setRelGeralSecoes(p=>({...p,[k]:e.target.checked}))}
                    style={{accentColor:t.ouro,width:14,height:14,cursor:"pointer"}} />
                  <span style={{fontSize:11,fontWeight:600,color:relGeralSecoes[k]?t.txt:t.txt2}}>{l}</span>
                </label>
              ))}
            </div>

            {/* Aviso */}
            <div style={{background:`rgba(240,185,11,.06)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span style={{marginLeft:6}}>Deixe datas em branco para incluir <strong style={{color:t.ouro}}>todos os registros</strong>. Filtros podem ser combinados.</span>
            </div>

            {/* Botões */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelGeralOpen(false)}
                style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>
                Cancelar
              </button>
              <button
                disabled={relGeralLoading}
                onClick={async ()=>{
                  setRelGeralOpen(false);
                  // Se seção de ocorrências estiver ativa, pré-carrega do Supabase
                  if (relGeralSecoes.ocorr_dt !== false) {
                    setRelGeralLoading(true);
                    try {
                      // Calcula os DTs do período para pré-carregar suas ocorrências
                      const parseD2 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
                      const fromD2 = relGeralFrom ? new Date(relGeralFrom) : null;
                      const toD2 = relGeralTo ? new Date(relGeralTo) : null;
                      if(toD2) toD2.setHours(23,59,59,999);
                      const dtsNoPeriodo = DADOS.filter(r => {
                        const d = parseD2(r.data_carr || r.data_desc || r.chegada || "");
                        if(!d) return !fromD2 && !toD2;
                        if(fromD2 && d < fromD2) return false;
                        if(toD2 && d > toD2) return false;
                        return true;
                      }).map(r => r.dt).filter(Boolean);
                      await preCarregarOcorrencias(dtsNoPeriodo);
                    } catch { /* silencioso */ }
                    finally { setRelGeralLoading(false); }
                  }
                  gerarRelatorioGeral(relGeralFrom,relGeralTo,{
                    motorista:relGeralMotorista,statusDiaria:relGeralStatus,
                    statusOper:relGeralStatusOper,
                    origem:relGeralOrigem,destino:relGeralDestino,
                    vinculo:relGeralVinculo,secoes:relGeralSecoes
                  });
                }}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:relGeralLoading?`rgba(240,185,11,.06)`:`rgba(240,185,11,.13)`,color:t.ouro,cursor:relGeralLoading?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s",opacity:relGeralLoading?.6:1}}>
                {relGeralLoading
                  ? <><span style={{fontSize:14,animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span> Buscando ocorrências...</>
                  : <>{hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,t.ouro,15,1.8)}Gerar Relatório PDF</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RELATÓRIO DIÁRIAS ═══ */}
      {relDiariaOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setRelDiariaOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:560,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(240,185,11,.12)`,border:`1.5px solid rgba(240,185,11,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>🛏️</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório de Diárias</div>
                <div style={{fontSize:10,color:t.txt2}}>Financeiro e status de diárias por período</div>
              </div>
              <button onClick={()=>setRelDiariaOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relDiariaFrom} onChange={e=>setRelDiariaFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relDiariaTo} onChange={e=>setRelDiariaTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Filtros</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Motorista</label>
                <input type="text" value={relDiariaMotorista} onChange={e=>setRelDiariaMotorista(e.target.value)} placeholder="Nome..." style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Vínculo</label>
                <select value={relDiariaVinculo} onChange={e=>setRelDiariaVinculo(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="Agregado">Agregado</option>
                  <option value="Terceiro">Terceiro</option>
                  <option value="Frota">Frota</option>
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status da Diária</label>
                <select value={relDiariaStatus} onChange={e=>setRelDiariaStatus(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="diaria">Com Diária</option>
                  <option value="sem_diaria">Sem Diária</option>
                  <option value="atraso">Perdeu Agenda</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
            </div>
            <div style={{background:`rgba(240,185,11,.06)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span>Deixe datas em branco para <strong style={{color:t.ouro}}>todos os registros</strong>.</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelDiariaOpen(false)} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>Cancelar</button>
              <button onClick={()=>{setRelDiariaOpen(false);gerarRelatorioDiarias(relDiariaFrom,relDiariaTo,{motorista:relDiariaMotorista,vinculo:relDiariaVinculo,status:relDiariaStatus});}}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:`rgba(240,185,11,.13)`,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.ouro,15,1.8)}
                Gerar Relatório PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RELATÓRIO DESCARGAS ═══ */}
      {relDescargaOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setRelDescargaOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:520,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(240,185,11,.12)`,border:`1.5px solid rgba(240,185,11,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>📦</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório de Descargas</div>
                <div style={{fontSize:10,color:t.txt2}}>Agenda, status e atrasos de descarga</div>
              </div>
              <button onClick={()=>setRelDescargaOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relDescargaFrom} onChange={e=>setRelDescargaFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relDescargaTo} onChange={e=>setRelDescargaTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Filtros</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Motorista</label>
                <input type="text" value={relDescargaMotorista} onChange={e=>setRelDescargaMotorista(e.target.value)} placeholder="Nome..." style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status</label>
                <select value={relDescargaStatus} onChange={e=>setRelDescargaStatus(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="descarregado">Descarregado</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="pendente">Aguardando</option>
                </select>
              </div>
            </div>
            <div style={{background:`rgba(240,185,11,.06)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span>Deixe datas em branco para <strong style={{color:t.ouro}}>todos os registros</strong>.</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelDescargaOpen(false)} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>Cancelar</button>
              <button onClick={()=>{setRelDescargaOpen(false);gerarRelatorioDescargas(relDescargaFrom,relDescargaTo,{motorista:relDescargaMotorista,status:relDescargaStatus});}}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:`rgba(240,185,11,.13)`,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.ouro,15,1.8)}
                Gerar Relatório PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RELATÓRIO OPERACIONAL ═══ */}
      {relOperOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setRelOperOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:500,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(240,185,11,.12)`,border:`1.5px solid rgba(240,185,11,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>📋</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório Operacional</div>
                <div style={{fontSize:10,color:t.txt2}}>SGS, Apontamentos e ID Diárias por período</div>
              </div>
              <button onClick={()=>setRelOperOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            {/* Período */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relOperFrom} onChange={e=>setRelOperFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relOperTo} onChange={e=>setRelOperTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>
            {/* Seções */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Seções do Relatório</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
              {[
                {k:"sgs",l:"Chamados SGS"},
                {k:"apontamentos",l:"Apontamentos (Descarga/Stretch)"},
              ].map(({k,l})=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:`rgba(128,128,128,.05)`,borderRadius:8,border:`1px solid ${relOperSecoes[k]?t.ouro+"44":t.borda}`,cursor:"pointer",transition:"all .15s"}}>
                  <input type="checkbox" checked={!!relOperSecoes[k]} onChange={e=>setRelOperSecoes(p=>({...p,[k]:e.target.checked}))}
                    style={{accentColor:t.ouro,width:14,height:14,cursor:"pointer"}} />
                  <span style={{fontSize:11,fontWeight:600,color:relOperSecoes[k]?t.txt:t.txt2}}>{l}</span>
                </label>
              ))}
            </div>
            {/* Info */}
            <div style={{background:`rgba(240,185,11,.06)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18,display:"flex",alignItems:"flex-start",gap:6}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span>Deixe datas em branco para incluir <strong style={{color:t.ouro}}>todos os registros</strong>.</span>
            </div>
            {/* Botões */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelOperOpen(false)}
                style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>
                Cancelar
              </button>
              <button onClick={()=>{setRelOperOpen(false);gerarRelatorioOperacional(relOperFrom,relOperTo,relOperSecoes);}}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:`rgba(240,185,11,.13)`,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,t.ouro,15,1.8)}
                Gerar Relatório PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DETALHE PLANILHA ═══ */}
      {planilhaDetalheReg && (()=>{
        const r = planilhaDetalheReg;
        const cpfN = r.cpf?.replace(/\D/g,"");
        const placaN = r.placa?.toUpperCase().replace(/\W/g,"");
        const motCad = motoristas.find(m=>
          (cpfN && m.cpf?.replace(/\D/g,"")===cpfN) ||
          [m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p.toUpperCase().replace(/\W/g,"")===placaN)
        );
        const statusCor = r.data_desc ? t.verde : r.data_agenda ? t.ouro : t.danger;
        const statusTxt = r.data_desc ? "DESCARREGADO" : r.data_agenda ? "AGUARDANDO DESCARGA" : "SEM AGENDA";
        const statusIco = r.data_desc ? <><polyline points="20 6 9 17 4 12"/></> : r.data_agenda ? <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></> : <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>;
        // Grid responsivo: desktop 3 colunas, resto 2
        const vw = window.innerWidth;
        const isDesk = vw >= 900;
        const gridCols = isDesk ? "1fr 1fr 1fr" : "1fr 1fr";

        // Seção divisória — mesmo padrão que css.secTitle
        const Secao = ({ico, label}) => (
          <div style={{...css.secTitle, margin:"4px 0 6px"}}>
            {hIco(ico, t.ouro, 11)} {label}
            <span style={{flex:1, height:1, background:t.borda, marginLeft:4}} />
          </div>
        );

        return (
          <div style={{...css.overlay, alignItems:"center", backdropFilter:"blur(12px)", padding: isDesk?"24px":"12px"}}
               onClick={()=>setPlanilhaDetalheReg(null)}>
            <div style={{...css.modal, borderRadius:20, maxWidth: isDesk?620:520, maxHeight:"calc(100vh - 48px)", animation:"fadeIn .2s ease"}}
                 onClick={e=>e.stopPropagation()}>

              {/* ══ CABEÇALHO — padrão do Edit Modal ══ */}
              <div style={{padding:"14px 16px 10px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${t.borda}`, flexShrink:0}}>
                <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 14px rgba(240,185,11,.3)`}}>
                  {hIco(<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,t.headerBg,18,2)}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, color:t.txt, lineHeight:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{r.nome||"—"}</div>
                  <div style={{fontSize:9, color:t.txt2, fontWeight:600, letterSpacing:1.5, marginTop:2, display:"flex", alignItems:"center", gap:6}}>
                    <span style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:4,padding:"1px 6px",color:t.ouro,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>DT {r.dt}</span>
                    <span style={{background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:4,padding:"1px 6px",color:t.verde,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>{r.placa||"—"}</span>
                    <span style={{...css.badge(statusCor,`rgba(0,0,0,0)`,`${statusCor}44`)}}>{statusTxt}</span>
                  </div>
                </div>
                <button onClick={()=>setPlanilhaDetalheReg(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              </div>

              {/* ══ CONTEÚDO ══ */}
              <div style={{flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:14}}>

                {/* Status bar — DESCARGA + DIÁRIAS clicáveis */}
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                  {/* Card DESCARGA */}
                  <div
                    onClick={()=>{
                      setDescargaNavDT(r.dt);
                      if(r.data_agenda){const _d=r.data_agenda.split("/");if(_d.length===3)setDscData(`${_d[2]}-${_d[1].padStart(2,"0")}-${_d[0].padStart(2,"0")}`);}
                      setPlanilhaDetalheReg(null);
                      setActiveTab("descarga");
                    }}
                    style={{...css.kpi(statusCor), padding:"10px 12px", display:"flex", alignItems:"center", gap:8, textAlign:"left", cursor:"pointer", userSelect:"none"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity=".8"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                    title="Ver na aba Descarga"
                  >
                    {hIco(statusIco, statusCor, 16, 2)}
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:8, textTransform:"uppercase", letterSpacing:1.8, color:statusCor, fontWeight:700}}>DESCARGA</div>
                      <div style={{fontSize:9, textTransform:"uppercase", letterSpacing:1, color:statusCor, fontWeight:600, opacity:.8, marginTop:1}}>{statusTxt}</div>
                      {(r.data_desc||r.data_agenda) && <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:1.5, color:statusCor, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{r.data_desc||r.data_agenda}</div>}
                    </div>
                    <div style={{marginLeft:"auto",fontSize:12,color:statusCor,opacity:.4}}>›</div>
                  </div>

                  {/* Card DIÁRIAS */}
                  {(()=>{
                    const _devida = parseFloat(r.diaria_prev)||0;
                    const _paga   = parseFloat(r.diaria_pg)||0;
                    const _temD   = _devida > 0;
                    const _corD   = _temD ? (_paga >= _devida ? t.verde : t.danger) : t.txt2;
                    const _icoD   = _temD
                      ? (_paga >= _devida
                        ? <><polyline points="20 6 9 17 4 12"/></>
                        : <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>)
                      : <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>;
                    return (
                      <div
                        onClick={()=>{setDiariaNavDT(r.dt);setDFiltro("todos");setPlanilhaDetalheReg(null);setActiveTab("diarias");}}
                        style={{...css.kpi(_corD), padding:"10px 12px", display:"flex", alignItems:"center", gap:8, textAlign:"left", cursor:"pointer", userSelect:"none"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity=".8"}
                        onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                        title="Ver na aba Diárias"
                      >
                        {hIco(_icoD, _corD, 16, 2)}
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:8, textTransform:"uppercase", letterSpacing:1.8, color:_corD, fontWeight:700}}>DIÁRIAS</div>
                          {_temD ? (
                            <>
                              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:t.danger, letterSpacing:1, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>Dev: {fmtMoeda(_devida)}</div>
                              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:t.verde, letterSpacing:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>Pago: {fmtMoeda(_paga)}</div>
                            </>
                          ) : (
                            <div style={{fontSize:9, color:_corD, opacity:.7, marginTop:2}}>Sem diária</div>
                          )}
                        </div>
                        <div style={{marginLeft:"auto",fontSize:12,color:_corD,opacity:.4}}>›</div>
                      </div>
                    );
                  })()}
                </div>

                {/* Rota e Agenda */}
                <div>
                  <Secao ico={<><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></>} label="Rota e Agenda" />
                  <div style={{display:"grid", gridTemplateColumns:gridCols, gap:8}}>
                    {[
                      {ico:<><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></>,lbl:"Origem",val:r.origem},
                      {ico:<><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></>,lbl:"Destino",val:r.destino},
                      {ico:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,lbl:"Carregamento",val:r.data_carr},
                      {ico:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,lbl:"Agenda Descarga",val:r.data_agenda},
                      {ico:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,lbl:"Vínculo",val:r.vinculo},
                      {ico:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,lbl:"Status",val:r.status},
                    ].map((it,i)=>(
                      <div key={i} style={{...css.card, padding:"9px 11px"}}>
                        <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.8,color:t.txt2,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
                          {hIco(it.ico,t.txt2,10,1.8)} {it.lbl}
                        </div>
                        <div style={{fontWeight:600,color:t.txt,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={it.val||"—"}>{it.val||"—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financeiro */}
                {canFin && (
                  <div>
                    <Secao ico={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} label="Financeiro" />
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
                      {[
                        {lbl:"CTE Empresa",val:fmtMoeda(r.vl_cte),cor:t.verde},
                        {lbl:"Contrato Mot.",val:fmtMoeda(r.vl_contrato),cor:t.azulLt},
                        {lbl:"Adiantamento",val:fmtMoeda(r.adiant),cor:t.ouro},
                        {lbl:"Diária Devida",val:fmtMoeda(r.diaria_prev),cor:t.danger},
                        {lbl:"Diária Paga",val:fmtMoeda(r.diaria_pg),cor:t.verde},
                        {lbl:"Saldo",val:fmtMoeda(r.saldo),cor:t.txt2},
                      ].map((f,i)=>(
                        <div key={i} style={{...css.kpi(f.cor), padding:"10px 8px"}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:f.cor,lineHeight:1}}>{f.val}</div>
                          <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginTop:4}}>{f.lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aviso motorista não cadastrado */}
                {!motCad && canEdit && (
                  <div style={{background:`rgba(240,185,11,.06)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                    {hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.ouro,16,2)}
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:t.ouro}}>Motorista não cadastrado</div>
                      <div style={{fontSize:10,color:t.txt2,marginTop:1}}>Deseja cadastrar no sistema?</div>
                    </div>
                    <button onClick={()=>{setFormData({nome:r.nome||"",cpf:r.cpf||"",placa1:r.placa||"",vinculo:r.vinculo||""});setEditIdx(-1);setModalOpen("motorista");setPlanilhaDetalheReg(null);}} style={{...css.btnOutline,padding:"7px 12px",fontSize:11,minHeight:36}}>＋ Cadastrar</button>
                  </div>
                )}

                {/* Ações */}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {canEdit && (
                    <button onClick={()=>{const idx=DADOS.findIndex(x=>x.dt===r.dt);setEditIdx(idx);setFormData({...r});setEditStep(1);setModalOpen("edit");setPlanilhaDetalheReg(null);}}
                      style={{...css.btnGold,justifyContent:"center",width:"100%",padding:13,fontSize:14}}>
                      {hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,t.bg,16,2)}
                      EDITAR REGISTRO
                    </button>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <button onClick={()=>{
                      setPlanilhaDetalheReg(null);
                      const dt=r.dt; setBuscaInput(dt); setBuscaTipo("dt"); setActiveTab("busca");
                      setBuscaResult(null); setBuscaError(null); setBuscaRelacionados([]);
                      const c=dt.replace(/\D/g,"");
                      const found=DADOS.find(x=>x.dt?.replace(/\D/g,"")===c||dtBase(x.dt)?.replace(/\D/g,"")===c);
                      if(found){setBuscaResult(found);const cpfN2=found.cpf?.replace(/\D/g,""),placaN2=found.placa?.toUpperCase().replace(/\W/g,"");const rels=DADOS.filter(x=>x.dt!==found.dt&&((cpfN2&&x.cpf?.replace(/\D/g,"")===cpfN2)||(placaN2&&x.placa?.toUpperCase().replace(/\W/g,"")===placaN2))).sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;});setBuscaRelacionados(rels);const newH=[{dt:found.dt,nome:found.nome||"—"},...historico.filter(h=>h.dt!==found.dt)].slice(0,5);setHistorico(newH);saveJSON("hist",newH);}
                    }} style={{...css.btnOutline,justifyContent:"center",padding:12,fontSize:12}}>
                      {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.ouro,16,2)} VER COMPLETO
                    </button>
                    <button onClick={()=>{abrirOcorrModal(r);setPlanilhaDetalheReg(null);}}
                      style={{...css.btnDanger,justifyContent:"center",padding:12,fontSize:12}}>
                      {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,t.danger,16,2)} OCORRÊNCIAS
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ MODAL: PLANILHA CONTROLE FINANCEIRO OPERACIONAL ═══ */}
      {relCtrlDccOpen && (()=>{
        const gerarCtrlDcc = () => {
          if(!relCtrlDccFrom||!relCtrlDccTo){showToast("⚠️ Selecione o período","warn");return;}
          const [fyy,fmm,fdd] = relCtrlDccFrom.split("-").map(Number);
          const [tyy,tmm,tdd] = relCtrlDccTo.split("-").map(Number);
          const dFrom = new Date(fyy,fmm-1,fdd);
          const dTo   = new Date(tyy,tmm-1,tdd,23,59,59);
          const parseDataBr = s => {
            if(!s) return null;
            if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(Number(p[2]),Number(p[1])-1,Number(p[0]));}
            if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));}
            return null;
          };
          const linhas = [];
          DADOS.forEach(reg=>{
            // Usa data_carr OU data_desc como referência do período
            const dataRef = reg.data_carr || reg.data_desc || "";
            const dtRef = parseDataBr(dataRef);
            if(!dtRef) return;
            if(dtRef<dFrom||dtRef>dTo) return;
            // Apontamento vinculado pela DT
            const apont = apontItems.find(a=>a.dt_rel===reg.dt)||null;
            // DCC minutas
            const dccs = pj(reg.minutas_dcc,[]);
            const dcc0 = dccs[0]||{};
            const dcc1 = dccs[1]||{};
            // CTE Complementares
            const cteCompObj = pj(reg.minutas_cte_comp,{});
            linhas.push({
              dt:           reg.dt||"",
              motorista:    reg.nome||"",
              cpf:          reg.cpf||"",
              placa:        reg.placa||"",
              status:       reg.status||"",
              data_carr:    reg.data_carr||"",
              data_desc:    reg.data_desc||"",
              origem:       reg.origem||"",
              destino:      reg.destino||"",
              cliente:      reg.cliente||"",
              vl_cte:       reg.vl_cte||"",
              vl_contrato:  reg.vl_contrato||"",
              adiant:       reg.adiant||"",
              saldo:        reg.saldo||"",
              diaria_prev:  reg.diaria_prev||"",
              diaria_pg:    reg.diaria_pg||"",
              data_manifesto: reg.data_manifesto||"",
              cte:          reg.cte||"",
              mdf:          reg.mdf||"",
              mat:          reg.mat||"",
              nf:           reg.nf||"",
              ro:           reg.ro||"",
              chegada:      reg.chegada||"",
              gerenc:       reg.gerenc||"",
              sgs:          reg.sgs||"",
              // CTE Complementares
              cte_comp:     cteCompObj.cte||"",
              mdf_comp:     cteCompObj.mdf||"",
              mat_comp:     cteCompObj.mat||"",
              // DCC D01-MAT (primeira minuta)
              dcc0_tipo:    dcc0.tipo||"",
              dcc0_cte:     dcc0.cte||"",
              dcc0_mdf:     dcc0.mdf||"",
              dcc0_num:     dcc0.num||"",
              dcc0_valor:   dcc0.valor||"",
              // DCC D05-MAR (segunda minuta)
              dcc1_tipo:    dcc1.tipo||"",
              dcc1_cte:     dcc1.cte||"",
              dcc1_mdf:     dcc1.mdf||"",
              dcc1_num:     dcc1.num||"",
              dcc1_valor:   dcc1.valor||"",
              // Apontamento vinculado
              apont_num:    apont?.numero||"",
              apont_frs:    apont?.frs_folha||"",
              apont_mes:    apont?.mes_ref||"",
              apont_filial: apont?.filial||"",
              apont_valor:  apont?.valor||"",
            });
          });
          if(linhas.length===0){showToast("Nenhum registro no período selecionado","warn");return;}
          const cols = [
            // Identificação
            {k:"dt",          l:"DT"},
            {k:"motorista",   l:"Motorista"},
            {k:"cpf",         l:"CPF"},
            {k:"placa",       l:"Placa"},
            {k:"status",      l:"Status"},
            // Datas e rota
            {k:"data_carr",   l:"Carregamento"},
            {k:"data_desc",   l:"Descarga"},
            {k:"origem",      l:"Origem"},
            {k:"destino",     l:"Destino"},
            {k:"cliente",     l:"Cliente"},
            // Financeiro
            {k:"vl_cte",      l:"Valor CTE (Empresa)"},
            {k:"vl_contrato", l:"Valor Motorista"},
            {k:"adiant",      l:"Adiantamento"},
            {k:"saldo",       l:"Saldo"},
            {k:"diaria_prev", l:"Diária Devida (R$)"},
            {k:"diaria_pg",   l:"Diária Paga (R$)"},
            // Documentação
            {k:"data_manifesto",l:"Data Manifesto"},
            {k:"cte",         l:"CTE"},
            {k:"mdf",         l:"MDF"},
            {k:"mat",         l:"MAT / Contrato"},
            {k:"nf",          l:"NF"},
            {k:"ro",          l:"RO"},
            {k:"chegada",     l:"Chegada no Cliente"},
            {k:"obs_chegada", l:"OBS Chegada"},
            {k:"obs_descarga",l:"OBS Descarga"},
            {k:"gerenc",      l:"Gerenciadora"},
            {k:"sgs",         l:"SGS"},
            // CTE Complementares
            {k:"cte_comp",    l:"CTE Comp."},
            {k:"mdf_comp",    l:"MDF Comp."},
            {k:"mat_comp",    l:"MAT Comp."},
            // DCC D01-MAT
            {k:"dcc0_tipo",   l:"DCC#1 Tipo"},
            {k:"dcc0_cte",    l:"DCC#1 CTE"},
            {k:"dcc0_mdf",    l:"DCC#1 MDF"},
            {k:"dcc0_num",    l:"DCC#1 Nº"},
            {k:"dcc0_valor",  l:"DCC#1 Valor"},
            // DCC D05-MAR
            {k:"dcc1_tipo",   l:"DCC#2 Tipo"},
            {k:"dcc1_cte",    l:"DCC#2 CTE"},
            {k:"dcc1_mdf",    l:"DCC#2 MDF"},
            {k:"dcc1_num",    l:"DCC#2 Nº"},
            {k:"dcc1_valor",  l:"DCC#2 Valor"},
            // Apontamento
            {k:"apont_num",   l:"Apontamento Nº"},
            {k:"apont_frs",   l:"FRS · Folha"},
            {k:"apont_mes",   l:"Mês Ref."},
            {k:"apont_filial",l:"Filial"},
            {k:"apont_valor", l:"Valor Apont."},
          ];
          const per = `${relCtrlDccFrom}_${relCtrlDccTo}`;
          exportODS(linhas, cols, `controle-financeiro-${per}`);
          showToast(`✅ Planilha gerada — ${linhas.length} registro(s)`,"ok");
          setRelCtrlDccOpen(false);
        };
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setRelCtrlDccOpen(false)}>
            <div style={{background:t.card,borderRadius:16,padding:20,width:"100%",maxWidth:440,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(22,119,255,.12)",border:"1.5px solid rgba(22,119,255,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {hIco(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></>,t.azulLt,20,1.8)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:t.txt}}>Planilha Controle Financeiro</div>
                  <div style={{fontSize:10,color:t.azulLt,fontWeight:600}}>Todos os dados operacionais do período</div>
                </div>
                <button onClick={()=>setRelCtrlDccOpen(false)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                  {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
                </button>
              </div>
              <div style={{fontSize:10,color:t.txt2,marginBottom:14,background:t.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${t.borda}`,lineHeight:1.7}}>
                Exporta <strong style={{color:t.txt}}>todos os registros</strong> do período com todos os campos operacionais: DT, Motorista, CPF, Placa, Status, Datas, Origem/Destino, Cliente, <strong style={{color:t.verde}}>Financeiro</strong> (CTE, Contrato, ADT, Saldo, Diárias), Documentação (CTE, MDF, MAT, NF, RO), <strong style={{color:t.azulLt}}>CTE Comp.</strong>, DCC e Apontamentos vinculados.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:4}}>De (início)</label>
                  <input type="date" value={relCtrlDccFrom} onChange={e=>setRelCtrlDccFrom(e.target.value)} style={{width:"100%",background:t.bg,border:`1.5px solid ${t.borda2}`,borderRadius:8,padding:"9px 10px",color:t.txt,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:4}}>Até (fim)</label>
                  <input type="date" value={relCtrlDccTo} onChange={e=>setRelCtrlDccTo(e.target.value)} style={{width:"100%",background:t.bg,border:`1.5px solid ${t.borda2}`,borderRadius:8,padding:"9px 10px",color:t.txt,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}} />
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setRelCtrlDccOpen(false)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 16px",color:t.txt2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
                <button onClick={gerarCtrlDcc} style={{flex:1,background:`linear-gradient(135deg,rgba(22,119,255,.2),rgba(22,119,255,.1))`,border:`1.5px solid rgba(22,119,255,.5)`,borderRadius:9,padding:"10px",color:t.azulLt,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {hIco(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,t.azulLt,15,2)} Gerar Planilha .XLS
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ MODAL NFD — Nota de Devolução ═══ */}
      {nfdAlertOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setNfdAlertOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:20,width:"100%",maxWidth:400,border:`1.5px solid rgba(246,70,93,.35)`,boxShadow:"0 24px 64px rgba(0,0,0,.6)"}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:42,height:42,borderRadius:11,background:"rgba(246,70,93,.12)",border:"1.5px solid rgba(246,70,93,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,t.danger,20,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:t.txt,letterSpacing:.3}}>NFD — Nota de Devolução</div>
                <div style={{fontSize:10,color:t.danger,fontWeight:600}}>Descarga registrada · Houve NFD?</div>
              </div>
              <button onClick={()=>setNfdAlertOpen(false)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            <div style={{fontSize:10,color:t.txt2,marginBottom:14,background:t.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${t.borda}`,lineHeight:1.7}}>
              Ao registrar a data de descarga, informe se houve <strong style={{color:t.txt}}>Nota de Devolução (NFD)</strong> por avaria, falta ou devolução de mercadoria.
            </div>
            {/* Tipo */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,marginBottom:6}}>Motivo da NFD</div>
              <div style={{display:"flex",gap:6}}>
                {["avaria","falta","devolução"].map(op=>(
                  <button key={op} onClick={()=>setNfdForm(p=>({...p,tipo:op}))} style={{flex:1,padding:"8px 4px",borderRadius:9,border:`1.5px solid ${nfdForm.tipo===op?t.danger:t.borda}`,background:nfdForm.tipo===op?`rgba(246,70,93,.1)`:`transparent`,color:nfdForm.tipo===op?t.danger:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:10,textTransform:"uppercase",letterSpacing:.5,transition:"all .15s"}}>
                    {op==="avaria"?"🔴":op==="falta"?"🟡":"🔵"} {op}
                  </button>
                ))}
              </div>
            </div>
            {/* Numero e Valor */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              <div>
                <input value={nfdForm.numero} onChange={e=>setNfdForm(p=>({...p,numero:e.target.value}))} placeholder="Ex: 00123456" style={{...css.inp,fontSize:12,padding:"9px 10px"}} />
              </div>
              <div>
                <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:4}}>Valor (R$)</label>
                <input value={nfdForm.valor} onChange={e=>setNfdForm(p=>({...p,valor:e.target.value}))} placeholder="0,00" style={{...css.inp,fontSize:12,padding:"9px 10px"}} />
              </div>
            </div>
            {/* Ações */}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setNfdAlertOpen(false)} style={{flex:1,background:`rgba(128,128,128,.08)`,border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px",color:t.txt2,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                Não houve NFD
              </button>
              <button onClick={()=>{
                if(!nfdForm.numero){showToast("⚠️ Informe o número da NFD","warn");return;}
                setFormData(p=>({...p,nfd:{...nfdForm}}));
                showToast(`✅ NFD registrada — ${nfdForm.tipo.toUpperCase()} · Nº ${nfdForm.numero}`,"ok");
                setNfdAlertOpen(false);
              }} style={{flex:1,background:`linear-gradient(135deg,rgba(246,70,93,.2),rgba(246,70,93,.1))`,border:`1.5px solid rgba(246,70,93,.5)`,borderRadius:9,padding:"10px",color:t.danger,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                {hIco(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,t.danger,14,2)} Registrar NFD
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══ ALERTA OCORRÊNCIA/RO — CHEGADA DO MOTORISTA ═══ */}
      {ocorrChegadaAlert && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setOcorrChegadaAlert(false)}>
          <div style={{background:t.card,borderRadius:DESIGN.r.modal,padding:20,width:"100%",maxWidth:420,border:`1.5px solid rgba(232,130,12,.35)`,boxShadow:"0 24px 64px rgba(0,0,0,.6)"}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:42,height:42,borderRadius:DESIGN.r.ico,background:"rgba(232,130,12,.12)",border:"1.5px solid rgba(232,130,12,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,"#E8820C",20,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:t.txt,letterSpacing:.3}}>Motorista Chegou ao Cliente</div>
                <div style={{fontSize:10,color:"#E8820C",fontWeight:600}}>Ocorrência/RO — registrar agora?</div>
              </div>
              <button onClick={()=>setOcorrChegadaAlert(false)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            <div style={{fontSize:10,color:t.txt2,marginBottom:14,background:t.bg,borderRadius:DESIGN.r.sm,padding:"8px 12px",border:`1px solid ${t.borda}`,lineHeight:1.7}}>
              A <strong style={{color:t.txt}}>Ocorrência (RO)</strong> é inerente à existência de NFD e deve ser registrada a partir da chegada do motorista ao cliente. Se houver RO, preencha o número abaixo.
            </div>
            {/* Campo RO */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:5}}>Nº RO (Registro de Ocorrência)</label>
              <input
                value={formData.ro||""}
                onChange={e=>setFormData(p=>({...p,ro:e.target.value}))}
                placeholder="Ex: RO-2024-001 ou deixe vazio se não houver"
                style={{...css.inp,fontSize:12,padding:"10px 12px"}}
                autoFocus
              />
            </div>
            {/* Ações */}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setOcorrChegadaAlert(false)} style={{flex:1,background:`rgba(128,128,128,.08)`,border:`1.5px solid ${t.borda}`,borderRadius:DESIGN.r.inp,padding:"10px",color:t.txt2,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:DESIGN.fnt.b}}>
                Sem Ocorrência
              </button>
              <button onClick={()=>{
                setOcorrChegadaAlert(false);
                if(formData.ro) showToast(`✅ RO registrado: ${formData.ro}`,"ok");
              }} style={{flex:1,background:`linear-gradient(135deg,rgba(232,130,12,.2),rgba(232,130,12,.1))`,border:`1.5px solid rgba(232,130,12,.5)`,borderRadius:DESIGN.r.inp,padding:"10px",color:"#E8820C",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:DESIGN.fnt.b,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                {hIco(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,"#E8820C",14,2)} Confirmar RO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MINI-MODAL OCORRÊNCIAS (Busca / Planilha) ═══ */}
      {ocorrModalDT && (()=>{
        const tc = {info:t.azulLt, alerta:t.danger, status:t.verde};
        const tic = {info:"💬", alerta:"🚨", status:"✅"};
        const visibles = ocorrModalExpanded ? ocorrModalList : ocorrModalList.slice(0,3);
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setOcorrModalDT(null)}>
            <div style={{background:t.card,borderRadius:16,padding:20,width:"100%",maxWidth:480,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:14}} onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(232,130,12,.12)",border:"1.5px solid rgba(232,130,12,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>📌</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:t.txt,letterSpacing:.3}}>Ocorrências</div>
                  <div style={{fontSize:10,color:"#E8820C",fontWeight:700,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>{ocorrModalDT.dt} · {ocorrModalDT.nome||"—"}</div>
                </div>
                {ocorrModalLoading && <span style={{fontSize:10,color:t.txt2}}>carregando…</span>}
                <button onClick={()=>setOcorrModalDT(null)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",fontSize:18,lineHeight:1,padding:4}}>✕</button>
              </div>

              {/* Lista */}
              <div>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"#E8820C",fontWeight:700,marginBottom:8}}>Histórico</div>
                {ocorrModalList.length === 0 ? (
                  <div style={{fontSize:11,color:t.txt2,textAlign:"center",padding:"14px 0",borderRadius:8,border:`1px dashed ${t.borda}`}}>Nenhuma ocorrência registrada.</div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {visibles.map((o,oi)=>(
                      <div key={oi} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                          <div style={{width:24,height:24,borderRadius:"50%",background:`${tc[o.tipo]||t.azulLt}18`,border:`1.5px solid ${tc[o.tipo]||t.azulLt}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{tic[o.tipo]||"💬"}</div>
                          {oi < visibles.length-1 && <div style={{width:1,flex:1,minHeight:10,background:t.borda,margin:"2px 0"}} />}
                        </div>
                        <div style={{flex:1,background:t.card2,borderRadius:8,padding:"8px 10px",border:`1px solid ${t.borda}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:3}}>
                            <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:tc[o.tipo]||t.azulLt}}>{o.tipo||"info"}</span>
                            <span style={{fontSize:8,color:t.txt2,whiteSpace:"nowrap"}}>{o.usuario||"—"} · {new Date(o.data_hora).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span>
                          </div>
                          <div style={{fontSize:12,color:t.txt,lineHeight:1.5}}>{o.texto}</div>
                        </div>
                      </div>
                    ))}
                    {ocorrModalList.length > 3 && (
                      <button onClick={()=>setOcorrModalExpanded(v=>!v)} style={{fontSize:11,color:"#E8820C",background:"transparent",border:"none",cursor:"pointer",padding:"4px 0",textAlign:"center",fontFamily:"inherit",fontWeight:700}}>
                        {ocorrModalExpanded ? "▲ Ver menos" : `▼ Ver mais (${ocorrModalList.length - 3} ocultas)`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Adicionar nova ocorrência */}
              {(isAdmin || perms.ocorrencias) && (
                <div style={{background:t.card2,borderRadius:10,padding:12,border:`1px solid ${t.borda}`}}>
                  <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700,marginBottom:9}}>＋ Nova Ocorrência</div>
                  <div style={{display:"flex",gap:6,marginBottom:9}}>
                    {[{k:"info",l:"Chegada",svg:<><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4M12 16h.01"/></>,c:tc.info},{k:"status",l:"Descarga",svg:<><polyline points="20 6 9 17 4 12"/></>,c:tc.status},{k:"alerta",l:"Alerta",svg:<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/></>,c:tc.alerta}].map(tp=>{
                      const ativo=ocorrModalTipo===tp.k;
                      return (
                        <button key={tp.k} onClick={()=>setOcorrModalTipo(tp.k)} style={{flex:1,background:ativo?`${tp.c}14`:"transparent",border:`1.5px solid ${ativo?tp.c:t.borda}`,borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"10px 4px 8px",position:"relative",transition:"all .18s",fontFamily:"inherit",overflow:"hidden"}}>
                          {ativo&&<span style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:22,height:2.5,borderRadius:"0 0 3px 3px",background:tp.c,boxShadow:`0 0 6px ${tp.c}88`}} />}
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={ativo?tp.c:t.txt2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{tp.svg}</svg>
                          <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",color:ativo?tp.c:t.txt2,lineHeight:1}}>{tp.l}</span>
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={ocorrModalNova}
                    onChange={e=>setOcorrModalNova(e.target.value)}
                    placeholder="Descreva a ocorrência, atualização ou observação…"
                    rows={3}
                    style={{width:"100%",borderRadius:8,border:`1px solid ${t.borda}`,background:t.bg,color:t.txt,fontSize:12,lineHeight:1.5,padding:"8px 10px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}
                  />
                  <button onClick={adicionarOcorrenciaModal} disabled={!ocorrModalNova.trim()}
                    onMouseEnter={e=>{if(ocorrModalNova.trim()){e.currentTarget.style.background="rgba(232,130,12,.25)";e.currentTarget.style.transform="translateY(-1px)";}}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(232,130,12,.12)";e.currentTarget.style.transform="none";}}
                    style={{width:"100%",marginTop:8,borderRadius:10,padding:"11px",cursor:ocorrModalNova.trim()?"pointer":"not-allowed",background:"rgba(232,130,12,.12)",border:"1.5px solid rgba(232,130,12,.4)",color:"#E8820C",fontWeight:800,fontSize:13,fontFamily:"inherit",textAlign:"center",transition:"all .15s",opacity:ocorrModalNova.trim()?1:.5}}>
                    💾 Registrar Ocorrência
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <Toast {...toast} />
    </div>
  );
}
