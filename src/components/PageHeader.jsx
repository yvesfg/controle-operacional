// src/components/PageHeader.jsx
import React from "react";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      marginBottom:   "var(--space-4)",
    }}>
      <div>
        <div style={{
          fontSize:   "var(--text-lg)",
          fontWeight: "var(--fw-bold)",
          color:      "var(--text)",
          fontFamily: "var(--font-heading)",
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize:  "var(--text-xs)",
            color:     "var(--text2)",
            marginTop: "2px",
            fontFamily:"var(--font-body)",
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
