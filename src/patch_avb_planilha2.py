#!/usr/bin/env python3
"""patch_avb_planilha2.py — substitui o tbody hardcoded por render dinamico com activeCols"""
import sys

SRC = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/views/PlanilhaView.jsx"

with open(SRC, encoding="utf-8") as f:
    txt = f.read()

original = txt

# Bloco de tbody hardcoded a ser substituido
OLD_TBODY = '''                {/* DT */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: "var(--accent)", fontWeight: 700, fontSize: 11, textAlign: "center",
                  fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {r.dt}
                </td>
                {/* Motorista */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: "var(--text)", fontSize: 12,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontFamily: "'DM Sans', sans-serif",
                }} title={r.nome || "—"}>
                  {r.nome || "—"}
                </td>
                {/* Placa */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", textAlign: "center",
                  color: "var(--green, #22c55e)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {r.placa || "—"}
                </td>
                {/* Origem */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: "var(--text2)", fontSize: 10, textAlign: "center",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }} title={r.origem || "—"}>
                  {r.origem || "—"}
                </td>
                {/* Destino */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: "var(--text2)", fontSize: 10,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }} title={r.destino || "—"}>
                  {r.destino || "—"}
                </td>
                {/* Carregamento */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: "var(--yellow, #eab308)", fontSize: 10, textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {r.data_carr || "—"}
                </td>
                {/* Agenda */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: "var(--text2)", fontSize: 10, textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {r.data_agenda || "—"}
                </td>
                {/* Descarga */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: r.data_desc ? "var(--green, #22c55e)" : "var(--red, #ef4444)",
                  fontSize: 10, textAlign: "center", fontFamily: "var(--font-mono)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {r.data_desc || "—"}
                </td>
                {/* Status */}
                <td style={{
                  padding: "7px 6px", borderBottom: "1px solid var(--border)",
                  color: "var(--text2)", fontSize: 10, textAlign: "center",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {r.status || "—"}
                </td>'''

NEW_TBODY = '''                {activeCols.map(c => {
                  let val = r[c.k];
                  // AVB: placas agrupadas
                  if (isAvb && c.k === "placa") val = [r.placa, r.placa2, r.placa3].filter(Boolean).join(" / ") || "—";
                  // AVB: status badge simplificado
                  const isStatus = c.k === "status";
                  const isPend = isStatus && (val||"").toUpperCase() === "PENDENTE";
                  const isCarreg = isStatus && (val||"").toUpperCase() === "CARREGADO";
                  // AVB: flags documentais na coluna CTE/MDF
                  const isCte = c.k === "cte", isMdf = c.k === "mdf";
                  const hasVal = val && val !== "—" && val !== "";
                  return (
                    <td key={c.k} style={{
                      padding: "7px 6px", borderBottom: "1px solid var(--border)",
                      fontSize: c.k === "dt" ? 11 : 10, textAlign: "center",
                      fontFamily: ["dt","codigo","placa","data_carr","data_agenda","cte","mdf","adiant","saldo","vl_contrato"].includes(c.k) ? "var(--font-mono)" : "inherit",
                      color: c.k === "dt" ? "var(--accent)"
                        : c.k === "placa" ? "var(--green, #22c55e)"
                        : c.k === "data_carr" ? "var(--yellow, #eab308)"
                        : (isCte || isMdf) ? (hasVal ? "var(--green, #22c55e)" : "var(--red, #ef4444)")
                        : isStatus ? (isPend ? "var(--yellow, #eab308)" : isCarreg ? "var(--green, #22c55e)" : "var(--text2)")
                        : "var(--text2)",
                      fontWeight: c.k === "dt" ? 700 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      letterSpacing: c.k === "dt" ? "0.06em" : 0,
                    }} title={String(val||"")}>
                      {(isCte || isMdf) ? (hasVal ? val : "✗") : (val || "—")}
                    </td>
                  );
                })}'''

if OLD_TBODY in txt:
    txt = txt.replace(OLD_TBODY, NEW_TBODY, 1)
    print("OK: tbody substituido por render dinamico com activeCols")
else:
    print("FAIL: bloco tbody nao encontrado")
    sys.exit(1)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(txt)
print(f"PlanilhaView.jsx salvo ({txt.count(chr(10))} linhas)")
