import React from "react";
import { Badge } from "../design-system/components/Badge.jsx";
import { Button } from "../design-system/components/Button.jsx";
import Icon from "../components/Icon.jsx";
import ReactDOM from "react-dom";
import useModalEsc from "../hooks/useModalEsc.js";
import {
  parseFreteXLSX, diffImportFrete, inserirFrete, atualizarFreteLote, listarPendentesRevisao, listarSinalizados,
  decidir, estornarRevisao, listarPorPeriodos, chaveDuplicidade,
  resumoPorCategoria, resumoPorCliente, resumoPorDia, gerarWorkbookXLSX,
  classificarLinhasCliente, recalcularFlagsEPeriodo, ehCandidatoFrotaRodorrica, clienteEfetivo,
  ehCandidatoDiariaEmitida, ehFreteSemContrato, definirCompetencia, mesCompetencia,
  resumoGrupoContrato, contratoEstaNoIrmao, vincularContratoCte, numeroContratoDoCte,
  substituicaoDeMesFechado,
  editarFrete, excluirFrete, recalcularLinhaEditada, ehAtivo, vincularCte, candidatosVinculo,
  saldoEfetivo, temTransbordo, analiseTransbordo, estornoTransbordo, marcarTransbordo, limparTransbordo,
} from "../freteConferencia.js";
import { listarContratosPorPeriodos, candidatosContratoDoCte } from "../freteContratos.js";
import {
  trechoRota, trechoOrigem, trechoDestino, trechoKm, trechoInfo,
  trechosSemDePara, trechosSemKm, calcularKmFaltante, sugerirTrecho, salvarTrecho,
} from "../operacao/trechos.js";
import { consultarCNPJ, nomeSugerido } from "../receitaCnpj.js";
import { listarDespesas, classeDoCredito } from "../despesas.js";
import useEmbarcadoras from "../hooks/useEmbarcadoras.js";
import KpiCard from "../components/KpiCard.jsx";
import Toggle from "../components/Toggle.jsx";
import ModalRelatorio from "../components/ModalRelatorio.jsx";
import { BASES } from "../constants.js";
import { clickable } from "../utils.js";

// Conferência de Faturamento — planilhas BRUTAS de faturamento (TMS/ERP), fonte
// DIFERENTE do operacional (Google Sheets). Segmento dentro de Resultado.jsx.
// Fluxo: sobe a planilha -> classifica por cliente (CNPJ) -> mostra resumo pra
// confirmar -> grava -> fila de revisão (margem negativa/baixa/ambígua/duplicidade).

const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pesoFmt = (n) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " kg";
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };
// Só os dígitos: o CTe vem "1234" na planilha operacional e "CTRC 1234"/"001234" no TMS.
const soNum = (s) => String(s ?? "").replace(/\D/g, "");
// Desloca um "YYYY-MM" por N meses (negativo = pro passado) — usado no comparativo com meses anteriores.
const shiftMes = (m, delta) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const CATEGORIA_LABEL = { frete: "Frete", diaria_emitida: "Diária emitida", descarga: "Descarga", local: "Local", diaria: "Diária paga", bonificacao: "Bonificação" };
// Normalização da busca de CTe: só letras/números, maiúsculo. Assim "otd9d27" acha a placa
// OTD-9D27 e "80860" acha a NF dentro de um campo com várias ("80860/80861").
const normBusca = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
// Cor de sistema por categoria — realça o badge do ícone no KPI (frete = accent, e cores distintas nas demais).
const CATEGORIA_COR = { frete: "var(--accent)", diaria_emitida: "var(--green)", descarga: "var(--color-info)", local: "var(--cyan)", diaria: "var(--yellow)", bonificacao: "var(--purple, var(--cyan))" };
// Rótulo humano de cada decisão possível na fila (exceto sinalizar_correcao, que tem seção própria).
const DECISAO_LABEL = {
  ok: "sem ação necessária",
  confirmar_descarga: "confirmado: Descarga",
  confirmar_local: "confirmado: Local",
  confirmar_ambas: "2 lançamentos reais",
  ignorar_duplicidade: "duplicidade ignorada",
  correcao_feita: "correção feita",
  frota_rodorrica: "frota Rodorrica (contrato = CTe − R$ 300)",
  transbordo_ajustado: "transbordo — contrato descartado",
};

// Justificativas prontas do "Marcar revisado" — os motivos que mais se repetem na fila.
// A de frota só aparece quando a linha é candidata (ver ehCandidatoFrotaRodorrica); a de
// contrato zerado, só quando a linha tem flag_sem_contrato (ver ehFreteSemContrato).
const OBS_ATALHOS = [
  "Valor conferido com o contrato",
  "Margem baixa aprovada pela gestão",
  "Preço fechado com o cliente nesse trecho",
];

// Ícones dos badges de sinalização — mesma linguagem stroke/round do resto do app.
const ICO_ALERTA = <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>;
const ICO_AMBIGUO = <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>;
const ICO_DUPLICIDADE = <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>;
const ICO_FROTA = <><rect x="1" y="3" width="15" height="13" rx="2" /><path d="m16 8 4 2 3 3v4h-7" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>;
const ICO_DEVOLUCAO = <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>;
// Mês de competência da diária emitida (migration 053) — calendário.
const ICO_COMPETENCIA = <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>;
// Frete com Valor Contrato Frete = 0 (migration 052) — documento cortado.
const ICO_SEM_CONTRATO = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="4" y1="20" x2="20" y2="4" /></>;
// Ciclo de vida do CTe (substituição/cancelamento/complementar) — migration 048.
const ICO_SUBSTITUICAO = <><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>;
const ICO_CANCELADO = <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>;
const ICO_COMPLEMENTAR = <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>;
// Transbordo (migration 078): carga trocou de veículo e o TMS obrigou a emitir um contrato
// novo — setas trocando de sentido.
const ICO_TRANSBORDO = <><polyline points="16 3 21 8 16 13" /><path d="M21 8H8a4 4 0 0 0-4 4v1" /><polyline points="8 21 3 16 8 11" /><path d="M3 16h13a4 4 0 0 0 4-4v-1" /></>;
// Categoria definida por uma pessoa (migration 049) — a planilha não sobrescreve.
const ICO_CATEGORIA_MANUAL = <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>;

// Ícones dos KPIs por categoria — mesma linguagem do Dashboard (hIco, 24x24 stroke).
const ICO_CATEGORIA = {
  frete:   <><rect x="1" y="3" width="15" height="13" rx="2" /><path d="m16 8 4 2 3 3v4h-7" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  descarga:<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  local:   <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  diaria:  <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  bonificacao: <><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
  diaria_emitida: <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>,
};

export default function ConferenciaFrete({ ctx, conn }) {
  const { t, isMobile, showToast, hexRgb, usuarioLogado, perfil, css, hIco, filaSlot, filialAtiva, baseAtual,
    DADOS, filtroTipoCarga, classificador } = ctx;
  const isAdmin = perfil === "admin";

  const [periodoRef, setPeriodoRef] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [clienteFiltro, setClienteFiltro] = React.useState(""); // "" = todos os clientes
  const [usuarioFiltro, setUsuarioFiltro] = React.useState(""); // "" = todos os usuários (nome_usuario da planilha)
  // Diária e Descarga entram nos totais por padrão (é o que a planilha bruta soma), mas não
  // são frete vendido: a Descarga tem CTe = Contrato (saldo 0) e a Diária vem com Saldo =
  // −Contrato no TMS (o CTe complementar entra só depois). Desligar aqui recalcula Frete,
  // Saldo e Margem só com o frete de verdade, pra comparar os dois números lado a lado.
  const [incluirDiariaDescarga, setIncluirDiariaDescarga] = React.useState(true);
  const [filaMes, setFilaMes] = React.useState("todos"); // "todos" | "atual" | "anterior" — recorte de mês da fila de revisão
  const [cliOpen, setCliOpen] = React.useState(false);   // dropdown custom de cliente aberto
  const [linhasPeriodo, setLinhasPeriodo] = React.useState([]);
  const [linhasComparativo, setLinhasComparativo] = React.useState({}); // { "2026-06": [...], "2026-05": [...] }
  const [pendentes, setPendentes] = React.useState([]);
  const [sinalizados, setSinalizados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  // O de-para dos trechos vive num módulo, fora do React: este contador força o re-render
  // depois de gravar distância nova, senão a coluna KM só mudaria na próxima navegação.
  const [kmVersao, setKmVersao] = React.useState(0);
  const fileRef = React.useRef(null);
  const [preview, setPreview] = React.useState(null); // { periodoRef, periodosEncontrados, linhas, naoClassificadas, desconhecidos, resumo }
  const [formsDesconhecidos, setFormsDesconhecidos] = React.useState({}); // { [cnpj]: { nome, base_id, mapEmpresa: {codigo: categoria} } }
  const [cadastrando, setCadastrando] = React.useState(null); // cnpj em processo de cadastro (spinner do botão)
  const [dupModal, setDupModal] = React.useState({ open: false, origem: null }); // origem = CTe de onde o grupo foi aberto (marcado como "ESTE")
  // Meses buscados sob demanda pra achar o par de uma duplicidade fora dos 3 meses já
  // carregados (ver efeito de busca do par). Só leitura, não entra em nenhum somatório.
  const [linhasExtra, setLinhasExtra] = React.useState([]);
  const [buscandoPar, setBuscandoPar] = React.useState(false);
  const mesesBuscados = React.useRef(new Set());
  // Busca de CTe (CTRC / NF / placa / manifesto / contrato) — atravessa cliente e mês.
  const [buscaCte, setBuscaCte] = React.useState("");
  const [buscaAmpla, setBuscaAmpla] = React.useState("nao"); // 'nao' | 'buscando' | 'feita'
  const [relOpen, setRelOpen] = React.useState(false); // relatório da tela (ModalRelatorio)
  // Contratos do mês (tabela frete_contratos) — usados pra apontar à mão o contrato de um CTe
  // que o TMS emitiu sem amarração (migration 058).
  const [contratosMes, setContratosMes] = React.useState([]);
  const [vincContrato, setVincContrato] = React.useState({ aberto: false, num: "" });
  const [salvandoContrato, setSalvandoContrato] = React.useState(false);
  const [salvandoTransbordo, setSalvandoTransbordo] = React.useState(false);
  const [revisarModal, setRevisarModal] = React.useState({ open: false, item: null });
  const [sinalizando, setSinalizando] = React.useState(false);
  const [sinalObs, setSinalObs] = React.useState("");
  const [revisando, setRevisando] = React.useState(false);   // "Marcar revisado" clicado: campo de justificativa aberto
  const [revisObs, setRevisObs] = React.useState("");
  const [editando, setEditando] = React.useState(false);     // modo edição admin do CTe (modal)
  const [editForm, setEditForm] = React.useState(null);
  const [salvandoEdit, setSalvandoEdit] = React.useState(false);
  // Vínculo de ciclo de vida do CTe (substituição/cancelamento/complementar, migration 048)
  const [vincTipo, setVincTipo] = React.useState(null);      // 'substituto' | 'complementar' | null
  const [vincCtrc, setVincCtrc] = React.useState("");
  const [salvandoVinc, setSalvandoVinc] = React.useState(false);
  // Mês de competência da diária emitida (migration 053) — editado no modal do CTe.
  const [compRef, setCompRef] = React.useState("");

  // Trecho pendente aberto pra correção — { codigo, origem, destino, km, sugerido, linhas }.
  const [trechoModal, setTrechoModal] = React.useState(null);
  const [salvandoTrecho, setSalvandoTrecho] = React.useState(false);

  useModalEsc(!!trechoModal, () => setTrechoModal(null));
  useModalEsc(!!preview, () => setPreview(null));
  useModalEsc(dupModal.open, () => setDupModal({ open: false, origem: null }));
  useModalEsc(revisarModal.open, () => setRevisarModal({ open: false, item: null }));

  // ── Estado local depois de uma escrita ──────────────────────────────────────
  // Toda RPC de escrita devolve a(s) linha(s) que mexeu (vincular_cte devolve o
  // CTe E o par). Aplicar isso no estado faz a tela responder na hora; o
  // `carregar({silencioso:true})` que vem logo atrás busca do servidor em
  // segundo plano e corrige o que o remendo local não souber.
  //
  // Antes cada decisão terminava em `await carregar()`: quatro requisições e os
  // três meses inteiros de volta, com a fila de revisão sumindo da tela durante
  // o carregamento (`loading` esconde a lista). O padrão daqui já existia em
  // `onDecidir`, que nunca recarregou — agora vale para as outras escritas.
  const aplicarLinhas = React.useCallback((linhas) => {
    const rows = (Array.isArray(linhas) ? linhas : [linhas]).filter((r) => r && r.id);
    if (!rows.length) return;
    const porId = new Map(rows.map((r) => [r.id, r]));
    const trocar = (arr) => arr.map((l) => porId.get(l.id) || l);
    setLinhasPeriodo(trocar);
    setLinhasExtra(trocar);
    setLinhasComparativo((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, trocar(v)])));
    // Os dois recortes do servidor são predicados simples e estáveis, então dá
    // pra reproduzi-los aqui sem risco de divergir: a fila é `decisao_manual IS
    // NULL` e Sinalizados é `decisao_manual = 'sinalizar_correcao'`.
    setPendentes((arr) => trocar(arr).filter((l) => !porId.has(l.id) || l.decisao_manual == null));
    setSinalizados((arr) => [
      ...rows.filter((r) => r.decisao_manual === "sinalizar_correcao"),
      ...arr.filter((l) => !porId.has(l.id)),
    ]);
  }, []);

  const removerLinha = React.useCallback((id) => {
    const fora = (arr) => arr.filter((l) => l.id !== id);
    setLinhasPeriodo(fora); setLinhasExtra(fora); setPendentes(fora); setSinalizados(fora);
    setLinhasComparativo((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, fora(v)])));
  }, []);

  const abrirRevisar = (p) => {
    setSinalizando(false); setSinalObs("");
    setRevisando(false); setRevisObs("");
    setEditando(false); setEditForm(null);
    setVincTipo(null); setVincCtrc("");
    setCompRef(p.competencia_ref || "");
    setRevisarModal({ open: true, item: p });
  };

  // Vínculo de ciclo de vida: marca este CTe como substituto/complementar de outro CTRC,
  // como cancelado, ou desfaz ('normal'). Na substituição o RPC também derruba o CTe antigo
  // (status_doc='substituido') — e devolve OS DOIS, por isso `aplicarLinhas` dá conta do par.
  // Se o par estiver num mês que não está carregado, quem o traz é a revalidação.
  const onVincular = async (p, tipo, ctrcRef, idRef) => {
    setSalvandoVinc(true);
    try {
      const afetadas = await vincularCte(conn, p.id, tipo, ctrcRef, usuarioLogado, idRef);
      showToast?.(tipo === "normal" ? "Vínculo desfeito." :
        tipo === "cancelado" ? `CTRC ${p.ctrc} marcado como cancelado — fora dos totais.` :
        tipo === "substituto" ? `CTRC ${p.ctrc} substitui o ${ctrcRef} — o antigo saiu dos totais.` :
        `CTRC ${p.ctrc} marcado como complementar do ${ctrcRef} — os dois continuam somando.`, "ok");
      setVincTipo(null); setVincCtrc("");
      setRevisarModal({ open: false, item: null });
      setDupModal({ open: false, origem: null });
      aplicarLinhas(afetadas);
      carregar({ silencioso: true });
    } catch (e) { showToast?.("Erro ao vincular CTe: " + e.message, "erro"); }
    finally { setSalvandoVinc(false); }
  };

  // Um clique na fila: reclassifica o CTe como diária emitida. Marca categoria_manual
  // pra reimportação não desfazer (migration 049) e registra a decisão, tirando da fila.
  const marcarDiariaEmitida = async (p) => {
    setSalvandoEdit(true);
    try {
      await editarFrete(conn, p.id, {
        categoria: "diaria_emitida", categoria_manual: true,
        ...recalcularLinhaEditada({ ...p, categoria: "diaria_emitida" }),
      });
      const atualizado = await decidir(conn, p.id, "ok", "confirmado: diária emitida (cobrança da diária paga no D01)", usuarioLogado);
      showToast?.(`CTRC ${p.ctrc} reclassificado como diária emitida.`, "ok");
      setRevisarModal({ open: false, item: null });
      aplicarLinhas(atualizado);
      carregar({ silencioso: true });
    } catch (e) { showToast?.("Erro ao reclassificar: " + e.message, "erro"); }
    finally { setSalvandoEdit(false); }
  };

  // Competência da diária emitida (migration 053): de que MÊS são as diárias pagas que este
  // CTe cobra. Um CTe pode cobrar o mês inteiro anterior, então sem isso o card frete × diária
  // só fecha no acumulado. ref vazio limpa e volta a valer o mês de emissão.
  const onCompetencia = async (p, ref) => {
    setSalvandoVinc(true);
    try {
      const atualizado = await definirCompetencia(conn, p.id, ref);
      showToast?.(ref ? `CTRC ${p.ctrc} passa a contar na diária de ${mesLabel(ref)}.`
        : `Competência removida — CTRC ${p.ctrc} volta a contar no mês do documento.`, "ok");
      setRevisarModal({ open: false, item: null });
      aplicarLinhas(atualizado);
      carregar({ silencioso: true });
    } catch (e) { showToast?.("Erro ao definir competência: " + e.message, "erro"); }
    finally { setSalvandoVinc(false); }
  };

  // Aponta à mão o contrato deste CTe (migration 058) — o TMS às vezes emite o CTe sem
  // amarrar no contrato, e aí ele aparece com contrato zerado e margem 100% sem ser verdade.
  // contrato = null desfaz.
  const onVincularContrato = async (p, contrato) => {
    setSalvandoContrato(true);
    try {
      const atualizado = await vincularContratoCte(conn, p.id, contrato, usuarioLogado);
      showToast?.(contrato
        ? `CTRC ${p.ctrc} vinculado ao contrato ${contrato}.`
        : `Vínculo de contrato desfeito no CTRC ${p.ctrc}.`, "ok");
      setVincContrato({ aberto: false, num: "" });
      setRevisarModal({ open: false, item: null });
      aplicarLinhas(atualizado);
      carregar({ silencioso: true });
    } catch (e) { showToast?.("Erro ao vincular contrato: " + e.message, "erro"); }
    finally { setSalvandoContrato(false); }
  };

  // Transbordo (migration 078): a carga trocou de veículo no meio do caminho, o TMS obrigou a
  // emitir um contrato novo e um dos dois será cancelado depois da descarga. Aqui a pessoa diz
  // qual contrato vale; o descartado fica registrado e, se o Saldo do TMS tiver descontado os
  // dois, volta pro Saldo como estorno. Não mexe no Saldo do TMS — ver saldoEfetivo.
  const onMarcarTransbordo = async (p, valido, descartado, estorno) => {
    setSalvandoTransbordo(true);
    try {
      const atualizado = await marcarTransbordo(conn, p.id, {
        valido, descartado, estorno, por: usuarioLogado,
        obs: `transbordo: contrato ${valido || "?"} vale, ${descartado || "o duplicado"} a cancelar no TMS`
          + (estorno ? ` — estorno de ${money(estorno)} no Saldo` : " — Saldo do TMS já estava certo"),
      });
      showToast?.(estorno
        ? `CTRC ${p.ctrc}: contrato ${descartado || "duplicado"} descartado — ${money(estorno)} devolvidos ao Saldo.`
        : `CTRC ${p.ctrc}: contrato ${descartado || "duplicado"} marcado pra cancelar no TMS (Saldo não muda).`, "ok");
      setRevisarModal({ open: false, item: null });
      aplicarLinhas(atualizado);
      carregar({ silencioso: true });
    } catch (e) { showToast?.("Erro ao registrar o transbordo: " + e.message, "erro"); }
    finally { setSalvandoTransbordo(false); }
  };

  const onLimparTransbordo = async (p) => {
    setSalvandoTransbordo(true);
    try {
      const atualizado = await limparTransbordo(conn, p.id);
      showToast?.(`Ajuste de transbordo desfeito no CTRC ${p.ctrc} — volta ao Saldo cru do TMS.`, "ok");
      setRevisarModal({ open: false, item: null });
      aplicarLinhas(atualizado);
      carregar({ silencioso: true });
    } catch (e) { showToast?.("Erro ao desfazer o transbordo: " + e.message, "erro"); }
    finally { setSalvandoTransbordo(false); }
  };

  // Abre o modo edição admin: inicializa o formulário a partir do CTe.
  const abrirEdicao = (p) => {
    setEditForm({
      cliente: p.cliente ?? "", base_id: p.base_id ?? "", categoria: p.categoria ?? "frete",
      modalidade: p.is_devolucao ? "FOB" : (p.modalidade || "CIF"),
      ctrc: p.ctrc ?? "", data_emissao: p.data_emissao ?? "", trecho: p.trecho ?? "", placa: p.placa ?? "",
      empresa_cod: p.empresa_cod ?? "", nfs: p.nfs ?? "",
      valor_nf: p.valor_nf ?? 0, peso_nf: p.peso_nf ?? 0, frete_peso: p.frete_peso ?? 0,
      total_frete: p.total_frete ?? 0, valor_contrato_frete: p.valor_contrato_frete ?? 0, saldo: p.saldo ?? 0,
    });
    setSinalizando(false); setRevisando(false);
    setEditando(true);
  };

  // Salva a edição admin: monta o patch, recalcula margem/flags e grava via RPC editar_frete.
  const salvarEdicao = async (p) => {
    setSalvandoEdit(true);
    try {
      const nums = ["valor_nf", "peso_nf", "frete_peso", "total_frete", "valor_contrato_frete", "saldo"];
      const patch = { ...editForm };
      nums.forEach((k) => { patch[k] = Number(patch[k]) || 0; });
      patch.is_devolucao = editForm.modalidade === "FOB";
      patch.modalidade = editForm.modalidade;
      // Trocar a categoria é decisão humana: marca a linha pra reimportação não recriar
      // o mesmo CTe na categoria que a planilha sugere (migration 049).
      if (editForm.categoria !== p.categoria) patch.categoria_manual = true;
      Object.assign(patch, recalcularLinhaEditada(patch)); // margem_lucro + flags
      const atualizado = await editarFrete(conn, p.id, patch);
      showToast?.("CTe atualizado.", "ok");
      setEditando(false); setEditForm(null);
      setRevisarModal({ open: false, item: null });
      aplicarLinhas(atualizado);
      carregar({ silencioso: true }); // confere no servidor sem esconder a tela
    } catch (e) {
      // 23505 = UNIQUE (cnpj_remetente, categoria, ctrc, periodo_ref). Acontece quando já
      // existe uma linha desse CTe na categoria escolhida — normalmente a linha ORIGINAL,
      // e a que está sendo editada é uma cópia criada por reimportação.
      const dup = /23505|duplicate key/i.test(e.message || "");
      showToast?.(dup
        ? `Já existe um CTe ${editForm.ctrc} como ${CATEGORIA_LABEL[editForm.categoria] || editForm.categoria} em ${mesLabel(p.periodo_ref)}. Esta linha aqui é uma cópia criada por reimportação — use "Excluir CTe" nela em vez de duplicar a categoria.`
        : "Erro ao salvar edição: " + e.message, "erro");
    }
    finally { setSalvandoEdit(false); }
  };

  // Exclusão de uma linha de CTe (admin) — existia no módulo mas não tinha botão na tela.
  // Serve pra limpar a cópia que a reimportação criou antes da proteção de categoria manual.
  const onExcluir = async (p) => {
    if (!window.confirm(`Excluir a linha do CTRC ${p.ctrc} (${CATEGORIA_LABEL[p.categoria] || p.categoria} · ${mesLabel(p.periodo_ref)})?\n\nIsso apaga só ESTA linha da conferência — a planilha bruta e as outras linhas do mesmo CTRC continuam como estão.`)) return;
    try {
      await excluirFrete(conn, p.id);
      showToast?.(`Linha do CTRC ${p.ctrc} excluída.`, "ok");
      setRevisarModal({ open: false, item: null });
      removerLinha(p.id);
      carregar({ silencioso: true });
    } catch (e) { showToast?.("Erro ao excluir: " + e.message, "erro"); }
  };

  // ── Base de comissão (regra do Yves) ────────────────────────────────────────
  // Saldo do relatório de fretes que ele sobe MENOS os débitos que chegam depois.
  // O casamento é por `base_id`: a Conferência traz a base em cada CTe (via cadastro
  // da embarcadora) e a despesa é gravada por base — não precisa de mapeamento manual.
  // TODO crédito abate — é o critério da própria planilha, que declara "TOTAL DE
  // DESPESAS" já líquido (aba IMP 07/2026: 114.674,07 − 3.128,39 = 111.545,68).
  // O reembolso de sinistro tem débito-contrapartida parcelado na mesma base, então
  // é recuperação de custo, não receita nova. Ver o comentário longo em Resultado.jsx.
  const [despesasBase, setDespesasBase] = React.useState({}); // { [base_id]: {deb, est, linhas} }
  // RECORTE POR BASE — esta tela era a única que ignorava o seletor do topbar:
  // carregava por período e pronto, então dentro de Açailândia apareciam CTes da
  // Suzano e vice-versa. O base_id vem gravado no próprio CTe (todos têm), não do
  // cadastro de embarcadora — por isso o recorte é confiável.
  // "Todas as bases" (consolidado) segue vendo tudo, que é o propósito dele.
  const linhasDaBase = React.useMemo(() => {
    if (!baseAtual?.id || baseAtual.consolidado) return linhasPeriodo;
    return linhasPeriodo.filter((l) => l.base_id === baseAtual.id);
  }, [linhasPeriodo, baseAtual]);

  const basesDoPeriodo = React.useMemo(
    () => [...new Set(linhasDaBase.filter(ehAtivo).map((l) => l.base_id).filter(Boolean))].sort(),
    [linhasDaBase]);

  React.useEffect(() => {
    if (!conn || !periodoRef || !basesDoPeriodo.length) { setDespesasBase({}); return; }
    let cancelado = false;
    Promise.all(basesDoPeriodo.map(async (b) => [b, await listarDespesas(conn, b, periodoRef).catch(() => null)]))
      .then((pares) => {
        if (cancelado) return;
        const out = {};
        pares.forEach(([b, linhas]) => {
          if (!linhas) return; // falha de rede: a base fica sem despesa e a tela avisa
          const inc = (f) => linhas.filter((d) => d.incluir && f(d)).reduce((s, d) => s + (Number(d.valor) || 0), 0);
          out[b] = { linhas: linhas.length, deb: inc((d) => d.tipo !== "credito"), cred: inc((d) => d.tipo === "credito"),
            recup: inc((d) => classeDoCredito(d) === "receita") };
        });
        setDespesasBase(out);
      });
    return () => { cancelado = true; };
  }, [conn, periodoRef, basesDoPeriodo]);

  // Uma linha por base: saldo da Conferência, despesa líquida e a diferença.
  // Sempre sobre TODOS os clientes da base — o filtro de cliente não se aplica aqui,
  // porque a despesa não é rateada por cliente. A tela diz isso quando o filtro está ligado.
  const comissao = React.useMemo(() => {
    const linhas = basesDoPeriodo.map((b) => {
      const saldo = linhasDaBase.filter(ehAtivo).filter((l) => l.base_id === b)
        .reduce((s, l) => s + saldoEfetivo(l), 0);
      const d = despesasBase[b];
      const despesa = d ? d.deb + d.cred : 0;
      return { base: b, label: BASES[b]?.label || b, saldo, despesa, recup: d ? d.recup : 0,
        temDespesa: !!d && d.linhas > 0, base_comissao: saldo - despesa };
    });
    const tot = linhas.reduce((a, l) => ({
      saldo: a.saldo + l.saldo, despesa: a.despesa + l.despesa, recup: a.recup + l.recup,
      base_comissao: a.base_comissao + l.base_comissao,
    }), { saldo: 0, despesa: 0, recup: 0, base_comissao: 0 });
    return { linhas, tot, faltando: linhas.filter((l) => !l.temDespesa) };
  }, [basesDoPeriodo, linhasDaBase, despesasBase]);

  // `silencioso`: revalidação em segundo plano depois de uma escrita. Sem isso,
  // `loading` esconde a fila de revisão e a tela pisca a cada clique.
  const carregar = React.useCallback(async (opts = {}) => {
    if (!conn) return;
    if (!opts.silencioso) setLoading(true);
    const mesAnt1 = shiftMes(periodoRef, -1);
    const mesAnt2 = shiftMes(periodoRef, -2);
    try {
      // Os três meses vêm numa chamada só. Eram três `listarTodosPeriodo`
      // separados (mesmo payload, três idas ao servidor) — e este carregar()
      // roda de novo depois de cada decisão, então as idas extras se pagavam
      // a cada clique.
      const [todas, pend, sinal, cts] = await Promise.all([
        listarPorPeriodos(conn, [periodoRef, mesAnt1, mesAnt2]),
        listarPendentesRevisao(conn),
        listarSinalizados(conn),
        // Contratos dos 3 meses: o contrato de um CTe do fim do mês costuma estar no arquivo
        // do mês seguinte, e vice-versa.
        listarContratosPorPeriodos(conn, [periodoRef, mesAnt1, mesAnt2]).catch(() => []),
      ]);
      const doPeriodo = (p) => (todas || []).filter((l) => l.periodo_ref === p);
      const linhas = doPeriodo(periodoRef);
      const lAnt1 = doPeriodo(mesAnt1);
      const lAnt2 = doPeriodo(mesAnt2);
      setContratosMes(cts || []);
      setLinhasPeriodo(linhas);
      setPendentes(pend);
      setSinalizados(sinal);
      setLinhasComparativo({ [mesAnt1]: lAnt1, [mesAnt2]: lAnt2 });
      // Meses carregados sob demanda (busca de CTe / par de duplicidade) são descartados
      // aqui: depois de gravar algo, é o único jeito de não mostrar dado velho de outro mês.
      setLinhasExtra([]);
      mesesBuscados.current = new Set();
      setBuscaAmpla("nao");
    } catch (e) { showToast?.("Erro ao carregar conferência: " + e.message, "erro"); }
    finally { if (!opts.silencioso) setLoading(false); }
  }, [conn, periodoRef, showToast]);

  React.useEffect(() => { carregar(); }, [carregar]);

  // Cadastro de embarcadoras (tabela `embarcadoras`) — compartilhado com as outras telas.
  const onErroEmb = React.useCallback((msg) => showToast?.(msg, "erro"), [showToast]);
  const { mapa: clientesMap, criar: criarEmbarcadora } = useEmbarcadoras(conn, { onErro: onErroEmb });

  // Pré-preenche os formulários de CNPJ desconhecido com os dados oficiais (receitaCnpj.js).
  // Best-effort e em paralelo: se a consulta falhar, o formulário só fica em branco pra
  // digitar na mão — nada aqui bloqueia a importação. O "nome" (apelido curto de exibição)
  // é só sugestão; cidade/UF já digitados não são sobrescritos.
  const preencherDadosReceita = React.useCallback(async (cnpjs) => {
    await Promise.all(cnpjs.map(async (cnpj) => {
      try {
        const d = await consultarCNPJ(cnpj);
        setFormsDesconhecidos((f) => (f[cnpj] ? {
          ...f,
          [cnpj]: {
            ...f[cnpj],
            nome: f[cnpj].nome?.trim() ? f[cnpj].nome : nomeSugerido(d),
            razao_social: d.razao_social || "",
            cidade: f[cnpj].cidade || d.cidade,
            uf: f[cnpj].uf || d.uf,
            receitaInfo: `${d.fonte} · situação: ${d.situacao || "não informada"}`,
          },
        } : f));
      } catch { /* sem dados da Receita: o cadastro manual segue disponível */ }
    }));
  }, []);

  const onEscolherArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const r = await parseFreteXLSX(file, clientesMap);
      if (r.erro) { showToast?.(r.erro, "erro"); return; }
      if (!r.linhas.length && !Object.keys(r.desconhecidos).length) { showToast?.("Nenhuma linha classificada nessa planilha.", "erro"); return; }
      const resumo = resumoPorCategoria(r.linhas);
      setPreview({ ...r, fileName: file.name, resumo });
      // Formulário inicial de cada CNPJ desconhecido: nome vazio, sem base, toda Empresa "ignorar"
      const forms = {};
      Object.values(r.desconhecidos).forEach((d) => {
        forms[d.cnpj] = { modo: "cadastro", devolucaoAlvo: "", nome: "", razao_social: "", base_id: "", cidade: "", uf: "", mapEmpresa: Object.fromEntries(Object.keys(d.empresas).map(e => [e, "ignorar"])) };
      });
      setFormsDesconhecidos(forms);
      preencherDadosReceita(Object.keys(forms));
    } catch (err) { showToast?.("Erro ao ler arquivo: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  // CNPJ desconhecido: cadastra a embarcadora na hora e reclassifica só as
  // linhas dele, juntando ao preview já carregado — sem precisar reler o arquivo.
  const cadastrarClienteDesconhecido = async (cnpj) => {
    const form = formsDesconhecidos[cnpj];
    const d = preview.desconhecidos[cnpj];
    if (!form.nome.trim()) { showToast?.("Dê um nome pra essa embarcadora antes de cadastrar.", "erro"); return; }
    const entradas = Object.entries(form.mapEmpresa).filter(([, cat]) => cat !== "ignorar");
    const freteCod = entradas.find(([, cat]) => cat === "frete")?.[0];
    if (!freteCod) { showToast?.("Marque pelo menos um código de Empresa como Frete — é obrigatório pra classificar qualquer coisa.", "erro"); return; }
    const descLocalCod = entradas.find(([, cat]) => cat === "descarga_local")?.[0] || null;
    const diariaCod = entradas.find(([, cat]) => cat === "diaria")?.[0] || null;
    setCadastrando(cnpj);
    try {
      const cli = await criarEmbarcadora({
        cnpj, nome: form.nome.trim(), base_id: form.base_id || null,
        razao_social: form.razao_social?.trim() || null,
        cidade: form.cidade?.trim() || null, uf: form.uf?.trim().toUpperCase() || null,
        frete_cod: freteCod, desc_local_cod: descLocalCod, diaria_cod: diariaCod,
        criado_por: usuarioLogado || null,
      });
      const { classificadas, naoClassificadas: ignoradas } = classificarLinhasCliente(d.linhasRaw, cli, cnpj);
      const novasLinhas = [...preview.linhas, ...classificadas];
      const novasNaoClass = [...preview.naoClassificadas, ...ignoradas];
      const { periodoRef: novoPeriodoRef, periodosEncontrados } = recalcularFlagsEPeriodo(novasLinhas, novasNaoClass);
      const { [cnpj]: _omit, ...restoDesconhecidos } = preview.desconhecidos;
      setPreview({ ...preview, linhas: novasLinhas, naoClassificadas: novasNaoClass, periodoRef: novoPeriodoRef, periodosEncontrados, desconhecidos: restoDesconhecidos, resumo: resumoPorCategoria(novasLinhas) });
      showToast?.(`"${cli.nome}" cadastrado — ${classificadas.length} linha(s) já incluída(s) na importação.`, "ok");
    } catch (e) { showToast?.("Erro ao cadastrar embarcadora: " + e.message, "erro"); }
    finally { setCadastrando(null); }
  };

  // Devolução (FOB): o CNPJ da planilha não é o cliente — é quem devolveu a carga. Grava
  // uma regra em `embarcadoras` (tipo='devolucao' apontando pro cliente-alvo) e já joga as
  // linhas no faturamento desse cliente, marcadas FOB. A regra fica salva: nas próximas
  // importações esse CNPJ reclassifica sozinho (via clienteEfetivo no parseFreteXLSX).
  const salvarDevolucao = async (cnpj) => {
    const form = formsDesconhecidos[cnpj];
    const d = preview.desconhecidos[cnpj];
    if (!form.devolucaoAlvo) { showToast?.("Escolha o cliente-alvo dessa devolução.", "erro"); return; }
    const entradas = Object.entries(form.mapEmpresa).filter(([, cat]) => cat !== "ignorar");
    const freteCod = entradas.find(([, cat]) => cat === "frete")?.[0];
    if (!freteCod) { showToast?.("Marque pelo menos um código de Empresa como Frete — é obrigatório pra classificar qualquer coisa.", "erro"); return; }
    const descLocalCod = entradas.find(([, cat]) => cat === "descarga_local")?.[0] || null;
    const diariaCod = entradas.find(([, cat]) => cat === "diaria")?.[0] || null;
    const alvo = clientesMap[form.devolucaoAlvo];
    setCadastrando(cnpj);
    try {
      const rec = await criarEmbarcadora({
        cnpj, nome: form.nome.trim() || `Devolução — ${alvo?.nome || form.devolucaoAlvo}`,
        tipo: "devolucao", devolucao_de_cnpj: form.devolucaoAlvo, base_id: null,
        razao_social: form.razao_social?.trim() || null,
        cidade: form.cidade?.trim() || null, uf: form.uf?.trim().toUpperCase() || null,
        frete_cod: freteCod, desc_local_cod: descLocalCod, diaria_cod: diariaCod,
        criado_por: usuarioLogado || null,
      });
      const efetivo = clienteEfetivo(rec, clientesMap);
      const { classificadas, naoClassificadas: ignoradas } = classificarLinhasCliente(d.linhasRaw, efetivo, cnpj);
      const novasLinhas = [...preview.linhas, ...classificadas];
      const novasNaoClass = [...preview.naoClassificadas, ...ignoradas];
      const { periodoRef: novoPeriodoRef, periodosEncontrados } = recalcularFlagsEPeriodo(novasLinhas, novasNaoClass);
      const { [cnpj]: _omit, ...restoDesconhecidos } = preview.desconhecidos;
      setPreview({ ...preview, linhas: novasLinhas, naoClassificadas: novasNaoClass, periodoRef: novoPeriodoRef, periodosEncontrados, desconhecidos: restoDesconhecidos, resumo: resumoPorCategoria(novasLinhas) });
      showToast?.(`Devolução vinculada a "${efetivo.nome}" — ${classificadas.length} linha(s) FOB incluída(s) na importação.`, "ok");
    } catch (e) { showToast?.("Erro ao salvar devolução: " + e.message, "erro"); }
    finally { setCadastrando(null); }
  };

  const ignorarCnpjDesconhecido = (cnpj) => {
    const { [cnpj]: _omit, ...resto } = preview.desconhecidos;
    setPreview({ ...preview, desconhecidos: resto });
    showToast?.("CNPJ ignorado — as linhas dele não serão importadas.", "ok");
  };

  const confirmarImportacao = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const { novas, divergentes, jaExistem, protegidas, protegidasCtrcs } = await diffImportFrete(conn, preview.linhas);
      // Categoria definida à mão não é recriada pela planilha (migration 049) — avisa quais.
      const avisoProt = protegidas
        ? ` — ${protegidas} mantiveram a categoria definida à mão (CTRC ${protegidasCtrcs.slice(0, 4).join(", ")}${protegidasCtrcs.length > 4 ? "…" : ""})`
        : "";
      // Linha que já existe mas veio diferente na planilha é CORRIGIDA (migration 059): é o
      // caso de um arquivo incompleto ter entrado antes do certo. Só campos do documento —
      // revisão, categoria à mão e vínculos ficam de pé.
      if (divergentes.length) await atualizarFreteLote(conn, divergentes);
      const avisoUpd = divergentes.length
        ? ` — ${divergentes.length} linha(s) tiveram os dados atualizados pela planilha (CTRC ${[...new Set(divergentes.map(l => l.ctrc))].slice(0, 4).join(", ")}${divergentes.length > 4 ? "…" : ""})`
        : "";
      if (novas.length === 0) {
        showToast?.(divergentes.length
          ? `Nenhum CTRC novo${avisoUpd}${avisoProt}.`
          : `Nada novo — todos os CTRCs desse período já estavam importados${avisoProt}.`, "ok");
        setPreview(null);
        if (divergentes.length) { setPeriodoRef(preview.periodoRef); await carregar(); }
        return;
      }
      await inserirFrete(conn, novas);
      const nomesClientes = [...new Set(novas.map(l => l.cliente))];
      showToast?.(`${novas.length} registro(s) novo(s) importado(s) (${nomesClientes.join(", ")})${jaExistem ? ` — ${jaExistem} já existiam` : ""}${avisoUpd}${avisoProt}.`, "ok");
      setPreview(null);
      setPeriodoRef(preview.periodoRef);
      await carregar();
      // Trecho novo entra sem distância: mede agora, para o KM do relatório não nascer
      // vazio. Roda depois do carregar() e em silêncio — falhar aqui não invalida o
      // import, só deixa a pendência para a faixa de avisos mostrar.
      calcularKmDosNovos(novas);
    } catch (e) { showToast?.("Erro ao importar: " + e.message, "erro"); }
    finally { setImporting(false); }
  };

  // Mede a distância dos trechos que entraram sem km. Homônimo sem critério de UF não
  // vira número (ver migration 068) — fica como pendência para o Yves decidir.
  const calcularKmDosNovos = async (linhas) => {
    const faltando = trechosSemKm(linhas).map((x) => x.codigo);
    if (!faltando.length) return;
    try {
      const { gravados, pendentes } = await calcularKmFaltante(conn, faltando);
      if (gravados) {
        showToast?.(`Distância calculada para ${gravados} trecho(s) novo(s).`, "ok");
        setKmVersao((v) => v + 1);
      }
      if (pendentes?.length) {
        showToast?.(`${pendentes.length} trecho(s) ficaram sem distância — cidade homônima sem UF definida.`, "warn");
      }
    } catch { /* sem distância a tela segue igual: a coluna KM fica vazia */ }
  };

  const onDecidir = async (id, decisao, obs) => {
    try {
      const atualizado = await decidir(conn, id, decisao, obs, usuarioLogado);
      setPendentes((arr) => arr.filter((p) => p.id !== id));
      // sinalizar_correcao entra em Sinalizados; qualquer outra decisão (ex.: correcao_feita) tira de lá.
      setSinalizados((arr) => decisao === "sinalizar_correcao" && atualizado
        ? [atualizado, ...arr.filter((s) => s.id !== id)]
        : arr.filter((s) => s.id !== id));
      // Reflete a decisão nas linhas do período já carregadas — alimenta o ranking de revisão sem refetch.
      setLinhasPeriodo((arr) => arr.map((l) => l.id === id
        ? { ...l, decisao_manual: decisao, revisado_por: usuarioLogado, revisado_em: atualizado?.revisado_em || new Date().toISOString() }
        : l));
      showToast?.("Revisão registrada.", "ok");
    } catch (e) { showToast?.("Erro ao registrar decisão: " + e.message, "erro"); }
  };

  // Estorna uma decisão dos Revisados (ex.: "correção feita" clicada sem querer).
  // Limpa a decisão no banco e devolve à fila localmente se a linha ainda tiver flag.
  const onEstornar = async (p) => {
    if (!window.confirm(`Estornar a revisão do CTRC ${p.ctrc}? A decisão "${DECISAO_LABEL[p.decisao_manual] || p.decisao_manual}" será removida e o item volta para a fila (se ainda estiver marcado).`)) return;
    try {
      await estornarRevisao(conn, p.id);
      const voltou = { ...p, decisao_manual: null, revisado_por: null, revisado_em: null, revisado_obs: null };
      setLinhasPeriodo((arr) => arr.map((l) => (l.id === p.id ? voltou : l)));
      setPendentes((arr) => {
        if (arr.some((x) => x.id === p.id)) return arr;
        const temFlag = voltou.flag_negativa || voltou.flag_baixa || voltou.flag_ambigua || voltou.flag_duplicidade || voltou.flag_sem_contrato;
        return temFlag ? [voltou, ...arr] : arr;
      });
      showToast?.("Revisão estornada.", "ok");
    } catch (e) { showToast?.("Erro ao estornar: " + e.message, "erro"); }
  };

  // Filial vinda do topbar (ctx.filialAtiva). Aqui o recorte NÃO é a origem da viagem: é a
  // embarcadora, porque a Conferência trabalha por CTe de cliente. O mapa vem do cadastro
  // (embarcadoras.filial, migration 057) — inferir pelo nome quebraria com cliente novo.
  // O seletor de embarcadora continua: filial escolhe a filial, o seletor escolhe UM cliente.
  // Vem ANTES de quem usa (clientesPresentes, linhasFiltradas): `const` não sobe.
  const clientesDaFilial = React.useMemo(() => {
    if (!filialAtiva || filialAtiva === "todas") return null;
    const nomes = Object.values(clientesMap || {}).filter((e) => e?.filial === filialAtiva).map((e) => e.nome);
    return nomes.length ? new Set(nomes) : null;
  }, [clientesMap, filialAtiva]);

  // Recorte da tela (base do topbar + filial + cliente) aplicado a QUALQUER conjunto de
  // linhas — inclusive os meses anteriores. Sem isso, o mês exibido vinha de uma base só e
  // os meses do comparativo somavam todas as bases: a "queda" do mês corrente era o recorte.
  const recortarEscopo = React.useCallback((arr) => {
    let out = (baseAtual?.id && !baseAtual.consolidado) ? arr.filter((l) => l.base_id === baseAtual.id) : arr;
    if (clientesDaFilial) out = out.filter((l) => clientesDaFilial.has(l.cliente));
    if (clienteFiltro) out = out.filter((l) => l.cliente === clienteFiltro);
    return out;
  }, [baseAtual, clientesDaFilial, clienteFiltro]);

  // ── Recorte por tipo de carga (papel × celulose) ───────────────────────────
  // A Conferência só conhece o CTe; quem sabe o tipo é a planilha operacional, por DT.
  // `DADOS` já chega recortado pelo filtro do topbar, então o conjunto de CTes que sobrou
  // lá É o filtro. CTe sem par na planilha (descarga e diária quase nunca têm) fica de fora
  // e é contado à parte — some do total, mas não sem explicação: ver `semTipo` no aviso.
  const ctesDoTipo = React.useMemo(() => {
    if (!classificador || !filtroTipoCarga || filtroTipoCarga === "todos") return null;
    const s = new Set();
    for (const r of DADOS || []) {
      for (const c of [r.cte, r.cte_comp]) { const d = soNum(c); if (d) s.add(d); }
    }
    return s;
  }, [DADOS, classificador, filtroTipoCarga]);

  const recortar = React.useCallback((arr) => {
    const out = recortarEscopo(arr);
    return ctesDoTipo ? out.filter((l) => ctesDoTipo.has(soNum(l.ctrc))) : out;
  }, [recortarEscopo, ctesDoTipo]);

  // Clientes presentes no período (pra popular o filtro, mesmo sem estar no cadastro fixo)
  const clientesPresentes = React.useMemo(() => {
    const arr = clientesDaFilial ? linhasDaBase.filter(l => clientesDaFilial.has(l.cliente)) : linhasDaBase;
    return [...new Set(arr.map(l => l.cliente))].sort();
  }, [linhasDaBase, clientesDaFilial]);
  // Trocar a filial no topbar com um cliente da outra filial selecionado deixaria a tela
  // vazia sem explicação — limpa o seletor.
  React.useEffect(() => {
    if (clienteFiltro && clientesDaFilial && !clientesDaFilial.has(clienteFiltro)) setClienteFiltro("");
  }, [clientesDaFilial, clienteFiltro]);

  // Destinos possíveis pra edição admin (FOB): embarcadoras que faturam (têm base_id).
  // Ao escolher, o cliente vira o destinatário e a base acompanha (mesma lógica do import).
  const embarcadorasOpc = React.useMemo(() => {
    const seen = new Map();
    Object.values(clientesMap || {}).forEach((e) => { if (e?.nome && e?.base_id && !seen.has(e.nome)) seen.set(e.nome, e.base_id); });
    return [...seen.entries()].map(([nome, base_id]) => ({ nome, base_id })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientesMap]);
  const basesOpc = React.useMemo(() => Object.values(BASES).map((b) => ({ v: b.id, l: b.label })), []);

  const linhasFiltradas = React.useMemo(() => recortar(linhasPeriodo), [recortar, linhasPeriodo]);

  // Relatório da tela: as linhas do período JÁ filtradas (filial, cliente) — o modal cuida de
  // colunas, ordem, agrupamento e exportação. Só CTes ativos, como todo resumo daqui.
  // Fica DEPOIS de linhasFiltradas de propósito: `const` não sobe, e ler daqui de cima
  // derrubava a tela inteira com "Cannot access before initialization".
  const relColunas = React.useMemo(() => [
    { id: "ctrc", label: "CTRC", tipo: "texto", get: (l) => l.ctrc },
    { id: "data", label: "Emissão", tipo: "data", get: (l) => l.data_emissao },
    { id: "categoria", label: "Categoria", tipo: "texto", get: (l) => CATEGORIA_LABEL[l.categoria] || l.categoria },
    { id: "cliente", label: "Cliente", tipo: "texto", get: (l) => l.cliente },
    { id: "trecho", label: "Trecho", tipo: "texto", get: (l) => l.trecho },
    // Origem/destino saem do de-para da sigla (operacao/trechos.js), não de coluna gravada:
    // é o que permite conciliar o relatório com a planilha por rota. Trecho sem de-para
    // exporta vazio — melhor que adivinhar cidade a partir das 3 letras.
    { id: "origem_trecho", label: "Origem", tipo: "texto", get: (l) => trechoOrigem(l.trecho) },
    { id: "destino_trecho", label: "Destino", tipo: "texto", get: (l) => trechoDestino(l.trecho) },
    { id: "km_trecho", label: "KM", tipo: "numero", get: (l) => trechoKm(l.trecho) },
    { id: "placa", label: "Placa", tipo: "texto", get: (l) => l.placa },
    { id: "nfs", label: "NFs", tipo: "texto", get: (l) => l.nfs },
    { id: "contratoNum", label: "Nº contrato", tipo: "texto", get: (l) => numeroContratoDoCte(l) },
    { id: "peso", label: "Peso NF", tipo: "numero", total: true, get: (l) => l.peso_nf },
    { id: "fretePeso", label: "Frete peso", tipo: "moeda", total: true, get: (l) => l.frete_peso },
    { id: "total", label: "Total do frete", tipo: "moeda", total: true, get: (l) => l.total_frete },
    { id: "contrato", label: "Contrato", tipo: "moeda", total: true, get: (l) => l.valor_contrato_frete },
    { id: "saldo", label: "Saldo", tipo: "moeda", total: true, get: (l) => l.saldo },
    { id: "margem", label: "Margem", tipo: "pct", get: (l) => l.margem_lucro },
    { id: "usuario", label: "Usuário", tipo: "texto", get: (l) => l.nome_usuario },
    { id: "situacao", label: "Situação", tipo: "texto", get: (l) => [
      l.flag_negativa && "margem negativa", l.flag_baixa && "margem < 10%",
      l.flag_sem_contrato && "sem contrato", l.flag_duplicidade && "possível duplicidade",
      l.decisao_manual && (DECISAO_LABEL[l.decisao_manual] || l.decisao_manual),
    ].filter(Boolean).join("; ") },
  ], []);
  const relGrupos = React.useMemo(() => [
    { id: "categoria", label: "categoria", get: (l) => CATEGORIA_LABEL[l.categoria] || l.categoria },
    { id: "cliente", label: "cliente", get: (l) => l.cliente },
    { id: "dia", label: "dia", get: (l) => (l.data_emissao || "").split("-").reverse().join("/") },
    { id: "usuario", label: "usuário", get: (l) => l.nome_usuario || "(sem usuário)" },
    { id: "destino_trecho", label: "destino", get: (l) => trechoDestino(l.trecho) || l.trecho || "(sem trecho)" },
  ], []);
  const relLinhas = React.useMemo(() => linhasFiltradas.filter(ehAtivo), [linhasFiltradas]);

  // Abre o trecho pendente já com a rota proposta pelas praças que os outros trechos
  // conhecem (ver sugerirTrecho). Trecho que existe mas está sem km abre com a rota atual —
  // é o caso da cidade homônima, onde basta acrescentar a UF no destino.
  const abrirTrecho = React.useCallback((codigo, linhas) => {
    const atual = trechoInfo(codigo);
    const s = atual ? { origem: atual.origem, destino: atual.destino } : sugerirTrecho(codigo);
    setTrechoModal({
      codigo, linhas: linhas || 0,
      origem: s.origem, destino: s.destino,
      km: atual?.km != null ? String(atual.km) : "",
      sugerido: !atual && !!(s.origem || s.destino),
    });
  }, []);

  const onSalvarTrecho = React.useCallback(async () => {
    if (!trechoModal) return;
    setSalvandoTrecho(true);
    try {
      const cod = await salvarTrecho(conn, trechoModal);
      // Sem km digitado, mede pelo OSRM na hora — é o mesmo caminho que a tela já usa pros
      // trechos importados, então o número sai da mesma fonte.
      let medido = 0;
      if (!String(trechoModal.km || "").trim()) {
        const r = await calcularKmFaltante(conn, [cod]).catch(() => ({ gravados: 0 }));
        medido = r.gravados || 0;
      }
      setKmVersao((v) => v + 1);
      setTrechoModal(null);
      showToast?.(medido ? `Trecho ${cod} salvo e distância calculada.` : `Trecho ${cod} salvo.`, "ok");
    } catch (e) {
      showToast?.("Erro ao salvar trecho: " + e.message, "erro");
    } finally { setSalvandoTrecho(false); }
  }, [trechoModal, conn, showToast]);

  // Quantos CTes o filtro de tipo de carga deixou de fora por não terem par na planilha
  // operacional. É o número honesto do recorte: sem ele, sumiriam 138 descargas em silêncio.
  const tipoLabel = classificador?.valores?.find((v) => v.valor === filtroTipoCarga)?.label || "";
  const semTipo = React.useMemo(() => {
    if (!ctesDoTipo) return 0;
    return recortarEscopo(linhasPeriodo).filter(ehAtivo)
      .filter((l) => !ctesDoTipo.has(soNum(l.ctrc))).length;
  }, [ctesDoTipo, recortarEscopo, linhasPeriodo]);

  // ── Aviso de trecho sem tradução ou sem distância ──────────────────────────
  // Sem isto, os dois casos aparecem iguais na tela: coluna vazia. Um é praça cujo
  // relatório "Trechos/Rotas" nunca foi importado; o outro é cidade homônima que
  // ninguém decidiu (Conde PB ou BA?). A faixa some sozinha quando não há pendência.
  const avisoTrechos = React.useMemo(() => {
    const semDePara = trechosSemDePara(linhasFiltradas);
    const semKm = trechosSemKm(linhasFiltradas);
    if (!semDePara.length && !semKm.length) return null;
    const linha = (titulo, itens, detalhe) => (
      <div style={{ marginTop: 6 }}>
        <span style={{ fontWeight: 700, color: t.txt }}>{titulo}</span>{" "}
        <span style={{ color: t.txt2 }}>{detalhe}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
          {/* Clicável: o lugar onde o problema aparece é o lugar de corrigir. */}
          {itens.slice(0, 12).map((x) => (
            <Badge key={x.codigo} as="button" type="button" variant="warning" size="sm"
              onClick={() => abrirTrecho(x.codigo, x.linhas)}
              title="Definir origem e destino deste trecho"
              style={{ fontFamily: "var(--font-mono)", cursor: "pointer" }}>
              {x.codigo}{x.destino ? ` · ${x.destino}` : ""} ({x.linhas})
            </Badge>
          ))}
          {itens.length > 12 && <span style={{ fontSize: 10.5, color: t.txt2 }}>+{itens.length - 12}</span>}
        </div>
      </div>
    );
    // Sem usar `card`: aquele const nasce mais abaixo no arquivo e este memo roda antes.
    return (
      <div style={{ ...css.card, padding: isMobile ? 14 : 18, marginBottom: 14, borderLeft: `3px solid ${t.ouro}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
          {hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>, t.ouro, 15, 2)}
          <b style={{ color: t.ouro }}>Trechos sem informação completa</b>
        </div>
        {semDePara.length > 0 && linha("Sem origem/destino:", semDePara,
          "— praça cujo relatório de trechos do TMS ainda não foi importado. Clique na sigla para definir a rota; o número entre parênteses é a quantidade de linhas.")}
        {semKm.length > 0 && linha("Sem distância:", semKm,
          "— cidade com nome repetido no Brasil. Clique e acrescente a UF ao destino (ex.: CONDE - BA) para poder medir.")}
      </div>
    );
  // kmVersao entra de propósito: o de-para é módulo, não estado do React.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // (abrirTrecho é estável — useCallback sem dependências.)
  }, [linhasFiltradas, kmVersao, t, css, isMobile, hexRgb, hIco]);
  // Recorte de mês da fila de revisão — relativo ao mês real corrente (não ao periodoRef,
  // que controla os resumos). A fila já vem limitada a mês anterior + corrente do backend.
  const mesCorrenteReal = React.useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mesAnteriorReal = React.useMemo(() => shiftMes(mesCorrenteReal, -1), [mesCorrenteReal]);
  const filaMesRef = filaMes === "atual" ? mesCorrenteReal : filaMes === "anterior" ? mesAnteriorReal : null;

  const pendentesFiltrados = React.useMemo(() => pendentes
    // CTe substituído/cancelado não gera mais trabalho de revisão — está fora do faturamento.
    .filter(ehAtivo)
    .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
    .filter(p => !usuarioFiltro || (p.nome_usuario || "(sem usuário na planilha)") === usuarioFiltro)
    .filter(p => !filaMesRef || p.periodo_ref === filaMesRef)
    // Mesmo recorte de tipo de carga do resto da tela — senão a fila cobraria revisão de
    // CTe que os totais nem estão mostrando.
    .filter(p => !ctesDoTipo || ctesDoTipo.has(soNum(p.ctrc))),
    [pendentes, clienteFiltro, usuarioFiltro, filaMesRef, ctesDoTipo]
  );
  const sinalizadosFiltrados = React.useMemo(() => sinalizados
    .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
    .filter(p => !usuarioFiltro || (p.nome_usuario || "(sem usuário na planilha)") === usuarioFiltro),
    [sinalizados, clienteFiltro, usuarioFiltro]
  );

  // Recorte de categoria dos RESUMOS (Por cliente / Evolução diária / comparativo). Os KPIs
  // por categoria continuam sobre linhasFiltradas — são justamente eles que mostram quanto
  // Diária e Descarga representam quando o toggle está desligado.
  const semDiariaDescarga = React.useCallback(
    (arr) => arr.filter((l) => l.categoria !== "diaria" && l.categoria !== "descarga"), []);
  const linhasResumo = React.useMemo(
    () => incluirDiariaDescarga ? linhasFiltradas : semDiariaDescarga(linhasFiltradas),
    [linhasFiltradas, incluirDiariaDescarga, semDiariaDescarga]);

  const resumoCat = React.useMemo(() => resumoPorCategoria(linhasFiltradas), [linhasFiltradas]);
  const resumoCli = React.useMemo(() => resumoPorCliente(linhasResumo), [linhasResumo]);
  const resumoDia = React.useMemo(() => resumoPorDia(linhasResumo), [linhasResumo]);

  // Comparativo com meses anteriores — mesmo intervalo de dias (01 até o dia de corte)
  // nos 2 meses anteriores ao periodoRef selecionado. Dia de corte = hoje, se periodoRef
  // for o mês corrente; senão, o último dia com dado no próprio período (mês fechado).
  const mesAnt1 = React.useMemo(() => shiftMes(periodoRef, -1), [periodoRef]);
  const mesAnt2 = React.useMemo(() => shiftMes(periodoRef, -2), [periodoRef]);
  const comparativo = React.useMemo(() => {
    // Mesmo recorte do mês exibido (base + filial + cliente + toggle de diária/descarga),
    // senão o comparativo compararia bases diferentes e a variação % sairia inventada.
    const mesmoRecorte = (arr) => {
      const r = recortar(arr);
      return incluirDiariaDescarga ? r : semDiariaDescarga(r);
    };
    const resumoAnt1 = resumoPorDia(mesmoRecorte(linhasComparativo[mesAnt1] || []));
    const resumoAnt2 = resumoPorDia(mesmoRecorte(linhasComparativo[mesAnt2] || []));

    const hojeStr = new Date().toISOString().slice(0, 10);
    const mesAtualReal = hojeStr.slice(0, 7);
    const diaCorte = periodoRef === mesAtualReal
      ? Number(hojeStr.slice(8, 10))
      : (resumoDia.length ? Number(resumoDia[resumoDia.length - 1].dia.slice(8, 10)) : 0);

    const porDiaDoMes = (resumo) => { const m = {}; resumo.forEach(d => { m[d.dia.slice(8, 10)] = d; }); return m; };
    const mapaAtual = porDiaDoMes(resumoDia), mapa1 = porDiaDoMes(resumoAnt1), mapa2 = porDiaDoMes(resumoAnt2);

    const dias = Array.from({ length: diaCorte }, (_, i) => String(i + 1).padStart(2, "0"));

    const somar = (mapa) => dias.reduce((a, dd) => {
      const d = mapa[dd]; if (!d) return a;
      return { registros: a.registros + d.registros, fretePeso: a.fretePeso + d.fretePeso, saldo: a.saldo + d.saldo };
    }, { registros: 0, fretePeso: 0, saldo: 0 });
    const totalAtual = somar(mapaAtual), total1 = somar(mapa1), total2 = somar(mapa2);

    return { diaCorte, totalAtual, total1, total2 };
  }, [linhasComparativo, mesAnt1, mesAnt2, periodoRef, resumoDia, recortar, incluirDiariaDescarga, semDiariaDescarga]);
  const totalMes = React.useMemo(() => Object.values(resumoCli).reduce((a, d) => ({
    registros: a.registros + d.registros, peso: a.peso + d.peso, fretePeso: a.fretePeso + d.fretePeso, saldo: a.saldo + d.saldo,
  }), { registros: 0, peso: 0, fretePeso: 0, saldo: 0 }), [resumoCli]);

  // ── Card de gestão: frete × diária paga × diária emitida ──────────────────
  // As três naturezas que a gestão precisa ver separadas. O CUSTO da diária é o
  // CONTRATO da categoria 'diaria' (o que saiu pro motorista) — não o frete_peso,
  // porque no D01 o TMS manda Saldo = −Contrato e frete_peso ≈ contrato.
  // A diária EMITIDA quase sempre cai no mês seguinte ao pagamento, então comparar
  // as duas dentro do mesmo mês mede o atraso, não a recuperação: por isso o card
  // também mostra o acumulado dos 3 meses que a tela já tem carregados.
  const gestao = React.useMemo(() => {
    const ativas = (arr) => arr.filter(ehAtivo);
    const soma = (arr, cat, campo) => ativas(arr).filter(l => l.categoria === cat)
      .reduce((s, l) => s + (Number(l[campo]) || 0), 0);
    const conta = (arr, cat) => ativas(arr).filter(l => l.categoria === cat).length;
    const porCli = (arr) => recortar(arr); // base + filial + cliente, igual ao mês exibido
    // As DUAS pontas da diária são lidas no mês de competência (migrations 053/054), não no
    // mês do documento: o D01/D05 sai antes ou depois do espelho (um mês de pagamento pode
    // se referir a dois meses de espelho) e o CTe que cobra sai depois, podendo cobrar o mês
    // inteiro. Por isso a busca varre os 3 meses carregados, não só o mês da coluna.
    const universo3 = ativas([
      ...linhasFiltradas,
      ...[mesAnt1, mesAnt2].flatMap((m) => porCli(linhasComparativo[m] || [])),
    ]);
    const daCategoriaNoMes = (cat, m) => universo3.filter(l => l.categoria === cat && mesCompetencia(l) === m);
    const doMes = (arr, m) => {
      const emitidas = daCategoriaNoMes("diaria_emitida", m);
      const pagas = daCategoriaNoMes("diaria", m);
      return {
        freteSaldo: ativas(arr).filter((l) => l.categoria === "frete").reduce((s, l) => s + saldoEfetivo(l), 0),
        fretePeso: soma(arr, "frete", "frete_peso"),
        nFrete: conta(arr, "frete"),
        diariaPaga: pagas.reduce((s, l) => s + (Number(l.valor_contrato_frete) || 0), 0),
        nPaga: pagas.length,
        diariaEmitida: emitidas.reduce((s, l) => s + (Number(l.frete_peso) || 0), 0),
        nEmitida: emitidas.length,
      };
    };
    const meses = [periodoRef, mesAnt1, mesAnt2].map((m) => ({
      mes: m,
      ...doMes(m === periodoRef ? linhasFiltradas : porCli(linhasComparativo[m] || []), m),
    }));
    const pagoAcum = meses.reduce((s, m) => s + m.diariaPaga, 0);
    const emitAcum = meses.reduce((s, m) => s + m.diariaEmitida, 0);
    return { atual: meses[0], meses, pagoAcum, emitAcum };
  }, [linhasFiltradas, linhasComparativo, periodoRef, mesAnt1, mesAnt2, recortar]);

  // Curva de saldo acumulado ao longo do mês — pontos para o mini-gráfico de área da Evolução diária.
  const chartEvo = React.useMemo(() => {
    if (!resumoDia.length) return null;
    let acc = 0;
    const pts = resumoDia.map((d) => { acc += d.saldo; return { dia: d.dia, v: acc }; });
    const vs = pts.map((p) => p.v);
    return { pts, max: Math.max(...vs, 0), min: Math.min(...vs, 0), total: acc };
  }, [resumoDia]);

  // Por usuário — quem lançou os registros hoje na fila de revisão, pra saber com quem falar.
  // Clicável: filtra a Fila de revisão/Sinalizados por esse usuário (usuarioFiltro).
  const resumoPorUsuario = React.useMemo(() => {
    const out = {};
    pendentes
      .filter(ehAtivo)
      .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
      .filter(p => !filaMesRef || p.periodo_ref === filaMesRef)
      .forEach((p) => {
        const nome = p.nome_usuario || "(sem usuário na planilha)";
        out[nome] = (out[nome] || 0) + 1;
      });
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }, [pendentes, clienteFiltro, filaMesRef]);

  // Produtividade — cruza quem já revisou (revisado_por nas linhas do período) com quem
  // ainda tem pendências (nome_usuario na fila). Placar único: revisou × ainda pendente.
  const produtividade = React.useMemo(() => {
    const revisou = {};
    linhasFiltradas.forEach((l) => {
      if (!l.decisao_manual) return;
      const nome = l.revisado_por || "(sem registro)";
      revisou[nome] = (revisou[nome] || 0) + 1;
    });
    const pend = Object.fromEntries(resumoPorUsuario); // já filtrado por cliente + mês
    const nomes = new Set([...Object.keys(revisou), ...Object.keys(pend)]);
    return [...nomes]
      .map((nome) => ({ nome, revisou: revisou[nome] || 0, pendentes: pend[nome] || 0 }))
      .sort((a, b) => (b.revisou - a.revisou) || (b.pendentes - a.pendentes));
  }, [linhasFiltradas, resumoPorUsuario]);

  // Revisados — itens que já saíram da fila com uma decisão (menos sinalizar_correcao, que tem
  // seção própria). Fica registrado quem decidiu e quando; mais recentes primeiro.
  const revisados = React.useMemo(() => linhasFiltradas
    .filter((l) => l.decisao_manual && l.decisao_manual !== "sinalizar_correcao")
    .sort((a, b) => String(b.revisado_em || "").localeCompare(String(a.revisado_em || ""))),
    [linhasFiltradas]);

  // Mesmo card do Dashboard (css.card) — reskin pra bater com o resto do app.
  const card = { ...css.card, padding: isMobile ? 14 : 18 };
  // Mosaico (CSS columns) em vez de grid pareado — cards de altura desigual (ex.: Por
  // cliente curto ao lado de Evolução diária longa) não deixam mais espaço morto na
  // linha, porque cada coluna flui independente em vez de esticar pra bater com a maior.
  // Largura fixa das colunas de dinheiro nas tabelas-resumo. "R$ 1.815.679,85" em mono 12px
  // não cabia em 96px e quebrava linha entre o "R$" e o número; 118 + nowrap segura valores
  // até dezenas de milhões numa coluna só. Alterar aqui muda cabeçalho e linhas juntos.
  const COL_MOEDA = 118;
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
    <Badge variant="default" size="sm" pill  style={{ marginRight: 5 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      {texto}
    </Badge>
  );

  // Badges do ciclo de vida do CTe (migration 048): o que ele É (tipo_doc) e se ainda
  // conta no faturamento (status_doc). Cinza = fora dos totais; azul/verde = continua contando.
  const badgesCiclo = (p) => (<>
    {p.status_doc === "substituido" && badge(ICO_SUBSTITUICAO, p.ctrc_ref ? `SUBSTITUÍDO PELO ${p.ctrc_ref}` : "SUBSTITUÍDO", t.txt2)}
    {p.status_doc === "cancelado" && badge(ICO_CANCELADO, p.ctrc_ref ? `CANCELADO · REFEITO NO ${p.ctrc_ref}` : "CANCELADO", t.danger)}
    {p.tipo_doc === "substituto" && badge(ICO_SUBSTITUICAO, `SUBSTITUI O ${p.ctrc_ref || "?"}`, t.azul)}
    {/* Complementar de DIÁRIA lê diferente do complementar de valor de frete: é a cobrança
        do que já se pagou ao motorista no D01, não um valor a mais do mesmo transporte. */}
    {p.tipo_doc === "complementar" && badge(ICO_COMPLEMENTAR,
      p.categoria === "diaria_emitida" ? `COBRA A DIÁRIA DO ${p.ctrc_ref || "?"}` : `COMPLEMENTAR DO ${p.ctrc_ref || "?"}`,
      t.verde)}
    {p.competencia_ref && badge(ICO_COMPETENCIA,
      p.categoria === "diaria" ? `ESPELHO DE ${mesLabel(p.competencia_ref)}` : `DIÁRIAS DE ${mesLabel(p.competencia_ref)}`,
      t.verde)}
  </>);

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

  // Universo de linhas conhecidas: mês exibido + os 2 meses do comparativo + fila +
  // sinalizados + os meses buscados sob demanda. O grupo de duplicidade e os candidatos a
  // vínculo precisam enxergar o PAR, que quase nunca está na fila de pendentes.
  const universoLinhas = React.useMemo(() => {
    const porId = new Map();
    [...linhasPeriodo, ...Object.values(linhasComparativo).flat(), ...pendentes, ...sinalizados, ...linhasExtra]
      .forEach((l) => { if (l?.id && !porId.has(l.id)) porId.set(l.id, l); });
    return [...porId.values()];
  }, [linhasPeriodo, linhasComparativo, pendentes, sinalizados, linhasExtra]);

  // Pares de duplicidade de UM CTe. Casa pelos VALORES (chaveDuplicidade: placa + valor NF +
  // peso + trecho + total do frete), não pelo campo dup_grupo_chave gravado no import.
  // Motivo: a chave só é gravada nas linhas daquela importação — se as duas linhas do par
  // entraram em importações diferentes, só a última ficou com a chave e o par nunca era
  // encontrado (era o caso do CTRC 5941). Recalcular no front acha o par sempre.
  const paresDup = React.useCallback((p) => {
    if (!p) return [];
    const k = chaveDuplicidade(p);
    return universoLinhas
      .filter((l) => l.id !== p.id && chaveDuplicidade(l) === k)
      .sort((a, b) => String(a.data_emissao || "").localeCompare(String(b.data_emissao || "")) || String(a.ctrc).localeCompare(String(b.ctrc)));
  }, [universoLinhas]);

  const grupoDup = React.useMemo(() => {
    if (!dupModal.open || !dupModal.origem) return [];
    return [dupModal.origem, ...paresDup(dupModal.origem)]
      .sort((a, b) => String(a.data_emissao || "").localeCompare(String(b.data_emissao || "")) || String(a.ctrc).localeCompare(String(b.ctrc)));
  }, [dupModal.open, dupModal.origem, paresDup]);

  // Par fora dos meses carregados: busca sob demanda 3 meses pra trás e 3 pra frente da
  // emissão do CTe aberto. Roda uma vez por mês consultado (mesesBuscados), então não
  // entra em laço mesmo com o universo mudando depois da busca.
  React.useEffect(() => {
    const p = revisarModal.item;
    if (!revisarModal.open || !p || !conn || !p.flag_duplicidade) return;
    if (paresDup(p).length) return;
    const base = p.periodo_ref || String(p.data_emissao || "").slice(0, 7);
    if (!base) return;
    const faltantes = [-3, -2, -1, 0, 1, 2, 3].map((d) => shiftMes(base, d))
      .filter((m) => !mesesBuscados.current.has(m));
    if (!faltantes.length) return;
    faltantes.forEach((m) => mesesBuscados.current.add(m));
    let cancelado = false;
    setBuscandoPar(true);
    listarPorPeriodos(conn, faltantes)
      .then((rows) => { if (!cancelado && rows?.length) setLinhasExtra((prev) => [...prev, ...rows]); })
      .catch(() => { /* busca best-effort: sem o par, a tela avisa que não achou */ })
      .finally(() => { if (!cancelado) setBuscandoPar(false); });
    return () => { cancelado = true; };
  }, [revisarModal.open, revisarModal.item, conn, paresDup]);

  // ── Busca de CTe ─────────────────────────────────────────────────────────────
  // Atravessa cliente e mês (não depende de escolher o cliente antes) e casa por CTRC,
  // NF, placa, manifesto ou nº de contrato. Procura no que já está carregado; se não
  // achar, o botão "Procurar em todos os meses" traz o resto da base pra memória.
  const termoBusca = normBusca(buscaCte);
  // Relevância: o mesmo número costuma aparecer no meio do manifesto/contrato de outras
  // linhas (buscar "2591" casa 10 registros na base real). CTRC exato vem primeiro, depois
  // CTRC que começa com o termo, depois o resto — e dentro de cada grupo, mais recente antes.
  const pesoBusca = (l, termo) => {
    const c = normBusca(l.ctrc);
    if (c === termo) return 0;
    if (c.startsWith(termo)) return 1;
    if (normBusca(l.placa) === termo || normBusca(l.nfs).includes(termo)) return 2;
    return 3;
  };
  const resultadosBusca = React.useMemo(() => {
    if (termoBusca.length < 2) return [];
    return universoLinhas
      .filter((l) => [l.ctrc, l.nfs, l.placa, l.numero_manifesto, l.numero_contrato]
        .some((v) => normBusca(v).includes(termoBusca)))
      .sort((a, b) => (pesoBusca(a, termoBusca) - pesoBusca(b, termoBusca))
        || String(b.data_emissao || "").localeCompare(String(a.data_emissao || "")))
      .slice(0, 100);
  }, [termoBusca, universoLinhas]);

  const mesesCarregados = React.useMemo(
    () => [periodoRef, shiftMes(periodoRef, -1), shiftMes(periodoRef, -2)],
    [periodoRef]);

  // 18 meses em volta do mês exibido — a tabela inteira tem poucos milhares de linhas,
  // então isso cobre o histórico e ainda é uma consulta só. Fica em memória (linhasExtra)
  // até o próximo carregar(), então buscas seguintes são instantâneas.
  const buscarEmTodosOsMeses = async () => {
    setBuscaAmpla("buscando");
    try {
      const alvo = Array.from({ length: 19 }, (_, i) => shiftMes(periodoRef, i - 17))
        .filter((m) => !mesesCarregados.includes(m) && !mesesBuscados.current.has(m));
      if (alvo.length) {
        alvo.forEach((m) => mesesBuscados.current.add(m));
        const rows = await listarPorPeriodos(conn, alvo);
        if (rows?.length) setLinhasExtra((prev) => [...prev, ...rows]);
      }
      setBuscaAmpla("feita");
    } catch (e) {
      setBuscaAmpla("nao");
      showToast?.("Erro ao procurar nos outros meses: " + e.message, "erro");
    }
  };

  // Candidatos a par do CTe aberto no modal (substituição/complementar) — mesma NF ou
  // mesmo valor, incluindo os meses buscados sob demanda.
  const candidatosDoCTe = React.useMemo(() => {
    if (!revisarModal.open || !revisarModal.item) return [];
    return candidatosVinculo(revisarModal.item, universoLinhas);
  }, [revisarModal.open, revisarModal.item, universoLinhas]);

  // Controles (mês + filial + ações) — vão pra faixa única do FinanceiroView via portal.
  const controles = (
    <>
        <input type="month" value={periodoRef} onChange={(e) => setPeriodoRef(e.target.value)}
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }} />
        {/* Dropdown custom — o <select> nativo abre um menu branco no tema escuro; este
            casa com o box do input de mês (mesma borda/raio/padding) e vira par visual. */}
        <div style={{ position: "relative" }}>
          <Button variant="secondary" size="sm" onClick={() => setCliOpen((o) => !o)} style={{ minWidth: 180 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clienteFiltro || "Todos os clientes"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: t.txt2, transform: cliOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Button>
          {cliOpen && (
            <>
              <div onClick={() => setCliOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div className="co-dropdown co-dropdown--scroll" style={{ minWidth: "100%", maxHeight: 300, padding: 4 }}>
                {[["", "Todos os clientes"], ...clientesPresentes.map((c) => [c, c])].map(([v, label]) => {
                  const ativo = clienteFiltro === v;
                  return (
                    <Button variant={ativo ? "primary" : "ghost"} size="sm" key={v || "__all"} onClick={() => { setClienteFiltro(v); setCliOpen(false); }}
                      
                      onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = t.card2; }}
                      onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "transparent"; }} style={{ width: "100%" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: ativo ? 1 : 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {/* Busca de CTe — mesmo desenho da busca de Créditos Pendentes (lupa + limpar). */}
        <div style={{ position: "relative", minWidth: 210 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={buscaCte ? t.ouro : t.txt2} strokeWidth="2.5" strokeLinecap="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={buscaCte} onChange={(e) => setBuscaCte(e.target.value)}
            placeholder="Buscar CTe (CTRC, NF, placa…)"
            /* Enter abre direto quando não há dúvida: resultado único, ou o primeiro é o CTRC exato. */
            onKeyDown={(e) => {
              const primeiro = resultadosBusca[0];
              if (e.key === "Enter" && primeiro && (resultadosBusca.length === 1 || pesoBusca(primeiro, termoBusca) === 0)) abrirRevisar(primeiro);
            }}
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 31, paddingRight: buscaCte ? 28 : 12, paddingTop: 8, paddingBottom: 8,
              fontSize: 13, borderRadius: 8, border: `1.5px solid ${buscaCte ? t.ouro : t.borda}`, background: t.card, color: t.txt, fontFamily: "inherit", outline: "none" }} />
          {buscaCte && (
            <Button variant="ghost" size="sm" onClick={() => setBuscaCte("")} title="Limpar busca" style={{ position: "absolute", top: "50%", right: 6 }}><Icon n="x" s={13} /></Button>
          )}
        </div>

        {/* Mesmo desenho do "Incluir complementar" do Resultado — controle que recalcula
            os totais da tela, não um filtro de listagem. */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: t.txt,
          padding: "6px 11px", border: `1px solid ${incluirDiariaDescarga ? t.borda : t.ouro}`, borderRadius: 8 }}>
          <Toggle checked={incluirDiariaDescarga} onChange={setIncluirDiariaDescarga}
            label="Incluir diária e descarga" />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => gerarWorkbookXLSX(linhasFiltradas, periodoRef)} disabled={!linhasFiltradas.length}>
            <Icon n="download" s={13} /> Baixar planilha
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRelOpen(true)} disabled={!linhasFiltradas.length}>
            Relatório
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onEscolherArquivo} style={{ display: "none" }} />
          {/* Cor azul (t.azul) em vez do accent amarelo do import de despesas (Resultado/Operacional) —
              reforça visualmente que este import é de outra fonte (faturamento bruto), evitando troca. */}
          <Button variant="info-outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? "Lendo..." : <><Icon n="upload" s={13} /> Importar planilha bruta</>}
          </Button>
        </div>
    </>
  );

  return (
    <div>
      {/* Controles: faixa única (FinanceiroView) via portal; fallback inline se o slot não existir */}
      {filaSlot
        ? ReactDOM.createPortal(controles, filaSlot)
        : <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>{controles}</div>}

      <div style={{ fontSize: 11, color: t.txt2, marginBottom: 14 }}>
        Fonte: planilhas brutas de faturamento (CTRC/TMS) por cliente — <b style={{ color: t.txt }}>não é o mesmo dado</b> do Operacional (Google Sheets). Os valores deveriam bater, mas ainda são conferidos separadamente.
      </div>

      {/* Filtro de tipo de carga (papel × celulose): a Conferência não tem esse campo, ele vem
          do DT pelo número do CTe. Dizer quantos ficaram sem par é o que impede o total de
          parecer uma queda — é recorte, não sumiço. */}
      {ctesDoTipo && (
        <div style={{ ...css.card, padding: isMobile ? 12 : 14, marginBottom: 14, borderLeft: `3px solid ${t.azul}`, fontSize: 11.5, color: t.txt2, lineHeight: 1.55 }}>
          <b style={{ color: t.txt }}>Mostrando só {tipoLabel.toLowerCase()}.</b>{" "}
          O tipo de carga é da planilha operacional (por DT) e chega aqui pelo número do CTe.
          {semTipo > 0 && <> <b style={{ color: t.azul }}>{semTipo} CTe(s)</b> do período ficaram de fora por não ter par na planilha — descarga e diária saem em CTe próprio, sem DT.</>}
          {" "}Para ver tudo, escolha <b style={{ color: t.txt }}>Todos</b> no topo.
        </div>
      )}

      {avisoTrechos}

      {/* Resultado da busca de CTe — fica acima dos KPIs porque, quando se busca, é o
          único conteúdo que importa. Não mexe em nenhum resumo/total da tela. */}
      {termoBusca.length >= 2 && (
        <div style={{ ...card, marginBottom: 14 }}>
          {sectionHead(`Busca · "${buscaCte.trim()}"`, (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: t.txt2 }}>
              {resultadosBusca.length} resultado(s){resultadosBusca.length === 100 ? " (100 primeiros)" : ""}
            </span>
          ))}

          {resultadosBusca.length > 0 ? (
            <div style={{ maxHeight: 420, overflowY: "auto", margin: "0 -4px" }}>
              {resultadosBusca.map((r) => (
                <div key={r.id} onClick={() => abrirRevisar(r)}
                  style={{ padding: "8px 6px", borderRadius: 7, borderBottom: `1px solid ${hexRgb(t.borda, .2)}`, cursor: "pointer",
                    opacity: ehAtivo(r) ? 1 : .5 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.card2)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      CTRC {r.ctrc} · {CATEGORIA_LABEL[r.categoria] || r.categoria} · <span style={{ color: t.txt2, fontWeight: 500 }}>{r.cliente}</span>
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{mesLabel(r.periodo_ref)}</span>
                    <span style={{ width: 104, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>
                      {money(r.saldo)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    {r.data_emissao && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{r.data_emissao.split("-").reverse().join("/")}</span>}
                    {r.placa && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{r.placa}</span>}
                    {r.nfs && <span style={{ fontSize: 10.5, color: t.txt2 }}>NF {r.nfs}</span>}
                    {r.is_devolucao && badge(ICO_DEVOLUCAO, "FOB", t.azul)}
                    {r.categoria_manual && badge(ICO_CATEGORIA_MANUAL, "CATEGORIA À MÃO", t.verde)}
                    {badgesCiclo(r)}
                    {r.flag_sem_contrato && badge(ICO_SEM_CONTRATO, "SEM CONTRATO", t.ouro)}
                    {r.flag_duplicidade && badge(ICO_DUPLICIDADE, "DUPLICIDADE", t.danger)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: t.txt2, lineHeight: 1.5 }}>
              Nada encontrado {buscaAmpla === "feita" ? "em nenhum mês da base." : `em ${mesesCarregados.map(mesLabel).join(", ")}.`}
            </div>
          )}

          {/* Ampliar a busca pro resto da base — uma consulta só, fica em memória depois. */}
          {buscaAmpla !== "feita" && (
            <Button variant="info-outline" size="sm" onClick={buscarEmTodosOsMeses} disabled={buscaAmpla === "buscando"} style={{ marginTop: 10 }}>
              {buscaAmpla === "buscando" ? "Procurando…" : "Procurar em todos os meses"}
            </Button>
          )}
        </div>
      )}

      {/* Card de gestão — leitura de negócio antes do detalhe por categoria */}
      {(gestao.atual.nFrete > 0 || gestao.atual.nPaga > 0 || gestao.atual.nEmitida > 0) && (
        <div style={{ ...card, marginBottom: 14 }}>
          {sectionHead(`Frete × diária · ${mesLabel(periodoRef)}`, (
            <span style={{ fontSize: 10.5, color: t.txt2 }}>
              {gestao.atual.nFrete + gestao.atual.nPaga + gestao.atual.nEmitida} documentos
            </span>
          ))}

          {/* A leitura do mês em uma frase — é o que a gestão lê primeiro; os blocos
              abaixo são a prova do número, não o recado. */}
          <div style={{ fontSize: isMobile ? 12 : 13, color: t.txt, lineHeight: 1.65, marginTop: -6, marginBottom: 12 }}>
            Em <b>{mesLabel(periodoRef)}</b> o frete deixou <b style={{ color: t.verde }}>{money(gestao.atual.freteSaldo)}</b> de saldo;
            a diária custou <b style={{ color: t.danger }}>{money(gestao.atual.diariaPaga)}</b> e voltou <b style={{ color: t.azul }}>{money(gestao.atual.diariaEmitida)}</b> em CTe.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
            {[
              { rot: "Frete", val: gestao.atual.freteSaldo, sub: `${gestao.atual.nFrete} CTes · saldo sobre ${money(gestao.atual.fretePeso)}`, cor: t.verde, sinal: "" },
              { rot: "Diária paga (D01/D05)", val: -gestao.atual.diariaPaga, sub: `${gestao.atual.nPaga} CTes · pago ao motorista na hora`, cor: t.danger, sinal: "−" },
              { rot: "Diária emitida", val: gestao.atual.diariaEmitida, sub: `${gestao.atual.nEmitida} CTes · 100% de margem`, cor: t.azul, sinal: "" },
            ].map((k) => (
              <div key={k.rot} style={{ background: t.card2, borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${k.cor}` }}>
                <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 6 }}>{k.rot}</div>
                <div style={{ fontSize: isMobile ? 18 : 21, fontWeight: 800, color: k.cor, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                  {k.sinal}{money(Math.abs(k.val))}
                </div>
                <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Recuperação da diária: o CTe emitido quase sempre cai no mês seguinte
              ao pagamento, então o número do mês isolado engana — o acumulado não. */}
          {(gestao.pagoAcum > 0 || gestao.emitAcum > 0) && (() => {
            const pct = gestao.pagoAcum > 0 ? (gestao.emitAcum / gestao.pagoAcum) * 100 : 0;
            const cor = pct >= 95 ? t.verde : pct >= 70 ? t.warn : t.danger;
            const label = [...gestao.meses].reverse().map(m => mesLabel(m.mes)).join(" + ");
            return (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${hexRgb(t.borda, .35)}` }}>
                {/* "R$ X de cada R$ 100" em vez de percentual: a gestão lê sem traduzir. */}
                <div style={{ fontSize: isMobile ? 13 : 14.5, color: t.txt, lineHeight: 1.5, marginBottom: 9 }}>
                  De cada <b>R$ 100,00</b> de diária paga, voltaram <b style={{ color: cor }}>{money(pct)}</b> em CTe.
                </div>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: hexRgb(t.danger, .25) }}>
                  <div style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />
                </div>
                <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 7, lineHeight: 1.55 }}>
                  Últimos 3 meses ({label}) · pagou {money(gestao.pagoAcum)} · emitiu {money(gestao.emitAcum)}
                  {gestao.emitAcum < gestao.pagoAcum && <> · faltam <b style={{ color: t.txt }}>{money(gestao.pagoAcum - gestao.emitAcum)}</b> em CTe</>}
                  <br />
                  A leitura é do acumulado porque o CTe da diária sai no mês seguinte ao pagamento — o mês sozinho sempre parece pior do que é.
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Base de comissão: saldo do relatório de fretes − débitos do mês, por base. */}
      {comissao.linhas.length > 0 && (
        <div style={{ ...card, marginBottom: 14 }}>
          {sectionHead(`Base de comissão · ${mesLabel(periodoRef)}`, (
            <span style={{ fontSize: 10.5, color: t.txt2 }}>saldo dos fretes − débitos do mês</span>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 7px" }}>
            <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Base</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Saldo fretes</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Débitos</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Comissionável</span>
          </div>

          {comissao.linhas.map((l) => (
            <div key={l.base} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: t.txt }}>
                {l.label}
                {!l.temDespesa && (
                  <Badge variant="warning" size="sm" pill  style={{ marginLeft: 7 }}>
                    DÉBITOS NÃO IMPORTADOS
                  </Badge>
                )}
              </span>
              <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.txt }}>{money(l.saldo)}</span>
              <span title={l.recup ? `Inclui ${money(Math.abs(l.recup))} de recuperação (sinistro, avaria, venda)` : ""}
                style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                  color: l.despesa > 0 ? t.danger : l.despesa < 0 ? t.verde : t.txt2 }}>
                {l.despesa > 0 ? `− ${money(l.despesa)}` : l.despesa < 0 ? `+ ${money(Math.abs(l.despesa))}` : "—"}
              </span>
              <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: l.base_comissao < 0 ? t.danger : t.verde }}>{money(l.base_comissao)}</span>
            </div>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 6px 2px", marginTop: 2 }}>
            <span style={{ flex: 1, fontWeight: 800, color: t.txt, textTransform: "uppercase", fontSize: 10, letterSpacing: ".04em" }}>Total</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.txt }}>{money(comissao.tot.saldo)}</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.danger }}>− {money(comissao.tot.despesa)}</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 13, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: comissao.tot.base_comissao < 0 ? t.danger : t.verde }}>{money(comissao.tot.base_comissao)}</span>
          </div>

          <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 10, lineHeight: 1.55 }}>
            {comissao.faltando.length > 0 && (
              <div style={{ color: t.warn, marginBottom: 4 }}>
                Ainda faltam os débitos de {comissao.faltando.map((l) => l.label).join(", ")} em {mesLabel(periodoRef)} — até importar, o comissionável dessa(s) base(s) está sem o desconto.
              </div>
            )}
            {/* Crédito maior que débito faz a despesa virar negativa e SOMAR no comissionável.
                É o critério correto, mas não pode passar despercebido num mês de sinistro. */}
            {comissao.linhas.filter((l) => l.despesa < 0).map((l) => (
              <div key={l.base} style={{ color: t.verde, marginBottom: 4 }}>
                Em {l.label} os créditos superaram os débitos em <b>{money(Math.abs(l.despesa))}</b>, então o mês <b>soma</b> em vez de descontar
                {l.recup ? <> — {money(Math.abs(l.recup))} disso é recuperação (sinistro, avaria, venda)</> : null}.
              </div>
            ))}
            Todo crédito abate o débito — é o mesmo critério do "TOTAL DE DESPESAS" que a planilha já traz calculado.
            {clienteFiltro && <> O filtro <b>{clienteFiltro}</b> não vale aqui: o débito chega por base, não por cliente.</>}
          </div>
        </div>
      )}

      {/* KPIs por categoria */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 10, marginBottom: 14 }}>
        {["frete", "diaria_emitida", "descarga", "local", "diaria", "bonificacao"].map((c) => {
          const d = resumoCat[c];
          return (
            <KpiCard key={c} label={CATEGORIA_LABEL[c]} value={String(d.registros)}
              sub={`${money(d.fretePeso)} · margem ${d.margemMedia.toFixed(1)}%`}
              icon={hIco(ICO_CATEGORIA[c], CATEGORIA_COR[c], isMobile ? 14 : 16, 2)}
              iconTint={CATEGORIA_COR[c]}
              color={c === "frete" ? "var(--accent)" : undefined} compact={isMobile} />
          );
        })}
      </div>

      {/* Mosaico: todos os cards de resumo/revisão fluem em 2 colunas sem espaço morto */}
      <div style={masonry}>
      {/* Resumo por cliente — tabela alinhada, clique filtra por esse cliente */}
      {Object.keys(resumoCli).length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead(`Por cliente · ${mesLabel(periodoRef)}`, !incluirDiariaDescarga && (
            <Badge variant="primary" size="sm" pill>
              SÓ FRETE · sem diária/descarga
            </Badge>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 7px" }}>
            <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Cliente</span>
            <span style={{ width: 52, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>CTRCs</span>
            {!isMobile && <span style={{ width: 84, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Peso</span>}
            <span style={{ width: COL_MOEDA, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Frete</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Saldo</span>
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
              <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.txt }}>{money(d.fretePeso)}</span>
              <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>{money(d.saldo)}</span>
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
            <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.txt }}>{money(totalMes.fretePeso)}</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>{money(totalMes.saldo)}</span>
            {!isMobile && <span style={{ width: 60 }} />}
          </div>
        </div>
      )}

      {/* CTes do cliente selecionado — lista clicável que abre o modal do CTe (ver/editar) */}
      {clienteFiltro && linhasFiltradas.length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead(`CTes · ${clienteFiltro}`, (
            <Button variant="secondary" size="sm" onClick={() => setClienteFiltro("")}>
              limpar <Icon n="x" s={13} />
            </Button>
          ))}
          <div style={{ fontSize: 11, color: t.txt2, marginTop: -6, marginBottom: 10 }}>
            {linhasFiltradas.filter(ehAtivo).length} CTe(s) · saldo {money(linhasFiltradas.filter(ehAtivo).reduce((s, l) => s + saldoEfetivo(l), 0))} — clique num CTe pra ver ou editar.
            {linhasFiltradas.length !== linhasFiltradas.filter(ehAtivo).length && (
              <> · <b style={{ color: t.txt }}>{linhasFiltradas.length - linhasFiltradas.filter(ehAtivo).length}</b> fora do faturamento (substituído/cancelado)</>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto", margin: "0 -4px" }}>
            {[...linhasFiltradas]
              .sort((a, b) => String(b.data_emissao || "").localeCompare(String(a.data_emissao || "")))
              .map((p) => (
              <div key={p.id} onClick={() => abrirRevisar(p)}
                style={{ padding: "8px 6px", borderRadius: 7, borderBottom: `1px solid ${hexRgb(t.borda, .2)}`, cursor: "pointer", transition: "background .12s",
                  // Fora do faturamento (substituído/cancelado): fica esmaecido, mas continua clicável.
                  opacity: ehAtivo(p) ? 1 : .5 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.card2)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: p.margem_lucro < 0 ? t.danger : p.margem_lucro < 10 ? t.warn : t.verde }}>
                    {Number(p.margem_lucro).toFixed(1)}%
                  </span>
                  <span style={{ width: 104, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>
                    {money(saldoEfetivo(p))}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {p.data_emissao && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{p.data_emissao.split("-").reverse().join("/")}</span>}
                  {p.placa && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{p.placa}</span>}
                  {p.is_devolucao && badge(ICO_DEVOLUCAO, "FOB", t.azul)}
                  {badgesCiclo(p)}
                  {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
                  {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
                  {p.flag_sem_contrato && badge(ICO_SEM_CONTRATO, "SEM CONTRATO", t.ouro)}
                  {p.flag_duplicidade && badge(ICO_DUPLICIDADE, "DUPLICIDADE", t.danger)}
                  {p.decisao_manual && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.verde }}>
                      <Icon n="check" s={13} /> {p.decisao_manual === "sinalizar_correcao" ? "sinalizado" : (DECISAO_LABEL[p.decisao_manual] || p.decisao_manual)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evolução diária — mini-gráfico de saldo acumulado no mês + lista enxuta por dia */}
      {resumoDia.length > 0 && chartEvo && (
        <div style={{ ...tile }}>
          {sectionHead(`Evolução diária · ${mesLabel(periodoRef)}`)}

          {/* Área: curva do saldo acumulado ao longo do mês */}
          {(() => {
            const W = 320, H = 60, pad = 4;
            const n = chartEvo.pts.length;
            const range = (chartEvo.max - chartEvo.min) || 1;
            const X = (i) => n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad);
            const Y = (v) => H - pad - ((v - chartEvo.min) / range) * (H - 2 * pad);
            const line = chartEvo.pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
            const area = `${line} L${X(n - 1).toFixed(1)} ${H} L${X(0).toFixed(1)} ${H} Z`;
            const last = chartEvo.pts[n - 1];
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 4px 6px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Saldo acumulado</span>
                  <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-heading)", color: t.ouro }}>{money(chartEvo.total)}</span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="60" style={{ display: "block", overflow: "visible" }}>
                  <path d={area} fill={hexRgb(t.ouro, .13)} />
                  <path d={line} fill="none" stroke={t.ouro} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={X(n - 1)} cy={Y(last.v)} r="3" fill={t.ouro} />
                </svg>
              </div>
            );
          })()}

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 7px" }}>
            <span style={{ width: 46, fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Dia</span>
            <span style={{ width: 74, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>CTRCs</span>
            <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Frete</span>
            <span style={{ width: COL_MOEDA, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Saldo</span>
          </div>

          {[...resumoDia].reverse().map((d, i, arr) => {
            const anterior = arr[i + 1]; // arr já está em ordem decrescente (mais recente primeiro)
            const delta = anterior ? d.registros - anterior.registros : null;
            return (
              <div key={d.dia} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
                <span style={{ width: 46, flexShrink: 0, fontSize: 12, color: t.txt2, fontFamily: "var(--font-mono)" }}>
                  {(() => { const p = d.dia.split("-"); return `${p[2]}/${p[1]}`; })()}
                </span>
                <span style={{ width: 74, display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt }}>{d.registros}</span>
                  {delta !== null && delta !== 0 && <span style={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? t.verde : t.danger }}><Icon n={delta > 0 ? "chevron-up" : "chevron-down"} s={10} />{Math.abs(delta)}</span>}
                </span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.txt }}>{money(d.fretePeso)}</span>
                <span style={{ width: COL_MOEDA, textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>{money(d.saldo)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparativo com meses anteriores — mesmo intervalo de dias (01 até o dia de corte) nos 2 meses antes do selecionado */}
      {comparativo.diaCorte > 0 && (
        <div style={{ ...tile }}>
          {sectionHead(`Comparativo com meses anteriores · até dia ${comparativo.diaCorte}`)}

          {/* Totais acumulados no período — 3 meses lado a lado */}
          <div className="co-autogrid" style={{ "--col-min": "120px", gap: 8, marginBottom: 14 }}>
            {[
              { label: mesLabel(mesAnt2), d: comparativo.total2 },
              { label: mesLabel(mesAnt1), d: comparativo.total1 },
              { label: mesLabel(periodoRef), d: comparativo.totalAtual, destaque: true },
            ].map(({ label, d, destaque }) => (
              <div key={label} style={{ padding: "10px 10px", borderRadius: 9, background: destaque ? hexRgb(t.ouro, .08) : t.card2, border: `1px solid ${destaque ? hexRgb(t.ouro, .35) : t.borda}` }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-heading)", color: t.txt, lineHeight: 1 }}>{d.registros}<span style={{ fontSize: 10, fontWeight: 600, color: t.txt2 }}> CTRCs</span></div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.txt, marginTop: 4 }}>{money(d.fretePeso)}</div>
                <div style={{ fontSize: 10.5, color: t.ouro }}>saldo {money(d.saldo)}</div>
              </div>
            ))}
          </div>
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
                <Button variant={ativo ? "primary" : "secondary"} size="sm" key={nome} onClick={() => setUsuarioFiltro(ativo ? "" : nome)}>
                  {avatar(nome, 20)}
                  <b>{nome}</b> <span style={{ color: t.danger, fontWeight: 700 }}>{qtd}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Produtividade — cruza revisões feitas no período (verde) com o que ainda está pendente (vermelho) */}
      {produtividade.length > 0 && (() => {
        const maxRev = Math.max(...produtividade.map((p) => p.revisou), 1);
        return (
        <div style={{ ...tile }}>
          {sectionHead(`Produtividade · ${mesLabel(periodoRef)}`, (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>revisou × pendente</span>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {produtividade.map((p, i) => (
              <div key={p.nome}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ width: 16, textAlign: "center", fontSize: 10.5, fontWeight: 800, color: i === 0 && p.revisou > 0 ? t.ouro : t.txt2, flexShrink: 0 }}>{i + 1}º</span>
                  {avatar(p.nome, 22)}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
                  <span title="revisados" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 700, color: t.verde, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {p.revisou}
                  </span>
                  <span title="ainda pendentes" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                    background: p.pendentes ? hexRgb(t.danger, .12) : t.card2, border: `1px solid ${p.pendentes ? hexRgb(t.danger, .3) : t.borda}`, color: p.pendentes ? t.danger : t.txt2 }}>
                    {p.pendentes} pend.
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: t.card2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round(p.revisou / maxRev * 100)}%`, background: t.verde, borderRadius: 2 }} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* Recorte de mês — a fila já vem só do mês anterior + corrente; aqui você isola um deles */}
            <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 9, background: t.card2, border: `1px solid ${t.borda}` }}>
              {[["atual", "Atual", mesLabel(mesCorrenteReal)], ["anterior", "Anterior", mesLabel(mesAnteriorReal)], ["todos", "Todos", null]].map(([id, label, mes]) => (
                <Button variant={filaMes === id ? "primary" : "ghost"} size="sm" key={id} onClick={() => setFilaMes(id)}>
                  {label}
                  {mes && <span style={{ fontSize: 8.5, fontWeight: 600, opacity: .8, fontFamily: "var(--font-mono)", marginTop: 1 }}>{mes}</span>}
                </Button>
              ))}
            </div>
            {pendentesFiltrados.length > 0 && (
              <span style={{ background: "var(--chip-solid-danger)", color: "var(--color-text-inverse)", fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{pendentesFiltrados.length}</span>
            )}
            {usuarioFiltro && (
              <Button variant="primary" size="sm" onClick={() => setUsuarioFiltro("")}>
                {usuarioFiltro} <Icon n="x" s={13} />
              </Button>
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
              <span style={{ width: 104, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>
                {money(saldoEfetivo(p))}
              </span>
              <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); abrirRevisar(p); }} style={{ flexShrink: 0 }}>
                Revisar
              </Button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 5 }}>
              <Badge variant="default" size="sm" pill>{mesLabel(p.periodo_ref)}</Badge>
              <span style={{ fontSize: 10.5, color: t.txt, fontWeight: 700 }}>{userChip(p.nome_usuario || "sem usuário", 15)}</span>
              {p.placa && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{p.placa}</span>}
              {p.is_devolucao && badge(ICO_DEVOLUCAO, "DEVOLUÇÃO · FOB", t.azul)}
              {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
              {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
              {p.flag_ambigua && badge(ICO_AMBIGUO, "DESCARGA/LOCAL AMBÍGUO", t.azul)}
              {p.flag_sem_contrato && badge(ICO_SEM_CONTRATO, "SEM CONTRATO", t.ouro)}
              {p.flag_duplicidade && badge(ICO_DUPLICIDADE, "POSSÍVEL DUPLICIDADE", t.danger)}
            </div>
          </div>
        ))}
      </div>

      {/* Sinalizados para correção — saíram da fila de revisão, mas ficam visíveis até a origem ser corrigida */}
      {sinalizadosFiltrados.length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead("Sinalizados", (
            <span style={{ background: "var(--color-primary-dk)", color: "var(--color-text-inverse)", fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{sinalizadosFiltrados.length}</span>
          ))}
          <div style={{ fontSize: 11, color: t.txt2, marginTop: -6, marginBottom: 12 }}>
            Já saíram do alerta e continuam contando no total — aguardando correção na origem (exclusão/reimportação).
          </div>
          {sinalizadosFiltrados.map((p) => (
            <div key={p.id} onClick={() => abrirRevisar(p)}
              style={{ padding: "9px 6px", borderRadius: 7, borderBottom: `1px solid ${hexRgb(t.borda, .2)}`, cursor: "pointer", transition: "background .12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.card2)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.cliente} · CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria}
                </span>
                <span style={{ width: 104, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>
                  {money(saldoEfetivo(p))}
                </span>
                <Button variant="success" size="sm" onClick={(e) => { e.stopPropagation(); onDecidir(p.id, "correcao_feita", "correção confirmada"); }}
                  title="A correção na origem foi feita — sai de Sinalizados e vai para Revisados" style={{ flexShrink: 0 }}>
                  Resolução feita
                </Button>
              </div>
              <div style={{ fontSize: 10.5, color: t.ouro, marginTop: 3 }}>
                <Icon n="flag" s={11} /> sinalizado {p.revisado_em ? new Date(p.revisado_em).toLocaleDateString("pt-BR") : ""}
                {p.revisado_obs && <span style={{ color: t.txt2 }}> · “{p.revisado_obs}”</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revisados — rastro de auditoria: itens já decididos, com quem revisou, qual decisão e quando */}
      {revisados.length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead("Revisados", (
            <span style={{ background: hexRgb(t.verde, .15), color: t.verde, fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20, border: `1px solid ${hexRgb(t.verde, .3)}` }}>{revisados.length}</span>
          ))}
          <div style={{ fontSize: 11, color: t.txt2, marginTop: -6, marginBottom: 12 }}>
            Já saíram da fila com uma decisão — fica registrado quem revisou e quando.
          </div>
          {revisados.map((p) => (
            <div key={p.id} onClick={() => abrirRevisar(p)}
              style={{ padding: "9px 6px", borderRadius: 7, borderBottom: `1px solid ${hexRgb(t.borda, .2)}`, cursor: "pointer", transition: "background .12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.card2)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.cliente} · CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria}
                </span>
                <span style={{ width: 104, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: t.ouro }}>
                  {money(saldoEfetivo(p))}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: t.verde }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {DECISAO_LABEL[p.decisao_manual] || p.decisao_manual}
                </span>
                <span style={{ fontSize: 10.5, color: t.txt, fontWeight: 700 }}>{userChip(p.revisado_por || "sem registro", 15)}</span>
                <span style={{ fontSize: 10, color: t.txt2 }}>{p.revisado_em ? new Date(p.revisado_em).toLocaleDateString("pt-BR") : ""}</span>
                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onEstornar(p); }} title="Estornar esta decisão e devolver à fila" style={{ marginLeft: "auto" }}>
                  <Icon n="undo" s={13} /> Estornar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Modal: pré-visualização antes de gravar */}
      {preview && (() => {
        const cnpjsDesconhecidos = Object.values(preview.desconhecidos || {});
        // Clientes-alvo elegíveis pra receber uma devolução (exclui as próprias regras de devolução).
        const clientesAlvo = Object.values(clientesMap).filter((c) => c.tipo !== "devolucao").sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
        const clientesNoArquivo = Object.entries(resumoPorCliente(preview.linhas));
        const opcoesEmpresa = [
          { v: "ignorar", l: "Ignorar" },
          { v: "frete", l: "Frete" },
          { v: "descarga_local", l: "Descarga/Local" },
          { v: "diaria", l: "Diária" },
        ];
        return (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 600, width: "90vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>Confirmar importação</div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 14 }}>{preview.fileName}</div>

            {clientesNoArquivo.length > 0 && (
              <div style={{ borderRadius: 9, background: "rgba(2,192,118,.08)", border: `1px solid ${hexRgb(t.verde, .27)}`, marginBottom: 12, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: t.txt2, marginBottom: 6 }}>
                  {preview.periodosEncontrados?.length > 1
                    ? `${preview.periodosEncontrados.length} meses: ${mesLabel(preview.periodosEncontrados[0])} até ${mesLabel(preview.periodoRef)}`
                    : `competência ${mesLabel(preview.periodoRef)}`}
                </div>
                {clientesNoArquivo.map(([nome, d]) => (
                  <div key={nome} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                    <span style={{ fontWeight: 700, color: t.txt }}>{nome}</span>
                    <span style={{ color: t.txt2 }}>{d.registros} registros · {money(d.fretePeso)}</span>
                  </div>
                ))}
              </div>
            )}

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
                <Icon n="alert" s={13} /> {preview.naoClassificadas.length} linha(s) com código de Empresa fora do mapeamento (cliente conhecido, mas o código não bate com Frete/Descarga/Local/Diária cadastrados) — não serão importadas.
              </div>
            )}

            {cnpjsDesconhecidos.map((d) => {
              const form = formsDesconhecidos[d.cnpj] || { nome: "", razao_social: "", base_id: "", cidade: "", uf: "", mapEmpresa: {} };
              return (
                <div key={d.cnpj} style={{ marginTop: 12, borderRadius: 10, border: `1.5px solid ${hexRgb(t.warn, .4)}`, background: hexRgb(t.warn, .06), padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.txt, marginBottom: 2 }}>CNPJ não cadastrado: {d.cnpj}</div>
                  <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 10 }}>{d.qtd} linha(s) neste arquivo — cadastre a embarcadora, marque como devolução (FOB) de um cliente, ou ignore essas linhas.</div>

                  {/* Modo: embarcadora nova (CIF, cliente próprio) × devolução (FOB, fatura no cliente-alvo) */}
                  <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 9, background: t.card2, border: `1px solid ${t.borda}`, marginBottom: 10, width: "fit-content" }}>
                    {[["cadastro", "Nova embarcadora"], ["devolucao", "É devolução"]].map(([id, label]) => (
                      <Button variant={form.modo === id ? (id === "devolucao" ? "info" : "primary") : "ghost"} size="sm" key={id} onClick={() => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], modo: id } }))}>
                        {label}
                      </Button>
                    ))}
                  </div>

                  {form.modo === "devolucao" && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 5 }}>Essas linhas são devolução (FOB) — lançar no faturamento de qual cliente?</div>
                      <select value={form.devolucaoAlvo}
                        onChange={(e) => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], devolucaoAlvo: e.target.value } }))}
                        style={{ width: "100%", fontSize: 12, padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${form.devolucaoAlvo ? t.azul : t.borda}`, background: t.bg, color: t.txt }}>
                        <option value="">Escolha o cliente…</option>
                        {clientesAlvo.map((c) => <option key={c.cnpj} value={c.cnpj}>{c.nome}</option>)}
                      </select>
                    </div>
                  )}

                  {form.receitaInfo && (
                    <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 8 }}>
                      Pré-preenchido com os dados oficiais ({form.receitaInfo}){form.razao_social ? ` · ${form.razao_social}` : ""}. Ajuste o que quiser.
                    </div>
                  )}

                  {form.modo === "cadastro" && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <input value={form.nome} placeholder="Nome da embarcadora"
                      onChange={(e) => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], nome: e.target.value } }))}
                      style={{ flex: "1 1 180px", fontSize: 12, padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit" }} />
                    <select value={form.base_id}
                      onChange={(e) => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], base_id: e.target.value } }))}
                      style={{ flex: "1 1 140px", fontSize: 12, padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt }}>
                      <option value="">Sem base vinculada</option>
                      {Object.values(BASES).map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    <input value={form.cidade || ""} placeholder="Cidade de origem"
                      onChange={(e) => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], cidade: e.target.value } }))}
                      style={{ flex: "1 1 140px", fontSize: 12, padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit" }} />
                    <input value={form.uf || ""} placeholder="UF" maxLength={2}
                      onChange={(e) => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], uf: e.target.value.toUpperCase() } }))}
                      style={{ flex: "0 0 56px", fontSize: 12, padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", textTransform: "uppercase" }} />
                  </div>
                  )}

                  <div style={{ fontSize: 10, color: t.txt2, marginBottom: 4 }}>O que cada código de "Empresa" encontrado nas linhas significa:</div>
                  {Object.entries(d.empresas).map(([cod, qtd]) => (
                    <div key={cod} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ flex: 1, fontSize: 11.5, fontFamily: "var(--font-mono)", color: t.txt }}>{cod} <span style={{ color: t.txt2 }}>({qtd}x)</span></span>
                      <select value={form.mapEmpresa[cod] || "ignorar"}
                        onChange={(e) => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], mapEmpresa: { ...f[d.cnpj].mapEmpresa, [cod]: e.target.value } } }))}
                        style={{ fontSize: 11.5, padding: "4px 8px", borderRadius: 6, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt }}>
                        {opcoesEmpresa.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Button variant="secondary" size="sm" onClick={() => ignorarCnpjDesconhecido(d.cnpj)}>
                      Ignorar este CNPJ
                    </Button>
                    {form.modo === "devolucao" ? (
                      <Button variant="info" size="sm" onClick={() => salvarDevolucao(d.cnpj)} disabled={cadastrando === d.cnpj}>
                        {cadastrando === d.cnpj ? "Salvando..." : "Salvar devolução e importar"}
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => cadastrarClienteDesconhecido(d.cnpj)} disabled={cadastrando === d.cnpj}>
                        {cadastrando === d.cnpj ? "Cadastrando..." : "Cadastrar e importar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {cnpjsDesconhecidos.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 10.5, color: t.txt2 }}>Resolva os CNPJs acima (cadastre ou ignore) pra liberar a importação.</div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="secondary" size="sm" onClick={() => setPreview(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={confirmarImportacao} disabled={importing || cnpjsDesconhecidos.length> 0}>
                {importing ? "Importando..." : "Confirmar e gravar"}
              </Button>
            </div>
          </div>
        </div>
        );
      })()}

      <ModalRelatorio aberto={relOpen} onFechar={() => setRelOpen(false)}
        titulo={`Conferência de faturamento · ${mesLabel(periodoRef)}`}
        subtitulo={[clienteFiltro || "todos os clientes", filialAtiva && filialAtiva !== "todas" ? (filialAtiva === "IMP" ? "Imperatriz" : "Belém") : null]
          .filter(Boolean).join(" · ")}
        linhas={relLinhas} colunas={relColunas} agrupavelPor={relGrupos}
        t={t} hexRgb={hexRgb} isMobile={isMobile} />

      {/* Modal: revisar item pendente (registro completo antes de decidir) */}
      {revisarModal.open && revisarModal.item && (() => {
        const p = revisarModal.item;
        const fechar = () => setRevisarModal({ open: false, item: null });
        const decidirEFechar = async (decisao, obs) => { await onDecidir(p.id, decisao, obs); fechar(); };
        const candidatoFrota = ehCandidatoFrotaRodorrica(p);
        const candidatoDiaria = ehCandidatoDiariaEmitida(p);
        // Um contrato pode cobrir mais de um CTe (duas entregas na mesma viagem). Nesse caso o
        // TMS lança o contrato inteiro num deles, e é o GRUPO que tem a margem certa.
        const grupoContrato = resumoGrupoContrato(p, universoLinhas);
        // Substituto de CTe de mês fechado tem regra própria (contrato = CTe sem ICMS, pra dar
        // baixa e não virar lucro de novo) — o aviso genérico de contrato zerado daria o
        // conselho errado aqui, então sai de cena.
        const subsMesFechado = substituicaoDeMesFechado(p, universoLinhas);
        // Transbordo: dois contratos no mesmo CTe porque a carga trocou de veículo. Um deles
        // será cancelado no TMS depois da descarga — até lá o Saldo pode vir descontando os dois.
        const transbordo = analiseTransbordo(p, contratosMes);
        const transbordoDecidido = !!p.transbordo_em;
        const semContrato = ehFreteSemContrato(p) && !contratoEstaNoIrmao(p, universoLinhas)
          && !p.contrato_ref && !subsMesFechado;
        // Vínculo de contrato: só faz sentido em frete (descarga/diária não têm contrato de
        // terceiro). Candidatos vêm do relatório de contratos já importado.
        const podeVincularContrato = p.categoria === "frete";
        const candContratos = podeVincularContrato ? candidatosContratoDoCte(p, contratosMes) : [];
        const contratoDoCte = numeroContratoDoCte(p);
        const contratoImportado = contratoDoCte
          ? contratosMes.find((c) => String(c.contrato) === contratoDoCte
              && String(c.empresa_emissao).toUpperCase() === String(p.empresa_cod || "").toUpperCase())
          : null;
        const ehDiariaEmit = p.categoria === "diaria_emitida";
        const ehDiariaPaga = p.categoria === "diaria";
        const temCompetencia = ehDiariaEmit || ehDiariaPaga;
        const atalhos = [
          ...(candidatoFrota ? ["Frota Rodorrica — desconto padrão de R$ 300"] : []),
          ...(semContrato ? ["Contrato conferido: esse frete não tem custo de terceiro"] : []),
          ...OBS_ATALHOS,
        ];
        const campo = (l, v) => (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
            <span style={{ color: t.txt2 }}>{l}</span>
            <span style={{ color: t.txt, fontWeight: 600, textAlign: "right" }}>{v || "—"}</span>
          </div>
        );
        // Par rótulo-em-cima/valor-embaixo: cabe lado a lado na grade. O campo()
        // acima gasta uma LINHA inteira por dado, e a maioria deles (placa, peso,
        // data, %) é curta — o modal ficava com meia largura vazia.
        const par = (l, v, mono) => (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".07em", color: t.txt2, marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: t.txt, fontFamily: mono ? "var(--font-mono)" : "inherit", overflowWrap: "anywhere" }}>{v || "—"}</div>
          </div>
        );
        const bloco = (titulo, filhos, colMin) => (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".09em", color: t.txt2, fontWeight: 700, marginBottom: 6 }}>{titulo}</div>
            <div className="co-autogrid" style={{ "--col-min": colMin, gap: 10 }}>{filhos}</div>
          </div>
        );
        // Edição admin (migration 036): inputs + selects. setF atualiza um campo do form.
        const setF = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));
        const inpStyle = { padding: "6px 9px", fontSize: 12, borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none", width: "100%", minWidth: 0 };
        const editRow = (label, k, type = "text") => (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <span style={{ color: t.txt2, fontSize: 12, width: 128, flexShrink: 0 }}>{label}</span>
            <input type={type} value={editForm?.[k] ?? ""} onChange={(e) => setF(k, e.target.value)}
              step={type === "number" ? "0.01" : undefined} style={inpStyle} />
          </div>
        );
        const selRow = (label, k, opcoes) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <span style={{ color: t.txt2, fontSize: 12, width: 128, flexShrink: 0 }}>{label}</span>
            <select value={editForm?.[k] ?? ""} onChange={(e) => setF(k, e.target.value)} style={{ ...inpStyle, cursor: "pointer" }}>
              {opcoes.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        );
        return (
          <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 560, width: "90vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 2 }}>{p.cliente} · CTRC {p.ctrc}</div>
              <div style={{ fontSize: 11, color: t.txt, fontWeight: 700, marginBottom: 10 }}>{userChip(p.nome_usuario || "sem usuário na planilha", 16)}</div>

              <div style={{ marginBottom: 12 }}>
                {p.is_devolucao && badge(ICO_DEVOLUCAO, "DEVOLUÇÃO · FOB", t.azul)}
                {p.categoria_manual && badge(ICO_CATEGORIA_MANUAL, "CATEGORIA DEFINIDA À MÃO", t.verde)}
                {badgesCiclo(p)}
                {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
                {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
                {p.flag_ambigua && badge(ICO_AMBIGUO, "DESCARGA/LOCAL AMBÍGUO", t.azul)}
                {p.flag_sem_contrato && badge(ICO_SEM_CONTRATO, "SEM CONTRATO", t.ouro)}
                {grupoContrato && badge(ICO_COMPLEMENTAR, `CONTRATO ${grupoContrato.numero_contrato} · ${grupoContrato.qtd} CTES`, t.azul)}
                {transbordoDecidido && badge(ICO_TRANSBORDO, temTransbordo(p) ? "TRANSBORDO AJUSTADO" : "TRANSBORDO CONFERIDO", t.verde)}
                {transbordo && !transbordoDecidido && badge(ICO_TRANSBORDO, "TRANSBORDO · 2 CONTRATOS", t.warn)}
                {p.flag_duplicidade && badge(ICO_DUPLICIDADE, "POSSÍVEL DUPLICIDADE", t.danger)}
                {candidatoFrota && badge(ICO_FROTA, "POSSÍVEL FROTA RODORRICA", t.azul)}
              </div>

              {!editando && (<>
                {/* ROTA em destaque: a sigla do TMS (6 letras) não diz nada sozinha.
                    Origem e destino saem do de-para de trechos, não de coluna gravada. */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", marginBottom: 12,
                              borderRadius: 10, border: `1px solid ${hexRgb(t.azul, .3)}`, background: hexRgb(t.azul, .07) }}>
                  <Icon n="map-pin" s={15} c={t.azul} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.txt }}>{trechoOrigem(p.trecho) || "origem não mapeada"}</span>
                    <Icon n="arrow-right" s={13} c={t.txt2} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.txt }}>{trechoDestino(p.trecho) || "destino não mapeado"}</span>
                  </div>
                  <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: t.txt2 }}>{p.trecho || "—"}</span>
                  {trechoKm(p.trecho) > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.azul, fontFamily: "var(--font-mono)" }}>{trechoKm(p.trecho)} km</span>
                  )}
                </div>

                {bloco("Lançamento", <>
                  {par("Categoria",    CATEGORIA_LABEL[p.categoria] || p.categoria)}
                  {par("Modalidade",   p.is_devolucao ? "FOB (devolução)" : (p.modalidade || "CIF"))}
                  {par("Data emissão", p.data_emissao, true)}
                  {par("Placa",        p.placa, true)}
                  {par("Empresa",      p.empresa_cod, true)}
                  {par("NFS",          p.nfs, true)}
                  {par("Nº Manifesto", p.numero_manifesto, true)}
                  {par("Nº Contrato",  p.numero_contrato, true)}
                </>, "128px")}

                {bloco("Valores", <>
                  {par("Valor NF",       money(p.valor_nf), true)}
                  {par("Peso NF",        pesoFmt(p.peso_nf), true)}
                  {par("Frete Peso",     money(p.frete_peso), true)}
                  {par("Total do Frete", money(p.total_frete), true)}
                  {par("Contrato Frete", money(p.valor_contrato_frete), true)}
                  {/* Com transbordo ajustado o Saldo da tela não é mais o do relatório: os dois
                      aparecem lado a lado pra conferência com o TMS continuar possível. */}
                  {par(temTransbordo(p) ? "Saldo (TMS)" : "Saldo", money(p.saldo), true)}
                  {temTransbordo(p) && par("Saldo ajustado", money(saldoEfetivo(p)), true)}
                </>, "130px")}

                {/* Margem sozinha: é o número que decide a conferência. */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 12,
                              padding: "9px 12px", borderRadius: 10, border: `1px solid ${t.borda}` }}>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: t.txt2, fontWeight: 700 }}>Margem de lucro</span>
                  <span style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-mono)",
                                 color: p.flag_negativa ? t.danger : p.flag_baixa ? t.warn : t.verde }}>
                    {Number(p.margem_lucro).toFixed(2)}%
                  </span>
                </div>
              </>)}

              {/* Edição admin — corrigir lançamento (ex.: FOB/CIF, categoria, valores).
                  Margem e flags são recalculadas ao salvar. */}
              {editando && editForm && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 10.5, color: t.ouro, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", margin: "2px 0 8px" }}>Editando (admin) · margem/flags recalculam ao salvar</div>
                  {/* Cliente = pagador. Escolher da lista de embarcadoras já traz a base junto
                      (essencial no FOB, onde o pagador é o destinatário). Aceita digitar também. */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                    <span style={{ color: t.txt2, fontSize: 12, width: 128, flexShrink: 0 }}>Cliente (pagador)</span>
                    <input list="emb-destinos" value={editForm.cliente ?? ""}
                      onChange={(e) => { const v = e.target.value; const emb = embarcadorasOpc.find((o) => o.nome.toLowerCase() === v.toLowerCase()); setEditForm((f) => ({ ...f, cliente: v, ...(emb ? { base_id: emb.base_id } : {}) })); }}
                      style={inpStyle} />
                    <datalist id="emb-destinos">{embarcadorasOpc.map((o) => <option key={o.nome} value={o.nome} />)}</datalist>
                  </div>
                  {selRow("Base", "base_id", basesOpc)}
                  {selRow("Categoria", "categoria", [{ v: "frete", l: "Frete" }, { v: "descarga", l: "Descarga" }, { v: "local", l: "Local" }, { v: "diaria", l: "Diária" }, { v: "bonificacao", l: "Bonificação" }])}
                  {selRow("Modalidade", "modalidade", [{ v: "CIF", l: "CIF" }, { v: "FOB", l: "FOB (devolução)" }])}
                  {editForm.modalidade === "FOB" && (
                    <div style={{ fontSize: 10.5, color: t.azul, padding: "2px 0 6px", lineHeight: 1.45 }}>
                      FOB: o pagador é o <b>destinatário</b>. Confira o <b>Cliente</b> acima (ex.: Suzano Belem) — a base acompanha.
                    </div>
                  )}
                  {editRow("CTRC", "ctrc")}
                  {editRow("Empresa (código)", "empresa_cod")}
                  {editRow("Placa", "placa")}
                  {editRow("Data emissão", "data_emissao", "date")}
                  {editRow("Trecho", "trecho")}
                  {editRow("NFS", "nfs")}
                  {editRow("Valor NF", "valor_nf", "number")}
                  {editRow("Peso NF", "peso_nf", "number")}
                  {editRow("Frete Peso", "frete_peso", "number")}
                  {editRow("Total do Frete", "total_frete", "number")}
                  {editRow("Valor Contrato Frete", "valor_contrato_frete", "number")}
                  {editRow("Saldo", "saldo", "number")}
                </div>
              )}

              {/* Decisão já registrada (quando aberto de Sinalizados/Revisados) */}
              {p.decisao_manual && (
                <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${hexRgb(t.verde, .3)}`, background: hexRgb(t.verde, .07), padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.verde, marginBottom: 3 }}>
                    Decisão: {p.decisao_manual === "sinalizar_correcao" ? "sinalizado para correção" : (DECISAO_LABEL[p.decisao_manual] || p.decisao_manual)}
                  </div>
                  <div style={{ fontSize: 10.5, color: t.txt2 }}>
                    {p.revisado_por || "sem registro"}{p.revisado_em ? ` · ${new Date(p.revisado_em).toLocaleDateString("pt-BR")}` : ""}
                    {p.revisado_obs ? ` · “${p.revisado_obs}”` : ""}
                  </div>
                </div>
              )}

              {/* Contrato que cobre mais de um CTe: mostra a conta do GRUPO, que é a real.
                  Sem isso o CTe que ficou com contrato zerado parece margem 100% e o que
                  recebeu o contrato inteiro parece prejuízo. */}
              {grupoContrato && !editando && !revisando && !sinalizando && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${hexRgb(t.borda, .4)}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8 }}>
                    Contrato {grupoContrato.numero_contrato} · {grupoContrato.qtd} CTes
                  </div>
                  <div style={{ borderRadius: 10, border: `1px solid ${hexRgb(t.azul, .3)}`, background: hexRgb(t.azul, .07), padding: "10px 12px" }}>
                    <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.6 }}>
                      Este contrato cobre os CTes <b>{grupoContrato.ctes.join(" + ")}</b> (mesma viagem, entregas
                      diferentes). O TMS lança o contrato inteiro em um deles, então a margem só fecha somando os dois:
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 11.5 }}>
                      <span style={{ color: t.txt2 }}>Frete <b style={{ color: t.txt }}>{money(grupoContrato.totalFrete)}</b></span>
                      <span style={{ color: t.txt2 }}>Contrato <b style={{ color: t.txt }}>{money(grupoContrato.contrato)}</b></span>
                      <span style={{ color: t.txt2 }}>Saldo <b style={{ color: t.ouro }}>{money(grupoContrato.saldo)}</b></span>
                      <span style={{ color: t.txt2 }}>Margem <b style={{ color: grupoContrato.margem < 10 ? t.warn : t.verde }}>{grupoContrato.margem.toFixed(1)}%</b></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transbordo (migration 078): a carga trocou de veículo, o TMS obrigou a emitir um
                  contrato NOVO e um dos dois é cancelado depois da descarga. Enquanto isso não
                  acontece o Saldo pode vir descontando os dois — aqui se escolhe qual vale. */}
              {(transbordo || transbordoDecidido) && !editando && !revisando && !sinalizando && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${hexRgb(t.borda, .4)}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8 }}>
                    Transbordo · dois contratos no mesmo CTe
                  </div>

                  {transbordoDecidido ? (
                    <div style={{ borderRadius: 10, border: `1px solid ${hexRgb(t.verde, .3)}`, background: hexRgb(t.verde, .07), padding: "10px 12px" }}>
                      <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.6 }}>
                        Contrato válido <b>{p.transbordo_contrato_valido || "—"}</b> · a cancelar no TMS{" "}
                        <b>{p.transbordo_contrato_descartado || "o duplicado"}</b>
                      </div>
                      <div style={{ fontSize: 11, color: t.txt2, marginTop: 4 }}>
                        {temTransbordo(p)
                          ? <>Saldo do TMS {money(p.saldo)} + estorno {money(p.transbordo_estorno)} ={" "}
                              <b style={{ color: t.ouro }}>{money(saldoEfetivo(p))}</b>
                              {Number(p.frete_peso) > 0 && <> · margem {Number(p.margem_lucro).toFixed(1)}%</>}</>
                          : <>Saldo do TMS já descontava um contrato só — nada foi estornado.</>}
                      </div>
                      <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 4 }}>
                        {p.transbordo_por || "sem registro"}
                        {p.transbordo_em ? ` · ${new Date(p.transbordo_em).toLocaleDateString("pt-BR")}` : ""}
                        {temTransbordo(p) ? " · o ajuste cai sozinho quando o TMS corrigir e o mês for reimportado" : ""}
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => onLimparTransbordo(p)} disabled={salvandoTransbordo} style={{ marginTop: 9 }}>
                        <Icon n="undo" s={13} /> Desfazer ajuste
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.55, marginBottom: 8 }}>
                        {transbordo.motivo === "relatorio"
                          ? <>O relatório de contratos traz <b>{transbordo.contratos.length} contratos</b> apontando este CTe — típico de transbordo, em que o TMS obriga a emitir contrato novo pro segundo veículo.</>
                          : transbordo.motivo === "coluna_dobrada"
                          ? <>A coluna <b>Valor Contrato Frete</b> ({money(p.valor_contrato_frete)}) passou do <b>Total do Frete</b> ({money(p.total_frete)}): o TMS somou dois contratos no mesmo CTe.</>
                          : <>O TMS descontou <b>{money(transbordo.deducao)}</b> deste CTe — o contrato de {money(p.valor_contrato_frete)} entrou <b>duas vezes</b>, embora a coluna mostre um só.</>}
                        {" "}Escolha qual contrato vale; o outro fica registrado pra cancelar no TMS.
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        {(transbordo.contratos.length > 1
                          ? transbordo.contratos.map((c) => ({
                              valido: String(c.contrato),
                              descartado: transbordo.contratos.filter((o) => o !== c).map((o) => String(o.contrato)).join(", "),
                              valorValido: Number(c.valor) || 0,
                              valorDescartado: transbordo.contratos.filter((o) => o !== c).reduce((s, o) => s + (Number(o.valor) || 0), 0),
                              info: `${c.nome_agregado || "sem agregado"} · ${c.veiculo || "sem placa"}${c.data_emissao ? ` · ${c.data_emissao.split("-").reverse().join("/")}` : ""}`,
                            }))
                          : [{ valido: transbordo.sugestao.valido, descartado: null,
                               valorValido: transbordo.sugestao.valorValido, valorDescartado: transbordo.sugestao.valorDescartado,
                               info: "o segundo lançamento não está no relatório de contratos importado" }]
                        ).map((op) => {
                          const estorno = estornoTransbordo(p, op.valorValido, op.valorDescartado);
                          const novoSaldo = (Number(p.saldo) || 0) + estorno;
                          const novaMargem = Number(p.frete_peso) > 0 ? (novoSaldo / Number(p.frete_peso)) * 100 : 0;
                          // Cartão clicável, não Button: o ds-btn é de altura fixa e nowrap, e a
                          // explicação de cada opção tem duas linhas — dentro do botão ela vazava
                          // pra fora do modal.
                          return (
                            <div key={op.valido || "unico"}
                              {...(salvandoTransbordo ? {} : clickable(() => onMarcarTransbordo(p, op.valido, op.descartado, estorno)))}
                              style={{ borderRadius: 10, border: `1px solid ${hexRgb(t.verde, .35)}`, background: hexRgb(t.verde, .07),
                                       padding: "9px 11px", cursor: salvandoTransbordo ? "default" : "pointer",
                                       opacity: salvandoTransbordo ? .6 : 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: t.txt, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                                Contrato {op.valido || "do TMS"} vale ({money(op.valorValido)})
                                {op.descartado && <> · cancelar {op.descartado}</>}
                              </div>
                              <div style={{ fontSize: 11, color: t.txt2, marginTop: 3, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                                {estorno
                                  ? <>estorna <b style={{ color: t.ouro }}>{money(estorno)}</b> → saldo {money(novoSaldo)} · margem {novaMargem.toFixed(1)}%</>
                                  : <>Saldo do TMS não muda ({money(p.saldo)})</>}
                              </div>
                              <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 2, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                                {op.info}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ fontSize: 10.5, color: t.txt2, lineHeight: 1.5 }}>
                        O Saldo do TMS não é reescrito: o estorno fica ao lado e some sozinho quando o contrato
                        for cancelado no TMS e o mês for reimportado.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Competência da diária (migrations 053/054), nas duas pontas: o D01/D05 sai antes
                  ou depois do espelho (um mês de pagamento pode se referir a dois meses de
                  espelho) e o CTe que cobra sai depois, podendo cobrar o mês inteiro. O card
                  frete × diária lê a linha no mês marcado aqui, não no mês do documento. */}
              {temCompetencia && !editando && !revisando && !sinalizando && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${hexRgb(t.borda, .4)}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8 }}>
                    Competência da diária
                  </div>
                  <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5, marginBottom: 8 }}>
                    {ehDiariaPaga
                      ? <>Pagamento referente ao espelho de <b>{mesLabel(mesCompetencia(p))}</b></>
                      : <>Cobra as diárias pagas em <b>{mesLabel(mesCompetencia(p))}</b></>}
                    {p.competencia_ref ? "" : " (mês do documento — sem competência definida)"}.
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="month" value={compRef} onChange={(e) => setCompRef(e.target.value)}
                      style={{ padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" }} />
                    <Button variant="secondary" size="sm" onClick={() => setCompRef(shiftMes(p.periodo_ref, -1))}>
                      mês anterior ({mesLabel(shiftMes(p.periodo_ref, -1))})
                    </Button>
                    {/* O D01/D05 também sai ANTES do espelho, então o pago precisa do atalho pro
                        mês seguinte; a emitida, por definição, cobra o que já foi pago. */}
                    {ehDiariaPaga && (
                      <Button variant="secondary" size="sm" onClick={() => setCompRef(shiftMes(p.periodo_ref, 1))}>
                        mês seguinte ({mesLabel(shiftMes(p.periodo_ref, 1))})
                      </Button>
                    )}
                    <Button variant="primary" size="sm" onClick={() => onCompetencia(p, compRef)} disabled={salvandoVinc || !compRef || compRef === (p.competencia_ref || "")}>
                      {salvandoVinc ? "Salvando..." : "Salvar competência"}
                    </Button>
                    {p.competencia_ref && (
                      <Button variant="secondary" size="sm" onClick={() => onCompetencia(p, null)} disabled={salvandoVinc}>
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Ciclo de vida do CTe (migration 048) — substituição / cancelamento / complementar.
                  Substituição e cancelamento tiram valor do faturamento; complementar só linka. */}
              {!editando && !revisando && !sinalizando && (() => {
                const vinculado = (p.tipo_doc && p.tipo_doc !== "normal") || !ehAtivo(p);
                const obrigaCtrc = vincTipo === "substituto" || vincTipo === "complementar";
                const labelVinc = {
                  substituto: "Este CTe SUBSTITUI o CTRC:",
                  complementar: ehDiariaEmit ? "Este CTe COBRA a diária paga no CTRC (D01/D05):" : "Este CTe é COMPLEMENTAR do CTRC:",
                  cancelado: "Este CTe foi CANCELADO. Refeito no CTRC (opcional):",
                }[vincTipo];
                const btn = (label, cor, onClick) => (
                  <Button variant="ghost" size="sm" onClick={onClick} disabled={salvandoVinc}>
                    {label}
                  </Button>
                );
                return (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${hexRgb(t.borda, .4)}` }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8 }}>
                      Ciclo de vida do CTe
                    </div>

                    {vinculado ? (
                      <div style={{ borderRadius: 10, border: `1px solid ${hexRgb(t.azul, .3)}`, background: hexRgb(t.azul, .07), padding: "10px 12px" }}>
                        <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5 }}>
                          {p.status_doc === "substituido" ? <>Substituído pelo CTRC <b>{p.ctrc_ref || "?"}</b> — <b>fora dos totais</b>.</>
                            : p.status_doc === "cancelado" ? <>Cancelado{p.ctrc_ref ? <> (refeito no CTRC <b>{p.ctrc_ref}</b>)</> : ""} — <b>fora dos totais</b>.</>
                            : p.tipo_doc === "substituto" ? <>Substitui o CTRC <b>{p.ctrc_ref}</b>, que saiu dos totais. Este continua faturando.</>
                            : p.categoria === "diaria_emitida" ? <>Cobra a diária paga no CTRC <b>{p.ctrc_ref}</b> (D01/D05) — lá está o custo, aqui a receita; os dois continuam nos totais.</>
                            : <>Complementar do CTRC <b>{p.ctrc_ref}</b> — os dois somam no faturamento.</>}
                        </div>
                        <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 4 }}>
                          {p.vinculo_por || "sem registro"}{p.vinculo_em ? ` · ${new Date(p.vinculo_em).toLocaleDateString("pt-BR")}` : ""}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => onVincular(p, "normal")} disabled={salvandoVinc} style={{ marginTop: 9 }}>
                          <Icon n="undo" s={13} /> Desfazer vínculo
                        </Button>
                      </div>
                    ) : vincTipo ? (
                      <div>
                        <div style={{ fontSize: 11.5, color: t.txt, marginBottom: 7 }}>{labelVinc}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <input value={vincCtrc} onChange={(e) => setVincCtrc(e.target.value)} autoFocus placeholder="nº do CTRC"
                            onKeyDown={(e) => { if (e.key === "Enter" && (!obrigaCtrc || vincCtrc.trim())) onVincular(p, vincTipo, vincCtrc.trim()); }}
                            style={{ width: 140, padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "var(--font-mono)", outline: "none" }} />
                          <Button variant="primary" size="sm" onClick={() => onVincular(p, vincTipo, vincCtrc.trim())} disabled={salvandoVinc || (obrigaCtrc && !vincCtrc.trim())}>
                            {salvandoVinc ? "Salvando..." : "Confirmar"}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => { setVincTipo(null); setVincCtrc(""); }}><Icon n="x" s={13} /></Button>
                        </div>
                        {/* Sugestões: mesmo cliente/categoria com a mesma NF ou o mesmo valor — é onde
                            o par costuma estar. Só atalho de digitação; quem decide é quem revisa. */}
                        {/* Diária emitida sem NENHUMA diária paga do cliente nos meses carregados:
                            o custo não está na base (planilha sem o D01/D05 do mês, ou pago em
                            outro código). Sem isso a pessoa fica procurando um par que não existe. */}
                        {ehDiariaEmit && candidatosDoCTe.length === 0 && (
                          <div style={{ marginTop: 8, fontSize: 10.5, color: t.warn, lineHeight: 1.5 }}>
                            Nenhuma diária paga ({p.cliente?.includes("BELEM") ? "D05" : "D01"}) deste cliente nos meses carregados —
                            o custo desta cobrança não está na base. Confira se a planilha do mês trouxe as linhas da diária.
                          </div>
                        )}
                        {candidatosDoCTe.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 5 }}>
                              {ehDiariaEmit ? "Diárias pagas (D01/D05) deste cliente — mesma placa/valor primeiro:" : "Candidatos (mesma NF ou mesmo valor):"}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {candidatosDoCTe.slice(0, 6).map((c) => (
                                <Button variant={String(c.ctrc) === vincCtrc.trim() ? "info" : "secondary"} size="sm" key={c.id} onClick={() => setVincCtrc(String(c.ctrc))}>
                                  {c.ctrc} · {money(c.total_frete)}{c.data_emissao ? ` · ${c.data_emissao.split("-").reverse().join("/")}` : ""}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {btn("Substitui outro CTe", t.azul, () => { setVincCtrc(""); setVincTipo("substituto"); })}
                          {btn(ehDiariaEmit ? "Cobra uma diária paga (D01)" : "É complementar", t.verde, () => { setVincCtrc(""); setVincTipo("complementar"); })}
                          {btn("Foi cancelado", t.danger, () => { setVincCtrc(""); setVincTipo("cancelado"); })}
                        </div>
                        <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 7, lineHeight: 1.45 }}>
                          Substituição e cancelamento tiram o CTe anulado dos totais (ele continua aqui, esmaecido).
                          {ehDiariaEmit
                            ? " O vínculo da diária emitida aponta o CTe D01/D05 onde o motorista foi pago — os dois seguem nos totais (lá o custo, aqui a receita)."
                            : " Complementar mantém os dois somando — original + complementar."}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Duplicidade: dizer COM QUAL CTe é o conflito já aqui — antes o modal só
                  mostrava o badge e o botão, sem identificar o par. */}
              {/* MESMO CTRC, mesmo mês, categoria diferente = quase sempre cópia criada por
                  reimportação depois de alguém ter definido a categoria à mão (o caso do
                  CTRC 2591 lançado como Bonificação e reimportado como Local). */}
              {(() => {
                const copias = universoLinhas.filter((l) => l.id !== p.id
                  && String(l.ctrc) === String(p.ctrc) && l.periodo_ref === p.periodo_ref
                  && l.cnpj_remetente === p.cnpj_remetente && l.categoria !== p.categoria);
                if (!copias.length) return null;
                return (
                  <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${hexRgb(t.warn, .35)}`, background: hexRgb(t.warn, .08), padding: "10px 12px" }}>
                    <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5 }}>
                      O <b>mesmo CTRC {p.ctrc}</b> também está lançado em {copias.length === 1 ? "outra categoria" : "outras categorias"} neste mês.
                      Uma das linhas costuma ser cópia criada por reimportação — abra e exclua a que estiver errada.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 9 }}>
                      {copias.map((o) => (
                        <Button variant="secondary" size="sm" key={o.id} onClick={() => abrirRevisar(o)} style={{ width: "100%" }}>
                          <b>{CATEGORIA_LABEL[o.categoria] || o.categoria}</b>
                          {o.categoria_manual && <Badge variant="success" size="sm" pill>DEFINIDA À MÃO</Badge>}
                          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700, color: t.ouro }}>{money(o.saldo)}</span>
                          <span style={{ color: t.azul, fontWeight: 700, fontSize: 10.5 }}>abrir ›</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Aparece quando ESTE CTe está marcado, ou quando o par dele está — assim os
                  dois lados do conflito mostram a mesma informação. Não inventa duplicidade
                  nova onde a importação não marcou nada. */}
              {(p.flag_duplicidade || paresDup(p).some((o) => o.flag_duplicidade)) && (() => {
                const pares = paresDup(p);
                return (
                  <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${hexRgb(t.danger, .3)}`, background: hexRgb(t.danger, .07), padding: "10px 12px" }}>
                    <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5 }}>
                      {pares.length ? (<>
                        Mesma <b>placa, valor NF, peso, trecho e total do frete</b> {pares.length === 1 ? "do CTe abaixo" : "dos CTes abaixo"}.
                        Pode ser o mesmo transporte lançado 2x — ou um CTe que substituiu o outro. Clique pra abrir e conferir:
                      </>) : buscandoPar ? (<>Procurando o par nos meses vizinhos…</>) : (<>
                        Não achei nenhum outro CTe com esses mesmos valores (procurei de {mesLabel(shiftMes(p.periodo_ref || String(p.data_emissao || "").slice(0, 7), -3))} a {mesLabel(shiftMes(p.periodo_ref || String(p.data_emissao || "").slice(0, 7), 3))}).
                        O par provavelmente foi excluído — a marca de duplicidade ficou órfã e este CTe pode ser revisado normalmente.
                      </>)}
                    </div>

                    {/* Cada par é um botão: abre o CTe pra conferir sem sair da conferência. */}
                    {pares.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 9 }}>
                        {pares.map((o) => (
                          <Button variant="secondary" size="sm" key={o.id} onClick={() => abrirRevisar(o)} style={{ width: "100%" }}>
                            <b>CTRC {o.ctrc}</b>
                            <span style={{ color: t.txt2 }}>{CATEGORIA_LABEL[o.categoria] || o.categoria}</span>
                            {o.data_emissao && <span style={{ color: t.txt2, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{o.data_emissao.split("-").reverse().join("/")}</span>}
                            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700, color: t.ouro }}>{money(o.saldo)}</span>
                            <span style={{ color: t.azul, fontWeight: 700, fontSize: 10.5 }}>abrir ›</span>
                          </Button>
                        ))}
                        <Button variant="danger-ghost" size="sm" onClick={() => { setDupModal({ open: true, origem: p }); fechar(); }} style={{ width: "100%" }}>
                          Comparar os {pares.length + 1} lado a lado
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Regra da frota Rodorrica: contrato = CTe − R$ 300 fixos, então margem baixa é
                  esperada. A planilha não diz de quem é a frota — quem revisa confirma aqui. */}
              {candidatoFrota && !revisando && !sinalizando && (
                <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${hexRgb(t.azul, .35)}`, background: hexRgb(t.azul, .08), padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5 }}>
                    Saldo de exatamente <b>R$ 300,00</b>. Pela regra da frota Rodorrica o Contrato é o CTe menos R$ 300 — nesse caso a margem baixa é esperada, não é erro. Este CTRC é frota?
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Button variant="info" size="sm" onClick={() => decidirEFechar("frota_rodorrica", "frota Rodorrica — contrato = CTe − R$ 300 (regra padrão)")}>
                      Sim, é frota Rodorrica
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setRevisando(true)}>
                      Não é frota — revisar
                    </Button>
                  </div>
                </div>
              )}

              {/* Margem 100% dentro do teto da diária, mas a régua não fechou (tem NF ou
                  valor quebrado). Um clique resolve em vez de mandar pro modo edição. */}
              {candidatoDiaria && !revisando && !sinalizando && !editando && (
                <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${hexRgb(t.verde, .35)}`, background: hexRgb(t.verde, .08), padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5 }}>
                    Este CTe tem <b>100% de margem</b> ({money(p.frete_peso)} de CTe, contrato zerado) — o formato de uma <b>diária emitida</b>, que é a cobrança da diária já paga ao motorista no CTe D01. Mas {String(p.nfs || "").trim() ? "ele tem nota fiscal" : "o valor não é redondo"}, então pode ser um frete comum com o contrato esquecido. Qual é?
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Button variant="success" size="sm" onClick={() => marcarDiariaEmitida(p)} disabled={salvandoEdit}>
                      É diária emitida
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => decidirEFechar("ok", "frete comum — contrato não preenchido na planilha")}>
                      É frete — contrato faltando
                    </Button>
                  </div>
                </div>
              )}

              {/* Substituição de CTe de mês FECHADO: o faturamento do documento antigo já entrou
                  no fechamento e na comissão daquele mês. Se o substituto entrar com contrato
                  zerado, o saldo dele vira lucro de novo — o mesmo dinheiro contado duas vezes.
                  O contrato tem que ser o CTe SEM ICMS, pra dar baixa e fechar em zero. */}
              {subsMesFechado && !editando && !revisando && !sinalizando && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${hexRgb(t.borda, .4)}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8 }}>
                    Substituição de mês fechado
                  </div>
                  <div style={{ borderRadius: 10, border: `1px solid ${hexRgb(subsMesFechado.ok ? t.verde : t.ouro, .35)}`, background: hexRgb(subsMesFechado.ok ? t.verde : t.ouro, .08), padding: "10px 12px" }}>
                    {subsMesFechado.ok ? (
                      <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.6 }}>
                        Contrato de baixa lançado certo: <b>{money(subsMesFechado.contratoBaixa)}</b> (o CTe sem ICMS),
                        saldo zerado. Este CTe substitui o CTRC <b>{subsMesFechado.ctrc_ref}</b>
                        {subsMesFechado.mesPar ? ` de ${mesLabel(subsMesFechado.mesPar)}` : " de mês anterior"} e
                        não entra como lucro deste mês — o faturamento já foi comissionado lá atrás.
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.6 }}>
                          Este CTe substitui o CTRC <b>{subsMesFechado.ctrc_ref}</b>
                          {subsMesFechado.mesPar ? ` de ${mesLabel(subsMesFechado.mesPar)}` : ", de um mês que não está na base"} —
                          mês já fechado, cujo faturamento entrou na base de comissão. Com contrato zerado, o saldo de{" "}
                          <b>{money(p.saldo)}</b> volta a contar como lucro agora, ou seja, o mesmo dinheiro duas vezes.
                        </div>
                        <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.6, marginTop: 6 }}>
                          Lançar no TMS o contrato de <b style={{ color: t.ouro }}>{money(subsMesFechado.contratoBaixa)}</b>{" "}
                          — o CTe ({money(p.total_frete)}) menos o ICMS ({money(subsMesFechado.icms)}). Assim ele só dá baixa e fecha com saldo zero.
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <Button variant="primary" size="sm" onClick={() => { setSinalObs(`substituição do CTRC ${subsMesFechado.ctrc_ref} (mês fechado): lançar contrato de ${money(subsMesFechado.contratoBaixa)} — CTe sem ICMS — pra dar baixa sem virar lucro`); setSinalizando(true); }}>
                            Sinalizar pra lançar a baixa
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Contrato do CTe (migration 058). O TMS às vezes emite o CTe sem amarrar no
                  contrato: aqui dá pra apontar qual é, escolhendo entre os contratos já
                  importados (o próprio relatório de contratos costuma apontar o CTe de volta,
                  e quando nem isso vem, placa/valor/data resolvem). */}
              {podeVincularContrato && (p.contrato_ref || contratoImportado || vincContrato.aberto) && !editando && !revisando && !sinalizando && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${hexRgb(t.borda, .4)}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8 }}>
                    Contrato do CTe
                  </div>

                  {contratoImportado ? (
                    <div style={{ borderRadius: 10, border: `1px solid ${hexRgb(t.verde, .3)}`, background: hexRgb(t.verde, .07), padding: "10px 12px" }}>
                      <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.6 }}>
                        Contrato <b>{contratoImportado.contrato}</b> · {contratoImportado.nome_agregado || "sem agregado"}
                        {contratoImportado.eh_pf ? " (pessoa física)" : " (PJ)"} · valor <b>{money(contratoImportado.valor)}</b>
                        {p.contrato_ref && <> · <span style={{ color: t.verde }}>vinculado à mão</span></>}
                      </div>
                      <div style={{ fontSize: 11, color: t.txt2, marginTop: 4 }}>
                        Frete do CTe {money(p.total_frete)} − contrato {money(contratoImportado.valor)} ={" "}
                        <b style={{ color: t.ouro }}>{money((Number(p.total_frete) || 0) - (Number(contratoImportado.valor) || 0))}</b>
                        {Number(p.frete_peso) > 0 && <> · margem real {((((Number(p.total_frete) || 0) - (Number(contratoImportado.valor) || 0)) / Number(p.frete_peso)) * 100).toFixed(1)}%</>}
                      </div>
                      {p.contrato_ref && (
                        <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 4 }}>
                          {p.contrato_vinculo_por || "sem registro"}
                          {p.contrato_vinculo_em ? ` · ${new Date(p.contrato_vinculo_em).toLocaleDateString("pt-BR")}` : ""}
                        </div>
                      )}
                      {p.contrato_ref && (
                        <Button variant="secondary" size="sm" onClick={() => onVincularContrato(p, null)} disabled={salvandoContrato} style={{ marginTop: 9 }}>
                          <Icon n="undo" s={13} /> Desfazer vínculo
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5, marginBottom: 8 }}>
                        {candContratos.length
                          ? "Contratos do relatório que combinam com este CTe (mesmo CTRC apontado, placa, valor ou data):"
                          : "Nenhum contrato importado combina com este CTe. Digite o número se souber qual é."}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        {/* Cartão clicável, não Button: o ds-btn tem altura fixa e nowrap, e estas
                            duas linhas (agregado, placa, trecho, data) vazavam pra fora do modal. */}
                        {candContratos.slice(0, 5).map((c) => (
                          <div key={c.id || c.contrato}
                            {...(salvandoContrato ? {} : clickable(() => onVincularContrato(p, String(c.contrato))))}
                            style={{ borderRadius: 10, border: `1px solid ${hexRgb(t.verde, .35)}`, background: hexRgb(t.verde, .07),
                                     padding: "9px 11px", cursor: salvandoContrato ? "default" : "pointer", opacity: salvandoContrato ? .6 : 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: t.txt, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                              Contrato {c.contrato} · {money(c.valor)}
                              {String(c.cte_ctrc) === String(p.ctrc) && <span style={{ color: t.verde, fontWeight: 600, fontSize: 10.5 }}> · aponta este CTe</span>}
                            </div>
                            <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 2, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                              {c.nome_agregado || "sem agregado"} · {c.veiculo || "sem placa"} · {c.trecho || "—"}
                              {c.data_emissao ? ` · ${c.data_emissao.split("-").reverse().join("/")}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <input value={vincContrato.num} onChange={(e) => setVincContrato((v) => ({ ...v, num: e.target.value }))}
                          placeholder="nº do contrato"
                          onKeyDown={(e) => { if (e.key === "Enter" && vincContrato.num.trim()) onVincularContrato(p, vincContrato.num.trim()); }}
                          style={{ width: 150, padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "var(--font-mono)", outline: "none" }} />
                        <Button variant="primary" size="sm" onClick={() => onVincularContrato(p, vincContrato.num.trim())} disabled={salvandoContrato || !vincContrato.num.trim()}>
                          {salvandoContrato ? "Salvando..." : "Vincular"}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setVincContrato({ aberto: false, num: "" })}><Icon n="x" s={13} /></Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Frete com Valor Contrato Frete = 0 (migration 052): o Saldo vira o CTe inteiro
                  e infla a margem do mês. Normalmente é contrato ainda não lançado no TMS —
                  quem revisa confirma. Não aparece junto do bloco da diária emitida (acima),
                  que já trata o mesmo sintoma com teto de R$ 5.000. */}
              {semContrato && !candidatoDiaria && !revisando && !sinalizando && !editando && (
                <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${hexRgb(t.ouro, .35)}`, background: hexRgb(t.ouro, .08), padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5 }}>
                    Frete com <b>contrato zerado</b>: o Saldo virou o CTe inteiro ({money(p.saldo)}) e a margem foi pra {Number(p.margem_lucro).toFixed(1)}%, inflando o resultado do mês. Em geral é contrato de terceiro ainda não lançado no TMS. É isso?
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Button variant="primary" size="sm" onClick={() => setSinalizando(true)}>
                      Falta lançar o contrato
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => decidirEFechar("ok", "frete sem custo de terceiro — contrato zerado conferido")}>
                      Não tem contrato mesmo
                    </Button>
                  </div>
                </div>
              )}

              {revisando && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: t.txt2, marginBottom: 6 }}>Justifique o que foi verificado/feito (obrigatório):</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {atalhos.map((a) => (
                      <Button variant={revisObs === a ? "info" : "secondary"} size="sm" key={a} onClick={() => setRevisObs(a)}>
                        {a}
                      </Button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={revisObs} onChange={(e) => setRevisObs(e.target.value)} autoFocus
                      placeholder="O que foi verificado? (ex.: conferido com o contrato do cliente)"
                      onKeyDown={(e) => { if (e.key === "Enter" && revisObs.trim()) decidirEFechar("ok", revisObs.trim()); }}
                      style={{ flex: 1, minWidth: 0, padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" }} />
                    <Button variant="primary" size="sm" onClick={() => decidirEFechar("ok", revisObs.trim())} disabled={!revisObs.trim()}>
                      Confirmar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => { setRevisando(false); setRevisObs(""); }}><Icon n="x" s={13} /></Button>
                  </div>
                </div>
              )}

              {sinalizando && (
                <div style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <input value={sinalObs} onChange={(e) => setSinalObs(e.target.value)} autoFocus
                    placeholder="O que precisa ser corrigido? (ex.: linha duplicada, excluir a de menor valor)"
                    onKeyDown={(e) => { if (e.key === "Enter") decidirEFechar("sinalizar_correcao", sinalObs.trim() || null); }}
                    style={{ flex: 1, minWidth: 0, padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" }} />
                  <Button variant="primary" size="sm" onClick={() => decidirEFechar("sinalizar_correcao", sinalObs.trim() || null)}>
                    Confirmar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setSinalizando(false); setSinalObs(""); }}><Icon n="x" s={13} /></Button>
                </div>
              )}

              {/* Rodapé: linha própria, separada do conteúdo, com tudo encostado à direita e
                  alinhado no centro vertical (o traço divisor precisa disso). */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center",
                marginTop: 18, paddingTop: 14, borderTop: `1px solid ${hexRgb(t.borda, .45)}` }}>
                {editando ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => { setEditando(false); setEditForm(null); }} disabled={salvandoEdit}>
                      Cancelar
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => salvarEdicao(p)} disabled={salvandoEdit}>
                      {salvandoEdit ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Barra única encostada à direita, do menos pro mais importante: primeiro
                        o que mexe no REGISTRO (fechar/editar/excluir/estornar), um traço, e
                        então a DECISÃO da conferência, com o primário por último. Ancorar um
                        grupo à esquerda e outro à direita deixava as duas linhas em cantos
                        opostos quando o rodapé quebrava. */}
                      <Button variant="secondary" size="sm" onClick={fechar}>
                        Fechar
                      </Button>
                      {isAdmin && !sinalizando && !revisando && (
                        <Button variant="info-outline" size="sm" onClick={() => abrirEdicao(p)} title="Corrigir este CTe (só admin)">
                          <Icon n="edit" s={12} /> Editar
                        </Button>
                      )}
                      {isAdmin && !sinalizando && !revisando && (
                        <Button variant="danger-ghost" size="sm" onClick={() => onExcluir(p)} title="Apaga só ESTA linha da conferência (ex.: cópia criada por reimportação)">
                          <Icon n="trash" s={13} /> Excluir CTe
                        </Button>
                      )}
                      {p.decisao_manual && !sinalizando && !revisando && (
                        <Button variant="danger-ghost" size="sm" onClick={() => { fechar(); onEstornar(p); }} title="Remover a decisão e devolver à fila (se ainda tiver flag)">
                          <Icon n="undo" s={13} /> Estornar decisão
                        </Button>
                      )}
                      {/* Traço separando manutenção do registro × decisão da conferência. Some
                          quando não sobra nenhuma decisão à direita (modo "revisando"). */}
                      {!revisando && (
                        <span aria-hidden style={{ width: 1, alignSelf: "stretch", minHeight: 22, background: hexRgb(t.borda, .7), margin: "0 2px" }} />
                      )}
                      {podeVincularContrato && !sinalizando && !revisando && (
                        <Button variant="success-outline" size="sm" onClick={() => setVincContrato((v) => ({ ...v, aberto: !v.aberto }))}
                          title="Apontar o contrato que o TMS não amarrou neste CTe">
                          <Icon n="link" s={13} /> Vincular contrato
                        </Button>
                      )}
                      {p.flag_ambigua && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => decidirEFechar("confirmar_descarga", "revisado manualmente")}>
                            É Descarga
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => decidirEFechar("confirmar_local", "revisado manualmente")}>
                            É Local
                          </Button>
                        </>
                      )}
                      {!sinalizando && !revisando && (
                        <Button variant="outline" size="sm" onClick={() => setSinalizando(true)}>
                          Sinalizar para correção
                        </Button>
                      )}
                      {!revisando && (
                        <Button variant="primary" size="sm" onClick={() => { setSinalizando(false); setRevisando(true); }}>
                          Marcar revisado
                        </Button>
                      )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: grupo de duplicidade — comparação lado a lado.
          Antes listava só os itens da fila (quase sempre 1) e mostrava 3 valores, sem dizer
          qual documento era nem no que os dois diferiam. Agora: o que é IGUAL (a chave que
          disparou o alerta) em cima, e os CTes em colunas com TODOS os campos, destacando em
          dourado o que difere — é o que dá certeza se é duplicidade, substituição ou 2 fretes. */}
      {/* Trecho pendente — abre pelo próprio aviso, resolve ali e a tela recalcula.
          Grava na tabela `trechos`, que vale para todo o histórico (não copia para a linha). */}
      {trechoModal && (
        <div onClick={() => setTrechoModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 320, maxWidth: 520, width: "92vw", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>
              Trecho <span style={{ fontFamily: "var(--font-mono)", color: t.ouro }}>{trechoModal.codigo}</span>
              {trechoModal.linhas > 0 ? ` · ${trechoModal.linhas} linha(s) no período` : ""}
            </div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 14, lineHeight: 1.5 }}>
              A sigla do TMS são 3 letras da praça de origem + 3 do destino. O que for salvo aqui
              vale para <b style={{ color: t.txt }}>todo o histórico</b>, sem reimportar planilha.
              {trechoModal.sugerido && <> Origem e destino abaixo vieram das praças que os outros trechos já conhecem — <b style={{ color: t.ouro }}>confira antes de salvar</b>.</>}
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              {[["Origem", "origem", "Cidade de origem"], ["Destino", "destino", "Cidade de destino (com UF quando houver homônima: CONDE - BA)"]].map(([label, campo, ph]) => (
                <label key={campo} style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)", marginBottom: 4 }}>{label}</span>
                  <input value={trechoModal[campo]} placeholder={ph} autoFocus={campo === "origem"}
                    onChange={(e) => setTrechoModal((m) => ({ ...m, [campo]: e.target.value.toUpperCase() }))}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", textTransform: "uppercase" }} />
                </label>
              ))}
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)", marginBottom: 4 }}>KM (opcional)</span>
                <input value={trechoModal.km} placeholder="deixe em branco para medir a rota automaticamente" inputMode="numeric"
                  onChange={(e) => setTrechoModal((m) => ({ ...m, km: e.target.value.replace(/\D/g, "") }))}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit" }} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setTrechoModal(null)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={onSalvarTrecho}
                disabled={salvandoTrecho || !trechoModal.origem.trim() || !trechoModal.destino.trim()}>
                {salvandoTrecho ? "Salvando..." : "Salvar trecho"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {dupModal.open && (() => {
        const g = grupoDup;
        const base = g[0] || {};
        const difere = (k) => new Set(g.map((x) => String(x[k] ?? ""))).size > 1;
        const CAMPOS = [
          ["Categoria", "categoria", (d) => CATEGORIA_LABEL[d.categoria] || d.categoria],
          ["Data emissão", "data_emissao", (d) => d.data_emissao ? d.data_emissao.split("-").reverse().join("/") : "—"],
          ["Competência", "periodo_ref", (d) => mesLabel(d.periodo_ref)],
          ["Empresa (cód.)", "empresa_cod", (d) => d.empresa_cod || "—"],
          ["NFS", "nfs", (d) => d.nfs || "—"],
          ["Nº Manifesto", "numero_manifesto", (d) => d.numero_manifesto || "—"],
          ["Nº Contrato", "numero_contrato", (d) => d.numero_contrato || "—"],
          ["Frete Peso", "frete_peso", (d) => money(d.frete_peso)],
          ["Contrato", "valor_contrato_frete", (d) => money(d.valor_contrato_frete)],
          ["Saldo", "saldo", (d) => money(d.saldo)],
          ["Margem", "margem_lucro", (d) => Number(d.margem_lucro).toFixed(2) + "%"],
        ];
        const IGUAIS = [
          ["Placa", base.placa || "—"],
          ["Trecho", [base.trecho, trechoRota(base.trecho)].filter(Boolean).join(" · ") || "—"],
          ["Valor NF", money(base.valor_nf)], ["Peso NF", pesoFmt(base.peso_nf)],
          ["Total do Frete", money(base.total_frete)],
        ];
        return (
        <div onClick={() => setDupModal({ open: false, origem: null })} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "24px 24px 20px", minWidth: 340, maxWidth: 760, width: "92vw", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.txt, marginBottom: 4 }}>
              Possível duplicidade de valor · {g.length} CTe(s){base.cliente ? ` · ${base.cliente}` : ""}
            </div>
            <div style={{ fontSize: 11, color: t.txt2, marginBottom: 12, lineHeight: 1.5 }}>
              Estes CTRCs têm <b style={{ color: t.txt }}>placa, valor NF, peso, trecho e total do frete idênticos</b>.
              Pode ser o mesmo transporte lançado 2x, um CTe que substituiu o outro, ou 2 fretes reais iguais.
              Em <b style={{ color: t.ouro }}>dourado</b>, o que difere entre eles.
            </div>

            {/* O que é igual — a chave que disparou o alerta */}
            <div style={{ borderRadius: 10, border: `1px solid ${hexRgb(t.borda, .5)}`, background: t.card2, padding: "10px 12px", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)", marginBottom: 6 }}>Igual em todos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>
                {IGUAIS.map(([l, v]) => (
                  <span key={l} style={{ fontSize: 11.5, color: t.txt2 }}>{l}: <b style={{ color: t.txt }}>{v}</b></span>
                ))}
              </div>
            </div>

            {/* Um card por CTe, lado a lado */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile || g.length === 1 ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 12 }}>
              {g.map((d) => {
                const outro = g.length === 2 ? g.find((x) => x.id !== d.id) : null;
                const esteId = d.id === dupModal.origem?.id;
                return (
                  <div key={d.id} style={{ borderRadius: 12, border: `1.5px solid ${esteId ? hexRgb(t.ouro, .5) : t.borda}`, background: t.bg, padding: "12px 13px", opacity: ehAtivo(d) ? 1 : .55 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: t.txt }}>CTRC {d.ctrc}</span>
                      {esteId && <Badge variant="primary" size="sm" pill>ESTE</Badge>}
                    </div>
                    <div style={{ fontSize: 10.5, color: t.txt, fontWeight: 700, marginBottom: 7 }}>{userChip(d.nome_usuario || "sem usuário na planilha", 15)}</div>
                    <div style={{ marginBottom: 7 }}>
                      {d.is_devolucao && badge(ICO_DEVOLUCAO, "FOB", t.azul)}
                      {badgesCiclo(d)}
                      {d.decisao_manual && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: t.verde }}><Icon n="check" s={13} /> {DECISAO_LABEL[d.decisao_manual] || d.decisao_manual}</span>
                      )}
                    </div>

                    {CAMPOS.map(([label, k, fmt]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, padding: "4px 0", borderBottom: `1px solid ${hexRgb(t.borda, .18)}` }}>
                        <span style={{ color: t.txt2 }}>{label}</span>
                        <span style={{ textAlign: "right", fontWeight: difere(k) ? 800 : 600, color: difere(k) ? t.ouro : t.txt }}>{fmt(d)}</span>
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      <Button variant="secondary" size="sm" onClick={() => { setDupModal({ open: false, origem: null }); abrirRevisar(d); }}
                        title="Abrir o CTe completo (editar, sinalizar, vincular)">
                        Abrir CTe
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => onDecidir(d.id, "confirmar_ambas", "confirmado — não é duplicidade real")}
                        title="Os dois lançamentos existem de verdade — tira este da fila sem mexer nos valores">
                        São 2 lançamentos reais
                      </Button>
                      {outro && ehAtivo(d) && ehAtivo(outro) && (
                        <Button variant="info-outline" size="sm" onClick={() => onVincular(d, "substituto", outro.ctrc, outro.id)} disabled={salvandoVinc}
                          title={`Marca este como substituto do CTRC ${outro.ctrc} — o outro sai do faturamento`}>
                          Este substitui o {outro.ctrc}
                        </Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => onDecidir(d.id, "ignorar_duplicidade", "marcado como lançamento errado")}
                        title="Marca este como lançamento errado na fila (não exclui a linha nem muda os totais)">
                        É duplicidade — este está errado
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 12, lineHeight: 1.45 }}>
              “É duplicidade” só marca a linha na fila (nada sai dos totais). Se um CTe realmente
              anulou o outro, use <b style={{ color: t.azul }}>Este substitui o …</b> — aí o antigo sai do faturamento.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <Button variant="secondary" size="sm" onClick={() => setDupModal({ open: false, origem: null })}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
