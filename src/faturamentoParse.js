// ── faturamentoParse.js ──
// Lê o bloco de faturamento que o analista digita/cola no WhatsApp e devolve os
// campos separados. É o CAMINHO INVERSO do card do WhatsApp: em vez de o app
// gerar o texto pra ser copiado, o texto vira dado de volta.
//
// Formato típico (a ordem é a que a equipe usa; os rótulos é que mandam):
//   DT: 1348169
//   CTE: 34978
//   MDF: 29735
//   MAT: 26884
//   NF: 360525, 360526
//   CLIENTE: SUZANO
//
// ID saiu do bloco em 12/08/2026: quem preenche agora é o contratante, então
// exigir aqui só criaria pendência falsa. Rótulo continua reconhecido, para
// avisar quem colar o formato antigo em vez de ignorar em silêncio.
//
// DATA MANIFESTO não vem no texto de propósito — quem preenche é a tela, com a
// data do lançamento (editável, pra quando o faturamento foi feito em outro dia).
//
// PRONTO PRA IA: o retorno é o contrato { campos, achados, avisos }. Trocar este
// parser por uma extração do yf-ai-gateway (perfil novo) é substituir a função
// que produz `campos` — a tela de conferência e a gravação não mudam.

// Campos do bloco, na ordem em que a equipe digita. `rotulos` são as variações
// aceitas já normalizadas (sem acento, minúsculas).
export const CAMPOS_FATURAMENTO = [
  { k: "dt",      l: "DT",      rotulos: ["dt", "dt espelho", "espelho"] },
  { k: "cte",     l: "CTE",     rotulos: ["cte", "ct-e", "ctrc"] },
  { k: "mdf",     l: "MDF",     rotulos: ["mdf", "mdfe", "mdf-e"] },
  { k: "mat",     l: "MAT",     rotulos: ["mat", "mar", "mat/mar", "contrato"] },
  { k: "nf",      l: "NF",      rotulos: ["nf", "nfs", "nota", "nota fiscal"] },
  { k: "cliente", l: "Cliente", rotulos: ["cliente", "tomador", "embarcadora", "embarcador"], texto: true },
];

// Rótulos que a equipe ainda pode colar mas que o app não grava mais.
const ROTULOS_IGNORADOS = {
  id: "ID não entra mais no bloco — quem preenche é o contratante",
  "id doc": "ID não entra mais no bloco — quem preenche é o contratante",
  "shipment id": "ID não entra mais no bloco — quem preenche é o contratante",
  "shipmente id": "ID não entra mais no bloco — quem preenche é o contratante",
};

// Preenchido pela tela, não pelo texto colado — mas aceito se alguém colar mesmo assim.
export const CAMPO_MANIFESTO = {
  k: "data_manifesto", l: "Data Manifesto",
  rotulos: ["dt manifesto", "data manifesto", "data do manifesto", "manifesto"],
};

const TODOS = [...CAMPOS_FATURAMENTO, CAMPO_MANIFESTO];

const norm = (s) => String(s || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim();

// "1348169", "1.348.169" e "DT 1348169" viram "1348169". NF fica como veio
// (pode ser "360525, 360526") — só limpa espaço sobrando.
const limpar = (valor, campo) => {
  const v = String(valor || "").trim().replace(/\s+/g, " ");
  if (campo === "nf") return v.replace(/\s*,\s*/g, ", ");
  // Cliente e data são texto de verdade (espaço, acento, barra) — não passam
  // pelo filtro que existe pra tirar lixo de número de documento.
  if (campo === "cliente" || campo === "data_manifesto") return v;
  return v.replace(/[^\dA-Za-z\-/]/g, "");
};

// dd/MM/yyyy é o formato que o Sheets manda e o app guarda. Aceita 2026-08-12 e
// dd/MM/yy pra não recusar o que a pessoa digitou.
export function paraDataBR(valor) {
  const s = String(valor || "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${ano}`;
  }
  return s;
}

export function dataDeHojeBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// texto → { campos, achados, avisos }
//   campos  = { dt, cte, mdf, mat, id_doc, nf, data_manifesto? } só com o que veio
//   achados = chaves na ordem em que apareceram (a tela usa pra mostrar o que leu)
//   avisos  = problemas que não impedem seguir (linha ignorada, rótulo repetido)
export function parseFaturamento(texto) {
  const campos = {};
  const achados = [];
  const avisos = [];
  const linhas = String(texto || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const semRotulo = [];

  for (const linha of linhas) {
    // "CTE: 34978" ou "CTE 34978" — separador é ':' ou o primeiro espaço.
    const sep = linha.indexOf(":");
    let rotulo = "", valor = "";
    if (sep > 0) {
      rotulo = norm(linha.slice(0, sep));
      valor  = linha.slice(sep + 1).trim();
    } else {
      const partes = linha.split(/\s+/);
      rotulo = norm(partes[0]);
      valor  = partes.slice(1).join(" ").trim();
    }

    if (ROTULOS_IGNORADOS[rotulo]) { avisos.push(ROTULOS_IGNORADOS[rotulo]); continue; }

    const campo = TODOS.find(c => c.rotulos.includes(rotulo));
    if (!campo || !valor) {
      if (/^[\d.\-/]+$/.test(linha)) semRotulo.push(linha);
      else if (sep > 0) avisos.push(`Linha ignorada: "${linha}"`);
      continue;
    }
    if (campos[campo.k]) { avisos.push(`${campo.l} apareceu mais de uma vez — usei o primeiro`); continue; }
    campos[campo.k] = campo.k === "data_manifesto" ? paraDataBR(valor) : limpar(valor, campo.k);
    achados.push(campo.k);
  }

  // Colagem só com números, sem rótulo nenhum: assume a ordem que a equipe usa.
  // Cliente fica de fora — é texto, só entra com rótulo.
  if (!achados.length && semRotulo.length) {
    const ordemNumerica = CAMPOS_FATURAMENTO.filter(c => !c.texto);
    semRotulo.slice(0, ordemNumerica.length).forEach((v, i) => {
      const campo = ordemNumerica[i];
      campos[campo.k] = limpar(v, campo.k);
      achados.push(campo.k);
    });
    avisos.push(`Texto sem rótulos — li na ordem ${ordemNumerica.map(c => c.l).join(", ")}. Confira antes de gravar.`);
  }

  return { campos, achados, avisos };
}

// O que uma DT precisa ter pra estar faturada. Mesma lista do bloco colado (menos
// o próprio DT) — é ela que alimenta o KPI "DTs sem faturamento" do dashboard.
export const CAMPOS_OBRIGATORIOS_FATURAMENTO = TODOS.filter(c => c.k !== "dt");

// Devolve os RÓTULOS que faltam nessa DT ([] = faturamento completo).
export function faltandoFaturamento(reg) {
  return CAMPOS_OBRIGATORIOS_FATURAMENTO
    .filter(c => !String(reg?.[c.k] ?? "").trim())
    .map(c => c.l);
}

// Compara o que foi lido com o registro que já está no app.
// estado: "preenche" (estava vazio) · "igual" · "conflito" (tem outro valor lá)
export function compararComRegistro(reg, campos) {
  return TODOS
    .filter(c => c.k !== "dt" && campos[c.k] !== undefined && campos[c.k] !== "")
    .map(c => {
      const atual = String(reg?.[c.k] ?? "").trim();
      const novo  = String(campos[c.k]).trim();
      const estado = !atual ? "preenche" : (atual === novo ? "igual" : "conflito");
      return { k: c.k, l: c.l, atual, novo, estado };
    });
}
