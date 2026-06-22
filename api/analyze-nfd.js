// ─────────────────────────────────────────────────────────
//  Função serverless (Vercel) — analisa a foto de uma NFD.
//  Recebe { imageBase64, mimeType }, chama o adaptador de IA e
//  devolve sugestões de campos. A IA SÓ SUGERE — o operador confirma.
// ─────────────────────────────────────────────────────────

import { analyzeImage } from "./_lib/aiProvider.js";

const TIPOS = ["avaria", "falta", "dev_total", "dev_parcial", "desacordo", "rod", "sobra"];

const INSTRUCTION = `Você lê fotos de notas fiscais de devolução (NFD) e documentos de descarga no Brasil.
Analise a imagem e extraia os dados. Responda APENAS com um JSON neste formato exato:
{
  "numero": "<número da NFD/nota, somente dígitos, ou string vazia se não encontrar>",
  "valor": "<valor total em reais no formato 0,00, ou string vazia>",
  "tipo": "<um de: ${TIPOS.join(", ")} — ou string vazia se não der pra inferir com segurança>",
  "confianca": <número de 0 a 1 indicando o quão confiante você está na leitura>,
  "observacao": "<curta nota se algo estiver ilegível, ou string vazia>"
}
Não invente dados. Se um campo não estiver claramente legível, deixe vazio. Não adicione texto fora do JSON.`;

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
    // Remove o prefixo data:...;base64, se vier embutido.
    const m = /^data:(.+?);base64,(.*)$/s.exec(imageBase64);
    const base64 = m ? m[2] : imageBase64;
    const mt = mimeType || (m ? m[1] : "image/jpeg");

    const out = await analyzeImage({ base64, mimeType: mt, instruction: INSTRUCTION });

    const tipo = TIPOS.includes(out?.tipo) ? out.tipo : "";
    res.status(200).json({
      numero: String(out?.numero || "").trim(),
      valor: String(out?.valor || "").trim(),
      tipo,
      confianca: typeof out?.confianca === "number" ? out.confianca : null,
      observacao: String(out?.observacao || "").trim(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Falha ao analisar documento" });
  }
}
