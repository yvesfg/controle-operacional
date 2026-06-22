// ─────────────────────────────────────────────────────────
//  Função serverless (Vercel) — fallback de IA para a planilha Rodorrica.
//  O parser determinístico (App.jsx) casa cabeçalhos exatos. Quando a
//  planilha vem com nomes diferentes e ele acha 0 linhas, este endpoint
//  recebe os cabeçalhos + linhas de exemplo e devolve o MAPEAMENTO
//  (campo canônico → cabeçalho real). O front re-mapeia tudo localmente.
//  A IA só resolve a ambiguidade de nomes; não transcreve as linhas.
// ─────────────────────────────────────────────────────────

import { analyzeText } from "./_lib/aiProvider.js";

// Campos canônicos que o parser determinístico espera, com descrição.
const CAMPOS = {
  "DT CARREGAMENTO": "número da DT / ordem de carregamento (só dígitos, 6 ou mais)",
  "NF CARREGAMENTO": "número da nota fiscal de carregamento",
  "TRANSPORTADORA": "nome da transportadora",
  "TIPO DO CUSTO": "tipo do custo (descarga, stretch, etc.)",
  "VALOR APROVADO": "valor aprovado em R$",
  "VALOR FINAL": "valor final em R$",
  "DATA DE FATURAMENTO": "data de faturamento",
  "MÊS/ANO": "competência mês/ano",
  "NOME CLIENTE": "nome do cliente",
  "Centro": "centro / unidade",
  "QT FARDOS": "quantidade de fardos",
  "R$/FARDO": "valor por fardo",
  "R$/STRECH": "valor por stretch (esticador)",
  "AF": "número da AF",
  "Status": "situação / status do registro",
  "Pago OTM": "valor pago no OTM",
};

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

    const instruction = `Você recebe os cabeçalhos e algumas linhas de exemplo de uma planilha de fretes/descargas (Rodorrica) no Brasil.
Para cada CAMPO abaixo, identifique qual cabeçalho da planilha corresponde a ele (use o texto EXATO do cabeçalho), ou string vazia se nenhum corresponder:
${Object.entries(CAMPOS).map(([k, d]) => `- "${k}": ${d}`).join("\n")}

Cabeçalhos disponíveis: ${JSON.stringify(headers)}
Linhas de exemplo: ${JSON.stringify(sample || []).slice(0, 4000)}

Responda APENAS um JSON usando exatamente os nomes de campo acima como chaves:
{ "DT CARREGAMENTO": "<cabeçalho exato ou string vazia>", ... }
Não invente cabeçalhos: cada valor deve ser exatamente um dos cabeçalhos disponíveis, ou string vazia.`;

    const out = await analyzeText({ instruction });

    // Sanitiza: só mantém campos cujo valor é um cabeçalho real da planilha.
    const mapping = {};
    for (const campo of Object.keys(CAMPOS)) {
      const v = out?.[campo];
      if (typeof v === "string" && headers.includes(v)) mapping[campo] = v;
    }

    res.status(200).json({ mapping });
  } catch (e) {
    res.status(500).json({ error: e.message || "Falha ao mapear planilha" });
  }
}
