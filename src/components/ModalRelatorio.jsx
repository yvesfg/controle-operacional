import React from "react";
import Icon from "./Icon.jsx";
import { baixarXLSX, baixarCSV, baixarPDF } from "../exportacao.js";

// ── ModalRelatorio — relatório da TELA, não do módulo ────────────────────────
// Qualquer tela com tabela chama este modal passando o que já está filtrado na frente do
// usuário (`linhas`) e como ler cada coluna (`colunas`). Ele cuida do resto: escolher
// colunas, ordenar, agrupar, somar, exportar (XLSX/CSV) e imprimir.
//
// Por que não reusar o ReportBuilder: aquele monta relatório a partir do catálogo de campos
// do OPERACIONAL (dados/motoristas/apontamentos) e vive amarrado a essa origem. Ele continua
// existindo para quem quer montar um relatório campo a campo; este aqui é o "imprima o que
// estou vendo", que é o que faltava em toda tela nova.
//
// colunas: [{ id, label, get(linha), tipo: "texto"|"moeda"|"numero"|"data"|"pct", total }]
//   total: true soma a coluna no rodapé (só faz sentido em moeda/numero).
// agrupavelPor: [{ id, label, get(linha) }] — opcional; agrupa com subtotais.
export default function ModalRelatorio({
  aberto, onFechar, titulo, subtitulo, linhas, colunas, agrupavelPor = [], t, hexRgb, isMobile,
}) {
  const [visiveis, setVisiveis] = React.useState(() => colunas.map((c) => c.id));
  const [ordemId, setOrdemId] = React.useState(null);
  const [ordemDesc, setOrdemDesc] = React.useState(true);
  const [grupoId, setGrupoId] = React.useState("");
  const [gerando, setGerando] = React.useState("");

  // Colunas podem mudar quando a tela muda de recorte — mantém só as que ainda existem.
  React.useEffect(() => {
    setVisiveis((v) => {
      const ids = colunas.map((c) => c.id);
      const mantidas = v.filter((id) => ids.includes(id));
      return mantidas.length ? mantidas : ids;
    });
  }, [colunas]);

  const cols = colunas.filter((c) => visiveis.includes(c.id));
  const grupo = agrupavelPor.find((g) => g.id === grupoId) || null;

  const fmt = (c, v) => {
    if (v === null || v === undefined || v === "") return "";
    if (c.tipo === "moeda") return (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (c.tipo === "numero") return (Number(v) || 0).toLocaleString("pt-BR");
    if (c.tipo === "pct") return `${(Number(v) || 0).toFixed(1)}%`;
    if (c.tipo === "data") return String(v).slice(0, 10).split("-").reverse().join("/");
    return String(v);
  };
  const bruto = (c, l) => { try { return c.get(l); } catch { return ""; } };

  const ordenadas = React.useMemo(() => {
    const arr = [...(linhas || [])];
    const c = colunas.find((x) => x.id === ordemId);
    if (!c) return arr;
    const num = c.tipo === "moeda" || c.tipo === "numero" || c.tipo === "pct";
    arr.sort((a, b) => {
      const va = bruto(c, a), vb = bruto(c, b);
      const cmp = num ? (Number(va) || 0) - (Number(vb) || 0) : String(va ?? "").localeCompare(String(vb ?? ""));
      return ordemDesc ? -cmp : cmp;
    });
    return arr;
  }, [linhas, colunas, ordemId, ordemDesc]);

  // [{ chave, linhas }] — um bloco só quando não há agrupamento.
  const blocos = React.useMemo(() => {
    if (!grupo) return [{ chave: null, linhas: ordenadas }];
    const m = new Map();
    ordenadas.forEach((l) => {
      const k = String(grupo.get(l) ?? "—");
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(l);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([chave, ls]) => ({ chave, linhas: ls }));
  }, [ordenadas, grupo]);

  // Só agora o `return null`: os dois useMemo acima estavam DEPOIS do return
  // antecipado, então abrir o modal mudava a contagem de hooks entre um render e
  // o seguinte — o erro clássico "rendered more hooks than during the previous
  // render". Com o return aqui embaixo, a ordem dos hooks é sempre a mesma.
  if (!aberto) return null;

  const somar = (ls, c) => ls.reduce((s, l) => s + (Number(bruto(c, l)) || 0), 0);
  const temTotal = cols.some((c) => c.total);

  // ── Exportações ───────────────────────────────────────────────────────────
  const matriz = () => {
    const aoa = [cols.map((c) => c.label)];
    blocos.forEach((b) => {
      if (b.chave !== null) aoa.push([b.chave]);
      b.linhas.forEach((l) => aoa.push(cols.map((c) => {
        const v = bruto(c, l);
        return c.tipo === "moeda" || c.tipo === "numero" || c.tipo === "pct" ? (Number(v) || 0) : fmt(c, v);
      })));
      if (b.chave !== null && temTotal) {
        aoa.push(cols.map((c, i) => (c.total ? somar(b.linhas, c) : i === 0 ? `Subtotal ${b.chave}` : "")));
        aoa.push([]);
      }
    });
    if (temTotal) aoa.push(cols.map((c, i) => (c.total ? somar(linhas || [], c) : i === 0 ? "TOTAL" : "")));
    return aoa;
  };

  // Os três formatos saem da MESMA matriz (com grupos, subtotais e total) —
  // o que aparece na tela é o que sai no arquivo, em qualquer um deles.
  const exportar = async (formato) => {
    setGerando(formato);
    try {
      const m = matriz();
      if (formato === "csv") baixarCSV(m, titulo);
      else if (formato === "pdf") await baixarPDF(m, { nome: titulo, titulo, subtitulo });
      else await baixarXLSX(m, titulo);
    } finally { setGerando(""); }
  };

  // Impressão em janela própria: mantém o CSS do app fora do caminho e sai igual em qualquer tema.
  const imprimir = () => {
    const esc = (s) => String(s ?? "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
    const linhasHtml = blocos.map((b) => {
      const head = b.chave !== null ? `<tr class="g"><td colspan="${cols.length}">${esc(b.chave)}</td></tr>` : "";
      const corpo = b.linhas.map((l) => `<tr>${cols.map((c) => `<td class="${c.tipo === "moeda" || c.tipo === "numero" || c.tipo === "pct" ? "n" : ""}">${esc(fmt(c, bruto(c, l)))}</td>`).join("")}</tr>`).join("");
      const sub = b.chave !== null && temTotal
        ? `<tr class="s">${cols.map((c, i) => `<td class="${c.total ? "n" : ""}">${c.total ? esc(fmt(c, somar(b.linhas, c))) : i === 0 ? "Subtotal" : ""}</td>`).join("")}</tr>` : "";
      return head + corpo + sub;
    }).join("");
    const total = temTotal
      ? `<tr class="tt">${cols.map((c, i) => `<td class="${c.total ? "n" : ""}">${c.total ? esc(fmt(c, somar(linhas || [], c))) : i === 0 ? "TOTAL" : ""}</td>`).join("")}</tr>` : "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
      @page{size:A4 landscape;margin:12mm}
      body{font:11px/1.4 system-ui,Segoe UI,Arial;color:#111}
      h1{font-size:15px;margin:0 0 2px} .sub{color:#666;font-size:10px;margin-bottom:10px}
      table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left}
      th{background:#f3f3f3;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
      td.n{text-align:right;font-variant-numeric:tabular-nums} tr.g td{background:#eee;font-weight:700}
      tr.s td{font-weight:600;background:#fafafa} tr.tt td{font-weight:800;border-top:2px solid #333}
    </style></head><body><h1>${esc(titulo)}</h1><div class="sub">${esc(subtitulo || "")} · ${(linhas || []).length} linha(s) · gerado em ${new Date().toLocaleString("pt-BR")}</div>
    <table><thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${linhasHtml}${total}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const btn = (label, onClick, principal) => (
    <button onClick={onClick}
      style={{ fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
        border: principal ? "none" : `1px solid ${t.borda}`, background: principal ? "var(--accent)" : "transparent",
        color: principal ? (t.onPrimary || "#181a20") : t.txt2 }}>
      {label}
    </button>
  );

  return (
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 8 : 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.borda}`, width: "100%", maxWidth: 1100, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.borda}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: t.txt }}>{titulo}</div>
              <div style={{ fontSize: 11, color: t.txt2 }}>{subtitulo} · {(linhas || []).length} linha(s)</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 7, flexWrap: "wrap" }}>
              {btn("Imprimir", imprimir)}
              {btn(gerando === "pdf" ? "gerando…" : "PDF", () => exportar("pdf"))}
              {btn(gerando === "csv" ? "gerando…" : "CSV", () => exportar("csv"))}
              {btn(gerando === "xlsx" ? "gerando…" : "XLSX", () => exportar("xlsx"), true)}
              {btn(<Icon n="x" s={13} />, onFechar)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            {agrupavelPor.length > 0 && (
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}
                style={{ fontSize: 11.5, padding: "6px 9px", borderRadius: 7, border: `1px solid ${t.borda}`, background: t.bg, color: t.txt }}>
                <option value="">Sem agrupamento</option>
                {agrupavelPor.map((g) => <option key={g.id} value={g.id}>Agrupar por {g.label}</option>)}
              </select>
            )}
            {colunas.map((c) => {
              const on = visiveis.includes(c.id);
              return (
                <button key={c.id} onClick={() => setVisiveis((v) => (on ? v.filter((x) => x !== c.id) : [...v, c.id]))}
                  style={{ fontSize: 10.5, fontWeight: 600, padding: "5px 9px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                    border: `1px solid ${on ? t.azul : t.borda}`, background: on ? hexRgb(t.azul, .12) : "transparent", color: on ? t.txt : t.txt2 }}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ overflow: "auto", padding: "0 4px 4px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: t.card2, zIndex: 1 }}>
              <tr>
                {cols.map((c) => (
                  <th key={c.id}
                    onClick={() => { setOrdemDesc(ordemId === c.id ? !ordemDesc : true); setOrdemId(c.id); }}
                    style={{ textAlign: c.tipo === "moeda" || c.tipo === "numero" || c.tipo === "pct" ? "right" : "left",
                      padding: "8px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em",
                      color: ordemId === c.id ? t.txt : "var(--text3)", fontFamily: "var(--font-mono)", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {c.label}{ordemId === c.id ? <Icon n={ordemDesc ? "arrow-down" : "arrow-up"} s={11} style={{ marginLeft: 3 }} /> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blocos.map((b) => (
                <React.Fragment key={b.chave ?? "_"}>
                  {b.chave !== null && (
                    <tr><td colSpan={cols.length} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 11.5, color: t.txt, background: hexRgb(t.borda, .25) }}>{b.chave}</td></tr>
                  )}
                  {b.linhas.map((l, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${hexRgb(t.borda, .35)}` }}>
                      {cols.map((c) => (
                        <td key={c.id} style={{ padding: "7px 10px", color: t.txt, whiteSpace: "nowrap",
                          textAlign: c.tipo === "moeda" || c.tipo === "numero" || c.tipo === "pct" ? "right" : "left",
                          fontFamily: c.tipo === "texto" ? "inherit" : "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                          {fmt(c, bruto(c, l))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {b.chave !== null && temTotal && (
                    <tr style={{ borderTop: `1px solid ${t.borda}` }}>
                      {cols.map((c, i) => (
                        <td key={c.id} style={{ padding: "6px 10px", fontWeight: 700, color: t.txt2, textAlign: c.total ? "right" : "left", fontFamily: "var(--font-mono)" }}>
                          {c.total ? fmt(c, somar(b.linhas, c)) : i === 0 ? "Subtotal" : ""}
                        </td>
                      ))}
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {temTotal && (
                <tr style={{ borderTop: `2px solid ${t.borda}` }}>
                  {cols.map((c, i) => (
                    <td key={c.id} style={{ padding: "9px 10px", fontWeight: 800, color: t.txt, textAlign: c.total ? "right" : "left", fontFamily: "var(--font-mono)" }}>
                      {c.total ? fmt(c, somar(linhas || [], c)) : i === 0 ? "TOTAL" : ""}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
