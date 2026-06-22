// ─────────────────────────────────────────────────────────
//  Cliente da camada de IA para a foto da NFD.
//  Reduz a imagem (rápido + cabe no limite de body da Vercel) e
//  chama a função serverless /api/analyze-nfd. Retorna as sugestões.
// ─────────────────────────────────────────────────────────

export async function analyzeNfdFoto(dataUrl) {
  const small = await downscale(dataUrl, 1600, 0.8);
  const r = await fetch("/api/analyze-nfd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: small, mimeType: "image/jpeg" }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return r.json();
}

// Redimensiona via canvas mantendo proporção e exporta JPEG.
function downscale(dataUrl, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    img.src = dataUrl;
  });
}
