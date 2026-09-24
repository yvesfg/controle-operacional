// ============================================================
// CONTROLE OPERACIONAL - Apps Script Maracanaú
// Reconstruído em 2026-07-23 (script original perdido no editor da planilha).
// Molde: SyncSupabase.gs (Imperatriz/Belém), adaptado ao schema real de
// controle_operacional_maracanau (chave única = dt, sem fila sem_dt/tipo_carga —
// esta tabela não tem essas colunas, então o script não chama marcar_fora_planilha/
// upsert_sem_dt/conciliar_sem_dt_existentes, que são RPCs hardcoded pro core).
//
// INSTRUCOES:
//   1) Cole este arquivo INTEIRO no editor da planilha do Maracanaú
//      (Extensões > Apps Script), substituindo o que estiver lá.
//   2) Menu Executar > configurarGatilho  (rodar UMA UNICA VEZ)
//   3) Pronto - sincronizacao automatica a cada 15 minutos
//
// IMPORTANTE: SUPA_KEY abaixo é a anon key ATUAL e válida do projeto (mesma do
// SyncSupabase_AVB.gs, confirmada hoje). Se o script anterior usava outra coisa
// no lugar dela (ex.: um token de login/sessão), era ISSO que causava o erro
// "new row violates row-level security policy" — aquele token não tem role
// 'anon', e só 'anon' tem permissão de escrita nesta tabela.
// ============================================================

var SUPA_URL  = 'https://qdrhkkjawklqfsoyxhpd.supabase.co';
var SUPA_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcmhra2phd2tscWZzb3l4aHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTY2ODQsImV4cCI6MjA4OTE3MjY4NH0.zHl9-Ei9IDBcxzoZDz650E4JsBeV0HsQqTDgDZ4K1B8';
var TABELA    = 'controle_operacional_maracanau';
var TAB_CFG   = 'co_config';

// Campo numeric() de verdade no banco (os demais campos financeiros são text) —
// não pode ir em formato BR (vírgula decimal), senão o cast numeric falha no upsert.
// Normaliza pra ponto decimal puro, aceitando célula-número OU texto em formato BR.
function paraNumericoPuro(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  var s = v.toString().trim();
  if (!s) return null;
  // remove milhar (ponto) e troca decimal (vírgula) por ponto
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ============================================================
// FUNCAO PRINCIPAL - chamada automaticamente a cada 15 min
// ============================================================
function sincronizarMaracanau() {
  var inicio = new Date();
  var statusGlobal = {
    timestamp: Utilities.formatDate(inicio, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
    total_planilha: 0, sincronizados: 0, ignorados: 0,
    erros_http: 0, motivos_ignorados: [], erros_detalhes: [], info: [],
    // Quanto do enviado virou escrita. Em regime normal quase tudo cai em
    // `sem_mudanca`; `atualizados` alto todo ciclo = campo oscilando.
    inseridos: 0, atualizados: 0, sem_mudanca: 0, ok: false
  };

  var todosDts = [];

  try {
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var porChave = {};  // chave -> { reg, aba } de TODAS as abas (ultima aba vence)
    var repetidos = {}; // chave -> abas onde aparece, quando aparece em mais de uma
    var sheets = ss.getSheets();

    for (var si = 0; si < sheets.length; si++) {
      var sheet  = sheets[si];
      var nomAba = sheet.getName();

      if (nomAba.toLowerCase().indexOf('config') >= 0 ||
          nomAba.toLowerCase().indexOf('instrucao') >= 0 ||
          nomAba.toLowerCase().indexOf('ajuda') >= 0) continue;

      var dados = sheet.getDataRange().getValues();
      if (dados.length < 2) continue;

      // Detectar linha de cabecalho (testa linhas 1 a 5)
      var mapa = {}, linhaInicio = 1, melhorContagem = 0;
      var maxTentativas = Math.min(5, dados.length);
      for (var tentativa = 0; tentativa < maxTentativas; tentativa++) {
        var mapaTemp = {};
        dados[tentativa].forEach(function(col, i) {
          var c = mapearColunaMaracanau(normalizarCabecalho(col));
          if (c) mapaTemp[i] = c;
        });
        var contagem = Object.keys(mapaTemp).length;
        if (contagem > melhorContagem) {
          melhorContagem = contagem; mapa = mapaTemp; linhaInicio = tentativa + 1;
        }
      }

      var temColDT = Object.values(mapa).indexOf('dt') >= 0;
      if (!temColDT) {
        statusGlobal.info.push('Aba "' + nomAba + '" ignorada: coluna DT nao encontrada (' + melhorContagem + ' cols mapeadas)');
        continue;
      }

      // Coluna que nenhum alias reconheceu vira AVISO no status (igual Imperatriz).
      var naoMapeadas = [];
      (dados[linhaInicio - 1] || []).forEach(function(col, i) {
        if (normalizarCabecalho(col) && !mapa[i]) naoMapeadas.push(String(col).trim());
      });
      if (naoMapeadas.length) {
        statusGlobal.info.push('Aba "' + nomAba + '": ' + naoMapeadas.length +
          ' coluna(s) sem mapeamento -> ' + naoMapeadas.slice(0, 25).join(' | '));
      }

      statusGlobal.info.push('Aba "' + nomAba + '": cabecalho linha ' + linhaInicio + ', ' + melhorContagem + ' cols mapeadas');
      statusGlobal.total_planilha += dados.length - linhaInicio;

      var registros = [];
      for (var r = linhaInicio; r < dados.length; r++) {
        var reg = {};
        var linhaVazia = true;

        Object.keys(mapa).forEach(function(i) {
          var v = dados[r][i];
          var campo = mapa[i];
          if (campo === 'vl_cte_comp') {
            var n = paraNumericoPuro(v);
            if (n !== null) { reg[campo] = n; linhaVazia = false; }
            return;
          }
          if (v instanceof Date) {
            v = Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
          }
          if (campo === 'cpf') v = cpfDaCelula(v);
          var vs = v ? v.toString().trim() : '';
          if (vs || !reg.hasOwnProperty(campo)) reg[campo] = vs;
          if (vs) linhaVazia = false;
        });

        if (linhaVazia) continue;

        var dtNorm = (reg.dt || '').toString().trim();
        if (!dtNorm || dtNorm.toUpperCase() === 'X') {
          statusGlobal.ignorados++;
          if (statusGlobal.motivos_ignorados.length < 20) {
            statusGlobal.motivos_ignorados.push('Aba ' + nomAba + ' Linha ' + (r + 1) + ': DT vazio');
          }
          continue;
        }

        // Origem padrao Maracanau se a celula vier vazia
        if (!reg.origem) reg.origem = 'MARACANAU-CE';
        reg.origem = reg.origem.toString().replace(/\s*-\s*/g, '-').trim().toUpperCase();

        reg.sheet = nomAba;
        registros.push(reg);
      }

      // Deduplicar por DT (ultimo valor vence)
      var vistosDT = {};
      registros.forEach(function(reg) { vistosDT[reg.dt] = reg; });
      registros = Object.values(vistosDT);
      registros.forEach(function(reg) { todosDts.push(reg.dt); });

      // Normalizar: todos os registros devem ter as mesmas chaves (PostgREST exige em upsert em lote)
      var todasChaves = {};
      registros.forEach(function(reg) { Object.keys(reg).forEach(function(k) { todasChaves[k] = true; }); });
      registros = registros.map(function(reg) {
        var normalizado = {};
        Object.keys(todasChaves).forEach(function(k) {
          normalizado[k] = reg.hasOwnProperty(k) ? reg[k] : (k === 'vl_cte_comp' ? null : '');
        });
        return normalizado;
      });

      // Deduplica entre abas (a ultima aba vence) e envia UMA vez no fim. Antes o
      // envio era por aba: a mesma chave em duas abas com valores diferentes era
      // gravada duas vezes por rodada, uma desfazendo a outra — escrita eterna sem
      // mudanca no final (~27 UPDATEs por rodada na AVB em 24/09/2026).
      registros.forEach(function(reg) {
        var k = reg.dt;
        var ja = porChave[k];
        if (ja && ja.aba !== nomAba) repetidos[k] = (repetidos[k] || [ja.aba]).concat(nomAba);
        porChave[k] = { reg: reg, aba: nomAba };
      });
    } // fim loop abas

    avisarRepetidos(repetidos, 'DT', statusGlobal);
    var enviados = enviarLotes(Object.keys(porChave).map(function(k) { return porChave[k].reg; }), statusGlobal, function(r) { return r.dt; });

    statusGlobal.ok = (statusGlobal.erros_http === 0 && statusGlobal.total_planilha > 0);

  } catch (e) {
    statusGlobal.erros_detalhes.push('ERRO GERAL: ' + e.message);
    statusGlobal.ok = false;
  }

  gravarStatusMaracanau(statusGlobal);
  Logger.log(JSON.stringify(statusGlobal, null, 2));
}

// ============================================================
// Envio em lotes de 50 via upsert_co_lote — SO as linhas que mudaram
// ============================================================
// O script guarda (CacheService, 6 h) o hash de cada linha enviada e so manda o
// que mudou desde a ultima rodada. Antes toda rodada mandava ~2.700 linhas pro
// banco comparar (~160 chamadas pesadas a cada 15 min), mesmo sem nada mudado —
// no plano Nano isso bastava pra esgotar o Disk IO no meio da tarde (quedas de
// 23 e 24/09/2026). O cache expira em 6 h: a cada 6 h vai tudo de novo, o que
// corrige qualquer divergencia (ex.: linha apagada ou alterada direto no banco).
var CACHE_TTL_S = 6 * 60 * 60;

function hashDe(obj) {
  return Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5, JSON.stringify(obj), Utilities.Charset.UTF_8));
}

// Devolve o hash se `valor` mudou desde a ultima vez que foi lembrado, senao null.
function hashSeMudou(nome, valor) {
  var h = hashDe(valor);
  return CacheService.getScriptCache().get('x:' + nome) === h ? null : h;
}
function lembrarHash(nome, h) {
  CacheService.getScriptCache().put('x:' + nome, h, CACHE_TTL_S);
}

function enviarLotes(registros, statusGlobal, chaveFn) {
  var cache = CacheService.getScriptCache();
  var chaves = registros.map(function(r) { return 'h:' + chaveFn(r); });
  var hashes = registros.map(hashDe);
  var guardados = {};
  for (var c = 0; c < chaves.length; c += 500) {
    var g = cache.getAll(chaves.slice(c, c + 500));
    for (var gk in g) guardados[gk] = g[gk];
  }
  var pend = [], pendChaves = [], pendHashes = [];
  registros.forEach(function(r, i) {
    if (guardados[chaves[i]] === hashes[i]) { statusGlobal.iguais_sem_envio = (statusGlobal.iguais_sem_envio || 0) + 1; return; }
    pend.push(r); pendChaves.push(chaves[i]); pendHashes.push(hashes[i]);
  });

  var totalLotes = Math.ceil(pend.length / 50);
  for (var i = 0; i < pend.length; i += 50) {
    var lote = pend.slice(i, i + 50);
    var numLote = Math.floor(i / 50) + 1;
    try {
      var resp = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/rpc/upsert_co_lote', {
        method: 'POST',
        headers: {
          apikey: SUPA_KEY,
          Authorization: 'Bearer ' + SUPA_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ p_tabela: TABELA, p_rows: lote }),
        muteHttpExceptions: true
      });
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        statusGlobal.sincronizados += lote.length;
        // So lembra o hash depois que o banco aceitou: lote que falhou vai de novo.
        var lembrar = {};
        for (var j = i; j < i + lote.length; j++) lembrar[pendChaves[j]] = pendHashes[j];
        cache.putAll(lembrar, CACHE_TTL_S);
        try {
          var r = JSON.parse(resp.getContentText() || '{}');
          statusGlobal.inseridos   += (r.inseridos   || 0);
          statusGlobal.atualizados += (r.atualizados || 0);
          statusGlobal.sem_mudanca += (r.sem_mudanca || 0);
        } catch (cntErr) {}
      } else {
        statusGlobal.erros_http++;
        var msg = 'Lote ' + numLote + '/' + totalLotes + ': HTTP ' + code;
        try {
          var body = JSON.parse(resp.getContentText());
          if (body.message) msg += ' - ' + body.message;
        } catch (parseErr) {}
        if (statusGlobal.erros_detalhes.length < 10) statusGlobal.erros_detalhes.push(msg);
      }
    } catch (httpErr) {
      statusGlobal.erros_http++;
      if (statusGlobal.erros_detalhes.length < 10) {
        statusGlobal.erros_detalhes.push('Lote ' + numLote + ': ' + httpErr.message);
      }
    }
  }
  return pend.length;
}

// Chave que aparece em mais de uma aba vira aviso no status: so a ultima aba
// sobe, entao a outra copia provavelmente esta desatualizada na planilha.
function avisarRepetidos(repetidos, rotulo, statusGlobal) {
  var chaves = Object.keys(repetidos);
  if (!chaves.length) return;
  statusGlobal.info.push(chaves.length + ' ' + rotulo + '(s) em mais de uma aba (vale a ultima): ' +
    chaves.slice(0, 15).map(function(k) { return k + ' [' + repetidos[k].join(', ') + ']'; }).join(' | '));
}

// ============================================================
// Grava o status no Supabase (tabela co_config)
// ============================================================
function gravarStatusMaracanau(status) {
  var hash = statusPrecisaGravar(status);
  if (!hash) return;
  try {
    var resp = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/' + TAB_CFG + '?on_conflict=chave', {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates'
      },
      payload: JSON.stringify([{
        chave: 'gsheet_sync_status_maracanau',
        valor: JSON.stringify(status)
      }]),
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() < 300) marcarStatusGravado(hash);
  } catch (e) {
    Logger.log('Erro ao gravar status: ' + e.message);
  }
}

// Status so vai pro banco quando MUDOU (ignorando o horario) ou a cada 2 h.
// Motivo: o Supabase fecha e arquiva um segmento de WAL de 16 MB em toda janela
// de 2 min com QUALQUER escrita (archive_timeout = 120 s). Gravar "rodei" a cada
// 15 min, sem nada ter mudado, era o que estourava o Disk IO Budget — a queda de
// 23/09/2026. Ver migration 080.
var STATUS_HEARTBEAT_MS = 2 * 60 * 60 * 1000;
var STATUS_FORA_DO_HASH = ['timestamp', 'sincronizados', 'inseridos', 'atualizados', 'sem_mudanca',
  'iguais_sem_envio', 'sem_dt', 'sem_dt_conciliadas'];

function statusPrecisaGravar(status) {
  var semHora = {};
  // Contadores da rodada ficam fora do hash: variam a cada mudanca real e fariam o
  // status ser regravado duas vezes (na rodada da mudanca e na seguinte, ja quieta).
  Object.keys(status).forEach(function(k) { if (STATUS_FORA_DO_HASH.indexOf(k) < 0) semHora[k] = status[k]; });
  var hash = Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5, JSON.stringify(semHora), Utilities.Charset.UTF_8));
  var props = PropertiesService.getScriptProperties();
  var ultimoMs = Number(props.getProperty('status_gravado_ms') || 0);
  if (hash === props.getProperty('status_hash') && Date.now() - ultimoMs < STATUS_HEARTBEAT_MS) return null;
  return hash;
}

function marcarStatusGravado(hash) {
  PropertiesService.getScriptProperties().setProperties({
    status_hash: hash, status_gravado_ms: String(Date.now())
  });
}

// ============================================================
// RODAR UMA UNICA VEZ para ativar o gatilho automatico
// ============================================================
function configurarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'sincronizarMaracanau') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('sincronizarMaracanau')
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log('Gatilho de 15 minutos criado com sucesso!');
  sincronizarMaracanau();
  Logger.log('Sincronizacao inicial concluida. Verifique o painel no app.');
}

// ============================================================
// MAPEAMENTO DE COLUNAS — nomes da planilha → campos Supabase
// Baseado no molde de Imperatriz/Belém + colunas extras específicas do schema
// de controle_operacional_maracanau. Depois de colar e rodar 1x, confira em
// "info" (Execuções no editor) quantas colunas foram mapeadas — se vier bem
// abaixo de ~24, mande os nomes reais do cabeçalho (linha 1) da planilha pra
// eu ajustar o mapa com precisão.
// ============================================================
// Cabecalho da planilha -> chave do mapa de aliases.
// `toLowerCase().trim()` sozinho NAO bastava: a coluna AK se chama "OBS  DESCARGA",
// com DOIS espacos, e trim() so tira das pontas — a chave saia "obs  descarga" e
// nenhum alias alcancava. A coluna sumia calada, e foi assim que as observacoes
// ficaram meses sem subir. Aqui espaco interno vira um so, e o espaco nao-quebravel
// (que o Sheets produz ao colar de fora) vira espaco normal antes disso.
function normalizarCabecalho(s) {
  return String(s == null ? '' : s)
    .replace(/\u00a0/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function mapearColunaMaracanau(n) {
  var mapa = {
    // ── DT / Espelho ──
    'dt espelho': 'dt', 'espelho': 'dt', 'dt': 'dt',

    // ── Motorista ──
    'motorista': 'nome', 'nome': 'nome',
    'cpf': 'cpf',
    // Telefone da planilha (mesma regra da base Imperatriz/Belem) — sem isto o
    // WhatsApp so acha numero se o motorista estiver no cadastro do app.
    'telefone': 'telefone', 'tel': 'telefone', 'fone': 'telefone',
    'celular': 'telefone', 'whatsapp': 'telefone',
    'placa': 'placa', 'placa 01': 'placa', 'placa01': 'placa',
    'placa 02': 'placa2', 'placa02': 'placa2', 'placa 2': 'placa2',
    'placa 03': 'placa3', 'placa03': 'placa3', 'placa 3': 'placa3',
    'vinculo': 'vinculo', 'vinculo do motorista': 'vinculo',
    'status': 'status',

    // ── Rota ──
    'origem': 'origem', 'origem - cidade/uf': 'origem', 'cidade origem': 'origem',
    'destino': 'destino', 'destino - cidade/uf': 'destino', 'cidade destino': 'destino',

    // ── Datas ──
    'data carr.': 'data_carr', 'data carregamento': 'data_carr', 'data_carr': 'data_carr',
    'data agenda': 'data_agenda', 'data_agenda': 'data_agenda', 'agenda': 'data_agenda',
    'data desc.': 'data_desc', 'data descarga': 'data_desc', 'data_desc': 'data_desc',
    'data da descarga': 'data_desc', 'descarga': 'data_desc',
    'data liberação': 'data_lib', 'data liberacao': 'data_lib', 'liberação': 'data_lib', 'liberacao': 'data_lib',
    'data validacao': 'data_val', 'data validação': 'data_val', 'validacao': 'data_val', 'validação': 'data_val',

    // ── Financeiro ──
    'vl cte': 'vl_cte', 'valor cte': 'vl_cte', 'vl_cte': 'vl_cte', 'valor do cte': 'vl_cte',
    'vl contrato': 'vl_contrato', 'vl_contrato': 'vl_contrato',
    'valor contrato': 'vl_contrato', 'valor do contrato': 'vl_contrato',
    'adiant': 'adiant', 'adiantamento': 'adiant',
    'saldo': 'saldo',
    'dias': 'dias',
    'diaria': 'diaria',
    'diaria_prev': 'diaria_prev', 'diarias devida': 'diaria_prev', 'diária prevista': 'diaria_prev',
    'diaria_rec': 'diaria_rec', 'diaria recebida': 'diaria_rec', 'diária recebida': 'diaria_rec',
    'diaria_pg': 'diaria_pg', 'diarias paga': 'diaria_pg', 'diária paga': 'diaria_pg',
    'pag desc': 'pag_desc', 'pagamento descarga': 'pag_desc',
    'pag stretch': 'pag_stretch', 'pagamento stretch': 'pag_stretch',
    'total': 'total',
    'dcc': 'dcc',

    // ── CTe complementar ──
    'cte comp': 'cte_comp', 'cte complementar': 'cte_comp',
    'mdf comp': 'mdf_comp', 'mdf complementar': 'mdf_comp',
    'mat comp': 'mat_comp', 'contrato complementar': 'mat_comp',
    'vl cte comp': 'vl_cte_comp', 'valor cte comp': 'vl_cte_comp', 'vl_cte_comp': 'vl_cte_comp',

    // ── Documentação ──
    'cte': 'cte', 'mdf': 'mdf',
    'nf': 'nf', 'nota fiscal': 'nf',
    'cliente': 'cliente',
    'id_doc': 'id_doc', 'id doc': 'id_doc', 'id': 'id_doc',
    'ro': 'ro', 'r.o.': 'ro', 'reg. ocorrencia': 'ro', 'registro ocorrencia': 'ro',
    'registro de ocorrência': 'ro', 'ocorrencia': 'ro',
    'ro hora': 'ro_hora', 'hr ro': 'hr_ro', 'hora ro': 'hr_ro',
    'mat': 'mat', 'mar': 'mat', 'mat/mar': 'mat', 'contrato': 'mat', 'num contrato': 'mat',
    'sgs': 'sgs', 'chamado sgs': 'sgs',
    'rdo': 'rdo',
    'minuta': 'minuta',
    'cadastro fortes': 'cad_fortes', 'cad fortes': 'cad_fortes',
    'comprovei': 'comprovei',
    'forms': 'forms', 'formulario': 'forms', 'formulário': 'forms',

    // ── Operacional ──
    'chegada': 'chegada', 'chegada no cliente': 'chegada', 'data chegada': 'chegada',
    'gerenc': 'gerenc', 'gerenciadora': 'gerenc',
    'manifesto': 'data_manifesto', 'data manifesto': 'data_manifesto', 'data_manifesto': 'data_manifesto',
    'informou analista': 'informou_analista', 'informou_analista': 'informou_analista',
    'desc_aguardando': 'desc_aguardando', 'aguardando descarga': 'desc_aguardando',
    'alguma ocorrencia / sgs': 'sgs', 'alguma ocorrência / sgs': 'sgs',

    // Cabecalhos reais da planilha que o aviso de 24/09/2026 mostrou sem mapeamento.
    // DIÁRIAS PAGAS, CTE COMP VLR, D01/D05 e MINUTA DESCARGA ficam de fora de
    // proposito: o app edita esses campos, e a planilha apagaria o que foi digitado.
    'qtd dias': 'dias', 'quant.dias': 'dias', 'quant dias': 'dias',
    'diárias recebido': 'diaria_rec', 'diarias recebido': 'diaria_rec',
    'pag. descarga': 'pag_desc', 'pag descarga': 'pag_desc',
    'pag. stretch': 'pag_stretch',
    'mdfe': 'mdf',

    // ── Observacoes ── (vieram de Imperatriz em 24/09/2026: obs_chegada e
    // obs_descarga estavam vazias nas 697 linhas do Maracanau)
    'obs chegada': 'obs_chegada', 'obs. chegada': 'obs_chegada',
    'obs de chegada': 'obs_chegada', 'obs da chegada': 'obs_chegada',
    'observacao chegada': 'obs_chegada', 'observação chegada': 'obs_chegada',
    'obs descarga': 'obs_descarga', 'obs. descarga': 'obs_descarga',
    'obs de descarga': 'obs_descarga', 'obs da descarga': 'obs_descarga',
    'observacao descarga': 'obs_descarga', 'observação descarga': 'obs_descarga'
  };
  return mapa[n] || null;
}

// CPF em celula NUMERICA perde o zero a esquerda: 00582481376 vira 582481376.
// Nao e cosmetico — CPF curto nao casa com CPF completo, e o app chegou a criar
// um SEGUNDO cadastro do mesmo motorista (120 duplicados absorvidos em 26/08/2026,
// migrations 074/075). Aqui devolvemos o zero na ORIGEM; o app tambem normaliza
// na leitura, mas isto evita o dado nascer torto.
// So mexe quando a celula veio como NUMERO: texto digitado passa intacto.
function cpfDaCelula(v) {
  if (typeof v !== 'number') return v;
  var d = String(Math.round(v));
  return d.length < 11 ? Array(11 - d.length + 1).join('0') + d : d;
}
