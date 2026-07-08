import { useState } from "react";

export function useDescargaState() {
  const [extratoRows, setExtratoRows]               = useState([]);
  const [extratoFileName, setExtratoFileName]       = useState(null);
  const [prevExtratoSnap, setPrevExtratoSnap]       = useState(null);
  const [extratoSheetInfo, setExtratoSheetInfo]     = useState(null);
  const [extratoFiltro, setExtratoFiltro]           = useState("todos");
  const [extratoDataIni, setExtratoDataIni]         = useState("");
  const [extratoDataFim, setExtratoDataFim]         = useState("");

  const [dscTab, setDscTab]                         = useState("hoje");
  const [dscFiltroAno, setDscFiltroAno]             = useState(()=>String(new Date().getFullYear()));
  const [dscFiltroMes, setDscFiltroMes]             = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [dscFiltroOrigem, setDscFiltroOrigem]       = useState("todas");
  const [dscFiltroIni, setDscFiltroIni]             = useState("");
  const [dscFiltroFim, setDscFiltroFim]             = useState("");
  const [dscData, setDscData]                       = useState(new Date().toISOString().slice(0,10));
  const [dscMostrarAntigos, setDscMostrarAntigos]   = useState(false);

  const [rodorricaRows, setRodorricaRows]             = useState([]);
  const [rodorricaFileName, setRodorricaFileName]     = useState(null);
  const [prevRodorricaSnap, setPrevRodorricaSnap]     = useState(null);
  const [rodorricaSheetInfo, setRodorricaSheetInfo]   = useState(null);
  const [rodorricaFiltro, setRodorricaFiltro]         = useState("todos");
  const [rodorricaPeriodoIni, setRodorricaPeriodoIni] = useState("");
  const [rodorricaPeriodoFim, setRodorricaPeriodoFim] = useState("");
  const [rodorricaPeriodoModal, setRodorricaPeriodoModal] = useState(false);

  return {
    extratoRows, setExtratoRows, extratoFileName, setExtratoFileName,
    prevExtratoSnap, setPrevExtratoSnap, extratoSheetInfo, setExtratoSheetInfo,
    extratoFiltro, setExtratoFiltro, extratoDataIni, setExtratoDataIni, extratoDataFim, setExtratoDataFim,
    dscTab, setDscTab, dscFiltroAno, setDscFiltroAno, dscFiltroMes, setDscFiltroMes,
    dscFiltroOrigem, setDscFiltroOrigem, dscFiltroIni, setDscFiltroIni, dscFiltroFim, setDscFiltroFim,
    dscData, setDscData, dscMostrarAntigos, setDscMostrarAntigos,
    rodorricaRows, setRodorricaRows, rodorricaFileName, setRodorricaFileName,
    prevRodorricaSnap, setPrevRodorricaSnap, rodorricaSheetInfo, setRodorricaSheetInfo,
    rodorricaFiltro, setRodorricaFiltro, rodorricaPeriodoIni, setRodorricaPeriodoIni,
    rodorricaPeriodoFim, setRodorricaPeriodoFim, rodorricaPeriodoModal, setRodorricaPeriodoModal,
  };
}
