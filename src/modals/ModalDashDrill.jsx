import React from "react";
import { clickable } from "../utils.js";
import Icon from "../components/Icon.jsx";

export default function ModalDashDrill({ ctx }) {
  const { dashDrillModal, setDashDrillModal, t, parseData, abrirDetalhe } = ctx;

  if (!dashDrillModal) return null;

  return (
    <div
      className="co-modal-overlay"
      style={{padding:"0 0 68px"}}
      onClick={()=>setDashDrillModal(null)}
    >
      <div style={{background:t.card,borderRadius:"18px 18px 0 0",width:"100%",maxWidth:640,border:`1px solid ${t.borda}`,boxShadow:"0 -12px 48px rgba(0,0,0,.5)",maxHeight:"80vh",display:"flex",flexDirection:"column",animation:"mslide .26s cubic-bezier(.34,1.1,.64,1)"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"14px 18px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
          <div style={{width:36,height:36,borderRadius:9,background:`rgba(217,98,43,.12)`,border:`1.5px solid rgba(217,98,43,.3)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon n={dashDrillModal.type==="motorista"?"user":dashDrillModal.type==="destino"?"map-pin":"chart"} s={18} c={t.ouro}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:800,color:t.txt,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dashDrillModal.label}</div>
            <div style={{fontSize:9,color:t.txt2,marginTop:2}}>{dashDrillModal.regs.length} viagem{dashDrillModal.regs.length!==1?"s":""} · {dashDrillModal.type==="motorista"?"Histórico do motorista":dashDrillModal.type==="destino"?"Motoristas nesta rota":"Registros com este status"}</div>
          </div>
          <button onClick={()=>setDashDrillModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
        </div>
        {/* Conteúdo */}
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"10px 14px 14px",maxHeight:"calc(96vh - 120px)"}}>
          {dashDrillModal.type==="destino"?(
            (() => {
              const motMap = {};
              dashDrillModal.regs.forEach(r=>{if(r.nome){if(!motMap[r.nome])motMap[r.nome]={count:0,dts:[],destinos:new Set()};motMap[r.nome].count++;motMap[r.nome].dts.push(r.dt);motMap[r.nome].destinos.add(r.destino||"—");}});
              return Object.entries(motMap).sort((a,b)=>b[1].count-a[1].count).map(([nome,info])=>(
                <div key={nome} style={{background:t.card2,borderRadius:10,padding:"10px 12px",marginBottom:7,border:`1px solid ${t.borda}`,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:`rgba(217,98,43,.12)`,border:`1.5px solid rgba(217,98,43,.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:t.ouro,flexShrink:0}}>{nome.charAt(0)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nome}</div>
                    <div style={{fontSize:9,color:t.txt2,marginTop:1}}>{info.count} viagem{info.count!==1?"s":""} · DTs: {info.dts.slice(0,3).join(", ")}{info.dts.length>3?`... +${info.dts.length-3}`:""}</div>
                  </div>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:t.ouro,flexShrink:0}}>{info.count}</span>
                </div>
              ));
            })()
          ):(
            dashDrillModal.regs.sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;}).map((r,i)=>(
              <div key={i} {...clickable(()=>{setDashDrillModal(null);abrirDetalhe(r);})} style={{background:t.card2,borderRadius:10,padding:"9px 12px",marginBottom:6,border:`1px solid ${t.borda}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background=`rgba(217,98,43,.06)`} onMouseLeave={e=>e.currentTarget.style.background=t.card2}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:t.ouro,letterSpacing:1}}>{r.dt}</span>
                    {dashDrillModal.type==="motorista"&&<span style={{fontSize:11,color:t.txt,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nome||"—"}</span>}
                    {r.status&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:4,background:`rgba(128,128,128,.12)`,color:t.txt2,fontWeight:600}}>{r.status}</span>}
                  </div>
                  <div style={{fontSize:9,color:t.txt2,lineHeight:1.5,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                    <Icon n="map-pin" s={10} c={t.txt2}/> {r.destino||"—"} · <Icon n="package" s={10} c={t.txt2}/> {r.data_carr||"—"} · {r.data_desc?<><Icon n="check-circle" s={10} c={t.verde}/> {r.data_desc}</>:<><Icon n="clock" s={10} c={t.txt2}/> Pendente</>}
                  </div>
                </div>
                <span style={{fontSize:9,color:t.txt2,flexShrink:0}}>›</span>
              </div>
            ))
          )}
          {dashDrillModal.regs.length===0&&<div style={{textAlign:"center",color:t.txt2,fontSize:12,padding:20}}>Nenhum registro encontrado.</div>}
        </div>
      </div>
    </div>
  );
}
