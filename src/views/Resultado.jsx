import React from "react";
import ModalDespesa from "../modals/ModalDespesa.jsx";
import Toggle from "../components/Toggle.jsx";
import useModalEsc from "../hooks/useModalEsc.js";
import { BASES } from "../constants.js";
import {
  parseDespesasXLSX, diffImport, inserirImportadas, listarDespesas, listarDespesasBase,
  listarMesesComDespesas,
  inserirManual, atualizarDespesa, deletarDespesa, deletarImportadas,
  listarIndevidasPendentes, vincularCredito,
} from "../despesas.js";

// Resultado — confronta a margem operacional (Σ vl_cte − Σ vl_contrato) com as
// despesas mensais persistidas (tabela despesas_filial). Aba por base (qualquer base),
// gated por permissão financeira (canFin).

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
// Chave de duplicidade — mesma usada no parser (valor + natureza + histórico) p/ reagrupar os possíveis duplicados.
const normTxt = (s) => (s || "").toUpperCase().replace(/\s+/g, " ").trim();
const dupKeyOf = (d) => `${Math.round((Number(d.valor) + Number.EPSILON) * 100) / 100}||${normTxt(d.natureza)}||${normTxt(d.historico)}`;

export default function Resultado({ ctx }) {
  const { activeTab, baseAtual, DADOS, getConexao, t, isMobile, showToast, canFin } = ctx;
  if (activeTab !== "resultado") return null;
  const baseId = baseAtual?.id;
  if (canFin === false) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira para visualizar o Resultado.</div>;
  }

  // Meses disponíveis a partir dos dados operacionais
  const mesesOp = React.useMemo(() => {
    const s = new Set();
    (DADOS || []).forEach((r) => { const m = mesDe(r.data_carr); if (m) s.add(m); });
    return s;
  }, [DADOS]);

  // Meses com despesas gravadas na base (complementa mesesOp)
  const [mesesDespesas, setMesesDespesas] = React.useState([]);
  const conn = React.useMemo(() => (getConexao ? getConexao() : null), [getConexao]);

  const carregarMeses = React.useCallback(() => {
    if (!conn || !baseId) return;
    listarMesesComDespesas(conn, baseId).then(setMesesDespesas).catch(() => {});
  }, [conn, baseId]);

  React.useEffect(() => { carregarMeses(); }, [carregarMeses]);

  const mesesDisp = React.useMemo(() => {
    const s = new Set([...mesesOp, ...mesesDespesas]);
    return [...s].sort().reverse();
  }, [mesesOp, mesesDespesas]);

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
  const [dupModal, setDupModal] = React.useState({ open: false, registro: null });
  const fileRef = React.useRef(null);
  const [lastImportIds, setLastImportIds] = React.useState([]);
  const [undoOpen, setUndoOpen] = React.useState(false);
  const [undoInput, setUndoInput] = React.useState("");
  const [sheetSel, setSheetSel] = React.useState({ open: false, sheetsMeta: [], checked: {}, pendingRows: [], fileName: "" });
  const [foraMesSel, setForaMesSel] = React.useState({ open: false, linhas: [], foraMes: [], checked: {}, avisoVazio: false });
  const [busca, setBusca] = React.useState("");
  const [buscaTodosMeses, setBuscaTodosMeses] = React.useState(false);
  const [vincManual, setVincManual] = React.useState(null); // ind.id em modo de seleção manual
  const [despesasTodas, setDespesasTodas] = React.useState([]);
  const [loadingTodas, setLoadingTodas] = React.useState(false);

  // Clique na linha: se for possível duplicidade, mostra os semelhantes; senão, edita.
  const abrirRegistro = (d) => {
    if (d.dup_flag) setDupModal({ open: true, registro: d });
    else setModal({ open: true, inicial: d });
  };

  // ESC fecha os modais desta tela (empilháveis: dup/seleção de abas por cima da edição)
  useModalEsc(modal.open, () => setModal({ open: false, inicial: null }));
  useModalEsc(dupModal.open, () => setDupModal({ open: false, registro: null }));
  useModalEsc(sheetSel.open, () => setSheetSel((s) => ({ ...s, open: false })));
  useModalEsc(foraMesSel.open, () => setForaMesSel((s) => ({ ...s, open: false })));

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

  // Grava as linhas definitivas (já com a decisão sobre as de outro mês tomada pelo usuário).
  const finalizarImportacao = async (linhasParaImportar, ignoradasCount = 0) => {
    setImporting(true);
    try {
      const porBase = {};
      linhasParaImportar.forEach(l => { (porBase[l.base_id] = porBase[l.base_id] || []).push(l); });
      let novasTodas = [], jaTotal = 0, existiaAlgum = false;
      const resumo = [];
      for (const b of Object.keys(porBase)) {
        const { novas, jaExistem, existentesTotal } = await diffImport(conn, b, mesRef, porBase[b]);
        novasTodas = novasTodas.concat(novas); jaTotal += jaExistem;
        if (existentesTotal > 0) existiaAlgum = true;
        resumo.push(`${BASES[b]?.label || b}: ${novas.length} novas`);
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
      showToast?.(`${novasTodas.length} novas despesas adicionadas (${mesLabel(mesRef)})${ignoradasCount ? ` · ${ignoradasCount} de outros meses deixadas de fora` : ""}.`, "ok");
      carregarMeses();
      await carregar();
    } catch (err) { showToast?.("Erro na importação: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  const onConfirmSheets = async () => {
    const { checked, pendingRows } = sheetSel;
    // Filtra linhas das abas selecionadas e remove _sheetNome antes de gravar
    // eslint-disable-next-line no-unused-vars
    const selecionadas = pendingRows.filter(r => checked[r._sheetNome]).map(({ _sheetNome, ...rest }) => rest);
    if (selecionadas.length === 0) { showToast?.("Nenhuma aba selecionada.", "warn"); return; }
    setSheetSel(s => ({ ...s, open: false }));
    // Competência por DATA: linhas do mês selecionado (+ sem data) entram direto; as datadas
    // em outro mês vão para conferência — a decisão de incluir cada uma (ex.: consolidação de
    // pendentes de meses anteriores) é do usuário, linha a linha.
    const mesDaLinha = (l) => (l.dt_mov ? String(l.dt_mov).slice(0, 7) : null);
    const linhas = selecionadas.filter((l) => { const m = mesDaLinha(l); return !m || m === mesRef; });
    const foraMes = selecionadas.filter((l) => { const m = mesDaLinha(l); return m && m !== mesRef; });
    // Verifica filiais presentes após filtro
    const presentes = new Set(linhas.map(l => l.aba_origem));
    const ESPERADAS = [["AÇA", "Açailândia"], ["IMP", "Imperatriz"], ["BELÉM", "Belém"]];
    const faltando = ESPERADAS.filter(([k]) => !presentes.has(k)).map(([, n]) => n);
    const achadas = ESPERADAS.filter(([k]) => presentes.has(k)).map(([, n]) => n);
    if (faltando.length) {
      const msg = `Filiais com lançamentos: ${achadas.join(", ") || "—"}.\n⚠ SEM lançamentos: ${faltando.join(", ")}.\nPode ser normal ou aba esquecida. Continuar?`;
      if (!window.confirm(msg)) { showToast?.("Importação cancelada.", "erro"); return; }
    }
    if (foraMes.length) {
      const avisoVazio = linhas.filter((l) => mesDaLinha(l)).length === 0;
      setForaMesSel({ open: true, linhas, foraMes, checked: {}, avisoVazio });
      return;
    }
    await finalizarImportacao(linhas);
  };

  // Decisão do usuário sobre as linhas de outro mês: só as marcadas entram junto com as do mês.
  const onConfirmForaMes = async () => {
    const { linhas, foraMes, checked } = foraMesSel;
    const incluidas = foraMes.filter((_, idx) => checked[String(idx)]);
    const ignoradas = foraMes.length - incluidas.length;
    setForaMesSel(s => ({ ...s, open: false }));
    await finalizarImportacao([...linhas, ...incluidas], ignoradas);
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

      {/* Modal conferência de linhas de outro mês — decisão linha a linha do usuário */}
      {foraMesSel.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setForaMesSel(s => ({ ...s, open: false }))}>
          <div style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px",
            minWidth: 340, maxWidth: 560, width: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,.5)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>Linhas de outro mês</div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 8 }}>
              {foraMesSel.foraMes.length} linha(s) datada(s) fora de <b style={{ color: t.ouro }}>{mesLabel(mesRef)}</b>.
              Marque as que devem entrar mesmo assim neste mês (ex.: consolidação de pendentes) — as demais ficam de fora.
            </div>
            {foraMesSel.avisoVazio && (
              <div style={{ fontSize: 11, color: t.danger, background: `${t.danger}1a`, border: `1px solid ${t.danger}55`,
                borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                ⚠ Nenhuma linha datada de {mesLabel(mesRef)} nas abas selecionadas — confira se é o arquivo/mês certo antes de marcar linhas abaixo.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, overflowY: "auto", flex: 1 }}>
              {foraMesSel.foraMes.map((l, idx) => {
                const k = String(idx);
                const on = !!foraMesSel.checked[k];
                const [y, mo, da] = String(l.dt_mov).split("-");
                return (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    background: on ? `rgba(2,192,118,.08)` : t.card2, border: `1px solid ${on ? t.verde + "55" : t.borda}` }}>
                    <input type="checkbox" checked={on}
                      onChange={() => setForaMesSel(prev => ({ ...prev, checked: { ...prev.checked, [k]: !prev.checked[k] } }))}
                      style={{ width: 15, height: 15, cursor: "pointer", accentColor: t.verde, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: t.txt }}>
                      <b>{da}/{mo}/{y}</b> · <span style={{ color: t.azulLt || t.txt2 }}>{l.aba_origem}</span> · {money(l.valor)} · {l.natureza || l.historico || "-"}
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: t.txt2, marginBottom: 14 }}>
              {Object.values(foraMesSel.checked).filter(Boolean).length} de {foraMesSel.foraMes.length} marcadas para entrar em {mesLabel(mesRef)}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setForaMesSel(s => ({ ...s, open: false })); showToast?.("Importação cancelada.", "erro"); }}
                style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, fontFamily: "inherit", cursor: "pointer",
                  background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                Cancelar
              </button>
              <button onClick={onConfirmForaMes} disabled={importing}
                style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, fontFamily: "inherit", cursor: "pointer",
                  background: "var(--accent)", color: "#fff", border: "none", opacity: importing ? .5 : 1 }}>
                {importing ? "Importando..." : "Confirmar importação"}
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
      {indevidas.length > 0 && (() => {
        const totalIndevido = indevidas.reduce((s, i) => s + Math.abs(Number(i.valor || 0)), 0);
        return (
        <div style={{ ...card, marginBottom: 16, border: `1px solid ${t.danger}55` }}>
          {/* Cabeçalho */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Indevidas aguardando crédito</span>
            <span style={{ background: `${t.danger}1a`, color: t.danger, fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{indevidas.length}</span>
          </div>
          <div style={{ fontSize: 11, color: t.txt2, marginBottom: 12 }}>
            Ficam aqui até o crédito ser vinculado — aparecem em todos os meses até resolver.
          </div>

          {/* Mini-cards de resumo — reusa o primitivo kpi() dos KPIs do topo (consistência global) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {kpi("Total indevido", money(totalIndevido), `${indevidas.length} ${indevidas.length === 1 ? "lançamento" : "lançamentos"}`, t.danger)}
            {kpi("Créditos disponíveis", String(creditos.length), `em ${mesLabel(mesRef)}`, creditos.length > 0 ? t.verde : t.txt2)}
          </div>

          {/* Linhas */}
          {indevidas.map((ind, i) => {
            const cand = creditos.find((c) => Math.abs(Number(c.valor)) === Math.abs(Number(ind.valor)));
            const emPickMode = vincManual === ind.id;
            return (
              <div key={ind.id} style={{ padding: "11px 4px", borderBottom: i < indevidas.length - 1 ? `1px solid ${t.borda}55` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: `${t.danger}1a`, color: t.danger, fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 8, minWidth: 84, textAlign: "center", flexShrink: 0 }}>{money(Math.abs(Number(ind.valor || 0)))}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ind.natureza || ind.historico || "—"}</div>
                    <div style={{ fontSize: 10, marginTop: 1, color: cand ? t.verde : t.txt2 }}>
                      {cand ? "→ crédito de valor igual encontrado" : creditos.length > 0 ? "sem crédito de valor igual" : `sem créditos em ${mesLabel(mesRef)}`}
                      <span style={{ color: t.txt2 }}> · {mesLabel(ind.mes_ref)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {!emPickMode && cand && (
                      <button onClick={() => vincular(ind.id, cand.id)}
                        style={{ fontSize: 11, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "none", background: t.verde, color: "#fff", whiteSpace: "nowrap" }}>
                        Vincular
                      </button>
                    )}
                    {!emPickMode && creditos.length > 0 && (
                      <button onClick={() => setVincManual(ind.id)}
                        style={{ fontSize: 11, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                          border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2, whiteSpace: "nowrap" }}>
                        {cand ? "outro..." : "Escolher"}
                      </button>
                    )}
                    {emPickMode && (
                      <button onClick={() => setVincManual(null)}
                        style={{ fontSize: 11, padding: "7px 11px", borderRadius: 8, cursor: "pointer",
                          border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2 }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {emPickMode && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 10, color: t.txt2, marginBottom: 2 }}>Escolha o crédito de {mesLabel(mesRef)}:</div>
                    {creditos.map((c) => (
                      <button key={c.id}
                        onClick={() => { vincular(ind.id, c.id); setVincManual(null); }}
                        style={{ fontSize: 11, padding: "6px 10px", borderRadius: 7, cursor: "pointer", textAlign: "left",
                          border: `1px solid ${Math.abs(Number(c.valor)) === Math.abs(Number(ind.valor)) ? t.verde : t.borda}`,
                          background: Math.abs(Number(c.valor)) === Math.abs(Number(ind.valor)) ? `rgba(2,192,118,.08)` : t.card2,
                          color: t.txt }}>
                        <span style={{ fontWeight: 600 }}>{money(Math.abs(Number(c.valor || 0)))}</span>
                        {" — "}{c.natureza || c.historico || "—"}
                        {Math.abs(Number(c.valor)) === Math.abs(Number(ind.valor)) && (
                          <span style={{ marginLeft: 6, fontSize: 9, color: t.verde, fontWeight: 700 }}>✓ valor igual</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}

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

        {/* Cabeçalho de colunas — só no desktop (tabela multi-coluna) */}
        {!loading && !isMobile && despesasFiltradas.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px", borderLeft: "2px solid transparent",
            fontSize: 10.5, fontWeight: 700, color: t.txt2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span style={{ width: 70, flexShrink: 0 }}>Data</span>
            <span style={{ flex: "1.3 1 0", minWidth: 0 }}>Natureza</span>
            <span style={{ flex: "1.7 1 0", minWidth: 0 }}>Histórico</span>
            <span style={{ width: 130, flexShrink: 0 }}>Conta</span>
            <span style={{ width: 56, flexShrink: 0 }} />
            <span style={{ width: 150, flexShrink: 0, textAlign: "right" }}>Valor</span>
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
                const badges = (
                  <>
                    {d.origem === "manual" && <span style={{ marginLeft: 6, fontSize: 9, color: "#a855f7", fontWeight: 700 }}>MANUAL</span>}
                    {d.tipo === "credito" && <span style={{ marginLeft: 6, fontSize: 9, color: t.verde, fontWeight: 700 }}>CRÉDITO</span>}
                    {d.indevida && <span style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>{d.credito_match_id ? "✓ RECUPERADA" : "INDEVIDA"}</span>}
                    {d.dup_flag && <span title="Clique para ver os outros lançamentos de mesmo valor" style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>DUPLICIDADE? ⓘ</span>}
                  </>
                );
                const toggleDup = d.dup_flag ? (
                  <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: t.txt2 }}>
                    <Toggle checked={d.incluir} onChange={() => toggleIncluir(d)} size={0.78} /> incl.
                  </span>
                ) : null;
                const valorSpan = (
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: d.tipo === "credito" ? t.verde : t.txt }}>
                    {d.tipo === "credito" ? "− " : ""}{money(Math.abs(Number(d.valor || 0)))}
                  </span>
                );
                const rowEvents = {
                  onClick: () => abrirRegistro(d),
                  onMouseEnter: (e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"),
                  onMouseLeave: (e) => (e.currentTarget.style.background = zebra),
                };
                const rowBase = {
                  display: "flex", alignItems: "center", gap: 10, borderRadius: 6, background: zebra,
                  borderLeft: `2px solid ${d.tipo === "credito" ? t.verde : "transparent"}`,
                  cursor: "pointer", opacity: d.incluir ? 1 : .45, transition: "background .12s",
                };

                if (isMobile) {
                  return (
                    <div key={d.id} {...rowEvents} style={{ ...rowBase, padding: "9px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 46 }}>
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
                          {d.natureza || d.historico || "—"}{badges}
                        </div>
                        {d.historico && d.natureza && (
                          <div style={{ fontSize: 10.5, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{d.historico}</div>
                        )}
                      </div>
                      {toggleDup}
                      <div style={{ fontSize: 13, whiteSpace: "nowrap", textAlign: "right", minWidth: 92, flexShrink: 0 }}>{valorSpan}</div>
                    </div>
                  );
                }

                // Desktop: linha em colunas alinhadas (tabela)
                return (
                  <div key={d.id} {...rowEvents} style={{ ...rowBase, padding: "10px 10px" }}>
                    {/* Data */}
                    <div style={{ width: 70, flexShrink: 0, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5,
                        color: d.dt_mov ? t.txt2 : t.ouro, fontStyle: d.dt_mov ? "normal" : "italic" }}
                        title={d.dt_mov ? "" : "Lançamento sem data na planilha"}>
                        {fmtDiaMes(d.dt_mov) || "sem data"}
                      </span>
                      {buscaTodosMeses && d.mes_ref && (
                        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: t.azulLt || t.txt2,
                          background: `rgba(100,160,255,.12)`, borderRadius: 3, padding: "1px 4px", marginTop: 2, whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                          {mesLabel(d.mes_ref)}
                        </span>
                      )}
                    </div>
                    {/* Natureza (texto com ellipsis + badges sempre visíveis) */}
                    <div style={{ flex: "1.3 1 0", minWidth: 0, display: "flex", alignItems: "center" }}>
                      <span style={{ flex: "0 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15, color: t.txt, fontWeight: 600 }}>
                        {d.natureza || "—"}
                      </span>
                      <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{badges}</span>
                    </div>
                    {/* Histórico */}
                    <div style={{ flex: "1.7 1 0", minWidth: 0, fontSize: 13, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.historico || ""}
                    </div>
                    {/* Conta */}
                    <div style={{ width: 130, flexShrink: 0, fontSize: 12, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.conta || ""}
                    </div>
                    {/* Incluir (só duplicidade) */}
                    <div style={{ width: 56, flexShrink: 0, display: "flex", justifyContent: "center" }}>{toggleDup}</div>
                    {/* Valor */}
                    <div style={{ width: 150, flexShrink: 0, fontSize: 16, textAlign: "right", whiteSpace: "nowrap" }}>{valorSpan}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modal de possível duplicidade — lista os lançamentos de mesma chave (valor + natureza + histórico) */}
      {dupModal.open && dupModal.registro && (() => {
        const chave = dupKeyOf(dupModal.registro);
        const grupo = despesas.filter((x) => x.tipo !== "credito" && dupKeyOf(x) === chave);
        const incluidos = grupo.filter((x) => x.incluir);
        const totalIncl = incluidos.reduce((s, x) => s + Number(x.valor || 0), 0);
        const fechar = () => setDupModal({ open: false, registro: null });
        return (
          <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.txt }}>Possível duplicidade · {money(Number(dupModal.registro.valor || 0))}</div>
                <button onClick={fechar} style={{ border: "none", background: "transparent", color: t.txt2, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ fontSize: 11.5, color: t.txt2, marginBottom: 12 }}>
                {grupo.length} lançamentos de mesmo valor, natureza e histórico em {mesLabel(mesRef)}. Desligue o(s) repetido(s) com o toggle <b>incl.</b> para não somar nas despesas.
              </div>
              {grupo.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                  borderBottom: `1px solid ${t.borda}55`, opacity: d.incluir ? 1 : .5,
                  background: d.id === dupModal.registro.id ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent", borderRadius: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, flexShrink: 0, width: 52, textAlign: "center",
                    color: d.dt_mov ? t.txt2 : t.ouro, fontStyle: d.dt_mov ? "normal" : "italic" }}>
                    {fmtDiaMes(d.dt_mov) || "sem data"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.natureza || d.historico || "—"}
                      {d.aba_origem && <span style={{ marginLeft: 6, fontSize: 9, color: t.txt2, fontWeight: 700 }}>{d.aba_origem}</span>}
                      {d.origem === "manual" && <span style={{ marginLeft: 6, fontSize: 9, color: "#a855f7", fontWeight: 700 }}>MANUAL</span>}
                    </div>
                    {d.historico && d.natureza && (
                      <div style={{ fontSize: 10.5, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{d.historico}</div>
                    )}
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: t.txt2, flexShrink: 0 }}>
                    <Toggle checked={d.incluir} onChange={() => toggleIncluir(d)} size={0.82} /> incl.
                  </span>
                  <button onClick={() => { fechar(); setModal({ open: true, inicial: d }); }}
                    style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 7, cursor: "pointer",
                      border: `1px solid ${t.borda}`, background: "transparent", color: t.txt, flexShrink: 0 }}>Editar</button>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: t.txt, marginTop: 12, paddingTop: 8 }}>
                <span>{incluidos.length} de {grupo.length} incluídos</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{money(totalIncl)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      <ModalDespesa open={modal.open} inicial={modal.inicial} t={t} isMobile={isMobile}
        onClose={() => setModal({ open: false, inicial: null })} onSave={salvar} onDelete={excluir} />
    </div>
  );
}
