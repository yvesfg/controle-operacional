import React, { useState, useEffect } from "react";

const TIPOS = [
  { k: "falta",       l: "Falta",        cor: "#f6465d" },
  { k: "avaria",      l: "Avaria",       cor: "#ff9800" },
  { k: "dev_total",   l: "Dev. Total",   cor: "#9c27b0" },
  { k: "dev_parcial", l: "Dev. Parcial", cor: "#e91e63" },
  { k: "desacordo",   l: "Desacordo",    cor: "#f0b90b" },
  { k: "rod",         l: "ROD",          cor: "#ef5350" },
  { k: "sobra",       l: "Sobra",        cor: "#00e096" },
  { k: "info",        l: "Info",         cor: "#1677ff" },
  { k: "alerta",      l: "Alerta",       cor: "#f6465d" },
  { k: "status",      l: "Status",       cor: "#02c076" },
];

const TIPOS_COM_NF = new Set(["falta", "avaria", "dev_total", "dev_parcial", "desacordo"]);

export default function OcorrModal({ open, onClose, onSave, dtRecord, t, hIco, css }) {
  const [tipo, setTipo] = useState("info");
  const [texto, setTexto] = useState("");
  const [nfs, setNfs] = useState(new Set());
  const [localizacao, setLocalizacao] = useState("");

  useEffect(() => {
    if (open) {
      setTipo("info");
      setTexto("");
      setNfs(new Set());
      setLocalizacao("");
    }
  }, [open]);

  if (!open) return null;

  const nfList = (dtRecord?.nf || "").split(",").map(s => s.trim()).filter(Boolean);

  const toggleNf = (nf) => {
    setNfs(prev => {
      const next = new Set(prev);
      if (next.has(nf)) next.delete(nf);
      else next.add(nf);
      return next;
    });
  };

  const handleSalvar = () => {
    if (!texto.trim()) return;
    onSave({
      tipo,
      texto: texto.trim(),
      nfs: nfs.size > 0 ? [...nfs].join(", ") : undefined,
      localizacao: localizacao.trim() || undefined,
    });
  };

  const tipoAtual = TIPOS.find(tp => tp.k === tipo) || TIPOS[0];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div style={{
        background: t.bg2 || t.bg,
        border: `1px solid ${t.borda}`,
        borderRadius: 14,
        width: "100%",
        maxWidth: 420,
        padding: "20px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: t.txt, textTransform: "uppercase" }}>
              Nova Ocorrência
            </span>
            {dtRecord && (
              <span style={{
                padding: "2px 8px", borderRadius: 5,
                background: "rgba(22,119,255,0.12)", color: "#1677ff",
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              }}>
                DT {dtRecord.dt}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: t.txt2, padding: 4, lineHeight: 1, fontSize: 18 }}
          >
            ×
          </button>
        </div>

        <div>
          <div style={{ fontSize: 9, color: t.txt2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Tipo
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {TIPOS.map(tp => {
              const ativo = tipo === tp.k;
              return (
                <button
                  key={tp.k}
                  onClick={() => setTipo(tp.k)}
                  style={{
                    padding: "6px 4px",
                    borderRadius: 7,
                    border: `1.5px solid ${ativo ? tp.cor : t.borda}`,
                    background: ativo ? `${tp.cor}22` : "transparent",
                    color: ativo ? tp.cor : t.txt2,
                    fontSize: 10,
                    fontWeight: ativo ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {tp.l}
                </button>
              );
            })}
          </div>
        </div>

        {TIPOS_COM_NF.has(tipo) && nfList.length > 0 && (
          <div>
            <div style={{ fontSize: 9, color: t.txt2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              NFs Afetadas
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {nfList.map(nf => {
                const sel = nfs.has(nf);
                return (
                  <button
                    key={nf}
                    onClick={() => toggleNf(nf)}
                    style={{
                      padding: "4px 10px", borderRadius: 6,
                      border: `1.5px solid ${sel ? "#f0b90b" : t.borda}`,
                      background: sel ? "rgba(240,185,11,0.10)" : t.bg,
                      color: sel ? "#f0b90b" : t.txt2,
                      fontSize: 10, fontWeight: sel ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {nf}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tipo === "rod" && (
          <div>
            <label style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: t.txt2, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Localização da Carga
            </label>
            <input
              value={localizacao}
              onChange={e => setLocalizacao(e.target.value)}
              placeholder="Ex: Em trânsito, SP – RJ km 210"
              style={css.inp}
            />
          </div>
        )}

        <div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descreva a ocorrência..."
            rows={3}
            style={{
              ...css.inp,
              width: "100%",
              resize: "vertical",
              minHeight: 72,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: `1px solid ${t.borda}`, background: "transparent",
              color: t.txt2, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!texto.trim()}
            style={{
              padding: "8px 18px", borderRadius: 8,
              border: "none",
              background: texto.trim() ? tipoAtual.cor : t.borda,
              color: texto.trim() ? "#fff" : t.txt2,
              fontSize: 11, fontWeight: 700,
              cursor: texto.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
