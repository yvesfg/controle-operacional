// ─────────────────────────────────────────────────────────
//  Casca de compatibilidade — fallback da planilha Rodorrica.
//  Mantida para o front atual (/api/parse-rodorrica, { headers, sample }).
//  A lógica vive no gateway CENTRAL (yf-ai-gateway) + perfil "rodorrica".
//  Integrações novas devem usar /api/ai-extract com profile:"rodorrica".
// ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const { headers, sample } = req.body || {};
  if (!Array.isArray(headers) || headers.length === 0) {
    res.status(400).json({ error: "headers ausentes" });
    return;
  }
  const url = process.env.AI_HUB_URL || "https://yf-ai-gateway.vercel.app/api/extract";
  const hubToken = process.env.AI_HUB_TOKEN || "";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(hubToken ? { "x-ai-token": hubToken } : {}) },
      body: JSON.stringify({ profile: "rodorrica", headers, sample }),
    });
    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || "Falha ao mapear planilha" });
  }
}
