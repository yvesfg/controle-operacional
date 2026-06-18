import React from "react";
import Toast from "../components/Toast.jsx";
import { hexRgb } from "../constants.js";
import loginLogo from "../../assets/images/logo-login.png";

const HUB_MODS = [
  { slug:"controle_op", label:"Controle Operacional", desc:"Cargas · Operações · Relatórios", ativo:true,
    svg:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></> },
  { slug:"frota", label:"Frota Pro", desc:"Veículos · Pneus · Viagens", ativo:true,
    svg:<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></> },
  { slug:"calculadora", label:"Calculadora de Frete", desc:"Custo · Margem · Tabela", ativo:false,
    svg:<><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 7h6M9 12h6M9 17h3"/></> },
  { slug:"antt", label:"Consulta ANTT", desc:"RNTRC · CIOT · Rastreio", ativo:false,
    svg:<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></> },
  { slug:"financeiro", label:"Financeiro", desc:"DRE · Contas · Fluxo de Caixa", ativo:false,
    svg:<><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="4" width="3" height="13"/></> },
];

export default function HubScreen({
  t, css,
  onSelectControleOp,
  frotaUrl,
  handleLogout,
  toast,
}) {
  return (
    <div style={{...css.app,background:t.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <style>{`@keyframes hubUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes hubPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{position:"absolute",top:"-5%",left:"50%",transform:"translateX(-50%)",width:"700px",height:"380px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.07)} 0%,transparent 68%)`,pointerEvents:"none"}}/>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:32,animation:"hubPop .4s ease-out",position:"relative",zIndex:1}}>
        <img src={loginLogo} alt="YFGroup" width="68" height="68" style={{marginBottom:12,borderRadius:"50%"}}/>
        <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
        <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
        <div style={{fontSize:9,color:t.txt2,letterSpacing:".14em",textTransform:"uppercase"}}>Selecione o módulo</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:520,width:"100%",animation:"hubUp .38s ease-out",position:"relative",zIndex:1}}>
        {HUB_MODS.map(m => {
          const on = m.ativo;
          return (
            <button key={m.slug} disabled={!on}
              onClick={()=>{
                if(m.slug==="controle_op") onSelectControleOp();
                else if(m.slug==="frota") {
                  const _win = window.open(`${frotaUrl}/auth/hub`, "_blank");
                  if (_win) {
                    const _handler = (e) => {
                      if (!frotaUrl.startsWith(e.origin)) return;
                      if (e.data?.type !== "REQUEST_CO_TOKENS") return;
                      window.removeEventListener("message", _handler);
                      try {
                        const _raw = sessionStorage.getItem("co_supa_tokens");
                        const _tk = _raw ? JSON.parse(_raw) : null;
                        if (_tk?.access_token) {
                          try {
                            const _pay = JSON.parse(atob(_tk.access_token.split(".")[1]));
                            if (_pay.exp && _pay.exp * 1000 < Date.now()) {
                              _win.postMessage({ type: "SUPA_TOKENS", expired: true }, e.origin);
                              return;
                            }
                          } catch {}
                          _win.postMessage({ type: "SUPA_TOKENS", access_token: _tk.access_token, refresh_token: _tk.refresh_token || "" }, e.origin);
                        } else {
                          _win.postMessage({ type: "SUPA_TOKENS", access_token: null }, e.origin);
                        }
                      } catch (err) { console.error("[SSO] erro ao enviar tokens:", err); }
                    };
                    window.addEventListener("message", _handler);
                    const _pollClose = setInterval(() => { if (_win.closed) { clearInterval(_pollClose); window.removeEventListener("message", _handler); } }, 1000);
                  }
                }
              }}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"20px 10px 18px",background:on?t.card:t.card2,
                border:`1.5px solid ${on?t.borda2||t.borda:t.borda}`,borderRadius:14,cursor:on?"pointer":"not-allowed",
                opacity:on?1:.4,transition:"border-color .18s, transform .18s, background .18s",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{if(on){e.currentTarget.style.borderColor=hexRgb(t.ouro,.6);e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.background=t.bgAlt||t.card2;}}}
              onMouseLeave={e=>{if(on){e.currentTarget.style.borderColor=t.borda2||t.borda;e.currentTarget.style.transform="none";e.currentTarget.style.background=on?t.card:t.card2;}}}
            >
              {!on&&<span style={{position:"absolute",top:7,right:8,fontSize:7,fontFamily:"var(--font-mono)",letterSpacing:".06em",color:t.txt2,background:hexRgb(t.txt2,.1),borderRadius:3,padding:"2px 5px"}}>EM BREVE</span>}
              <span className="co-sidebar__ico" style={{width:52,height:52,borderRadius:13,flexShrink:0,
                background:`linear-gradient(135deg,${hexRgb(t.ouro,.16)},${hexRgb(t.ouro,.05)})`,
                border:`1.5px solid ${hexRgb(t.ouro,.22)}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke={on?t.ouro:t.txt2} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {m.svg}
                </svg>
              </span>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-heading)",fontSize:12,fontWeight:700,color:on?t.txt:t.txt2,letterSpacing:"-.01em",lineHeight:1.2}}>{m.label}</div>
                <div style={{fontSize:8.5,color:t.txt2,marginTop:3,lineHeight:1.4}}>{m.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={handleLogout} style={{marginTop:24,background:"transparent",border:"none",fontSize:11,color:t.txt2,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3,position:"relative",zIndex:1}}>
        Sair e trocar conta
      </button>
      <Toast {...toast}/>
    </div>
  );
}
