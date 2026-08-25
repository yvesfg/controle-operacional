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
import { conjuntoDaViagem, cpfDigitos, formatarCPF, pendenciasCadastro, normalizarRenavam, soDigitos } from "./cadastroEmbarcadora.js";

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

const cpfCnpj = (v) => {
  const d = soDigitos(v);
  if (d.length === 11) return formatarCPF(d);
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return String(v ?? "").trim();
};

function formatar(valor, col) {
  const bruto = col.fixo !== undefined ? col.fixo : valor;
  const vazio = bruto === null || bruto === undefined || String(bruto).trim() === "";
  if (vazio) return col.padrao ?? "";
  switch (col.formato) {
    case "data":      return dataBR(bruto);
    case "cpf":       return formatarCPF(bruto);
    case "cpf_cnpj":  return cpfCnpj(bruto);
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
// Um item = uma DT: a viagem, o motorista que o cadastro conhece e as peças que
// rodaram. `pendencias` é a MESMA função da tela de cadastro — o que aparece
// como "falta 3" lá é o que trava o envio aqui.
export function itensDoEnvio(DADOS = [], motoristas = [], veiculos = []) {
  const porCpf = new Map(), porNome = new Map(), porPlaca = new Map();
  motoristas.forEach((m) => {
    const cpf = cpfDigitos(m.cpf);
    if (cpf) porCpf.set(cpf, m);
    if (m.nome) porNome.set(m.nome.toUpperCase().trim(), m);
    [m.placa1, m.placa2, m.placa3, m.placa4].filter(Boolean)
      .forEach((p) => porPlaca.set(String(p).toUpperCase().replace(/[^A-Z0-9]/g, ""), m));
  });
  const veicPorPlaca = new Map(veiculos.map((v) => [v.placa, v]));

  const porDt = new Map();
  (DADOS || []).forEach((reg) => {
    if (!reg?.dt) return;
    // Uma DT pode vir em mais de uma linha (destinos): a primeira basta, o
    // cadastro não muda entre elas.
    if (!porDt.has(String(reg.dt))) porDt.set(String(reg.dt), reg);
  });

  return [...porDt.entries()].map(([dt, reg]) => {
    const motorista = porCpf.get(cpfDigitos(reg.cpf))
      || porNome.get(String(reg.nome || "").toUpperCase().trim())
      || porPlaca.get(String(reg.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, ""))
      || null;
    const placas = conjuntoDaViagem(reg, motorista || {});
    // Placa que rodou mas não está no cadastro de veículos entra como casca: o
    // envio precisa saber que ela existe pra poder acusar o que falta nela.
    const pecas = placas.map((p, i) => veicPorPlaca.get(p) || { placa: p, tipo: i === 0 ? "cavalo" : "carreta" });
    return {
      dt,
      reg,
      motorista,
      veiculos: pecas,
      nome: motorista?.nome || reg.nome || "—",
      pendencias: motorista ? pendenciasCadastro(motorista, pecas) : ["Motorista não cadastrado"],
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome));
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

export const nomeDoArquivo = (template, quando = new Date()) =>
  `Cadastro ${template?.embarcadora || "embarcadora"} ${quando.toLocaleDateString("pt-BR").replace(/\//g, ".")}`;
