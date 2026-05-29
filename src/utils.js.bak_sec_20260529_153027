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
export function fmtMoeda(v) { const n = parseFloat(v); return !v || isNaN(n) ? "—" : "R$ "+n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
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
  try { const e = new TextEncoder().encode(s); const h = await crypto.subtle.digest("SHA-256",e); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join(""); } catch { return s; }
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

