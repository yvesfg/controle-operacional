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
var CAMPOS_FINANCEIROS = ['vl_cte', 'vl_contrato', 'adiant', 'saldo', 'diaria_prev', 'diaria_pg',
  // Entraram em 20/08/2026 junto com o mapeamento dos cabecalhos que faltavam.
  // Precisam estar AQUI pelo mesmo motivo dos de cima: celula-numero de verdade
  // vira "1234.56" no toString e o parser do app, que assume BR, inflaria o valor.
  'diaria', 'diaria_rec', 'pag_desc', 'pag_stretch', 'total'];

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
    // Quanto do que foi enviado virou escrita de verdade. Em regime normal
    // `sem_mudanca` fica com quase tudo — se `atualizados` viver alto, algum
    // campo esta oscilando a cada rodada e vale investigar.
    inseridos: 0,
    atualizados: 0,
    sem_mudanca: 0,
    ok: false
  };

  var todosDts = []; // todo DT visto em qualquer aba nesta rodada — usado p/ marcar_fora_planilha
  var porDT = {};     // DT -> { reg, aba } de TODAS as abas (ultima aba vence)
  var repetidos = {}; // DT -> abas onde aparece, quando aparece em mais de uma
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
          var c = mapearColuna(normalizarCabecalho(col));
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

      // Coluna de cabecalho que nenhum alias reconheceu vira AVISO no status, em vez
      // de sumir calada. Sem isto, "OBS CHEGADA" e "OBS  DESCARGA" ficaram meses fora
      // do app sem nenhum sinal de que existiam.
      var naoMapeadas = [];
      (dados[linhaInicio - 1] || []).forEach(function(col, i) {
        if (normalizarCabecalho(col) && !mapa[i]) naoMapeadas.push(String(col).trim());
      });
      if (naoMapeadas.length) {
        statusGlobal.info.push('Aba "' + nomAba + '": ' + naoMapeadas.length +
          ' coluna(s) sem mapeamento -> ' + naoMapeadas.slice(0, 15).join(' | '));
      }

      statusGlobal.info.push('Aba "' + nomAba + '": cabecalho linha ' + linhaInicio + ', ' + melhorContagem + ' cols mapeadas');
      statusGlobal.total_planilha += dados.length - linhaInicio;

      var registros = [];

      for (var r = linhaInicio; r < dados.length; r++) {
        var reg = {};
        var temDT = false;
        var linhaVazia = true;

        Object.keys(mapa).forEach(function(i) {
          var v = tratarValor(dados[r][i], mapa[i]);
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

      // Deduplica por DT dentro da aba E entre abas (a ultima aba vence). Antes o
      // envio era por aba: um DT presente em duas abas com valores diferentes era
      // gravado duas vezes por rodada, uma desfazendo a outra — escrita eterna sem
      // mudanca nenhuma no final (o que segurava o Disk IO alto em 24/09/2026).
      registros.forEach(function(reg) {
        var ja = porDT[reg.dt];
        if (ja && ja.aba !== nomAba) repetidos[reg.dt] = (repetidos[reg.dt] || [ja.aba]).concat(nomAba);
        reg.fora_planilha = false;
        porDT[reg.dt] = { reg: reg, aba: nomAba };
      });
    } // fim loop abas

    todosDts = Object.keys(porDT);
    avisarRepetidos(repetidos, 'DT', statusGlobal);
    var enviados = enviarLotes(todosDts.map(function(k) { return porDT[k].reg; }), statusGlobal, function(r) { return r.dt; });

    // Marca fora_planilha=true pra tudo que NAO apareceu em nenhuma aba nesta rodada
    // (rodou sem excecao ate aqui = varredura completa das abas, lista confiavel)
    // So chama quando a lista de DTs mudou desde a ultima rodada (ou o cache expirou).
    var hashDts = todosDts.length > 0 ? hashSeMudou('dts', todosDts.slice().sort()) : null;
    if (hashDts) {
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
        } else {
          lembrarHash('dts', hashDts);
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
    var semDtEnviado = false;
    var vistosSemDt = {};
    todosSemDt.forEach(function(x) { vistosSemDt[x.chave_natural] = x; });
    var listaSemDt = Object.values(vistosSemDt); // dedupe por chave dentro da rodada
    // So manda quando a fila sem-DT da planilha mudou desde a ultima rodada.
    var hashSemDt = listaSemDt.length > 0 ? hashSeMudou('sem_dt', listaSemDt) : null;
    if (hashSemDt) {
      var semDtOk = true;
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
            semDtOk = false;
            statusGlobal.erros_detalhes.push('sem_dt lote: HTTP ' + codeSD + ' - ' + respSD.getContentText());
          }
        } catch (sdErr) {
          semDtOk = false;
          statusGlobal.erros_detalhes.push('sem_dt lote: ' + sdErr.message);
        }
      }
      semDtEnviado = true;
      if (semDtOk) lembrarHash('sem_dt', hashSemDt);
    }

    // Concilia pendencias 'sem_dt' contra DTs que JA existem (linha-espelho sem DT cuja carga
    // ja entrou com DT em outra linha da planilha). O gatilho so fecha quando um DT NOVO entra;
    // isto fecha as que casam com DTs antigos, evitando a fila encher de duplicata (ex.: 133 de 142).
    // So roda quando algo entrou/mudou nesta rodada — sem mudanca, nao ha o que conciliar.
    if (enviados > 0 || semDtEnviado) try {
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
function gravarStatus(status) {
  if (!SUPA_URL || SUPA_URL === 'SUA_URL_SUPABASE') return;
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
        chave: 'gsheet_sync_status_imperatriz_belem',
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
// WRITE-BACK — o app preenche o faturamento e escreve AQUI
//
// Por que existe: a sincronizacao e planilha -> Supabase e sobrescreve por DT a
// cada 15 min. Se o app gravasse so no Supabase, esta rodada apagaria o que foi
// preenchido (celula vazia vira '' no upsert). Entao o app escreve PRIMEIRO na
// planilha, por aqui, e so depois no Supabase.
//
// COMO PUBLICAR (uma vez):
//   1) Defina WEBAPP_TOKEN abaixo (qualquer segredo longo).
//   2) Implantar > Nova implantacao > Tipo: App da Web
//      Executar como: Eu · Quem tem acesso: Qualquer pessoa
//   3) Copie a URL /exec e ponha na Vercel:
//        SHEETS_WEBAPP_URL_IMPERATRIZ_BELEM = <URL>
//        SHEETS_WEBAPP_TOKEN                = <mesmo token daqui>
//   Ao alterar este arquivo, publique NOVA VERSAO da implantacao (senao o /exec
//   continua servindo o codigo antigo).
// ============================================================
var WEBAPP_TOKEN = '';  // <- defina; vazio DESLIGA a escrita (recusa todo pedido)

// Muda quando este arquivo muda. Serve pra saber se o /exec ja esta servindo o
// codigo novo — publicar NOVA VERSAO da implantacao e o passo mais esquecido.
var WEBAPP_VERSAO = '2026-09-24-a';

// So estes campos podem ser escritos pelo app. Nao e porta generica de escrita.
// Cobre os dois blocos colados: faturamento e contratacao (esta traz o ID, que
// saiu do faturamento em 12/08/2026 porque quem preenche e o contratante).
var CAMPOS_WRITEBACK = [
  'cte', 'mdf', 'mat', 'nf', 'cliente', 'data_manifesto',
  'id_doc', 'nome', 'cpf', 'telefone', 'placa', 'placa2', 'placa3',
  'origem', 'destino', 'data_carr', 'data_agenda', 'vl_cte', 'vl_contrato', 'adiant'
];

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!WEBAPP_TOKEN) return _json({ ok: false, error: 'WEBAPP_TOKEN nao definido no Apps Script' });
    if (body.token !== WEBAPP_TOKEN) return _json({ ok: false, error: 'Token invalido' });

    // 'ping': confere se a URL responde, se o token bate e QUAL versao do codigo
    // o /exec esta servindo. Nao le nem escreve nada.
    if (body.acao === 'ping') {
      return _json({ ok: true, acao: 'ping', versao: WEBAPP_VERSAO, planilha: SpreadsheetApp.getActiveSpreadsheet().getName() });
    }

    var dt = String(body.dt || '').trim();
    if (!dt) return _json({ ok: false, error: 'DT obrigatorio' });

    // 'inspecionar_dt': so LE. Diz em que aba/linha o DT esta e, principalmente,
    // quais cabecalhos daquela aba o mapeamento NAO reconheceu — foi assim que
    // apareceu a coluna do motorista faltando na aba de celulose.
    if (body.acao === 'inspecionar_dt') return _json(inspecionarDT(dt));

    // acao 'sincronizar_dt': DT recem-digitada na planilha que o app ainda nao
    // enxerga (a rodada automatica e de 15 em 15 min). Puxa SO essa linha, na
    // hora, em vez de reprocessar a planilha inteira.
    if (body.acao === 'sincronizar_dt') return _json(sincronizarUmDT(dt));

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);   // duas pessoas gravando a mesma linha ao mesmo tempo
    try {
      return _json(escreverCamposPorDT(dt, body.campos || {}, String(body.aba || '')));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return _json({ ok: false, error: err.message });
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Acha a linha do DT e escreve os campos nas colunas correspondentes.
// Usa o MESMO mapearColuna() da leitura — se a coluna nao existe na aba, o campo
// volta em `ignorados` em vez de ser inventado numa coluna nova.
// Varre as abas ate achar a linha daquele DT. Devolve tambem o mapa coluna->campo
// (mesma deteccao de cabecalho da leitura) pra quem chamou ler ou escrever.
function localizarLinhaPorDT(dt, abaPreferida) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abas = ss.getSheets();

  // A aba que o app mandou (coluna `sheet` do registro) vem primeiro — evita
  // varrer 12 abas quando ja se sabe onde esta.
  if (abaPreferida) {
    abas.sort(function(a, b) {
      return (b.getName() === abaPreferida ? 1 : 0) - (a.getName() === abaPreferida ? 1 : 0);
    });
  }

  for (var s = 0; s < abas.length; s++) {
    var sheet = abas[s];
    var nomAba = sheet.getName();
    if (nomAba.toLowerCase().indexOf('config') >= 0) continue;

    var ultimaCol = sheet.getLastColumn();
    var ultimaLin = sheet.getLastRow();
    if (ultimaCol === 0 || ultimaLin < 2) continue;

    // Cabecalho: mesma deteccao da leitura (testa as 5 primeiras linhas)
    var topo = sheet.getRange(1, 1, Math.min(5, ultimaLin), ultimaCol).getValues();
    var mapa = {}, linhaCab = 0, melhor = 0;
    for (var tentativa = 0; tentativa < topo.length; tentativa++) {
      var mapaTemp = {}, cont = 0;
      for (var c = 0; c < topo[tentativa].length; c++) {
        var campo = mapearColuna(normalizarCabecalho(topo[tentativa][c]));
        if (!campo) continue;
        cont++;  // conta COLUNAS reconhecidas, igual a rodada completa faz — contar
                 // campos distintos escolhia outra linha de cabecalho em aba com
                 // coluna repetida, e o mapa saia diferente do que o sync usa.
        if (mapaTemp[campo] === undefined) mapaTemp[campo] = c + 1;
      }
      if (cont > melhor) { melhor = cont; mapa = mapaTemp; linhaCab = tentativa + 1; }
    }
    if (!mapa.dt) continue;

    // Procura o DT na coluna DT
    var valoresDT = sheet.getRange(linhaCab + 1, mapa.dt, ultimaLin - linhaCab, 1).getValues();
    for (var i = 0; i < valoresDT.length; i++) {
      if (String(valoresDT[i][0]).trim() === dt) {
        return { sheet: sheet, aba: nomAba, mapa: mapa, ultimaCol: ultimaCol, linhaCab: linhaCab, linha: linhaCab + 1 + i };
      }
    }
  }
  return null;
}

// Diagnostico read-only: onde esta o DT e o que o mapeamento entendeu daquela aba.
function inspecionarDT(dt) {
  var achado = localizarLinhaPorDT(dt, '');
  if (!achado) return { ok: false, error: 'DT ' + dt + ' nao encontrado em nenhuma aba' };

  var cabecalho = achado.sheet.getRange(achado.linhaCab, 1, 1, achado.ultimaCol).getValues()[0];
  var reconhecidos = [], ignorados = [];
  for (var c = 0; c < cabecalho.length; c++) {
    var titulo = String(cabecalho[c] == null ? '' : cabecalho[c]).trim();
    if (!titulo) continue;
    var campo = mapearColuna(normalizarCabecalho(titulo));
    if (campo) reconhecidos.push(titulo + ' -> ' + campo);
    else ignorados.push(titulo);
  }
  return {
    ok: true, aba: achado.aba, linha: achado.linha, linha_cabecalho: achado.linhaCab,
    reconhecidos: reconhecidos, sem_mapeamento: ignorados
  };
}

// Puxa UMA linha da planilha pro Supabase, na hora. Existe porque a rodada
// automatica e de 15 em 15 min: DT digitada agora nao aparece no app, e quem
// esta contratando/faturando nao pode esperar. A proxima rodada completa passa
// por cima desta linha de qualquer jeito — entao aqui basta o basico (mapa de
// colunas + data/moeda), sem as regras de fila sem-DT e de celulose.
function sincronizarUmDT(dt) {
  var achado = localizarLinhaPorDT(dt, '');
  if (!achado) return { ok: false, error: 'DT ' + dt + ' nao encontrado em nenhuma aba da planilha' };

  var valores = achado.sheet.getRange(achado.linha, 1, 1, achado.ultimaCol).getValues()[0];
  var reg = { fora_planilha: false };
  for (var campo in achado.mapa) {
    var v = tratarValor(valores[achado.mapa[campo] - 1], campo);
    reg[campo] = v ? v.toString().trim() : '';
  }
  if (!reg.dt) return { ok: false, error: 'Linha encontrada mas sem DT preenchido' };

  // Mesmo tratamento de origem/produto da rodada completa (a origem invalida
  // seria recusada pelo app depois).
  reg.tipo_carga = 'papel';
  if (reg.origem) {
    var origemUp = reg.origem.toString().toUpperCase();
    if (/CELULOSE/.test(origemUp)) reg.tipo_carga = 'celulose';
    reg.origem = origemUp.replace(/,?\s*CELULOSE\s*/g, '').replace(/,?\s*PAPEL\s*/g, '')
                         .replace(/\s*-\s*/g, '-').replace(/,\s*$/, '').trim();
  }
  reg.sheet = achado.aba;

  var resp = UrlFetchApp.fetch(SUPA_URL + '/rest/v1/' + TABELA + '?on_conflict=dt', {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=merge-duplicates'
    },
    payload: JSON.stringify([reg]),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    return { ok: false, error: 'Supabase HTTP ' + code + ' - ' + resp.getContentText().slice(0, 200) };
  }
  return { ok: true, aba: achado.aba, linha: achado.linha, registro: reg };
}

// Acha a linha do DT e escreve os campos nas colunas correspondentes.
// Usa o MESMO mapearColuna() da leitura — se a coluna nao existe na aba, o campo
// volta em `ignorados` em vez de ser inventado numa coluna nova.
function escreverCamposPorDT(dt, campos, abaPreferida) {
  var achado = localizarLinhaPorDT(dt, abaPreferida);
  if (!achado) return { ok: false, error: 'DT ' + dt + ' nao encontrado em nenhuma aba' };

  var sheet = achado.sheet, mapa = achado.mapa, linhaAlvo = achado.linha, nomAba = achado.aba;
  {
    var escritos = [], ignorados = [];
    for (var j = 0; j < CAMPOS_WRITEBACK.length; j++) {
      var k = CAMPOS_WRITEBACK[j];
      if (campos[k] === undefined || campos[k] === null || String(campos[k]).trim() === '') continue;
      if (!mapa[k]) { ignorados.push(k + ' (coluna nao existe na aba)'); continue; }
      // Texto explicito: NF pode ser "360525, 360526" e numero longo vira notacao
      // cientifica se o Sheets resolver interpretar sozinho.
      sheet.getRange(linhaAlvo, mapa[k]).setValue(String(campos[k]).trim());
      escritos.push(k);
    }
    SpreadsheetApp.flush();
    return { ok: true, aba: nomAba, linha: linhaAlvo, escritos: escritos, ignorados: ignorados };
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
// Cabecalho da planilha -> chave do mapa de aliases.
// `toLowerCase().trim()` sozinho NAO bastava: a coluna AK se chama "OBS  DESCARGA",
// com DOIS espacos, e trim() so tira das pontas — a chave saia "obs  descarga" e
// nenhum alias alcancava. A coluna sumia calada, e foi assim que as observacoes
// ficaram meses sem subir. Aqui espaco interno vira um so, e o espaco nao-quebravel
// (que o Sheets produz ao colar de fora) vira espaco normal antes disso.
// Erros de formula da planilha. Sem isto, "#VALUE!" entrava como se fosse valor —
// e num campo de dinheiro o app tenta ler isso como numero.
var ERROS_PLANILHA = ['#VALUE!', '#REF!', '#N/A', '#DIV/0!', '#NAME?', '#NUM!', '#NULL!', '#ERROR!'];

// Uma celula da planilha vira o texto que o banco guarda. Regras, na ordem:
//   · erro de formula  -> vazio (nao e dado);
//   · hora pura        -> HH:mm. O Sheets guarda hora sem data como 30/12/1899, e
//     formatar em dd/MM/yyyy jogava "30/12/1899" no banco — foi o que aconteceu com
//     HR RO em ~660 linhas assim que a coluna passou a ser lida (20/08/2026);
//   · data             -> dd/MM/yyyy;
//   · numero em campo financeiro -> BR ("1.234,56"), nunca "1234.56".
function tratarValor(v, campo) {
  if (typeof v === 'string' && ERROS_PLANILHA.indexOf(v.trim().toUpperCase()) >= 0) return '';
  if (v instanceof Date) {
    var ehHoraPura = v.getFullYear() === 1899 || (v.getFullYear() === 1970 && v.getMonth() === 0 && v.getDate() === 1);
    return Utilities.formatDate(v, 'America/Sao_Paulo', ehHoraPura ? 'HH:mm' : 'dd/MM/yyyy');
  }
  if (typeof v === 'number' && CAMPOS_FINANCEIROS.indexOf(campo) >= 0) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (campo === 'cpf') return cpfDaCelula(v);
  return v;
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


function normalizarCabecalho(s) {
  return String(s == null ? '' : s)
    .replace(/\u00a0/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function mapearColuna(n) {
  var mapa = {
    // ── DT / Espelho ──
    'dt espelho': 'dt', 'espelho': 'dt', 'dt': 'dt',

    // ── Motorista ──
    'motorista': 'nome', 'nome': 'nome',
    'cpf': 'cpf',
    // Telefone vem da planilha (coluna TELEFONE) — antes dela ser mapeada, o
    // WhatsApp só achava número se o motorista estivesse no cadastro do app.
    'telefone': 'telefone', 'tel': 'telefone', 'fone': 'telefone',
    'celular': 'telefone', 'whatsapp': 'telefone',
    'placa': 'placa', 'placa 01': 'placa', 'placa01': 'placa',
    // PLACA 02/03 existiam na planilha e no banco, mas nunca eram mapeadas — sem
    // isto o write-back da contratacao nao acha a coluna pra escrever a carreta.
    'placa 02': 'placa2', 'placa02': 'placa2', 'placa 2': 'placa2',
    'placa 03': 'placa3', 'placa03': 'placa3', 'placa 3': 'placa3',
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

    // ── Cabecalhos que existem na planilha e NAO eram lidos ──
    // Achado em 20/08/2026 pelo proprio log da sync ("N colunas sem mapeamento"):
    // essas colunas tem campo no banco, foram preenchidas um dia e estavam
    // CONGELADAS — a planilha mudava e o banco nao acompanhava. Era so ortografia
    // do cabecalho ('DIARIAS PAGAS' x 'diarias paga', 'QUANT.DIAS' x 'dias').
    // Ficaram DE FORA de proposito as que o app tambem edita (FORMS, e a coluna
    // de diaria paga ja mapeada acima): mapear faria a planilha sobrescrever o
    // que foi digitado no app a cada 15 min.
    'quant.dias': 'dias', 'quant dias': 'dias', 'qtd dias': 'dias',
    'dt - espelho': 'dt',
    'data liberação': 'data_lib', 'data liberacao': 'data_lib',
    'data validade': 'data_val',
    'rdo': 'rdo',
    'cadastro fortes': 'cad_fortes',
    'comprovei': 'comprovei',
    'hr ro': 'hr_ro', 'hr criação da ro': 'hr_ro', 'hr criacao da ro': 'hr_ro',
    'diaria': 'diaria',
    'diárias recebido': 'diaria_rec', 'diarias recebido': 'diaria_rec',
    'diárias recebidas': 'diaria_rec', 'diarias recebidas': 'diaria_rec',
    'pag. descarga': 'pag_desc', 'pag descarga': 'pag_desc',
    'pag. stretch': 'pag_stretch', 'pag stretch': 'pag_stretch',
    'total': 'total',

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
    'aguardando descarga': 'desc_aguardando',

    // ── Observacoes (coluna AI e AK da planilha) ──
    // Estas faltavam: o que a equipe escrevia nelas nunca chegava ao app.
    'obs chegada': 'obs_chegada', 'obs. chegada': 'obs_chegada',
    'obs de chegada': 'obs_chegada', 'obs_chegada': 'obs_chegada',
    'obs da chegada': 'obs_chegada',
    'observacao chegada': 'obs_chegada', 'observação chegada': 'obs_chegada',
    'observacao da chegada': 'obs_chegada', 'observação da chegada': 'obs_chegada',
    'obs descarga': 'obs_descarga', 'obs. descarga': 'obs_descarga',
    'obs de descarga': 'obs_descarga', 'obs_descarga': 'obs_descarga',
    'obs da descarga': 'obs_descarga',
    'observacao descarga': 'obs_descarga', 'observação descarga': 'obs_descarga',
    'observacao da descarga': 'obs_descarga', 'observação da descarga': 'obs_descarga'
  };
  return mapa[n] || null;
}
