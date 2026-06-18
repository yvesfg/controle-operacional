import React from "react";
import { DESIGN } from "../constants.js";

export function useAuditDesign({ perfil, setAuditReport }) {
  const auditarDesign = React.useCallback(() => {
    const allowedRadii = new Set(Object.values(DESIGN.r));
    const allowedFonts = new Set(Object.values(DESIGN.fnt));
    const violations = [];

    document.querySelectorAll('[style]').forEach(el => {
      // ── Verificação 1: borderRadius fora de DESIGN.r ──
      const br = el.style.borderRadius;
      if (br && !/px\s+/.test(br)) { // ignora "X Y Z W" (canto individual)
        const v = parseInt(br);
        if (v && !allowedRadii.has(v)) {
          const label = (el.textContent||"").trim().slice(0,28)||el.tagName.toLowerCase();
          violations.push({ tipo:"borderRadius", valor:`${v}px`, sugestao:closest(allowedRadii,v), label });
        }
      }
      // ── Verificação 2: fontFamily hardcoded fora de DESIGN.fnt ──
      const ff = el.style.fontFamily;
      if (ff && ff.trim()) {
        const norm = ff.replace(/\s/g,"");
        const inDesign = [...allowedFonts].some(f => norm.includes(f.replace(/\s/g,"").split(",")[0].replace(/'/g,"")));
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
