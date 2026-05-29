// ============================================================
// CONTROLE OPERACIONAL - Apps Script AVB (Açailândia)
// Planilha: https://docs.google.com/spreadsheets/d/1Dyxt4RBqylriT6illswGKsl9Qa0u6pn6K5YoRozBD_E
//
// INSTRUÇÕES:
//   1) Preencha SUPA_URL e SUPA_KEY abaixo
//   2) Menu Executar > configurarGatilho  (rodar UMA ÚNICA VEZ)
//   3) Pronto - sincronização automática a cada 15 minutos
// ============================================================

var SUPA_URL  = 'SUA_URL_SUPABASE';   // Ex: https://xyzabc.supabase.co
var SUPA_KEY  = 'SUA_ANON_KEY';       // anon key do projeto Supabase
var TABELA    = 'controle_operacional_avb';
var TAB_CFG   = 'co_config';

// Distâncias médias Açailândia → destinos (km) para cálculo de agenda
// 500 km/dia conforme regra operacional
var DISTANCIAS_KM = {
  'GOIANIA':    1350,
  'GOIÂNIA':    1350,
  'ANAPOLIS':   1390,
  'ANÁPOLIS':   1390,
  'BRASILIA':   1450,
  'BRASÍLIA':   1450,
  'BELEM':       500,
  'BELÉM':       500,
  'SAO PAULO':  2300,
  'SÃO PAULO':  2300,
  'FORTALEZA':  1150,
  'SALVADOR':   1900,
  'RECIFE':     2100,
  'CUIABA':     1600,
  'CUIABÁ':     1600,
  'PALMAS':      550,
  'IMPERATRIZ':  150,
  'MARABA':      380,
  'MARABÁ':      380,
};

var KM_POR_DIA = 500;

function calcularAgenda(dataCargaStr, destino) {
  if (!dataCargaStr || !destino) return '';
  var dest = destino.toUpperCase().replace(/\s*-\s*\w{2}$/, '').trim();
  var km = null;
  for (var k in DISTANCIAS_KM) {
    if (dest.indexOf(k) >= 0 || k.indexOf(dest) >= 0) { km = DISTANCIAS_KM[k]; break; }
  }
  if (!km) return '';
  var partes = dataCargaStr.split('/');
  if (partes.length !== 3) return '';
  var d = parseInt(partes[0]), m = parseInt(partes[1]) - 1, y = parseInt(partes[2]);
  var dataBase = new Date(y, m, d);
  var diasViagem = Math.ceil(km / KM_POR_DIA);
  dataBase.setDate(dataBase.getDate() + diasViagem);
  return Utilities.formatDate(dataBase, 'America/Sao_Paulo', 'dd/MM/yyyy');
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================
function sincronizarAVB() {
  var inicio = new Date();
  var statusGlobal = {
    timestamp: Utilities.formatDate(inicio, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
    total_planilha: 0, sincronizados: 0, ignorados: 0,
    erros_http: 0, motivos_ignorados: [], erros_detalhes: [], info: [], ok: false
  };

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

      // Detectar linha de cabeçalho (testa linhas 1 a 5)
      var mapa = {}, linhaInicio = 1, melhorContagem = 0;
      var maxTentativas = Math.min(5, dados.length);
      for (var tentativa = 0; tentativa < maxTentativas; tentativa++) {
        var mapaTemp = {};
        dados[tentativa].forEach(function(col, i) {
          var c = mapearColunaAVB(col.toString().toLowerCase().trim());
          if (c) mapaTemp[i] = c;
        });
        var contagem = Object.keys(mapaTemp).length;
        if (contagem > melhorContagem) {
          melhorContagem = contagem; mapa = mapaTemp; linhaInicio = tentativa + 1;
        }
      }

      var temColDT = Object.values(mapa).indexOf('dt') >= 0;
      if (!temColDT) {
        statusGlobal.info.push('Aba "' + nomAba + '" ignorada: sem coluna DT');
        continue;
      }

      statusGlobal.info.push('Aba "' + nomAba + '": cabecalho linha ' + linhaInicio + ', ' + melhorContagem + ' cols');
      statusGlobal.total_planilha += dados.length - linhaInicio;

      var registros = [];
      for (var r = linhaInicio; r < dados.length; r++) {
        var reg = {};
        var temDT = false, linhaVazia = true;

        Object.keys(mapa).forEach(function(i) {
          var v = dados[r][i];
          if (v instanceof Date) v = Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
          var vs = v ? v.toString().trim() : '';
          if (vs || !reg.hasOwnProperty(mapa[i])) reg[mapa[i]] = vs;
          if (vs) linhaVazia = false;
          if (mapa[i] === 'dt' && vs) temDT = true;
        });

        if (linhaVazia) continue;
        if (!temDT) {
          statusGlobal.ignorados++;
          if (statusGlobal.motivos_ignorados.length < 20)
            statusGlobal.motivos_ignorados.push('Aba ' + nomAba + ' L' + (r+1) + ': DT vazio');
          continue;
        }

        // Normalizar/fixar origem
        if (!reg.origem) reg.origem = 'AÇAILÂNDIA-MA';
        reg.origem = reg.origem.replace(/\s*-\s*/g, '-').trim().toUpperCase();

        // Calcular data_agenda se não preenchida
        if (!reg.data_agenda && reg.data_carr && reg.destino) {
          var agendaCalc = calcularAgenda(reg.data_carr, reg.destino);
          if (agendaCalc) reg.data_agenda = agendaCalc;
        }

        registros.push(reg);
      }

      // Deduplicar por DT
      var vistos = {};
      registros.forEach(function(reg) { vistos[reg.dt] = reg; });
      registros = Object.values(vistos);

      // Enviar em lotes de 50
      for (var i = 0; i < registros.length; i += 50) {
        var lote = registros.slice(i, i + 50);
        try {
          var resp = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/' + TABELA + '?on_conflict=dt', {
            method: 'POST',
            headers: {
              apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
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
            var msg = 'Aba ' + nomAba + ' HTTP ' + code;
            try { var b = JSON.parse(resp.getContentText()); if (b.message) msg += ' - ' + b.message; } catch(e) {}
            if (statusGlobal.erros_detalhes.length < 10) statusGlobal.erros_detalhes.push(msg);
          }
        } catch (httpErr) {
          statusGlobal.erros_http++;
          if (statusGlobal.erros_detalhes.length < 10)
            statusGlobal.erros_detalhes.push('Aba ' + nomAba + ': ' + httpErr.message);
        }
      }
    }

    statusGlobal.ok = (statusGlobal.erros_http === 0 && statusGlobal.total_planilha > 0);
  } catch (e) {
    statusGlobal.erros_detalhes.push('ERRO GERAL: ' + e.message);
    statusGlobal.ok = false;
  }

  gravarStatusAVB(statusGlobal);
  Logger.log(JSON.stringify(statusGlobal, null, 2));
}

function gravarStatusAVB(status) {
  if (!SUPA_URL || SUPA_URL === 'SUA_URL_SUPABASE') return;
  try {
    UrlFetchApp.fetch(SUPA_URL + '/rest/v1/' + TAB_CFG + '?on_conflict=chave', {
      method: 'POST',
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
                 'Content-Type': 'application/json',
                 Prefer: 'return=minimal,resolution=merge-duplicates' },
      payload: JSON.stringify([{ chave: 'gsheet_sync_status_avb', valor: JSON.stringify(status) }]),
      muteHttpExceptions: true
    });
  } catch (e) { Logger.log('Erro ao gravar status AVB: ' + e.message); }
}

function configurarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'sincronizarAVB') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('sincronizarAVB').timeBased().everyMinutes(15).create();
  Logger.log('Gatilho AVB criado.');
  sincronizarAVB();
}

// ============================================================
// MAPEAMENTO DE COLUNAS (AVB)
// ============================================================
function mapearColunaAVB(n) {
  var mapa = {
    // DT
    'dt': 'dt', 'dt espelho': 'dt', 'espelho': 'dt',

    // Motorista / Contratante
    'motorista': 'nome', 'nome': 'nome',
    'cpf': 'cpf',
    'placa': 'placa', 'placa 01': 'placa', 'placa01': 'placa',
    'vinculo': 'vinculo', 'vinculo do motorista': 'vinculo',
    'contratante': 'contratante',
    'status': 'status',

    // Rota
    'origem': 'origem', 'origem - cidade/uf': 'origem', 'cidade origem': 'origem',
    'destino': 'destino', 'destino - cidade/uf': 'destino', 'cidade destino': 'destino',

    // Datas — AVB só tem data_carr obrigatória; agenda calculada
    'data carr.': 'data_carr', 'data carregamento': 'data_carr', 'data_carr': 'data_carr',
    'data agenda': 'data_agenda', 'data_agenda': 'data_agenda', 'agenda': 'data_agenda',
    'data desc.': 'data_desc', 'data descarga': 'data_desc', 'data_desc': 'data_desc',
    'data da descarga': 'data_desc', 'descarga': 'data_desc',

    // Financeiro
    'vl cte': 'vl_cte', 'valor cte': 'vl_cte', 'vl_cte': 'vl_cte',
    'vl contrato': 'vl_contrato', 'vl_contrato': 'vl_contrato', 'valor contrato': 'vl_contrato',
    'adiant': 'adiant', 'adiantamento': 'adiant',
    'saldo': 'saldo',
    'dias': 'dias',

    // Documentação
    'cte': 'cte', 'mdf': 'mdf', 'nf': 'nf', 'nota fiscal': 'nf',
    'cliente': 'cliente',
    'ro': 'ro', 'r.o.': 'ro', 'registro ocorrencia': 'ro', 'registro de ocorrência': 'ro',
    'mat': 'mat', 'mar': 'mat', 'mat/mar': 'mat', 'num contrato': 'mat',
    'sgs': 'sgs', 'chamado sgs': 'sgs',

    // Operacional
    'chegada': 'chegada', 'chegada no cliente': 'chegada', 'data chegada': 'chegada',
    'gerenc': 'gerenc', 'gerenciadora': 'gerenc',
    'manifesto': 'data_manifesto', 'data manifesto': 'data_manifesto',
  };
  return mapa[n] || null;
}
