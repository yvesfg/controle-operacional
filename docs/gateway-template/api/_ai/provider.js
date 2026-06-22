// ─────────────────────────────────────────────────────────
//  PROVEDOR DE IA — única peça que muda ao trocar de IA.
//  Hoje: Google Gemini. Para trocar: implemente equivalente abaixo
//  e aponte AI_PROVIDER na Vercel.
// ─────────────────────────────────────────────────────────

const PROVIDER = process.env.AI_PROVIDER || "gemini";

export async function analyzeImage({ base64, mimeType, instruction }) {
  if (PROVIDER === "gemini") {
    return geminiGenerate([
      { text: instruction },
      { inline_data: { mime_type: mimeType, data: base64 } },
    ]);
  }
  throw new Error(`Provedor não suportado: ${PROVIDER}`);
}

export async function analyzeText({ instruction }) {
  if (PROVIDER === "gemini") {
    return geminiGenerate([{ text: instruction }]);
  }
  throw new Error(`Provedor não suportado: ${PROVIDER}`);
}

async function geminiGenerate(parts) {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI_API_KEY não configurada");
  const model = process.env.AI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try { return JSON.parse(text); }
  catch { throw new Error("Resposta da IA não veio em JSON válido"); }
}
