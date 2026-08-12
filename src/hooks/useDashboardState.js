import { useState, useRef } from "react";
import { periodoMes, mesAtual } from "../periodoDash.js";

export function useDashboardState() {
  // Fonte de verdade do recorte do Dashboard. O antigo `dashMes` continua existindo,
  // mas derivado deste objeto (App.jsx) — assim o <select> de mês e o seletor de
  // período não viram dois filtros brigando pelo mesmo resultado.
  const [dashPeriodo, setDashPeriodo]       = useState(() => periodoMes(mesAtual()));
  const [dashOrigem, setDashOrigem]         = useState("todos");
  const [dashChartType, setDashChartType]   = useState("bar");
  const [dashGroupBy, setDashGroupBy]       = useState("mes");
  const [dashDrillModal, setDashDrillModal] = useState(null);
  const [dashHeroTab, setDashHeroTab]       = useState("carr");
  const [dashRecentesN, setDashRecentesN]   = useState(8);
  const dashRecCardRef                       = useRef(null);

  return {
    dashPeriodo, setDashPeriodo, dashOrigem, setDashOrigem,
    dashChartType, setDashChartType, dashGroupBy, setDashGroupBy,
    dashDrillModal, setDashDrillModal, dashHeroTab, setDashHeroTab,
    dashRecentesN, setDashRecentesN, dashRecCardRef,
  };
}
