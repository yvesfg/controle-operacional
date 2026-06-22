// ─────────────────────────────────────────────────────────
//  MOTOR DO GATEWAY — orquestra perfil + provedor. Recebe um perfil e a
//  carga (imagem ou cabeçalhos+amostra), chama a IA e devolve o formato
//  neutro do perfil. Não conhece banco de dados nem HTTP.
// ─────────────────────────────────────────────────────────

import { analyzeImage, analyzeText } from "./provider.js";
import { PROFILES } from "./profiles.js";

export async function extract({ profile, image, mimeType, headers, sample }) {
  const p = PROFILES[profile];
  if (!p) throw new Error(`Perfil desconhecido: ${profile}`);

  if (p.kind === "image") {
    if (!image) throw new Error("image ausente");
    // Remove o prefixo data:...;base64, se vier embutido.
    const m = /^data:(.+?);base64,(.*)$/s.exec(image);
    const base64 = m ? m[2] : image;
    const mt = mimeType || (m ? m[1] : "image/jpeg");
    const raw = await analyzeImage({ base64, mimeType: mt, instruction: p.buildInstruction({}) });
    return p.normalize(raw, {});
  }

  if (p.kind === "table") {
    if (!Array.isArray(headers) || headers.length === 0) throw new Error("headers ausentes");
    const raw = await analyzeText({ instruction: p.buildInstruction({ headers, sample }) });
    return p.normalize(raw, { headers, sample });
  }

  throw new Error(`Tipo de perfil não suportado: ${p.kind}`);
}
