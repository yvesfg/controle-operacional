// src/components/StatusBadge.jsx
import React from "react";

const STATUS_MAP = {
  "no-prazo":    { label: "No prazo",    color: "var(--green)",  bg: "rgba(14,203,129,.1)"  },
  "aguardando":  { label: "Aguardando",  color: "var(--accent)", bg: "rgba(245,197,58,.1)"  },
  "ro-pendente": { label: "RO Pendente", color: "var(--red)",    bg: "rgba(246,70,93,.1)"   },
  "em-transito": { label: "Em trânsito", color: "var(--cyan)",   bg: "rgba(45,189,182,.1)"  },
  "encerrado":   { label: "Encerrado",   color: "var(--text2)",  bg: "var(--card2)"         },
  "no-cliente":  { label: "No cliente",  color: "var(--accent)", bg: "rgba(245,197,58,.1)"  },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "var(--text2)", bg: "var(--card2)" };
  return (
    <span style={{
      background:    s.bg,
      color:         s.color,
      borderRadius:  "var(--radius-badge)",
      padding:       "3px 10px",
      fontSize:      "var(--text-2xs)",
      fontWeight:    "var(--fw-bold)",
      whiteSpace:    "nowrap",
      fontFamily:    "var(--font-body)",
    }}>
      {s.label}
    </span>
  );
}
