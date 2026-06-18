"""Phase 16a: extract all modal JSX + Report Builder overlay into AppModals.jsx"""
from pathlib import Path

ROOT = Path(__file__).parent.parent
app = ROOT / "src/App.jsx"
content = app.read_text(encoding="utf-8")

# ── 1. Add import FIRST so indices are computed on the already-modified content ──
OLD_IMP_EARLY = "import { useAuditDesign } from './hooks/useAuditDesign.js';"
NEW_IMP_EARLY = OLD_IMP_EARLY + "\nimport AppModals from './modals/AppModals.jsx';"
assert content.count(OLD_IMP_EARLY) == 1
content = content.replace(OLD_IMP_EARLY, NEW_IMP_EARLY, 1)

# ── Identify the block to extract (now indices are correct) ──
# From Report Builder overlay to <Toast /> (inclusive)
START = "\n\n      {/* ═══ REPORT BUILDER OVERLAY ═══ */}"
END   = "\n      <Toast {...toast} />"

idx_start = content.index(START)
idx_end   = content.index(END) + len(END)

modal_jsx = content[idx_start:idx_end]
print(f"Modal block: {len(modal_jsx.splitlines())} lines")

# Dedent 6 spaces (modal block has 6-space indent from being inside App return)
def dedent6(block):
    lines = block.split("\n")
    result = []
    for line in lines:
        if line.startswith("      "):
            result.append(line[6:])
        elif line.startswith("    "):
            result.append(line[4:])
        else:
            result.append(line)
    return "\n".join(result)

modal_jsx_dedented = dedent6(modal_jsx)

MODAL_FILE = """\
import React from "react";
import ReportBuilder from '../relatorios/ReportBuilderWrapper.jsx';
import _ModalEditImpl  from './ModalEditWrapper.jsx';
function _renderModalEdit(p) { return React.createElement(_ModalEditImpl, p); }
import ModalMotoristasAdmin  from './ModalMotoristasAdmin.jsx';
import ModalMotoristaImport  from './ModalMotoristaImport.jsx';
import ModalMotorista        from './ModalMotorista.jsx';
import ModalDetalhe          from './ModalDetalhe.jsx';
import ModalUsuario          from './ModalUsuario.jsx';
import ModalConfigDB         from './ModalConfigDB.jsx';
import ModalWhatsApp         from './ModalWhatsApp.jsx';
import ModalNFD              from './ModalNFD.jsx';
import ModalRelatorios       from './ModalRelatorios.jsx';
import ModalCtrlFinanceiro   from './ModalCtrlFinanceiro.jsx';
import ModalBusca            from './ModalBusca.jsx';
import ModalDashDrill        from './ModalDashDrill.jsx';
import ModalOcorrChegada     from './ModalOcorrChegada.jsx';
import OcorrModal            from '../components/OcorrModal.jsx';
import Toast                 from '../components/Toast.jsx';

export default function AppModals({ ctx }) {
  const {
    // Report Builder
    reportBuilderOpen, setReportBuilderOpen, DADOS, motoristas, apontItems, sgsItems,
    t, DESIGN, isMobile, hIco, hexRgb,
    // Edit Modal
    formData, setFormData, modalOpen, setModalOpen, editIdx,
    excluirConfirm, setExcluirConfirm, excluirTexto, setExcluirTexto,
    canFin, css, brToInput, brToInputDT, inputToBr, inputToBrDT,
    setNfdForm, setNfdFotos, setNfdAlertOpen, setOcorrChegadaAlert,
    baseAtual, salvarRegistro, deletarRegistro,
    // Motoristas Admin
    motExcluirTodosOpen, setMotExcluirTodosOpen, motExcluirTodosTexto, setMotExcluirTodosTexto,
    motSugestOpen, setMotSugestOpen, motSugestData, setMotSugestData,
    motExcluirLoteOpen, setMotExcluirLoteOpen, motExcluirLoteTexto, setMotExcluirLoteTexto,
    motSelecionados, setMotSelecionados, setDadosBase, dadosExtras,
    saveMotoristasLS, registrarLog, showToast,
    // Motorista Import
    motImportPrefOpen, setMotImportPrefOpen, motImportRaw,
    motImportPrefBusca, setMotImportPrefBusca, motImportPrefSel, setMotImportPrefSel,
    conexoes, saveConexoesLS,
    setMotImportConfirm, setMotImportData, setMotImportOpen, setMotImportStep,
    motImportOpen, motImportData, motImportConfirm, motImportStep,
    // Motorista modal
    setEditIdx, motDupSugest, setMotDupSugest,
    // Detalhe Modal
    detalheDT, ocorrencias, acompImagens, setAcompImagens, acompTexto, setAcompTexto,
    ocorrListExpanded, setOcorrListExpanded, acompDiaSel, setAcompDiaSel,
    activeTab, setActiveTab, detalheCteComp, setDetalheCteComp,
    detalheMinDcc, setDetalheMinDcc, detalheMinDsc, setDetalheMinDsc,
    detalheSecCteComp, setDetalheSecCteComp, detalheSecDcc, setDetalheSecDcc,
    detalheSecMinDsc, setDetalheSecMinDsc, detalheTemDcc, setDetalheTemDcc,
    salvandoMins, setSalvandoMins, isAdmin, theme, perms, setEditStep,
    diariasData, salvarMinutasDetalhe, acompDias, setAcompDias,
    usuarioLogado, getConexao, supaFetch, ocorrLoading, adicionarOcorrencia, abrirOcorrModal,
    fmtMoeda,
    // Usuario Modal
    usuarios, setUsuarios, usuarioEmailPreview, setUsuarioEmailPreview, enviarEmailBoasVindas,
    // WPP
    wppTipoOpen, setWppTipoOpen, wppSearchTxt, setWppSearchTxt, wppSearchReg, setWppSearchReg,
    buscaResult, wppModal, setWppModal, wppTel, setWppTel, wppPgto, setWppPgto,
    wppValCheque, setWppValCheque, wppValConta, setWppValConta, wppObs, setWppObs,
    wppModal2, setWppModal2, wpp2Ro, setWpp2Ro, wpp2Obs, setWpp2Obs,
    wpp2IncluirObs, setWpp2IncluirObs,
    wppFatModal, setWppFatModal, wppPagModal, setWppPagModal, wppFortes, setWppFortes,
    wppDccMinutas, setWppDccMinutas, wppCteComp, setWppCteComp, wppDscMinutas, setWppDscMinutas,
    wppConfirmModal, setWppConfirmModal, abrirWppPagModal,
    // Dash Drill
    dashDrillModal, setDashDrillModal, parseData, abrirDetalhe,
    // Relatorios
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
    // Ctrl Financeiro
    relCtrlDccOpen, setRelCtrlDccOpen, relCtrlDccFrom, setRelCtrlDccFrom,
    relCtrlDccTo, setRelCtrlDccTo,
    // NFD
    nfdAlertOpen, setNfdAlertOpen, nfdFotos, setNfdFotos, nfdForm, setNfdForm,
    nfdRegistrarOutra, setNfdRegistrarOutra, nfdUploadando, setNfdUploadando,
    // OcorrChegada + OcorrModal
    ocorrChegadaAlert, setOcorrChegadaAlert,
    ocorrModalOpen, setOcorrModalOpen, ocorrModalDT, ocorrModalRecord,
    // Busca Modal
    buscaModalOpen, setBuscaModalOpen, buscaTipo, setBuscaTipo,
    buscaInput, setBuscaInput, setBuscaResult, setBuscaRelacionados,
    buscaError, setBuscaError, historico, buscar, canEdit, connStatus,
    setWppValCheque2: _swvc, setWppValConta2: _swvca, setWppObs2: _swo,
    dtBase, saveJSON,
    // Toast
    toast,
  } = ctx;

  return (
    <>
""" + modal_jsx_dedented + """
    </>
  );
}
"""

# Fix: setWppValCheque2 etc is a naming trick above that won't work — let me just use all names directly
# Rewrite the destructure cleanly without the aliases trick

MODAL_FILE_CLEAN = """\
import React from "react";
import ReportBuilder from '../relatorios/ReportBuilderWrapper.jsx';
import _ModalEditImpl  from './ModalEditWrapper.jsx';
function _renderModalEdit(p) { return React.createElement(_ModalEditImpl, p); }
import ModalMotoristasAdmin  from './ModalMotoristasAdmin.jsx';
import ModalMotoristaImport  from './ModalMotoristaImport.jsx';
import ModalMotorista        from './ModalMotorista.jsx';
import ModalDetalhe          from './ModalDetalhe.jsx';
import ModalUsuario          from './ModalUsuario.jsx';
import ModalConfigDB         from './ModalConfigDB.jsx';
import ModalWhatsApp         from './ModalWhatsApp.jsx';
import ModalNFD              from './ModalNFD.jsx';
import ModalRelatorios       from './ModalRelatorios.jsx';
import ModalCtrlFinanceiro   from './ModalCtrlFinanceiro.jsx';
import ModalBusca            from './ModalBusca.jsx';
import ModalDashDrill        from './ModalDashDrill.jsx';
import ModalOcorrChegada     from './ModalOcorrChegada.jsx';
import OcorrModal            from '../components/OcorrModal.jsx';
import Toast                 from '../components/Toast.jsx';

export default function AppModals({ ctx }) {
  const {
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
    buscaInput, setBuscaInput, setBuscaResult, setBuscaRelacionados,
    buscaError, setBuscaError, historico, buscar, canEdit, connStatus,
    dtBase, saveJSON,
    toast,
  } = ctx;

  return (
    <>
""" + modal_jsx_dedented + """
    </>
  );
}
"""

modal_path = ROOT / "src/modals/AppModals.jsx"
modal_path.write_text(MODAL_FILE_CLEAN, encoding="utf-8")
print(f"AppModals.jsx written: {len(MODAL_FILE_CLEAN.splitlines())} lines")

# ── Patch App.jsx ──

# Replace the modal block with <AppModals ctx={{...}} />
CTX_CALL = """

      <AppModals ctx={{
        reportBuilderOpen, setReportBuilderOpen, DADOS, motoristas, apontItems, sgsItems,
        t, DESIGN, isMobile, hIco, hexRgb, css, fmtMoeda,
        formData, setFormData, modalOpen, setModalOpen, editIdx, setEditIdx,
        excluirConfirm, setExcluirConfirm, excluirTexto, setExcluirTexto,
        canFin, brToInput, brToInputDT, inputToBr, inputToBrDT,
        setNfdForm, setNfdFotos, setNfdAlertOpen, setOcorrChegadaAlert,
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
        buscaInput, setBuscaInput, setBuscaResult, setBuscaRelacionados,
        buscaError, setBuscaError, historico, buscar, canEdit, connStatus,
        dtBase, saveJSON,
        toast,
      }} />"""

content = content[:idx_start] + CTX_CALL + content[idx_end:]

app.write_text(content, encoding="utf-8")
print("App.jsx patched")
print(f"New line count: {len(content.splitlines())}")
