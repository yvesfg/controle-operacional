import { getPerfil } from "./operacao/perfil.js";

// ── financeiroCalc.js ──
// Regra de margem operacional (Σ vl_cte − Σ vl_contrato) compartilhada entre
// PainelFinanceiro.jsx e Resultado.jsx — antes cada tela reimplementava o parsing e o
// tratamento do complementar (vl_cte_comp) de forma independente, com risco de divergir
// se a regra mudasse num lugar só. ConferenciaFrete.jsx NÃO usa isto: é fonte diferente
// (planilha bruta TMS/ERP), cálculo de margem próprio, intencionalmente separado.

// Parser único de dinheiro. Aceita pt-BR ("11.429,48" — ponto=milhar, vírgula=decimal),
// decimal cru ("2101.06"), número, vazio e null.
//
// BUG DE PRODUÇÃO (achado pelo Yves em 06/08/2026, Resultado de Imperatriz 07/2026):
// `nCte` era só `parseFloat(v)`, apostando que vl_cte "já vem decimal". Isso vale na AVB,
// mas NÃO na imperatriz_belem, cujo sync grava pt-BR — e parseFloat("11.429,48") devolve
// 11.429, cortando na vírgula e lendo o ponto de milhar como decimal. Efeito: o
// faturamento saía dividido por ~1000 (R$ 1.285,35 em vez de R$ 1.285.390,67), enquanto o
// Pago motorista vinha certo (usava nContrato, que já tratava pt-BR) — daí a margem
// gigantesca e negativa. Atingia Resultado, Painel Financeiro e Resumo.
// Verificado nas 1176 linhas da tabela: 964 pt-BR, 30 com ponto sem vírgula (todas decimais
// reais, ex.: "2101.06"), 112 só dígitos, 70 vazias — a regra abaixo cobre as quatro.
export const nMoeda = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// Nomes mantidos porque dizem de qual coluna vem cada valor; o parsing é o mesmo.
export const nCte = nMoeda;
export const nContrato = nMoeda;

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
