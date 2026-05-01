import React from "react";

export default function ModalConfigDB({ ctx }) {
  const {
    modalOpen, setModalOpen,
    t, css,
    hIco,
    showToast,
    conexoes, saveConexoesLS,
    motImportPrefOpen, setMotImportPrefOpen,
    motImportRaw,
    motImportPrefBusca, setMotImportPrefBusca,
    motImportPrefSel, setMotImportPrefSel,
    motoristas,
    setMotImportConfirm,
    setMotImportData,
    setMotImportOpen,
    setMotImportStep,
  } = ctx;

  if (modalOpen !== "configdb" && !motImportPrefOpen) return null;
  return (
    <>
      {/* ═══ CONFIG DB MODAL ═══ */}
      {modalOpen === "configdb" && (
        <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
          <div style={{...css.modal,maxWidth:480}}>
            <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
              <span style={{fontSize:19}}>🗄️</span>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.txt}}>BANCO DE DADOS</div><div style={{fontSize:10,color:t.txt2}}>Conexões Supabase</div></div>
              <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,maxHeight:"calc(96vh - 120px)"}}>
              {conexoes.map((c,i) => (
                <div key={i} style={{background:t.card2,borderRadius:9,padding:10,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                  <span>🗄️</span>
                  <span style={{flex:1,fontSize:11,fontWeight:600,color:t.txt}}>{c.name||"Conexão"}</span>
                  <span style={{fontSize:9,color:t.verde}}>✅</span>
                </div>
              ))}
              <div style={{marginTop:12}}>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginBottom:7}}>Adicionar Conexão</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <input id="cdbUrl" placeholder="https://xxx.supabase.co" style={css.inp} />
                  <input id="cdbKey" placeholder="anon key" style={css.inp} />
                  <input id="cdbName" placeholder="Nome" style={css.inp} />
                  <button onClick={()=>{
                    const url=document.getElementById("cdbUrl").value.trim();
                    const key=document.getElementById("cdbKey").value.trim();
                    const name=document.getElementById("cdbName").value.trim()||"Conexão";
                    if(!url||!key){showToast("⚠️ URL e Key obrigatórios","warn");return;}
                    const nc=[...conexoes,{url,key,name}];
                    saveConexoesLS(nc);
                    saveJSON("co_conexao_ativa",nc.length-1);
                    showToast("✅ Conexão adicionada!","ok");
                    setModalOpen(null);
                  }} style={{...css.btnGreen,justifyContent:"center"}}>🗄️ CONECTAR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL FILTRO DE PREFIXOS ═══ */}
      {motImportPrefOpen && (()=>{
        const _pm2 = new Map();
        motImportRaw.forEach(c=>{const p=(c.nome||"").trim().split(/\s+/)[0].toUpperCase();if(p)_pm2.set(p,(_pm2.get(p)||0)+1);});
        const _allP = [..._pm2.keys()].sort((a,b)=>_pm2.get(b)-_pm2.get(a));
        const _filtP = motImportPrefBusca.trim() ? _allP.filter(p=>p.includes(motImportPrefBusca.trim().toUpperCase())) : _allP;
        const _PAVISO = new Set(["AGENC","AGENCIA","POSTO","SEGURO","BANCO","FILIAL","COOP","ASSOC","TRANS","TRANSP"]);
        const _totalSel = motImportRaw.filter(c=>motImportPrefSel.has((c.nome||"").trim().split(/\s+/)[0].toUpperCase())).length;
        const _prosseguir = () => {
          const _importados = motImportRaw.filter(c=>motImportPrefSel.has((c.nome||"").trim().split(/\s+/)[0].toUpperCase()));
          if(!_importados.length){showToast("⚠️ Nenhum contato selecionado","warn");return;}
          const _novos=[],_conflitos=[];
          _importados.forEach(imp=>{
            const nN=imp.nome.toUpperCase(),cN=(imp.cpf||"").replace(/\D/g,""),p1N=(imp.placa1||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
            const ex=motoristas.find(m=>{
              if(cN&&m.cpf&&m.cpf.replace(/\D/g,"")=== cN)return true;
              if(p1N&&m.placa1&&m.placa1.toUpperCase().replace(/[^A-Z0-9]/g,"")=== p1N)return true;
              return m.nome&&m.nome.toUpperCase()===nN;
            });
            if(ex){_conflitos.push({atual:ex,imp,escolha:"manter"});}else{_novos.push(imp);}
          });
          const _vinc=[];
          [..._novos,..._conflitos.map(c=>c.imp)].forEach(imp=>{
            const iP=[imp.placa1,imp.placa2,imp.placa3,imp.placa4].filter(Boolean).map(p=>p.toUpperCase().replace(/[^A-Z0-9]/g,""));
            if(!iP.length)return;
            DADOS.forEach(reg=>{
              const rP=(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
              if(!rP||!iP.includes(rP))return;
              const nR=(reg.nome||"").toUpperCase().trim(),nI=imp.nome.toUpperCase().trim();
              if(!nR||nR!==nI)_vinc.push({contato:imp,reg,placa:rP,aceito:null});
            });
          });
          const _vU=_vinc.filter((v,i)=>_vinc.findIndex(x=>x.reg.dt===v.reg.dt&&x.contato.nome===v.contato.nome)===i);
          setMotImportData({novos:_novos,conflitos:_conflitos,vinculos:_vU});
          setMotImportConfirm(""); setMotImportStep(1);
          setMotImportPrefOpen(false); setMotImportOpen(true);
        };
        return (
          <div style={{...css.overlay,alignItems:"center",backdropFilter:"blur(10px)",padding:16}} onClick={()=>setMotImportPrefOpen(false)}>
            <div style={{...css.modal,borderRadius:18,maxWidth:540,maxHeight:"90vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
              <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:9,background:`rgba(22,119,255,.15)`,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></>,t.azulLt,18,2)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:t.txt}}>Filtrar por Prefixo</div>
                  <div style={{fontSize:10,color:t.txt2,marginTop:1}}>{motImportRaw.length} contatos · {_allP.length} prefixos únicos</div>
                </div>
                <button onClick={()=>setMotImportPrefOpen(false)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${t.borda}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
                <input value={motImportPrefBusca} onChange={e=>setMotImportPrefBusca(e.target.value)} placeholder="Buscar prefixo..." style={{...css.inp,flex:1,minWidth:120,fontSize:11}}/>
                <button onClick={()=>setMotImportPrefSel(new Set(_allP))} style={{...css.hBtn,fontSize:10,padding:"5px 10px"}}>✅ Todos</button>
                <button onClick={()=>setMotImportPrefSel(new Set())} style={{...css.hBtn,fontSize:10,padding:"5px 10px"}}>☐ Nenhum</button>
              </div>
              <div style={{padding:"8px 14px",background:`rgba(240,185,11,.05)`,borderBottom:`1px solid ${t.borda}`,fontSize:10,color:t.ouro,flexShrink:0}}>
                ⚠️ Prefixos em <span style={{color:t.danger}}>vermelho</span> são comumente não-motoristas e foram pré-desmarcados. Ajuste conforme necessário.
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
                {_filtP.map(pref=>{
                  const sel=motImportPrefSel.has(pref),isAv=_PAVISO.has(pref),qt=_pm2.get(pref)||0;
                  return (
                    <div key={pref} onClick={()=>{const ns=new Set(motImportPrefSel);if(ns.has(pref))ns.delete(pref);else ns.add(pref);setMotImportPrefSel(ns);}} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",background:sel?`rgba(2,192,118,.05)`:`rgba(246,70,93,.03)`,border:`1px solid ${sel?`rgba(2,192,118,.2)`:`rgba(246,70,93,.15)`}`}}>
                      <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${sel?t.verde:t.danger}`,background:sel?t.verde:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#000",fontWeight:700}}>{sel?"✓":""}</div>
                      <span style={{flex:1,fontSize:12,fontWeight:700,color:isAv&&!sel?t.danger:t.txt}}>{pref}</span>
                      {isAv && <span style={{fontSize:9,color:t.danger,background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:4,padding:"1px 5px"}}>⚠️ não-motorista</span>}
                      <span style={{fontSize:10,color:t.txt2}}>{qt} contato{qt!==1?"s":""}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{padding:"12px 14px",borderTop:`1px solid ${t.borda}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:t.verde}}>{_totalSel} selecionados</div><div style={{fontSize:9,color:t.txt2}}>{motImportRaw.length-_totalSel} ignorados</div></div>
                <button onClick={()=>setMotImportPrefOpen(false)} style={{...css.btnOutline,padding:"9px 16px",fontSize:12}}>Cancelar</button>
                <button onClick={_prosseguir} disabled={_totalSel===0} style={{...css.btnGold,padding:"9px 18px",fontSize:12,opacity:_totalSel===0?.5:1}}>Prosseguir ({_totalSel}) →</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
