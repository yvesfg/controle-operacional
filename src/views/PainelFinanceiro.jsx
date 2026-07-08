import React from "react";
import { Chart } from "chart.js";
import { listarDespesasBase } from "../despesas.js";
import Toggle from "../components/Toggle.jsx";
import KpiCard from "../components/KpiCard.jsx";

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
const normCidade = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
// origem da viagem (IMPERATRIZ-MA / BELEM-PA) → mesma origem da despesa (IMP / BELÉM)
const origemBate = (origem, filial) => {
  const o = normCidade(origem);
  if (filial === "IMP") return o.includes("IMPERATRIZ");
  if (filial === "BELÉM") return o.includes("BELEM");
  return true;
};

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

  // Filtro por origem (só imperatriz_belem): despesas vêm tagueadas IMP/BELÉM na planilha.
  const temFilial = baseId === "imperatriz_belem";
  const [filial, setFilial] = React.useState("todos"); // todos | IMP | BELÉM
  React.useEffect(() => { setFilial("todos"); }, [baseId]);

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
    const filtraCidade = temFilial && filial !== "todos";
    (DADOS || []).forEach((r) => {
      const m = mesDe(r.data_carr); if (!m) return;
      if ((r.status || "").toUpperCase() === "PENDENTE") return;
      if (filtraCidade && !origemBate(r.origem, filial)) return; // receita pela origem da viagem
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
  }, [DADOS, incluirComp, baseId, temFilial, filial]);

  // Despesas filtradas pela origem selecionada (IMP/BELÉM) — receita continua combinada.
  const despesasView = React.useMemo(
    () => (filial === "todos" ? despesas : despesas.filter((d) => d.aba_origem === filial)),
    [despesas, filial]
  );

  // ── Despesas por mês ──
  const despPorMes = React.useMemo(() => {
    const acc = {};
    despesasView.forEach((d) => {
      const m = d.mes_ref; if (!m) return;
      const a = acc[m] || (acc[m] = { deb: 0, cred: 0 });
      if (!d.incluir) return;
      if (d.tipo === "credito") a.cred += Number(d.valor || 0); // negativo
      else a.deb += Number(d.valor || 0);
    });
    Object.keys(acc).forEach((m) => { acc[m].liq = acc[m].deb + acc[m].cred; });
    return acc;
  }, [despesasView]);

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

  // ── Mês anterior (variação) ──
  const prevMes = mesRef ? (() => { const [y, mo] = mesRef.split("-").map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })() : null;
  const rp = receitaPorMes[prevMes] || { receita: 0, margem: 0, n: 0 };
  const dpp = despPorMes[prevMes] || { deb: 0, cred: 0, liq: 0 };
  const prevResultado = rp.margem - dpp.liq;

  // ── Acumulado do ano (YTD) ──
  const ytd = React.useMemo(() => {
    const ano = (mesRef || "").split("-")[0]; let fat = 0, mrg = 0, desp = 0;
    Object.keys(receitaPorMes).forEach((m) => { if (m.startsWith(ano + "-")) { fat += receitaPorMes[m].receita; mrg += receitaPorMes[m].margem; } });
    Object.keys(despPorMes).forEach((m) => { if (m.startsWith(ano + "-")) desp += despPorMes[m].liq; });
    return { ano, fat, desp, resultado: mrg - desp };
  }, [receitaPorMes, despPorMes, mesRef]);

  // ── Maiores despesas do mês ──
  const topDespesas = React.useMemo(() =>
    despesasView.filter((d) => d.mes_ref === mesRef && d.incluir && d.tipo !== "credito")
      .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0)).slice(0, 5),
    [despesasView, mesRef]);

  // ── Composição de despesas (mês selecionado) por grupo ──
  const composicao = React.useMemo(() => {
    const g = {};
    despesasView.filter((d) => d.mes_ref === mesRef && d.incluir && d.tipo !== "credito")
      .forEach((d) => { const k = d.grupo || "OUTRAS"; g[k] = (g[k] || 0) + Number(d.valor || 0); });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [despesasView, mesRef]);

  // ── Charts ──
  const trendRef = React.useRef(null);
  const donutRef = React.useRef(null);
  const wfRef = React.useRef(null);
  const instRef = React.useRef({});
  React.useEffect(() => {
    const verde = cssVar("--green", "#22c55e"), red = cssVar("--red", "var(--red)"), azul = cssVar("--color-info-lt", "var(--cat-blue)");
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
      const pal = ["var(--cat-blue)", "var(--cat-gold)", "#22c55e", "#a855f7", "#ec4899", "var(--cyan)", "var(--red)"];
      instRef.current.donut = new Chart(donutRef.current, {
        type: "doughnut",
        data: { labels: composicao.map(([k]) => k), datasets: [{ data: composicao.map(([, v]) => v), backgroundColor: pal, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "62%",
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${money(c.parsed)}` } } } },
      });
    }
    // Cascata do resultado (waterfall): Faturamento → −Pago motorista → −Despesas → +Créditos → Resultado
    if (wfRef.current && r.n > 0) {
      instRef.current.wf?.destroy();
      const fat = r.receita, custo = r.custo, deb = dp.deb, credAbs = Math.abs(dp.cred), margem = r.margem;
      const ranges = [[0, fat], [margem, fat], [margem - deb, margem], [margem - deb, resultado], [0, resultado]];
      const mags = [fat, -custo, -deb, credAbs, resultado];
      const cores = [verde, red, red, verde, resultado >= 0 ? azul : red];
      instRef.current.wf = new Chart(wfRef.current, {
        type: "bar",
        data: { labels: ["Faturamento", "Pago motorista", "Despesas", "Créditos", "Resultado"],
          datasets: [{ data: ranges, backgroundColor: cores, borderRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => money(mags[c.dataIndex]) } } },
          scales: { x: { ticks: { color: txt2, font: { size: 10 } }, grid: { display: false } },
                    y: { ticks: { color: txt2, font: { size: 10 }, callback: (v) => moneyK(v) }, grid: { color: grid } } } },
      });
    }
    return () => { instRef.current.trend?.destroy(); instRef.current.donut?.destroy(); instRef.current.wf?.destroy(); instRef.current = {}; };
  }, [serie, composicao, mesRef]);

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };
  const PAL = ["var(--cat-blue)", "var(--cat-gold)", "#22c55e", "#a855f7", "#ec4899", "var(--cyan)", "var(--red)"];
  const totalComp = composicao.reduce((s, [, v]) => s + v, 0) || 1;
  // Variação vs mês anterior (badge ▲/▼). higherIsGood=false p/ despesa.
  const delta = (cur, prev, higherIsGood = true) => {
    if (!prev) return null;
    const d = (cur - prev) / Math.abs(prev) * 100;
    const good = higherIsGood ? d >= 0 : d <= 0;
    return <span style={{ marginLeft: 5, color: good ? t.verde : t.danger, fontWeight: 700 }}>{d >= 0 ? "▲" : "▼"}{Math.abs(d).toFixed(0)}%</span>;
  };

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
        {temFilial && (
          <div style={{ display: "flex", border: `1px solid ${t.borda}`, borderRadius: 8, overflow: "hidden" }}>
            {[["todos", "Imp + Bel"], ["IMP", "Imperatriz"], ["BELÉM", "Belém"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilial(k)}
                style={{ fontSize: 12, fontWeight: filial === k ? 700 : 500, padding: "8px 12px", cursor: "pointer",
                  border: "none", borderRight: k !== "BELÉM" ? `1px solid ${t.borda}` : "none",
                  background: filial === k ? "var(--accent)" : "transparent", color: filial === k ? "#fff" : t.txt2 }}>
                {l}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: t.txt,
          padding: "6px 11px", border: `1px solid ${t.borda}`, borderRadius: 8 }}>
          <Toggle checked={incluirComp} onChange={setIncluirComp}
            label={`Incluir complementar ${baseId === "acailandia_avb" ? "(margem zero)" : "(margem cheia)"}`} />
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: t.txt2, fontFamily: "var(--font-mono)" }}>
          {baseAtual?.label} · {r.n} viagens
        </div>
      </div>

      {temFilial && filial !== "todos" && (
        <div style={{ fontSize: 11, color: t.ouro, marginBottom: 12, marginTop: -6 }}>
          Visão isolada: <b>{filial === "IMP" ? "Imperatriz" : "Belém"}</b> · receita pela origem da viagem + despesas da aba {filial}.
        </div>
      )}

      {semDados ? (
        <div style={{ ...card, textAlign: "center", color: t.txt2, fontSize: 13, padding: 32 }}>
          Sem dados financeiros para {baseAtual?.label} em {mesLabel(mesRef)}.
        </div>
      ) : (
        <>
          {/* KPIs principais */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
            <KpiCard label="Faturamento (CTE)" value={money(r.receita)} sub={<>{r.n} viagens{delta(r.receita, rp.receita)}</>} color={t.verde} compact={isMobile} />
            <KpiCard label="Margem bruta" value={money(r.margem)} sub={<>{margemPct.toFixed(1)}% do fat.{delta(r.margem, rp.margem)}</>} color={t.ouro} compact={isMobile} />
            <KpiCard label="Despesas" value={money(dp.deb)} sub={<>{dp.cred < 0 ? `créd. ${money(Math.abs(dp.cred))}` : "incluídas"}{delta(dp.deb, dpp.deb, false)}</>} color={t.danger} compact={isMobile} />
            <KpiCard label="Resultado" value={money(resultado)} sub={<>{resultPct.toFixed(1)}%{delta(resultado, prevResultado)}</>} color={t.verde} danger={resultado < 0} compact={isMobile} />
          </div>

          {/* Indicadores derivados */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
            <KpiCard label="Receita / viagem" value={money(recPorVg)} compact={isMobile} />
            <KpiCard label="Despesa / viagem" value={money(despPorVg)} compact={isMobile} />
            <KpiCard label="Índice de despesa" value={idxDespesa.toFixed(1) + "%"} color={idxDespesa > 100 ? t.danger : undefined} compact={isMobile} />
            <KpiCard label="Ponto de equilíbrio" value={breakeven > 0 ? moneyK(breakeven) : "—"} compact={isMobile} />
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

          {/* Linha inferior: cascata do resultado + maiores despesas + acumulado do ano */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 14, marginTop: 14 }}>
            <div style={{ ...card }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 4 }}>Cascata do resultado · {mesLabel(mesRef)}</div>
              <div style={{ fontSize: 10, color: t.txt2, marginBottom: 10 }}>Do faturamento ao resultado, passo a passo</div>
              <div style={{ position: "relative", height: 240 }}>
                <canvas ref={wfRef} role="img" aria-label="Cascata: faturamento menos pago motorista e despesas, mais créditos, igual resultado" />
              </div>
            </div>
            <div style={{ ...card, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 10 }}>Maiores despesas do mês</div>
              {topDespesas.length === 0 ? (
                <div style={{ color: t.txt2, fontSize: 12, padding: 16, textAlign: "center" }}>Sem despesas neste mês.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                  {topDespesas.map((d, i) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: t.txt2, width: 16, flexShrink: 0 }}>{i + 1}.</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.natureza || d.historico || "—"}</div>
                        <div style={{ fontSize: 9, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.grupo}</div>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: t.danger, whiteSpace: "nowrap" }}>{money(Number(d.valor || 0))}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.borda}` }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text3)", marginBottom: 7 }}>Acumulado {ytd.ano}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  <div><div style={{ fontSize: 9, color: t.txt2 }}>Faturamento</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: t.verde }}>{moneyK(ytd.fat)}</div></div>
                  <div><div style={{ fontSize: 9, color: t.txt2 }}>Despesas</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: t.danger }}>{moneyK(ytd.desp)}</div></div>
                  <div><div style={{ fontSize: 9, color: t.txt2 }}>Resultado</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: ytd.resultado >= 0 ? t.verde : t.danger }}>{moneyK(ytd.resultado)}</div></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
