import Icon from "../components/Icon.jsx";

export default function ModalMotoristasAdmin({ ctx }) {
  const {
    motExcluirTodosOpen, setMotExcluirTodosOpen,
    motExcluirTodosTexto, setMotExcluirTodosTexto,
    motSugestOpen, setMotSugestOpen,
    motSugestData, setMotSugestData,
    motExcluirLoteOpen, setMotExcluirLoteOpen,
    motExcluirLoteTexto, setMotExcluirLoteTexto,
    motoristas, motSelecionados, setMotSelecionados,
    DADOS, setDadosBase,
    saveMotoristasLS, registrarLog, showToast,
    t, css, hIco,
  } = ctx;

  return (
    <>
      {/* ═══ MODAL EXCLUIR TODOS (admin) ═══ */}
      {motExcluirTodosOpen && (
        <div style={{...css.overlay,alignItems:"center",backdropFilter:"blur(10px)",padding:20}} onClick={()=>setMotExcluirTodosOpen(false)}>
          <div style={{...css.modal,borderRadius:16,maxWidth:400,padding:24}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:10,background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.3)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,20,2)}
              </div>
              <div><div style={{fontSize:15,fontWeight:800,color:t.danger}}>Excluir Todos os Motoristas</div><div style={{fontSize:10,color:t.txt2,marginTop:2}}>Esta ação é irreversível</div></div>
            </div>
            <div style={{background:`rgba(246,70,93,.06)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:10,padding:"10px 12px",fontSize:11,color:t.txt,lineHeight:1.6,marginBottom:16}}>
              Você está prestes a <strong style={{color:t.danger}}>excluir permanentemente {motoristas.length} motorista{motoristas.length!==1?"s":""}</strong> salvos localmente.
            </div>
            <div style={{fontSize:11,color:t.txt2,marginBottom:8}}>Para confirmar, digite <strong style={{color:t.danger,letterSpacing:2}}>EXCLUIR</strong>:</div>
            <input value={motExcluirTodosTexto} onChange={e=>setMotExcluirTodosTexto(e.target.value.toUpperCase())} placeholder="EXCLUIR" autoFocus
              style={{...css.inp,marginBottom:14,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:motExcluirTodosTexto==="EXCLUIR"?t.danger:t.txt}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setMotExcluirTodosOpen(false)} style={{...css.btnOutline,flex:1,justifyContent:"center",padding:11}}>Cancelar</button>
              <button disabled={motExcluirTodosTexto!="EXCLUIR"} onClick={()=>{
                if(motExcluirTodosTexto!=="EXCLUIR")return;
                saveMotoristasLS([]);setMotSelecionados(new Set());
                setMotExcluirTodosOpen(false);
                registrarLog("EXCLUIR_TODOS_MOTORISTAS",`${motoristas.length} motoristas removidos`);
                showToast(`🗑️ ${motoristas.length} motorista(s) excluído(s)`,"ok");
              }} style={{...css.btnGold,flex:1,justifyContent:"center",padding:11,background:motExcluirTodosTexto==="EXCLUIR"?t.danger:"rgba(246,70,93,.3)",color:motExcluirTodosTexto==="EXCLUIR"?"#fff":"rgba(255,255,255,.4)",cursor:motExcluirTodosTexto==="EXCLUIR"?"pointer":"not-allowed",border:"none"}}>
                Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL SUGERIR COMPATÍVEIS ═══ */}
      {motSugestOpen && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setMotSugestOpen(false)}>
          <div style={{...css.modal,maxWidth:480}}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.verde,display:"flex",alignItems:"center",gap:7}}><Icon n="link" s={15} c={t.verde}/> SUGESTÕES DE VÍNCULO</div>
              <button onClick={()=>setMotSugestOpen(false)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:8,maxHeight:"calc(96vh - 120px)"}}>
              <div style={{fontSize:10,color:t.txt2,marginBottom:4}}>Placas dos motoristas cadastrados foram encontradas em registros de viagem com nomes diferentes. Aceite para atualizar o nome no registro.</div>
              {motSugestData.map((s,i)=>(
                <div key={i} style={{background:s.aceito===true?`rgba(2,192,118,.07)`:s.aceito===false?`rgba(128,128,128,.04)`:`rgba(240,185,11,.04)`,border:`1px solid ${s.aceito===true?`rgba(2,192,118,.25)`:s.aceito===false?t.borda:`rgba(240,185,11,.2)`}`,borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:t.txt,marginBottom:4}}>
                    <span style={{color:t.ouro,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>{s.placa}</span>
                    {" · DT "}<span style={{color:t.azulLt}}>{s.reg.dt}</span>
                  </div>
                  <div style={{fontSize:10,color:t.txt2,marginBottom:6}}>
                    Nome no registro: <b style={{color:t.danger}}>{s.reg.nome||"—"}</b><br/>
                    Motorista cadastrado: <b style={{color:t.verde}}>{s.mot.nome}</b>
                  </div>
                  {s.aceito===null && (
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{const nd=[...motSugestData];nd[i]={...nd[i],aceito:true};setMotSugestData(nd);}} style={{flex:1,background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:7,padding:"5px 0",fontSize:10,color:t.verde,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon n="check" s={12} c={t.verde} sw={2.2}/> Aceitar</button>
                      <button onClick={()=>{const nd=[...motSugestData];nd[i]={...nd[i],aceito:false};setMotSugestData(nd);}} style={{flex:1,background:`rgba(128,128,128,.07)`,border:`1px solid ${t.borda}`,borderRadius:7,padding:"5px 0",fontSize:10,color:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon n="x" s={12} c={t.txt2} sw={2.2}/> Ignorar</button>
                    </div>
                  )}
                  {s.aceito===true && <div style={{fontSize:10,color:t.verde,fontWeight:700,display:"flex",alignItems:"center",gap:5}}><Icon n="check" s={11} c={t.verde} sw={2.2}/> Aceito — será aplicado ao salvar</div>}
                  {s.aceito===false && <div style={{fontSize:10,color:t.txt2}}>Ignorado</div>}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 16px 18px",borderTop:`1px solid ${t.borda}`}}>
              <button onClick={()=>setMotSugestOpen(false)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>FECHAR</button>
              <button onClick={()=>{
                const aceitos=motSugestData.filter(s=>s.aceito===true);
                if(!aceitos.length){setMotSugestOpen(false);return;}
                const nd=[...DADOS];
                aceitos.forEach(s=>{
                  const idx=nd.findIndex(r=>r.dt===s.reg.dt);
                  if(idx>=0)nd[idx]={...nd[idx],nome:s.mot.nome};
                });
                setDadosBase(nd);
                showToast(`✅ ${aceitos.length} registro(s) atualizado(s)!`,"ok");
                setMotSugestOpen(false);
              }} style={{...css.btnGreen,flex:1,justifyContent:"center",gap:6}}><Icon n="save" s={14} c="currentColor"/> APLICAR ACEITOS</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EXCLUSÃO EM LOTE ═══ */}
      {motExcluirLoteOpen && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setMotExcluirLoteOpen(false)}>
          <div style={{...css.modal,maxWidth:360}}>
            <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid rgba(246,70,93,.25)`}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:t.danger,display:"flex",alignItems:"center",gap:7}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,16)} EXCLUIR EM LOTE</div>
              <button onClick={()=>{setMotExcluirLoteOpen(false);setMotExcluirLoteTexto("");}} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
            </div>
            <div style={{padding:16}}>
              <div style={{fontSize:12,color:t.txt,marginBottom:8}}>Você está prestes a excluir <b style={{color:t.danger}}>{motSelecionados.size} motorista(s)</b>. Esta ação não pode ser desfeita.</div>
              <div style={{fontSize:10,color:t.txt2,marginBottom:10}}>Digite <b style={{color:t.danger}}>EXCLUIR</b> para confirmar:</div>
              <input
                value={motExcluirLoteTexto}
                onChange={e=>setMotExcluirLoteTexto(e.target.value.toUpperCase())}
                placeholder="EXCLUIR"
                style={{...css.inp,textAlign:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:4,color:t.danger,border:`1.5px solid ${motExcluirLoteTexto==="EXCLUIR"?"rgba(246,70,93,.5)":t.borda}`}}
              />
            </div>
            <div style={{display:"flex",gap:8,padding:"0 16px 18px"}}>
              <button onClick={()=>{setMotExcluirLoteOpen(false);setMotExcluirLoteTexto("");}} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
              <button disabled={motExcluirLoteTexto!=="EXCLUIR"} onClick={()=>{
                if(motExcluirLoteTexto!=="EXCLUIR")return;
                const nm=motoristas.filter((_,i)=>!motSelecionados.has(i));
                saveMotoristasLS(nm);
                registrarLog("EXCLUIR_MOTORISTAS_LOTE",`${motSelecionados.size} motorista(s) removido(s)`);
                showToast(`🗑️ ${motSelecionados.size} motorista(s) excluído(s)`);
                setMotSelecionados(new Set());
                setMotExcluirLoteOpen(false);
                setMotExcluirLoteTexto("");
              }} style={{flex:1,background:motExcluirLoteTexto==="EXCLUIR"?`rgba(246,70,93,.9)`:`rgba(246,70,93,.2)`,border:`1.5px solid rgba(246,70,93,.4)`,borderRadius:9,padding:"10px 0",color:motExcluirLoteTexto==="EXCLUIR"?"#fff":t.danger,fontSize:12,fontWeight:700,cursor:motExcluirLoteTexto==="EXCLUIR"?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .2s"}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,motExcluirLoteTexto==="EXCLUIR"?"#fff":t.danger,13)} CONFIRMAR EXCLUSÃO</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
