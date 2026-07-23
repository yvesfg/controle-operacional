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
    erros_http: 0, motivos_ignorados: [], erros_detalhes: [], info: [], ok: false
  };

  var todosDts = [];

  try {
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
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
          var c = mapearColunaMaracanau(col.toString().toLowerCase().trim());
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

      // Enviar para Supabase em lotes de 50
      var totalLotes = Math.ceil(registros.length / 50);
      for (var i = 0; i < registros.length; i += 50) {
        var lote = registros.slice(i, i + 50);
        var numLote = Math.floor(i / 50) + 1;
        try {
          var resp = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/' + TABELA + '?on_conflict=dt', {
            method: 'POST',
            headers: {
              apikey: SUPA_KEY,
              Authorization: 'Bearer ' + SUPA_KEY,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal,resolution=merge-duplicates'
            },
            payload: JSON.stringify(lote),
            muteHttpExceptions: true
          });

          var code = resp.getResponseCode();
          if (code >= 200 && code < 300) {
            statusGlobal.sincronizados += lote.length;
          } else {
            statusGlobal.erros_http++;
            var msg = 'Aba ' + nomAba + ' Lote ' + numLote + '/' + totalLotes + ': HTTP ' + code;
            try {
              var body = JSON.parse(resp.getContentText());
              if (body.message) msg += ' - ' + body.message;
            } catch (parseErr) {}
            if (statusGlobal.erros_detalhes.length < 10) statusGlobal.erros_detalhes.push(msg);
          }
        } catch (httpErr) {
          statusGlobal.erros_http++;
          if (statusGlobal.erros_detalhes.length < 10) {
            statusGlobal.erros_detalhes.push('Aba ' + nomAba + ' Lote ' + numLote + ': ' + httpErr.message);
          }
        }
      }
    } // fim loop abas

    statusGlobal.ok = (statusGlobal.erros_http === 0 && statusGlobal.total_planilha > 0);

  } catch (e) {
    statusGlobal.erros_detalhes.push('ERRO GERAL: ' + e.message);
    statusGlobal.ok = false;
  }

  gravarStatusMaracanau(statusGlobal);
  Logger.log(JSON.stringify(statusGlobal, null, 2));
}

// ============================================================
// Grava o status no Supabase (tabela co_config)
// ============================================================
function gravarStatusMaracanau(status) {
  try {
    UrlFetchApp.fetch(SUPA_URL + '/rest/v1/' + TAB_CFG + '?on_conflict=chave', {
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
  } catch (e) {
    Logger.log('Erro ao gravar status: ' + e.message);
  }
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
function mapearColunaMaracanau(n) {
  var mapa = {
    // ── DT / Espelho ──
    'dt espelho': 'dt', 'espelho': 'dt', 'dt': 'dt',

    // ── Motorista ──
    'motorista': 'nome', 'nome': 'nome',
    'cpf': 'cpf',
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
    'desc_aguardando': 'desc_aguardando', 'aguardando descarga': 'desc_aguardando'
  };
  return mapa[n] || null;
}
