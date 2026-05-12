// src/components/EmptyState.jsx
import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "var(--space-10) var(--space-6)",
      gap:            "var(--space-2)",
      textAlign:      "center",
    }}>
      {Icon && (
        <div style={{
          width:          "40px",
          height:         "40px",
          background:     "var(--card2)",
          borderRadius:   "var(--radius-tile)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          marginBottom:   "var(--space-2)",
        }}>
          <Icon size={20} color="var(--text2)" />
        </div>
      )}
      <div style={{
        fontSize:   "var(--text-md)",
        fontWeight: "var(--fw-semibold)",
        color:      "var(--text)",
        fontFamily: "var(--font-heading)",
      }}>
        {title}
      </div>
      {description && (
        <div style={{
          fontSize:  "var(--text-sm)",
          color:     "var(--text2)",
          maxWidth:  "280px",
          fontFamily:"var(--font-body)",
        }}>
          {description}
        </div>
      )}
      {action && (
        <div style={{ marginTop: "var(--space-3)" }}>{action}</div>
      )}
    </div>
  );
}
