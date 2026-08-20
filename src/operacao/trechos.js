// ── operacao/trechos.js ──
// De-para do trecho do TMS: a sigla de 6 letras que vem no relatório de frete
// (ACLNNO, IMPSLU, BEMSZP) = 3 letras da praça de origem + 3 do destino.
//
// A sigla é o que o TMS entrega e o que fica gravado na linha (frete_conferencia.trecho,
// frete_contratos.trecho). A tradução acontece na LEITURA, contra a tabela `trechos`
// (migration 065), e NÃO é copiada para dentro da linha: corrigir um trecho errado passa
// a valer para todo o histórico sem reimportar nada.
//
// Fonte da tabela: relatório "Trechos/Rotas" do próprio TMS, importado por praça. Hoje só
// ACL (Açailândia, 432 rotas). Trecho sem de-para simplesmente continua aparecendo como
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
        m[norm(t.codigo)] = { origem: t.origem || "", destino: t.destino || "", km: t.km ?? null };
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

// { origem, destino, km } ou null quando a sigla não está no dicionário.
export function trechoInfo(codigo) {
  const c = norm(codigo);
  return c ? (_mapa[c] || null) : null;
}

// "ACAILANDIA → SAO LUIS" (só a rota, para linha secundária/tooltip). "" se desconhecido.
export function trechoRota(codigo) {
  const i = trechoInfo(codigo);
  return i ? `${i.origem} → ${i.destino}` : "";
}

// Origem e destino separados — usados como colunas próprias no relatório exportado,
// que é onde a conciliação com a planilha acontece.
export function trechoOrigem(codigo)  { return trechoInfo(codigo)?.origem  || ""; }
export function trechoDestino(codigo) { return trechoInfo(codigo)?.destino || ""; }
export function trechoKm(codigo)      { return trechoInfo(codigo)?.km ?? null; }
