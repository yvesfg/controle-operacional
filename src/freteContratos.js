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

export async function listarContratosPorPeriodos(conn, periodos) {
  if (!_sessionToken) return [];
  return _rows(await supaFetch(conn.url, conn.key, "POST", "rpc/listar_contratos_periodos",
    { p_token: _sessionToken, p_periodos: periodos }));
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
  sem_cte_na_base: "Contrato sem o CTe importado",
};

export function cruzarContratos(contratos, ctes) {
  const porCte = new Map();
  (ctes || []).forEach((c) => {
    const k = `${txt(c.ctrc)}||${txt(c.empresa_cod).toUpperCase()}`;
    if (!porCte.has(k)) porCte.set(k, c);
  });

  return (contratos || []).map((ct) => {
    const cte = ct.cte_ctrc ? porCte.get(`${txt(ct.cte_ctrc)}||${txt(ct.cte_empresa).toUpperCase()}`) : null;
    const valor = num(ct.valor);
    const problemas = [];

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
    if (cte && valor > 0 && num(cte.valor_contrato_frete) === 0) problemas.push("cte_sem_contrato");
    if (!cte) problemas.push("sem_cte_na_base");

    return {
      ...ct,
      cte: cte || null,
      cliente: cte?.cliente || null,
      problemas,
      // Quanto de encargo de PF está faltando lançar nesta linha (0 quando está tudo certo).
      falta_encargo: r2(faltas.pf_sem_custos_externos + faltas.pf_sem_inss + faltas.pf_sem_sest),
    };
  });
}

// Resumo do cruzamento pra faixa de indicadores da tela.
export function resumoCruzamento(cruzados) {
  const out = {
    contratos: cruzados.length,
    casaram: cruzados.filter((c) => c.cte).length,
    pf: cruzados.filter((c) => c.eh_pf).length,
    pj: cruzados.filter((c) => !c.eh_pf).length,
    valorContratado: r2(cruzados.reduce((s, c) => s + num(c.valor), 0)),
    encargoLancado: r2(cruzados.reduce((s, c) => s + num(c.valor_inss) + num(c.sest_senat) + num(c.custos_externos), 0)),
    encargoFaltando: r2(cruzados.reduce((s, c) => s + num(c.falta_encargo), 0)),
    porProblema: {},
  };
  Object.keys(PROBLEMA).forEach((k) => {
    out.porProblema[k] = cruzados.filter((c) => c.problemas.includes(k)).length;
  });
  return out;
}
