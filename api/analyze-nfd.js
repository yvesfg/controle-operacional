// ─────────────────────────────────────────────────────────
//  Casca de compatibilidade — analisa a foto de uma NFD.
//  Mantida para o front atual (/api/analyze-nfd, { imageBase64, mimeType }).
//  A lógica vive no gateway: _ai/engine.js + perfil "nfd".
//  Integrações novas devem usar /api/ai-extract com profile:"nfd".
// ─────────────────────────────────────────────────────────

import { extract } from "./_ai/engine.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 ausente" });
      return;
    }
    const data = await extract({ profile: "nfd", image: imageBase64, mimeType });
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Falha ao analisar documento" });
  }
}
