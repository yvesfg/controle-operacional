// ── AlterarSenhaAdmin.jsx — gerado automaticamente ──
import React, { useState } from 'react';
import { hashSenha, saveJSON } from '../utils.js';

export default function AlterarSenhaAdmin({ t, css, showToast, onSalvar }) {
  const [open, setOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const salvar = async () => {
    if (!novaSenha) { showToast("⚠️ Digite a nova senha","warn"); return; }
    if (novaSenha.length < 6) { showToast("⚠️ Mínimo 6 caracteres","warn"); return; }
    if (novaSenha !== confirmar) { showToast("❌ Senhas não conferem","err"); return; }
    const hash = await hashSenha(novaSenha);
    saveJSON("co_admin_senha", hash);
    if (onSalvar) await onSalvar(hash); // ← salva no Supabase via callback
    setNovaSenha(""); setConfirmar("");
    showToast("✅ Senha atualizada e sincronizada!","ok");
  };

  return (
    <>
      <div style={{...css.secTitle,marginTop:24,cursor:"pointer",userSelect:"none"}} onClick={()=>setOpen(!open)}>
        🔑 Alterar Senha do Admin <span style={{fontSize:11,color:t.txt2,marginLeft:4}}>{open?"▲":"▼"}</span>
        <span style={{flex:1,height:1,background:t.borda}} />
      </div>
      {open && (
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} style={{...css.inp,fontSize:12}} />
          <input type="password" placeholder="Confirmar nova senha" value={confirmar} onChange={e=>setConfirmar(e.target.value)} onKeyDown={e=>e.key==="Enter"&&salvar()} style={{...css.inp,fontSize:12}} />
          <button onClick={salvar} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:8,padding:"10px 14px",color:t.ouro,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            💾 Salvar Nova Senha
          </button>
        </div>
      )}
    </>
  );
}
