// ── despesas.js ──
// Parser da planilha mensal de despesas por filial + CRUD no Supabase (tabela despesas_filial).
// Reaproveita a lógica validada do dashboard standalone (analise-despesas).
import * as XLSX from "xlsx";
import { supaFetch } from "./supabase.js";

const TABELA = "despesas_filial";

const SECS = new Set([
  "DESPESAS C/ PESSOAL", "DESPESAS C/PESSOAL",
  "DESPESAS FIXAS", "DESPESAS VARIAVEIS", "ENCARGOS",
]);

const norm = (s) => (s || "").toUpperCase().replace(/\s+/g, " ").trim();
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Aba da planilha → base operacional + rótulo de origem
export function abaParaBase(nome) {
  const t = (nome || "").trim().toUpperCase();
  if (t.startsWith("AÇA") || t.startsWith("ACA")) return { base_id: "acailandia_avb", aba_origem: "AÇA" };
  if (t.startsWith("BEL")) return { base_id: "imperatriz_belem", aba_origem: "BELÉM" };
  if (t.startsWith("IMP")) return { base_id: "imperatriz_belem", aba_origem: "IMP" };
  return null; // aba desconhecida (ex.: Maracanaú) — ignorada
}

// SheetJS decodifica datas do Excel em UTC (cellDates: true) — usar getters locais
// aqui deslocava o dia (ex.: 01/03 virava 28/02 em UTC-3). Getters UTC evitam o desvio.
const dataISO = (d) => {
  if (d instanceof Date && !isNaN(d)) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  return null;
};

// Lê o arquivo .xlsx e devolve { rows, sheetsMeta }.
// rows: linhas de despesa com _sheetNome para filtragem posterior.
// sheetsMeta: por aba — { nome, recognized, base_id, aba_origem, baseLabel, rowCount, meses }
export function parseDespesasXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const rows = [];
        const sheetsMeta = [];
        const fileBase = (wb.SheetNames.length === 1) ? abaParaBase(file?.name) : null;
        wb.SheetNames.forEach((nome) => {
          const mapa = abaParaBase(nome) || fileBase;
          if (!mapa) {
            sheetsMeta.push({ nome, recognized: false, rowCount: 0, meses: [] });
            return;
          }
          const arr = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: null, raw: true });
          let grupo = "DESPESAS C/ PESSOAL";
          const sheetRows = [];
          arr.forEach((row) => {
            const a = row[0], val = row[2];
            const sa = (a == null ? "" : String(a)).trim();
            const saU = sa.toUpperCase();
            if (SECS.has(saU)) { grupo = saU.replace("C/PESSOAL", "C/ PESSOAL"); return; }
            if (saU.startsWith("TOTAL") || saU === "FILIAL") return;
            if (typeof val === "number") {
              const r = {
                _sheetNome: nome,
                base_id: mapa.base_id,
                aba_origem: mapa.aba_origem,
                grupo,
                dt_mov: dataISO(row[1]),
                valor: r2(val),
                nat_cod: row[3] != null ? String(row[3]) : null,
                natureza: row[4] != null ? String(row[4]).trim() : null,
                conta: row[5] != null ? String(row[5]).trim() : null,
                historico: row[6] != null ? String(row[6]).trim() : null,
                tipo: r2(val) < 0 ? "credito" : "debito",
                dup_flag: false,
              };
              sheetRows.push(r);
              rows.push(r);
            }
          });
          const mesSet = new Set();
          sheetRows.forEach(r => {
            if (r.dt_mov) { const p = r.dt_mov.split("-"); if (p.length >= 2) mesSet.add(`${p[1]}/${p[0]}`); }
          });
          sheetsMeta.push({
            nome,
            recognized: true,
            base_id: mapa.base_id,
            aba_origem: mapa.aba_origem,
            baseLabel: mapa.base_id === "acailandia_avb" ? "AVB" : "IMP/BEL",
            rowCount: sheetRows.length,
            meses: [...mesSet].sort(),
          });
        });
        const cont = {};
        rows.forEach((x) => { if (x.tipo !== "debito") return; const k = `${x.valor}||${norm(x.natureza)}||${norm(x.historico)}`; cont[k] = (cont[k] || 0) + 1; });
        rows.forEach((x) => { if (x.tipo !== "debito") return; const k = `${x.valor}||${norm(x.natureza)}||${norm(x.historico)}`; if (cont[k] > 1) x.dup_flag = true; });
        resolve({ rows, sheetsMeta });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── CRUD ──────────────────────────────────────────────────
const q = (s) => encodeURIComponent(s);

export async function listarDespesas(conn, baseId, mesRef) {
  const path = `${TABELA}?base_id=eq.${q(baseId)}&mes_ref=eq.${q(mesRef)}&order=grupo.asc,valor.desc`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

// Todas as despesas da base (todos os meses) — usado pelo Painel Financeiro p/ evolução.
export async function listarDespesasBase(conn, baseId) {
  const path = `${TABELA}?base_id=eq.${q(baseId)}&order=mes_ref.asc`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}

// Meses distintos com despesas registradas — leve (só coluna mes_ref).
export async function listarMesesComDespesas(conn, baseId) {
  const path = `${TABELA}?base_id=eq.${q(baseId)}&select=mes_ref&order=mes_ref.desc`;
  const rows = (await supaFetch(conn.url, conn.key, "GET", path)) || [];
  return [...new Set(rows.map((r) => r.mes_ref).filter(Boolean))].sort().reverse();
}

// Importação NÃO destrutiva: compara o arquivo com o que já existe (base+mês) e
// devolve apenas as linhas NOVAS, preservando as existentes (e suas flags).
// Casamento por conteúdo (data+valor+natureza+histórico+conta) com multiplicidade,
// para tratar linhas legitimamente repetidas (ex.: vários tickets de mesmo valor).
const r2num = (v) => Math.round((parseFloat(v) + Number.EPSILON) * 100) / 100;
const chaveLinha = (x) => `${x.dt_mov || ""}|${r2num(x.valor)}|${norm(x.natureza)}|${norm(x.historico)}|${norm(x.conta)}`;

export async function diffImport(conn, baseId, mesRef, linhas) {
  const existentes = await listarDespesas(conn, baseId, mesRef);
  const existCount = {};
  existentes.forEach((x) => { const k = chaveLinha(x); existCount[k] = (existCount[k] || 0) + 1; });
  const porChave = {};
  linhas.forEach((x) => { const k = chaveLinha(x); (porChave[k] = porChave[k] || []).push(x); });
  const novas = [];
  Object.keys(porChave).forEach((k) => {
    const ja = existCount[k] || 0;
    novas.push(...porChave[k].slice(ja)); // só o excedente além do que já existe
  });
  return { novas, jaExistem: linhas.length - novas.length, existentesTotal: existentes.length };
}

export async function inserirImportadas(conn, mesRef, linhas) {
  if (!linhas.length) return [];
  const payload = linhas.map((x) => ({ ...x, mes_ref: mesRef, origem: "import" }));
  return await supaFetch(conn.url, conn.key, "POST", TABELA, payload);
}

export async function inserirManual(conn, row) {
  const payload = [{ ...row, origem: "manual" }];
  const res = await supaFetch(conn.url, conn.key, "POST", TABELA, payload);
  return Array.isArray(res) ? res[0] : res;
}

export async function atualizarDespesa(conn, id, patch) {
  const body = { ...patch, atualizado_em: new Date().toISOString() };
  const res = await supaFetch(conn.url, conn.key, "PATCH", `${TABELA}?id=eq.${q(id)}`, body);
  return Array.isArray(res) ? res[0] : res;
}

export async function deletarDespesa(conn, id) {
  return await supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=eq.${q(id)}`);
}

export async function deletarImportadas(conn, ids) {
  if (!ids || ids.length === 0) return;
  return await supaFetch(conn.url, conn.key, "DELETE", `${TABELA}?id=in.(${ids.map(q).join(",")})`);
}

// ── Conciliação de despesas indevidas → crédito ──────────────
// Indevidas (débitos marcados) ainda sem crédito vinculado, de qualquer mês da base.
export async function listarIndevidasPendentes(conn, baseId) {
  const path = `${TABELA}?base_id=eq.${q(baseId)}&indevida=eq.true&credito_match_id=is.null&order=mes_ref.asc,valor.desc`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}
export async function vincularCredito(conn, indevidaId, creditoId) {
  return await atualizarDespesa(conn, indevidaId, { credito_match_id: creditoId, recuperado_em: new Date().toISOString() });
}
export async function desvincularCredito(conn, indevidaId) {
  return await atualizarDespesa(conn, indevidaId, { credito_match_id: null, recuperado_em: null });
}

// ── Créditos Pendentes (visão global de cobrança) ────────────
// Todas as indevidas sem crédito vinculado, de TODAS as filiais (sem filtro de base).
export async function listarIndevidasPendentesGlobal(conn) {
  const path = `${TABELA}?indevida=eq.true&credito_match_id=is.null&order=dt_mov.asc,valor.desc`;
  return (await supaFetch(conn.url, conn.key, "GET", path)) || [];
}
// Marca/registra que a indevida foi cobrada (data + observação). Não vincula crédito.
export async function marcarCobrado(conn, id, obs) {
  return await atualizarDespesa(conn, id, { cobrado_em: new Date().toISOString(), cobranca_obs: obs || null });
}
export async function desmarcarCobrado(conn, id) {
  return await atualizarDespesa(conn, id, { cobrado_em: null, cobranca_obs: null });
}
