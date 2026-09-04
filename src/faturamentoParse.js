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
  // A planilha tem TRÊS colunas (PLACA 01/02/03) e o banco também (placa/placa2/
  // placa3). O card antigo mandava tudo junto em "PLACAS: A / B"; esse formato
  // continua sendo aceito (tipo "placas" quebra na barra), mas o card passou a
  // escrever uma linha por placa, que é o que casa 1:1 com a planilha.
  // Os rótulos no PLURAL ("PLACAS 01") são os que a equipe realmente digita —
  // sem eles a linha caía em "Linha ignorada" e a placa não entrava.
  placa:       { k: "placa",        l: "Placa 01",     rotulos: ["placa 01", "placa01", "placa 1", "placa1", "placas 01", "placas01", "placas 1", "placas1", "cavalo"], tipo: "placa" },
  placa2:      { k: "placa2",       l: "Placa 02",     rotulos: ["placa 02", "placa02", "placa 2", "placa2", "placas 02", "placas02", "placas 2", "placas2", "carreta"], tipo: "placa" },
  placa3:      { k: "placa3",       l: "Placa 03",     rotulos: ["placa 03", "placa03", "placa 3", "placa3", "placas 03", "placas03", "placas 3", "placas3"], tipo: "placa" },
  placas:      { k: "placa",        l: "Placas",       rotulos: ["placas", "placa"], tipo: "placas" },
  // Origem/destino entram como CIDADE: caixa alta e "IMPERATRIZ - MA" vira
  // "IMPERATRIZ-MA", que é a forma que a planilha e o filtro do app usam.
  origem:      { k: "origem",       l: "Origem",       rotulos: ["origem", "praca origem", "praça origem", "cidade origem", "saida", "saída", "coleta"], tipo: "cidade" },
  destino:     { k: "destino",      l: "Destino",      rotulos: ["destino", "praca destino", "praça destino", "cidade destino", "entrega"], tipo: "cidade" },
  // "ROTA: IMPERATRIZ-MA > BRASILIA-DF" (ou x, ->, /, "para") vira os dois campos.
  rota:        { k: "rota",         l: "Rota",         rotulos: ["rota", "trecho", "origem/destino", "origem x destino"], tipo: "rota" },
  data_carr:   { k: "data_carr",    l: "Carregar",     rotulos: ["carregar", "data carregamento", "data carr", "carregamento"], tipo: "data" },
  data_agenda: { k: "data_agenda",  l: "Ag. Descarga", rotulos: ["ag descarga", "ag. descarga", "agenda", "data agenda", "agendamento"], tipo: "data" },
  vl_cte:      { k: "vl_cte",       l: "Vlr Empresa",  rotulos: ["vlr empresa", "valor empresa", "vl cte", "valor cte"], tipo: "moeda" },
  vl_contrato: { k: "vl_contrato",  l: "Vlr Mot",      rotulos: ["vlr mot", "valor mot", "vlr motorista", "vl contrato", "valor contrato"], tipo: "moeda" },
  adiant:      { k: "adiant",       l: "ADT",          rotulos: ["adt", "adiantamento", "adiant"], tipo: "moeda" },
  forma_pgto:  { k: "forma_pgto",   l: "Forma de pgto", rotulos: ["pgto", "pagamento", "forma de pagamento", "forma pgto"], tipo: "pgto", soApp: true },
};

// Campos que existem SÓ no app: a planilha não tem coluna pra eles, então não vão
// pro write-back (e por isso mesmo a sync de 15 min nunca os sobrescreve).
export const CAMPOS_SO_APP = Object.values(F).filter(c => c.soApp).map(c => c.k);

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
    campos: [F.dt, F.id_doc, F.nome, F.cpf, F.telefone, F.placa, F.placa2, F.placa3, F.placas, F.destino, F.data_carr, F.data_agenda, F.vl_cte, F.vl_contrato, F.adiant, F.forma_pgto],
    perguntaManifesto: false,
    exemplo: "DT: 1348169\nID: 8678252\nNOME: CARLOS HENRIQUE\nCPF: 212.975.958-07\nTELEFONE: 94 9979-5640\nPLACA 01: KEW9943\nPLACA 02: KQW5I51\nDESTINO: BRASILIA-DF\nCARREGAR: 07/08/2026\nAG DESCARGA: 12/08/2026\nVLR EMPRESA: 12.342,47\nVLR MOT: 10.762,58\nADT: 7.533,80\nPGTO: CHEQUE",
  },
};

export const MODO_PADRAO = "faturamento";

// ── MODELO ÚNICO ──────────────────────────────────────────────────────────────
// O texto que a equipe manda de verdade é MISTO: o bloco de faturamento vem com
// MOT e PLACAS junto (print do Yves, 21/08/2026). Antes, cada modo só aceitava a
// sua lista e o resto virava aviso de "campo do outro bloco" — quem colava o
// bloco real perdia motorista e placas.
// Agora TODO campo conhecido é lido, venha em que bloco vier. Os dois blocos
// continuam existindo, mas só decidem o EXEMPLO no campo de colar, a ordem da
// leitura sem rótulos e se a tela pergunta a data do manifesto.
const TODOS_CAMPOS = Object.values(F).concat([CAMPO_MANIFESTO]);

// Ordem em que a conferência lista o que foi lido: identidade, carga, documentos,
// dinheiro. Independe de qual bloco o texto parecia ser.
const ORDEM_CONFERENCIA = [
  "nome", "cpf", "telefone", "placa", "placa2", "placa3", "origem", "destino",
  "data_carr", "data_agenda", "id_doc", "cte", "mdf", "mat", "nf", "cliente",
  "vl_cte", "vl_contrato", "adiant", "forma_pgto", "data_manifesto",
];

const ROTULO = {};
TODOS_CAMPOS.forEach(c => { if (!ROTULO[c.k] || c.tipo !== "placas") ROTULO[c.k] = c.l; });

// Campos que dizem "isto é faturamento" — a tela usa pra decidir se pergunta a
// data do manifesto, em vez de olhar só o modo escolhido.
export const CAMPOS_FATURAMENTO_CHAVE = ["cte", "mdf", "mat", "nf", "cliente"];

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

// "15/08" ou "15/8" → "15/08" (só dia/mês, sem ano). null se não for esse caso.
// A equipe digita a data sem o ano no WhatsApp; guardar assim deixava o campo
// mais pobre que o que já estava gravado ("15/08/2026") e ainda marcava
// DIFERENTE na conferência, como se fossem datas distintas.
export function diaMesSemAno(valor) {
  const m = String(valor || "").trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}` : null;
}

export function dataDeHojeBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// O valor NÃO é reformatado: o app guarda moeda como texto e o formato varia por
// base (ver financeiroCalc/nMoeda). Reescrever aqui seria inventar um número.
const limparMoeda = (v) => String(v || "").replace(/R\$/gi, "").trim();

// O card imprime "PGTO: ✅ CHEQUE" / "✅ CHEQUE + CONTA" — vira o mesmo vocabulário
// dos 3 botões do card (cheque | conta | ambos), que é o que a coluna guarda.
export function normalizarPgto(valor) {
  const v = norm(valor).replace(/[^a-z+ ]/g, " ").replace(/\s+/g, " ").trim();
  if (!v) return "";
  const temCheque = /cheque/.test(v);
  const temConta  = /conta|deposito|transferencia|pix/.test(v);
  if (/ambos/.test(v) || (temCheque && temConta)) return "ambos";
  if (temCheque) return "cheque";
  if (temConta)  return "conta";
  return "";
}

const limpar = (valor, tipo) => {
  const v = String(valor || "").trim().replace(/\s+/g, " ");
  if (tipo === "nf")    return v.replace(/\s*,\s*/g, ", ");
  if (tipo === "texto") return v;
  if (tipo === "data")  return paraDataBR(v);
  if (tipo === "moeda") return limparMoeda(v);
  if (tipo === "pgto")  return normalizarPgto(v);
  if (tipo === "placa") return v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (tipo === "cidade") return normalizarCidade(v);
  return v.replace(/[^\dA-Za-z\-/]/g, "");
};

// "imperatriz - ma" → "IMPERATRIZ-MA" (forma usada na planilha e nos filtros).
export function normalizarCidade(valor) {
  return String(valor || "").toUpperCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/, "")
    .trim();
}

// "IMPERATRIZ-MA > BRASILIA-DF" → { origem, destino }. Aceita >, →, ->, x, / e "para".
const quebrarRota = (valor) => {
  const partes = String(valor || "")
    .split(/\s*(?:→|->|>|\/|\bx\b|\bpara\b)\s*/i)
    .map(normalizarCidade).filter(Boolean);
  const out = {};
  if (partes[0]) out.origem = partes[0];
  if (partes[1]) out.destino = partes[1];
  return out;
};

// Origem e destino trocados de lugar: a base sabe quais origens existem (o perfil
// da operação), então dá pra corrigir sozinho em vez de gravar invertido.
// `origensValidas` vazio = base sem lista fechada: não mexe em nada.
export function ajustarOrigemDestino(campos, origensValidas) {
  const validas = (origensValidas || []).map(normalizarCidade);
  if (!validas.length) return { campos, avisos: [] };

  const ehOrigem = (v) => v && validas.includes(normalizarCidade(v));
  const { origem, destino } = campos;
  const avisos = [];
  const out = { ...campos };

  if (destino && ehOrigem(destino) && origem && !ehOrigem(origem)) {
    out.origem = normalizarCidade(destino);
    out.destino = normalizarCidade(origem);
    avisos.push(`Origem e destino estavam trocados — ${out.origem} é origem desta base. Corrigi na conferência.`);
  } else if (destino && ehOrigem(destino) && !origem) {
    out.origem = normalizarCidade(destino);
    delete out.destino;
    avisos.push(`"${destino}" é origem desta base, não destino — li como Origem.`);
  } else if (origem && !ehOrigem(origem)) {
    avisos.push(`Origem "${origem}" não é uma das origens desta base (${validas.join(", ")}) — confira antes de gravar.`);
  }
  return { campos: out, avisos };
}

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
  // Lê TODO campo conhecido, não só os do bloco escolhido: o texto real vem
  // misto (faturamento com MOT e PLACAS junto). O modo só decide a ordem da
  // leitura sem rótulos, logo abaixo.
  const conhecidos = TODOS_CAMPOS;
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
    // Planilha e banco têm 3 colunas de placa; motorista com 4 existe no cadastro.
    if (/^placas?\s*0?4$/.test(rotulo)) {
      avisos.push("PLACA 04 ignorada — planilha e banco têm só três colunas de placa");
      continue;
    }

    const campo = conhecidos.find(c => c.rotulos.includes(rotulo));
    if (!campo) {
      if (/^[\d.\-/]+$/.test(linha)) semRotulo.push(linha);
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
    if (campo.tipo === "rota") {
      Object.entries(quebrarRota(valor)).forEach(([k, v]) => {
        if (campos[k]) return;                       // ORIGEM: explícito vence a rota
        campos[k] = v; achados.push(k);
      });
      continue;
    }
    if (campos[campo.k]) { avisos.push(`${campo.l} apareceu mais de uma vez — usei o primeiro`); continue; }
    const limpo = limpar(valor, campo.tipo);
    if (!limpo) {
      if (campo.tipo === "pgto") avisos.push(`Forma de pagamento "${valor}" não reconhecida — use cheque, conta ou ambos`);
      continue;
    }
    campos[campo.k] = limpo;
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
    // "placas" (plural) é só um formato de entrada — escreve nas mesmas colunas
    // de placa/placa2/placa3, então não vira linha própria na conferência.
    if (c.tipo === "placas" || c.k === "dt") return;
    if (lista.some(x => x.k === c.k)) return;
    lista.push({ k: c.k, l: c.l, tipo: c.tipo });
  });
  if (def.perguntaManifesto) lista.push({ k: CAMPO_MANIFESTO.k, l: CAMPO_MANIFESTO.l, tipo: CAMPO_MANIFESTO.tipo });
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
//
// Data sem ano é completada AQUI, e não no parser, porque só neste ponto se
// conhece o registro: o ano vem do que a própria DT já tem naquele campo, então
// "15/08" colado sobre "15/08/2026" vira igual em vez de sobrescrever com uma
// data mais pobre. Campo vazio não tem de onde tirar o ano — usa o corrente e
// marca anoAssumido pra tela avisar.
// A lista sai do que o TEXTO trouxe, não do bloco escolhido — é o que permite o
// bloco misto (faturamento com motorista e placas) aparecer inteiro na conferência.
export function compararComRegistro(reg, campos, _modo) {
  const anoCorrente = new Date().getFullYear();
  const tipoDe = {};
  TODOS_CAMPOS.forEach(c => { if (c.tipo !== "placas") tipoDe[c.k] = c.tipo; });

  return ORDEM_CONFERENCIA
    .filter(k => campos[k] !== undefined && campos[k] !== "")
    .map(k => ({ k, l: ROTULO[k] || k, tipo: tipoDe[k] }))
    .map(c => {
      const atual = String(reg?.[c.k] ?? "").trim();
      let novo = String(campos[c.k]).trim();
      let anoAssumido = false;

      if (c.tipo === "data") {
        const semAno = diaMesSemAno(novo);
        if (semAno) {
          const anoDoRegistro = (atual.match(/^\d{2}\/\d{2}\/(\d{4})$/) || [])[1];
          novo = `${semAno}/${anoDoRegistro || anoCorrente}`;
          anoAssumido = !anoDoRegistro;
        }
      }

      const estado = !atual ? "preenche" : (atual === novo ? "igual" : "conflito");
      return { k: c.k, l: c.l, atual, novo, estado, anoAssumido };
    });
}
