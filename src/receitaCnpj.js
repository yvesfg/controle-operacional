// ── receitaCnpj.js ──
// Consulta os dados oficiais de um CNPJ pra pré-preencher o cadastro de embarcadoras.
//
// POR QUE NÃO O SITE DA RECEITA (solucoes.receita.fazenda.gov.br/Servicos/cnpjreva):
// aquela página é protegida por captcha e não tem API pública — não dá pra automatizar.
// A MESMA base oficial sai nos Dados Abertos do CNPJ que a Receita publica todo mês; a
// BrasilAPI e a MinhaReceita servem esses dumps por HTTP, de graça e com CORS liberado
// (checado: Access-Control-Allow-Origin: *), então o fetch roda direto do navegador.
//
// Consequência do modelo: o dado é do último dump mensal, não do "instante" da Receita.
// Pra nome/cidade/UF de embarcadora isso é indiferente — não muda de um dia pro outro.
//
// As duas APIs devolvem o MESMO formato de campos (razao_social, nome_fantasia, municipio,
// uf, descricao_situacao_cadastral), por isso o fallback é só trocar a URL.
const FONTES = [
  { nome: "BrasilAPI", url: (d) => `https://brasilapi.com.br/api/cnpj/v1/${d}` },
  { nome: "MinhaReceita", url: (d) => `https://minhareceita.org/${d}` },
];

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");

// Erro de "CNPJ não existe" (404) é resposta VÁLIDA da fonte — não adianta tentar a
// próxima, que consulta a mesma base. Só falha de rede/limite justifica o fallback.
class CnpjNaoEncontrado extends Error {}

async function buscarEm(fonte, digitos, signal) {
  const res = await fetch(fonte.url(digitos), { signal, headers: { Accept: "application/json" } });
  if (res.status === 404) throw new CnpjNaoEncontrado("CNPJ não encontrado na base da Receita.");
  if (!res.ok) throw new Error(`${fonte.nome} respondeu ${res.status}`);
  return await res.json();
}

// Devolve { razao_social, nome_fantasia, cidade, uf, situacao, fonte } ou lança Error.
// `signal` (AbortSignal) é opcional — a tela usa pra cancelar se o CNPJ mudar no meio.
export async function consultarCNPJ(cnpj, { signal } = {}) {
  const digitos = soDigitos(cnpj);
  if (digitos.length !== 14) throw new Error("CNPJ precisa ter 14 dígitos.");

  let ultimoErro;
  for (const fonte of FONTES) {
    try {
      const d = await buscarEm(fonte, digitos, signal);
      return {
        razao_social: d.razao_social || "",
        nome_fantasia: d.nome_fantasia || "",
        cidade: d.municipio || "",
        uf: d.uf || "",
        situacao: d.descricao_situacao_cadastral || "",
        fonte: fonte.nome,
      };
    } catch (e) {
      if (e instanceof CnpjNaoEncontrado || e.name === "AbortError") throw e;
      ultimoErro = e;
    }
  }
  throw new Error(`Não foi possível consultar a Receita (${ultimoErro?.message || "sem resposta"}).`);
}

// Apelido curto sugerido pro campo "nome" quando ele está vazio. Prefere o fantasia
// ("SUZANO PAPEL E CELULOSE") à razão social ("SUZANO S.A."), mas o apelido que o app usa
// de fato ("Suzano Imperatriz") é escolha humana — por isso isto é só sugestão, nunca
// sobrescreve o que já foi digitado.
export const nomeSugerido = (dados) => dados?.nome_fantasia || dados?.razao_social || "";
