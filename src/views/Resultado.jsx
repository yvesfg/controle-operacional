import React from "react";
import { Badge } from "../design-system/components/Badge.jsx";
import { Button } from "../design-system/components/Button.jsx";
import Icon from "../components/Icon.jsx";
import ModalDespesa from "../modals/ModalDespesa.jsx";
import Toggle from "../components/Toggle.jsx";
import useModalEsc from "../hooks/useModalEsc.js";
import { BASES } from "../constants.js";
import {
  parseDespesasXLSX, diffImport, inserirImportadas, listarDespesas, listarDespesasBase,
  listarMesesComDespesas,
  inserirManual, atualizarDespesa, deletarDespesa, deletarImportadas,
  listarIndevidasPendentes, classeDoCredito,
} from "../despesas.js";
// Carregados sob demanda: ConferenciaFrete tem 2.600 linhas e ContratosFrete
// mais 470, e os dois entravam no bundle do Financeiro mesmo pra quem abre o
// Resumo e nunca troca de segmento.
const ConferenciaFrete = React.lazy(() => import("./ConferenciaFrete.jsx"));
const ContratosFrete   = React.lazy(() => import("./ContratosFrete.jsx"));
const Conciliacao      = React.lazy(() => import("./Conciliacao.jsx"));
import { getPerfil } from "../operacao/perfil.js";
import KpiCard from "../components/KpiCard.jsx";
import PeriodoBotao from "../components/PeriodoModal.jsx";
import { periodoDeMesRef, mesRefDe } from "../periodoDash.js";
import { nCte, nContrato, aplicarComplementar, origemBate, semFilial } from "../financeiroCalc.js";

// Resultado — confronta a margem operacional (Σ vl_cte − Σ vl_contrato) com as
// despesas mensais persistidas (tabela despesas_filial). Aba por base (qualquer base),
// gated por permissão financeira (canFin).

const mesDe = (s) => { if (!s) return null; const p = String(s).split("/"); return p.length >= 3 ? `${p[2]}-${p[1].padStart(2, "0")}` : null; };
const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };
const fmtDiaMes = (iso) => { if (!iso) return null; const p = String(iso).split("-"); return p.length >= 3 ? `${p[2].slice(0, 2)}/${p[1]}` : null; };
// Chave de duplicidade — mesma usada no parser (valor + natureza + histórico) p/ reagrupar os possíveis duplicados.
const normTxt = (s) => (s || "").toUpperCase().replace(/\s+/g, " ").trim();
const dupKeyOf = (d) => `${Math.round((Number(d.valor) + Number.EPSILON) * 100) / 100}||${normTxt(d.natureza)}||${normTxt(d.historico)}`;

export default function Resultado({ ctx }) {
  const {
    activeTab, baseAtual, DADOS, getConexao, t, isMobile, showToast, canFin, hexRgb,
    mesRefFin: mesRef, setMesRefFin: setMesRef, incluirCompFin: incluirComp, setIncluirCompFin: setIncluirComp,
    irParaCreditos, segmento,
  } = ctx;
  if (activeTab !== "resultado") return null;
  const baseId = baseAtual?.id;
  if (canFin === false) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira para visualizar o Resultado.</div>;
  }

  // Segmentado Operacional/Faturamento agora mora na faixa única do FinanceiroView (ctx.segmento);
  // aqui só consumimos o valor pra decidir qual sub-tela renderizar.

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

  // mesRef/incluirComp vêm compartilhados de FinanceiroView (ver finCtx) — só o default
  // de mês (quando ainda vazio) continua local, pois mesesDisp aqui inclui despesas gravadas.
  React.useEffect(() => { if (!mesRef && mesesDisp.length) setMesRef(mesesDisp[0]); }, [mesesDisp, mesRef]);

  const [despesas, setDespesas] = React.useState([]);
  const [indevidas, setIndevidas] = React.useState([]);
  // Recorte por filial — só nas bases cujas despesas chegam marcadas por aba (IMP/BELÉM).
  // Mesma feature e mesmos valores do Painel Financeiro, pra não existirem dois recortes.
  const temFilial = getPerfil(baseId).features.filialNasDespesas;
  // A filial passou a vir do seletor do TOPBAR (ctx.filialAtiva, "todas"|"IMP"|"BELÉM") —
  // antes cada tela tinha o seu botão, e o mesmo recorte aparecia duas vezes na mesma faixa.
  const filial = temFilial && ctx.filialAtiva && ctx.filialAtiva !== "todas" ? ctx.filialAtiva : "todos";
  const recorteFilial = temFilial && filial !== "todos";
  const filialLabel = filial === "IMP" ? "Imperatriz" : "Belém";
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
  const [soRevisao, setSoRevisao] = React.useState(false); // filtro "só as marcadas pra conferir"
  const listaRef = React.useRef(null); // âncora pra rolar até a lista ao clicar no card de revisão
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

  // Despesa carrega sempre a base inteira (o import grava as 2 filiais juntas); o recorte
  // é de exibição, por `aba_origem` — a mesma coluna que o parser grava da aba da planilha.
  const porFilial = React.useCallback(
    (arr) => (recorteFilial ? arr.filter((d) => d.aba_origem === filial) : arr),
    [recorteFilial, filial]);
  const despesasMes = React.useMemo(() => porFilial(despesas), [despesas, porFilial]);
  const indevidasView = React.useMemo(() => porFilial(indevidas), [indevidas, porFilial]);

  // ── Receita / custo / margem (exclui PENDENTE) ──
  // Com filial selecionada, recorta pela origem da viagem — o mesmo casamento que o
  // Painel Financeiro faz (origemBate, em financeiroCalc.js). Filtrar só a despesa daria
  // um "Resultado de Belém" com o faturamento das duas cidades dentro.
  const fin = React.useMemo(() => {
    const regs = (DADOS || []).filter((r) => mesDe(r.data_carr) === mesRef && (r.status || "").toUpperCase() !== "PENDENTE"
      && (!recorteFilial || origemBate(r.origem, filial)));
    let receita = 0, custo = 0, comp = 0;
    regs.forEach((r) => { receita += nCte(r.vl_cte); custo += nContrato(r.vl_contrato); comp += nCte(r.vl_cte_comp); });
    const { receita: receitaF, custo: custoF, margem } = aplicarComplementar({ receita, custo, comp }, { incluirComp, baseId });
    return { receita: receitaF, custo: custoF, comp, margem, n: regs.length };
  }, [DADOS, mesRef, incluirComp, baseId, recorteFilial, filial]);

  // Viagens do mês que ficam de fora dos DOIS recortes por não ter origem preenchida —
  // é o que faz Imperatriz + Belém não fechar com o total. A tela avisa em vez de sumir.
  const semOrigem = React.useMemo(() => {
    if (!temFilial) return { n: 0 };
    const regs = (DADOS || []).filter((r) => mesDe(r.data_carr) === mesRef
      && (r.status || "").toUpperCase() !== "PENDENTE" && semFilial(r));
    return { n: regs.length, receita: regs.reduce((s, r) => s + nCte(r.vl_cte), 0) };
  }, [DADOS, mesRef, temFilial]);

  // TODO crédito abate a despesa — é o critério da própria planilha de débitos, que
  // declara "TOTAL DE DESPESAS" já líquido (aba IMP 07/2026: 114.674,07 − 3.128,39 =
  // 111.545,68, o total impresso). Chegamos a separar 'receita' pra fora do cálculo
  // (migration 050) e estava ERRADO na prática: "Receitas com Sinistro" é o reembolso
  // do seguro de um prejuízo que a empresa paga parcelado na MESMA base (débitos
  // "SINISTRO AÇO VERDE 8x10/9x10/10x10", R$ 6.851,31/mês em Açailândia) — recuperação
  // de custo, não receita nova. Mesma lógica em venda de avaria e de cinta/gancho.
  // classe_credito continua gravada, mas agora só ROTULA a origem do abatimento.
  const creditos = despesasMes.filter((d) => d.tipo === "credito");
  const recuperacoes = creditos.filter((d) => classeDoCredito(d) === "receita");
  const debitos = despesasMes.filter((d) => d.tipo !== "credito");
  const despDebInc = debitos.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0);
  const credInc = creditos.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0); // negativo
  const recupInc = recuperacoes.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0); // subconjunto de credInc
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
      const msg = `Filiais com lançamentos: ${achadas.join(", ") || "—"}.\nSEM lançamentos: ${faltando.join(", ")}.\nPode ser normal ou aba esquecida. Continuar?`;
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
  // Agrupa despesas por grupo p/ exibição (com filtro de busca)
  const buscaQ = busca.trim().toLowerCase();
  const pool = porFilial(buscaTodosMeses ? despesasTodas : despesas);
  const emRevisao = pool.filter((d) => d.em_revisao);
  const totalEmRevisao = emRevisao.reduce((s, d) => s + Math.abs(Number(d.valor || 0)), 0);
  const poolBase = soRevisao ? emRevisao : pool;
  const despesasFiltradas = buscaQ
    ? poolBase.filter(d =>
        (d.natureza || "").toLowerCase().includes(buscaQ) ||
        (d.historico || "").toLowerCase().includes(buscaQ) ||
        (d.grupo || "").toLowerCase().includes(buscaQ) ||
        (d.conta || "").toLowerCase().includes(buscaQ) ||
        String(Math.abs(Number(d.valor || 0)).toFixed(2)).includes(buscaQ)
      )
    : poolBase;
  const porGrupo = {};
  despesasFiltradas.forEach((d) => { (porGrupo[d.grupo || "—"] = porGrupo[d.grupo || "—"] || []).push(d); });

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };

  return (
    <div style={{ padding: isMobile ? 12 : "20px 24px" }}>
      {segmento === "conciliacao" ? (
        <React.Suspense fallback={<div style={{ padding: 24, color: t.txt2, fontSize: 12 }}>Carregando conciliação…</div>}>
          <Conciliacao ctx={ctx} conn={conn} />
        </React.Suspense>
      ) : segmento === "contratos" ? (
        <React.Suspense fallback={<div style={{ padding: 24, color: t.txt2, fontSize: 12 }}>Carregando contratos…</div>}>
          <ContratosFrete ctx={ctx} conn={conn} />
        </React.Suspense>
      ) : segmento === "faturamento" ? (
        <React.Suspense fallback={<div style={{ padding: 24, color: t.txt2, fontSize: 12 }}>Carregando conferência…</div>}>
          <ConferenciaFrete ctx={ctx} conn={conn} />
        </React.Suspense>
      ) : (
      <>
      {/* Controles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <PeriodoBotao value={periodoDeMesRef(mesRef)} meses={mesesDisp} modo="mes"
          titulo="Mês do Resultado"
          onChange={(p) => { const m = mesRefDe(p); if (m) setMesRef(m); }} />
        {/* O toggle não pode fingir que faz algo: vl_cte_comp está zerado em toda a base
            hoje (ninguém alimenta o campo), então ligá-lo não muda número nenhum.
            Desligado e explicado é honesto; some sozinho quando o campo voltar a ter valor. */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12,
          color: fin.comp ? t.txt : t.txt2, padding: "6px 11px", border: `1px solid ${t.borda}`, borderRadius: 8 }}
          title={fin.comp ? "" : "Nenhum valor de CTe complementar lançado neste mês — o campo vl_cte_comp está vazio no operacional."}>
          <Toggle checked={incluirComp && !!fin.comp} onChange={setIncluirComp} disabled={!fin.comp}
            label={fin.comp
              ? `Incluir complementar ${getPerfil(baseId).financeiro.complementarMargemZero ? "(margem zero)" : "(margem cheia)"}`
              : "Sem complementar lançado neste mês"} />
        </div>
        {/* O seletor de filial saiu daqui: agora é o do topbar (Imperatriz / Belém / as duas
            juntas), o mesmo que o Painel Financeiro respeita — dois seletores para o mesmo
            recorte na mesma faixa era a redundância que a tela tinha. */}
        {temFilial && filial !== "todos" && (
          <Badge variant="primary" size="md">
            {filialLabel}
          </Badge>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods" onChange={onImport} style={{ display: "none" }} />
          {lastImportIds.length > 0 && (
            <>
              <button onClick={() => { setUndoOpen(o => !o); setUndoInput(""); }}
                style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${t.danger||"var(--cat-red)"}`, background: undoOpen ? `rgba(246,70,93,.1)` : "transparent",
                  color: t.danger||"var(--cat-red)" }}>
                <Icon n="undo" s={13} /> Desfazer ({lastImportIds.length})
              </button>
              {/* separa a ação destrutiva das demais — evita clique acidental por proximidade */}
              <div style={{ width: 1, alignSelf: "stretch", background: t.borda, margin: "0 4px" }} />
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing || !mesRef}>
            {importing ? "Importando..." : <><Icon n="upload" s={13} /> Importar planilha</>}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setModal({ open: true, inicial: null })}>+ Despesa</Button>
        </div>
      </div>
      {/* Painel de confirmação Desfazer importação */}
      {undoOpen && lastImportIds.length > 0 && (
        <div style={{ marginBottom: 14, padding: "14px 16px", borderRadius: 10,
          background: `rgba(246,70,93,.07)`, border: `1px solid ${t.danger||"var(--cat-red)"}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.danger||"var(--cat-red)", marginBottom: 6 }}>
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
                border: `1.5px solid ${undoInput === "sim" ? (t.danger||"var(--cat-red)") : t.borda}`,
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
                background: undoInput === "sim" ? (t.danger||"var(--cat-red)") : "transparent",
                color: undoInput === "sim" ? "#fff" : (t.txt2||"#888"),
                border: `1px solid ${undoInput === "sim" ? (t.danger||"var(--cat-red)") : t.borda}`,
                opacity: importing ? .6 : 1 }}>
              Confirmar desfazer
            </button>
            <Button variant="secondary" size="sm" onClick={() => { setUndoOpen(false); setUndoInput(""); }}>
              Cancelar
            </Button>
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
                    borderRadius: 8, background: s.recognized ? (temMesDivergente ? `rgba(217,98,43,.08)` : `rgba(2,192,118,.06)`) : t.card2,
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
                      <Badge variant="primary" size="sm">
                        mês diferente
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: t.txt2, marginBottom: 14 }}>
              {Object.values(sheetSel.checked).filter(Boolean).length} de {sheetSel.sheetsMeta.filter(s => s.recognized).length} abas selecionadas ·{" "}
              {sheetSel.pendingRows.filter(r => sheetSel.checked[r._sheetNome]).length} linhas
            </div>

            {/* Negativos classificados como receita: é o ponto onde antes entravam como
                abatimento de despesa e viravam lucro. Mostra antes de gravar. */}
            {(() => {
              const rec = sheetSel.pendingRows.filter(r => sheetSel.checked[r._sheetNome] && r.classe_credito === "receita");
              if (!rec.length) return null;
              const porNat = {};
              rec.forEach(r => { const k = r.natureza || "—"; porNat[k] = (porNat[k] || 0) + Number(r.valor || 0); });
              return (
                <div style={{ fontSize: 11, color: t.txt2, background: `${t.azul}12`, border: `1px solid ${t.azul}44`,
                  borderRadius: 8, padding: "9px 11px", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: t.azul, marginBottom: 5 }}>
                    {rec.length} crédito(s) de recuperação — {money(Math.abs(Object.values(porNat).reduce((s, v) => s + v, 0)))}
                  </div>
                  {Object.entries(porNat).sort((a, b) => a[1] - b[1]).map(([nat, v]) => (
                    <div key={nat} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nat}</span>
                      <span style={{ fontFamily: "var(--font-mono)", flexShrink: 0 }}>{money(Math.abs(v))}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 5 }}>Abatem a despesa como qualquer crédito — o rótulo serve só pra você enxergar quanto do abatimento veio de sinistro/avaria/venda em vez de estorno de fornecedor.</div>
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="secondary" size="sm" onClick={() => setSheetSel(s => ({ ...s, open: false }))}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={onConfirmSheets}
                disabled={Object.values(sheetSel.checked).every(v => !v) || importing}>
                {importing ? "Importando..." : `Importar selecionadas`}
              </Button>
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
                <Icon n="alert" s={13} /> Nenhuma linha datada de {mesLabel(mesRef)} nas abas selecionadas — confira se é o arquivo/mês certo antes de marcar linhas abaixo.
              </div>
            )}
            {/* Mestre da lista: marcar tudo e ir desmarcando a exceção é mais rápido do que
                clicar linha a linha (o arquivo pode trazer ~200 linhas de outro mês). */}
            {(() => {
              const total = foraMesSel.foraMes.length;
              const marcadas = foraMesSel.foraMes.filter((_, i) => foraMesSel.checked[String(i)]).length;
              const todas = total > 0 && marcadas === total;
              const marcarTodas = (on) => setForaMesSel(prev => ({
                ...prev,
                checked: Object.fromEntries(prev.foraMes.map((_, i) => [String(i), on])),
              }));
              return (
                <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8,
                  borderRadius: 8, cursor: "pointer", background: t.card2, border: `1px solid ${t.borda}` }}>
                  <input type="checkbox" checked={todas}
                    /* indeterminado quando só parte está marcada — só dá pra setar por ref */
                    ref={(el) => { if (el) el.indeterminate = marcadas > 0 && !todas; }}
                    onChange={() => marcarTodas(!todas)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: t.verde, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: t.txt }}>
                    {todas ? "Desmarcar todas" : "Selecionar todas"}
                  </span>
                  <span style={{ fontSize: 10, color: t.txt2, fontFamily: "var(--font-mono)" }}>{marcadas}/{total}</span>
                </label>
              );
            })()}

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
              <Button variant="secondary" size="sm" onClick={() => { setForaMesSel(s => ({ ...s, open: false })); showToast?.("Importação cancelada.", "erro"); }}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={onConfirmForaMes} disabled={importing}>
                {importing ? "Importando..." : "Confirmar importação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recorte ativo: diz de onde vem cada metade do P&L, pra ninguém ler como se fosse
          a base inteira. O aviso das viagens sem origem explica por que Imperatriz + Belém
          não fecha com "Imp + Bel". */}
      {recorteFilial && (
        <div style={{ fontSize: 11, color: t.ouro, marginBottom: 12, marginTop: -6 }}>
          Visão isolada: <b>{filialLabel}</b> · receita pela origem da viagem + despesas da aba {filial}.
          {semOrigem.n > 0 && (
            <span style={{ color: t.txt2 }}>
              {" "}· {semOrigem.n} viagem(ns) do mês sem origem preenchida ({money(semOrigem.receita)}) ficam fora deste recorte e do de {filial === "IMP" ? "Belém" : "Imperatriz"}.
            </span>
          )}
        </div>
      )}

      {/* KPIs do resultado */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        <KpiCard label="Faturamento (CTE)" value={money(fin.receita)} sub={`${fin.n} viagens`} color={t.verde} compact={isMobile} />
        <KpiCard label="Pago motorista" value={money(fin.custo)} sub="vl. contrato" compact={isMobile} />
        <KpiCard label="Margem bruta" value={money(fin.margem)} sub={pct(fin.margem)} color={t.ouro} compact={isMobile} />
        <KpiCard label="Despesas (débito)" value={money(despDebInc)} sub="incluídas" color={t.danger} compact={isMobile} />
        <KpiCard label="Créditos" value={money(Math.abs(credInc))} sub="abatem a despesa" color={t.verde} compact={isMobile} />
        <KpiCard label="Dos quais, recuperações" value={money(Math.abs(recupInc))} sub="sinistro, avaria, venda" color={t.azul} compact={isMobile} />
        <KpiCard label="Resultado" value={money(resultado)} sub={pct(resultado)} color={t.verde} danger={resultado < 0} compact={isMobile} />
        {/* Marcadas pra conferir (migration 060): o valor em aberto tem que ficar à vista junto
            dos outros números, senão a dúvida vira uma linha perdida no meio da lista. Clicar
            filtra a lista e leva até ela. Só aparece quando há algo em revisão. */}
        {emRevisao.length > 0 && (
          <KpiCard label={soRevisao ? "Em revisão · filtrando" : "Em revisão"}
            value={money(totalEmRevisao)}
            sub={`${emRevisao.length} lançamento(s) · clique para ${soRevisao ? "ver todos" : "abrir"}`}
            color={t.ouro} compact={isMobile}
            onClick={() => {
              setSoRevisao((v) => !v);
              setTimeout(() => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
            }} />
        )}
      </div>

      {/* Indevidas aguardando crédito — resumo. O vínculo (incl. cross-filial/mês) é feito
          só em Créditos Pendentes agora, evitando duas telas com fluxos incompletos entre si. */}
      {indevidasView.length > 0 && (() => {
        const totalIndevido = indevidasView.reduce((s, i) => s + Math.abs(Number(i.valor || 0)), 0);
        const filialParaCreditos = getPerfil(baseId).financeiro.filialDespesas;
        return (
          <div style={{ ...card, marginBottom: 16, border: `1px solid ${t.danger}55`,
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Indevidas aguardando crédito</span>
                <span style={{ background: `${t.danger}1a`, color: t.danger, fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{indevidasView.length}</span>
              </div>
              <div style={{ fontSize: 11, color: t.txt2 }}>
                {money(totalIndevido)} nesta base, em todos os meses até resolver.
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={() => irParaCreditos?.(filialParaCreditos)}>
              Ver e vincular <Icon n="arrow-right" s={13} />
            </Button>
          </div>
        );
      })()}

      {/* Lista de despesas */}
      <div ref={listaRef} style={{ ...card, ...(soRevisao ? { borderColor: hexRgb(t.ouro, .5) } : null) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.txt, flex: "0 0 auto" }}>
            Despesas · {mesLabel(mesRef)}{recorteFilial && <span style={{ color: t.ouro }}> · {filialLabel}</span>}
            {soRevisao && <span style={{ color: t.ouro }}> · em revisão</span>}
          </div>
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
              <Button variant="ghost" size="md" onClick={() => setBusca("")} style={{ position: "absolute", top: "50%", right: 7 }}>
                ×
              </Button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
            <Toggle checked={buscaTodosMeses} onChange={v => { setBuscaTodosMeses(v); }}
              label="Todos os meses" size={0.82} />
          </div>
          {/* Atalho pra achar o que ficou pendente de conferência (migration 060). Só aparece
              quando há alguma — chip morto em tela cheia de dado só atrapalha. */}
          {(emRevisao.length > 0 || soRevisao) && (
            <button onClick={() => setSoRevisao(v => !v)} title="Mostrar só as despesas marcadas para conferir"
              style={{ flex: "0 0 auto", fontSize: 10.5, fontWeight: 700, padding: "5px 10px", borderRadius: 20,
                cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${soRevisao ? t.ouro : hexRgb(t.ouro, .45)}`,
                background: soRevisao ? hexRgb(t.ouro, .16) : "transparent", color: t.ouro }}>
              Em revisão ({emRevisao.length})
            </button>
          )}
          <div style={{ fontSize: 11, color: t.txt2, fontFamily: "var(--font-mono)", flex: "0 0 auto" }}>
            {buscaQ ? `${despesasFiltradas.length} de ${pool.length}` : `${pool.length}`} lançamentos
            {loadingTodas && <Icon n="clock" s={12} style={{ marginLeft: 4 }} />}
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
                    {d.origem === "manual" && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--cat-violet)", fontWeight: 700 }}>MANUAL</span>}
                    {classeDoCredito(d) === "estorno" && <span style={{ marginLeft: 6, fontSize: 9, color: t.verde, fontWeight: 700 }}>CRÉDITO</span>}
                    {classeDoCredito(d) === "receita" && <span title="Recuperação de custo (sinistro, avaria, venda) — abate a despesa como qualquer crédito" style={{ marginLeft: 6, fontSize: 9, color: t.azul, fontWeight: 700 }}>RECUPERAÇÃO</span>}
                    {d.indevida && <span style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>{d.credito_match_id ? "RECUPERADA" : "INDEVIDA"}</span>}
                    {d.dup_flag && <span title="Clique para ver os outros lançamentos de mesmo valor" style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>DUPLICIDADE? <Icon n="alert" s={10} /></span>}
                    {/* Estado intermediário (migration 060): marcada pra conferir, sem decisão ainda. */}
                    {d.em_revisao && (
                      <span title={d.revisao_obs || "Marcada para conferir antes de decidir"}
                        style={{ marginLeft: 6, fontSize: 9, color: t.ouro, fontWeight: 700 }}>EM REVISÃO</span>
                    )}
                    {/* Filtrando só as em revisão, o motivo sai do tooltip e fica na tela — é
                        o que a pessoa precisa ler pra decidir. */}
                    {d.em_revisao && soRevisao && d.revisao_obs && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: t.txt2, fontStyle: "italic" }}>
                        — {d.revisao_obs}
                      </span>
                    )}
                  </>
                );
                const toggleDup = d.dup_flag ? (
                  <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: t.txt2 }}>
                    <Toggle checked={d.incluir} onChange={() => toggleIncluir(d)} size={0.78} /> incl.
                  </span>
                ) : null;
                const valorSpan = (
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700,
                    color: classeDoCredito(d) === "receita" ? t.azul : d.tipo === "credito" ? t.verde : t.txt }}>
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
                  borderLeft: `2px solid ${classeDoCredito(d) === "receita" ? t.azul : d.tipo === "credito" ? t.verde : "transparent"}`,
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
                          <Badge variant="info" size="sm"  style={{ marginTop: 2 }}>
                            {mesLabel(d.mes_ref)}
                          </Badge>
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
                        <Badge variant="info" size="sm"  style={{ marginTop: 2, alignSelf: "flex-start" }}>
                          {mesLabel(d.mes_ref)}
                        </Badge>
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
        const grupo = despesasMes.filter((x) => x.tipo !== "credito" && dupKeyOf(x) === chave);
        const incluidos = grupo.filter((x) => x.incluir);
        const totalIncl = incluidos.reduce((s, x) => s + Number(x.valor || 0), 0);
        const fechar = () => setDupModal({ open: false, registro: null });
        return (
          <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.txt }}>Possível duplicidade · {money(Number(dupModal.registro.valor || 0))}</div>
                <Button variant="ghost" size="md" onClick={fechar}>×</Button>
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
                      {d.origem === "manual" && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--cat-violet)", fontWeight: 700 }}>MANUAL</span>}
                    </div>
                    {d.historico && d.natureza && (
                      <div style={{ fontSize: 10.5, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{d.historico}</div>
                    )}
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: t.txt2, flexShrink: 0 }}>
                    <Toggle checked={d.incluir} onChange={() => toggleIncluir(d)} size={0.82} /> incl.
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => { fechar(); setModal({ open: true, inicial: d }); }} style={{ flexShrink: 0 }}>Editar</Button>
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

      <ModalDespesa open={modal.open} inicial={modal.inicial} t={t} isMobile={isMobile} usuarioLogado={ctx.usuarioLogado}
        onClose={() => setModal({ open: false, inicial: null })} onSave={salvar} onDelete={excluir} />
      </>
      )}
    </div>
  );
}
