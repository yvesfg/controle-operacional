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
import { FIELD_CATALOG, FIELD_GROUPS } from "./fieldCatalog.js";

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
        fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
        color: "var(--text3)", textTransform: "uppercase", marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-heading)", fontWeight: 700,
        fontSize: "clamp(16px,3.5vw,24px)", color, letterSpacing: "-0.04em", marginBottom: 4, lineHeight: 1,
      }}>
        {value}
      </div>
      {(sub || delta) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          {sub && <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "'DM Sans', sans-serif" }}>{sub}</span>}
          {delta && (
            <span style={{
              fontSize: 11, fontFamily: "var(--font-mono)",
              color: isPos ? "var(--green)" : "var(--red)",
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
          <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
            {d.val}
          </span>
          <div style={{
            width: "100%", background: color,
            borderRadius: "3px 3px 0 0",
            height: `${(d.val / max) * (height - 20)}px`,
            opacity: i === data.length - 1 ? 1 : 0.45,
            minHeight: 4,
          }} />
          <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
            {d.label}
          </span>
        </div>
      ))}
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
      fontSize: 12, fontFamily: "'DM Sans', sans-serif",
      fontWeight: active ? 500 : 400,
      padding: "6px 10px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
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
  onExportClick,
  setRelGeralOpen, setRelOperOpen, setRelDiariaOpen, setRelDescargaOpen,
}) {
  const [tab, setTab] = useState("all");

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


  const COLORS_MOT = ["var(--accent)", "var(--cyan)", "var(--green)", "var(--orange)", "var(--red)", "var(--yellow)", "var(--accent)", "var(--cyan)"];

  return (
    <div style={{ padding: isMobile ? "10px 8px" : "20px 24px", width: "100%", boxSizing: "border-box" }}>

      {/* ── Header row: tabs + exportar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 12 : 20, flexWrap: "wrap", gap: isMobile ? 6 : 10 }}>
        <div style={{
          display: "flex", background: "var(--card)",
          border: "1px solid var(--border)", borderRadius: 8,
          padding: 4, gap: 2, overflowX: "auto", flexShrink: 1,
        }}>
          {[["all", "Tudo"], ["kpis", "KPIs"], ["eficiencia", "Eficiência"], ["financeiro", "Financeiro"], ["motoristas", "Motoristas"]].map(([v, l]) => (
            <TabBtn key={v} label={l} active={tab === v} onClick={() => setTab(v)} />
          ))}
        </div>

        <button
          onClick={() => onExportClick?.()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--accent)", border: "none",
            borderRadius: 8, padding: isMobile ? "6px 10px" : "8px 16px",
            color: "#fff", fontSize: isMobile ? 12 : 13, fontWeight: 600,
            fontFamily: "var(--font-heading)", cursor: "pointer",
            transition: "opacity 0.15s", whiteSpace: "nowrap",
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
      {(tab === "kpis" || tab === "all") && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
            gap: isMobile ? 8 : 14, marginBottom: isMobile ? 12 : 24,
          }}>
            {[
              { label: "Total Registros", value: kpis.total,   color: "var(--accent)",   border: "var(--accent)",   sub: "DTs no período" },
              { label: "Descarregados",   value: kpis.comDesc, color: "var(--green)",    border: "var(--green)",    sub: kpis.pctDesc },
              { label: "Pendentes",       value: kpis.semDesc, color: "var(--orange)",   border: "var(--orange)",   sub: "Aguardando descarga" },
              { label: "Com SGS",         value: kpis.comSGS,  color: "var(--yellow)",   border: "var(--yellow)",   sub: "Chamados ativos" },
            ].map(c => (
              <div key={c.label} style={{
                background: "var(--card)",
                border: `1px solid ${c.border}`,
                borderRadius: "var(--radius-card, 12px)",
                padding: isMobile ? "12px 10px" : "18px 16px",
              }}>
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: "var(--text3)", textTransform: "uppercase", marginBottom: isMobile ? 6 : 10 }}>
                  {c.label}
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: isMobile ? 22 : 32, color: c.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: isMobile ? 4 : 8 }}>
                  {c.value}
                </div>
                {c.sub && <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.sub}</div>}
              </div>
            ))}
          </div>

          {kpis.barData.length > 0 && (
            <div style={{
              display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? 8 : 14, marginBottom: isMobile ? 8 : 14,
            }}>
              <div style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-card, 12px)", padding: "20px",
              }}>
                <div style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
                  color: "var(--text3)", textTransform: "uppercase", marginBottom: 16,
                }}>
                  Volume por Mês
                </div>
                <BarChart data={kpis.barData} color="var(--accent)" height={isMobile ? 70 : 100} />
              </div>

              <div style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-card, 12px)", padding: "20px",
              }}>
                <div style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
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
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: row.color }}>{row.val}</span>
                      </div>
                      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", background: row.color, borderRadius: 2,
                          width: "100%", transformOrigin: "left",
                          transform: `scaleX(${row.total > 0 ? (row.val / row.total) : 0})`,
                          transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
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
      {(tab === "eficiencia" || tab === "all") && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
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
      {(tab === "financeiro" || tab === "all") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
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
      {(tab === "motoristas" || tab === "all") && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card, 12px)", overflow: "hidden",
        }}>
          {/* Header tabela */}
          <div style={{ padding: isMobile ? "10px 12px" : "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
              color: "var(--text3)", textTransform: "uppercase",
            }}>
              Ranking de Motoristas — por viagens
            </div>
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 480 : "auto" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["#", "MOTORISTA", "VIAGENS", "% DO TOTAL", "EFICIÊNCIA"].map(h => (
                  <th key={h} style={{
                    padding: isMobile ? "7px 8px" : "9px 16px", textAlign: "left",
                    fontSize: 9, fontFamily: "var(--font-mono)",
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
                    <td style={{ padding: isMobile ? "8px 8px" : "11px 16px", fontFamily: "var(--font-mono)", fontSize: isMobile ? 11 : 12, color: i === 0 ? "var(--yellow)" : "var(--text3)" }}>
                      {m.rank}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: cor + "22", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontFamily: "var(--font-heading)",
                          fontWeight: 700, color: cor, flexShrink: 0,
                        }}>
                          {m.nome.trim().slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: 500, color: "var(--text)" }}>{m.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: isMobile ? "8px 8px" : "11px 16px", fontFamily: "var(--font-mono)", fontSize: isMobile ? 12 : 13, color: cor }}>{m.viagens}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ height: 4, width: 80, background: "var(--border)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: cor, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text2)" }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        fontSize: 10, fontFamily: "var(--font-mono)",
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
        </div>
      )}

      {/* ── Modal de exportação ── */}
    </div>
  );
}
