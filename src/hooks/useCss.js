import { DESIGN, hexRgb } from "../constants.js";

export function useCss(t) {
  const statusBorderColor = (tipo) => {
    if(tipo==="sem_diaria"||tipo==="ok") return t.verde;
    if(tipo==="diaria"||tipo==="atraso") return t.danger;
    if(tipo==="pendente") return t.ouro;
    return t.borda;
  };

  const css = {
    app:       { minHeight:"100vh", background:t.bg, color:t.txt, fontFamily:DESIGN.fnt.b, transition:"background .25s, color .25s" },
    // Topbar — sticky dentro do co-main (desktop) ou fixed no mobile
    header:    { background:t.headerBg, padding:"0 16px", borderBottom:`1px solid ${t.borda}`, position:"sticky", top:0, left:0, right:0, zIndex:90, display:"flex", alignItems:"center", gap:8, height:56, boxShadow:`0 1px 0 ${t.borda}`, transition:"background .25s", flexShrink:0 },
    // Logo flat — sem gradiente, borda dourada sutil define o acento
    logo:      { width:40, height:40, background:t.card2, borderRadius:DESIGN.r.logo, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1px solid ${hexRgb(t.ouro,.28)}` },
    // Botão header — transparente, borda mínima
    hBtn:      { background:"transparent", border:`1.5px solid ${t.borda2}`, borderRadius:DESIGN.r.sm, padding:"7px 9px", color:t.txt2, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:500, transition:"all .15s" },
    tabBar:    { display:"flex", background:t.headerBg, borderBottom:`1px solid ${t.borda}`, overflow:"visible", padding:"0 12px", gap:2, scrollbarWidth:"none", transition:"background .25s", justifyContent:"space-between" },
    tab:       (a) => ({ flex:"0 0 auto", padding:"13px 16px", fontSize:10, fontWeight:a?700:500, letterSpacing:.5, textTransform:"uppercase", color:a?t.ouro:t.txt2, border:"none", background:"transparent", cursor:"pointer", borderRadius:0, whiteSpace:"nowrap", transition:"all .15s", borderBottom:a?`2px solid ${t.ouro}`:"2px solid transparent", marginBottom:"-1px", display:"flex", alignItems:"center", gap:5 }),
    card:      { background:t.card, borderRadius:DESIGN.r.card, border:`1px solid ${t.borda}`, overflow:"hidden", transition:"all .2s, background .25s, border-color .25s" },
    cardKanban:(c) => ({ background:t.card, borderRadius:DESIGN.r.card, border:`1px solid ${t.borda}`, borderTop:`3px solid ${c}`, overflow:"visible", transition:"all .2s, background .25s" }),
    // KPI com borda superior (acento premium, sem side-stripe)
    kpi:       (c) => ({ background:t.card, borderRadius:DESIGN.r.card, padding:"20px 16px", border:`1px solid ${t.borda}`, borderTop:`3px solid ${c}`, textAlign:"center", cursor:"default", transition:"all .2s, background .25s" }),
    // tile-card colorido — grade WPP, ações em grade
    btnCard:   (c) => ({ background:t.card, borderRadius:DESIGN.r.tile, padding:"14px 10px", border:`1px solid ${t.borda}`, borderTop:`2px solid ${c}`, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6, color:c, fontWeight:700, fontSize:12, fontFamily:DESIGN.fnt.b, cursor:"pointer", transition:"all .15s", lineHeight:1.3 }),
    // Inputs — borda mais definida, sem efeito de blur
    inp:       { background:t.inputBg, border:`1px solid ${t.borda2}`, borderRadius:DESIGN.r.inp, padding:"11px 13px", color:t.txt, fontSize:13, outline:"none", width:"100%", fontFamily:DESIGN.fnt.b, transition:"border-color .15s, background .25s" },
    // Botões — cor sólida (sem gradiente), mais limpos
    btnGold:   { border:"none", borderRadius:DESIGN.r.btn, padding:"11px 20px", color:t.onPrimary, fontWeight:700, fontSize:13, letterSpacing:DESIGN.ls.btn, cursor:"pointer", background:t.ouro, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnGreen:  { border:"none", borderRadius:DESIGN.r.btn, padding:"11px 20px", color:"#fff", fontWeight:700, fontSize:13, letterSpacing:DESIGN.ls.btn, cursor:"pointer", background:t.verde, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnOutline:{ borderRadius:DESIGN.r.btn, padding:"10px 18px", color:t.ouro, fontWeight:600, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${hexRgb(t.ouro,.4)}`, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    btnDanger: { borderRadius:DESIGN.r.btn, padding:"10px 18px", color:t.danger, fontWeight:600, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${hexRgb(t.danger,.3)}`, display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s", minHeight:42, whiteSpace:"nowrap" },
    secTitle:  { fontSize:11, textTransform:"uppercase", letterSpacing:DESIGN.ls.label, color:t.ouro, marginBottom:12, fontWeight:700, display:"flex", alignItems:"center", gap:8 },
    badge:     (c,bg,bc) => ({ padding:"2px 8px", borderRadius:DESIGN.r.badge, fontSize:9, fontWeight:700, letterSpacing:DESIGN.ls.badge, textTransform:"uppercase", color:c, background:bg, border:`1px solid ${bc}` }),
    empty:     { textAlign:"center", padding:"48px 20px", color:t.txt2 },
    // Overlay com blur mais pronunciado para foco no modal
    overlay:   { position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.82)", backdropFilter:"blur(14px)", display:"flex", alignItems:"flex-end", justifyContent:"center" },
    // Modal — borda fina define a separação do overlay
    modal:     { width:"100%", maxWidth:520, maxHeight:"94vh", background:t.modalBg, borderRadius:"16px 16px 0 0", border:`1px solid ${t.borda}`, borderBottom:"none", display:"flex", flexDirection:"column", overflow:"hidden", animation:"mslide .26s cubic-bezier(.34,1.1,.64,1)", transition:"background .25s" },
  };

  return { css, statusBorderColor };
}
