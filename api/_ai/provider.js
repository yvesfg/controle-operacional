// ─────────────────────────────────────────────────────────
//  PROVEDOR DE IA — a ÚNICA peça que muda ao trocar de IA.
//  Hoje: Google Gemini. Para trocar (OpenAI, Claude, etc.), basta
//  implementar geminiGenerate equivalente e apontar AI_PROVIDER.
//  A chave fica SÓ no servidor (AI_API_KEY) — nunca vai pro front.
// ─────────────────────────────────────────────────────────

const PROVIDER = process.env.AI_PROVIDER || "gemini";

// Imagem (base64 sem prefixo) + instrução → objeto JSON.
export async function analyzeImage({ base64, mimeType, instruction }) {
  if (PROVIDER === "gemini") {
    return geminiGenerate([
      { text: instruction },
      { inline_data: { mime_type: mimeType, data: base64 } },
    ]);
  }
  throw new Error(`Provedor de IA não suportado: ${PROVIDER}`);
}

// Só texto (ex.: mapear cabeçalhos de planilha) → objeto JSON.
export async function analyzeText({ instruction }) {
  if (PROVIDER === "gemini") {
    return geminiGenerate([{ text: instruction }]);
  }
  throw new Error(`Provedor de IA não suportado: ${PROVIDER}`);
}

async function geminiGenerate(parts) {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI_API_KEY não configurada no servidor");
  const model = process.env.AI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body = {
    contents: [{ parts }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Gemini ${r.status}: ${txt.slice(0, 300)}`);
  }
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Resposta da IA não veio em JSON válido");
  }
}
