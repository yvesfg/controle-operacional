// src/components/KpiCard.jsx
// Tile de indicador único usado em todos os dashboards do app (Dashboard, Relatórios,
// Painel Financeiro, etc). Mudar aqui propaga para todos — não duplicar este markup.
import React from "react";
import { clickable } from "../utils.js";

export default function KpiCard({
  label,
  value,
  sub,
  color,
  danger = false,
  icon,
  onClick,
  compact = false,
}) {
  return (
    <div
      {...clickable(onClick)}
      style={{
        position:     "relative",
        background:   danger ? "color-mix(in srgb, var(--red) 5%, var(--card))" : "var(--card)",
        border:       danger ? "1.5px solid color-mix(in srgb, var(--red) 45%, transparent)" : "1px solid var(--border)",
        borderRadius: compact ? 8 : "var(--radius-card)",
        padding:      compact ? "14px" : "16px 18px",
        cursor:       onClick ? "pointer" : "default",
        transition:   "border-color .15s",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = danger ? "var(--red)" : "var(--border2)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = danger ? "color-mix(in srgb, var(--red) 45%, transparent)" : "var(--border)")}
    >
      {icon && (
        <div style={{ position: "absolute", top: 10, right: 10, opacity: 0.5 }}>
          {icon}
        </div>
      )}
      <div style={{
        fontFamily:    "var(--font-mono)",
        fontSize:      compact ? 10 : 11,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color:         "var(--text3)",
        fontWeight:    400,
        lineHeight:    1.4,
        paddingRight:  icon ? 20 : 0,
        marginBottom:  compact ? 3 : 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily:    "var(--font-heading)",
        fontSize:      compact ? 18 : 28,
        fontWeight:    700,
        letterSpacing: "-0.04em",
        color:         danger ? "var(--red)" : (color || "var(--text)"),
        lineHeight:    1,
        marginBottom:  2,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: compact ? 10 : 12, color: "var(--text2)", lineHeight: 1.3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
