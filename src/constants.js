// ── constants.js ──
// ► Fonte única de verdade: theme-dark.css / theme-light.css / tokens.css
// ► Para mudar cores, radii ou fontes: edite APENAS os arquivos CSS.
//   O JS lê as CSS vars automaticamente via proxy — zero duplicação.

// Proxy de CSS vars — dark e light compartilham o mesmo objeto.
// A troca de tema é feita via data-theme no <html>; o CSS cuida do resto.
const _t = {
  bg:          "var(--bg)",
  bgAlt:       "var(--color-bg-alt)",
  card:        "var(--card)",
  card2:       "var(--card2)",
  borda:       "var(--border)",
  borda2:      "var(--border2)",
  txt:         "var(--text)",
  txt2:        "var(--text2)",
  ouro:        "var(--accent)",
  ouroDk:      "var(--color-primary-dk)",
  onPrimary:   "var(--on-primary)",   /* texto sobre botão accent — preto no Binance Yellow */
  verde:       "var(--green)",
  verdeDk:     "var(--color-success-dk)",
  danger:      "var(--red)",
  warn:        "var(--yellow)",
  azul:        "var(--color-info)",
  azulLt:      "var(--color-info-lt)",
  laranja:     "var(--orange)",
  roxo:        "var(--roxo)",
  headerBg:    "var(--color-header-bg)",
  modalBg:     "var(--color-modal-bg)",
  inputBg:     "var(--color-input-bg)",
  shadow:      "var(--color-shadow)",
  gradientAuth:"var(--bg)",
  scrollThumb: "var(--color-scroll-thumb)",
  tableHeader: "var(--color-table-header)",
};
export const themes = { dark: _t, light: _t };

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
export const TABLE = "controle_operacional";

// ── Bases operacionais — mapeia id → tabela Supabase ──────────
// Para adicionar Belém independente: inserir entrada aqui + criar tabela no Supabase.
export const BASES = {
  imperatriz_belem: { id: "imperatriz_belem", label: "Imperatriz / Belém", table: "controle_operacional" },
  maracanau:        { id: "maracanau",        label: "Maracanau",           table: "controle_operacional_maracanau" },
  acailandia_avb:   { id: "acailandia_avb",   label: "Açailândia - AVB",    table: "controle_operacional_avb",
                      noDiarias: true, hasContratante: true, origemPadrao: "AÇAILÂNDIA-MA",
                      agendaKmDia: 500 },
};

export const TABLE_USUARIOS = "co_usuarios";
export const TABLE_CONFIG   = "co_config";
export const TABLE_OCORR    = "co_ocorrencias";
export const TABLE_LOGS     = "co_logs_alteracoes";
export const TABLE_APOINTS  = "co_apontamentos";
export const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
export const PERMS_PADRAO = {
  // ── Admin: acesso total ──
  admin:      {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:true,  usuarios:true,  ocorrencias:true },
  // ── Gerente: vê financeiro, edita tudo operacional, sem config de sistema ──
  gerente:    {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:true },
  // ── Operador: edita tudo operacional incluindo financeiro, sem config de sistema ──
  operador:   {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:true },
  // ── Visualizador: somente leitura ──
  visualizador:{financeiro:false,editar:false,importar:false,dashboard:true,diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:false},
};
export const PERMS_LISTA = [
  {key:"financeiro",lbl:"Financeiro"},{key:"editar",lbl:"Editar"},{key:"importar",lbl:"Importar"},
  {key:"dashboard",lbl:"Dashboard"},{key:"diarias",lbl:"Diárias"},{key:"descarga",lbl:"Descarga"},
  {key:"planilha",lbl:"Planilha"},{key:"ocorrencias",lbl:"Ocorrências"},{key:"config_db",lbl:"Config DB"},{key:"usuarios",lbl:"Usuários"},
];

// ════════════════════════════════════════════════════════════
//  BREAKPOINTS & LAYOUT TOKENS (redesign v22)
// ════════════════════════════════════════════════════════════
export const BP = {
  xs: 0,           // Mobile pequeno
  sm: 480,         // Mobile padrão
  md: 768,         // Tablet
  lg: 1200,        // Desktop
  xl: 1536,        // Desktop grande
};

export const LAYOUT = {
  SIDEBAR_W: 220,
  SIDEBAR_COLLAPSED_W: 64,
  HEADER_H_DESKTOP: 56,
  HEADER_H_MOBILE: 48,
  NAV_H: 60,
};

// ════════════════════════════════════════════════════════════
//  DESIGN SYSTEM — TOKEN CENTRAL
//  ► Altere aqui → propaga em TODO o código que usa css.*
//  ► Para detectar estilos fora do padrão:
//      Painel Admin > aba Desenvolvimento > Auditar Design
//      (ou via console do navegador: auditarDesign())
// ════════════════════════════════════════════════════════════
export const DESIGN = {
  // Raios — lidos de tokens.css; edite lá para propagar em todo o app
  r: {
    btn:     "var(--radius-btn)",
    card:    "var(--radius-card)",
    modal:   "var(--radius-modal)",
    tile:    "var(--radius-tile)",
    badge:   "var(--radius-badge)",
    inp:     "var(--radius-inp)",
    tag:     "var(--radius-tag)",
    ico:     "var(--radius-ico)",
    logo:    "var(--radius-logo)",
    sm:      "var(--radius-sm)",
    sidebar: "var(--radius-sidebar)",
  },
  // Tamanhos de ícone SVG (px) — mantidos como números para uso em atributos SVG
  ico: { xs:10, sm:13, md:16, lg:20, xl:24 },
  // Stroke SVG
  sw:  { thin:1.5, md:2, thick:2.5 },
  // Fontes — lidas de tokens.css
  fnt: { h:"var(--font-heading)", display:"var(--font-display)", b:"var(--font-body)" },
  // Letter-spacing
  ls:  { label:2, badge:1, mono:2.5, btn:.2 },
};
// Utilitário: aplica alpha a uma cor.
// - Se receber uma CSS var ("var(--xxx)"), usa color-mix() — CSS moderno, sem duplicação de hex.
// - Se receber hex "#rrggbb" (retrocompatibilidade), converte para rgba.
export const hexRgb = (colorOrVar, a) => {
  if (typeof colorOrVar === "string" && colorOrVar.startsWith("var(")) {
    return `color-mix(in srgb, ${colorOrVar} ${Math.round(a * 100)}%, transparent)`;
  }
  const h = (colorOrVar || "#000000").replace("#", "");
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
};

export const DEV_CHANGELOG = [
  {
    data: "2026-07-07", sessao: "Sessao 26",
    itens: [
      "FEAT · Resultado: novo segmento \"Conferência de Faturamento\" (toggle no topo, ao lado de Operacional) — importa as planilhas BRUTAS de faturamento por cliente (TMS/ERP, Empresa=MAT/MAM/MAR/MRM/D01/D05), classifica por CNPJ Remetente (Suzano Imperatriz, Suzano Belem, AVB Acailandia, Couro — cadastro em src/freteConferencia.js:CLIENTES) e grava em tabela nova frete_conferencia (migration 003), ISOLADA de controle_operacional (fonte Google Sheets) — mesmo objetivo, pipelines independentes por enquanto.",
      "FEAT · Conferência de Faturamento: Descarga x Local dentro do mesmo codigo (MAM/MRM) decidido por Margem Lucro (==0 -> Descarga, !=0 -> Local); fila de revisao com flags automaticas (margem negativa, margem <10%, classificacao ambigua perto do corte de margem) e deteccao de DUPLICIDADE DE VALOR (mesma Placa+Valor NF+Peso NF+Trecho+Total do Frete em CTRCs diferentes) — decisao sempre manual (decisao_manual na tabela, nunca sobrescrita em reimportacao).",
      "FEAT · Conferência de Faturamento: filtro por cliente (Todos / Suzano Imperatriz / Suzano Belem / AVB Acailandia / Couro) e painel 'Pendencias por usuario' (nome_usuario da planilha) na fila de revisao, pra saber com quem falar em caso de erro.",
      "DATA · processar_multi_cliente.py (fora do repo, entregue ao usuario): script standalone que gera o mesmo agrupamento em Excel (FRETES/DESCARGAS/LOCAIS/DIARIAS + aba DASHBOARD) para quem preferir nao usar o app — mesma logica de classificacao do freteConferencia.js.",
    ],
  },
  {
    data: "2026-06-18", sessao: "Sessao 25",
    itens: [
      "FIX · Boot: corrigido ReferenceError que derrubava o app (useAuthHandlers recebia registrarLog antes do useAdminHandlers declara-lo — TDZ); reordenadas as chamadas. Tambem corrigido buscaRelacionados nao destruturado no AppModals e chave duplicada no ctx.",
      "DESIGN · Identidade migrada de Steel Blue para BINANCE YELLOW (#FCD535 sobre near-black #0b0e11) via tokens (theme-dark/light + tokens.css), sem tocar JSX. Accent unico amarelo; foco azul (info); botao primario amarelo com texto preto (#181a20). Superficies neutras Binance (card #1e2329 / elevado #2b3139). Tema light usa dourado legivel #a8810c (amarelo puro e ilegivel como texto no branco). Base AVB mantem laranja por filial. Glass do login/filtros realinhado pro amarelo.",
      "UX · Polish global: anel de foco azul acessivel (:focus-visible) em campos/botoes/links; scrollbar tematizada; hover-lift (translateY -2px + sombra) em TODOS os cards via seletor global [style*=--radius-card]:hover — cobre css.card/css.kpi/css.cardKanban (inline) e .ds-card/.ds-kpi, sem editar JSX.",
    ],
  },
  {
    data: "2026-06-15", sessao: "Sessao 24",
    itens: [
      "FEAT · Resultado: clicar numa despesa marcada como DUPLICIDADE? abre um painel comparativo com os outros lancamentos de mesmo valor, natureza e historico do mes — cada um com o toggle 'incl.' (para desligar o repetido) e botao Editar; mostra quantos estao incluidos e o total. Linhas sem duplicidade continuam abrindo a edicao direto.",
      "FIX · Importacao de despesas: lancamentos de OUTRO mes (planilha com a base separada em abas de meses diferentes) entravam no mes selecionado. Agora a competencia segue a DATA (dt_mov): so entram as linhas do mes selecionado (+ sem data); as de outro mes sao ignoradas com aviso, e arquivo sem nenhuma linha do mes selecionado e barrado.",
      "DATA · Limpeza: removidas 94 linhas de maio/2026 que haviam sido importadas por engano em 03/2026 (Acailandia) — eram duplicatas exatas das de 05/2026, sem flags. Depois, conferida contra a planilha original, removidas mais 2 linhas SEM DATA que tambem haviam vazado da aba de maio (DESPESAS BANCARIAS 4.938,79 e SINISTRO ACO VERDE 10x10 6.851,31). 03/2026 Acailandia fechou em 79.998,19, batendo com o TOTAL da aba ACAI 032026.",
      "UI · Resultado: lista de despesas vira TABELA multi-coluna no desktop (Data · Natureza · Historico · Conta · Valor) com cabecalho de colunas e fontes maiores (natureza 15px, valor 16px) — usa melhor a largura da tela e melhora a legibilidade, acabando com o vao no meio. No mobile mantem o formato empilhado. Badges (MANUAL/CREDITO/INDEVIDA/DUPLICIDADE) e o toggle 'incl.' preservados.",
      "CI · deploy.yml (GitHub Pages) atualizado para Node 24: checkout v6, setup-node v6 (node 22), configure-pages v6, upload-pages-artifact v5, deploy-pages v5. Remove o aviso de descontinuacao das actions em Node 20.",
      "UX · ESC fecha o modal aberto (global) — novo hook useModalEsc com pilha (fecha so o modal do topo quando ha modais empilhados). Aplicado a TODOS os modais: centrais do App (edicao, motorista, usuario, configdb, detalhe, busca, NFD, relatorios, controle financeiro, WhatsApp, dash drill, ocorrencia de chegada, aprovacao de acesso, periodo Rodorrica, preview de e-mail/import) e locais (Resultado: editar/duplicidade/selecao de abas; OcorrModal). ESC no campo de confirmacao EXCLUIR cancela so a confirmacao, sem fechar o modal.",
      "UX · Seletor de filial no topo: ao trocar de base agora MANTEM a tela atual (antes voltava sempre para o Dashboard). Ex.: em Resultado Imperatriz/Belem, ao trocar para Acailandia continua em Resultado.",
      "FIX · Exclusao falhava no sync com 'Token de sessao ausente' (HTTP 400) apos recarregar a pagina: o session token fica so em memoria e o auto-login nao o regerava. Agora a sessao guarda o email e o restore regenera o token via gerar_token_sessao — exclusoes e demais RPCs autenticadas voltam a sincronizar.",
      "UI · Icones dos modais padronizados no estilo de linha do sidebar: novo componente Icon (components/Icon.jsx) substitui os emojis-badge (chips de status, cabecalhos, botoes) nos 16 modais. Mantidos apenas onde tecnicamente nao cabe SVG: <option> de <select>, conteudo das mensagens de WhatsApp e textos de toast/alert.",
    ],
  },
  {
    data: "2026-06-12", sessao: "Sessao 23",
    itens: [
      "FIX · Resultado: 'Pago motorista' inflado (~100x) — parser de vl_contrato removia o ponto decimal quando o valor ja vinha como decimal ingles (sem virgula). Agora so trata ponto como milhar quando ha virgula (espelha parseMoedaAvb).",
      "FIX · Resultado: tela piscando em 'Carregando...' apos importar — getConexao() devolvia objeto novo a cada render, recriando 'carregar' e disparando o useEffect em loop. conn agora memoizado (useMemo).",
      "FEAT · Importacao de despesas: aceita tambem .csv e .ods. CSV/aba unica infere a base pelo nome do arquivo (ACA->AVB, IMP/BEL->imperatriz_belem).",
      "UI · Resultado: lista de despesas mais legivel — zebra striping, valores alinhados em coluna a direita, destaque no hover, credito com sinal '-' e barra verde lateral.",
      "FEAT · Painel Financeiro: nova aba (gated por permissao financeira, todas as bases) com visao faturamento->margem->despesas->resultado da base logada. KPIs do mes + indicadores (indice de despesa, receita/viagem, despesa/viagem, ponto de equilibrio), grafico de evolucao 6 meses (faturamento x resultado) e composicao das despesas por grupo.",
      "UX · Despesa indevida: ao marcar 'indevida' o 'Incluir no calculo' e desmarcado automaticamente (despesa indevida nao deve pesar no resultado ate voltar como credito).",
      "FEAT · Seletor de base no topo: gestor com acesso a multiplas bases troca IMPERATRIZ/BELEM <-> ACAILANDIA <-> MARACANAU pelo chip do cabecalho, sem deslogar (reseta para Dashboard).",
      "UI · Toggles estilo iOS (componente Toggle) no lugar de checkboxes nas telas financeiras (ModalDespesa, Resultado, Painel Financeiro).",
      "UI · Sweep global: TODOS os checkboxes do app viraram Toggle (ModalEdit, ModalNFD, ModalRelatorios, AdminView, MotoristasView) — padrao visual unico em todo o sistema.",
      "UI · Logo do login: removido o brilho/estrela ao lado do 'P', fundo azul padrao preservado, recorte circular centralizado e exportada em 512x512 nitida (logo-login.png).",
      "FEAT · Painel Financeiro: segmento Imp+Bel / Imperatriz / Belem (so imperatriz_belem) filtra as despesas por origem (aba da planilha) p/ acompanhar Belem; receita/margem seguem combinadas (caption avisa).",
      "FEAT · Painel Financeiro v2: variacao vs mes anterior (badge up/down) nos KPIs; cascata do resultado (Faturamento -> Pago motorista -> Despesas -> Creditos -> Resultado); maiores despesas do mes (top 5); acumulado do ano (YTD).",
      "FIX · Seletor de base sumia apos recarregar a pagina: sessao do admin/OAuth nao gravava baseIds e o restore nao repunha basesPermitidas. Agora grava baseIds e admin sempre ve todas as bases; chevron do seletor mais visivel.",
      "FEAT · Painel Financeiro: split COMPLETO Imperatriz/Belem — o campo origem da viagem (IMPERATRIZ-MA/BELEM-PA) ja separa a receita; o segmento agora filtra receita E despesa por cidade (P&L isolado real, sem campo manual).",
      "FIX · Sync AVB (SyncSupabase_AVB.gs): faturamento/pago-motorista da AVB chegavam vazios porque os cabecalhos reais sao 'VALOR DO CTE' e 'VALOR DO CONTRATO' (com 'do') e o mapa so tinha 'valor cte'/'valor contrato'. Adicionados os variantes -> vl_cte e vl_contrato passam a sincronizar. Tambem mapeado 'CONTRATO MAT/MAR' -> mat (numero do documento de contrato). Re-rodar o Apps Script.",
      "UI · Resultado: cada despesa mostra a data (dt_mov, DD/MM) numa coluna a esquerda; lancamentos sem data exibem 'sem data' em italico/dourado.",
      "UX · Importacao de despesas: sinaliza filiais ausentes — se faltar a aba de AVB/Imperatriz/Belem no arquivo, pede confirmacao antes de gravar (e barra arquivo sem aba reconhecida).",
      "UX · Importacao de despesas: detecta o mes predominante pelas datas (dt_mov) do arquivo e avisa se diferir do mes selecionado (previne subir maio dentro de junho).",
    ],
  },
  {
    data: "2026-06-11", sessao: "Sessao 22",
    itens: [
      "FEAT · Resultado (Margem x Despesas): nova aba por base (AVB e Imperatriz/Belem), gated por permissao financeira. Receita (vl_cte) - Pago motorista (vl_contrato) = Margem, menos despesas incluidas do mes = Resultado.",
      "FEAT · Despesas: tabela Supabase despesas_filial; importacao da planilha mensal (aba ACA->AVB, IMP+BELEM->imperatriz_belem); CRUD via ModalDespesa (editar/excluir/incluir manual); toggle incluir nas linhas marcadas como duplicidade.",
      "FEAT · Complementar (vl_cte_comp) selecionavel: default OFF na AVB (margem zero/repasse), ON na Suzano (margem cheia). Descarga e diaria D01/D05 desconsiderados por enquanto.",
      "FEAT · Creditos: linhas de valor negativo na planilha viram tipo=credito e abatem a despesa liquida; KPI Creditos separado; duplicidade so entre debitos.",
      "FEAT · Despesa indevida: flag no ModalDespesa; ao importar mes seguinte, painel concilia indevidas pendentes com creditos do mes por valor (sugere e usuario confirma o vinculo).",
      "FEAT · Importacao nao-destrutiva: diffImport compara o arquivo com o que ja existe (chave conteudo + multiplicidade) e adiciona SO as linhas novas, preservando existentes e flags; se o mes ja foi importado, pede confirmacao e informa quantas novas.",
    ],
  },
  {
    data: "2026-05-29", sessao: "Sessao 21",
    itens: [
      "FIX · AVB Dashboard: origens dinamicas (nao mais fixadas em BELEM/IMPERATRIZ) — KPIs deixam de zerar ao selecionar AVB.",
      "FIX · AVB Planilha: parseYMfiltAvb com fallback em data_homerico/data_manifesto — planilha abre no mes corrente.",
      "FEAT · AVB Planilha: COLS_AVB com 15 colunas operacionais; busca expandida (codigo, cte, mdf, nf, cliente, contratante, gerenciadora); filtros Contratante e Gerenciadora na toolbar.",
      "FEAT · AVB Dashboard: KPI strip financeiro (soma contratos, adiantamentos, saldo, ticket medio CTE excluindo PENDENTES); ranking contratante duplo (qtd + valor).",
      "FEAT · AVB Descarga: tela renomeada para Logistica AVB com tiles Em Transito / Prev. Hoje / Pendentes / Doc. Incompleta / Fin. Pendente; cards com status documental CTE/MDF/NF e saldo.",
      "FEAT · AVB Agenda: calcAgendaAvb cliente com tabela de distancias (30 rotas); usado como fallback quando data_agenda nao vem do script.",
      "FEAT · AVB Alertas: flags data invalida, documentacao incompleta e codigo zero — alertas padrao de descarga/saldo ocultados no contexto AVB.",
      "FEAT · AVB Sync: SUPA_KNOWN_COLS expandido com codigo, data_homerico, data_liberacao, gerenciadora, rdo, contrato_mat, cadastro_fortes, cte_comp_num, cte_comp_vlr.",
      "FEAT · utils_avb.js: modulo exclusivo AVB — parseMoedaAvb, calcSaldoAvb, flagErroData, flagPendenciaDocumental, normContratanteAvb, calcAgendaAvb, DISTANCIAS_AVB.",
      "INFO · Escopo: TODAS as mudancas acima sao condicionais a baseAtual.id === acailandia_avb. Zero impacto em Imperatriz/Belem e Maracanau.",
    ],
  },
  {
    data: "2026-05-29", sessao: "Sessão 20",
    itens: [
      "FEAT · Nova Base Açailândia - AVB: adicionada ao seletor de bases pós-login; tabela Supabase 'controle_operacional_avb'; permissão por usuário via co_usuarios.bases_permitidas.",
      "FEAT · Diárias ocultadas para AVB: aba 'Diárias' removida da navegação quando a base selecionada é Açailândia (noDiarias:true na config da base).",
      "FEAT · Campo Contratante: mapeado no Apps Script AVB e adicionado ao fieldCatalog; campo contratante exibível na Planilha.",
      "FEAT · Dashboard Por Contratante (AVB): widget com ranking de viagens por contratante + barra de progresso; visível apenas na base AVB (hasContratante:true).",
      "FEAT · Agenda auto-calculada (AVB): SyncSupabase_AVB.gs calcula data_agenda com base em distância Açailândia → destino a 500 km/dia; tabela de distâncias cobre principais destinos.",
      "FEAT · SyncSupabase_AVB.gs: script Apps Script dedicado para a planilha AVB; origem fixada como AÇAILÂNDIA-MA; cálculo de agenda; lotes de 50; status gravado em co_config (chave gsheet_sync_status_avb).",
    ],
  },
  {
    data: "2026-05-13", sessao: "Sessão 19",
    itens: [
      "REFAC · Dashboard v2 — Remoção de excesso de cor; hierarquia via tamanho; donut substituído por barra horizontal stacked; Top Motoristas com cor única (Steel Blue) + barra de progresso; Diárias/Descargas com tiles neutros + tags semânticas; tabela com avatar+nome agrupado e rota inline; uppercase removido de nomes próprios/cidades; espaçamento global aumentado para 14px/18px/24px.",
    ],
  },
  {
    data: "2026-05-13", sessao: "Sessao 18",
    itens: [
      "REFAC - Tipografia: Substituido Syne (headings) + Barlow (body) por Satoshi (Fontshare) como fonte unificada de display + body; IBM Plex Mono mantido para dados/codigos; preconnect adicionado para api.fontshare.com; letter-spacing recalibrado para -0.025em (display) / -0.005em (body); referencia hardcoded removida do App.jsx linha 1954; zero alteracao de JSX - tudo via tokens.css.",
    ],
  },
  {
    data: "2026-05-13", sessao: "Sessão 17",
    itens: [
      "REFAC · Paleta — Substituído amarelo Binance (#f5c53a) por Steel Blue (#3b82f6) em theme-dark.css e theme-light.css; backups gerados em .bak_steel_20260513_*; fallbacks de tokens.css atualizados; zero alteração de JSX necessária graças ao proxy de CSS vars.",
    ],
  },
  {
    data: "2026-03-25", sessao: "Sessão 16",
    itens: [
      "FEAT · Diária — Nova Lógica Simplificada: REGRA chegada ≤ agenda → COM DIÁRIA (dias = descarga - agenda); REGRA chegada > agenda → PERDA DE AGENDA; sem chegada → legado. Remove exigência de 'informou_analista' como critério.",
      "FEAT · Descarga — Campo Data+Hora: campo 'data_desc' agora aceita data E hora (datetime-local); armazena 'DD/MM/YYYY HH:MM'. Compatível com registros antigos (somente data).",
      "FEAT · Descarga — Checkbox Aguardando: novo campo 'Aguardando Descarga' no modal de edição (Operacional); quando marcado, bloqueia o campo data/hora e sinaliza status de espera; ao preencher a data, desativa o checkbox automaticamente.",
      "FEAT · Apontamentos — Resumo Mensal: painel exibido acima da lista com totais por tipo (📦 Descarga / 📏 Stretch / 🚗 Deslocamento / 📋 Outros) e total geral do mês de referência mais recente.",
      "FEAT · ID Diárias — Verificação RO: banner de alerta quando há DTs com diária sem RO preenchido; badge ⚠️ RO vazio em cada card; label 'Perdeu Agenda' para tipo=atraso (era genérico).",
      "FIX · parseData: corrigido para suportar strings 'DD/MM/YYYY HH:MM' sem quebrar a conversão de ano (usava split('/')[2] que incluía a hora); agora extrai apenas os primeiros 4 dígitos do ano.",
      "FIX · brToInput: corrigido para usar regex e extrair apenas a parte de data, ignorando o componente de hora se presente.",
      "FIX · Header — Ícone padrão: quando não há logo customizada, o ícone superior esquerdo exibe 🚛 emoji (mesmo padrão da tela de login e do favicon mobile), em vez do SVG stroke.",
    ],
  },
  {
    data: "2026-03-25", sessao: "Sessão 15",
    itens: [
      "FEAT · Ocorrência/RO na Chegada: ao preencher data de chegada real no modal de edição, abre alerta para registrar o RO (Registro de Ocorrência) — inerente à existência de NFD; campo RO preenchido inline e salvo no registro",
      "FEAT · Auditoria por Sessão: LOGIN e LOGOUT agora registrados automaticamente em co_logs_alteracoes com usuário, perfil e data/hora — Admin > Log > Operacional mostra histórico por sessão",
      "FEAT · Admin > Contatos/Motoristas: seção agora colapsável (mesmo padrão de Conexões Supabase e GSheets)",
      "FEAT · Dashboard KPIs: ícones emoji substituídos por SVG no padrão DESIGN.* (Carregamentos, DTs Únicas, Motoristas, Total CTE, Alertas)",
      "FEAT · Dashboard Filtros/Botões: cabeçalho Filtros usa SVG; botões de agrupamento e tipo de gráfico padronizados com DESIGN.r.tag, hexRgb e DESIGN.fnt.b; ícones de gráfico substituídos por SVG (bar/pie)",
      "FEAT · Diárias e Descargas: modo padrão alterado para 'blocos' (2 colunas) — se adequa melhor a desktops padrão mantendo a opção de alternar para linhas",
      "INFO · Design Audit: para encontrar modais com layout antigo, acesse Admin > Log de Alterações > aba Desenvolvimento > Auditar Design (ou console: auditarDesign())",
    ],
  },
  {
    data: "2026-03-24", sessao: "Sessão 14",
    itens: [
      "FEAT · DESIGN tokens centralizados: objeto DESIGN no topo do arquivo — DESIGN.r (borderRadius), DESIGN.ico (tamanhos ícone), DESIGN.sw (stroke SVG), DESIGN.fnt (famílias), DESIGN.ls (letter-spacing)",
      "FEAT · css.* atualizado para derivar de DESIGN.*: qualquer mudança em DESIGN propaga automaticamente para todos os elementos que usam css.btnGold, css.btnCard, css.kpi, css.card, css.inp, css.badge etc.",
      "FEAT · hexRgb(hex, a) utilitário: converte cor hex do tema + alpha → rgba, elimina rgba hardcoded no css.*",
      "FEAT · css.btnCard(c) novo helper: tile colorido com acento superior para grades de botões (WPP, ações secundárias)",
      "FEAT · Auditoria de Design: Admin > Desenvolvimento > Auditar Design — detecta borderRadius e fontFamily fora dos tokens DESIGN.*; também acessível via console: auditarDesign()",
      "FEAT · Busca > WPP: botões de modelo convertidos para css.btnCard + ícones SVG (sem emojis)",
      "FIX · Busca: cabeçalho resultado usa padrão dark/gold (era gradiente verde); info rows usam css.card + hIco; KPIs de data usam css.kpi; financeiro usa css.kpi",
      "FIX · deploy.bat: removidos caracteres Unicode (╔ ║ ╚ ═) que causavam erro no CMD Windows; adicionado cd /d %~dp0 para garantir execução na pasta correta; diagnóstico aprimorado com verificação de npm/git no PATH",
      "FIX · Planilha Controle Financeiro (Apontamentos): corrigido bug 'abre nada' — filtro DCC-only removido; agora exporta TODOS os registros do período",
      "FEAT · Planilha Controle Financeiro: expandida para todos os campos operacionais — DT, Motorista, CPF, Placa, Status, Carregamento, Descarga, Origem, Destino, Cliente, Valor CTE, Valor Motorista, ADT, Saldo, Diárias Devida/Paga, Data Manifesto, CTE, MDF, MAT, NF, RO, Chegada, Gerenciadora, SGS, CTE Comp., DCC#1 e DCC#2, Apontamento vinculado",
      "FEAT · NFD Alert: ao preencher data de descarga real no modal de edição, abre alerta para registrar NFD (Nota de Devolução) com Nº, Valor e Motivo (Avaria/Falta/Devolução); salvo no registro como campo nfd",
      "FEAT · Barra de Navegação: ícone Buscar movido para último à direita",
      "FEAT · Operacional > Ocorrências: reformulado — lista todas as DTs com qualquer ocorrência (SGS, ocorrência local, diária/atraso, DCC) com badges coloridos e ordenação por prioridade",
      "FEAT · Modal Detalhe: seções Minutas DCC, CTE Complementar e Minutas Descarga agora são colapsáveis — DCC e Minutas Descarga abertos por padrão; CTE Complementar fechado por padrão (indica 'preenchido' quando há dados)",
    ],
  },
  {
    data: "2026-03-24", sessao: "Sessão 13",
    itens: [
      "FEAT · Planilha: ao clicar em uma linha, abre bottom-sheet modal com layout estilo navbar (dark/gold) — exibe detalhe completo do registro com botões Editar, Ver Completo e Ocorrências",
      "FEAT · DCC: siglas renomeadas de D01→D01-MAT e D02→D05-MAR em todos os dropdowns, estados iniciais e mensagens WhatsApp",
      "FEAT · Apontamentos: adicionados tipos Deslocamento e Outros no select de Tipo",
      "FEAT · Apontamentos: novo botão 'Planilha Financeiro' — gera XLS de controle de Descargas/Stretch por período selecionável (DCC D01-MAT/D05-MAR com CTE, MDF, valores e apontamentos vinculados) para conferência Suzano e NFSE",
      "FEAT · Apontamentos: alerta aprimorado de FRS — destaca individualmente os apontamentos com mais de 2 dias sem FRS emitida, mostrando contador de dias em tempo real",
    ],
  },
  {
    data: "2026-03-23", sessao: "Sessão 12",
    itens: [
      "FEAT · Relatório Operacional (PDF): novo relatório com SGS (chamados + retornos) e Apontamentos (descarga/stretch); acessível via menu de relatórios; modal com período e seleção de seções",
      "FEAT · Relatório Geral: adicionadas 3 novas seções configuráveis — Ocorrências por DT (co_ocorr_${dt} via localStorage), Diárias do Período (financeiro + status) e Descargas do Período (agenda + atrasos)",
      "FEAT · Menu de Relatórios: adicionada entrada 📋 Operacional (SGS, Apontamentos e ID Diárias)",
      "FIX · DCC × CTE Complementar independentes: CTE Complementar sempre visível independentemente do toggle DCC; somente o bloco de Minutas DCC é controlado pelo toggle 'Existe DCC?'",
    ],
  },
  {
    data: "2026-03-23", sessao: "Sessão 11",
    itens: [
      "FEAT · Dashboard Carregamentos interativo: clique nas barras/pizza dos grupos Motorista, Destino e Status abre painel drill-down com viagens detalhadas; cursor pointer sinaliza interatividade",
      "FEAT · Dashboard Por UF Destino: cada linha de UF clicável → painel lista motoristas que fizeram a rota com contagem de viagens",
      "FEAT · DCC nas Diárias: toggle 'Existe DCC? Sim/Não' antes das Minutas DCC — auto-detecta existência de dados; quando 'Não', oculta formulário de minutas DCC e CTE Complementar; evita formulários em branco desnecessários",
      "FEAT · Registro de data de entrada: novos DTs recebem campo data_criacao (ISO) automaticamente; exibido no header do modal de detalhe como '📥 Registrado em DD/MM/AAAA HH:MM'",
      "FIX · Descarga: botão ao lado da barra de data agora usa estilo css.btnGold (igual ao da aba Buscar) com ícone de lupa em cor contrastante",
      "FIX · Bottom nav: label 'Busca' corrigido para 'Buscar'",
      "INFO · Relatório Geral verificado: ocorrências SGS (seção sgs), descargas (coluna na tabela de registros) e diárias (KPIs + Financeiro) já estavam presentes — nenhuma alteração necessária",
    ],
  },
  {
    data: "2026-03-20 19:55", sessao: "Sessão 10",
    itens: [
      "FEAT · Ícones SVG Stroke Clean (estilo Lucide/Feather) na bottom nav — substituídos emojis por SVGs monocromáticos; stroke ativo = dourado com glow; inativo = cinza; stroke-width 1.8px; transição suave de cor",
      "FIX · html/body background = tema ativo → elimina tela branca nas laterais ao arrastar (overscroll iOS/Android)",
      "FIX · body overscroll-behavior-x:none → impede bounce lateral no mobile",
      "FIX · Header: position sticky → fixed (left:0,right:0,overflow:hidden) → header não sai mais da tela ao arrastar; content com paddingTop 76px",
      "FIX · Bottom nav: overflowX:auto → overflow:hidden; botões flex:1 1 0 sem minWidth fixo → sem corte de ícones",
      "FIX · Campo 'Agenda (data prevista p/ descarga)' → 'Agenda (DT PRV. P/ DESCARREGAR)' — não sobrepõe o campo ao lado",
      "FEAT · Cards de blocos (Diárias + Descarga): Diária (R$) e RO exibidos abaixo do nome do motorista; chips reduzidos para 8px",
    ],
  },
  {
    data: "2026-03-20 17:03", sessao: "Sessão 8",
    itens: [
      "FEAT · Ordenação por coluna na Planilha — clicar no título de qualquer coluna ordena A→Z; clicar de novo inverte Z→A (igual Excel); indicador ▲/▼ na coluna ativa; ⇅ nas demais; borda inferior dourada na coluna ordenada; botão ✕ na toolbar para limpar a ordenação; datas DD/MM/YYYY comparadas corretamente (convertidas para YYYYMMDD antes de comparar)",
    ],
  },
  {
    data: "2026-03-20 16:52", sessao: "Sessão 7",
    itens: [
      "FEAT · Tela inicial alterada para Planilha (era Busca) — ao abrir o app, a planilha já é exibida",
      "FEAT · Navegação movida para rodapé (bottom nav fixo estilo Binance) — abas de navegação ficam fixas na parte inferior da tela com ícone + label, indicador dourado na aba ativa",
      "FEAT · Botões WPP e Relatório movidos para o cabeçalho (header) — ao lado do botão de tema e logout; acessíveis em qualquer aba",
      "FEAT · Planilha full-width responsiva — ocupa 100% da largura da tela (sem padding lateral), tabela usa tableLayout:fixed com colunas proporcionais (colgroup), altura calc(100vh-130px) com scroll interno",
      "FEAT · Toolbar da planilha com contador de registros e botão de exportação na barra de topo da planilha",
      "FEAT · FAB (+NOVO) reposicionado para bottom:74px para não sobrepor a barra de navegação",
      "FIX · Padding do conteúdo reduzido para 68px no rodapé (era 100px) — alinhado com a altura da bottom nav (62px + margem)",
    ],
  },
  {
    data: "2026-03-20 16:06", sessao: "Sessão 6",
    itens: [
      "FIX · WPP barra: dropdown WhatsApp na tabBar não abria (overflow:auto do tabBar externo clippava o dropdown absoluto); corrigido para overflow:visible no container externo",
      "FIX · Relatórios paisagem: regra @page{size:A4 landscape} movida para fora do @media print — era CSS inválido (regra @page não pode ser aninhada em @media); agora funciona em todos os navegadores",
      "FIX · Log Admin: DEV_CHANGELOG atualizado com Sessão 5 (hoje); entradas de sessão anteriores já apareciam, faltava apenas o registro de hoje",
      "FEAT · Regras de Diárias revisadas: nova lógica completa com data de chegada — REGRA 1: chegou+descarregou antes/na agenda → Sem Diária; REGRA 2: chegou na agenda, descarregou depois, informou analista → Com Diária; REGRA 3: chegou depois da agenda → Sem Diária; REGRA 4: sem chegada → lógica legado mantida",
      "FEAT · UI redesign: header mais alto (44px logo, 14px padding), tabBar estilo underline (borda inferior dourada na aba ativa), botões pill-shaped (borderRadius 24px, minHeight 44px), cardKanban com borda lateral de status",
      "FEAT · Aba Operacional: nova aba com sub-abas SGS (chamados) e Apontamentos — formulários de cadastro, listagem, persistência localStorage",
      "FEAT · Relatório por Motorista (PDF): gerarRelatorioMotorista — card do motorista, resumo financeiro, todas as viagens com status/diária, baseado no relHtmlBase",
      "FEAT · Relatório Geral do Período (PDF): gerarRelatorioGeral — KPIs, resumo por motorista, tabela completa de registros no período, SGS no período; botão 📊 fixo na tabBar",
      "FEAT · Permissão Operador: financeiro liberado (era false, agora true) para perfil operador",
    ],
  },
  {
    data: "2026-03-19 13:42", sessao: "Sessão 4",
    itens: [
      "01 · Admin Contatos: importar CSV Google Contacts ou vCard (.vcf); comparação com existentes; conflitos exibidos lado a lado com opção Manter atual / Usar importado; operações ≥5 contatos exigem digitar 'ESTOU DE ACORDO'",
      "02 · Cards Diárias/Descargas: campo RO (Registro de Ocorrência) e MAT adicionados ao formulário; chip 🔵 RO visível nos cards linha e bloco",
      "03 · Segundo botão WhatsApp (📄 DOC): formato documentário MOT/CTE/MDF/MAT/PLACAS/DT·NF·ID·RO; RO obrigatório; OBS opcional com memória do último valor",
    ],
  },
  {
    data: "2026-03-19 13:12", sessao: "Sessão 3",
    itens: [
      "00 · Modal Motorista: campo Vínculo → dropdown (Agregado/Terceiro/Frota); seção Dados Bancários adicionada (BCO, AGE, C/C, FAV, PIX c/ seletor de tipo)",
      "01 · Alertas de Descarga EVA: botão 📅 para adicionar ao calendário — gera .ics (celular) ou abre Google Calendar (notebook)",
      "02 · Log Admin: histórico de desenvolvimento (DEV_CHANGELOG) embutido no app; abas Desenvolvimento / Operacional no log",
      "03 · Motoristas: campo de busca por nome ou placa; exportação vCard (.vcf); script de normalização de contatos no Admin",
      "04 · WhatsApp card: modal rico com todos os campos da DT antes de abrir o WhatsApp; PGTO Cheque/Conta/Ambos com validação bancária e soma ≤ ADT",
    ],
  },
  {
    data: "2026-03-19 07:19", sessao: "Sessão 2",
    itens: [
      "BUG #1 · getConfigRemoto/setConfigRemoto: colunas corrigidas para 'chave'/'valor' (PostgREST retornava HTTP 400 com 'key'/'value')",
      "BUG #2 · getConexao: variáveis de ambiente VITE_SUPABASE_URL/KEY agora são PRIORIDADE (garante sync desktop + mobile)",
      "BUG #3 · setConfigRemoto: campo updated_at removido do payload (não existe na tabela co_config)",
      "FEAT · Login social: botões Google e Apple via Supabase Auth REST — redireciona para /auth/v1/authorize, captura hash #access_token no retorno",
    ],
  },
  {
    data: "2026-03-18 23:56", sessao: "Sessão 1",
    itens: [
      "FEAT · Sistema de backup automático: cria App.jsx.bckp_TIMESTAMP antes de cada sessão de mudanças",
      "FEAT · Log de alterações: tabela co_logs_alteracoes no Supabase + fallback localStorage (co_logs_local)",
      "FEAT · Acompanhamento dia a dia da DT: timeline com registro de texto e imagens por dia",
      "FEAT · Modal Detalhe / Ocorrências: timeline visual, ocorrências por tipo (info/alerta/status), acompanhamento persistido",
      "FEAT · Multi-perfil: admin, gerente, operador, visualizador com permissões granulares",
      "FEAT · Sync Supabase: paginação 1000 registros por página, override local/remoto",
      "FEAT · Export CSV / XLS / PDF; ExportMenu dropdown",
      "FEAT · Tema dark/light; logo customizável no primeiro login",
      "FEAT · Dashboard com gráficos Chart.js (bar/pie) agrupados por mês/motorista/destino/status",
    ],
  },
];

export const ENV_SUPA_URL = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_SUPABASE_URL || "") : "";
export const ENV_SUPA_KEY = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_SUPABASE_KEY || "") : "";
