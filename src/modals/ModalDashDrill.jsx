import React from "react";
import { Badge } from "../design-system/components/Badge.jsx";
import { Button } from "../design-system/components/Button.jsx";
import { clickable } from "../utils.js";
import { faltandoFaturamento } from "../faturamentoParse.js";
import Icon from "../components/Icon.jsx";
import ModalHeader from "../components/ModalHeader.jsx";
import DestinosAccordion from "./DestinosAccordion.jsx";

const PAGINA = 10;

export default function ModalDashDrill({ ctx }) {
  const { dashDrillModal, setDashDrillModal, t, parseData, abrirDetalhe,
          isMobile, setActiveTab, setPlanilhaFiltroDestino, DADOS } = ctx;

  // Lista de registros longa (histórico do motorista) sai em páginas de 10.
  const [visiveis, setVisiveis] = React.useState(PAGINA);
  React.useEffect(() => { setVisiveis(PAGINA); }, [dashDrillModal]);

  if (!dashDrillModal) return null;

  // Histórico do motorista = TODAS as viagens da base carregada, não só as do
  // período do dashboard. `voltar` guarda a tela anterior pro botão Voltar.
  const abrirMotorista = (nome, destaque) => {
    const fonte = Array.isArray(DADOS) && DADOS.length ? DADOS : dashDrillModal.regs;
    const todas = fonte.filter(r => r.nome === nome)
      .sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;});
    if (!todas.length) return;
    setDashDrillModal({ type:"motorista", label:nome, regs:todas,
      voltar: destaque!==undefined ? {...dashDrillModal, destaque} : dashDrillModal });
  };
  const voltar = dashDrillModal.voltar;

  // "destinos" (plural) = lista completa em accordion; "destino" (singular) = uma rota só.
  const ehLista = dashDrillModal.type === "destinos";
  const nDestinos = ehLista
    ? new Set(dashDrillModal.regs.filter(r => r.destino).map(r => r.destino.trim().toUpperCase())).size
    : 0;

  return (
    <div
      className="co-modal-overlay co-modal-overlay--center"
      onClick={()=>setDashDrillModal(null)}
    >
      <div className="co-modal-box co-modal-box--flush" style={{ maxWidth: ehLista?860:640, maxHeight: "80vh" }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <ModalHeader
          tom="accent"
          icone={dashDrillModal.type==="motorista"||dashDrillModal.type==="motoristas"?"user":(dashDrillModal.type==="destino"||ehLista)?"map-pin":"chart"}
          titulo={dashDrillModal.label}
          sub={ehLista
            ? `${nDestinos} destino${nDestinos!==1?"s":""} no período · toque para ver os motoristas`
            : dashDrillModal.type==="motoristas"
            ? `${new Set(dashDrillModal.regs.map(r=>r.nome).filter(Boolean)).size} motoristas no período`
            : `${dashDrillModal.regs.length} ${dashDrillModal.regs.length!==1?"viagens":"viagem"} · ${dashDrillModal.type==="motorista"?"Histórico completo":dashDrillModal.type==="destino"?"Motoristas nesta rota":"Registros com este status"}`}
          esquerda={voltar&&(
            <Button variant="secondary" size="sm" onClick={()=>setDashDrillModal(voltar)} title="Voltar" style={{ minWidth: 44, flexShrink: 0 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              {!isMobile&&"Voltar"}
            </Button>
          )}
          onFechar={()=>setDashDrillModal(null)}
        />
        {/* Conteúdo */}
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"10px 14px 14px",maxHeight:"calc(96vh - 120px)"}}>
          {ehLista?(
            <DestinosAccordion
              regs={dashDrillModal.regs}
              destaque={dashDrillModal.destaque}
              t={t}
              isMobile={isMobile}
              onMotorista={abrirMotorista}
              onPlanilha={setPlanilhaFiltroDestino&&setActiveTab?(dest)=>{setDashDrillModal(null);setPlanilhaFiltroDestino(dest);setActiveTab("planilha");}:undefined}
            />
          ):dashDrillModal.type==="destino"?(
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
          ):dashDrillModal.type==="motoristas"?(
            (() => {
              const motMap = {};
              dashDrillModal.regs.forEach(r=>{if(r.nome){if(!motMap[r.nome])motMap[r.nome]={count:0,placa:r.placa||""};motMap[r.nome].count++;if(!motMap[r.nome].placa&&r.placa)motMap[r.nome].placa=r.placa;}});
              return Object.entries(motMap).sort((a,b)=>b[1].count-a[1].count).map(([nome,{count,placa}])=>(
                <div key={nome} {...clickable(()=>abrirMotorista(nome))} style={{background:t.card2,borderRadius:10,padding:"10px 12px",marginBottom:7,border:`1px solid ${t.borda}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background=`rgba(217,98,43,.06)`} onMouseLeave={e=>e.currentTarget.style.background=t.card2}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:`rgba(217,98,43,.12)`,border:`1.5px solid rgba(217,98,43,.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:t.ouro,flexShrink:0}}>{nome.charAt(0)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nome}</div>
                    {placa&&<div style={{fontSize:9,color:t.txt2,fontFamily:"var(--font-mono)",marginTop:1}}>{placa}</div>}
                  </div>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:t.ouro,flexShrink:0}}>{count}</span>
                  <span style={{fontSize:9,color:t.txt2,flexShrink:0}}>›</span>
                </div>
              ));
            })()
          ):(
            [...dashDrillModal.regs].sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;}).slice(0,visiveis).map((r,i)=>(
              <div key={i} {...clickable(()=>{setDashDrillModal(null);abrirDetalhe(r);})} style={{background:t.card2,borderRadius:10,padding:"9px 12px",marginBottom:6,border:`1px solid ${t.borda}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background=`rgba(217,98,43,.06)`} onMouseLeave={e=>e.currentTarget.style.background=t.card2}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:t.ouro,letterSpacing:1}}>{r.dt}</span>
                    {dashDrillModal.type==="motorista"&&<span style={{fontSize:11,color:t.txt,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nome||"—"}</span>}
                    {r.status&&<Badge variant="default" size="sm">{r.status}</Badge>}
                  </div>
                  {dashDrillModal.type==="faturamento" ? (
                    <div style={{fontSize:9,color:t.txt2,lineHeight:1.5,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                      <span>{r.nome||"—"} · {r.data_carr||"—"} · falta:</span>
                      {faltandoFaturamento(r).map(f=>(
                        <span key={f} style={{fontSize:8.5,fontWeight:700,color:t.warn,background:"rgba(217,98,43,.1)",border:"1px solid rgba(217,98,43,.28)",borderRadius:4,padding:"1px 5px"}}>{f}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{fontSize:9,color:t.txt2,lineHeight:1.5,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                      <Icon n="map-pin" s={10} c={t.txt2}/> {r.destino||"—"} · <Icon n="package" s={10} c={t.txt2}/> {r.data_carr||"—"} · {r.data_desc?<><Icon n="check-circle" s={10} c={t.verde}/> {r.data_desc}</>:<><Icon n="clock" s={10} c={t.txt2}/> Pendente</>}
                    </div>
                  )}
                </div>
                <span style={{fontSize:9,color:t.txt2,flexShrink:0}}>›</span>
              </div>
            ))
          )}
          {!ehLista&&dashDrillModal.type!=="destino"&&dashDrillModal.type!=="motoristas"&&dashDrillModal.regs.length>visiveis&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,paddingTop:4}}>
              <span style={{fontSize:9,color:"var(--text3)",fontFamily:"var(--font-mono)"}}>{visiveis} de {dashDrillModal.regs.length}</span>
              <Button variant="secondary" size="sm" onClick={()=>setVisiveis(v=>v+PAGINA)}>
                Ver mais {Math.min(PAGINA,dashDrillModal.regs.length-visiveis)} ›
              </Button>
            </div>
          )}
          {dashDrillModal.regs.length===0&&<div style={{textAlign:"center",color:t.txt2,fontSize:12,padding:20}}>Nenhum registro encontrado.</div>}
        </div>
      </div>
    </div>
  );
}
