import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import Toast from "../components/Toast.jsx";
import { hexRgb, BASE_TODAS } from "../constants.js";
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

        {/* Consolidado: soma as bases num painel só (leitura). Fica em destaque
            porque é o que quem acompanha resultado quer abrir primeiro. */}
        <button className="co-choice co-choice--active" onClick={() => setBaseAtual(BASE_TODAS)}>
          <span className="co-choice__ico">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </span>
          <span className="co-choice__txt">
            <span className="co-choice__nome">{BASE_TODAS.label}</span>
            <span className="co-choice__desc">Painel somado das {basesPermitidas.length} bases · só leitura</span>
          </span>
        </button>

        {basesPermitidas.map(base => (
          <button className="co-choice" key={base.id} onClick={() => setBaseAtual(base)}>
            <span className="co-choice__ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span className="co-choice__txt">
              <span className="co-choice__nome">{base.label}</span>
              <span className="co-choice__desc" style={{fontFamily:"var(--font-mono)",letterSpacing:".04em"}}>{base.table}</span>
            </span>
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={handleLogout} style={{ marginTop: 4 }}>
          Sair e trocar conta
        </Button>
      </div>
      <Toast {...toast} />
    </div>
  );
}
