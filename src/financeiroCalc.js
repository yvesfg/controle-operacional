import { getPerfil } from "./operacao/perfil.js";

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
// Operação com complementarMargemZero (hoje AVB): repasse de serviço raro pago
// integralmente → soma nos dois lados, margem zero. Demais: o complementar é a diária
// recebida ~1 mês depois → soma só na receita, margem cheia. Qual regra vale vem do
// perfil da operação (operacao/perfil.js), não do id da base.
export function aplicarComplementar({ receita, custo, comp }, { incluirComp, baseId }) {
  let r = receita, c = custo;
  if (incluirComp) {
    if (getPerfil(baseId).financeiro.complementarMargemZero) { r += comp; c += comp; }
    else { r += comp; }
  }
  return { receita: r, custo: c, margem: r - c };
}

// ── Recorte por filial (bases com features.filialNasDespesas, hoje só imperatriz_belem) ──
// As duas pontas do P&L vêm marcadas de formas diferentes: a DESPESA traz a aba da planilha
// em `aba_origem` ('IMP'|'BELÉM') e a RECEITA traz a cidade da viagem em `origem`
// ('IMPERATRIZ-MA'|'BELEM-PA'). Isto casa as duas, e vive aqui porque PainelFinanceiro e
// Resultado precisam recortar igual — se cada tela tivesse sua cópia, o mesmo mês fecharia
// diferente em duas abas do mesmo app.
const normCidade = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
export const origemBate = (origem, filial) => {
  const o = normCidade(origem);
  if (filial === "IMP") return o.includes("IMPERATRIZ");
  if (filial === "BELÉM") return o.includes("BELEM");
  return true;
};
// Viagem sem `origem` preenchida não pertence a nenhuma filial e some dos dois recortes —
// por isso Imperatriz + Belém pode não fechar com o total. Quem usa avisa na tela.
export const semFilial = (r) => !String(r?.origem || "").trim();
