import React from "react";
import useModalEsc from "../hooks/useModalEsc.js";
import { listarIndevidasPendentesGlobal, marcarCobrado, desmarcarCobrado } from "../despesas.js";

// CreditosPendentes — visão GLOBAL de cobrança: todas as despesas indevidas ainda sem
// crédito vinculado (indevida=true AND credito_match_id IS NULL), de TODAS as filiais.
// Agrupa por filial, mede o aging (dias em aberto), e permite registrar a cobrança +
// gerar um texto de cobrança por filial. Gated por permissão financeira (canFin).
// O vínculo do crédito em si continua na aba Resultado (por base/mês).

const money = (n) => "R$ " + (Math.abs(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyK = (n) => { const a = Math.abs(n); return a >= 1e6 ? `R$ ${(a / 1e6).toFixed(2)} mi` : a >= 1000 ? `R$ ${Math.round(a / 1000)}k` : `R$ ${Math.round(a)}`; };
const mesLabel = (m) => { if (!m) return ""; const p = String(m).split("/"); return p.length === 2 ? `${p[0]}/${p[1]}` : m; };

// Filial: aba_origem traz IMP / BELÉM / AÇA; cai para base_id se faltar.
const FILIAL_LABEL = { IMP: "Imperatriz", "BELÉM": "Belém", "AÇA": "Açailândia" };
const filialKey = (d) => d.aba_origem || d.base_id || "—";
const filialLabel = (k) => FILIAL_LABEL[k] || k;

// Aging em dias a partir da data do lançamento (dt_mov ISO) ou, na falta, do mês de ref (MM/YYYY → dia 1).
const MS_DIA = 86400000;
const dataLanc = (d) => {
  if (d.dt_mov) { const dt = new Date(d.dt_mov + "T00:00:00"); if (!isNaN(dt)) return dt; }
  if (d.mes_ref) { const p = String(d.mes_ref).split("/"); if (p.length === 2) { const dt = new Date(Number(p[1]), Number(p[0]) - 1, 1); if (!isNaN(dt)) return dt; } }
  return null;
};
const agingDias = (d) => { const dt = dataLanc(d); if (!dt) return null; return Math.max(0, Math.floor((Date.now() - dt.getTime()) / MS_DIA)); };
const faixaCor = (dias, t) => dias == null ? t.txt2 : dias > 60 ? t.danger : dias > 30 ? t.ouro : t.verde;
const hoje = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function CreditosPendentes({ ctx }) {
  const { activeTab, getConexao, t, isMobile, showToast, canFin } = ctx;
  if (activeTab !== "creditos_pendentes") return null;
  if (canFin === false) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira para visualizar os Créditos Pendentes.</div>;
  }

  const conn = React.useMemo(() => (getConexao ? getConexao() : null), [getConexao]);

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const carregar = React.useCallback(() => {
    if (!conn) { setItems([]); return; }
    setLoading(true);
    listarIndevidasPendentesGlobal(conn)
      .then((d) => setItems(d || []))
      .catch((e) => showToast?.("Erro ao carregar pendências: " + e.message, "erro"))
      .finally(() => setLoading(false));
  }, [conn]);
  React.useEffect(() => { carregar(); }, [carregar]);

  // Filtros
  const [filtroFilial, setFiltroFilial] = React.useState("todos");
  const [filtroStatus, setFiltroStatus] = React.useState("todos"); // todos | a_cobrar | cobrados
  const [busca, setBusca] = React.useState("");

  // Inline "cobrar"
  const [cobrandoId, setCobrandoId] = React.useState(null);
  const [obsText, setObsText] = React.useState("");
  // Modal de pré-visualização da cobrança
  const [preview, setPreview] = React.useState(null); // { filialK, texto }
  useModalEsc(!!preview, () => setPreview(null));

  // Filiais presentes (para os chips)
  const filiaisDisp = React.useMemo(() => {
    const s = new Set(items.map(filialKey));
    return [...s].sort();
  }, [items]);

  // Aplicação dos filtros
  const q = busca.trim().toLowerCase();
  const filtrados = React.useMemo(() => items.filter((d) => {
    if (filtroFilial !== "todos" && filialKey(d) !== filtroFilial) return false;
    if (filtroStatus === "a_cobrar" && d.cobrado_em) return false;
    if (filtroStatus === "cobrados" && !d.cobrado_em) return false;
    if (q) {
      const alvo = `${d.natureza || ""} ${d.historico || ""} ${d.conta || ""} ${d.cobranca_obs || ""}`.toLowerCase();
      if (!alvo.includes(q)) return false;
    }
    return true;
  }), [items, filtroFilial, filtroStatus, q]);

  // KPIs (sobre os filtrados)
  const totalPend = filtrados.reduce((s, d) => s + Math.abs(Number(d.valor || 0)), 0);
  const qtdACobrar = filtrados.filter((d) => !d.cobrado_em).length;
  const maisAntigo = filtrados.reduce((mx, d) => { const a = agingDias(d); return a != null && a > mx ? a : mx; }, 0);

  // Agrupamento por filial
  const grupos = React.useMemo(() => {
    const g = {};
    filtrados.forEach((d) => { (g[filialKey(d)] = g[filialKey(d)] || []).push(d); });
    return Object.entries(g)
      .map(([k, arr]) => [k, arr.sort((a, b) => (agingDias(b) || 0) - (agingDias(a) || 0))])
      .sort((a, b) => b[1].reduce((s, d) => s + Math.abs(Number(d.valor || 0)), 0) - a[1].reduce((s, d) => s + Math.abs(Number(d.valor || 0)), 0));
  }, [filtrados]);

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };
  const kpi = (l, v, sub, cor, destaque) => (
    <div style={{ ...card, padding: isMobile ? "12px 10px" : "14px 16px", textAlign: "center", border: destaque ? `2px solid ${cor}` : card.border }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text3)", marginBottom: 5 }}>{l}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: isMobile ? 17 : 22, fontWeight: 800, letterSpacing: "-0.03em", color: cor || t.txt, lineHeight: 1 }}>{v}</div>
      {sub && <div style={{ fontSize: 10, color: t.txt2, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  // ── Ações ──
  const confirmarCobranca = async (id) => {
    try { await marcarCobrado(conn, id, obsText.trim()); showToast?.("Cobrança registrada.", "ok"); setCobrandoId(null); setObsText(""); await carregar(); }
    catch (e) { showToast?.("Erro ao registrar cobrança: " + e.message, "erro"); }
  };
  const desfazer = async (id) => {
    try { await desmarcarCobrado(conn, id); showToast?.("Cobrança desfeita.", "ok"); await carregar(); }
    catch (e) { showToast?.("Erro ao desfazer: " + e.message, "erro"); }
  };

  // Texto de cobrança por filial (decisão a: registrar + gerar cobrança)
  const gerarCobranca = (filialK, arr) => {
    const total = arr.reduce((s, d) => s + Math.abs(Number(d.valor || 0)), 0);
    const linhas = arr.map((d, i) => {
      const a = agingDias(d);
      return `${i + 1}. ${money(Number(d.valor || 0))} — ${d.natureza || d.historico || "—"} (ref. ${mesLabel(d.mes_ref)}${a != null ? `, ${a} dias em aberto` : ""})`;
    });
    const texto =
      `COBRANÇA DE CRÉDITOS — ${filialLabel(filialK)}\n` +
      `Gerado em ${hoje()}\n\n` +
      `${linhas.join("\n")}\n\n` +
      `TOTAL: ${money(total)} — ${arr.length} ${arr.length === 1 ? "lançamento" : "lançamentos"}`;
    setPreview({ filialK, texto });
  };
  const copiar = (texto) => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texto).then(() => showToast?.("Cobrança copiada.", "ok")).catch(() => {});
    else showToast?.("Selecione e copie o texto.", "warn");
  };

  const chip = (k, l, ativo, onClick, cor) => (
    <button key={k} onClick={onClick}
      style={{ fontSize: 12, fontWeight: ativo ? 700 : 500, padding: "7px 13px", cursor: "pointer", borderRadius: 8,
        border: `1px solid ${ativo ? (cor || "var(--accent)") : t.borda}`,
        background: ativo ? (cor || "var(--accent)") : "transparent", color: ativo ? "#fff" : t.txt2, whiteSpace: "nowrap" }}>
      {l}
    </button>
  );

  return (
    <div style={{ padding: isMobile ? 12 : "20px 24px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span style={{ fontSize: 17, fontWeight: 800, color: t.txt, letterSpacing: "-0.02em" }}>Créditos Pendentes</span>
      </div>
      <div style={{ fontSize: 11, color: t.txt2, marginBottom: 16 }}>
        Despesas indevidas de todas as filiais ainda sem crédito vinculado. O vínculo do crédito é feito na aba <b>Resultado</b>.
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {kpi("Total pendente", money(totalPend), `${filtrados.length} ${filtrados.length === 1 ? "lançamento" : "lançamentos"}`, t.danger, true)}
        {kpi("A cobrar", String(qtdACobrar), "ainda não cobrados", qtdACobrar > 0 ? t.ouro : t.verde)}
        {kpi("Já cobrados", String(filtrados.length - qtdACobrar), "aguardando crédito", t.txt)}
        {kpi("Mais antigo", maisAntigo > 0 ? `${maisAntigo} d` : "—", "em aberto", faixaCor(maisAntigo, t))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
        {chip("todos", "Todas as filiais", filtroFilial === "todos", () => setFiltroFilial("todos"))}
        {filiaisDisp.map((k) => chip(k, filialLabel(k), filtroFilial === k, () => setFiltroFilial(k)))}
        <div style={{ display: "flex", border: `1px solid ${t.borda}`, borderRadius: 8, overflow: "hidden", marginLeft: isMobile ? 0 : 6 }}>
          {[["todos", "Todos"], ["a_cobrar", "A cobrar"], ["cobrados", "Cobrados"]].map(([k, l], i) => (
            <button key={k} onClick={() => setFiltroStatus(k)}
              style={{ fontSize: 12, fontWeight: filtroStatus === k ? 700 : 500, padding: "7px 12px", cursor: "pointer",
                border: "none", borderRight: i < 2 ? `1px solid ${t.borda}` : "none",
                background: filtroStatus === k ? "var(--accent)" : "transparent", color: filtroStatus === k ? "#fff" : t.txt2 }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.txt2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar por cliente / natureza / histórico..."
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 30, paddingRight: busca ? 28 : 10, paddingTop: 7, paddingBottom: 7,
              fontSize: 12, borderRadius: 8, border: `1.5px solid ${busca ? t.ouro : t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" }} />
          {busca && (
            <button onClick={() => setBusca("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.txt2, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div style={{ ...card, textAlign: "center", color: t.txt2, fontSize: 13, padding: 32 }}>Carregando pendências…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: t.txt2, fontSize: 13, padding: 32 }}>
          {items.length === 0 ? "Nenhuma despesa indevida pendente. 🎉" : "Nada encontrado com os filtros atuais."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {grupos.map(([filialK, arr]) => {
            const totFil = arr.reduce((s, d) => s + Math.abs(Number(d.valor || 0)), 0);
            return (
              <div key={filialK} style={{ ...card }}>
                {/* Cabeçalho da filial */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>{filialLabel(filialK)}</span>
                  <span style={{ background: `${t.danger}1a`, color: t.danger, fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{arr.length}</span>
                  <span style={{ fontSize: 12, color: t.txt2, fontFamily: "var(--font-mono)" }}>{money(totFil)}</span>
                  <button onClick={() => gerarCobranca(filialK, arr)}
                    style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", whiteSpace: "nowrap" }}>
                    Gerar cobrança
                  </button>
                </div>

                {/* Linhas */}
                {arr.map((d, i) => {
                  const a = agingDias(d);
                  const emCobranca = cobrandoId === d.id;
                  return (
                    <div key={d.id} style={{ padding: "11px 4px", borderBottom: i < arr.length - 1 ? `1px solid ${t.borda}55` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: `${t.danger}1a`, color: t.danger, fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 8, minWidth: 84, textAlign: "center", flexShrink: 0 }}>{money(Number(d.valor || 0))}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.natureza || d.historico || "—"}</div>
                          <div style={{ fontSize: 10, marginTop: 1, color: t.txt2 }}>
                            ref. {mesLabel(d.mes_ref)}
                            {a != null && <span style={{ color: faixaCor(a, t), fontWeight: 700 }}> · {a} dias</span>}
                            {d.cobrado_em && <span style={{ color: t.verde, fontWeight: 700 }}> · ✓ cobrado {new Date(d.cobrado_em).toLocaleDateString("pt-BR")}</span>}
                          </div>
                          {d.cobrado_em && d.cobranca_obs && <div style={{ fontSize: 10, color: t.txt2, marginTop: 1, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>“{d.cobranca_obs}”</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                          {!d.cobrado_em && !emCobranca && (
                            <button onClick={() => { setCobrandoId(d.id); setObsText(""); }}
                              style={{ fontSize: 11, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "none", background: t.ouro, color: "#1a1a1a", whiteSpace: "nowrap" }}>
                              Cobrar
                            </button>
                          )}
                          {d.cobrado_em && (
                            <button onClick={() => desfazer(d.id)}
                              style={{ fontSize: 11, padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2, whiteSpace: "nowrap" }}>
                              Desfazer
                            </button>
                          )}
                        </div>
                      </div>
                      {emCobranca && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                          <input value={obsText} onChange={(e) => setObsText(e.target.value)} autoFocus
                            placeholder="Observação (a quem / como cobrou) — opcional"
                            onKeyDown={(e) => { if (e.key === "Enter") confirmarCobranca(d.id); }}
                            style={{ flex: 1, minWidth: 0, padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" }} />
                          <button onClick={() => confirmarCobranca(d.id)}
                            style={{ fontSize: 11, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "none", background: t.verde, color: "#fff", whiteSpace: "nowrap" }}>
                            Registrar
                          </button>
                          <button onClick={() => { setCobrandoId(null); setObsText(""); }}
                            style={{ fontSize: 11, padding: "7px 11px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2 }}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — pré-visualização da cobrança */}
      {preview && (
        <div onClick={() => setPreview(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ ...card, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Cobrança · {filialLabel(preview.filialK)}</span>
              <button onClick={() => setPreview(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: t.txt2, fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <textarea readOnly value={preview.texto}
              style={{ flex: 1, minHeight: 220, resize: "vertical", padding: 12, fontSize: 12, lineHeight: 1.5, borderRadius: 8, border: `1px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "var(--font-mono)", outline: "none" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setPreview(null)} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2 }}>Fechar</button>
              <button onClick={() => copiar(preview.texto)} style={{ fontSize: 12, fontWeight: 700, padding: "9px 18px", borderRadius: 8, cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff" }}>Copiar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
