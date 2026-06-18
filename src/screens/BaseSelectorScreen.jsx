import React from "react";
import Toast from "../components/Toast.jsx";
import { hexRgb } from "../constants.js";
import loginLogo from "../../assets/images/logo-login.png";

export default function BaseSelectorScreen({
  t, css,
  basesPermitidas, setBaseAtual, handleLogout,
  toast,
}) {
  return (
    <div style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <style>{`@keyframes loginFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes loginPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}*{box-sizing:border-box}`}</style>
      <div style={{position:"absolute",top:"8%",left:"50%",transform:"translateX(-50%)",width:"500px",height:"260px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.06)} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28,animation:"loginPop .45s ease-out",position:"relative",zIndex:1}}>
        <img src={loginLogo} alt="YFGroup" width="80" height="80" style={{marginBottom:14,borderRadius:"50%"}} />
        <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-0.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
        <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
        <div style={{fontSize:9,color:t.txt2,letterSpacing:".12em",textTransform:"uppercase"}}>Controle Operacional</div>
      </div>

      <div style={{width:"100%",maxWidth:360,background:t.card,border:`1px solid ${t.borda}`,borderRadius:16,padding:"28px 28px 24px",display:"flex",flexDirection:"column",gap:12,animation:"loginFadeUp .4s ease-out",position:"relative",zIndex:1}}>
        <div style={{fontFamily:"var(--font-heading)",fontSize:16,fontWeight:700,letterSpacing:"-.02em",color:t.txt,marginBottom:4}}>Selecione a base de operação</div>
        <div style={{fontSize:12,color:t.txt2,marginBottom:8,lineHeight:1.5}}>Você tem acesso a múltiplas bases. Escolha com qual deseja trabalhar agora.</div>
        {basesPermitidas.map(base => (
          <button
            key={base.id}
            onClick={() => setBaseAtual(base)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:14,background:t.card2,border:`1px solid ${t.borda2||t.borda}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=hexRgb(t.ouro,.55);e.currentTarget.style.background=t.bgAlt||t.card2}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borda2||t.borda;e.currentTarget.style.background=t.card2}}
          >
            <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${hexRgb(t.ouro,.18)},${hexRgb(t.ouro,.08)})`,border:`1px solid ${hexRgb(t.ouro,.3)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.ouro} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
              <div style={{fontFamily:"var(--font-heading)",fontSize:14,fontWeight:700,color:t.txt,letterSpacing:"-.01em"}}>{base.label}</div>
              <div style={{fontSize:10,color:t.txt2,marginTop:2,fontFamily:"var(--font-mono)",letterSpacing:".04em"}}>{base.table}</div>
            </div>
          </button>
        ))}
        <button onClick={handleLogout} style={{marginTop:4,background:"transparent",border:"none",fontSize:11,color:t.txt2,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
          Sair e trocar conta
        </button>
      </div>
      <Toast {...toast} />
    </div>
  );
}
