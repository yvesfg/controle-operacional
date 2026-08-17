// ── faturamentoSheets.js ──
// Escrita de volta na planilha, via /api/sheets-write (proxy na Vercel → Web App
// do Apps Script). Ver o cabeçalho de api/sheets-write.js pro porquê da ordem
// "planilha primeiro, Supabase depois".

async function chamar(corpo) {
  const r = await fetch("/api/sheets-write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  let resposta = {};
  try { resposta = await r.json(); } catch { /* resposta sem JSON cai no erro abaixo */ }
  if (!r.ok || resposta.ok === false) {
    throw new Error(resposta.error || `Planilha respondeu HTTP ${r.status}`);
  }
  return resposta;
}

export function escreverFaturamentoNaPlanilha({ base, dt, aba, campos }) {
  return chamar({ base, dt, aba, campos }); // { ok, aba, linha, escritos:[], ignorados:[] }
}

// DT digitada na planilha agora mesmo: a rodada automática é de 15 em 15 min, e
// quem está contratando não pode esperar. Puxa SÓ essa linha pro Supabase.
export function sincronizarDTDaPlanilha({ base, dt }) {
  return chamar({ acao: "sincronizar_dt", base, dt }); // { ok, aba, linha, registro }
}
