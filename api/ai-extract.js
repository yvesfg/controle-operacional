// ─────────────────────────────────────────────────────────
//  ENDPOINT ÚNICO DO GATEWAY DE IA.
//  POST { profile, image?, mimeType?, headers?, sample? } → JSON neutro do perfil.
//  É este o endpoint que TODOS os apps (CO, Frota, YFFinance) chamam:
//  trocar de IA = mexer só em _ai/provider.js; novos documentos = _ai/profiles.js.
//
//  Auth opcional: se AI_GATEWAY_TOKEN estiver setado, exige header
//  "x-ai-token" igual. (Sem a env, fica aberto — útil em dev / mesmo domínio.)
// ─────────────────────────────────────────────────────────

import { extract } from "./_ai/engine.js";

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
  try {
    const { profile, image, mimeType, headers, sample } = req.body || {};
    if (!profile) {
      res.status(400).json({ error: "profile ausente" });
      return;
    }
    const data = await extract({ profile, image, mimeType, headers, sample });
    res.status(200).json(data);
  } catch (e) {
    const msg = e.message || "Falha ao processar";
    const code = /ausente|desconhecido|não suportado/.test(msg) ? 400 : 500;
    res.status(code).json({ error: msg });
  }
}
