// src/components/DataRow.jsx
import React from "react";

export default function DataRow({
  leading,
  title,
  meta,
  trailing,
  action,
  onClick,
  noBorder = false,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "var(--space-3)",
        padding:       "10px var(--space-4)",
        borderBottom:  noBorder ? "none" : "1px solid var(--card2)",
        cursor:        onClick ? "pointer" : "default",
      }}
    >
      {leading && (
        <div style={{ flexShrink: 0 }}>{leading}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:     "var(--text-sm)",
          fontWeight:   "var(--fw-semibold)",
          color:        "var(--text)",
          whiteSpace:   "nowrap",
          overflow:     "hidden",
          textOverflow: "ellipsis",
          fontFamily:   "var(--font-body)",
        }}>
          {title}
        </div>
        {meta && (
          <div style={{
            fontSize:  "var(--text-xs)",
            color:     "var(--text2)",
            marginTop: "2px",
            fontFamily: "var(--font-body)",
          }}>
            {meta}
          </div>
        )}
      </div>
      {trailing && (
        <div style={{ flexShrink: 0 }}>{trailing}</div>
      )}
      {action && (
        <div style={{ flexShrink: 0 }}>{action}</div>
      )}
    </div>
  );
}
