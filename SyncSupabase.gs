// ============================================================
// CONTROLE OPERACIONAL - Apps Script v2
// INSTRUCOES:
//   1) Preencha SUPA_URL e SUPA_KEY abaixo
//   2) Menu Executar > configurarGatilho  (rodar UMA UNICA VEZ)
//   3) Pronto - sincronizacao automatica a cada 15 minutos
// ============================================================

var SUPA_URL = 'SUA_URL_SUPABASE';   // Ex: https://xyzabc.supabase.co
var SUPA_KEY = 'SUA_ANON_KEY';       // anon key do projeto Supabase
var TABELA   = 'controle_operacional';
var TAB_CFG  = 'co_config';

// ============================================================
// FUNCAO PRINCIPAL - chamada automaticamente a cada 15 min
// ============================================================
function sincronizarComSupabase() {
  var inicio = new Date();
  var status = {
    timestamp: Utilities.formatDate(inicio, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
    total_planilha: 0,
    sincronizados: 0,
    ignorados: 0,
    erros_http: 0,
    motivos_ignorados: [],
    erros_detalhes: [],
    ok: false
  };

  try {
    var sheet  = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var dados  = sheet.getDataRange().getValues();

    // Detectar linha de cabecalho automaticamente (testa linhas 1, 2 e 3)
    // Usa a linha que tiver mais colunas reconhecidas pelo mapeamento
    var mapa = {};
    var linhaInicio = 1; // linha de dados (indice)
    var melhorContagem = 0;
    for (var tentativa = 0; tentativa < 3 && tentativa < dados.length; tentativa++) {
      var mapaTemp = {};
      dados[tentativa].forEach(function(col, i) {
        var c = mapearColuna(col.toString().toLowerCase().trim());
        if (c) mapaTemp[i] = c;
      });
      var contagem = Object.keys(mapaTemp).length;
      if (contagem > melhorContagem) {
        melhorContagem = contagem;
        mapa = mapaTemp;
        linhaInicio = tentativa + 1;
      }
    }

    status.erros_detalhes.push('Cabecalho detectado na linha ' + linhaInicio + ' (' + melhorContagem + ' colunas mapeadas)');

    // Verificar se coluna DT foi encontrada
    var temColDT = Object.values(mapa).indexOf('dt') >= 0;
    if (!temColDT) {
      status.erros_detalhes.push('CRITICO: coluna DT/Espelho nao encontrada. Verifique o nome da coluna na planilha.');
      gravarStatus(status);
      return;
    }

    status.total_planilha = dados.length - linhaInicio;
    var registros = [];

    for (var r = linhaInicio; r < dados.length; r++) {
      var reg = {};
      var temDT = false;
      var linhaVazia = true;

      Object.keys(mapa).forEach(function(i) {
        var v = dados[r][i];
        if (v instanceof Date) {
          v = Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
        }
        var vs = v ? v.toString().trim() : '';
        reg[mapa[i]] = vs;
        if (vs) linhaVazia = false;
        if (mapa[i] === 'dt' && vs) temDT = true;
      });

      if (linhaVazia) continue; // linha totalmente vazia - ignorar

      if (!temDT) {
        status.ignorados++;
        if (status.motivos_ignorados.length < 20) {
          status.motivos_ignorados.push('Linha ' + (r + 1) + ': campo DT/Espelho vazio');
        }
        continue;
      }

      registros.push(reg);
    }

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
          status.sincronizados += lote.length;
        } else {
          status.erros_http++;
          var msg = 'Lote ' + numLote + '/' + totalLotes + ': HTTP ' + code;
          try {
            var body = JSON.parse(resp.getContentText());
            if (body.message) msg += ' - ' + body.message;
          } catch (parseErr) {}
          if (status.erros_detalhes.length < 10) status.erros_detalhes.push(msg);
        }
      } catch (httpErr) {
        status.erros_http++;
        if (status.erros_detalhes.length < 10) {
          status.erros_detalhes.push('Lote ' + numLote + ': ' + httpErr.message);
        }
      }
    }

    status.ok = (status.erros_http === 0);

  } catch (e) {
    status.erros_detalhes.push('ERRO GERAL: ' + e.message);
    status.ok = false;
  }

  gravarStatus(status);
  Logger.log(JSON.stringify(status, null, 2));
}

// ============================================================
// Grava o status no Supabase (tabela co_config)
// O app le esse status e exibe no painel Admin > GSheets
// ============================================================
function gravarStatus(status) {
  try {
    UrlFetchApp.fetch(SUPA_URL + '/rest/v1/' + TAB_CFG + '?on_conflict=key', {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates'
      },
      payload: JSON.stringify([{
        key: 'gsheet_sync_status',
        value: JSON.stringify(status),
        updated_at: new Date().toISOString()
      }]),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Erro ao gravar status: ' + e.message);
  }
}

// ============================================================
// RODAR UMA UNICA VEZ para ativar o gatilho automatico
// Menu Executar > configurarGatilho
// ============================================================
function configurarGatilho() {
  // Remove gatilhos antigos desta funcao para evitar duplicatas
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'sincronizarComSupabase') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Cria gatilho a cada 15 minutos
  ScriptApp.newTrigger('sincronizarComSupabase')
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log('Gatilho de 15 minutos criado com sucesso!');

  // Roda a sincronizacao imediatamente
  sincronizarComSupabase();
  Logger.log('Sincronizacao inicial concluida. Verifique o painel no app.');
}

// ============================================================
// Mapeamento de nomes de colunas da planilha para o banco
// Adicione aqui se tiver colunas com nomes diferentes
// ============================================================
function mapearColuna(n) {
  var mapa = {
    // DT / Espelho
    'dt espelho': 'dt',
    'espelho': 'dt',
    'dt': 'dt',

    // Motorista
    'nome': 'nome',
    'cpf': 'cpf',
    'placa': 'placa',
    'vinculo': 'vinculo',
    'status': 'status',

    // Rota
    'origem': 'origem',
    'destino': 'destino',

    // Datas
    'data carr.': 'data_carr',
    'data carregamento': 'data_carr',
    'data_carr': 'data_carr',
    'data agenda': 'data_agenda',
    'data_agenda': 'data_agenda',
    'agenda': 'data_agenda',
    'data desc.': 'data_desc',
    'data descarga': 'data_desc',
    'data_desc': 'data_desc',
    'data da descarga': 'data_desc',
    'data de descarga': 'data_desc',
    'dt descarga': 'data_desc',

    // Financeiro
    'vl cte': 'vl_cte',
    'valor cte': 'vl_cte',
    'vl_cte': 'vl_cte',
    'vl contrato': 'vl_contrato',
    'vl_contrato': 'vl_contrato',
    'valor contrato': 'vl_contrato',
    'adiant': 'adiant',
    'adiantamento': 'adiant',
    'saldo': 'saldo',
    'diaria_prev': 'diaria_prev',
    'diarias devida': 'diaria_prev',
    'diarias (devida r$)': 'diaria_prev',
    'diaria_pg': 'diaria_pg',
    'diarias paga': 'diaria_pg',
    'diarias (paga r$)': 'diaria_pg',
    'dias': 'dias',

    // Documentacao
    'cte': 'cte',
    'mdf': 'mdf',
    'nf': 'nf',
    'nota fiscal': 'nf',
    'cliente': 'cliente',
    'shipmente id': 'id_doc',
    'shipment id': 'id_doc',
    'id_doc': 'id_doc',
    'id doc': 'id_doc',
    'ro': 'ro',
    'r.o.': 'ro',
    'reg. ocorrencia': 'ro',
    'reg ocorrencia': 'ro',
    'reg. ocorrência': 'ro',
    'reg ocorrência': 'ro',
    'registro ocorrencia': 'ro',
    'registro de ocorrencia': 'ro',
    'registro de ocorrência': 'ro',
    'ocorrencia': 'ro',
    'mat': 'mat',
    'mar': 'mat',
    'mat/mar': 'mat',
    'contrato': 'mat',
    'contrato [mat ou mar]': 'mat',
    'contrato (mat)': 'mat',
    'contrato mat': 'mat',
    'n° contrato': 'mat',
    'nº contrato': 'mat',
    'num contrato': 'mat',
    'sgs': 'sgs',
    'chamado sgs': 'sgs',
    'alguma ocorrencia / sgs': 'sgs',
    'alguma ocorrência / sgs': 'sgs',
    'alguma ocorrencia': 'sgs',

    // Operacional
    'chegada': 'chegada',
    'chegada no cliente': 'chegada',
    'data chegada': 'chegada',
    'data de chegada': 'chegada',
    'chegada cliente': 'chegada',
    'dt chegada': 'chegada',
    'data real chegada': 'chegada',
    'data real de chegada': 'chegada',
    'descarga': 'data_desc',
    'gerenc': 'gerenc',
    'gerenciadora': 'gerenc',
    'manifesto': 'data_manifesto',
    'data manifesto': 'data_manifesto',
    'data do manifesto': 'data_manifesto',
    'data_manifesto': 'data_manifesto',
    'dt manifesto': 'data_manifesto',
    'informou analista': 'informou_analista',
    'informou_analista': 'informou_analista',
    'informou analista ate 9h': 'informou_analista',
    'informou analista até 9h': 'informou_analista',
    'desc_aguardando': 'desc_aguardando',
    'aguardando descarga': 'desc_aguardando'
  };
  return mapa[n] || null;
}
