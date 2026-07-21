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
  txtInverse:  "var(--color-text-inverse)",
  chipSolidSuccess: "var(--chip-solid-success)",
  chipSolidWarning: "var(--chip-solid-warning)",
  chipSolidDanger:  "var(--chip-solid-danger)",
  chipSolidInfo:    "var(--chip-solid-info)",
  chipSolidIndigo:  "var(--chip-solid-indigo)",
  chipSolidNeutral: "var(--chip-solid-neutral)",
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
// Tabs fixadas no bottom bar mobile (compartilhado entre BottomNav e AppSidebar,
// para o drawer "Mais" não duplicar o que já está fixado embaixo).
export const MOBILE_NAV_PINNED = ["dashboard", "financeiro", "planilha", "descarga"];
export const PERMS_PADRAO = {
  // ── Admin: acesso total ──
  admin:      {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:true,  usuarios:true,  ocorrencias:true,  cadastros:true },
  // ── Gerente: vê financeiro, edita tudo operacional, sem config de sistema ──
  gerente:    {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:true,  cadastros:true },
  // ── Operador: edita tudo operacional incluindo financeiro, sem config de sistema ──
  operador:   {financeiro:true, editar:true, importar:true, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:true,  cadastros:true },
  // ── Visualizador: somente leitura ──
  visualizador:{financeiro:false,editar:false,importar:false,dashboard:true,diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:false, cadastros:false},
};
export const PERMS_LISTA = [
  {key:"financeiro",lbl:"Financeiro"},{key:"editar",lbl:"Editar"},{key:"importar",lbl:"Importar"},
  {key:"dashboard",lbl:"Dashboard"},{key:"diarias",lbl:"Diárias"},{key:"descarga",lbl:"Descarga"},
  {key:"planilha",lbl:"Planilha"},{key:"ocorrencias",lbl:"Ocorrências"},{key:"cadastros",lbl:"Cadastros"},{key:"config_db",lbl:"Config DB"},{key:"usuarios",lbl:"Usuários"},
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
    data: "2026-07-21", sessao: "Sessao 49",
    itens: [
      "FEAT · Conferencia de Faturamento: tratamento de DEVOLUCAO (FOB) no CNPJ nao cadastrado. Algumas cargas voltam e o CNPJ Remetente da planilha nao e o cliente -- e quem devolveu (frete FOB, nao CIF). Antes so dava pra 'Cadastrar' (criava embarcadora fantasma, rachava o faturamento) ou 'Ignorar' (sumia com a receita). Agora o bloco de CNPJ nao cadastrado tem um 3o caminho: modo 'E devolucao' -> escolhe o cliente-alvo + mapeia os codigos de Empresa -> as linhas entram no faturamento DESSE cliente, marcadas is_devolucao/FOB, guardando o cnpj_remetente real.",
      "FEAT · A regra fica SALVA: o CNPJ de devolucao vira registro em `embarcadoras` (tipo='devolucao', devolucao_de_cnpj aponta pro cliente-alvo; frete_cod/desc_local_cod/diaria_cod = codigos das linhas da devolucao). Nas proximas importacoes esse CNPJ reclassifica sozinho via clienteEfetivo() no parseFreteXLSX. EmbarcadorasCad filtra tipo!='devolucao' -- essas regras nao poluem o cadastro de clientes.",
      "DB · Migration 020 (RODADA no Supabase): embarcadoras + tipo/devolucao_de_cnpj; frete_conferencia + is_devolucao/modalidade (CIF|FOB), tudo aditivo com default.",
      "FEAT (fase 2, visibilidade FOB) · Badge 'DEVOLUCAO · FOB' (azul) nos cards da fila de revisao e no modal de revisar quando is_devolucao. Na planilha exportada (gerarWorkbookXLSX): coluna 'Modalidade' (CIF / FOB (devolucao)) nas abas por categoria + secao 'Devolucoes (FOB)' no RESUMO (registros/frete/saldo por cliente).",
      "PENDENTE · Nao validado em navegador logado (login exige credencial). Build passa.",
      "FIX (SyncSupabase.gs) · Celulose duplicada: a carga existia na aba geral '07/2026' (financeiro VAZIO, so verificacao) e na dedicada '07/2026 CELULOSE' (valores reais). Como upsert_sem_dt atualiza a pendencia enquanto pendente casando por placa+cpf+origem, a aba processada por ultimo sobrescrevia -- a geral (vazia) apagava CTe/contrato/data_carr da dedicada (por isso pendentes apareciam sem valores). Fix: linha de celulose em aba NAO-dedicada (nome sem 'CELULOSE') e ignorada; celulose so entra da aba dedicada. Celulose hoje e exclusiva de Imperatriz; se outra base passar a ter, trocar por regra por base/periodo.",
      "DIAGNOSTICO+LIMPEZA (fila sem-DT celulose) · Os cards de celulose apareciam em branco no app: NAO era mapeamento (a aba '07/2026 CELULOSE' e lida certa, os dados estao todos na principal com os 2 carregamentos do LUIZ separados por DT). Eram 4 pendencias ORFAS de 17/07 (MANOEL/CRISLEY/MARCELO/LUIZ), capturadas quando a celulose vinha da aba geral SEM DT/sem data; a carga real depois entrou com DT direto na principal e a ficha sem-DT ficou presa. Nao conciliava porque o match exige placa+data_carr+origem e a ficha tinha data_carr vazio. Verificado por query na producao; as 4 marcadas 'conciliado' com o DT real de cada uma (fila Pendentes zerou).",
      "DB · Migration 021 (APLICADA via MCP + no repo): conciliar_sem_dt_existentes() ganhou 2o passo -- fallback que fecha pendencia com data_carr VAZIO quando a mesma placa+origem+tipo_carga ja tem DT real na principal. Pendencia COM data segue exigindo match exato. Roda a cada sync; dry-run e chamada pos-deploy retornaram 0 (sem efeito retroativo surpresa). Blindagem contra recorrencia do orfao.",
      "REGRA (Yves) · 'x'/'X' na coluna DT = carga REAL que ficou SEM DT (ex.: sistema Suzano fora do ar). NAO desconsiderar -- fica na fila 'Cargas sem DT' pra validacao humana (abas Pendentes/Confirmadas) ate o DT verdadeiro sair. O total de celulose (~26) inclui essas.",
      "FIX (DB, migration 022 APLICADA via MCP + repo) · Conciliacao tratava 'x' como DT valido (so checava dt<>''), entao uma linha-fantasma dt='x' na principal FECHAVA por engano a pendencia (dt_conciliado='x'), sumindo a carga da fila de validacao -- oposto do que a regra pede. Fix cirurgico: gatilho 018 e RPC 019/021 ganharam guarda upper(btrim(dt))<>'X' nos matches; DT real concilia igual, so o 'x' deixa de ser aceito. Corrigidas 3 pendencias falsamente conciliadas: ANTONIO e FLAVIO (sem DT real) reabertas p/ Pendentes; JOSUE (tinha DT real 23470415) teve o dt_conciliado corrigido. NAO deletei nenhuma linha 'x' (a pedido: X nao pode desconsiderar).",
      "LIMPEZA (dados, via MCP) · Removidas as 2 linhas-fantasma dt='x' da principal (ANTONIO, FLAVIO) que contavam em DOBRO (na principal E na fila). Ambas preservadas na fila (ANTONIO confirmado, FLAVIO marcado erro pelo Yves) -- 'X nao desconsiderar' respeitado. Pos-limpeza: 0 fantasmas; celulose = 19 com DT + 6 sem DT aguardando. Os 26 da aba fecham em 'Mes: Todos' (3 sao de junho + THIENY sem data); em julho isolado da 15 com DT.",
      "FEAT · Indicador 'Sem DT' no Dashboard (decisao do Yves: indicador separado, nao mexer no DADOS). Novo KPI que le a fila controle_operacional_sem_dt (pendente+confirmado) e mostra as cargas reais que ficaram sem DT (ex.: Suzano fora do ar), seguindo o filtro de tipo de carga. Composicao real da celulose confirmada por SQL: 19 com DT + 7 sem DT (2 pendente + 5 confirmado) = 26 (os 8 conciliado ja viraram DT real; 1 erro descartado). Implementacao aditiva: cargasSemDt.contarSemDtAguardando(conn,tipo,mesRef); DashboardView le via getConexao no useEffect e adiciona o KPI so na base imperatriz_belem quando >0; App.jsx so passou filtroTipoCarga+getConexao no ctx (edicao via Python). O card SEGUE O MES selecionado (mesma extracao MM/YYYY do dashData) e o filtro de tipo -- consistente com o 'Carregamentos' ao lado; 'Mes: Todos' mostra o total da fila. DADOS/dashData/KPIs existentes intactos. Build ok.",
    ],
  },
  {
    data: "2026-07-20", sessao: "Sessao 48",
    itens: [
      "FIX · Fila 'Cargas sem DT' nao puxava CTe/valores mesmo com o Sheets preenchido. CAUSA: o SyncSupabase.gs gravava a pendencia com resolution=ignore-duplicates (pra nao apagar decisao humana), entao a linha ficava CONGELADA no estado da 1a captura -- o que voce preenchesse depois (data/CTe/contrato) nunca descia pra fila. Confirmado no banco: pendencia do WILSON (id 995) capturada em 17/07 com tudo vazio, atualizado_em=criado_em; os valores reais (CTe R$9.880) estavam na tabela principal sob DT='x'.",
      "FIX (backend) · Migration upsert_sem_dt_atualiza_enquanto_pendente: nova funcao upsert_sem_dt(jsonb) que ATUALIZA os valores enquanto status='pendente' e CONGELA depois que um humano decidiu (confirmado/erro/conciliado). Casa pela identidade estavel placa+cpf+origem (nao depende de data_carr/valores, que chegam depois). SyncSupabase.gs passou a enviar a fila via essa RPC no lugar do POST ignore-duplicates.",
      "FIX · SyncSupabase.gs: 'x'/'X' (ou vazio) na coluna DT agora e tratado como SEM DT (ainda nao saiu DT pro carregamento) -> vai pra fila de revisao, nao pra tabela principal. Antes, qualquer texto no DT (inclusive 'x' placeholder) entrava na principal e criava linha-lixo (ex.: WILSON com DT='x', ADALBERTO com DT='X').",
      "FALTA (Yves): colar o SyncSupabase.gs atualizado no Apps Script e rodar 1 sync. DEPOIS: limpeza das linhas-fantasma DT='x'/'X' na tabela principal (nao sao DT real) -- faco via SQL apos o 1o sync confirmar a captura pra fila.",
    ],
  },
  {
    data: "2026-07-17", sessao: "Sessao 47",
    itens: [
      "FIX CRITICO · Margem/saldo mostrando valores astronomicos na Planilha (ex.: DT 23468978 com CTE R$15.600 e Contrato R$12.341,85 mostrava margem de R$32 quatrilhoes). CAUSA RAIZ: quando a celula do Sheets e um NUMERO de verdade (nao texto), o SyncSupabase.gs fazia v.toString() nela, que usa ponto decimal americano sem milhar (ex.: 12341.85 -> \"12341.85\"), diferente do formato BR (\"12.341,85\") que o resto do pipeline sempre usou. O parser do app (PlanilhaView.jsx calcMargem/fmtR) assumia SEMPRE formato BR e removia TODO ponto como separador de milhar -- num valor americano isso stripa o ponto decimal, inflando o numero ~100x-1000x (com float garbage tipo \"3702.5599999999995\" vira um inteiro de 17 digitos = ~37 quatrilhoes). CONFIRMADO: 489 linhas (quase metade da base) afetadas.",
      "FIX · SyncSupabase.gs: campos financeiros (vl_cte/vl_contrato/adiant/saldo/diaria_prev/diaria_pg) que chegam como NUMBER do Sheets agora sao formatados via toLocaleString('pt-BR') antes de virar string -- nao corrompe mais na origem.",
      "FIX · Novo parseValorBR (utils.js), tolerante aos DOIS formatos (BR e americano) + celulas quebradas ('#VALUE!', '13,045,90' com virgula dupla -> trata como sem valor em vez de adivinhar). Substituiu os parsers locais buggy em PlanilhaView.jsx (fmtR/calcMargem), CargasSemDt.jsx (num) e utils.js (fmtMoeda, que antes usava parseFloat direto e quebrava em valores BR com virgula tipo 'R$ 2.036,00' -> mostrava '-'). Nao fez backfill nos dados ja gravados (489 linhas) -- decisao deliberada de nao mexer em dado financeiro existente; o parser tolerante corrige a EXIBICAO sem precisar reescrever o banco.",
      "VALIDADO contra producao (Node + fetch real, sem servidor): DT 23468978 (exato do relato) agora calcula margem R$3.258,15 (correto). Amostra de 282 linhas no formato 'americano' testada -- nenhuma gera valor absurdo (maior |margem| encontrada: R$5.720,46). Casos de borda (BR, americano, float garbage, '#VALUE!', virgula dupla, vazio) todos corretos.",
      "FIX · 'Sessao nao autenticada' ao salvar/editar/excluir (aparecia como 'Salvo local. Sync: Sessao nao autenticada'). CAUSA: sessionToken vive so em memoria; no reload da pagina, App.jsx tenta regenera-lo via RPC mas em fire-and-forget (.catch(()=>{})) -- se essa chamada falhar (rede, corrida com getConexao ainda nao pronto), o token fica null PRA SEMPRE ate logout/login manual, e toda gravacao passa a falhar silenciosamente. useDTHandlers.js ganhou garantirSessionToken(): antes de desistir, tenta regenerar o token UMA vez usando o email ja salvo em co_sessao, nos 4 pontos de escrita (upsert normal, upsert AVB, delete, patch de minutas). Self-heal sem precisar deslogar.",
      "NAO TESTADO em navegador (boot-check) -- ferramenta de preview instavel durante troca de modelo nesta sessao. Build limpo e validacao end-to-end contra producao feitas; pedir confirmacao visual ao Yves.",
      "UX · Fila 'Cargas sem DT': cada card agora é CLICAVEL e abre um modal com o registro completo pra editar/corrigir campos (placa, data, origem, valores, tipo_carga), Salvar correções, Confirmar carga, Marcar erro, Reabrir e Excluir (delete definitivo, com aviso de que 'marcar erro' e melhor pra descarte recorrente porque o sync nao recaptura). Antes so tinha os 2 botoes soltos (vago). Novas funcoes atualizarSemDt/excluirSemDt em cargasSemDt.js. Editar (PATCH campos) e Excluir (DELETE) validados end-to-end contra producao (round-trip).",
      "FEAT (Fase 3, tela) · Fila 'Cargas sem DT' no app (src/cargasSemDt.js + views/CargasSemDt.jsx), acima da Planilha, so na base Imperatriz/Belem. Abas por status (Pendentes/Confirmadas/Erros/Conciliadas) com contagem; cada carga mostra motorista/placa/rota/data/valores + chip Celulose; botoes Confirmar carga e Marcar erro (e Reabrir). Nao mexe em controle_operacional -- so nos status daqui; a conciliacao com o DT verdadeiro e automatica no banco. VALIDADO end-to-end contra producao com a anon key: GET pendentes (9: 6 celulose+3 papel), contagem por status, e PATCH confirmar/reverter (round-trip). Build ok, app inicia sem erro. Render visual nao testado (login exige senha).",
      "FIX (Fase 3) · Primeira rodada real capturou 142 sem_dt, mas 133 eram linha-espelho (mesma carga que ja entrou com DT em outra linha da planilha) -- o gatilho so concilia DT NOVO, nao os ja existentes. Migration 019: funcao conciliar_sem_dt_existentes() concilia em lote contra DTs presentes; SyncSupabase.gs chama a cada rodada (self-heal) e reporta sem_dt_conciliadas no painel. Rodada inicial fechou as 133, sobraram 9 pendencias REAIS (6 celulose de julho sem DT + 3 papel antigas). Confirmado: as celulose sem DT que o Yves mencionou estao corretamente na fila.",
      "FEAT (Fase 3, backend) · Cargas SEM DT deixaram de ser descartadas. Migration 018: tabela controle_operacional_sem_dt (fila de revisao, fora dos totais) + gatilho conciliar_sem_dt_trg que, quando um DT verdadeiro entra em controle_operacional, concilia por placa+data_carr+origem e fecha a pendencia (status 'conciliado') sem duplicar. SyncSupabase.gs agora captura linha sem DT QUE TEM PLACA (sem placa = template, segue ignorada) e faz upsert com resolution=ignore-duplicates (nunca sobrescreve status/decisao ja dada por humano); tipo_carga vem da origem. Reestruturado: parsing de origem movido pra ANTES do check de DT. VALIDADO via SQL: captura + conciliacao com caixa/espacos divergentes casa; pendencia sem par fica 'pendente'. Sintaxe do .gs conferida (node --check). FALTA: tela da fila 'Sem DT' no app (confirmar/marcar erro) + colar o .gs novo no Apps Script.",
      "FIX · Tema claro da Planilha: rotulos das KPIs e cabecalho das colunas (e mais 24 valores) estavam INVISIVEIS no tema claro -- o bloco .pv-* do layout.css foi escrito so pro escuro, com rgba(255,255,255,x) hardcoded (branco sobre branco). Havia ate um override [data-theme=light] .pv-* vazio como TODO. Tokenizado: textos->var(--text3/--text2/--text), fundos->var(--card/--card2), bordas->var(--border/--border2). VALIDADO em pagina isolada no tema claro: cabecalho/rotulos renderizam em #5a6575 (WCAG AAA) sobre #ffffff, medido via getComputedStyle.",
      "FEAT (Fase 2) · Filtro global Todos/Papel/Celulose no topbar, so na base Imperatriz/Belem (App.jsx): seletor segmentado ao lado do chip de base que filtra o DADOS global -> vale pra Dashboard, Planilha, Financeiro e demais telas da base de uma vez. Default 'todos' = nada muda; tipo_carga ausente conta como papel. Reseta ao trocar de base. Planilha ganhou chip 'Celulose' por linha (PlanilhaView.jsx). Build ok e app inicia sem erro; filtragem em si nao testada em navegador (login exige senha).",
      "FIX · Sync dava HTTP 400 em marcar_fora_planilha ('UPDATE requires a WHERE clause', erro 21000): a RPC fazia UPDATE sem WHERE (reescrevia a tabela toda a cada 15min) e o Supabase passou a bloquear isso -- o flag fora_planilha tinha parado de atualizar. Migration 017: adiciona WHERE que so toca as linhas cujo valor mudaria (mesma semantica, sem bloat). Pre-existente, sem relacao com tipo_carga. VALIDADO: RPC chamada com todos os DTs atuais roda sem erro, 1030 linhas fora_planilha=false. VALIDADO tbm: celulose finalmente entrou (3 linhas com DT, origem limpa 'IMPERATRIZ-MA'); as outras 4 seguem sem DT na planilha.",
      "FIX+FEAT · Base Imperatriz passou a ter 2 tipos de carga: papel (maioria) e celulose. DESCOBERTA: as cargas de celulose NAO estavam chegando no banco -- a origem vinha como 'IMPERATRIZ-MA, CELULOSE' e a validacao de origem do SyncSupabase.gs (lista fechada) reprovava e descartava em silencio (confirmado na producao: 0 linhas de celulose, so 870 IMPERATRIZ-MA + 154 BELEM-PA). Migration 016: coluna controle_operacional.tipo_carga (default 'papel', sem backfill). SyncSupabase.gs agora separa o sufixo ', CELULOSE' da origem ANTES de validar: grava tipo_carga='celulose' e devolve origem limpa 'IMPERATRIZ-MA'. Parsing testado contra os valores reais da planilha (com/sem espaco, minuscula, ',PAPEL'). FALTA: colar o .gs atualizado no Apps Script + filtro Papel/Celulose no app (Fase 2).",
      "FEAT · Conferencia de Faturamento: 'Marcar revisado' nao decide mais direto -- agora abre campo de justificativa OBRIGATORIA (o que foi verificado/feito), com atalhos de um clique para os motivos recorrentes. Antes toda revisao gravava o texto fixo 'revisado -- sem acao necessaria', sem rastro do porque.",
      "FEAT · Cadastro de embarcadora puxa os dados oficiais do CNPJ (novo src/receitaCnpj.js): em Cadastros > Embarcadoras preenche razao social/cidade/UF ao completar os 14 digitos, e no import de planilha o formulario de CNPJ desconhecido ja vem preenchido. O 'nome' (apelido de exibicao) so e SUGERIDO se estiver vazio -- nunca sobrescreve 'Suzano Imperatriz' por 'SUZANO PAPEL E CELULOSE'.",
      "NOTA · O site da Receita (solucoes.receita.fazenda.gov.br/Servicos/cnpjreva) tem captcha e nao tem API -- nao da pra automatizar. Usa-se a MESMA base oficial pelos Dados Abertos do CNPJ via BrasilAPI (gratis, sem chave, CORS liberado) com fallback pra MinhaReceita. Dado e do ultimo dump mensal, o que e indiferente pra nome/cidade/UF. VALIDADO no navegador (origem localhost:5173): BrasilAPI 200 -> SUZANO S.A./IMPERATRIZ/MA/ATIVA; 404 de CNPJ inexistente nao dispara fallback; com a BrasilAPI derrubada cai na MinhaReceita; com as duas fora, mensagem legivel e cadastro manual segue. ATENCAO: BrasilAPI responde 403 (Cloudflare) pra fetch do Node -- so funciona do navegador, entao nao reaproveitar esse modulo em script/servidor sem trocar a fonte.",
      "FEAT · Regra da frota Rodorrica: Frete com Saldo de exatamente R$ 300,00 (contrato = CTe - 300 por regra) ganha badge 'POSSIVEL FROTA RODORRICA' no modal + pergunta 'Este CTRC e frota?' com 'Sim, e frota Rodorrica' (decisao_manual=frota_rodorrica, justificativa automatica) e 'Nao e frota - revisar' (cai na justificativa livre). Detecta o candidato, nao decide sozinho: a planilha bruta nao diz de quem e a frota (freteConferencia.js:ehCandidatoFrotaRodorrica).",
    ],
  },
  {
    data: "2026-07-15", sessao: "Sessao 46",
    itens: [
      "FIX · Conferencia de Faturamento: a fila de revisao mostrava muitos itens como 'margem < 10%' que na verdade estavam ok. A coluna 'Margem Lucro' da planilha bruta divide o Saldo pelo TOTAL DO FRETE (Frete Peso + pedagio/gris/etc.), o que subestima a margem (ex.: CTRC 34681 dava 9,0% quando a margem real sobre o Frete Peso e 10,2%). Agora a margem e calculada no app como Saldo / Frete Peso (freteConferencia.js:margemBruta); flags, modal, lista, indicadores e exportacao usam esse valor.",
      "NOTA · Usa-se o Saldo (sobra que o sistema ja calcula) e nao (frete_peso - contrato) porque o Contrato da planilha e inconsistente em ~665 linhas de Frete (0, inflado, ou = frete_peso no Local, o que zeraria margens reais). No Frete o Saldo E justamente frete_peso - contrato, entao o resultado bate com o pedido. Descarga (margem 0) e Diaria (negativa esperada) seguem com regra flexivel, sem flag.",
      "DATA · migration 015_frete_margem_bruta_recalc.sql: backfill que recalculou margem_lucro + flags nas 3.020 linhas ja importadas (167->fila muda so em 27 itens abertos: 25 saem, 3 entram). Nao toca decisao_manual. Aplicado no Supabase.",
      "FEAT · Conferencia de Faturamento: botao 'Estornar' em cada item da secao Revisados (ConferenciaFrete.jsx + freteConferencia.js:estornarRevisao) — desfaz uma decisao clicada sem querer (ex.: 'correcao feita'), limpa decisao_manual/revisado_* e devolve a linha a fila se ainda tiver flag ativa.",
    ],
  },
  {
    data: "2026-07-14", sessao: "Sessao 45",
    itens: [
      "CAUSA DO ALERTA DE DISK IO DO SUPABASE · O e-mail 'depleting its Disk IO Budget' foi consequencia do refetch em loop (getConexao() devolvia objeto novo a cada render -> useEffect do useMotoristas refazia o fetch a CADA render do App). Medido no pg_stat_statements: SELECT em `motoristas` com 81.261 chamadas e 45 MINUTOS de CPU acumulados, e `veiculos` com 55.550 -- em tabelas criadas no MESMO DIA (~5 req/s ininterruptos). Nao era volume de dado (banco inteiro tem 21 MB, cabe em RAM) nem limite do plano free.",
      "VALIDADO · Stats zeradas (pg_stat_statements_reset) e app exercitado com o codigo corrigido: navegacao por 7 telas + alternancia entre as 3 abas de Cadastros 5x resultou em 1 chamada de motoristas, 1 de veiculos, 1 de embarcadoras. Zero leitura de disco. De 81.261 -> 1.",
      "NAO E PROBLEMA · Os ~140 mil INSERTs em controle_operacional no pg_stat_statements sao o acumulado HISTORICO de meses (as stats nunca tinham sido zeradas); o sync do Sheets ja envia em lotes de 50 (SyncSupabase.gs). Nao ha o que otimizar ali.",
      "DECISAO · Nao vale pagar upgrade de compute (o consumo era artificial, nao demanda real) nem migrar pra PocketBase/outro backend -- o gargalo nunca foi o Supabase. Revisar o Disk IO no painel nos proximos dias: o budget se recompoe sozinho com o consumo normalizado.",
    ],
  },
  {
    data: "2026-07-14", sessao: "Sessao 44",
    itens: [
      "FIX · Logout nao funcionava: logoutSupa() so removia a sessao DEPOIS de esperar signOut() (uma request de rede) e, se ela falhasse, o catch engolia o erro em silencio -- a sessao continuava no localStorage e o bootstrap (App.jsx getSession()) re-logava no proximo render/reload. Agora limpa a chave `co_supa_auth` PRIMEIRO, sem esperar a rede; a revogacao server-side vai em background. Validado no navegador: logout limpa sessao+tokens, volta pro login e CONTINUA deslogado apos reload.",
      "CORRECAO DO DIAGNOSTICO DA SESSAO 43 · Os picos de 14-40s NAO eram culpa do RLS (atribuicao anterior estava errada). Causa real: CADA migration (DDL) invalida o cache de schema do PostgREST, e a PRIMEIRA request depois fica pendurada esperando a reconstrucao. Eu apliquei 7 migrations enquanto o Yves usava o app -- a lentidao era auto-infligida e transitoria. Medido sem DDL no meio: 526ms > 324ms > 210ms. Baseline limpo atual: hub_profiles 107ms, hub_user_modulos 152ms, hub_modulos 256ms, motoristas(848 linhas) 592ms, veiculos(727) 609ms.",
      "PERF · Migration 012: consolidadas as policies do Hub (hub_profiles e hub_user_modulos tinham 2 policies PERMISSIVAS por SELECT -- Postgres avalia TODAS e faz OR; a segunda chamava is_hub_admin() sem subquery, reavaliado por linha). Agora 1 policy por comando, com o mesmo OR explicito (semanticamente identico). Tambem: indice na FK hub_user_modulos.modulo_slug (o JOIN de meus_modulos() roda a CADA login e varria a tabela) e drop de idx_config_chave (duplicata exata da PK co_config_pkey).",
      "SEGURANCA · Consolidacao de policies validada com JWT simulado nos 3 cenarios: usuario comum ve so o proprio perfil (0 de outros), admin ve todos (7 perfis/9 acessos/5 modulos), usuario comum BLOQUEADO de se auto-conceder modulo (insert indevido = 0). Comportamento identico ao de antes.",
      "CLEANUP · Removidos 3 wrappers lazy orfaos (ResultadoWrapper/PainelFinanceiroWrapper/CreditosPendentesWrapper) -- FinanceiroView importa os componentes direto, nunca foram usados. Removida chave duplicada '💬' em Icon.jsx (gerava warning em TODA build).",
      "ESCOPO · 85 dos 95 avisos de 'multiple permissive policies' e 26 dos 27 FKs sem indice do Advisor sao do schema `frota` (app frota-pro, tabelas vazias, projeto separado) -- NAO mexidos de proposito: risco sem ganho pra este app.",
      "PENDENTE · 2 tabelas de backup orfas no banco (_backup_avb_orfaos_20260611: 4 linhas, _backup_avb_dups_20260611: 75 linhas), sobra de uma limpeza de 11/06. Tem dado real -- nao apagadas sem confirmacao do Yves.",
    ],
  },
  {
    data: "2026-07-14", sessao: "Sessao 43",
    itens: [
      "FIX PERF · Hub 'demorado' apos a sessao 42: App.jsx chamava useMotoristas(getConexao()) incondicional, disparando 2 fetches (motoristas: 848 linhas + veiculos: 727 linhas) assim que a sessao autenticava -- AINDA no Hub/login, antes do usuario escolher modulo, competindo por rede bem na hora de abrir a tela do Google ou clicar em Gerenciar acessos. Agora so busca depois de entrar de fato no Controle Operacional (hubScreen===\"controle_op\").",
      "DIAGNOSTICO · Medido ao vivo (fetch direto do navegador, nao so codigo): consulta trivial (limit=1) em motoristas/embarcadoras/hub_user_modulos levou 14-39s via REST, mas o EXPLAIN ANALYZE da mesma query no banco rodou em <10ms -- gargalo 100% na camada PostgREST/pooler, nao no codigo nem nos dados. Bateu com o Supabase Performance Advisor: 2 policies (hub_profiles_own, hub_modulos_read) com auth.uid()/auth.role() reavaliado LINHA A LINHA por nao estar em subquery -- padrao documentado (docs: row-level-security#call-functions-with-select).",
      "FIX · Migration 011: ALTER POLICY em hub_profiles_own/hub_modulos_read/hub_user_modulos_own envolvendo auth.uid()/auth.role() em (select ...). hub_user_modulos foi de ~15.7s pra 878ms na mesma consulta depois do fix.",
      "PENDENTE · Nao achei uma causa unica definitiva pro pico de 14-39s (RLS ineficiente + cache de schema do PostgREST reconstruindo apos 5 migrations seguidas nesta sessao sao os dois suspeitos, ambos endereçados). Advisor tambem acusou 95 ocorrencias de 'Multiple Permissive Policies' espalhadas pelo projeto inteiro -- padrao pre-existente mais amplo, fora do escopo de hoje, vale um passe dedicado depois.",
      "TESTE · Validado com credencial de teste fornecida (claudecodeyfg): login + Hub carregando sem travar. Troca de sessao (logout/relogin) no navegador automatizado nao cooperou pra revalidar a senha resetada especifica -- nao bloqueante, a melhoria de performance foi medida direto (fetch timing antes/depois do fix de RLS).",
    ],
  },
  {
    data: "2026-07-14", sessao: "Sessao 42",
    itens: [
      "FIX · Gerenciar acessos (HubAdmin.jsx): status do usuario (pendente/aprovado/negado) era DERIVADO de existir linha em hub_user_modulos -- remover o ultimo acesso apagava a linha e jogava o usuario de volta pra 'aguardando aprovacao' sem jeito de tirar de la. Migration 010 add campo `status` proprio em hub_profiles + RPC hub_admin_set_status (SECURITY DEFINER, so admin do hub) que ao negar DESATIVA os modulos (nao apaga mais) -- historico fica pra reaprovar rapido depois. Confirmado com dado real: os 3 usuarios de teste claudecodeyfg* estavam presos nesse estado.",
      "FEAT · HubAdmin.jsx: 3 blocos explicitos (Aguardando aprovacao / Com acesso / Acesso negado), com Aprovar/Negar/Reabrir direto no card sem precisar expandir. Negados mostra so os ultimos 5 por padrao ('breve historico'), com 'Ver todos' pra lista completa. Layout desktop alargado (640px -> 960px).",
      "FEAT · Reset de senha de usuario de teste, visivel pro admin: novo endpoint api/hub-admin.js (Admin API do Supabase via service_role, mesmo padrao do api/ai-extract.js) com verificacao server-side de is_hub_admin() antes de qualquer coisa. PENDENTE DE CONFIGURACAO: precisa da env SUPABASE_SERVICE_ROLE_KEY (Supabase > Settings > API > service_role) no Vercel + .env.local -- sem ela o endpoint responde erro claro em vez de falhar silencioso. Tambem: excluir conta de teste definitivamente (auth.admin.deleteUser).",
      "FIX · HubScreen.jsx: fetchMeusModulos() sem .catch() e sem timeout deixava a tela travada em 'Carregando modulos...' pra sempre se a rede falhasse (bug reportado: login trava e da timeout). Adicionado Promise.race com timeout de 12s + estado de erro com botao 'Tentar novamente'.",
      "TESTE · Validado ao vivo: resetei a senha de claudecodeyfg via SQL direto (pgcrypto, simulando o que o novo endpoint faz), logei como esse usuario no navegador -- Hub carregou 'Nenhum modulo liberado ainda' sem travar (fix do timeout confirmado). Senha invalidada de novo depois do teste. Tela 'Gerenciar acessos' em si NAO foi verificada visualmente -- so admin (login Google do Yves) enxerga essa tela, e login Google nao pode ser automatizado aqui.",
    ],
  },
  {
    data: "2026-07-14", sessao: "Sessao 41",
    itens: [
      "FEAT · Cadastro de embarcadoras virou GLOBAL: tabela `frete_clientes` renomeada pra `embarcadoras` (migration 006) + campos novos razao_social, cidade, uf e ativo. Deixou de ser cadastro exclusivo do modulo de frete pra poder ser consumido por qualquer tela. Os codigos do TMS (frete_cod/desc_local_cod/diaria_cod) continuam na tabela, lidos so pela Conferencia de Faturamento.",
      "REFACTOR · CRUD do cadastro saiu de freteConferencia.js pra src/embarcadoras.js (listar/criar/atualizar/setAtivo/mapa + formatCNPJ) + hook src/hooks/useEmbarcadoras.js. ConferenciaFrete.jsx passou a consumir o hook; o formulario de CNPJ desconhecido na importacao ganhou cidade/UF.",
      "FEAT · Nova aba 'Cadastros' no menu (perm `cadastros`: admin/gerente/operador sim, visualizador nao) — casa dos cadastros compartilhados. Primeira secao: Embarcadoras (busca por nome/CNPJ/cidade, novo/editar, toggle ativo). CNPJ e chave e nao e editavel depois: pra corrigir, desativa e cadastra outra, senao o historico de frete_conferencia fica orfao. Desativa em vez de excluir, pelo mesmo motivo.",
      "PENDENTE · Nao validado em navegador logado (login exige credencial). Build passa e a migration 006 foi verificada no banco.",
      "FIX · criarMotoresRelatorio nao exportava gerarRelatorioMotorista e nao recebia diariasData/sgsItems (usados por dentro) -- quebrava com ReferenceError TODO relatorio PDF (Motorista/Geral/Diarias/Descargas/Operacional) ao clicar, nao so o de motorista.",
      "FEAT · Motoristas migrou de localStorage (`co_motoristas`, praticamente vazio) pra Supabase: tabelas `motoristas` + `veiculos` (migrations 007/008), cavalo/carreta vinculado por motorista_id, config_eixos/carroceria/capacidade_m3 na carreta. Migration 009 semeou 848 motoristas + 727 cavalos a partir dos nomes/placas ja existentes em controle_operacional* (a base real sempre foi o Sheets, nao o cadastro manual).",
      "REFACTOR · src/motoristas.js + src/veiculos.js (CRUD) + hook useMotoristas.js mantendo a MESMA assinatura que os ~15 arquivos consumidores ja usavam (array `motoristas` + `saveMotoristasLS(novoArray)`) -- nenhum desses arquivos precisou mudar, so App.jsx trocou a fonte.",
      "FEAT · Importacao da agenda de contatos (Google Contacts CSV) em Cadastros > Motoristas: parser extrai nome limpo, placas, config_eixos/carroceria/capacidade_m3 e status_risco (VERMELHO/BLOQUEADO/BOM/GOLPE) do texto livre do nome; classifica contra o cadastro por placa/nome em enriquecer (bulk) / novos (fila de revisao paginada, checkbox) / conflitos (placa ja pertence a outro motorista com nome bem diferente -- NAO enriquece automatico, ver caso real 'Agreg fulano' vs dono do caminhao) / semSinal (ignorado).",
      "FIX · regex de carroceria BAU usava \\b, que o JS trata Ú como nao-palavra -- \\bBA[UÚ]\\b falhava quando o campo terminava logo apos o U acentuado (ex.: celula CSV so com 'BAÚ'). Trocado por lookaround; contagem de BAU foi de 1498 pra 1771 no teste.",
      "TESTE · Parser validado via script Node standalone contra o CSV real (8979 contatos, 5736 com placa) e contra o cadastro real no Supabase (848 motoristas): 422 enriquecer, 5308 novos, 79 conflitos de placa corretamente barrados, 3249 ignorados. Nao validado em navegador logado (login exige credencial).",
    ],
  },
  {
    data: "2026-07-09", sessao: "Sessao 40",
    itens: [
      "FEAT · Sinalizados na Conferencia de Faturamento deixou de ser beco sem saida: cada item ganhou botao 'Resolucao feita' (decisao_manual=correcao_feita) que confirma a correcao na origem, tira o item de Sinalizados e o move para Revisados com quem confirmou e quando. Antes o item ficava preso na secao ate reimportacao.",
      "STYLE · ConferenciaFrete.jsx: Fila de revisao ganhou seletor de mes segmentado (Atual/Anterior/Todos, com o mes YYYY-MM em cada botao) ao lado do contador; cada pendencia agora mostra um chip com o mes de competencia. Filtro de mes tambem se aplica a 'Pendencias por usuario'.",
      "STYLE · Evolucao diaria trocou a tabela esparsa por mini-grafico de area (saldo acumulado no mes) + lista enxuta por dia (Dia/CTRCs+delta/Frete/Saldo, sem a coluna Peso que abria o vazio).",
      "STYLE · Comparativo com meses anteriores: removida a tabela dia-a-dia de CTRCs; ficam so os 3 blocos de totais.",
      "STYLE · 'Ranking de revisao' virou placar de 'Produtividade': cruza quanto cada um ja revisou (verde) com quanto ainda tem pendente (chip vermelho).",
      "STYLE · Dropdown de cliente trocado de <select> nativo (menu branco no tema escuro) por dropdown custom no estilo do app, pareado com o input de mes.",
      "FEAT · Nova secao 'Revisados' na Conferencia de Faturamento: rastro de auditoria dos itens ja decididos (fora sinalizar_correcao, que tem secao propria) com a decisao tomada, quem revisou (revisado_por) e quando -- antes o item sumia da fila sem deixar registro visivel de quem revisou.",
      "STYLE · KpiCard ganhou prop opt-in `iconTint`: quando passada, o icone do canto vira um badge maior e realcado com a cor do sistema (fundo/borda color-mix). Aplicado nos KPIs da Conferencia (frete=accent, descarga=info, local=cyan, diaria=yellow); demais dashboards inalterados (sem iconTint = icone discreto de antes).",
      "STYLE · Faixa unica de controles no Financeiro: o segmentado Operacional/Faturamento subiu do Resultado pra faixa da nav (FinanceiroView), e os filtros da Conferencia (mes + filial + acoes) sao portalizados (react-dom, slot com display:contents) pra mesma linha. Nav + segmentado + filtros lado a lado, quebrando no mobile/tablet via flex-wrap.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 39",
    itens: [
      "FEAT · Cadastro de embarcadoras/clientes da Conferencia de Faturamento migrado de hardcoded (freteConferencia.js:CLIENTES) para tabela Supabase `frete_clientes` (migration 005, seed com os 4 clientes que ja existiam). Editavel pela tela agora, sem precisar mexer em codigo pra reconhecer CNPJ novo.",
      "FEAT · parseFreteXLSX classifica por LINHA a partir do proprio CNPJ Remetente, nao exige mais um CNPJ unico por arquivo -- um export completo do TMS com varias embarcadoras misturadas importa numa tacada so. CNPJ que nao esta cadastrado nao trava a importacao: volta em `desconhecidos`, e a tela mostra pra cada um os codigos de 'Empresa' encontrados (com contagem) pra classificar como Frete/Descarga-Local/Diaria/Ignorar, dar um nome e (opcional) vincular a uma base -- cadastra e ja importa as linhas dele, ou soh ignora, tudo na hora sem sair do modal. 'Confirmar e gravar' fica bloqueado ate todo CNPJ desconhecido ser resolvido.",
      "TESTE · Validado ao vivo (login operador) com planilha sintetica de 3 CNPJs (2 conhecidos + 1 novo, 2 codigos de Empresa diferentes): classificacao correta pros conhecidos, formulario do desconhecido cadastrou 'Cliente Teste XYZ' e reclassificou as 2 linhas dele (MAT->frete, MAM c/ margem 0->descarga) sem reler o arquivo; import final gravou os 4 registros certinho. Dados de teste removidos do banco depois.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 38",
    itens: [
      "FIX · freteConferencia.js: parseFreteXLSX calculava UM periodo_ref pro arquivo inteiro (mes predominante), nao por linha. Um upload cobrindo varios meses (ex.: relatorio 01/2026 a 07/2026) carimbava TODAS as linhas com o mesmo mes errado, quebrando os filtros por periodo de todas as telas de Conferencia de Faturamento. Corrigido pra calcular por linha a partir da propria data_emissao; periodoRef de exibicao agora e o mes mais recente encontrado. diffImportFrete/listarPorPeriodos ajustados pra buscar existentes em varios periodo_ref de uma vez (arquivo multi-mes). Dado atual no banco (so 07/2026) nao foi afetado, correcao e preventiva pro proximo upload grande.",
      "FEAT · ConferenciaFrete.jsx: nova secao 'Comparativo com meses anteriores' -- mesmo intervalo de dias (01 ate o dia de corte: hoje, se o mes selecionado for o corrente, ou ultimo dia com dado, se for mes fechado) nos 2 meses antes do periodo selecionado. Totais acumulados (CTRCs/frete/saldo) lado a lado + tabela dia a dia de CTRCs nos 3 meses. Fica junto da Evolucao diaria existente (que continua mostrando so o mes atual), sem substituir nada.",
      "FEAT · Descarga (Imperatriz/Belem): confirmado no banco que a flag fora_planilha funciona (23446522/23474110 = false, tocados pelo sync; 0023446522/23379306/23471067 = true, orfaos). Dos 150 registros marcados fora_planilha, 140 tem data_carr anterior a 05/2026 -- backlog de meses ja fechados que nunca mais sera atualizado.",
      "FEAT · Toggle 'Mostrar antigos (antes de 05/2026)' nas abas Atrasados/Aguardando/Sem Motorista de DescargaView.jsx, desligado por padrao -- oculta registros com data_carr anterior a esse corte (useDescargaState.js: novo estado dscMostrarAntigos). Nao mexe em Descarrega Hoje/Carrega Hoje (ja sao filtrados pela data selecionada). KPIs do topo refletem a lista ja filtrada.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 36",
    itens: [
      "FEAT · Investigado relato de DTs aparecendo como pendentes sem achar na planilha (base Imperatriz/Belem). Achados: (1) maioria eram DTs reais na planilha so sem motorista/placa preenchidos ainda -- comportamento correto; (2) achado bug real: SyncSupabase.gs so valida origem invalida quando a celula NAO esta vazia (`if (reg.origem && ...)`), entao linha com origem em branco passa direto e derruba o LOTE inteiro (ate 50 linhas) no Supabase com HTTP 400 'origem_valida' -- limitado as abas ja fechadas 12/2025, 02/2026, 03/2026 no log atual, correcao ainda NAO aplicada (pendente decisao); (3) achado registro fantasma real: DT '0023446522' e duplicata com 2 zeros a mais do DT correto '23446522' (que sincroniza normal) -- criado uma vez em 24/06 e nunca mais tocado.",
      "FEAT · Nova coluna `fora_planilha` (default true) em controle_operacional + funcao `marcar_fora_planilha(p_dts text[])` no Supabase: a cada sync, marca false pra todo DT visto em qualquer aba na rodada e true pro resto (so roda se a varredura das abas terminar sem excecao, pra nao sinalizar errado numa rodada parcial). SyncSupabase.gs chama essa funcao uma vez ao final -- precisa colar a versao atualizada no editor do Apps Script pra entrar em vigor.",
      "FEAT · DescargaView.jsx: badge vermelho '⚠ Fora da planilha' nos cards (modo linhas e blocos) quando `fora_planilha=true` -- sinaliza sem esconder o registro, que continua contando normalmente nos KPIs.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 35",
    itens: [
      "FIX · ModalNFD.jsx: toggle 'Registrar outra NF' usava #F3BA2F (um dourado avulso, sem token) em vez do accent padrao -- trocado por t.ouro, coerente com o fundo terracota sutil que ja envolvia o campo.",
      "NOTA · Tarefa 'toda cor atrelada a um token' encerrada. O que ficou de fora, de proposito: (1) cores de marca externa (WhatsApp #25D366, logo Google no botao de login) -- nao sao paleta nossa; (2) HTML/CSS gerado pra impressao/PDF (ReportBuilder.jsx, exportHelpers.jsx) -- precisa de hex literal porque roda fora do DOM vivo do app, mesma excecao ja documentada no DESIGN.md pra Arial; (3) cores de dataset do Chart.js (PIE_COLORS etc.) -- canvas nao entende var(--token) do CSS, exigiria resolver a cor em JS antes de passar pro Chart.js (mudanca maior, nao feita agora).",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 34",
    itens: [
      "STYLE · Tokenizadas as cores 'inventadas' de maior frequencia: --cat-emerald (#22c55e, 21 usos/12 arquivos), --cat-violet (#a855f7, 14 usos/8 arquivos), --cat-tangerine (#f97316), --cat-rose (#ec4899), --cat-purple-lt (#ce93d8), --cat-amber2 (#f57c00), --rank-silver/--rank-bronze (podio AVB). Mesmo valor exato preservado -- zero mudanca visual, so passam a ter nome e local unico pra mudar no futuro.",
      "FIX · Removidos 52 fallbacks MORTOS do tipo var(--token, #hex) espalhados em 7 arquivos (maior parte OcorrenciasView.jsx, 30). Como --green/--red/--yellow/--cyan/--accent/--orange/--border2 SEMPRE existem (definidos no escopo [data-theme]), o fallback nunca disparava -- e pior, varios estavam desatualizados (var(--accent,#7c3aed) quando --accent e #D9622B; var(--green,#22c55e) quando --green e #10b981), sobrando como hex morto e confuso no meio do codigo. Confirmado via getComputedStyle que nada mudou visualmente.",
      "FIX · t.azul || \"#3b82f6\" (ConferenciaFrete.jsx, 2x) e cssVar podColors com hex solto (DashboardAVB.jsx) tambem tokenizados/simplificados.",
      "NOTA · Toda cor de UI agora esta atrelada a um token nomeado (exceto fallbacks legitimos de resiliencia tipo cssVar(x, default) e a cor oficial do WhatsApp #25D366, que e marca externa, nao token de design).",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 33",
    itens: [
      "STYLE · Dropdowns de filtro padronizados: DiariasView.jsx (2 blocos) e DescargaView.jsx reinventavam o visual de 'pill de filtro ativo/inativo' com estilo inline duplicado (copy-paste), em vez de usar a classe .pv-filter-pill que a Planilha ja usava (token-driven desde a Sessao 28). Trocado pra reusar a classe existente -- 8 <select> agora vem do mesmo lugar.",
      "STYLE · Alinhado .ds-input/.ds-select/.ds-textarea (design-system) pra usar --color-border-2 em vez de --color-border, batendo com o preset css.inp ja usado na maioria dos formularios do app -- os dois caminhos agora rendem a mesma borda.",
      "NOTA · Restante dos <select> auditado: form-dropdowns comuns (ModalRelatorios, OperacionalView etc.) ja usam css.inp/.ds-select, sem mudanca necessaria. O que parecia 'select duplicado' em ModalDetalhe/ModalEdit/ModalWhatsApp sao na verdade botoes de toggle (tipo radio), padrao correto, mantidos.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 32",
    itens: [
      "FIX · Rebrand incompleto: 144 literais rgba(240,185,11,...) / rgba(252,213,53,...) -- o amarelo Binance antigo em formato rgba() -- ainda hardcoded em 24 arquivos (graficos Chart.js, glows, sombras, botoes de filtro ativo). O script de substituicao da Sessao 28 so casava #hex exato, nunca tocou rgba(). Substituido por rgba(217,98,43,...) preservando o alpha de cada ocorrencia -- app inteiro agora consistente no terracota, incluindo os graficos do Dashboard.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 31",
    itens: [
      "STYLE · Badges de status genuinos convertidos pra solido + texto branco: contador 'pendentes' e 'sinalizados' (ConferenciaFrete.jsx), badge 'ATR' de atraso (DashboardView.jsx).",
      "FIX · 3 paineis de aviso (DescargaView.jsx, DiariasView.jsx x2) usavam rgba(240,185,11,...) -- o AMARELO ANTIGO hardcoded, nao um token, entao nao acompanhou o rebrand da Sessao 29. Corrigido pra rgba(217,98,43,...) (terracota). Esses eram literais rgba() que o script de substituicao exata da Sessao 28 nao pegou (so casava #hex, nao rgba()).",
      "NOTA · Restante do hexRgb() nas telas (glows decorativos, hover, tiles de icone, tabs, pills de filtro) foram revisados e mantidos de proposito -- sao padroes de UI legitimos (feedback de interacao, nao 'badge de status parado'), diferentes do que a Sessao 29 corrigiu.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 30",
    itens: [
      "STYLE · HubAdmin.jsx: badges de modulo (nome do modulo, Ativo/Inativo, TESTE) trocados de fundo translucido pra solido + texto branco, mesmo padrao das Sessoes 28-29.",
      "NOTA · Componente <Select> unico ja existe (src/design-system/components/Input.jsx, consome .ds-select token-driven) -- a task 'padronizar dropdowns' nao precisa criar nada novo, so falta ADOTAR ele nos <select> com estilo inline espalhados pelas views/modais (HubAdmin.jsx ja usa um estilo local consistente internamente, mas nao o componente compartilhado). Isso e o real escopo pendente.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 29",
    itens: [
      "STYLE · Rebrand: amarelo Binance -> terracota (#D9622B dark / #B24E1E light) em todos os tokens (theme-dark/light/tokens.css). AVB mantem laranja #FF6B35, com --on-primary proprio (texto escuro nos 2 temas). Fontes trocadas: Satoshi -> Manrope (titulos) + Inter (corpo), Plex Mono mantida nos dados; um CDN a menos (so Google Fonts).",
      "STYLE · Glass/blur removido: sidebar, overlays e paineis de modal deixaram de usar backdrop-filter. Bloco de CSS legado 'nova UI 2026-06' que pintava a sidebar dark em roxo/indigo hardcoded (#4f46e5, sem token) foi recolorido pro accent oficial; indigo legitimo (badge 'em transito') virou token --cat-indigo.",
      "STYLE · Badges/chips ficaram solidos (fundo forte + texto branco) em vez do fundo translucido antigo: Badge.jsx (design-system, variantes success/danger/warning/info), StatusBadge.jsx (usado em Dashboard e Ocorrencias) e os .pv-badge-* da Planilha. Cores calculadas p/ manter contraste WCAG AA com texto branco.",
      "NOTA · Fase 2 do plano de UI (badges soltos direto no JSX via hexRgb(), fora dos componentes compartilhados) ainda tem ocorrencias espalhadas por outras views/modais -- nao cobertas nesta sessao por orcamento. Fases 3 (dropdown unico) e 4 (limpeza dos ~260 hex restantes) tambem seguem pendentes.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 28",
    itens: [
      "CHORE · Removidos 102 arquivos .bak_* (2,6MB) espalhados em src/ e assets/ — o projeto ja usa Git, entao duplicar arquivo antes de editar era redundante com o historico. CLAUDE.md atualizado: instrucao de criar backup trocada por 'sugerir commit antes de alteracao arriscada'.",
      "REFAC · Leak de cor hardcoded (documentado em DESIGN.md): 49 literais #hex que coincidiam exatamente com um token existente (status/categoria/accent) trocados por var(--token) em 13 arquivos (App.jsx, PainelFinanceiro, Resultado, DiariasView, DescargaView, avb/LogisticaAVB, avb/DashboardAVB, ReportBuilder, ModalBusca, ModalDetalhe, ModalOcorrChegada, OcorrModal, exportHelpers, OcorrenciasView). Zero mudanca visual no tema dark (mesmo valor), mas agora reagem corretamente ao tema light e ao accent por filial (AVB). Build (vite build) validado sem erros novos.",
      "NOTA · Restam ~260 literais de cor que NAO batem com nenhum token existente (ex.: #22c55e, #7c3aed, #f97316, #a855f7 em OcorrenciasView e outros) — sao cores inventadas ad hoc por tela, nao um simples typo de valor. Corrigir exige decisao de design (mapear pro --cat-* mais proximo ou criar token novo), fora do escopo de uma troca mecanica; deixado como backlog.",
    ],
  },
  {
    data: "2026-07-08", sessao: "Sessao 27",
    itens: [
      "FIX · Mobile: bottom bar + drawer \"Mais\" ficavam visiveis ao mesmo tempo (duas barras de navegacao sobrepostas) — BottomNav agora some enquanto o drawer esta aberto (App.jsx).",
      "FIX · Mobile: drawer \"Mais\" (reaproveita o AppSidebar) duplicava as 4 tabs ja fixas no bottom bar (Dashboard/Planilha/Ocorrencias/Motoristas); tocar nelas so fechava o drawer sem mudar nada, dando impressao de bug (\"nao abre nada\"). Extraida constante MOBILE_NAV_PINNED (constants.js) compartilhada entre BottomNav e AppSidebar; o drawer agora so lista o que NAO esta no bottom bar (Financeiro, Diarias, Carga/Descarga, Operac./Gestao, Relatorios).",
    ],
  },
  {
    data: "2026-07-07", sessao: "Sessao 26b",
    itens: [
      "FIX · ConferenciaFrete.jsx: bug de cor achado durante o redesign — badges/bordas usavam concatenacao de string tipo `${t.borda}55` pra simular opacidade, mas t.* sao strings 'var(--x)', entao virava CSS invalido e o navegador simplesmente ignorava (bordas/backgrounds sumiam). Trocado por hexRgb(t.x, opacidade) em todo o arquivo, que ja resolve var() via color-mix.",
      "REDESIGN · ConferenciaFrete.jsx: 'Por cliente' e 'Evolucao diaria' viraram tabelas alinhadas (cabecalho, colunas de largura fixa, tabular-nums, colunas escondidas no mobile); linhas de 'Por cliente' agora sao clicaveis e filtram pelo cliente. 'Fila de revisao' e 'Sinalizados' comprimidos de 4 linhas por item pra 2, com saldo alinhado a direita. Badges de sinalizacao (margem negativa/baixa/ambigua/duplicidade) ganharam icone (mesmo estilo stroke do resto do app) em vez de so texto colorido.",
    ],
  },
  {
    data: "2026-07-07", sessao: "Sessao 26",
    itens: [
      "FEAT · Resultado: novo segmento \"Conferência de Faturamento\" (toggle no topo, ao lado de Operacional) — importa as planilhas BRUTAS de faturamento por cliente (TMS/ERP, Empresa=MAT/MAM/MAR/MRM/D01/D05), classifica por CNPJ Remetente (Suzano Imperatriz, Suzano Belem, AVB Acailandia, Couro — cadastro em src/freteConferencia.js:CLIENTES) e grava em tabela nova frete_conferencia (migration 003), ISOLADA de controle_operacional (fonte Google Sheets) — mesmo objetivo, pipelines independentes por enquanto.",
      "FEAT · Conferência de Faturamento: Descarga x Local dentro do mesmo codigo (MAM/MRM) decidido por Margem Lucro (==0 -> Descarga, !=0 -> Local); fila de revisao com flags automaticas (margem negativa, margem <10%, classificacao ambigua perto do corte de margem) e deteccao de DUPLICIDADE DE VALOR (mesma Placa+Valor NF+Peso NF+Trecho+Total do Frete em CTRCs diferentes) — decisao sempre manual (decisao_manual na tabela, nunca sobrescrita em reimportacao).",
      "FEAT · Conferência de Faturamento: filtro por cliente (Todos / Suzano Imperatriz / Suzano Belem / AVB Acailandia / Couro) e painel 'Pendencias por usuario' (nome_usuario da planilha) na fila de revisao, pra saber com quem falar em caso de erro.",
      "DATA · processar_multi_cliente.py (fora do repo, entregue ao usuario): script standalone que gera o mesmo agrupamento em Excel (FRETES/DESCARGAS/LOCAIS/DIARIAS + aba DASHBOARD) para quem preferir nao usar o app — mesma logica de classificacao do freteConferencia.js.",
      "FEAT · Conferência de Faturamento: novo botao \"Sinalizar para correcao\" no modal de revisao, com campo de nota livre (decisao_manual='sinalizar_correcao' + revisado_obs + revisado_em, sem coluna nova) — pra casos onde nem 'É Descarga/Local' nem 'Marcar revisado' fazem sentido (ex.: duplicidade real que so se resolve corrigindo a planilha de origem). Nova secao 'Sinalizados' na tela mostra data + nota de cada um, igual ao padrao ja usado em cobrado_em/cobranca_obs de CreditosPendentes — sai do alerta mas continua contando no total (listarTodosPeriodo ignora decisao_manual).",
      "REFAC · KPI cards unificados: KpiCard (src/components/KpiCard.jsx) ganhou API unica (label/value/sub/color/danger/icon/onClick/compact) e passou a ser usado por Dashboard, PainelFinanceiro, CreditosPendentes, ConferenciaFrete, Resultado, avb/DashboardAVB e avb/GestaoAVB — cada um tinha sua propria funcao kpi()/markup quase identico. DescargaView/DiariasView ficaram de fora (sao abas de filtro clicaveis, nao KPIs estaticos). De brinde, RelatoriosView.jsx ganhou os campos sub/color que o KpiCard antigo ignorava silenciosamente.",
      "FIX · DashboardView.jsx: removidas ~175 linhas de branches acailandia_avb (KPI Financeiro/Operacional AVB, Top Rotas AVB, leaderboard Por Contratante) que nunca executavam — App.jsx sempre roteia a base AVB pro avb/DashboardAVB.jsx separado.",
      "FEAT · Conferência de Faturamento: resumoPorDia() (freteConferencia.js) agrupa por data_emissao; nova secao 'Evolucao diaria' mostra CTRCs/peso/frete/saldo por dia com delta ▲▼ vs dia anterior, pra acompanhar o mes sem esperar fechar. Tabela 'Por cliente' ganhou coluna Saldo + linha TOTAL (igual ao modelo RDR usado fora do app).",
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
