import React from "react";
import KpiCard from "../components/KpiCard.jsx";
import { listarDespesasBase } from "../despesas.js";
import { nCte, nContrato, aplicarComplementar } from "../financeiroCalc.js";
import PeriodoBotao from "../components/PeriodoModal.jsx";
import { periodoDeMesRef, mesRefDe } from "../periodoDash.js";

// ── ResumoFinanceiro ──
// A resposta curta pra "a operação deu lucro esse mês?" — 5 números e o histórico.
// Existe porque o Painel Financeiro e o Resultado são telas de trabalho (importar,
// conferir, corrigir): quem só acompanha se perde nelas. Aqui não há ação nenhuma,
// só leitura, e é a tela de entrada do perfil "gestor".
//
// Os números saem EXATAMENTE das mesmas funções do Resultado (financeiroCalc +
// despesas_filial) — o resumo não pode discordar da tela detalhada.

const mesDe = (s) => { if (!s) return null; const p = String(s).split("/"); return p.length >= 3 ? `${p[2]}-${p[1].padStart(2, "0")}` : null; };
const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyCurto = (n) => {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1000) return (v < 0 ? "-R$ " : "R$ ") + (a / 1000).toFixed(1) + "k";
  return money(v);
};
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };

export default function ResumoFinanceiro({ ctx }) {
  const {
    activeTab, baseAtual, basesPermitidas, DADOS, getConexao, t, isMobile, canFin,
    mesRefFin: mesRef, setMesRefFin: setMesRef, incluirCompFin: incluirComp,
  } = ctx;
  if (activeTab !== "resumo") return null;

  const baseId = baseAtual?.id;
  const consolidado = baseAtual?.consolidado === true;
  const conn = React.useMemo(() => (getConexao ? getConexao() : null), [getConexao]);
  const [despesasBase, setDespesasBase] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // No consolidado as despesas vêm de cada base e são somadas; numa base só é
  // uma chamada. Em ambos os casos vem o histórico inteiro de uma vez, servindo
  // tanto ao mês selecionado quanto à tabela de meses.
  // Escopo múltiplo (baseAtual.multi) é consolidado restrito: soma só as bases marcadas.
  const idsMulti = React.useMemo(
    () => (baseAtual?.multi ? [...new Set(baseAtual.multi.map(e => e.base))] : null),
    [baseAtual]);
  const idsDespesas = React.useMemo(() => (
    idsMulti ? idsMulti
      : consolidado ? (basesPermitidas || []).filter(b => b && !b.consolidado).map(b => b.id)
                    : (baseId ? [baseId] : [])
  ), [idsMulti, consolidado, basesPermitidas, baseId]);
  const chaveIds = idsDespesas.join(",");

  React.useEffect(() => {
    if (!conn || !idsDespesas.length) return;
    let cancel = false;
    setLoading(true);
    Promise.all(idsDespesas.map(id => listarDespesasBase(conn, id).catch(() => [])))
      .then(listas => { if (!cancel) setDespesasBase(listas.flat()); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn, chaveIds]);

  // Agrupa por mês E por base (exclui PENDENTE, igual ao Resultado). A separação
  // por base não é firula: a regra do complementar muda por operação
  // (complementarMargemZero na AVB), então somar tudo antes de aplicá-la daria
  // uma margem errada no consolidado.
  const porMes = React.useMemo(() => {
    const m = {};
    (DADOS || []).forEach((r) => {
      const mes = mesDe(r.data_carr);
      if (!mes || (r.status || "").toUpperCase() === "PENDENTE") return;
      const bid = r._baseId || baseId;
      if (!m[mes]) m[mes] = {};
      if (!m[mes][bid]) m[mes][bid] = { receita: 0, custo: 0, comp: 0, n: 0 };
      const g = m[mes][bid];
      g.receita += nCte(r.vl_cte);
      g.custo   += nContrato(r.vl_contrato);
      g.comp    += nCte(r.vl_cte_comp);
      g.n++;
    });
    return m;
  }, [DADOS, baseId]);

  // Despesa líquida do mês = débitos incluídos + créditos incluídos (créditos são negativos).
  const despPorMes = React.useMemo(() => {
    const m = {};
    (despesasBase || []).forEach((d) => {
      if (!d.incluir) return;
      const mes = d.mes_ref;
      if (!mes) return;
      m[mes] = (m[mes] || 0) + Number(d.valor || 0);
    });
    return m;
  }, [despesasBase]);

  const mesesDisp = React.useMemo(() => {
    const s = new Set([...Object.keys(porMes), ...Object.keys(despPorMes)]);
    return [...s].sort().reverse();
  }, [porMes, despPorMes]);

  React.useEffect(() => { if (!mesRef && mesesDisp.length) setMesRef(mesesDisp[0]); }, [mesesDisp, mesRef, setMesRef]);

  const linhaDoMes = React.useCallback((mes) => {
    const porBase = porMes[mes] || {};
    let receita = 0, custo = 0, n = 0;
    Object.entries(porBase).forEach(([bid, op]) => {
      const r = aplicarComplementar(op, { incluirComp, baseId: bid });
      receita += r.receita; custo += r.custo; n += op.n;
    });
    const margem = receita - custo;
    const desp = despPorMes[mes] || 0;
    return { mes, n, receita, custo, margem, desp, resultado: margem - desp };
  }, [porMes, despPorMes, incluirComp]);

  const atual = linhaDoMes(mesRef);
  // Histórico curto: 6 meses é o que cabe num sparkline sem virar gráfico de análise.
  const ultimos = React.useMemo(
    () => mesesDisp.slice(0, 6).reverse().map(linhaDoMes),
    [mesesDisp, linhaDoMes]
  );
  const serie = (campo) => ultimos.map(l => Math.round(l[campo]));
  const delta = (campo) => {
    if (ultimos.length < 2) return null;
    const prev = ultimos[ultimos.length - 2][campo], cur = ultimos[ultimos.length - 1][campo];
    if (!prev) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };
  // Sparkline/delta só fazem sentido quando o mês escolhido é o último da série;
  // olhando um mês antigo, a tendência "vs mês anterior" seria de outro período.
  const noUltimoMes = ultimos.length > 0 && ultimos[ultimos.length - 1].mes === mesRef;
  const trend = (campo) => (noUltimoMes ? serie(campo) : undefined);
  const deltaDe = (campo) => (noUltimoMes ? delta(campo) : undefined);

  const pct = (v) => (atual.receita ? (v / atual.receita * 100) : 0).toFixed(1) + "%";

  if (canFin === false) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira.</div>;
  }


  return (
    <div style={{ padding: isMobile ? "12px 12px 28px" : "16px 18px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Resumo do mês</div>
          <div style={{ fontSize: 11, color: t.txt2 }}>
            {baseAtual?.label || "—"}
            {consolidado && idsDespesas.length > 0 && ` · ${idsDespesas.length} bases somadas`}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <PeriodoBotao value={periodoDeMesRef(mesRef)} meses={mesesDisp} modo="mes"
            titulo="Mês do Resumo"
            onChange={(p) => { const m = mesRefDe(p); if (m) setMesRef(m); }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 10, marginBottom: 18 }}>
        <KpiCard label="Faturamento (CTE)" value={moneyCurto(atual.receita)} sub={`${atual.n} viagens`}
                 color={t.verde} trend={trend("receita")} deltaPct={deltaDe("receita")} deltaLabel="vs mês anterior" compact={isMobile} />
        <KpiCard label="Pago motorista" value={moneyCurto(atual.custo)} sub="vl. contrato"
                 trend={trend("custo")} deltaPct={deltaDe("custo")} deltaLabel="vs mês anterior" compact={isMobile} />
        <KpiCard label="Margem bruta" value={moneyCurto(atual.margem)} sub={pct(atual.margem)}
                 color={t.ouro} trend={trend("margem")} deltaPct={deltaDe("margem")} deltaLabel="vs mês anterior" compact={isMobile} />
        <KpiCard label="Despesas" value={moneyCurto(atual.desp)} sub="líquidas do mês"
                 color={t.danger} trend={trend("desp")} deltaPct={deltaDe("desp")} deltaLabel="vs mês anterior" compact={isMobile} />
        <KpiCard label="Resultado" value={moneyCurto(atual.resultado)} sub={pct(atual.resultado)}
                 color={t.verde} danger={atual.resultado < 0} trend={trend("resultado")} deltaPct={deltaDe("resultado")} deltaLabel="vs mês anterior" compact={isMobile} />
      </div>

      <div style={{ background: t.card, border: `1px solid ${t.borda}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.borda}`, fontSize: 12, fontWeight: 700, color: t.txt }}>
          Últimos meses
        </div>
        {loading && ultimos.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12, color: t.txt2 }}>Carregando…</div>
        ) : ultimos.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12, color: t.txt2 }}>Sem dados no período.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 520 }}>
              <thead>
                <tr style={{ color: t.txt2, fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  <th style={{ textAlign: "left",  padding: "8px 14px" }}>Mês</th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>Viagens</th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>Faturamento</th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>Margem</th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>Despesas</th>
                  <th style={{ textAlign: "right", padding: "8px 14px" }}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {[...ultimos].reverse().map(l => (
                  <tr key={l.mes} style={{ borderTop: `1px solid ${t.borda}`, background: l.mes === mesRef ? t.card2 : "transparent" }}>
                    <td style={{ padding: "8px 14px", color: t.txt, fontWeight: l.mes === mesRef ? 700 : 400 }}>{mesLabel(l.mes)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: t.txt2 }}>{l.n}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: t.txt }}>{money(l.receita)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: t.txt }}>{money(l.margem)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: t.txt2 }}>{money(l.desp)}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: l.resultado < 0 ? t.danger : t.verde }}>{money(l.resultado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
