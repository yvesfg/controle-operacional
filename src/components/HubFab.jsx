import React, { useEffect, useRef, useState } from "react";

// Botão flutuante discreto e arrastável para voltar ao Hub.
// - Arrasta com mouse/toque (pointer events); posição salva em localStorage.
// - Distingue clique de arraste por limiar de movimento (não dispara onClick ao arrastar).
const POS_KEY = "co_hub_fab_pos";
const DRAG_THRESHOLD = 5; // px

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function loadPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY));
    if (p && typeof p.x === "number" && typeof p.y === "number") return p;
  } catch {}
  return null;
}

export default function HubFab({ t, hIco, onClick }) {
  const SIZE = 44;
  const [pos, setPos] = useState(() => loadPos());
  const [hover, setHover] = useState(false);
  const dragRef = useRef({ active: false, moved: false, dx: 0, dy: 0 });

  // Posição inicial (default: borda direita, vertical centralizado) — só no mount/resize sem pos salva
  useEffect(() => {
    if (pos) return;
    const x = window.innerWidth - SIZE - 16;
    const y = Math.round(window.innerHeight * 0.5 - SIZE / 2);
    setPos({ x, y });
  }, []); // eslint-disable-line

  // Mantém dentro da viewport ao redimensionar
  useEffect(() => {
    const onResize = () => setPos(p => p ? {
      x: clamp(p.x, 8, window.innerWidth - SIZE - 8),
      y: clamp(p.y, 8, window.innerHeight - SIZE - 8),
    } : p);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_THRESHOLD) d.moved = true;
    if (!d.moved) return;
    setPos({
      x: clamp(e.clientX - d.dx, 8, window.innerWidth - SIZE - 8),
      y: clamp(e.clientY - d.dy, 8, window.innerHeight - SIZE - 8),
    });
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    if (d.active) {
      if (!d.moved) onClick?.();
      else { try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch {} }
    }
    dragRef.current = { active: false, moved: false, dx: 0, dy: 0 };
  };

  if (!pos) return null;

  return (
    <button
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Voltar ao Hub (arraste para mover)"
      style={{
        position: "fixed", left: pos.x, top: pos.y, zIndex: 195,
        height: SIZE, width: hover ? "auto" : SIZE, minWidth: SIZE,
        padding: hover ? "0 16px 0 12px" : 0,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        borderRadius: SIZE / 2, cursor: "grab", touchAction: "none",
        background: hover ? t.card : "rgba(20,24,29,.55)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        border: `1px solid ${hover ? t.borda : "rgba(255,255,255,.12)"}`,
        boxShadow: "0 6px 20px rgba(0,0,0,.35)",
        opacity: hover ? 1 : 0.65,
        transition: "opacity .18s, background .18s, border-color .18s, width .18s, padding .18s",
        color: t.txt2, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
      }}
    >
      {hIco(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>, t.txt2, 17, 2)}
      {hover && <span style={{ whiteSpace: "nowrap" }}>Hub</span>}
    </button>
  );
}
