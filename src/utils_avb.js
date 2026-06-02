/**
 * utils_avb.js — Utilitários exclusivos do módulo AVB (Açailândia)
 * ESCOPO: importado apenas por views/componentes do contexto AVB.
 * Não altera comportamento global do app.
 */
import { parseData } from "./utils.js";

// ── Normalização ──────────────────────────────────────────────────────
export const normContratanteAvb = s =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim().replace(/\s+/g, " ");

// ── Financeiro ────────────────────────────────────────────────────────
export const parseMoedaAvb = v => {
  if (!v) return null;
  const s = String(v).trim();
  if (s === "-" || s === "R$ -" || s === "R$-" || s === "0" || s === "") return null;
  let clean = s.replace(/[R$\s]/g, "");
  if (clean.includes(",")) {
    // Formato brasileiro: pontos = milhar, vírgula = decimal
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  // Sem vírgula: já está em formato decimal inglês (ex: "2706.29") — não remove pontos
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
};

export const calcSaldoAvb = r => {
  const contrato = parseMoedaAvb(r.vl_contrato);
  const adt = parseMoedaAvb(r.adiant);
  if (contrato !== null && adt !== null) return contrato - adt;
  return parseMoedaAvb(r.saldo);
};

export const isCarregadoAvb = r =>
  (r.status || "").toUpperCase() !== "PENDENTE";

// ── Flags de inconsistência ───────────────────────────────────────────
const reData = /^\d{2}\/\d{2}\/\d{4}|^\d{4}-\d{2}-\d{2}/;

export const flagErroData = r => {
  const campos = [r.data_carr, r.data_homerico, r.data_liberacao, r.data_manifesto];
  return campos.some(d => d && !reData.test(String(d).trim()));
};

export const flagPendenciaDocumental = r =>
  !r.cte || !r.mdf || !r.nf;

export const flagPendenciaFinanceira = r => {
  const s = calcSaldoAvb(r);
  return s !== null && s > 0 && (r.status || "").toUpperCase() !== "PENDENTE";
};

export const flagRevisao = r => {
  const cod = String(r.codigo || "").trim();
  return !cod || cod === "0" || /^0+$/.test(cod);
};

// ── Agenda / logística ────────────────────────────────────────────────
// Tabela de distâncias Açailândia → destino (km). Replicada do SyncSupabase_AVB.gs.
export const DISTANCIAS_AVB = {
  "MANAUS-AM": 1800,  "MANAUS AM": 1800,
  "BELEM-PA":  870,   "BELEM PA":  870,  "BELÉM-PA": 870,
  "FORTALEZA-CE": 1200,
  "SAO PAULO-SP": 2800, "SÃO PAULO-SP": 2800,
  "BRASILIA-DF": 1600,  "BRASÍLIA-DF": 1600,
  "GOIANIA-GO": 1700,   "GOIÂNIA-GO": 1700,
  "CUIABA-MT": 2200,    "CUIABÁ-MT": 2200,
  "PORTO ALEGRE-RS": 3600,
  "RECIFE-PE": 1500,
  "SALVADOR-BA": 1800,
  "VITORIA-ES": 2900,   "VITÓRIA-ES": 2900,
  "RIO DE JANEIRO-RJ": 3000,
  "BELO HORIZONTE-MG": 2700,
  "PALMAS-TO": 900,
  "PORTO NACIONAL-TO": 950,
  "IMPERATRIZ-MA": 220,
  "SAO LUIS-MA": 650,   "SÃO LUÍS-MA": 650,
  "TERESINA-PI": 750,
  "MARABA-PA": 500,     "MARABÁ-PA": 500,
  "SANTAREM-PA": 1300,  "SANTARÉM-PA": 1300,
  "ALTAMIRA-PA": 1100,
  "PARAUAPEBAS-PA": 700,
  "TUCUMA-PA": 900,     "TUCUMÃ-PA": 900,
  "CONCEICAO DO ARAGUAIA-PA": 600,
  "REDENCAO-PA": 650,   "REDENÇÃO-PA": 650,
  "MARACACUME-MA": 300, "MARACAÇUMÉ-MA": 300,
};

const KM_DIA = 500;

export const calcAgendaAvb = (data_carr, destino) => {
  if (!data_carr || !destino) return null;
  const normDest = normContratanteAvb(destino);
  const dist = DISTANCIAS_AVB[normDest] ?? null;
  if (!dist) return null;
  const base = parseData(data_carr);
  if (!base) return null;
  const dias = Math.ceil(dist / KM_DIA);
  base.setDate(base.getDate() + dias);
  return { data: base, dias, dist };
};

// Formata data JS para DD/MM/YYYY
export const fmtDataAvb = d => {
  if (!d) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
