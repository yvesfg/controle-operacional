// src/components/StatusBadge.jsx
import React from "react";

const STATUS_MAP = {
  "no-prazo":    { label: "No prazo",    bg: "var(--chip-solid-success)", color: "var(--color-text-inverse)", border: "var(--chip-solid-success)" },
  "aguardando":  { label: "Aguardando",  bg: "var(--chip-solid-warning)", color: "var(--color-text-inverse)", border: "var(--chip-solid-warning)" },
  "ro-pendente": { label: "RO Pendente", bg: "var(--chip-solid-danger)",  color: "var(--color-text-inverse)", border: "var(--chip-solid-danger)" },
  "em-transito": { label: "Em trânsito", bg: "var(--chip-solid-indigo)",  color: "var(--color-text-inverse)", border: "var(--chip-solid-indigo)" },
  "encerrado":   { label: "Encerrado",   bg: "var(--chip-solid-neutral)", color: "var(--color-text)", border: "var(--chip-solid-neutral)" },
  "no-cliente":  { label: "No cliente",  bg: "var(--chip-solid-warning)", color: "var(--color-text-inverse)", border: "var(--chip-solid-warning)" },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? {
    label: status,
    bg: "var(--chip-solid-neutral)",
    color: "var(--color-text)",
    border: "var(--chip-solid-neutral)",
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
