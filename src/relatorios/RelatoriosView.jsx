/**
 * RelatoriosView.jsx — Relatórios com layout tabbed + modal de exportação KPI
 *
 * Props:
 *   dados       : array registros (DADOS)
 *   motoristas  : array motoristas
 *   apontItems  : array apontamentos
 *   sgsItems    : array chamados SGS
 *   t           : objeto tema (legacy)
 *   isMobile    : boolean
 *   onExportPDF : fn(secoes) — dispara geração de PDF com as seções selecionadas
 *                 (usa as funções existentes do App.jsx via callback)
 *   relGeralOpen, setRelGeralOpen — compatibilidade com modais existentes
 *   relOperOpen, setRelOperOpen
 *   relDiariaOpen, setRelDiariaOpen
 *   relDescargaOpen, setRelDescargaOpen
 */
import React, { useState, useMemo } from "react";

// ── Ícone SVG ─────────────────────────────────────────────────────────────────
const Ico = ({ size = 16, color = "currentColor", sw = 1.8, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = "var(--text2)", delta }) {
  const isPos = delta && !delta.startsWith("-");
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-card, 12px)", padding: "18px 20px",
    }}>
      <div style={{
        fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
        color: "var(--text3)", textTransform: "uppercase", marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
        fontSize: 24, color, letterSpacing: "-0.04em", marginBottom: 4, lineHeight: 1,
      }}>
        {value}
      </div>
      {(sub || delta) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          {sub && <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "'DM Sans', sans-serif" }}>{sub}</span>}
          {delta && (
            <span style={{
              fontSize: 11, fontFamily: "'DM Mono', monospace",
              color: isPos ? "var(--green, #22c55e)" : "var(--red, #ef4444)",
            }}>
              {isPos ? "+" : ""}{delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mini bar chart inline ─────────────────────────────────────────────────────
function BarChart({ data, color = "var(--accent)", height = 80 }) {
  const max = Math.max(...data.map(d => d.val), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "'DM Mono', monospace" }}>
            {d.val}
          </span>
          <div style={{
            width: "100%", background: color,
            borderRadius: "3px 3px 0 0",
            height: `${(d.val / max) * (height - 20)}px`,
            opacity: i === data.length - 1 ? 1 : 0.45,
            minHeight: 4,
          }} />
          <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "'DM Mono', monospace" }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Modal de exportação ────────────────────────────────────────────────────────
function ExportModal({ onClose, onConfirm }) {
  const SECOES = [
    { k: "kpis_gerais",    l: "KPIs Gerais",        desc: "Resumo de métricas principais do período", default: true },
    { k: "eficiencia",     l: "Eficiência",          desc: "Indicadores de prazo e descarga",          default: true },
    { k: "financeiro",     l: "Financeiro",          desc: "CTE, contratos e valores",                default: true },
    { k: "motoristas",     l: "Ranking Motoristas",  desc: "Top motoristas por viagens/receita",       default: true },
    { k: "sgs",            l: "Chamados SGS",        desc: "Histórico de chamados SGS",                default: false },
    { k: "apontamentos",   l: "Apontamentos",        desc: "Descargas e stretches",                   default: false },
    { k: "tabela_completa",l: "Tabela Completa",     desc: "Todos os registros com filtros aplicados", default: false },
  ];

  const [selected, setSelected] = useState(
    () => Object.fromEntries(SECOES.map(s => [s.k, s.default]))
  );

  const toggle = k => setSelected(p => ({ ...p, [k]: !p[k] }));
  const count  = Object.values(selected).filter(Boolean).length;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        background: "var(--card)", border: "1px solid var(--border2)",
        borderRadius: 16, padding: "28px", width: "100%", maxWidth: 460,
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
            fontSize: 18, color: "var(--text)",
          }}>
            Exportar Relatório
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text3)", padding: 4,
          }}>
            <Ico size={18}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20 }}>
          Selecione as seções a incluir no PDF
        </div>

        {/* Seções */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {SECOES.map(s => {
            const on = selected[s.k];
            return (
              <label key={s.k} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: on ? "var(--accent2, rgba(124,58,237,0.1))" : "var(--card2)",
                border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                transition: "all 0.15s",
              }}>
                {/* Checkbox visual */}
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  background: on ? "var(--accent)" : "var(--surface)",
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {on && <Ico size={10} color="#fff" sw={2.5}><polyline points="20 6 9 17 4 12"/></Ico>}
                </div>
                <input type="checkbox" checked={on} onChange={() => toggle(s.k)} style={{ display: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "var(--text)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    {s.l}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
                    {s.desc}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, background: "none", border: "1px solid var(--border2)",
            borderRadius: 8, padding: "10px", color: "var(--text2)",
            fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(selected); onClose(); }}
            disabled={count === 0}
            style={{
              flex: 2, background: count > 0 ? "var(--accent)" : "var(--border)",
              border: "none", borderRadius: 8, padding: "10px",
              color: "#fff", fontSize: 13, fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif", cursor: count > 0 ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            Exportar {count > 0 ? `(${count} seções)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TabButton ─────────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "var(--surface)" : "none",
      border: active ? "1px solid var(--border2)" : "1px solid transparent",
      color: active ? "var(--text)" : "var(--text2)",
      fontSize: 13, fontFamily: "'DM Sans', sans-serif",
      fontWeight: active ? 500 : 400,
      padding: "7px 16px", borderRadius: 6, cursor: "pointer",
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RelatoriosView({
  dados = [], motoristas = [], apontItems = [], sgsItems = [],
  t, isMobile,
  setRelGeralOpen, setRelOperOpen, setRelDiariaOpen, setRelDescargaOpen,
}) {
  const [tab, setTab] = useState("kpis");
  const [exportModal, setExportModal] = useState(false);

  // ── KPIs computados dos dados reais ──────────────────────────────────────
  const kpis = useMemo(() => {
    const total   = dados.length;
    const comDesc = dados.filter(r => !!r.data_desc).length;
    const comSGS  = dados.filter(r => !!r.sgs).length;
    const semDesc = dados.filter(r => r.data_agenda && !r.data_desc).length;

    const toNum = v => parseFloat(String(v || "0").replace(/[^0-9,.]/g, "").replace(",", ".")) || 0;
    const totalCTE      = dados.reduce((s, r) => s + toNum(r.vl_cte), 0);
    const totalContrato = dados.reduce((s, r) => s + toNum(r.vl_contrato), 0);

    const fmtK = v => v >= 1000000 ? `R$${(v / 1000000).toFixed(2)}M` : v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`;

    // % descarregados
    const pctDesc = total > 0 ? ((comDesc / total) * 100).toFixed(1) + "%" : "—";

    // Meses recentes para bar chart
    const meses = {};
    dados.forEach(r => {
      const s = r.data_carr || r.data_desc || "";
      let mes = "";
      if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const p = s.split("/"); mes = `${p[1]}/${p[2].slice(2)}`; }
      else if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const p = s.split("-"); mes = `${p[1]}/${p[0].slice(2)}`; }
      if (mes) meses[mes] = (meses[mes] || 0) + 1;
    });
    const barData = Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([label, val]) => ({ label, val }));

    // Top motoristas
    const motCount = {};
    dados.forEach(r => { if (r.nome) motCount[r.nome] = (motCount[r.nome] || 0) + 1; });
    const topMots = Object.entries(motCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([nome, viagens], i) => ({ nome, viagens, rank: i + 1 }));

    return { total, comDesc, comSGS, semDesc, totalCTE, totalContrato, pctDesc, fmtK, barData, topMots };
  }, [dados]);

  // ── Handler de exportação ─────────────────────────────────────────────────
  const handleExport = (secoes) => {
    // Abre os modais PDF existentes de acordo com as seções selecionadas
    if (secoes.kpis_gerais || secoes.tabela_completa) setRelGeralOpen?.(true);
    else if (secoes.eficiencia || secoes.financeiro || secoes.motoristas) setRelGeralOpen?.(true);
    if (secoes.sgs || secoes.apontamentos) setRelOperOpen?.(true);
  };

  const COLORS_MOT = ["var(--accent)", "var(--cyan)", "var(--green)", "var(--orange)", "var(--red)", "var(--yellow)", "var(--accent)", "var(--cyan)"];

  return (
    <div style={{ padding: isMobile ? "16px" : "24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header row: tabs + exportar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{
          display: "flex", background: "var(--card)",
          border: "1px solid var(--border)", borderRadius: 8,
          padding: 4, gap: 2,
        }}>
          {[["kpis", "KPIs Gerais"], ["eficiencia", "Eficiência"], ["financeiro", "Financeiro"], ["motoristas", "Motoristas"]].map(([v, l]) => (
            <TabBtn key={v} label={l} active={tab === v} onClick={() => setTab(v)} />
          ))}
        </div>

        <button
          onClick={() => setExportModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--accent)", border: "none",
            borderRadius: 8, padding: "8px 16px",
            color: "#fff", fontSize: 13, fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <Ico size={14} color="#fff">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </Ico>
          Exportar PDF
        </button>
      </div>

      {/* ══════════ TAB: KPIs Gerais ══════════ */}
      {tab === "kpis" && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
            gap: 12, marginBottom: 20,
          }}>
            <KpiCard label="Total Registros" value={kpis.total}        color="var(--text)"    />
            <KpiCard label="Descarregados"   value={kpis.comDesc}       color="var(--green)"  sub={kpis.pctDesc} />
            <KpiCard label="Pendentes desc." value={kpis.semDesc}       color="var(--orange)" />
            <KpiCard label="Com SGS"         value={kpis.comSGS}        color="var(--yellow)" />
          </div>

          {kpis.barData.length > 0 && (
            <div style={{
              display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 14, marginBottom: 14,
            }}>
              <div style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-card, 12px)", padding: "20px",
              }}>
                <div style={{
                  fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
                  color: "var(--text3)", textTransform: "uppercase", marginBottom: 16,
                }}>
                  Volume por Mês
                </div>
                <BarChart data={kpis.barData} color="var(--accent)" height={100} />
              </div>

              <div style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-card, 12px)", padding: "20px",
              }}>
                <div style={{
                  fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
                  color: "var(--text3)", textTransform: "uppercase", marginBottom: 16,
                }}>
                  Status Geral
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Descarregados",    val: kpis.comDesc,                  total: kpis.total, color: "var(--green)" },
                    { label: "Aguardando desc.", val: kpis.semDesc,                  total: kpis.total, color: "var(--orange)" },
                    { label: "Com SGS",          val: kpis.comSGS,                   total: kpis.total, color: "var(--yellow)" },
                    { label: "Outros",           val: kpis.total - kpis.comDesc - kpis.semDesc, total: kpis.total, color: "var(--text3)" },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text2)" }}>{row.label}</span>
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: row.color }}>{row.val}</span>
                      </div>
                      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", background: row.color, borderRadius: 2,
                          width: row.total > 0 ? `${(row.val / row.total) * 100}%` : "0%",
                          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════ TAB: Eficiência ══════════ */}
      {tab === "eficiencia" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          <KpiCard
            label="Taxa de Descarga"
            value={kpis.pctDesc}
            color="var(--green)"
            sub={`${kpis.comDesc} de ${kpis.total} DTs`}
          />
          <KpiCard
            label="Pendentes Descarga"
            value={kpis.semDesc}
            color="var(--orange)"
            sub="Com agenda sem descarga"
          />
          <KpiCard
            label="Chamados SGS"
            value={kpis.comSGS}
            color="var(--yellow)"
            sub="Ocorrências com SGS ativo"
          />
          {apontItems.length > 0 && (
            <KpiCard
              label="Apontamentos"
              value={apontItems.length}
              color="var(--cyan)"
              sub="Total de apontamentos"
            />
          )}
        </div>
      )}

      {/* ══════════ TAB: Financeiro ══════════ */}
      {tab === "financeiro" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
          <KpiCard
            label="Total CTE"
            value={kpis.fmtK(kpis.totalCTE)}
            color="var(--green)"
            sub="Valor total de CTEs"
          />
          <KpiCard
            label="Total Contratos"
            value={kpis.fmtK(kpis.totalContrato)}
            color="var(--accent)"
            sub="Valor total de contratos"
          />
          {apontItems.length > 0 && (() => {
            const totalApt = apontItems.reduce((s, a) => s + (parseFloat(a.valor) || 0), 0);
            return (
              <KpiCard
                label="Total Apontamentos"
                value={kpis.fmtK(totalApt)}
                color="var(--cyan)"
                sub="Descargas + Stretch"
              />
            );
          })()}
        </div>
      )}

      {/* ══════════ TAB: Motoristas ══════════ */}
      {tab === "motoristas" && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card, 12px)", overflow: "hidden",
        }}>
          {/* Header tabela */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{
              fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
              color: "var(--text3)", textTransform: "uppercase",
            }}>
              Ranking de Motoristas — por viagens
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["#", "MOTORISTA", "VIAGENS", "% DO TOTAL", "EFICIÊNCIA"].map(h => (
                  <th key={h} style={{
                    padding: "9px 16px", textAlign: "left",
                    fontSize: 10, fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.06em", color: "var(--text3)", fontWeight: 400,
                    borderBottom: "1px solid var(--border)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpis.topMots.map((m, i) => {
                const cor = COLORS_MOT[i % COLORS_MOT.length];
                const pct = kpis.total > 0 ? ((m.viagens / kpis.total) * 100).toFixed(1) : 0;
                return (
                  <tr key={m.nome}
                    style={{ borderTop: "1px solid var(--border)", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "11px 16px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: i === 0 ? "var(--yellow)" : "var(--text3)" }}>
                      {m.rank}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: cor + "22", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 700, color: cor, flexShrink: 0,
                        }}>
                          {m.nome.trim().slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{m.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: cor }}>{m.viagens}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ height: 4, width: 80, background: "var(--border)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: cor, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text2)" }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        fontSize: 10, fontFamily: "'DM Mono', monospace",
                        background: "var(--accent2, rgba(124,58,237,0.1))",
                        color: "var(--accent)", padding: "2px 8px",
                        borderRadius: 4, border: "1px solid var(--accent)",
                      }}>
                        ATIVO
                      </span>
                    </td>
                  </tr>
                );
              })}
              {kpis.topMots.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
                    Nenhum dado disponível
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de exportação ── */}
      {exportModal && (
        <ExportModal
          onClose={() => setExportModal(false)}
          onConfirm={handleExport}
        />
      )}
    </div>
  );
}
