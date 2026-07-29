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
  financeiro: { complementarMargemZero: false },

  // Motor de alertas usado no topo do app ("padrao" | "avb").
  // Fase 2 do plano: descrever os alertas como dado também.
  alertas: "padrao",

  // Classificador de operação (ex.: papel × celulose; padrão × exportação).
  // null = base sem separação interna. Ver features.classificadores.
  classificador: null,
};

// Divergências por base. Só o que muda em relação ao PADRÃO.
const POR_BASE = {
  imperatriz_belem: {
    features: { semDt: true, classificadores: true },
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
    },
    financeiro: { complementarMargemZero: true },
    alertas: "avb",
  },
};

// Merge raso por seção (features/vocab/financeiro são objetos de 1 nível).
// Suficiente para o formato acima e trivial de portar quando o perfil vier do banco.
export function getPerfil(baseId) {
  const over = POR_BASE[baseId] || {};
  return {
    ...PADRAO,
    ...over,
    features:   { ...PADRAO.features,   ...(over.features   || {}) },
    vocab:      { ...PADRAO.vocab,      ...(over.vocab      || {}) },
    financeiro: { ...PADRAO.financeiro, ...(over.financeiro || {}) },
  };
}

// Atalho para os pontos que só querem saber de uma feature.
export function temFeature(baseId, feature) {
  return getPerfil(baseId).features[feature] === true;
}
