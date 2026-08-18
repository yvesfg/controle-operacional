import React from "react";
import { createRoot } from "react-dom/client";
import "./design-system/tokens.css";
import "./design-system/theme-dark.css";
import "./design-system/theme-light.css";
import "./design-system/components.css";
import "./design-system/layout.css";
import { themes } from "./constants.js";
import KpiCard from "./components/KpiCard.jsx";
import GradeEditavel from "./components/GradeEditavel.jsx";

const t = themes.dark;
const KPIS = [
  { id: "hero", label: "Carregamentos", value: "49", sub: "no período" },
  { id: "eficiencia", label: "Taxa Eficiência", value: "100%", sub: "49 carregados" },
  { id: "dts", label: "DTs Únicas", value: "49", sub: "documentos" },
  { id: "motoristas", label: "Motoristas Ativos", value: "37", sub: "de 848 cadastrados" },
  { id: "cte_medio", label: "CTE Médio/Viagem", value: "R$7.9k", sub: "por carregamento" },
  { id: "alertas", label: "Alertas Ativos", value: "9", sub: "atenção necessária" },
];

function App() {
  const [cfg, setCfg] = React.useState({});
  const [editando, setEditando] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const nCols = KPIS.filter(k => cfg?.kpis?.[k.id] !== false).length || 1;
  return (
    <div style={{ padding: 24, background: t.bg, minHeight: "100vh" }}>
      <button id="toggle" onClick={() => setEditando(v => !v)}
        style={{ marginBottom: 14, padding: "6px 12px", cursor: "pointer", background: t.card2, color: t.txt, border: `1px solid ${t.borda}`, borderRadius: 8 }}>
        {editando ? "Concluir" : "Organizar painel"}
      </button>
      <pre id="cfg" style={{ color: t.txt2, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(cfg)}</pre>
      <GradeEditavel
        tipo="kpis" cfg={cfg} editando={editando} onSalvar={setCfg} t={t} isMobile={isMobile}
        gridStyle={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : `repeat(${nCols},1fr)`, gap: isMobile ? 6 : 10, marginBottom: 14 }}
        itens={KPIS.map(k => ({
          id: k.id, label: k.label,
          node: <KpiCard label={k.label} value={k.value} sub={k.sub} compact={isMobile} />,
        }))}
      />
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
