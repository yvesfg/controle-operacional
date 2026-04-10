// ── constants.js — gerado automaticamente ──

export const themes = {
  dark: {
    // Backgrounds — profundidade progressiva com leve matiz fria
    bg: "#09090f", bgAlt: "#0d0d16", card: "#111119", card2: "#181825",
    // Bordas — sutis mas definidas
    borda: "#1c1c2a", borda2: "#262638",
    // Texto — leve tonalidade fria para premium
    txt: "#e8e8f2", txt2: "#8888b0",   // txt2 ≥5.86:1 sobre bg (WCAG AA ✓)
    // Acento principal — ouro Binance (redesign v22)
    ouro: "#F3BA2F", ouroDk: "#C99923",
    // Status
    verde: "#22c55e", verdeDk: "#16a34a",
    danger: "#ef4444", warn: "#f59e0b",
    azul: "#3b82f6", azulLt: "#60a5fa",
    // Estrutura
    headerBg: "#09090f", modalBg: "#111119", inputBg: "#181825",
    shadow: "rgba(0,0,0,.65)", gradientAuth: "#09090f",
    scrollThumb: "#262638", tableHeader: "#0d0d16",
  },
  light: {
    // Backgrounds
    bg: "#f6f7fc", bgAlt: "#eef0f8", card: "#ffffff", card2: "#f0f2fa",
    // Bordas
    borda: "#e0e2f0", borda2: "#cccee0",
    // Texto
    txt: "#16162a", txt2: "#5a5a8a",
    // Acento principal — ajustado para novo #F3BA2F em dark (WCAG AA ✓)
    ouro: "#a07018", ouroDk: "#8f5f14",
    // Status
    verde: "#16a34a", verdeDk: "#148040",
    danger: "#dc2626", warn: "#d97706",
    azul: "#2563eb", azulLt: "#3b82f6",
    // Estrutura
    headerBg: "#ffffff", modalBg: "#ffffff", inputBg: "#f0f2fa",
    shadow: "rgba(0,0,0,.05)", gradientAuth: "#f6f7fc",
    scrollThumb: "#c8cae0", tableHeader: "#eef0f8",
  },
};

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
export const TABLE = "controle_operacional";
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
  // Raios de borda — refinados para look premium (redesign v22)
  r:   { btn:8, card:12, modal:16, tile:10, badge:6, inp:10, tag:4, ico:10, logo:12, sm:6, sidebar:8 },
  // Tamanhos de ícone SVG (px)
  ico: { xs:10, sm:13, md:16, lg:20, xl:24 },
  // Stroke SVG — thin=linhas finas, md=padrão, thick=destaque
  sw:  { thin:1.5, md:2, thick:2.5 },
  // Famílias tipográficas — Inter para body (mais limpo e legível)
  fnt: { h:"'Bebas Neue',sans-serif", b:"'Inter','Segoe UI',system-ui,sans-serif" },
  // Letter-spacing — levemente reduzido para look mais refinado
  ls:  { label:2, badge:1, mono:2.5, btn:.2 },
};
// Utilitário: converte cor hex + alpha em rgba (use com cores do tema t.*)
export const hexRgb = (hex, a) => {
  const h = (hex||"#000000").replace("#","");
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
};

export const DEV_CHANGELOG = [
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

