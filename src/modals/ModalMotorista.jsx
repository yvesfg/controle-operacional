import React from "react";
import Icon from "../components/Icon.jsx";

export default function ModalMotorista({ ctx }) {
  const {
    formData, setFormData,
    modalOpen, setModalOpen,
    editIdx, setEditIdx,
    motoristas,
    t, css,
    hIco,
    showToast, saveMotoristasLS,
    motDupSugest, setMotDupSugest,
    registrarLog,
  } = ctx;

  if (modalOpen !== "motorista") return null;
  return (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={css.modal}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,null,20,2)}</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0?"EDITAR":"NOVO"} MOTORISTA</div></div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>

              {/* ── Identificação ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>{hIco(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,t.azulLt,10)} Identificação<span style={{flex:1,height:1,background:"rgba(22,119,255,.12)"}} /></div>
              {[{k:"nome",l:"Nome Completo",req:true},{k:"cpf",l:"CPF",req:true},{k:"tel",l:"Telefone"}].map(f=>(
                <div key={f.k}>
                  <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>{f.l}{f.req&&<span style={{color:t.danger}}> *</span>}</label>
                  <input value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} style={css.inp} />
                </div>
              ))}

              {/* ── Vínculo dropdown ── */}
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>Vínculo</label>
                <select value={formData.vinculo||""} onChange={e=>setFormData(p=>({...p,vinculo:e.target.value}))} style={{...css.inp,appearance:"none",cursor:"pointer"}}>
                  <option value="">— Selecione —</option>
                  <option value="Agregado">Agregado</option>
                  <option value="Terceiro">Terceiro</option>
                  <option value="Frota">Frota</option>
                </select>
              </div>

              {/* ── Placas ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,display:"flex",alignItems:"center",gap:6,marginTop:4}}><Icon n="truck" s={11} c={t.azulLt}/> Placas<span style={{flex:1,height:1,background:"rgba(22,119,255,.12)"}} /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{k:"placa1",l:"Placa Cavalo",req:true},{k:"placa2",l:"Placa Carreta 1"},{k:"placa3",l:"Placa Carreta 2"},{k:"placa4",l:"Placa Carreta 3"}].map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>{f.l}{f.req&&<span style={{color:t.danger}}> *</span>}</label>
                    <input value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value.toUpperCase()}))} style={{...css.inp,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:3,fontSize:15}} placeholder="AAA0000" />
                  </div>
                ))}
              </div>

              {/* ── Dados Bancários ── */}
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.ouro,fontWeight:700,display:"flex",alignItems:"center",gap:6,marginTop:4}}><Icon n="credit-card" s={11} c={t.ouro}/> Dados Bancários<span style={{flex:1,height:1,background:`rgba(217,98,43,.15)`}} /></div>
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>BCO · Nome do Banco</label>
                <input value={formData.banco||""} onChange={e=>setFormData(p=>({...p,banco:e.target.value}))} placeholder="Ex: Banco do Brasil, Bradesco, Nubank..." style={css.inp} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>AGE · Agência</label>
                  <input value={formData.agencia||""} onChange={e=>setFormData(p=>({...p,agencia:e.target.value}))} placeholder="0000-0" style={css.inp} />
                </div>
                <div>
                  <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>C/C · Conta Corrente</label>
                  <input value={formData.conta||""} onChange={e=>setFormData(p=>({...p,conta:e.target.value}))} placeholder="00000-0" style={css.inp} />
                </div>
              </div>
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>FAV · Favorecido</label>
                <input value={formData.favorecido||""} onChange={e=>setFormData(p=>({...p,favorecido:e.target.value}))} placeholder="Nome do titular" style={css.inp} />
              </div>
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>PIX · Tipo de Chave</label>
                <select value={formData.pix_tipo||""} onChange={e=>setFormData(p=>({...p,pix_tipo:e.target.value,pix_chave:""}))} style={{...css.inp,appearance:"none",cursor:"pointer",marginBottom:6}}>
                  <option value="">— Sem PIX —</option>
                  <option value="CPF">CPF</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Email">E-mail</option>
                  <option value="Aleatória">Chave Aleatória</option>
                </select>
                {formData.pix_tipo && (
                  <input
                    value={formData.pix_chave||""}
                    onChange={e=>setFormData(p=>({...p,pix_chave:e.target.value}))}
                    placeholder={
                      formData.pix_tipo==="CPF"?"000.000.000-00":
                      formData.pix_tipo==="Telefone"?"(00) 00000-0000":
                      formData.pix_tipo==="Email"?"email@exemplo.com":
                      "Chave aleatória (UUID)"
                    }
                    style={css.inp}
                  />
                )}
              </div>

              {/* ── Observações ── */}
              <div>
                <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3}}>Observações</label>
                <textarea value={formData.obs||""} onChange={e=>setFormData(p=>({...p,obs:e.target.value}))} rows={2} style={{...css.inp,resize:"vertical",fontSize:12}} />
              </div>

              {/* ── Aviso de duplicata ── */}
              {motDupSugest && editIdx<0 && (
                <div style={{background:`rgba(246,70,93,.07)`,border:`1px solid rgba(246,70,93,.3)`,borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.danger,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="alert" s={12} c={t.danger}/> Motorista similar já cadastrado</div>
                  <div style={{fontSize:10,color:t.txt,marginBottom:4}}><b>{motDupSugest.nome}</b> · CPF: {motDupSugest.cpf||"—"} · Placa: {motDupSugest.placa1||"—"}</div>
                  <div style={{fontSize:9,color:t.txt2,marginBottom:8}}>Deseja ver o cadastro existente ou continuar salvando mesmo assim?</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setFormData({...motDupSugest});setEditIdx(motoristas.indexOf(motDupSugest));setMotDupSugest(null);}} style={{flex:1,background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.25)`,borderRadius:7,padding:"6px 0",fontSize:10,color:t.azulLt,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon n="edit" s={11} c={t.azulLt}/> Editar existente</button>
                    <button onClick={()=>setMotDupSugest(null)} style={{flex:1,background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.25)`,borderRadius:7,padding:"6px 0",fontSize:10,color:t.danger,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon n="alert" s={11} c={t.danger}/> Salvar mesmo assim</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button onClick={()=>{
                const m = {...formData};
                if (!m.nome) { showToast("⚠️ Nome obrigatório","warn"); return; }
                if (!m.cpf) { showToast("⚠️ CPF obrigatório","warn"); return; }
                if (!m.placa1) { showToast("⚠️ Placa Cavalo obrigatória","warn"); return; }
                // Verificar duplicatas ao cadastrar NOVO motorista
                if (editIdx < 0) {
                  const nomeN = m.nome.toUpperCase().trim();
                  const placa1N = (m.placa1||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
                  const cpfN = (m.cpf||"").replace(/\D/g,"");
                  const dup = motoristas.find((x,xi) => {
                    if(cpfN && x.cpf && x.cpf.replace(/\D/g,"")===cpfN) return true;
                    if(placa1N && x.placa1 && x.placa1.toUpperCase().replace(/[^A-Z0-9]/g,"")===placa1N) return true;
                    return x.nome && x.nome.toUpperCase().trim()===nomeN;
                  });
                  if (dup && !motDupSugest) { setMotDupSugest(dup); return; }
                }
                const nm = [...motoristas];
                if (editIdx>=0) nm[editIdx] = m; else nm.push(m);
                saveMotoristasLS(nm);
                setMotDupSugest(null);
                registrarLog(editIdx>=0?"EDITAR_MOTORISTA":"NOVO_MOTORISTA",`${m.nome} · CPF ${m.cpf} · Vínculo: ${m.vinculo||"—"}`);
                showToast(editIdx>=0?"✅ Atualizado!":"✅ Cadastrado!","ok");
                setModalOpen(null);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center",gap:6}}><Icon n="save" s={14} c="currentColor"/> SALVAR</button>
            </div>
          </div>
        </div>
  );
}
