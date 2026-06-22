// ─────────────────────────────────────────────────────────
//  Casca de compatibilidade — fallback da planilha Rodorrica.
//  Mantida para o front atual (/api/parse-rodorrica, { headers, sample }).
//  A lógica vive no gateway: _ai/engine.js + perfil "rodorrica".
//  Integrações novas devem usar /api/ai-extract com profile:"rodorrica".
// ─────────────────────────────────────────────────────────

import { extract } from "./_ai/engine.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  try {
    const { headers, sample } = req.body || {};
    if (!Array.isArray(headers) || headers.length === 0) {
      res.status(400).json({ error: "headers ausentes" });
      return;
    }
    const data = await extract({ profile: "rodorrica", headers, sample });
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Falha ao mapear planilha" });
  }
}
