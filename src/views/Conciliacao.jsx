// ── Conciliacao.jsx ──
// Planilha (Sheets) × TMS, lado a lado, no mês já selecionado no Resultado.
// A regra e o porquê de comparar `frete_peso` estão em conciliacao.js.
//
// Só leitura de propósito (fase 1): a tela aponta e exporta pra quem preenche.
// Corrigir a planilha pelo app é outra conversa — escreve nos dois lados.
import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import Icon from "../components/Icon.jsx";
import { listarPorPeriodos, ehAtivo } from "../freteConferencia.js";
import { conciliar, CLASSES } from "../conciliacao.js";
import { ExportMenu } from "../exportHelpers.jsx";
import KpiCard from "../components/KpiCard.jsx";

const money = (n) => (n == null ? "—" : "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const moneyK = (n) => {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1e6) return (v < 0 ? "−" : "") + "R$ " + (a / 1e6).toFixed(2) + " mi";
  if (a >= 1000) return (v < 0 ? "−" : "") + "R$ " + Math.round(a / 1000) + "k";
  return (v < 0 ? "−" : "") + "R$ " + Math.round(a);
};
const mesLabel = (m) => (m ? m.split("-").reverse().join("/") : "");

const COR = {
  dt_fatiada: "var(--red)",
  sem_valor: "var(--orange)",
  valor_dif: "var(--yellow)",
  sem_no_tms: "var(--cyan)",
  fora_planilha: "var(--text3)",
};

export default function Conciliacao({ ctx, conn }) {
  const { DADOS, baseAtual, t, isMobile, mesRefFin: mesRef, canFin } = ctx;
  const baseId = baseAtual?.id;

  const [linhasTms, setLinhasTms] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState("");
  const [filtro, setFiltro] = React.useState("todos");

  React.useEffect(() => {
    if (!conn || !mesRef) { setLinhasTms([]); return; }
    let vivo = true;
    setLoading(true); setErro("");
    listarPorPeriodos(conn, [mesRef])
      .then((rows) => { if (vivo) setLinhasTms(rows || []); })
      .catch((e) => { if (vivo) setErro(e.message || String(e)); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [conn, mesRef]);

  // O TMS traz todas as bases e categorias; a conciliação é do FRETE da base atual.
  // Diária, descarga e local têm outra contrapartida na planilha e ficam de fora.
  const tmsDaBase = React.useMemo(
    () => (linhasTms || []).filter((l) => l.base_id === baseId && l.categoria === "frete" && ehAtivo(l)),
    [linhasTms, baseId]
  );

  const { achados, porClasse, resumo } = React.useMemo(
    () => conciliar(DADOS, tmsDaBase, mesRef),
    [DADOS, tmsDaBase, mesRef]
  );

  const visiveis = filtro === "todos" ? achados : achados.filter((a) => a.classe === filtro);
  const impactoTotal = achados.reduce((s, a) => s + Math.abs(a.impacto || 0), 0);
  const pctBate = resumo.comparadas ? Math.round((resumo.batendo / resumo.comparadas) * 100) : 0;

  if (canFin === false) return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira.</div>;

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 12 : 16 };
  const th = { padding: "8px 10px", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em",
    color: "var(--text3)", fontFamily: "var(--font-mono)", textAlign: "left", whiteSpace: "nowrap" };
  const td = { padding: "7px 10px", fontSize: 11.5, color: t.txt, whiteSpace: "nowrap" };

  const colsExport = [
    { k: "classeLabel", l: "Problema" },
    { k: "dt", l: "DT" },
    { k: "ctes", l: "CTe" },
    { k: "trecho", l: "Trecho" },
    { k: "planilha", l: "Planilha (sem ICMS)" },
    { k: "tms", l: "TMS (frete peso)" },
    { k: "impacto", l: "Impacto" },
    { k: "detalhe", l: "Detalhe" },
  ];
  const dadosExport = visiveis.map((a) => ({
    ...a, classeLabel: CLASSES[a.classe]?.label || a.classe,
    planilha: a.planilha ?? "", tms: a.tms ?? "", impacto: a.impacto ?? "",
    trecho: a.trecho || "", detalhe: a.detalhe || "",
  }));

  return (
    <div>
      {/* ── Resumo ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        <KpiCard label="DTs conferidas" value={String(resumo.comparadas)}
          sub={`de ${resumo.planilhaNoMes} linhas · ${resumo.tmsNoMes} no TMS`} compact={isMobile} />
        <KpiCard label="Batem com o TMS" value={`${pctBate}%`}
          sub={`${resumo.batendo} de ${resumo.comparadas}`}
          color={pctBate >= 95 ? t.verde : undefined} danger={pctBate < 80} compact={isMobile} />
        <KpiCard label="Divergências" value={String(achados.length)}
          sub={achados.length ? "clique numa classe abaixo" : "nada a corrigir"}
          danger={achados.length > 0} compact={isMobile} />
        <KpiCard label="Impacto somado" value={moneyK(impactoTotal)}
          sub="valor em jogo no mês" danger={impactoTotal > 0} compact={isMobile} />
      </div>

      {/* ── Totais dos dois lados ── */}
      <div style={{ ...card, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)" }}>Planilha · {mesLabel(mesRef)}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: t.txt }}>{money(resumo.totalPlanilha)}</div>
        </div>
        <div style={{ fontSize: 16, color: "var(--text3)" }}>×</div>
        <div>
          <div style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)" }}>TMS · frete sem ICMS</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: t.txt }}>{money(resumo.totalTms)}</div>
        </div>
        <div style={{ marginLeft: isMobile ? 0 : "auto", textAlign: isMobile ? "left" : "right" }}>
          <div style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)" }}>Diferença</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: Math.abs(resumo.totalPlanilha - resumo.totalTms) > 1 ? t.danger : t.verde }}>
            {money(resumo.totalPlanilha - resumo.totalTms)}
          </div>
        </div>
      </div>

      {/* ── Classes ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,1fr)", gap: 8, marginBottom: 14 }}>
        {Object.entries(CLASSES).map(([id, c]) => {
          const lista = porClasse[id] || [];
          const ativo = filtro === id;
          const soma = lista.reduce((s, a) => s + Math.abs(a.impacto || 0), 0);
          return (
            <button key={id} onClick={() => setFiltro(ativo ? "todos" : id)} title={c.desc}
              style={{ ...card, padding: 11, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                borderColor: ativo ? COR[id] : t.borda, borderWidth: ativo ? 1.5 : 1, borderStyle: "solid" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: lista.length ? COR[id] : "var(--text3)" }}>{lista.length}</span>
                <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>{soma ? moneyK(soma) : ""}</span>
              </div>
              <div style={{ fontSize: 10.5, color: t.txt2, lineHeight: 1.3, marginTop: 3 }}>{c.label}</div>
            </button>
          );
        })}
      </div>

      {/* ── Lista ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.txt }}>
            {filtro === "todos" ? "Todas as divergências" : CLASSES[filtro]?.label}
            <span style={{ color: t.txt2, fontWeight: 400 }}> · {visiveis.length}</span>
          </div>
          {filtro !== "todos" && (
            <>
              <span style={{ fontSize: 10.5, color: t.txt2 }}>{CLASSES[filtro]?.desc}</span>
              <Button variant="secondary" size="sm" onClick={() => setFiltro("todos")}><Icon n="x" s={13} /> limpar</Button>
            </>
          )}
          <div style={{ marginLeft: "auto" }}>
            <ExportMenu dados={dadosExport} cols={colsExport}
              filename={`conciliacao-${baseId}-${mesRef}`}
              titulo={`Conciliação planilha × TMS · ${baseAtual?.label || ""} · ${mesLabel(mesRef)}`} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: t.txt2, fontSize: 12 }}>Carregando o TMS…</div>
        ) : erro ? (
          <div style={{ padding: 20, textAlign: "center", color: t.danger, fontSize: 12 }}>Erro ao ler o TMS: {erro}</div>
        ) : !visiveis.length ? (
          <div style={{ padding: 24, textAlign: "center", color: t.txt2, fontSize: 12 }}>
            {achados.length ? "Nenhuma divergência nesta classe." : `Planilha e TMS batem em ${mesLabel(mesRef)}.`}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>Problema</th><th style={th}>DT</th><th style={th}>CTe</th>
                <th style={{ ...th, textAlign: "right" }}>Planilha</th>
                <th style={{ ...th, textAlign: "right" }}>TMS</th>
                <th style={{ ...th, textAlign: "right" }}>Impacto</th>
                <th style={th}>Detalhe</th>
              </tr></thead>
              <tbody>
                {visiveis.map((a, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${t.borda}` }}>
                    <td style={td}>
                      <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                        color: COR[a.classe], border: `1px solid ${COR[a.classe]}`, borderRadius: 4, padding: "1px 6px" }}>
                        {CLASSES[a.classe]?.label}
                      </span>
                    </td>
                    <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{a.dt || "—"}</td>
                    <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{a.ctes || "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{a.planilha == null ? "—" : money(a.planilha)}</td>
                    <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{a.tms == null ? "—" : money(a.tms)}</td>
                    <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: COR[a.classe] }}>{money(a.impacto)}</td>
                    <td style={{ ...td, color: t.txt2, fontSize: 10.5, whiteSpace: "normal" }}>{a.detalhe || a.trecho || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 10, lineHeight: 1.5 }}>
        Compara <b>vl_cte</b> da planilha com <b>frete peso</b> do TMS (frete sem ICMS), casando pelo número do CTe,
        com tolerância de 5 centavos. Só a categoria <b>frete</b> da base atual — diária, descarga e local têm outra
        contrapartida na planilha.
      </div>
    </div>
  );
}
