// ─────────────────────────────────────────────────────────
//  WRITE-BACK PRA PLANILHA — proxy do Web App do Apps Script.
//
//  Por que existe: a sincronização é planilha → Supabase e sobrescreve por DT a
//  cada 15 min. Se o app gravasse só no Supabase, a rodada seguinte apagaria o
//  que foi preenchido aqui (célula vazia vira '' no upsert). Então quem preenche
//  faturamento pelo app escreve PRIMEIRO na planilha; o Supabase vem depois.
//
//  Por que proxy e não chamar o Web App direto do browser: o token do Web App
//  ficaria exposto no bundle, e o Apps Script responde com redirect + sem CORS.
//  Aqui é server-to-server e o browser nunca vê o token.
//
//  Envs (Vercel → Settings → Environment Variables):
//    SHEETS_WEBAPP_URL_IMPERATRIZ_BELEM   URL do Web App implantado na planilha
//    SHEETS_WEBAPP_URL_MARACANAU          (uma por base; a base vai no corpo)
//    SHEETS_WEBAPP_URL_ACAILANDIA_AVB
//    SHEETS_WEBAPP_URL                    (opcional) usada quando não há a da base
//    SHEETS_WEBAPP_TOKEN                  igual ao WEBAPP_TOKEN do .gs
// ─────────────────────────────────────────────────────────

// Campos dos dois blocos colados (faturamento + contratação). Whitelist existe
// pra este endpoint não virar porta genérica de escrita na planilha — quem manda
// no que a tela oferece é BLOCOS em src/faturamentoParse.js.
const CAMPOS_PERMITIDOS = [
  // faturamento
  "cte", "mdf", "mat", "nf", "cliente", "data_manifesto",
  // contratação
  "id_doc", "nome", "cpf", "telefone", "placa", "placa2", "placa3",
  "origem", "destino", "data_carr", "data_agenda", "vl_cte", "vl_contrato", "adiant",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido" });
    return;
  }

  const { base, dt, aba, campos, acao } = req.body || {};
  // "ping" confere URL, token e a versão do código publicado no Apps Script.
  if (acao === "ping") {
    await encaminhar(res, { base, corpo: { acao } });
    return;
  }
  if (!dt || typeof dt !== "string") {
    res.status(400).json({ ok: false, error: "DT obrigatório" });
    return;
  }
  // "inspecionar_dt" só lê: em que aba/linha o DT está e quais cabeçalhos daquela
  // aba o mapeamento não reconheceu.
  if (acao === "inspecionar_dt") {
    await encaminhar(res, { base, corpo: { acao, dt } });
    return;
  }
  // acao "sincronizar_dt": puxa a linha da planilha pro Supabase na hora, para a
  // DT recém-digitada que a rodada de 15 min ainda não trouxe. Não escreve nada
  // na planilha, então não passa pela whitelist de campos.
  if (acao === "sincronizar_dt") {
    await encaminhar(res, { base, corpo: { acao, dt } });
    return;
  }
  // Só os campos de faturamento passam: este endpoint não é uma porta genérica
  // de escrita na planilha.
  const limpos = {};
  for (const k of CAMPOS_PERMITIDOS) {
    const v = campos?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") limpos[k] = String(v).trim();
  }
  if (!Object.keys(limpos).length) {
    res.status(400).json({ ok: false, error: "Nenhum campo de faturamento no pedido" });
    return;
  }

  await encaminhar(res, { base, corpo: { dt, aba: aba || "", campos: limpos } });
}

// Lê a página HTML que o Google devolveu e diz o que ela realmente significa.
function diagnosticarHtml(html, url) {
  const semTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const urlCurta = url.replace(/\/[^/]*$/, "/…");

  // Página de erro do Apps Script: o script executou e lançou exceção. A mensagem
  // fica no <body> (procurar por "errorMessage" cai no bloco <style> da página).
  const corpo = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
  const textoCorpo = corpo ? semTags(corpo[1]).replace(/&quot;/g, '"') : "";
  if (textoCorpo && textoCorpo.length < 400 && /(Error|Erro|linha \d+|exce)/i.test(textoCorpo)) {
    return `O Apps Script executou e falhou: ${textoCorpo}. Corrija no editor e publique NOVA VERSÃO da MESMA implantação (implantação nova gera outra URL, e a Vercel continuaria chamando a antiga).`;
  }
  // Página de login/consentimento: o pedido não chegou ao script.
  if (/ServiceLogin|accounts\.google\.com|Fazer login|Sign in/i.test(html)) {
    return `O Google pediu login em vez de responder. Na implantação: "Quem pode acessar" = Qualquer pessoa, e a URL tem de terminar em /exec (a /dev exige estar logado). URL usada: ${urlCurta}`;
  }
  return `Resposta inesperada do Apps Script (${urlCurta}): ${semTags(html).slice(0, 200)}`;
}

// Encaminha pro Web App do Apps Script da base, com o token que só existe aqui.
async function encaminhar(res, { base, corpo }) {
  const chaveBase = String(base || "").toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const url = process.env[`SHEETS_WEBAPP_URL_${chaveBase}`] || process.env.SHEETS_WEBAPP_URL;
  if (!url) {
    res.status(501).json({ ok: false, error: `Write-back não configurado para a base "${base || "?"}" (falta SHEETS_WEBAPP_URL_${chaveBase} na Vercel)` });
    return;
  }
  try {
    // text/plain evita preflight/CORS no Apps Script; o corpo continua sendo JSON.
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: process.env.SHEETS_WEBAPP_TOKEN || "", ...corpo }),
      redirect: "follow",
    });
    const texto = await r.text();
    let resposta;
    try { resposta = JSON.parse(texto); }
    catch {
      // HTML pode ser DUAS coisas bem diferentes: a página de login (o pedido nem
      // chegou ao script) ou a página de erro do próprio Apps Script (o script
      // rodou e quebrou). A segunda traz a mensagem e a LINHA do erro — que é o
      // que resolve o problema. Sem extrair isso, o 502 não dizia nada.
      resposta = { ok: false, error: diagnosticarHtml(texto, url) };
    }
    res.status(r.ok && resposta.ok ? 200 : 502).json(resposta);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || "Falha ao falar com a planilha" });
  }
}
