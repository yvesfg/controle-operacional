// src/components/StatusBadge.jsx
import React from "react";

const STATUS_MAP = {
  "no-prazo":    { label: "No prazo",    bg: "rgba(34,197,94,0.12)",   color: "#86efac", border: "rgba(34,197,94,0.22)"   },
  "aguardando":  { label: "Aguardando",  bg: "rgba(234,179,8,0.12)",   color: "#fde68a", border: "rgba(234,179,8,0.22)"   },
  "ro-pendente": { label: "RO Pendente", bg: "rgba(239,68,68,0.12)",   color: "#fca5a5", border: "rgba(239,68,68,0.22)"   },
  "em-transito": { label: "Em trânsito", bg: "rgba(79,70,229,0.12)",   color: "#a5b4fc", border: "rgba(79,70,229,0.22)"   },
  "encerrado":   { label: "Encerrado",   bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.10)" },
  "no-cliente":  { label: "No cliente",  bg: "rgba(234,179,8,0.12)",   color: "#fde68a", border: "rgba(234,179,8,0.22)"   },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? {
    label: status,
    bg: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.5)",
    border: "rgba(255,255,255,0.10)",
  };
  return (
    <span style={{
      background:   s.bg,
      color:        s.color,
      border:       `1px solid ${s.border}`,
      borderRadius: "20px",
      padding:      "2px 9px",
      fontSize:     "11px",
      fontWeight:   600,
      whiteSpace:   "nowrap",
      letterSpacing: "0.2px",
    }}>
      {s.label}
    </span>
  );
}
