// ── Toast.jsx — gerado automaticamente ──
import React from 'react';
import { themes } from '../constants.js';

export default function Toast({ msg, type, visible }) {
  const t = themes.dark;
  const colors = { ok: t.verde, warn: t.ouro, err: t.danger, "": t.ouro };
  return (
    <div style={{
      position:"fixed",bottom:24,left:"50%",
      transform:`translateX(-50%) translateY(${visible?0:110}px)`,
      background:t.card,border:`1px solid ${colors[type]||t.ouro}`,borderRadius:12,
      padding:"10px 18px",fontSize:13,color:colors[type]||t.ouro,fontWeight:600,
      zIndex:9999,transition:"transform .3s cubic-bezier(.34,1.56,.64,1)",
      whiteSpace:"nowrap",pointerEvents:"none",backdropFilter:"blur(12px)",
      boxShadow:`0 8px 32px ${t.shadow}`,
    }}>{msg}</div>
  );
}
