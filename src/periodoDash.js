// ── periodoDash.js ──
// Período do Dashboard. Antes existia só o <select> de mês, e "quanto rodamos até
// hoje contra o mesmo ponto do mês passado" não tinha resposta na tela: comparar
// 12 dias de agosto com 31 de julho dá sempre queda. Aqui o período vira um objeto
// só (mês, trimestre, ano ou intervalo livre) e dele sai a JANELA DE DIAS usada
// para recortar os meses anteriores no mesmo pedaço do calendário.
//
// Formas:
//   { tipo:"todos" }
//   { tipo:"mes",   mes:"08/2026" }
//   { tipo:"livre", inicio:"2026-08-01", fim:"2026-08-12", rotulo?:"3º tri 2026" }

const MES_NOME = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

export const PERIODO_TODOS = { tipo: "todos" };
export const periodoMes    = (mes) => ({ tipo: "mes", mes });
export const periodoLivre  = (inicio, fim, rotulo) => ({ tipo: "livre", inicio, fim, rotulo });

export const mesAtual = () =>
  String(new Date().getMonth() + 1).padStart(2, "0") + "/" + new Date().getFullYear();

// "YYYY-MM-DD" → Date local (sem UTC: `new Date("2026-08-01")` volta um dia no Brasil).
export const dISO  = (s) => {
  const p = String(s || "").slice(0, 10).split("-");
  return p.length === 3 && p[0].length === 4 ? new Date(+p[0], +p[1] - 1, +p[2]) : null;
};
export const isoDe = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function periodoTrimestre(ano, tri) {
  const m0 = (tri - 1) * 3;
  return periodoLivre(isoDe(new Date(ano, m0, 1)), isoDe(new Date(ano, m0 + 3, 0)), `${tri}º tri ${ano}`);
}
export function periodoAno(ano) {
  return periodoLivre(`${ano}-01-01`, `${ano}-12-31`, String(ano));
}

export function rotuloPeriodo(p) {
  if (!p || p.tipo === "todos") return "Todos";
  if (p.tipo === "mes") return p.mes;
  if (p.rotulo) return p.rotulo;
  const a = dISO(p.inicio), b = dISO(p.fim);
  if (!a || !b) return "Personalizado";
  const f = (d) => `${String(d.getDate()).padStart(2, "0")}/${MES_NOME[d.getMonth()]}`;
  return `${f(a)}–${f(b)}`;
}

// Data de referência do registro. `avb` liga a mesma cadeia de fallback que o
// agrupamento por mês usa naquela base (carr → homerico → manifesto).
export function dataRegistro(r, avb) {
  const dc = (avb ? (r?.data_carr || r?.data_homerico || r?.data_manifesto) : r?.data_carr) || "";
  const m1 = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(dc);
  if (m1) return { ano: +m1[3], mes: +m1[2], dia: +m1[1] };
  const m2 = /^(\d{4})-(\d{2})-(\d{2})/.exec(dc);
  if (m2) return { ano: +m2[1], mes: +m2[2], dia: +m2[3] };
  return null;
}

// Janela de dias do período — base do comparativo "mesmo período".
// Mês corrente vira 1..hoje de propósito: senão o mês em andamento sempre
// apareceria despencando contra os meses fechados.
// Devolve null quando não há recorte comparável (Todos, ou intervalo que cruza meses).
export function janelaDias(p, hoje = new Date()) {
  if (!p) return null;
  if (p.tipo === "mes") {
    const [mm, aa] = String(p.mes || "").split("/").map(Number);
    if (!mm || !aa) return null;
    const corrente = mm === hoje.getMonth() + 1 && aa === hoje.getFullYear();
    return { d1: 1, d2: corrente ? hoje.getDate() : 31, mesRef: p.mes, parcial: corrente };
  }
  if (p.tipo === "livre") {
    const a = dISO(p.inicio), b = dISO(p.fim);
    if (!a || !b) return null;
    if (a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth()) return null;
    return {
      d1: a.getDate(), d2: b.getDate(),
      mesRef: `${String(a.getMonth() + 1).padStart(2, "0")}/${a.getFullYear()}`,
      parcial: true,
    };
  }
  return null;
}

// "08/2026" menos n meses → "06/2026"
export function mesMenos(mes, n) {
  const [mm, aa] = String(mes || "").split("/").map(Number);
  if (!mm || !aa) return "";
  const d = new Date(aa, mm - 1 - n, 1);
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

// Rótulo curto do mês, para legenda do comparativo ("07/2026" → "jul").
export const mesCurto = (mes) => {
  const mm = Number(String(mes || "").split("/")[0]);
  return mm >= 1 && mm <= 12 ? MES_NOME[mm - 1] : String(mes || "");
};
