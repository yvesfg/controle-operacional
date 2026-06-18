import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PieController, DoughnutController, LineController, LineElement, PointElement, Filler } from "chart.js";
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PieController, DoughnutController, LineController, LineElement, PointElement, Filler);

import * as XLSX from "xlsx";
import { themes, TABLE, BASES, TABLE_USUARIOS, TABLE_CONFIG, TABLE_OCORR, TABLE_LOGS, TABLE_APOINTS,
  MESES_LABEL, PERMS_PADRAO, PERMS_LISTA, DESIGN, hexRgb,
  DEV_CHANGELOG, ENV_SUPA_URL, ENV_SUPA_KEY } from './constants.js';
import { DEFAULT_LOGO } from './defaultLogo.js';
import loginLogo from '../assets/images/logo-login.png';
import { parseData, diffDias, fmtMoeda, brToInput, inputToBr,
  brToInputDT, inputToBrDT, dtBase, esc, hashSenha, verificarSenha,
  loadJSON, saveJSON, decodeJWT, iniciarOAuth, clickable,
  validarPlaca, normalizarPlaca, normalizarTelefone, normalizarNome } from './utils.js';
import { supaFetch, supaStorageUpload } from './supabase.js';
import { validarRegistroOperacional } from './validators.js';
import { exportCSV, exportODS, exportPDF, ExportMenu,
  gerarICS, abrirGoogleCalendar } from './exportHelpers.jsx';
import Toast from './components/Toast.jsx';
import { criarMotoresRelatorio } from './relatorios/relatorioEngine.js';
import ModalMotoristaImport from './modals/ModalMotoristaImport.jsx';
import ModalMotoristasAdmin from './modals/ModalMotoristasAdmin.jsx';
import AlterarSenhaAdmin from './components/AlterarSenhaAdmin.jsx';
import ReportBuilder from './relatorios/ReportBuilderWrapper.jsx';
import OcorrenciasView from './views/OcorrenciasViewWrapper.jsx';
import OperacionalView from './views/OperacionalViewWrapper.jsx';
import PlanilhaView    from './views/PlanilhaViewWrapper.jsx';
import MotoristasView  from './views/MotoristasViewWrapper.jsx';
import DashboardView   from './views/DashboardViewWrapper.jsx';
import DiariasView     from './views/DiariasViewWrapper.jsx';
import DescargaView    from './views/DescargaViewWrapper.jsx';
import AdminView       from './views/AdminViewWrapper.jsx';
import useModalEsc      from './hooks/useModalEsc.js';
import { usePlanilhaState } from './hooks/usePlanilhaState.js';
import { useDescargaState } from './hooks/useDescargaState.js';
import { useRelatoriosState } from './hooks/useRelatoriosState.js';
import { useDashboardState } from './hooks/useDashboardState.js';
import { useDiariasState } from './hooks/useDiariasState.js';
import { useModalState } from './hooks/useModalState.js';
import { useMotoristaState } from './hooks/useMotoristaState.js';
import { useWppState } from './hooks/useWppState.js';

// ── Views exclusivas AVB — isoladas para não impactar Suzano ──
import DashboardAVB from './views/avb/DashboardAVBWrapper.jsx';
import PlanilhaAVB  from './views/avb/PlanilhaAVBWrapper.jsx';
import LogisticaAVB from './views/avb/LogisticaAVBWrapper.jsx';
import GestaoAVB    from './views/avb/GestaoAVBWrapper.jsx';
import FinanceiroView from './views/FinanceiroViewWrapper.jsx';
import _ModalEditImpl  from './modals/ModalEditWrapper.jsx';
function _renderModalEdit(p) { return React.createElement(_ModalEditImpl, p); }
import ModalMotorista  from './modals/ModalMotorista.jsx';
import ModalDetalhe    from './modals/ModalDetalhe.jsx';
import ModalUsuario    from './modals/ModalUsuario.jsx';
import ModalConfigDB   from './modals/ModalConfigDB.jsx';
import ModalWhatsApp       from './modals/ModalWhatsApp.jsx';
import ModalNFD            from './modals/ModalNFD.jsx';
import ModalRelatorios     from './modals/ModalRelatorios.jsx';
import ModalCtrlFinanceiro from './modals/ModalCtrlFinanceiro.jsx';
import ModalBusca          from './modals/ModalBusca.jsx';
import ModalDashDrill      from './modals/ModalDashDrill.jsx';
import ModalOcorrChegada   from './modals/ModalOcorrChegada.jsx';
import RelatoriosView  from './relatorios/RelatoriosViewWrapper.jsx';
import OcorrModal from './components/OcorrModal.jsx';
import AprovacaoScreen    from './screens/AprovacaoScreen.jsx';
import LoginScreen        from './screens/LoginScreen.jsx';
import HubScreen          from './screens/HubScreen.jsx';
import BaseSelectorScreen from './screens/BaseSelectorScreen.jsx';
import PrimeiroLoginScreen from './screens/PrimeiroLoginScreen.jsx';
import AppSidebar from './components/AppSidebar.jsx';


// ══════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState(() => loadJSON("co_theme","dark"));
  const t = themes[theme] || themes.dark;

  // Auth state
  const [authed, setAuthed] = useState(false);
  const [hubScreen, setHubScreen] = useState(null); // null = hub | "controle_op" = app principal
  const [perfil, setPerfil] = useState(null);
  const [perms, setPerms] = useState({});
  const [authEmail, setAuthEmail] = useState("");
  const [authSenha, setAuthSenha] = useState("");
  const [authMsg, setAuthMsg] = useState(null);
  const [primeiroLogin, setPrimeiroLogin] = useState(false);
  const [primLoginSenha, setPrimLoginSenha] = useState("");
  const [primLoginSenha2, setPrimLoginSenha2] = useState("");
  const [customLogo, setCustomLogo] = useState(() => {
    // Logo migration v1 (Apr 2026): limpa logo pre-YFGroup armazenada no localStorage
    const MK = "co_logo_migrated_v1";
    if (!loadJSON(MK, false)) {
      saveJSON("co_custom_logo", null);
      saveJSON(MK, true);
      return null;
    }
    return loadJSON("co_custom_logo", null);
  });
  const [usuarioLogado, setUsuarioLogado] = useState(null); // nome do usuário logado
  const [usuarios, setUsuarios] = useState(() => loadJSON("co_usuarios_local",[]));
  // Aprovação de acesso Google
  const [aguardandoAprovacao, setAguardandoAprovacao] = useState(false);
  const [pendingUserInfo, setPendingUserInfo] = useState(null); // {email, nome}
  const [usuariosPendentes, setUsuariosPendentes] = useState([]);
  const [aprovarModal, setAprovarModal] = useState(null); // usuário pendente a ser aprovado
  const [aprovarPerfil, setAprovarPerfil] = useState("operador");

  // ── Base operacional ──────────────────────────────────────────
  const [baseAtual, setBaseAtualState] = useState(() => {
    try { const s = localStorage.getItem("co_base_atual"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  // Session token — mantido SÓ em memória (M2/M3: nunca persiste em localStorage)
  const [sessionToken, setSessionToken] = useState(null);
  const [basesPermitidas, setBasesPermitidas] = useState([]);
  // Helper: persiste no localStorage ao mesmo tempo que seta o estado
  const setBaseAtual = (base) => {
    if (base) localStorage.setItem("co_base_atual", JSON.stringify(base));
    else localStorage.removeItem("co_base_atual");
    setBaseAtualState(base);
  };
  // Ref sempre atualizado — usado em callbacks (useCallback) sem precisar alterar dep arrays
  const tblRef = useRef(BASES.imperatriz_belem.table);
  useEffect(() => { tblRef.current = baseAtual?.table ?? BASES.imperatriz_belem.table; }, [baseAtual]);
  // Re-sincroniza ao trocar de base (ex: selecionar Maracanau após login)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (authed && baseAtual) sincronizar(); }, [baseAtual]);
  // Resetar filtros AVB ao trocar de base
  useEffect(() => {
    setPlanilhaFiltroContratante("");
    setPlanilhaFiltroGerenciadora("");
    setPlanilhaFiltroStatus("");
    setPlanilhaBusca("");
    setPlanilhaPagina(1);
  }, [baseAtual?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data state
  const [dadosBase, setDadosBase] = useState([]);
  const [dadosExtras, setDadosExtras] = useState(() => loadJSON("dados_extras",[]));
  const [motoristas, setMotoristas] = useState(() => loadJSON("co_motoristas",[]));
  const [conexoes, setConexoes] = useState(() => loadJSON("co_conexoes",[]));

  // UI state
  const [activeTab, setActiveTab] = useState("planilha");
  const {
    planilhaSortKey, setPlanilhaSortKey, planilhaSortDir, setPlanilhaSortDir,
    planilhaPagina, setPlanilhaPagina, planilhaFiltroAno, setPlanilhaFiltroAno,
    planilhaFiltroMes, setPlanilhaFiltroMes, planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
    planilhaFiltroDataDe, setPlanilhaFiltroDataDe, planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
    planilhaFiltroStatus, setPlanilhaFiltroStatus, planilhaFiltroContratante, setPlanilhaFiltroContratante,
    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora, planilhaBusca, setPlanilhaBusca,
  } = usePlanilhaState();
  const [toast, setToast] = useState({msg:"",type:"",visible:false});
  const [connStatus, setConnStatus] = useState("offline");
  const [ultimaSync, setUltimaSync] = useState(loadJSON("ultima_sync",""));

  // Search state
  const [buscaTipo, setBuscaTipo] = useState("dt");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaResult, setBuscaResult] = useState(null);
  const [buscaRelacionados, setBuscaRelacionados] = useState([]);
  const [buscaError, setBuscaError] = useState(null);
  const [buscaModalOpen, setBuscaModalOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); setBuscaModalOpen(v=>!v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [historico, setHistorico] = useState(() => loadJSON("hist",[]));

  const {
    dashMes, setDashMes, dashOrigem, setDashOrigem,
    dashChartType, setDashChartType, dashGroupBy, setDashGroupBy,
    dashDrillModal, setDashDrillModal, dashHeroTab, setDashHeroTab,
    dashRecentesN, setDashRecentesN, dashRecCardRef,
  } = useDashboardState();

  const {
    dFiltro, setDFiltro, dSubTab, setDSubTab,
    dPlanFiltroAno, setDPlanFiltroAno, dPlanFiltroMes, setDPlanFiltroMes,
    dPlanFiltroOrigem, setDPlanFiltroOrigem, dPlanFiltroIni, setDPlanFiltroIni,
    dPlanFiltroFim, setDPlanFiltroFim,
  } = useDiariasState();
  const {
    extratoRows, setExtratoRows, extratoFileName, setExtratoFileName,
    prevExtratoSnap, setPrevExtratoSnap, extratoSheetInfo, setExtratoSheetInfo,
    extratoFiltro, setExtratoFiltro, extratoDataIni, setExtratoDataIni, extratoDataFim, setExtratoDataFim,
    dscTab, setDscTab, dscFiltroAno, setDscFiltroAno, dscFiltroMes, setDscFiltroMes,
    dscFiltroOrigem, setDscFiltroOrigem, dscFiltroIni, setDscFiltroIni, dscFiltroFim, setDscFiltroFim,
    dscData, setDscData,
    rodorricaRows, setRodorricaRows, rodorricaFileName, setRodorricaFileName,
    prevRodorricaSnap, setPrevRodorricaSnap, rodorricaSheetInfo, setRodorricaSheetInfo,
    rodorricaFiltro, setRodorricaFiltro, rodorricaPeriodoIni, setRodorricaPeriodoIni,
    rodorricaPeriodoFim, setRodorricaPeriodoFim, rodorricaPeriodoModal, setRodorricaPeriodoModal,
  } = useDescargaState();

  // View mode state (linhas | blocos) + colunas para Diarias e Descarga
  const [diariaView, setDiariaView] = useState(() => loadJSON("co_diaria_view","blocos"));
  const [diariaCols, setDiariaCols] = useState(() => {
    // Migration: padroniza diariaCols para 3 (Abr 2026)
    const MK = "co_diaria_cols_migv3";
    if (!loadJSON(MK, false)) {
      saveJSON("co_diaria_cols", 3);
      saveJSON(MK, true);
      return 3;
    }
    return loadJSON("co_diaria_cols", 3);
  });
  const [descargaView, setDescargaView] = useState(() => loadJSON("co_descarga_view","blocos"));
  const [descargaCols, setDescargaCols] = useState(() => loadJSON("co_descarga_cols", 2));
  const [diariaNavDT, setDiariaNavDT] = useState(null);    // DT destacada ao navegar do modal
  const [descargaNavDT, setDescargaNavDT] = useState(null); // DT destacada ao navegar do modal

  const {
    modalOpen, setModalOpen, editIdx, setEditIdx, editStep, setEditStep,
    formData, setFormData, excluirConfirm, setExcluirConfirm, excluirTexto, setExcluirTexto,
    detalheDT, setDetalheDT, ocorrencias, setOcorrencias,
    novaOcorr, setNovaOcorr, novaOcorrTipo, setNovaOcorrTipo,
    ocorrLoading, setOcorrLoading, ocorrListExpanded, setOcorrListExpanded,
    ocorrModalOpen, setOcorrModalOpen, ocorrModalDT, setOcorrModalDT, ocorrModalRecord, setOcorrModalRecord,
    ocorrModalList, setOcorrModalList, ocorrModalLoading, setOcorrModalLoading,
    ocorrModalExpanded, setOcorrModalExpanded, ocorrModalNova, setOcorrModalNova, ocorrModalTipo, setOcorrModalTipo,
    detalheMinDcc, setDetalheMinDcc, detalheCteComp, setDetalheCteComp,
    detalheMinDsc, setDetalheMinDsc, salvandoMins, setSalvandoMins, detalheTemDcc, setDetalheTemDcc,
    detalheSecDcc, setDetalheSecDcc, detalheSecCteComp, setDetalheSecCteComp, detalheSecMinDsc, setDetalheSecMinDsc,
    nfdAlertOpen, setNfdAlertOpen, nfdForm, setNfdForm, nfdFotos, setNfdFotos,
    nfdUploadando, setNfdUploadando, nfdRegistrarOutra, setNfdRegistrarOutra, ocorrChegadaAlert, setOcorrChegadaAlert,
    acompDias, setAcompDias, acompDiaSel, setAcompDiaSel, acompTexto, setAcompTexto, acompImagens, setAcompImagens,
  } = useModalState();

  // Alerts
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [baseMenuOpen, setBaseMenuOpen] = useState(false);
  const [conexoesOpen, setConexoesOpen] = useState(false);
  const [contatosAdminOpen, setContatosAdminOpen] = useState(false);
  const [gsheetsOpen, setGsheetsOpen] = useState(false);
  const [oauthAccessOpen, setOauthAccessOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);       // último status gravado pelo Apps Script
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [adminEmailVal, setAdminEmailVal] = useState(()=>loadJSON("co_admin_email","yvesfg@gmail.com"));
  const [isMobile, setIsMobile] = useState(()=>window.innerWidth<=600);
  const [isWide,   setIsWide]   = useState(()=>window.innerWidth>=768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(()=>loadJSON("co_sidebar_collapsed", window.innerWidth>=768&&window.innerWidth<1200));
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);
  useEffect(()=>{
    const fn=()=>{setIsMobile(window.innerWidth<=600);setIsWide(window.innerWidth>=768);};
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  useEffect(()=>{ saveJSON("co_sidebar_collapsed", sidebarCollapsed); },[sidebarCollapsed]);



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

  const {
    wppModal, setWppModal, wppTel, setWppTel, wppPgto, setWppPgto,
    wppValCheque, setWppValCheque, wppValConta, setWppValConta, wppObs, setWppObs,
    wppModal2, setWppModal2, wpp2Ro, setWpp2Ro, wpp2Obs, setWpp2Obs,
    wpp2IncluirObs, setWpp2IncluirObs, wpp2Conflitos, setWpp2Conflitos,
    wppTipoOpen, setWppTipoOpen, wppSearchTxt, setWppSearchTxt, wppSearchReg, setWppSearchReg,
    wppFatModal, setWppFatModal, wppPagModal, setWppPagModal, wppConfirmModal, setWppConfirmModal,
    wppFortes, setWppFortes, wppDccMinutas, setWppDccMinutas, wppCteComp, setWppCteComp,
    wppDscMinutas, setWppDscMinutas,
  } = useWppState();

  const {
    motBusca, setMotBusca,
    motImportOpen, setMotImportOpen, motImportData, setMotImportData,
    motImportConfirm, setMotImportConfirm, motImportStep, setMotImportStep,
    motSugestOpen, setMotSugestOpen, motSugestData, setMotSugestData,
    motSelecionados, setMotSelecionados, motExcluirLoteTexto, setMotExcluirLoteTexto,
    motExcluirLoteOpen, setMotExcluirLoteOpen, motExcluirTodosOpen, setMotExcluirTodosOpen,
    motExcluirTodosTexto, setMotExcluirTodosTexto, motPagina, setMotPagina,
    motImportPrefOpen, setMotImportPrefOpen, motImportRaw, setMotImportRaw,
    motImportPrefSel, setMotImportPrefSel, motImportPrefBusca, setMotImportPrefBusca,
    motDupSugest, setMotDupSugest,
  } = useMotoristaState();

  // wppModal2 state — via useWppState (above)

  // Dashboard state — via useDashboardState (above)

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

  // wppTipoOpen/wppDccMinutas state — via useWppState (above)
  // SGS: retornos interativos
  const [expandedSgsId, setExpandedSgsId] = useState(null);
  const [sgsRetornoForm, setSgsRetornoForm] = useState({data:"",descricao:""});
  const {
    relGeralOpen, setRelGeralOpen, reportBuilderOpen, setReportBuilderOpen,
    relGeralFrom, setRelGeralFrom, relGeralTo, setRelGeralTo,
    relGeralMotorista, setRelGeralMotorista, relGeralStatus, setRelGeralStatus,
    relGeralOrigem, setRelGeralOrigem, relGeralDestino, setRelGeralDestino,
    relGeralVinculo, setRelGeralVinculo, relGeralSecoes, setRelGeralSecoes,
    relGeralLoading, setRelGeralLoading, relGeralStatusOper, setRelGeralStatusOper,
    relMenuOpen, setRelMenuOpen, relOperOpen, setRelOperOpen,
    relOperFrom, setRelOperFrom, relOperTo, setRelOperTo, relOperSecoes, setRelOperSecoes,
    relDiariaOpen, setRelDiariaOpen, relDiariaFrom, setRelDiariaFrom, relDiariaTo, setRelDiariaTo,
    relDiariaMotorista, setRelDiariaMotorista, relDiariaVinculo, setRelDiariaVinculo, relDiariaStatus, setRelDiariaStatus,
    relDescargaOpen, setRelDescargaOpen, relCtrlDccOpen, setRelCtrlDccOpen,
    relCtrlDccFrom, setRelCtrlDccFrom, relCtrlDccTo, setRelCtrlDccTo,
    auditReport, setAuditReport,
    relDescargaFrom, setRelDescargaFrom, relDescargaTo, setRelDescargaTo,
    relDescargaMotorista, setRelDescargaMotorista, relDescargaStatus, setRelDescargaStatus,
  } = useRelatoriosState();

  // ── ESC fecha o modal aberto (global) ──
  const fecharTopoModal = () => {
    if (usuarioEmailPreview) return setUsuarioEmailPreview(null);
    if (motImportPrefOpen) return setMotImportPrefOpen(false);
    if (wppPagModal) return setWppPagModal(null);
    if (wppFatModal) return setWppFatModal(null);
    if (wppModal2) return setWppModal2(null);
    if (wppModal) return setWppModal(null);
    if (aprovarModal) return setAprovarModal(null);
    if (rodorricaPeriodoModal) return setRodorricaPeriodoModal(false);
    if (relCtrlDccOpen) return setRelCtrlDccOpen(false);
    if (relOperOpen) return setRelOperOpen(false);
    if (relDescargaOpen) return setRelDescargaOpen(false);
    if (relDiariaOpen) return setRelDiariaOpen(false);
    if (relGeralOpen) return setRelGeralOpen(false);
    if (nfdAlertOpen) return setNfdAlertOpen(false);
    if (dashDrillModal) return setDashDrillModal(null);
    if (ocorrChegadaAlert) return setOcorrChegadaAlert(false);
    if (buscaModalOpen) return setBuscaModalOpen(false);
    if (modalOpen === "detalhe") { setModalOpen(null); setDetalheDT(null); return; }
    if (modalOpen) return setModalOpen(null);
  };
  const algumModalAberto = !!(aprovarModal || rodorricaPeriodoModal || usuarioEmailPreview || motImportPrefOpen || wppPagModal || wppFatModal || wppModal2 || wppModal || relCtrlDccOpen || relOperOpen || relDescargaOpen || relDiariaOpen || relGeralOpen || nfdAlertOpen || dashDrillModal || ocorrChegadaAlert || buscaModalOpen || modalOpen);
  useModalEsc(algumModalAberto, fecharTopoModal);

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
      // ── Alertas AVB (somente base acailandia_avb) ──
      if (baseAtual?.id === "acailandia_avb") {
        const camposDatas = [r.data_carr, r.data_homerico, r.data_liberacao, r.data_manifesto];
        const dataInvalida = camposDatas.some(d => d && !/^\d{2}\/\d{2}\/\d{4}/.test(d) && !/^\d{4}-\d{2}-\d{2}/.test(d));
        if (dataInvalida) list.push({tipo:"warn",cat:"data_avb",txt:`Data inválida: ${r.contratante||r.nome} · Cód ${r.codigo||"—"}`,reg:r});
        const semDoc = !r.cte || !r.mdf || !r.nf;
        if (semDoc && (r.status||"").toUpperCase()==="CARREGADO") list.push({tipo:"info",cat:"doc_avb",txt:`Docs incompletos: ${r.contratante||r.nome} · Cód ${r.codigo||"—"}`,reg:r});
        const codZero = !r.codigo || r.codigo==="0" || r.codigo==="00" || r.codigo==="000";
        if (codZero) list.push({tipo:"info",cat:"revisao_avb",txt:`Revisão: código zerado · ${r.contratante||r.nome} · ${r.data_carr||"s/data"}`,reg:r});
        return; // alertas AVB tratados — não aplicar alertas de descarga/saldo
      }
      // ── Alertas padrão (Imperatriz/Belém / Maracanau) ──
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
  }, [DADOS, baseAtual]);

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
        const data = sessionToken
          ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_operacional",
              {p_token: sessionToken, p_base: baseAtual?.id ?? "imperatriz_belem", p_limit: limit, p_offset: offset})
              .then(r => Array.isArray(r) ? r.map(x => typeof x === "string" ? JSON.parse(x) : x) : [])
          : await supaFetch(conn.url, conn.key, "GET", `${tblRef.current}?select=*&order=id.asc&limit=${limit}&offset=${offset}`);
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
        // Restaurar bases da sessão
        if (Array.isArray(s.baseIds) && s.baseIds.length) {
          const _bs = s.baseIds.map(id => BASES[id]).filter(Boolean);
          if (_bs.length) {
            setBasesPermitidas(_bs);
            setBaseAtual(_bs.length === 1 ? _bs[0] : null);
          }
        } else if (s.perfil === "admin") {
          setBasesPermitidas(Object.values(BASES)); // sessao antiga sem baseIds: admin ve todas
        }
        setHubScreen("controle_op");
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

  // Quando activeTab="busca" (chamado em DiariasView), abre modal e volta para planilha
  useEffect(() => {
    if (activeTab === "busca") {
      setBuscaModalOpen(true);
      setActiveTab("planilha");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  // Identidade visual AVB — aplica data-base="avb" exclusivamente para Açailândia
  useEffect(() => {
    if (baseAtual?.id === "acailandia_avb") {
      document.documentElement.setAttribute('data-base', 'avb');
    } else {
      document.documentElement.removeAttribute('data-base');
    }
  }, [baseAtual]);

  // ResizeObserver: calcula quantas linhas cabem em Registros Recentes sem cortar
  useEffect(() => {
    if (!dashRecCardRef.current) return;
    const ROW_H = 40;
    const OVERHEAD = 46 + 28; // header (label+margin) + padding card
    const obs = new ResizeObserver(() => {
      const h = dashRecCardRef.current?.clientHeight || 0;
      if (!h) return;
      const n = Math.max(3, Math.floor((h - OVERHEAD) / ROW_H));
      setDashRecentesN(n);
    });
    obs.observe(dashRecCardRef.current);
    return () => obs.disconnect();
  }, [authed]);

  // ── Callback OAuth: detecta retorno do Google/Apple e loga automaticamente ──
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    if (!accessToken) return;

    // Limpa hash da URL (evita reprocessar no reload)
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

    // Guardar tokens Supabase Auth para SSO no hub (sessionStorage: morre com a aba)
    const refreshTokenOAuth = params.get("refresh_token") || "";
    try { sessionStorage.setItem("co_supa_tokens", JSON.stringify({ access_token: accessToken, refresh_token: refreshTokenOAuth })); } catch {}

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
      saveJSON("co_sessao", {perfil:p, nome:nomeOAuth, ts:Date.now()});
      showToast(`✅ Login social realizado — bem-vindo, ${nomeOAuth}!`, "ok");
      // Admin OAuth: acesso a todas as bases
      const _todasOAdm = Object.values(BASES);
      setBasesPermitidas(_todasOAdm);
      setBaseAtual(_todasOAdm.length === 1 ? _todasOAdm[0] : null);
      return;
    }

    // Busca usuário no Supabase via RPC (senha nunca trafega para o cliente)
    if (ENV_SUPA_URL && ENV_SUPA_KEY) {
      supaFetch(ENV_SUPA_URL, ENV_SUPA_KEY, "POST",
        `rpc/buscar_usuario_por_email`,
        {p_email: payload.email})
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
            saveJSON("co_sessao", {perfil:p, nome:u.nome||u.email, ts:Date.now(), baseIds: (Array.isArray(u.bases_permitidas) ? u.bases_permitidas : (typeof u.bases_permitidas === "string" ? JSON.parse(u.bases_permitidas || '["imperatriz_belem"]') : ["imperatriz_belem"]))});
            showToast(`✅ Login social realizado — bem-vindo, ${u.nome||u.email}!`, "ok");
            // Carregar bases permitidas do usuario OAuth
            const _idsOAuth = Array.isArray(u.bases_permitidas) ? u.bases_permitidas
              : (typeof u.bases_permitidas === "string" ? JSON.parse(u.bases_permitidas || '["imperatriz_belem"]') : ["imperatriz_belem"]);
            const _basesOAuth = _idsOAuth.map(id => BASES[id]).filter(Boolean);
            const _permitidasOAuth = _basesOAuth.length ? _basesOAuth : [BASES.imperatriz_belem];
            setBasesPermitidas(_permitidasOAuth);
            setBaseAtual(_permitidasOAuth.length === 1 ? _permitidasOAuth[0] : null);
            // Gera session token server-side para proteger escritas (M2/M3)
            if (ENV_SUPA_URL && ENV_SUPA_KEY) {
              supaFetch(ENV_SUPA_URL, ENV_SUPA_KEY, "POST", "rpc/gerar_token_sessao", {p_email: u.email})
                .then(tok => { if (typeof tok === "string") setSessionToken(tok); })
                .catch(() => {});
            }
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
        const raw5 = sessionToken
          ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_ocorrencias",
              {p_token: sessionToken, p_dt: reg.dt})
          : await supaFetch(conn.url, conn.key, "GET",
              `${TABLE_OCORR}?dt=eq.${encodeURIComponent(reg.dt)}&order=data_hora.asc&select=*`);
        const data = Array.isArray(raw5) ? raw5.map(x => typeof x === "string" ? JSON.parse(x) : x) : [];
        if (Array.isArray(data)) {
          setOcorrencias(data);
          saveJSON(`co_ocorr_${reg.dt}`, data);
        }
      } catch { /* usa local */ }
      finally { setOcorrLoading(false); }
    }
  }, [getConexao]);

  const adicionarOcorrencia = useCallback(async ({dt, tipo, texto, nfs, localizacao}) => {
    if (!texto || !texto.trim() || !dt) return;
    const nova = {
      dt,
      data_hora: new Date().toISOString(),
      texto: texto.trim(),
      tipo: tipo || "info",
      usuario: usuarioLogado || perfil || "sistema",
      ...(nfs ? { nfs } : {}),
      ...(localizacao ? { localizacao } : {}),
    };
    // Se for o DT aberto no modal de detalhe, atualiza a lista local
    if (detalheDT && detalheDT.dt === dt) {
      const updated = [...ocorrencias, nova];
      setOcorrencias(updated);
      saveJSON(`co_ocorr_${dt}`, updated);
    } else {
      const existing = loadJSON(`co_ocorr_${dt}`, []);
      saveJSON(`co_ocorr_${dt}`, [...existing, nova]);
    }
    // Salvar no Supabase
    const conn = getConexao();
    if (conn) {
      try {
        await supaFetch(conn.url, conn.key, "POST", TABLE_OCORR, [nova]);
      } catch { /* silencioso */ }
    }
    showToast("✅ Ocorrência registrada","ok");
  }, [detalheDT, ocorrencias, getConexao, usuarioLogado, perfil, showToast]);
  // Salvar ocorrencia a partir de modal externo (OcorrenciasView)
  const salvarOcorrenciaExterna = useCallback(async (dt, tipo, texto, nfs, localizacao) => {
    if (!dt || !texto.trim()) return;
    const nova = {
      dt,
      data_hora: new Date().toISOString(),
      texto: texto.trim(),
      tipo,
      usuario: usuarioLogado || perfil || "sistema",
    };
    const existing = loadJSON(`co_ocorr_${dt}`, []);
    const updated = [...existing, nova];
    saveJSON(`co_ocorr_${dt}`, updated);
    const conn = getConexao();
    if (conn) {
      try { await supaFetch(conn.url, conn.key, "POST", TABLE_OCORR, [nova]); }
      catch { /* silencioso */ }
    }
    showToast("\u2705 Ocorr\u00eancia registrada", "ok");
  }, [getConexao, usuarioLogado, perfil, showToast]);

  // Abre OcorrModal para nova ocorrência
  const abrirOcorrModal = (dt, record=null) => {
    setOcorrModalDT(dt);
    setOcorrModalRecord(record || DADOS.find(d=>d.dt===dt) || null);
    setOcorrModalOpen(true);
  };

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
        saveJSON("co_sessao",{perfil:p,nome:"Admin",ts:Date.now(),baseIds:Object.keys(BASES)});
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
      saveJSON("co_sessao",{perfil:p,nome:found.nome||found.email,ts:Date.now(),baseIds:_idsUsr,perms:PERMS_PADRAO[p]||{}});
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
      // AVB: mesma cadeia de fallback do parseYM da Planilha (carr -> homerico -> manifesto -> lib)
      const dc = baseAtual?.id === "acailandia_avb"
        ? (r.data_carr || r.data_homerico || r.data_manifesto || "")
        : (r.data_carr || "");
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
    // AVB: origens dinâmicas (qualquer cidade presente nos dados)
    // Imperatriz/Belém: origens fixas para o filtro do dashboard
    const ORIGENS_PERMITIDAS = [
      { norm: "BELEM",      label: "BELEM-PA" },
      { norm: "IMPERATRIZ", label: "IMPERATRIZ-MA" },
    ];
    // Filtra cidades pelo mês selecionado — mês seletor como origem dos filtros disponíveis
    const mesRegs = dashMes === "todos" ? DADOS : (grupos[dashMes]?.regs || []);
    const cidades = baseAtual?.id === "acailandia_avb"
      ? [...new Set(mesRegs.map(r => normOrigem(r.origem)).filter(Boolean))]
      : ORIGENS_PERMITIDAS.filter(o => mesRegs.some(r => normOrigem(r.origem) === o.norm)).map(o => o.norm);

    // Aplica filtros: mês + cidade origem
    let filtrado = dashMes==="todos" ? DADOS : (grupos[dashMes]?.regs||[]);
    if (dashOrigem !== "todos") filtrado = filtrado.filter(r => normOrigem(r.origem) === dashOrigem);

    const dtsU = new Set(filtrado.map(r=>dtBase(r.dt)));
    let cteT = 0; filtrado.forEach(r=>{ const v=parseFloat(r.vl_cte); if(!isNaN(v)) cteT+=v; });
    // ── Financeiro AVB — excluir PENDENTES das somas ──
    let avbContratoT=0, avbAdtT=0, avbSaldoT=0;
    if (baseAtual?.id === "acailandia_avb") {
      filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE").forEach(r=>{
        const vc=parseFloat(String(r.vl_contrato||"").replace(/[R$\s.]/g,"").replace(",","."));
        const va=parseFloat(String(r.adiant||"").replace(/[R$\s.]/g,"").replace(",","."));
        const vs=parseFloat(String(r.saldo||"").replace(/[R$\s.]/g,"").replace(",","."));
        if(!isNaN(vc)) avbContratoT+=vc;
        if(!isNaN(va)) avbAdtT+=va;
        if(!isNaN(vs)) avbSaldoT+=vs;
      });
    }
    return { grupos, meses, filtrado, dtsU, cteT, cidades, normOrigem, avbContratoT, avbAdtT, avbSaldoT };
  }, [DADOS, dashMes, dashOrigem, baseAtual]);

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
      } else if (!da && dd) {
        // Sem data_agenda válida (ex: "OC") mas com data_desc preenchida → finalizado
        tipo = "ok";
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

  // Conferencia Extrato de Diarias
  const extratoResultado = useMemo(() => {
    if (!extratoRows.length) return null;
    // Filtrar registros do app pelo periodo do extrato
    const ini = extratoDataIni ? new Date(extratoDataIni + 'T00:00:00') : null;
    const fim = extratoDataFim ? new Date(extratoDataFim + 'T23:59:59') : null;
    const inRange = r => {
      if (!ini && !fim) return true;
      const d = parseData(r.data_agenda) || parseData(r.data_carr) || parseData(r.data_desc);
      if (!d) return false;
      if (ini && d < ini) return false;
      if (fim && d > fim) return false;
      return true;
    };
    const dadosMap = new Map(DADOS.filter(inRange).map(r => [String(r.dt||'').trim(), r]));
    const extratoDTs = new Set(extratoRows.map(e => String(e.dt||'').trim()));
    const linhas = extratoRows.map(e => {
      const dtKey = String(e.dt||'').trim();
      const appReg = dadosMap.get(dtKey);
      const valorExtrato = Number(e.valorTotal) || 0;
      const semCusto = e.statusFinal === 'Sem custo contabilizado/aprovado';
      if (!appReg) return {...e, conf:'NAO_ENCONTRADA'};
      const valorApp = Number(appReg.diaria_prev) || 0;
      if (semCusto) {
        return valorApp > 0
          ? {...e, conf:'SEM_CUSTO_DIVERGE', appReg, valorApp}
          : {...e, conf:'SEM_CUSTO_OK', appReg, valorApp};
      }
      const diff = valorExtrato - valorApp;
      return Math.abs(diff) < 1
        ? {...e, conf:'BATE', appReg, diff:0, valorApp}
        : {...e, conf:'DIVERGE', appReg, diff, valorApp};
    });
    const foraExtrato = DADOS
      .filter(r => inRange(r) && (Number(r.diaria_prev)||0) > 0 && !extratoDTs.has(String(r.dt||'').trim()))
      .map(r => ({dt:r.dt, nome:r.nome, placa:r.placa, ro:r.ro||'', qtd:0,
        valorUnitario:0, valorTotal:0, statusFinal:'fora', cliente:'', conf:'FORA_EXTRATO',
        appReg:r, valorApp:Number(r.diaria_prev)||0, diff:Number(r.diaria_prev)||0}));
    const todos = [...linhas, ...foraExtrato];
    const tot = c => todos.filter(x => x.conf === c).length;
    return {
      linhas: todos,
      totais: {
        bate: tot('BATE'), diverge: tot('DIVERGE'),
        semCustoOk: tot('SEM_CUSTO_OK'), semCustoDiverge: tot('SEM_CUSTO_DIVERGE'),
        naoEncontrada: tot('NAO_ENCONTRADA'), foraExtrato: tot('FORA_EXTRATO'),
        valorEmRisco: todos.filter(x => ['DIVERGE','SEM_CUSTO_DIVERGE'].includes(x.conf))
          .reduce((s, x) => s + Math.abs(x.diff || 0), 0),
        totalPreAprovado: extratoRows.filter(e => e.statusFinal === 'Pré-aprovado')
          .reduce((s, e) => s + (Number(e.valorTotal)||0), 0),
      },
    };
  }, [extratoRows, DADOS, extratoDataIni, extratoDataFim]);

  // Descarga data
  // Regra: somente registros com status CARREGADO
  // (Diárias usam filtro mais restrito: somente CARREGADO)
  const descargaData = useMemo(() => {
    const dataBusca = new Date(dscData+"T00:00:00");
    const SOMENTE_CARREGADO = (r) => (r.status||"").toUpperCase().trim() === "CARREGADO"
    // Descarga real = data_desc tem valor que parseData consegue interpretar como data
    // Valores como "AG" (Aguardando) sao ignorados — tratados como vazio
    const temDescReal = r => !!parseData(r.data_desc);
    // Hoje: data_agenda = dscData E sem data descarga real
    const hoje = DADOS.filter(r => {
      if (!SOMENTE_CARREGADO(r)) return false;
      if (temDescReal(r)) return false;
      const da = parseData(r.data_agenda);
      return da && da.toISOString().slice(0,10) === dscData;
    });
    const atrasados = DADOS.filter(r => {
      if (!SOMENTE_CARREGADO(r)) return false;
      const da = parseData(r.data_agenda);
      if (!da || da >= dataBusca) return false;
      return !temDescReal(r);
    }).sort((a,b) => {
      const da = parseData(a.data_agenda), db = parseData(b.data_agenda);
      return da && db ? da-db : 0;
    });
    // Aguardando: chegada preenchida, chegada <= data_agenda, sem data descarga real
    const aguardando = DADOS.filter(r => {
      if (!SOMENTE_CARREGADO(r)) return false;
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
    const carregaHoje = DADOS.filter(r => {
      const dc = parseData(r.data_carr);
      return dc && dc.toISOString().slice(0,10) === dscData;
    });
    const _excluidos = new Set(['CANCELADA','NÃO ACEITE','NAO ACEITE','NO-SHOW','NOSHOW','ENTREGUE']);
    const semMotorista = DADOS.filter(r => {
      const s = (r.status||'').toUpperCase().trim();
      if(_excluidos.has(s)) return false;
      return !(r.nome||'').trim();
    });
    return { hoje, atrasados, aguardando, carregaHoje, semMotorista };
  }, [DADOS, dscData]);

  // Conferência Planilha RODORRICA — comparação por DT vs DADOS (col AP=pag_descarga, AQ=pag_stretch)
  const rodorricaResultado = useMemo(() => {
    if (!rodorricaRows.length) return null;
    // Agrupar planilha por DT (DT CARREGAMENTO = número da DT, ex: 22593705)
    const planMap = {};
    rodorricaRows.forEach(row => {
      const dt = String(row.dt || '').trim();
      if (!dt) return;
      if (!planMap[dt]) planMap[dt] = { dt, nf:row.nf||'', descarga:0, stretch:0, linhas:[], dtCarregamento:row.dtCarregamento||'', cliente:row.cliente||'', mesAno:row.mesAno||'' };
      const tipo = String(row.tipo || '').toUpperCase();
      const val = Number(row.valorAprovado) || 0;
      if (tipo === 'DESCARGA') planMap[dt].descarga += val;
      else if (tipo === 'STRECH' || tipo === 'STRETCH') planMap[dt].stretch += val;
      planMap[dt].linhas.push(row);
    });
    // Mapa DADOS por DT → para lookup rápido de pag_descarga e pag_stretch (colunas AP e AQ do Google Sheets)
    const dadosMap = {};
    DADOS.forEach(r => {
      const dt = String(r.dt || '').trim();
      if (dt) dadosMap[dt] = r;
    });
    // Quantos DTs do DADOS têm pag_descarga preenchido (indica se sync já foi feito com novos campos)
    const syncOk = DADOS.some(r => r.pag_descarga && String(r.pag_descarga).trim() !== '');
    const _numVal = v => {
      if (!v && v !== 0) return 0;
      return parseFloat(String(v).replace(',', '.')) || 0;
    };
    // Classificação por tipo
    const _conf = (plan, app, temDados) => {
      if (!temDados) return 'SEM_DADOS';
      if (!syncOk) return 'SEM_SYNC';
      if (plan === 0 && app === 0) return 'INEXISTENTE';
      if (app === 0 && plan > 0) return 'SEM_APP';
      if (Math.abs(plan - app) < 0.5) return 'BATE';
      return plan > app ? 'MAIOR' : 'MENOR';
    };
    const planDTs = new Set(Object.keys(planMap));
    const linhas = Object.values(planMap).map(p => {
      const dadosRow = dadosMap[p.dt];
      const temDados = !!dadosRow;
      const appDesc = temDados ? _numVal(dadosRow.pag_descarga) : 0;
      const appStr  = temDados ? _numVal(dadosRow.pag_stretch)  : 0;
      const totalPlan  = p.descarga + p.stretch;
      const totalApp   = appDesc + appStr;
      const diffDesc = p.descarga - appDesc;
      const diffStr  = p.stretch  - appStr;
      const confDesc = _conf(p.descarga, appDesc, temDados);
      const confStr  = _conf(p.stretch,  appStr,  temDados);
      let conf;
      if (!temDados) conf = 'SEM_DADOS';
      else if (!syncOk) conf = 'SEM_SYNC';
      else if (confDesc === 'BATE' && confStr === 'BATE') conf = 'BATE';
      else if (confDesc === 'MAIOR' || confStr === 'MAIOR') conf = 'MAIOR';
      else if (confDesc === 'MENOR' || confStr === 'MENOR') conf = 'MENOR';
      else if (confDesc === 'SEM_APP' || confStr === 'SEM_APP') conf = 'SEM_APP';
      else conf = 'INEXISTENTE';
      const semStrech  = p.descarga > 0 && p.stretch === 0;
      const semDescarga = p.stretch > 0 && p.descarga === 0;
      const clienteApp = dadosRow?.cliente || dadosRow?.nome || p.cliente || '';
      return { ...p, cliente: clienteApp || p.cliente, conf, confDesc, confStr, totalPlan, totalApp, diffDesc, diffStr, appDesc, appStr, semStrech, semDescarga, temDados };
    });
    // DTs no DADOS com pagamento descarga/stretch mas ausentes na planilha Rodorrica
    const foraPlanilha = syncOk ? DADOS
      .filter(r => {
        const dt = String(r.dt||'').trim();
        if (!dt || planDTs.has(dt)) return false;
        const pd = _numVal(r.pag_descarga); const ps = _numVal(r.pag_stretch);
        return pd > 0 || ps > 0;
      })
      .map(r => {
        const dt = String(r.dt).trim();
        const appDesc = _numVal(r.pag_descarga); const appStr = _numVal(r.pag_stretch);
        const totalApp = appDesc + appStr;
        return { dt, nf:r.nf||'', descarga:0, stretch:0, linhas:[], dtCarregamento:'', cliente:r.cliente||r.nome||'', mesAno:'',
          conf:'FORA_PLAN', confDesc:'FORA_PLAN', confStr:'FORA_PLAN',
          totalPlan:0, totalApp, diffDesc:-appDesc, diffStr:-appStr,
          appDesc, appStr, semStrech:false, semDescarga:false, temDados:true };
      }) : [];
    const todos = [...linhas, ...foraPlanilha];
    const tot = c => todos.filter(x => x.conf === c).length;
    return {
      syncOk,
      linhas: todos,
      totais: {
        bate: tot('BATE'), maior: tot('MAIOR'), menor: tot('MENOR'),
        semApp: tot('SEM_APP'), foraPlan: tot('FORA_PLAN'),
        semDados: tot('SEM_DADOS'), semSync: tot('SEM_SYNC'),
        semStrech: todos.filter(x=>x.semStrech).length,
        semDescarga: todos.filter(x=>x.semDescarga).length,
        valorEmRisco: todos.filter(x=>['MAIOR','MENOR'].includes(x.conf)).reduce((s,x)=>s+Math.abs((x.diffDesc||0)+(x.diffStr||0)),0),
        totalPlanilha: todos.reduce((s,x)=>s+(x.totalPlan||0),0),
        totalApp: todos.reduce((s,x)=>s+(x.totalApp||0),0),
      },
    };
  }, [rodorricaRows, DADOS]);

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
    setTimeout(() => {
    if (chartAreaRef.current) {
      const areaLabels = meses.map(m=>{const p=m.split("/"); return MESES_LABEL[+p[0]-1]+"/"+p[1].slice(2);});
      const areaData = dashHeroTab === "cte"
        ? meses.map(m=>Math.round(grupos[m].cte))
        : meses.map(m=>grupos[m].regs.length);
      chartInstances.current.a = new Chart(chartAreaRef.current, {
        type:"line",
        data:{labels:areaLabels,datasets:[{data:areaData,borderColor:"#a855f7",borderWidth:2.5,pointRadius:0,pointHoverRadius:5,pointHoverBackgroundColor:"#a855f7",tension:.4,fill:true,
          backgroundColor:(ctx)=>{
            const c=ctx.chart.ctx, h=ctx.chart.height||200;
            const g=c.createLinearGradient(0,0,0,h);
            g.addColorStop(0,isDark?"rgba(168,85,247,.30)":"rgba(168,85,247,.45)"); g.addColorStop(1,"rgba(168,85,247,0)");
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
    }, 0);

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
    "cte","mdf","nf","mat","ro","ro_hora","ro_status","cliente","sgs",
    "chegada","obs_chegada","data_obs_chegada","desc_aguardando","data_desc","obs_descarga","data_obs_descarga","informou_analista","data_manifesto","gerenc","forms","updated_at",
    "data_criacao","minutas_dcc","cte_comp","mdf_comp","mat_comp",
    "obs","sinistro","ocorrencias",
    // ── Campos exclusivos AVB (acailandia_avb) ──
    "codigo","data_homerico","data_liberacao","gerenciadora",
    "rdo","contrato_mat","cadastro_fortes","cte_comp_num","cte_comp_vlr",
    "contratante"
  ];
  const supaUpsert = async (reg) => {
    const conn = getConexao();
    if (!conn) throw new Error("Sem conexão");
    if (!sessionToken) throw new Error("Sessão não autenticada");
    const clean = {...reg}; delete clean._override; delete clean._overrideDT;
    for (const k of Object.keys(clean)) { if (clean[k] === "") clean[k] = null; }
    // AVB: âncora = codigo (coluna H); grava via upsert por codigo. Sem dt obrigatório.
    if (baseAtual?.id === "acailandia_avb") {
      await supaFetch(conn.url, conn.key, "POST", "rpc/upsert_operacional_cod", {
        p_token: sessionToken,
        p_base:  baseAtual.id,
        p_dados: clean,
      });
      return;
    }
    if (!clean.dt) throw new Error("DT obrigatório");
    const { ok: validOk, erros: validErros } = validarRegistroOperacional(clean);
    if (!validOk) throw new Error("Dados inválidos: " + validErros.join("; "));
    // M2/M3: escrita via RPC que valida token + base no servidor
    await supaFetch(conn.url, conn.key, "POST", "rpc/upsert_operacional", {
      p_token: sessionToken,
      p_base:  baseAtual?.id ?? "imperatriz_belem",
      p_dados: clean,
    });
  };

  // Save record
  const salvarRegistro = async () => {
    const reg = {...formData};

    // ── AVB: âncora = codigo. Sem código pode subir como avulso, com alerta. ──
    if (baseAtual?.id === "acailandia_avb") {
      if (!reg.codigo) {
        const ok = window.confirm("\u26a0\ufe0f Este registro nao tem CODIGO (coluna H).\n\nSalvar assim mesmo como CARREGAMENTO AVULSO?\n(Recomendado definir um codigo para evitar duplicidade.)");
        if (!ok) return;
      }
      if (editIdx >= 0 && reg.codigo) {
        setDadosBase(prev => prev.map(r => r.codigo === reg.codigo ? {...r, ...reg} : r));
      } else {
        if (!reg.data_criacao) reg.data_criacao = new Date().toISOString();
        setDadosBase(prev => [...prev, reg]);
      }
      const connAvb = getConexao();
      if (connAvb) {
        try {
          await supaUpsert(reg);
          await registrarLog(editIdx>=0 ? "EDITAR_REGISTRO" : "NOVO_REGISTRO", `COD ${reg.codigo||"(avulso)"} — ${reg.nome||"sem nome"}`, editIdx>=0 ? DADOS[editIdx] : null, reg);
          showToast("✅ Salvo e sincronizado!","ok");
        } catch(e) { showToast("⚠️ Salvo local. Sync: "+e.message,"warn"); }
      } else { showToast("✅ Salvo localmente!","ok"); }
      setModalOpen(null);
      return;
    }

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
        saveJSON("dados_extras", filtered.map(({cpf:_c1,...r})=>r));
      } else {
        newExtras[editIdx - dadosBase.length] = reg;
        setDadosExtras(newExtras);
        saveJSON("dados_extras", newExtras.map(({cpf:_c2,...r})=>r));
      }
    } else {
      // Novo registro: registra data/hora de criação
      if (!reg.data_criacao) reg.data_criacao = new Date().toISOString();
      newExtras.push(reg);
      setDadosExtras(newExtras);
      saveJSON("dados_extras", newExtras.map(({cpf:_c3,...r})=>r));
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
    saveJSON("dados_extras", newExtras.map(({cpf:_c4,...r})=>r));
    setDadosBase(prev => prev.filter(r => r.dt !== dt));
    const conn = getConexao();
    if (conn) {
      try {
        // M2/M3: deleção via RPC que valida token + base no servidor
        await supaFetch(conn.url, conn.key, "POST", "rpc/delete_operacional", {
          p_token: sessionToken,
          p_base:  baseAtual?.id ?? "imperatriz_belem",
          p_dt:    dt,
        });
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
      // M2/M3: patch via RPC que valida token + base no servidor
      await supaFetch(conn.url, conn.key, "POST", "rpc/patch_operacional", {
        p_token: sessionToken,
        p_base:  baseAtual?.id ?? "imperatriz_belem",
        p_dt:    detalheDT.dt,
        p_dados: payload,
      });
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
    hBtn:      { background:"transparent", border:`1.5px solid ${t.borda2}`, borderRadius:DESIGN.r.sm, padding:"7px 9px", color:t.txt2, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:500, transition:"all .15s" },
    tabBar:    { display:"flex", background:t.headerBg, borderBottom:`1px solid ${t.borda}`, overflow:"visible", padding:"0 12px", gap:2, scrollbarWidth:"none", transition:"background .25s", justifyContent:"space-between" },
    tab:       (a) => ({ flex:"0 0 auto", padding:"13px 16px", fontSize:10, fontWeight:a?700:500, letterSpacing:.5, textTransform:"uppercase", color:a?t.ouro:t.txt2, border:"none", background:"transparent", cursor:"pointer", borderRadius:0, whiteSpace:"nowrap", transition:"all .15s", borderBottom:a?`2px solid ${t.ouro}`:"2px solid transparent", marginBottom:"-1px", display:"flex", alignItems:"center", gap:5 }),
    card:      { background:t.card, borderRadius:DESIGN.r.card, border:`1px solid ${t.borda}`, overflow:"hidden", transition:"all .2s, background .25s, border-color .25s" },
    cardKanban:(c) => ({ background:t.card, borderRadius:DESIGN.r.card, border:`1px solid ${t.borda}`, borderTop:`3px solid ${c}`, overflow:"visible", transition:"all .2s, background .25s" }),
    // KPI com borda superior (acento premium, sem side-stripe)
    kpi:       (c) => ({ background:t.card, borderRadius:DESIGN.r.card, padding:"20px 16px", border:`1px solid ${t.borda}`, borderTop:`3px solid ${c}`, textAlign:"center", cursor:"default", transition:"all .2s, background .25s" }),
    // tile-card colorido — grade WPP, ações em grade
    btnCard:   (c) => ({ background:t.card, borderRadius:DESIGN.r.tile, padding:"14px 10px", border:`1px solid ${t.borda}`, borderTop:`2px solid ${c}`, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6, color:c, fontWeight:700, fontSize:12, fontFamily:DESIGN.fnt.b, cursor:"pointer", transition:"all .15s", lineHeight:1.3 }),
    // Inputs — borda mais definida, sem efeito de blur
    inp:       { background:t.inputBg, border:`1px solid ${t.borda2}`, borderRadius:DESIGN.r.inp, padding:"11px 13px", color:t.txt, fontSize:13, outline:"none", width:"100%", fontFamily:DESIGN.fnt.b, transition:"border-color .15s, background .25s" },
    // Botões — cor sólida (sem gradiente), mais limpos
    // cor do texto adapta ao tema: dark=preto sobre ouro claro / light=branco sobre ouro escuro
    btnGold:   { border:"none", borderRadius:DESIGN.r.btn, padding:"11px 20px", color:t.onPrimary, fontWeight:700, fontSize:13, letterSpacing:DESIGN.ls.btn, cursor:"pointer", background:t.ouro, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnGreen:  { border:"none", borderRadius:DESIGN.r.btn, padding:"11px 20px", color:"#fff", fontWeight:700, fontSize:13, letterSpacing:DESIGN.ls.btn, cursor:"pointer", background:t.verde, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnOutline:{ borderRadius:DESIGN.r.btn, padding:"10px 18px", color:t.ouro, fontWeight:600, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${hexRgb(t.ouro,.4)}`, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnDanger: { borderRadius:DESIGN.r.btn, padding:"10px 18px", color:t.danger, fontWeight:600, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${hexRgb(t.danger,.3)}`, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    secTitle:  { fontSize:11, textTransform:"uppercase", letterSpacing:DESIGN.ls.label, color:t.ouro, marginBottom:12, fontWeight:700, display:"flex", alignItems:"center", gap:8 },
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
    return <AprovacaoScreen
      t={t} css={css} theme={theme} setTheme={setTheme}
      pendingUserInfo={pendingUserInfo} setPendingUserInfo={setPendingUserInfo}
      setAguardandoAprovacao={setAguardandoAprovacao}
      setPerfil={setPerfil} setPerms={setPerms} setAuthed={setAuthed}
      setUsuarioLogado={setUsuarioLogado}
      getConexao={getConexao} showToast={showToast}
      toast={toast}
    />;
  }

  // ══════════════════════════════════════════════
  //  AUTH SCREEN
  // ══════════════════════════════════════════════
  if (!authed) {
    return <LoginScreen
      t={t} css={css} theme={theme} setTheme={setTheme}
      authEmail={authEmail} setAuthEmail={setAuthEmail}
      authSenha={authSenha} setAuthSenha={setAuthSenha}
      authMsg={authMsg}
      handleLogin={handleLogin} iniciarOAuth={iniciarOAuth}
      toast={toast}
    />;
  }

  // ── Hub: Seletor de Módulo ────────────────────────────────────
  if (authed && !hubScreen) {
    return <HubScreen
      t={t} css={css}
      onSelectControleOp={() => setHubScreen("controle_op")}
      frotaUrl={import.meta.env.VITE_FROTA_URL || "http://localhost:3000"}
      handleLogout={handleLogout}
      toast={toast}
    />;
  }
  // ── Seletor de Base Operacional ───────────────────────────────
  if (authed && hubScreen === "controle_op" && !baseAtual && basesPermitidas.length > 1) {
    return <BaseSelectorScreen
      t={t} css={css}
      basesPermitidas={basesPermitidas} setBaseAtual={setBaseAtual}
      handleLogout={handleLogout}
      toast={toast}
    />;
  }

  // ══════════════════════════════════════════════
  //  MODAL PRIMEIRO LOGIN (troca de senha + logo)
  // ══════════════════════════════════════════════
  if (primeiroLogin) {
    return <PrimeiroLoginScreen
      t={t} css={css}
      primLoginSenha={primLoginSenha} setPrimLoginSenha={setPrimLoginSenha}
      primLoginSenha2={primLoginSenha2} setPrimLoginSenha2={setPrimLoginSenha2}
      customLogo={customLogo} setCustomLogo={setCustomLogo}
      handlePrimeiroLoginSalvar={handlePrimeiroLoginSalvar}
      toast={toast}
    />;
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
  function parseExtratoXLSX(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, {type:'array'});
        const sheetRead = wb.SheetNames[0];
        const othersSheets = wb.SheetNames.slice(1);
        setExtratoSheetInfo({ read: sheetRead, others: othersSheets });
        const ws = wb.Sheets[sheetRead];
        const json = XLSX.utils.sheet_to_json(ws, {header:0, defval:''});
        const rows = json.map(r => ({
          ro: String(r['Numero RO']||'').trim(),
          dt: String(r['Numero DT']||'').trim(),
          nf: String(r['Nota Fiscal']||'').trim(),
          cliente: String(r['Cliente']||'').trim(),
          cidade: String(r['Cidade']||'').trim(),
          estado: String(r['Estado']||'').trim(),
          qtd: Number(r['Quantidade de diária'])||0,
          tipoVeiculo: String(r['Tp Veiculo']||'').trim(),
          valorUnitario: Number(r['Valor da diaria'])||0,
          valorTotal: Number(r['Valor total Pré-aprovado'])||0,
          statusFinal: String(r['Status Final']||'').trim(),
          tipo: String(r['Tipo']||'').trim(),
          obs: String(r['Observações']||'').trim(),
        })).filter(r => r.dt && r.dt !== 'undefined' && r.dt !== 'NaN' && r.dt !== '');
        // Auto-detectar periodo do extrato
        const datas = rows
          .map(r => r.dataEntrega)
          .filter(d => d && !isNaN(new Date(d)))
          .map(d => new Date(d));
        if (datas.length) {
          const minD = new Date(Math.min(...datas));
          const maxD = new Date(Math.max(...datas));
          const fmt = d => d.toISOString().slice(0,10);
          setExtratoDataIni(fmt(minD));
          setExtratoDataFim(fmt(maxD));
        }
        if (extratoRows.length > 0 || extratoFileName) {
          setPrevExtratoSnap({ rows: extratoRows, fileName: extratoFileName });
        }
        setExtratoRows(rows);
        setExtratoFileName(file.name);
        setExtratoFiltro('todos');
        showToast(rows.length + ' registros carregados', 'ok');
      } catch(err) {
        showToast('Erro ao ler arquivo: ' + err.message, 'err');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function parseRodorricaXLSX(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type:'array', cellDates:true });
        const targetName = wb.SheetNames.find(n => n === 'Aprovados') || wb.SheetNames.find(n => n === 'BASE') || wb.SheetNames[0];
        const othersRodo = wb.SheetNames.filter(n => n !== targetName);
        setRodorricaSheetInfo({ read: targetName, others: othersRodo });
        const ws = wb.Sheets[targetName];
        const json = XLSX.utils.sheet_to_json(ws, { header:0, defval:'', raw:false });
        const _xlsxDate = v => {
          if (!v) return '';
          if (v instanceof Date) return v.toISOString().split('T')[0];
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
          return String(v);
        };
        const rows = json.map(r => ({
          dt:            String(r['DT CARREGAMENTO']||'').replace(/\u00a0/g,'').trim(),
          nf:            String(r['NF CARREGAMENTO']||'').replace(/\u00a0/g,'').trim(),
          transportadora:String(r['TRANSPORTADORA']||'').trim(),
          tipo:          String(r['TIPO DO CUSTO']||'').trim().toUpperCase(),
          valorAprovado: parseFloat(String(r['VALOR APROVADO']||'').replace(',','.')) || 0,
          valorFinal:    parseFloat(String(r['VALOR FINAL']||'').replace(',','.')) || 0,
          dtCarregamento:_xlsxDate(r['DATA DE FATURAMENTO']||r['DT CARREGAMENTO']||''),
          mesAno:        String(r['MÊS/ANO']||r['MES/ANO']||'').trim(),
          cliente:       String(r['NOME CLIENTE']||'').trim(),
          centro:        String(r['Centro']||r['CENTRO']||'').trim(),
          qtFardos:      parseFloat(r['QT FARDOS'])||0,
          rsFardo:       parseFloat(r['R$/FARDO'])||0,
          rsStrech:      parseFloat(r['R$/STRECH'])||0,
          af:            String(r['AF']||'').trim(),
          status:        String(r['Status']||'').trim(),
          pagoOTM:       parseFloat(r['Pago OTM'])||0,
        })).filter(r => r.dt && r.dt.length > 0 && r.dt !== 'undefined' && /^\d{6,}$/.test(r.dt));
        if (rodorricaRows.length > 0 || rodorricaFileName) {
          setPrevRodorricaSnap({ rows: rodorricaRows, fileName: rodorricaFileName });
        }
        setRodorricaRows(rows);
        setRodorricaFileName(file.name);
        setRodorricaFiltro('todos');
        setRodorricaPeriodoModal(true);
        showToast(rows.length + ' registros RODORRICA carregados', 'ok');
      } catch(err) {
        showToast('Erro ao ler arquivo: ' + err.message, 'err');
      }
    };
    reader.readAsArrayBuffer(file);
  }

    const tabs = [
    {k:"busca", l:"Buscar",
      ico:(a)=>svgIco(a,<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>)},
    {k:"dashboard", l:"Dashboard", perm:"dashboard",
      ico:(a)=>svgIco(a,<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>)},
    {k:"financeiro", l:"Financeiro", perm:"financeiro",
      ico:(a)=>svgIco(a,<><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="4" width="3" height="13"/></>)},
    {k:"planilha", l:"Planilha", perm:"planilha",
      ico:(a)=>svgIco(a,<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></>)},
    {k:"diarias", l:"Diárias", perm:"diarias",
      ico:(a)=>svgIco(a,<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>)},
    {k:"descarga", l:"Carga/Descarga", perm:"descarga",
      ico:(a)=>svgIco(a,<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04M12 22V12"/></>)},
    {k:"ocorrencias", l:"Ocorrências",
      ico:(a)=>svgIco(a,<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>)},
    {k:"operacional", l:"Operac.", hideAvb:true,
      ico:(a)=>svgIco(a,<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>)},
    {k:"gestao", l:"Gestão", avbOnly:true,
      ico:(a)=>svgIco(a,<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></>)},
    {k:"motoristas", l:"Motori.",
      ico:(a)=>svgIco(a,<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>)},
    {k:"relatorios", l:"Relatórios",
      ico:(a)=>svgIco(a,<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>)},
  ].filter(tb => !tb.perm || perms[tb.perm] !== false)
    .filter(tb => !(tb.k === "diarias" && baseAtual?.noDiarias))
    .filter(tb => !tb.avbOnly || baseAtual?.id === "acailandia_avb")
    .filter(tb => !tb.hideAvb || baseAtual?.id !== "acailandia_avb");

  // RELATÓRIOS PDF — via criarMotoresRelatorio (src/relatorios/relatorioEngine.js)
  const { relHtmlBase, gerarRelatorioGeral, gerarRelatorioDiarias, gerarRelatorioDescargas, gerarRelatorioOperacional } =
    criarMotoresRelatorio({ customLogo, DADOS, motoristas, baseAtual });

  // Classe do co-main muda conforme largura + collapse state
  const coMainCls = `co-main${isWide?(sidebarCollapsed?" co-main--collapsed":""):""}${!isWide?" co-main--mobile":""}`;

  return (
    <div style={css.app} className="co-app-wrap">

      {/* ════════════════════════════════════════════
          SIDEBAR — sempre visível; icons no mobile, expand ao clicar
      ════════════════════════════════════════════ */}
      <AppSidebar
        t={t}
        isWide={isWide} mobileSidebarExpanded={mobileSidebarExpanded} setMobileSidebarExpanded={setMobileSidebarExpanded}
        sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
        hIco={hIco}
        tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}
        setWppTipoOpen={setWppTipoOpen}
        theme={theme} setTheme={setTheme}
        isAdmin={isAdmin} setModalOpen={setModalOpen}
        usuarioLogado={usuarioLogado} perfil={perfil}
        handleLogout={handleLogout}
      />

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
      <div className="co-topbar">
        {isWide ? (
          /* ── Desktop topbar: título da aba + status + alertas ── */
          <>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div className="co-topbar__title">
                {tabs.find(tb=>tb.k===activeTab)?.l||"Dashboard"}
              </div>
              <span className={`co-status-badge co-status-badge--${connStatus}`}>
                {connStatus==="online"?"Online":connStatus==="syncing"?"Sincronizando":"Offline"}
              </span>
              {baseAtual && (
                <div style={{position:"relative"}}>
                  <button title={basesPermitidas.length>1?"Trocar base":undefined} onClick={()=>{ if(basesPermitidas.length>1) setBaseMenuOpen(o=>!o); }}
                    style={{fontSize:9,fontFamily:"var(--font-mono)",color:t.ouro,letterSpacing:".08em",textTransform:"uppercase",padding:"4px 9px",borderRadius:5,background:`${hexRgb(t.ouro,.08)}`,border:`1px solid ${hexRgb(t.ouro,.2)}`,cursor:basesPermitidas.length>1?"pointer":"default",display:"flex",alignItems:"center",gap:6}}>
                    ● {baseAtual.label}
                    {basesPermitidas.length>1 && <span style={{fontSize:11,marginLeft:1}}>▾</span>}
                  </button>
                  {baseMenuOpen && basesPermitidas.length>1 && (
                    <>
                      <div onClick={()=>setBaseMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:100}}/>
                      <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,minWidth:210,background:t.card,border:`1px solid ${t.borda}`,borderRadius:10,boxShadow:`0 12px 32px ${t.shadow||"rgba(0,0,0,.4)"}`,zIndex:101,overflow:"hidden"}}>
                        <div style={{fontSize:9,fontFamily:"var(--font-mono)",color:t.txt2,textTransform:"uppercase",letterSpacing:".08em",padding:"9px 12px 6px"}}>Trocar base</div>
                        {basesPermitidas.map(b=>(
                          <button key={b.id} onClick={()=>{ setBaseAtual(b); setBaseMenuOpen(false); }}
                            style={{width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:b.id===baseAtual.id?hexRgb(t.ouro,.10):"transparent",border:"none",borderTop:`1px solid ${t.borda}`,color:t.txt,fontSize:12,cursor:"pointer"}}
                            onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.16)}
                            onMouseLeave={e=>e.currentTarget.style.background=b.id===baseAtual.id?hexRgb(t.ouro,.10):"transparent"}>
                            <span style={{width:7,height:7,borderRadius:"50%",background:b.id===baseAtual.id?t.ouro:t.borda,flexShrink:0}}/>
                            <span style={{flex:1}}>{b.label}</span>
                            {b.id===baseAtual.id && <span style={{color:t.ouro,fontSize:12}}>✓</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="co-topbar__actions">
              {alertas.length > 0 && (
                <button onClick={()=>setAlertasOpen(!alertasOpen)} style={{...css.hBtn,background:`rgba(239,68,68,.08)`,borderColor:"rgba(239,68,68,.45)",padding:"6px 12px",display:"flex",alignItems:"center",gap:6}}>
                  {hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,14)}
                  <span style={{fontSize:11,fontWeight:700,color:t.danger,fontFamily:"var(--font-mono)"}}>{alertas.length} alerta{alertas.length>1?"s":""}</span>
                </button>
              )}
              <button onClick={()=>setBuscaModalOpen(true)} style={{...css.hBtn,padding:"6px 8px"}} title="Buscar (Ctrl+K)">
                {hIco(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>,t.txt2,15,2)}
              </button>
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
              <div style={{fontFamily:"var(--font-heading)",fontSize:15,fontWeight:700,letterSpacing:"-0.03em",color:"var(--text)",lineHeight:1}}>{tabs.find(tb=>tb.k===activeTab)?.l||"Dashboard"}</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:9,color:"var(--text3)",letterSpacing:"0.04em",textTransform:"uppercase",marginTop:2}}>CTRL OPERACIONAL</div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
              <button onClick={sincronizar} className="co-hbtn" style={{...css.hBtn,padding:"6px 7px",position:"relative"}}>
                {connStatus==="syncing"
                  ? hIco(<><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></>,t.ouro,13)
                  : hIco(<><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></>,t.txt2,13)
                }
                <span style={{position:"absolute",bottom:4,right:4,width:4,height:4,borderRadius:"50%",background:connStatus==="online"?t.verde:connStatus==="syncing"?t.ouro:t.danger}}/>
              </button>
              {alertas.length > 0 && (
                <button onClick={()=>setAlertasOpen(!alertasOpen)} style={{...css.hBtn,background:`rgba(239,68,68,.08)`,borderColor:"rgba(239,68,68,.45)",padding:"5px 9px",display:"flex",alignItems:"center",gap:4}}>
                  {hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,12)}
                  <span style={{fontSize:10,fontWeight:700,color:t.danger,fontFamily:"var(--font-mono)"}}>{alertas.length}</span>
                </button>
              )}
              <button onClick={()=>setBuscaModalOpen(true)} style={{...css.hBtn,padding:"6px 7px"}} title="Buscar (Ctrl+K)">
                {hIco(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>,t.txt2,13,2)}
              </button>
              {canEdit && (
                <button onClick={()=>{setFormData({});setEditIdx(-1);setEditStep(1);setModalOpen("edit")}} style={{...css.btnGold,padding:"7px 12px",fontSize:11,gap:5}}>
                  {hIco(<><path d="M12 5v14M5 12h14"/></>,theme==="dark"?"#000":"#fff",13,2.5)} Nova DT
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ALERTAS PANEL */}
      {alertasOpen && alertas.length > 0 && (
        <div style={{background:t.card,borderBottom:`1px solid ${t.borda}`,animation:"fadeIn .2s",position:"sticky",top:56,zIndex:89,maxHeight:"50vh",overflowY:"auto",boxShadow:`0 8px 24px ${t.shadow}`}}>
          {alertas.slice(0,10).map((a,i) => (
            <div key={i} {...clickable(()=>{ if(a.reg){ abrirDetalhe(a.reg); setAlertasOpen(false); } })} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 16px",borderBottom:`1px solid ${t.borda}`,cursor:a.reg?"pointer":"default",transition:"background .15s"}} onMouseEnter={e=>{ if(a.reg) e.currentTarget.style.background=t.card2; }} onMouseLeave={e=>{ e.currentTarget.style.background=""; }}>
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
      <div className="co-content" style={{padding:(activeTab==="planilha"||activeTab==="relatorios")?"0":"16px 16px 24px",maxWidth:"100%",margin:"0 auto",animation:"fadeIn .2s",...(activeTab==="descarga"?{display:"flex",flexDirection:"column",minHeight:"calc(100vh - 56px)"}:{})}}>

        {/* ═══ RELATÓRIOS ═══ */}
        {activeTab === "relatorios" && (
          <RelatoriosView
            dados={DADOS}
            motoristas={motoristas}
            apontItems={apontItems}
            sgsItems={sgsItems}
            t={t}
            isMobile={isMobile}
            onExportClick={()=>setReportBuilderOpen(true)}
            relGeralOpen={relGeralOpen}     setRelGeralOpen={setRelGeralOpen}
            relOperOpen={relOperOpen}       setRelOperOpen={setRelOperOpen}
            relDiariaOpen={relDiariaOpen}   setRelDiariaOpen={setRelDiariaOpen}
            relDescargaOpen={relDescargaOpen} setRelDescargaOpen={setRelDescargaOpen}
          />
        )}


        {/* ═══ DASHBOARD ═══ */}
        {activeTab === "dashboard" && (
          baseAtual?.id === "acailandia_avb"
            ? <DashboardAVB ctx={{
            dashMes, setDashMes,
            dashOrigem, setDashOrigem,
            dashHeroTab, setDashHeroTab,
            dashRecentesN, setDashRecentesN,
            dashRecCardRef,
            dashData,
            canFin,
            parseData,
            t, css, DESIGN, hexRgb, hIco, showToast,
            setActiveTab,
            chartAreaRef, chartDonutRef,
            diariasData, motoristas,
            alertas, alertasOpen, setAlertasOpen,
            fmtMoeda, isMobile,
            setDetalheDT, setModalOpen,
            descargaData,
            setPlanilhaFiltroStatus,
            setBuscaInput, setBuscaTipo, setBuscaModalOpen,
            baseAtual,
          }} />
            : <DashboardView ctx={{
            dashMes, setDashMes,
            dashOrigem, setDashOrigem,
            dashHeroTab, setDashHeroTab,
            dashRecentesN, setDashRecentesN,
            dashRecCardRef,
            dashData,
            canFin,
            parseData,
            t, css, DESIGN, hexRgb, hIco, showToast,
            setActiveTab,
            chartAreaRef, chartDonutRef,
            diariasData, motoristas,
            alertas, alertasOpen, setAlertasOpen,
            fmtMoeda, isMobile,
            setDetalheDT, setModalOpen,
            descargaData,
            setPlanilhaFiltroStatus,
            setBuscaInput, setBuscaTipo, setBuscaModalOpen,
            baseAtual,
          }} />
        )}

        {/* ═══ PLANILHA ═══ */}
        {activeTab === "planilha" && (
          baseAtual?.id === "acailandia_avb"
            ? <PlanilhaAVB ctx={{
            DADOS,
            planilhaSortKey, setPlanilhaSortKey,
            planilhaSortDir, setPlanilhaSortDir,
            planilhaPagina, setPlanilhaPagina,
            abrirDetalhe,
            planilhaFiltroAno, setPlanilhaFiltroAno,
            planilhaFiltroMes, setPlanilhaFiltroMes,
            planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
            planilhaFiltroDataDe, setPlanilhaFiltroDataDe,
            planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
            planilhaBusca, setPlanilhaBusca,
            planilhaFiltroStatus, setPlanilhaFiltroStatus,
            planilhaFiltroContratante, setPlanilhaFiltroContratante,
            planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,
            t, isMobile, ExportMenu,
            baseAtual,
          }} />
            : <PlanilhaView ctx={{
            DADOS,
            planilhaSortKey, setPlanilhaSortKey,
            planilhaSortDir, setPlanilhaSortDir,
            planilhaPagina, setPlanilhaPagina,
            abrirDetalhe,
            planilhaFiltroAno, setPlanilhaFiltroAno,
            planilhaFiltroMes, setPlanilhaFiltroMes,
            planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
            planilhaFiltroDataDe, setPlanilhaFiltroDataDe,
            planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
            planilhaBusca, setPlanilhaBusca,
            planilhaFiltroStatus, setPlanilhaFiltroStatus,
            planilhaFiltroContratante, setPlanilhaFiltroContratante,
            planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,
            t, isMobile, ExportMenu,
            baseAtual,
          }} />
        )}

        {/* ═══ DIÁRIAS ═══ */}
        <DiariasView ctx={{
          activeTab,
          diariasData,
          t, css,
          hIco, hexRgb,
          fmtMoeda,
          saveJSON, parseExtratoXLSX,
          isMobile,
          abrirDetalhe,
          setActiveTab,
          setBuscaInput, setBuscaTipo,
          diariaNavDT, setDiariaNavDT,
          diariaView, setDiariaView,
          diariaCols, setDiariaCols,
          dSubTab, setDSubTab,
          dFiltro, setDFiltro,
          dPlanFiltroAno, setDPlanFiltroAno,
          dPlanFiltroFim, setDPlanFiltroFim,
          dPlanFiltroIni, setDPlanFiltroIni,
          dPlanFiltroMes, setDPlanFiltroMes,
          dPlanFiltroOrigem, setDPlanFiltroOrigem,
          extratoDataFim, setExtratoDataFim,
          extratoDataIni, setExtratoDataIni,
          extratoFileName, setExtratoFileName,
          extratoFiltro, setExtratoFiltro,
          extratoRows, setExtratoRows,
          extratoResultado,
          prevExtratoSnap, setPrevExtratoSnap,
          extratoSheetInfo,
        }} />

        {/* ═══ DESCARGA / LOGÍSTICA ═══ */}
        {baseAtual?.id === "acailandia_avb"
          ? <LogisticaAVB ctx={{
          activeTab,
          descargaData,
          descargaNavDT, setDescargaNavDT,
          descargaCols, setDescargaCols,
          descargaView, setDescargaView,
          dscTab, setDscTab,
          dscData, setDscData,
          dscFiltroAno, setDscFiltroAno,
          dscFiltroMes, setDscFiltroMes,
          dscFiltroIni, setDscFiltroIni,
          dscFiltroFim, setDscFiltroFim,
          dscFiltroOrigem, setDscFiltroOrigem,
          rodorricaRows, setRodorricaRows,
          rodorricaFileName, setRodorricaFileName,
          rodorricaFiltro, setRodorricaFiltro,
          rodorricaPeriodoIni, setRodorricaPeriodoIni,
          rodorricaPeriodoFim, setRodorricaPeriodoFim,
          rodorricaPeriodoModal, setRodorricaPeriodoModal,
          rodorricaResultado,
          isMobile,
          hIco,
          diffDias,
          parseData,
          t, css, DESIGN,
          hexRgb,
          abrirDetalhe,
          showToast,
          parseRodorricaXLSX,
          motoristas,
          baseAtual,
          DADOS,
          prevRodorricaSnap, setPrevRodorricaSnap,
          rodorricaSheetInfo,
        }} />
          : <DescargaView ctx={{
          activeTab,
          descargaData,
          descargaNavDT, setDescargaNavDT,
          descargaCols, setDescargaCols,
          descargaView, setDescargaView,
          dscTab, setDscTab,
          dscData, setDscData,
          dscFiltroAno, setDscFiltroAno,
          dscFiltroMes, setDscFiltroMes,
          dscFiltroIni, setDscFiltroIni,
          dscFiltroFim, setDscFiltroFim,
          dscFiltroOrigem, setDscFiltroOrigem,
          rodorricaRows, setRodorricaRows,
          rodorricaFileName, setRodorricaFileName,
          rodorricaFiltro, setRodorricaFiltro,
          rodorricaPeriodoIni, setRodorricaPeriodoIni,
          rodorricaPeriodoFim, setRodorricaPeriodoFim,
          rodorricaPeriodoModal, setRodorricaPeriodoModal,
          rodorricaResultado,
          isMobile,
          hIco,
          diffDias,
          parseData,
          t, css, DESIGN,
          hexRgb,
          abrirDetalhe,
          showToast,
          parseRodorricaXLSX,
          motoristas,
          baseAtual,
          DADOS,
          prevRodorricaSnap, setPrevRodorricaSnap,
          rodorricaSheetInfo,
        }} />
        }

        {/* ═══ GESTÃO AVB ═══ */}
        {baseAtual?.id === "acailandia_avb" && (
          <GestaoAVB ctx={{
            activeTab, DADOS,
            t, css, DESIGN, hexRgb, hIco, isMobile,
            abrirDetalhe,
          }} />
        )}

        {/* ═══ FINANCEIRO (Painel + Resultado + Cobranças) ═══ */}
        {activeTab === "financeiro" && (
          <FinanceiroView ctx={{
            activeTab, baseAtual, DADOS, getConexao,
            t, css, DESIGN, isMobile, showToast, canFin,
          }} />
        )}

        {/* ═══ OPERACIONAL ═══ */}
        {activeTab === "operacional" && (
          <OperacionalView ctx={{
            operSubTab, setOperSubTab,
            sgsItems, setSgsItems,
            sgsForm, setSgsForm, sgsFormOpen, setSgsFormOpen,
            expandedSgsId, setExpandedSgsId,
            sgsRetornoForm, setSgsRetornoForm,
            apontItems, setApontItems,
            apontForm, setApontForm, apontFormOpen, setApontFormOpen,
            apontLoading,
            relCtrlDccOpen, setRelCtrlDccOpen,
            diariasData,
            abrirDetalhe, showToast, getConexao,
            fmtMoeda, parseData, inputToBr, diffDias,
            saveJSON, supaFetch, apontToSupabase, TABLE_APOINTS,
            t, isMobile, theme, usuarioLogado, perfil,
            css, hIco,
          }} />
        )}

        {/* ═══ OCORRÊNCIAS ═══ */}
        {activeTab === "ocorrencias" && (
          <OcorrenciasView
            dados={DADOS}
            diariasData={diariasData}
            filtroOcorr={filtroOcorr}
            setFiltroOcorr={setFiltroOcorr}
            abrirDetalhe={abrirDetalhe}
            t={t}
            isMobile={isMobile}
            motoristas={motoristas}
            onSalvarOcorrencia={salvarOcorrenciaExterna}
            css={css}
          />
        )}
        {/* ═══ MOTORISTAS ═══ */}
        {activeTab === "motoristas" && (
          <MotoristasView ctx={{
            motoristas,
            motBusca, setMotBusca,
            motPagina, setMotPagina,
            motSelecionados, setMotSelecionados,
            motSugestOpen, setMotSugestOpen,
            motSugestData, setMotSugestData,
            motExcluirLoteTexto, setMotExcluirLoteTexto,
            motExcluirLoteOpen, setMotExcluirLoteOpen,
            motExcluirTodosOpen, setMotExcluirTodosOpen,
            motExcluirTodosTexto, setMotExcluirTodosTexto,
            motDupSugest, setMotDupSugest,
            relGeralOpen, setRelGeralOpen,
            DADOS, canEdit, hIco,
            gerarRelatorioMotorista, saveMotoristasLS, showToast,
            setFormData, setEditIdx, setModalOpen,
            t, css, DESIGN, perfil,
          }} />
        )}
        {/* ═══ ADMIN ═══ */}
        <AdminView ctx={{
          activeTab, isAdmin,
          DADOS, motoristas,
          t, css, DESIGN,
          hIco,
          perfil,
          showToast, registrarLog,
          usuarios, setUsuarios,
          usuariosPendentes, setUsuariosPendentes,
          aprovarModal, setAprovarModal,
          aprovarPerfil, setAprovarPerfil,
          carregarPendentes,
          adminEmailVal, setAdminEmailVal,
          syncStatus, syncStatusLoading, setSyncStatus, setSyncStatusLoading,
          ultimaSync,
          sincronizar,
          conexoes, conexoesOpen, setConexoesOpen, saveConexoesLS,
          getConfigRemoto, setConfigRemoto,
          emailTemplate, emailTemplateOpen, setEmailTemplate, setEmailTemplateOpen,
          gsheetsOpen, setGsheetsOpen,
          oauthAccessOpen, setOauthAccessOpen,
          logsOpen, setLogsOpen, logsData, logsSubTab, setLogsSubTab, carregarLogs,
          contatosAdminOpen, setContatosAdminOpen,
          auditReport, auditarDesign,
          setModalOpen,
          getConexao, supaFetch,
          connStatus,
          baseAtual, BASES,
          saveMotoristasLS,
          setMotImportPrefOpen, setMotImportPrefBusca, setMotImportPrefSel, setMotImportRaw,
          enviarEmailBoasVindas,
        }} />
      </div>

      {/* ═══ FAB — só mobile (desktop tem botão "Nova DT" no topbar) ═══ */}
      {canEdit && !isWide && (
        <div style={{position:"fixed",bottom:74,right:14,zIndex:200}}>
          <button onClick={()=>{setFormData({});setEditIdx(-1);setEditStep(1);setModalOpen("edit")}} style={{width:50,height:50,background:t.ouro,borderRadius:14,border:"none",boxShadow:"0 5px 20px rgba(240,185,11,.4)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
            <span style={{fontSize:18,color:"#000"}}>＋</span>
            <span style={{fontSize:11,fontWeight:700,color:t.txt,letterSpacing:.8,textTransform:"uppercase"}}>NOVO</span>
          </button>
        </div>
      )}

      </div>{/* end .co-main */}

      {/* ═══ REPORT BUILDER OVERLAY ═══ */}
      {reportBuilderOpen && (
        <div style={{position:"fixed",inset:0,zIndex:1200,background:t.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:`1px solid ${t.borda}`,background:t.headerBg,flexShrink:0}}>
            <button onClick={()=>setReportBuilderOpen(false)} style={{background:"rgba(128,128,128,.12)",border:`1px solid ${t.borda}`,borderRadius:8,padding:"6px 12px",color:t.txt2,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",fontWeight:600}}>
              {hIco(<><polyline points="15 18 9 12 15 6"/></>,t.txt2,14)} Voltar
            </button>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.ouro}}>RELATÓRIO PERSONALIZADO</div>
            <div style={{fontSize:10,color:t.txt2,marginLeft:2}}>Selecione campos, filtre e exporte</div>
          </div>
          <div style={{flex:1,overflow:"hidden"}}>
            <ReportBuilder dados={DADOS} motoristas={motoristas} apontItems={apontItems} sgsItems={sgsItems} t={t} DESIGN={DESIGN} isMobile={isMobile} />
          </div>
        </div>
      )}



      {/* ═══ EDIT MODAL ═══ */}
      {_renderModalEdit({ ctx: {
        formData, setFormData,
        modalOpen, setModalOpen,
        editIdx,
        excluirConfirm, setExcluirConfirm,
        excluirTexto, setExcluirTexto,
        DADOS, canFin,
        t, css, DESIGN,
        hIco,
        brToInput, brToInputDT, inputToBr, inputToBrDT,
        setNfdForm, setNfdFotos, setNfdAlertOpen,
        setOcorrChegadaAlert,
        baseAtual,
        salvarRegistro, deletarRegistro,
      } })}

      <ModalMotoristasAdmin ctx={{
        motExcluirTodosOpen, setMotExcluirTodosOpen,
        motExcluirTodosTexto, setMotExcluirTodosTexto,
        motSugestOpen, setMotSugestOpen,
        motSugestData, setMotSugestData,
        motExcluirLoteOpen, setMotExcluirLoteOpen,
        motExcluirLoteTexto, setMotExcluirLoteTexto,
        motoristas, motSelecionados, setMotSelecionados,
        DADOS, setDadosBase,
        saveMotoristasLS, registrarLog, showToast,
        t, css, hIco,
      }} />

      <ModalMotorista ctx={{
        formData, setFormData,
        modalOpen, setModalOpen,
        editIdx, setEditIdx,
        motoristas,
        t, css,
        hIco,
        showToast, saveMotoristasLS,
        motDupSugest, setMotDupSugest,
        registrarLog,
      }} />


      {modalOpen === "detalhe" && detalheDT && (
      <ModalDetalhe ctx={{
        detalheDT, setModalOpen,
        DADOS,
        t, css, DESIGN,
        hIco,
        fmtMoeda,
        showToast,
        setFormData, setEditIdx,
        ocorrencias,
        acompImagens, setAcompImagens,
        acompTexto, setAcompTexto,
        excluirConfirm, setExcluirConfirm,
        excluirTexto, setExcluirTexto,
        ocorrListExpanded, setOcorrListExpanded,
        acompDiaSel, setAcompDiaSel,
        activeTab, setActiveTab,
        detalheCteComp, setDetalheCteComp,
        detalheMinDcc, setDetalheMinDcc,
        detalheMinDsc, setDetalheMinDsc,
        detalheSecCteComp, setDetalheSecCteComp,
        detalheSecDcc, setDetalheSecDcc,
        detalheSecMinDsc, setDetalheSecMinDsc,
        detalheTemDcc, setDetalheTemDcc,
        salvandoMins, setSalvandoMins,
        isAdmin,
        theme,
        perms,
        setEditStep,
        diariasData,
        deletarRegistro,
        salvarMinutasDetalhe,
        acompDias, setAcompDias,
        usuarioLogado,
        getConexao, supaFetch,
        ocorrLoading,
        adicionarOcorrencia,
        abrirOcorrModal,
      }} />
      )}
      <ModalUsuario ctx={{
        modalOpen, setModalOpen,
        formData, setFormData,
        editIdx,
        usuarios, setUsuarios,
        usuarioEmailPreview, setUsuarioEmailPreview,
        showToast,
        registrarLog,
        getConexao,
        enviarEmailBoasVindas,
        css, t,
      }} />
      <ModalConfigDB ctx={{
        modalOpen, setModalOpen,
        t, css,
        hIco,
        showToast,
        conexoes, saveConexoesLS,
        motImportPrefOpen, setMotImportPrefOpen,
        motImportRaw,
        motImportPrefBusca, setMotImportPrefBusca,
        motImportPrefSel, setMotImportPrefSel,
        motoristas,
        setMotImportConfirm,
        setMotImportData,
        setMotImportOpen,
        setMotImportStep,
      }} />
      <ModalMotoristaImport ctx={{
        motImportOpen, setMotImportOpen,
        motImportData, setMotImportData,
        motImportConfirm, setMotImportConfirm,
        motImportStep, setMotImportStep,
        motoristas, DADOS, dadosExtras, setDadosBase,
        saveMotoristasLS, registrarLog, showToast,
        t, css,
      }} />

      <ModalWhatsApp ctx={{
        wppTipoOpen, setWppTipoOpen, wppSearchTxt, setWppSearchTxt, wppSearchReg, setWppSearchReg,
        buscaResult, wppModal, setWppModal, wppTel, setWppTel, wppPgto, setWppPgto,
        wppValCheque, setWppValCheque, wppValConta, setWppValConta, wppObs, setWppObs,
        wppModal2, setWppModal2, wpp2Ro, setWpp2Ro, wpp2Obs, setWpp2Obs, wpp2IncluirObs, setWpp2IncluirObs,
        wppFatModal, setWppFatModal, wppPagModal, setWppPagModal, wppFortes, setWppFortes,
        wppDccMinutas, setWppDccMinutas, wppCteComp, setWppCteComp, wppDscMinutas, setWppDscMinutas,
        wppConfirmModal, setWppConfirmModal, DADOS, motoristas,
        t, css, hIco, fmtMoeda, showToast, DESIGN, abrirWppPagModal,
      }} />

      {/* ═══ MODAL: DASHBOARD DRILL-DOWN ═══ */}
      <ModalDashDrill ctx={{ dashDrillModal, setDashDrillModal, t, parseData, abrirDetalhe }} />

      <ModalRelatorios ctx={{
        relGeralOpen, setRelGeralOpen, relGeralFrom, setRelGeralFrom, relGeralTo, setRelGeralTo,
        relGeralMotorista, setRelGeralMotorista, relGeralStatus, setRelGeralStatus,
        relGeralOrigem, setRelGeralOrigem, relGeralDestino, setRelGeralDestino,
        relGeralVinculo, setRelGeralVinculo, relGeralSecoes, setRelGeralSecoes,
        relGeralLoading, setRelGeralLoading, relGeralStatusOper, setRelGeralStatusOper,
        relDiariaOpen, setRelDiariaOpen, relDiariaFrom, setRelDiariaFrom, relDiariaTo, setRelDiariaTo,
        relDiariaMotorista, setRelDiariaMotorista, relDiariaVinculo, setRelDiariaVinculo, relDiariaStatus, setRelDiariaStatus,
        relDescargaOpen, setRelDescargaOpen, relDescargaFrom, setRelDescargaFrom, relDescargaTo, setRelDescargaTo,
        relDescargaMotorista, setRelDescargaMotorista, relDescargaStatus, setRelDescargaStatus,
        relOperOpen, setRelOperOpen, relOperFrom, setRelOperFrom, relOperTo, setRelOperTo, relOperSecoes, setRelOperSecoes,
        DADOS, motoristas,
        gerarRelatorioGeral, gerarRelatorioDiarias, gerarRelatorioDescargas, gerarRelatorioOperacional,
        t, hIco, css,
      }} />

      <ModalCtrlFinanceiro ctx={{
        relCtrlDccOpen, setRelCtrlDccOpen,
        relCtrlDccFrom, setRelCtrlDccFrom, relCtrlDccTo, setRelCtrlDccTo,
        DADOS, apontItems, t, hIco, fmtMoeda, showToast,
      }} />

      <ModalNFD ctx={{
        nfdAlertOpen, setNfdAlertOpen, nfdFotos, setNfdFotos,
        nfdForm, setNfdForm, nfdRegistrarOutra, setNfdRegistrarOutra,
        nfdUploadando, setNfdUploadando, formData, setFormData,
        getConexao, showToast, t, css, hIco,
      }} />
      {/* ═══ ALERTA OCORRÊNCIA/RO — CHEGADA DO MOTORISTA ═══ */}
      <ModalOcorrChegada ctx={{ ocorrChegadaAlert, setOcorrChegadaAlert, formData, setFormData, showToast, t, hIco, css, DESIGN }} />

      {/* OcorrModal unificado (nova ocorrencia) */}
      <OcorrModal
        open={ocorrModalOpen}
        onClose={()=>setOcorrModalOpen(false)}
        onSave={({tipo,texto,nfs,localizacao})=>{
          adicionarOcorrencia({dt:ocorrModalDT, tipo, texto, nfs, localizacao});
          setOcorrModalOpen(false);
        }}
        dtRecord={ocorrModalRecord}
        t={t} hIco={hIco} css={css}
      />

      {/* ═══ BUSCA MODAL (Ctrl+K) ═══ */}
      <ModalBusca ctx={{
        buscaModalOpen, setBuscaModalOpen,
        buscaTipo, setBuscaTipo, buscaInput, setBuscaInput,
        buscaResult, setBuscaResult, buscaRelacionados, setBuscaRelacionados,
        buscaError, setBuscaError, historico, buscar,
        DADOS, motoristas, canEdit, connStatus,
        setFormData, setEditIdx, setEditStep, setModalOpen,
        setWppFatModal, setWppModal, setWppTel, setWppPgto,
        setWppValCheque, setWppValConta, setWppObs,
        setWppModal2, setWpp2Ro, setWpp2IncluirObs,
        abrirWppPagModal, abrirOcorrModal,
        dtBase, parseData, saveJSON, t, css, hIco, DESIGN,
      }} />

      <Toast {...toast} />
    </div>
  );
}
