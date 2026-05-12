// src/components/SectionCard.jsx
import React from "react";

export default function SectionCard({ title, actions, children, style }) {
  return (
    <div style={{
      background:   "var(--card)",
      border:       "1px solid var(--border)",
      borderRadius: "var(--radius-card)",
      overflow:     "hidden",
      display:      "flex",
      flexDirection:"column",
      ...style,
    }}>
      <div style={{
        padding:        "10px var(--space-4)",
        borderBottom:   "1px solid var(--border)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        flexShrink:     0,
      }}>
        <span style={{
          fontSize:   "var(--text-sm)",
          fontWeight: "var(--fw-bold)",
          color:      "var(--text)",
          fontFamily: "var(--font-heading)",
        }}>
          {title}
        </span>
        {actions && (
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {actions}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
