// ============================================================
// CONTROLE OPERACIONAL - Apps Script v3
// INSTRUCOES:
//   1) Preencha SUPA_URL e SUPA_KEY abaixo
//   2) Menu Executar > configurarGatilho  (rodar UMA UNICA VEZ)
//   3) Pronto - sincronizacao automatica a cada 15 minutos
//
//   EXTRA: Para equalizar colunas das abas antigas:
//   Menu Executar > equalizarColunas (rodar UMA UNICA VEZ)
// ============================================================

var SUPA_URL  = 'SUA_URL_SUPABASE';   // Ex: https://xyzabc.supabase.co
var SUPA_KEY  = 'SUA_ANON_KEY';       // anon key do projeto Supabase
var TABELA    = 'controle_operacional';
var TAB_CFG   = 'co_config';
var ABA_BASE  = '0032026';            // aba referencia para estrutura de colunas

// Campos financeiros: quando a celula do Sheets e um NUMERO de verdade (nao texto
// formatado), getValues() devolve um JS number e '.toString()' nele usa ponto decimal
// sem separador de milhar (ex.: 12341.85 -> "12341.85"), diferente do formato BR
// ("12.341,85") que o app usa em toda a planilha pra strings vindas de celula-texto.
// Descoberto em 2026-07-17: ~489 linhas no banco ja vieram assim, e o parser do app
// (que assume BR e remove TODO ponto como milhar) inflava esses valores em ~100x-1000x
// (um saldo de R$3.702,56 virava R$37 quatrilhoes na tela). Ver controle_operacional_sem_dt
// nao afetada por isso porque so recebe campos derivados, mas o cadastro principal sim.
var CAMPOS_FINANCEIROS = ['vl_cte', 'vl_contrato', 'adiant', 'saldo', 'diaria_prev', 'diaria_pg'];

// ============================================================
// FUNCAO PRINCIPAL - chamada automaticamente a cada 15 min
// Percorre TODAS as abas da planilha que tiverem coluna DT
// ============================================================
function sincronizarComSupabase() {
  var inicio = new Date();
  var statusGlobal = {
    timestamp: Utilities.formatDate(inicio, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
    total_planilha: 0,
    sincronizados: 0,
    ignorados: 0,
    erros_http: 0,
    motivos_ignorados: [],
    erros_detalhes: [],
    info: [],
    sem_dt: 0,
    sem_dt_conciliadas: 0,
    ok: false
  };

  var todosDts = []; // todo DT visto em qualquer aba nesta rodada — usado p/ marcar_fora_planilha
  var todosSemDt = []; // cargas SEM DT (com placa) capturadas p/ a fila de revisao 'sem_dt'

  try {
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();

    for (var si = 0; si < sheets.length; si++) {
      var sheet = sheets[si];
      var nomAba = sheet.getName();
      // Aba dedicada de celulose (ex.: "07/2026 CELULOSE") — fonte PRINCIPAL da celulose.
      // Nas abas gerais, celulose é cópia temporária (verificação) e é ignorada (ver abaixo).
      var abaEhCelulose = nomAba.toUpperCase().indexOf('CELULOSE') >= 0;

      // Pula abas de controle/configuracao (nao sao abas de dados mensais)
      if (nomAba.toLowerCase().indexOf('config') >= 0 ||
          nomAba.toLowerCase().indexOf('instrucao') >= 0 ||
          nomAba.toLowerCase().indexOf('ajuda') >= 0) {
        continue;
      }

      var dados = sheet.getDataRange().getValues();
      if (dados.length < 2) continue; // aba vazia

      // Detectar linha de cabecalho automaticamente (testa linhas 1 a 5)
      var mapa = {};
      var linhaInicio = 1;
      var melhorContagem = 0;
      var maxTentativas = Math.min(5, dados.length);

      for (var tentativa = 0; tentativa < maxTentativas; tentativa++) {
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

      // Pula aba se nao tem coluna DT (nao e uma aba de dados operacionais)
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
        var temDT = false;
        var linhaVazia = true;

        Object.keys(mapa).forEach(function(i) {
          var v = dados[r][i];
          if (v instanceof Date) {
            v = Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
          } else if (typeof v === 'number' && CAMPOS_FINANCEIROS.indexOf(mapa[i]) >= 0) {
            // Celula-numero (nao texto) num campo financeiro: formata em BR explicitamente
            // (vírgula decimal, ponto de milhar) em vez de '.toString()' (ponto decimal
            // americano) — mantém o mesmo formato que o resto do pipeline sempre usou.
            v = v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
          }
          var vs = v ? v.toString().trim() : '';
          // Não sobrescreve valor existente com string vazia
          // (evita que col "DT Espelho" vazia apague o valor de "DT" preenchida)
          if (vs || !reg.hasOwnProperty(mapa[i])) {
            reg[mapa[i]] = vs;
          }
          if (vs) linhaVazia = false;
        });

        if (linhaVazia) continue;

        // "x"/"X" (ou vazio) na coluna DT = ainda NAO saiu DT p/ este carregamento.
        // Trata como SEM DT: a carga vai pra fila de revisao (controle_operacional_sem_dt),
        // nao pra tabela principal. Quando o DT real entrar na planilha, concilia sozinha.
        var dtNorm = (reg.dt || '').toString().trim();
        temDT = dtNorm !== '' && dtNorm.toUpperCase() !== 'X';

        // Separa o PRODUTO da origem e normaliza — ANTES do check de DT, porque as linhas
        // SEM DT tambem precisam do tipo_carga e da origem limpa pra ir pra fila de revisao.
        // A base Imperatriz tem dois tipos de carga: papel (maioria) e celulose (poucas).
        // Voce marca a celulose anexando na origem — "IMPERATRIZ-MA, CELULOSE" — entao aqui
        // a gente tira esse sufixo, grava tipo_carga='celulose' e devolve a origem limpa.
        // Papel e o padrao: quem nao marcar nada cai em papel.
        reg.tipo_carga = 'papel';
        if (reg.origem) {
          var origemUp = reg.origem.toString().toUpperCase();
          if (/CELULOSE/.test(origemUp)) reg.tipo_carga = 'celulose';
          reg.origem = origemUp
            .replace(/,?\s*CELULOSE\s*/g, '')   // remove o sufixo de produto…
            .replace(/,?\s*PAPEL\s*/g, '')       // …e também "PAPEL" se alguém marcar explícito
            .replace(/\s*-\s*/g, '-')            // "IMPERATRIZ - MA" → "IMPERATRIZ-MA"
            .replace(/,\s*$/, '')                // vírgula solta no fim
            .trim();
        }

        // Celulose tem aba dedicada ('… CELULOSE'), que é a fonte principal. Nas abas GERAIS,
        // linha de celulose é cópia temporária (verificação, será deletada) — pula pra não
        // duplicar na fila/planilha. Celulose só entra da aba dedicada. Hoje celulose é
        // exclusiva de Imperatriz; se outra base passar a ter, trocar por regra por base/período.
        if (reg.tipo_carga === 'celulose' && !abaEhCelulose) {
          statusGlobal.ignorados++;
          if (statusGlobal.motivos_ignorados.length < 20) {
            statusGlobal.motivos_ignorados.push('Aba ' + nomAba + ' Linha ' + (r + 1) + ': celulose fora da aba dedicada — ignorada (evita duplicidade com a aba "… CELULOSE")');
          }
          continue;
        }

        // Valida origem — bloqueia valores fora do padrao (vale p/ linha com e sem DT)
        var ORIGENS_VALIDAS = ['IMPERATRIZ-MA', 'BELEM-PA', 'AÇAILÂNDIA-MA', 'ACAILANDIA-MA', 'MARACANAU-CE'];
        if (reg.origem && ORIGENS_VALIDAS.indexOf(reg.origem) === -1) {
          statusGlobal.ignorados++;
          if (statusGlobal.motivos_ignorados.length < 20) {
            statusGlobal.motivos_ignorados.push('Aba ' + nomAba + ' Linha ' + (r + 1) + ': origem invalida "' + reg.origem + '" — esperado: IMPERATRIZ-MA, BELEM-PA ou MARACANAU-CE');
          }
          continue;
        }

        // SEM DT: nao descarta se a linha tem identidade de carga real (placa) — a Suzano as
        // vezes carrega sem DT (raro). Vai pra fila 'sem_dt' (controle_operacional_sem_dt), onde
        // um humano confirma ou marca erro; quando o DT verdadeiro chegar na planilha, o gatilho
        // conciliar_sem_dt_trg concilia por placa+data_carr+origem. Linha sem placa = template: ignora.
        if (!temDT) {
          if (reg.placa && reg.placa.toString().trim()) {
            todosSemDt.push({
              chave_natural: [reg.placa, reg.data_carr || '', reg.origem || '', reg.cpf || ''].join('|').toUpperCase(),
              nome: reg.nome || '', cpf: reg.cpf || '', placa: reg.placa,
              origem: reg.origem || '', destino: reg.destino || '',
              data_carr: reg.data_carr || '', data_agenda: reg.data_agenda || '',
              vl_cte: reg.vl_cte || '', vl_contrato: reg.vl_contrato || '',
              adiant: reg.adiant || '', saldo: reg.saldo || '', tipo_carga: reg.tipo_carga
            });
          } else {
            statusGlobal.ignorados++;
            if (statusGlobal.motivos_ignorados.length < 20) {
              statusGlobal.motivos_ignorados.push('Aba ' + nomAba + ' Linha ' + (r + 1) + ': DT vazio (sem placa, ignorada)');
            }
          }
          continue;
        }

        registros.push(reg);
      }

      // Deduplicar por DT (ultimo valor vence) — evita HTTP 500 no upsert
      var vistosDT = {};
      registros.forEach(function(reg) { vistosDT[reg.dt] = reg; });
      registros = Object.values(vistosDT);

      // Marca cada linha como "veio da planilha nesta rodada" + acumula pro marcar_fora_planilha global
      registros.forEach(function(reg) {
        reg.fora_planilha = false;
        todosDts.push(reg.dt);
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

    // Marca fora_planilha=true pra tudo que NAO apareceu em nenhuma aba nesta rodada
    // (rodou sem excecao ate aqui = varredura completa das abas, lista confiavel)
    if (todosDts.length > 0) {
      try {
        var respFlag = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/rpc/marcar_fora_planilha', {
          method: 'POST',
          headers: {
            apikey: SUPA_KEY,
            Authorization: 'Bearer ' + SUPA_KEY,
            'Content-Type': 'application/json',
          },
          payload: JSON.stringify({ p_dts: todosDts }),
          muteHttpExceptions: true
        });
        var codeFlag = respFlag.getResponseCode();
        if (codeFlag < 200 || codeFlag >= 300) {
          statusGlobal.erros_detalhes.push('marcar_fora_planilha: HTTP ' + codeFlag + ' - ' + respFlag.getContentText());
        }
      } catch (flagErr) {
        statusGlobal.erros_detalhes.push('marcar_fora_planilha: ' + flagErr.message);
      }
    }

    // Envia as cargas SEM DT pra fila de revisao via RPC upsert_sem_dt: ATUALIZA os
    // valores (nome/data/CTe/contrato/etc.) enquanto a pendencia esta 'pendente' e
    // CONGELA depois que um humano decidiu (confirmado/erro/conciliado). Casa pela
    // identidade estavel placa+cpf+origem — entao preencher data/CTe no Sheets DEPOIS
    // da captura passa a refletir na fila (antes ficava congelado desde a 1a captura).
    if (todosSemDt.length > 0) {
      var vistosSemDt = {};
      todosSemDt.forEach(function(x) { vistosSemDt[x.chave_natural] = x; });
      var listaSemDt = Object.values(vistosSemDt); // dedupe por chave dentro da rodada
      for (var j = 0; j < listaSemDt.length; j += 50) {
        var loteSD = listaSemDt.slice(j, j + 50);
        try {
          var respSD = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/rpc/upsert_sem_dt', {
            method: 'POST',
            headers: {
              apikey: SUPA_KEY,
              Authorization: 'Bearer ' + SUPA_KEY,
              'Content-Type': 'application/json'
            },
            payload: JSON.stringify({ p_rows: loteSD }),
            muteHttpExceptions: true
          });
          var codeSD = respSD.getResponseCode();
          if (codeSD >= 200 && codeSD < 300) {
            statusGlobal.sem_dt += loteSD.length;
          } else {
            statusGlobal.erros_detalhes.push('sem_dt lote: HTTP ' + codeSD + ' - ' + respSD.getContentText());
          }
        } catch (sdErr) {
          statusGlobal.erros_detalhes.push('sem_dt lote: ' + sdErr.message);
        }
      }
    }

    // Concilia pendencias 'sem_dt' contra DTs que JA existem (linha-espelho sem DT cuja carga
    // ja entrou com DT em outra linha da planilha). O gatilho so fecha quando um DT NOVO entra;
    // isto fecha as que casam com DTs antigos, evitando a fila encher de duplicata (ex.: 133 de 142).
    try {
      var respConc = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/rpc/conciliar_sem_dt_existentes', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        payload: '{}',
        muteHttpExceptions: true
      });
      var codeConc = respConc.getResponseCode();
      if (codeConc >= 200 && codeConc < 300) {
        statusGlobal.sem_dt_conciliadas = JSON.parse(respConc.getContentText() || '0');
      } else {
        statusGlobal.erros_detalhes.push('conciliar_sem_dt_existentes: HTTP ' + codeConc + ' - ' + respConc.getContentText());
      }
    } catch (concErr) {
      statusGlobal.erros_detalhes.push('conciliar_sem_dt_existentes: ' + concErr.message);
    }

    statusGlobal.ok = (statusGlobal.erros_http === 0 && statusGlobal.total_planilha > 0);

  } catch (e) {
    statusGlobal.erros_detalhes.push('ERRO GERAL: ' + e.message);
    statusGlobal.ok = false;
  }

  gravarStatus(statusGlobal);
  Logger.log(JSON.stringify(statusGlobal, null, 2));
}

// ============================================================
// Grava o status no Supabase (tabela co_config)
// ============================================================
function gravarStatus(status) {
  if (!SUPA_URL || SUPA_URL === 'SUA_URL_SUPABASE') return;
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
        chave: 'gsheet_sync_status',
        valor: JSON.stringify(status)
      }]),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Erro ao gravar status: ' + e.message);
  }
}

// ============================================================
// EQUALIZAR COLUNAS
// Usa ABA_BASE como referencia e adiciona colunas faltantes
// nas outras abas. Rodar UMA UNICA VEZ.
// ============================================================
function equalizarColunas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaRef = ss.getSheetByName(ABA_BASE);

  if (!abaRef) {
    Logger.log('ERRO: aba base "' + ABA_BASE + '" nao encontrada.');
    return;
  }

  // Pega cabecalho da aba base (linha 1)
  var ultimaColBase = abaRef.getLastColumn();
  var cabecalhoBase = abaRef.getRange(1, 1, 1, ultimaColBase).getValues()[0]
    .map(function(c) { return c.toString().trim(); })
    .filter(function(c) { return c !== ''; });

  Logger.log('Base "' + ABA_BASE + '": ' + cabecalhoBase.length + ' colunas');
  Logger.log('Colunas base: ' + cabecalhoBase.join(' | '));

  var sheets = ss.getSheets();

  sheets.forEach(function(sheet) {
    var nome = sheet.getName();
    if (nome === ABA_BASE) return; // pula a propria base

    var ultimaCol = sheet.getLastColumn();
    if (ultimaCol === 0) return; // aba vazia

    var cabecalhoAba = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0]
      .map(function(c) { return c.toString().trim(); });

    var cabecalhoLower = cabecalhoAba.map(function(c) { return c.toLowerCase(); });

    var faltando = cabecalhoBase.filter(function(col) {
      return col !== '' && cabecalhoLower.indexOf(col.toLowerCase()) === -1;
    });

    if (faltando.length === 0) {
      Logger.log('Aba "' + nome + '": OK - sem colunas faltando');
      return;
    }

    Logger.log('Aba "' + nome + '": adicionando ' + faltando.length + ' colunas: ' + faltando.join(', '));

    // Adiciona cada coluna faltante no final da linha de cabecalho
    faltando.forEach(function(col) {
      var novaCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, novaCol).setValue(col);
      // Formata igual ao cabecalho: fundo cinza, negrito
      sheet.getRange(1, novaCol).setFontWeight('bold').setBackground('#d9d9d9');
    });

    Logger.log('Aba "' + nome + '": concluido. Total de colunas agora: ' + sheet.getLastColumn());
  });

  Logger.log('equalizarColunas concluido!');
  SpreadsheetApp.getUi().alert('Equalização concluída!\nVerifique o Log de execução para detalhes.');
}

// ============================================================
// RODAR UMA UNICA VEZ para ativar o gatilho automatico
// ============================================================
function configurarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'sincronizarComSupabase') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('sincronizarComSupabase')
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log('Gatilho de 15 minutos criado com sucesso!');
  sincronizarComSupabase();
  Logger.log('Sincronizacao inicial concluida. Verifique o painel no app.');
}

// ============================================================
// MAPEAMENTO DE COLUNAS — nomes da planilha → campos Supabase
// ============================================================
function mapearColuna(n) {
  var mapa = {
    // ── DT / Espelho ──
    'dt espelho': 'dt', 'espelho': 'dt', 'dt': 'dt',

    // ── Motorista ──
    'motorista': 'nome', 'nome': 'nome',
    'cpf': 'cpf',
    'placa': 'placa', 'placa 01': 'placa', 'placa01': 'placa',
    'vinculo': 'vinculo',
    'vinculo do motorista': 'vinculo',
    'status': 'status',

    // ── Rota ──
    'origem': 'origem',
    'origem - cidade/uf': 'origem',
    'origem cidade/uf': 'origem',
    'cidade origem': 'origem',
    'destino': 'destino',
    'destino - cidade/uf': 'destino',
    'destino cidade/uf': 'destino',
    'cidade destino': 'destino',

    // ── Datas ──
    'data carr.': 'data_carr', 'data carregamento': 'data_carr',
    'data_carr': 'data_carr', 'data agenda': 'data_agenda',
    'data_agenda': 'data_agenda', 'agenda': 'data_agenda',
    'data desc.': 'data_desc', 'data descarga': 'data_desc',
    'data_desc': 'data_desc', 'data da descarga': 'data_desc',
    'data de descarga': 'data_desc', 'dt descarga': 'data_desc',
    'descarga': 'data_desc',

    // ── Financeiro ──
    'vl cte': 'vl_cte', 'valor cte': 'vl_cte', 'vl_cte': 'vl_cte',
    'valor do cte': 'vl_cte',
    'vl contrato': 'vl_contrato', 'vl_contrato': 'vl_contrato',
    'valor contrato': 'vl_contrato', 'valor do contrato': 'vl_contrato',
    'adiant': 'adiant', 'adiantamento': 'adiant',
    'saldo': 'saldo',
    'diaria_prev': 'diaria_prev',
    'diarias devida': 'diaria_prev', 'diarias (devida r$)': 'diaria_prev',
    'diária prevista': 'diaria_prev', 'diaria prevista': 'diaria_prev',
    'diaria_pg': 'diaria_pg',
    'diarias paga': 'diaria_pg', 'diarias (paga r$)': 'diaria_pg',
    'dias': 'dias',

    // ── Documentação ──
    'cte': 'cte', 'mdf': 'mdf',
    'nf': 'nf', 'nota fiscal': 'nf',
    'cliente': 'cliente',
    'shipmente id': 'id_doc', 'shipment id': 'id_doc',
    'id_doc': 'id_doc', 'id doc': 'id_doc', 'id': 'id_doc',
    'ro': 'ro', 'r.o.': 'ro', 'reg. ocorrencia': 'ro',
    'reg ocorrencia': 'ro', 'reg. ocorrência': 'ro',
    'reg ocorrência': 'ro', 'registro ocorrencia': 'ro',
    'registro de ocorrencia': 'ro', 'registro de ocorrência': 'ro',
    'ocorrencia': 'ro',
    'mat': 'mat', 'mar': 'mat', 'mat/mar': 'mat',
    'mat/mrm': 'mat', 'contrato': 'mat',
    'contrato [mat ou mar]': 'mat', 'contrato (mat)': 'mat',
    'contrato mat': 'mat', 'contrato mat/mar': 'mat',
    'n° contrato': 'mat', 'nº contrato': 'mat',
    'num contrato': 'mat',
    'sgs': 'sgs', 'chamado sgs': 'sgs',
    'alguma ocorrencia / sgs': 'sgs',
    'alguma ocorrência / sgs': 'sgs',
    'alguma ocorrencia': 'sgs',

    // ── Contratante (AVB) ──
    'contratante': 'contratante',

    // ── Operacional ──
    'chegada': 'chegada', 'chegada no cliente': 'chegada',
    'data chegada': 'chegada', 'data de chegada': 'chegada',
    'chegada cliente': 'chegada', 'dt chegada': 'chegada',
    'data real chegada': 'chegada', 'data real de chegada': 'chegada',
    'gerenc': 'gerenc', 'gerenciadora': 'gerenc',
    'manifesto': 'data_manifesto', 'data manifesto': 'data_manifesto',
    'data do manifesto': 'data_manifesto', 'data_manifesto': 'data_manifesto',
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
