// src/components/PeriodoModal.jsx
// Seletor de período do app inteiro. Antes cada tela tinha o seu: o Dashboard com
// <select> de mês + popover, o Financeiro com outro <select>, o Resultado com um
// terceiro — três controles para a mesma pergunta, e nenhum deles com atalho de
// "mês passado" ou "últimos 30 dias".
//
// A tela não descreve o controle, descreve os DADOS que tem:
//   modo="mes"       → só mês (Financeiro: despesa grava mes_ref, intervalo não fecha)
//   modo="completo"  → mês, trimestre, ano, intervalo livre (Dashboard)
//   meses={[...]}    → meses que realmente têm dado; o resto do calendário fica apagado
//
// O valor entra e sai no formato de periodoDash.js — quem fala "YYYY-MM" converte
// na borda com mesRefDe/periodoDeMesRef, sem mudar a lógica de quem consome.
//
// Tokens do design system (DESIGN.md) — sem hex solto aqui.
import React from "react";
import useModalEsc from "../hooks/useModalEsc.js";
import {
  periodoMes, periodoTrimestre, periodoAno, periodoLivre, periodoMesAnterior,
  periodoUltimosDias, rotuloPeriodo, mesAtual, triDe, isoDe, dISO,
  MESES_CURTOS, PERIODO_TODOS,
} from "../periodoDash.js";

const btn = {
  background: "var(--card2)",
  border: "1px solid var(--border2)",
  color: "var(--text2)",
  borderRadius: "var(--radius-btn, 6px)",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  padding: "0 10px",
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  whiteSpace: "nowrap",
};
const btnOn = {
  ...btn,
  background: "var(--color-primary-bg)",
  border: "1px solid var(--color-primary-border)",
  color: "var(--accent)",
  fontWeight: 700,
};
const rotulo = {
  fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "var(--text3)", fontWeight: 400, marginBottom: 7,
};
const inp = {
  background: "var(--color-input-bg)",
  border: "1px solid var(--border2)",
  color: "var(--text)",
  padding: "6px 8px",
  borderRadius: "var(--radius-btn, 6px)",
  fontSize: 11.5,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-mono)",
  colorScheme: "dark",
};

const CalIco = ({ s = 11 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Aceita "MM/YYYY" (Dashboard) e "YYYY-MM" (Financeiro) na mesma prop.
const normMes = (m) => {
  const s = String(m || "");
  if (/^\d{4}-\d{2}$/.test(s)) return s.split("-").reverse().join("/");
  return s;
};

export function PeriodoModal({ aberto, onFechar, value, onChange, modo = "completo", meses, titulo = "Período" }) {
  const hoje = new Date();
  const soMes = modo === "mes";
  const comDado = React.useMemo(
    () => (Array.isArray(meses) && meses.length ? new Set(meses.map(normMes)) : null),
    [meses]
  );

  // Ano que o calendário está mostrando. Abre no ano do período selecionado.
  const anoDoValor = value?.tipo === "mes"
    ? Number(String(value.mes).split("/")[1])
    : dISO(value?.inicio)?.getFullYear();
  const [ano, setAno] = React.useState(anoDoValor || hoje.getFullYear());
  const [de, setDe] = React.useState(value?.inicio || isoDe(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [ate, setAte] = React.useState(value?.fim || isoDe(hoje));

  // Reabrir depois de trocar de período deve mostrar o ano do período atual, não
  // o ano que ficou de uma navegação anterior.
  React.useEffect(() => { if (aberto) setAno(anoDoValor || hoje.getFullYear()); }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  useModalEsc(aberto, onFechar);
  if (!aberto) return null;

  const escolher = (p) => { onChange(p); onFechar(); };
  const mesSel = value?.tipo === "mes" ? value.mes : null;

  const atalhos = soMes
    ? [
        ["Este mês", () => periodoMes(mesAtual())],
        ["Mês passado", () => periodoMesAnterior()],
      ]
    : [
        ["Este mês", () => periodoMes(mesAtual())],
        ["Mês passado", () => periodoMesAnterior()],
        ["Últimos 7 dias", () => periodoUltimosDias(7)],
        ["Últimos 30 dias", () => periodoUltimosDias(30)],
        ["Trimestre atual", () => periodoTrimestre(hoje.getFullYear(), triDe(hoje))],
        ["Este ano", () => periodoAno(hoje.getFullYear())],
        ["Tudo", () => PERIODO_TODOS],
      ];

  const anoNav = (d) => (
    <button onClick={() => setAno((a) => a + d)} style={{ ...btn, width: 30, padding: 0 }}
      title={d < 0 ? "Ano anterior" : "Próximo ano"}>{d < 0 ? "‹" : "›"}</button>
  );

  return (
    <>
      <div onClick={onFechar} style={{
        position: "fixed", inset: 0, zIndex: 800,
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)",
      }} />
      <div role="dialog" aria-label={titulo} style={{
        position: "fixed", zIndex: 801, top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(94vw, 420px)", maxHeight: "88vh", overflowY: "auto",
        background: "var(--color-modal-bg)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-card, 12px)", padding: 16,
        boxShadow: "0 18px 48px var(--color-shadow)",
      }}>
        {/* ── Cabeçalho ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ color: "var(--accent)", display: "flex" }}><CalIco s={14} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{titulo}</div>
            <div style={{ fontSize: 10.5, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
              Selecionado: {rotuloPeriodo(value)}
            </div>
          </div>
          <button onClick={onFechar} style={{ ...btn, width: 30, padding: 0, fontSize: 14 }} title="Fechar">✕</button>
        </div>

        {/* ── Atalhos ── */}
        <div style={rotulo}>Atalhos</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {atalhos.map(([label, fn]) => {
            const p = fn();
            const igual = rotuloPeriodo(p) === rotuloPeriodo(value);
            return (
              <button key={label} onClick={() => escolher(p)} style={igual ? btnOn : btn}>{label}</button>
            );
          })}
        </div>

        {/* ── Calendário de meses ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <div style={{ ...rotulo, marginBottom: 0 }}>Mês</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {anoNav(-1)}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text)", minWidth: 34, textAlign: "center" }}>{ano}</span>
            {anoNav(1)}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 16 }}>
          {MESES_CURTOS.map((nome, i) => {
            const mm = `${String(i + 1).padStart(2, "0")}/${ano}`;
            const vazio = comDado ? !comDado.has(mm) : false;
            const sel = mesSel === mm;
            return (
              <button key={mm} onClick={() => escolher(periodoMes(mm))} disabled={vazio}
                title={vazio ? "Sem dados neste mês" : mm}
                style={{
                  ...(sel ? btnOn : btn), padding: 0, height: 32, textTransform: "capitalize",
                  opacity: vazio ? 0.32 : 1, cursor: vazio ? "not-allowed" : "pointer",
                }}>
                {nome}
              </button>
            );
          })}
        </div>

        {!soMes && (
          <>
            {/* ── Trimestre / ano ── */}
            <div style={rotulo}>Trimestre de {ano}</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
              {[1, 2, 3, 4].map((q) => {
                const p = periodoTrimestre(ano, q);
                return (
                  <button key={q} onClick={() => escolher(p)} style={{ ...(rotuloPeriodo(value) === p.rotulo ? btnOn : btn), flex: 1, padding: 0 }}>
                    {q}º tri
                  </button>
                );
              })}
              <button onClick={() => escolher(periodoAno(ano))}
                style={{ ...(rotuloPeriodo(value) === String(ano) ? btnOn : btn), flex: 1, padding: 0 }}>
                {ano}
              </button>
            </div>

            {/* ── Intervalo livre ── */}
            <div style={rotulo}>Intervalo</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="date" style={inp} value={de} onChange={(e) => setDe(e.target.value)} aria-label="Data inicial" />
              <span style={{ color: "var(--text3)", fontSize: 11 }}>a</span>
              <input type="date" style={inp} value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Data final" />
            </div>
            <button
              onClick={() => de && ate && escolher(periodoLivre(de < ate ? de : ate, de < ate ? ate : de))}
              disabled={!de || !ate}
              style={{ ...btn, width: "100%", marginTop: 9, height: 32, background: "var(--accent)", color: "var(--on-primary)", border: "none", fontWeight: 700, opacity: de && ate ? 1 : 0.5 }}
            >
              Aplicar intervalo
            </button>
          </>
        )}

        {soMes && (
          <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.4 }}>
            O Financeiro fecha por mês (a despesa é gravada com mês de referência),
            então aqui o período é sempre um mês inteiro.
          </div>
        )}
      </div>
    </>
  );
}

// Gatilho padrão: mostra o período atual e abre o modal. Substitui o par
// "<select> de mês + botão Período" — um controle só para a mesma pergunta.
export default function PeriodoBotao({ value, onChange, modo, meses, titulo, style, compacto = false }) {
  const [aberto, setAberto] = React.useState(false);
  const ativo = value?.tipo === "livre" || value?.tipo === "todos";
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Escolher período"
        style={{
          ...btn,
          height: compacto ? 26 : 30,
          fontSize: compacto ? 10 : 11.5,
          border: `1.5px solid ${ativo ? "var(--accent)" : "var(--border2)"}`,
          color: ativo ? "var(--accent)" : "var(--text)",
          fontWeight: 700,
          background: "var(--card)",
          ...style,
        }}
      >
        <CalIco s={compacto ? 10 : 12} />
        {rotuloPeriodo(value)}
        <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
      </button>
      <PeriodoModal aberto={aberto} onFechar={() => setAberto(false)}
        value={value} onChange={onChange} modo={modo} meses={meses} titulo={titulo} />
    </>
  );
}
