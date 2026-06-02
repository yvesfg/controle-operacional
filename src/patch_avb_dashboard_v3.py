import shutil, datetime, sys

path = r'C:\Users\yvesf\DevYFGroup\controle-operacional\src\views\DashboardView.jsx'
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
shutil.copy(path, path + f'.bak_avb_dashboard_v3_{ts}')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── Mudança 1: KPI strip principal — ocultar CTE Médio e Diárias para AVB ──
old1 = '...(canFin?[{label:"CTE Médio/Viagem"'
new1 = '...(canFin&&baseAtual?.id!=="acailandia_avb"?[{label:"CTE Médio/Viagem"'
if old1 not in c: errors.append("M1-CTE")
else: c = c.replace(old1, new1, 1)

old2 = '...(canFin?[{label:"Diárias a Pagar"'
new2 = '...(canFin&&baseAtual?.id!=="acailandia_avb"?[{label:"Diárias a Pagar"'
if old2 not in c: errors.append("M2-Diarias")
else: c = c.replace(old2, new2, 1)

# ── Mudança 2: KPI strip AVB — substituir Adiantamentos/Saldo/Ticket por Taxa Documental ──
old3 = '''        const ticketMed = efet.length > 0 ? dashData.cteT / efet.length : 0;
        const kpisAvb = [
          {label:"Cargas Efetivadas", value:String(efet.length), sub:`${pendN} pendente${pendN!==1?"s":""}`, color:t.azulLt},
          {label:"Soma Contratos",    value:fmt(dashData.avbContratoT||0), sub:"excl. pendentes", color:t.verde},
          {label:"Adiantamentos",     value:fmt(dashData.avbAdtT||0),      sub:"soma ADT", color:t.ouro},
          {label:"Saldo em Aberto",   value:fmt(dashData.avbSaldoT||0),    sub:"a receber", color:(dashData.avbSaldoT||0)>0?t.danger:t.verde},
          {label:"Ticket Médio CTE",  value:fmt(ticketMed),                sub:"por carga efet.", color:t.azulLt},
        ];'''
new3 = '''        const docOk = efet.filter(r=>r.cte&&r.mdf&&r.nf).length;
        const taxaDoc = efet.length>0?Math.round(docOk/efet.length*100):0;
        const kpisAvb = [
          {label:"Cargas Efetivadas", value:String(efet.length), sub:`${pendN} pendente${pendN!==1?"s":""}`, color:t.azulLt},
          {label:"Soma Contratos",    value:fmt(dashData.avbContratoT||0), sub:"excl. pendentes", color:t.verde},
          {label:"Taxa Documental",   value:`${taxaDoc}%`, sub:`${docOk}/${efet.length} com CTE+MDF+NF`, color:taxaDoc>=95?t.verde:taxaDoc>=80?t.ouro:t.danger},
        ];'''
if old3 not in c: errors.append("M3-KPIsAVB")
else: c = c.replace(old3, new3, 1)

# ── Mudança 3: Substituir Diárias+Descargas+TopPendentes por Top Rotas (só AVB) ──
old4 = '''          {/* Diárias */}
          <div style={{...css.card,padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Diárias</span>'''

TOP_ROTAS_JSX = '''          {baseAtual?.id==="acailandia_avb"?(()=>{
            const destMap={};
            dashData.filtrado.forEach(r=>{
              if(!r.destino)return;
              const d=r.destino.trim().toUpperCase();
              if(!destMap[d])destMap[d]={total:0,efet:0};
              destMap[d].total++;
              if((r.status||"").toUpperCase()!=="PENDENTE")destMap[d].efet++;
            });
            const topRotas=Object.entries(destMap).sort((a,b)=>b[1].total-a[1].total).slice(0,5);
            const maxRota=topRotas[0]?.[1]?.total||1;
            return (
              <div style={{...css.card,padding:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Top Rotas</span>
                  <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{topRotas.length} destinos</span>
                </div>
                {topRotas.length===0
                  ?<div style={{textAlign:"center",padding:16,color:t.txt2,fontSize:11}}>Sem dados no período</div>
                  :topRotas.map(([dest,{total,efet:ef}],i)=>{
                    const pct=Math.round(total/maxRota*100);
                    const partes=dest.split(/\s*[-–,]\s*/);
                    const destCurto=partes[0].trim();
                    const uf=partes[1]?.trim()||"";
                    const efPct=total>0?Math.round(ef/total*100):0;
                    return (
                      <div key={dest} style={{marginBottom:i<topRotas.length-1?16:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:12,fontWeight:800,color:"var(--accent)",minWidth:18,letterSpacing:"-0.02em"}}>{i+1}</span>
                            <div>
                              <div style={{fontSize:12,color:t.txt,fontWeight:600,lineHeight:1.2}}>{destCurto}</div>
                              {uf&&<div style={{fontSize:9,color:t.txt2,fontFamily:"var(--font-mono)",marginTop:1}}>{uf}</div>}
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontFamily:"var(--font-mono)",fontSize:15,fontWeight:700,color:t.txt,lineHeight:1}}>{total}</div>
                            <div style={{fontSize:9,color:efPct>=90?t.verde:efPct>=70?t.ouro:t.txt2,marginTop:1}}>{efPct}% efet.</div>
                          </div>
                        </div>
                        <div style={{height:4,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,var(--accent),${t.azulLt})`,borderRadius:2,transition:"width .4s"}}/>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            );
          })():(
            <>
          {/* Diárias */}
          <div style={{...css.card,padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Diárias</span>'''

if old4 not in c: errors.append("M4-TopRotas-open")
else: c = c.replace(old4, TOP_ROTAS_JSX, 1)

# Fechar o bloco else após "Top Diárias Pendentes"
old5 = '''          })()}

        </div>

          {/* ── Por Contratante (somente base AVB) ── */}'''
new5 = '''          })()}
            </>
          )}

        </div>

          {/* ── Por Contratante (somente base AVB) ── */}'''
if old5 not in c: errors.append("M4-TopRotas-close")
else: c = c.replace(old5, new5, 1)

# ── Mudança 4: Contratante — Leaderboard (Opção A: Pódio) ──
old6 = '''          {/* ── Por Contratante (somente base AVB) ── */}
          {baseAtual?.hasContratante && (()=>{
            // Ranking por quantidade
            const cMapQtd={}, cMapVlr={};
            const normC = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().trim().replace(/\\s+/g," ");
            dashData.filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE").forEach(r=>{
              const c=normC(r.contratante);
              if(!c)return;
              cMapQtd[c]=(cMapQtd[c]||0)+1;
              const v=parseFloat(String(r.vl_contrato||"").replace(/[R$\\s.]/g,"").replace(",","."));
              if(!isNaN(v)) cMapVlr[c]=(cMapVlr[c]||0)+v;
            });
            const topQtd=Object.entries(cMapQtd).sort((a,b)=>b[1]-a[1]).slice(0,8);
            const topVlr=Object.entries(cMapVlr).sort((a,b)=>b[1]-a[1]).slice(0,8);
            if(!topQtd.length && !topVlr.length) return null;
            const maxQ=topQtd[0]?.[1]||1;
            const maxV=topVlr[0]?.[1]||1;
            const fmt=v=>v>=1000?"R$"+(v/1000).toFixed(1)+"k":"R$"+Math.round(v).toLocaleString("pt-BR");
            return (
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                {/* por quantidade */}
                <div style={{...css.card,padding:18}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Contratante — Viagens</span>
                    <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{topQtd.length}</span>
                  </div>
                  {topQtd.map(([nome,cnt],i)=>{
                    const pct=Math.round(cnt/maxQ*100);
                    return (
                      <div key={nome} style={{marginBottom:i<topQtd.length-1?8:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                          <span style={{fontSize:10,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6}}>{nome}</span>
                          <span style={{fontSize:10,fontWeight:600,color:t.ouro,fontFamily:"var(--font-mono)",flexShrink:0}}>{cnt}</span>
                        </div>
                        <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:t.ouro,borderRadius:2}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* por valor de contrato */}
                {canFin && (
                  <div style={{...css.card,padding:18}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Contratante — Valor</span>
                      <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{topVlr.length}</span>
                    </div>
                    {topVlr.map(([nome,vlr],i)=>{
                      const pct=Math.round(vlr/maxV*100);
                      return (
                        <div key={nome} style={{marginBottom:i<topVlr.length-1?8:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                            <span style={{fontSize:10,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6}}>{nome}</span>
                            <span style={{fontSize:10,fontWeight:600,color:t.verde,fontFamily:"var(--font-mono)",flexShrink:0}}>{fmt(vlr)}</span>
                          </div>
                          <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:t.verde,borderRadius:2}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}'''

new6 = '''          {/* ── Por Contratante — Leaderboard AVB ── */}
          {baseAtual?.hasContratante && (()=>{
            const cMap={};
            const normC=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().trim().replace(/\s+/g," ");
            dashData.filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE").forEach(r=>{
              const c=normC(r.contratante);
              if(!c)return;
              if(!cMap[c])cMap[c]={viagens:0,comDoc:0,vlr:0};
              cMap[c].viagens++;
              if(r.cte&&r.mdf&&r.nf)cMap[c].comDoc++;
              const v=parseFloat(String(r.vl_contrato||"").replace(/[R$\s.]/g,"").replace(",","."));
              if(!isNaN(v))cMap[c].vlr+=v;
            });
            const top=Object.entries(cMap).sort((a,b)=>b[1].viagens-a[1].viagens);
            if(!top.length)return null;
            const maxVg=top[0][1].viagens||1;
            const medalhas=["🥇","🥈","🥉"];
            const podColors=["var(--accent)","#94a3b8","#cd7c32"];
            const fmt=v=>v>=1000?"R$"+(v/1000).toFixed(1)+"k":"R$"+Math.round(v).toLocaleString("pt-BR");
            return (
              <div style={{...css.card,padding:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Contratantes</span>
                  <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{top.length} ativos</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(top.length,3)},1fr)`,gap:8,marginBottom:top.length>3?14:0}}>
                  {top.slice(0,3).map(([nome,{viagens,comDoc,vlr}],i)=>{
                    const ef=viagens>0?Math.round(comDoc/viagens*100):0;
                    return (
                      <div key={nome} style={{background:t.bg,border:`2px solid ${i===0?"var(--accent)":t.borda}`,borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
                        <div style={{fontSize:20,marginBottom:4,lineHeight:1}}>{medalhas[i]}</div>
                        <div style={{fontFamily:"var(--font-heading)",fontSize:i===0?13:11,fontWeight:700,color:podColors[i],letterSpacing:"-0.02em",lineHeight:1.2,marginBottom:6,textTransform:"capitalize",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nome.toLowerCase()}</div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:i===0?24:18,fontWeight:800,color:t.txt,lineHeight:1,marginBottom:2}}>{viagens}</div>
                        <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>viagens</div>
                        {i===0&&canFin&&<div style={{fontSize:10,color:t.verde,fontFamily:"var(--font-mono)",fontWeight:600,marginBottom:3}}>{fmt(vlr)}</div>}
                        <div style={{fontSize:8,color:ef>=90?t.verde:ef>=70?t.ouro:t.danger}}>{ef}% doc</div>
                      </div>
                    );
                  })}
                </div>
                {top.slice(3).map(([nome,{viagens,comDoc}],i,arr)=>{
                  const pct=Math.round(viagens/maxVg*100);
                  const ef=viagens>0?Math.round(comDoc/viagens*100):0;
                  return (
                    <div key={nome} style={{marginBottom:i<arr.length-1?8:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                        <span style={{fontSize:10,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6,textTransform:"capitalize"}}>{nome.toLowerCase()}</span>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                          <span style={{fontSize:9,color:ef>=90?t.verde:ef>=70?t.ouro:t.danger}}>{ef}%</span>
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
            );
          })()}'''

if old6 not in c: errors.append("M5-Leaderboard")
else: c = c.replace(old6, new6, 1)

if errors:
    print(f"ERROS — trechos não encontrados: {errors}")
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("OK: DashboardView.jsx atualizado com sucesso — todas as 4 mudanças aplicadas")
