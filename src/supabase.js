// ── supabase.js — gerado automaticamente ──

export async function supaFetch(url, key, method, path, body) {
  if (!url || !key) throw new Error("Sem conexão configurada");
  const u = url.replace(/\/$/,"")+"/rest/v1/"+path;
  const h = {"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Prefer":method==="POST"?"return=representation,resolution=merge-duplicates":"return=representation"};
  const r = await fetch(u, {method, headers:h, ...(body?{body:JSON.stringify(body)}:{})});
  if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0,200)}`); }
  const ct = r.headers.get("content-type");
  return ct?.includes("json") ? r.json() : null;
}
