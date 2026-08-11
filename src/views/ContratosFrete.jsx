import React from "react";
import ReactDOM from "react-dom";
import {
  parseContratosXLSX, diffImportContratos, inserirContratos, listarContratosPorPeriodos,
  cruzarContratos, resumoCruzamento, PROBLEMA, ALIQUOTAS, esperado,
  listarRegrasTrecho, definirRegraTrecho, trechosPendentes,
} from "../freteContratos.js";
import { listarTodosPeriodo, vincularContratoCte } from "../freteConferencia.js";
import KpiCard from "../components/KpiCard.jsx";
import ModalRelatorio from "../components/ModalRelatorio.jsx";

// Contratos de Frete — o outro lado da Conferência de Faturamento (migration 055).
// O relatório de CTes diz o que se COBRA; este diz quem LEVOU e quanto custou de encargo.
// A ponte é a coluna "CTe Ctrc" do contrato, que casa com frete_conferencia.ctrc dentro da
// mesma empresa de emissão — nunca por cliente, porque MAT é a matriz e mistura Imperatriz,
// Açailândia e Maranhão Ind. de Couros no mesmo arquivo.
const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };
const dataBR = (d) => (d ? d.split("-").reverse().join("/") : "");

// Ordem de exibição da fila: o encargo patronal que falta lançar é o que custa dinheiro,
// então vem primeiro; "sem CTe na base" é informativo (o mês do CTe pode não estar importado).
const ORDEM_PROBLEMA = ["pf_sem_custos_externos", "pf_sem_inss", "pf_sem_sest", "cte_sem_contrato", "cte_contrato_vinculado", "contrato_zerado", "sem_cte_na_base", "trecho_nao_decidido"];
const COR_PROBLEMA = {
  pf_sem_custos_externos: "var(--red)",
  pf_sem_inss: "var(--red)",
  pf_sem_sest: "var(--red)",
  cte_sem_contrato: "var(--yellow)",
  cte_contrato_vinculado: "var(--green)",
  contrato_zerado: "var(--yellow)",
  sem_cte_na_base: "var(--text3)",
  trecho_nao_decidido: "var(--color-info)",
};

export default function ContratosFrete({ ctx, conn }) {
  const { t, isMobile, showToast, hexRgb, filaSlot } = ctx;

  const [periodoRef, setPeriodoRef] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [contratos, setContratos] = React.useState([]);
  const [ctes, setCtes] = React.useState([]);
  const [regras, setRegras] = React.useState([]);
  const [salvandoRegra, setSalvandoRegra] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [preview, setPreview] = React.useState(null); // { linhas, novas, atualizadas, periodosEncontrados, empresas }
  const [filtroProblema, setFiltroProblema] = React.useState(""); // "" = todos
  const [busca, setBusca] = React.useState("");
  const [relOpen, setRelOpen] = React.useState(false);
  const [vinculando, setVinculando] = React.useState(""); // id do CTe sendo vinculado
  const fileRef = React.useRef(null);

  const carregar = React.useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    try {
      const [cts, ces, regs] = await Promise.all([
        listarContratosPorPeriodos(conn, [periodoRef]),
        listarTodosPeriodo(conn, periodoRef),
        listarRegrasTrecho(conn),
      ]);
      setContratos(cts || []);
      setCtes(ces || []);
      setRegras(regs || []);
    } catch (e) { showToast?.("Erro ao carregar contratos: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, [conn, periodoRef, showToast]);

  React.useEffect(() => { carregar(); }, [carregar]);

  // Cruzamento é sempre recalculado na leitura — nada de problema gravado no banco, senão
  // corrigir o lançamento no TMS não limparia a fila sozinho na próxima importação.
  const cruzados = React.useMemo(() => cruzarContratos(contratos, ctes, regras), [contratos, ctes, regras]);
  const resumo = React.useMemo(() => resumoCruzamento(cruzados), [cruzados]);
  const pendentesTrecho = React.useMemo(() => trechosPendentes(cruzados), [cruzados]);
  // Trechos que já foram marcados como "não é nossa" e aparecem neste mês — ficam visíveis
  // pra decisão não virar caixa-preta: dá pra reverter num clique.
  const ignoradosTrecho = React.useMemo(() => {
    const out = {};
    cruzados.filter((c) => c.ignorado).forEach((c) => {
      const k = `${c.empresa_emissao}||${c.trecho}`;
      out[k] = out[k] || { empresa_emissao: c.empresa_emissao, trecho: c.trecho, contratos: 0 };
      out[k].contratos++;
    });
    return Object.values(out).sort((a, b) => b.contratos - a.contratos);
  }, [cruzados]);

  // Decisão de trecho: vale pra este e pros próximos meses (a regra fica gravada), então o
  // arquivo do mês que vem já entra classificado sem ninguém repetir o trabalho.
  const decidirTrecho = async (empresa, trecho, ignorar) => {
    setSalvandoRegra(`${empresa}||${trecho}`);
    try {
      await definirRegraTrecho(conn, empresa, trecho, ignorar, ctx.usuarioLogado);
      showToast?.(ignorar ? `${trecho}: fora da conferência (não é nossa operação).`
        : `${trecho}: marcado como nossa operação.`, "ok");
      await carregar();
    } catch (e) { showToast?.("Erro ao salvar a regra: " + e.message, "erro"); }
    finally { setSalvandoRegra(""); }
  };

  const lista = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cruzados
      .filter((c) => (filtroProblema ? c.problemas.includes(filtroProblema) : c.problemas.length > 0))
      .filter((c) => !q || [c.contrato, c.cte_ctrc, c.nome_agregado, c.motorista, c.veiculo, c.cliente]
        .some((v) => String(v || "").toLowerCase().includes(q)))
      .sort((a, b) => b.falta_encargo - a.falta_encargo || String(a.contrato).localeCompare(String(b.contrato)));
  }, [cruzados, filtroProblema, busca]);

  // Vincular daqui: o contrato existe e o CTe está zerado — em vez de mandar a pessoa achar
  // esse CTe na Conferência pra fazer o mesmo clique, resolve na própria fila. Grava
  // contrato_ref no CTe (migration 058); passar null desfaz.
  const onVincularAoCte = async (c, desfazer) => {
    const alvo = c.cte_alvo;
    if (!alvo?.id) return;
    setVinculando(alvo.id);
    try {
      await vincularContratoCte(conn, alvo.id, desfazer ? null : String(c.contrato), ctx.usuarioLogado);
      showToast?.(desfazer
        ? `Vínculo desfeito no CTe ${alvo.ctrc}.`
        : `Contrato ${c.contrato} vinculado ao CTe ${alvo.ctrc}. Falta lançar no TMS pra margem corrigir.`, "ok");
      await carregar();
    } catch (e) { showToast?.("Erro ao vincular: " + e.message, "erro"); }
    finally { setVinculando(""); }
  };

  const escolherArquivo = () => fileRef.current?.click();

  const onArquivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const { linhas, periodosEncontrados, empresas, erro } = await parseContratosXLSX(file);
      if (erro) { showToast?.(erro, "erro"); return; }
      const { novas, atualizadas } = await diffImportContratos(conn, linhas);
      setPreview({ linhas, novas: novas.length, atualizadas, periodosEncontrados, empresas });
    } catch (err) { showToast?.("Erro ao ler a planilha: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  const confirmarImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      await inserirContratos(conn, preview.linhas);
      showToast?.(`${preview.linhas.length} contrato(s) importado(s).`, "ok");
      const mes = preview.periodosEncontrados?.[preview.periodosEncontrados.length - 1];
      setPreview(null);
      if (mes && mes !== periodoRef) setPeriodoRef(mes); else await carregar();
    } catch (err) { showToast?.("Erro ao importar: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  const controles = (
    <>
      <input type="month" value={periodoRef} onChange={(e) => setPeriodoRef(e.target.value)}
        style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }} />
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar contrato, CTRC, agregado, placa"
        style={{ fontSize: 12.5, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt, minWidth: 240 }} />
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onArquivo} style={{ display: "none" }} />
      <button onClick={escolherArquivo} disabled={importing}
        style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: importing ? "wait" : "pointer", border: "none", background: "var(--accent)", color: t.onPrimary || "#181a20", fontFamily: "inherit" }}>
        {importing ? "Lendo..." : "↑ Importar contratos"}
      </button>
      <button onClick={() => setRelOpen(true)} disabled={!contratos.length}
        style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: contratos.length ? "pointer" : "not-allowed", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2, fontFamily: "inherit", opacity: contratos.length ? 1 : .5 }}>
        Relatório
      </button>
    </>
  );

  // Relatório da tela: leva o recorte que está na frente do usuário (contratos nossos do mês,
  // já sem os trechos ignorados), e o modal cuida de colunas/ordem/agrupamento/exportação.
  const relLinhas = React.useMemo(() => cruzados.filter((c) => !c.ignorado), [cruzados]);
  const relColunas = React.useMemo(() => [
    { id: "contrato", label: "Contrato", tipo: "texto", get: (c) => c.contrato },
    { id: "cte", label: "CTe", tipo: "texto", get: (c) => (c.ctes_do_contrato?.length > 1 ? c.ctes_do_contrato.join(" + ") : c.cte_ctrc || "") },
    { id: "data", label: "Emissão", tipo: "data", get: (c) => c.data_emissao },
    { id: "agregado", label: "Agregado", tipo: "texto", get: (c) => c.nome_agregado },
    { id: "tipo", label: "Tipo", tipo: "texto", get: (c) => (c.eh_pf ? "PF" : "PJ") },
    { id: "veiculo", label: "Veículo", tipo: "texto", get: (c) => c.veiculo },
    { id: "trecho", label: "Trecho", tipo: "texto", get: (c) => c.trecho },
    { id: "cliente", label: "Cliente", tipo: "texto", get: (c) => c.cliente || "" },
    { id: "valor", label: "Contrato R$", tipo: "moeda", total: true, get: (c) => c.valor },
    { id: "inss", label: "INSS", tipo: "moeda", total: true, get: (c) => c.valor_inss },
    { id: "sest", label: "SEST/SENAT", tipo: "moeda", total: true, get: (c) => c.sest_senat },
    { id: "ce", label: "Custos externos", tipo: "moeda", total: true, get: (c) => c.custos_externos },
    { id: "falta", label: "Falta lançar", tipo: "moeda", total: true, get: (c) => c.falta_encargo },
    { id: "pendencias", label: "Pendências", tipo: "texto", get: (c) => c.problemas.map((p) => PROBLEMA[p]).join("; ") },
  ], []);
  const relGrupos = React.useMemo(() => [
    { id: "cliente", label: "cliente", get: (c) => c.cliente || "(sem CTe casado)" },
    { id: "tipo", label: "PF/PJ", get: (c) => (c.eh_pf ? "Pessoa física" : "PJ") },
    { id: "trecho", label: "trecho", get: (c) => c.trecho || "—" },
    { id: "situacao", label: "situação", get: (c) => (c.problemas.length ? PROBLEMA[c.problemas[0]] : "Sem pendência") },
  ], []);

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };

  return (
    <div>
      {filaSlot ? ReactDOM.createPortal(controles, filaSlot) : <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>{controles}</div>}

      {/* Indicadores: o que importa é quanto de encargo de pessoa física não foi lançado —
          esse valor não aparece em nenhum outro lugar do app e some da margem do frete. */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 150 : 190}px, 1fr))`, gap: 12, marginBottom: 16 }}>
        <KpiCard label="Contratos" value={resumo.contratos}
          sub={`${resumo.casaram} com CTe na base · ${resumo.pf} PF / ${resumo.pj} PJ${resumo.ignorados ? ` · ${resumo.ignorados} fora (outra operação)` : ""}`} />
        <KpiCard label="Valor contratado" value={money(resumo.valorContratado)} sub={mesLabel(periodoRef)} />
        <KpiCard label="Encargo lançado" value={money(resumo.encargoLancado)} sub="INSS + SEST/SENAT + custos externos" />
        <KpiCard label="Encargo faltando" value={money(resumo.encargoFaltando)} danger={resumo.encargoFaltando > 0}
          sub={`${resumo.porProblema.pf_sem_custos_externos} contrato(s) sem os ${ALIQUOTAS.custosExternos}% patronais`} />
      </div>

      {/* Trechos que ninguém decidiu ainda. O relatório do TMS traz tudo o que a empresa
          rodou, não só a nossa operação — em vez de travar num CNPJ, a pessoa decide por
          trecho UMA vez e a regra vale pros próximos meses. Trecho novo cai aqui, então
          embarcadora nova aparece em vez de sumir. */}
      {pendentesTrecho.length > 0 && (
        <div style={{ ...card, marginBottom: 16, borderColor: hexRgb(t.azul, .4), background: hexRgb(t.azul, .06) }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: t.txt, marginBottom: 4 }}>
            {pendentesTrecho.length} trecho(s) sem decisão
          </div>
          <div style={{ fontSize: 11.5, color: t.txt2, lineHeight: 1.5, marginBottom: 10 }}>
            Estes contratos não casaram com nenhum CTe da base. Diga se são da nossa operação —
            a resposta fica gravada e vale para as próximas importações.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendentesTrecho.map((p) => {
              const salvando = salvandoRegra === `${p.empresa_emissao}||${p.trecho}`;
              return (
                <div key={`${p.empresa_emissao}-${p.trecho}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 11px", borderRadius: 9, background: t.card, border: `1px solid ${hexRgb(t.borda, .5)}` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12.5, color: t.txt }}>
                    {p.empresa_emissao} · {p.trecho}
                  </span>
                  <span style={{ fontSize: 11, color: t.txt2 }}>
                    {p.contratos} contrato(s) · {money(p.valor)}
                    {p.agregados.length ? ` · ${p.agregados.slice(0, 2).join(", ")}${p.agregados.length > 2 ? ` +${p.agregados.length - 2}` : ""}` : ""}
                  </span>
                  <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                    <button onClick={() => decidirTrecho(p.empresa_emissao, p.trecho, false)} disabled={salvando}
                      style={{ fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 8, cursor: salvando ? "wait" : "pointer", border: `1px solid ${t.verde}`, background: "transparent", color: t.verde, fontFamily: "inherit" }}>
                      É nossa operação
                    </button>
                    <button onClick={() => decidirTrecho(p.empresa_emissao, p.trecho, true)} disabled={salvando}
                      style={{ fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 8, cursor: salvando ? "wait" : "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2, fontFamily: "inherit" }}>
                      Não é nossa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtro por tipo de pendência */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[["", `Todas (${cruzados.filter((c) => c.problemas.length > 0).length})`],
          ...ORDEM_PROBLEMA.map((k) => [k, `${PROBLEMA[k]} (${resumo.porProblema[k] || 0})`])]
          .map(([id, label]) => (
            <button key={id || "todas"} onClick={() => setFiltroProblema(id)}
              style={{ fontSize: 11, fontWeight: 600, padding: "6px 11px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${filtroProblema === id ? t.azul : t.borda}`,
                background: filtroProblema === id ? hexRgb(t.azul, .12) : "transparent",
                color: filtroProblema === id ? t.txt : t.txt2 }}>
              {label}
            </button>
          ))}
      </div>

      <div style={card}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 10 }}>
          Pendências · {mesLabel(periodoRef)}
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: t.txt2 }}>Carregando...</div>
        ) : !contratos.length ? (
          <div style={{ fontSize: 12, color: t.txt2, lineHeight: 1.6 }}>
            Nenhum contrato importado em {mesLabel(periodoRef)}. Use <b>Importar contratos</b> com o relatório de
            contratos do TMS (um arquivo por empresa de emissão — MAT da matriz, MAR da filial do Pará).
          </div>
        ) : !lista.length ? (
          <div style={{ fontSize: 12, color: t.verde }}>Nada pendente neste recorte.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lista.map((c) => (
              <div key={c.id || `${c.contrato}-${c.cte_ctrc}`}
                style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${hexRgb(t.borda, .5)}`, background: t.card2 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: t.txt }}>
                    Contrato {c.contrato}{c.cte_ctrc ? ` · CTRC ${c.cte_ctrc}` : ""}
                  </span>
                  <span style={{ fontSize: 11.5, color: t.txt2 }}>{c.nome_agregado || "sem agregado"}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, color: c.eh_pf ? t.ouro : t.txt2, border: `1px solid ${hexRgb(c.eh_pf ? t.ouro : t.borda, .4)}` }}>
                    {c.eh_pf ? "PESSOA FÍSICA" : "PJ"}
                  </span>
                  {c.falta_encargo > 0 && (
                    <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12.5, color: t.danger }}>
                      falta {money(c.falta_encargo)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 5, fontSize: 10.5, color: t.txt2 }}>
                  {c.data_emissao && <span style={{ fontFamily: "var(--font-mono)" }}>{dataBR(c.data_emissao)}</span>}
                  {c.veiculo && <span style={{ fontFamily: "var(--font-mono)" }}>{c.veiculo}</span>}
                  {c.trecho && <span>{c.trecho}</span>}
                  <span>contrato {money(c.valor)}</span>
                  {c.cliente && <span>cliente: {c.cliente}</span>}
                </div>
                {/* Contrato que virou mais de um CTe: a margem real é a do grupo, não a de
                    cada CTe — o TMS lança o contrato inteiro num deles e zera o outro. */}
                {c.ctes_do_contrato?.length > 1 && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: t.azul, lineHeight: 1.5 }}>
                    Cobre {c.ctes_do_contrato.length} CTes ({c.ctes_do_contrato.join(" + ")}) —
                    frete {money(c.frete_dos_ctes)} · contrato {money(c.valor)} · saldo {money(c.frete_dos_ctes - c.valor)}
                  </div>
                )}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                  {ORDEM_PROBLEMA.filter((k) => c.problemas.includes(k)).map((k) => (
                    <span key={k} style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap",
                      color: COR_PROBLEMA[k], border: `1px solid ${hexRgb(COR_PROBLEMA[k], .35)}`, background: hexRgb(COR_PROBLEMA[k], .1) }}>
                      {PROBLEMA[k].toUpperCase()}
                    </span>
                  ))}
                </div>
                {/* O que a pessoa precisa fazer, com o número na mão — sem ter que abrir o TMS pra descobrir. */}
                {c.eh_pf && c.valor > 0 && c.falta_encargo > 0 && (
                  <div style={{ marginTop: 6, fontSize: 10.5, color: t.txt2, lineHeight: 1.5 }}>
                    Sobre {money(c.valor)}: custos externos {money(esperado(c.valor, ALIQUOTAS.custosExternos))} (lançado {money(c.custos_externos)}) ·
                    INSS {money(esperado(c.valor, ALIQUOTAS.inss))} (lançado {money(c.valor_inss)}) ·
                    SEST/SENAT {money(esperado(c.valor, ALIQUOTAS.sest))} (lançado {money(c.sest_senat)})
                  </div>
                )}
                {c.problemas.includes("cte_sem_contrato") && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10.5, color: t.warn, lineHeight: 1.5 }}>
                      O CTe {c.cte_alvo?.ctrc || c.cte_ctrc} está na conferência com contrato zerado (margem inflada).
                      O valor real do contrato é {money(c.valor)} — lançar no TMS e reimportar o relatório de CTes.
                    </div>
                    {/* Enquanto o TMS não é corrigido, o vínculo registra QUAL é o contrato: o
                        CTe sai da fila de "sem contrato" e a conferência mostra a margem real. */}
                    <button onClick={() => onVincularAoCte(c, false)} disabled={vinculando === c.cte_alvo?.id}
                      style={{ marginTop: 7, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
                        cursor: vinculando === c.cte_alvo?.id ? "wait" : "pointer", fontFamily: "inherit",
                        border: `1px solid ${t.verde}`, background: "transparent", color: t.verde }}>
                      {vinculando === c.cte_alvo?.id ? "Vinculando..." : `🔗 Vincular ao CTe ${c.cte_alvo?.ctrc || c.cte_ctrc}`}
                    </button>
                  </div>
                )}
                {c.problemas.includes("cte_contrato_vinculado") && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10.5, color: t.txt2, lineHeight: 1.5 }}>
                      Contrato apontado à mão no CTe {c.cte_alvo?.ctrc || c.cte_ctrc}: a conferência já lê a margem
                      real ({money(c.frete_dos_ctes - c.valor)} de saldo). Falta lançar {money(c.valor)} no TMS e
                      reimportar pro número vir da fonte.
                    </div>
                    <button onClick={() => onVincularAoCte(c, true)} disabled={vinculando === c.cte_alvo?.id}
                      style={{ marginTop: 7, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                        cursor: vinculando === c.cte_alvo?.id ? "wait" : "pointer", fontFamily: "inherit",
                        border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2 }}>
                      ↩ Desfazer vínculo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {ignoradosTrecho.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 10.5, color: t.txt2, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span>Fora da conferência neste mês:</span>
          {ignoradosTrecho.map((g) => (
            <button key={`${g.empresa_emissao}-${g.trecho}`}
              onClick={() => decidirTrecho(g.empresa_emissao, g.trecho, null)}
              title="Voltar a perguntar sobre este trecho"
              style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "3px 8px", borderRadius: 20, cursor: "pointer", border: `1px solid ${hexRgb(t.borda, .6)}`, background: "transparent", color: t.txt2 }}>
              {g.trecho} ({g.contratos}) ✕
            </button>
          ))}
        </div>
      )}

      <ModalRelatorio aberto={relOpen} onFechar={() => setRelOpen(false)}
        titulo={`Contratos de frete · ${mesLabel(periodoRef)}`}
        subtitulo={`${resumo.contratos} contrato(s) · encargo faltando ${money(resumo.encargoFaltando)}`}
        linhas={relLinhas} colunas={relColunas} agrupavelPor={relGrupos}
        t={t} hexRgb={hexRgb} isMobile={isMobile} />

      {/* Preview da importação */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ ...card, maxWidth: 460, width: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 10 }}>Importar contratos</div>
            <div style={{ fontSize: 12, color: t.txt, lineHeight: 1.7 }}>
              <div>{preview.linhas.length} linha(s) · empresa {(preview.empresas || []).join(", ") || "—"}</div>
              <div>Período: {(preview.periodosEncontrados || []).map(mesLabel).join(", ")}</div>
              <div style={{ color: t.verde }}>{preview.novas} novo(s)</div>
              {preview.atualizadas > 0 && (
                <div style={{ color: t.txt2 }}>
                  {preview.atualizadas} já existente(s) — vão ser <b>atualizados</b> com os valores desta versão do relatório.
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setPreview(null)} disabled={importing}
                style={{ fontSize: 12, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2, fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button onClick={confirmarImport} disabled={importing}
                style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: importing ? "wait" : "pointer", border: "none", background: "var(--accent)", color: t.onPrimary || "#181a20", fontFamily: "inherit" }}>
                {importing ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
