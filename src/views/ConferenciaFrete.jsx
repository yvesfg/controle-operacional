import React from "react";
import ReactDOM from "react-dom";
import useModalEsc from "../hooks/useModalEsc.js";
import {
  parseFreteXLSX, diffImportFrete, inserirFrete, listarPendentesRevisao, listarSinalizados,
  decidir, estornarRevisao, listarTodosPeriodo, resumoPorCategoria, resumoPorCliente, resumoPorDia, gerarWorkbookXLSX,
  classificarLinhasCliente, recalcularFlagsEPeriodo, ehCandidatoFrotaRodorrica, clienteEfetivo,
  editarFrete, recalcularLinhaEditada,
} from "../freteConferencia.js";
import { consultarCNPJ, nomeSugerido } from "../receitaCnpj.js";
import useEmbarcadoras from "../hooks/useEmbarcadoras.js";
import KpiCard from "../components/KpiCard.jsx";
import { BASES } from "../constants.js";

// Conferência de Faturamento — planilhas BRUTAS de faturamento (TMS/ERP), fonte
// DIFERENTE do operacional (Google Sheets). Segmento dentro de Resultado.jsx.
// Fluxo: sobe a planilha -> classifica por cliente (CNPJ) -> mostra resumo pra
// confirmar -> grava -> fila de revisão (margem negativa/baixa/ambígua/duplicidade).

const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pesoFmt = (n) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " kg";
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };
// Desloca um "YYYY-MM" por N meses (negativo = pro passado) — usado no comparativo com meses anteriores.
const shiftMes = (m, delta) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const CATEGORIA_LABEL = { frete: "Frete", descarga: "Descarga", local: "Local", diaria: "Diária" };
// Cor de sistema por categoria — realça o badge do ícone no KPI (frete = accent, e cores distintas nas demais).
const CATEGORIA_COR = { frete: "var(--accent)", descarga: "var(--color-info)", local: "var(--cyan)", diaria: "var(--yellow)" };
// Rótulo humano de cada decisão possível na fila (exceto sinalizar_correcao, que tem seção própria).
const DECISAO_LABEL = {
  ok: "sem ação necessária",
  confirmar_descarga: "confirmado: Descarga",
  confirmar_local: "confirmado: Local",
  confirmar_ambas: "2 lançamentos reais",
  ignorar_duplicidade: "duplicidade ignorada",
  correcao_feita: "correção feita",
  frota_rodorrica: "frota Rodorrica (contrato = CTe − R$ 300)",
};

// Justificativas prontas do "Marcar revisado" — os motivos que mais se repetem na fila.
// A de frota só aparece quando a linha é candidata (ver ehCandidatoFrotaRodorrica).
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

// Ícones dos KPIs por categoria — mesma linguagem do Dashboard (hIco, 24x24 stroke).
const ICO_CATEGORIA = {
  frete:   <><rect x="1" y="3" width="15" height="13" rx="2" /><path d="m16 8 4 2 3 3v4h-7" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  descarga:<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  local:   <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  diaria:  <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
};

export default function ConferenciaFrete({ ctx, conn }) {
  const { t, isMobile, showToast, hexRgb, usuarioLogado, perfil, css, hIco, filaSlot } = ctx;
  const isAdmin = perfil === "admin";

  const [periodoRef, setPeriodoRef] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [clienteFiltro, setClienteFiltro] = React.useState(""); // "" = todos os clientes
  const [usuarioFiltro, setUsuarioFiltro] = React.useState(""); // "" = todos os usuários (nome_usuario da planilha)
  const [filaMes, setFilaMes] = React.useState("todos"); // "todos" | "atual" | "anterior" — recorte de mês da fila de revisão
  const [cliOpen, setCliOpen] = React.useState(false);   // dropdown custom de cliente aberto
  const [linhasPeriodo, setLinhasPeriodo] = React.useState([]);
  const [linhasComparativo, setLinhasComparativo] = React.useState({}); // { "2026-06": [...], "2026-05": [...] }
  const [pendentes, setPendentes] = React.useState([]);
  const [sinalizados, setSinalizados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef(null);
  const [preview, setPreview] = React.useState(null); // { periodoRef, periodosEncontrados, linhas, naoClassificadas, desconhecidos, resumo }
  const [formsDesconhecidos, setFormsDesconhecidos] = React.useState({}); // { [cnpj]: { nome, base_id, mapEmpresa: {codigo: categoria} } }
  const [cadastrando, setCadastrando] = React.useState(null); // cnpj em processo de cadastro (spinner do botão)
  const [dupModal, setDupModal] = React.useState({ open: false, chave: null });
  const [revisarModal, setRevisarModal] = React.useState({ open: false, item: null });
  const [sinalizando, setSinalizando] = React.useState(false);
  const [sinalObs, setSinalObs] = React.useState("");
  const [revisando, setRevisando] = React.useState(false);   // "Marcar revisado" clicado: campo de justificativa aberto
  const [revisObs, setRevisObs] = React.useState("");
  const [editando, setEditando] = React.useState(false);     // modo edição admin do CTe (modal)
  const [editForm, setEditForm] = React.useState(null);
  const [salvandoEdit, setSalvandoEdit] = React.useState(false);

  useModalEsc(!!preview, () => setPreview(null));
  useModalEsc(dupModal.open, () => setDupModal({ open: false, chave: null }));
  useModalEsc(revisarModal.open, () => setRevisarModal({ open: false, item: null }));

  const abrirRevisar = (p) => {
    setSinalizando(false); setSinalObs("");
    setRevisando(false); setRevisObs("");
    setEditando(false); setEditForm(null);
    setRevisarModal({ open: true, item: p });
  };

  // Abre o modo edição admin: inicializa o formulário a partir do CTe.
  const abrirEdicao = (p) => {
    setEditForm({
      cliente: p.cliente ?? "", categoria: p.categoria ?? "frete",
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
  const salvarEdicao = async (id) => {
    setSalvandoEdit(true);
    try {
      const nums = ["valor_nf", "peso_nf", "frete_peso", "total_frete", "valor_contrato_frete", "saldo"];
      const patch = { ...editForm };
      nums.forEach((k) => { patch[k] = Number(patch[k]) || 0; });
      patch.is_devolucao = editForm.modalidade === "FOB";
      patch.modalidade = editForm.modalidade;
      Object.assign(patch, recalcularLinhaEditada(patch)); // margem_lucro + flags
      await editarFrete(conn, id, patch);
      showToast?.("CTe atualizado.", "ok");
      setEditando(false); setEditForm(null);
      setRevisarModal({ open: false, item: null });
      await carregar(); // recarrega listas/resumos do servidor (evita estado parcial)
    } catch (e) { showToast?.("Erro ao salvar edição: " + e.message, "erro"); }
    finally { setSalvandoEdit(false); }
  };

  const carregar = React.useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    const mesAnt1 = shiftMes(periodoRef, -1);
    const mesAnt2 = shiftMes(periodoRef, -2);
    try {
      const [linhas, pend, sinal, lAnt1, lAnt2] = await Promise.all([
        listarTodosPeriodo(conn, periodoRef),
        listarPendentesRevisao(conn),
        listarSinalizados(conn),
        listarTodosPeriodo(conn, mesAnt1),
        listarTodosPeriodo(conn, mesAnt2),
      ]);
      setLinhasPeriodo(linhas);
      setPendentes(pend);
      setSinalizados(sinal);
      setLinhasComparativo({ [mesAnt1]: lAnt1, [mesAnt2]: lAnt2 });
    } catch (e) { showToast?.("Erro ao carregar conferência: " + e.message, "erro"); }
    finally { setLoading(false); }
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
      const { novas, jaExistem } = await diffImportFrete(conn, preview.linhas);
      if (novas.length === 0) {
        showToast?.("Nada novo — todos os CTRCs desse período já estavam importados.", "ok");
        setPreview(null); return;
      }
      await inserirFrete(conn, novas);
      const nomesClientes = [...new Set(novas.map(l => l.cliente))];
      showToast?.(`${novas.length} registro(s) novo(s) importado(s) (${nomesClientes.join(", ")})${jaExistem ? ` — ${jaExistem} já existiam` : ""}.`, "ok");
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
        const temFlag = voltou.flag_negativa || voltou.flag_baixa || voltou.flag_ambigua || voltou.flag_duplicidade;
        return temFlag ? [voltou, ...arr] : arr;
      });
      showToast?.("Revisão estornada.", "ok");
    } catch (e) { showToast?.("Erro ao estornar: " + e.message, "erro"); }
  };

  // Clientes presentes no período (pra popular o filtro, mesmo sem estar no cadastro fixo)
  const clientesPresentes = React.useMemo(() => [...new Set(linhasPeriodo.map(l => l.cliente))].sort(), [linhasPeriodo]);

  const linhasFiltradas = React.useMemo(
    () => clienteFiltro ? linhasPeriodo.filter(l => l.cliente === clienteFiltro) : linhasPeriodo,
    [linhasPeriodo, clienteFiltro]
  );
  // Recorte de mês da fila de revisão — relativo ao mês real corrente (não ao periodoRef,
  // que controla os resumos). A fila já vem limitada a mês anterior + corrente do backend.
  const mesCorrenteReal = React.useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mesAnteriorReal = React.useMemo(() => shiftMes(mesCorrenteReal, -1), [mesCorrenteReal]);
  const filaMesRef = filaMes === "atual" ? mesCorrenteReal : filaMes === "anterior" ? mesAnteriorReal : null;

  const pendentesFiltrados = React.useMemo(() => pendentes
    .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
    .filter(p => !usuarioFiltro || (p.nome_usuario || "(sem usuário na planilha)") === usuarioFiltro)
    .filter(p => !filaMesRef || p.periodo_ref === filaMesRef),
    [pendentes, clienteFiltro, usuarioFiltro, filaMesRef]
  );
  const sinalizadosFiltrados = React.useMemo(() => sinalizados
    .filter(p => !clienteFiltro || p.cliente === clienteFiltro)
    .filter(p => !usuarioFiltro || (p.nome_usuario || "(sem usuário na planilha)") === usuarioFiltro),
    [sinalizados, clienteFiltro, usuarioFiltro]
  );

  const resumoCat = React.useMemo(() => resumoPorCategoria(linhasFiltradas), [linhasFiltradas]);
  const resumoCli = React.useMemo(() => resumoPorCliente(linhasFiltradas), [linhasFiltradas]);
  const resumoDia = React.useMemo(() => resumoPorDia(linhasFiltradas), [linhasFiltradas]);

  // Comparativo com meses anteriores — mesmo intervalo de dias (01 até o dia de corte)
  // nos 2 meses anteriores ao periodoRef selecionado. Dia de corte = hoje, se periodoRef
  // for o mês corrente; senão, o último dia com dado no próprio período (mês fechado).
  const mesAnt1 = React.useMemo(() => shiftMes(periodoRef, -1), [periodoRef]);
  const mesAnt2 = React.useMemo(() => shiftMes(periodoRef, -2), [periodoRef]);
  const comparativo = React.useMemo(() => {
    const filtrarCli = (arr) => clienteFiltro ? arr.filter(l => l.cliente === clienteFiltro) : arr;
    const resumoAnt1 = resumoPorDia(filtrarCli(linhasComparativo[mesAnt1] || []));
    const resumoAnt2 = resumoPorDia(filtrarCli(linhasComparativo[mesAnt2] || []));

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
  }, [linhasComparativo, mesAnt1, mesAnt2, periodoRef, resumoDia, clienteFiltro]);
  const totalMes = React.useMemo(() => Object.values(resumoCli).reduce((a, d) => ({
    registros: a.registros + d.registros, peso: a.peso + d.peso, fretePeso: a.fretePeso + d.fretePeso, saldo: a.saldo + d.saldo,
  }), { registros: 0, peso: 0, fretePeso: 0, saldo: 0 }), [resumoCli]);

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

  // Controles (mês + filial + ações) — vão pra faixa única do FinanceiroView via portal.
  const controles = (
    <>
        <input type="month" value={periodoRef} onChange={(e) => setPeriodoRef(e.target.value)}
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }} />
        {/* Dropdown custom — o <select> nativo abre um menu branco no tema escuro; este
            casa com o box do input de mês (mesma borda/raio/padding) e vira par visual. */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setCliOpen((o) => !o)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "space-between", minWidth: 180,
              fontSize: 13, padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              border: `1.5px solid ${cliOpen ? t.ouro : t.borda}`, background: t.card, color: t.txt }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clienteFiltro || "Todos os clientes"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: t.txt2, transform: cliOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {cliOpen && (
            <>
              <div onClick={() => setCliOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: "100%", zIndex: 41,
                background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 10, padding: 4, boxShadow: "0 8px 28px rgba(0,0,0,.4)", maxHeight: 300, overflowY: "auto" }}>
                {[["", "Todos os clientes"], ...clientesPresentes.map((c) => [c, c])].map(([v, label]) => {
                  const ativo = clienteFiltro === v;
                  return (
                    <button key={v || "__all"} onClick={() => { setClienteFiltro(v); setCliOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                        padding: "8px 10px", borderRadius: 7, cursor: "pointer", border: "none", fontFamily: "inherit", whiteSpace: "nowrap",
                        background: ativo ? hexRgb(t.ouro, .12) : "transparent", color: ativo ? t.ouro : t.txt }}
                      onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = t.card2; }}
                      onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "transparent"; }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: ativo ? 1 : 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => gerarWorkbookXLSX(linhasFiltradas, periodoRef)} disabled={!linhasFiltradas.length}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${t.borda}`, background: "transparent", color: t.txt, opacity: linhasFiltradas.length ? 1 : .5 }}>
            ⬇ Baixar planilha
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onEscolherArquivo} style={{ display: "none" }} />
          {/* Cor azul (t.azul) em vez do accent amarelo do import de despesas (Resultado/Operacional) —
              reforça visualmente que este import é de outra fonte (faturamento bruto), evitando troca. */}
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${t.azul}`, background: "transparent", color: t.azul, opacity: importing ? .6 : 1 }}>
            {importing ? "Lendo..." : "⬆ Importar planilha bruta"}
          </button>
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

      {/* KPIs por categoria */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {["frete", "descarga", "local", "diaria"].map((c) => {
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

      {/* CTes do cliente selecionado — lista clicável que abre o modal do CTe (ver/editar) */}
      {clienteFiltro && linhasFiltradas.length > 0 && (
        <div style={{ ...tile }}>
          {sectionHead(`CTes · ${clienteFiltro}`, (
            <button onClick={() => setClienteFiltro("")}
              style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 11px", borderRadius: 20, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2 }}>
              limpar ✕
            </button>
          ))}
          <div style={{ fontSize: 11, color: t.txt2, marginTop: -6, marginBottom: 10 }}>
            {linhasFiltradas.length} CTe(s) · saldo {money(linhasFiltradas.reduce((s, l) => s + (l.saldo || 0), 0))} — clique num CTe pra ver ou editar.
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto", margin: "0 -4px" }}>
            {[...linhasFiltradas]
              .sort((a, b) => String(b.data_emissao || "").localeCompare(String(a.data_emissao || "")))
              .map((p) => (
              <div key={p.id} onClick={() => abrirRevisar(p)}
                style={{ padding: "8px 6px", borderRadius: 7, borderBottom: `1px solid ${hexRgb(t.borda, .2)}`, cursor: "pointer", transition: "background .12s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.card2)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    CTRC {p.ctrc} · {CATEGORIA_LABEL[p.categoria] || p.categoria}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: p.margem_lucro < 0 ? t.danger : p.margem_lucro < 10 ? t.warn : t.verde }}>
                    {Number(p.margem_lucro).toFixed(1)}%
                  </span>
                  <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>
                    {money(p.saldo)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {p.data_emissao && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{p.data_emissao.split("-").reverse().join("/")}</span>}
                  {p.placa && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{p.placa}</span>}
                  {p.is_devolucao && badge(ICO_DEVOLUCAO, "FOB", t.azul)}
                  {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
                  {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
                  {p.flag_duplicidade && badge(ICO_DUPLICIDADE, "DUPLICIDADE", t.danger)}
                  {p.decisao_manual && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.verde }}>
                      ✓ {p.decisao_manual === "sinalizar_correcao" ? "sinalizado" : (DECISAO_LABEL[p.decisao_manual] || p.decisao_manual)}
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
            <span style={{ width: 96, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: t.txt2 }}>Saldo</span>
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
                  {delta !== null && delta !== 0 && <span style={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? t.verde : t.danger }}>{delta > 0 ? "▲" : "▼"}{Math.abs(delta)}</span>}
                </span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.txt }}>{money(d.fretePeso)}</span>
                <span style={{ width: 96, textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>{money(d.saldo)}</span>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
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
                <button key={id} onClick={() => setFilaMes(id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1, fontFamily: "inherit",
                    fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 7, cursor: "pointer", border: "none",
                    background: filaMes === id ? "var(--accent)" : "transparent",
                    color: filaMes === id ? (t.onPrimary || "#181a20") : t.txt2 }}>
                  {label}
                  {mes && <span style={{ fontSize: 8.5, fontWeight: 600, opacity: .8, fontFamily: "var(--font-mono)", marginTop: 1 }}>{mes}</span>}
                </button>
              ))}
            </div>
            {pendentesFiltrados.length > 0 && (
              <span style={{ background: "var(--chip-solid-danger)", color: "var(--color-text-inverse)", fontSize: 12, fontWeight: 700, padding: "1px 9px", borderRadius: 20 }}>{pendentesFiltrados.length}</span>
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
              <span style={{ fontSize: 9.5, fontWeight: 700, fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: 20, background: t.card2, border: `1px solid ${t.borda}`, color: t.txt2 }}>{mesLabel(p.periodo_ref)}</span>
              <span style={{ fontSize: 10.5, color: t.txt, fontWeight: 700 }}>{userChip(p.nome_usuario || "sem usuário", 15)}</span>
              {p.placa && <span style={{ fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>{p.placa}</span>}
              {p.is_devolucao && badge(ICO_DEVOLUCAO, "DEVOLUÇÃO · FOB", t.azul)}
              {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
              {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
              {p.flag_ambigua && badge(ICO_AMBIGUO, "DESCARGA/LOCAL AMBÍGUO", t.azul)}
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
                <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>
                  {money(p.saldo)}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onDecidir(p.id, "correcao_feita", "correção confirmada"); }}
                  title="A correção na origem foi feita — sai de Sinalizados e vai para Revisados"
                  style={{ fontSize: 10.5, fontWeight: 700, padding: "6px 13px", borderRadius: 7, cursor: "pointer", border: "none", background: t.verde, color: "#fff", flexShrink: 0 }}>
                  Resolução feita
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: t.ouro, marginTop: 3 }}>
                🏷 sinalizado {p.revisado_em ? new Date(p.revisado_em).toLocaleDateString("pt-BR") : ""}
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
                <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: t.ouro }}>
                  {money(p.saldo)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: t.verde }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {DECISAO_LABEL[p.decisao_manual] || p.decisao_manual}
                </span>
                <span style={{ fontSize: 10.5, color: t.txt, fontWeight: 700 }}>{userChip(p.revisado_por || "sem registro", 15)}</span>
                <span style={{ fontSize: 10, color: t.txt2 }}>{p.revisado_em ? new Date(p.revisado_em).toLocaleDateString("pt-BR") : ""}</span>
                <button onClick={(e) => { e.stopPropagation(); onEstornar(p); }} title="Estornar esta decisão e devolver à fila"
                  style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, background: hexRgb(t.danger, .08), border: `1px solid ${hexRgb(t.danger, .18)}`, borderRadius: 6, padding: "2px 9px", cursor: "pointer", fontSize: 10, fontWeight: 700, color: t.danger, fontFamily: "inherit" }}>
                  ↩ Estornar
                </button>
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
                ⚠ {preview.naoClassificadas.length} linha(s) com código de Empresa fora do mapeamento (cliente conhecido, mas o código não bate com Frete/Descarga/Local/Diária cadastrados) — não serão importadas.
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
                      <button key={id} onClick={() => setFormsDesconhecidos((f) => ({ ...f, [d.cnpj]: { ...f[d.cnpj], modo: id } }))}
                        style={{ fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", border: "none",
                          background: form.modo === id ? (id === "devolucao" ? t.azul : t.ouro) : "transparent",
                          color: form.modo === id ? (id === "devolucao" ? "#fff" : "#1a1a1a") : t.txt2 }}>
                        {label}
                      </button>
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
                    <button onClick={() => ignorarCnpjDesconhecido(d.cnpj)}
                      style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                      Ignorar este CNPJ
                    </button>
                    {form.modo === "devolucao" ? (
                      <button onClick={() => salvarDevolucao(d.cnpj)} disabled={cadastrando === d.cnpj}
                        style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: t.azul, color: "#fff", border: "none", opacity: cadastrando === d.cnpj ? .6 : 1 }}>
                        {cadastrando === d.cnpj ? "Salvando..." : "Salvar devolução e importar"}
                      </button>
                    ) : (
                      <button onClick={() => cadastrarClienteDesconhecido(d.cnpj)} disabled={cadastrando === d.cnpj}
                        style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: t.ouro, color: "#1a1a1a", border: "none", opacity: cadastrando === d.cnpj ? .6 : 1 }}>
                        {cadastrando === d.cnpj ? "Cadastrando..." : "Cadastrar e importar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {cnpjsDesconhecidos.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 10.5, color: t.txt2 }}>Resolva os CNPJs acima (cadastre ou ignore) pra liberar a importação.</div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setPreview(null)}
                style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                Cancelar
              </button>
              <button onClick={confirmarImportacao} disabled={importing || cnpjsDesconhecidos.length > 0}
                style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", opacity: (importing || cnpjsDesconhecidos.length > 0) ? .5 : 1 }}>
                {importing ? "Importando..." : "Confirmar e gravar"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal: revisar item pendente (registro completo antes de decidir) */}
      {revisarModal.open && revisarModal.item && (() => {
        const p = revisarModal.item;
        const fechar = () => setRevisarModal({ open: false, item: null });
        const decidirEFechar = async (decisao, obs) => { await onDecidir(p.id, decisao, obs); fechar(); };
        const candidatoFrota = ehCandidatoFrotaRodorrica(p);
        const atalhos = candidatoFrota ? ["Frota Rodorrica — desconto padrão de R$ 300", ...OBS_ATALHOS] : OBS_ATALHOS;
        const campo = (l, v) => (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${hexRgb(t.borda, .2)}` }}>
            <span style={{ color: t.txt2 }}>{l}</span>
            <span style={{ color: t.txt, fontWeight: 600, textAlign: "right" }}>{v || "—"}</span>
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
                {p.flag_negativa && badge(ICO_ALERTA, "MARGEM NEGATIVA", t.danger)}
                {p.flag_baixa && !p.flag_negativa && badge(ICO_ALERTA, "MARGEM < 10%", t.warn)}
                {p.flag_ambigua && badge(ICO_AMBIGUO, "DESCARGA/LOCAL AMBÍGUO", t.azul)}
                {p.flag_duplicidade && badge(ICO_DUPLICIDADE, "POSSÍVEL DUPLICIDADE", t.danger)}
                {candidatoFrota && badge(ICO_FROTA, "POSSÍVEL FROTA RODORRICA", t.azul)}
              </div>

              {!editando && (<>
                {campo("Categoria", CATEGORIA_LABEL[p.categoria] || p.categoria)}
                {campo("Modalidade", p.is_devolucao ? "FOB (devolução)" : (p.modalidade || "CIF"))}
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
              </>)}

              {/* Edição admin — corrigir lançamento (ex.: FOB/CIF, categoria, valores).
                  Margem e flags são recalculadas ao salvar. */}
              {editando && editForm && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 10.5, color: t.ouro, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", margin: "2px 0 8px" }}>Editando (admin) · margem/flags recalculam ao salvar</div>
                  {editRow("Cliente", "cliente")}
                  {selRow("Categoria", "categoria", [{ v: "frete", l: "Frete" }, { v: "descarga", l: "Descarga" }, { v: "local", l: "Local" }, { v: "diaria", l: "Diária" }])}
                  {selRow("Modalidade", "modalidade", [{ v: "CIF", l: "CIF" }, { v: "FOB", l: "FOB (devolução)" }])}
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

              {p.flag_duplicidade && (
                <button onClick={() => { setDupModal({ open: true, chave: p.dup_grupo_chave }); fechar(); }}
                  style={{ marginTop: 12, width: "100%", fontSize: 11.5, fontWeight: 700, padding: "8px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.danger}`, background: "transparent", color: t.danger }}>
                  Ver grupo de duplicidade
                </button>
              )}

              {/* Regra da frota Rodorrica: contrato = CTe − R$ 300 fixos, então margem baixa é
                  esperada. A planilha não diz de quem é a frota — quem revisa confirma aqui. */}
              {candidatoFrota && !revisando && !sinalizando && (
                <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${hexRgb(t.azul, .35)}`, background: hexRgb(t.azul, .08), padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: t.txt, lineHeight: 1.5 }}>
                    Saldo de exatamente <b>R$ 300,00</b>. Pela regra da frota Rodorrica o Contrato é o CTe menos R$ 300 — nesse caso a margem baixa é esperada, não é erro. Este CTRC é frota?
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button onClick={() => decidirEFechar("frota_rodorrica", "frota Rodorrica — contrato = CTe − R$ 300 (regra padrão)")}
                      style={{ fontSize: 11.5, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "none", background: t.azul, color: "#fff", fontFamily: "inherit" }}>
                      Sim, é frota Rodorrica
                    </button>
                    <button onClick={() => setRevisando(true)}
                      style={{ fontSize: 11.5, fontWeight: 700, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt, fontFamily: "inherit" }}>
                      Não é frota — revisar
                    </button>
                  </div>
                </div>
              )}

              {revisando && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: t.txt2, marginBottom: 6 }}>Justifique o que foi verificado/feito (obrigatório):</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {atalhos.map((a) => (
                      <button key={a} onClick={() => setRevisObs(a)}
                        style={{ fontSize: 10.5, fontWeight: 600, padding: "5px 9px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                          border: `1px solid ${revisObs === a ? t.azul : t.borda}`, background: revisObs === a ? hexRgb(t.azul, .12) : "transparent", color: revisObs === a ? t.txt : t.txt2 }}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={revisObs} onChange={(e) => setRevisObs(e.target.value)} autoFocus
                      placeholder="O que foi verificado? (ex.: conferido com o contrato do cliente)"
                      onKeyDown={(e) => { if (e.key === "Enter" && revisObs.trim()) decidirEFechar("ok", revisObs.trim()); }}
                      style={{ flex: 1, minWidth: 0, padding: "7px 10px", fontSize: 12, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" }} />
                    <button onClick={() => decidirEFechar("ok", revisObs.trim())} disabled={!revisObs.trim()}
                      style={{ fontSize: 11, fontWeight: 700, padding: "7px 13px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", whiteSpace: "nowrap", fontFamily: "inherit",
                        cursor: revisObs.trim() ? "pointer" : "not-allowed", opacity: revisObs.trim() ? 1 : .45 }}>
                      Confirmar
                    </button>
                    <button onClick={() => { setRevisando(false); setRevisObs(""); }}
                      style={{ fontSize: 11, padding: "7px 11px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2, fontFamily: "inherit" }}>✕</button>
                  </div>
                </div>
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
                {editando ? (
                  <>
                    <button onClick={() => { setEditando(false); setEditForm(null); }} disabled={salvandoEdit}
                      style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                      Cancelar
                    </button>
                    <button onClick={() => salvarEdicao(p.id)} disabled={salvandoEdit}
                      style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: salvandoEdit ? "not-allowed" : "pointer", background: "var(--accent)", color: "#fff", border: "none", opacity: salvandoEdit ? .6 : 1 }}>
                      {salvandoEdit ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={fechar}
                      style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
                      Fechar
                    </button>
                    {isAdmin && !sinalizando && !revisando && (
                      <button onClick={() => abrirEdicao(p)} title="Corrigir este CTe (só admin)"
                        style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.azul}`, background: "transparent", color: t.azul }}>
                        ✎ Editar
                      </button>
                    )}
                    {p.decisao_manual && !sinalizando && !revisando && (
                      <button onClick={() => { fechar(); onEstornar(p); }} title="Remover a decisão e devolver à fila (se ainda tiver flag)"
                        style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${hexRgb(t.danger, .4)}`, background: "transparent", color: t.danger }}>
                        ↩ Estornar decisão
                      </button>
                    )}
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
                    {!sinalizando && !revisando && (
                      <button onClick={() => setSinalizando(true)}
                        style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${t.ouro}`, background: "transparent", color: t.ouro }}>
                        Sinalizar para correção
                      </button>
                    )}
                    {!revisando && (
                      <button onClick={() => { setSinalizando(false); setRevisando(true); }}
                        style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none" }}>
                        Marcar revisado
                      </button>
                    )}
                  </>
                )}
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
