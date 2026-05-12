// src/components/BottomNav.jsx
import React from "react";

const TABS = [
  { id: "dashboard",    label: "Home"        },
  { id: "planilha",     label: "Planilha"    },
  { id: "ocorrencias",  label: "Ocorrências" },
  { id: "motoristas",   label: "Motoristas"  },
  { id: "mais",         label: "Mais"        },
];

export default function BottomNav({ activeTab, onNavigate }) {
  return (
    <nav className="co-bottom-nav">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            "4px",
              background:     "transparent",
              border:         "none",
              cursor:         "pointer",
              padding:        "8px 4px",
              color:          isActive ? "var(--accent)" : "var(--text2)",
              fontFamily:     "var(--font-body)",
              fontSize:       "var(--text-2xs)",
              fontWeight:     isActive ? "var(--fw-bold)" : "var(--fw-normal)",
              flex:           1,
            }}
          >
            <div style={{
              width:        "20px",
              height:       "20px",
              background:   isActive ? "rgba(245,197,58,.15)" : "transparent",
              borderRadius: "var(--radius-btn)",
              transition:   "background var(--transition-fast)",
            }} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
