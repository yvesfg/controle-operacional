import React from "react";
import KpiCard     from '../components/KpiCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import DataRow     from '../components/DataRow.jsx';
import SectionCard from '../components/SectionCard.jsx';
import PageHeader  from '../components/PageHeader.jsx';
import { parseData } from "../utils.js";

export default function DashboardView({ ctx }) {
  const {
    dashMes, setDashMes,
    dashOrigem, setDashOrigem,
    dashHeroTab, setDashHeroTab,
    dashRecentesN, setDashRecentesN,
    dashRecCardRef,
    dashData,
    canFin,
    parseData: parseDataCtx,
    t, css, DESIGN, hexRgb, hIco, showToast,
    setActiveTab,
    chartAreaRef, chartDonutRef,
    diariasData, motoristas,
    alertas, alertasOpen, setAlertasOpen,
    fmtMoeda, isMobile,
    setDetalheDT, setModalOpen,
    descargaData,
  } = ctx;

  const motsUniq = new Set(dashData.filtrado.map(r=>r.nome).filter(Boolean));
  const heroNum = dashHeroTab==="cte" && canFin
    ? (dashData.cteT>=1000 ? "R$ "+(dashData.cteT/1000).toFixed(1)+"k" : "R$ "+Math.round(dashData.cteT).toLocaleString("pt-BR"))
    : String(dashData.filtrado.length);
  const heroLabel = dashHeroTab==="cte" ? "Receita CTE no Período" : "Carregamentos no Período";

  // Status p/ legenda do donut
  const statusMapDash={};
  dashData.filtrado.forEach(r=>{const s=(r.status||"Sem Status");statusMapDash[s]=(statusMapDash[s]||0)+1;});
  const statusArrDash = Object.entries(statusMapDash).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const DONUT_LEGEND = ["#a855f7","#ec4899","#ef4444","#22c55e"];
  const totalStatusDash = statusArrDash.reduce((a,[,v])=>a+v,0);

  // Recentes
  const recentesDash = [...dashData.filtrado]
    .filter(r=>r.nome)
    .sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return db&&da?db-da:0;})
    .slice(0,10);

  // Status badge color
  const sc = s => {
    const u=(s||"").toUpperCase();
    if(u.includes("CARREGAD")) return t.roxo;
    if(u.includes("ENTREG")) return "#22c55e";
    if(u.includes("AGUARD")||u.includes("PEND")) return "#f59e0b";
    if(u.includes("CANCEL")||u.includes("NO-SHOW")) return "#ef4444";
    return "#3b82f6";
  };


  return (
    <div>
      {/* ── Filtros compactos ── */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <select value={dashMes} onChange={e=>setDashMes(e.target.value)} style={{...css.inp,width:"auto",padding:"3px 8px",fontSize:9,height:26,cursor:"pointer",border:`1.5px solid ${dashMes!=="todos"?t.ouro:t.borda}`,color:dashMes!=="todos"?t.ouro:t.txt2,fontWeight:700,fontFamily:DESIGN.fnt.b}}>
          <option value="todos">Mês: Todos</option>
          {dashData.meses.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        {dashOrigem!=="todos" && (
          <button onClick={()=>setDashOrigem("todos")} style={{marginLeft:4,fontSize:9,background:"transparent",border:`1px solid ${hexRgb(t.danger,.3)}`,borderRadius:DESIGN.r.tag,color:t.danger,cursor:"pointer",padding:"3px 9px",fontFamily:DESIGN.fnt.b}}>✕ {dashOrigem==="BELEM"?"BELEM-PA":dashOrigem==="IMPERATRIZ"?"IMPERATRIZ-MA":dashOrigem}</button>
        )}
        {dashOrigem==="todos" && dashData.cidades.length>0 && (
          <select onChange={e=>setDashOrigem(e.target.value)} value={dashOrigem} style={{...css.inp,width:"auto",padding:"3px 8px",fontSize:9,height:26,cursor:"pointer",marginLeft:4}}>
            <option value="todos">Origem: Todas</option>
            {dashData.cidades.map(c=><option key={c} value={c}>{c==="BELEM"?"BELEM-PA":c==="IMPERATRIZ"?"IMPERATRIZ-MA":c}</option>)}
          </select>
        )}
      </div>

      {/* ── KPI Strip ── */}
      {(()=>{
        const carregadoN = statusMapDash["Carregado"]||statusMapDash["CARREGADO"]||0;
        const taxaEfic = totalStatusDash>0?Math.round(carregadoN/totalStatusDash*100):0;
        const cteMed = dashData.filtrado.length>0&&canFin ? dashData.cteT/dashData.filtrado.length : 0;
        const comD = diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso");
        const totalDevD = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_prev)||0),0);
        const totalPgD  = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_pg)||0),0);
        const saldoD = totalDevD-totalPgD;
        const kpis = [
          {label:dashHeroTab==="cte"?"Receita CTE":"Carregamentos",value:heroNum,sub:"no período",color:t.azulLt,border:`rgba(22,119,255,.2)`,icon:<><path d="M1 3h15v13H1z"/><path d="M16 8l4 2v5h-4V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,click:()=>setDashHeroTab(dashHeroTab==="cte"?"carr":"cte")},
          {label:"Taxa Eficiência",value:`${taxaEfic}%`,sub:`${carregadoN} carregados`,color:taxaEfic>=90?t.verde:taxaEfic>=70?t.ouro:t.danger,border:taxaEfic>=90?`rgba(2,192,118,.2)`:taxaEfic>=70?`rgba(240,185,11,.2)`:`rgba(246,70,93,.2)`,icon:<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>},
          {label:"DTs Únicas",value:String(dashData.dtsU.size),sub:"documentos",color:"#a855f7",border:`rgba(168,85,247,.2)`,icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,click:()=>setActiveTab("planilha")},
          {label:"Motoristas Ativos",value:String(motsUniq.size),sub:`de ${motoristas.length} cadastrados`,color:t.verde,border:`rgba(2,192,118,.2)`,icon:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,click:()=>setActiveTab("motoristas")},
          ...(canFin?[{label:"CTE Médio/Viagem",value:cteMed>=1000?"R$"+(cteMed/1000).toFixed(1)+"k":cteMed>0?"R$"+Math.round(cteMed).toLocaleString("pt-BR"):"—",sub:"por carregamento",color:t.verde,border:`rgba(2,192,118,.2)`,icon:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>}]:[]),
          ...(canFin?[{label:"Diárias a Pagar",value:saldoD>0?(saldoD>=1000?"R$"+(saldoD/1000).toFixed(1)+"k":"R$"+Math.round(saldoD).toLocaleString("pt-BR")):"Quitado",sub:`de ${fmtMoeda(totalDevD)} devido`,color:saldoD>0?t.danger:t.verde,border:saldoD>0?`rgba(246,70,93,.2)`:`rgba(2,192,118,.2)`,icon:<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,click:()=>setActiveTab("diarias")}]:[]),
          {label:"Alertas Ativos",value:String(alertas.length),sub:alertas.length===0?"tudo em ordem":"atenção necessária",color:alertas.length===0?t.verde:t.danger,border:alertas.length===0?`rgba(2,192,118,.2)`:`rgba(246,70,93,.2)`,icon:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,click:()=>setAlertasOpen(!alertasOpen)},
        ];
        return (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":`repeat(${kpis.length},1fr)`,gap:isMobile?6:8,marginBottom:12}}>
            {kpis.map((k,i)=>(
              <div key={i} onClick={k.click} style={{background:t.card,borderRadius:isMobile?8:12,border:`1px solid ${t.borda}`,borderTop:`3px solid ${k.color}`,padding:isMobile?"8px 10px":"12px 14px",cursor:k.click?"pointer":"default",transition:"all .15s"}}
                onMouseEnter={e=>k.click&&(e.currentTarget.style.background=t.card2)}
                onMouseLeave={e=>k.click&&(e.currentTarget.style.background=t.card)}
              >
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:isMobile?3:8}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:isMobile?9:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400,lineHeight:1.4,paddingRight:4}}>{k.label}</div>
                  <div style={{width:isMobile?16:22,height:isMobile?16:22,borderRadius:6,background:`${k.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{hIco(k.icon,k.color,isMobile?9:11)}</div>
                </div>
                <div style={{fontFamily:"var(--font-heading)",fontSize:isMobile?18:28,fontWeight:700,letterSpacing:"-0.04em",color:k.color,lineHeight:1,marginBottom:2}}>{k.value}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?9:12,color:"var(--text2)",lineHeight:1.3}}>{k.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Main Grid: Chart | Status DTs | Top Motoristas ── */}
      {(()=>{
        const motCount={};
        dashData.filtrado.forEach(r=>{if(r.nome){if(!motCount[r.nome])motCount[r.nome]={ct:0,placa:r.placa||""};motCount[r.nome].ct++;if(!motCount[r.nome].placa&&r.placa)motCount[r.nome].placa=r.placa;}});
        const topMot=Object.entries(motCount).sort((a,b)=>b[1].ct-a[1].ct).slice(0,5);
        const maxMot=topMot[0]?.[1]?.ct||1;
        const cores=[t.ouro,t.azulLt,t.verde,"#a855f7","#ec4899"];
        return (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:12,marginBottom:12}}>
            {/* ─ Area Chart ─ */}
            <div style={{...css.card,padding:16}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Evolução do Período</div>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button onClick={()=>setDashHeroTab("carr")} style={{padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,borderRadius:20,border:`1px solid ${dashHeroTab==="carr"?t.txt:hexRgb(t.txt,.18)}`,background:dashHeroTab==="carr"?t.txt:"transparent",color:dashHeroTab==="carr"?t.bg:t.txt2}}>Carregamentos</button>
                    {canFin&&<button onClick={()=>setDashHeroTab("cte")} style={{padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,borderRadius:20,border:`1px solid ${dashHeroTab==="cte"?t.txt:hexRgb(t.txt,.18)}`,background:dashHeroTab==="cte"?t.txt:"transparent",color:dashHeroTab==="cte"?t.bg:t.txt2}}>Receita CTE</button>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:28,fontWeight:700,letterSpacing:"-0.04em",color:"var(--text)",lineHeight:1}}>{heroNum}</div>
                  <div style={{fontSize:9,color:"#22c55e"}}>↗ {heroLabel}</div>
                </div>
              </div>
              <div style={{height:200}}><canvas ref={chartAreaRef} /></div>
            </div>
            {/* ─ Status DTs ─ */}
            <div style={{...css.card,padding:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Status das DTs</span>
                <button onClick={()=>setActiveTab("planilha")} style={{fontSize:9,color:"#a855f7",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Detalhes ›</button>
              </div>
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                <div style={{width:90,height:90}}><canvas ref={chartDonutRef} /></div>
              </div>
              <div style={{textAlign:"center",marginBottom:10}}>
                <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:.5}}>Total de DTs</div>
                <div style={{fontFamily:DESIGN.fnt.h,fontSize:24,letterSpacing:1,color:t.txt,lineHeight:1.1}}>{totalStatusDash}</div>
              </div>
              {statusArrDash.map(([s,v],i)=>{
                const pct=totalStatusDash>0?Math.round(v/totalStatusDash*100):0;
                return (
                  <div key={s} style={{marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:DONUT_LEGEND[i]||"#666"}}/>
                        <span style={{fontSize:9,color:t.txt2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:70}}>{s}</span>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:t.txt,flexShrink:0}}>{v} <span style={{fontSize:8,color:t.txt2,fontWeight:400}}>{pct}%</span></span>
                    </div>
                    <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:DONUT_LEGEND[i]||"#666",borderRadius:2}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ─ Top Motoristas ─ */}
            <div style={{...css.card,padding:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Top Motoristas</span>
                <button onClick={()=>setActiveTab("motoristas")} style={{fontSize:9,color:t.ouro,background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver todos ›</button>
              </div>
              {topMot.length===0?(
                <div style={{textAlign:"center",padding:20,color:t.txt2,fontSize:11}}>Sem dados</div>
              ):topMot.map(([nome,{ct,placa}],i)=>{
                const initials=(nome||"?").split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase();
                const pct=Math.round(ct/maxMot*100);
                const partes=(nome||"").split(" ").filter(Boolean);
                const nomeExib=partes.length>=2?`${partes[0]} ${partes[1]}`:partes[0]||"?";
                return (
                  <div key={nome} style={{marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:`${cores[i]}22`,border:`1px solid ${cores[i]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:cores[i],flexShrink:0}}>{initials}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeExib}</div>
                        {placa&&<div style={{fontSize:8,color:t.txt2,fontFamily:"var(--font-mono)",letterSpacing:.5,marginTop:1}}>{placa}</div>}
                      </div>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:13,fontWeight:600,color:cores[i],flexShrink:0}}>{ct}</span>
                    </div>
                    <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:cores[i],borderRadius:2}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Bottom: Registros Recentes + Painel Operacional ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 2fr",gap:12,alignItems:"start"}}>
        {/* Registros Recentes — altura calculada para não cortar linhas */}
        <div ref={dashRecCardRef} style={{...css.card,padding:14,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexShrink:0}}>
            <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Registros Recentes</span>
            <button onClick={()=>setActiveTab("planilha")} style={{fontSize:10,color:"#a855f7",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver Tudo ›</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {recentesDash.length===0?(
              <div style={{textAlign:"center",padding:16,color:t.txt2,fontSize:11}}>Sem dados no período</div>
            ):recentesDash.slice(0,dashRecentesN).map((r,i)=>{
              const partes=(r.nome||"").split(" ").filter(Boolean);
              const nomeExib=partes.length>=2?`${partes[0]} ${partes[1]}`:partes[0]||"?";
              const initials=partes.map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
              const CORES_DASH=[t.ouro,t.azulLt,t.verde,"#a855f7","#ec4899"];
              const cor=CORES_DASH[i%CORES_DASH.length];
              const origemCurta=(r.origem||"").split(/[-–\s]+/)[0].trim();
              const destinoCurto=(r.destino||"").split(/[-–\s]+/)[0].trim();
              const rota=origemCurta&&destinoCurto?`${origemCurta} → ${destinoCurto}`:origemCurta||destinoCurto||"";
              return (
                <div key={i} onClick={()=>{setDetalheDT(r);setModalOpen("detalhe");}}
                  style={{height:40,display:"flex",alignItems:"center",gap:8,padding:"0 4px",borderTop:i===0?"none":`1px solid ${hexRgb(t.borda,.4)}`,cursor:"pointer",borderRadius:6,transition:"background .1s",flexShrink:0}}
                  onMouseEnter={e=>e.currentTarget.style.background=t.card2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  <div style={{width:26,height:26,borderRadius:"50%",background:`${cor}22`,border:`1px solid ${cor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:cor,flexShrink:0}}>{initials}</div>
                  <div style={{minWidth:0,flex:"0 0 110px"}}>
                    <div style={{fontSize:10,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeExib}</div>
                    <div style={{fontSize:8,color:t.txt2,fontFamily:"var(--font-mono)",letterSpacing:.4,marginTop:1,display:"flex",gap:5,overflow:"hidden"}}>
                      {r.placa&&<span style={{flexShrink:0}}>{r.placa}</span>}
                      <span style={{color:t.txt2,flexShrink:0}}>{r.dt}</span>
                    </div>
                  </div>
                  {rota&&<div style={{flex:1,fontSize:9,color:t.txt2,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 4px"}}>{rota}</div>}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                    <span style={{padding:"1px 5px",borderRadius:4,fontFamily:"var(--font-mono)",fontSize:9,fontWeight:500,textTransform:"uppercase",color:sc(r.status),background:`${sc(r.status)}1a`,whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{(r.status||"–").slice(0,10)}</span>
                    {canFin&&r.vl_cte&&parseFloat(r.vl_cte)>0&&<span style={{fontSize:9,fontWeight:600,color:t.txt,fontFamily:"var(--font-mono)"}}>{"R$"+(parseFloat(r.vl_cte)/1000).toFixed(1)+"k"}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel Operacional: Diárias + Descargas + Top Pendentes */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Diárias */}
          <div style={{...css.card,padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Diárias</span>
              <button onClick={()=>setActiveTab("diarias")} style={{fontSize:9,color:t.ouro,background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver ›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
              {[{l:"No Prazo",v:diariasData.ok,c:t.verde,bg:`rgba(2,192,118,.08)`},{l:"Perdeu Agenda",v:diariasData.atraso,c:t.danger,bg:`rgba(246,70,93,.08)`},{l:"Aguardando",v:diariasData.pend,c:t.ouro,bg:`rgba(240,185,11,.08)`}].map(d=>(
                <div key={d.l} onClick={()=>setActiveTab("diarias")} style={{background:d.bg,borderRadius:8,padding:"8px 6px",textAlign:"center",cursor:"pointer"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:20,fontWeight:700,letterSpacing:"-0.03em",color:d.c,lineHeight:1}}>{d.v}</div>
                  <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:t.txt2,marginTop:3,lineHeight:1.3}}>{d.l}</div>
                </div>
              ))}
            </div>
            {canFin&&(()=>{
              const comD2=diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso");
              const dev2=comD2.reduce((s,{r})=>s+(parseFloat(r.diaria_prev)||0),0);
              const pg2=comD2.reduce((s,{r})=>s+(parseFloat(r.diaria_pg)||0),0);
              const sld2=dev2-pg2;
              if(!dev2)return null;
              const pct=dev2>0?Math.min(100,Math.round(pg2/dev2*100)):0;
              return (
                <div>
                  <div style={{padding:"7px 10px",borderRadius:8,background:t.card2,border:`1px solid ${t.borda}`,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{fontSize:9,color:t.txt2}}>Saldo a pagar</div>
                    <div style={{fontSize:13,fontWeight:700,color:sld2>0?t.danger:t.verde,fontFamily:DESIGN.fnt.b}}>{fmtMoeda(Math.abs(sld2))}</div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:t.txt2,marginBottom:3}}>
                    <span>Pago: {fmtMoeda(pg2)}</span><span style={{color:pct>=80?t.verde:pct>=40?t.ouro:t.danger}}>{pct}%</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:pct>=80?t.verde:pct>=40?t.ouro:t.danger,borderRadius:2,transition:"width .4s"}}/>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* Descargas */}
          <div style={{...css.card,padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Descargas</span>
              <button onClick={()=>setActiveTab("descarga")} style={{fontSize:9,color:t.azulLt,background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver ›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
              {[{l:"Hoje",v:descargaData.hoje.length,c:t.azulLt,bg:`rgba(22,119,255,.08)`},{l:"Em Atraso",v:descargaData.atrasados.length,c:t.danger,bg:`rgba(246,70,93,.08)`},{l:"Aguardando",v:descargaData.aguardando.length,c:t.ouro,bg:`rgba(240,185,11,.08)`}].map(d=>(
                <div key={d.l} onClick={()=>setActiveTab("descarga")} style={{background:d.bg,borderRadius:8,padding:"8px 6px",textAlign:"center",cursor:"pointer"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:20,fontWeight:700,letterSpacing:"-0.03em",color:d.c,lineHeight:1}}>{d.v}</div>
                  <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:t.txt2,marginTop:3,lineHeight:1.3}}>{d.l}</div>
                </div>
              ))}
            </div>
            {descargaData.atrasados.length>0&&(
              <div>
                {descargaData.atrasados.slice(0,3).map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderTop:i>0?`1px solid ${hexRgb(t.borda,.4)}`:"none"}}>
                    <span style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.2)`,borderRadius:4,padding:"1px 4px",fontSize:9,fontWeight:700,color:t.danger,whiteSpace:"nowrap",flexShrink:0}}>ATR</span>
                    <span style={{fontSize:9,color:t.txt,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(r.nome||"—").split(" ").slice(0,2).join(" ")}</span>
                    <span style={{fontSize:9,color:t.txt2,whiteSpace:"nowrap",flexShrink:0}}>{(r.destino||"—").split(/[-–]/)[0].trim()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Top Diárias Pendentes */}
          {canFin&&(()=>{
            const pendMap={};
            diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso").forEach(({r})=>{
              if(!r.nome)return;
              const prev=parseFloat(r.diaria_prev)||0;
              const pg=parseFloat(r.diaria_pg)||0;
              const sld=prev-pg;
              if(sld<=0)return;
              if(!pendMap[r.nome])pendMap[r.nome]=0;
              pendMap[r.nome]+=sld;
            });
            const topPend=Object.entries(pendMap).sort((a,b)=>b[1]-a[1]).slice(0,4);
            if(!topPend.length)return null;
            const maxPend=topPend[0][1]||1;
            return (
              <div style={{...css.card,padding:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700}}>Top Diárias Pendentes</span>
                  <button onClick={()=>setActiveTab("diarias")} style={{fontSize:9,color:t.ouro,background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver ›</button>
                </div>
                {topPend.map(([nome,sld],i)=>{
                  const partes=nome.split(" ").filter(Boolean);
                  const nomeExib=partes.length>=2?`${partes[0]} ${partes[1]}`:partes[0];
                  const pct=Math.round(sld/maxPend*100);
                  return (
                    <div key={nome} style={{marginBottom:i<topPend.length-1?8:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                        <span style={{fontSize:9,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6}}>{nomeExib}</span>
                        <span style={{fontSize:9,fontWeight:700,color:t.ouro,fontFamily:"var(--font-mono)",flexShrink:0}}>{fmtMoeda(sld)}</span>
                      </div>
                      <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:t.ouro,borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
