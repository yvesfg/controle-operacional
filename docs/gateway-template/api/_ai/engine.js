// Motor — orquestra perfil + provedor. Não conhece banco nem HTTP.
import { analyzeImage, analyzeText } from "./provider.js";
import { PROFILES } from "./profiles.js";

export async function extract({ profile, image, mimeType, headers, sample }) {
  const p = PROFILES[profile];
  if (!p) throw new Error(`Perfil desconhecido: ${profile}`);

  if (p.kind === "image") {
    if (!image) throw new Error("image ausente");
    const m = /^data:(.+?);base64,(.*)$/s.exec(image);
    const base64 = m ? m[2] : image;
    const mt = mimeType || (m ? m[1] : "image/jpeg");
    const raw = await analyzeImage({ base64, mimeType: mt, instruction: p.buildInstruction({}) });
    return p.normalize(raw, {});
  }

  if (p.kind === "table") {
    if (!Array.isArray(headers) || !headers.length) throw new Error("headers ausentes");
    const raw = await analyzeText({ instruction: p.buildInstruction({ headers, sample }) });
    return p.normalize(raw, { headers, sample });
  }

  throw new Error(`Tipo de perfil não suportado: ${p.kind}`);
}
