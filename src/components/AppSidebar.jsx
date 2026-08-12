import React from "react";
import { DESIGN, MOBILE_NAV_PINNED } from "../constants.js";
import { clickable } from "../utils.js";

export default function AppSidebar({
  t,
  isWide, mobileSidebarExpanded, setMobileSidebarExpanded,
  sidebarCollapsed, setSidebarCollapsed,
  hIco,
  tabs, activeTab, setActiveTab,
  setWppTipoOpen,
  theme, setTheme,
  isAdmin, setModalOpen,
  usuarioLogado, perfil,
  handleLogout,
}) {
  return (
    <aside className={`co-sidebar${isWide?" co-sidebar--collapsed":""}${!isWide&&mobileSidebarExpanded?" co-sidebar--mob-expanded":""}`}>
        {/* ── Logo ── */}
        <div className="co-sidebar__logo">
          <div style={{width:36,height:36,borderRadius:8,background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div style={{overflow:"hidden",flex:1,minWidth:0}}>
              <div className="co-sidebar__logo-name">YFGroup</div>
              <div className="co-sidebar__logo-sub">CTRL OPERACIONAL</div>
            </div>
          <button
            className="co-sidebar__toggle"
            style={{display:isWide?"none":"flex",alignItems:"center",justifyContent:"center"}}
            onClick={()=>isWide?setSidebarCollapsed(v=>!v):setMobileSidebarExpanded(v=>!v)}
            title={!mobileSidebarExpanded?"Expandir":"Recolher"}
          >
            {(isWide?sidebarCollapsed:!mobileSidebarExpanded)
              ? hIco(<><polyline points="9 18 15 12 9 6"/></>,t.txt2,14,2)
              : hIco(<><polyline points="15 18 9 12 15 6"/></>,t.txt2,14,2)
            }
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="co-sidebar__nav">
          {(()=>{
            const posCarga = new Set(["diarias","descarga","ocorrencias"]);
            // No drawer mobile ("Mais"), oculta as tabs que já são fixas no bottom bar
            const hidden   = new Set(isWide ? ["busca"] : ["busca", ...MOBILE_NAV_PINNED]);
            const mainTabs = tabs.filter(tb=>!posCarga.has(tb.k)&&!hidden.has(tb.k));
            const pcTabs   = tabs.filter(tb=>posCarga.has(tb.k)&&!hidden.has(tb.k));
            const renderItem = (tb) => {
              const ativo = activeTab===tb.k;
              return (
                <button
                  key={tb.k}
                  className={`co-sidebar__item${ativo?" co-sidebar__item--active":""}`}
                  onClick={()=>{setActiveTab(tb.k);if(!isWide)setMobileSidebarExpanded(false);}}
                  title={(isWide&&sidebarCollapsed)||!isWide?tb.l:undefined}
                  style={{position:"relative"}}
                >
                  <span className="co-sidebar__ico">
                    {typeof tb.ico==="function" ? tb.ico(ativo) : <span style={{fontSize:18}}>{tb.ico}</span>}
                  </span>
                  <span className="co-sidebar__item-lbl">{tb.l}</span>
                </button>
              );
            };
            return (<>
              {mainTabs.map(renderItem)}
              <button
                className="co-sidebar__item"
                onClick={()=>{ setWppTipoOpen(true); if(!isWide) setMobileSidebarExpanded(false); }}
                style={{border:`1px solid rgba(37,211,102,.18)`,borderRadius:DESIGN.r.sidebar,color:"#25D366",gap:10}}
                title={!isWide||sidebarCollapsed?"WhatsApp":undefined}
              >
                <span className="co-sidebar__ico">
                  {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </>,"#25D366",16)}
                </span>
                <span className="co-sidebar__item-lbl" style={{color:"#25D366",fontWeight:600}}>WhatsApp</span>
              </button>
              <div className="co-sidebar__section-lbl">PÓS CARGA</div>
              <div className="co-sidebar__section-line"/>
              {pcTabs.map(renderItem)}
            </>);
          })()}
        </nav>

        {/* ── Footer — utilitários + usuário ── */}
        <div className="co-sidebar__footer">
          <button className="co-sidebar__footer-item co-sidebar__footer-item--center" onClick={()=>setTheme(theme==="dark"?"light":"dark")} title={theme==="dark"?"Tema Claro":"Tema Escuro"}>
            {theme==="dark"
              ? hIco(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,t.txt2,16)
              : hIco(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,t.txt2,16)
            }
            <span className="co-sidebar__footer-lbl">{theme==="dark"?"Tema Claro":"Tema Escuro"}</span>
          </button>

          <div className="co-sidebar__user" style={{cursor:"pointer"}} {...clickable(()=>{
            if(isAdmin){setActiveTab("admin");if(!isWide)setMobileSidebarExpanded(false);}
            else{setModalOpen("usuario");}
          })}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg, var(--accent), var(--cyan))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:"#fff",fontFamily:"var(--font-heading)",letterSpacing:"-0.01em"}}>
              {(usuarioLogado||"YF").slice(0,2).toUpperCase()}
            </div>
            <div className="co-sidebar__user-info" style={{flex:1,minWidth:0}}>
              <div className="co-sidebar__user-name">{(usuarioLogado||perfil||"").split(" ")[0]}</div>
              <div className="co-sidebar__user-role">{perfil}</div>
            </div>
            <button
              className="co-sidebar__logout-btn"
              onClick={e=>{e.stopPropagation();handleLogout();}}
              title="Sair"
              style={{background:"transparent",border:"none",cursor:"pointer",padding:4,borderRadius:6,flexShrink:0,alignItems:"center",opacity:.6}}
              onMouseEnter={e=>e.currentTarget.style.opacity="1"}
              onMouseLeave={e=>e.currentTarget.style.opacity=".6"}
            >
              {hIco(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,t.txt2,14)}
            </button>
          </div>
        </div>
    </aside>
  );
}
