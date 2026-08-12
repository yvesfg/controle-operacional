// ── faturamentoSheets.js ──
// Escrita de volta na planilha, via /api/sheets-write (proxy na Vercel → Web App
// do Apps Script). Ver o cabeçalho de api/sheets-write.js pro porquê da ordem
// "planilha primeiro, Supabase depois".

export async function escreverFaturamentoNaPlanilha({ base, dt, aba, campos }) {
  const r = await fetch("/api/sheets-write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base, dt, aba, campos }),
  });
  let corpo = {};
  try { corpo = await r.json(); } catch { /* resposta sem JSON cai no erro abaixo */ }
  if (!r.ok || corpo.ok === false) {
    throw new Error(corpo.error || `Planilha respondeu HTTP ${r.status}`);
  }
  return corpo; // { ok, aba, linha, escritos:[], ignorados:[] }
}
