import React from "react";

// Tabs fixadas no bottom bar (por prioridade); o resto fica no drawer "Mais"
const PINNED = ["dashboard", "planilha", "ocorrencias", "motoristas"];

// Ícone SVG do "Mais" (grid 2x2)
const IcoMais = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke={active ? "var(--accent)" : "var(--text2)"} strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8"  cy="8"  r="2"/><circle cx="16" cy="8"  r="2"/>
    <circle cx="8"  cy="16" r="2"/><circle cx="16" cy="16" r="2"/>
  </svg>
);

export default function BottomNav({ tabs, activeTab, onNavigate, onMore }) {
  // Pega as tabs pinadas que existem (respeitando permissões)
  const tabMap = Object.fromEntries((tabs || []).map(t => [t.k, t]));
  const pinned = PINNED.map(k => tabMap[k]).filter(Boolean);

  // Se alguma tab ativa não está nas pinadas, destaca "Mais"
  const maisActive = !pinned.some(t => t.k === activeTab);

  return (
    <nav className="co-mobile-nav">
      {pinned.map(tb => {
        const isActive = activeTab === tb.k;
        return (
          <button
            key={tb.k}
            className={`co-mobile-nav__item${isActive ? " co-mobile-nav__item--active" : ""}`}
            onClick={() => onNavigate(tb.k)}
          >
            {typeof tb.ico === "function"
              ? tb.ico(isActive)
              : <span style={{ fontSize: 18 }}>{tb.ico}</span>
            }
            <span className="co-mobile-nav__lbl">{tb.l}</span>
          </button>
        );
      })}
      <button
        className={`co-mobile-nav__item${maisActive ? " co-mobile-nav__item--active" : ""}`}
        onClick={onMore}
      >
        <IcoMais active={maisActive} />
        <span className="co-mobile-nav__lbl">Mais</span>
      </button>
    </nav>
  );
}
