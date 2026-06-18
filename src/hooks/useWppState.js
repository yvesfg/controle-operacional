import { useState } from "react";
import { loadJSON } from "../utils.js";

export function useWppState() {
  // WhatsApp contratação
  const [wppModal, setWppModal] = useState(null);
  const [wppTel, setWppTel] = useState("");
  const [wppPgto, setWppPgto] = useState("cheque");
  const [wppValCheque, setWppValCheque] = useState("");
  const [wppValConta, setWppValConta] = useState("");
  const [wppObs, setWppObs] = useState("");

  // WhatsApp documentário (formato 2)
  const [wppModal2, setWppModal2] = useState(null);
  const [wpp2Ro, setWpp2Ro] = useState("");
  const [wpp2Obs, setWpp2Obs] = useState(() => loadJSON("co_wpp2_obs_last", ""));
  const [wpp2IncluirObs, setWpp2IncluirObs] = useState(false);
  const [wpp2Conflitos, setWpp2Conflitos] = useState([]);

  // WhatsApp tipo selector + outros modais
  const [wppTipoOpen, setWppTipoOpen] = useState(false);
  const [wppSearchTxt, setWppSearchTxt] = useState("");
  const [wppSearchReg, setWppSearchReg] = useState(null);
  const [wppFatModal, setWppFatModal] = useState(null);
  const [wppPagModal, setWppPagModal] = useState(null);
  const [wppConfirmModal, setWppConfirmModal] = useState(null);
  const [wppFortes, setWppFortes] = useState(false);

  // DCC Minutas e Descarga
  const _initDcc = () => [{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}];
  const [wppDccMinutas, setWppDccMinutas] = useState(_initDcc());
  const [wppCteComp, setWppCteComp] = useState({cte:"",mdf:"",mat:""});
  const _initDsc = () => [{tipo:"MAM",cte:"",mdf:"",num:""}];
  const [wppDscMinutas, setWppDscMinutas] = useState(_initDsc());

  return {
    wppModal, setWppModal, wppTel, setWppTel, wppPgto, setWppPgto,
    wppValCheque, setWppValCheque, wppValConta, setWppValConta, wppObs, setWppObs,
    wppModal2, setWppModal2, wpp2Ro, setWpp2Ro, wpp2Obs, setWpp2Obs,
    wpp2IncluirObs, setWpp2IncluirObs, wpp2Conflitos, setWpp2Conflitos,
    wppTipoOpen, setWppTipoOpen, wppSearchTxt, setWppSearchTxt, wppSearchReg, setWppSearchReg,
    wppFatModal, setWppFatModal, wppPagModal, setWppPagModal, wppConfirmModal, setWppConfirmModal,
    wppFortes, setWppFortes, wppDccMinutas, setWppDccMinutas, wppCteComp, setWppCteComp,
    wppDscMinutas, setWppDscMinutas,
  };
}
