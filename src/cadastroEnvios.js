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

// ── Situação de um CADASTRO diante do histórico ─────────────────────────────
// A pergunta NÃO é sobre a viagem: o mesmo motorista com o mesmo conjunto roda
// várias DTs e a embarcadora quer esse cadastro uma vez só. Já se ele troca uma
// peça, é cadastro novo mesmo tendo sido mandado antes.
//
// "igual"  esta assinatura (motorista + conjunto) já foi mandada
// "mudou"  o motorista já foi, mas com outro conjunto ou outro documento
// "novo"   nunca foi
export function indexarEnvios(envios = []) {
  const porAssinatura = new Map();
  const porMotorista = new Map();
  envios.forEach((e) => {
    porAssinatura.set(e.assinatura, e);
    if (!e.motorista_id) return;
    const atual = porMotorista.get(e.motorista_id);
    if (!atual || new Date(e.enviado_em) > new Date(atual.enviado_em)) porMotorista.set(e.motorista_id, e);
  });
  return { porAssinatura, porMotorista };
}

export function situacaoDoEnvio(indice, item) {
  const igual = indice?.porAssinatura?.get(item.assinatura);
  if (igual) return { estado: "igual", em: igual.enviado_em, por: igual.enviado_por };

  const doMotorista = item.motorista?.id ? indice?.porMotorista?.get(item.motorista.id) : null;
  if (doMotorista) return { estado: "mudou", em: doMotorista.enviado_em, por: doMotorista.enviado_por, antes: doMotorista.placas };

  return { estado: "novo" };
}
