import { useState, useRef } from "react";

export function useDashboardState() {
  const [dashMes, setDashMes]               = useState(()=>String(new Date().getMonth()+1).padStart(2,"0")+"/"+new Date().getFullYear());
  const [dashOrigem, setDashOrigem]         = useState("todos");
  const [dashChartType, setDashChartType]   = useState("bar");
  const [dashGroupBy, setDashGroupBy]       = useState("mes");
  const [dashDrillModal, setDashDrillModal] = useState(null);
  const [dashHeroTab, setDashHeroTab]       = useState("carr");
  const [dashRecentesN, setDashRecentesN]   = useState(8);
  const dashRecCardRef                       = useRef(null);

  return {
    dashMes, setDashMes, dashOrigem, setDashOrigem,
    dashChartType, setDashChartType, dashGroupBy, setDashGroupBy,
    dashDrillModal, setDashDrillModal, dashHeroTab, setDashHeroTab,
    dashRecentesN, setDashRecentesN, dashRecCardRef,
  };
}
