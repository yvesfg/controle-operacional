#!/usr/bin/env python3
"""patch_avb_dashboard.py — Etapa 5: KPIs expandidos para AVB no DashboardView"""
import sys

SRC = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/views/DashboardView.jsx"

with open(SRC, encoding="utf-8") as f:
    txt = f.read()

original = txt

# 1. Adicionar fmtMoeda no destructuring (ja deve existir — verificar)
if "fmtMoeda" not in txt:
    print("WARN: fmtMoeda nao encontrado no arquivo")

# 2. Apos o bloco de KPI principal, inserir KPIs exclusivos AVB
# O bloco KPI termina com a grid de kpis. Apos esse bloco, quando isAvb, mostrar strip financeiro AVB.
OLD_KPI_END = '''        );
      })()}

      {/* ── Main Grid: Chart | Status DTs | Top Motoristas ── */}'''

NEW_KPI_END = '''        );
      })()}

      {/* ── KPI Strip Financeiro AVB (somente acailandia_avb) ── */}
      {baseAtual?.id === "acailandia_avb" && canFin && (()=>{
        const fmt = v => v >= 1000 ? "R$"+(v/1000).toFixed(1)+"k" : v > 0 ? "R$"+Math.round(v).toLocaleString("pt-BR") : "R$ 0";
        const efet = dashData.filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE");
        const pendN = dashData.filtrado.filter(r=>(r.status||"").toUpperCase()==="PENDENTE").length;
        const ticketMed = efet.length > 0 ? dashData.cteT / efet.length : 0;
        const kpisAvb = [
          {label:"Cargas Efetivadas", value:String(efet.length), sub:`${pendN} pendente${pendN!==1?"s":""}`, color:t.azulLt},
          {label:"Soma Contratos",    value:fmt(dashData.avbContratoT||0), sub:"excl. pendentes", color:t.verde},
          {label:"Adiantamentos",     value:fmt(dashData.avbAdtT||0),      sub:"soma ADT", color:t.ouro},
          {label:"Saldo em Aberto",   value:fmt(dashData.avbSaldoT||0),    sub:"a receber", color:(dashData.avbSaldoT||0)>0?t.danger:t.verde},
          {label:"Ticket Médio CTE",  value:fmt(ticketMed),                sub:"por carga efet.", color:t.azulLt},
        ];
        return (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":`repeat(${kpisAvb.length},1fr)`,gap:isMobile?6:10,marginBottom:14}}>
            {kpisAvb.map((k,i)=>(
              <div key={i} style={{background:t.card,borderRadius:isMobile?8:12,border:`1px solid ${t.borda}`,padding:isMobile?"14px":"14px 16px"}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:isMobile?9:10,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400,lineHeight:1.4,marginBottom:4}}>{k.label}</div>
                <div style={{fontFamily:"var(--font-heading)",fontSize:isMobile?16:24,fontWeight:700,letterSpacing:"-0.04em",color:k.color,lineHeight:1,marginBottom:2}}>{k.value}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?9:11,color:"var(--text2)"}}>{k.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Main Grid: Chart | Status DTs | Top Motoristas ── */}'''

if OLD_KPI_END in txt:
    txt = txt.replace(OLD_KPI_END, NEW_KPI_END, 1)
    print("OK 1: KPI strip financeiro AVB adicionado")
else:
    print("FAIL 1: posicao de insercao do KPI AVB nao encontrada")

# 3. Expandir ranking contratante: adicionar ranking por valor de contrato
OLD_RANKING_CONTRATANTE = '''          {baseAtual?.hasContratante && (()=>{
            const cMap={};
            dashData.filtrado.forEach(r=>{
              const c=(r.contratante||"").trim();
              if(!c)return;
              cMap[c]=(cMap[c]||0)+1;
            });
            const top=Object.entries(cMap).sort((a,b)=>b[1]-a[1]);
            if(!top.length)return null;
            const maxC=top[0][1]||1;
            return (
              <div style={{...css.card,padding:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Por Contratante</span>
                  <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{top.length} contratante{top.length!==1?"s":""}</span>
                </div>
                {top.map(([nome,cnt],i)=>{
                  const pct=Math.round(cnt/maxC*100);
                  return (
                    <div key={nome} style={{marginBottom:i<top.length-1?10:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:11,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6}}>{nome}</span>
                        <span style={{fontSize:11,fontWeight:600,color:t.ouro,fontFamily:"var(--font-mono)",fontVariantNumeric:"tabular-nums",flexShrink:0}}>{cnt} viag.</span>
                      </div>
                      <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:t.ouro,borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}'''

NEW_RANKING_CONTRATANTE = '''          {baseAtual?.hasContratante && (()=>{
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

if OLD_RANKING_CONTRATANTE in txt:
    txt = txt.replace(OLD_RANKING_CONTRATANTE, NEW_RANKING_CONTRATANTE, 1)
    print("OK 2: ranking contratante expandido (qtd + valor)")
else:
    print("FAIL 2: ranking contratante original nao encontrado")

if txt == original:
    print("NENHUMA ALTERACAO APLICADA")
    sys.exit(1)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(txt)
print(f"DashboardView.jsx salvo ({txt.count(chr(10))} linhas)")
