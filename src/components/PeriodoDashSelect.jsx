// src/components/PeriodoDashSelect.jsx
// Seletor de período do Dashboard: mês (padrão), trimestre, ano ou intervalo livre.
// Fica ao lado do <select> de mês — o mês continua sendo o caminho de 1 clique e o
// popover é o caminho de quem precisa de "01 a 12 de agosto".
// Tokens do design system (DESIGN.md) — sem hex solto aqui.
import React from "react";
import { periodoMes, periodoTrimestre, periodoAno, periodoLivre, dISO, isoDe } from "../periodoDash.js";

const btn = {
  background: "var(--card2, var(--card))",
  border: "1px solid var(--border)",
  color: "var(--text2)",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  padding: "0 8px",
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
};
const inp = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  padding: "5px 7px",
  borderRadius: 6,
  fontSize: 11,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-mono)",
};
const rotulo = {
  fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "var(--text3)", fontWeight: 400,
};

export default function PeriodoDashSelect({ value, onChange, ativo }) {
  const [aberto, setAberto] = React.useState(false);
  const hoje = new Date();
  const [de,  setDe]  = React.useState(value?.inicio  || isoDe(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [ate, setAte] = React.useState(value?.fim     || isoDe(hoje));

  const escolher = (p) => { onChange(p); setAberto(false); };
  const ano = value?.tipo === "mes"
    ? Number(String(value.mes).split("/")[1]) || hoje.getFullYear()
    : (dISO(value?.inicio)?.getFullYear() || hoje.getFullYear());

  // <input type="month"> fala "YYYY-MM"; o app fala "MM/YYYY".
  const mesInput = value?.tipo === "mes"
    ? String(value.mes).split("/").reverse().join("-")
    : "";

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setAberto(a => !a)}
        title="Escolher período (mês, trimestre, ano ou intervalo)"
        style={{
          ...btn,
          border: `1.5px solid ${ativo ? "var(--accent)" : "var(--border)"}`,
          color: ativo ? "var(--accent)" : "var(--text2)",
          fontWeight: 700,
        }}
      >
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Período <span style={{ fontSize: 8, opacity: .7 }}>▾</span>
      </button>

      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", top: 32, left: 0, zIndex: 91, width: 250,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)", padding: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,.45)",
          }}>
            <div style={rotulo}>Mês</div>
            <input type="month" style={{ ...inp, marginTop: 6 }} value={mesInput}
              onChange={e => {
                const v = e.target.value;
                if (!v) return;
                const [a, m] = v.split("-");
                escolher(periodoMes(`${m}/${a}`));
              }} />

            <div style={{ ...rotulo, marginTop: 12 }}>Trimestre</div>
            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
              {[1, 2, 3, 4].map(q => (
                <button key={q} onClick={() => escolher(periodoTrimestre(ano, q))} style={{ ...btn, flex: 1, padding: 0 }}>{q}º</button>
              ))}
            </div>

            <div style={{ ...rotulo, marginTop: 12 }}>Ano</div>
            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
              {[ano - 1, ano].map(a => (
                <button key={a} onClick={() => escolher(periodoAno(a))} style={{ ...btn, flex: 1, padding: 0 }}>{a}</button>
              ))}
              <button onClick={() => escolher({ tipo: "todos" })} style={{ ...btn, flex: 1, padding: 0 }}>Todos</button>
            </div>

            <div style={{ ...rotulo, marginTop: 12 }}>Intervalo</div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 6 }}>
              <input type="date" style={inp} value={de} onChange={e => setDe(e.target.value)} />
              <span style={{ color: "var(--text3)", fontSize: 10 }}>a</span>
              <input type="date" style={inp} value={ate} onChange={e => setAte(e.target.value)} />
            </div>
            <button
              onClick={() => de && ate && escolher(periodoLivre(de < ate ? de : ate, de < ate ? ate : de))}
              style={{ ...btn, width: "100%", marginTop: 8, height: 28, background: "var(--accent)", color: "var(--color-text-inverse)", border: "none", fontWeight: 700 }}
            >Aplicar intervalo</button>
          </div>
        </>
      )}
    </div>
  );
}
