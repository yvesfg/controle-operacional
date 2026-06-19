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
import { apontToSupabase } from './utils/apontMappers.js';
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
import { useUIState } from './hooks/useUIState.js';
import { useAdminState } from './hooks/useAdminState.js';
import { useAdminHandlers } from './hooks/useAdminHandlers.js';
import { useAuthHandlers } from './hooks/useAuthHandlers.js';
import { useOcorrHandlers } from './hooks/useOcorrHandlers.js';
import { useDTHandlers } from './hooks/useDTHandlers.js';
import { useWppHandlers } from './hooks/useWppHandlers.js';
import { useCss } from './hooks/useCss.js';
import { useAuditDesign } from './hooks/useAuditDesign.js';
import AppModals from './modals/AppModals.jsx';
import { useBuscarHandlers } from './hooks/useBuscarHandlers.js';
import { useSyncHandlers } from './hooks/useSyncHandlers.js';
import { useOperacionalState } from './hooks/useOperacionalState.js';
import { useBuscaState } from './hooks/useBuscaState.js';
import { useViewPrefsState } from './hooks/useViewPrefsState.js';
import { useAuthState } from './hooks/useAuthState.js';
import { useCoreState } from './hooks/useCoreState.js';

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
import { getSupaAuth } from './supabaseAuth.js';
import BaseSelectorScreen from './screens/BaseSelectorScreen.jsx';
import PrimeiroLoginScreen from './screens/PrimeiroLoginScreen.jsx';
import AppSidebar from './components/AppSidebar.jsx';


// ══════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState(() => loadJSON("co_theme","dark"));
  const t = themes[theme] || themes.dark;

  const {
    authed, setAuthed, hubScreen, setHubScreen, perfil, setPerfil, perms, setPerms,
    authEmail, setAuthEmail, authSenha, setAuthSenha, authMsg, setAuthMsg,
    primeiroLogin, setPrimeiroLogin, primLoginSenha, setPrimLoginSenha, primLoginSenha2, setPrimLoginSenha2,
    customLogo, setCustomLogo,
    usuarioLogado, setUsuarioLogado, usuarios, setUsuarios,
    aguardandoAprovacao, setAguardandoAprovacao, pendingUserInfo, setPendingUserInfo,
    usuariosPendentes, setUsuariosPendentes, aprovarModal, setAprovarModal, aprovarPerfil, setAprovarPerfil,
  } = useAuthState();

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

  const {
    dadosBase, setDadosBase, dadosExtras, setDadosExtras,
    motoristas, setMotoristas, conexoes, setConexoes,
    activeTab, setActiveTab, toast, setToast,
    connStatus, setConnStatus, ultimaSync, setUltimaSync,
  } = useCoreState();
  const {
    planilhaSortKey, setPlanilhaSortKey, planilhaSortDir, setPlanilhaSortDir,
    planilhaPagina, setPlanilhaPagina, planilhaFiltroAno, setPlanilhaFiltroAno,
    planilhaFiltroMes, setPlanilhaFiltroMes, planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
    planilhaFiltroDataDe, setPlanilhaFiltroDataDe, planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
    planilhaFiltroStatus, setPlanilhaFiltroStatus, planilhaFiltroContratante, setPlanilhaFiltroContratante,
    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora, planilhaBusca, setPlanilhaBusca,
  } = usePlanilhaState();
  // toast/connStatus/ultimaSync — via useCoreState (above)

  const {
    buscaTipo, setBuscaTipo, buscaInput, setBuscaInput,
    buscaResult, setBuscaResult, buscaRelacionados, setBuscaRelacionados,
    buscaError, setBuscaError, buscaModalOpen, setBuscaModalOpen,
    historico, setHistorico,
  } = useBuscaState();

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

  const {
    diariaView, setDiariaView, diariaCols, setDiariaCols,
    descargaView, setDescargaView, descargaCols, setDescargaCols,
    diariaNavDT, setDiariaNavDT, descargaNavDT, setDescargaNavDT,
  } = useViewPrefsState();

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

  const {
    alertasOpen, setAlertasOpen, baseMenuOpen, setBaseMenuOpen,
    conexoesOpen, setConexoesOpen, contatosAdminOpen, setContatosAdminOpen,
    gsheetsOpen, setGsheetsOpen, oauthAccessOpen, setOauthAccessOpen,
    syncStatus, setSyncStatus, syncStatusLoading, setSyncStatusLoading,
    adminEmailVal, setAdminEmailVal,
    isMobile, setIsMobile, isWide, setIsWide,
    sidebarCollapsed, setSidebarCollapsed, mobileSidebarExpanded, setMobileSidebarExpanded,
  } = useUIState();



  const {
    emailTemplateOpen, setEmailTemplateOpen, emailTemplate, setEmailTemplate,
    usuarioEmailPreview, setUsuarioEmailPreview,
    logsOpen, setLogsOpen, logsData, setLogsData, logsSubTab, setLogsSubTab,
  } = useAdminState();

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

  const {
    operSubTab, setOperSubTab, filtroOcorr, setFiltroOcorr,
    sgsItems, setSgsItems, sgsFormOpen, setSgsFormOpen, sgsForm, setSgsForm,
    expandedSgsId, setExpandedSgsId, sgsRetornoForm, setSgsRetornoForm,
    apontItems, setApontItems, apontFormOpen, setApontFormOpen,
    apontLoading, setApontLoading, apontForm, setApontForm,
  } = useOperacionalState();
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

  const { sincronizar, carregarAponts, syncUsuariosRemoto, carregarPendentes } = useSyncHandlers({
    getConexao, showToast, tblRef, sessionToken, baseAtual,
    dadosExtras, setDadosBase, setDadosExtras, setConnStatus, setUltimaSync,
    setApontItems, setApontLoading, setUsuarios, setUsuariosPendentes,
  });

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

  // ── Bootstrap sessão Supabase Auth (Google). Loga e cai no Hub. ──
  useEffect(() => {
    const sb = getSupaAuth();
    if (!sb) return;
    const aplicar = (sess) => {
      if (!sess?.access_token) return;
      try { sessionStorage.setItem("co_supa_tokens", JSON.stringify({ access_token: sess.access_token, refresh_token: sess.refresh_token || "" })); } catch {}
      const nome = sess.user?.user_metadata?.full_name || sess.user?.user_metadata?.name || sess.user?.email || "";
      setUsuarioLogado(nome);
      setAuthed(true);
    };
    sb.auth.getSession().then(({ data }) => aplicar(data?.session));
    const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) => aplicar(sess));
    return () => { try { sub?.subscription?.unsubscribe(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { registrarLog, gerarCorpoEmail, enviarEmailBoasVindas, carregarLogs } = useAdminHandlers({
    getConexao, showToast, emailTemplate, setLogsData, usuarioLogado, perfil,
  });

  const { getConfigRemoto, setConfigRemoto, handleLogin, handleLogout, handlePrimeiroLoginSalvar } = useAuthHandlers({
    getConexao, showToast, registrarLog,
    sessionToken, usuarioLogado, perfil,
    authEmail, authSenha, setAuthEmail, setAuthSenha, setAuthMsg,
    setPerfil, setPerms, setAuthed, setUsuarioLogado,
    usuarios, setUsuarios,
    setAguardandoAprovacao, setPendingUserInfo,
    setPrimeiroLogin, primLoginSenha, primLoginSenha2, setPrimLoginSenha, setPrimLoginSenha2,
    setSessionToken, setBasesPermitidas, setBaseAtual, setHubScreen, setActiveTab,
  });



  // carregarAponts / syncUsuariosRemoto / carregarPendentes — via useSyncHandlers

  // ── Ocorrências ── via useOcorrHandlers
  const { abrirDetalhe, adicionarOcorrencia, salvarOcorrenciaExterna, abrirOcorrModal, adicionarOcorrenciaModal } = useOcorrHandlers({
    getConexao, showToast, sessionToken, usuarioLogado, perfil, DADOS,
    setDetalheDT, setOcorrencias, setNovaOcorr, setOcorrListExpanded,
    setAcompDias, setAcompDiaSel, setAcompTexto, setAcompImagens, setModalOpen,
    setOcorrLoading,
    detalheDT, ocorrencias,
    ocorrModalNova, ocorrModalTipo, ocorrModalDT, ocorrModalList,
    setOcorrModalList, setOcorrModalNova, setOcorrModalDT, setOcorrModalRecord, setOcorrModalOpen,
  });
    // handleLogin / handleLogout / handlePrimeiroLoginSalvar — via useAuthHandlers

  // Search — via useBuscarHandlers
  const { buscar } = useBuscarHandlers({
    DADOS, buscaInput, buscaTipo,
    setBuscaResult, setBuscaError, setBuscaRelacionados,
    historico, setHistorico,
  });

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

  // supaUpsert / salvarRegistro / deletarRegistro / salvarMinutasDetalhe — via useDTHandlers
  const { supaUpsert, salvarRegistro, deletarRegistro, salvarMinutasDetalhe } = useDTHandlers({
    getConexao, showToast, sessionToken, baseAtual, registrarLog,
    DADOS, formData, editIdx, dadosBase, dadosExtras,
    setDadosBase, setDadosExtras, setModalOpen,
    setDetalheDT, setExcluirConfirm, setExcluirTexto,
    detalheDT, detalheMinDcc, detalheCteComp, detalheMinDsc,
    setSalvandoMins,
  });

  // abrirWppPagModal — via useWppHandlers
  const { abrirWppPagModal } = useWppHandlers({
    setWppPagModal, setWppFortes, setWppDccMinutas, setWppCteComp, setWppDscMinutas,
  });

  const isAdmin = perfil === "admin";
  const canEdit = isAdmin || perms.editar;
  const canFin = perms.financeiro;

  // css + statusBorderColor — via useCss
  const { css, statusBorderColor } = useCss(t);

  // auditarDesign — via useAuditDesign
  const { auditarDesign } = useAuditDesign({ perfil, setAuditReport });


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
      authMsg={authMsg}
      toast={toast}
    />;
  }

  // ── Hub: Seletor de Módulo ────────────────────────────────────
  if (authed && !hubScreen) {
    return <HubScreen
      t={t} css={css}
      setHubScreen={setHubScreen}
      setPerfil={setPerfil} setPerms={setPerms}
      setBasesPermitidas={setBasesPermitidas} setBaseAtual={setBaseAtual}
      frotaUrl={import.meta.env.VITE_FROTA_URL || "http://localhost:3000"}
      handleLogout={handleLogout} showToast={showToast}
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

      <AppModals ctx={{
        reportBuilderOpen, setReportBuilderOpen, DADOS, motoristas, apontItems, sgsItems,
        t, DESIGN, isMobile, hIco, hexRgb, css, fmtMoeda,
        formData, setFormData, modalOpen, setModalOpen, editIdx, setEditIdx,
        excluirConfirm, setExcluirConfirm, excluirTexto, setExcluirTexto,
        canFin, brToInput, brToInputDT, inputToBr, inputToBrDT,
        baseAtual, salvarRegistro, deletarRegistro,
        motExcluirTodosOpen, setMotExcluirTodosOpen, motExcluirTodosTexto, setMotExcluirTodosTexto,
        motSugestOpen, setMotSugestOpen, motSugestData, setMotSugestData,
        motExcluirLoteOpen, setMotExcluirLoteOpen, motExcluirLoteTexto, setMotExcluirLoteTexto,
        motSelecionados, setMotSelecionados, setDadosBase, dadosExtras,
        saveMotoristasLS, registrarLog, showToast,
        motImportPrefOpen, setMotImportPrefOpen, motImportRaw,
        motImportPrefBusca, setMotImportPrefBusca, motImportPrefSel, setMotImportPrefSel,
        conexoes, saveConexoesLS,
        setMotImportConfirm, setMotImportData, setMotImportOpen, setMotImportStep,
        motImportOpen, motImportData, motImportConfirm, motImportStep,
        motDupSugest, setMotDupSugest,
        detalheDT, ocorrencias, acompImagens, setAcompImagens, acompTexto, setAcompTexto,
        ocorrListExpanded, setOcorrListExpanded, acompDiaSel, setAcompDiaSel,
        activeTab, setActiveTab, detalheCteComp, setDetalheCteComp,
        detalheMinDcc, setDetalheMinDcc, detalheMinDsc, setDetalheMinDsc,
        detalheSecCteComp, setDetalheSecCteComp, detalheSecDcc, setDetalheSecDcc,
        detalheSecMinDsc, setDetalheSecMinDsc, detalheTemDcc, setDetalheTemDcc,
        salvandoMins, setSalvandoMins, isAdmin, theme, perms, setEditStep,
        diariasData, salvarMinutasDetalhe, acompDias, setAcompDias,
        usuarioLogado, getConexao, supaFetch, ocorrLoading, adicionarOcorrencia, abrirOcorrModal,
        usuarios, setUsuarios, usuarioEmailPreview, setUsuarioEmailPreview, enviarEmailBoasVindas,
        wppTipoOpen, setWppTipoOpen, wppSearchTxt, setWppSearchTxt, wppSearchReg, setWppSearchReg,
        buscaResult, wppModal, setWppModal, wppTel, setWppTel, wppPgto, setWppPgto,
        wppValCheque, setWppValCheque, wppValConta, setWppValConta, wppObs, setWppObs,
        wppModal2, setWppModal2, wpp2Ro, setWpp2Ro, wpp2Obs, setWpp2Obs,
        wpp2IncluirObs, setWpp2IncluirObs,
        wppFatModal, setWppFatModal, wppPagModal, setWppPagModal, wppFortes, setWppFortes,
        wppDccMinutas, setWppDccMinutas, wppCteComp, setWppCteComp, wppDscMinutas, setWppDscMinutas,
        wppConfirmModal, setWppConfirmModal, abrirWppPagModal,
        dashDrillModal, setDashDrillModal, parseData, abrirDetalhe,
        relGeralOpen, setRelGeralOpen, relGeralFrom, setRelGeralFrom, relGeralTo, setRelGeralTo,
        relGeralMotorista, setRelGeralMotorista, relGeralStatus, setRelGeralStatus,
        relGeralOrigem, setRelGeralOrigem, relGeralDestino, setRelGeralDestino,
        relGeralVinculo, setRelGeralVinculo, relGeralSecoes, setRelGeralSecoes,
        relGeralLoading, setRelGeralLoading, relGeralStatusOper, setRelGeralStatusOper,
        relDiariaOpen, setRelDiariaOpen, relDiariaFrom, setRelDiariaFrom, relDiariaTo, setRelDiariaTo,
        relDiariaMotorista, setRelDiariaMotorista, relDiariaVinculo, setRelDiariaVinculo,
        relDiariaStatus, setRelDiariaStatus,
        relDescargaOpen, setRelDescargaOpen, relDescargaFrom, setRelDescargaFrom,
        relDescargaTo, setRelDescargaTo, relDescargaMotorista, setRelDescargaMotorista,
        relDescargaStatus, setRelDescargaStatus,
        relOperOpen, setRelOperOpen, relOperFrom, setRelOperFrom, relOperTo, setRelOperTo,
        relOperSecoes, setRelOperSecoes,
        gerarRelatorioGeral, gerarRelatorioDiarias, gerarRelatorioDescargas, gerarRelatorioOperacional,
        relCtrlDccOpen, setRelCtrlDccOpen, relCtrlDccFrom, setRelCtrlDccFrom, relCtrlDccTo, setRelCtrlDccTo,
        nfdAlertOpen, setNfdAlertOpen, nfdFotos, setNfdFotos, nfdForm, setNfdForm,
        nfdRegistrarOutra, setNfdRegistrarOutra, nfdUploadando, setNfdUploadando,
        ocorrChegadaAlert, setOcorrChegadaAlert,
        ocorrModalOpen, setOcorrModalOpen, ocorrModalDT, ocorrModalRecord,
        buscaModalOpen, setBuscaModalOpen, buscaTipo, setBuscaTipo,
        buscaInput, setBuscaInput, setBuscaResult, buscaRelacionados, setBuscaRelacionados,
        buscaError, setBuscaError, historico, buscar, canEdit, connStatus,
        dtBase, saveJSON,
        toast,
      }} />
    </div>
  );
}
