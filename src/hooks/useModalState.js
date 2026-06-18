import { useState } from "react";

export function useModalState() {
  // Modal base
  const [modalOpen, setModalOpen] = useState(null);
  const [editIdx, setEditIdx] = useState(-1);
  const [editStep, setEditStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [excluirConfirm, setExcluirConfirm] = useState(null);
  const [excluirTexto, setExcluirTexto] = useState("");

  // Detalhe / Ocorrências
  const [detalheDT, setDetalheDT] = useState(null);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [novaOcorr, setNovaOcorr] = useState("");
  const [novaOcorrTipo, setNovaOcorrTipo] = useState("info");
  const [ocorrLoading, setOcorrLoading] = useState(false);
  const [ocorrListExpanded, setOcorrListExpanded] = useState(false);
  const [ocorrModalOpen, setOcorrModalOpen] = useState(false);
  const [ocorrModalDT, setOcorrModalDT] = useState(null);
  const [ocorrModalRecord, setOcorrModalRecord] = useState(null);
  const [ocorrModalList, setOcorrModalList] = useState([]);
  const [ocorrModalLoading, setOcorrModalLoading] = useState(false);
  const [ocorrModalExpanded, setOcorrModalExpanded] = useState(false);
  const [ocorrModalNova, setOcorrModalNova] = useState("");
  const [ocorrModalTipo, setOcorrModalTipo] = useState("info");

  // Minutas no modal de detalhe
  const [detalheMinDcc, setDetalheMinDcc] = useState([{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}]);
  const [detalheCteComp, setDetalheCteComp] = useState({cte:"",mdf:"",mat:""});
  const [detalheMinDsc, setDetalheMinDsc] = useState([{tipo:"MAM",cte:"",mdf:"",num:""}]);
  const [salvandoMins, setSalvandoMins] = useState(false);
  const [detalheTemDcc, setDetalheTemDcc] = useState(null);
  const [detalheSecDcc, setDetalheSecDcc] = useState(true);
  const [detalheSecCteComp, setDetalheSecCteComp] = useState(false);
  const [detalheSecMinDsc, setDetalheSecMinDsc] = useState(true);

  // NFD — Nota de Devolução
  const [nfdAlertOpen, setNfdAlertOpen] = useState(false);
  const [nfdForm, setNfdForm] = useState({numero:"",valor:"",tipo:"avaria",nfs:"",localizacao:""});
  const [nfdFotos, setNfdFotos] = useState([]);
  const [nfdUploadando, setNfdUploadando] = useState(false);
  const [nfdRegistrarOutra, setNfdRegistrarOutra] = useState(false);
  const [ocorrChegadaAlert, setOcorrChegadaAlert] = useState(false);

  // Acompanhamento dia a dia da DT
  const [acompDias, setAcompDias] = useState([]);
  const [acompDiaSel, setAcompDiaSel] = useState(null);
  const [acompTexto, setAcompTexto] = useState("");
  const [acompImagens, setAcompImagens] = useState([]);

  return {
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
  };
}
