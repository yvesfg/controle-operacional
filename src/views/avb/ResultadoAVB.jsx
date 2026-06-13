import React from "react";
import ModalDespesa from "../../modals/ModalDespesa.jsx";
import Toggle from "../../components/Toggle.jsx";
import {
  parseDespesasXLSX, diffImport, inserirImportadas, listarDespesas, listarDespesasBase,
  inserirManual, atualizarDespesa, deletarDespesa, deletarImportadas,
  listarIndevidasPendentes, vincularCredito,
} from "../../despesas.js";

// ResultadoAVB — confronta a margem operacional (Σ vl_cte − Σ vl_contrato) com as
// despesas mensais persistidas (tabela despesas_filial). Aba por base, gated por canFin.
// Bases atendidas: acailandia_avb e imperatriz_belem.

const BASES_OK = ["acailandia_avb", "imperatriz_belem"];

// parsers numéricos espelhando o App: vl_cte/vl_cte_comp já vêm decimais; vl_contrato pode vir pt-BR.
const nCte = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const nContrato = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).replace(/[R$\s]/g, "");
  // pt-BR (tem vírgula): ponto=milhar, vírgula=decimal. Sem vírgula: já é decimal — NÃO remove pontos.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const mesDe = (s) => { if (!s) return null; const p = String(s).split("/"); return p.length >= 3 ? `${p[2]}-${p[1].padStart(2, "0")}` : null; };
const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };
const fmtDiaMes = (iso) => { if (!iso) return null; const p = String(iso).split("-"); return p.length >= 3 ? `${p[2].slice(0, 2)}/${p[1]}` : null; };

export default function ResultadoAVB({ ctx }) {
  const { activeTab, baseAtual, DADOS, getConexao, t, isMobile, showToast, canFin } = ctx;
  if (activeTab !== "resultado") return null;
  const baseId = baseAtual?.id;
  if (!BASES_OK.includes(baseId)) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Resultado disponível apenas para Açailândia (AVB) e Imperatriz/Belém.</div>;
  }
  if (canFin === false) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira para visualizar o Resultado.</div>;
  }

  // Meses disponíveis a partir dos dados operacionais
  const mesesDisp = React.useMemo(() => {
    const s = new Set();
    (DADOS || []).forEach((r) => { const m = mesDe(r.data_carr); if (m) s.add(m); });
    return [...s].sort().reverse();
  }, [DADOS]);

  const [mesRef, setMesRef] = React.useState("");
  React.useEffect(() => { if (!mesRef && mesesDisp.length) setMesRef(mesesDisp[0]); }, [mesesDisp, mesRef]);

  // Complementar: default ON para Suzano (imperatriz_belem), OFF para AVB
  const [incluirComp, setIncluirComp] = React.useState(baseId === "imperatriz_belem");
  React.useEffect(() => { setIncluirComp(baseId === "imperatriz_belem"); }, [baseId]);

  const [despesas, setDespesas] = React.useState([]);
  const [indevidas, setIndevidas] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [modal, setModal] = React.useState({ open: false, inicial: null });
  const fileRef = React.useRef(null);
  const [lastImportIds, setLastImportIds] = React.useState([]);
  const [undoOpen, setUndoOpen] = React.useState(false);
  const [undoInput, setUndoInput] = React.useState("");
  const [sheetSel, setSheetSel] = React.useState({ open: false, sheetsMeta: [], checked: {}, pendingRows: [], fileName: "" });
  const [busca, setBusca] = React.useState("");
  const [buscaTodosMeses, setBuscaTodosMeses] = React.useState(false);
  const [despesasTodas, setDespesasTodas] = React.useState([]);
  const [loadingTodas, setLoadingTodas] = React.useState(false);

  // getConexao() devolve um objeto NOVO a cada chamada; memoiza p/ não recriar `carregar`
  // a cada render (senão o useEffect re-dispara em loop → "Carregando..." piscando).
  const conn = React.useMemo(() => (getConexao ? getConexao() : null), [getConexao]);

  React.useEffect(() => {
    if (!buscaTodosMeses || !conn || !baseId) return;
    setLoadingTodas(true);
    listarDespesasBase(conn, baseId)
      .then(setDespesasTodas)
      .catch(e => showToast?.("Erro ao carregar todos os meses: " + e.message, "erro"))
      .finally(() => setLoadingTodas(false));
  }, [buscaTodosMeses, conn, baseId, showToast]);

  const carregar = React.useCallback(async () => {
    if (!conn || !baseId || !mesRef) return;
    setLoading(true);
    try {
      const [d, ind] = await Promise.all([
        listarDespesas(conn, baseId, mesRef),
        listarIndevidasPendentes(conn, baseId),
      ]);
      setDespesas(d); setIndevidas(ind);
    }
    catch (e) { showToast?.("Erro ao carregar despesas: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, [conn, baseId, mesRef, showToast]);

  React.useEffect(() => { carregar(); }, [carregar]);

  // ── Receita / custo / margem (exclui PENDENTE) ──
  const fin = React.useMemo(() => {
    const regs = (DADOS || []).filter((r) => mesDe(r.data_carr) === mesRef && (r.status || "").toUpperCase() !== "PENDENTE");
    let receita = 0, custo = 0, comp = 0;
    regs.forEach((r) => { receita += nCte(r.vl_cte); custo += nContrato(r.vl_contrato); comp += nCte(r.vl_cte_comp); });
    if (incluirComp) {
      if (baseId === "acailandia_avb") { receita += comp; custo += comp; } // margem zero (repasse)
      else { receita += comp; } // Suzano: margem cheia
    }
    const margem = receita - custo;
    return { receita, custo, comp, margem, n: regs.length };
  }, [DADOS, mesRef, incluirComp, baseId]);

  const creditos = despesas.filter((d) => d.tipo === "credito");
  const debitos = despesas.filter((d) => d.tipo !== "credito");
  const despDebInc = debitos.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0);
  const credInc = creditos.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0); // negativo
  const despLiq = despDebInc + credInc;
  const resultado = fin.margem - despLiq;
  const pct = (v) => (fin.receita ? (v / fin.receita * 100) : 0).toFixed(1) + "%";

  // ── Ações ──
  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !conn || !mesRef) return;
    setImporting(true);
    try {
      const { rows, sheetsMeta } = await parseDespesasXLSX(file);
      if (rows.length === 0 && sheetsMeta.every(s => !s.recognized)) {
        showToast?.("Nenhuma aba reconhecida (AÇA / IMP / BELÉM) no arquivo.", "erro"); return;
      }
      // Inicializa checkboxes: reconhecidas = true, ignoradas = false
      const checked = {};
      sheetsMeta.forEach(s => { if (s.recognized) checked[s.nome] = true; });
      setSheetSel({ open: true, sheetsMeta, checked, pendingRows: rows, fileName: file.name });
    } catch (err) { showToast?.("Erro ao ler arquivo: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  const onConfirmSheets = async () => {
    const { checked, pendingRows } = sheetSel;
    // Filtra linhas das abas selecionadas e remove _sheetNome antes de gravar
    // eslint-disable-next-line no-unused-vars
    const linhas = pendingRows.filter(r => checked[r._sheetNome]).map(({ _sheetNome, ...rest }) => rest);
    if (linhas.length === 0) { showToast?.("Nenhuma aba selecionada.", "warn"); return; }
    setSheetSel(s => ({ ...s, open: false }));
    setImporting(true);
    try {
      // Verifica filiais presentes após filtro
      const presentes = new Set(linhas.map(l => l.aba_origem));
      const ESPERADAS = [["AÇA", "Açailândia"], ["IMP", "Imperatriz"], ["BELÉM", "Belém"]];
      const faltando = ESPERADAS.filter(([k]) => !presentes.has(k)).map(([, n]) => n);
      const achadas = ESPERADAS.filter(([k]) => presentes.has(k)).map(([, n]) => n);
      if (faltando.length) {
        const msg = `Filiais com lançamentos: ${achadas.join(", ") || "—"}.\n⚠ SEM lançamentos: ${faltando.join(", ")}.\nPode ser normal ou aba esquecida. Continuar?`;
        if (!window.confirm(msg)) { showToast?.("Importação cancelada.", "erro"); return; }
      }
      // Verifica mês predominante
      const mesesArq = {};
      linhas.forEach(l => { if (l.dt_mov) { const m = String(l.dt_mov).slice(0, 7); mesesArq[m] = (mesesArq[m] || 0) + 1; } });
      const mesPredom = Object.keys(mesesArq).sort((a, b) => mesesArq[b] - mesesArq[a])[0];
      if (mesPredom && mesPredom !== mesRef) {
        const msg = `Datas predominantemente de ${mesLabel(mesPredom)} (${mesesArq[mesPredom]}/${linhas.length} linhas), mas mês selecionado é ${mesLabel(mesRef)}.\nImportar mesmo assim?`;
        if (!window.confirm(msg)) { showToast?.("Importação cancelada — selecione o mês correto.", "erro"); return; }
      }
      const porBase = {};
      linhas.forEach(l => { (porBase[l.base_id] = porBase[l.base_id] || []).push(l); });
      let novasTodas = [], jaTotal = 0, existiaAlgum = false;
      const resumo = [];
      for (const b of Object.keys(porBase)) {
        const { novas, jaExistem, existentesTotal } = await diffImport(conn, b, mesRef, porBase[b]);
        novasTodas = novasTodas.concat(novas); jaTotal += jaExistem;
        if (existentesTotal > 0) existiaAlgum = true;
        resumo.push(`${b === "acailandia_avb" ? "AVB" : "IMP/BEL"}: ${novas.length} novas`);
      }
      if (existiaAlgum) {
        const msg = `Mês ${mesLabel(mesRef)} já tem despesas.\nNovas: ${novasTodas.length} (${resumo.join(" · ")})\nJá existentes (mantidas): ${jaTotal}\nAdicionar só as novas?`;
        if (!window.confirm(msg)) { showToast?.("Importação cancelada.", "erro"); return; }
      }
      if (novasTodas.length === 0) { showToast?.("Nenhuma novidade — tudo já estava importado.", "ok"); return; }
      const inseridos = await inserirImportadas(conn, mesRef, novasTodas);
      const ids = (Array.isArray(inseridos) ? inseridos : []).map(r => r.id).filter(Boolean);
      setLastImportIds(ids);
      setUndoOpen(false);
      showToast?.(`${novasTodas.length} novas despesas adicionadas (${mesLabel(mesRef)}).`, "ok");
      await carregar();
    } catch (err) { showToast?.("Erro na importação: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  const salvar = async (dados) => {
    try {
      if (modal.inicial?.id) await atualizarDespesa(conn, modal.inicial.id, dados);
      else await inserirManual(conn, { ...dados, base_id: baseId, mes_ref: mesRef });
      setModal({ open: false, inicial: null });
      await carregar();
    } catch (e) { showToast?.("Erro ao salvar: " + e.message, "erro"); }
  };
  const excluir = async (id) => {
    try { await deletarDespesa(conn, id); setModal({ open: false, inicial: null }); await carregar(); }
    catch (e) { showToast?.("Erro ao excluir: " + e.message, "erro"); }
  };
  const toggleIncluir = async (d) => {
    try {
      setDespesas((arr) => arr.map((x) => x.id === d.id ? { ...x, incluir: !x.incluir } : x));
      await atualizarDespesa(conn, d.id, { incluir: !d.incluir });
    } catch (e) { showToast?.("Erro: " + e.message, "erro"); carregar(); }
  };
  const vincular = async (indId, credId) => {
    try { await vincularCredito(conn, indId, credId); showToast?.("Crédito vinculado à indevida.", "ok"); await carregar(); }
    catch (e) { showToast?.("Erro ao vincular: " + e.message, "erro"); }
  };

  // Agrupa despesas por grupo p/ exibição (com filtro de busca)
  const buscaQ = busca.trim().toLowerCase();
  const pool = buscaTodosMeses ? despesasTodas : despesas;
  const despesasFiltradas = buscaQ
    ? pool.filter(d =>
        (d.natureza || "").toLowerCase().includes(buscaQ) ||
        (d.historico || "").toLowerCase().includes(buscaQ) ||
        (d.grupo || "").toLowerCase().includes(buscaQ) ||
        (d.conta || "").toLowerCase().includes(buscaQ) ||
        String(Math.abs(Number(d.valor || 0)).toFixed(2)).includes(buscaQ)
      )
    : pool;
  const porGrupo = {};
  despesasFiltradas.forEach((d) => { (porGrupo[d.grupo || "—"] = porGrupo[d.grupo || "—"] || []).push(d); });

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };
  const kpi = (l, v, sub, cor) => (
    <div style={{ ...card, padding: isMobile ? "12px 10px" : "14px 16px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text3)", marginBottom: 5 }}>{l}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: isMobile ? 17 : 21, fontWeight: 800, letterSpacing: "-0.03em", color: cor || t.txt, lineHeight: 1 }}>{v}</div>
      {sub && <div style={{ fontSize: 10, color: t.txt2, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 12 : "20px 24px" }}>
      {/* Controles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <select value={mesRef} onChange={(e) => setMesRef(e.target.value)}
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }}>
          {mesesDisp.length === 0 && <option value="">— sem dados —</option>}
          {mesesDisp.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: t.txt,
          padding: "6px 11px", border: `1px solid ${t.borda}`, borderRadius: 8 }}>
          <Toggle checked={incluirComp} onChange={setIncluirComp}
            label={`Incluir complementar ${baseId === "acailandia_avb" ? "(margem zero)" : "(margem cheia)"}`} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods" onChange={onImport} style={{ display: "none" }} />
          {lastImportIds.length > 0 && (
            <button onClick={() => { setUndoOpen(o => !o); setUndoInput(""); }}
              style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${t.danger||"#f6465d"}`, background: undoOpen ? `rgba(246,70,93,.1)` : "transparent",
                color: t.danger||"#f6465d" }}>
              ↩ Desfazer ({lastImportIds.length})
            </button>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={importing || !mesRef}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid var(--accent)`, background: "transparent", color: "var(--accent)", opacity: importing ? .6 : 1 }}>
            {importing ? "Importando..." : "⬆ Importar planilha"}
          </button>
          <button onClick={() => setModal({ open: true, inicial: null })}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: "none", background: "var(--accent)", color: "#fff" }}>+ Despesa</button>
        </div>
      </div>
      {/* Painel de confirmação Desfazer importação */}
      {undoOpen && lastImportIds.length > 0 && (
        <div style={{ marginBottom: 14, padding: "14px 16px", borderRadius: 10,
          background: `rgba(246,70,93,.07)`, border: `1px solid ${t.danger||"#f6465d"}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.danger||"#f6465d", marginBottom: 6 }}>
            Desfazer a última importação? Isso removerá {lastImportIds.length} registro(s) adicionados agora.
          </div>
          <div style={{ fontSize: 11, color: t.txt2, marginBottom: 10 }}>
            Registros editados manualmente após a importação <b>não</b> serão afetados.
            Digite <b style={{ color: t.txt }}>sim</b> para confirmar:
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={undoInput} onChange={e => setUndoInput(e.target.value)}
              placeholder="sim" autoFocus
              style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7,
                border: `1.5px solid ${undoInput === "sim" ? (t.danger||"#f6465d") : t.borda}`,
                background: t.bg, color: t.txt, width: 90, fontFamily: "inherit" }} />
            <button disabled={undoInput !== "sim" || importing}
              onClick={async () => {
                setImporting(true);
                try {
                  await deletarImportadas(conn, lastImportIds);
                  setLastImportIds([]);
                  setUndoOpen(false);
                  setUndoInput("");
                  showToast?.("Importação desfeita com sucesso.", "ok");
                  await carregar();
                } catch(e) { showToast?.("Erro ao desfazer: " + e.message, "erro"); }
                finally { setImporting(false); }
              }}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 7, fontFamily: "inherit", cursor: "pointer",
                background: undoInput === "sim" ? (t.danger||"#f6465d") : "transparent",
                color: undoInput === "sim" ? "#fff" : (t.txt2||"#888"),
                border: `1px solid ${undoInput === "sim" ? (t.danger||"#f6465d") : t.borda}`,
                opacity: importing ? .6 : 1 }}>
              Confirmar desfazer
            </button>
            <button onClick={() => { setUndoOpen(false); setUndoInput(""); }}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 7, fontFamily: "inherit", cursor: "pointer",
                background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal seleção de abas */}
      {sheetSel.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setSheetSel(s => ({ ...s, open: false }))}>
          <div style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px",
            minWidth: 340, maxWidth: 520, width: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,.5)", maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>Selecionar abas para importar</div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 16 }}>
              {sheetSel.fileName} — marque apenas as abas do mês correto <b style={{ color: t.ouro }}>{mesLabel(mesRef)}</b>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {sheetSel.sheetsMeta.map(s => {
                const mesRefMM = mesRef ? mesRef.split("-").reverse().join("/") : "";
                const temMesDivergente = s.recognized && s.meses.length > 0 && !s.meses.includes(mesRefMM);
                return (
                  <div key={s.nome} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    borderRadius: 8, background: s.recognized ? (temMesDivergente ? `rgba(240,185,11,.08)` : `rgba(2,192,118,.06)`) : t.card2,
                    border: `1px solid ${s.recognized ? (temMesDivergente ? t.ouro + "55" : t.verde + "44") : t.borda}`,
                    opacity: s.recognized ? 1 : 0.5 }}>
                    {s.recognized ? (
                      <input type="checkbox" checked={!!sheetSel.checked[s.nome]}
                        onChange={() => setSheetSel(prev => ({ ...prev, checked: { ...prev.checked, [s.nome]: !prev.checked[s.nome] } }))}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: t.verde, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 15, height: 15, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</div>
                      {s.recognized ? (
                        <div style={{ fontSize: 10, color: t.txt2 }}>
                          <span style={{ color: t.azulLt || t.txt2, fontWeight: 600 }}>{s.baseLabel}</span>
                          {s.meses.length > 0 && <> · <span style={{ color: temMesDivergente ? t.ouro : t.txt2 }}>{s.meses.join(", ")}</span></>}
                          {" · "}{s.rowCount} linhas
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: t.txt2 }}>aba não reconhecida — ignorada automaticamente</div>
                      )}
                    </div>
                    {temMesDivergente && (
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `rgba(240,185,11,.15)`, color: t.ouro, fontWeight: 700, whiteSpace: "nowrap" }}>
                        mês diferente
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: t.txt2, marginBottom: 14 }}>
              {Object.values(sheetSel.checked).filter(Boolean).length} de {sheetSel.sheetsMeta.filter(s => s.recognized).length} abas selecionadas ·{" "}
              {sheetSel.pendingRows.filter(r => sheetSel.checked[r._sheetNome]).length} linhas
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSheetSel(s => ({ ...s, open: false }))}
                style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, fontFamily: "inherit", cursor: "pointer",
                  background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                Cancelar
              </button>
              <button onClick={onConfirmSheets}
                disabled={Object.values(sheetSel.checked).every(v => !v) || importing}
                style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, fontFamily: "inherit", cursor: "pointer",
                  background: "var(--accent)", color: "#fff", border: "none",
                  opacity: Object.values(sheetSel.checked).every(v => !v) || importing ? .5 : 1 }}>
                {importing ? "Importando..." : `Importar selecionadas`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs do resultado */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        {kpi("Faturamento (CTE)", money(fin.receita), `${fin.n} viagens`, t.verde)}
        {kpi("Pago motorista", money(fin.custo), "vl. contrato", t.txt)}
        {kpi("Margem bruta", money(fin.margem), pct(fin.margem), t.ouro)}
        {kpi("Despesas (débito)", money(despDebInc), "incluídas", t.danger)}
        {kpi("Créditos", money(Math.abs(credInc)), "abatem despesa", t.verde)}
        {kpi("Resultado", money(resultado), pct(resultado), resultado >= 0 ? t.verde : t.danger)}
      </div>

      {/* Conciliação de indevidas → crédito */}
      {indevidas.length > 0 && (
        <div style={{ ...card, marginBottom: 16, border: `1px solid ${t.danger}55` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.txt, marginBottom: 3 }}>Indevidas aguardando crédito ({indevidas.length})</div>
          <div style={{ fontSize: 11, color: t.txt2, marginBottom: 10 }}>
            Despesas marcadas como indevidas que ainda não voltaram como crédito. Sugestões por valor entre os créditos de {mesLabel(mesRef)}.
          </div>
          {indevidas.map((ind) => {
            const cand = creditos.find((c) => Math.abs(Number(c.valor)) === Math.abs(Number(ind.valor)));
            return (
              <div key={ind.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: `1px solid ${t.borda}55` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ind.natureza || ind.historico || "—"}</div>
                  <div style={{ fontSize: 10, color: t.txt2 }}>{mesLabel(ind.mes_ref)} · {money(Number(ind.valor || 0))}</div>
                </div>
                {cand ? (
                  <button onClick={() => vincular(ind.id, cand.id)}
                    style={{ fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 7, cursor: "pointer", border: "none", background: t.verde, color: "#fff", whiteSpace: "nowrap" }}>
                    ✓ Vincular crédito {money(Math.abs(Number(cand.valor || 0)))}
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: t.txt2, whiteSpace: "nowrap" }}>sem crédito igual neste mês</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de despesas */}
      <div style={{ ...card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.txt, flex: "0 0 auto" }}>Despesas · {mesLabel(mesRef)}</div>
          <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.txt2} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar despesa ou crédito..."
              style={{ width: "100%", boxSizing: "border-box", paddingLeft: 30, paddingRight: busca ? 28 : 10,
                paddingTop: 5, paddingBottom: 5, fontSize: 12, borderRadius: 7,
                border: `1.5px solid ${busca ? t.ouro : t.borda}`, background: t.bg, color: t.txt,
                fontFamily: "inherit", outline: "none" }} />
            {busca && (
              <button onClick={() => setBusca("")}
                style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: t.txt2, fontSize: 14, lineHeight: 1, padding: 0 }}>
                ×
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
            <Toggle checked={buscaTodosMeses} onChange={v => { setBuscaTodosMeses(v); }}
              label="Todos os meses" size={0.82} />
          </div>
          <div style={{ fontSize: 11, color: t.txt2, fontFamily: "var(--font-mono)", flex: "0 0 auto" }}>
            {buscaQ ? `${despesasFiltradas.length} de ${pool.length}` : `${pool.length}`} lançamentos
            {loadingTodas && " ⏳"}
          </div>
        </div>

        {(loading || loadingTodas) && <div style={{ color: t.txt2, fontSize: 13, padding: 16, textAlign: "center" }}>Carregando...</div>}
        {!loading && !loadingTodas && despesasFiltradas.length === 0 && pool.length === 0 && (
          <div style={{ color: t.txt2, fontSize: 13, padding: 24, textAlign: "center" }}>
            Nenhuma despesa neste mês. Importe a planilha ou adicione manualmente.
          </div>
        )}

        {!loading && Object.keys(porGrupo).map((g) => {
          const linhas = porGrupo[g];
          const subt = linhas.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0);
          return (
            <div key={g} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700,
                color: t.txt2, textTransform: "uppercase", letterSpacing: "0.04em", padding: "6px 0", borderBottom: `1px solid ${t.borda}` }}>
                <span>{g}</span><span>{money(subt)}</span>
              </div>
              {linhas.map((d, i) => {
                const zebra = i % 2 ? t.card2 : "transparent";
                return (
                <div key={d.id} onClick={() => setModal({ open: true, inicial: d })}
                  onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = zebra}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 6,
                    background: zebra, borderLeft: `2px solid ${d.tipo === "credito" ? t.verde : "transparent"}`,
                    cursor: "pointer", opacity: d.incluir ? 1 : .45, transition: "background .12s" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: isMobile ? 46 : 52 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, textAlign: "center",
                      color: d.dt_mov ? t.txt2 : t.ouro, fontStyle: d.dt_mov ? "normal" : "italic" }}
                      title={d.dt_mov ? "" : "Lançamento sem data na planilha"}>
                      {fmtDiaMes(d.dt_mov) || "sem data"}
                    </span>
                    {buscaTodosMeses && d.mes_ref && (
                      <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: t.azulLt || t.txt2,
                        background: `rgba(100,160,255,.12)`, borderRadius: 3, padding: "1px 4px", marginTop: 2, whiteSpace: "nowrap" }}>
                        {mesLabel(d.mes_ref)}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.natureza || d.historico || "—"}
                      {d.origem === "manual" && <span style={{ marginLeft: 6, fontSize: 9, color: "#a855f7", fontWeight: 700 }}>MANUAL</span>}
                      {d.tipo === "credito" && <span style={{ marginLeft: 6, fontSize: 9, color: t.verde, fontWeight: 700 }}>CRÉDITO</span>}
                      {d.indevida && <span style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>{d.credito_match_id ? "✓ RECUPERADA" : "INDEVIDA"}</span>}
                      {d.dup_flag && <span style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>DUPLICIDADE?</span>}
                    </div>
                    {d.historico && d.natureza && (
                      <div style={{ fontSize: 10.5, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{d.historico}</div>
                    )}
                  </div>
                  {/* Toggle incluir só nas linhas marcadas como duplicidade */}
                  {d.dup_flag && (
                    <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: t.txt2, flexShrink: 0 }}>
                      <Toggle checked={d.incluir} onChange={() => toggleIncluir(d)} size={0.82} /> incl.
                    </span>
                  )}
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: d.tipo === "credito" ? t.verde : t.txt,
                    whiteSpace: "nowrap", textAlign: "right", minWidth: isMobile ? 92 : 118, flexShrink: 0 }}>
                    {d.tipo === "credito" ? "− " : ""}{money(Math.abs(Number(d.valor || 0)))}
                  </div>
                </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <ModalDespesa open={modal.open} inicial={modal.inicial} t={t} isMobile={isMobile}
        onClose={() => setModal({ open: false, inicial: null })} onSave={salvar} onDelete={excluir} />
    </div>
  );
}
