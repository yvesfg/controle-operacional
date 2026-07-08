import React from "react";

// Toggle — switch estilo iOS, controlado. Substitui checkboxes pelo app.
// Props: { checked, onChange, label, color, disabled, size }
//   onChange(novoValor) — recebe o boolean já invertido.
//   color — cor do trilho quando ligado (default: var(--accent)).

export default function Toggle({ checked, onChange, label, color, disabled, size = 1 }) {
  const W = 38 * size, H = 22 * size, K = (H - 4);
  const on = color || "var(--accent)";
  const sw = (
    <span
      role="switch"
      aria-checked={!!checked}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => { if (disabled) return; e.stopPropagation(); onChange?.(!checked); }}
      onKeyDown={(e) => { if (disabled) return; if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange?.(!checked); } }}
      style={{
        position: "relative", display: "inline-block", width: W, height: H, flexShrink: 0,
        borderRadius: H, background: checked ? on : "var(--border2)",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        transition: "background .2s ease", verticalAlign: "middle",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: checked ? W - K - 2 : 2, width: K, height: K,
        borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)",
        transition: "left .2s cubic-bezier(.22,1,.36,1)",
      }} />
    </span>
  );
  if (!label) return sw;
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: disabled ? "not-allowed" : "pointer" }}
      onClick={(e) => e.preventDefault()}>
      {sw}
      <span style={{ userSelect: "none" }}>{label}</span>
    </label>
  );
}
