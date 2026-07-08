import React from "react";
import PainelFinanceiro from "./PainelFinanceiro.jsx";
import Resultado from "./Resultado.jsx";
import CreditosPendentes from "./CreditosPendentes.jsx";

const LS_TAB  = "co_fin_tab";

export default function FinanceiroView({ ctx }) {
  const { activeTab, t, DESIGN, css } = ctx;
  if (activeTab !== "financeiro") return null;

  const [finTab, setFinTabRaw] = React.useState(() => localStorage.getItem(LS_TAB) || "painel");

  const setFinTab = (v) => { setFinTabRaw(v); localStorage.setItem(LS_TAB, v); };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Top bar com tabs — seletor de base fica só no topbar global ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 16px 0",
        gap: 6,
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {tabBtn("painel", "Painel Financeiro")}
        {tabBtn("resultado", "Resultado")}
        {tabBtn("creditos", "Créditos Pendentes")}
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {finTab === "painel" && (
          <PainelFinanceiro ctx={{ ...ctx, activeTab: "painel_financeiro" }} />
        )}
        {finTab === "resultado" && (
          <Resultado ctx={{ ...ctx, activeTab: "resultado" }} />
        )}
        {finTab === "creditos" && (
          <CreditosPendentes ctx={{ ...ctx, activeTab: "creditos_pendentes" }} />
        )}
      </div>
    </div>
  );
}
