// ─────────────────────────────────────────────────────────
//  PERFIS DE DOCUMENTO — adicionar novo tipo = adicionar perfil aqui.
//  Cada perfil: { kind, buildInstruction, normalize }.
//  normalize() devolve SEMPRE um formato neutro — sem nada de banco.
// ─────────────────────────────────────────────────────────

const TIPOS_NFD = ["avaria", "falta", "dev_total", "dev_parcial", "desacordo", "rod", "sobra"];

const CAMPOS_RODORRICA = {
  "DT CARREGAMENTO": "número da DT / ordem de carregamento (só dígitos, 6+)",
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
  "R$/STRECH": "valor por stretch",
  "AF": "número da AF",
  "Status": "situação / status",
  "Pago OTM": "valor pago no OTM",
};

export const PROFILES = {
  // ── NFD (Controle Operacional) ──────────────────────────
  nfd: {
    kind: "image",
    buildInstruction() {
      return `Você lê fotos de notas fiscais de devolução (NFD) no Brasil.
Analise e responda APENAS JSON:
{ "numero": "<só dígitos ou vazio>", "valor": "<0,00 ou vazio>",
  "tipo": "<${TIPOS_NFD.join("|")} ou vazio>",
  "confianca": <0-1>, "observacao": "<vazio se ok>" }
Não invente dados. Não adicione texto fora do JSON.`;
    },
    normalize(out) {
      return {
        numero: String(out?.numero || "").trim(),
        valor: String(out?.valor || "").trim(),
        tipo: TIPOS_NFD.includes(out?.tipo) ? out.tipo : "",
        confianca: typeof out?.confianca === "number" ? out.confianca : null,
        observacao: String(out?.observacao || "").trim(),
      };
    },
  },

  // ── Rodorrica — mapeamento de cabeçalhos (Controle Operacional) ──
  rodorrica: {
    kind: "table",
    buildInstruction({ headers, sample }) {
      return `Planilha de fretes/descargas (Rodorrica) — Brasil.
Para cada CAMPO, informe o cabeçalho exato da planilha que corresponde, ou "":
${Object.entries(CAMPOS_RODORRICA).map(([k, d]) => `- "${k}": ${d}`).join("\n")}
Cabeçalhos disponíveis: ${JSON.stringify(headers)}
Exemplo: ${JSON.stringify(sample || []).slice(0, 3000)}
Responda APENAS JSON: { "DT CARREGAMENTO": "...", ... }
Só use valores que existam exatamente em cabeçalhos disponíveis.`;
    },
    normalize(out, { headers }) {
      const mapping = {};
      for (const campo of Object.keys(CAMPOS_RODORRICA)) {
        const v = out?.[campo];
        if (typeof v === "string" && headers.includes(v)) mapping[campo] = v;
      }
      return { mapping };
    },
  },

  // ── ADICIONE PERFIS PARA FROTA E YFFINANCE ABAIXO ──────
  // Exemplo de como ficaria um perfil de comprovante de pagamento:
  //
  // comprovante_pagamento: {
  //   kind: "image",
  //   buildInstruction() { return `...prompt...`; },
  //   normalize(out) { return { valor: ..., data: ..., banco: ... }; },
  // },
};
