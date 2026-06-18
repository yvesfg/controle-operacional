import { useState } from "react";

export function useDiariasState() {
  const [dFiltro, setDFiltro]               = useState("todos");
  const [dSubTab, setDSubTab]               = useState("resumo");
  const [dPlanFiltroAno, setDPlanFiltroAno] = useState(()=>String(new Date().getFullYear()));
  const [dPlanFiltroMes, setDPlanFiltroMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [dPlanFiltroOrigem, setDPlanFiltroOrigem] = useState("todas");
  const [dPlanFiltroIni, setDPlanFiltroIni] = useState("");
  const [dPlanFiltroFim, setDPlanFiltroFim] = useState("");

  return {
    dFiltro, setDFiltro, dSubTab, setDSubTab,
    dPlanFiltroAno, setDPlanFiltroAno, dPlanFiltroMes, setDPlanFiltroMes,
    dPlanFiltroOrigem, setDPlanFiltroOrigem, dPlanFiltroIni, setDPlanFiltroIni,
    dPlanFiltroFim, setDPlanFiltroFim,
  };
}
