import React from "react";
import { Chart } from "chart.js";
import { listarDespesasBase } from "../despesas.js";

// PainelFinanceiro — visão financeira por base (faturamento → margem → despesas → resultado).
// Escopado à base logada. Faturamento/margem vêm das viagens (DADOS); despesas da tabela
// despesas_filial (importada por base). Gated por permissão financeira.

// Parsers numéricos — espelham o App e o parseMoedaAvb:
// vl_cte/vl_cte_comp já vêm decimais; vl_contrato só trata ponto como milhar quando há vírgula.
const nCte = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const nContrato = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const mesDe = (s) => { if (!s) return null; const p = String(s).split("/"); return p.length >= 3 ? `${p[2]}-${p[1].padStart(2, "0")}` : null; };
const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyK = (n) => { const a = Math.abs(n); const s = n < 0 ? "−" : ""; return a >= 1e6 ? `${s}R$ ${(a / 1e6).toFixed(2)} mi` : a >= 1000 ? `${s}R$ ${Math.round(a / 1000)}k` : `${s}R$ ${Math.round(a)}`; };
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };
const mesCurto = (m) => { if (!m) return ""; const [, mo] = m.split("-"); return ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][parseInt(mo, 10)] || mo; };
const cssVar = (n, fb) => { try { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || fb; } catch { return fb; } };

export default function PainelFinanceiro({ ctx }) {
  const { activeTab, baseAtual, DADOS, getConexao, t, isMobile, showToast, canFin } = ctx;
  if (activeTab !== "painel_financeiro") return null;
  const baseId = baseAtual?.id;
  if (canFin === false) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira para visualizar o Painel Financeiro.</div>;
  }

  const conn = React.useMemo(() => (getConexao ? getConexao() : null), [getConexao]);

  // ── Meses disponíveis (das viagens) ──
  const mesesDisp = React.useMemo(() => {
    const s = new Set();
    (DADOS || []).forEach((r) => { const m = mesDe(r.data_carr); if (m) s.add(m); });
    return [...s].sort().reverse();
  }, [DADOS]);

  const [mesRef, setMesRef] = React.useState("");
  React.useEffect(() => { if (!mesRef && mesesDisp.length) setMesRef(mesesDisp[0]); }, [mesesDisp, mesRef]);

  const [incluirComp, setIncluirComp] = React.useState(baseId === "imperatriz_belem");
  React.useEffect(() => { setIncluirComp(baseId === "imperatriz_belem"); }, [baseId]);

  // ── Despesas da base (todos os meses) ──
  const [despesas, setDespesas] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    let vivo = true;
    if (!conn || !baseId) { setDespesas([]); return; }
    setLoading(true);
    listarDespesasBase(conn, baseId)
      .then((d) => { if (vivo) setDespesas(d || []); })
      .catch((e) => { if (vivo) showToast?.("Erro ao carregar despesas: " + e.message, "erro"); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [conn, baseId]);

  // ── Receita/custo por mês (das viagens) ──
  const receitaPorMes = React.useMemo(() => {
    const acc = {};
    (DADOS || []).forEach((r) => {
      const m = mesDe(r.data_carr); if (!m) return;
      if ((r.status || "").toUpperCase() === "PENDENTE") return;
      const a = acc[m] || (acc[m] = { receita: 0, custo: 0, comp: 0, n: 0 });
      a.receita += nCte(r.vl_cte); a.custo += nContrato(r.vl_contrato); a.comp += nCte(r.vl_cte_comp); a.n += 1;
    });
    Object.keys(acc).forEach((m) => {
      const a = acc[m];
      if (incluirComp) {
        if (baseId === "acailandia_avb") { a.receita += a.comp; a.custo += a.comp; } // repasse: margem zero
        else { a.receita += a.comp; } // margem cheia
      }
      a.margem = a.receita - a.custo;
    });
    return acc;
  }, [DADOS, incluirComp, baseId]);

  // ── Despesas por mês ──
  const despPorMes = React.useMemo(() => {
    const acc = {};
    despesas.forEach((d) => {
      const m = d.mes_ref; if (!m) return;
      const a = acc[m] || (acc[m] = { deb: 0, cred: 0 });
      if (!d.incluir) return;
      if (d.tipo === "credito") a.cred += Number(d.valor || 0); // negativo
      else a.deb += Number(d.valor || 0);
    });
    Object.keys(acc).forEach((m) => { acc[m].liq = acc[m].deb + acc[m].cred; });
    return acc;
  }, [despesas]);

  // ── Série mensal combinada (últimos 6 meses com qualquer movimento) ──
  const serie = React.useMemo(() => {
    const meses = new Set([...Object.keys(receitaPorMes), ...Object.keys(despPorMes)]);
    return [...meses].sort().slice(-6).map((m) => {
      const r = receitaPorMes[m] || { receita: 0, custo: 0, margem: 0, n: 0 };
      const dp = despPorMes[m] || { deb: 0, cred: 0, liq: 0 };
      return { mes: m, receita: r.receita, margem: r.margem, despLiq: dp.liq, resultado: r.margem - dp.liq };
    });
  }, [receitaPorMes, despPorMes]);

  // ── KPIs do mês selecionado ──
  const r = receitaPorMes[mesRef] || { receita: 0, custo: 0, margem: 0, n: 0 };
  const dp = despPorMes[mesRef] || { deb: 0, cred: 0, liq: 0 };
  const resultado = r.margem - dp.liq;
  const margemPct = r.receita ? r.margem / r.receita * 100 : 0;
  const resultPct = r.receita ? resultado / r.receita * 100 : 0;
  const idxDespesa = r.receita ? dp.deb / r.receita * 100 : 0;
  const recPorVg = r.n ? r.receita / r.n : 0;
  const despPorVg = r.n ? dp.liq / r.n : 0;
  const breakeven = r.margem > 0 ? dp.liq * r.receita / r.margem : 0; // faturamento p/ resultado zero

  // ── Composição de despesas (mês selecionado) por grupo ──
  const composicao = React.useMemo(() => {
    const g = {};
    despesas.filter((d) => d.mes_ref === mesRef && d.incluir && d.tipo !== "credito")
      .forEach((d) => { const k = d.grupo || "OUTRAS"; g[k] = (g[k] || 0) + Number(d.valor || 0); });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [despesas, mesRef]);

  // ── Charts ──
  const trendRef = React.useRef(null);
  const donutRef = React.useRef(null);
  const instRef = React.useRef({});
  React.useEffect(() => {
    const verde = cssVar("--green", "#22c55e"), red = cssVar("--red", "#ef4444"), azul = cssVar("--color-info-lt", "#1677ff");
    const grid = cssVar("--border", "#26324a"), txt2 = cssVar("--text2", "#94a3b8");
    if (trendRef.current && serie.length) {
      instRef.current.trend?.destroy();
      instRef.current.trend = new Chart(trendRef.current, {
        data: {
          labels: serie.map((s) => mesCurto(s.mes)),
          datasets: [
            { type: "bar", label: "Faturamento", data: serie.map((s) => s.receita), backgroundColor: azul, borderRadius: 4, order: 2 },
            { type: "line", label: "Resultado", data: serie.map((s) => s.resultado), borderColor: red, backgroundColor: red, borderWidth: 2, tension: 0.3, pointRadius: 3, order: 1 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money(c.parsed.y)}` } } },
          scales: { x: { ticks: { color: txt2, font: { size: 10 } }, grid: { display: false } },
                    y: { ticks: { color: txt2, font: { size: 10 }, callback: (v) => moneyK(v) }, grid: { color: grid } } },
        },
      });
    }
    if (donutRef.current && composicao.length) {
      instRef.current.donut?.destroy();
      const pal = ["#1677ff", "#f0b90b", "#22c55e", "#a855f7", "#ec4899", "#06b6d4", "#ef4444"];
      instRef.current.donut = new Chart(donutRef.current, {
        type: "doughnut",
        data: { labels: composicao.map(([k]) => k), datasets: [{ data: composicao.map(([, v]) => v), backgroundColor: pal, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "62%",
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${money(c.parsed)}` } } } },
      });
    }
    return () => { instRef.current.trend?.destroy(); instRef.current.donut?.destroy(); instRef.current = {}; };
  }, [serie, composicao]);

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };
  const kpi = (l, v, sub, cor, destaque) => (
    <div style={{ ...card, padding: isMobile ? "12px 10px" : "14px 16px", textAlign: "center", border: destaque ? `2px solid ${cor}` : card.border }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text3)", marginBottom: 5 }}>{l}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: isMobile ? 17 : 22, fontWeight: 800, letterSpacing: "-0.03em", color: cor || t.txt, lineHeight: 1 }}>{v}</div>
      {sub && <div style={{ fontSize: 10, color: t.txt2, marginTop: 3 }}>{sub}</div>}
    </div>
  );
  const mini = (l, v, cor) => (
    <div style={{ padding: "10px 12px", border: `1px solid ${t.borda}`, borderRadius: 8, background: t.card }}>
      <div style={{ fontSize: 10, color: t.txt2, marginBottom: 3 }}>{l}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: cor || t.txt }}>{v}</div>
    </div>
  );
  const PAL = ["#1677ff", "#f0b90b", "#22c55e", "#a855f7", "#ec4899", "#06b6d4", "#ef4444"];
  const totalComp = composicao.reduce((s, [, v]) => s + v, 0) || 1;

  const semDados = !loading && r.n === 0 && composicao.length === 0;

  return (
    <div style={{ padding: isMobile ? 12 : "20px 24px" }}>
      {/* Controles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <select value={mesRef} onChange={(e) => setMesRef(e.target.value)}
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }}>
          {mesesDisp.length === 0 && <option value="">— sem dados —</option>}
          {mesesDisp.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: t.txt, cursor: "pointer",
          padding: "8px 11px", border: `1px solid ${t.borda}`, borderRadius: 8 }}>
          <input type="checkbox" checked={incluirComp} onChange={(e) => setIncluirComp(e.target.checked)} />
          Incluir complementar {baseId === "acailandia_avb" ? "(margem zero)" : "(margem cheia)"}
        </label>
        <div style={{ marginLeft: "auto", fontSize: 11, color: t.txt2, fontFamily: "var(--font-mono)" }}>
          {baseAtual?.label} · {r.n} viagens
        </div>
      </div>

      {semDados ? (
        <div style={{ ...card, textAlign: "center", color: t.txt2, fontSize: 13, padding: 32 }}>
          Sem dados financeiros para {baseAtual?.label} em {mesLabel(mesRef)}.
        </div>
      ) : (
        <>
          {/* KPIs principais */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
            {kpi("Faturamento (CTE)", money(r.receita), `${r.n} viagens`, t.verde)}
            {kpi("Margem bruta", money(r.margem), `${margemPct.toFixed(1)}% do fat.`, t.ouro)}
            {kpi("Despesas", money(dp.deb), dp.cred < 0 ? `créd. ${money(Math.abs(dp.cred))}` : "incluídas", t.danger)}
            {kpi("Resultado", money(resultado), `${resultPct.toFixed(1)}%`, resultado >= 0 ? t.verde : t.danger, true)}
          </div>

          {/* Indicadores derivados */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
            {mini("Receita / viagem", money(recPorVg))}
            {mini("Despesa / viagem", money(despPorVg))}
            {mini("Índice de despesa", idxDespesa.toFixed(1) + "%", idxDespesa > 100 ? t.danger : t.txt)}
            {mini("Ponto de equilíbrio", breakeven > 0 ? moneyK(breakeven) : "—")}
          </div>

          {/* Gráficos */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: 14 }}>
            <div style={{ ...card }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 4 }}>Evolução: faturamento × resultado</div>
              <div style={{ fontSize: 10, color: t.txt2, marginBottom: 10 }}>Últimos {serie.length} meses</div>
              <div style={{ position: "relative", height: 230 }}>
                <canvas ref={trendRef} role="img" aria-label="Barras de faturamento e linha de resultado por mês" />
              </div>
            </div>
            <div style={{ ...card }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 10 }}>Composição das despesas</div>
              {composicao.length === 0 ? (
                <div style={{ color: t.txt2, fontSize: 12, padding: 20, textAlign: "center" }}>Sem despesas neste mês.</div>
              ) : (
                <>
                  <div style={{ position: "relative", height: 150, marginBottom: 12 }}>
                    <canvas ref={donutRef} role="img" aria-label="Rosca da composição de despesas por grupo" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {composicao.map(([g, v], i) => (
                      <div key={g} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: PAL[i % PAL.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g}</span>
                        <span style={{ color: t.txt2, fontFamily: "var(--font-mono)" }}>{Math.round(v / totalComp * 100)}%</span>
                        <span style={{ color: t.txt, fontFamily: "var(--font-mono)", fontWeight: 700, minWidth: isMobile ? 70 : 90, textAlign: "right" }}>{money(v)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
