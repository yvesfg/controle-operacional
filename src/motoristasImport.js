// ── motoristasImport.js ──
// Parser da agenda de contatos (export CSV do Google Contacts) + classificação
// contra o cadastro já existente + aplicação (enriquecer motorista existente ou
// criar novo). Pura lógica, sem React — a tela de revisão (Cadastros > Motoristas)
// consome isso.
//
// O nome do contato traz tudo junto em texto livre: flags de status
// (VERMELHO/BLOQUEADO/BOM/GOLPE), placas (cavalo+carreta(s)) e tipo de veículo
// (config_eixos + carroceria + capacidade_m3). Ver migrations 007/008 pro
// porquê desses 3 campos viverem na carreta, não no motorista.
import { criarMotoristasEmLote, atualizarMotorista, listarMotoristasPorCriadoPor } from "./motoristas.js";
import { criarVeiculosEmLote } from "./veiculos.js";

const PLACA_RE = /\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/g;
const CAPACIDADE_RE = /(\d{2,3})\s*m[³3]/i;

// Ordem importa pouco aqui (tokens não se sobrepõem), mas LS4EIXO antes de LS
// por clareza — ver conversa com Yves sobre contagem de eixos (cavalo+carreta).
const CONFIG_EIXOS_MAP = [
  [/\bLS\s*4\s*EIXOS?\b/i, "LS4EIXO"],
  [/\bBITREM\b/i, "BITREM"],
  [/\bRODO\s*TREM\b/i, "RODOTREM"],
  [/\bRODO\b/i, "RODOTREM"],
  [/\bSIMPLES\b/i, "SIMPLES"],
  [/\bLS\b/i, "LS"],
];
const CARROCERIA_MAP = [
  [/\bGRA\b/i, "GRA"],
  [/\bGA\b/i, "GA"],
  [/\bGB\b/i, "GB"],
  [/\bSIDER\b/i, "SIDER"],
  // \b não serve aqui: JS trata Ú/� como "não-palavra", então \bBA[UÚ]\b falha
  // quando o campo termina logo após o Ú (ex.: célula CSV só com "BAÚ").
  // Lookaround contra alfanumérico ASCII resolve.
  [/(?<![A-Za-z0-9])BA[UÚ�](?![A-Za-z0-9])/i, "BAU"],
];
// bloqueado/golpe pesam mais que vermelho; confuseiro/sindicateiro tratados como sinal negativo.
const STATUS_MAP = [
  [/BLOQUEAD[OA]/i, "bloqueado"],
  [/GOLPE/i, "golpe"],
  [/VERMELHO/i, "vermelho"],
  [/CONFUSEIR[OA]|SINDICATEIR[OA]/i, "vermelho"],
  [/\bBOM\b/i, "bom"],
];

const primeiroMatch = (mapa, texto) => {
  for (const [re, valor] of mapa) { if (re.test(texto)) return valor; }
  return null;
};

export const normalizarNome = (n) => (n || "").toUpperCase().trim().replace(/\s+/g, " ");

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Placa pode ter mudado de motorista desde que o Sheets registrou o último frete
// (caminhão vendido/repassado) — um match só por placa sem nenhuma palavra do nome
// em comum é sinal de que é ISSO, não a mesma pessoa com apelido diferente. Evita
// enriquecer (ou, pior, reatribuir a placa) do motorista errado.
function nomesTemSobreposicao(a, b) {
  const tokens = (s) => new Set(semAcento(normalizarNome(s)).split(" ").filter((t) => t.length >= 4));
  const ta = tokens(a), tb = tokens(b);
  for (const t of ta) { if (tb.has(t)) return true; }
  return false;
}

// Extrai nome limpo + placas + tipo/eixos/capacidade + status_risco de UM campo
// de nome bruto do contato (já com First+Middle+Last concatenados).
export function parseContatoAgenda(nomeCru) {
  const texto = (nomeCru || "").trim();
  if (!texto) return null;

  const placas = [...new Set([...texto.toUpperCase().matchAll(PLACA_RE)].map((m) => m[0]))];
  const capMatch = texto.match(CAPACIDADE_RE);
  const capacidadeM3 = capMatch ? parseFloat(capMatch[1]) : null;
  const configEixos = primeiroMatch(CONFIG_EIXOS_MAP, texto);
  const carroceria = primeiroMatch(CARROCERIA_MAP, texto);
  const statusRisco = primeiroMatch(STATUS_MAP, texto);

  let limpo = texto.replace(/^[\[(][^\])]*[\])]\s*-?\s*/, ""); // prefixo tipo "[VERMELHO] " ou "(BLOQUEADO) "
  placas.forEach((p) => { limpo = limpo.replace(new RegExp(p, "gi"), " "); });
  if (capMatch) limpo = limpo.replace(capMatch[0], " ");
  [...CONFIG_EIXOS_MAP, ...CARROCERIA_MAP, ...STATUS_MAP].forEach(([re]) => { limpo = limpo.replace(new RegExp(re.source, "gi"), " "); });
  limpo = limpo.replace(/[/|]+/g, " "); // sobra de placas separadas por "/" (ex.: "CATTANI / / /")
  limpo = limpo.replace(/\s{2,}/g, " ").replace(/^[\s\-–—,.]+|[\s\-–—,.]+$/g, "").trim();

  return {
    nomeCru: texto,
    nome: limpo || texto, // se sobrou vazio (nome só tinha ruído), mantém o cru pra não perder o contato
    placas,
    configEixos,
    carroceria,
    capacidadeM3,
    statusRisco,
  };
}

// Parser CSV completo (Google Contacts) — suporta campos entre aspas com vírgula/quebra
// de linha interna (endereços). Cada linha vira {nomeCru, nome, placas, tel, ...}.
export function parseAgendaCSV(rawCsv) {
  const norm = rawCsv.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i = 0; i < norm.length; i++) {
    const ch = norm[i];
    if (inQ) {
      if (ch === '"') { if (norm[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ""; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const firstIdx = headers.indexOf("first name");
  const midIdx = headers.indexOf("middle name");
  const lastIdx = headers.indexOf("last name");
  const phoneIdxs = headers.map((h, i) => ((h.includes("phone") && h.includes("value")) ? i : -1)).filter((i) => i >= 0);

  const contatos = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.every((c) => !c || !c.trim())) continue;
    const nomeCru = [cols[firstIdx], cols[midIdx], cols[lastIdx]].filter(Boolean).join(" ").trim();
    if (!nomeCru) continue;
    let tel = "";
    for (const pi of phoneIdxs) { const v = (cols[pi] || "").replace(/\D/g, "").replace(/^55/, ""); if (v.length >= 8) { tel = v; break; } }
    const parsed = parseContatoAgenda(nomeCru);
    if (!parsed) continue;
    contatos.push({ ...parsed, tel });
  }
  return contatos;
}

// Classifica contatos já parseados contra o cadastro atual (motoristas com _veiculos
// anexado, formato devolvido por useMotoristas):
//   enriquecer — achou por placa (com nome batendo) ou por nome exato
//   novos      — sem match, tem placa — candidato real
//   conflitos  — achou por placa mas o nome diverge (placa provavelmente trocou de
//                motorista); não enriquece automático, a placa conflitante é retirada
//                do contato antes dele virar candidato a "novo" (pra não tentar roubar
//                a placa de quem já tem ela hoje)
//   semSinal   — nem placa nem match — ruído, não entra na fila por padrão
export function classificarContatos(contatosParsed, motoristasExistentes) {
  const porPlaca = new Map();
  motoristasExistentes.forEach((m) => (m._veiculos || []).forEach((v) => porPlaca.set(v.placa, m)));
  const porNome = new Map(motoristasExistentes.map((m) => [normalizarNome(m.nome), m]));

  const enriquecer = [], novos = [], semSinal = [], conflitos = [];
  contatosParsed.forEach((c) => {
    if (!c.placas.length) { semSinal.push(c); return; }

    let matchPlaca = null, placaConflitante = null;
    for (const p of c.placas) {
      const m = porPlaca.get(p);
      if (!m) continue;
      if (nomesTemSobreposicao(c.nome, m.nome)) { matchPlaca = m; break; }
      if (!placaConflitante) placaConflitante = { motorista: m, placa: p };
    }

    if (matchPlaca) { enriquecer.push({ contato: c, motorista: matchPlaca }); return; }

    const matchNome = porNome.get(normalizarNome(c.nome));
    if (matchNome) { enriquecer.push({ contato: c, motorista: matchNome }); return; }

    if (placaConflitante) {
      conflitos.push({ contato: c, ...placaConflitante });
      const restante = c.placas.filter((p) => p !== placaConflitante.placa);
      if (restante.length) novos.push({ ...c, placas: restante });
      else semSinal.push(c);
      return;
    }

    novos.push(c);
  });
  return { enriquecer, novos, semSinal, conflitos };
}

// Mapeador com limite de concorrência — evita disparar milhares de requests
// simultâneas (limite de conexão do navegador / rate limit do Supabase).
async function mapComLimite(itens, limite, fn) {
  const out = new Array(itens.length);
  let cursor = 0;
  async function worker() {
    while (cursor < itens.length) {
      const i = cursor++;
      out[i] = await fn(itens[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker));
  return out;
}

// Monta os veículos NOVOS de um item "enriquecer" (placas do contato que o
// motorista ainda não tem) — 1ª placa nova = cavalo só se ele ainda não tiver
// nenhum; as demais = carreta, recebendo config_eixos/carroceria/capacidade_m3.
function veiculosNovosDoContato(contato, motoristaId, veiculosAtuais) {
  const placasAtuais = new Set((veiculosAtuais || []).map((v) => v.placa));
  let cavaloJaTem = (veiculosAtuais || []).some((v) => v.tipo === "cavalo");
  const novos = [];
  for (const placa of contato.placas) {
    if (placasAtuais.has(placa)) continue;
    const tipo = cavaloJaTem ? "carreta" : "cavalo";
    if (tipo === "cavalo") cavaloJaTem = true;
    const dados = { placa, tipo, motorista_id: motoristaId };
    if (tipo === "carreta") {
      if (contato.configEixos) dados.config_eixos = contato.configEixos;
      if (contato.carroceria) dados.carroceria = contato.carroceria;
      if (contato.capacidadeM3) dados.capacidade_m3 = contato.capacidadeM3;
    }
    novos.push(dados);
  }
  return novos;
}

// Aplica a fila "enriquecer" inteira: PATCH de tel/status_risco (concorrência
// limitada, um por motorista) + 1 insert em lote pra todos os veículos novos.
export async function aplicarEnriquecimentoLote(conn, itens, { onProgresso } = {}) {
  let feitos = 0;
  const veiculosNovos = [];
  await mapComLimite(itens, 12, async ({ contato, motorista }) => {
    const patchMot = {};
    if (contato.tel && !motorista.tel) patchMot.tel = contato.tel;
    if (contato.statusRisco && !motorista.status_risco) patchMot.status_risco = contato.statusRisco;
    if (Object.keys(patchMot).length) await atualizarMotorista(conn, motorista.id, patchMot);
    veiculosNovos.push(...veiculosNovosDoContato(contato, motorista.id, motorista._veiculos));
    feitos++; onProgresso?.(feitos, itens.length);
  });
  if (veiculosNovos.length) await criarVeiculosEmLote(conn, veiculosNovos);
  return { motoristasAtualizados: itens.length, veiculosCriados: veiculosNovos.length };
}

// Confirma a fila "novos" inteira: insere motoristas em lote (com uma tag
// `criado_por` única desta importação), re-busca por essa tag pra recuperar os
// ids de forma confiável (não depende da ordem de retorno do insert), e só
// então insere os veículos em lote já com o motorista_id certo.
export async function confirmarNovosLote(conn, contatos, usuarioLogado) {
  if (!contatos.length) return { motoristasCriados: 0, veiculosCriados: 0 };
  const tag = `agenda_import_${Date.now()}${usuarioLogado ? "_" + usuarioLogado : ""}`;
  const dadosMotoristas = contatos.map((c) => ({
    nome: c.nome, tel: c.tel || null, status_risco: c.statusRisco || null, criado_por: tag,
  }));
  await criarMotoristasEmLote(conn, dadosMotoristas);
  const criados = await listarMotoristasPorCriadoPor(conn, tag);
  const idPorNome = new Map(criados.map((m) => [normalizarNome(m.nome), m.id]));

  const veiculosNovos = [];
  contatos.forEach((c) => {
    const motoristaId = idPorNome.get(normalizarNome(c.nome));
    if (!motoristaId) return; // não deveria acontecer, mas não trava o resto do lote
    for (let i = 0; i < c.placas.length; i++) {
      const tipo = i === 0 ? "cavalo" : "carreta";
      const dados = { placa: c.placas[i], tipo, motorista_id: motoristaId };
      if (tipo === "carreta") {
        if (c.configEixos) dados.config_eixos = c.configEixos;
        if (c.carroceria) dados.carroceria = c.carroceria;
        if (c.capacidadeM3) dados.capacidade_m3 = c.capacidadeM3;
      }
      veiculosNovos.push(dados);
    }
  });
  if (veiculosNovos.length) await criarVeiculosEmLote(conn, veiculosNovos);
  return { motoristasCriados: criados.length, veiculosCriados: veiculosNovos.length };
}
