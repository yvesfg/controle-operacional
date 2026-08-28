// ── freteContratos.js ──
// Parser + CRUD do relatório de CONTRATOS de frete do TMS (migration 055), o outro lado do
// relatório de CTes lido por freteConferencia.js:
//   CTe      → o que se COBRA do cliente (receita, margem);
//   Contrato → quem LEVOU a carga e quanto custou (motorista/agregado, encargos de PF).
// A ponte entre os dois é a coluna "CTe Ctrc" do contrato, que casa com frete_conferencia.ctrc
// dentro da mesma empresa de emissão. MAT é a MATRIZ e mistura clientes (Imperatriz,
// Açailândia, Maranhão Ind. de Couros), então o casamento NUNCA é por cliente — só por CTRC.
//
// Acesso: a tabela tem RLS ligado e nenhuma policy (igual frete_conferencia), então tudo
// passa por RPC token-validada. Sem fallback REST anon aqui de propósito.
import * as XLSX from "xlsx";
import { supaFetch } from "./supabase.js";

let _sessionToken = null;
export function setContratosToken(t) { _sessionToken = t || null; }
const _rows = (r) => Array.isArray(r) ? r.map(x => typeof x === "string" ? JSON.parse(x) : x) : [];

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const txt = (v) => String(v ?? "").trim();
const soDigitos = (v) => txt(v).replace(/\D/g, "");
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Alíquotas medidas no relatório de 01-06/08/2026 (MAT), não chutadas — os 32 contratos de
// pessoa física com valor lançado batem exatamente nelas. Base legal: 20% do frete é a base
// de cálculo do TAC, daí INSS 11% → 2,2% do contrato e SEST/SENAT 2,5% → 0,5%. Custos
// Externos é a cota patronal (20% sobre a mesma base) → 4%.
export const ALIQUOTAS = { inss: 2.2, sest: 0.5, custosExternos: 4 };
// Tolerância ao comparar lançado × esperado. O TMS arredonda por fora (ex.: contrato de
// R$ 2.444,41 lançou R$ 97,65 de custo externo contra R$ 97,78 de 4% exato), e centavo de
// arredondamento não é lançamento faltando — sem essa folga a fila enche de falso positivo.
const TOL = 0.5;
export const esperado = (valor, pct) => r2(num(valor) * pct / 100);
// Quanto falta de uma rubrica, já descontada a tolerância (0 quando está dentro dela).
const falta = (lancado, devido) => (num(lancado) < devido - TOL ? r2(devido - num(lancado)) : 0);

// Pessoa física = CPF (11 dígitos). PJ (14) não tem INSS/SEST/custo patronal — e no relatório
// analisado nenhum dos 19 PJ tinha, o que confirma a leitura.
export const ehPessoaFisica = (doc) => soDigitos(doc).length <= 11;

function excelDateToISO(v) {
  if (v instanceof Date && !isNaN(v)) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  return null;
}

const campoLinha = (r) => {
  const doc = soDigitos(r["CPF/CNPJ Agregado"]);
  const dataEmissao = excelDateToISO(r["Data emissão"]);
  return {
    empresa_emissao: txt(r["Empresa de Emissão"]).toUpperCase(),
    contrato: txt(r["Contrato de Frete"]),
    data_emissao: dataEmissao,
    cte_ctrc: txt(r["CTe Ctrc"]),
    cte_empresa: txt(r["CTe Empresa"]).toUpperCase(),
    cte_serie: txt(r["CTe Série"]),
    cpf_cnpj: doc,
    eh_pf: ehPessoaFisica(doc),
    nome_agregado: txt(r["Nome do Agregado"]),
    motorista: txt(r["Motorista"]),
    veiculo: txt(r["Veículo"]),
    trecho: txt(r["Trecho"]),
    valor: num(r["Valor"]),
    valor_pedagio: num(r["Valor Pedágio"]),
    adiantamento: num(r["Adiantamento"]),
    outras_deducoes: num(r["Outras Deduções"]),
    valor_saldo_carta: num(r["Valor Saldo da Carta"]),
    data_baixa: excelDateToISO(r["Data da baixa"]),
    status: txt(r["Status"]),
    valor_inss: num(r["Valor INSS"]),
    sest_senat: num(r["SEST/SENAT"]),
    custos_externos: num(r["Custos Externos"]),
    valor_total_frete: num(r["Valor total do frete"]),
    valor_icms: num(r["Valor de ICMS"]),
    valor_frete_peso: num(r["Valor de frete peso"]),
    periodo_ref: dataEmissao ? dataEmissao.slice(0, 7) : null,
  };
};

// Lê o .xlsx bruto de contratos. Diferente do relatório de CTes, aqui um arquivo é sempre de
// UMA empresa de emissão (MAT ou MAR), mas pode cobrir mais de um mês — o periodo_ref sai da
// data de cada linha, nunca do arquivo (mesma regra do parser de CTes).
export function parseContratosXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 0, defval: null, raw: true });
        if (!json.length) return resolve({ linhas: [], periodosEncontrados: [], erro: "Planilha vazia" });
        if (!("Contrato de Frete" in json[0]) || !("CTe Ctrc" in json[0])) {
          return resolve({ linhas: [], periodosEncontrados: [], erro: "Não parece o relatório de contratos (faltam as colunas 'Contrato de Frete' e 'CTe Ctrc')" });
        }
        const linhas = json.map(campoLinha).filter((l) => l.contrato);
        // Linha sem data cai no mês mais comum do arquivo — o mesmo fallback do parser de CTes.
        const contagem = {};
        linhas.forEach((l) => { if (l.periodo_ref) contagem[l.periodo_ref] = (contagem[l.periodo_ref] || 0) + 1; });
        const fallback = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0]
          || new Date().toISOString().slice(0, 7);
        linhas.forEach((l) => { if (!l.periodo_ref) l.periodo_ref = fallback; });
        const periodosEncontrados = [...new Set(linhas.map((l) => l.periodo_ref))].sort();
        const empresas = [...new Set(linhas.map((l) => l.empresa_emissao).filter(Boolean))];
        resolve({ linhas, periodosEncontrados, empresas, erro: null });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// Mesma chave do índice UNIQUE (empresa + contrato + CTRC): um contrato rateado em vários
// CTes vem repetido no relatório, uma linha por CTe.
const chaveContrato = (l) => `${l.empresa_emissao}||${l.contrato}||${l.cte_ctrc || ""}`;

// Pagina por período pelo mesmo motivo da Conferência: o PostgREST corta em 1000 linhas sem
// avisar (503 contratos só em 08/2026), e o mês truncado some do cruzamento em silêncio.
// Ordem estável (…, id) vem da migration 077.
const PAGINA = 1000;
export async function listarContratosPorPeriodos(conn, periodos) {
  if (!_sessionToken) return [];
  const umPeriodo = async (periodo) => {
    const out = [];
    for (let p = 0; p < 50; p++) {
      const pagina = _rows(await supaFetch(conn.url, conn.key, "POST",
        `rpc/listar_contratos_periodos?limit=${PAGINA}&offset=${p * PAGINA}`,
        { p_token: _sessionToken, p_periodos: [periodo] }));
      out.push(...pagina);
      if (pagina.length < PAGINA) break;
    }
    return out;
  };
  return (await Promise.all(periodos.map(umPeriodo))).flat();
}

// O insert faz UPSERT (ver migration 055): reimportar o mês depois de lançar o que faltava
// atualiza os valores em vez de duplicar. Por isso o diff aqui é só informativo — diz quantos
// são novos e quantos vão ser atualizados, pra tela avisar antes de gravar.
export async function diffImportContratos(conn, linhas) {
  const periodos = [...new Set(linhas.map((l) => l.periodo_ref))];
  const existentes = periodos.length ? await listarContratosPorPeriodos(conn, periodos) : [];
  const existKeys = new Set(existentes.map(chaveContrato));
  const novas = linhas.filter((l) => !existKeys.has(chaveContrato(l)));
  return { novas, atualizadas: linhas.length - novas.length, existentesTotal: existentes.length };
}

export async function inserirContratos(conn, linhas) {
  if (!linhas.length) return [];
  if (!_sessionToken) throw new Error("Sessão expirada — entre de novo para importar contratos.");
  return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/inserir_contratos_lote",
    { p_token: _sessionToken, p_rows: linhas }));
}

export async function excluirContrato(conn, id) {
  if (!_sessionToken) throw new Error("Sessão expirada.");
  return await supaFetch(conn.url, conn.key, "POST", "rpc/excluir_contrato",
    { p_token: _sessionToken, p_id: id });
}

// ── Cruzamento contrato × CTe ───────────────────────────────────────────────────
// Casa por CTRC + empresa (o CTe guarda a empresa em empresa_cod; o contrato, em cte_empresa)
// e devolve UM registro por contrato com o CTe do lado, mais os problemas encontrados.
// Nada disso é gravado: é leitura, recalculada a cada carga.
export const PROBLEMA = {
  pf_sem_custos_externos: "PF sem custos externos (4%)",
  pf_sem_inss: "PF sem INSS",
  pf_sem_sest: "PF sem SEST/SENAT",
  contrato_zerado: "Contrato sem valor",
  cte_sem_contrato: "CTe sem contrato, mas o contrato existe",
  cte_contrato_vinculado: "Vinculado à mão — falta lançar no TMS",
  sem_cte_na_base: "Contrato sem o CTe importado",
  trecho_nao_decidido: "Trecho novo — é nossa operação?",
};

// Regra por (empresa de emissão, trecho), migration 056. O relatório do TMS traz TUDO que a
// empresa rodou, não só a nossa operação: no MAR de 01-11/08/2026, 69 dos 81 contratos eram
// de outra operação (trechos MAB*/ANN*). Filtrar por CNPJ da embarcadora travaria o app em
// "só Suzano", então quem decide é esta regra — e trecho novo cai em `trecho_nao_decidido`,
// que é como uma embarcadora nova avisa que chegou em vez de sumir em silêncio.
const chaveRegra = (empresa, trecho) => `${txt(empresa).toUpperCase()}||${txt(trecho).toUpperCase()}`;
export const mapaRegras = (regras) => {
  const m = new Map();
  (regras || []).forEach((r) => m.set(chaveRegra(r.empresa_emissao, r.trecho), !!r.ignorar));
  return m;
};

export function cruzarContratos(contratos, ctes, regras) {
  const mapa = regras instanceof Map ? regras : mapaRegras(regras);
  const porCte = new Map();
  // Um contrato pode virar MAIS DE UM CTe (duas entregas na mesma viagem: duas NFs, cidades
  // diferentes, mesmo manifesto). O relatório de contratos aponta só um deles em "CTe Ctrc",
  // e o TMS lança o contrato inteiro num CTe e zero no outro — por isso o casamento também
  // vai pelo Nº Contrato Frete do CTe, que reúne o grupo. Caso real: contrato 26833 = CTes
  // 34926 + 34927.
  const porContrato = new Map();
  (ctes || []).forEach((c) => {
    const emp = txt(c.empresa_cod).toUpperCase();
    const k = `${txt(c.ctrc)}||${emp}`;
    if (!porCte.has(k)) porCte.set(k, c);
    const nc = txt(c.numero_contrato);
    if (nc && nc !== "0") {
      const kc = `${emp}||${nc}`;
      if (!porContrato.has(kc)) porContrato.set(kc, []);
      porContrato.get(kc).push(c);
    }
  });

  return (contratos || []).map((ct) => {
    const empCte = txt(ct.cte_empresa || ct.empresa_emissao).toUpperCase();
    const cte = ct.cte_ctrc ? porCte.get(`${txt(ct.cte_ctrc)}||${empCte}`) : null;
    // Todos os CTes que dividem este contrato (inclui o apontado pelo relatório).
    const grupo = porContrato.get(`${empCte}||${txt(ct.contrato)}`) || (cte ? [cte] : []);
    const contratoNosCtes = grupo.reduce((s, c) => s + num(c.valor_contrato_frete), 0);
    const freteDosCtes = grupo.reduce((s, c) => s + num(c.total_frete), 0);
    const valor = num(ct.valor);
    const problemas = [];
    // Casou com CTe = é nossa operação, ponto: o cliente vem do CTe, seja Suzano ou qualquer
    // embarcadora futura. A regra de trecho só decide o que NÃO casou.
    const regra = mapa.get(chaveRegra(ct.empresa_emissao, ct.trecho));
    // Casou = achou o CTe apontado OU qualquer CTe do mesmo Nº Contrato Frete.
    const casou = !!cte || grupo.length > 0;
    const ignorado = !casou && regra === true;
    if (ignorado) {
      return { ...ct, cte: null, cliente: null, ignorado: true, problemas: [], falta_encargo: 0 };
    }

    // O encargo patronal é o que mais falta: no relatório de 01-06/08 estava em só 13 de 32.
    const faltas = ct.eh_pf && valor > 0 ? {
      pf_sem_custos_externos: falta(ct.custos_externos, esperado(valor, ALIQUOTAS.custosExternos)),
      pf_sem_inss: falta(ct.valor_inss, esperado(valor, ALIQUOTAS.inss)),
      pf_sem_sest: falta(ct.sest_senat, esperado(valor, ALIQUOTAS.sest)),
    } : { pf_sem_custos_externos: 0, pf_sem_inss: 0, pf_sem_sest: 0 };
    Object.entries(faltas).forEach(([k, v]) => { if (v > 0) problemas.push(k); });
    if (valor === 0) problemas.push("contrato_zerado");
    // O CTe entrou sem contrato (flag_sem_contrato, migration 052) mas o contrato existe aqui:
    // é o caso em que o cruzamento não só aponta como RESOLVE — o valor que falta está nesta linha.
    // Só é "CTe sem contrato" se NENHUM CTe do grupo recebeu o valor — com dois CTes, o TMS
    // lança tudo em um e zera o outro, e isso é o rateio normal, não lançamento faltando.
    // Se alguém já apontou este contrato no CTe à mão (contrato_ref, migration 058), o caso
    // deixa de ser "descobrir qual é" e vira "falta lançar no TMS pro valor entrar na margem".
    const vinculadoNoCte = grupo.some((c) => txt(c.contrato_ref) === txt(ct.contrato));
    if (grupo.length && valor > 0 && contratoNosCtes === 0) {
      problemas.push(vinculadoNoCte ? "cte_contrato_vinculado" : "cte_sem_contrato");
    }
    // Sem CTe: com regra "é nossa" (ignorar=false) o que falta é importar o relatório de CTes
    // daquele mês; sem regra nenhuma, ninguém decidiu ainda de quem é esse trecho.
    if (!casou) problemas.push(regra === false ? "sem_cte_na_base" : "trecho_nao_decidido");

    const cteRef = cte || grupo[0] || null;
    return {
      ...ct,
      cte: cteRef,
      // CTe que deveria receber o valor — é nele que a tela grava o vínculo (o do grupo que
      // está com contrato zerado; havendo só um, é ele mesmo).
      cte_alvo: grupo.find((c) => num(c.valor_contrato_frete) === 0) || cteRef,
      vinculado_no_cte: vinculadoNoCte,
      cliente: cteRef?.cliente || null,
      ignorado: false,
      // Grupo de CTes deste contrato — com 2+ é ele que tem a margem real.
      ctes_do_contrato: grupo.map((c) => c.ctrc),
      frete_dos_ctes: r2(freteDosCtes),
      contrato_nos_ctes: r2(contratoNosCtes),
      problemas,
      // Quanto de encargo de PF está faltando lançar nesta linha (0 quando está tudo certo).
      falta_encargo: r2(faltas.pf_sem_custos_externos + faltas.pf_sem_inss + faltas.pf_sem_sest),
    };
  });
}

// Resumo do cruzamento pra faixa de indicadores da tela. Contrato de trecho ignorado (não é
// nossa operação) fica FORA de todos os números — senão o "encargo faltando" contaria dinheiro
// de terceiro. Ele aparece só como contagem, pra ficar claro que o arquivo trazia mais.
export function resumoCruzamento(cruzados) {
  const nossos = cruzados.filter((c) => !c.ignorado);
  const out = {
    contratos: nossos.length,
    ignorados: cruzados.length - nossos.length,
    casaram: nossos.filter((c) => c.cte).length,
    pf: nossos.filter((c) => c.eh_pf).length,
    pj: nossos.filter((c) => !c.eh_pf).length,
    valorContratado: r2(nossos.reduce((s, c) => s + num(c.valor), 0)),
    encargoLancado: r2(nossos.reduce((s, c) => s + num(c.valor_inss) + num(c.sest_senat) + num(c.custos_externos), 0)),
    encargoFaltando: r2(nossos.reduce((s, c) => s + num(c.falta_encargo), 0)),
    porProblema: {},
  };
  Object.keys(PROBLEMA).forEach((k) => {
    out.porProblema[k] = nossos.filter((c) => c.problemas.includes(k)).length;
  });
  return out;
}

// Trechos que ninguém decidiu ainda, agrupados pra tela perguntar de uma vez só (26 contratos
// de MABCUC viram UMA pergunta, não 26).
export function trechosPendentes(cruzados) {
  const out = {};
  cruzados.filter((c) => c.problemas?.includes("trecho_nao_decidido")).forEach((c) => {
    const k = `${txt(c.empresa_emissao).toUpperCase()}||${txt(c.trecho).toUpperCase()}`;
    out[k] = out[k] || { empresa_emissao: txt(c.empresa_emissao).toUpperCase(), trecho: txt(c.trecho).toUpperCase(), contratos: 0, valor: 0, agregados: new Set() };
    out[k].contratos++;
    out[k].valor += num(c.valor);
    if (c.nome_agregado) out[k].agregados.add(c.nome_agregado);
  });
  return Object.values(out)
    .map((v) => ({ ...v, valor: r2(v.valor), agregados: [...v.agregados] }))
    .sort((a, b) => b.contratos - a.contratos);
}

// Candidatos a contrato de UM CTe que veio sem amarração (migration 058). Ordena pelos
// sinais que costumam bater — o TMS aponta o CTe no próprio contrato, e quando nem isso vem,
// placa/valor/data resolvem. É só sugestão: quem decide é quem revisa.
export function candidatosContratoDoCte(cte, contratos) {
  if (!cte) return [];
  const placa = txt(cte.placa).toUpperCase();
  const emp = txt(cte.empresa_cod).toUpperCase();
  const total = r2(num(cte.total_frete));
  const afinidade = (c) => (txt(c.cte_ctrc) === txt(cte.ctrc) ? 8 : 0)
    + (placa && txt(c.veiculo).toUpperCase() === placa ? 4 : 0)
    + (r2(num(c.valor_total_frete)) === total && total > 0 ? 2 : 0)
    + (c.data_emissao && c.data_emissao === cte.data_emissao ? 1 : 0);
  return (contratos || [])
    .filter((c) => txt(c.empresa_emissao).toUpperCase() === emp && afinidade(c) > 0)
    .map((c) => ({ ...c, _afinidade: afinidade(c) }))
    .sort((a, b) => b._afinidade - a._afinidade || String(a.contrato).localeCompare(String(b.contrato)));
}

// ── Regras de trecho (migration 056) ───────────────────────────────────────────
export async function listarRegrasTrecho(conn) {
  if (!_sessionToken) return [];
  return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/listar_regras_trecho",
    { p_token: _sessionToken }));
}

// ignorar = true (não é nossa) | false (é nossa) | null (apaga a regra e volta a perguntar).
export async function definirRegraTrecho(conn, empresa, trecho, ignorar, por) {
  if (!_sessionToken) throw new Error("Sessão expirada.");
  return await supaFetch(conn.url, conn.key, "POST", "rpc/definir_regra_trecho",
    { p_token: _sessionToken, p_empresa: empresa, p_trecho: trecho, p_ignorar: ignorar, p_por: por || null });
}
