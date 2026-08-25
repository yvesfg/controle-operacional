// ── cadastroEnvios.js ──
// Último envio de cada DT por embarcadora (tabela cadastro_envios, migration 072).
// Responde a uma pergunta só, mas é a que o analista faz toda semana: esta DT já
// foi mandada, e mudou desde então?
import { supaFetch } from "./supabase.js";

const TABELA = "cadastro_envios";

export async function listarEnvios(conn, embarcadora) {
  if (!conn?.url) return [];
  try {
    const filtro = embarcadora ? `embarcadora=eq.${encodeURIComponent(embarcadora)}&` : "";
    return (await supaFetch(conn.url, conn.key, "GET", `${TABELA}?${filtro}select=*`)) || [];
  } catch {
    // Sem histórico a tela ainda funciona: todo mundo aparece como "novo". Melhor
    // isso que travar a geração do arquivo por causa de um registro auxiliar.
    return [];
  }
}

// Upsert por (embarcadora, dt) — o POST do supaFetch já vai com
// resolution=merge-duplicates.
export function registrarEnvios(conn, linhas) {
  if (!conn?.url || !linhas?.length) return Promise.resolve([]);
  return supaFetch(conn.url, conn.key, "POST", TABELA, linhas);
}

// ── Situação de uma DT diante do último envio ───────────────────────────────
// "novo"       nunca foi mandada
// "igual"      já foi e nada mudou — reenviar só repete trabalho pra quem recebe
// "mudou"      já foi, mas o conjunto ou o documento mudou desde então
export function situacaoDoEnvio(envio, assinatura) {
  if (!envio) return { estado: "novo" };
  return {
    estado: envio.assinatura === assinatura ? "igual" : "mudou",
    em: envio.enviado_em,
    por: envio.enviado_por,
  };
}
