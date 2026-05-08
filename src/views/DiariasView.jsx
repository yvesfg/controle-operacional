import React from "react";
import { exportCSV, exportODS, exportPDF, ExportMenu } from "../exportHelpers.jsx";

export default function DiariasView({ ctx }) {
  const {
    activeTab,
    diariasData,
    t, css,
    hIco, hexRgb,
    fmtMoeda,
    saveJSON, parseExtratoXLSX,
    isMobile,
    abrirDetalhe,
    setActiveTab,
    setBuscaInput, setBuscaTipo,
    diariaNavDT, setDiariaNavDT,
    diariaView, setDiariaView,
    diariaCols, setDiariaCols,
    dSubTab, setDSubTab,
    dFiltro, setDFiltro,
    dPlanFiltroAno, setDPlanFiltroAno,
    dPlanFiltroFim, setDPlanFiltroFim,
    dPlanFiltroIni, setDPlanFiltroIni,
    dPlanFiltroMes, setDPlanFiltroMes,
    dPlanFiltroOrigem, setDPlanFiltroOrigem,
    extratoDataFim, setExtratoDataFim,
    extratoDataIni, setExtratoDataIni,
    extratoFileName, setExtratoFileName,
    extratoFiltro, setExtratoFiltro,
    extratoRows, setExtratoRows,
    extratoResultado,
  } = ctx;

  if (activeTab !== "diarias") return null;
  return (
          <div>
            {diariaNavDT && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",borderRadius:10,background:`rgba(240,185,11,.08)`,border:`1px solid rgba(240,185,11,.3)`}}>
                {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.ouro,13)}
                <span style={{fontSize:11,fontWeight:700,color:t.ouro}}>DT {diariaNavDT}</span>
                <span style={{fontSize:10,color:t.txt2}}>em destaque</span>
                <button onClick={()=>setDiariaNavDT(null)} style={{marginLeft:"auto",background:"transparent",border:`1px solid rgba(240,185,11,.3)`,borderRadius:6,padding:"2px 8px",fontSize:10,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>✕ Limpar</button>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <ExportMenu
                dados={diariasData.items.map(({r,tipo,dias})=>({...r,_tipo:tipo==="ok"?"No prazo":tipo==="atraso"?`Atraso ${dias||0}d`:"Aguardando"}))}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"placa",l:"Placa"},{k:"data_carr",l:"Carregamento"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"},{k:"_tipo",l:"Status"},{k:"diaria_prev",l:"Diária Prev."},{k:"diaria_pg",l:"Diária Paga"}]}
                filename="diarias"
                titulo="Relatório de Diárias"
              />
            </div>

            <div className="co-tabbar" style={{marginBottom:12}}>
              {[
                {k:"resumo",l:"Resumo",svg:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>},
                {k:"planilha",l:"Planilha",svg:<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/></>},
                {k:"extrato",l:"Conferência",svg:<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></>}
              ].map(s => (
                <button key={s.k} onClick={()=>setDSubTab(s.k)} className={`co-tab${dSubTab===s.k?" co-tab--active":""}`}>
                  {hIco(s.svg,dSubTab===s.k?t.ouro:t.txt2,16)} {s.l}
                </button>
              ))}
            </div>

            {/* KPI clicáveis — estilo flat igual Descarga */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:isMobile?4:6,marginBottom:14}}>
              {[
                {k:"ok",       svg:<><polyline points="20 6 9 17 4 12"/></>,           l:"No Prazo",      ct:diariasData.ok,    cor:t.verde,   corLt:"#00e096", bg:"rgba(2,192,118,.07)"},
                {k:"atraso",   svg:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, l:"Perdeu Agenda",ct:diariasData.atraso,cor:t.danger, corLt:"#f6465d", bg:"rgba(246,70,93,.07)"},
                {k:"pendente", svg:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,l:"Sem Descarga",ct:diariasData.pend,  cor:t.ouro,    corLt:"#ffe57a", bg:"rgba(240,185,11,.07)"},
              ].map(tb => (
                <div key={tb.k} onClick={()=>setDFiltro(dFiltro===tb.k?"todos":tb.k)} style={{border:`1.5px solid ${dFiltro===tb.k?tb.cor:t.borda}`,borderRadius:8,padding:isMobile?"10px 5px":"18px 10px",cursor:"pointer",background:dFiltro===tb.k?tb.bg:t.card2,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .2s",minWidth:0}}>
                  {hIco(tb.svg,dFiltro===tb.k?tb.corLt:t.txt2,22)}
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?9:11,fontWeight:400,textTransform:"uppercase",letterSpacing:"0.06em",color:dFiltro===tb.k?tb.corLt:t.txt2,textAlign:"center",lineHeight:1.2,whiteSpace:"normal",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{tb.l}</span>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:isMobile?22:34,fontWeight:700,letterSpacing:"-0.04em",color:dFiltro===tb.k?tb.corLt:t.txt2,lineHeight:1,marginTop:2}}>{tb.ct}</span>
                </div>
              ))}
            </div>

            {dSubTab === "resumo" && (
              <div>
                {/* Filtros Ano/Mês/Origem/Período - reusa dPlanFiltro* */}
                {(()=>{
                  const _pymR=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1]};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1]};}return null;};
                  const anosR=[...new Set(diariasData.items.map(({r})=>{const ym=_pymR(r.data_carr||r.data_agenda||"");return ym?.ano;}).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
                  const mesesR=[...new Set(diariasData.items.filter(({r})=>{if(!dPlanFiltroAno)return true;const ym=_pymR(r.data_carr||r.data_agenda||"");return ym?.ano===dPlanFiltroAno;}).map(({r})=>{const ym=_pymR(r.data_carr||r.data_agenda||"");return ym?.mes;}).filter(Boolean))].sort();
                  const origensR=[...new Set(diariasData.items.map(({r})=>(r.origem||"").trim()).filter(Boolean))].sort();
                  const MESES_PTR={"01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez"};
                  const temFiltroR=dPlanFiltroAno||dPlanFiltroMes||dPlanFiltroOrigem!=="todas"||dPlanFiltroIni||dPlanFiltroFim;
                  const _iniRC=dPlanFiltroIni?new Date(dPlanFiltroIni+"T00:00:00"):null;
                  const _fimRC=dPlanFiltroFim?new Date(dPlanFiltroFim+"T23:59:59"):null;
                  const _pymRC=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};
                  const _cntR=diariasData.items.filter(({r})=>{const ym=_pymRC(r.data_carr||r.data_agenda||"");if(dPlanFiltroAno&&ym?.ano!==dPlanFiltroAno)return false;if(dPlanFiltroMes&&ym?.mes!==dPlanFiltroMes)return false;if(dPlanFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dPlanFiltroOrigem)return false;if(_iniRC||_fimRC){const d=ym?.full||null;if(!d)return false;if(_iniRC&&d<_iniRC)return false;if(_fimRC&&d>_fimRC)return false;}return true;}).length;
                  return (
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"7px 10px",background:t.card,border:`1px solid ${t.borda}`,borderRadius:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:9,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:.8,marginRight:2}}>Filtrar:</span>
                      <select value={dPlanFiltroAno} onChange={e=>{setDPlanFiltroAno(e.target.value);setDPlanFiltroMes("");}} style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dPlanFiltroAno?t.ouro:t.borda}`,background:dPlanFiltroAno?`rgba(240,185,11,.08)`:t.bg,color:dPlanFiltroAno?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                        <option value="">Todos os Anos</option>
                        {anosR.map(a=><option key={a} value={a}>{a}</option>)}
                      </select>
                      <select value={dPlanFiltroMes} onChange={e=>setDPlanFiltroMes(e.target.value)} style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dPlanFiltroMes?t.ouro:t.borda}`,background:dPlanFiltroMes?`rgba(240,185,11,.08)`:t.bg,color:dPlanFiltroMes?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                        <option value="">Todos os Meses</option>
                        {mesesR.map(m=><option key={m} value={m}>{MESES_PTR[m]||m}</option>)}
                      </select>
                      <select value={dPlanFiltroOrigem} onChange={e=>setDPlanFiltroOrigem(e.target.value)} style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dPlanFiltroOrigem!=="todas"?t.ouro:t.borda}`,background:dPlanFiltroOrigem!=="todas"?`rgba(240,185,11,.08)`:t.bg,color:dPlanFiltroOrigem!=="todas"?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit",maxWidth:180}}>
                        <option value="todas">Todas as Origens</option>
                        {origensR.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                      <span style={{fontSize:9,color:t.txt2,flexShrink:0,paddingLeft:8,borderLeft:`1px solid ${t.borda}`,marginLeft:4}}>ou período:</span><input type="date" value={dPlanFiltroIni} onChange={e=>{setDPlanFiltroIni(e.target.value);setDPlanFiltroAno("");setDPlanFiltroMes("");}} style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,flex:"1 1 110px",minWidth:0}}/>
                      <span style={{fontSize:10,color:t.txt2,flexShrink:0}}>até</span>
                      <input type="date" value={dPlanFiltroFim} onChange={e=>setDPlanFiltroFim(e.target.value)} style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,flex:"1 1 110px",minWidth:0}}/>
                      {temFiltroR && (
                        <button onClick={()=>{setDPlanFiltroAno("");setDPlanFiltroMes("");setDPlanFiltroOrigem("todas");setDPlanFiltroIni("");setDPlanFiltroFim("");}} style={{fontSize:9,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>&#10005; Limpar</button>
                      )}
                      <span style={{marginLeft:"auto",fontSize:10,color:t.txt2,fontWeight:600,whiteSpace:"nowrap"}}>{_cntR} de {diariasData.items.length}</span>
                    </div>
                  );
                })()}
                {/* Filtro + toolbar de view */}
                <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                  {[{k:"todos",l:"Todos"},{k:"diaria",l:"Com Diária"},{k:"atraso",l:"Perdeu Agenda"},{k:"sem_diaria",l:"Sem Diária"},{k:"pendente",l:"Aguardando"}].map(f => (
                    <button key={f.k} onClick={()=>setDFiltro(f.k)} style={{padding:"10px 14px",fontSize:11,fontWeight:700,minHeight:44,border:`1.5px solid ${dFiltro===f.k?t.ouro:t.borda}`,borderRadius:7,cursor:"pointer",background:dFiltro===f.k?`rgba(240,185,11,.07)`:t.card2,color:dFiltro===f.k?t.ouro:t.txt2,fontFamily:"inherit"}}>{f.l}</button>
                  ))}
                </div>
                {/* Toolbar view */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  {[
                    {v:"linhas",l:"Linhas",svg:<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>},
                    {v:"blocos",l:"Blocos",svg:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>}
                  ].map(m => (
                    <button key={m.v} onClick={()=>{setDiariaView(m.v);saveJSON("co_diaria_view",m.v);}} style={{padding:"5px 11px",fontSize:10,fontWeight:700,border:`1.5px solid ${diariaView===m.v?"var(--accent)":"var(--border)"}`,borderRadius:7,cursor:"pointer",background:diariaView===m.v?"var(--accent2)":"var(--card2)",color:diariaView===m.v?"var(--accent)":"var(--text2)",fontFamily:"'Space Grotesk',sans-serif",display:"flex",alignItems:"center",gap:4}}>
                      {hIco(m.svg,diariaView===m.v?t.azulLt:t.txt2,14)} {m.l}
                    </button>
                  ))}
                  {diariaView==="blocos" && (
                    <>
                      <span style={{fontSize:9,color:t.txt2,marginLeft:6}}>Colunas:</span>
                      {(isMobile?[1,2]:[1,2,3,4]).map(n => (
                        <button key={n} onClick={()=>{setDiariaCols(n);saveJSON("co_diaria_cols",n);}} style={{width:36,height:36,minWidth:36,minHeight:36,fontSize:11,fontWeight:700,border:`1.5px solid ${diariaCols===n?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:diariaCols===n?`rgba(22,119,255,.09)`:t.card2,color:diariaCols===n?t.azulLt:t.txt2,fontFamily:"inherit"}}>{n}</button>
                      ))}
                    </>
                  )}
                </div>

                {/* Lista de itens */}
                {diariaView==="linhas" ? (
                  // ── MODO LINHAS (original) ──
                  (()=>{
                    const _pRL=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};
                    const _iRL=dPlanFiltroIni?new Date(dPlanFiltroIni+"T00:00:00"):null;
                    const _fRL=dPlanFiltroFim?new Date(dPlanFiltroFim+"T23:59:59"):null;
                    const _dAll=diariasData.items.filter(i=>{
                      if(dFiltro!=="todos"&&i.tipo!==dFiltro)return false;
                      const{r}=i;const ym=_pRL(r.data_carr||r.data_agenda||"");
                      if(dPlanFiltroAno&&ym?.ano!==dPlanFiltroAno)return false;
                      if(dPlanFiltroMes&&ym?.mes!==dPlanFiltroMes)return false;
                      if(dPlanFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dPlanFiltroOrigem)return false;
                      if(_iRL||_fRL){const d=ym?.full||null;if(!d)return false;if(_iRL&&d<_iRL)return false;if(_fRL&&d>_fRL)return false;}
                      return true;
                    });
                    const _sorted=diariaNavDT ? [..._dAll].sort((a,b)=>a.r.dt===diariaNavDT?-1:b.r.dt===diariaNavDT?1:0) : _dAll;const _banner=_sorted.length>80?<div key="__banner_rl" style={{padding:"8px 12px",marginBottom:8,borderRadius:8,background:"rgba(240,185,11,.08)",border:"1px solid rgba(240,185,11,.25)",fontSize:11,color:t.ouro}}>Mostrando 80 de {_sorted.length} — refine os filtros para ver todos</div>:null;const _items=_sorted.slice(0,80).map((item,idx) => {
                    const {r,tipo,dias,temDiaria} = item;
                    const _isDHL = diariaNavDT && r.dt === diariaNavDT;
                    const borderC = _isDHL?t.ouro:tipo==="diaria"?t.danger:tipo==="atraso"?t.ouro:tipo==="sem_diaria"?t.verde:tipo==="ok"?t.verde:t.txt2;
                    const saldoPg = parseFloat(r.diaria_pg), saldoPrev = parseFloat(r.diaria_prev);
                    const pgStatus = !isNaN(saldoPg)&&saldoPg>0 ? "pago" : !isNaN(saldoPrev)&&saldoPrev>0 ? "pendente" : null;
                    const tipoLabel = tipo==="diaria"?`🛏️ DIÁRIA ${dias>0?dias+"d":""}`
                      :tipo==="atraso"?`⚠️ Atraso ${dias>0?dias+"d":""}`
                      :tipo==="sem_diaria"?"✅ Sem diária"
                      :tipo==="ok"?"✅ No prazo"
                      :"⏳ Aguardando";
                    const tipoColor = tipo==="diaria"?`rgba(246,70,93,.08)`:tipo==="atraso"?`rgba(240,185,11,.08)`:tipo==="sem_diaria"?`rgba(2,192,118,.08)`:tipo==="ok"?`rgba(2,192,118,.08)`:`rgba(240,185,11,.06)`;
                    return (
                      <div key={idx} onClick={()=>abrirDetalhe(r)} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&abrirDetalhe(r)} tabIndex="0" role="button" className="co-card" style={{background:_isDHL?`rgba(240,185,11,.06)`:t.card,borderRadius:12,padding:14,border:`1px solid ${_isDHL?t.ouro:t.borda}`,borderLeft:`4px solid ${borderC}`,marginBottom:10,animation:"slideUp .3s",cursor:"pointer",boxShadow:_isDHL?`0 0 0 2px rgba(240,185,11,.22)`:"none"}}>
                        <div style={{fontSize:16,fontWeight:700,color:t.txt,marginBottom:5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          {r.nome||"—"}
                          <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:tipoColor,color:borderC,border:`1px solid ${borderC}33`}}>
                            {tipoLabel}
                          </span>
                          {pgStatus && <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>{pgStatus==="pago"?"💳 Pago":"💸 Não Pago"}</span>}
                          {r.ro && <span style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:`rgba(255,152,0,.08)`,color:t.laranja,border:`1px solid rgba(255,152,0,.25)`}}>RO {r.ro}</span>}
                          <span style={{marginLeft:"auto",fontSize:11,color:t.txt2}}>ver detalhes ›</span>
                        </div>
                        <div style={{fontSize:13,color:t.txt2,lineHeight:1.8}}>
                          <span role="img" aria-label="DT">🔢</span> <strong style={{color:t.txt}}>{r.dt}</strong> · <span role="img" aria-label="Placa">🚛</span> {r.placa||"—"}<br/>
                          <span role="img" aria-label="Agenda">📅</span> Agenda: <strong style={{color:t.ouro}}>{r.data_agenda||"—"}</strong> · <span role="img" aria-label="Chegada">🛬</span> Chegada: <strong style={{color:r.chegada?t.azulLt:t.txt2}}>{r.chegada||"Não informada"}</strong><br/>
                          <span role="img" aria-label="Descarga">🏁</span> Descarga: <strong style={{color:r.data_desc?t.verde:t.txt2}}>{r.data_desc||"Não informada"}</strong>
                          {r.informou_analista && <> · <span style={{color:r.informou_analista==="sim"?t.verde:t.danger,fontSize:11}}>{r.informou_analista==="sim"?"✅ Informou analista":"❌ Não informou analista"}</span></>}
                        </div>
                      </div>
                    );
                  });return[_banner,..._items];})()
                ) : (
                  // ── MODO BLOCOS (Opção C com avatar) ──
                  <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?Math.min(diariaCols,2):diariaCols},minmax(0,1fr))`,gap:isMobile?8:10,width:"100%"}}>
                    {/* Banner truncamento diárias blocos */}
                    {(()=>{const _pRB=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};const _iRB=dPlanFiltroIni?new Date(dPlanFiltroIni+"T00:00:00"):null;const _fRB=dPlanFiltroFim?new Date(dPlanFiltroFim+"T23:59:59"):null;const total=diariasData.items.filter(i=>{if(dFiltro!=="todos"&&i.tipo!==i.tipo&&!(dFiltro==="pendente"&&i.tipo==="pendente"))return false;const{r}=i;const ym=_pRB(r.data_carr||r.data_agenda||"");if(dPlanFiltroAno&&ym?.ano!==dPlanFiltroAno)return false;if(dPlanFiltroMes&&ym?.mes!==dPlanFiltroMes)return false;if(dPlanFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dPlanFiltroOrigem)return false;if(_iRB||_fRB){const d=ym?.full||null;if(!d)return false;if(_iRB&&d<_iRB)return false;if(_fRB&&d>_fRB)return false;}return true;}).length;return total>80?(<div style={{padding:"8px 12px",marginBottom:8,borderRadius:8,background:"rgba(240,185,11,.08)",border:"1px solid rgba(240,185,11,.25)",fontSize:11,color:t.ouro,gridColumn:"1/-1"}}>Mostrando 80 de {total} — refine os filtros para ver todos</div>):null;})()}
                    {(()=>{const _pRB=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};const _iRB=dPlanFiltroIni?new Date(dPlanFiltroIni+"T00:00:00"):null;const _fRB=dPlanFiltroFim?new Date(dPlanFiltroFim+"T23:59:59"):null;return diariasData.items.filter(i=>{if(dFiltro!=="todos"&&i.tipo!==dFiltro&&!(dFiltro==="pendente"&&i.tipo==="pendente"))return false;const{r}=i;const ym=_pRB(r.data_carr||r.data_agenda||"");if(dPlanFiltroAno&&ym?.ano!==dPlanFiltroAno)return false;if(dPlanFiltroMes&&ym?.mes!==dPlanFiltroMes)return false;if(dPlanFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dPlanFiltroOrigem)return false;if(_iRB||_fRB){const d=ym?.full||null;if(!d)return false;if(_iRB&&d<_iRB)return false;if(_fRB&&d>_fRB)return false;}return true;});})().slice(0,80).map((item,idx) => {
                      const {r,tipo,dias} = item;
                      const borderC = tipo==="ok"?t.verde:tipo==="atraso"?t.danger:t.ouro;
                      const avatarBg = tipo==="ok"?`rgba(2,192,118,.12)`:tipo==="atraso"?`rgba(246,70,93,.1)`:`rgba(240,185,11,.1)`;
                      const initials = (r.nome||"?").split(" ").filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join("");
                      const saldoPg = parseFloat(r.diaria_pg), saldoPrev = parseFloat(r.diaria_prev);
                      const pgStatus = !isNaN(saldoPg)&&saldoPg>0 ? "pago" : !isNaN(saldoPrev)&&saldoPrev>0 ? "pendente" : null;
                      const chips = [
                        {l:"DT",v:r.dt,c:t.ouro},
                        {l:"Placa",v:r.placa||"—",c:t.verde},
                        {l:"Agenda",v:r.data_agenda||"—",c:t.txt2},
                        {l:"Descarga",v:r.data_desc||"Pendente",c:r.data_desc?t.verde:t.txt2},
                        {l:"Origem",v:r.origem||"—",c:t.txt2},
                        {l:"Destino",v:r.destino||"—",c:t.txt2},
                        ...(r.ro?[{l:"RO",v:r.ro,c:t.laranja}]:[]),
                      ];
                      return (
                        <div key={idx} onClick={()=>abrirDetalhe(r)} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&abrirDetalhe(r)} tabIndex="0" role="button" className="co-card" style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,borderLeft:`4px solid ${borderC}`,padding:12,display:"flex",flexDirection:"column",gap:8,animation:"slideUp .3s",cursor:"pointer"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                            <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg,border:`1.5px solid ${borderC}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:borderC,flexShrink:0}}>{initials}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:14,fontWeight:700,color:t.txt,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{r.nome||"—"}</div>
                              {/* Diária + RO abaixo do nome */}
                              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:2}}>
                                {(r.diaria_prev||r.diaria_pg) && <span style={{fontSize:9,color:t.txt2}}>Diária: <strong style={{color:r.diaria_pg?t.verde:t.ouro}}>{r.diaria_pg ? `R$${r.diaria_pg}` : `R$${r.diaria_prev}`}</strong></span>}
                                {r.ro && <span style={{fontSize:9,color:t.laranja,fontWeight:600}}>RO: {r.ro}</span>}
                              </div>
                              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>
                                <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:11,fontWeight:700,background:tipo==="ok"?`rgba(2,192,118,.08)`:tipo==="atraso"?`rgba(246,70,93,.06)`:`rgba(240,185,11,.06)`,color:borderC,border:`1px solid ${borderC}33`}}>
                                  {tipo==="ok"?hIco(<><polyline points="20 6 9 17 4 12"/></>,t.verde,9):tipo==="atraso"?hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,9):hIco(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,t.ouro,9)}
                                  {tipo==="ok"?"No prazo":tipo==="atraso"?`${dias>0?dias+"d":"Atrasado"}`:"Aguardando"}
                                </span>
                                {pgStatus && <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:11,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>
                                  {pgStatus==="pago"?hIco(<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,t.verde,9):hIco(<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,t.danger,9)}
                                  {pgStatus==="pago"?"Pago":"Não Pago"}
                                </span>}
                              </div>
                            </div>
                            <span style={{fontSize:12,color:t.txt2,flexShrink:0}}>›</span>
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {chips.map((ch,ci) => (
                              <div key={ci} style={{background:t.card2,borderRadius:6,padding:"5px 9px",fontSize:11}}>
                                <span style={{color:t.txt2,fontSize:9}}>{ch.l} </span>
                                <span style={{color:ch.c,fontWeight:600}}>{ch.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

             {dSubTab === "planilha" && (() => {
              const parseYMd = s => {
                if (!s) return null;
                if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const p=s.split("/"); return {ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")}; }
                if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const p=s.split("-"); return {ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")}; }
                return null;
              };
              const dItems = diariasData.items;
              const anosD    = [...new Set(dItems.map(({r})=>{const ym=parseYMd(r.data_carr||r.data_agenda||"");return ym?.ano;}).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
              const mesesD   = [...new Set(dItems.filter(({r})=>{if(!dPlanFiltroAno)return true;const ym=parseYMd(r.data_carr||r.data_agenda||"");return ym?.ano===dPlanFiltroAno;}).map(({r})=>{const ym=parseYMd(r.data_carr||r.data_agenda||"");return ym?.mes;}).filter(Boolean))].sort();
              const origensD = [...new Set(dItems.map(({r})=>(r.origem||"").trim()).filter(Boolean))].sort();
              const MESES_PT = {"01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez"};
              const iniD = dPlanFiltroIni ? new Date(dPlanFiltroIni+"T00:00:00") : null;
              const fimD = dPlanFiltroFim ? new Date(dPlanFiltroFim+"T23:59:59") : null;
              const filtrados = dItems.filter(({r}) => {
                const ym = parseYMd(r.data_carr||r.data_agenda||"");
                if (dPlanFiltroAno && ym?.ano !== dPlanFiltroAno) return false;
                if (dPlanFiltroMes && ym?.mes !== dPlanFiltroMes) return false;
                if (dPlanFiltroOrigem !== "todas" && (r.origem||"").trim() !== dPlanFiltroOrigem) return false;
                if (iniD || fimD) {
                  const d = ym?.full || null;
                  if (!d) return false;
                  if (iniD && d < iniD) return false;
                  if (fimD && d > fimD) return false;
                }
                return true;
              });
              const temFiltro = dPlanFiltroAno || dPlanFiltroMes || dPlanFiltroOrigem!=="todas" || dPlanFiltroIni || dPlanFiltroFim;
              return (
                <div>
                  {/* Barra de filtros */}
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:t.card,
                    border:`1px solid ${t.borda}`,borderRadius:"10px 10px 0 0",flexWrap:"wrap",margin:"0 -16px"}}>
                    <span style={{fontSize:9,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:.8,marginRight:2}}>Filtrar:</span>
                    <select value={dPlanFiltroAno} onChange={e=>setDPlanFiltroAno(e.target.value)}
                      style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dPlanFiltroAno?t.ouro:t.borda}`,background:dPlanFiltroAno?`rgba(240,185,11,.08)`:t.bg,color:dPlanFiltroAno?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                      <option value="">Todos os Anos</option>
                      {anosD.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={dPlanFiltroMes} onChange={e=>setDPlanFiltroMes(e.target.value)}
                      style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dPlanFiltroMes?t.ouro:t.borda}`,background:dPlanFiltroMes?`rgba(240,185,11,.08)`:t.bg,color:dPlanFiltroMes?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                      <option value="">Todos os Meses</option>
                      {mesesD.map(m=><option key={m} value={m}>{MESES_PT[m]||m}</option>)}
                    </select>
                    <select value={dPlanFiltroOrigem} onChange={e=>setDPlanFiltroOrigem(e.target.value)}
                      style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dPlanFiltroOrigem!=="todas"?t.ouro:t.borda}`,background:dPlanFiltroOrigem!=="todas"?`rgba(240,185,11,.08)`:t.bg,color:dPlanFiltroOrigem!=="todas"?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit",maxWidth:180}}>
                      <option value="todas">Todas as Origens</option>
                      {origensD.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                    <input type="date" value={dPlanFiltroIni} onChange={e=>setDPlanFiltroIni(e.target.value)}
                      style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,flex:"1 1 110px",minWidth:0}}/>
                    <span style={{fontSize:10,color:t.txt2,flexShrink:0}}>at&#233;</span>
                    <input type="date" value={dPlanFiltroFim} onChange={e=>setDPlanFiltroFim(e.target.value)}
                      style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,flex:"1 1 110px",minWidth:0}}/>
                    {temFiltro && (
                      <button onClick={()=>{setDPlanFiltroAno("");setDPlanFiltroMes("");setDPlanFiltroOrigem("todas");setDPlanFiltroIni("");setDPlanFiltroFim("");}}
                        style={{fontSize:9,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>
                        &#10005; Limpar
                      </button>
                    )}
                    <span style={{marginLeft:"auto",fontSize:10,color:t.txt2,fontWeight:600,whiteSpace:"nowrap"}}>
                      {filtrados.length} de {dItems.length} registros
                    </span>
                  </div>
                  {/* Tabela */}
                  <div style={{overflowX:"auto",borderRadius:"0 0 11px 11px",border:`1px solid ${t.borda}`,borderTop:"none",maxHeight:"calc(100vh - 240px)",overflowY:"auto",margin:"0 -16px"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:600}}>
                      <thead><tr>{["DT","Motorista","Placa","Origem","Agenda","Descarga","Atraso","Prev.","Pago"].map(h=>(
                        <th key={h} style={{background:t.tableHeader,padding:"9px 10px",textAlign:"left",fontSize:8,
                          textTransform:"uppercase",letterSpacing:1,color:t.txt2,
                          borderBottom:`1px solid ${t.borda}`,whiteSpace:"nowrap",position:"sticky",top:0}}>{h}</th>
                      ))}</tr></thead>
                      <tbody>{filtrados.map(({r,tipo,dias},i)=>(
                        <tr key={i} className="co-tr" style={{background:i%2===0?t.bg:t.bgAlt,cursor:"pointer"}}
                          onClick={()=>{setBuscaInput(r.dt);setBuscaTipo("dt");setActiveTab("busca");}}>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,fontWeight:700,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1.5}}>{r.dt}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{r.nome||"\u2014"}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2,color:t.verde}}>{r.placa||"\u2014"}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,fontSize:10,color:t.txt2,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.origem||"\u2014"}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{r.data_agenda||"\u2014"}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:r.data_desc?t.verde:t.ouro}}>{r.data_desc||"Pendente"}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`,color:tipo==="atraso"?t.danger:t.verde,fontWeight:600}}>{dias===null?"\u2014":dias>0?`+${dias}d`:"\u2705"}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{fmtMoeda(r.diaria_prev)}</td>
                          <td style={{padding:"7px 10px",borderBottom:`1px solid ${t.borda}22`}}>{fmtMoeda(r.diaria_pg)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {dSubTab === "extrato" && (
              <div>
                {!extratoFileName ? (
                  <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    gap:10,border:`2px dashed ${t.borda}`,borderRadius:14,padding:"36px 20px",cursor:"pointer",
                    background:t.card2,marginBottom:16}}
                    onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=t.ouro;}}
                    onDragLeave={e=>{e.currentTarget.style.borderColor=t.borda;}}
                    onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=t.borda;
                      const f=e.dataTransfer.files[0];if(f)parseExtratoXLSX(f);}}>
                    <input type="file" accept=".xlsx,.xls" style={{display:"none"}}
                      onChange={e=>{const f=e.target.files[0];if(f)parseExtratoXLSX(f);e.target.value='';}}/>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                      stroke={t.ouro} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="11" x2="12" y2="17"/>
                      <polyline points="9 14 12 11 15 14"/>
                    </svg>
                    <div style={{fontSize:13,fontWeight:700,color:t.txt}}>Arraste ou clique para carregar o Extrato</div>
                    <div style={{fontSize:10,color:t.txt2}}>Arquivo .xlsx recebido mensalmente (Extrato de Di&#225;rias)</div>
                  </label>
                ) : (
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",
                      borderRadius:10,background:`rgba(240,185,11,.06)`,border:`1px solid ${hexRgb(t.ouro,.25)}`}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={t.ouro} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{fontSize:11,fontWeight:700,color:t.ouro,flex:1}}>{extratoFileName}</span>
                      <span style={{fontSize:10,color:t.txt2}}>{extratoRows.length} registros</span>
                      <button onClick={()=>{setExtratoRows([]);setExtratoFileName(null);setExtratoFiltro("todos");}}
                        style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:6,
                          padding:"2px 8px",fontSize:10,color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>
                        &#215; Trocar
                      </button>
                    </div>
                    {/* Filtro de periodo */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,
                      padding:"10px 14px",borderRadius:10,background:t.card2,border:`1px solid ${t.borda}`}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke={t.txt2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="17" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span style={{fontSize:10,color:t.txt2,fontWeight:600,whiteSpace:"nowrap"}}>Período do app:</span>
                      <input type="date" value={extratoDataIni}
                        onChange={e=>setExtratoDataIni(e.target.value)}
                        style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,width:130}}/>
                      <span style={{fontSize:10,color:t.txt2}}>até</span>
                      <input type="date" value={extratoDataFim}
                        onChange={e=>setExtratoDataFim(e.target.value)}
                        style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,width:130}}/>
                      {(extratoDataIni||extratoDataFim) && (
                        <button onClick={()=>{setExtratoDataIni("");setExtratoDataFim("");}}
                          style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:6,
                            padding:"2px 8px",fontSize:9,color:t.txt2,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                          &#215; Limpar
                        </button>
                      )}
                      <span style={{marginLeft:"auto",fontSize:9,color:t.txt2,whiteSpace:"nowrap"}}>
                        {extratoDataIni||extratoDataFim
                          ? `${extratoDataIni||"?"} → ${extratoDataFim||"?"}` 
                          : "Sem filtro de período"}
                      </span>
                    </div>
                    {extratoResultado && (() => {
                      const {totais, linhas} = extratoResultado;
                      const confCfg = {
                        BATE:              {l:"Bate",          c:t.verde,  bg:"rgba(34,197,94,.1)"},
                        DIVERGE:           {l:"Diverge",       c:t.ouro,   bg:"rgba(243,186,47,.1)"},
                        SEM_CUSTO_OK:      {l:"Sem Custo OK",  c:t.txt2,   bg:"rgba(136,136,176,.08)"},
                        SEM_CUSTO_DIVERGE: {l:"Sem Custo/Div", c:t.danger, bg:"rgba(239,68,68,.1)"},
                        NAO_ENCONTRADA:    {l:"N&#227;o no App",c:t.azulLt,bg:"rgba(96,165,250,.1)"},
                        FORA_EXTRATO:      {l:"Fora Extrato",  c:t.roxo,bg:"rgba(168,85,247,.1)"},
                      };
                      const kpis = [
                        {k:"BATE",              v:totais.bate,           l:"Batendo",      c:t.verde},
                        {k:"DIVERGE",           v:totais.diverge,        l:"Divergente",   c:t.ouro},
                        {k:"SEM_CUSTO_DIVERGE", v:totais.semCustoDiverge,l:"Sem Custo/Div",c:t.danger},
                        {k:"NAO_ENCONTRADA",    v:totais.naoEncontrada,  l:"N&#227;o no App",c:t.azulLt},
                        {k:"FORA_EXTRATO",      v:totais.foraExtrato,    l:"Fora Extrato", c:t.roxo},
                      ];
                      const filtrado = extratoFiltro === "todos" ? linhas : linhas.filter(x=>x.conf===extratoFiltro);
                      return (
                        <div>
                          {(totais.diverge > 0 || totais.semCustoDiverge > 0) && (
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 14px",
                              borderRadius:10,background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.3)"}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke={t.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                              <span style={{fontSize:11,color:t.danger,fontWeight:700}}>
                                Valor em risco: {fmtMoeda(totais.valorEmRisco)}
                              </span>
                              <span style={{fontSize:10,color:t.txt2,marginLeft:"auto"}}>
                                Total pr&#233;-aprovado extrato: {fmtMoeda(totais.totalPreAprovado)}
                              </span>
                            </div>
                          )}
                          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12}}>
                            {kpis.map(k => (
                              <div key={k.k}
                                onClick={()=>setExtratoFiltro(extratoFiltro===k.k?"todos":k.k)}
                                style={{background:t.card2,
                                  border:`1.5px solid ${extratoFiltro===k.k?k.c:t.borda}`,
                                  borderRadius:10,padding:"10px 8px",cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:k.c,lineHeight:1}}>{k.v}</div>
                                <div style={{fontSize:8,color:t.txt2,marginTop:2,textTransform:"uppercase",letterSpacing:1}}>{k.l}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontSize:9,color:t.txt2,marginRight:2}}>Filtrar:</span>
                            {[{k:"todos",l:"Todos"},...Object.entries(confCfg).map(([k,v])=>({k,l:v.l}))].map(f=>(
                              <button key={f.k} onClick={()=>setExtratoFiltro(f.k)}
                                style={{padding:"4px 10px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                                  border:`1.5px solid ${extratoFiltro===f.k?t.ouro:t.borda}`,borderRadius:6,
                                  background:extratoFiltro===f.k?`rgba(240,185,11,.08)`:t.card2,
                                  color:extratoFiltro===f.k?t.ouro:t.txt2}}>{f.l}</button>
                            ))}
                            <span style={{marginLeft:"auto",fontSize:9,color:t.txt2}}>{filtrado.length} reg.</span>
                          </div>
                          <div style={{overflowX:"auto",borderRadius:11,border:`1px solid ${t.borda}`,maxHeight:"60vh",overflowY:"auto",margin:"0 -16px"}}>
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:720}}>
                              <thead><tr>
                                {["Status","DT","Motorista","Cliente","Qtd","Vlr Ext","Vlr App","Dif","RO"].map(h=>(
                                  <th key={h} style={{background:t.tableHeader,padding:"8px 10px",textAlign:"left",
                                    fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,
                                    borderBottom:`1px solid ${t.borda}`,whiteSpace:"nowrap",position:"sticky",top:0,zIndex:1}}>{h}</th>
                                ))}
                              </tr></thead>
                              <tbody>
                                {filtrado.map((row,i) => {
                                  const cfg = confCfg[row.conf]||{l:row.conf,c:t.txt2,bg:"transparent"};
                                  const diff = row.diff||0;
                                  return (
                                    <tr key={i} style={{background:i%2===0?t.bg:t.bgAlt,cursor:row.appReg?"pointer":"default"}}
                                      className="co-tr"
                                      onClick={()=>{if(row.appReg){setBuscaInput(row.dt);setBuscaTipo("dt");setActiveTab("busca");}}}>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`}}>
                                        <span style={{background:cfg.bg,color:cfg.c,border:`1px solid ${cfg.c}44`,
                                          borderRadius:4,padding:"2px 7px",fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>
                                          {cfg.l}
                                        </span>
                                      </td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,fontWeight:700,
                                        fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1.5}}>{row.dt||"\u2014"}</td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,
                                        maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                        {row.appReg?.nome||"\u2014"}
                                      </td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,
                                        maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                                        fontSize:10,color:t.txt2}}>{row.cliente||"\u2014"}</td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,textAlign:"center"}}>{row.qtd??"\u2014"}</td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,textAlign:"right"}}>{fmtMoeda(row.valorTotal)}</td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,textAlign:"right"}}>{fmtMoeda(row.valorApp)}</td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,textAlign:"right",fontWeight:700,
                                        color:diff>0?t.danger:diff<0?t.verde:t.txt2}}>
                                        {diff===0?"\u2014":diff>0?"+"+fmtMoeda(diff):fmtMoeda(diff)}
                                      </td>
                                      <td style={{padding:"6px 10px",borderBottom:`1px solid ${t.borda}22`,fontSize:10,color:t.txt2}}>{row.ro||"\u2014"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
                            {Object.entries(confCfg).map(([k,v])=>(
                              <span key={k} style={{fontSize:9,display:"flex",alignItems:"center",gap:4,color:t.txt2}}>
                                <span style={{width:8,height:8,borderRadius:2,background:v.c,flexShrink:0,display:"inline-block"}}/>
                                {v.l}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
  );
}
