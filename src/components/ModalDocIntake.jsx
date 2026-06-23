import React, { useState, useRef } from "react";
import Toggle from "./Toggle.jsx";

// ─── Configuração por tipo de documento ───────────────────────────
const DOC_CONFIGS = {
  crlv: {
    title: "CRLV — Documento do Veículo",
    color: "var(--color-info)",
    accept: "image/*,.pdf",
    fields: [
      { key: "placa",             label: "Placa",              span: 1, placeholder: "ABC1D23" },
      { key: "renavam",           label: "RENAVAM",            span: 1, placeholder: "Somente dígitos" },
      { key: "nome_proprietario", label: "Proprietário",        span: 2, placeholder: "Nome completo" },
      { key: "cpf_cnpj",         label: "CPF/CNPJ do Prop.",   span: 1, placeholder: "Somente dígitos" },
      { key: "chassi",           label: "Chassi",              span: 1, placeholder: "VIN" },
      { key: "marca_modelo",     label: "Marca/Modelo",         span: 1, placeholder: "Ex: VW/17.230" },
      { key: "ano",              label: "Ano Fab./Mod.",        span: 1, placeholder: "2020/2021" },
    ],
  },
};

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function downscaleImage(dataUrl, maxPx = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * s);
      const h = Math.round(img.height * s);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    img.src = dataUrl;
  });
}

// ─── Componente ───────────────────────────────────────────────────
// Props:
//   open      boolean
//   tipo      "crlv" | ...  (deve existir em DOC_CONFIGS)
//   onClose   () => void
//   onConfirm (data) => void
//   ctx       { t, css, hIco, showToast }
export default function ModalDocIntake({ open, tipo, onClose, onConfirm, ctx }) {
  const { t, css, hIco, showToast } = ctx;
  const cfg = DOC_CONFIGS[tipo];

  const [file, setFile]               = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [isPdf, setIsPdf]             = useState(false);
  const [step, setStep]               = useState("upload"); // upload | extracting | review
  const [form, setForm]               = useState({});
  const [confianca, setConfianca]     = useState(null);
  const [mesmoProp, setMesmoProp]     = useState(true);  // toggle RNTRC
  const [cpfRntrc, setCpfRntrc]       = useState("");
  const inputRef = useRef(null);

  if (!open || !cfg) return null;

  const col = cfg.color; // CSS custom property string

  function reset() {
    setFile(null); setPreviewUrl(null); setIsPdf(false);
    setStep("upload"); setForm({}); setConfianca(null);
    setMesmoProp(true); setCpfRntrc("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    if (f.size > 10 * 1024 * 1024) {
      showToast("⚠️ Arquivo muito grande — máx. 10 MB", "warn");
      return;
    }
    const pdf = f.type === "application/pdf";
    setFile(f);
    setIsPdf(pdf);
    setPreviewUrl(pdf ? null : await toBase64(f));
  }

  async function handleExtract() {
    if (!file) return;
    setStep("extracting");
    try {
      const imageData = isPdf ? await toBase64(file) : await downscaleImage(previewUrl);
      const r = await fetch("/api/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: tipo, image: imageData }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const data = await r.json();
      const init = {};
      cfg.fields.forEach(fl => { init[fl.key] = data[fl.key] || ""; });
      setForm(init);
      setConfianca(typeof data.confianca === "number" ? data.confianca : null);
      setStep("review");
    } catch (e) {
      showToast("⚠️ IA: " + e.message, "warn");
      setStep("upload");
    }
  }

  function handleConfirm() {
    const result = { ...form };
    if (tipo === "crlv") {
      result.rntrc = {
        mesmo_do_crlv: mesmoProp,
        cpf_cnpj_rntrc: mesmoProp ? (form.cpf_cnpj || "") : cpfRntrc,
      };
    }
    onConfirm(result);
    reset();
  }

  const mix = (pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;

  return (
    <div className="co-modal-overlay co-modal-overlay--center" onClick={handleClose}>
      <div
        style={{
          background: t.card, borderRadius: 18, padding: 20, width: "100%", maxWidth: 440,
          border: `1.5px solid ${mix(35)}`,
          boxShadow: "0 24px 64px rgba(0,0,0,.6)", maxHeight: "90vh", overflowY: "auto",
          animation: "slideUp .22s cubic-bezier(.34,1.1,.64,1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: mix(12), border: `1.5px solid ${mix(35)}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {hIco(<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>, col, 20, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.txt, letterSpacing: .3 }}>{cfg.title}</div>
            <div style={{ fontSize: 10, color: col, fontWeight: 600 }}>
              {step === "upload"     && "Envie uma foto ou PDF do documento"}
              {step === "extracting" && "Extraindo dados com IA…"}
              {step === "review"     && "✨ IA sugeriu — confira e edite se necessário"}
            </div>
          </div>
          <button onClick={handleClose} style={{ background: "transparent", border: "none", color: t.txt2, cursor: "pointer", padding: 4 }}>
            {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, t.txt2, 18, 1.8)}
          </button>
        </div>

        {/* ── STEP: upload ── */}
        {step === "upload" && (
          <>
            <input ref={inputRef} type="file" accept={cfg.accept} style={{ display: "none" }} onChange={handleFileChange} />
            {!file ? (
              <button
                onClick={() => inputRef.current?.click()}
                style={{
                  width: "100%", padding: "32px 16px", borderRadius: 12, cursor: "pointer",
                  border: `2px dashed ${mix(40)}`, background: mix(6),
                  color: t.txt2, fontSize: 13, fontFamily: "inherit",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}
              >
                {hIco(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>, col, 28, 2)}
                <span style={{ fontWeight: 700, color: col }}>Selecionar arquivo</span>
                <span style={{ fontSize: 11 }}>Foto (JPG, PNG) ou PDF · máx. 10 MB</span>
              </button>
            ) : (
              <>
                {!isPdf && previewUrl && (
                  <img src={previewUrl} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 10, border: `1.5px solid ${t.borda}`, marginBottom: 8 }} />
                )}
                {isPdf && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${t.borda}`, marginBottom: 8, background: t.card2 }}>
                    {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>, t.danger, 24, 2)}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.txt }}>{file.name}</div>
                      <div style={{ fontSize: 10, color: t.txt2 }}>{(file.size / 1024 / 1024).toFixed(1)} MB · PDF</div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setFile(null); setPreviewUrl(null); setIsPdf(false); inputRef.current?.click(); }}
                    style={{ flex: 1, padding: "8px", borderRadius: 9, border: `1.5px solid ${t.borda}`, background: "transparent", color: t.txt2, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Trocar arquivo
                  </button>
                  <button
                    onClick={handleExtract}
                    style={{
                      flex: 2, padding: "8px 12px", borderRadius: 9, fontFamily: "inherit",
                      border: `1.5px solid ${mix(50)}`, background: mix(10),
                      color: col, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    {hIco(<><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934a8.5 8.5 0 1 0-.122 2.187"/><path d="M20 4v4h-4"/></>, col, 14, 2)}
                    Analisar com IA
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── STEP: extracting ── */}
        {step === "extracting" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: `3px solid ${mix(20)}`, borderTopColor: col,
              animation: "spin .8s linear infinite",
            }} />
            <div style={{ fontSize: 13, color: t.txt2, fontWeight: 500 }}>Gemini está lendo o documento…</div>
          </div>
        )}

        {/* ── STEP: review ── */}
        {step === "review" && (
          <>
            {confianca !== null && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 12,
                padding: "4px 10px", borderRadius: 20,
                background: confianca >= 0.8 ? "rgba(5,150,105,.12)" : "rgba(217,119,6,.12)",
                border: `1px solid ${confianca >= 0.8 ? "rgba(5,150,105,.3)" : "rgba(217,119,6,.3)"}`,
                color: confianca >= 0.8 ? t.verde : t.warn,
                fontSize: 10, fontWeight: 700,
              }}>
                ✨ Confiança: {Math.round(confianca * 100)}%
                {confianca < 0.8 && " — revise com atenção"}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {cfg.fields.map(fl => (
                <div key={fl.key} style={{ gridColumn: `span ${fl.span || 1}` }}>
                  <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: t.txt2, display: "block", marginBottom: 3 }}>
                    {fl.label}
                  </label>
                  <input
                    value={form[fl.key] || ""}
                    onChange={e => setForm(p => ({ ...p, [fl.key]: e.target.value }))}
                    placeholder={fl.placeholder}
                    style={{ ...css.inp, fontSize: 12, padding: "8px 10px" }}
                  />
                </div>
              ))}
            </div>

            {/* CRLV extra: toggle proprietário RNTRC */}
            {tipo === "crlv" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  borderRadius: 9, border: `1px solid ${t.borda}`, cursor: "pointer", userSelect: "none",
                }}>
                  <Toggle checked={mesmoProp} color="var(--color-info)" onChange={setMesmoProp} />
                  <span style={{ fontSize: 11, color: mesmoProp ? "var(--color-info)" : t.txt2, fontWeight: mesmoProp ? 700 : 400 }}>
                    Proprietário do CRLV é o mesmo da RNTRC
                  </span>
                </label>
                {!mesmoProp && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: t.txt2, display: "block", marginBottom: 3 }}>
                      CPF/CNPJ da RNTRC
                    </label>
                    <input
                      value={cpfRntrc}
                      onChange={e => setCpfRntrc(e.target.value)}
                      placeholder="Somente dígitos"
                      style={{ ...css.inp, fontSize: 12, padding: "8px 10px" }}
                    />
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleClose}
                style={{ flex: 1, background: "rgba(128,128,128,.08)", border: `1.5px solid ${t.borda}`, borderRadius: 9, padding: 10, color: t.txt2, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 2, borderRadius: 9, padding: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  border: `1.5px solid ${mix(50)}`, background: mix(15), color: col,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {hIco(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>, col, 14, 2)}
                Confirmar dados
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
