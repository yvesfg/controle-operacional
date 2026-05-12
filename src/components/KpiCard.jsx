// src/components/KpiCard.jsx
import React from "react";

const DELTA_COLORS = {
  green:   "var(--green)",
  red:     "var(--red)",
  neutral: "var(--text2)",
};

export default function KpiCard({
  label,
  value,
  delta,
  deltaColor = "neutral",
  accent = false,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background:    "var(--card)",
        border:        accent
          ? "1px solid rgba(245,197,58,.35)"
          : "1px solid var(--border)",
        borderRadius:  "var(--radius-card)",
        padding:       "var(--card-p-sm)",
        cursor:        onClick ? "pointer" : "default",
      }}
    >
      <div style={{
        fontSize:      "var(--text-2xs)",
        fontWeight:    "var(--fw-bold)",
        color:         "var(--text2)",
        textTransform: "uppercase",
        letterSpacing: "var(--ls-label)",
        marginBottom:  "var(--space-1)",
        fontFamily:    "var(--font-body)",
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   "var(--text-3xl)",
        fontWeight: "var(--fw-bold)",
        color:      accent ? "var(--accent)" : "var(--text)",
        lineHeight: "var(--leading-tight)",
        fontFamily: "var(--font-heading)",
      }}>
        {value}
      </div>
      {delta && (
        <div style={{
          fontSize:   "var(--text-xs)",
          color:      DELTA_COLORS[deltaColor] ?? DELTA_COLORS.neutral,
          marginTop:  "var(--space-1)",
          fontFamily: "var(--font-body)",
        }}>
          {delta}
        </div>
      )}
    </div>
  );
}
