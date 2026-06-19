import React from "react";
import Toast from "../components/Toast.jsx";
import { DESIGN, hexRgb } from "../constants.js";
import { loginGoogle } from "../supabaseAuth.js";
import loginLogo from "../../assets/images/logo-login.png";

export default function LoginScreen({
  t, css, theme, setTheme,
  authMsg,
  toast,
}) {
  const ano = new Date().toLocaleDateString("pt-BR",{month:"short",year:"numeric"}).toUpperCase().replace(". ","/" );
  const entrar = async () => {
    try { await loginGoogle(); }
    catch (e) { console.error("[login] google:", e); }
  };
  return (
    <div className="co-login-screen" style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes loginFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes loginPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
      `}</style>

      <div style={{position:"absolute",top:"8%",left:"50%",transform:"translateX(-50%)",width:"500px",height:"260px",background:`radial-gradient(ellipse,${hexRgb(t.ouro, .06)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"absolute",bottom:"12%",left:"50%",transform:"translateX(-50%)",width:"400px",height:"200px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.04)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{position:"absolute",top:16,right:16,...css.hBtn,fontSize:16,padding:"8px 12px",zIndex:10}}>
        {theme==="dark"
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
      </button>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28,animation:"loginPop .45s ease-out",position:"relative",zIndex:1}}>
        <img src={loginLogo} alt="YFGroup" width="80" height="80" style={{marginBottom:14,borderRadius:"50%"}} />
        <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-0.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
        <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
        <div style={{fontSize:9,color:t.txt2,letterSpacing:".12em",textTransform:"uppercase"}}>Plataforma Integrada</div>
      </div>

      <div style={{width:"100%",maxWidth:360,background:t.card,border:`1px solid ${t.borda}`,borderRadius:16,padding:"28px 28px 24px",display:"flex",flexDirection:"column",gap:0,animation:"loginFadeUp .4s ease-out",position:"relative",zIndex:1}}>
        <div style={{fontFamily:"var(--font-heading)",fontSize:16,fontWeight:700,letterSpacing:"-.02em",color:t.txt,marginBottom:4}}>Entrar na plataforma</div>
        <div style={{fontSize:12,color:t.txt2,marginBottom:20,lineHeight:1.5}}>Acesso restrito a usuários autorizados. O administrador libera os módulos.</div>

        {authMsg && (
          <div style={{padding:"10px 12px",borderRadius:DESIGN.r.inp,fontSize:12,fontWeight:600,textAlign:"center",marginBottom:16,lineHeight:1.5,background:authMsg.t==="err"?hexRgb(t.danger,.08):hexRgb(t.verde,.08),color:authMsg.t==="err"?t.danger:t.verde,border:`1px solid ${authMsg.t==="err"?hexRgb(t.danger,.2):hexRgb(t.verde,.2)}`}}>{authMsg.m}</div>
        )}

        <button
          onClick={entrar}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:t.card2,border:`1px solid ${t.borda2}`,borderRadius:DESIGN.r.inp,padding:"13px 12px",cursor:"pointer",fontSize:13,fontWeight:600,color:t.txt,fontFamily:DESIGN.fnt.b,transition:"all .15s",letterSpacing:.2,marginBottom:16}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=hexRgb(t.ouro, .5);e.currentTarget.style.background=t.bgAlt}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borda2;e.currentTarget.style.background=t.card2}}
        >
          <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Continuar com Google
        </button>

        <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
          <span style={{fontSize:9,color:t.txt2,letterSpacing:".08em",textTransform:"uppercase"}}>Sistema Online — {ano}</span>
        </div>
      </div>

      <Toast {...toast} />
    </div>
  );
}
