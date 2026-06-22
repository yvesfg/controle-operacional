// ─────────────────────────────────────────────────────────
//  Parsing da planilha Rodorrica.
//  buildRodorricaRows: transforma linhas cruas (objetos keyed pelos
//    cabeçalhos da planilha) nas linhas normalizadas da Conferência.
//    Usado tanto pelo parser direto (App.jsx) quanto pelo fallback de IA.
//  rodorricaAIRemap: fallback — quando o parser direto acha 0 linhas
//    (cabeçalhos diferentes), pede à IA o mapeamento campo→cabeçalho e
//    renomeia as chaves para o formato canônico, sem transcrever valores.
// ─────────────────────────────────────────────────────────

const _xlsxDate = (v) => {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return String(v);
};

export function buildRodorricaRows(json) {
  return json.map((r) => ({
    dt:             String(r["DT CARREGAMENTO"] || "").replace(/\u00a0/g, "").trim(),
    nf:             String(r["NF CARREGAMENTO"] || "").replace(/\u00a0/g, "").trim(),
    transportadora: String(r["TRANSPORTADORA"] || "").trim(),
    tipo:           String(r["TIPO DO CUSTO"] || "").trim().toUpperCase(),
    valorAprovado:  parseFloat(String(r["VALOR APROVADO"] || "").replace(",", ".")) || 0,
    valorFinal:     parseFloat(String(r["VALOR FINAL"] || "").replace(",", ".")) || 0,
    dtCarregamento: _xlsxDate(r["DATA DE FATURAMENTO"] || r["DT CARREGAMENTO"] || ""),
    mesAno:         String(r["MÊS/ANO"] || r["MES/ANO"] || "").trim(),
    cliente:        String(r["NOME CLIENTE"] || "").trim(),
    centro:         String(r["Centro"] || r["CENTRO"] || "").trim(),
    qtFardos:       parseFloat(r["QT FARDOS"]) || 0,
    rsFardo:        parseFloat(r["R$/FARDO"]) || 0,
    rsStrech:       parseFloat(r["R$/STRECH"]) || 0,
    af:             String(r["AF"] || "").trim(),
    status:         String(r["Status"] || "").trim(),
    pagoOTM:        parseFloat(r["Pago OTM"]) || 0,
  })).filter((r) => r.dt && r.dt.length > 0 && r.dt !== "undefined" && /^\d{6,}$/.test(r.dt));
}

// Fallback de IA: recebe as linhas cruas, pede o mapeamento e devolve as
// mesmas linhas com as chaves renomeadas para o formato canônico.
export async function rodorricaAIRemap(json) {
  const headers = Object.keys(json[0] || {});
  if (!headers.length) return [];
  const sample = json.slice(0, 8);

  const r = await fetch("/api/parse-rodorrica", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headers, sample }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  const { mapping } = await r.json();
  if (!mapping || typeof mapping !== "object" || !Object.keys(mapping).length) {
    throw new Error("IA não conseguiu mapear os cabeçalhos");
  }

  return json.map((row) => {
    const out = {};
    for (const [canon, src] of Object.entries(mapping)) {
      if (src && src in row) out[canon] = row[src];
    }
    return out;
  });
}
