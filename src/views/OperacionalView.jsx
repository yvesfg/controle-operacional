/**
 * OperacionalView.jsx — SGS · ID Diárias · Apontamentos
 * Extraído do App.jsx. Recebe ctx com toda a state/callbacks necessários.
 * "Ocorrências" foi movida para sidebar PÓS-CARGA como tab independente.
 *
 * Props:
 *   ctx.operSubTab, ctx.setOperSubTab
 *   ctx.sgsItems, ctx.setSgsItems
 *   ctx.sgsForm, ctx.setSgsForm, ctx.sgsFormOpen, ctx.setSgsFormOpen
 *   ctx.expandedSgsId, ctx.setExpandedSgsId
 *   ctx.sgsRetornoForm, ctx.setSgsRetornoForm
 *   ctx.apontItems, ctx.setApontItems
 *   ctx.apontForm, ctx.setApontForm, ctx.apontFormOpen, ctx.setApontFormOpen
 *   ctx.apontLoading
 *   ctx.relCtrlDccOpen, ctx.setRelCtrlDccOpen
 *   ctx.diariasData
 *   ctx.abrirDetalhe, ctx.showToast, ctx.getConexao
 *   ctx.fmtMoeda, ctx.parseData, ctx.inputToBr, ctx.diffDias
 *   ctx.saveJSON, ctx.supaFetch, ctx.apontToSupabase, ctx.TABLE_APOINTS
 *   ctx.t, ctx.isMobile, ctx.theme, ctx.usuarioLogado, ctx.perfil
 *   ctx.css, ctx.hIco
 */
import React from "react";
import { clickable } from "../utils.js";

// ── Ícone SVG ─────────────────────────────────────────────────────────────────
const Ico = ({ size = 16, color = "currentColor", sw = 1.8, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

// ── Módulo Card (novo design pattern) ─────────────────────────────────────────
function ModuleCard({ icon, label, sub, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${active ? color : "var(--border)"}`,
        borderRadius: 10,
        padding: "16px 10px",
        cursor: "pointer",
        background: active ? `${color}12` : "var(--card)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        transition: "all 0.2s",
        fontFamily: "inherit",
        flex: 1,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.background = "var(--card2)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--card)";
        }
      }}
    >
      {/* Icon box */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 500,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: active ? color : "var(--text)",
      }}>
        {label}
      </span>
      <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: "var(--text3)", textAlign: "center", lineHeight: 1.3 }}>
        {sub}
      </span>
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function OperacionalView({ ctx }) {
  const {
    operSubTab, setOperSubTab,
    sgsItems, setSgsItems,
    sgsForm, setSgsForm, sgsFormOpen, setSgsFormOpen,
    expandedSgsId, setExpandedSgsId,
    sgsRetornoForm, setSgsRetornoForm,
    apontItems, setApontItems,
    apontForm, setApontForm, apontFormOpen, setApontFormOpen,
    apontLoading,
    relCtrlDccOpen, setRelCtrlDccOpen,
    diariasData,
    abrirDetalhe, showToast, getConexao,
    fmtMoeda, parseData, inputToBr, diffDias,
    saveJSON, supaFetch, apontToSupabase, TABLE_APOINTS,
    t, isMobile, theme, usuarioLogado, perfil,
    css, hIco,
  } = ctx;

  // ── Funções locais (mesmas do IIFE original) ──────────────────────────────
  const saveSGS = arr => { setSgsItems(arr); saveJSON("co_sgs", arr); };

  const saveAponts = async (arr, novoItem = null) => {
    setApontItems(arr);
    saveJSON("co_aponts", arr);
    if (novoItem) {
      const conn = getConexao();
      if (conn) {
        try {
          await supaFetch(conn.url, conn.key, "POST",
            `${TABLE_APOINTS}?on_conflict=apontamento`,
            [apontToSupabase(novoItem)]);
        } catch (e) { console.warn("Apontamento salvo apenas local:", e.message); }
      }
    }
  };

  const deleteApontSupabase = async apontamento => {
    const conn = getConexao();
    if (conn && apontamento) {
      try {
        await supaFetch(conn.url, conn.key, "DELETE",
          `${TABLE_APOINTS}?apontamento=eq.${encodeURIComponent(apontamento)}`);
      } catch (e) { console.warn("Erro ao excluir no Supabase:", e.message); }
    }
  };

  // ── Estilos locais (CSS variables) ───────────────────────────────────────
  const inp  = { ...css.inp, fontSize: 12, padding: "8px 10px" };
  const lbl  = { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: 3 };
  const MODULE_COLORS = {
    sgs:          "var(--yellow, #eab308)",
    diarias_id:   "var(--cyan, #06b6d4)",
    apontamentos: "var(--green, #22c55e)",
  };

  // ── Sub-módulos (sem Ocorrências — movida para sidebar) ──────────────────
  const subBtns = [
    {
      k: "sgs",
      label: "SGS · Chamados",
      sub: "Chamados SGS",
      color: MODULE_COLORS.sgs,
      icon: <Ico size={20} color={MODULE_COLORS.sgs}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </Ico>,
    },
    {
      k: "diarias_id",
      label: "ID Diárias",
      sub: "IDs vinculados",
      color: MODULE_COLORS.diarias_id,
      icon: <Ico size={20} color={MODULE_COLORS.diarias_id}>
        <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>
      </Ico>,
    },
    {
      k: "apontamentos",
      label: "Apontamentos",
      sub: "Descargas/Stretch",
      color: MODULE_COLORS.apontamentos,
      icon: <Ico size={20} color={MODULE_COLORS.apontamentos}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </Ico>,
    },
  ];

  return (
    <div>
      {/* ── Grid de módulos ── */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 20, flexWrap: isMobile ? "wrap" : "nowrap",
      }}>
        {subBtns.map(sb => (
          <ModuleCard
            key={sb.k}
            icon={sb.icon}
            label={sb.label}
            sub={sb.sub}
            active={operSubTab === sb.k}
            color={sb.color}
            onClick={() => setOperSubTab(sb.k)}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════
          SGS CHAMADOS
      ═══════════════════════════════════ */}
      {operSubTab === "sgs" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ ...css.secTitle, margin: 0 }}>
              {hIco(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>, t.ouro, 12)}
              Chamados SGS
              <span style={{ flex: 1, height: 1, background: t.borda }} />
            </div>
            <button onClick={() => { setSgsForm({ numero: "", data_chamado: "", ultimo_retorno: "", descricao: "", dt_rel: "", status: "aberto" }); setSgsFormOpen(true); }} style={{ ...css.btnGold, padding: "8px 12px", fontSize: 11 }}>＋ Novo</button>
          </div>

          {sgsFormOpen && (
            <div style={{ background: t.card, borderRadius: 12, border: `1px solid var(--accent)44`, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 12, marginBottom: 10 }}>📞 Registrar Chamado SGS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={lbl}>Nº do Chamado</label><input value={sgsForm.numero} onChange={e => setSgsForm(p => ({ ...p, numero: e.target.value }))} placeholder="SGS-000000" style={inp} /></div>
                <div><label style={lbl}>DT Relacionado</label><input value={sgsForm.dt_rel} onChange={e => setSgsForm(p => ({ ...p, dt_rel: e.target.value }))} placeholder="Ex: 12345678" style={inp} /></div>
                <div><label style={lbl}>Data do Chamado</label><input type="date" value={sgsForm.data_chamado} onChange={e => setSgsForm(p => ({ ...p, data_chamado: e.target.value }))} style={inp} /></div>
                <div><label style={lbl}>Último Retorno</label><input type="date" value={sgsForm.ultimo_retorno} onChange={e => setSgsForm(p => ({ ...p, ultimo_retorno: e.target.value }))} style={inp} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Descrição</label><textarea value={sgsForm.descricao} onChange={e => setSgsForm(p => ({ ...p, descricao: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
                <div>
                  <label style={lbl}>Status</label>
                  <select value={sgsForm.status} onChange={e => setSgsForm(p => ({ ...p, status: e.target.value }))} style={{ ...inp, appearance: "none" }}>
                    <option value="aberto">🔴 Aberto</option>
                    <option value="andamento">🟡 Em Andamento</option>
                    <option value="encerrado">🟢 Encerrado</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setSgsFormOpen(false)} style={{ flex: "0 0 auto", background: "transparent", border: `1.5px solid var(--border)`, borderRadius: 8, padding: "8px 12px", color: "var(--text2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>CANCELAR</button>
                <button onClick={() => {
                  if (!sgsForm.numero) { showToast("⚠️ Informe o nº do chamado", "warn"); return; }
                  const nova = [{ ...sgsForm, id: Date.now(), criado_em: new Date().toISOString(), usuario: usuarioLogado || perfil }, ...sgsItems];
                  saveSGS(nova); setSgsFormOpen(false);
                  showToast("✅ Chamado registrado!", "ok");
                }} style={{ ...css.btnGold, flex: 1, justifyContent: "center", fontSize: 12 }}>💾 Salvar Chamado</button>
              </div>
            </div>
          )}

          {sgsItems.length === 0 ? (
            <div style={css.empty}><div style={{ fontSize: 36, marginBottom: 8 }}>📞</div><div style={{ fontSize: 13, color: t.txt2 }}>Nenhum chamado SGS registrado</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sgsItems.map((s, i) => {
                const statusC = s.status === "encerrado" ? t.verde : s.status === "andamento" ? t.ouro : t.danger;
                const statusIco = s.status === "encerrado" ? "🟢" : s.status === "andamento" ? "🟡" : "🔴";
                const retornos = Array.isArray(s.retornos) ? s.retornos : [];
                const ultimoRet = retornos.length > 0 ? retornos[retornos.length - 1] : null;
                const dataUltimoRet = ultimoRet?.data || s.ultimo_retorno;
                const diasSemRetorno = dataUltimoRet ? diffDias(parseData(inputToBr(dataUltimoRet)), new Date()) : null;
                const alertaRetorno = diasSemRetorno !== null && diasSemRetorno > 5;
                const isExpanded = expandedSgsId === (s.id || i);
                const toggleExpand = () => { setExpandedSgsId(isExpanded ? null : (s.id || i)); setSgsRetornoForm({ data: "", descricao: "" }); };

                return (
                  <div key={s.id || i} style={{ background: t.card, borderRadius: 11, border: `1px solid ${statusC}`, overflow: "hidden", transition: "border .2s" }}>
                    <div onClick={toggleExpand} style={{ padding: 12, cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--yellow, #eab308)" }}>{s.numero || "—"}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: statusC, background: `${statusC}18`, border: `1px solid ${statusC}33`, borderRadius: 4, padding: "2px 7px", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>{statusIco} {s.status?.toUpperCase() || "ABERTO"}</span>
                            {s.dt_rel && <span style={{ fontSize: 9, color: t.txt2 }}>DT: {s.dt_rel}</span>}
                            {alertaRetorno && <span style={{ fontSize: 9, color: t.danger, fontWeight: 700, background: `rgba(246,70,93,.08)`, border: `1px solid rgba(246,70,93,.2)`, borderRadius: 4, padding: "2px 7px" }}>⚠️ {diasSemRetorno}d sem retorno</span>}
                            <span style={{ marginLeft: "auto", fontSize: 10, color: t.txt2, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
                          </div>
                          <div style={{ fontSize: 11, color: t.txt2, marginTop: 3, lineHeight: 1.5 }}>
                            📅 Chamado: <strong style={{ color: t.txt }}>{s.data_chamado ? new Date(s.data_chamado + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</strong>
                            {dataUltimoRet && <> · 🔄 Último retorno: <strong style={{ color: t.txt }}>{new Date(dataUltimoRet + "T12:00:00").toLocaleDateString("pt-BR")}</strong></>}
                            {retornos.length > 0 && <span style={{ marginLeft: 6, fontSize: 9, background: `rgba(217,98,43,.1)`, color: t.ouro, borderRadius: 4, padding: "1px 5px" }}>{retornos.length} retorno{retornos.length > 1 ? "s" : ""}</span>}
                          </div>
                          {s.descricao && <div style={{ fontSize: 11, color: t.txt, marginTop: 4, lineHeight: 1.4 }}>{s.descricao}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { const a = [...sgsItems]; a[i] = { ...a[i], status: a[i].status === "encerrado" ? "aberto" : "encerrado" }; saveSGS(a); }} style={{ background: s.status === "encerrado" ? `rgba(246,70,93,.08)` : `rgba(2,192,118,.08)`, border: `1px solid ${s.status === "encerrado" ? t.danger : t.verde}33`, borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.status === "encerrado" ? "🔴" : "🟢"}</button>
                          <button onClick={() => { if (confirm("Excluir este chamado?")) { const n = [...sgsItems]; n.splice(i, 1); saveSGS(n); } }} style={{ background: `rgba(246,70,93,.08)`, border: `1px solid rgba(246,70,93,.18)`, borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: `1px solid var(--border)`, padding: "10px 12px", background: `rgba(234,179,8,.02)` }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: t.ouro, marginBottom: 8 }}>🔄 Histórico de Retornos</div>
                        {retornos.length === 0 ? (
                          <div style={{ fontSize: 10, color: t.txt2, marginBottom: 10 }}>Nenhum retorno registrado ainda.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                            {retornos.map((r, ri) => (
                              <div key={ri} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: t.card2, borderRadius: 7, padding: "7px 10px", border: `1px solid ${t.borda}` }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: t.azulLt, whiteSpace: "nowrap" }}>{r.data ? new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</span>
                                <span style={{ fontSize: 10, color: t.txt, flex: 1 }}>{r.descricao || "-"}</span>
                                <button onClick={() => { const a = [...sgsItems]; a[i] = { ...a[i], retornos: retornos.filter((_, j) => j !== ri), ultimo_retorno: retornos.filter((_, j) => j !== ri).at(-1)?.data || s.data_chamado || "" }; saveSGS(a); }} style={{ background: "transparent", border: "none", color: t.danger, cursor: "pointer", fontSize: 11, flexShrink: 0, padding: 2 }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ background: t.card2, borderRadius: 8, padding: "8px 10px", border: `1px solid rgba(234,179,8,.2)` }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: t.ouro, marginBottom: 6 }}>＋ NOVO RETORNO</div>
                          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 6, alignItems: "end" }}>
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 600, color: t.txt2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Data</div>
                              <input type="date" value={sgsRetornoForm.data} onChange={e => setSgsRetornoForm(p => ({ ...p, data: e.target.value }))} style={{ ...css.inp, fontSize: 11, padding: "6px 8px", width: "100%" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 600, color: t.txt2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Descrição</div>
                              <input value={sgsRetornoForm.descricao} onChange={e => setSgsRetornoForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Resumo do retorno..." style={{ ...css.inp, fontSize: 11, padding: "6px 8px", width: "100%" }} onKeyDown={e => {
                                if (e.key === "Enter" && sgsRetornoForm.data) {
                                  const nr = { data: sgsRetornoForm.data, descricao: sgsRetornoForm.descricao };
                                  const a = [...sgsItems]; a[i] = { ...a[i], retornos: [...retornos, nr], ultimo_retorno: sgsRetornoForm.data }; saveSGS(a); setSgsRetornoForm({ data: "", descricao: "" });
                                }
                              }} />
                            </div>
                            <button onClick={() => {
                              if (!sgsRetornoForm.data) { showToast("⚠️ Informe a data do retorno", "warn"); return; }
                              const nr = { data: sgsRetornoForm.data, descricao: sgsRetornoForm.descricao };
                              const a = [...sgsItems]; a[i] = { ...a[i], retornos: [...retornos, nr], ultimo_retorno: sgsRetornoForm.data }; saveSGS(a); setSgsRetornoForm({ data: "", descricao: "" });
                            }} style={{ ...css.btnGold, padding: "6px 12px", fontSize: 11, flexShrink: 0 }}>Salvar</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════
          ID DIÁRIAS
      ═══════════════════════════════════ */}
      {operSubTab === "diarias_id" && (
        <div>
          <div style={{ ...css.secTitle, marginBottom: 12 }}>
            {hIco(<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>, t.ouro, 12)}
            ID Diárias
            <span style={{ flex: 1, height: 1, background: t.borda }} />
          </div>
          {diariasData.items.filter(i => i.tipo === "diaria" || i.tipo === "atraso").length === 0 ? (
            <div style={css.empty}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🛏️</div>
              <div style={{ fontSize: 13, color: t.txt2 }}>Nenhum registro com diária identificado</div>
              <div style={{ fontSize: 10, color: t.txt2, marginTop: 4 }}>Preencha o campo "Chegada" para calcular diárias.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(() => {
                const semRo = diariasData.items.filter(i => (i.tipo === "diaria" || i.tipo === "atraso") && !i.r.ro);
                if (semRo.length === 0) return null;
                return (
                  <div style={{ background: `rgba(255,152,0,.07)`, border: `1px solid rgba(255,152,0,.28)`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                    <div>
                      <div style={{ fontSize: 11, color: "#f57c00", fontWeight: 700 }}>{semRo.length} DT{semRo.length > 1 ? "s" : ""} com diária sem RO preenchido</div>
                      <div style={{ fontSize: 9, color: t.txt2, marginTop: 2 }}>DTs: {semRo.map(i => i.r.dt).join(", ")}</div>
                    </div>
                  </div>
                );
              })()}
              {diariasData.items.filter(i => i.tipo === "diaria" || i.tipo === "atraso").map(({ r, tipo, dias }, i) => {
                const semRo = !r.ro;
                const tipoLabel = tipo === "diaria" ? `🛏️ ${dias || 0}d de diária` : `⚠️ Perdeu Agenda`;
                const tipoColor = tipo === "diaria" ? t.danger : t.ouro;
                return (
                  <div key={i} {...clickable(() => abrirDetalhe(r))} style={{ background: t.card, borderRadius: 11, border: `1px solid ${tipoColor}`, padding: 12, cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {r.nome || "—"}
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: `rgba(246,70,93,.08)`, color: tipoColor, border: `1px solid ${tipoColor}33` }}>{tipoLabel}</span>
                      {semRo && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: `rgba(255,152,0,.07)`, color: "#f57c00", border: `1px solid rgba(255,152,0,.3)` }}>⚠️ RO vazio</span>}
                      <span style={{ marginLeft: "auto", fontSize: 10, color: t.txt2 }}>›</span>
                    </div>
                    <div style={{ fontSize: 11, color: t.txt2 }}>
                      🔢 {r.dt} · 📅 Agenda: {r.data_agenda || "—"} · 🏁 Descarga: {r.data_desc || "—"}
                    </div>
                    {(r.diaria_prev || r.diaria_pg) && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ background: `rgba(246,70,93,.08)`, border: `1px solid rgba(246,70,93,.2)`, borderRadius: 6, padding: "3px 8px", fontSize: 10, color: t.danger }}>Devido: <strong>{fmtMoeda(r.diaria_prev)}</strong></span>
                        <span style={{ background: `rgba(2,192,118,.08)`, border: `1px solid rgba(2,192,118,.2)`, borderRadius: 6, padding: "3px 8px", fontSize: 10, color: t.verde }}>Pago: <strong>{fmtMoeda(r.diaria_pg)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════
          APONTAMENTOS
      ═══════════════════════════════════ */}
      {operSubTab === "apontamentos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ ...css.secTitle, margin: 0 }}>
              {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>, t.ouro, 12)}
              Apontamentos <span style={{ fontSize: 8, color: t.txt2, fontWeight: 400, marginLeft: 4 }}>Descargas/Stretch</span>
              <span style={{ flex: 1, height: 1, background: t.borda }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setRelCtrlDccOpen(true)} style={{ background: `rgba(124,58,237,.08)`, border: `1px solid rgba(124,58,237,.28)`, borderRadius: 8, padding: "8px 12px", color: "var(--accent)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>📊 Planilha Financeiro</button>
              <button onClick={() => { setApontForm({ numero: "", item: "", linha: "", descricao_apontamento: "", pedido: "", mes_ref: "", filial: "", valor: "", frs_folha: "", tipo: "descarga", dt_rel: "", cidade: "", nf_numero: "", data_emissao: "", data_apontamento: new Date().toISOString().split("T")[0] }); setApontFormOpen(true); }} style={{ ...css.btnGold, padding: "8px 12px", fontSize: 11 }}>＋ Novo</button>
            </div>
          </div>

          {/* Resumo mensal */}
          {apontItems.length > 0 && (() => {
            const meses = [...new Set(apontItems.map(a => a.mes_ref).filter(Boolean))].sort().reverse();
            const mesSel = meses[0] || "";
            const itensMes = apontItems.filter(a => !mesSel || a.mes_ref === mesSel);
            const tipos = ["descarga", "stretch", "deslocamento", "outros"];
            const tipoLabel = { descarga: "📦 Descarga", stretch: "📏 Stretch", deslocamento: "🚗 Deslocamento", outros: "📋 Outros" };
            const tipoColor = { descarga: "var(--accent)", stretch: "var(--green)", deslocamento: "var(--yellow)", outros: "var(--text2)" };
            const totais = tipos.map(tp => ({ tp, total: itensMes.filter(a => a.tipo === tp).reduce((s, a) => s + (parseFloat(a.valor) || 0), 0), qtd: itensMes.filter(a => a.tipo === tp).length })).filter(x => x.qtd > 0);
            const grandTotal = totais.reduce((s, x) => s + x.total, 0);
            if (totais.length === 0) return null;
            return (
              <div style={{ background: `rgba(124,58,237,.04)`, border: `1px solid rgba(124,58,237,.18)`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
                  Resumo Mensal {mesSel ? `— ${mesSel}` : ""}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }}>
                  {totais.map(({ tp, total, qtd }) => (
                    <div key={tp} style={{ background: "var(--card2)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: tipoColor[tp], fontWeight: 700, marginBottom: 2 }}>{tipoLabel[tp]}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.03em" }}>{fmtMoeda(total)}</div>
                      <div style={{ fontSize: 8, color: "var(--text2)", marginTop: 2 }}>{qtd} apontamento{qtd !== 1 ? "s" : ""}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "var(--text2)", fontWeight: 600 }}>TOTAL DO MÊS</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--green)", letterSpacing: "-0.03em" }}>{fmtMoeda(grandTotal)}</span>
                </div>
              </div>
            );
          })()}

          {/* Form novo apontamento */}
          {apontFormOpen && (
            <div style={{ background: t.card, borderRadius: 12, border: `1px solid var(--accent)44`, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 12, marginBottom: 10 }}>📑 Novo Apontamento</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={lbl}>Nº Apontamento</label><input value={apontForm.numero} onChange={e => setApontForm(p => ({ ...p, numero: e.target.value }))} placeholder="Ex: 1000000002580650" style={inp} /></div>
                <div><label style={lbl}>Pedido</label><input value={apontForm.pedido} onChange={e => setApontForm(p => ({ ...p, pedido: e.target.value }))} placeholder="Ex: 4502384474" style={inp} /></div>
                <div><label style={lbl}>Item</label><input type="number" value={apontForm.item} onChange={e => setApontForm(p => ({ ...p, item: e.target.value }))} placeholder="Ex: 1" style={inp} /></div>
                <div><label style={lbl}>Linha</label><input type="number" value={apontForm.linha} onChange={e => setApontForm(p => ({ ...p, linha: e.target.value }))} placeholder="Ex: 10" style={inp} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Descrição do Apontamento</label><input value={apontForm.descricao_apontamento} onChange={e => setApontForm(p => ({ ...p, descricao_apontamento: e.target.value }))} placeholder="Ex: ARMAZENAGEM OU CARGA E DESCARGA S/ M.O." style={inp} /></div>
                <div><label style={lbl}>Mês Referência</label><input value={apontForm.mes_ref} onChange={e => setApontForm(p => ({ ...p, mes_ref: e.target.value }))} placeholder="MM/AAAA" style={inp} /></div>
                <div><label style={lbl}>Filial</label><input value={apontForm.filial} onChange={e => setApontForm(p => ({ ...p, filial: e.target.value }))} style={inp} /></div>
                <div><label style={lbl}>Valor (R$)</label><input type="number" value={apontForm.valor} onChange={e => setApontForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" style={inp} /></div>
                <div>
                  <label style={{ ...lbl, color: apontForm.frs_folha ? undefined : t.danger }}>
                    FRS · Folha {!apontForm.frs_folha && <span style={{ color: t.danger }}>⚠️</span>}
                  </label>
                  <input value={apontForm.frs_folha} onChange={e => setApontForm(p => ({ ...p, frs_folha: e.target.value }))} style={{ ...inp, border: `1.5px solid ${apontForm.frs_folha ? t.borda2 : t.danger}` }} />
                </div>
                <div><label style={lbl}>Tipo</label>
                  <select value={apontForm.tipo} onChange={e => setApontForm(p => ({ ...p, tipo: e.target.value }))} style={{ ...inp, appearance: "none" }}>
                    <option value="descarga">📦 Descarga</option>
                    <option value="stretch">📏 Stretch</option>
                    <option value="deslocamento">🚗 Deslocamento</option>
                    <option value="outros">📋 Outros</option>
                  </select>
                </div>
                <div><label style={lbl}>DT Relacionado</label><input value={apontForm.dt_rel} onChange={e => setApontForm(p => ({ ...p, dt_rel: e.target.value }))} style={inp} /></div>
                <div><label style={lbl}>Cidade</label><input value={apontForm.cidade} onChange={e => setApontForm(p => ({ ...p, cidade: e.target.value }))} style={inp} /></div>
                <div><label style={lbl}>Data Apontamento</label><input type="date" value={apontForm.data_apontamento} onChange={e => setApontForm(p => ({ ...p, data_apontamento: e.target.value }))} style={inp} /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setApontFormOpen(false)} style={{ flex: "0 0 auto", background: "transparent", border: `1.5px solid var(--border)`, borderRadius: 8, padding: "8px 12px", color: "var(--text2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>CANCELAR</button>
                <button onClick={async () => {
                  if (!apontForm.numero) { showToast("⚠️ Informe o nº do apontamento", "warn"); return; }
                  const novoItem = { ...apontForm, id: Date.now(), criado_em: new Date().toISOString() };
                  const nova = [novoItem, ...apontItems];
                  await saveAponts(nova, novoItem);
                  setApontFormOpen(false);
                  setApontForm({ numero: "", item: "", linha: "", descricao_apontamento: "", pedido: "", mes_ref: "", filial: "", valor: "", frs_folha: "", tipo: "descarga", dt_rel: "", cidade: "", nf_numero: "", data_emissao: "", data_apontamento: new Date().toISOString().split("T")[0] });
                  showToast("✅ Apontamento salvo!", "ok");
                }} style={{ ...css.btnGold, flex: 1, justifyContent: "center", fontSize: 12 }}>💾 Salvar Apontamento</button>
              </div>
            </div>
          )}

          {apontLoading ? (
            <div style={{ textAlign: "center", padding: 20, color: t.txt2, fontSize: 12 }}>Carregando apontamentos...</div>
          ) : apontItems.length === 0 ? (
            <div style={css.empty}><div style={{ fontSize: 36, marginBottom: 8 }}>📑</div><div style={{ fontSize: 13, color: t.txt2 }}>Nenhum apontamento registrado</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {apontItems.map((a, i) => {
                const semNF  = !a.nf_numero;
                const semFRS = !a.frs_folha;
                const bordaC = semFRS ? t.danger : semNF ? t.warn : t.verde;
                return (
                  <div key={a.id || i} style={{ background: t.card, borderRadius: 11, border: `1px solid ${bordaC}`, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em", color: "var(--yellow, #eab308)" }}>{a.numero || a.apontamento || "—"}</span>
                      {(a.item || a.linha) && <span style={{ fontSize: 9, color: t.txt2, background: t.card2, border: `1px solid ${t.borda}`, borderRadius: 4, padding: "2px 6px" }}>It.{a.item || "?"} / Ln.{a.linha || "?"}</span>}
                      <span style={{ fontSize: 9, fontWeight: 700, color: t.txt2, background: t.card2, border: `1px solid ${t.borda}`, borderRadius: 4, padding: "2px 7px" }}>{a.tipo === "stretch" ? "📏 Stretch" : a.tipo === "deslocamento" ? "🚗 Deslocamento" : a.tipo === "outros" ? "📋 Outros" : "📦 Descarga"}</span>
                      {semFRS && <span style={{ fontSize: 9, fontWeight: 700, color: t.danger, background: `rgba(246,70,93,.08)`, border: `1px solid rgba(246,70,93,.2)`, borderRadius: 4, padding: "2px 7px" }}>⚠️ FRS vazio</span>}
                      {semNF && !semFRS && <span style={{ fontSize: 9, fontWeight: 700, color: t.warn, background: `rgba(245,158,11,.08)`, border: `1px solid rgba(245,158,11,.2)`, borderRadius: 4, padding: "2px 7px" }}>📄 NF pendente</span>}
                    </div>
                    {a.descricao_apontamento && <div style={{ fontSize: 10, color: t.txt2, marginBottom: 6, fontStyle: "italic" }}>{a.descricao_apontamento}</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: t.txt2 }}>
                      <div>Pedido: <strong style={{ color: t.txt }}>{a.pedido || "—"}</strong></div>
                      <div>Mês ref: <strong style={{ color: t.txt }}>{a.mes_ref || "—"}</strong></div>
                      <div>Filial: <strong style={{ color: t.txt }}>{a.filial || "—"}</strong></div>
                      <div>Valor: <strong style={{ color: t.verde }}>{a.valor ? fmtMoeda(a.valor) : "—"}</strong></div>
                      {a.cidade && <div>Cidade: <strong style={{ color: t.txt }}>{a.cidade}</strong></div>}
                      {(a.dt_rel || a.dt_relacionado) && <div>DT: <strong style={{ color: "var(--accent)" }}>{a.dt_rel || a.dt_relacionado}</strong></div>}
                      <div style={{ gridColumn: "1/-1" }}>FRS · Folha: <strong style={{ color: semFRS ? t.danger : t.verde }}>{a.frs_folha || a.folha_registro || "⚠️ NÃO PREENCHIDO"}</strong></div>
                      {a.data_apontamento && <div style={{ gridColumn: "1/-1", fontSize: 9, color: t.txt2, marginTop: 2 }}>📅 {a.data_apontamento}</div>}
                    </div>
                    <button onClick={async () => { if (confirm("Excluir apontamento?")) { const n = [...apontItems]; n.splice(i, 1); await deleteApontSupabase(a.numero || a.apontamento); await saveAponts(n); } }} style={{ marginTop: 8, background: `rgba(246,70,93,.08)`, border: `1px solid rgba(246,70,93,.18)`, borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 10, color: t.danger, fontFamily: "inherit" }}>🗑️ Excluir</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
