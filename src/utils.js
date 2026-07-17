// ── utils.js — gerado automaticamente ──
import { ENV_SUPA_URL } from './constants.js';

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
export function parseData(d) {
  if (!d) return null;
  d = String(d).trim();
  // suporta "DD/MM/YYYY" e "DD/MM/YYYY HH:MM" (ignora a parte de hora para comparações de data)
  const m1 = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m1) return new Date(+m1[3], +m1[2]-1, +m1[1]);
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const p = d.split("-"); return new Date(+p[0], +p[1]-1, +p[2].slice(0,2)); }
  return null;
}
export function diffDias(d1, d2) { return d1 && d2 ? Math.round((d2-d1)/(864e5)) : null; }
// Parser de valor monetário tolerante a formato — a base tem strings em 3 pelagens
// diferentes, todas vindas do mesmo pipeline (Google Sheets → SyncSupabase.gs):
// 1) BR texto: "12.341,85" (célula formatada como texto/moeda na planilha)
// 2) "americano": "12341.85" ou "3702.5599999999995" — quando a célula do Sheets é um
//    NÚMERO de verdade (não texto), Apps Script devolve o valor via getValues() e
//    `.toString()` nele usa ponto decimal, sem separador de milhar (bug de origem,
//    corrigido no SyncSupabase.gs a partir de 2026-07-17, mas ~489 linhas antigas no
//    banco ainda estão assim — por isso o parser tem que reconhecer as duas formas).
// 3) inteiro puro: "15600" — ambíguo mas idêntico nas duas leituras, sem risco.
// Vírgula presente = decimal é a vírgula (regra BR), ponto(s) = milhar, sempre.
// Só ponto, sem vírgula = decimal é o próprio ponto (não mexe — já é o formato nativo
// do JS). Múltiplos pontos sem vírgula = milhar BR sem centavos ("1.234.567").
// Após montar a string normalizada, valida com regex — se sobrar lixo (célula quebrada
// tipo "#VALUE!" ou "13,045,90" com dupla vírgula), trata como sem valor em vez de
// adivinhar um número errado.
export function parseValorBR(v) {
  let s = String(v ?? "").trim();
  if (!s) return 0;
  s = s.replace(/^R\$\s*/i, "").trim();
  if (!s || s === "-") return 0;
  const temVirgula = s.includes(",");
  const pontos = (s.match(/\./g) || []).length;
  let normalizado = s;
  if (temVirgula) normalizado = s.replace(/\./g, "").replace(",", ".");
  else if (pontos > 1) normalizado = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return 0;
  const n = parseFloat(normalizado);
  return isNaN(n) ? 0 : n;
}
export function fmtMoeda(v) {
  if (!v) return "—"; // vazio/null/undefined — mesma regra de sempre
  const n = parseValorBR(v);
  if (n === 0 && !/^-?0([.,]0+)?$/.test(String(v).trim())) return "—"; // célula quebrada (ex.: "#VALUE!"), não é zero de verdade
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function brToInput(d) { if (!d) return ""; d = String(d).trim(); if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0,10); const m=d.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m?`${m[3]}-${m[2]}-${m[1]}`:""; }
export function inputToBr(v) { if (!v) return ""; const p = v.split("-"); return p.length===3 ? `${p[2].slice(0,2)}/${p[1]}/${p[0]}` : ""; }
// Helpers para campo datetime-local (data + hora)
export function brToInputDT(d) {
  if (!d) return "";
  d = String(d).trim();
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}`;
  const m2 = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}T00:00`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0,10)+"T00:00";
  return "";
}
export function inputToBrDT(v) {
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}`;
  const p = v.split("-");
  return p.length>=3 ? `${p[2].slice(0,2)}/${p[1]}/${p[0]}` : "";
}
export function dtBase(dt) { return dt ? dt.replace(/[.\-\/\s]/g,"") : ""; }
export function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
export async function hashSenha(s) {
  const e = new TextEncoder().encode(s); const h = await crypto.subtle.digest("SHA-256",e); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
export async function verificarSenha(plain, stored) {
  if (plain === stored) return true;
  try { return (await hashSenha(plain)) === stored; } catch { return false; }
}

export function loadJSON(key, def) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; } }
export function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Decodifica JWT sem biblioteca externa (para OAuth social) ──────────────
export function decodeJWT(token) {
  try {
    const base64 = token.split(".")[1];
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch { return null; }
}

// ── Inicia login OAuth via Supabase Auth REST (sem SDK externo) ───────────
export function iniciarOAuth(provider) {
  if (!ENV_SUPA_URL) { alert("Configure VITE_SUPABASE_URL no .env.local"); return; }
  const redirectTo = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href = `${ENV_SUPA_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
}

// Helper validação placa (Item 3)
export function validarPlaca(p) {
  if (!p) return false;
  const s = p.toUpperCase().replace(/[^A-Z0-9]/g,"");
  return /^[A-Z]{3}[0-9]{4}$/.test(s) || /^[A-Z]{3}[0-9][A-Z0-9][0-9]{3}$/.test(s);
}
export function normalizarPlaca(p) {
  if (!p) return "";
  return p.toUpperCase().replace(/[^A-Z0-9]/g,"");
}
export function normalizarTelefone(t) {
  if (!t) return "";
  const d = t.replace(/\D/g,"");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return t;
}
export function normalizarNome(n) {
  if (!n) return "";
  return n.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ── Acessibilidade: props para um elemento clicável que não é <button> ──────
// Uso: <div {...clickable(onClick)}>…</div> → role + foco por teclado + Enter/Espaço.
// Sem onClick (ex.: card não-navegável) retorna {} e o elemento não fica focável.
export function clickable(onClick) {
  if (!onClick) return {};
  return {
    onClick,
    role: "button",
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); }
    },
  };
}

