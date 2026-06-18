import { useState } from "react";
import { loadJSON } from "../utils.js";

export function useOperacionalState() {
  const [operSubTab, setOperSubTab] = useState("sgs");
  const [filtroOcorr, setFiltroOcorr] = useState(null);

  // SGS
  const [sgsItems, setSgsItems] = useState(() => loadJSON("co_sgs", []));
  const [sgsFormOpen, setSgsFormOpen] = useState(false);
  const [sgsForm, setSgsForm] = useState({numero:"", data_chamado:"", ultimo_retorno:"", descricao:"", dt_rel:"", status:"aberto"});
  const [expandedSgsId, setExpandedSgsId] = useState(null);
  const [sgsRetornoForm, setSgsRetornoForm] = useState({data:"", descricao:""});

  // Apontamentos
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

  return {
    operSubTab, setOperSubTab, filtroOcorr, setFiltroOcorr,
    sgsItems, setSgsItems, sgsFormOpen, setSgsFormOpen, sgsForm, setSgsForm,
    expandedSgsId, setExpandedSgsId, sgsRetornoForm, setSgsRetornoForm,
    apontItems, setApontItems, apontFormOpen, setApontFormOpen,
    apontLoading, setApontLoading, apontForm, setApontForm,
  };
}
