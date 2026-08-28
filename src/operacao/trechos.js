// ── operacao/trechos.js ──
// De-para do trecho do TMS: a sigla de 6 letras que vem no relatório de frete
// (ACLNNO, IMPSLU, BEMSZP) = 3 letras da praça de origem + 3 do destino.
//
// A sigla é o que o TMS entrega e o que fica gravado na linha (frete_conferencia.trecho,
// frete_contratos.trecho). A tradução acontece na LEITURA, contra a tabela `trechos`
// (migration 065), e NÃO é copiada para dentro da linha: corrigir um trecho errado passa
// a valer para todo o histórico sem reimportar nada.
//
// Fonte da tabela: relatório "Trechos/Rotas" do próprio TMS, importado por praça — hoje
// Açailândia, Belém e Imperatriz (730 rotas). Trecho sem de-para continua aparecendo como
// sigla crua — nunca inventamos cidade a partir das 3 letras.
import { supaFetch } from "../supabase.js";

let _sessionToken = null;
export function setTrechosToken(t) { _sessionToken = t || null; }

// { ACLNNO: { origem, destino, km } }
let _mapa = {};
let _carregando = null;

const norm = (c) => String(c ?? "").trim().toUpperCase().replace(/\//g, "");

// Carga única por sessão. Falha (offline, token expirado) mantém o mapa vazio, e a tela
// segue mostrando a sigla — o de-para é enfeite informativo, não pode derrubar a página.
export async function carregarTrechos(conn) {
  if (!conn || !_sessionToken) return false;
  if (_carregando) return _carregando;
  _carregando = (async () => {
    try {
      const r = await supaFetch(conn.url, conn.key, "POST", "rpc/listar_trechos", { p_token: _sessionToken });
      const lista = Array.isArray(r) ? r.map((x) => (typeof x === "string" ? JSON.parse(x) : x)) : [];
      const m = {};
      for (const t of lista) {
        if (!t?.codigo) continue;
        m[norm(t.codigo)] = {
          origem: t.origem || "", destino: t.destino || "",
          km: t.km ?? null, kmCalc: t.km_calc ?? null,
          kmFonte: t.km_calc != null ? (t.km_calc_fonte || "osrm") : (t.km != null ? "tms" : null),
          destinoResolvido: t.destino_resolvido || "",
        };
      }
      _mapa = m;
      return lista.length > 0;
    } catch {
      return false;
    } finally {
      _carregando = null;
    }
  })();
  return _carregando;
}

// Quantos trechos o de-para conhece (0 = ainda não carregou ou não há nada no banco).
export function totalTrechos() { return Object.keys(_mapa).length; }

// Siglas que aparecem nas linhas mas não estão no de-para — praça cujo relatório
// "Trechos/Rotas" nunca foi importado. Vira aviso na tela, em vez de coluna vazia.
export function trechosSemDePara(linhas) {
  const faltam = new Map();
  for (const l of linhas || []) {
    const c = norm(l?.trecho);
    if (!c || _mapa[c]) continue;
    faltam.set(c, (faltam.get(c) || 0) + 1);
  }
  return [...faltam].map(([codigo, linhas]) => ({ codigo, linhas }))
    .sort((a, b) => b.linhas - a.linhas);
}

// Trechos conhecidos que estão sem distância — o que a fila de cálculo persegue.
export function trechosSemKm(linhas) {
  const faltam = new Map();
  for (const l of linhas || []) {
    const c = norm(l?.trecho);
    const i = c ? _mapa[c] : null;
    if (!i || i.kmCalc != null || i.km != null) continue;
    faltam.set(c, (faltam.get(c) || 0) + 1);
  }
  return [...faltam].map(([codigo, linhas]) => ({
    codigo, linhas, origem: _mapa[codigo].origem, destino: _mapa[codigo].destino,
  })).sort((a, b) => b.linhas - a.linhas);
}

// ── Praças (3 letras) deduzidas do que já existe ──────────────────────────
// O código é origem+destino, então cada rota conhecida ensina DUAS praças: IMPAGA diz que
// IMP=IMPERATRIZ e AGA=ARAGUAINA. Com isso um trecho novo (AGAIMP) já nasce com a rota
// proposta, e resolver a pendência vira conferir, não digitar. Voto por maioria porque a
// mesma praça aparece escrita de formas diferentes em rotas antigas.
function pracas() {
  const votos = {}; // { IMP: { IMPERATRIZ: 12 } }
  const votar = (sigla, cidade) => {
    if (!sigla || !cidade) return;
    votos[sigla] = votos[sigla] || {};
    votos[sigla][cidade] = (votos[sigla][cidade] || 0) + 1;
  };
  for (const [cod, i] of Object.entries(_mapa)) {
    if (cod.length !== 6) continue;
    votar(cod.slice(0, 3), i.origem);
    votar(cod.slice(3, 6), i.destino);
  }
  const out = {};
  for (const [sigla, c] of Object.entries(votos)) {
    out[sigla] = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
  }
  return out;
}

// { origem, destino } proposto para uma sigla ainda sem de-para. Campo vazio = praça que
// nunca apareceu em nenhuma rota; aí não há o que propor e a pessoa digita.
export function sugerirTrecho(codigo) {
  const c = norm(codigo);
  const p = pracas();
  return { origem: p[c.slice(0, 3)] || "", destino: p[c.slice(3, 6)] || "" };
}

// Grava um trecho (cria ou corrige) e atualiza o mapa em memória, pra tela refletir sem
// recarregar. `km` é opcional: em branco, quem manda é o cálculo do OSRM.
export async function salvarTrecho(conn, { codigo, origem, destino, km }) {
  if (!conn || !_sessionToken) throw new Error("Sessão expirada — entre de novo.");
  const c = norm(codigo);
  const o = String(origem || "").trim().toUpperCase();
  const d = String(destino || "").trim().toUpperCase();
  if (!c || !o || !d) throw new Error("Informe origem e destino.");
  const kmNum = km === "" || km == null ? null : Number(km);
  await supaFetch(conn.url, conn.key, "POST", "rpc/upsert_trechos_lote", {
    p_token: _sessionToken,
    p_linhas: [{ codigo: c, origem: o, destino: d, km: kmNum }],
  });
  const antes = _mapa[c] || {};
  // Mudou a rota: o km calculado antes era de outro caminho e não vale mais.
  const rotaMudou = antes.origem !== o || antes.destino !== d;
  const kmCalc = rotaMudou ? null : (antes.kmCalc ?? null);
  _mapa[c] = {
    origem: o, destino: d, km: kmNum, kmCalc,
    kmFonte: kmCalc != null ? "osrm" : (kmNum != null ? "tms" : null),
    destinoResolvido: rotaMudou ? "" : (antes.destinoResolvido || ""),
  };
  return c;
}

// Cidade -> UF a partir do que a operação registra nas viagens ("BELÉM - PA").
// É o critério que desempata homônimo antes de geocodificar; sem ele, "DAVINOPOLIS"
// vira Goiás em vez do Maranhão (ver migration 068).
const UF_RE = /[\s-]*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/;
let _ufs = {};
export function registrarUfsDeDestinos(registros) {
  const out = {};
  for (const r of registros || []) {
    const d = norm(r?.destino);
    const m = d.match(UF_RE);
    if (!m) continue;
    const cidade = d.replace(UF_RE, "").trim();
    if (cidade) out[cidade] = m[1];
  }
  if (Object.keys(out).length) _ufs = { ..._ufs, ...out };
  return Object.keys(_ufs).length;
}

// Calcula a distância dos trechos sem km e grava. Devolve { gravados, pendentes }.
// Pendente = cidade homônima sem critério: fica sem número de propósito, para virar
// aviso em vez de km errado. O cálculo em si roda em /api/trecho-km (o Nominatim
// limita a 1 req/s e exige User-Agent, então não pode sair do navegador).
export async function calcularKmFaltante(conn, codigos) {
  if (!conn || !_sessionToken || !codigos?.length) return { gravados: 0, pendentes: [] };
  const lista = codigos.map((c) => norm(c)).filter((c) => _mapa[c])
    .map((c) => ({ codigo: c, origem: _mapa[c].origem, destino: _mapa[c].destino }));
  if (!lista.length) return { gravados: 0, pendentes: [] };

  const r = await fetch("/api/trecho-km", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trechos: lista, ufConhecidas: _ufs }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Falha ao calcular distância");
  const { resultados = [] } = await r.json();

  const ok = resultados.filter((x) => x.km > 0);
  if (ok.length) {
    await supaFetch(conn.url, conn.key, "POST", "rpc/upsert_trechos_km_calc", {
      p_token: _sessionToken,
      p_linhas: ok.map((x) => ({ codigo: x.codigo, km_calc: x.km, fonte: "osrm",
                                 destino_resolvido: x.destinoResolvido || "" })),
    });
    for (const x of ok) {
      if (!_mapa[x.codigo]) continue;
      _mapa[x.codigo].kmCalc = x.km;
      _mapa[x.codigo].kmFonte = "osrm";
      if (x.destinoResolvido) _mapa[x.codigo].destinoResolvido = x.destinoResolvido;
    }
  }
  return { gravados: ok.length, pendentes: resultados.filter((x) => x.pendente) };
}

// { origem, destino, km } ou null quando a sigla não está no dicionário.
export function trechoInfo(codigo) {
  const c = norm(codigo);
  return c ? (_mapa[c] || null) : null;
}

// "ACAILANDIA → SAO LUIS" (só a rota, para linha secundária/tooltip). "" se desconhecido.
export function trechoRota(codigo) {
  const i = trechoInfo(codigo);
  return i ? `${i.origem} ${i.destino}` : "";
}

// Origem e destino separados — usados como colunas próprias no relatório exportado,
// que é onde a conciliação com a planilha acontece.
export function trechoOrigem(codigo)  { return trechoInfo(codigo)?.origem  || ""; }
export function trechoDestino(codigo) { return trechoInfo(codigo)?.destino || ""; }

// Distância em km. O calculado (OSRM) vem primeiro porque a coluna do TMS é inservível em
// Belém e Imperatriz: 230 das 298 rotas vieram zeradas e várias erradas por ordem de
// grandeza (Belém → São Luís = 1 km, Imperatriz → Olinda = 17.136 km). Em Açailândia o TMS
// está coerente e continua valendo enquanto não houver cálculo.
export function trechoKm(codigo) {
  const i = trechoInfo(codigo);
  return i ? (i.kmCalc ?? i.km ?? null) : null;
}
// "osrm" | "tms" | null — de onde saiu o número que trechoKm devolveu.
export function trechoKmFonte(codigo) { return trechoInfo(codigo)?.kmFonte || null; }
