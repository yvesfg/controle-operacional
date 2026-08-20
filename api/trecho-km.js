// ─────────────────────────────────────────────────────────
//  /api/trecho-km — distancia rodoviaria de um trecho do TMS.
//
//  Por que no servidor e nao no browser: o Nominatim exige User-Agent
//  identificavel e no maximo 1 requisicao por segundo. Disparar isso da tela de
//  cada usuario e caminho curto para bloqueio do IP.
//
//  Entrada:  { trechos: [{ codigo, origem, destino }], ufConhecidas?: { CIDADE: "UF" } }
//  Saida:    { resultados: [{ codigo, km, destinoResolvido, como } | { codigo, pendente, motivo }] }
//
//  Nao grava nada: quem persiste e o front, pela RPC upsert_trechos_km_calc (com o
//  token da sessao). Assim o endpoint nao precisa de credencial do banco.
//
//  REGRA QUE NAO MUDA: cidade homonima sem criterio NAO vira numero. O TMS trunca o
//  destino em 20 caracteres e nao manda UF, entao "DAVINOPOLIS" tanto e MA quanto GO —
//  chutar aqui viraria km errado em relatorio de conciliacao. Ver migration 068.
// ─────────────────────────────────────────────────────────

const UA = "controle-operacional-yfgroup/1.0 (contato: yvesfg@gmail.com)";
const MAX_TRECHOS = 20;          // teto por chamada: 1 req/s no Nominatim x maxDuration 60s
const IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/['-]/g, " ").replace(/\s+/g, " ").trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Lista de municipios do IBGE, reaproveitada entre invocacoes da mesma instancia.
let _municipios = null;
async function municipios() {
  if (_municipios) return _municipios;
  const r = await fetch(IBGE, { headers: { "User-Agent": UA } });
  const lista = await r.json();
  const porNome = new Map();
  for (const m of lista) {
    // Municipio recem-criado vem sem microrregiao; nesses a UF vem pela regiao imediata.
    const uf = m.microrregiao?.mesorregiao?.UF?.sigla
            || m["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla;
    if (!uf) continue;
    const k = norm(m.nome);
    if (!porNome.has(k)) porNome.set(k, []);
    porNome.get(k).push({ nome: m.nome, uf });
  }
  _municipios = porNome;
  return porNome;
}

async function geo(cidade, uf) {
  const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=br&addressdetails=1`,
    { headers: { "User-Agent": UA } },
  );
  await sleep(1100);
  if (!r.ok) return null;
  const lista = await r.json();
  if (!Array.isArray(lista) || !lista.length) return null;
  const munis = lista.filter((x) => ["municipality", "city", "town", "village"].includes(x.addresstype));
  const esc = (munis.length ? munis : lista)[0];
  return { lat: Number(esc.lat), lon: Number(esc.lon) };
}

async function rota(a, b) {
  const r = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,
    { headers: { "User-Agent": UA } },
  );
  if (!r.ok) return null;
  const j = await r.json();
  if (j.code !== "Ok" || !j.routes?.length) return null;
  return Math.round(j.routes[0].distance / 1000);
}

// (nome oficial, uf, como decidiu) — ou motivo da desistencia.
function resolver(destino, porNome, ufConhecidas) {
  const d = norm(destino);
  let cands = porNome.get(d);
  if (!cands) {
    // Destino truncado em 20 caracteres: casa por prefixo.
    cands = [];
    for (const [nome, lst] of porNome) if (nome.startsWith(d)) cands.push(...lst);
  }
  if (!cands.length) return { motivo: "sem municipio com esse nome" };
  // A operacao ja diz a UF? (nome exato ou o truncado batendo por prefixo)
  let uf = ufConhecidas[d];
  if (!uf) {
    const chave = Object.keys(ufConhecidas).find((k) => k.startsWith(d));
    if (chave) uf = ufConhecidas[chave];
  }
  if (uf) {
    const achou = cands.find((c) => c.uf === uf);
    if (achou) return { nome: achou.nome, uf, como: "uf das viagens" };
  }
  if (cands.length === 1) return { nome: cands[0].nome, uf: cands[0].uf, como: "municipio unico" };
  return { motivo: "ambiguo: " + cands.slice(0, 6).map((c) => `${c.nome}/${c.uf}`).join(", ") };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const { trechos, ufConhecidas } = req.body || {};
  if (!Array.isArray(trechos) || !trechos.length) {
    res.status(400).json({ error: "trechos ausentes" });
    return;
  }
  const ufs = {};
  for (const [k, v] of Object.entries(ufConhecidas || {})) ufs[norm(k)] = String(v || "").toUpperCase();

  try {
    const porNome = await municipios();
    const cacheGeo = new Map();
    const geoCache = async (cidade, uf) => {
      const ch = `${cidade}|${uf}`;
      if (!cacheGeo.has(ch)) cacheGeo.set(ch, await geo(cidade, uf));
      return cacheGeo.get(ch);
    };

    const resultados = [];
    for (const t of trechos.slice(0, MAX_TRECHOS)) {
      const codigo = String(t?.codigo || "").toUpperCase();
      if (!codigo || !t?.origem || !t?.destino) {
        resultados.push({ codigo, pendente: true, motivo: "trecho incompleto" });
        continue;
      }
      const o = resolver(t.origem, porNome, ufs);
      const d = resolver(t.destino, porNome, ufs);
      if (o.motivo || d.motivo) {
        resultados.push({ codigo, pendente: true, motivo: d.motivo || o.motivo });
        continue;
      }
      const pa = await geoCache(o.nome, o.uf);
      const pb = await geoCache(d.nome, d.uf);
      if (!pa || !pb) {
        resultados.push({ codigo, pendente: true, motivo: "nao geocodificou" });
        continue;
      }
      const km = await rota(pa, pb);
      if (km === null) {
        resultados.push({ codigo, pendente: true, motivo: "sem rota" });
        continue;
      }
      // Origem e destino na mesma cidade: o roteador devolve 0 e zero nao e distancia.
      if (km === 0) {
        resultados.push({ codigo, pendente: true, motivo: "origem e destino na mesma cidade" });
        continue;
      }
      resultados.push({ codigo, km, destinoResolvido: `${d.nome} - ${d.uf}`, como: d.como });
    }
    res.status(200).json({ resultados, ignorados: Math.max(0, trechos.length - MAX_TRECHOS) });
  } catch (e) {
    res.status(502).json({ error: e.message || "Falha ao calcular distância" });
  }
}
