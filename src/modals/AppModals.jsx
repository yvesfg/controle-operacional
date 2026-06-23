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
import ModalDocIntake        from '../components/ModalDocIntake.jsx';
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
    buscaInput, setBuscaInput, setBuscaResult, buscaRelacionados, setBuscaRelacionados,
    buscaError, setBuscaError, historico, buscar, canEdit, connStatus,
    dtBase, saveJSON,
    docIntakeOpen, setDocIntakeOpen, docIntakeTipo, docIntakeCallback, setDocIntakeCallback,
    openDocIntake,
    toast,
  } = ctx;

  return (
    <>


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

<ModalDocIntake
  open={!!docIntakeOpen}
  tipo={docIntakeTipo || "crlv"}
  onClose={() => { setDocIntakeOpen(false); setDocIntakeCallback(null); }}
  onConfirm={(data) => {
    docIntakeCallback?.(data);
    setDocIntakeOpen(false);
    setDocIntakeCallback(null);
  }}
  ctx={{ t, css, hIco, showToast }}
/>

<Toast {...toast} />
    </>
  );
}
