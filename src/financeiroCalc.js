// ── financeiroCalc.js ──
// Regra de margem operacional (Σ vl_cte − Σ vl_contrato) compartilhada entre
// PainelFinanceiro.jsx e Resultado.jsx — antes cada tela reimplementava o parsing e o
// tratamento do complementar (vl_cte_comp) de forma independente, com risco de divergir
// se a regra mudasse num lugar só. ConferenciaFrete.jsx NÃO usa isto: é fonte diferente
// (planilha bruta TMS/ERP), cálculo de margem próprio, intencionalmente separado.

// vl_cte/vl_cte_comp já vêm decimais.
export const nCte = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

// vl_contrato pode vir pt-BR (ponto=milhar, vírgula=decimal) ou já decimal (sem vírgula).
export const nContrato = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// Aplica a regra do complementar sobre um acumulado {receita,custo,comp} já somado.
// AVB (acailandia_avb): repasse de serviço raro pago integralmente → soma nos dois lados,
// margem zero. Demais bases (ex. Suzano/imperatriz_belem): complementar é a diária
// recebida ~1 mês depois → soma só na receita, margem cheia.
export function aplicarComplementar({ receita, custo, comp }, { incluirComp, baseId }) {
  let r = receita, c = custo;
  if (incluirComp) {
    if (baseId === "acailandia_avb") { r += comp; c += comp; }
    else { r += comp; }
  }
  return { receita: r, custo: c, margem: r - c };
}
