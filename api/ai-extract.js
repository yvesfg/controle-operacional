// ─────────────────────────────────────────────────────────
//  PROXY DE IA — encaminha para o gateway central yf-ai-gateway.
//  O browser chama /api/ai-extract sem nunca ver o token do hub;
//  o AI_HUB_TOKEN vive só aqui, na env do projeto na Vercel.
//
//  Antes este endpoint chamava o Gemini direto (_ai/engine.js local,
//  modelo gemini-2.0-flash — hoje SEM cota gratuita, sem fallback).
//  Migrado pro gateway central: OpenAI (gpt-5-mini) + Gemini pago como
//  reserva, retry/backoff, mesmos perfis (nfd/crlv/rodorrica já são
//  compatíveis — o gateway central retorna todos os campos que este
//  app já usa, mais alguns extras que podem ser ignorados).
//
//  Auth de entrada (browser→CO) opcional: se AI_GATEWAY_TOKEN estiver
//  setado, exige header "x-ai-token" igual. Sem a env, fica aberto —
//  útil em dev / mesmo domínio. Isso é INDEPENDENTE do AI_HUB_TOKEN,
//  que autentica CO→gateway central (server-to-server).
//
//  Envs (Vercel → Settings → Environment Variables):
//    AI_HUB_URL    (opcional) default https://yf-ai-gateway.vercel.app/api/extract
//    AI_HUB_TOKEN  deve bater com AI_TOKEN_CO do gateway central
// ─────────────────────────────────────────────────────────

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const token = process.env.AI_GATEWAY_TOKEN;
  if (token && req.headers["x-ai-token"] !== token) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  const url = process.env.AI_HUB_URL || "https://yf-ai-gateway.vercel.app/api/extract";
  const hubToken = process.env.AI_HUB_TOKEN || "";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(hubToken ? { "x-ai-token": hubToken } : {}) },
      body: JSON.stringify(req.body || {}),
    });
    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || "Falha ao falar com o gateway de IA" });
  }
}
