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
  "destino", "data_carr", "data_agenda", "vl_cte", "vl_contrato", "adiant",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido" });
    return;
  }

  const { base, dt, aba, campos } = req.body || {};
  if (!dt || typeof dt !== "string") {
    res.status(400).json({ ok: false, error: "DT obrigatório" });
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
      body: JSON.stringify({ token: process.env.SHEETS_WEBAPP_TOKEN || "", dt, aba: aba || "", campos: limpos }),
      redirect: "follow",
    });
    const texto = await r.text();
    let corpo;
    try { corpo = JSON.parse(texto); }
    catch { corpo = { ok: false, error: "Resposta inesperada do Apps Script: " + texto.slice(0, 200) }; }
    res.status(r.ok && corpo.ok ? 200 : 502).json(corpo);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || "Falha ao falar com a planilha" });
  }
}
