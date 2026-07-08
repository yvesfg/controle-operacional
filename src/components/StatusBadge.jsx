// src/components/StatusBadge.jsx
import React from "react";

const STATUS_MAP = {
  "no-prazo":    { label: "No prazo",    bg: "#047857", color: "#ffffff", border: "#047857" },
  "aguardando":  { label: "Aguardando",  bg: "#b45309", color: "#ffffff", border: "#b45309" },
  "ro-pendente": { label: "RO Pendente", bg: "#dc2626", color: "#ffffff", border: "#dc2626" },
  "em-transito": { label: "Em trânsito", bg: "#4f46e5", color: "#ffffff", border: "#4f46e5" },
  "encerrado":   { label: "Encerrado",   bg: "#3a424c", color: "#eaecef", border: "#3a424c" },
  "no-cliente":  { label: "No cliente",  bg: "#b45309", color: "#ffffff", border: "#b45309" },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? {
    label: status,
    bg: "#3a424c",
    color: "#eaecef",
    border: "#3a424c",
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
