import React from "react";
import { parseData, clickable } from "../../utils.js";
import KpiCard from "../../components/KpiCard.jsx";

// DashboardAVB — Dashboard exclusivo Açailândia AVB
// Foco: Rastreamento Documental (CTE / MDF / NF) + KPIs operacionais AVB
// Nenhum código Suzano (diárias, rodorrica, descarga padrão) neste arquivo.

export default function DashboardAVB({ ctx }) {
  const {
    dashMes, setDashMes,
    dashHeroTab, setDashHeroTab,
    dashRecentesN,
    dashRecCardRef,
    dashData,
    canFin,
    t, css, DESIGN, hexRgb, hIco,
    setActiveTab,
    chartAreaRef,
    motoristas,
    alertas, alertasOpen, setAlertasOpen,
    fmtMoeda, isMobile,
    setDetalheDT, setModalOpen,
    setPlanilhaFiltroStatus,
    setPlanilhaFiltroContratante,
    setDashDrillModal,
  } = ctx;

  // ── Helpers ────────────────────────────────────────────────
  const normC = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().trim().replace(/\s+/g," ");
  const fmtV  = v => v >= 1000 ? "R$"+(v/1000).toFixed(1)+"k" : v > 0 ? "R$"+Math.round(v).toLocaleString("pt-BR") : "R$ 0";

  const efet    = dashData.filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE");
  const pendN   = dashData.filtrado.length - efet.length;
  const motUniq = new Set(dashData.filtrado.map(r=>r.nome).filter(Boolean));

  // ── Documentação ────────────────────────────────────────────
  const semCTE = efet.filter(r=>!r.cte||r.cte.trim()==="");
  const semMDF = efet.filter(r=>!r.mdf||r.mdf.trim()==="");
  const semNF  = efet.filter(r=>!r.nf ||r.nf.trim() ==="");
  const docOk  = efet.filter(r=>r.cte&&r.mdf&&r.nf).length;
  const taxaDoc = efet.length > 0 ? Math.round(docOk/efet.length*100) : 0;
  const docColor = taxaDoc >= 95 ? t.verde : taxaDoc >= 80 ? t.ouro : t.danger;

  // Lista de cargas com doc incompleta (sem duplicatas por carga)
  const incompletas = efet.filter(r=>!r.cte||!r.mdf||!r.nf)
    .map(r=>({...r, falta:[!r.cte&&"CTE",!r.mdf&&"MDF",!r.nf&&"NF"].filter(Boolean)}))
    .slice(0,20);

  // ── Status ────────────────────────────────────────────────
  const statusMap = {};
  dashData.filtrado.forEach(r=>{ const s=r.status||"Sem Status"; statusMap[s]=(statusMap[s]||0)+1; });
  const statusArr = Object.entries(statusMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const totalStatus = statusArr.reduce((a,[,v])=>a+v,0);
  const STATUS_COLORS = { Carregado:t.ouro, CARREGADO:t.ouro, Pendente:t.warn, PENDENTE:t.warn };
  const FALLBACK_COLORS = ["var(--cat-violet)","var(--cat-rose)","var(--red)","var(--cat-emerald)","var(--cyan)"];

  // ── Contratante Leaderboard ───────────────────────────────
  const cMap = {};
  dashData.filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE").forEach(r=>{
    const raw = (r.contratante||"").trim();
    const c = normC(raw); if(!c) return;
    if(!cMap[c]) cMap[c]={viagens:0,comDoc:0,vlr:0,raw};
    cMap[c].viagens++;
    if(r.cte&&r.mdf&&r.nf) cMap[c].comDoc++;
    const v = parseFloat(String(r.vl_contrato||"").replace(/[R$\s]/g,"").replace(",","."));
    if(!isNaN(v)) cMap[c].vlr += v;
  });
  const topContrat = Object.entries(cMap).sort((a,b)=>b[1].viagens-a[1].viagens);
  const maxVg = topContrat[0]?.[1]?.viagens||1;
  const medalhas = ["🥇","🥈","🥉"];
  const podColors = ["var(--accent)","var(--rank-silver)","var(--rank-bronze)"];

  // ── Top Motoristas ───────────────────────────────────────
  const motCount = {};
  dashData.filtrado.forEach(r=>{
    if(!r.nome) return;
    if(!motCount[r.nome]) motCount[r.nome]={ct:0,placa:r.placa||""};
    motCount[r.nome].ct++;
    if(!motCount[r.nome].placa&&r.placa) motCount[r.nome].placa=r.placa;
  });
  const topMot = Object.entries(motCount).sort((a,b)=>b[1].ct-a[1].ct).slice(0,5);
  const maxMot = topMot[0]?.[1]?.ct||1;

  // ── Top Rotas ────────────────────────────────────────────
  const destMap = {};
  dashData.filtrado.forEach(r=>{
    if(!r.destino) return;
    const d = r.destino.trim().toUpperCase();
    if(!destMap[d]) destMap[d]={total:0,efet:0};
    destMap[d].total++;
    if((r.status||"").toUpperCase()!=="PENDENTE") destMap[d].efet++;
  });
  const topRotas = Object.entries(destMap).sort((a,b)=>b[1].total-a[1].total).slice(0,6);
  const maxRota  = topRotas[0]?.[1]?.total||1;

  // ── Recentes ─────────────────────────────────────────────
  const recentes = [...dashData.filtrado]
    .filter(r=>r.nome)
    .sort((a,b)=>{ const da=parseData(a.data_carr),db=parseData(b.data_carr); return db&&da?db-da:0; })
    .slice(0,12);

  const heroNum = dashHeroTab==="cte" && canFin
    ? (dashData.cteT>=1000 ? "R$"+(dashData.cteT/1000).toFixed(1)+"k" : "R$"+Math.round(dashData.cteT).toLocaleString("pt-BR"))
    : String(dashData.filtrado.length);

  const sc = s => {
    const u=(s||"").toUpperCase();
    if(u.includes("CARREGAD")) return "var(--accent)";
    if(u.includes("ENTREG"))   return t.verde;
    if(u.includes("PEND"))     return t.ouro;
    if(u.includes("CANCEL")||u.includes("NO-SHOW")) return t.danger;
    return t.azulLt;
  };

  return (
    <div style={{padding:isMobile?"16px 12px":"24px"}}>

      {/* ── Filtro Mês ── */}
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:16}}>
        <select value={dashMes} onChange={e=>setDashMes(e.target.value)}
          style={{...css.inp,width:"auto",padding:"3px 10px",fontSize:9,height:26,cursor:"pointer",
            border:`1.5px solid ${dashMes!=="todos"?"var(--accent)":t.borda}`,
            color:dashMes!=="todos"?"var(--accent)":t.txt2,fontWeight:700,fontFamily:DESIGN.fnt.b}}>
          <option value="todos">Mês: Todos</option>
          {dashData.meses.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>
          {dashData.filtrado.length} cargas · {efet.length} efetivadas · {pendN} pendentes
        </span>
      </div>

      {/* ══ KPI Strip Principal ══ */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?6:10,marginBottom:14}}>
        {[
          {label:"Carregamentos", value:heroNum, sub:"no período", color:t.azulLt,
            icon:<><path d="M1 3h15v13H1z"/><path d="M16 8l4 2v5h-4V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
            click:()=>setDashHeroTab(dashHeroTab==="cte"?"carr":"cte")},
          {label:"Cargas Efetivadas", value:String(efet.length), sub:`${pendN} pendente${pendN!==1?"s":""}`, color:t.verde,
            icon:<><polyline points="20 6 9 17 4 12"/></>},
          {label:"Taxa Documental", value:`${taxaDoc}%`, sub:`${docOk}/${efet.length} doc completa`, color:docColor,
            icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 12 9 12"/><polyline points="9 15 9 15"/></>,
            click:()=>{}},
          {label:"Alertas Ativos", value:String(alertas.length), sub:alertas.length===0?"tudo em ordem":"atenção necessária",
            color:alertas.length===0?t.verde:t.danger,
            icon:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
            click:()=>setAlertasOpen(!alertasOpen)},
        ].map((k,i)=>(
          <KpiCard key={i} label={k.label} value={k.value} sub={k.sub} color={k.color}
            icon={hIco(k.icon,"var(--text3)",isMobile?9:11)} onClick={k.click} compact={isMobile} />
        ))}
      </div>

      {/* ══ RASTREAMENTO DOCUMENTAL — painel central ══ */}
      <div style={{...css.card,padding:18,marginBottom:14,border:`1px solid ${hexRgb(docColor,.5)}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",
              letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Rastreamento Documental</div>
            <div style={{fontSize:10,color:t.txt2,marginTop:3}}>
              Cargas efetivadas com documento faltante — clique para abrir
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:800,color:docColor,letterSpacing:"-0.04em",lineHeight:1}}>{taxaDoc}%</div>
            <div style={{fontSize:9,color:"var(--text3)"}}>cobertura doc.</div>
          </div>
        </div>

        {/* Barra de progresso geral */}
        <div style={{height:6,borderRadius:3,background:t.card2,overflow:"hidden",marginBottom:14}}>
          <div style={{height:"100%",width:"100%",transform:`scaleX(${taxaDoc/100})`,transformOrigin:"left",
            background:`linear-gradient(90deg,var(--accent),${t.verde})`,
            borderRadius:3,transition:"transform .5s"}}/>
        </div>

        {/* Tiles: Sem CTE / Sem MDF / Sem NF */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:incompletas.length>0?14:0}}>
          {[
            {label:"Sem CTE", count:semCTE.length, list:semCTE},
            {label:"Sem MDF", count:semMDF.length, list:semMDF},
            {label:"Sem NF",  count:semNF.length,  list:semNF},
          ].map(({label,count})=>(
            <KpiCard key={label} label={label} value={count}
              sub={count>0?"cargas pendentes":"✓ completo"}
              color={count>0?undefined:t.verde} danger={count>0} compact />
          ))}
        </div>

        {/* Lista de cargas com doc incompleta */}
        {incompletas.length > 0 && (
          <div style={{borderTop:`1px solid ${t.borda}`,paddingTop:12}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:9,textTransform:"uppercase",letterSpacing:"0.06em",
              color:"var(--text3)",marginBottom:8}}>Cargas com pendência documental</div>
            <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:200,overflowY:"auto"}}>
              {incompletas.map((r,i)=>{
                const partes=(r.nome||"").split(" ").filter(Boolean);
                const nomeExib=partes.slice(0,2).join(" ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
                const destCurto=(r.destino||"—").split(/\s*[-–]\s*/)[0].trim();
                return (
                  <div key={i} {...clickable(()=>{setDetalheDT(r);setModalOpen("detalhe");})}
                    style={{display:"flex",alignItems:"center",gap:8,padding:isMobile?"14px 8px":"5px 8px",borderRadius:6,
                      cursor:"pointer",background:"transparent",transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=t.card2}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      {r.falta.map(doc=>(
                        <span key={doc} style={{background:"rgba(246,70,93,.1)",border:"1px solid rgba(246,70,93,.3)",
                          borderRadius:3,padding:"1px 5px",fontSize:8,fontWeight:700,color:t.danger,
                          fontFamily:"var(--font-mono)"}}>
                          {doc}
                        </span>
                      ))}
                    </div>
                    <span style={{flex:1,fontSize:10,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeExib}</span>
                    <span style={{fontSize:9,color:t.txt2,flexShrink:0}}>{destCurto}</span>
                    {r.data_carr&&<span style={{fontSize:9,color:"var(--text3)",fontFamily:"var(--font-mono)",flexShrink:0}}>{r.data_carr.slice(0,5)}</span>}
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {incompletas.length === 0 && efet.length > 0 && (
          <div style={{textAlign:"center",padding:"12px 0",color:t.verde,fontSize:11,fontWeight:600}}>
            ✓ Toda documentação completa no período
          </div>
        )}
      </div>

      {/* ══ Grid Principal: Evolução | Status DTs | Top Rotas ══ */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:14,marginBottom:14}}>

        {/* Evolução do Período */}
        <div style={{...css.card,padding:18}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",
                letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Evolução do Período</div>
              <div style={{display:"flex",gap:6,marginTop:6}}>
                <button onClick={()=>setDashHeroTab("carr")}
                  style={{padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,
                    borderRadius:20,border:`1px solid ${dashHeroTab==="carr"?"var(--accent)":hexRgb(t.txt,.18)}`,
                    background:dashHeroTab==="carr"?"var(--accent)":"transparent",
                    color:dashHeroTab==="carr"?"#fff":t.txt2}}>Carregamentos</button>
                {canFin&&<button onClick={()=>setDashHeroTab("cte")}
                  style={{padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,
                    borderRadius:20,border:`1px solid ${dashHeroTab==="cte"?"var(--accent)":hexRgb(t.txt,.18)}`,
                    background:dashHeroTab==="cte"?"var(--accent)":"transparent",
                    color:dashHeroTab==="cte"?"#fff":t.txt2}}>Receita CTE</button>}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--font-heading)",fontSize:26,fontWeight:700,
                letterSpacing:"-0.04em",color:"var(--text)",lineHeight:1}}>{heroNum}</div>
              <div style={{fontSize:9,color:"var(--accent)"}}>↗ no período</div>
            </div>
          </div>
          <div style={{height:200}}><canvas ref={chartAreaRef}/></div>
        </div>

        {/* Status das DTs */}
        <div style={{...css.card,padding:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",
              letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Status das DTs</span>
            <span style={{fontFamily:DESIGN.fnt.h,fontSize:14,fontWeight:700,color:t.txt,
              letterSpacing:"-0.02em"}}>{totalStatus}</span>
          </div>
          <div style={{height:6,background:t.bg,borderRadius:3,overflow:"hidden",display:"flex",marginBottom:14}}>
            {statusArr.map(([nome,val],i)=>(
              <div key={nome} title={nome}
                onClick={()=>{setPlanilhaFiltroStatus(nome);setActiveTab("planilha");}}
                style={{width:`${totalStatus>0?(val/totalStatus)*100:0}%`,
                  background:STATUS_COLORS[nome]||FALLBACK_COLORS[i],height:"100%",cursor:"pointer"}}/>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {statusArr.map(([nome,val],i)=>(
              <div key={nome} {...clickable(()=>{setPlanilhaFiltroStatus(nome);setActiveTab("planilha");})}
                style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",borderRadius:5,
                  padding:isMobile?"15px 4px":"2px 4px",margin:"0 -4px",transition:"background .12s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{width:6,height:6,borderRadius:"50%",
                  background:STATUS_COLORS[nome]||FALLBACK_COLORS[i],flexShrink:0}}/>
                <span style={{flex:1,fontSize:12,color:t.txt2}}>{nome}</span>
                <span style={{fontFamily:DESIGN.fnt.b,fontVariantNumeric:"tabular-nums",fontSize:12,fontWeight:500}}>{val}</span>
                <span style={{fontFamily:DESIGN.fnt.b,fontSize:10,color:"var(--text3)",minWidth:32,textAlign:"right"}}>
                  {totalStatus>0?((val/totalStatus)*100).toFixed(0):0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Rotas */}
        <div style={{...css.card,padding:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",
              letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Top Rotas</span>
            <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{topRotas.length} destinos</span>
          </div>
          {topRotas.length===0
            ? <div style={{textAlign:"center",padding:16,color:t.txt2,fontSize:11}}>Sem dados</div>
            : topRotas.map(([dest,{total,efet:ef}],i)=>{
                const pct=Math.round(total/maxRota*100);
                const partes=dest.split(/\s*[-–,]\s*/);
                const destCurto=partes[0].trim();
                const uf=partes[1]?.trim()||"";
                const efPct=total>0?Math.round(ef/total*100):0;
                return (
                  <div key={dest} style={{marginBottom:i<topRotas.length-1?12:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{fontFamily:"var(--font-mono)",fontSize:11,fontWeight:800,
                          color:"var(--accent)",minWidth:16,letterSpacing:"-0.02em"}}>{i+1}</span>
                        <div>
                          <div style={{fontSize:11,color:t.txt,fontWeight:600,lineHeight:1.2}}>{destCurto}</div>
                          {uf&&<div style={{fontSize:8,color:t.txt2,fontFamily:"var(--font-mono)",marginTop:1}}>{uf}</div>}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:13,fontWeight:700,color:t.txt,lineHeight:1}}>{total}</div>
                        <div style={{fontSize:8,color:efPct>=90?t.verde:efPct>=70?t.ouro:t.txt2,marginTop:1}}>{efPct}% ef.</div>
                      </div>
                    </div>
                    <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:"100%",transform:`scaleX(${pct/100})`,transformOrigin:"left",
                        background:`linear-gradient(90deg,var(--accent),${t.azulLt})`,
                        borderRadius:2,transition:"transform .4s"}}/>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ══ Bottom: Registros Recentes | Top Motoristas | Contratante Leaderboard ══ */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:14,alignItems:"start"}}>

        {/* Registros Recentes */}
        <div ref={dashRecCardRef} style={{...css.card,padding:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",
              letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Registros Recentes</span>
            <button onClick={()=>setActiveTab("planilha")}
              style={{fontSize:9,color:"var(--text3)",background:"transparent",border:"none",
                cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:0}}>Ver Tudo ›</button>
          </div>
          {recentes.length===0
            ? <div style={{textAlign:"center",padding:16,color:t.txt2,fontSize:11}}>Sem dados no período</div>
            : recentes.slice(0,dashRecentesN||10).map((r,i)=>{
                const partes=(r.nome||"").split(" ").filter(Boolean);
                const nomeExib=partes.length>=2?`${partes[0]} ${partes[1]}`:partes[0]||"?";
                const initials=partes.map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
                const destCurto=(r.destino||"").split(/\s*[-–]\s*/)[0].trim();
                const statusColor=sc(r.status);
                const docCompleto = r.cte&&r.mdf&&r.nf;
                return (
                  <div key={i} {...clickable(()=>{setDetalheDT(r);setModalOpen("detalhe");})}
                    style={{height:46,display:"flex",alignItems:"center",gap:8,padding:"0 6px",
                      borderTop:i===0?"none":`1px solid ${hexRgb(t.borda,.4)}`,cursor:"pointer",
                      borderRadius:6,transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=t.card2}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:t.card2,
                      border:`1px solid ${t.borda}`,display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:9,fontWeight:700,color:t.txt2,flexShrink:0}}>{initials}</div>
                    <div style={{minWidth:0,flex:"0 0 120px"}}>
                      <div style={{fontSize:10,fontWeight:600,color:t.txt,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap",textTransform:"capitalize"}}>{nomeExib.toLowerCase()}</div>
                      <div style={{fontSize:8,color:t.txt2,fontFamily:"var(--font-mono)",letterSpacing:.4,marginTop:1}}>
                        {r.codigo&&<span style={{marginRight:4}}>{r.codigo}</span>}
                        {r.placa&&<span>{r.placa}</span>}
                      </div>
                    </div>
                    {destCurto&&<div style={{flex:1,fontSize:9,color:t.txt2,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{destCurto}</div>}
                    {/* Badge doc */}
                    <span style={{fontSize:8,fontWeight:700,fontFamily:"var(--font-mono)",
                      padding:"1px 5px",borderRadius:3,flexShrink:0,
                      color:docCompleto?t.verde:t.danger,
                      background:docCompleto?"rgba(16,185,129,.1)":"rgba(246,70,93,.1)",
                      border:`1px solid ${docCompleto?"rgba(16,185,129,.3)":"rgba(246,70,93,.3)"}`}}>
                      {docCompleto?"DOC ✓":"DOC !"}
                    </span>
                    <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",height:18,
                      borderRadius:4,fontFamily:"var(--font-mono)",fontSize:8,fontWeight:600,
                      textTransform:"uppercase",letterSpacing:"0.04em",color:statusColor,
                      background:`${statusColor}1a`,whiteSpace:"nowrap",flexShrink:0}}>
                      <span style={{width:4,height:4,borderRadius:"50%",background:"currentColor"}}/>
                      {(r.status||"–").slice(0,9)}
                    </span>
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="var(--text3)"
                      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                );
              })
          }
        </div>

        {/* Top Motoristas */}
        <div style={{...css.card,padding:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Top Motoristas</span>
          </div>
          {topMot.length===0?(
            <div style={{textAlign:"center",padding:20,color:t.txt2,fontSize:11}}>Sem dados</div>
          ):topMot.map(([nome,{ct,placa}],i)=>{
            const initials=(nome||"?").split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase();
            const pct=Math.round(ct/maxMot*100);
            const nomeCompleto=(nome||"").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
            const handleClickMot=()=>{
              const registros=dashData.filtrado.filter(r=>r.nome===nome);
              if(!registros.length)return;
              setDashDrillModal({type:"motorista",label:nomeCompleto,regs:registros});
            };
            return (
              <div key={nome} {...clickable(handleClickMot)} style={{marginBottom:i<topMot.length-1?14:0,cursor:"pointer",borderRadius:8,padding:"6px 6px 8px",margin:`0 -6px ${i<topMot.length-1?14:0}px`,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:t.card2,border:`1px solid ${t.borda}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:t.txt2,flexShrink:0}}>{initials}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeCompleto}</div>
                    {placa&&<div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)",letterSpacing:.5,marginTop:1}}>{placa}</div>}
                  </div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:13,fontWeight:600,color:t.txt,fontVariantNumeric:"tabular-nums",flexShrink:0}}>{ct}</span>
                </div>
                <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"var(--accent)",borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contratante Leaderboard */}
        {topContrat.length > 0 && (
          <div style={{...css.card,padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",
                letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Contratantes</span>
              <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{topContrat.length} ativos</span>
            </div>
            {/* Pódio top 3 */}
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(topContrat.length,3)},1fr)`,gap:8,marginBottom:topContrat.length>3?14:0}}>
              {topContrat.slice(0,3).map(([nome,{viagens,comDoc,vlr,raw}],i)=>{
                const ef=viagens>0?Math.round(comDoc/viagens*100):0;
                const handleClick=()=>{ setPlanilhaFiltroContratante(raw); setActiveTab("planilha"); };
                return (
                  <div key={nome} {...clickable(handleClick)} title={`Ver cargas de ${raw}`}
                    style={{background:t.bg,border:`2px solid ${i===0?"var(--accent)":t.borda}`,
                    borderRadius:10,padding:"12px 8px",textAlign:"center",cursor:"pointer",transition:"background .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.06)}
                    onMouseLeave={e=>e.currentTarget.style.background=t.bg}>
                    <div style={{fontSize:20,marginBottom:4,lineHeight:1}}>{medalhas[i]}</div>
                    <div style={{fontFamily:"var(--font-heading)",fontSize:i===0?13:11,fontWeight:700,
                      color:podColors[i],letterSpacing:"-0.02em",lineHeight:1.2,marginBottom:6,
                      textTransform:"capitalize",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {nome.toLowerCase()}
                    </div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:i===0?24:18,fontWeight:800,
                      color:t.txt,lineHeight:1,marginBottom:2}}>{viagens}</div>
                    <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>viagens</div>
                    {i===0&&canFin&&<div style={{fontSize:10,color:t.verde,fontFamily:"var(--font-mono)",fontWeight:600,marginBottom:3}}>{fmtV(vlr)}</div>}
                    <div style={{fontSize:8,color:ef>=90?t.verde:ef>=70?t.ouro:t.danger}}>{ef}% doc</div>
                  </div>
                );
              })}
            </div>
            {topContrat.slice(3).map(([nome,{viagens,comDoc,raw}],i,arr)=>{
              const pct=Math.round(viagens/maxVg*100);
              const ef=viagens>0?Math.round(comDoc/viagens*100):0;
              const handleClick=()=>{ setPlanilhaFiltroContratante(raw); setActiveTab("planilha"); };
              return (
                <div key={nome} {...clickable(handleClick)} title={`Ver cargas de ${raw}`}
                  style={{marginBottom:i<arr.length-1?8:0,cursor:"pointer",borderRadius:6,padding:"3px 6px",margin:i<arr.length-1?"0 -6px 5px -6px":"0 -6px",transition:"background .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.06)}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:10,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",
                      whiteSpace:"nowrap",flex:1,paddingRight:6,textTransform:"capitalize"}}>{nome.toLowerCase()}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                      <span style={{fontSize:9,color:ef>=90?t.verde:ef>=70?t.ouro:t.danger}}>{ef}% doc</span>
                      <span style={{fontSize:10,fontWeight:600,color:t.txt,fontFamily:"var(--font-mono)"}}>{viagens}</span>
                    </div>
                  </div>
                  <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:"var(--accent)",borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
