import React from "react";
import { supaStorageUpload } from "../supabase.js";
import Toggle from "../components/Toggle.jsx";

export default function ModalNFD({ ctx }) {
  const {
    nfdAlertOpen, setNfdAlertOpen,
    nfdFotos, setNfdFotos,
    nfdForm, setNfdForm,
    nfdRegistrarOutra, setNfdRegistrarOutra,
    nfdUploadando, setNfdUploadando,
    formData, setFormData,
    getConexao, showToast,
    t, css, hIco,
  } = ctx;

  return (
    <>
      {/* ═══ MODAL NFD — Nota de Devolução ═══ */}
      {nfdAlertOpen && (
        <div className="co-modal-overlay co-modal-overlay--center" onClick={()=>setNfdAlertOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:20,width:"100%",maxWidth:420,border:`1.5px solid rgba(246,70,93,.35)`,boxShadow:"0 24px 64px rgba(0,0,0,.6)",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:42,height:42,borderRadius:11,background:"rgba(246,70,93,.12)",border:"1.5px solid rgba(246,70,93,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,t.danger,20,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:t.txt,letterSpacing:.3}}>NFD — Nota de Devolução</div>
                <div style={{fontSize:10,color:t.danger,fontWeight:600}}>Descarga registrada · Houve NFD?</div>
              </div>
              <button onClick={()=>{setNfdAlertOpen(false);setNfdFotos([]);}} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            {/* Tipo */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,color:t.txt2,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Tipo</div>
              {(()=>{
                const TIPOS_NFD=[
                  {k:'avaria',l:'Avaria',cor:'var(--cat-orange)'},
                  {k:'falta',l:'Falta',cor:'var(--cat-red)'},
                  {k:'dev_total',l:'Dev. Total',cor:'var(--cat-purple)'},
                  {k:'dev_parcial',l:'Dev. Parcial',cor:'var(--cat-pink)'},
                  {k:'desacordo',l:'Desacordo',cor:'var(--cat-gold)'},
                  {k:'rod',l:'ROD',cor:'var(--cat-coral)'},
                  {k:'sobra',l:'Sobra',cor:'var(--cat-mint)'},
                ];
                const TIPOS_COM_NF_NFD=new Set(['falta','avaria','dev_total','dev_parcial','desacordo']);
                const nfListNFD=(formData?.nf||'').split(',').map(s=>s.trim()).filter(Boolean);
                return (<>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                    {TIPOS_NFD.map(tp=>{const ativo=nfdForm.tipo===tp.k;return(
                      <button key={tp.k} onClick={()=>setNfdForm(p=>({...p,tipo:tp.k}))}
                        style={{padding:'6px 4px',borderRadius:7,border:`1.5px solid ${ativo?tp.cor:t.borda}`,
                          background:ativo?`${tp.cor}22`:'transparent',color:ativo?tp.cor:t.txt2,
                          fontSize:10,fontWeight:ativo?700:400,cursor:'pointer',fontFamily:'inherit'}}>
                        {tp.l}
                      </button>
                    );})}
                  </div>
                  {TIPOS_COM_NF_NFD.has(nfdForm.tipo)&&nfListNFD.length>0&&(
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:9,color:t.txt2,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>NFs Afetadas</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                        {nfListNFD.map(nf=>{
                          const cur=(nfdForm.nfs||'').split(',').map(s=>s.trim()).filter(Boolean);
                          const sel=cur.includes(nf);
                          return(<button key={nf} onClick={()=>{const next=sel?cur.filter(x=>x!==nf):[...cur,nf];setNfdForm(p=>({...p,nfs:next.join(', ')}));}}
                            style={{padding:'4px 10px',borderRadius:6,border:`1.5px solid ${sel?'var(--cat-gold)':t.borda}`,
                              background:sel?'rgba(240,185,11,.1)':t.bg,color:sel?'var(--cat-gold)':t.txt2,
                              fontSize:10,fontWeight:sel?700:400,cursor:'pointer'}}>
                            {nf}
                          </button>);
                        })}
                      </div>
                    </div>
                  )}
                  {nfdForm.tipo==='rod'&&(
                    <div style={{marginTop:8}}>
                      <label style={{fontSize:9,textTransform:'uppercase',letterSpacing:1.2,color:t.txt2,fontWeight:600,display:'block',marginBottom:4}}>Localização da Carga</label>
                      <input value={nfdForm.localizacao||''} onChange={e=>setNfdForm(p=>({...p,localizacao:e.target.value}))} placeholder='Ex: Em trânsito, SP – RJ km 210' style={css.inp}/>
                    </div>
                  )}
                </>);
              })()}
            </div>
            {/* Numero e Valor */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div>
                <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:4}}>{nfdForm.tipo==="sobra"?"Referência (opc.)":"Nº NFD *"}</label>
                <input value={nfdForm.numero} onChange={e=>setNfdForm(p=>({...p,numero:e.target.value}))} placeholder={nfdForm.tipo==="sobra"?"Ref. interna":"Ex: 00123456"} style={{...css.inp,fontSize:12,padding:"9px 10px"}} />
              </div>
              <div>
                <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:4}}>Valor (R$)</label>
                <input value={nfdForm.valor} onChange={e=>setNfdForm(p=>({...p,valor:e.target.value}))} placeholder="0,00" style={{...css.inp,fontSize:12,padding:"9px 10px"}} />
              </div>
            </div>
            {/* Fotos */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
                📷 Fotos do material
                <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:t.txt2}}>{nfdForm.tipo==="sobra"?"— recomendado":"— opcional"} · máx. 5</span>
              </label>
              <input type="file" accept="image/*" multiple onChange={e=>{
                const files=Array.from(e.target.files||[]);
                if(nfdFotos.length+files.length>5){showToast("⚠️ Máximo 5 fotos","warn");e.target.value="";return;}
                files.forEach(f=>{const rd=new FileReader();rd.onload=ev=>setNfdFotos(p=>[...p,{file:f,preview:ev.target.result,nome:f.name}]);rd.readAsDataURL(f);});
                e.target.value="";
              }} style={{...css.inp,padding:"7px 10px",fontSize:11,marginBottom:nfdFotos.length>0?8:0}} />
              {nfdFotos.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
                  {nfdFotos.map((img,ii)=>(
                    <div key={ii} style={{position:"relative"}}>
                      <img src={img.preview} alt={img.nome} style={{width:68,height:68,objectFit:"cover",borderRadius:9,border:`1.5px solid ${t.borda}`}} />
                      <button onClick={()=>setNfdFotos(p=>p.filter((_,j)=>j!==ii))} style={{position:"absolute",top:-5,right:-5,width:18,height:18,borderRadius:"50%",background:t.danger,border:"none",color:"#fff",fontSize:10,cursor:"pointer",lineHeight:"17px",fontWeight:700,padding:0}}>×</button>
                      <div style={{fontSize:8,color:t.txt2,textAlign:"center",marginTop:2,maxWidth:68,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{img.nome}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Checkbox registrar outra */}
            <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"6px 10px",borderRadius:8,border:`1px solid ${t.borda}`,background:`rgba(240,185,11,.04)`,cursor:"pointer",userSelect:"none"}}>
              <Toggle checked={nfdRegistrarOutra} color="#F3BA2F" onChange={setNfdRegistrarOutra} />
              <span style={{fontSize:11,color:nfdRegistrarOutra?"#F3BA2F":t.txt2,fontWeight:nfdRegistrarOutra?700:400}}>Registrar outra NF após salvar</span>
            </label>
            {/* Ações */}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setNfdAlertOpen(false);setNfdFotos([]);setNfdRegistrarOutra(false);}} style={{flex:1,background:`rgba(128,128,128,.08)`,border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px",color:t.txt2,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                Não houve NFD
              </button>
              <button disabled={nfdUploadando} onClick={async()=>{
                if(nfdForm.tipo!=="sobra"&&!nfdForm.numero){showToast("⚠️ Informe o número da NFD","warn");return;}
                const conn=getConexao();
                let fotos=[];
                if(nfdFotos.length>0){
                  if(!conn){showToast("⚠️ Sem conexão — fotos não enviadas","warn");}
                  else{
                    setNfdUploadando(true);
                    try{
                      for(const img of nfdFotos){
                        const ts=Date.now();
                        const ext=(img.nome.split(".").pop()||"jpg").toLowerCase();
                        const safeName=img.nome.replace(/[^a-zA-Z0-9._-]/g,"_");
                        const filePath=`${formData.dt||"sem-dt"}/${ts}_${safeName}`;
                        const url=await supaStorageUpload(conn.url,conn.key,"nfd-fotos",filePath,img.file);
                        fotos.push(url);
                      }
                      showToast(`📷 ${fotos.length} foto(s) enviada(s)`,"ok");
                    }catch(e){showToast("⚠️ Erro no upload: "+e.message,"warn");}
                    setNfdUploadando(false);
                  }
                }
                const nfdData={...nfdForm,...(fotos.length>0?{fotos}:{})};
                setFormData(p=>({...p,nfd:nfdData}));
                const label=nfdForm.tipo.toUpperCase()+(nfdForm.numero?" · Nº "+nfdForm.numero:"")+(fotos.length>0?" · "+fotos.length+"📷":"");
                showToast(`✅ NFD registrada — ${label}`,"ok");
                if(nfdRegistrarOutra){
                  setNfdForm({numero:"",valor:"",tipo:"avaria"});
                  setNfdFotos([]);
                }else{
                  setNfdAlertOpen(false);
                  setNfdFotos([]);
                  setNfdRegistrarOutra(false);
                }
              }} style={{flex:1,background:nfdUploadando?`rgba(246,70,93,.04)`:`linear-gradient(135deg,rgba(246,70,93,.2),rgba(246,70,93,.1))`,border:`1.5px solid rgba(246,70,93,.5)`,borderRadius:9,padding:"10px",color:t.danger,fontWeight:700,fontSize:12,cursor:nfdUploadando?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5,opacity:nfdUploadando?.6:1}}>
                {nfdUploadando
                  ? <>{hIco(<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,t.danger,14,2)} Enviando fotos…</>
                  : <>{hIco(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,t.danger,14,2)} Registrar NFD</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
