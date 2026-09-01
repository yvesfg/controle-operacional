// ── operacao/perfil.js ──
// PERFIL DE OPERAÇÃO — descreve O QUE cada base tem, em vez de espalhar
// `if (baseAtual?.id === "acailandia_avb")` pelo app inteiro.
//
// Motivo: hoje as regras de cada operação estão cravadas em ~64 pontos do código
// (App.jsx, views, hooks, validators). Toda transportadora/base nova exige caçar e
// duplicar esses `if`. Aqui a diferença entre operações vira DADO: um objeto por base
// declarando features, vocabulário e rótulos. Quem consome só pergunta "essa base tem
// diária?" em vez de "essa base é a AVB?".
//
// O embrião disso já existia em BASES (constants.js): `noDiarias`, `hasContratante`,
// `origemPadrao`. Só `noDiarias` chegou a ser lido — o resto virou `if` espalhado.
// Este módulo assume esse papel; BASES segue como mapa id→tabela.
//
// Fase 4 do plano: este arquivo vira uma tabela `co_bases` (JSONB) editável no Admin,
// e base nova passa a ser cadastro, sem deploy. Por isso o formato é JSON puro —
// sem funções, sem imports — para serializar direto quando essa hora chegar.

// Perfil base: o que vale para uma operação de transporte "comum".
// Cada base só declara o que DIVERGE daqui.
const PADRAO = {
  // Campo que identifica unicamente a viagem (âncora do upsert e das telas).
  ancora: "dt",
  // Rótulo de quem paga o frete — muda por operação (AVB chama de contratante).
  rotuloCliente: "Cliente",

  // ── Features liga/desliga ──────────────────────────────────────────────
  // Cada uma corresponde a uma aba, alerta ou bloco de tela que simplesmente
  // não existe em algumas operações.
  features: {
    diarias: true,            // aba Diárias (AVB não paga diária)
    descargaAgendada: true,   // alerta de agenda sem descarga
    cobrancaSaldo: true,      // alerta de saldo pendente pós-descarga
    sgs: true,                // SGS é sistema da Suzano — outras não têm
    operacional: true,        // aba Operacional (SGS + apontamentos)
    gestao: false,            // aba Gestão (hoje exclusiva AVB)
    semDt: false,             // fila "Cargas sem DT" (Suzano carrega sem DT)
    classificadores: false,   // filtro global papel/celulose (ver `classificador`)
    filialNasDespesas: false, // despesas da base vêm separadas por filial (IMP/BELÉM)
    // Dashboard — cada bloco declara a feature que exige, em vez de existir uma tela
    // por operação. Ver views/DashboardView.jsx.
    rastreamentoDocumental: false, // painel CTE/MDF/NF + KPIs Efetivadas e Taxa Documental
    rankingCliente: false,         // pódio por cliente/contratante
  },

  // ── Vocabulário ────────────────────────────────────────────────────────
  // Lista VAZIA = campo livre (sem enum). Só trave uma lista quando a operação
  // realmente tiver um conjunto fechado — senão o dia em que surgir um valor novo
  // (aconteceu no AVB com "GOV ED LOBÃO-MA") o save quebra sem motivo.
  vocab: {
    status:   ["CARREGADO", "PENDENTE", "NO-SHOW", "NÃO ACEITE", "EM ABERTO", "CANCELADO"],
    vinculo:  ["TERCEIRO", "FROTA", "AGREGADO"],
    roStatus: ["EM TRATATIVA", "FINALIZADO"],
    origem:   [],
  },

  // ── Financeiro ─────────────────────────────────────────────────────────
  // complementarMargemZero: o complementar (vl_cte_comp) é repasse pago integralmente
  // (entra na receita E no custo) em vez de diária recebida depois (só receita).
  // incluirComplementarPadrao: se o toggle "Incluir complementar" começa ligado.
  // filialDespesas: sigla da filial desta base no arquivo de despesas (null = todas).
  financeiro: {
    complementarMargemZero: false,
    incluirComplementarPadrao: false,
    filialDespesas: null,
  },

  // Motor de alertas usado no topo do app ("padrao" | "avb").
  // Fase 2 do plano: descrever os alertas como dado também.
  alertas: "padrao",

  // Classificador de operação (ex.: papel × celulose; padrão × exportação).
  // null = base sem separação interna. Ver features.classificadores.
  classificador: null,

  // Campos que existem SÓ nesta operação, adicionados ao modal de edição.
  // { k: coluna na tabela, l: rótulo, type: tipo do campo, secao: onde aparece }
  // `secao` casa com o título das seções do ModalEdit ("Agenda", "Operacional"...).
  // O campo precisa existir como coluna na tabela da base — o upsert usa
  // jsonb_populate_record, que simplesmente ignora chave sem coluna correspondente.
  camposExtras: [],
};

// Divergências por base. Só o que muda em relação ao PADRÃO.
const POR_BASE = {
  imperatriz_belem: {
    features: { semDt: true, classificadores: true, filialNasDespesas: true },
    financeiro: { incluirComplementarPadrao: true },
    // Enum fechado de propósito: o sync do Sheets já valida as mesmas 2 origens,
    // e essa disciplina evita cidade digitada errada entrar na base.
    vocab: { origem: ["IMPERATRIZ-MA", "BELEM-PA"] },
    classificador: {
      campo: "tipo_carga",
      label: "Tipo de carga",
      padrao: "papel", // linha criada no app, sem tipo_carga, conta como papel
      valores: [
        { valor: "papel",    label: "Papel" },
        { valor: "celulose", label: "Celulose" },
      ],
      // Como a Conferência classifica o CTe na importação (migration 079). O relatório do
      // TMS traz Remetente e Destinatário: carga que sai e chega na MESMA empresa é
      // transferência da fábrica (celulose); o resto é venda para cliente (papel).
      // Antes disso o tipo só existia na planilha operacional e chegava por DT — CTe sem DT
      // casado ficava fora dos dois filtros (em 08/2026 isso escondia 80 dos 130 CTes).
      importFrete: { regra: "transferencia", valor: "celulose", padrao: "papel" },
    },
  },

  maracanau: {
    // NÃO trava origem: a base tem 411 registros em "MARACANAU-CE", que o enum
    // fixo de validators.js (só IMPERATRIZ/BELEM) rejeitava — salvar qualquer
    // registro de Maracanaú pelo app falhava com '"origem" inválido'.
  },

  acailandia_avb: {
    ancora: "codigo",           // AVB ancora por código, não por DT
    rotuloCliente: "Contratante",
    features: {
      diarias: false,
      descargaAgendada: false,
      cobrancaSaldo: false,
      sgs: false,
      operacional: false,
      gestao: true,
      rastreamentoDocumental: true,
      rankingCliente: true,
    },
    financeiro: { complementarMargemZero: true, filialDespesas: "AÇA" },
    alertas: "avb",
    camposExtras: [
      { k: "data_final",      l: "Data Final (Descarregado — encerra trânsito)", type: "date", secao: "Agenda" },
      { k: "baixa_homerico",  l: "Baixa Homérico",                               type: "date", secao: "Operacional" },
      { k: "ganchos",         l: "Ganchos",                                                    secao: "Operacional" },
    ],
  },
};

// Perfis vindos da tabela `co_bases` (migration 043), carregados no boot por
// operacao/bases.js. Sobrepõem o POR_BASE do código — é o que permite ajustar uma
// operação (ou cadastrar outra) sem deploy. Vazio = comportamento idêntico ao de antes.
let _remotos = {};
export function setPerfisRemotos(mapa) { _remotos = mapa || {}; }

// Merge raso por seção (features/vocab/financeiro/classificador são objetos de 1 nível).
// Precedência: PADRÃO → POR_BASE (código) → banco.
//
// `classificador` entra no merge por seção pelo mesmo motivo das outras: o registro em
// co_bases foi gravado em 07/2026 e não conhece chave criada depois. Substituindo o objeto
// inteiro, a regra `importFrete` (migration 079) sumia e a importação gravava tipo_carga
// nulo em tudo — celulose continuou aparecendo só pelo cruzamento com DT.
export function getPerfil(baseId) {
  const over = POR_BASE[baseId] || {};
  const rem  = _remotos[baseId] || {};
  const clf = (over.classificador || rem.classificador)
    ? { ...(over.classificador || {}), ...(rem.classificador || {}) } : null;
  return {
    ...PADRAO,
    ...over,
    ...rem,
    features:   { ...PADRAO.features,   ...(over.features   || {}), ...(rem.features   || {}) },
    vocab:      { ...PADRAO.vocab,      ...(over.vocab      || {}), ...(rem.vocab      || {}) },
    financeiro: { ...PADRAO.financeiro, ...(over.financeiro || {}), ...(rem.financeiro || {}) },
    classificador: clf,
  };
}

// Atalho para os pontos que só querem saber de uma feature.
export function temFeature(baseId, feature) {
  return getPerfil(baseId).features[feature] === true;
}

// ── Metadados para a tela de Bases no Admin ───────────────────────────────
// Ficam aqui, ao lado da definição, para a tela não precisar ser editada toda vez
// que uma feature nova nascer: basta acrescentar em `features` (PADRAO) e aqui.
export const FEATURES_META = [
  { k: "diarias",           l: "Diárias",             d: "Aba de diárias. Operação que não paga diária desliga." },
  { k: "descargaAgendada",  l: "Descarga agendada",   d: "Alerta de agenda marcada sem descarga registrada." },
  { k: "cobrancaSaldo",     l: "Cobrança de saldo",   d: "Alerta de saldo pendente após a descarga." },
  { k: "sgs",               l: "SGS",                 d: "Campo/relatório do SGS (sistema da Suzano)." },
  { k: "operacional",       l: "Aba Operacional",     d: "SGS + apontamentos." },
  { k: "gestao",            l: "Aba Gestão",          d: "Acompanhamento por etapas do embarcador." },
  { k: "semDt",             l: "Fila Cargas sem DT",  d: "Para operações que carregam antes de o DT sair." },
  { k: "classificadores",   l: "Classificador",       d: "Separa a operação em tipos (ex.: papel × celulose)." },
  { k: "filialNasDespesas", l: "Filial nas despesas", d: "Despesas chegam marcadas por filial." },
  { k: "rastreamentoDocumental", l: "Rastreamento documental", d: "Painel CTE/MDF/NF no dashboard, com taxa de cobertura." },
  { k: "rankingCliente",    l: "Ranking por cliente",  d: "Pódio de volume por cliente/contratante no dashboard." },
];

export const ALERTAS_OPCOES = [
  { v: "padrao", l: "Padrão (atraso de descarga + cobrança)" },
  { v: "avb",    l: "AVB (documentos, data inválida, código zerado)" },
];
