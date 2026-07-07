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

// CNPJ (só dígitos, 14 posições) -> regra do cliente.
// Cadastro de clientes: adicionar aqui = suportar cliente novo, sem mexer no resto.
export const CLIENTES = {
  "16404287022205": { nome: "Suzano Imperatriz", baseId: "imperatriz_belem", frete: "MAT", descLocal: "MAM", diaria: "D01" },
  "16404287069864": { nome: "Suzano Belem",       baseId: "imperatriz_belem", frete: "MAR", descLocal: "MRM", diaria: "D05" },
  "07636657000270": { nome: "AVB Acailandia",     baseId: "acailandia_avb",  frete: "MAT", descLocal: null,  diaria: null },
  "10481071000107": { nome: "Couro",              baseId: null,              frete: "MAT", descLocal: null,  diaria: null },
};

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "").padStart(14, "0");
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

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

// Lê o .xls/.xlsx bruto (1 aba, CNPJ Remetente único) e devolve as linhas já
// classificadas por categoria + flags. Não grava nada — isso é decisão de quem chama.
export function parseFreteXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 0, defval: null, raw: true });
        if (!json.length) return resolve({ cliente: null, linhas: [], naoClassificadas: [], erro: "Planilha vazia" });

        const cnpjs = [...new Set(json.map(r => soDigitos(r["CNPJ Remetente"])))];
        if (cnpjs.length !== 1) {
          return resolve({ cliente: null, linhas: [], naoClassificadas: [], erro: `Mais de um CNPJ Remetente no arquivo (${cnpjs.join(", ")}) — separe por cliente antes de importar.` });
        }
        const cli = CLIENTES[cnpjs[0]];
        if (!cli) {
          return resolve({ cliente: null, linhas: [], naoClassificadas: [], erro: `CNPJ ${cnpjs[0]} não está no cadastro de clientes conhecidos. Adicione em freteConferencia.js:CLIENTES antes de importar — não vou adivinhar.` });
        }

        const base = (r, categoria, empresaCod) => ({
          cliente: cli.nome,
          base_id: cli.baseId,
          cnpj_remetente: cnpjs[0],
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

        const linhas = [];
        const naoClassificadas = [];
        const usados = new Set([cli.frete, cli.descLocal, cli.diaria].filter(Boolean));

        json.forEach((r) => {
          const emp = String(r["Empresa"] ?? "").trim().toUpperCase();
          if (emp === cli.frete) {
            linhas.push(base(r, "frete", emp));
          } else if (cli.descLocal && emp === cli.descLocal) {
            const margem = num(r["Margem Lucro"]);
            linhas.push(base(r, margem === 0 ? "descarga" : "local", emp));
          } else if (cli.diaria && emp === cli.diaria) {
            linhas.push(base(r, "diaria", emp));
          } else {
            naoClassificadas.push(base(r, "nao_classificado", emp));
          }
        });

        // Flags de revisão
        const porChave = {};
        linhas.forEach((l) => { const k = chaveDuplicidade(l); (porChave[k] = porChave[k] || []).push(l); });

        linhas.forEach((l) => {
          // Diária: motorista é pago na hora (débito) e o CTe complementar só entra na
          // semana/mês seguinte — margem negativa aqui é o fluxo normal, não é alerta.
          l.flag_negativa = l.categoria !== "diaria" && l.margem_lucro < 0;
          l.flag_baixa = l.categoria !== "diaria" && l.margem_lucro >= 0 && l.margem_lucro < 10;
          l.flag_ambigua =
            (l.categoria === "descarga" || l.categoria === "local") &&
            ((l.margem_lucro > 0 && l.margem_lucro < 1) || (l.valor_contrato_frete === 0 && l.total_frete > 0));
          const grupo = porChave[chaveDuplicidade(l)];
          l.flag_duplicidade = grupo.length > 1;
          l.dup_grupo_chave = grupo.length > 1 ? chaveDuplicidade(l) : null;
        });

        // Período de referência: mês/ano predominante nas datas de emissão (fallback: mês corrente)
        const meses = linhas.map(l => l.data_emissao).filter(Boolean).map(d => d.slice(0, 7));
        const contagem = {};
        meses.forEach(m => { contagem[m] = (contagem[m] || 0) + 1; });
        const periodoRef = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0]
          || new Date().toISOString().slice(0, 7);
        linhas.forEach(l => { l.periodo_ref = periodoRef; });
        naoClassificadas.forEach(l => { l.periodo_ref = periodoRef; });

        resolve({ cliente: cli.nome, baseId: cli.baseId, periodoRef, linhas, naoClassificadas, erro: null });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Diff / import não-destrutivo (mesmo espírito de despesas.diffImport) ──
// Chave de dedupe = cliente+categoria+ctrc+periodo_ref (== constraint UNIQUE da tabela).
const chaveLinha = (l) => `${l.cliente}||${l.categoria}||${l.ctrc}||${l.periodo_ref}`;

export async function listarPorPeriodo(conn, periodoRef, cliente) {
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?periodo_ref=eq.${q(periodoRef)}`;
  if (cliente) path += `&cliente=eq.${q(cliente)}`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

export async function diffImportFrete(conn, periodoRef, cliente, linhas) {
  const existentes = await listarPorPeriodo(conn, periodoRef, cliente);
  const existKeys = new Set(existentes.map(chaveLinha));
  const novas = linhas.filter(l => !existKeys.has(chaveLinha(l)));
  return { novas, jaExistem: linhas.length - novas.length, existentesTotal: existentes.length };
}

export async function inserirFrete(conn, linhas) {
  if (!linhas.length) return [];
  return await supaFetch(conn.url, conn.key, "POST", TABELA, linhas);
}

export async function listarPendentesRevisao(conn, cliente) {
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?decisao_manual=is.null&or=(flag_negativa.eq.true,flag_baixa.eq.true,flag_ambigua.eq.true,flag_duplicidade.eq.true)&order=periodo_ref.desc,margem_lucro.asc`;
  if (cliente) path += `&cliente=eq.${q(cliente)}`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

export async function decidir(conn, id, decisao, obs) {
  const body = { decisao_manual: decisao, revisado_em: new Date().toISOString(), revisado_obs: obs || null, atualizado_em: new Date().toISOString() };
  const q = encodeURIComponent(id);
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${q}`, body);
  return Array.isArray(res) ? res[0] : res;
}

export async function excluirFrete(conn, id) {
  const q = encodeURIComponent(id);
  return await supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=eq.${q}`);
}

// ── Indicadores (dashboard) ──
export async function listarTodosPeriodo(conn, periodoRef) {
  const q = encodeURIComponent(periodoRef);
  return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?periodo_ref=eq.${q}`)) || [];
}

export function resumoPorCategoria(linhas) {
  const cats = ["frete", "descarga", "local", "diaria"];
  const out = {};
  cats.forEach((c) => {
    const sub = linhas.filter(l => l.categoria === c);
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
  linhas.forEach((l) => {
    out[l.cliente] = out[l.cliente] || { registros: 0, peso: 0, fretePeso: 0, saldo: 0, _margens: [] };
    out[l.cliente].registros++;
    out[l.cliente].peso += num(l.peso_nf);
    out[l.cliente].fretePeso += num(l.frete_peso);
    out[l.cliente].saldo += num(l.saldo);
    out[l.cliente]._margens.push(num(l.margem_lucro));
  });
  Object.values(out).forEach((d) => { d.margemMedia = d._margens.length ? d._margens.reduce((s, v) => s + v, 0) / d._margens.length : 0; delete d._margens; });
  return out;
}
