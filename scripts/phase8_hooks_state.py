from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── 1. Imports ──────────────────────────────────────────────────────────────
OLD_IMPORT = "import { useDiariasState } from './hooks/useDiariasState.js';"
NEW_IMPORT = """import { useDiariasState } from './hooks/useDiariasState.js';
import { useModalState } from './hooks/useModalState.js';
import { useMotoristaState } from './hooks/useMotoristaState.js';
import { useWppState } from './hooks/useWppState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# ── 2. Replace Modal state block ────────────────────────────────────────────
OLD_MODAL = """  // Modal state
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
  const [acompImagens, setAcompImagens] = useState([]);"""

NEW_MODAL = """  const {
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
  } = useModalState();"""

assert content.count(OLD_MODAL) == 1, f"Modal block not found/unique"
content = content.replace(OLD_MODAL, NEW_MODAL, 1)
print("useModalState extracted")

# ── 3. Replace Motorista state block ────────────────────────────────────────
OLD_MOT = """  // Motoristas — busca local (Item 3)
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
  const [motDupSugest, setMotDupSugest] = useState(null); // motorista existente similar"""

NEW_MOT = """  const {
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
  } = useMotoristaState();"""

assert content.count(OLD_MOT) == 1, f"Motorista block not found/unique"
content = content.replace(OLD_MOT, NEW_MOT, 1)
print("useMotoristaState extracted")

# ── 4. Replace WPP state (3 scattered blocks → 1 hook) ──────────────────────
# Block A: wppModal..wppObs (lines ~298-304)
OLD_WPP_A = """  // WhatsApp card modal (Item 4)
  const [wppModal, setWppModal] = useState(null); // {reg, mot}
  const [wppTel, setWppTel] = useState("");
  const [wppPgto, setWppPgto] = useState("cheque"); // 'cheque'|'conta'|'ambos'
  const [wppValCheque, setWppValCheque] = useState("");
  const [wppValConta, setWppValConta] = useState("");
  const [wppObs, setWppObs] = useState("");"""

NEW_WPP_A = """  const {
    wppModal, setWppModal, wppTel, setWppTel, wppPgto, setWppPgto,
    wppValCheque, setWppValCheque, wppValConta, setWppValConta, wppObs, setWppObs,
    wppModal2, setWppModal2, wpp2Ro, setWpp2Ro, wpp2Obs, setWpp2Obs,
    wpp2IncluirObs, setWpp2IncluirObs, wpp2Conflitos, setWpp2Conflitos,
    wppTipoOpen, setWppTipoOpen, wppSearchTxt, setWppSearchTxt, wppSearchReg, setWppSearchReg,
    wppFatModal, setWppFatModal, wppPagModal, setWppPagModal, wppConfirmModal, setWppConfirmModal,
    wppFortes, setWppFortes, wppDccMinutas, setWppDccMinutas, wppCteComp, setWppCteComp,
    wppDscMinutas, setWppDscMinutas,
  } = useWppState();"""

assert content.count(OLD_WPP_A) == 1, f"WPP block A not found/unique"
content = content.replace(OLD_WPP_A, NEW_WPP_A, 1)

# Block B: wppModal2..wpp2Conflitos (lines ~334-339)
OLD_WPP_B = """  // Segundo WhatsApp — formato documentário (Item 3 sessão 4)
  const [wppModal2, setWppModal2] = useState(null); // {reg, mot}
  const [wpp2Ro, setWpp2Ro] = useState("");
  const [wpp2Obs, setWpp2Obs] = useState(() => loadJSON("co_wpp2_obs_last",""));
  const [wpp2IncluirObs, setWpp2IncluirObs] = useState(false);
  const [wpp2Conflitos, setWpp2Conflitos] = useState([]); // para resolver conflitos de importação"""

assert content.count(OLD_WPP_B) == 1, f"WPP block B not found/unique"
content = content.replace(OLD_WPP_B, "  // wppModal2 state — via useWppState (above)", 1)

# Block C: wppTipoOpen..wppDscMinutas (lines ~360-372)
OLD_WPP_C = """  // ── WhatsApp tipos ──
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
  const [wppDscMinutas, setWppDscMinutas] = useState(_initDsc());"""

assert content.count(OLD_WPP_C) == 1, f"WPP block C not found/unique"
content = content.replace(OLD_WPP_C, "  // wppTipoOpen/wppDccMinutas state — via useWppState (above)", 1)
print("useWppState extracted")

# ── 5. Write ─────────────────────────────────────────────────────────────────
app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
