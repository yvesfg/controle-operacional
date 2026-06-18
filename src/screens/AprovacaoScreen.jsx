import React from "react";
import Toast from "../components/Toast.jsx";
import { TABLE_USUARIOS, PERMS_PADRAO, DESIGN, hexRgb } from "../constants.js";
import { supaFetch } from "../supabase.js";
import { saveJSON } from "../utils.js";

export default function AprovacaoScreen({
  t, css, theme, setTheme,
  pendingUserInfo, setPendingUserInfo, setAguardandoAprovacao,
  setPerfil, setPerms, setAuthed, setUsuarioLogado,
  getConexao, showToast,
  toast,
}) {
  return (
    <div className="co-login-screen" style={{...css.app, background:t.bg, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{position:"absolute",top:16,right:16,...css.hBtn,fontSize:16,padding:"8px 12px",zIndex:10}}>{theme==="dark"
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}</button>
      <div style={{width:"100%",maxWidth:340,background:t.card,border:`1px solid ${t.borda}`,borderRadius:16,padding:"36px 28px",boxShadow:`0 24px 64px ${t.shadow}`,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
        <div style={{fontSize:9,background:hexRgb(t.ouro,.1),border:`1px solid ${hexRgb(t.ouro,.3)}`,color:t.ouro,borderRadius:DESIGN.r.badge,padding:"3px 10px",letterSpacing:DESIGN.ls.label,fontWeight:700,marginBottom:24,textTransform:"uppercase"}}>YFGROUP</div>
        <div style={{width:68,height:68,background:t.card2,borderRadius:DESIGN.r.card,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,border:`1px solid ${hexRgb(t.ouro,.25)}`}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={t.ouro} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:21,letterSpacing:3,color:t.txt,textAlign:"center",lineHeight:1.1,marginBottom:8}}>Aguardando Aprovação</div>
        <div style={{fontSize:12,color:t.txt2,textAlign:"center",marginBottom:10,lineHeight:1.7}}>
          Sua solicitação de acesso foi registrada.<br/>
          Aguarde o administrador liberar seu acesso.
        </div>
        {pendingUserInfo?.email && (
          <div style={{fontSize:11,color:t.ouro,fontWeight:600,marginBottom:22,padding:"7px 14px",background:hexRgb(t.ouro,.07),borderRadius:DESIGN.r.inp,border:`1px solid ${hexRgb(t.ouro,.2)}`,display:"flex",alignItems:"center",gap:6}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> {pendingUserInfo.email}
          </div>
        )}
        <button onClick={async()=>{
          const conn=getConexao();
          if(!conn){showToast("⚠️ Sem conexão com banco","warn");return;}
          showToast("🔄 Verificando status...","ok");
          try{
            const data=await supaFetch(conn.url,conn.key,"GET",
              `${TABLE_USUARIOS}?email=eq.${encodeURIComponent(pendingUserInfo.email)}&select=*&limit=1`);
            if(Array.isArray(data)&&data.length>0){
              const u=data[0];
              if(u.status!=="pendente"){
                const p=u.perfil||"visualizador";
                const pm=typeof u.perms==="string"?JSON.parse(u.perms):(u.perms||{...PERMS_PADRAO[p]});
                setPerfil(p);setPerms(pm);setAuthed(true);
                setUsuarioLogado(u.nome||u.email);
                setAguardandoAprovacao(false);
                localStorage.removeItem("co_pending_user");
                saveJSON("co_sessao",{perfil:p,nome:u.nome||u.email,ts:Date.now()});
                showToast(`✅ Acesso aprovado! Bem-vindo, ${u.nome||u.email}!`,"ok");
              } else {
                showToast("⏳ Ainda aguardando aprovação...","warn");
              }
            } else {
              showToast("⚠️ Solicitação não encontrada. Tente fazer login novamente.","warn");
            }
          }catch{showToast("❌ Erro ao verificar status","err");}
        }} style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:DESIGN.r.btn,color:t.onPrimary,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Verificar Status
        </button>
        <button onClick={()=>{setAguardandoAprovacao(false);localStorage.removeItem("co_pending_user");setPendingUserInfo(null);}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:10,padding:"10px",color:t.txt2,fontSize:12,cursor:"pointer",width:"100%",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0}}><polyline points="15 18 9 12 15 6"/></svg> Voltar ao Login
        </button>
      </div>
      <Toast {...toast} />
    </div>
  );
}
