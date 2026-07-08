import React from "react";
import useModalEsc from "../hooks/useModalEsc.js";
import {
  parseFreteXLSX, diffImportFrete, inserirFrete, listarPendentesRevisao, listarSinalizados,
  decidir, listarTodosPeriodo, resumoPorCategoria, resumoPorCliente, resumoPorDia, gerarWorkbookXLSX,
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

// Ícones dos badges de sinalização — mesma linguagem stroke/round do resto do app.
const ICO_ALERTA = <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>;
const ICO_AMBIGUO = <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>;
const ICO_DUPLICIDADE = <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>;

// Ícones dos KPIs por categoria — mesma linguagem do Dashboard (hIco, 24x24 stroke).
const ICO_CATEGORIA = {
  frete:   <><rect x="1" y="3" width="15" height="13" rx="2" /><path d="m16 8 4 2 3 3v4h-7" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  descarga:<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  local:   <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  diaria:  <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
};

export default function ConferenciaFrete({ ctx, conn }) {
  const { t, isMobile, showToast, hexRgb, usuarioLogado, css, hIco } = ctx;

  const [periodoRef, setPeriodoRef] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [clienteFiltro, setClienteFiltro] = React.useState(""); // "" = todos os clientes
  const [usuarioFiltro, setUsuarioFiltro] = React.useState(""); // "" = todos os usuários (nome_usuario da planilha)
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
      const atualizado = await decidir(conn, id, decisao, obs, usuarioLogado);
      setPendentes((arr) => arr.filter((p) => p.id !== id));
      if (decisao === "sinalizar_correcao" && atualizado) setSinalizados((arr) => [atualizado, ...arr]);
      // Reflete a decisão nas linhas do período já carregadas — alimenta o ranking de revisão sem refetch.
      setLinhasPeriodo((arr) => arr.map((l) => l.id === id
        ? { ...l, decisao_manual: decisao, revisado_por: usuarioLogado, revisado_em: atualizado?.revisado_em || new Date().toISOString() }
        : l));
      showToast?.("Revisão registrada.", "ok");
    } catch (e) { showToast?.("Erro ao registrar decisão: " + e.message, "erro"); }
  };

  // Clientes presentes no período (pra popular o filtro, mesmo sem estar no cadastro fixo)
  const clientesPresentes = React.useMemo(() => [...new Set(linhasPeriodo.map(l => l.cliente))].sort(), [linhasPeriodo]);

  const linhasFiltradas = React.useMemo(
    () => clienteFiltro ? linhasPeriodo.filter(l => l.cliente === clienteFiltro) : linhasPeriodo,
    [linhasPeriodo, clienteFiltro]
  );
  const pendentesFiltrados = React.useMemo(() => pendentes
    .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
    .filter(p => !usuarioFiltro || (p.nome_usuario || "(sem usuário na planilha)") === usuarioFiltro),
    [pendentes, clienteFiltro, usuarioFiltro]
  );
  const sinalizadosFiltrados = React.useMemo(() => sinalizados
    .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
    .filter(p => !usuarioFiltro || (p.nome_usuario || "(sem usuário na planilha)") === usuarioFiltro),
    [sinalizados, clienteFiltro, usuarioFiltro]
  );

  const resumoCat = React.useMemo(() => resumoPorCategoria(linhasFiltradas), [linhasFiltradas]);
  const resumoCli = React.useMemo(() => resumoPorCliente(linhasFiltradas), [linhasFiltradas]);
  const resumoDia = React.useMemo(() => resumoPorDia(linhasFiltradas), [linhasFiltradas]);
  const totalMes = React.useMemo(() => Object.values(resumoCli).reduce((a, d) => ({
    registros: a.registros + d.registros, peso: a.peso + d.peso, fretePeso: a.fretePeso + d.fretePeso, saldo: a.saldo + d.saldo,
  }), { registros: 0, peso: 0, fretePeso: 0, saldo: 0 }), [resumoCli]);

  // Por usuário — quem lançou os registros hoje na fila de revisão, pra saber com quem falar.
  // Clicável: filtra a Fila de revisão/Sinalizados por esse usuário (usuarioFiltro).
  const resumoPorUsuario = React.useMemo(() => {
    const out = {};
    pendentes
      .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
      .forEach((p) => {
        const nome = p.nome_usuario || "(sem usuário na planilha)";
        out[nome] = (out[nome] || 0) + 1;
      });
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }, [pendentes, clienteFiltro]);

  // Ranking de revisão — quem (usuário logado) decidiu os itens da fila neste período/cliente.
  const rankingRevisao = React.useMemo(() => {
    const out = {};
    linhasFiltradas.forEach((l) => {
      if (!l.decisao_manual) return;
      const nome = l.revisado_por || "(sem registro)";
      out[nome] = (out[nome] || 0) + 1;
    });
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }, [linhasFiltradas]);

  // Mesmo card do Dashboard (css.card) — reskin pra bater com o resto do app.
  const card = { ...css.card, padding: isMobile ? 14 : 18 };
  // Mosaico (CSS columns) em vez de grid pareado — cards de altura desigual (ex.: Por
  // cliente curto ao lado de Evolução diária longa) não deixam mais espaço morto na
  // linha, porque cada coluna flui independente em vez de esticar pra bater com a maior.
  const masonry = { columnCount: isMobile ? 1 : 2, columnGap: 16 };
  const tile = { ...card, breakInside: "avoid", WebkitColumnBreakInside: "avoid", display: "inline-block", width: "100%", marginBottom: 16 };

  // Cabeçalho de seção — mesmo estilo mono/uppercase/text3 do Dashboard (ver DashboardView.jsx),
  // com um slot opcional à direita (badge de contagem, botão "Ver X ›" etc).
  const sectionHead = (label, right) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)", fontWeight: 400 }}>{label}</span>
      {right}
    </div>
  );

  const badge = (icon, texto, cor) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: hexRgb(cor, .12), border: `1px solid ${hexRgb(cor, .3)}`, color: cor, marginRight: 5, whiteSpace: "nowrap" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      {texto}
    </span>
  );

  // Avatar de usuário — mesmo modelo do círculo com iniciais do rodapé da sidebar
  // (co-sidebar__user), usado em qualquer lugar da tela que identifique uma pessoa.
  const iniciaisNome = (nome) => (nome || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const avatar = (nome, size = 18) => (
    <span style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, var(--accent), var(--cyan))",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.42), fontWeight: 700, color: "#fff",
      fontFamily: "var(--font-heading)", letterSpacing: "-0.01em",
    }}>
      {iniciaisNome(nome)}
    </span>
  );
  const userChip = (nome, size = 18) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {avatar(nome, size)}
      <span>{nome}</span>
    </span>
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
              icon={hIco(ICO_CATEGORIA[c], "var(--text3)", isMobile ? 10 : 11)}
              color={c === "frete" ? "var(--accent)" : undefined} compact={isMobile} />
          );
        })}
      </div>

      {/* Mosaico: todos os cards de resumo/revisão fluem em 2 colunas sem espaço morto */}
      <div style={masonry}>
      {/* Resumo por cliente — tabela alinhada, clique filtra por esse cliente */}
      {Object.keys(resumoCli).length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead(`Por cliente · ${mesLabel(periodoRef)}`)}

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 7px" }}>
            <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Cliente</span>
            <span style={{ width: 52, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>CTRCs</span>
            {!isMobile && <span style={{ width: 84, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Peso</span>}
            <span style={{ width: 96, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Frete</span>
            <span style={{ width: 96, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Saldo</span>
            {!isMobile && <span style={{ width: 60, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Margem</span>}
          </div>

          {Object.entries(resumoCli).map(([cliente, d]) => (
            <div key={cliente} onClick={() => setClienteFiltro(clienteFiltro === cliente ? "" : cliente)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 7, cursor: "pointer",
                background: clienteFiltro === cliente ? t.card2 : "transparent", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}
              onMouseEnter={(e) => { if (clienteFiltro !== cliente) e.currentTarget.style.background = t.card2; }}
              onMouseLeave={(e) => { if (clienteFiltro !== cliente) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cliente}</span>
              <span style={{ width: 52, textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt2 }}>{d.registros}</span>
              {!isMobile && <span style={{ width: 84, textAlign: "right", fontSize: 11, fontVariantNumeric: "tabular-nums", color: t.txt2 }}>{pesoFmt(d.peso)}</span>}
              <span style={{ width: 96, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt }}>{money(d.fretePeso)}</span>
              <span style={{ width: 96, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>{money(d.saldo)}</span>
              {!isMobile && (
                <span style={{ width: 60, textAlign: "right", fontSize: 11, fontWeight: 700, color: d.margemMedia < 0 ? t.danger : d.margemMedia < 10 ? t.warn : t.verde }}>
                  {d.margemMedia.toFixed(1)}%
                </span>
              )}
            </div>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 6px 2px", marginTop: 2 }}>
            <span style={{ flex: 1, fontWeight: 800, color: t.txt, textTransform: "uppercase", fontSize: 10, letterSpacing: ".04em" }}>Total</span>
            <span style={{ width: 52, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt }}>{totalMes.registros}</span>
            {!isMobile && <span style={{ width: 84, textAlign: "right", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: t.txt }}>{pesoFmt(totalMes.peso)}</span>}
            <span style={{ width: 96, textAlign: "right", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt }}>{money(totalMes.fretePeso)}</span>
            <span style={{ width: 96, textAlign: "right", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>{money(totalMes.saldo)}</span>
            {!isMobile && <span style={{ width: 60 }} />}
          </div>
        </div>
      )}

      {/* Evolução diária — quantos CTRCs entraram por dia, pra acompanhar o mês sem esperar fechar */}
      {resumoDia.length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead(`Evolução diária · ${mesLabel(periodoRef)}`)}

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 7px" }}>
            <span style={{ width: 44, fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Dia</span>
            <span style={{ width: 66, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>CTRCs</span>
            <span style={{ width: 40 }} />
            {!isMobile && <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Peso</span>}
            <span style={{ width: 96, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Frete</span>
            <span style={{ width: 96, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Saldo</span>
          </div>

          {[...resumoDia].reverse().map((d, i, arr) => {
            const anterior = arr[i + 1]; // arr já está em ordem decrescente (mais recente primeiro)
            const delta = anterior ? d.registros - anterior.registros : null;
            return (
              <div key={d.dia} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
                <span style={{ width: 44, flexShrink: 0, fontSize: 12, color: t.txt2, fontFamily: "var(--font-mono)" }}>
                  {(() => { const p = d.dia.split("-"); return `${p[2]}/${p[1]}`; })()}
                </span>
                <span style={{ width: 66, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt }}>{d.registros}</span>
                <span style={{ width: 40, fontSize: 10.5, fontWeight: 700, color: delta > 0 ? t.verde : delta < 0 ? t.danger : t.txt2 }}>
                  {delta !== null && delta !== 0 && <>{delta > 0 ? "▲" : "▼"}{Math.abs(delta)}</>}
                </span>
                {!isMobile && <span style={{ flex: 1, textAlign: "right", fontSize: 11, fontVariantNumeric: "tabular-nums", color: t.txt2 }}>{pesoFmt(d.peso)}</span>}
                <span style={{ width: 96, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt }}>{money(d.fretePeso)}</span>
                <span style={{ width: 96, textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>{money(d.saldo)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pendências por usuário — clicável, filtra a Fila/Sinalizados abaixo */}
      {resumoPorUsuario.length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead("Pendências por usuário")}
          <div style={{ fontSize: 11, color: t.txt2, marginTop: -6, marginBottom: 10 }}>Clique num usuário para filtrar os casos dele na fila de revisão.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {resumoPorUsuario.map(([nome, qtd]) => {
              const ativo = usuarioFiltro === nome;
              return (
                <button key={nome} onClick={() => setUsuarioFiltro(ativo ? "" : nome)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 600, padding: "5px 12px 5px 5px", borderRadius: 20, cursor: "pointer",
                    background: ativo ? hexRgb(t.ouro, .12) : t.card2, border: `1px solid ${ativo ? t.ouro : t.borda}`, color: t.txt, fontFamily: "inherit" }}>
                  {avatar(nome, 20)}
                  <b>{nome}</b> <span style={{ color: t.danger, fontWeight: 700 }}>{qtd}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranking de revisão — quem já decidiu quantos itens da fila neste período/cliente (barra estilo Top Motoristas) */}
      {rankingRevisao.length > 0 && (() => {
        const maxRank = rankingRevisao[0]?.[1] || 1;
        return (
        <div style={{ ...tile }}>
          {sectionHead(`Ranking de revisão · ${mesLabel(periodoRef)}`)}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rankingRevisao.map(([nome, qtd], i) => (
              <div key={nome}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ width: 16, textAlign: "center", fontSize: 10.5, fontWeight: 800, color: i === 0 ? t.ouro : t.txt2, flexShrink: 0 }}>{i + 1}º</span>
                  {avatar(nome, 22)}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.txt, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{qtd}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: t.card2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round(qtd / maxRank * 100)}%`, background: t.ouro, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {/* Fila de revisão */}
      <div style={{ ...tile }}>
        {sectionHead("Fila de revisão", (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {pendentesFiltrados.length > 0 && (
              <span style={{ background: "#dc2626", color: "#ffffff", fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{pendentesFiltrados.length}</span>
            )}
            {usuarioFiltro && (
              <button onClick={() => setUsuarioFiltro("")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                  background: hexRgb(t.ouro, .12), border: `1px solid ${t.ouro}`, color: t.ouro, fontFamily: "inherit" }}>
                {usuarioFiltro} ✕
              </button>
            )}
          </div>
        ))}
        <div style={{ fontSize: 11, color: t.txt2, marginTop: -6, marginBottom: 12 }}>
          Margem negativa, margem abaixo de 10%, classificação Descarga/Local ambígua, ou mesmo valor lançado em CTRCs diferentes (duplicidade). Fica até você decidir — nunca é resolvido sozinho.
        </div>

        {loading && <div style={{ color: t.txt2, fontSize: 13, padding: 16, textAlign: "center" }}>Carregando...</div>}
        {!loading && pendentesFiltrados.length === 0 && (
          <div style={{ color: t.txt2, fontSize: 13, padding: 20, textAlign: "center" }}>Nada pendente de revisão.</div>
        )}

        {!loading && pendentesFiltrados.map((p) => (
          <div key={p.id} onClick={() => abrirRevisar(p)}
            style={{ padding: "9px 6px", borderRadius: 7, borderBottom: `1px solid ${hexRgb(t.borda, .2)}`, cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.card2)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.cliente} · CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria}
              </span>
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: p.margem_lucro < 0 ? t.danger : p.margem_lucro < 10 ? t.warn : t.verde }}>
                {Number(p.margem_lucro).toFixed(1)}%
              </span>
              <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>
                {money(p.saldo)}
              </span>
              <button onClick={(e) => { e.stopPropagation(); abrirRevisar(p); }}
                style={{ fontSize: 10.5, fontWeight: 700, padding: "6px 13px", borderRadius: 7, cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", flexShrink: 0 }}>
                Revisar
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 5 }}>
              <span style={{ fontSize: 10.5, color: t.txt, fontWeight: 700 }}>{userChip(p.nome_usuario || "sem usuário", 15)}</span>
              {p.placa && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{p.placa}</span>}
              {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
              {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
              {p.flag_ambigua && badge(ICO_AMBIGUO, "DESCARGA/LOCAL AMBÍGUO", t.azul || "#3b82f6")}
              {p.flag_duplicidade && badge(ICO_DUPLICIDADE, "POSSÍVEL DUPLICIDADE", t.danger)}
            </div>
          </div>
        ))}
      </div>

      {/* Sinalizados para correção — saíram da fila de revisão, mas ficam visíveis até a origem ser corrigida */}
      {sinalizadosFiltrados.length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead("Sinalizados", (
            <span style={{ background: "#B84F1F", color: "#ffffff", fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{sinalizadosFiltrados.length}</span>
          ))}
          <div style={{ fontSize: 11, color: t.txt2, marginTop: -6, marginBottom: 12 }}>
            Já saíram do alerta e continuam contando no total — aguardando correção na origem (exclusão/reimportação).
          </div>
          {sinalizadosFiltrados.map((p) => (
            <div key={p.id} style={{ padding: "9px 6px", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.cliente} · CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria}
                </span>
                <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>
                  {money(p.saldo)}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: t.ouro, marginTop: 3 }}>
                🏷 sinalizado {p.revisado_em ? new Date(p.revisado_em).toLocaleDateString("pt-BR") : ""}
                {p.revisado_obs && <span style={{ color: t.txt2 }}> · “{p.revisado_obs}”</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Modal: pré-visualização antes de gravar */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 520, width: "90vw", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>Confirmar importação</div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 14 }}>{preview.fileName}</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 9, background: "rgba(2,192,118,.08)", border: `1px solid ${hexRgb(t.verde, .27)}`, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt }}>{preview.cliente}</div>
              <div style={{ fontSize: 11, color: t.txt2, marginLeft: "auto" }}>competência {mesLabel(preview.periodoRef)}</div>
            </div>

            {["frete", "descarga", "local", "diaria"].map((c) => {
              const d = preview.resumo[c];
              if (!d.registros) return null;
              return (
                <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
                  <span style={{ color: t.txt }}>{CATEGORIA_LABEL[c]}</span>
                  <span style={{ color: t.txt2 }}>{d.registros} registros · {money(d.fretePeso)}</span>
                </div>
              );
            })}

            {preview.naoClassificadas.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: t.warn, background: hexRgb(t.warn, .1), border: `1px solid ${hexRgb(t.warn, .33)}`, borderRadius: 8, padding: "8px 10px" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
            <span style={{ color: t.txt2 }}>{l}</span>
            <span style={{ color: t.txt, fontWeight: 600, textAlign: "right" }}>{v || "—"}</span>
          </div>
        );
        return (
          <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 560, width: "90vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 2 }}>{p.cliente} · CTRC {p.ctrc}</div>
              <div style={{ fontSize: 11, color: t.txt, fontWeight: 700, marginBottom: 10 }}>{userChip(p.nome_usuario || "sem usuário na planilha", 16)}</div>

              <div style={{ marginBottom: 12 }}>
                {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
                {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
                {p.flag_ambigua && badge(ICO_AMBIGUO, "DESCARGA/LOCAL AMBÍGUO", t.azul || "#3b82f6")}
                {p.flag_duplicidade && badge(ICO_DUPLICIDADE, "POSSÍVEL DUPLICIDADE", t.danger)}
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
              <div key={d.id} style={{ padding: "10px 8px", borderBottom: `1px solid ${hexRgb(t.borda, .33)}`, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: t.txt }}>CTRC {d.ctrc} · {CATEGORIA_LABEL[d.categoria]}</div>
                <div style={{ fontSize: 10.5, color: t.txt, fontWeight: 700, marginTop: 1 }}>{userChip(d.nome_usuario || "sem usuário na planilha", 15)}</div>
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
