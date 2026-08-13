// ── faturamentoParse.js ──
// Lê os blocos que a equipe já digita no WhatsApp e devolve os campos separados.
// É o CAMINHO INVERSO dos cards: em vez de o app gerar o texto pra ser copiado,
// o texto vira dado de volta.
//
// Dois blocos, mesma mecânica (BLOCOS abaixo):
//
//   FATURAMENTO                    CONTRATAÇÃO
//   DT: 1348169                    DT: 1348169
//   CTE: 34978                     ID: 8678252
//   MDF: 29735                     NOME: CARLOS HENRIQUE
//   MAT: 26884                     CPF: 212.975.958-07
//   NF: 360525, 360526             TELEFONE: 94 9979-5640
//   CLIENTE: SUZANO                PLACAS: KEW9943 / KQW5I51
//                                  DESTINO: BRASILIA-DF
//                                  CARREGAR: 07/08/2026
//                                  AG DESCARGA: 12/08/2026
//                                  VLR EMPRESA: 12.342,47
//                                  VLR MOT: 10.762,58
//                                  ADT: 7.533,80
//
// ID mudou de bloco em 12/08/2026: quem preenche é o contratante, então saiu do
// faturamento e entrou na contratação.
// DATA MANIFESTO não vem em nenhum texto — quem preenche é a tela, com a data do
// lançamento (editável, pra quando o faturamento foi feito em outro dia).
//
// PRONTO PRA IA: o retorno é o contrato { campos, achados, avisos }. Trocar este
// parser por uma extração do yf-ai-gateway (perfil novo) é substituir a função
// que produz `campos` — a tela de conferência e a gravação não mudam.

// tipo: "num" (padrão, limpa lixo de número de documento) · "texto" (mantém
// espaço/acento/pontuação) · "data" (normaliza pra dd/MM/yyyy) · "moeda" (tira
// R$ e mantém o formato como veio) · "placas" (quebra em placa/placa2/placa3).
const F = {
  dt:          { k: "dt",           l: "DT",           rotulos: ["dt", "dt espelho", "espelho"] },
  cte:         { k: "cte",          l: "CTE",          rotulos: ["cte", "ct-e", "ctrc"] },
  mdf:         { k: "mdf",          l: "MDF",          rotulos: ["mdf", "mdfe", "mdf-e"] },
  mat:         { k: "mat",          l: "MAT",          rotulos: ["mat", "mar", "mat/mar", "contrato"] },
  nf:          { k: "nf",           l: "NF",           rotulos: ["nf", "nfs", "nota", "nota fiscal"], tipo: "nf" },
  cliente:     { k: "cliente",      l: "Cliente",      rotulos: ["cliente", "tomador", "embarcadora", "embarcador"], tipo: "texto" },
  id_doc:      { k: "id_doc",       l: "ID",           rotulos: ["id", "id doc", "shipment id", "shipmente id"] },
  nome:        { k: "nome",         l: "Motorista",    rotulos: ["nome", "motorista", "mot"], tipo: "texto" },
  cpf:         { k: "cpf",          l: "CPF",          rotulos: ["cpf"], tipo: "texto" },
  telefone:    { k: "telefone",     l: "Telefone",     rotulos: ["telefone", "tel", "fone", "celular", "whatsapp"], tipo: "texto" },
  placas:      { k: "placa",        l: "Placas",       rotulos: ["placas", "placa", "placa 01", "placa01"], tipo: "placas" },
  destino:     { k: "destino",      l: "Destino",      rotulos: ["destino"], tipo: "texto" },
  data_carr:   { k: "data_carr",    l: "Carregar",     rotulos: ["carregar", "data carregamento", "data carr", "carregamento"], tipo: "data" },
  data_agenda: { k: "data_agenda",  l: "Ag. Descarga", rotulos: ["ag descarga", "ag. descarga", "agenda", "data agenda", "agendamento"], tipo: "data" },
  vl_cte:      { k: "vl_cte",       l: "Vlr Empresa",  rotulos: ["vlr empresa", "valor empresa", "vl cte", "valor cte"], tipo: "moeda" },
  vl_contrato: { k: "vl_contrato",  l: "Vlr Mot",      rotulos: ["vlr mot", "valor mot", "vlr motorista", "vl contrato", "valor contrato"], tipo: "moeda" },
  adiant:      { k: "adiant",       l: "ADT",          rotulos: ["adt", "adiantamento", "adiant"], tipo: "moeda" },
};

// Preenchido pela tela, não pelo texto — mas aceito se alguém colar mesmo assim.
export const CAMPO_MANIFESTO = {
  k: "data_manifesto", l: "Data Manifesto", tipo: "data",
  rotulos: ["dt manifesto", "data manifesto", "data do manifesto", "manifesto"],
};

export const BLOCOS = {
  faturamento: {
    l: "Faturamento",
    sub: "DT · CTE · MDF · MAT · NF · CLIENTE",
    campos: [F.dt, F.cte, F.mdf, F.mat, F.nf, F.cliente],
    // A tela pergunta a data do manifesto neste modo.
    perguntaManifesto: true,
    exemplo: "DT: 1348169\nCTE: 34978\nMDF: 29735\nMAT: 26884\nNF: 360525, 360526\nCLIENTE: SUZANO",
  },
  contratacao: {
    l: "Contratação",
    sub: "DT · ID · motorista · placas · datas · valores",
    campos: [F.dt, F.id_doc, F.nome, F.cpf, F.telefone, F.placas, F.destino, F.data_carr, F.data_agenda, F.vl_cte, F.vl_contrato, F.adiant],
    perguntaManifesto: false,
    exemplo: "DT: 1348169\nID: 8678252\nNOME: CARLOS HENRIQUE\nCPF: 212.975.958-07\nTELEFONE: 94 9979-5640\nPLACAS: KEW9943 / KQW5I51\nDESTINO: BRASILIA-DF\nCARREGAR: 07/08/2026\nAG DESCARGA: 12/08/2026\nVLR EMPRESA: 12.342,47\nVLR MOT: 10.762,58\nADT: 7.533,80",
  },
};

export const MODO_PADRAO = "faturamento";

const norm = (s) => String(s || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim();

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

// O valor NÃO é reformatado: o app guarda moeda como texto e o formato varia por
// base (ver financeiroCalc/nMoeda). Reescrever aqui seria inventar um número.
const limparMoeda = (v) => String(v || "").replace(/R\$/gi, "").trim();

const limpar = (valor, tipo) => {
  const v = String(valor || "").trim().replace(/\s+/g, " ");
  if (tipo === "nf")    return v.replace(/\s*,\s*/g, ", ");
  if (tipo === "texto") return v;
  if (tipo === "data")  return paraDataBR(v);
  if (tipo === "moeda") return limparMoeda(v);
  return v.replace(/[^\dA-Za-z\-/]/g, "");
};

// "KEW9943 / KQW5I51" → { placa, placa2, placa3 }
const quebrarPlacas = (valor) => {
  const partes = String(valor || "").split(/[/,;]+/).map(p => p.trim().toUpperCase()).filter(Boolean);
  const out = {};
  if (partes[0]) out.placa  = partes[0];
  if (partes[1]) out.placa2 = partes[1];
  if (partes[2]) out.placa3 = partes[2];
  return out;
};

const escapaRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// O card que o app gera põe dois campos na mesma linha ("DT: 123    DESTINO: X").
// Fatia a linha sempre que um rótulo conhecido aparece seguido de ':' no meio dela.
function fatiarLinha(linha, campos) {
  const rotulos = campos.flatMap(c => c.rotulos).sort((a, b) => b.length - a.length).map(escapaRegex).join("|");
  const re = new RegExp(`(?:^|\\s)(?:${rotulos})\\s*:`, "gi");
  const cortes = [];
  let m;
  while ((m = re.exec(linha)) !== null) {
    cortes.push(m.index === 0 ? 0 : m.index + (/^\s/.test(m[0]) ? 1 : 0));
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  if (cortes.length < 2) return [linha];
  return cortes.map((ini, i) => linha.slice(ini, cortes[i + 1] ?? linha.length).trim()).filter(Boolean);
}

// Quebra a linha em rótulo + valor. Separador é ':' ou o primeiro espaço.
// Rótulos de duas palavras ("AG DESCARGA 12/08") também casam.
function separar(linha, campos) {
  const sep = linha.indexOf(":");
  if (sep > 0) return { rotulo: norm(linha.slice(0, sep)), valor: linha.slice(sep + 1).trim() };
  const partes = linha.split(/\s+/);
  for (let n = Math.min(3, partes.length - 1); n >= 1; n--) {
    const tentativa = norm(partes.slice(0, n).join(" "));
    if (campos.some(c => c.rotulos.includes(tentativa))) {
      return { rotulo: tentativa, valor: partes.slice(n).join(" ").trim() };
    }
  }
  return { rotulo: norm(partes[0]), valor: partes.slice(1).join(" ").trim() };
}

// Qual bloco é esse texto? Conta quantos rótulos de cada um aparecem.
// Empate ou nada reconhecido devolve null — a tela decide o que fazer.
export function detectarModo(texto) {
  const placar = Object.entries(BLOCOS).map(([modo, def]) => {
    const exclusivos = def.campos.filter(c => c.k !== "dt");
    const { achados } = parseBloco(texto, modo);
    return { modo, pontos: achados.filter(k => exclusivos.some(c => c.k === k || (c.tipo === "placas" && k.startsWith("placa")))).length };
  }).sort((a, b) => b.pontos - a.pontos);
  if (!placar[0].pontos) return null;
  if (placar[0].pontos === placar[1]?.pontos) return null;
  return placar[0].modo;
}

// texto → { campos, achados, avisos }
//   campos  = só o que veio no texto, já com o nome da coluna do banco
//   achados = chaves na ordem em que apareceram
//   avisos  = problemas que não impedem seguir (linha ignorada, rótulo repetido)
export function parseBloco(texto, modo = MODO_PADRAO) {
  const def = BLOCOS[modo] || BLOCOS[MODO_PADRAO];
  const conhecidos = [...def.campos, CAMPO_MANIFESTO];
  const campos = {};
  const achados = [];
  const avisos = [];
  const semRotulo = [];

  const linhas = String(texto || "").split(/\r?\n/)
    .map(l => l.trim()).filter(Boolean)
    .flatMap(l => fatiarLinha(l, conhecidos));

  for (const linha of linhas) {
    const { rotulo, valor } = separar(linha, conhecidos);

    // Rótulo que existe no OUTRO bloco: avisa em vez de descartar calado.
    const campo = conhecidos.find(c => c.rotulos.includes(rotulo));
    if (!campo) {
      const outro = Object.entries(BLOCOS).find(([m, d]) => m !== modo && d.campos.some(c => c.rotulos.includes(rotulo)));
      if (outro) avisos.push(`"${linha.slice(0, 28)}" é campo de ${outro[1].l} — ignorado neste bloco`);
      else if (/^[\d.\-/]+$/.test(linha)) semRotulo.push(linha);
      else if (linha.includes(":")) avisos.push(`Linha ignorada: "${linha.slice(0, 40)}"`);
      continue;
    }
    if (!valor) continue;

    if (campo.tipo === "placas") {
      const placas = quebrarPlacas(valor);
      if (campos.placa) { avisos.push("Placas apareceram mais de uma vez — usei o primeiro"); continue; }
      Object.entries(placas).forEach(([k, v]) => { campos[k] = v; achados.push(k); });
      continue;
    }
    if (campos[campo.k]) { avisos.push(`${campo.l} apareceu mais de uma vez — usei o primeiro`); continue; }
    campos[campo.k] = limpar(valor, campo.tipo);
    achados.push(campo.k);
  }

  // Colagem só com números, sem rótulo nenhum: assume a ordem do bloco.
  // Só vale pros campos numéricos — texto, data e moeda exigem rótulo.
  if (!achados.length && semRotulo.length) {
    const ordem = def.campos.filter(c => !c.tipo || c.tipo === "nf");
    semRotulo.slice(0, ordem.length).forEach((v, i) => {
      campos[ordem[i].k] = limpar(v, ordem[i].tipo);
      achados.push(ordem[i].k);
    });
    avisos.push(`Texto sem rótulos — li na ordem ${ordem.map(c => c.l).join(", ")}. Confira antes de gravar.`);
  }

  return { campos, achados, avisos };
}

// Compatibilidade com quem só quer o bloco de faturamento.
export const parseFaturamento = (texto) => parseBloco(texto, "faturamento");

// Lista achatada dos campos de um bloco (placas viram placa/placa2/placa3), na
// ordem em que a conferência mostra.
export function camposDoBloco(modo) {
  const def = BLOCOS[modo] || BLOCOS[MODO_PADRAO];
  const lista = [];
  def.campos.forEach(c => {
    if (c.tipo === "placas") {
      lista.push({ k: "placa", l: "Placa 1" }, { k: "placa2", l: "Placa 2" }, { k: "placa3", l: "Placa 3" });
    } else if (c.k !== "dt") {
      lista.push({ k: c.k, l: c.l });
    }
  });
  if (def.perguntaManifesto) lista.push({ k: CAMPO_MANIFESTO.k, l: CAMPO_MANIFESTO.l });
  return lista;
}

// O que uma DT precisa ter pra estar faturada — alimenta o KPI "DTs sem
// faturamento" do dashboard. ID ficou de fora de propósito (vem do contratante).
export const CAMPOS_OBRIGATORIOS_FATURAMENTO = camposDoBloco("faturamento");

// Devolve os RÓTULOS que faltam nessa DT ([] = faturamento completo).
export function faltandoFaturamento(reg) {
  return CAMPOS_OBRIGATORIOS_FATURAMENTO
    .filter(c => !String(reg?.[c.k] ?? "").trim())
    .map(c => c.l);
}

// Compara o que foi lido com o registro que já está no app.
// estado: "preenche" (estava vazio) · "igual" · "conflito" (tem outro valor lá)
export function compararComRegistro(reg, campos, modo = MODO_PADRAO) {
  return camposDoBloco(modo)
    .filter(c => campos[c.k] !== undefined && campos[c.k] !== "")
    .map(c => {
      const atual = String(reg?.[c.k] ?? "").trim();
      const novo  = String(campos[c.k]).trim();
      const estado = !atual ? "preenche" : (atual === novo ? "igual" : "conflito");
      return { k: c.k, l: c.l, atual, novo, estado };
    });
}
