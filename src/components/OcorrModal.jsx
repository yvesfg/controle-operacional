import React, { useState, useEffect } from "react";
import useModalEsc from "../hooks/useModalEsc.js";

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
  const [tipos, setTipos] = useState(new Set(["info"]));
  const [texto, setTexto] = useState("");
  const [nfsRec, setNfsRec] = useState(new Set());   // NFs from DT record (click to toggle)
  const [nfsManual, setNfsManual] = useState([]);     // Manually typed NF chips
  const [nfInput, setNfInput] = useState("");
  const [localizacao, setLocalizacao] = useState("");

  useEffect(() => {
    if (open) {
      setTipos(new Set(["info"]));
      setTexto("");
      setNfsRec(new Set());
      setNfsManual([]);
      setNfInput("");
      setLocalizacao("");
    }
  }, [open]);

  useModalEsc(open, onClose);

  if (!open) return null;

  const nfListRec = (dtRecord?.nf || "").split(/[,/]/).map(s => s.trim()).filter(Boolean);
  const hasNfTypes = [...tipos].some(k => TIPOS_COM_NF.has(k));
  const hasRod = tipos.has("rod");
  const primTipo = TIPOS.find(tp => tipos.has(tp.k)) || TIPOS[7]; // default info

  const toggleTipo = (k) => {
    setTipos(prev => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size === 1) return prev;
        next.delete(k);
      } else {
        next.add(k);
      }
      return next;
    });
  };

  const parseAndAddNfs = (raw) => {
    const parsed = raw.split(/[,/]/).map(s => s.trim()).filter(Boolean);
    setNfsManual(prev => {
      const existing = new Set([...prev, ...nfListRec]);
      const newOnes = parsed.filter(n => !existing.has(n));
      return [...prev, ...newOnes];
    });
    setNfInput("");
  };

  const allSelectedNfs = [...nfsRec, ...nfsManual];

  const handleSalvar = () => {
    if (!texto.trim()) return;
    onSave({
      tipo: [...tipos].join(", "),
      texto: texto.trim(),
      nfs: allSelectedNfs.length > 0 ? allSelectedNfs.join(", ") : undefined,
      localizacao: localizacao.trim() || undefined,
    });
  };

  return (
    <div
      className="co-modal-overlay co-modal-overlay--center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: t.bg2 || t.card || t.bg,
        border: `1px solid ${t.borda}`,
        borderRadius: 14,
        width: "100%",
        maxWidth: 460,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        maxHeight: "92vh",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "11px 14px 9px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${t.borda}`, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: t.txt, textTransform: "uppercase" }}>
              Nova Ocorrência
            </span>
            {dtRecord && (
              <span style={{
                padding: "2px 7px", borderRadius: 5,
                background: "rgba(22,119,255,0.12)", color: "#1677ff",
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              }}>DT {dtRecord.dt}</span>
            )}
            {tipos.size > 1 && (
              <span style={{
                padding: "2px 7px", borderRadius: 5,
                background: `${primTipo.cor}18`, color: primTipo.cor,
                fontSize: 10, fontWeight: 700,
              }}>{tipos.size} tipos</span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(128,128,128,.1)", border: "none", cursor: "pointer", color: t.txt2, padding: "4px 9px", lineHeight: 1, fontSize: 17, borderRadius: 6 }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "11px 14px", display: "flex", flexDirection: "column", gap: 11 }}>

          {/* Tipo — multi-select grid 5 colunas */}
          <div>
            <div style={{ fontSize: 9, color: t.txt2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Tipo <span style={{ color: t.txt2, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(selecione um ou mais)</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
              {TIPOS.map(tp => {
                const ativo = tipos.has(tp.k);
                return (
                  <button
                    key={tp.k}
                    onClick={() => toggleTipo(tp.k)}
                    style={{
                      padding: "5px 3px",
                      borderRadius: 6,
                      border: `1.5px solid ${ativo ? tp.cor : t.borda}`,
                      background: ativo ? `${tp.cor}20` : "transparent",
                      color: ativo ? tp.cor : t.txt2,
                      fontSize: 9,
                      fontWeight: ativo ? 700 : 400,
                      cursor: "pointer",
                      transition: "all 0.12s",
                      fontFamily: "inherit",
                      position: "relative",
                    }}
                  >
                    {ativo && (
                      <span style={{ position: "absolute", top: 2, right: 3, width: 5, height: 5, borderRadius: "50%", background: tp.cor }} />
                    )}
                    {tp.l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* NF section */}
          {hasNfTypes && (
            <div>
              <div style={{ fontSize: 9, color: t.txt2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                NFs Afetadas
              </div>
              {/* Input manual */}
              <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
                <input
                  value={nfInput}
                  onChange={e => setNfInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === "Enter" || e.key === "," || e.key === "/") && nfInput.trim()) {
                      e.preventDefault();
                      parseAndAddNfs(nfInput);
                    }
                  }}
                  onBlur={() => { if (nfInput.trim()) parseAndAddNfs(nfInput); }}
                  placeholder="Digite NF ou NF1, NF2 / NF3…"
                  style={{ ...css.inp, flex: 1, fontSize: 11, padding: "6px 9px" }}
                />
                {nfInput.trim() && (
                  <button
                    onClick={() => parseAndAddNfs(nfInput)}
                    style={{ padding: "6px 10px", borderRadius: 7, border: "none", background: "#1677ff", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >+</button>
                )}
              </div>
              {/* Chips: DT record NFs + manual */}
              {(nfListRec.length > 0 || nfsManual.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {nfListRec.map(nf => {
                    const sel = nfsRec.has(nf);
                    return (
                      <button
                        key={nf}
                        onClick={() => setNfsRec(prev => { const n = new Set(prev); n.has(nf) ? n.delete(nf) : n.add(nf); return n; })}
                        style={{
                          padding: "3px 9px", borderRadius: 5,
                          border: `1.5px solid ${sel ? "#f0b90b" : t.borda}`,
                          background: sel ? "rgba(240,185,11,0.13)" : "transparent",
                          color: sel ? "#f0b90b" : t.txt2,
                          fontSize: 10, fontWeight: sel ? 700 : 400,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >{nf}</button>
                    );
                  })}
                  {nfsManual.map(nf => (
                    <span
                      key={nf}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 6px 3px 9px", borderRadius: 5,
                        border: "1.5px solid #f0b90b",
                        background: "rgba(240,185,11,0.13)",
                        color: "#f0b90b", fontSize: 10, fontWeight: 700,
                      }}
                    >
                      {nf}
                      <button
                        onClick={() => setNfsManual(prev => prev.filter(n => n !== nf))}
                        style={{ background: "none", border: "none", color: "#f0b90b88", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0, fontWeight: 700 }}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ROD localização */}
          {hasRod && (
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

          {/* Textarea */}
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descreva a ocorrência..."
            rows={3}
            style={{
              ...css.inp,
              width: "100%",
              resize: "vertical",
              minHeight: 64,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "9px 14px 12px", borderTop: `1px solid ${t.borda}`, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: `1px solid ${t.borda}`, background: "transparent",
              color: t.txt2, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Cancelar</button>
          <button
            onClick={handleSalvar}
            disabled={!texto.trim()}
            style={{
              flex: 1, padding: "8px 14px", borderRadius: 8,
              border: "none",
              background: texto.trim() ? primTipo.cor : t.borda,
              color: texto.trim() ? "#fff" : t.txt2,
              fontSize: 11, fontWeight: 700,
              cursor: texto.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >Salvar Ocorrência</button>
        </div>
      </div>
    </div>
  );
}
