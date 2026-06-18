import React from "react";
import Toast from "../components/Toast.jsx";
import { DESIGN, hexRgb } from "../constants.js";
import { saveJSON } from "../utils.js";

export default function PrimeiroLoginScreen({
  t, css,
  primLoginSenha, setPrimLoginSenha,
  primLoginSenha2, setPrimLoginSenha2,
  customLogo, setCustomLogo,
  handlePrimeiroLoginSalvar,
  toast,
}) {
  return (
    <div style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:${t.txt2}}`}</style>
      <div style={{width:56,height:56,background:t.card2,borderRadius:DESIGN.r.card,border:`1px solid ${hexRgb(t.ouro,.3)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:14}}>🔑</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:3,color:t.txt,marginBottom:4}}>PRIMEIRO ACESSO</div>
      <div style={{fontSize:11,color:t.txt2,marginBottom:20,textAlign:"center"}}>Configure sua senha de administrador e, opcionalmente, sua logo.</div>

      <div style={{width:"100%",maxWidth:360,...css.card,boxShadow:`0 24px 60px ${t.shadow}`,padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Nova Senha *</label>
          <input type="password" value={primLoginSenha} onChange={e=>setPrimLoginSenha(e.target.value)} placeholder="Mínimo 6 caracteres" style={css.inp} />
        </div>
        <div>
          <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Confirmar Senha *</label>
          <input type="password" value={primLoginSenha2} onChange={e=>setPrimLoginSenha2(e.target.value)} placeholder="Repita a senha" style={css.inp} onKeyDown={e=>e.key==="Enter"&&handlePrimeiroLoginSalvar()} />
        </div>
        <div>
          <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>Logo da Empresa (opcional)</label>
          <input type="file" accept="image/*" onChange={e=>{
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = ev => { const b64 = ev.target.result; setCustomLogo(b64); saveJSON("co_custom_logo", b64); };
            reader.readAsDataURL(f);
          }} style={{...css.inp,padding:"7px 10px",fontSize:11}} />
          {customLogo && <img src={customLogo} alt="preview" style={{width:60,height:60,objectFit:"contain",borderRadius:10,marginTop:8,border:`1px solid ${t.borda}`}} />}
        </div>
        <button onClick={handlePrimeiroLoginSalvar} style={{...css.btnGold,justifyContent:"center",padding:13,fontSize:16,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>✅ CONFIRMAR E ENTRAR</button>
      </div>
      <Toast {...toast} />
    </div>
  );
}
