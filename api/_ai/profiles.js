// ─────────────────────────────────────────────────────────
//  PERFIS DE DOCUMENTO — descrevem COMO pedir à IA e COMO normalizar
//  a resposta num formato NEUTRO. Nada aqui conhece banco de dados:
//  cada app que consome o gateway traduz o resultado pro seu schema.
//
//  Adicionar um tipo de documento = adicionar um perfil aqui.
//  kind: "image" → recebe { } e usa a imagem; "table" → recebe { headers, sample }.
// ─────────────────────────────────────────────────────────

const TIPOS_NFD = ["avaria", "falta", "dev_total", "dev_parcial", "desacordo", "rod", "sobra"];

const CAMPOS_RODORRICA = {
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

export const PROFILES = {
  // ── Foto de NFD (Controle Operacional) ──
  nfd: {
    kind: "image",
    buildInstruction() {
      return `Você lê fotos de notas fiscais de devolução (NFD) e documentos de descarga no Brasil.
Analise a imagem e extraia os dados. Responda APENAS com um JSON neste formato exato:
{
  "numero": "<número da NFD/nota, somente dígitos, ou string vazia se não encontrar>",
  "valor": "<valor total em reais no formato 0,00, ou string vazia>",
  "tipo": "<um de: ${TIPOS_NFD.join(", ")} — ou string vazia se não der pra inferir com segurança>",
  "confianca": <número de 0 a 1 indicando o quão confiante você está na leitura>,
  "observacao": "<curta nota se algo estiver ilegível, ou string vazia>"
}
Não invente dados. Se um campo não estiver claramente legível, deixe vazio. Não adicione texto fora do JSON.`;
    },
    normalize(out) {
      const tipo = TIPOS_NFD.includes(out?.tipo) ? out.tipo : "";
      return {
        numero: String(out?.numero || "").trim(),
        valor: String(out?.valor || "").trim(),
        tipo,
        confianca: typeof out?.confianca === "number" ? out.confianca : null,
        observacao: String(out?.observacao || "").trim(),
      };
    },
  },

  // ── Mapeamento de cabeçalhos da planilha Rodorrica (fallback do parser) ──
  rodorrica: {
    kind: "table",
    buildInstruction({ headers, sample }) {
      return `Você recebe os cabeçalhos e algumas linhas de exemplo de uma planilha de fretes/descargas (Rodorrica) no Brasil.
Para cada CAMPO abaixo, identifique qual cabeçalho da planilha corresponde a ele (use o texto EXATO do cabeçalho), ou string vazia se nenhum corresponder:
${Object.entries(CAMPOS_RODORRICA).map(([k, d]) => `- "${k}": ${d}`).join("\n")}

Cabeçalhos disponíveis: ${JSON.stringify(headers)}
Linhas de exemplo: ${JSON.stringify(sample || []).slice(0, 4000)}

Responda APENAS um JSON usando exatamente os nomes de campo acima como chaves:
{ "DT CARREGAMENTO": "<cabeçalho exato ou string vazia>", ... }
Não invente cabeçalhos: cada valor deve ser exatamente um dos cabeçalhos disponíveis, ou string vazia.`;
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
};
