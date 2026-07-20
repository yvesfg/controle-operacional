import { useState } from "react";

export function usePlanilhaState() {
  const [planilhaSortKey, setPlanilhaSortKey]               = useState(null);
  const [planilhaSortDir, setPlanilhaSortDir]               = useState("asc");
  const [planilhaPagina, setPlanilhaPagina]                 = useState(1);
  const [planilhaFiltroAno, setPlanilhaFiltroAno]           = useState(()=>String(new Date().getFullYear()));
  const [planilhaFiltroMes, setPlanilhaFiltroMes]           = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [planilhaFiltroOrigem, setPlanilhaFiltroOrigem]     = useState("todas");
  const [planilhaFiltroDataDe, setPlanilhaFiltroDataDe]     = useState("");
  const [planilhaFiltroDataAte, setPlanilhaFiltroDataAte]   = useState("");
  const [planilhaFiltroStatus, setPlanilhaFiltroStatus]     = useState("");
  const [planilhaFiltroDestino, setPlanilhaFiltroDestino]   = useState("");
  const [planilhaFiltroContratante, setPlanilhaFiltroContratante] = useState("");
  const [planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora] = useState("");
  const [planilhaBusca, setPlanilhaBusca]                   = useState("");

  return {
    planilhaSortKey, setPlanilhaSortKey,
    planilhaSortDir, setPlanilhaSortDir,
    planilhaPagina, setPlanilhaPagina,
    planilhaFiltroAno, setPlanilhaFiltroAno,
    planilhaFiltroMes, setPlanilhaFiltroMes,
    planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
    planilhaFiltroDataDe, setPlanilhaFiltroDataDe,
    planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
    planilhaFiltroStatus, setPlanilhaFiltroStatus,
    planilhaFiltroDestino, setPlanilhaFiltroDestino,
    planilhaFiltroContratante, setPlanilhaFiltroContratante,
    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,
    planilhaBusca, setPlanilhaBusca,
  };
}
