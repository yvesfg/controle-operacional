import React from "react";
import PainelFinanceiro from "./PainelFinanceiro.jsx";
import Resultado from "./Resultado.jsx";
import CreditosPendentes from "./CreditosPendentes.jsx";

const LS_TAB  = "co_fin_tab";
const LS_BASE = "co_fin_base";

export default function FinanceiroView({ ctx }) {
  const { activeTab, t, DESIGN, css } = ctx;
  if (activeTab !== "financeiro") return null;

  const [finTab, setFinTabRaw] = React.useState(() => localStorage.getItem(LS_TAB) || "painel");
  const [finBase, setFinBaseRaw] = React.useState(() => localStorage.getItem(LS_BASE) || "atual");

  const setFinTab = (v) => { setFinTabRaw(v); localStorage.setItem(LS_TAB, v); };
  const setFinBase = (v) => { setFinBaseRaw(v); localStorage.setItem(LS_BASE, v); };

  const tabBtn = (key, label) => {
    const active = finTab === key;
    return (
      <button
        key={key}
        onClick={() => setFinTab(key)}
        style={{
          padding: "7px 18px",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: DESIGN?.fnt?.b || "inherit",
          cursor: "pointer",
          borderRadius: 8,
          border: `1px solid ${active ? t.azulLt : t.borda}`,
          background: active ? t.azulLt : "transparent",
          color: active ? "#fff" : t.txt2,
          transition: "all .15s",
        }}
      >
        {label}
      </button>
    );
  };

  const baseBtn = (key, label) => {
    const active = finBase === key;
    return (
      <button
        key={key}
        onClick={() => setFinBase(key)}
        style={{
          padding: "5px 14px",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: DESIGN?.fnt?.b || "inherit",
          cursor: "pointer",
          borderRadius: 20,
          border: `1px solid ${active ? t.txt : "transparent"}`,
          background: active ? t.txt : t.card2,
          color: active ? t.bg : t.txt2,
          transition: "all .15s",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Top bar com tabs + seletor de base ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px 0",
        gap: 12,
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {tabBtn("painel", "Painel Financeiro")}
          {tabBtn("resultado", "Resultado / Cobranças")}
        </div>

        {finTab === "resultado" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: t.txt2, fontFamily: DESIGN?.fnt?.b }}>Visão:</span>
            {baseBtn("atual", "Base atual")}
            {baseBtn("todas", "Todas as filiais")}
          </div>
        )}
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {finTab === "painel" && (
          <PainelFinanceiro ctx={{ ...ctx, activeTab: "painel_financeiro" }} />
        )}
        {finTab === "resultado" && finBase === "atual" && (
          <Resultado ctx={{ ...ctx, activeTab: "resultado" }} />
        )}
        {finTab === "resultado" && finBase === "todas" && (
          <CreditosPendentes ctx={{ ...ctx, activeTab: "creditos_pendentes" }} />
        )}
      </div>
    </div>
  );
}
