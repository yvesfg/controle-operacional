import React from "react";
import PainelFinanceiro from "./PainelFinanceiro.jsx";
import Resultado from "./Resultado.jsx";
import CreditosPendentes from "./CreditosPendentes.jsx";

const LS_TAB  = "co_fin_tab";

export default function FinanceiroView({ ctx }) {
  const { activeTab, t, DESIGN, css, baseAtual } = ctx;
  if (activeTab !== "financeiro") return null;

  const [finTab, setFinTabRaw] = React.useState(() => localStorage.getItem(LS_TAB) || "painel");

  const setFinTab = (v) => { setFinTabRaw(v); localStorage.setItem(LS_TAB, v); };

  // Mês de referência e "incluir complementar" compartilhados entre Painel Financeiro e
  // Resultado — antes cada aba tinha seu próprio estado e trocar de aba resetava a seleção,
  // podendo mostrar números "diferentes" pro mesmo período (achado de auditoria).
  const [mesRefFin, setMesRefFin] = React.useState("");
  const baseId = baseAtual?.id;
  const [incluirCompFin, setIncluirCompFin] = React.useState(baseId === "imperatriz_belem");
  React.useEffect(() => { setIncluirCompFin(baseId === "imperatriz_belem"); }, [baseId]);

  // Navegação Resultado → Créditos Pendentes (achado de auditoria: "indevidas aguardando
  // crédito" existia duplicado nas duas telas; agora Resultado só resume e linka pra cá,
  // com filtro de filial pré-selecionado quando dá pra mapear 1:1 a partir da base atual).
  const [filtroFilialInicial, setFiltroFilialInicial] = React.useState(null);
  const irParaCreditos = (filial) => { setFiltroFilialInicial(filial || null); setFinTab("creditos"); };

  // Faixa única: o segmentado Operacional/Faturamento (antes dentro do Resultado) sobe pra
  // cá, e os filtros da sub-tela são portalizados pro slot — tudo na mesma linha da nav.
  const [segmento, setSegmento] = React.useState("operacional");
  const [toolbarEl, setToolbarEl] = React.useState(null);

  const finCtx = { ...ctx, mesRefFin, setMesRefFin, incluirCompFin, setIncluirCompFin, irParaCreditos, segmento, setSegmento, filaSlot: toolbarEl };

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

        {/* Segmentado Operacional/Faturamento — só na aba Resultado, na mesma faixa */}
        {finTab === "resultado" && (
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 9, background: t.card2, border: `1px solid ${t.borda}` }}>
            {[["operacional", "Operacional"], ["faturamento", "Conferência de Faturamento"]].map(([id, label]) => (
              <button key={id} onClick={() => setSegmento(id)}
                style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 12px", borderRadius: 7, cursor: "pointer", border: "none",
                  background: segmento === id ? "var(--accent)" : "transparent",
                  color: segmento === id ? (t.onPrimary || "#181a20") : t.txt2 }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Slot pros filtros da sub-tela (portalizados) — display:contents faz virarem itens da faixa */}
        <div ref={setToolbarEl} style={{ display: "contents" }} />
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {finTab === "painel" && (
          <PainelFinanceiro ctx={{ ...finCtx, activeTab: "painel_financeiro" }} />
        )}
        {finTab === "resultado" && (
          <Resultado ctx={{ ...finCtx, activeTab: "resultado" }} />
        )}
        {finTab === "creditos" && (
          <CreditosPendentes ctx={{ ...ctx, activeTab: "creditos_pendentes", filtroFilialInicial }} />
        )}
      </div>
    </div>
  );
}
