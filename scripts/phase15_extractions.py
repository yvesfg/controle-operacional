"""Phase 15: extract useWppHandlers, useCss, useAuditDesign from App.jsx"""
from pathlib import Path

ROOT = Path(__file__).parent.parent
app = ROOT / "src/App.jsx"
content = app.read_text(encoding="utf-8")

# ─────────────────────────────────────────────
# 1. useWppHandlers.js
# ─────────────────────────────────────────────
Path(ROOT / "src/hooks/useWppHandlers.js").write_text('''\
export function useWppHandlers({
  setWppPagModal, setWppFortes, setWppDccMinutas, setWppCteComp, setWppDscMinutas,
}) {
  const abrirWppPagModal = (reg, mot, tipo) => {
    const pj = (v, def) => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : def); } catch { return def; } };
    const dcc = pj(reg?.minutas_dcc, [{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}]);
    const comp = {cte:reg?.cte_comp||"", mdf:reg?.mdf_comp||"", mat:reg?.mat_comp||""};
    const dsc = pj(reg?.minutas_dsc, [{tipo:"MAM",cte:"",mdf:"",num:""}]);
    const temDados = dcc.some(m=>m.cte||m.mdf||m.num) || comp.cte || dsc.some(m=>m.cte||m.mdf||m.num);
    setWppPagModal({reg, mot: mot||null, tipo});
    setWppFortes(temDados);
    setWppDccMinutas(dcc);
    setWppCteComp(comp);
    setWppDscMinutas(dsc);
  };

  return { abrirWppPagModal };
}
''', encoding="utf-8")
print("useWppHandlers.js written")

# ─────────────────────────────────────────────
# 2. useCss.js
# ─────────────────────────────────────────────
Path(ROOT / "src/hooks/useCss.js").write_text('''\
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
''', encoding="utf-8")
print("useCss.js written")

# ─────────────────────────────────────────────
# 3. useAuditDesign.js
# ─────────────────────────────────────────────
Path(ROOT / "src/hooks/useAuditDesign.js").write_text('''\
import React from "react";
import { DESIGN } from "../constants.js";

export function useAuditDesign({ perfil, setAuditReport }) {
  const auditarDesign = React.useCallback(() => {
    const allowedRadii = new Set(Object.values(DESIGN.r));
    const allowedFonts = new Set(Object.values(DESIGN.fnt));
    const violations = [];

    document.querySelectorAll(\'[style]\').forEach(el => {
      // ── Verificação 1: borderRadius fora de DESIGN.r ──
      const br = el.style.borderRadius;
      if (br && !/px\\s+/.test(br)) { // ignora "X Y Z W" (canto individual)
        const v = parseInt(br);
        if (v && !allowedRadii.has(v)) {
          const label = (el.textContent||"").trim().slice(0,28)||el.tagName.toLowerCase();
          violations.push({ tipo:"borderRadius", valor:`${v}px`, sugestao:closest(allowedRadii,v), label });
        }
      }
      // ── Verificação 2: fontFamily hardcoded fora de DESIGN.fnt ──
      const ff = el.style.fontFamily;
      if (ff && ff.trim()) {
        const norm = ff.replace(/\\s/g,"");
        const inDesign = [...allowedFonts].some(f => norm.includes(f.replace(/\\s/g,"").split(",")[0].replace(/\'/g,"")));
        if (!inDesign) {
          violations.push({ tipo:"fontFamily", valor:ff.slice(0,40), sugestao:"DESIGN.fnt.h ou DESIGN.fnt.b", label:(el.textContent||"").trim().slice(0,28)||el.tagName.toLowerCase() });
        }
      }
    });

    // Auxiliar: raio mais próximo permitido
    function closest(set, v) {
      let best = null, diff = Infinity;
      set.forEach(r => { if(Math.abs(r-v)<diff){diff=Math.abs(r-v);best=r;} });
      const key = Object.entries(DESIGN.r).find(([,val])=>val===best)?.[0]||"?";
      return `DESIGN.r.${key} (${best}px)`;
    }

    const tipos = {};
    violations.forEach(v => { tipos[v.tipo] = (tipos[v.tipo]||0)+1; });
    const report = {
      timestamp: new Date().toLocaleString("pt-BR"),
      total: violations.length,
      tipos,
      items: violations.slice(0, 30),
    };
    setAuditReport(report);
    if (typeof window !== "undefined") window.__auditReport = report;
    return report;
  }, []);

  // Expor no console do navegador (somente admin)
  React.useEffect(() => {
    if (perfil === "admin") {
      window.auditarDesign = auditarDesign;
      return () => { try { delete window.auditarDesign; } catch(_){} };
    }
  }, [perfil, auditarDesign]);

  return { auditarDesign };
}
''', encoding="utf-8")
print("useAuditDesign.js written")

# ─────────────────────────────────────────────
# Patch App.jsx
# ─────────────────────────────────────────────

# 1. Fix double comment from phase 14
OLD_DBL = ("  // supaUpsert / salvarRegistro / deletarRegistro / salvarMinutasDetalhe — via useDTHandlers\n"
           "    // supaUpsert / salvarRegistro / deletarRegistro / salvarMinutasDetalhe\n"
           "  const { supaUpsert, salvarRegistro, deletarRegistro, salvarMinutasDetalhe } = useDTHandlers({")
NEW_DBL = ("  // supaUpsert / salvarRegistro / deletarRegistro / salvarMinutasDetalhe — via useDTHandlers\n"
           "  const { supaUpsert, salvarRegistro, deletarRegistro, salvarMinutasDetalhe } = useDTHandlers({")
assert content.count(OLD_DBL) == 1, f"double-comment found {content.count(OLD_DBL)} times"
content = content.replace(OLD_DBL, NEW_DBL, 1)

# 2. Replace abrirWppPagModal block
START_WPP = "    // Abre o modal WPP pré-preenchido com minutas salvas no registro\n  const abrirWppPagModal"
END_WPP   = "\n  };\n\n  const isAdmin"
idx_s = content.index(START_WPP)
idx_e = content.index(END_WPP, idx_s) + len("\n  };\n")
content = (content[:idx_s]
           + "  // abrirWppPagModal — via useWppHandlers\n"
           + "  const { abrirWppPagModal } = useWppHandlers({\n"
           + "    setWppPagModal, setWppFortes, setWppDccMinutas, setWppCteComp, setWppDscMinutas,\n"
           + "  });\n"
           + content[idx_e:])

# 3. Replace STYLES block (statusBorderColor + css)
START_CSS = "  // ══════════════════════════════════════════════\n  //  STYLES\n"
END_CSS   = "\n  };\n\n  // ══════════════════════════════════════════════\n  //  AUDITORIA DE DESIGN"
idx_s2 = content.index(START_CSS)
idx_e2 = content.index(END_CSS, idx_s2) + len("\n  };\n")
content = (content[:idx_s2]
           + "  // css + statusBorderColor — via useCss\n"
           + "  const { css, statusBorderColor } = useCss(t);\n"
           + content[idx_e2:])

# 4. Replace auditarDesign block
START_AUD = "  // ══════════════════════════════════════════════\n  //  AUDITORIA DE DESIGN"
END_AUD   = "  }, [perfil, auditarDesign]);\n"
idx_s3 = content.index(START_AUD)
idx_e3 = content.index(END_AUD, idx_s3) + len("  }, [perfil, auditarDesign]);\n")
content = (content[:idx_s3]
           + "  // auditarDesign — via useAuditDesign\n"
           + "  const { auditarDesign } = useAuditDesign({ perfil, setAuditReport });\n\n"
           + content[idx_e3:])

# 5. Add imports
OLD_IMP = "import { useDTHandlers } from './hooks/useDTHandlers.js';"
NEW_IMP = (OLD_IMP + "\n"
           + "import { useWppHandlers } from './hooks/useWppHandlers.js';\n"
           + "import { useCss } from './hooks/useCss.js';\n"
           + "import { useAuditDesign } from './hooks/useAuditDesign.js';")
assert content.count(OLD_IMP) == 1
content = content.replace(OLD_IMP, NEW_IMP, 1)

# 6. Remove DESIGN from App.jsx destructure (it's now only used in useCss/useAuditDesign)
# Actually DESIGN may still be used in JSX or elsewhere — check first
design_uses = [i for i in range(len(content)) if content[i:i+6] == "DESIGN"]
print(f"DESIGN references remaining: {len(design_uses)}")
# Only remove from import if 0 remaining uses in JSX (skip for safety)

app.write_text(content, encoding="utf-8")
print("App.jsx patched successfully")
print(f"New line count: {len(content.splitlines())}")
