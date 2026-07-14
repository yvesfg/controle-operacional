// ── dataCache.js ──
// Cache em memória dos cadastros globais (motoristas, veiculos, embarcadoras).
//
// Por que existe: cada tela chamava seu próprio hook e refazia o MESMO fetch.
// Abrir Cadastros > Veículos disparava 3 requests (useVeiculos + useMotoristas,
// que por dentro busca motoristas E veiculos), além dos 2 que o App.jsx já tinha
// feito — 5 buscas das mesmas tabelas (848 + 727 linhas) só pra pintar uma tela.
// Agora a primeira chamada busca, as demais reaproveitam; mutação invalida.
//
// `pendentes` deduplica chamadas concorrentes: se duas telas montam juntas e
// pedem a mesma chave antes da primeira resposta chegar, ambas esperam a MESMA
// promise em vez de abrir duas requests.

const dados = new Map();     // chave -> valor já resolvido
const pendentes = new Map(); // chave -> promise em voo
const inscritos = new Map(); // chave -> Set<callback> (pra telas se atualizarem juntas)

export function getCached(chave, buscar) {
  if (dados.has(chave)) return Promise.resolve(dados.get(chave));
  if (pendentes.has(chave)) return pendentes.get(chave);

  const p = Promise.resolve(buscar())
    .then((v) => { dados.set(chave, v); pendentes.delete(chave); return v; })
    .catch((e) => { pendentes.delete(chave); throw e; });
  pendentes.set(chave, p);
  return p;
}

// Chamar depois de qualquer escrita — a próxima leitura busca de novo e todas as
// telas inscritas nessa chave recarregam (senão uma tela salvava e a outra
// continuava mostrando dado velho).
export function invalidar(...chaves) {
  chaves.forEach((c) => {
    dados.delete(c);
    pendentes.delete(c);
    (inscritos.get(c) || []).forEach((cb) => { try { cb(); } catch {} });
  });
}

export function inscrever(chave, cb) {
  if (!inscritos.has(chave)) inscritos.set(chave, new Set());
  inscritos.get(chave).add(cb);
  return () => inscritos.get(chave)?.delete(cb);
}

export const CHAVES = { motoristas: "motoristas", veiculos: "veiculos", embarcadoras: "embarcadoras" };
