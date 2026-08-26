// ── cadastroExport.js ──
// Monta o arquivo que vai pra embarcadora a partir das DTs escolhidas.
//
// A regra que manda aqui: o CONJUNTO vem da DT, não do cadastro. O motorista
// troca de carreta entre uma carga e outra, e a embarcadora quer o conjunto que
// rodou naquela viagem — o cadastro entra só como fonte dos dados do documento
// (marca, RENAVAM, cor) e do motorista.
//
// O layout é dado (tabela cadastro_templates, migration 071), então este módulo
// não sabe nada sobre "Suzano": ele lê seções, escopos e colunas.
import { conjuntoDaViagem, cpfDigitos, formatarCPF, formatarCpfCnpj, pendenciasCadastro, normalizarRenavam, soDigitos } from "./cadastroEmbarcadora.js";
import { placaCanonica } from "./veiculos.js";

const UF_EXTENSO = {
  AC:"ACRE", AL:"ALAGOAS", AP:"AMAPÁ", AM:"AMAZONAS", BA:"BAHIA", CE:"CEARÁ",
  DF:"DISTRITO FEDERAL", ES:"ESPÍRITO SANTO", GO:"GOIÁS", MA:"MARANHÃO",
  MT:"MATO GROSSO", MS:"MATO GROSSO DO SUL", MG:"MINAS GERAIS", PA:"PARÁ",
  PB:"PARAÍBA", PR:"PARANÁ", PE:"PERNAMBUCO", PI:"PIAUÍ", RJ:"RIO DE JANEIRO",
  RN:"RIO GRANDE DO NORTE", RS:"RIO GRANDE DO SUL", RO:"RONDÔNIA", RR:"RORAIMA",
  SC:"SANTA CATARINA", SP:"SÃO PAULO", SE:"SERGIPE", TO:"TOCANTINS",
};

const dataBR = (v) => {
  const s = String(v ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : String(v ?? "");
};

// "(99) 98103-9055" — o formato que os dois arquivos reais usam. Número fora do
// padrão (ramal, DDD faltando) sai como está: melhor o original que um remendo.
const telefoneBR = (v) => {
  const d = soDigitos(v).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return String(v ?? "").trim();
};

function formatar(valor, col) {
  const bruto = col.fixo !== undefined ? col.fixo : valor;
  const vazio = bruto === null || bruto === undefined || String(bruto).trim() === "";
  if (vazio) return col.padrao ?? "";
  switch (col.formato) {
    case "data":      return dataBR(bruto);
    case "cpf":       return formatarCPF(bruto);
    case "cpf_cnpj":  return formatarCpfCnpj(bruto);
    case "telefone":  return telefoneBR(bruto);
    case "uf_sigla":  return String(bruto).toUpperCase();
    case "uf_extenso":return UF_EXTENSO[String(bruto).toUpperCase()] || String(bruto).toUpperCase();
    // RENAVAM sai como TEXTO: em célula numérica o Excel come o zero à esquerda,
    // que foi exatamente o que aconteceu nos arquivos preenchidos à mão.
    case "renavam":   return normalizarRenavam(bruto);
    case "tanque":    return `${soDigitos(bruto) || bruto}${col.sufixo || ""}`;
    default:          return String(bruto);
  }
}

// ── Itens do envio ──────────────────────────────────────────────────────────
// Um item = um CADASTRO: motorista + conjunto que rodou junto. NÃO é uma DT —
// o mesmo motorista com o mesmo cavalo e a mesma carreta faz dez viagens no mês,
// e a embarcadora quer esse cadastro UMA vez. Quando ele troca uma peça, aí sim
// vira outro item, porque é outro conjunto.
//
// As DTs vêm junto (`dts`) porque é por elas que o analista reconhece a linha e
// faz a busca. `pendencias` é a MESMA função da tela de cadastro — o que aparece
// como "falta 3" lá é o que trava o envio aqui.
export function itensDoEnvio(DADOS = [], motoristas = [], veiculos = []) {
  const porCpf = new Map(), porNome = new Map(), porPlaca = new Map();
  motoristas.forEach((m) => {
    const cpf = cpfDigitos(m.cpf);
    if (cpf) porCpf.set(cpf, m);
    if (m.nome) porNome.set(m.nome.toUpperCase().trim(), m);
    [m.placa1, m.placa2, m.placa3, m.placa4].filter(Boolean)
      .forEach((p) => porPlaca.set(placaCanonica(p), m));
  });
  // Indexado pela CANÔNICA: a viagem escreve "OLL2I68" e o cadastro guardou
  // "OLL2168" — mesma carreta, grafias diferentes. Sem isto ela entra como casca
  // sem documento e trava o cadastro inteiro como incompleto.
  const veicPorPlaca = new Map(veiculos.map((v) => [placaCanonica(v.placa), v]));

  const porDt = new Map();
  (DADOS || []).forEach((reg) => {
    if (!reg?.dt) return;
    // Uma DT pode vir em mais de uma linha (destinos): a primeira basta, o
    // cadastro não muda entre elas.
    if (!porDt.has(String(reg.dt))) porDt.set(String(reg.dt), reg);
  });

  // Agrupa por CADASTRO: a chave é a assinatura (motorista + peças). Dez DTs do
  // mesmo conjunto viram uma linha só — sem isso o arquivo saía com o mesmo
  // motorista repetido dez vezes.
  const porCadastro = new Map();
  [...porDt.entries()].forEach(([dt, reg]) => {
    const motorista = porCpf.get(cpfDigitos(reg.cpf))
      || porNome.get(String(reg.nome || "").toUpperCase().trim())
      || porPlaca.get(placaCanonica(reg.placa))
      || null;
    const placas = conjuntoDaViagem(reg, motorista || {});
    // Placa que rodou mas não está no cadastro de veículos entra como casca: o
    // envio precisa saber que ela existe pra poder acusar o que falta nela.
    const pecas = placas.map((p, i) => veicPorPlaca.get(placaCanonica(p)) || { placa: p, tipo: i === 0 ? "cavalo" : "carreta" });
    const item = {
      reg,
      motorista,
      veiculos: pecas,
      nome: motorista?.nome || reg.nome || "—",
      pendencias: motorista ? pendenciasCadastro(motorista, pecas) : ["Motorista não cadastrado"],
    };
    // Sem motorista no cadastro não há assinatura que preste (o conjunto ainda
    // pode ser o mesmo de outro): agrupa por placa, que é o que se tem. E sem
    // placa, cada DT é seu próprio item — juntar tudo numa chave vazia fazia as
    // DTs recém-criadas (ainda sem placa nem motorista) sumirem da lista, que é
    // exatamente quando o analista vai procurá-las.
    const assinatura = motorista
      ? assinaturaDoItem(item)
      : `sem-cadastro:${placas.join("-") || `dt-${dt}`}`;
    const existente = porCadastro.get(assinatura);
    if (existente) { existente.dts.push(dt); return; }
    porCadastro.set(assinatura, { ...item, assinatura, chave: assinatura, dts: [dt] });
  });

  return [...porCadastro.values()]
    .map((i) => ({ ...i, dts: i.dts.sort(), dt: i.dts[0] }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

// ── Montagem ────────────────────────────────────────────────────────────────
const registroDoEscopo = (item, escopo) => {
  if (escopo === "motorista") return item.motorista ? [{ ...item.motorista, dt: item.dt }] : [];
  return item.veiculos.filter((v) => (v.tipo || "carreta") === escopo);
};

const linhaDaSecao = (secao, registro) => secao.colunas.map((c) => formatar(registro[c.campo], c));

// Devolve [{nome, matriz}] — uma entrada por aba do arquivo.
export function matrizesDoTemplate(template, itens) {
  const def = template?.definicao || {};
  const secoes = def.secoes || [];

  if (template?.layout === "blocos") {
    // Um bloco por motorista, cabeçalho repetido a cada seção — é assim que a
    // embarcadora manda o modelo, e mudar isso é retrabalho pra quem recebe.
    const linhas = [];
    itens.forEach((item, i) => {
      if (i > 0) linhas.push([]);
      secoes.forEach((secao) => {
        const registros = registroDoEscopo(item, secao.escopo);
        if (!registros.length) return;
        linhas.push(secao.colunas.map((c) => c.titulo));
        registros.forEach((r) => linhas.push(linhaDaSecao(secao, r)));
      });
    });
    return [{ nome: def.aba || "CADASTRO", matriz: linhas }];
  }

  return secoes.map((secao) => ({
    nome: secao.nome,
    matriz: [
      secao.colunas.map((c) => c.titulo),
      ...itens.flatMap((item) => registroDoEscopo(item, secao.escopo).map((r) => linhaDaSecao(secao, r))),
    ],
  }));
}

// ── Assinatura ──────────────────────────────────────────────────────────────
// Hash do que foi pro arquivo — é o que separa "já enviei e nada mudou" de "já
// enviei, mas trocou a carreta". Independe do template de propósito: o mesmo
// motorista enviado nos dois modelos da Suzano é o mesmo cadastro.
//
// djb2: hash de igualdade, não de segurança. Só precisa mudar quando o conteúdo
// muda, e cabe numa coluna text sem trazer dependência nova.
const hash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

const CAMPOS_ASSINATURA_MOTORISTA = ["nome", "cpf", "cnh_numero", "cnh_categoria", "cnh_validade", "cnh_uf", "genero", "data_nascimento", "tel", "funcao", "qualificacao"];
const CAMPOS_ASSINATURA_VEICULO = ["placa", "tipo", "marca", "modelo", "cor", "ano", "renavam", "tanque_litros", "cpf_cnpj_responsavel"];

export function assinaturaDoItem(item) {
  const m = item?.motorista || {};
  const partes = [
    CAMPOS_ASSINATURA_MOTORISTA.map((k) => String(m[k] ?? "").trim()).join("|"),
    ...(item?.veiculos || []).map((v) => CAMPOS_ASSINATURA_VEICULO.map((k) => String(v[k] ?? "").trim()).join("|")),
  ];
  return hash(partes.join("¬"));
}

export const nomeDoArquivo = (template, quando = new Date()) =>
  `Cadastro ${template?.embarcadora || "embarcadora"} ${quando.toLocaleDateString("pt-BR").replace(/\//g, ".")}`;
