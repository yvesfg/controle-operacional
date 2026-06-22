// ─────────────────────────────────────────────────────────
//  ENDPOINT ÚNICO DO GATEWAY  POST /api/extract
//  Body: { profile, image?, mimeType?, headers?, sample? }
//  Resposta: JSON neutro do perfil.
// ─────────────────────────────────────────────────────────
import { extract } from "./_ai/engine.js";

export default async function handler(req, res) {
  // CORS — permite os domínios dos apps que consomem o gateway
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers["origin"] || "";
  if (allowed.length && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-ai-token");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido" }); return; }

  // Auth via token (obrigatório quando apps externos consumem o gateway)
  const token = process.env.AI_GATEWAY_TOKEN;
  if (token && req.headers["x-ai-token"] !== token) {
    res.status(401).json({ error: "Não autorizado" }); return;
  }

  try {
    const { profile, image, mimeType, headers, sample } = req.body || {};
    if (!profile) { res.status(400).json({ error: "profile ausente" }); return; }
    const data = await extract({ profile, image, mimeType, headers, sample });
    res.status(200).json(data);
  } catch (e) {
    const msg = e.message || "Falha ao processar";
    res.status(/ausente|desconhecido|não suportado/.test(msg) ? 400 : 500).json({ error: msg });
  }
}
