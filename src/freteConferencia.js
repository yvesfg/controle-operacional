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
          // Descarga: CTe e Contrato têm o mesmo valor por definição (margem 0) — recebido
          // via NFSe na semana/mês seguinte e conciliado depois; margem 0 não é alerta aqui.
          const margemFlexivel = l.categoria === "diaria" || l.categoria === "descarga";
          l.flag_negativa = !margemFlexivel && l.margem_lucro < 0;
          l.flag_baixa = !margemFlexivel && l.margem_lucro >= 0 && l.margem_lucro < 10;
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

// Itens sinalizados para correção manual (fora do fluxo do App) — ficam visíveis
// com data + observação até alguém corrigir/excluir a linha de origem; não voltam
// a alertar e já contam nos totais (listarTodosPeriodo ignora decisao_manual).
export async function listarSinalizados(conn, cliente) {
  const q = (s) => encodeURIComponent(s);
  let path = `${TABELA}?decisao_manual=eq.sinalizar_correcao&order=revisado_em.desc`;
  if (cliente) path += `&cliente=eq.${q(cliente)}`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

export async function decidir(conn, id, decisao, obs, revisadoPor) {
  const body = { decisao_manual: decisao, revisado_em: new Date().toISOString(), revisado_obs: obs || null, revisado_por: revisadoPor || null, atualizado_em: new Date().toISOString() };
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
  linhas.forEach((l) => {
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
export function gerarWorkbookXLSX(linhas, periodoRef) {
  const wb = XLSX.utils.book_new();
  const CAT_LABEL = { frete: "Frete", descarga: "Descarga", local: "Local", diaria: "Diária" };
  const COLS = ["Cliente", "CTRC", "Empresa", "Data Emissão", "Trecho", "NFS", "Placa", "Nome do Usuário",
    "Nº Manifesto", "Nº Contrato Frete", "Valor NF", "Peso NF", "Frete Peso", "Total do Frete",
    "Valor Contrato Frete", "Saldo", "Margem Lucro (%)"];

  const linhaArray = (l) => [
    l.cliente, l.ctrc, l.empresa_cod, l.data_emissao, l.trecho, l.nfs, l.placa, l.nome_usuario,
    l.numero_manifesto, l.numero_contrato, num(l.valor_nf), num(l.peso_nf), num(l.frete_peso),
    num(l.total_frete), num(l.valor_contrato_frete), num(l.saldo), r2(num(l.margem_lucro)),
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
  construirAba("descarga", "DESCARGAS");
  construirAba("diaria", "DIARIAS");
  construirAba("local", "LOCAL");

  // RESUMO: indicadores por cliente/categoria + margem real (amostragem só de Frete)
  const resumoAoa = [["Cliente", "Categoria", "Registros", "Peso (kg)", "Frete Peso (R$)", "Saldo (R$)", "Margem média (%)", "Obs"]];
  const clientes = [...new Set(linhas.map((l) => l.cliente))].sort();
  clientes.forEach((cli) => {
    ["frete", "descarga", "local", "diaria"].forEach((cat) => {
      const sub = linhas.filter((l) => l.cliente === cli && l.categoria === cat);
      if (!sub.length) return;
      const qtd = sub.length;
      const peso = sub.reduce((s, l) => s + num(l.peso_nf), 0);
      const fretePeso = sub.reduce((s, l) => s + num(l.frete_peso), 0);
      const saldo = sub.reduce((s, l) => s + num(l.saldo), 0);
      const margem = qtd ? sub.reduce((s, l) => s + num(l.margem_lucro), 0) / qtd : 0;
      const obs = cat === "descarga" ? "margem 0 por definição (CTe = Contrato)"
        : cat === "diaria" ? "margem negativa esperada (recebido via CTe complementar depois)" : "";
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

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoAoa);
  XLSX.utils.book_append_sheet(wb, wsResumo, "RESUMO");
  wb.SheetNames.unshift(wb.SheetNames.pop()); // RESUMO primeiro

  XLSX.writeFile(wb, `Conferencia_Faturamento_${periodoRef}.xlsx`);
}
