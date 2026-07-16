// ─────────────────────────────────────────────────────────
//  Casca de compatibilidade — analisa a foto de uma NFD.
//  Mantida para o front atual (/api/analyze-nfd, { imageBase64, mimeType }).
//  A lógica vive no gateway CENTRAL (yf-ai-gateway) + perfil "nfd".
//  Integrações novas devem usar /api/ai-extract com profile:"nfd".
// ─────────────────────────────────────────────────────────

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64 ausente" });
    return;
  }
  const url = process.env.AI_HUB_URL || "https://yf-ai-gateway.vercel.app/api/extract";
  const hubToken = process.env.AI_HUB_TOKEN || "";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(hubToken ? { "x-ai-token": hubToken } : {}) },
      body: JSON.stringify({ profile: "nfd", image: imageBase64, mimeType }),
    });
    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || "Falha ao analisar documento" });
  }
}
