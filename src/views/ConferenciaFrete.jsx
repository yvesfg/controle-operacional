import React from "react";
import useModalEsc from "../hooks/useModalEsc.js";
import {
  parseFreteXLSX, diffImportFrete, inserirFrete, listarPendentesRevisao, listarSinalizados,
  decidir, listarTodosPeriodo, resumoPorCategoria, resumoPorCliente, gerarWorkbookXLSX,
} from "../freteConferencia.js";
import KpiCard from "../components/KpiCard.jsx";

// Conferência de Faturamento — planilhas BRUTAS de faturamento (TMS/ERP), fonte
// DIFERENTE do operacional (Google Sheets). Segmento dentro de Resultado.jsx.
// Fluxo: sobe a planilha -> classifica por cliente (CNPJ) -> mostra resumo pra
// confirmar -> grava -> fila de revisão (margem negativa/baixa/ambígua/duplicidade).

const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pesoFmt = (n) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " kg";
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };
const CATEGORIA_LABEL = { frete: "Frete", descarga: "Descarga", local: "Local", diaria: "Diária" };

export default function ConferenciaFrete({ ctx, conn }) {
  const { t, isMobile, showToast } = ctx;

  const [periodoRef, setPeriodoRef] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [clienteFiltro, setClienteFiltro] = React.useState(""); // "" = todos os clientes
  const [linhasPeriodo, setLinhasPeriodo] = React.useState([]);
  const [pendentes, setPendentes] = React.useState([]);
  const [sinalizados, setSinalizados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef(null);
  const [preview, setPreview] = React.useState(null); // { cliente, periodoRef, linhas, naoClassificadas, resumo }
  const [dupModal, setDupModal] = React.useState({ open: false, chave: null });
  const [revisarModal, setRevisarModal] = React.useState({ open: false, item: null });
  const [sinalizando, setSinalizando] = React.useState(false);
  const [sinalObs, setSinalObs] = React.useState("");

  useModalEsc(!!preview, () => setPreview(null));
  useModalEsc(dupModal.open, () => setDupModal({ open: false, chave: null }));
  useModalEsc(revisarModal.open, () => setRevisarModal({ open: false, item: null }));

  const abrirRevisar = (p) => { setSinalizando(false); setSinalObs(""); setRevisarModal({ open: true, item: p }); };

  const carregar = React.useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    try {
      const [linhas, pend, sinal] = await Promise.all([
        listarTodosPeriodo(conn, periodoRef),
        listarPendentesRevisao(conn),
        listarSinalizados(conn),
      ]);
      setLinhasPeriodo(linhas);
      setPendentes(pend);
      setSinalizados(sinal);
    } catch (e) { showToast?.("Erro ao carregar conferência: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, [conn, periodoRef, showToast]);

  React.useEffect(() => { carregar(); }, [carregar]);

  const onEscolherArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const r = await parseFreteXLSX(file);
      if (r.erro) { showToast?.(r.erro, "erro"); return; }
      if (!r.linhas.length) { showToast?.("Nenhuma linha classificada nessa planilha.", "erro"); return; }
      const resumo = resumoPorCategoria(r.linhas);
      setPreview({ ...r, fileName: file.name, resumo });
    } catch (err) { showToast?.("Erro ao ler arquivo: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  const confirmarImportacao = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const { novas, jaExistem } = await diffImportFrete(conn, preview.periodoRef, preview.cliente, preview.linhas);
      if (novas.length === 0) {
        showToast?.("Nada novo — todos os CTRCs desse período já estavam importados.", "ok");
        setPreview(null); return;
      }
      await inserirFrete(conn, novas);
      showToast?.(`${novas.length} registro(s) novo(s) de ${preview.cliente} importado(s)${jaExistem ? ` (${jaExistem} já existiam)` : ""}.`, "ok");
      setPreview(null);
      setPeriodoRef(preview.periodoRef);
      await carregar();
    } catch (e) { showToast?.("Erro ao importar: " + e.message, "erro"); }
    finally { setImporting(false); }
  };

  const onDecidir = async (id, decisao, obs) => {
    try {
      const atualizado = await decidir(conn, id, decisao, obs);
      setPendentes((arr) => arr.filter((p) => p.id !== id));
      if (decisao === "sinalizar_correcao" && atualizado) setSinalizados((arr) => [atualizado, ...arr]);
      showToast?.("Revisão registrada.", "ok");
    } catch (e) { showToast?.("Erro ao registrar decisão: " + e.message, "erro"); }
  };

  // Clientes presentes no período (pra popular o filtro, mesmo sem estar no cadastro fixo)
  const clientesPresentes = React.useMemo(() => [...new Set(linhasPeriodo.map(l => l.cliente))].sort(), [linhasPeriodo]);

  const linhasFiltradas = React.useMemo(
    () => clienteFiltro ? linhasPeriodo.filter(l => l.cliente === clienteFiltro) : linhasPeriodo,
    [linhasPeriodo, clienteFiltro]
  );
  const pendentesFiltrados = React.useMemo(
    () => clienteFiltro ? pendentes.filter(p => p.cliente === clienteFiltro) : pendentes,
    [pendentes, clienteFiltro]
  );
  const sinalizadosFiltrados = React.useMemo(
    () => clienteFiltro ? sinalizados.filter(p => p.cliente === clienteFiltro) : sinalizados,
    [sinalizados, clienteFiltro]
  );

  const resumoCat = React.useMemo(() => resumoPorCategoria(linhasFiltradas), [linhasFiltradas]);
  const resumoCli = React.useMemo(() => resumoPorCliente(linhasFiltradas), [linhasFiltradas]);

  // Por usuário — quem lançou os registros hoje na fila de revisão, pra saber com quem falar.
  const resumoPorUsuario = React.useMemo(() => {
    const out = {};
    pendentesFiltrados.forEach((p) => {
      const nome = p.nome_usuario || "(sem usuário na planilha)";
      out[nome] = (out[nome] || 0) + 1;
    });
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }, [pendentesFiltrados]);

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };

  const badge = (texto, cor) => (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${cor}1a`, color: cor, marginRight: 5, whiteSpace: "nowrap" }}>{texto}</span>
  );

  const grupoDup = dupModal.open ? pendentes.filter(p => p.dup_grupo_chave === dupModal.chave) : [];

  return (
    <div>
      {/* Controles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <input type="month" value={periodoRef} onChange={(e) => setPeriodoRef(e.target.value)}
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }} />
        <select value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)}
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }}>
          <option value="">Todos os clientes</option>
          {clientesPresentes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => gerarWorkbookXLSX(linhasFiltradas, periodoRef)} disabled={!linhasFiltradas.length}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${t.borda}`, background: "transparent", color: t.txt, opacity: linhasFiltradas.length ? 1 : .5 }}>
            ⬇ Baixar planilha
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onEscolherArquivo} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid var(--accent)`, background: "transparent", color: "var(--accent)", opacity: importing ? .6 : 1 }}>
            {importing ? "Lendo..." : "⬆ Importar planilha bruta"}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: t.txt2, marginBottom: 14 }}>
        Fonte: planilhas brutas de faturamento (CTRC/TMS) por cliente — <b style={{ color: t.txt }}>não é o mesmo dado</b> do Operacional (Google Sheets). Os valores deveriam bater, mas ainda são conferidos separadamente.
      </div>

      {/* KPIs por categoria */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {["frete", "descarga", "local", "diaria"].map((c) => {
          const d = resumoCat[c];
          return (
            <KpiCard key={c} label={CATEGORIA_LABEL[c]} value={`${d.registros} reg.`}
              sub={`${money(d.fretePeso)} · margem ${d.margemMedia.toFixed(1)}%`}
              color={c === "frete" ? "var(--accent)" : undefined} compact={isMobile} />
          );
        })}
      </div>

      {/* Resumo por cliente */}
      {Object.keys(resumoCli).length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 10 }}>Por cliente · {mesLabel(periodoRef)}</div>
          {Object.entries(resumoCli).map(([cliente, d]) => (
            <div key={cliente} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${t.borda}55`, fontSize: 12 }}>
              <span style={{ flex: 1, fontWeight: 600, color: t.txt }}>{cliente}</span>
              <span style={{ color: t.txt2 }}>{d.registros} reg.</span>
              <span style={{ color: t.txt2 }}>{pesoFmt(d.peso)}</span>
              <span style={{ fontWeight: 700, color: t.txt }}>{money(d.fretePeso)}</span>
              <span style={{ fontWeight: 700, color: d.margemMedia < 0 ? t.danger : d.margemMedia < 10 ? t.warn : t.verde }}>
                margem {d.margemMedia.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Por usuário — quem lançou os registros pendentes, pra direcionar a correção */}
      {resumoPorUsuario.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 10 }}>Pendências por usuário</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {resumoPorUsuario.map(([nome, qtd]) => (
              <span key={nome} style={{ fontSize: 11.5, padding: "6px 12px", borderRadius: 20, background: t.card2, border: `1px solid ${t.borda}`, color: t.txt }}>
                <b>{nome}</b> <span style={{ color: t.danger, fontWeight: 700 }}>{qtd}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fila de revisão */}
      <div style={{ ...card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Fila de revisão</span>
          {pendentesFiltrados.length > 0 && (
            <span style={{ background: `${t.danger}1a`, color: t.danger, fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{pendentesFiltrados.length}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: t.txt2, marginBottom: 12 }}>
          Margem negativa, margem abaixo de 10%, classificação Descarga/Local ambígua, ou mesmo valor lançado em CTRCs diferentes (duplicidade). Fica até você decidir — nunca é resolvido sozinho.
        </div>

        {loading && <div style={{ color: t.txt2, fontSize: 13, padding: 16, textAlign: "center" }}>Carregando...</div>}
        {!loading && pendentesFiltrados.length === 0 && (
          <div style={{ color: t.txt2, fontSize: 13, padding: 20, textAlign: "center" }}>Nada pendente de revisão.</div>
        )}

        {!loading && pendentesFiltrados.map((p) => (
          <div key={p.id} onClick={() => abrirRevisar(p)}
            style={{ padding: "10px 6px", borderBottom: `1px solid ${t.borda}55`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12.5, color: t.txt, fontWeight: 600 }}>
                {p.cliente} · CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria} · placa {p.placa || "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginTop: 1 }}>
                👤 {p.nome_usuario || "sem usuário na planilha"}
              </div>
              <div style={{ marginTop: 3 }}>
                {p.flag_negativa && badge("MARGEM NEGATIVA", t.danger)}
                {p.flag_baixa && !p.flag_negativa && badge("MARGEM < 10%", t.warn)}
                {p.flag_ambigua && badge("DESCARGA/LOCAL AMBÍGUO", t.azul || "#3b82f6")}
                {p.flag_duplicidade && badge("POSSÍVEL DUPLICIDADE ⓘ", t.danger)}
              </div>
              <div style={{ fontSize: 10, color: t.txt2, marginTop: 2 }}>
                margem {Number(p.margem_lucro).toFixed(2)}% · frete peso {money(p.frete_peso)} · saldo {money(p.saldo)}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); abrirRevisar(p); }}
              style={{ fontSize: 10.5, fontWeight: 700, padding: "7px 14px", borderRadius: 7, cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", flexShrink: 0 }}>
              Revisar
            </button>
          </div>
        ))}
      </div>

      {/* Sinalizados para correção — saíram da fila de revisão, mas ficam visíveis até a origem ser corrigida */}
      {sinalizadosFiltrados.length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Sinalizados</span>
            <span style={{ background: `${t.ouro}1a`, color: t.ouro, fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{sinalizadosFiltrados.length}</span>
          </div>
          <div style={{ fontSize: 11, color: t.txt2, marginBottom: 12 }}>
            Já saíram do alerta e continuam contando no total — aguardando correção na origem (exclusão/reimportação).
          </div>
          {sinalizadosFiltrados.map((p) => (
            <div key={p.id} style={{ padding: "10px 6px", borderBottom: `1px solid ${t.borda}55` }}>
              <div style={{ fontSize: 12.5, color: t.txt, fontWeight: 600 }}>
                {p.cliente} · CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria} · placa {p.placa || "—"}
              </div>
              <div style={{ fontSize: 10, color: t.txt2, marginTop: 2 }}>
                margem {Number(p.margem_lucro).toFixed(2)}% · saldo {money(p.saldo)}
              </div>
              <div style={{ fontSize: 10.5, color: t.ouro, marginTop: 3 }}>
                🏷 sinalizado {p.revisado_em ? new Date(p.revisado_em).toLocaleDateString("pt-BR") : ""}
                {p.revisado_obs && <span style={{ color: t.txt2 }}> · “{p.revisado_obs}”</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: pré-visualização antes de gravar */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 520, width: "90vw", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>Confirmar importação</div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 14 }}>{preview.fileName}</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 9, background: "rgba(2,192,118,.08)", border: `1px solid ${t.verde}44`, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt }}>{preview.cliente}</div>
              <div style={{ fontSize: 11, color: t.txt2, marginLeft: "auto" }}>competência {mesLabel(preview.periodoRef)}</div>
            </div>

            {["frete", "descarga", "local", "diaria"].map((c) => {
              const d = preview.resumo[c];
              if (!d.registros) return null;
              return (
                <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${t.borda}33` }}>
                  <span style={{ color: t.txt }}>{CATEGORIA_LABEL[c]}</span>
                  <span style={{ color: t.txt2 }}>{d.registros} registros · {money(d.fretePeso)}</span>
                </div>
              );
            })}

            {preview.naoClassificadas.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: t.warn, background: `${t.warn}1a`, border: `1px solid ${t.warn}55`, borderRadius: 8, padding: "8px 10px" }}>
                ⚠ {preview.naoClassificadas.length} linha(s) com código de Empresa fora do mapeamento — não serão importadas.
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setPreview(null)}
                style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                Cancelar
              </button>
              <button onClick={confirmarImportacao} disabled={importing}
                style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", opacity: importing ? .5 : 1 }}>
                {importing ? "Importando..." : "Confirmar e gravar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: revisar item pendente (registro completo antes de decidir) */}
      {revisarModal.open && revisarModal.item && (() => {
        const p = revisarModal.item;
        const fechar = () => setRevisarModal({ open: false, item: null });
        const decidirEFechar = async (decisao, obs) => { await onDecidir(p.id, decisao, obs); fechar(); };
        const campo = (l, v) => (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${t.borda}33` }}>
            <span style={{ color: t.txt2 }}>{l}</span>
            <span style={{ color: t.txt, fontWeight: 600, textAlign: "right" }}>{v || "—"}</span>
          </div>
        );
        return (
          <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 560, width: "90vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 2 }}>{p.cliente} · CTRC {p.ctrc}</div>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginBottom: 10 }}>👤 {p.nome_usuario || "sem usuário na planilha"}</div>

              <div style={{ marginBottom: 12 }}>
                {p.flag_negativa && badge("MARGEM NEGATIVA", t.danger)}
                {p.flag_baixa && !p.flag_negativa && badge("MARGEM < 10%", t.warn)}
                {p.flag_ambigua && badge("DESCARGA/LOCAL AMBÍGUO", t.azul || "#3b82f6")}
                {p.flag_duplicidade && badge("POSSÍVEL DUPLICIDADE", t.danger)}
              </div>

              {campo("Categoria", CATEGORIA_LABEL[p.categoria] || p.categoria)}
              {campo("Empresa (código)", p.empresa_cod)}
              {campo("Placa", p.placa)}
              {campo("Data emissão", p.data_emissao)}
              {campo("Trecho", p.trecho)}
              {campo("NFS", p.nfs)}
              {campo("Nº Manifesto", p.numero_manifesto)}
              {campo("Nº Contrato Frete", p.numero_contrato)}
              {campo("Valor NF", money(p.valor_nf))}
              {campo("Peso NF", pesoFmt(p.peso_nf))}
              {campo("Frete Peso", money(p.frete_peso))}
              {campo("Total do Frete", money(p.total_frete))}
              {campo("Valor Contrato Frete", money(p.valor_contrato_frete))}
              {campo("Saldo", money(p.saldo))}
              {campo("Margem Lucro", Number(p.margem_lucro).toFixed(2) + "%")}

              {p.flag_duplicidade && (
                <button onClick={() => { setDupModal({ open: true, chave: p.dup_grupo_chave }); fechar(); }}
                  style={{ marginTop: 12, width: "100%", fontSize: 11.5, fontWeight: 700, padding: "8px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.danger}`, background: "transparent", color: t.danger }}>
                  Ver grupo de duplicidade
                </button>
              )}

              {sinalizando && (
                <div style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <input value={sinalObs} onChange={(e) => setSinalObs(e.target.value)} autoFocus
                    placeholder="O que precisa ser corrigido? (ex.: linha duplicada, excluir a de menor valor)"
                    onKeyDown={(e) => { if (e.key === "Enter") decidirEFechar("sinalizar_correcao", sinalObs.trim() || null); }}
                    style={{ flex: 1, minWidth: 0, padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => decidirEFechar("sinalizar_correcao", sinalObs.trim() || null)}
                    style={{ fontSize: 11, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "none", background: t.ouro, color: "#1a1a1a", whiteSpace: "nowrap" }}>
                    Confirmar
                  </button>
                  <button onClick={() => { setSinalizando(false); setSinalObs(""); }}
                    style={{ fontSize: 11, padding: "7px 11px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2 }}>✕</button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={fechar}
                  style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                  Fechar
                </button>
                {p.flag_ambigua && (
                  <>
                    <button onClick={() => decidirEFechar("confirmar_descarga", "revisado manualmente")}
                      style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt }}>
                      É Descarga
                    </button>
                    <button onClick={() => decidirEFechar("confirmar_local", "revisado manualmente")}
                      style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt }}>
                      É Local
                    </button>
                  </>
                )}
                {!sinalizando && (
                  <button onClick={() => setSinalizando(true)}
                    style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.ouro}`, background: "transparent", color: t.ouro }}>
                    Sinalizar para correção
                  </button>
                )}
                <button onClick={() => decidirEFechar("ok", "revisado — sem ação necessária")}
                  style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none" }}>
                  Marcar revisado
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: grupo de duplicidade */}
      {dupModal.open && (
        <div onClick={() => setDupModal({ open: false, chave: null })} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 560, width: "90vw", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>Possível duplicidade de valor</div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 12 }}>
              Mesma placa + valor NF + peso + trecho + total do frete em CTRCs diferentes — pode ser o mesmo transporte lançado 2x em categorias diferentes.
            </div>
            {grupoDup.map((d) => (
              <div key={d.id} style={{ padding: "10px 8px", borderBottom: `1px solid ${t.borda}55`, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: t.txt }}>CTRC {d.ctrc} · {CATEGORIA_LABEL[d.categoria]}</div>
                <div style={{ fontSize: 10.5, color: "var(--accent)", fontWeight: 700, marginTop: 1 }}>👤 {d.nome_usuario || "sem usuário na planilha"}</div>
                <div style={{ color: t.txt2, fontSize: 11, marginTop: 2 }}>
                  contrato {money(d.valor_contrato_frete)} · saldo {money(d.saldo)} · margem {Number(d.margem_lucro).toFixed(2)}%
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => onDecidir(d.id, "confirmar_ambas", "confirmado — não é duplicidade real")}
                    style={{ fontSize: 10.5, fontWeight: 700, padding: "5px 9px", borderRadius: 7, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt }}>
                    Confirmar (são 2 lançamentos reais)
                  </button>
                  <button onClick={() => onDecidir(d.id, "ignorar_duplicidade", "marcado como lançamento errado")}
                    style={{ fontSize: 10.5, fontWeight: 700, padding: "5px 9px", borderRadius: 7, cursor: "pointer", border: "none", background: t.danger, color: "#fff" }}>
                    É duplicidade — ignorar este
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setDupModal({ open: false, chave: null })}
                style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
