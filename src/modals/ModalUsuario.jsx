import React from "react";
import { TABLE_USUARIOS, PERMS_PADRAO, PERMS_LISTA, BASES } from "../constants.js";
import { hashSenha, saveJSON, clickable } from "../utils.js";
import { supaFetch } from "../supabase.js";

export default function ModalUsuario({ ctx }) {
  const {
    modalOpen, setModalOpen,
    formData, setFormData,
    editIdx,
    usuarios, setUsuarios,
    usuarioEmailPreview, setUsuarioEmailPreview,
    showToast,
    registrarLog,
    getConexao,
    enviarEmailBoasVindas,
    css, t,
  } = ctx;

  if (modalOpen !== "usuario" && !usuarioEmailPreview) return null;
  return (
    <>
      {/* ═══ USUARIO MODAL ═══ */}
      {modalOpen === "usuario" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={css.modal}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>👤</div>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0?"EDITAR":"NOVO"} USUÁRIO</div>
                <div style={{fontSize:9,color:t.txt2}}>Preencha os dados do usuário</div>
              </div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,maxHeight:"calc(96vh - 120px)"}}>
              {/* Dados básicos */}
              {[{k:"nome",l:"Nome Completo",req:true},{k:"email",l:"Email",req:true,type:"email"},{k:"tel",l:"Telefone"}].map(f => (
                <div key={f.k} style={{marginBottom:12}}>
                  <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>{f.l}{f.req&&<span style={{color:t.danger}}> *</span>}</label>
                  <input type={f.type||"text"} value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} style={css.inp} />
                </div>
              ))}
              {/* Senha */}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:4}}>
                  Senha{editIdx<0&&<span style={{color:t.danger}}> *</span>}
                  {editIdx>=0&&<span style={{color:t.txt2,fontWeight:400,textTransform:"none"}}> (deixe em branco para manter)</span>}
                </label>
                <input type="password" value={formData._senhaPlain||""} onChange={e=>setFormData(p=>({...p,_senhaPlain:e.target.value}))} placeholder={editIdx>=0?"Nova senha (opcional)":"Mínimo 6 caracteres"} style={css.inp} />
              </div>
              {/* Perfil */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:6}}>Perfil</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {[
                    {k:"gerente",ico:"🏢",l:"Gerente",desc:"Financeiro + edita tudo"},
                    {k:"operador",ico:"⚙️",l:"Operador",desc:"Edita operacional"},
                    {k:"visualizador",ico:"👁️",l:"Visual.",desc:"Somente leitura"},
                  ].map(r => (
                    <div key={r.k} {...clickable(()=>setFormData(p=>({...p,perfil:r.k,perms:{...PERMS_PADRAO[r.k]}})))} style={{border:`1.5px solid ${(formData.perfil||"operador")===r.k?t.ouro:t.borda}`,borderRadius:8,padding:"8px 4px",cursor:"pointer",background:(formData.perfil||"operador")===r.k?`rgba(240,185,11,.08)`:t.card2,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .2s",textAlign:"center"}}>
                      <span style={{fontSize:16}}>{r.ico}</span>
                      <span style={{fontSize:10,fontWeight:700,color:(formData.perfil||"operador")===r.k?t.ouro:t.txt2}}>{r.l}</span>
                      <span style={{fontSize:8,color:t.txt2,lineHeight:1.2}}>{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Permissões */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:8}}>Permissões</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {PERMS_LISTA.filter(p=>p.key!=="config_db"&&p.key!=="usuarios").map(p => {
                    const val = (formData.perms||PERMS_PADRAO[formData.perfil||"operador"])[p.key];
                    return (
                      <div key={p.key} {...clickable(()=>setFormData(prev=>({...prev,perms:{...(prev.perms||PERMS_PADRAO[prev.perfil||"operador"]),[p.key]:!val}})))}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"14px 10px",borderRadius:8,border:`1px solid ${val?t.verde:t.borda}`,cursor:"pointer",background:val?`rgba(2,192,118,.06)`:"transparent"}}>
                        <div style={{width:16,height:16,borderRadius:4,background:val?t.verde:t.borda2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                          {val&&<span style={{fontSize:10,color:"#fff",fontWeight:700}}>✓</span>}
                        </div>
                        <span style={{fontSize:11,fontWeight:600,color:val?t.txt:t.txt2}}>{p.lbl}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Bases Permitidas */}
              <div>
                <label style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:8}}>Bases Permitidas</label>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {Object.values(BASES).map(base => {
                    const bases = formData.bases_permitidas || [];
                    const ativo = bases.includes(base.id);
                    return (
                      <div key={base.id} {...clickable(()=>setFormData(prev=>{
                        const cur = prev.bases_permitidas||[];
                        return {...prev, bases_permitidas: ativo ? cur.filter(b=>b!==base.id) : [...cur, base.id]};
                      }))}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"12px 12px",borderRadius:8,border:`1px solid ${ativo?t.azul:t.borda}`,cursor:"pointer",background:ativo?`rgba(var(--color-info-rgb,33,150,243),.06)`:"transparent"}}>
                        <div style={{width:18,height:18,borderRadius:5,background:ativo?t.azul:t.borda2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                          {ativo&&<span style={{fontSize:11,color:"#fff",fontWeight:700}}>✓</span>}
                        </div>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:ativo?t.txt:t.txt2}}>{base.label}</div>
                          <div style={{fontSize:9,color:t.txt2,marginTop:1}}>Tabela: {base.table}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(!formData.bases_permitidas || formData.bases_permitidas.length === 0) && (
                  <p style={{fontSize:9,color:t.danger,marginTop:6}}>⚠️ Nenhuma base selecionada — usuário não verá dados operacionais.</p>
                )}
              </div>
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",flexShrink:0,borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button onClick={async ()=>{
                const u = {...formData};
                if (!u.nome) { showToast("⚠️ Nome obrigatório","warn"); return; }
                if (!u.email) { showToast("⚠️ Email obrigatório","warn"); return; }
                if (editIdx<0 && !u._senhaPlain) { showToast("⚠️ Senha obrigatória","warn"); return; }
                if (u._senhaPlain) {
                  if (u._senhaPlain.length < 6) { showToast("⚠️ Senha deve ter ao menos 6 caracteres","warn"); return; }
                  u.senha = await hashSenha(u._senhaPlain);
                }
                delete u._senhaPlain;
                if (!u.perfil) u.perfil = "operador";
                if (!u.perms) u.perms = {...PERMS_PADRAO[u.perfil]};
                // Garantir que perms seja string JSON para Supabase (coluna jsonb)
                const uParaSupa = {...u, perms: u.perms};
                const nu = [...usuarios];
                if (editIdx>=0) nu[editIdx] = u; else nu.push(u);
                setUsuarios(nu);
                saveJSON("co_usuarios_local", nu); // chave consistente
                // Salvar no Supabase com upsert real
                const conn = getConexao();
                if (conn) {
                  try {
                    await supaFetch(conn.url, conn.key, "POST",
                      `${TABLE_USUARIOS}?on_conflict=email`, [uParaSupa]);
                    await registrarLog(editIdx>=0?"EDITAR_USUARIO":"NOVO_USUARIO", `${u.nome} (${u.email}) - perfil: ${u.perfil}`);
                    if (editIdx < 0) { setUsuarioEmailPreview({...u, _senhaRaw: formData._senhaPlain||""}); }
                    showToast(editIdx>=0?"✅ Usuário atualizado e sincronizado!":"✅ Usuário criado! Envie o email de boas-vindas.","ok");
                  } catch(e) {
                    showToast("✅ Salvo local. Supabase: "+e.message.slice(0,40),"warn");
                  }
                } else {
                  showToast(editIdx>=0?"✅ Usuário atualizado!":"✅ Usuário criado!","ok");
                }
                setModalOpen(null);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EMAIL BOAS-VINDAS PROMPT ═══ */}
      {usuarioEmailPreview && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setUsuarioEmailPreview(null)}>
          <div style={{...css.modal,maxWidth:420}}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${t.azul},${t.azulLt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>📧</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>EMAIL DE BOAS-VINDAS</div><div style={{fontSize:9,color:t.txt2}}>Notificar o novo usuário?</div></div>
              <button onClick={()=>setUsuarioEmailPreview(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2}}>✕</button>
            </div>
            <div style={{padding:16}}>
              <div style={{background:t.card2,borderRadius:10,padding:12,marginBottom:14,border:`1px solid ${t.borda}`}}>
                <div style={{fontSize:11,fontWeight:700,color:t.txt,marginBottom:4}}>{usuarioEmailPreview.nome}</div>
                <div style={{fontSize:10,color:t.txt2}}>📧 {usuarioEmailPreview.email}</div>
                <div style={{fontSize:10,color:t.ouro}}>🔑 Perfil: {usuarioEmailPreview.perfil}</div>
              </div>
              <p style={{fontSize:11,color:t.txt2,lineHeight:1.6,marginBottom:14}}>
                O email será aberto no seu cliente de email (Mail, Outlook, Gmail) já preenchido com os dados de acesso. Basta clicar em <strong style={{color:t.txt}}>Enviar</strong>.
              </p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setUsuarioEmailPreview(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Agora não</button>
                <button onClick={()=>{enviarEmailBoasVindas(usuarioEmailPreview, usuarioEmailPreview._senhaRaw||"");setUsuarioEmailPreview(null);}} style={{...css.btnGold,flex:1,justifyContent:"center"}}>
                  📧 Enviar Email de Boas-vindas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
