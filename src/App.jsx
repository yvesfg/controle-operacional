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


// ══════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState(() => loadJSON("co_theme","dark"));
  const t = themes[theme] || themes.dark;

  // Auth state
  const [authed, setAuthed] = useState(false);
  const [hubScreen, setHubScreen] = useState(null); // null | "controle_op" | "frota" ...
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
  const [planilhaSortKey, setPlanilhaSortKey] = useState(null);   // coluna ativa: 'dt'|'nome'|'placa'|...
  const [planilhaSortDir, setPlanilhaSortDir] = useState("asc");  // 'asc'|'desc'
  const [planilhaPagina, setPlanilhaPagina] = useState(1);        // página atual (começa em 1)
  const [planilhaFiltroAno, setPlanilhaFiltroAno] = useState(()=>String(new Date().getFullYear()));
  const [planilhaFiltroMes, setPlanilhaFiltroMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [planilhaFiltroOrigem, setPlanilhaFiltroOrigem] = useState("todas"); // "todas" = sem filtro
  const [planilhaFiltroDataDe, setPlanilhaFiltroDataDe] = useState(""); // data inicio (yyyy-MM-dd)
  const [planilhaFiltroDataAte, setPlanilhaFiltroDataAte] = useState(""); // data fim (yyyy-MM-dd)
  const [planilhaFiltroStatus, setPlanilhaFiltroStatus] = useState(""); // status filter do dashboard
  const [planilhaFiltroContratante, setPlanilhaFiltroContratante] = useState(""); // AVB only
  const [planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora] = useState(""); // AVB only
  const [planilhaBusca, setPlanilhaBusca] = useState("");           // busca livre: dt|placa|nome
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

  // Dashboard state
  const [dashMes, setDashMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"0")+"/"+new Date().getFullYear());
  const [dashOrigem, setDashOrigem] = useState("todos");

  // Diarias state
  const [dFiltro, setDFiltro] = useState("todos");
  const [dSubTab, setDSubTab] = useState("resumo");
  const [dPlanFiltroAno, setDPlanFiltroAno] = useState(()=>String(new Date().getFullYear()));
  const [dPlanFiltroMes, setDPlanFiltroMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [dPlanFiltroOrigem, setDPlanFiltroOrigem] = useState("todas");
  const [dPlanFiltroIni, setDPlanFiltroIni] = useState("");
  const [dPlanFiltroFim, setDPlanFiltroFim] = useState("");
  const [extratoRows, setExtratoRows] = useState([]);
  const [extratoFileName, setExtratoFileName] = useState(null);
  const [prevExtratoSnap, setPrevExtratoSnap] = useState(null);
  const [extratoSheetInfo, setExtratoSheetInfo] = useState(null);
  const [extratoFiltro, setExtratoFiltro] = useState("todos");
  const [extratoDataIni, setExtratoDataIni] = useState("");
  const [extratoDataFim, setExtratoDataFim] = useState("");

  // Descarga state
  const [dscTab, setDscTab] = useState("hoje");
  const [dscFiltroAno, setDscFiltroAno] = useState(()=>String(new Date().getFullYear()));
  const [dscFiltroMes, setDscFiltroMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [dscFiltroOrigem, setDscFiltroOrigem] = useState("todas");
  const [dscFiltroIni, setDscFiltroIni] = useState("");
  const [dscFiltroFim, setDscFiltroFim] = useState("");
  const [dscData, setDscData] = useState(new Date().toISOString().slice(0,10));
  // Conferência Planilha RODORRICA
  const [rodorricaRows, setRodorricaRows] = useState([]);
  const [rodorricaFileName, setRodorricaFileName] = useState(null);
  const [prevRodorricaSnap, setPrevRodorricaSnap] = useState(null);
  const [rodorricaSheetInfo, setRodorricaSheetInfo] = useState(null);
  const [rodorricaFiltro, setRodorricaFiltro] = useState("todos");
  const [rodorricaPeriodoIni, setRodorricaPeriodoIni] = useState("");
  const [rodorricaPeriodoFim, setRodorricaPeriodoFim] = useState("");
  const [rodorricaPeriodoModal, setRodorricaPeriodoModal] = useState(false);

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
  // Modal de nova ocorrência (OcorrModal unificado)
  const [ocorrModalOpen, setOcorrModalOpen] = useState(false);
  const [ocorrModalDT, setOcorrModalDT] = useState(null);
  const [ocorrModalRecord, setOcorrModalRecord] = useState(null);
  // (legacy mini-modal states mantidos para compatibilidade)
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
  const [nfdForm, setNfdForm]           = useState({numero:"",valor:"",tipo:"avaria",nfs:"",localizacao:""});
  const [nfdFotos, setNfdFotos]         = useState([]);
  const [nfdUploadando, setNfdUploadando] = useState(false);
  const [nfdRegistrarOutra, setNfdRegistrarOutra] = useState(false);
  // Alerta de Ocorrência/RO na chegada do motorista
  const [ocorrChegadaAlert, setOcorrChegadaAlert] = useState(false);

  // Item 4 - Acompanhamento dia a dia da DT
  const [acompDias, setAcompDias] = useState([]);
  const [acompDiaSel, setAcompDiaSel] = useState(null);
  const [acompTexto, setAcompTexto] = useState("");
  const [acompImagens, setAcompImagens] = useState([]);

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
  const [dashRecentesN, setDashRecentesN] = useState(8);
  const dashRecCardRef = useRef(null);

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
  const [wppSearchTxt, setWppSearchTxt] = useState("");   // busca no modal WPP
  const [wppSearchReg, setWppSearchReg] = useState(null); // registro selecionado no modal WPP
  const [wppFatModal, setWppFatModal] = useState(null); // {reg, mot}
  const [wppPagModal, setWppPagModal] = useState(null); // {reg, mot, tipo:'descarga'|'diarias'}
  const [wppConfirmModal, setWppConfirmModal] = useState(null); // {url, displayText}
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
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
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

    // Guardar tokens Supabase Auth para SSO no hub
    const refreshTokenOAuth = params.get("refresh_token") || "";
    saveJSON("co_supa_tokens", { access_token: accessToken, refresh_token: refreshTokenOAuth });

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
            if (_st.access_token) saveJSON("co_supa_tokens",{access_token:_st.access_token,refresh_token:_st.refresh_token||""});
          }
        } catch {}
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
    localStorage.removeItem("co_supa_tokens");
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
    return (
      <div className="co-login-screen" style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{position:"absolute",top:16,right:16,...css.hBtn,fontSize:16,padding:"8px 12px",zIndex:10}}>{theme==="dark"
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}</button>
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
            <div style={{fontSize:11,color:t.ouro,fontWeight:600,marginBottom:22,padding:"7px 14px",background:hexRgb(t.ouro,.07),borderRadius:DESIGN.r.inp,border:`1px solid ${hexRgb(t.ouro,.2)}`,display:"flex",alignItems:"center",gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> {pendingUserInfo.email}
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
                  saveJSON("co_sessao",{perfil:p,nome:u.nome||u.email,ts:Date.now()});
                  showToast(`✅ Acesso aprovado! Bem-vindo, ${u.nome||u.email}!`,"ok");
                } else {
                  showToast("⏳ Ainda aguardando aprovação...","warn");
                }
              } else {
                showToast("⚠️ Solicitação não encontrada. Tente fazer login novamente.","warn");
              }
            }catch{showToast("❌ Erro ao verificar status","err");}
          }} style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:DESIGN.r.btn,color:t.onPrimary,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Verificar Status
          </button>
          <button onClick={()=>{setAguardandoAprovacao(false);localStorage.removeItem("co_pending_user");setPendingUserInfo(null);}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:10,padding:"10px",color:t.txt2,fontSize:12,cursor:"pointer",width:"100%",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0}}><polyline points="15 18 9 12 15 6"/></svg> Voltar ao Login
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
    const ano = new Date().toLocaleDateString("pt-BR",{month:"short",year:"numeric"}).toUpperCase().replace(". ","/" );
    return (
      <div className="co-login-screen" style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
        <style>{`
          @keyframes loginFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
          @keyframes loginPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
          *{box-sizing:border-box;margin:0;padding:0}
          ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
        `}</style>

        {/* Acento de fundo sutil */}
        <div style={{position:"absolute",top:"8%",left:"50%",transform:"translateX(-50%)",width:"500px",height:"260px",background:`radial-gradient(ellipse,${hexRgb(t.ouro, .06)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
        <div style={{position:"absolute",bottom:"12%",left:"50%",transform:"translateX(-50%)",width:"400px",height:"200px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.04)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

        {/* Theme toggle */}
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{position:"absolute",top:16,right:16,...css.hBtn,fontSize:16,padding:"8px 12px",zIndex:10}}>
          {theme==="dark"
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
        </button>

        {/* ── Logotipo ── */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28,animation:"loginPop .45s ease-out",position:"relative",zIndex:1}}>
          <img src={loginLogo} alt="YFGroup" width="80" height="80" style={{marginBottom:14,borderRadius:"50%"}} />
          <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-0.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
          <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
          <div style={{fontSize:9,color:t.txt2,letterSpacing:".12em",textTransform:"uppercase"}}>Controle Operacional</div>
        </div>

        {/* ── Card ── */}
        <div style={{width:"100%",maxWidth:360,background:t.card,border:`1px solid ${t.borda}`,borderRadius:16,padding:"28px 28px 24px",display:"flex",flexDirection:"column",gap:0,animation:"loginFadeUp .4s ease-out",position:"relative",zIndex:1}}>
          <div style={{fontFamily:"var(--font-heading)",fontSize:16,fontWeight:700,letterSpacing:"-.02em",color:t.txt,marginBottom:4}}>Entrar na plataforma</div>
          <div style={{fontSize:12,color:t.txt2,marginBottom:20,lineHeight:1.5}}>Acesso restrito a operadores autorizados.</div>

          {/* Auth message */}
          {authMsg && (
            <div style={{padding:"10px 12px",borderRadius:DESIGN.r.inp,fontSize:12,fontWeight:600,textAlign:"center",marginBottom:16,lineHeight:1.5,background:authMsg.t==="err"?hexRgb(t.danger,.08):hexRgb(t.verde,.08),color:authMsg.t==="err"?t.danger:t.verde,border:`1px solid ${authMsg.t==="err"?hexRgb(t.danger,.2):hexRgb(t.verde,.2)}`}}>{authMsg.m}</div>
          )}

          {/* Google button */}
          <button
            onClick={() => iniciarOAuth("google")}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:t.card2,border:`1px solid ${t.borda2}`,borderRadius:DESIGN.r.inp,padding:"13px 12px",cursor:"pointer",fontSize:13,fontWeight:600,color:t.txt,fontFamily:DESIGN.fnt.b,transition:"all .15s",letterSpacing:.2}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=hexRgb(t.ouro, .5);e.currentTarget.style.background=t.bgAlt}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borda2;e.currentTarget.style.background=t.card2}}
          >
            <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
            Continuar com Google
          </button>

          {/* Separador */}
          <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0"}}>
            <div style={{flex:1,height:"0.5px",background:t.borda}}/>
            <span style={{fontSize:9,color:t.txt2,letterSpacing:".06em"}}>OU</span>
            <div style={{flex:1,height:"0.5px",background:t.borda}}/>
          </div>

          {/* Form email/senha */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            <div style={{position:"relative"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.txt2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={e=>setAuthEmail(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                autoComplete="username"
                style={{width:"100%",height:42,background:t.inputBg,border:`1px solid ${t.borda2}`,borderRadius:DESIGN.r.inp,padding:"0 12px 0 34px",color:t.txt,fontSize:13,outline:"none",fontFamily:DESIGN.fnt.b}}
              />
            </div>
            <div style={{position:"relative"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.txt2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input
                type="password"
                placeholder="Senha"
                value={authSenha}
                onChange={e=>setAuthSenha(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                autoComplete="current-password"
                style={{width:"100%",height:42,background:t.inputBg,border:`1px solid ${t.borda2}`,borderRadius:DESIGN.r.inp,padding:"0 12px 0 34px",color:t.txt,fontSize:13,outline:"none",fontFamily:DESIGN.fnt.b}}
              />
            </div>
            <button
              onClick={handleLogin}
              style={{width:"100%",height:42,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:DESIGN.r.btn,color:t.onPrimary,fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:.3,fontFamily:DESIGN.fnt.b,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Entrar
            </button>
          </div>

          {/* Status */}
          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
            <span style={{fontSize:9,color:t.txt2,letterSpacing:".08em",textTransform:"uppercase"}}>Sistema Online — {ano}</span>
          </div>
        </div>

        <Toast {...toast} />
      </div>
    );
  }

  // ── Hub: Seletor de Módulo ────────────────────────────────────
  if (authed && !hubScreen) {
    const FROTA_URL = "http://localhost:3000";
    const HUB_MODS = [
      { slug:"controle_op", label:"Controle Operacional", desc:"Cargas · Operações · Relatórios", ativo:true,
        svg:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></> },
      { slug:"frota", label:"Frota Pro", desc:"Veículos · Pneus · Viagens", ativo:true,
        svg:<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></> },
      { slug:"calculadora", label:"Calculadora de Frete", desc:"Custo · Margem · Tabela", ativo:false,
        svg:<><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 7h6M9 12h6M9 17h3"/></> },
      { slug:"antt", label:"Consulta ANTT", desc:"RNTRC · CIOT · Rastreio", ativo:false,
        svg:<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></> },
      { slug:"financeiro", label:"Financeiro", desc:"DRE · Contas · Fluxo de Caixa", ativo:false,
        svg:<><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="4" width="3" height="13"/></> },
    ];
    return (
      <div style={{...css.app,background:t.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
        <style>{`@keyframes hubUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes hubPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{position:"absolute",top:"-5%",left:"50%",transform:"translateX(-50%)",width:"700px",height:"380px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.07)} 0%,transparent 68%)`,pointerEvents:"none"}}/>

        {/* Logo */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:32,animation:"hubPop .4s ease-out",position:"relative",zIndex:1}}>
          <img src={loginLogo} alt="YFGroup" width="68" height="68" style={{marginBottom:12,borderRadius:"50%"}}/>
          <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
          <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
          <div style={{fontSize:9,color:t.txt2,letterSpacing:".14em",textTransform:"uppercase"}}>Selecione o módulo</div>
        </div>

        {/* Cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:520,width:"100%",animation:"hubUp .38s ease-out",position:"relative",zIndex:1}}>
          {HUB_MODS.map(m => {
            const on = m.ativo;
            return (
              <button key={m.slug} disabled={!on}
                onClick={()=>{
                  if(m.slug==="controle_op") setHubScreen("controle_op");
                  else if(m.slug==="frota") {
                    const _tk = loadJSON("co_supa_tokens", null);
                    const _dest = (_tk && _tk.access_token)
                      ? `${FROTA_URL}/auth/hub?access_token=${encodeURIComponent(_tk.access_token)}&refresh_token=${encodeURIComponent(_tk.refresh_token||"")}`
                      : FROTA_URL;
                    window.open(_dest, "_blank");
                  }
                }}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"20px 10px 18px",background:on?t.card:t.card2,
                  border:`1.5px solid ${on?t.borda2||t.borda:t.borda}`,borderRadius:14,cursor:on?"pointer":"not-allowed",
                  opacity:on?1:.4,transition:"border-color .18s, transform .18s, background .18s",position:"relative",overflow:"hidden"}}
                onMouseEnter={e=>{if(on){e.currentTarget.style.borderColor=hexRgb(t.ouro,.6);e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.background=t.bgAlt||t.card2;}}}
                onMouseLeave={e=>{if(on){e.currentTarget.style.borderColor=t.borda2||t.borda;e.currentTarget.style.transform="none";e.currentTarget.style.background=on?t.card:t.card2;}}}
              >
                {!on&&<span style={{position:"absolute",top:7,right:8,fontSize:7,fontFamily:"var(--font-mono)",letterSpacing:".06em",color:t.txt2,background:hexRgb(t.txt2,.1),borderRadius:3,padding:"2px 5px"}}>EM BREVE</span>}
                <span className="co-sidebar__ico" style={{width:52,height:52,borderRadius:13,flexShrink:0,
                  background:`linear-gradient(135deg,${hexRgb(t.ouro,.16)},${hexRgb(t.ouro,.05)})`,
                  border:`1.5px solid ${hexRgb(t.ouro,.22)}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                    stroke={on?t.ouro:t.txt2} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {m.svg}
                  </svg>
                </span>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:12,fontWeight:700,color:on?t.txt:t.txt2,letterSpacing:"-.01em",lineHeight:1.2}}>{m.label}</div>
                  <div style={{fontSize:8.5,color:t.txt2,marginTop:3,lineHeight:1.4}}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={handleLogout} style={{marginTop:24,background:"transparent",border:"none",fontSize:11,color:t.txt2,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3,position:"relative",zIndex:1}}>
          Sair e trocar conta
        </button>
        <Toast {...toast}/>
      </div>
    );
  }
  // ── Seletor de Base Operacional ───────────────────────────────
  if (authed && hubScreen === "controle_op" && !baseAtual && basesPermitidas.length > 1) {
    return (
      <div style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
        <style>{`@keyframes loginFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes loginPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}*{box-sizing:border-box}`}</style>
        <div style={{position:"absolute",top:"8%",left:"50%",transform:"translateX(-50%)",width:"500px",height:"260px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.06)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

        {/* Logotipo */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28,animation:"loginPop .45s ease-out",position:"relative",zIndex:1}}>
          <img src={loginLogo} alt="YFGroup" width="80" height="80" style={{marginBottom:14,borderRadius:"50%"}} />
          <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-0.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
          <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
          <div style={{fontSize:9,color:t.txt2,letterSpacing:".12em",textTransform:"uppercase"}}>Controle Operacional</div>
        </div>

        {/* Card seletor */}
        <div style={{width:"100%",maxWidth:360,background:t.card,border:`1px solid ${t.borda}`,borderRadius:16,padding:"28px 28px 24px",display:"flex",flexDirection:"column",gap:12,animation:"loginFadeUp .4s ease-out",position:"relative",zIndex:1}}>
          <div style={{fontFamily:"var(--font-heading)",fontSize:16,fontWeight:700,letterSpacing:"-.02em",color:t.txt,marginBottom:4}}>Selecione a base de operação</div>
          <div style={{fontSize:12,color:t.txt2,marginBottom:8,lineHeight:1.5}}>Você tem acesso a múltiplas bases. Escolha com qual deseja trabalhar agora.</div>
          {basesPermitidas.map(base => (
            <button
              key={base.id}
              onClick={() => setBaseAtual(base)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:14,background:t.card2,border:`1px solid ${t.borda2||t.borda}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=hexRgb(t.ouro,.55);e.currentTarget.style.background=t.bgAlt||t.card2}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borda2||t.borda;e.currentTarget.style.background=t.card2}}
            >
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${hexRgb(t.ouro,.18)},${hexRgb(t.ouro,.08)})`,border:`1px solid ${hexRgb(t.ouro,.3)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.ouro} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <div style={{fontFamily:"var(--font-heading)",fontSize:14,fontWeight:700,color:t.txt,letterSpacing:"-.01em"}}>{base.label}</div>
                <div style={{fontSize:10,color:t.txt2,marginTop:2,fontFamily:"var(--font-mono)",letterSpacing:".04em"}}>{base.table}</div>
              </div>
            </button>
          ))}
          <button onClick={handleLogout} style={{marginTop:4,background:"transparent",border:"none",fontSize:11,color:t.txt2,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
            Sair e trocar conta
          </button>
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
        <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:${t.txt2}}`}</style>
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
  .trip-row-ok td{background:rgba(34,197,94,.08)}
  .trip-row-atraso td{background:rgba(239,68,68,.08)}
  .trip-row-diaria td{background:rgba(59,130,246,.08)}
  .trip-row-pend td{background:rgba(245,158,11,.08)}
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
        <div class="brand-name">CTRL OPERACIONAL</div>
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
      // Busca todas as ocorrencias dos DTs em uma unica query
      const rawBulk = sessionToken
        ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_ocorrencias_bulk",
            {p_token: sessionToken, p_dts: dtList})
        : await (async () => {
            const dtsCod = dtList.map(dt => dt.replace(/'/g,"''")).join(",");
            return supaFetch(conn.url, conn.key, "GET",
              `${TABLE_OCORR}?dt=in.(${encodeURIComponent(dtsCod)})&order=data_hora.asc&select=*`);
          })();
      const data = Array.isArray(rawBulk) ? rawBulk.map(x => typeof x === "string" ? JSON.parse(x) : x) : [];
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
    ${fSecoes.registros!==false?(()=>{
      const cols=filtros.colunas||{dt:true,nome:true,placa:true,origem:true,destino:true,data_carr:true,data_agenda:true,chegada:true,data_desc:true,dias:true,status:true,vl_cte:true,vl_contrato:true,diaria_prev:true,diaria_pg:true,ro:true,sgs:true};
      const colDefs=[
        {k:'dt',      h:'Espelho',      fn:r=>'<span class="dt-chip">'+(r.dt||'\u2014')+'</span>'},
        {k:'nome',    h:'Motorista',    fn:r=>'<strong>'+(r.nome||'\u2014')+'</strong>'},
        {k:'placa',   h:'Placa',        fn:r=>r.placa||'\u2014'},
        {k:'origem',  h:'Origem',       fn:r=>r.origem||'\u2014'},
        {k:'destino', h:'Destino',      fn:r=>r.destino||'\u2014'},
        {k:'cliente', h:'Cliente',      fn:r=>r.cliente||'\u2014'},
        {k:'data_carr',h:'Carregamento',fn:r=>r.data_carr||'\u2014'},
        {k:'data_agenda',h:'Agenda',    fn:r=>r.data_agenda||'\u2014'},
        {k:'chegada', h:'Chegada',      fn:r=>r.chegada||'\u2014'},
        {k:'data_desc',h:'Descarga',    fn:r=>r.data_desc||'\u2014'},
        {k:'dias',    h:'Dias',         fn:r=>r.dias||'\u2014'},
        {k:'status',  h:'Status Oper.', fn:r=>statusOperBadge(r.status)},
        {k:'vl_cte',  h:'Vl. CTE',      fn:r=>r.vl_cte?'R$ '+parseFloat(r.vl_cte).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'vl_contrato',h:'Vl. Contrato',fn:r=>r.vl_contrato?'R$ '+parseFloat(r.vl_contrato).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'adiant',  h:'Adiantamento', fn:r=>r.adiant?'R$ '+parseFloat(r.adiant).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'saldo',   h:'Saldo',        fn:r=>r.saldo?'R$ '+parseFloat(r.saldo).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'diaria_prev',h:'Di\u00e1ria Prev.',fn:r=>r.diaria_prev?'R$ '+parseFloat(r.diaria_prev).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'diaria_pg',h:'Di\u00e1ria Paga',fn:r=>r.diaria_pg?'R$ '+parseFloat(r.diaria_pg).toLocaleString('pt-BR',{minimumFractionDigits:2}):'\u2014'},
        {k:'cte',     h:'CTE',          fn:r=>r.cte||'\u2014'},
        {k:'mdf',     h:'MDF-e',        fn:r=>r.mdf||'\u2014'},
        {k:'nf',      h:'NF',           fn:r=>r.nf||'\u2014'},
        {k:'mat',     h:'MAT',          fn:r=>r.mat||'\u2014'},
        {k:'ro',      h:'RO',           fn:r=>r.ro||'\u2014'},
        {k:'sgs',     h:'SGS',          fn:r=>r.sgs?'<span class="badge badge-atraso">'+r.sgs+'</span>':'\u2014'},
        {k:'obs',     h:'Observa\u00e7\u00e3o',fn:r=>r.obs||'\u2014'},
      ].filter(c=>cols[c.k]);
      const rowCls=tp=>tp==='diaria'?'trip-row-diaria':tp==='atraso'?'trip-row-atraso':tp==='sem_diaria'?'trip-row-ok':'trip-row-pend';
      return '<div class="section-title">Todos os Registros no Per\u00edodo</div>'
        +(regs.length===0?'<div class="info-box">Nenhum registro encontrado para os filtros selecionados.</div>'
          :'<table><thead><tr>'+colDefs.map(c=>'<th>'+c.h+'</th>').join('')+'</tr></thead><tbody>'
          +regs.map(r=>{const tp=diariasMapG.get(r.dt)||'';return '<tr class="'+rowCls(tp)+'">'+colDefs.map(c=>'<td>'+c.fn(r)+'</td>').join('')+'</tr>';}).join('')
          +'</tbody></table>');})():""} 
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

      {/* ════════════════════════════════════════════
          SIDEBAR — sempre visível; icons no mobile, expand ao clicar
      ════════════════════════════════════════════ */}
      <aside className={`co-sidebar${isWide?" co-sidebar--collapsed":""}${!isWide&&mobileSidebarExpanded?" co-sidebar--mob-expanded":""}`}>
          {/* ── Logo ── */}
          <div className="co-sidebar__logo">
            <div style={{width:36,height:36,borderRadius:8,background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div style={{overflow:"hidden",flex:1,minWidth:0}}>
                <div className="co-sidebar__logo-name">YFGroup</div>
                <div className="co-sidebar__logo-sub">CTRL OPERACIONAL</div>
              </div>
            <button
              className="co-sidebar__toggle"
              style={{display:isWide?"none":"flex",alignItems:"center",justifyContent:"center"}}
              onClick={()=>isWide?setSidebarCollapsed(v=>!v):setMobileSidebarExpanded(v=>!v)}
              title={!mobileSidebarExpanded?"Expandir":"Recolher"}
            >
              {(isWide?sidebarCollapsed:!mobileSidebarExpanded)
                ? hIco(<><polyline points="9 18 15 12 9 6"/></>,t.txt2,14,2)
                : hIco(<><polyline points="15 18 9 12 15 6"/></>,t.txt2,14,2)
              }
            </button>
          </div>

          {/* ── Nav items ── */}
          <nav className="co-sidebar__nav">
            {(()=>{
              const posCarga = new Set(["diarias","descarga","ocorrencias"]);
              const hidden   = new Set(["busca"]);
              const mainTabs = tabs.filter(tb=>!posCarga.has(tb.k)&&!hidden.has(tb.k));
              const pcTabs   = tabs.filter(tb=>posCarga.has(tb.k));
              const renderItem = (tb) => {
                const ativo = activeTab===tb.k;
                return (
                  <button
                    key={tb.k}
                    className={`co-sidebar__item${ativo?" co-sidebar__item--active":""}`}
                    onClick={()=>{setActiveTab(tb.k);if(!isWide)setMobileSidebarExpanded(false);}}
                    title={(isWide&&sidebarCollapsed)||!isWide?tb.l:undefined}
                    style={{position:"relative"}}
                  >
                    <span className="co-sidebar__ico">
                      {typeof tb.ico==="function" ? tb.ico(ativo) : <span style={{fontSize:18}}>{tb.ico}</span>}
                    </span>
                    <span className="co-sidebar__item-lbl">{tb.l}</span>
                  </button>
                );
              };
              return (<>
                {mainTabs.map(renderItem)}
                {/* WhatsApp — acesso rápido, acima de Pós-Carga */}
                {/* WhatsApp — abre modal global */}
                <button
                  className="co-sidebar__item"
                  onClick={()=>{ setWppTipoOpen(true); if(!isWide) setMobileSidebarExpanded(false); }}
                  style={{border:`1px solid rgba(37,211,102,.18)`,borderRadius:DESIGN.r.sidebar,color:"#25D366",gap:10}}
                  title={!isWide||sidebarCollapsed?"WhatsApp":undefined}
                >
                  <span className="co-sidebar__ico">
                    {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </>,"#25D366",16)}
                  </span>
                  <span className="co-sidebar__item-lbl" style={{color:"#25D366",fontWeight:600}}>WhatsApp</span>
                </button>
                <div className="co-sidebar__section-lbl">PÓS CARGA</div>
                <div className="co-sidebar__section-line"/>
                {pcTabs.map(renderItem)}
              </>);
            })()}
          </nav>

          {/* ── Footer — utilitários + usuário ── */}
          {/* ── Footer — usuário + utilitários ── */}
          <div className="co-sidebar__footer">
            {/* Tema — acima do usuário */}
            <button className="co-sidebar__footer-item co-sidebar__footer-item--center" onClick={()=>setTheme(theme==="dark"?"light":"dark")} title={theme==="dark"?"Tema Claro":"Tema Escuro"}>
              {theme==="dark"
                ? hIco(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,t.txt2,16)
                : hIco(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,t.txt2,16)
              }
              <span className="co-sidebar__footer-lbl">{theme==="dark"?"Tema Claro":"Tema Escuro"}</span>
            </button>

            {/* User info — clicável → abre admin se admin, perfil caso contrário */}
            <div className="co-sidebar__user" style={{cursor:"pointer"}} {...clickable(()=>{
              if(isAdmin){setActiveTab("admin");if(!isWide)setMobileSidebarExpanded(false);}
              else{setModalOpen("usuario");}
            })}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg, var(--accent), var(--cyan))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:"#fff",fontFamily:"var(--font-heading)",letterSpacing:"-0.01em"}}>
                {(usuarioLogado||"YF").slice(0,2).toUpperCase()}
              </div>
              <div className="co-sidebar__user-info" style={{flex:1,minWidth:0}}>
                <div className="co-sidebar__user-name">{(usuarioLogado||perfil||"").split(" ")[0]}</div>
                <div className="co-sidebar__user-role">{perfil}</div>
              </div>
              <button
                className="co-sidebar__logout-btn"
                onClick={e=>{e.stopPropagation();handleLogout();}}
                title="Sair"
                style={{background:"transparent",border:"none",cursor:"pointer",padding:4,borderRadius:6,flexShrink:0,alignItems:"center",opacity:.6}}
                onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                onMouseLeave={e=>e.currentTarget.style.opacity=".6"}
              >
                {hIco(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,t.txt2,14)}
              </button>
            </div>
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

      {/* ═══ WPP SELECT MODAL ═══ */}
      {wppTipoOpen && (
        <div
          onClick={e=>{if(e.target===e.currentTarget)setWppTipoOpen(false);}}
          style={{position:"fixed",inset:0,zIndex:"var(--z-modal)",background:"rgba(0,0,0,.62)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}
        >
          <div style={{background:t.card,border:`1px solid ${t.borda}`,borderRadius:20,width:"100%",maxWidth:460,boxShadow:`0 32px 64px rgba(0,0,0,.4)`,overflow:"hidden",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${t.borda}`,background:"rgba(37,211,102,.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </>,"#25D366",20)}
                <div>
                  <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:15,color:t.txt}}>WhatsApp</div>
                  <div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)",letterSpacing:"0.06em",textTransform:"uppercase",marginTop:1}}>Selecione o modelo</div>
                </div>
              </div>
              <button onClick={()=>setWppTipoOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:t.txt2,padding:6,borderRadius:8}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18)}
              </button>
            </div>
            {/* Search / DT Context */}
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${t.borda}`}}>
              {(wppSearchReg||buscaResult) ? (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(37,211,102,.09)",border:"1px solid rgba(37,211,102,.22)",borderRadius:10}}>
                  {hIco(<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,"#25D366",14)}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#25D366"}}>DT {(wppSearchReg||buscaResult).dt} · {(wppSearchReg||buscaResult).nome||"—"}</div>
                    {(wppSearchReg||buscaResult).placa&&<div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)"}}>{(wppSearchReg||buscaResult).placa}</div>}
                  </div>
                  <button onClick={()=>{setWppSearchReg(null);setWppSearchTxt("");}} style={{background:"none",border:"none",cursor:"pointer",color:t.txt2,padding:4,borderRadius:6,flexShrink:0}}>
                    {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,14)}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{position:"relative"}}>
                    <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex",alignItems:"center"}}>
                      {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.txt2,14)}
                    </span>
                    <input
                      value={wppSearchTxt}
                      onChange={e=>setWppSearchTxt(e.target.value)}
                      placeholder="DT, motorista ou placa…"
                      style={{width:"100%",padding:"9px 10px 9px 34px",border:`1px solid ${t.borda}`,borderRadius:9,background:t.card2,color:t.txt,fontSize:13,fontFamily:"inherit",outline:"none"}}
                      onFocus={e=>{e.target.style.borderColor=t.azulLt;}}
                      onBlur={e=>{e.target.style.borderColor=t.borda;}}
                    />
                  </div>
                  {wppSearchTxt.length>=2 && (() => {
                    const _q=wppSearchTxt.toLowerCase();
                    const _res=DADOS.filter(r=>(r.dt&&String(r.dt).toLowerCase().includes(_q))||(r.nome&&r.nome.toLowerCase().includes(_q))||(r.placa&&r.placa.toLowerCase().includes(_q))).slice(0,5);
                    if(!_res.length) return <div style={{fontSize:11,color:t.txt2,marginTop:6,textAlign:"center",padding:"6px 0"}}>Nenhum resultado</div>;
                    return (<div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3,maxHeight:180,overflowY:"auto"}}>
                      {_res.map((r,i)=>(
                        <button key={i} onClick={()=>{setWppSearchReg(r);setWppSearchTxt("");}}
                          style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:t.card2,border:`1px solid ${t.borda}`,borderRadius:8,cursor:"pointer",textAlign:"left",width:"100%"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=t.surface;}}
                          onMouseLeave={e=>{e.currentTarget.style.background=t.card2;}}
                        >
                          <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:t.ouro,fontWeight:700,flexShrink:0}}>DT {r.dt}</div>
                          <div style={{fontSize:12,color:t.txt,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nome||"—"}</div>
                          {r.placa&&<div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)",flexShrink:0}}>{r.placa}</div>}
                        </button>
                      ))}
                    </div>);
                  })()}
                </div>
              )}
            </div>
            {/* Options */}
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {[
                {k:"faturamento", ico:<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="16" y1="8" x2="8" y2="8"/><line x1="16" y1="12" x2="8" y2="12"/></>, color:t.ouro, l:"Faturamento", sub:"CTE · MDF · MAT · DT · NF · ID"},
                {k:"contratacao",ico:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>, color:t.azulLt, l:"Contratação", sub:"Modelo completo de pagamento"},
                {k:"descarga",   ico:<><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>, color:t.verde, l:"Descarga / Stretch", sub:"Solicitar pagamento descarga"},
                {k:"diarias",   ico:<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>, color:t.ouro, l:"Diárias", sub:"Solicitar pagamento diária"},
              ].map((op)=>(
                <button key={op.k} onClick={()=>{
                  const _reg=wppSearchReg||buscaResult;
                  if(!_reg){showToast("Busque um registro primeiro","warn");return;}
                  const mot=motoristas.find(m=>(_reg.cpf&&m.cpf?.replace(/\D/g,"")===_reg.cpf?.replace(/\D/g,""))||(_reg.nome&&m.nome===_reg.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===_reg.placa));
                  setWppTipoOpen(false);setWppSearchTxt("");setWppSearchReg(null);
                  if(op.k==="faturamento"){setWppFatModal({reg:_reg,mot:mot||null,base:baseAtual?.id});}
                  else if(op.k==="contratacao"){setWppModal({reg:_reg,mot:mot||null});setWppTel((mot?.tel||_reg.tel||""));setWppPgto("cheque");setWppValCheque("");setWppValConta("");setWppObs("");}
                  else if(op.k==="descarga"){abrirWppPagModal(_reg,mot,"descarga");}
                  else if(op.k==="diarias"){abrirWppPagModal(_reg,mot,"diarias");}
                }}
                style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:t.card2,border:`1px solid ${t.borda}`,borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=`rgba(${op.color.includes("#7c")?'124,58,237':op.color===t.azulLt?'22,119,255':op.color===t.verde?'34,197,94':'240,185,11'},.1)`;e.currentTarget.style.borderColor=op.color}}
                onMouseLeave={e=>{e.currentTarget.style.background=t.card2;e.currentTarget.style.borderColor=t.borda}}
                >
                  <div style={{width:42,height:42,borderRadius:11,background:op.color+"18",border:`1px solid ${op.color}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {hIco(op.ico,op.color,18)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:t.txt,fontFamily:"var(--font-heading)"}}>{op.l}</div>
                    <div style={{fontSize:11,color:t.txt2,marginTop:2}}>{op.sub}</div>
                  </div>
                  {hIco(<><polyline points="9 18 15 12 9 6"/></>,t.txt3||t.txt2,14)}
                </button>
              ))}
            </div>
            <div style={{height:8}}/>
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
      {/* ═══ MODAL SUGERIR COMPATÍVEIS ═══ */}
      {motSugestOpen && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setMotSugestOpen(false)}>
          <div style={{...css.modal,maxWidth:480}}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.verde}}>🔗 SUGESTÕES DE VÍNCULO</div>
              <button onClick={()=>setMotSugestOpen(false)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
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
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.danger,display:"flex",alignItems:"center",gap:7}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,16)} EXCLUIR EM LOTE</div>
              <button onClick={()=>{setMotExcluirLoteOpen(false);setMotExcluirLoteTexto("");}} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
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
              }} style={{flex:1,background:motExcluirLoteTexto==="EXCLUIR"?`rgba(246,70,93,.9)`:`rgba(246,70,93,.2)`,border:`1.5px solid rgba(246,70,93,.4)`,borderRadius:9,padding:"10px 0",color:motExcluirLoteTexto==="EXCLUIR"?"#fff":t.danger,fontSize:12,fontWeight:700,cursor:motExcluirLoteTexto==="EXCLUIR"?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .2s"}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,motExcluirLoteTexto==="EXCLUIR"?"#fff":t.danger,13)} CONFIRMAR EXCLUSÃO</button>
            </div>
          </div>
        </div>
      )}

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
                <button onClick={()=>setMotImportOpen(false)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:12,maxHeight:"calc(96vh - 120px)"}}>

                {/* ══ ETAPA 2: SUGESTÕES DE VÍNCULO ══ */}
                {motImportStep===2 && (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{background:`rgba(22,119,255,.06)`,border:`1px solid rgba(22,119,255,.2)`,borderRadius:10,padding:"10px 12px",fontSize:10,color:t.azulLt,lineHeight:1.5}}>
                      🔗 Encontramos placas dos contatos importados em DTs do sistema. Aceite para preencher o nome do motorista automaticamente.
                    </div>
                    {vinculos.map((v,vi)=>(
                      <div key={vi} style={{background:t.card,borderRadius:10,border:`1px solid ${v.aceito===true?t.verde:v.aceito===false?`rgba(128,128,128,.3)`:t.azulLt}`,padding:"10px 12px",opacity:v.aceito===false?.5:1,transition:"all .18s"}}>
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
                        <div key={i} style={{background:t.card2,borderRadius:8,padding:"7px 10px",border:`1px solid ${t.verde}`,fontSize:10,color:t.txt}}>
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
                            <div style={{padding:"6px 10px",background:c.escolha==="manter"?`rgba(2,192,118,.08)`:t.card2,borderRight:`1px solid ${t.borda}`,cursor:"pointer",transition:"background .2s"}} {...clickable(()=>{
                              const nc=[...conflitos]; nc[ci]={...nc[ci],escolha:"manter"}; setMotImportData({novos,conflitos:nc});
                            })}>
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
                            <div style={{padding:"6px 10px",background:c.escolha==="usar"?`rgba(22,119,255,.08)`:t.card2,cursor:"pointer",transition:"background .2s"}} {...clickable(()=>{
                              const nc=[...conflitos]; nc[ci]={...nc[ci],escolha:"usar"}; setMotImportData({novos,conflitos:nc});
                            })}>
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
