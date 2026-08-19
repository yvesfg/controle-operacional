// ── conciliacao.js ──
// Compara o que a PLANILHA (Sheets → controle_operacional) diz com o que o TMS
// emitiu (frete_conferencia). Duas fontes que descrevem a mesma viagem e nunca
// eram confrontadas: dava pra ver o número final errado no Resultado, mas não
// QUEM preencheu errado.
//
// A chave é o número do CTe, só os dígitos: a planilha grava "34675" e o TMS
// "34675" ou com prefixo/zero à esquerda dependendo do arquivo.
//
// O VALOR comparado é `frete_peso`, não `total_frete` (decisão do Yves, 19/08):
// a planilha lança o frete SEM ICMS. Conferido em 07/2026 na imperatriz_belem:
// contra `total_frete` só 41 de 126 linhas batiam; contra `frete_peso`, 118.
// A razão média entre os dois campos é 1,1065 — exatamente o degrau do imposto.
//
// Tolerância de 5 centavos: os dois lados arredondam em pontos diferentes e uma
// diferença de centavo não é erro de ninguém.
import { nMoeda } from "./financeiroCalc.js";

export const TOLERANCIA = 0.05;

// Uma célula de CTe pode conter MAIS DE UM documento: a planilha real traz
// "34678, 34679" quando a carga saiu em dois CTes, e nesse caso a linha "-1"
// irmã costuma vir com o CTe em branco. Tratar a célula como um número só
// (era `replace(/\D/g,"")`) colava os dois em "3467834679" e a linha inteira
// virava falso positivo de "CTe não existe no TMS".
export const chavesCte = (v) =>
  String(v ?? "").split(/[^\d]+/).map((s) => s.replace(/^0+/, "")).filter(Boolean);

// Compatível com quem só precisa de um: primeira chave da célula.
export const chaveCte = (v) => chavesCte(v)[0] || "";

// "1008884-1" e "1008884" são a mesma DT: a segunda é a carga fatiada em outro CTe.
export const raizDt = (dt) => String(dt ?? "").replace(/-\d+$/, "");

// Mês da linha da planilha ("15/07/2026" → "2026-07"), no formato do periodo_ref.
export const mesDaLinha = (r) => {
  const s = String(r?.data_carr || "");
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br) return `${br[3]}-${br[2]}`;
  const iso = /^(\d{4})-(\d{2})/.exec(s);
  return iso ? `${iso[1]}-${iso[2]}` : "";
};

export const CLASSES = {
  sem_valor:   { label: "Sem valor na planilha", desc: "O TMS emitiu o CTe e a linha da planilha está com o valor em branco." },
  dt_fatiada:  { label: "DT fatiada com valor repetido", desc: "A carga virou dois CTes e a planilha repetiu o total da DT em cada linha — o faturamento conta em dobro." },
  valor_dif:   { label: "Valor diferente", desc: "Planilha e TMS discordam do valor do mesmo CTe." },
  sem_no_tms:  { label: "CTe não existe no TMS", desc: "A planilha aponta um número de CTe que não aparece no relatório do TMS deste período." },
  fora_planilha: { label: "CTe sem linha na planilha", desc: "O TMS emitiu, mas nenhuma linha da planilha aponta esse CTe no período." },
};

// linhasPlanilha: registros de DADOS (já recortados por base). linhasTms: linhas de
// frete_conferencia do período, já filtradas por base/categoria/ativo por quem chama.
export function conciliar(linhasPlanilha, linhasTms, mesRef) {
  const daPlanilha = (linhasPlanilha || []).filter((r) => mesDaLinha(r) === mesRef);

  // Um CTe pode aparecer em mais de uma linha do TMS (categorias diferentes); quem
  // chama já filtrou pra frete ativo, então aqui a primeira ocorrência basta.
  const tmsPorCte = new Map();
  (linhasTms || []).forEach((l) => {
    const k = chaveCte(l.ctrc);
    if (k && !tmsPorCte.has(k)) tmsPorCte.set(k, l);
  });

  // Agrupa as linhas da planilha por raiz de DT pra reconhecer a carga fatiada.
  const porRaiz = new Map();
  daPlanilha.forEach((r) => {
    const raiz = raizDt(r.dt);
    if (!porRaiz.has(raiz)) porRaiz.set(raiz, []);
    porRaiz.get(raiz).push(r);
  });

  const achados = [];
  const ctesVistos = new Set();

  // A comparação acontece no nível da DT, não da linha. Motivo achado no dado real:
  // a DT 1008664 saiu em dois CTes de R$ 14.972 cada e a planilha listou OS DOIS
  // números na primeira linha ("34678, 34679"), deixando a irmã "-1" sem CTe — com
  // o valor certo nas duas. Comparando linha a linha, a primeira pareceria dever
  // 29.944 e viraria falso positivo. Somando a DT inteira dos dois lados, ela fecha.
  porRaiz.forEach((linhas, raiz) => {
    const comValor = linhas.filter((r) => String(r.vl_cte ?? "").trim() !== "");
    const ksDaDt = [...new Set(linhas.flatMap((r) => chavesCte(r.cte)))];
    ksDaDt.forEach((k) => ctesVistos.add(k));
    if (!ksDaDt.length) return;                  // DT sem CTe: nada a conciliar aqui

    const tmsDaDt = ksDaDt.map((k) => tmsPorCte.get(k)).filter(Boolean);
    const faltando = ksDaDt.filter((k) => !tmsPorCte.has(k));
    const somaTms = tmsDaDt.reduce((s2, l) => s2 + Number(l.frete_peso || 0), 0);
    const somaPlan = comValor.reduce((s2, r) => s2 + nMoeda(r.vl_cte), 0);
    const base = { dt: raiz, ctes: ksDaDt.join(", "), trecho: tmsDaDt[0]?.trecho, linhas };

    if (!tmsDaDt.length) {
      achados.push({ ...base, classe: "sem_no_tms", planilha: somaPlan || null, tms: null, impacto: somaPlan });
      return;
    }
    if (!comValor.length) {
      achados.push({ ...base, classe: "sem_valor", planilha: null, tms: somaTms, impacto: somaTms });
      return;
    }
    if (Math.abs(somaPlan - somaTms) <= TOLERANCIA) return;   // fecha: nada a apontar

    // ── DT fatiada com o total repetido ────────────────────────────────────────
    // Reconhecida por aritmética: 2+ linhas da DT com o MESMO valor, e esse valor
    // igual à soma dos CTes no TMS — ou seja, lançaram o total em cada perna.
    const v0 = nMoeda(comValor[0].vl_cte);
    const iguais = comValor.length > 1 && comValor.every((r) => Math.abs(nMoeda(r.vl_cte) - v0) <= TOLERANCIA);
    if (iguais && v0 > 0 && tmsDaDt.length > 1 && Math.abs(v0 - somaTms) <= TOLERANCIA) {
      achados.push({ ...base, classe: "dt_fatiada", planilha: v0, tms: somaTms,
        impacto: v0 * (comValor.length - 1),   // o total foi contado uma vez por linha
        detalhe: tmsDaDt.map((l) => `CTe ${l.ctrc}: ${Number(l.frete_peso || 0)}`).join(" · ") });
      return;
    }

    achados.push({ ...base, classe: "valor_dif", planilha: somaPlan, tms: somaTms,
      impacto: somaPlan - somaTms,
      detalhe: [
        faltando.length ? `sem no TMS: ${faltando.join(", ")}` : "",
        linhas.length > 1 ? `${linhas.length} linhas na DT` : "",
      ].filter(Boolean).join(" · ") });
  });

  // ── O lado que a planilha não viu ──────────────────────────────────────────
  (linhasTms || []).forEach((l) => {
    const k = chaveCte(l.ctrc);
    if (!k || ctesVistos.has(k)) return;
    achados.push({ classe: "fora_planilha", dt: null, ctes: l.ctrc, planilha: null,
      tms: Number(l.frete_peso || 0), impacto: Number(l.frete_peso || 0), trecho: l.trecho, linhas: [] });
  });

  // ── Resumo ────────────────────────────────────────────────────────────────
  // Contado por DT, na mesma unidade em que a comparação acontece — senão o
  // "batem" da tela discordaria da lista logo abaixo dele.
  let dtsConferidas = 0, dtsBatendo = 0;
  porRaiz.forEach((linhas) => {
    const ks = [...new Set(linhas.flatMap((r) => chavesCte(r.cte)))];
    const tmsDaDt = ks.map((k) => tmsPorCte.get(k)).filter(Boolean);
    const comValor = linhas.filter((r) => String(r.vl_cte ?? "").trim() !== "");
    if (!tmsDaDt.length || !comValor.length) return;
    dtsConferidas += 1;
    const somaTms = tmsDaDt.reduce((s2, l) => s2 + Number(l.frete_peso || 0), 0);
    const somaPlan = comValor.reduce((s2, r) => s2 + nMoeda(r.vl_cte), 0);
    if (Math.abs(somaPlan - somaTms) <= TOLERANCIA) dtsBatendo += 1;
  });

  const porClasse = {};
  Object.keys(CLASSES).forEach((c) => { porClasse[c] = achados.filter((a) => a.classe === c); });

  return {
    achados: achados.sort((a, b) => Math.abs(b.impacto || 0) - Math.abs(a.impacto || 0)),
    porClasse,
    resumo: {
      planilhaNoMes: daPlanilha.length,
      tmsNoMes: (linhasTms || []).length,
      comparadas: dtsConferidas,
      batendo: dtsBatendo,
      totalPlanilha: daPlanilha.reduce((s, r) => s + nMoeda(r.vl_cte), 0),
      totalTms: (linhasTms || []).reduce((s, l) => s + Number(l.frete_peso || 0), 0),
    },
  };
}
