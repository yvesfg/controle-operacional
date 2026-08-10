// ── freteConferencia.js ──
// Parser das planilhas BRUTAS de faturamento (TMS/ERP, Empresa=MAT/MAM/MAR/MRM/D01/D05)
// + CRUD no Supabase (tabela frete_conferencia). Espelha o padrao de despesas.js
// (parse client-side, dedupe/diff antes de gravar, flags calculadas na importacao).
//
// Fonte É DIFERENTE da tabela `controle_operacional` (que vem do Google Sheets/Apps
// Script) — mesmo que os valores devessem bater, hoje sao pipelines independentes.
// Nao cruzar/deduplicar entre as duas tabelas ainda (ver nota na migration 003).
import * as XLSX from "xlsx";
import { supaFetch } from "./supabase.js";

const TABELA = "frete_conferencia";

// SEGURANÇA (V2 / Fase C): frete_conferencia guarda financeiro (CTes/contratos/margens)
// e hoje é lida/escrita/deletada pela anon key. O acesso passou a ser via RPCs SECURITY
// DEFINER token-validadas (migration 031). Modelo DUAL-PATH igual motoristas.js: se há
// token de sessão, usa a RPC; senão cai no REST anon (que ainda funciona enquanto as
// policies abertas não forem derrubadas no go-live, migration 032). O token é injetado
// por App.jsx via setFreteToken() quando a sessão gera.
let _sessionToken = null;
export function setFreteToken(t) { _sessionToken = t || null; }
// RPCs retornam SETOF json; PostgREST às vezes devolve as linhas como string — parse defensivo.
const _rows = (r) => Array.isArray(r) ? r.map(x => typeof x === "string" ? JSON.parse(x) : x) : [];
const _one = (r) => { const v = typeof r === "string" ? JSON.parse(r) : r; return Array.isArray(v) ? v[0] : v; };

// O cadastro de embarcadoras (CNPJ -> nome/base/códigos do TMS) saiu daqui na migration
// 006: virou tabela `embarcadoras` + `src/embarcadoras.js` + hook `useEmbarcadoras`,
// porque é global (outras telas usam) e não mais só do módulo de frete. Este arquivo
// apenas CONSOME o cadastro: parseFreteXLSX recebe o mapa pronto por parâmetro.

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "").padStart(14, "0");
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Margem BRUTA calculada no app — NÃO a coluna "Margem Lucro" da planilha, que divide
// pelo Total do Frete (Frete Peso + pedágio/gris/etc.) e subestima a margem, jogando
// itens ok pra fila de revisão. Base = Saldo / Frete Peso. No Frete o Saldo é a diferença
// Frete Peso − Contrato (ex.: 15123,30 − 13576,18 = 1547,12 → 10,2%; a planilha dava 9,0%
// sobre o Total do Frete). Usa-se o Saldo em vez de (frete_peso − contrato) porque o
// Contrato da planilha é inconsistente (0, inflado, ou = frete_peso no Local, o que zeraria
// margens reais); o Saldo já é a sobra correta que o sistema calcula em toda categoria.
const margemBruta = (saldo, fretePeso) => {
  const fp = num(fretePeso);
  return fp > 0 ? r2((num(saldo) / fp) * 100) : 0;
};

// ── Ciclo de vida do CTe (migration 048) ──
// status_doc diz se o CTe ENTRA no faturamento: 'ativo' entra; 'substituido' (foi refeito
// por outro CTe) e 'cancelado' ficam na base pra consulta/auditoria mas fora de todo
// somatório. Linha sem o campo (import antigo / preview de importação) é 'ativo'.
export const ehAtivo = (l) => (l?.status_doc || "ativo") === "ativo";
// tipo_doc diz o que o CTe É: 'substituto' e 'complementar' apontam o CTe de origem em
// ctrc_ref. Complementar NÃO derruba o original — o faturamento é original + complementar.
export const TIPO_DOC = { normal: "normal", substituto: "substituto", complementar: "complementar" };

// Candidatos a vínculo de UM CTe: mesmo cliente e mesma categoria, CTRC diferente, e algo
// em comum que indique ser o mesmo transporte (mesma NF, ou a mesma chave de duplicidade
// de valor). É só sugestão pra quem revisa escolher — quem decide é sempre a pessoa.
export function candidatosVinculo(linha, linhas) {
  if (!linha) return [];
  // Diária emitida: o par NÃO está na mesma categoria — é o CTe D01/D05 da diária PAGA
  // (o custo que este CTe cobra do cliente). Como a planilha não liga um no outro, o app
  // ordena as diárias pagas do cliente pelos sinais que costumam casar (mesma placa, mesmo
  // valor) e quem revisa escolhe. Só sugestão, como no resto do vínculo.
  // O código da diária é POR CLIENTE (D01 = Suzano Imperatriz, D05 = Suzano Belém, via
  // diaria_cod no cadastro da embarcadora), então filtrar por cliente já garante que uma
  // emitida de Belém nunca casa com um D01 de Imperatriz — não precisa olhar empresa_cod.
  if (linha.categoria === "diaria_emitida") {
    const placa = String(linha.placa || "").trim();
    const afinidade = (l) =>
      (placa && String(l.placa || "").trim() === placa ? 2 : 0)
      + (r2(num(l.frete_peso)) === r2(num(linha.frete_peso)) ? 1 : 0);
    return linhas
      .filter((l) => l.id !== linha.id && l.cliente === linha.cliente && l.categoria === "diaria")
      .sort((a, b) => afinidade(b) - afinidade(a)
        || String(b.data_emissao || "").localeCompare(String(a.data_emissao || "")));
  }
  const chave = chaveDuplicidade(linha);
  const nfs = String(linha.nfs || "").trim();
  return linhas
    .filter((l) => l.id !== linha.id && l.cliente === linha.cliente && l.categoria === linha.categoria
      && String(l.ctrc) !== String(linha.ctrc)
      && ((nfs && String(l.nfs || "").trim() === nfs) || chaveDuplicidade(l) === chave))
    .sort((a, b) => String(b.data_emissao || "").localeCompare(String(a.data_emissao || "")));
}

// Frota Rodorrica: por regra o Contrato é o CTe menos R$ 300 fixos, então a margem fica
// baixa por construção e não é erro de lançamento. A planilha bruta não diz de quem é a
// frota — o app só aponta o CANDIDATO (Frete com Saldo de exatamente R$ 300) e quem revisa
// confirma na fila. Não vira flag/decisão automática por isso.
export const ehCandidatoFrotaRodorrica = (l) =>
  l?.categoria === "frete" && r2(num(l?.saldo)) === 300;

// ── Diária emitida (categoria 'diaria_emitida') ──────────────────────────────
// A diária tem DOIS documentos e eles vêm em códigos de Empresa diferentes:
//   D01/D05 -> o que a empresa PAGA ao motorista na hora (categoria 'diaria',
//              Saldo negativo, porque nesse CTe não há receita reconhecida);
//   código de FRETE -> o CTe emitido depois cobrando o cliente. Como o motorista
//              já foi pago no outro documento, este vem com Contrato zerado e
//              margem 100% — e ficava somado junto com o frete de verdade,
//              inflando a margem do frete e escondendo o custo real da diária.
//
// A planilha bruta não diz qual é qual: a régua abaixo foi calibrada nos 8 meses
// já importados (2.111 CTes de frete). Os três sinais juntos separam bem:
//   • margem 100% (Saldo == Frete Peso): 243 casos, contra 1.868 de frete normal;
//   • SEM nota fiscal: 96% dos de margem 100% x 1% do frete normal — diária não
//     transporta carga, então não tem NF;
//   • valor redondo em centenas: 95% x 17%;
//   • teto de R$ 5.000: a maior diária PAGA (D01) em 8 meses foi R$ 3.600 — acima
//     disso é frete sem contrato preenchido, não diária.
// Resultado na base atual: 227 classificados direto, 10 duvidosos (vão pra fila
// de revisão via flag_ambigua) e 6 que seguem como frete.
export const TETO_DIARIA_EMITIDA = 5000;
const margem100 = (l) => num(l.frete_peso) > 0 && r2(num(l.saldo)) === r2(num(l.frete_peso));
const semNF = (l) => !String(l.nfs ?? "").trim();
const valorRedondo = (l) => r2(num(l.frete_peso)) % 100 === 0;

// Peso 0 é o sinal mais forte que existe pra diária emitida: as 227 da base têm peso_nf = 0,
// contra 24 de 1.934 fretes (1,2%) — e nenhum desses 24 passa de R$ 3.000. Por isso, sem peso,
// o teto não se aplica: um único CTe pode cobrar as diárias de um MÊS inteiro (caso real,
// CTRC 34942 de 08/2026, R$ 38.800 cobrindo as diárias pagas em 07/2026). Com peso na linha o
// teto continua valendo — aí é carga de verdade e valor alto sem contrato é outra coisa
// (ver ehFreteSemContrato).
const semPeso = (l) => num(l.peso_nf) === 0;
const dentroDoTeto = (l) => semPeso(l) || num(l.frete_peso) <= TETO_DIARIA_EMITIDA;

export function ehDiariaEmitida(l) {
  return margem100(l) && dentroDoTeto(l) && semNF(l) && valorRedondo(l);
}
// Margem 100% e dentro do teto, mas falha em UM dos dois sinais (tem NF ou valor
// quebrado): pode ser diária emitida ou frete com contrato esquecido. Não decide
// sozinho — vai pra fila pra uma pessoa dizer qual é.
export function ehCandidatoDiariaEmitida(l) {
  if (l?.categoria !== "frete" || !margem100(l) || !dentroDoTeto(l)) return false;
  return semNF(l) !== valorRedondo(l);
}

// ── Frete sem contrato (migration 052) ───────────────────────────────────────
// CTe de frete que veio do TMS com Valor Contrato Frete = 0: o Saldo vira o CTe inteiro
// e a margem sobe pra ~100%, inflando o resultado do mês sem alertar ninguém (as flags de
// margem só olham margem BAIXA). Não é erro por definição — pode ser contrato ainda não
// lançado — então é item de fila, não bloqueio, e não muda nenhum somatório.
// Caso que originou (SUZANO IMPERATRIZ, 08/2026): CTRC 34942 de R$ 38.800 sem contrato =
// 31% do saldo do cliente no mês. A régua da diária emitida não pega esses: tem teto de
// R$ 5.000 (ver TETO_DIARIA_EMITIDA).
export const ehFreteSemContrato = (l) =>
  l?.categoria === "frete" && num(l?.valor_contrato_frete) === 0 && num(l?.total_frete) > 0;

function excelDateToISO(v) {
  if (v instanceof Date && !isNaN(v)) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  return null;
}

// Chave de duplicidade de VALOR (não de linha) — mesma placa+valor NF+peso+trecho+frete
// batendo em CTRCs diferentes é sinal de lançamento repetido (ex.: descarga também
// lançada como local por engano). Ver caso real: Belém, placa DTV6B63, CTRC 5919/5920.
export function chaveDuplicidade(l) {
  return [l.placa, r2(l.valor_nf), r2(l.peso_nf), l.trecho, r2(l.total_frete)].join("||");
}

const campoBase = (r, cli, cnpj, categoria, empresaCod) => ({
  cliente: cli.nome,
  base_id: cli.base_id,
  cnpj_remetente: cnpj,
  // Devolução (FOB): a linha entra no faturamento do cliente-alvo (cli.nome), mas guarda
  // o cnpj_remetente REAL (quem devolveu) e fica marcada pra dar pra filtrar/relatar.
  is_devolucao: !!cli.is_devolucao,
  modalidade: cli.is_devolucao ? "FOB" : "CIF",
  categoria,
  empresa_cod: empresaCod,
  ctrc: String(r["CTRC"] ?? "").trim(),
  data_emissao: excelDateToISO(r["Data Emissão"]),
  trecho: String(r["Trecho"] ?? "").trim(),
  nfs: String(r["NFS"] ?? "").trim(),
  placa: String(r["Placa Veículo Coleta"] ?? "").trim(),
  nome_usuario: String(r["Nome do Usuário"] ?? "").trim(),
  numero_manifesto: String(r["Número Manifesto"] ?? "").trim(),
  numero_contrato: String(r["Número Contrato Frete"] ?? "").trim(),
  valor_nf: num(r["Valor NF"]),
  peso_nf: num(r["Peso NF"]),
  frete_peso: num(r["Frete Peso"]),
  total_frete: num(r["Total do Frete"]),
  valor_contrato_frete: num(r["Valor Contrato Frete"]),
  saldo: num(r["Saldo"]),
  margem_lucro: num(r["Margem Lucro"]),
});

// Resolve o registro de embarcadora (do mapaEmbarcadoras) no "cliente efetivo" que
// classifica as linhas. Cliente normal (tipo 'cliente'/legado): ele mesmo. Devolução
// (tipo='devolucao'): as linhas entram no NOME/BASE do cliente-alvo (devolucao_de_cnpj),
// mas usam os códigos de Empresa da PRÓPRIA devolução e ficam marcadas is_devolucao (FOB).
// Se o alvo não existir mais no cadastro, cai no nome da própria devolução — não perde a receita.
export function clienteEfetivo(rec, mapa) {
  if (rec?.tipo !== "devolucao") return rec;
  const alvo = mapa[soDigitos(rec.devolucao_de_cnpj)];
  return { ...rec, nome: alvo?.nome || rec.nome, base_id: alvo?.base_id ?? rec.base_id, is_devolucao: true };
}

// Classifica as linhas RAW de UM cnpj (já sabendo o cliente) por categoria, a partir
// da coluna Empresa. Exportada porque ConferenciaFrete.jsx reusa isso ao cadastrar um
// CNPJ desconhecido na hora da importação (sem precisar reler o arquivo inteiro).
export function classificarLinhasCliente(rows, cli, cnpj) {
  const classificadas = [];
  const naoClassificadas = [];
  rows.forEach((r) => {
    const emp = String(r["Empresa"] ?? "").trim().toUpperCase();
    if (emp === cli.frete_cod) {
      // A diária emitida vem no MESMO código de Empresa do frete — só os valores
      // do documento a distinguem (ver ehDiariaEmitida).
      const linha = campoBase(r, cli, cnpj, "frete", emp);
      if (ehDiariaEmitida(linha)) linha.categoria = "diaria_emitida";
      classificadas.push(linha);
    } else if (cli.desc_local_cod && emp === cli.desc_local_cod) {
      const margem = num(r["Margem Lucro"]);
      classificadas.push(campoBase(r, cli, cnpj, margem === 0 ? "descarga" : "local", emp));
    } else if (cli.diaria_cod && emp === cli.diaria_cod) {
      classificadas.push(campoBase(r, cli, cnpj, "diaria", emp));
    } else {
      naoClassificadas.push(campoBase(r, cli, cnpj, "nao_classificado", emp));
    }
  });
  return { classificadas, naoClassificadas };
}

// Recalcula flags de revisão + periodo_ref sobre um conjunto de linhas já classificadas.
// Roda de novo (idempotente) toda vez que o conjunto de linhas muda — ex.: depois de
// cadastrar um CNPJ novo e juntar as linhas dele às já conhecidas.
export function recalcularFlagsEPeriodo(linhas, naoClassificadas) {
  const porChave = {};
  linhas.forEach((l) => { const k = chaveDuplicidade(l); (porChave[k] = porChave[k] || []).push(l); });

  linhas.forEach((l) => {
    // Diária: motorista é pago na hora (débito) e o CTe complementar só entra na
    // semana/mês seguinte — margem negativa aqui é o fluxo normal, não é alerta.
    // Descarga: CTe e Contrato têm o mesmo valor por definição (margem 0) — recebido
    // via NFSe na semana/mês seguinte e conciliado depois; margem 0 não é alerta aqui.
    // Bonificação: valor bônus, não é frete propriamente dito — margem não se aplica.
    // Diária emitida: margem 100% por definição (o custo saiu no CTe D01), então
    // não é "margem alta demais" nem entra em alerta.
    const margemFlexivel = l.categoria === "diaria" || l.categoria === "descarga"
      || l.categoria === "bonificacao" || l.categoria === "diaria_emitida";
    // Ignora a "Margem Lucro" da planilha e recalcula no app (ver margemBruta).
    l.margem_lucro = margemBruta(l.saldo, l.frete_peso);
    l.flag_negativa = !margemFlexivel && l.margem_lucro < 0;
    l.flag_baixa = !margemFlexivel && l.margem_lucro >= 0 && l.margem_lucro < 10;
    l.flag_ambigua =
      ((l.categoria === "descarga" || l.categoria === "local") &&
        ((l.margem_lucro > 0 && l.margem_lucro < 1) || (l.valor_contrato_frete === 0 && l.total_frete > 0)))
      // Frete de margem 100% que a régua não conseguiu decidir: pode ser diária
      // emitida ou frete com contrato esquecido — quem revisa escolhe.
      || ehCandidatoDiariaEmitida(l);
    l.flag_sem_contrato = ehFreteSemContrato(l);
    const grupo = porChave[chaveDuplicidade(l)];
    l.flag_duplicidade = grupo.length > 1;
    l.dup_grupo_chave = grupo.length > 1 ? chaveDuplicidade(l) : null;
  });

  // Período de referência: por LINHA, a partir da própria data_emissao — não do arquivo
  // inteiro. Um arquivo pode cobrir vários meses (ex.: relatório 01/2026 a 07/2026);
  // cada CTRC tem que cair no mês certo, senão os filtros por período ficam todos errados.
  // Fallback (linha sem data_emissao, raro): mês mais comum no arquivo, senão mês corrente.
  const meses = linhas.map(l => l.data_emissao).filter(Boolean).map(d => d.slice(0, 7));
  const contagem = {};
  meses.forEach(m => { contagem[m] = (contagem[m] || 0) + 1; });
  const fallback = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0]
    || new Date().toISOString().slice(0, 7);
  linhas.forEach(l => { l.periodo_ref = l.data_emissao ? l.data_emissao.slice(0, 7) : fallback; });
  naoClassificadas.forEach(l => { l.periodo_ref = l.data_emissao ? l.data_emissao.slice(0, 7) : fallback; });

  const periodosEncontrados = [...new Set(linhas.map(l => l.periodo_ref))].sort();
  // periodoRef "de exibição" = mês mais recente encontrado (pra onde a tela pula após importar)
  const periodoRef = periodosEncontrados[periodosEncontrados.length - 1] || fallback;
  return { periodoRef, periodosEncontrados };
}

// Lê o .xls/.xlsx bruto e devolve as linhas já classificadas por categoria + flags,
// agrupando por CNPJ Remetente DENTRO do arquivo — um único arquivo pode conter várias
// embarcadoras misturadas (export completo do TMS), não precisa mais separar antes.
// `clientesMap` = mapaClientes(await listarClientes(conn)), carregado por quem chama.
// CNPJs que não estão no cadastro voltam em `desconhecidos` (não em erro) — a tela
// oferece cadastrar na hora ou ignorar essas linhas.
export function parseFreteXLSX(file, clientesMap) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 0, defval: null, raw: true });
        if (!json.length) return resolve({ linhas: [], naoClassificadas: [], desconhecidos: {}, periodoRef: null, periodosEncontrados: [], erro: "Planilha vazia" });

        const porCnpj = {};
        json.forEach((r) => {
          const cnpj = soDigitos(r["CNPJ Remetente"]);
          (porCnpj[cnpj] = porCnpj[cnpj] || []).push(r);
        });

        const linhas = [];
        const naoClassificadas = [];
        const desconhecidos = {};

        Object.entries(porCnpj).forEach(([cnpj, rows]) => {
          const cli = clientesMap[cnpj];
          if (!cli) {
            const empresas = {};
            rows.forEach((r) => { const e = String(r["Empresa"] ?? "").trim().toUpperCase(); empresas[e] = (empresas[e] || 0) + 1; });
            desconhecidos[cnpj] = { cnpj, linhasRaw: rows, empresas, qtd: rows.length };
            return;
          }
          const { classificadas, naoClassificadas: ignoradas } = classificarLinhasCliente(rows, clienteEfetivo(cli, clientesMap), cnpj);
          linhas.push(...classificadas);
          naoClassificadas.push(...ignoradas);
        });

        const { periodoRef, periodosEncontrados } = recalcularFlagsEPeriodo(linhas, naoClassificadas);

        resolve({ periodoRef, periodosEncontrados, linhas, naoClassificadas, desconhecidos, erro: null });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Diff / import não-destrutivo (mesmo espírito de despesas.diffImport) ──
// Chave de dedupe = a MESMA da constraint UNIQUE da tabela: cnpj_remetente + categoria +
// ctrc + periodo_ref. Era por `cliente` (nome) aqui e por cnpj no banco desde a migration
// 045 — divergência que fazia o diff achar que a linha era nova e o insert bater na UNIQUE
// (caso típico: devolução FOB, onde o cliente é o alvo e o CNPJ é o de quem devolveu).
const chaveLinha = (l) => `${soDigitos(l.cnpj_remetente)}||${l.categoria}||${l.ctrc}||${l.periodo_ref}`;
// Chave do DOCUMENTO (sem categoria): identifica o CTe independente de como ele foi
// classificado. Usada pra proteger linha com categoria definida à mão (ver diffImportFrete).
const chaveDoc = (l) => `${soDigitos(l.cnpj_remetente)}||${l.ctrc}||${l.periodo_ref}`;

export async function listarPorPeriodo(conn, periodoRef, cliente) {
  if (_sessionToken) {
    return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/listar_frete_periodos",
      { p_token: _sessionToken, p_periodos: [periodoRef], p_cliente: cliente ?? null }));
  }
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?periodo_ref=eq.${q(periodoRef)}`;
  if (cliente) path += `&cliente=eq.${q(cliente)}`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

// Igual listarPorPeriodo, mas pra varios meses de uma vez — necessario porque um
// arquivo importado pode cobrir varios periodo_ref (ver parseFreteXLSX).
export async function listarPorPeriodos(conn, periodoRefs, cliente) {
  if (_sessionToken) {
    return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/listar_frete_periodos",
      { p_token: _sessionToken, p_periodos: periodoRefs, p_cliente: cliente ?? null }));
  }
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?periodo_ref=in.(${periodoRefs.map(q).join(",")})`;
  if (cliente) path += `&cliente=eq.${q(cliente)}`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

// Sem filtro de cliente: um arquivo pode trazer varias embarcadoras juntas agora
// (ver parseFreteXLSX), entao o diff busca os periodos inteiros e a propria chave
// (que ja inclui o CNPJ) separa quem e quem.
//
// PROTEÇÃO DE CATEGORIA MANUAL (migration 049): a planilha só sabe classificar em
// frete/descarga/local/diaria. Se alguém já definiu a categoria daquele CTe à mão (ex.:
// Bonificação, que NUNCA vem da planilha), reimportar criava uma SEGUNDA linha do mesmo
// CTRC na categoria que a planilha sugere — o CTe "voltava a aparecer" e a correção batia
// na UNIQUE. Agora o documento inteiro é pulado, e o diff reporta quantos foram protegidos.
export async function diffImportFrete(conn, linhas) {
  const periodos = [...new Set(linhas.map(l => l.periodo_ref))];
  const existentes = periodos.length ? await listarPorPeriodos(conn, periodos) : [];
  const existKeys = new Set(existentes.map(chaveLinha));
  const docsManuais = new Set(existentes.filter(l => l.categoria_manual).map(chaveDoc));
  const protegidas = linhas.filter(l => !existKeys.has(chaveLinha(l)) && docsManuais.has(chaveDoc(l)));
  const novas = linhas.filter(l => !existKeys.has(chaveLinha(l)) && !docsManuais.has(chaveDoc(l)));
  return {
    novas,
    jaExistem: linhas.length - novas.length - protegidas.length,
    protegidas: protegidas.length,
    protegidasCtrcs: [...new Set(protegidas.map(l => l.ctrc))],
    existentesTotal: existentes.length,
  };
}

export async function inserirFrete(conn, linhas) {
  if (!linhas.length) return [];
  if (_sessionToken) {
    return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/inserir_frete_lote",
      { p_token: _sessionToken, p_rows: linhas }));
  }
  return await supaFetch(conn.url, conn.key, "POST", TABELA, linhas);
}

// Mês anterior ao corrente (data real da máquina, não o periodoRef selecionado na tela),
// em "YYYY-MM" — corte da fila de revisão (ver listarPendentesRevisao).
function mesAnteriorAoCorrente() {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Fila de revisão: só entram itens do mês anterior ao corrente pra cá (ex.: em julho,
// só junho e julho aparecem). Meses mais antigos já foram fechados/tratados e não voltam
// a poluir a fila — quem quiser vê-los ainda pode acessar via listarTodosPeriodo/exportação.
export async function listarPendentesRevisao(conn, cliente) {
  if (_sessionToken) {
    return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/listar_frete_pendentes",
      { p_token: _sessionToken, p_cliente: cliente ?? null }));
  }
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?decisao_manual=is.null&periodo_ref=gte.${q(mesAnteriorAoCorrente())}&or=(flag_negativa.eq.true,flag_baixa.eq.true,flag_ambigua.eq.true,flag_duplicidade.eq.true,flag_sem_contrato.eq.true)&order=periodo_ref.desc,margem_lucro.asc`;
  if (cliente) path += `&cliente=eq.${q(cliente)}`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

// Itens sinalizados para correção manual (fora do fluxo do App) — ficam visíveis
// com data + observação até alguém corrigir/excluir a linha de origem; não voltam
// a alertar e já contam nos totais (listarTodosPeriodo ignora decisao_manual).
export async function listarSinalizados(conn, cliente) {
  if (_sessionToken) {
    return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/listar_frete_sinalizados",
      { p_token: _sessionToken, p_cliente: cliente ?? null }));
  }
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?decisao_manual=eq.sinalizar_correcao&order=revisado_em.desc`;
  if (cliente) path += `&cliente=eq.${q(cliente)}`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

export async function decidir(conn, id, decisao, obs, revisadoPor) {
  const body = { decisao_manual: decisao, revisado_em: new Date().toISOString(), revisado_obs: obs || null, revisado_por: revisadoPor || null, atualizado_em: new Date().toISOString() };
  if (_sessionToken) {
    return _one(await supaFetch(conn.url, conn.key, "POST", "rpc/patch_frete",
      { p_token: _sessionToken, p_id: id, p_patch: body }));
  }
  const q = encodeURIComponent(id);
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${q}`, body);
  return Array.isArray(res) ? res[0] : res;
}

// Estorna uma decisão de revisão (ex.: "correção feita" clicada sem querer): limpa
// decisao_manual + campos de revisão, devolvendo a linha à fila se ainda tiver flag.
export async function estornarRevisao(conn, id) {
  const body = { decisao_manual: null, revisado_em: null, revisado_obs: null, revisado_por: null, atualizado_em: new Date().toISOString() };
  if (_sessionToken) {
    return _one(await supaFetch(conn.url, conn.key, "POST", "rpc/patch_frete",
      { p_token: _sessionToken, p_id: id, p_patch: body }));
  }
  const q = encodeURIComponent(id);
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${q}`, body);
  return Array.isArray(res) ? res[0] : res;
}

export async function excluirFrete(conn, id) {
  if (_sessionToken) {
    return await supaFetch(conn.url, conn.key, "POST", "rpc/excluir_frete",
      { p_token: _sessionToken, p_id: id });
  }
  const q = encodeURIComponent(id);
  return await supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=eq.${q}`);
}

// Edição COMPLETA de um CTe — só ADMIN (o RPC editar_frete valida o perfil pelo token,
// migration 036). Usado pra corrigir lançamentos errados (ex.: cliente que é FOB e subiu
// como CIF, categoria trocada, valores). patch = só os campos alterados.
export async function editarFrete(conn, id, patch) {
  if (_sessionToken) {
    return _one(await supaFetch(conn.url, conn.key, "POST", "rpc/editar_frete",
      { p_token: _sessionToken, p_id: id, p_patch: patch }));
  }
  const q = encodeURIComponent(id);
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${q}`, patch);
  return Array.isArray(res) ? res[0] : res;
}

// Vínculo de ciclo de vida (migration 048): marca ESTE CTe como substituto/complementar
// de outro CTRC, ou como cancelado — e, na substituição, derruba o antigo pra fora dos
// somatórios. tipo = 'substituto' | 'complementar' | 'cancelado' | 'normal' (desfaz).
// O RPC faz os dois lados numa transação; devolve as linhas afetadas.
// idRef (opcional) = id do CTe par, quando a tela já sabe qual é (grupo de duplicidade).
// Tem precedência sobre o número: o par pode estar em outra categoria, e o mesmo número de
// CTRC pode existir em mais de uma — casar só pelo número derrubaria a linha errada.
export async function vincularCte(conn, id, tipo, ctrcRef, por, idRef) {
  if (_sessionToken) {
    return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/vincular_cte",
      { p_token: _sessionToken, p_id: id, p_tipo: tipo, p_ctrc_ref: ctrcRef || null, p_por: por || null, p_id_ref: idRef || null }));
  }
  // Fallback anon (pré go-live): só o lado desta linha — o par é recalculado no próximo load.
  const body = tipo === "normal"
    ? { tipo_doc: "normal", status_doc: "ativo", ctrc_ref: null, vinculo_em: null, vinculo_por: null }
    : tipo === "cancelado"
      ? { status_doc: "cancelado", ctrc_ref: ctrcRef || null, vinculo_em: new Date().toISOString(), vinculo_por: por || null }
      : { tipo_doc: tipo, status_doc: "ativo", ctrc_ref: ctrcRef, vinculo_em: new Date().toISOString(), vinculo_por: por || null };
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${encodeURIComponent(id)}`,
    { ...body, atualizado_em: new Date().toISOString() });
  return Array.isArray(res) ? res : [res];
}

// Mês de competência da diária (migrations 053/054). Vale nas DUAS pontas, porque nenhuma
// delas cai necessariamente no mês do espelho:
//   'diaria' (D01/D05) → o D01 é emitido antes ou depois do espelho, então o que se pagou
//     num mês pode se referir a dois meses de espelho diferentes;
//   'diaria_emitida'   → o CTe que cobra sai depois, e um só pode cobrar o mês inteiro.
// ref = "YYYY-MM" ou null pra limpar. O RPC recusa qualquer outra categoria.
export async function definirCompetencia(conn, id, ref) {
  if (_sessionToken) {
    return _one(await supaFetch(conn.url, conn.key, "POST", "rpc/definir_competencia_frete",
      { p_token: _sessionToken, p_id: id, p_ref: ref || null }));
  }
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${encodeURIComponent(id)}`,
    { competencia_ref: ref || null, atualizado_em: new Date().toISOString() });
  return Array.isArray(res) ? res[0] : res;
}

// Mês em que a linha de diária (paga ou emitida) deve ser LIDA: a competência quando
// marcada, senão o mês de emissão (comportamento de antes da migration 053). Usado nos dois
// lados do card frete × diária — senão a comparação erra ora no custo, ora na receita.
export const mesCompetencia = (l) => l?.competencia_ref || l?.periodo_ref;

// Recalcula margem + flags de UMA linha após edição admin (mesma regra de
// recalcularFlagsEPeriodo, menos flag_duplicidade, que é cruzada entre linhas).
export function recalcularLinhaEditada(l) {
  const margemFlexivel = l.categoria === "diaria" || l.categoria === "descarga"
    || l.categoria === "bonificacao" || l.categoria === "diaria_emitida";
  const margem = margemBruta(l.saldo, l.frete_peso);
  return {
    margem_lucro: margem,
    flag_negativa: !margemFlexivel && margem < 0,
    flag_baixa: !margemFlexivel && margem >= 0 && margem < 10,
    flag_ambigua: (l.categoria === "descarga" || l.categoria === "local") &&
      ((margem > 0 && margem < 1) || (num(l.valor_contrato_frete) === 0 && num(l.total_frete) > 0)),
    flag_sem_contrato: ehFreteSemContrato(l),
  };
}

// ── Indicadores (dashboard) ──
export async function listarTodosPeriodo(conn, periodoRef) {
  if (_sessionToken) {
    return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/listar_frete_periodos",
      { p_token: _sessionToken, p_periodos: [periodoRef], p_cliente: null }));
  }
  const q = encodeURIComponent(periodoRef);
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?periodo_ref=eq.${q}`)) || [];
}

// Todos os resumos abaixo somam SÓ CTes ativos (ver ehAtivo): substituídos e cancelados
// continuam na base e na tela, mas fora de qualquer total. Filtro na entrada de cada
// função pra nenhum caller esquecer — inclusive o preview da importação.
export function resumoPorCategoria(linhas) {
  const cats = ["frete", "diaria_emitida", "descarga", "local", "diaria", "bonificacao"];
  const out = {};
  const ativas = linhas.filter(ehAtivo);
  cats.forEach((c) => {
    const sub = ativas.filter(l => l.categoria === c);
    out[c] = {
      registros: sub.length,
      peso: sub.reduce((s, l) => s + num(l.peso_nf), 0),
      fretePeso: sub.reduce((s, l) => s + num(l.frete_peso), 0),
      saldo: sub.reduce((s, l) => s + num(l.saldo), 0),
      margemMedia: sub.length ? sub.reduce((s, l) => s + num(l.margem_lucro), 0) / sub.length : 0,
    };
  });
  return out;
}

export function resumoPorCliente(linhas) {
  const out = {};
  linhas.filter(ehAtivo).forEach((l) => {
    out[l.cliente] = out[l.cliente] || { registros: 0, peso: 0, fretePeso: 0, saldo: 0, _margensFrete: [] };
    out[l.cliente].registros++;
    out[l.cliente].peso += num(l.peso_nf);
    out[l.cliente].fretePeso += num(l.frete_peso);
    out[l.cliente].saldo += num(l.saldo);
    // Amostragem de margem = só Frete. Descarga tem margem 0 por definição (CTe=Contrato) e
    // Diária é normalmente negativa (motorista pago na hora, CTe complementar entra depois) —
    // misturar essas categorias distorceria o indicador de margem real por cliente.
    if (l.categoria === "frete") out[l.cliente]._margensFrete.push(num(l.margem_lucro));
  });
  Object.values(out).forEach((d) => { d.margemMedia = d._margensFrete.length ? d._margensFrete.reduce((s, v) => s + v, 0) / d._margensFrete.length : 0; delete d._margensFrete; });
  return out;
}

// Evolução dia a dia (data_emissao) do período — pra acompanhar quantos CTRCs
// entraram de um dia pro outro, sem esperar o mês fechar.
export function resumoPorDia(linhas) {
  const out = {};
  linhas.filter(ehAtivo).forEach((l) => {
    const dia = l.data_emissao;
    if (!dia) return;
    out[dia] = out[dia] || { registros: 0, peso: 0, fretePeso: 0, saldo: 0 };
    out[dia].registros++;
    out[dia].peso += num(l.peso_nf);
    out[dia].fretePeso += num(l.frete_peso);
    out[dia].saldo += num(l.saldo);
  });
  return Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, d]) => ({ dia, ...d }));
}

// ── Exportação: planilha formatada (mesmo modelo original FRETES/DESCARGAS/DIARIAS/LOCAL)
// com indicadores por cliente/embarcadora + totais + aba RESUMO. Dispara download no navegador.
export function gerarWorkbookXLSX(linhasTodas, periodoRef) {
  // Só CTes ativos: substituídos/cancelados ficam de fora do arquivo pra planilha bater
  // com os totais da tela. O vínculo dos que entram aparece na coluna "Situação".
  const linhas = linhasTodas.filter(ehAtivo);
  const wb = XLSX.utils.book_new();
  const CAT_LABEL = { frete: "Frete", diaria_emitida: "Diária emitida", descarga: "Descarga", local: "Local", diaria: "Diária paga", bonificacao: "Bonificação" };
  // "Modalidade" no fim (CIF/FOB) — appendada pra não deslocar os índices posicionais das
  // linhas de subtotal/total abaixo (que ficam mais curtas, com a célula final vazia).
  const COLS = ["Cliente", "CTRC", "Empresa", "Data Emissão", "Trecho", "NFS", "Placa", "Nome do Usuário",
    "Nº Manifesto", "Nº Contrato Frete", "Valor NF", "Peso NF", "Frete Peso", "Total do Frete",
    "Valor Contrato Frete", "Saldo", "Margem Lucro (%)", "Modalidade", "Situação"];

  const situacao = (l) =>
    l.tipo_doc === "substituto" ? `Substitui o CTRC ${l.ctrc_ref || "?"}`
    : l.tipo_doc === "complementar" ? `Complementar do CTRC ${l.ctrc_ref || "?"}`
    : "";

  const linhaArray = (l) => [
    l.cliente, l.ctrc, l.empresa_cod, l.data_emissao, l.trecho, l.nfs, l.placa, l.nome_usuario,
    l.numero_manifesto, l.numero_contrato, num(l.valor_nf), num(l.peso_nf), num(l.frete_peso),
    num(l.total_frete), num(l.valor_contrato_frete), num(l.saldo), r2(num(l.margem_lucro)),
    l.is_devolucao ? "FOB (devolução)" : "CIF", situacao(l),
  ];

  const construirAba = (categoria, titulo) => {
    const sub = linhas.filter((l) => l.categoria === categoria);
    const porCliente = {};
    sub.forEach((l) => { (porCliente[l.cliente] = porCliente[l.cliente] || []).push(l); });

    const aoa = [COLS];
    Object.keys(porCliente).sort().forEach((cli) => {
      const rows = porCliente[cli];
      rows.forEach((l) => aoa.push(linhaArray(l)));
      const qtd = rows.length;
      const somaPeso = rows.reduce((s, l) => s + num(l.peso_nf), 0);
      const somaFretePeso = rows.reduce((s, l) => s + num(l.frete_peso), 0);
      const somaSaldo = rows.reduce((s, l) => s + num(l.saldo), 0);
      const mediaMargem = qtd ? rows.reduce((s, l) => s + num(l.margem_lucro), 0) / qtd : 0;
      aoa.push([`Subtotal ${cli}`, `${qtd} reg.`, "", "", "", "", "", "", "", "", "", somaPeso, somaFretePeso, "", "", somaSaldo, r2(mediaMargem)]);
      aoa.push([]);
    });
    const qtdTotal = sub.length;
    const somaPesoTotal = sub.reduce((s, l) => s + num(l.peso_nf), 0);
    const somaFretePesoTotal = sub.reduce((s, l) => s + num(l.frete_peso), 0);
    const somaSaldoTotal = sub.reduce((s, l) => s + num(l.saldo), 0);
    const mediaMargemTotal = qtdTotal ? sub.reduce((s, l) => s + num(l.margem_lucro), 0) / qtdTotal : 0;
    aoa.push(["TOTAL GERAL", `${qtdTotal} reg.`, "", "", "", "", "", "", "", "", "", somaPesoTotal, somaFretePesoTotal, "", "", somaSaldoTotal, r2(mediaMargemTotal)]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, titulo);
  };

  construirAba("frete", "FRETES");
  construirAba("diaria_emitida", "DIARIAS EMITIDAS");
  construirAba("descarga", "DESCARGAS");
  construirAba("diaria", "DIARIAS");
  construirAba("local", "LOCAL");
  construirAba("bonificacao", "BONIFICACAO");

  // RESUMO: indicadores por cliente/categoria + margem real (amostragem só de Frete)
  const resumoAoa = [["Cliente", "Categoria", "Registros", "Peso (kg)", "Frete Peso (R$)", "Saldo (R$)", "Margem média (%)", "Obs"]];
  const clientes = [...new Set(linhas.map((l) => l.cliente))].sort();
  clientes.forEach((cli) => {
    ["frete", "diaria_emitida", "descarga", "local", "diaria", "bonificacao"].forEach((cat) => {
      const sub = linhas.filter((l) => l.cliente === cli && l.categoria === cat);
      if (!sub.length) return;
      const qtd = sub.length;
      const peso = sub.reduce((s, l) => s + num(l.peso_nf), 0);
      const fretePeso = sub.reduce((s, l) => s + num(l.frete_peso), 0);
      const saldo = sub.reduce((s, l) => s + num(l.saldo), 0);
      const margem = qtd ? sub.reduce((s, l) => s + num(l.margem_lucro), 0) / qtd : 0;
      const obs = cat === "descarga" ? "margem 0 por definição (CTe = Contrato)"
        : cat === "diaria" ? "custo: diária paga ao motorista na hora (o CTe emitido vem depois)"
        : cat === "diaria_emitida" ? "margem 100% por definição — o custo saiu no CTe da diária paga"
        : cat === "bonificacao" ? "valor bônus, margem não se aplica" : "";
      resumoAoa.push([cli, CAT_LABEL[cat], qtd, peso, fretePeso, saldo, r2(margem), obs]);
    });
  });
  resumoAoa.push([]);
  resumoAoa.push(["Margem real por cliente (amostragem só de Frete)"]);
  resumoAoa.push(["Cliente", "Margem média Frete (%)"]);
  clientes.forEach((cli) => {
    const fretes = linhas.filter((l) => l.cliente === cli && l.categoria === "frete");
    const margem = fretes.length ? fretes.reduce((s, l) => s + num(l.margem_lucro), 0) / fretes.length : 0;
    resumoAoa.push([cli, r2(margem)]);
  });

  // Devoluções (FOB) — quanto do faturamento de cada cliente veio de carga que voltou.
  const devolucoes = linhas.filter((l) => l.is_devolucao);
  if (devolucoes.length) {
    resumoAoa.push([]);
    resumoAoa.push([`Devoluções (FOB) — ${devolucoes.length} linha(s) de carga que voltou, lançadas no cliente de destino`]);
    resumoAoa.push(["Cliente", "Registros", "Frete Peso (R$)", "Saldo (R$)"]);
    clientes.forEach((cli) => {
      const sub = devolucoes.filter((l) => l.cliente === cli);
      if (!sub.length) return;
      resumoAoa.push([cli, sub.length, sub.reduce((s, l) => s + num(l.frete_peso), 0), sub.reduce((s, l) => s + num(l.saldo), 0)]);
    });
  }

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoAoa);
  XLSX.utils.book_append_sheet(wb, wsResumo, "RESUMO");
  wb.SheetNames.unshift(wb.SheetNames.pop()); // RESUMO primeiro

  XLSX.writeFile(wb, `Conferencia_Faturamento_${periodoRef}.xlsx`);
}
