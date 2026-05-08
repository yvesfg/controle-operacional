import React from "react";
import { ExportMenu } from "../exportHelpers.jsx";
import { saveJSON, parseData, diffDias } from "../utils.js";

export default function DescargaView({ ctx }) {
  const {
    activeTab,
    descargaData,
    descargaNavDT, setDescargaNavDT,
    descargaCols, setDescargaCols,
    descargaView, setDescargaView,
    dscTab, setDscTab,
    dscData, setDscData,
    dscFiltroAno, setDscFiltroAno,
    dscFiltroMes, setDscFiltroMes,
    dscFiltroIni, setDscFiltroIni,
    dscFiltroFim, setDscFiltroFim,
    dscFiltroOrigem, setDscFiltroOrigem,
    rodorricaRows, setRodorricaRows,
    rodorricaFileName, setRodorricaFileName,
    rodorricaFiltro, setRodorricaFiltro,
    rodorricaPeriodoIni, setRodorricaPeriodoIni,
    rodorricaPeriodoFim, setRodorricaPeriodoFim,
    rodorricaPeriodoModal, setRodorricaPeriodoModal,
    rodorricaResultado,
    isMobile,
    hIco,
    diffDias,
    parseData,
    t, css, DESIGN,
    hexRgb,
    abrirDetalhe,
    showToast,
    parseRodorricaXLSX,
    motoristas,
  } = ctx;

  if (activeTab !== "descarga") return null;
  return (
          <div>
            {descargaNavDT && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",borderRadius:10,background:`rgba(22,119,255,.08)`,border:`1px solid rgba(22,119,255,.3)`}}>
                {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.azulLt,13)}
                <span style={{fontSize:11,fontWeight:700,color:t.azulLt}}>DT {descargaNavDT}</span>
                <span style={{fontSize:10,color:t.txt2}}>em destaque</span>
                <button onClick={()=>setDescargaNavDT(null)} style={{marginLeft:"auto",background:"transparent",border:`1px solid rgba(22,119,255,.3)`,borderRadius:6,padding:"2px 8px",fontSize:10,color:t.azulLt,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>✕ Limpar</button>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <ExportMenu
                dados={dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:dscTab==="carrega"?descargaData.carregaHoje:dscTab==="semMotorista"?descargaData.semMotorista:descargaData.atrasados}
                cols={[{k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"placa",l:"Placa"},{k:"destino",l:"Destino"},{k:"chegada",l:"Chegada"},{k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"}]}
                filename={`descarga-${dscData}`}
                titulo={`Descarga ${dscTab==="hoje"?"do Dia":dscTab==="aguardando"?"- Aguardando":"- Atrasos"} · ${dscData}`}
              />
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(6,1fr)",gap:isMobile?4:6,marginBottom:12}}>
              {[
                {k:"hoje",svg:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,l:"Descarrega Hoje",ct:descargaData.hoje.length,cor:t.azul,corLt:t.azulLt,bg:"rgba(22,119,255,.07)"},
                {k:"atrasado",svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,l:"Em Atraso",ct:descargaData.atrasados.length,cor:t.danger,corLt:"#f6465d",bg:"rgba(246,70,93,.07)"},
                {k:"aguardando",svg:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,l:"Aguardando Agenda",ct:descargaData.aguardando.length,cor:"#f0b90b",corLt:"#ffe57a",bg:"rgba(240,185,11,.07)"},
                {k:"conferencia",svg:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></>,l:"Conferência",ct:rodorricaRows.length,cor:"#9c27b0",corLt:"#ce93d8",bg:"rgba(156,39,176,.07)"},
                {k:"carrega",svg:<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,l:"Carrega Hoje",ct:descargaData.carregaHoje?.length||0,cor:t.verde,corLt:"#00e096",bg:"rgba(2,192,118,.07)"},
                {k:"semMotorista",svg:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></>,l:"Sem Motorista",ct:descargaData.semMotorista?.length||0,cor:"#9c27b0",corLt:"#ce93d8",bg:"rgba(156,39,176,.07)"}
              ].map(tb => (
                <div key={tb.k} onClick={()=>setDscTab(tb.k)} style={{border:`1.5px solid ${dscTab===tb.k?tb.cor:t.borda}`,borderRadius:8,padding:isMobile?"10px 5px":"18px 10px",cursor:"pointer",background:dscTab===tb.k?tb.bg:t.card2,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .2s",minWidth:0}}>
                  {hIco(tb.svg,dscTab===tb.k?tb.corLt:t.txt2,22)}
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:isMobile?9:11,fontWeight:400,textTransform:"uppercase",letterSpacing:"0.06em",color:dscTab===tb.k?tb.corLt:t.txt2,textAlign:"center",lineHeight:1.2,whiteSpace:"normal",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{tb.l}</span>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:isMobile?22:34,fontWeight:700,letterSpacing:"-0.04em",color:dscTab===tb.k?tb.corLt:t.txt2,lineHeight:1,marginTop:2}}>{tb.ct}</span>
                </div>
              ))}
            </div>

            {dscTab !== "conferencia" && (<>
            {/* Filtros Descarga */}
            {(()=>{
              const _tabAll=dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:dscTab==="carrega"?descargaData.carregaHoje:dscTab==="semMotorista"?descargaData.semMotorista:descargaData.atrasados;
              const _pym=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1]};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1]};}return null;};
              const anosD=[...new Set(_tabAll.map(r=>{const ym=_pym(r.data_carr||r.data_agenda||"");return ym?.ano;}).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
              const mesesD=[...new Set(_tabAll.filter(r=>{if(!dscFiltroAno)return true;const ym=_pym(r.data_carr||r.data_agenda||"");return ym?.ano===dscFiltroAno;}).map(r=>{const ym=_pym(r.data_carr||r.data_agenda||"");return ym?.mes;}).filter(Boolean))].sort();
              const origensD=[...new Set(_tabAll.map(r=>(r.origem||"").trim()).filter(Boolean))].sort();
              const MESES_PT={"01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez"};
              const temFiltro=dscFiltroAno||dscFiltroMes||dscFiltroOrigem!=="todas"||dscFiltroIni||dscFiltroFim;
              const _iniC=dscFiltroIni?new Date(dscFiltroIni+"T00:00:00"):null;
              const _fimC=dscFiltroFim?new Date(dscFiltroFim+"T23:59:59"):null;
              const _pymF=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};
              const _cnt=_tabAll.filter(r=>{const ym=_pymF(r.data_carr||r.data_agenda||"");if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroAno&&ym?.ano!==dscFiltroAno)return false;if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroMes&&ym?.mes!==dscFiltroMes)return false;if(dscFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dscFiltroOrigem)return false;if(_iniC||_fimC){const d=ym?.full||null;if(!d)return false;if(_iniC&&d<_iniC)return false;if(_fimC&&d>_fimC)return false;}return true;}).length;
              return (
                <div className="co-filter-bar">
                  <span className="co-filter-bar__label">Filtrar:</span>
                  <select value={dscFiltroAno} onChange={e=>{setDscFiltroAno(e.target.value);setDscFiltroMes("");}}
                    style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dscFiltroAno?t.ouro:t.borda}`,background:dscFiltroAno?`rgba(240,185,11,.08)`:t.bg,color:dscFiltroAno?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="">Todos os Anos</option>
                    {anosD.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={dscFiltroMes} onChange={e=>setDscFiltroMes(e.target.value)}
                    style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dscFiltroMes?t.ouro:t.borda}`,background:dscFiltroMes?`rgba(240,185,11,.08)`:t.bg,color:dscFiltroMes?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="">Todos os Meses</option>
                    {mesesD.map(m=><option key={m} value={m}>{MESES_PT[m]||m}</option>)}
                  </select>
                  <select value={dscFiltroOrigem} onChange={e=>setDscFiltroOrigem(e.target.value)}
                    style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${dscFiltroOrigem!=="todas"?t.ouro:t.borda}`,background:dscFiltroOrigem!=="todas"?`rgba(240,185,11,.08)`:t.bg,color:dscFiltroOrigem!=="todas"?t.ouro:t.txt,cursor:"pointer",fontFamily:"inherit",maxWidth:180}}>
                    <option value="todas">Todas as Origens</option>
                    {origensD.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                  <span style={{fontSize:9,color:t.txt2,flexShrink:0,paddingLeft:8,borderLeft:`1px solid ${t.borda}`,marginLeft:4}}>ou período:</span>
                  <input type="date" value={dscFiltroIni} onChange={e=>{setDscFiltroIni(e.target.value);setDscFiltroAno("");setDscFiltroMes("");}}
                    style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,flex:"1 1 110px",minWidth:0}}/>
                  <span style={{fontSize:10,color:t.txt2,flexShrink:0}}>até</span>
                  <input type="date" value={dscFiltroFim} onChange={e=>setDscFiltroFim(e.target.value)}
                    style={{...css.inp,padding:"4px 8px",fontSize:11,height:28,flex:"1 1 110px",minWidth:0}}/>
                  {temFiltro && (
                    <button onClick={()=>{setDscFiltroAno("");setDscFiltroMes("");setDscFiltroOrigem("todas");setDscFiltroIni("");setDscFiltroFim("");}}
                      style={{fontSize:9,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>
                      &#10005; Limpar
                    </button>
                  )}
                  <span style={{marginLeft:"auto",fontSize:10,color:t.txt2,fontWeight:600,whiteSpace:"nowrap"}}>
                    {_cnt} de {_tabAll.length}
                  </span>
                </div>
              );
            })()}
            {dscTab!=="semMotorista" && (
            <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
              <input type="date" value={dscData} onChange={e=>setDscData(e.target.value)} style={{...css.inp,flex:1}} />
              <button onClick={()=>{}} style={{...css.btnGold,padding:"10px 14px",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.card,16)}</button>
            </div>)}

            {/* Toolbar view Descarga */}
            <div className="co-tabbar" style={{flexWrap:"wrap",marginBottom:12}}>
              {[
                {v:"linhas",l:"Linhas",svg:<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>},
                {v:"blocos",l:"Blocos",svg:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>}
              ].map(m => (
                <button key={m.v} onClick={()=>{setDescargaView(m.v);saveJSON("co_descarga_view",m.v);}} className={`co-tab${descargaView===m.v?" co-tab--active":""}`} style={{display:"flex",alignItems:"center",gap:4}}>
                  {hIco(m.svg,descargaView===m.v?t.azulLt:t.txt2,14)} {m.l}
                </button>
              ))}
              {descargaView==="blocos" && (
                <>
                  <span className="co-filter-bar__label" style={{marginLeft:8}}>Colunas:</span>
                  {(isMobile?[1,2]:[1,2,3,4]).map(n => (
                    <button key={n} onClick={()=>{setDescargaCols(n);saveJSON("co_descarga_cols",n);}} style={{width:36,height:36,minWidth:36,minHeight:36,fontSize:11,fontWeight:700,border:`1.5px solid ${descargaCols===n?t.azul:t.borda}`,borderRadius:7,cursor:"pointer",background:descargaCols===n?`rgba(22,119,255,.09)`:t.card2,color:descargaCols===n?t.azulLt:t.txt2,fontFamily:"inherit"}}>{n}</button>
                  ))}
                </>
              )}
            </div>

            {descargaView==="linhas" ? (
              // ── MODO LINHAS (original) ──
              <>
                {(()=>{const _dl=dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:dscTab==="carrega"?descargaData.carregaHoje:dscTab==="semMotorista"?descargaData.semMotorista:descargaData.atrasados;const _iniL=dscFiltroIni?new Date(dscFiltroIni+"T00:00:00"):null;const _fimL=dscFiltroFim?new Date(dscFiltroFim+"T23:59:59"):null;const _pymL=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};const _fl=_dl.filter(r=>{const ym=_pymL(r.data_carr||r.data_agenda||"");if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroAno&&ym?.ano!==dscFiltroAno)return false;if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroMes&&ym?.mes!==dscFiltroMes)return false;if(dscFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dscFiltroOrigem)return false;if(_iniL||_fimL){const d=ym?.full||null;if(!d)return false;if(_iniL&&d<_iniL)return false;if(_fimL&&d>_fimL)return false;}return true;});return descargaNavDT?[..._fl].sort((a,b)=>a.dt===descargaNavDT?-1:b.dt===descargaNavDT?1:0):_fl;})().slice(0,50).map((r,i) => {
                  const da = parseData(r.data_agenda);
                  const dias = da ? diffDias(da, new Date(dscData+"T00:00:00")) : null;
                  const isAtrasado = dscTab === "atrasado";
                  const _isDHL2 = descargaNavDT && r.dt === descargaNavDT;
                  return (
                    <div key={i} onClick={()=>abrirDetalhe(r)} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&abrirDetalhe(r)} tabIndex="0" role="button" style={{background:_isDHL2?`rgba(22,119,255,.06)`:t.card,borderRadius:11,padding:12,border:`1px solid ${_isDHL2?t.azulLt:t.borda}`,borderLeft:`3px solid ${_isDHL2?t.azulLt:isAtrasado?t.danger:t.azul}`,marginBottom:8,animation:"slideUp .3s",cursor:"pointer",boxShadow:_isDHL2?`0 0 0 2px rgba(22,119,255,.18)`:"none"}}>
                      <div style={{fontSize:15,fontWeight:700,color:t.txt,marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        {isAtrasado && dias !== null && <span style={{background:`rgba(246,70,93,.07)`,color:t.danger,border:`1px solid rgba(246,70,93,.18)`,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>🚨 {dias}d</span>}
                        {r.nome||"—"}
                        {r.ro && <span style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:700,background:`rgba(255,152,0,.08)`,color:t.laranja,border:`1px solid rgba(255,152,0,.25)`}}>RO {r.ro}</span>}
                        <span style={{marginLeft:"auto",fontSize:10,color:t.txt2}}>ver detalhes ›</span>
                      </div>
                      <div style={{fontSize:12,color:t.txt2,lineHeight:1.8}}>
                        🔢 <strong style={{color:t.txt}}>{r.dt}</strong> · 🚛 {r.placa||"—"}<br/>
                        📍 {r.destino||"—"}<br/>
                        📅 Agenda: <strong style={{color:isAtrasado?t.danger:t.ouro}}>{r.data_agenda||"—"}</strong>
                        {r.data_desc && <> · 🏁 Descarga: <strong style={{color:t.verde}}>{r.data_desc}</strong></>}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              // ── MODO BLOCOS (Opção C com avatar) ──
              <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?Math.min(descargaCols,2):descargaCols},minmax(0,1fr))`,gap:isMobile?8:10,width:"100%"}}>
                {/* Banner truncamento descarga */}
                {(()=>{const _db=dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:dscTab==="carrega"?descargaData.carregaHoje:dscTab==="semMotorista"?descargaData.semMotorista:descargaData.atrasados;const _iniB=dscFiltroIni?new Date(dscFiltroIni+"T00:00:00"):null;const _fimB=dscFiltroFim?new Date(dscFiltroFim+"T23:59:59"):null;const _pymB=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};const _fb=_db.filter(r=>{const ym=_pymB(r.data_carr||r.data_agenda||"");if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroAno&&ym?.ano!==dscFiltroAno)return false;if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroMes&&ym?.mes!==dscFiltroMes)return false;if(dscFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dscFiltroOrigem)return false;if(_iniB||_fimB){const d=ym?.full||null;if(!d)return false;if(_iniB&&d<_iniB)return false;if(_fimB&&d>_fimB)return false;}return true;});return _fb.length>80?(<div style={{padding:"8px 12px",marginBottom:8,borderRadius:8,background:"rgba(240,185,11,.08)",border:"1px solid rgba(240,185,11,.25)",fontSize:11,color:t.ouro}}>Mostrando 80 de {_fb.length} — refine os filtros para ver todos</div>):null;})()}
                {(()=>{const _db=dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:dscTab==="carrega"?descargaData.carregaHoje:dscTab==="semMotorista"?descargaData.semMotorista:descargaData.atrasados;const _iniB=dscFiltroIni?new Date(dscFiltroIni+"T00:00:00"):null;const _fimB=dscFiltroFim?new Date(dscFiltroFim+"T23:59:59"):null;const _pymB=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};const _fb=_db.filter(r=>{const ym=_pymB(r.data_carr||r.data_agenda||"");if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroAno&&ym?.ano!==dscFiltroAno)return false;if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroMes&&ym?.mes!==dscFiltroMes)return false;if(dscFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dscFiltroOrigem)return false;if(_iniB||_fimB){const d=ym?.full||null;if(!d)return false;if(_iniB&&d<_iniB)return false;if(_fimB&&d>_fimB)return false;}return true;});return descargaNavDT?[..._fb].sort((a,b)=>a.dt===descargaNavDT?-1:b.dt===descargaNavDT?1:0):_fb;})().slice(0,80).map((r,i) => {
                  const da = parseData(r.data_agenda);
                  const dias = da ? diffDias(da, new Date(dscData+"T00:00:00")) : null;
                  const isAtrasado = dscTab === "atrasado";
                  const isAguardando = dscTab === "aguardando";
                  const _isDHL3 = descargaNavDT && r.dt === descargaNavDT;
                  const accentC = _isDHL3?t.azulLt:isAtrasado ? t.danger : isAguardando ? "#f0b90b" : t.azul;
                  const avatarBg = isAtrasado ? `rgba(246,70,93,.1)` : isAguardando ? `rgba(240,185,11,.1)` : `rgba(22,119,255,.1)`;
                  const initials = (r.nome||"?").split(" ").filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join("");
                  const saldoPg = parseFloat(r.saldo), vl = parseFloat(r.vl_contrato);
                  const pgStatus = !isNaN(saldoPg)&&saldoPg===0&&!isNaN(vl)&&vl>0 ? "pago" : !isNaN(saldoPg)&&saldoPg>0 ? "pendente" : null;
                  const chips = [
                    {l:"DT",v:r.dt,c:t.ouro},
                    {l:"Placa",v:r.placa||"—",c:t.verde},
                    {l:"Destino",v:r.destino||"—",c:t.txt2},
                    ...(isAguardando&&r.chegada?[{l:"Chegada",v:r.chegada,c:"#f0b90b"}]:[]),
                    {l:"Agenda",v:r.data_agenda||"—",c:isAtrasado?t.danger:isAguardando?"#f0b90b":t.ouro},
                    {l:"Descarga",v:r.data_desc||"Pendente",c:r.data_desc?t.verde:t.txt2},
                    ...(r.origem?[{l:"Origem",v:r.origem,c:t.txt2}]:[]),
                    ...(r.ro?[{l:"RO",v:r.ro,c:t.laranja}]:[]),
                  ];
                  return (
                    <div key={i} onClick={()=>abrirDetalhe(r)} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&abrirDetalhe(r)} tabIndex="0" role="button" style={{background:_isDHL3?`rgba(22,119,255,.06)`:t.card,borderRadius:12,border:`1px solid ${_isDHL3?t.azulLt:t.borda}`,borderLeft:`4px solid ${accentC}`,padding:12,display:"flex",flexDirection:"column",gap:8,animation:"slideUp .3s",cursor:"pointer",boxShadow:_isDHL3?`0 0 0 2px rgba(22,119,255,.18)`:"none"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg,border:`1.5px solid ${accentC}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:accentC,flexShrink:0}}>{initials}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:t.txt,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{r.nome||"—"}</div>
                          {/* Diária + RO abaixo do nome */}
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:2}}>
                            {r.diaria_prev && <span style={{fontSize:9,color:t.txt2}}>Diária: <strong style={{color:t.ouro}}>R${r.diaria_prev}</strong></span>}
                            {r.ro && <span style={{fontSize:9,color:t.laranja,fontWeight:600}}>RO: {r.ro}</span>}
                          </div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>
                            {isAtrasado && dias !== null && (
                              <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:8,fontWeight:700,background:`rgba(246,70,93,.07)`,color:t.danger,border:`1px solid rgba(246,70,93,.18)`}}>{hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.danger,9)} {dias}d atraso</span>
                            )}
                            {pgStatus && <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:4,fontSize:11,fontWeight:700,background:pgStatus==="pago"?`rgba(2,192,118,.08)`:`rgba(246,70,93,.06)`,color:pgStatus==="pago"?t.verde:t.danger,border:`1px solid ${pgStatus==="pago"?t.verde:t.danger}33`}}>
                              {pgStatus==="pago"?hIco(<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,t.verde,9):hIco(<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,t.danger,9)}
                              {pgStatus==="pago"?"Pago":"Pendente"}
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
            {(()=>{const _de=dscTab==="hoje"?descargaData.hoje:dscTab==="aguardando"?descargaData.aguardando:dscTab==="carrega"?descargaData.carregaHoje:dscTab==="semMotorista"?descargaData.semMotorista:descargaData.atrasados;const _iniE=dscFiltroIni?new Date(dscFiltroIni+"T00:00:00"):null;const _fimE=dscFiltroFim?new Date(dscFiltroFim+"T23:59:59"):null;const _pymE=s=>{if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return{ano:p[2],mes:p[1],full:new Date(p[2]+"-"+p[1]+"-"+p[0]+"T00:00:00")};}if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return{ano:p[0],mes:p[1],full:new Date(s+"T00:00:00")};}return null;};return _de.filter(r=>{const ym=_pymE(r.data_carr||r.data_agenda||"");if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroAno&&ym?.ano!==dscFiltroAno)return false;if(dscTab!=="semMotorista"&&dscTab!=="hoje"&&dscFiltroMes&&ym?.mes!==dscFiltroMes)return false;if(dscFiltroOrigem!=="todas"&&(r.origem||"").trim()!==dscFiltroOrigem)return false;if(_iniE||_fimE){const d=ym?.full||null;if(!d)return false;if(_iniE&&d<_iniE)return false;if(_fimE&&d>_fimE)return false;}return true;}).length;})() === 0 && (
              <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>{dscTab==="hoje"?"📅":dscTab==="aguardando"?"⏳":dscTab==="semMotorista"?"🚫":"✅"}</div><h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:600,letterSpacing:"-0.02em",color:"var(--text2)"}}>{dscTab==="hoje"?"NENHUMA DESCARGA HOJE":dscTab==="aguardando"?"NENHUM AGUARDANDO AGENDA":dscTab==="carrega"?"NENHUM CARREGAMENTO HOJE":dscTab==="semMotorista"?"NENHUM DT SEM MOTORISTA":"SEM ATRASOS"}</h3></div>
            )}
            </>)}

            {dscTab === "conferencia" && (
              <div>
                {!rodorricaFileName ? (
                  <div
                    onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=t.ouro;}}
                    onDragLeave={e=>{e.currentTarget.style.borderColor=t.borda;}}
                    onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=t.borda;const f=e.dataTransfer.files[0];if(f)parseRodorricaXLSX(f);}}
                    onClick={()=>{const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls';i.onchange=ev=>{if(ev.target.files[0])parseRodorricaXLSX(ev.target.files[0]);};i.click();}}
                    style={{border:`2px dashed ${t.borda}`,borderRadius:14,padding:"40px 24px",textAlign:"center",cursor:"pointer",transition:"border-color .2s",marginBottom:16}}>
                    {hIco(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,t.ouro,32)}
                    <div style={{fontSize:13,fontWeight:700,color:t.txt,marginTop:12}}>Importar Planilha RODORRICA</div>
                    <div style={{fontSize:11,color:t.txt2,marginTop:4}}>Arraste o .xlsx ou clique para selecionar — aba <b style={{color:t.ouro}}>Aprovados</b></div>
                  </div>
                ) : (
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:t.card,border:`1px solid ${t.borda}`,borderRadius:10,marginBottom:12}}>
                      {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.verde,16)}
                      <span style={{fontSize:11,fontWeight:700,color:t.ouro,flex:1}}>{rodorricaFileName}</span>
                      <span style={{fontSize:10,color:t.txt2}}>{rodorricaRows.length} registros</span>
                      <button onClick={()=>{setRodorricaRows([]);setRodorricaFileName(null);setRodorricaFiltro("todos");setRodorricaPeriodoIni("");setRodorricaPeriodoFim("");}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:6,padding:"2px 8px",fontSize:10,color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>&#10005; Limpar</button>
                    </div>
                    {/* Filtro de período */}
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",padding:"7px 12px",background:t.card2,border:`1px solid ${t.borda}`,borderRadius:10,marginBottom:8,fontSize:11}}>
                      <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:t.txt2}}>Período:</span>
                      <input type="date" value={rodorricaPeriodoIni} onChange={e=>setRodorricaPeriodoIni(e.target.value)}
                        style={{fontSize:11,padding:"3px 7px",borderRadius:6,border:`1.5px solid ${rodorricaPeriodoIni?t.ouro:t.borda}`,background:t.card,color:t.txt,height:26,width:130,cursor:"pointer"}}/>
                      <span style={{fontSize:10,color:t.txt2}}>até</span>
                      <input type="date" value={rodorricaPeriodoFim} onChange={e=>setRodorricaPeriodoFim(e.target.value)}
                        style={{fontSize:11,padding:"3px 7px",borderRadius:6,border:`1.5px solid ${rodorricaPeriodoFim?t.ouro:t.borda}`,background:t.card,color:t.txt,height:26,width:130,cursor:"pointer"}}/>
                      {(rodorricaPeriodoIni||rodorricaPeriodoFim)&&(<button onClick={()=>{setRodorricaPeriodoIni("");setRodorricaPeriodoFim("");}} style={{fontSize:9,padding:"3px 7px",borderRadius:6,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>✕</button>)}
                      <span style={{marginLeft:"auto",fontSize:9,color:t.txt2}}>{(rodorricaPeriodoIni||rodorricaPeriodoFim)?"Filtrando por data de carregamento":"Todas as datas"}</span>
                    </div>
                    {/* Modal de seleção de período pós-upload */}
                    {rodorricaPeriodoModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setRodorricaPeriodoModal(false)}>
                      <div style={{background:t.card,border:`1.5px solid ${t.ouro}`,borderRadius:16,padding:"28px 28px 22px",minWidth:340,maxWidth:420,boxShadow:"0 8px 40px rgba(0,0,0,.5)"}} onClick={e=>e.stopPropagation()}>
                        <div style={{fontWeight:800,fontSize:14,color:t.ouro,marginBottom:6}}>📅 Definir período de comparação</div>
                        <div style={{fontSize:11,color:t.txt2,marginBottom:18}}>Filtra por <b>DT Carregamento</b> da planilha. Deixe em branco para incluir todos os registros.</div>
                        <div style={{display:"flex",flexDirection:"column",gap:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:11,color:t.txt2,width:40}}>De:</span>
                            <input type="date" value={rodorricaPeriodoIni} onChange={e=>setRodorricaPeriodoIni(e.target.value)}
                              style={{flex:1,fontSize:12,padding:"6px 10px",borderRadius:8,border:`1.5px solid ${rodorricaPeriodoIni?t.ouro:t.borda}`,background:t.bg,color:t.txt,cursor:"pointer"}}/>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:11,color:t.txt2,width:40}}>Até:</span>
                            <input type="date" value={rodorricaPeriodoFim} onChange={e=>setRodorricaPeriodoFim(e.target.value)}
                              style={{flex:1,fontSize:12,padding:"6px 10px",borderRadius:8,border:`1.5px solid ${rodorricaPeriodoFim?t.ouro:t.borda}`,background:t.bg,color:t.txt,cursor:"pointer"}}/>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
                          <button onClick={()=>{setRodorricaPeriodoIni("");setRodorricaPeriodoFim("");setRodorricaPeriodoModal(false);}} style={{fontSize:11,padding:"7px 16px",borderRadius:8,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>Sem filtro</button>
                          <button onClick={()=>setRodorricaPeriodoModal(false)} style={{fontSize:11,padding:"7px 20px",borderRadius:8,border:"none",background:t.ouro,color:"#1a1a2e",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Aplicar</button>
                        </div>
                      </div>
                    </div>)}
                    {rodorricaResultado && (()=>{
                      const {totais,linhas,syncOk} = rodorricaResultado;
                      const fmtR = v => "R$ " + Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
                      const STATUS_COR = {BATE:"#02c076",MAIOR:"#f6465d",MENOR:"#f0b90b",SEM_APP:"#ff9800",FORA_PLAN:"#9c27b0",SEM_DADOS:"#848e9c",SEM_SYNC:"#3b82f6",INEXISTENTE:"#848e9c"};
                      const STATUS_LABEL = {BATE:"✓ BATE",MAIOR:"↑ MAIOR",MENOR:"↓ MENOR",SEM_APP:"— SEM PAG.",FORA_PLAN:"◊ FORA PLAN.",SEM_DADOS:"? SEM DT",SEM_SYNC:"↻ SEM SYNC",INEXISTENTE:"∅"};
                      const KPIS = [
                        {k:"BATE",l:"Bate",c:"#02c076",bg:"rgba(2,192,118,.08)",v:totais.bate},
                        {k:"MAIOR",l:"Planilha Maior",c:"#f6465d",bg:"rgba(246,70,93,.08)",v:totais.maior},
                        {k:"MENOR",l:"Planilha Menor",c:"#f0b90b",bg:"rgba(240,185,11,.08)",v:totais.menor},
                        {k:"SEM_APP",l:"Sem Pag.App",c:"#ff9800",bg:"rgba(255,152,0,.08)",v:totais.semApp},
                        {k:"SEM_DADOS",l:"Sem DT",c:"#848e9c",bg:t.card2,v:totais.semDados},
                      ];
                      const _pIni = rodorricaPeriodoIni ? new Date(rodorricaPeriodoIni+"T00:00:00") : null;
                      const _pFim = rodorricaPeriodoFim ? new Date(rodorricaPeriodoFim+"T23:59:59") : null;
                      const linhasPeriodo = (_pIni||_pFim) ? linhas.filter(x=>{
                        const dc = x.dtCarregamento ? new Date(x.dtCarregamento+"T00:00:00") : null;
                        if(!dc) return !_pIni && !_pFim;
                        return (!_pIni||dc>=_pIni)&&(!_pFim||dc<=_pFim);
                      }) : linhas;
                      const filtrado = rodorricaFiltro === "todos" ? linhasPeriodo : linhasPeriodo.filter(x=>x.conf===rodorricaFiltro);
                      const _confCor = c => ({BATE:"#02c076",MAIOR:"#f6465d",MENOR:"#f0b90b",SEM_APP:"#ff9800",FORA_PLAN:"#9c27b0",SEM_DADOS:"#848e9c",SEM_SYNC:"#3b82f6",INEXISTENTE:"#848e9c"}[c]||t.txt2);
                      const _confLbl = c => ({BATE:"✓",MAIOR:"↑",MENOR:"↓",SEM_APP:"—",FORA_PLAN:"◊",SEM_DADOS:"?",SEM_SYNC:"↻",INEXISTENTE:"∅"}[c]||c);
                      return (
                        <div>
                          {/* KPI cards */}
                          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}}>
                            {KPIS.map(k=>(
                              <div key={k.k} onClick={()=>setRodorricaFiltro(rodorricaFiltro===k.k?"todos":k.k)}
                                style={{background:k.bg,border:`1.5px solid ${rodorricaFiltro===k.k?k.c:t.borda}`,borderRadius:10,padding:"9px 8px",cursor:"pointer",textAlign:"center"}}>
                                <div style={{fontSize:20,fontFamily:"'Bebas Neue',sans-serif",color:k.c}}>{k.v}</div>
                                <div style={{fontSize:8,fontWeight:700,color:k.c,textTransform:"uppercase",letterSpacing:.5}}>{k.l}</div>
                              </div>
                            ))}
                          </div>
                          {/* Alertas de tipo */}
                          {(totais.semStrech>0||totais.semDescarga>0)&&(<div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                            {totais.semStrech>0&&<span style={{fontSize:10,background:"rgba(246,70,93,.1)",border:"1px solid #f6465d44",borderRadius:6,padding:"3px 10px",color:"#f6465d"}}>⚠ {totais.semStrech} NFs com Descarga sem Stretch</span>}
                            {totais.semDescarga>0&&<span style={{fontSize:10,background:"rgba(240,185,11,.1)",border:"1px solid #f0b90b44",borderRadius:6,padding:"3px 10px",color:"#f0b90b"}}>⚠ {totais.semDescarga} NFs com Stretch sem Descarga</span>}
                          </div>)}
                          {/* Totais */}
                          <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",alignItems:"center",padding:"7px 12px",background:t.card,border:`1px solid ${t.borda}`,borderRadius:10}}>
                            <span style={{fontSize:9,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:.8}}>Risco:</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#f6465d"}}>{fmtR(totais.valorEmRisco)}</span>
                            <span style={{fontSize:10,color:t.txt2,marginLeft:8}}>Planilha: <b style={{color:t.txt}}>{fmtR(totais.totalPlanilha)}</b></span>
                            <span style={{fontSize:10,color:t.txt2}}>App: <b style={{color:t.txt}}>{fmtR(totais.totalApp)}</b></span>
                            <button onClick={()=>setRodorricaPeriodoModal(true)} style={{marginLeft:"auto",fontSize:9,padding:"3px 10px",borderRadius:6,border:`1.5px solid ${t.ouro}`,background:"transparent",color:t.ouro,cursor:"pointer",fontFamily:"inherit"}}>📅 Período</button>
                            {rodorricaFiltro!=="todos"&&<button onClick={()=>setRodorricaFiltro("todos")} style={{fontSize:9,padding:"3px 8px",borderRadius:6,border:`1.5px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>✕ Limpar</button>}
                            <span style={{fontSize:10,color:t.txt2,fontWeight:600}}>{filtrado.length} NFs</span>
                          </div>
                          {/* Tabela */}
                          <div style={{overflowX:"auto"}}>
                            {!syncOk&&<div style={{background:"rgba(59,130,246,.1)",border:"1.5px solid rgba(59,130,246,.3)",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:10,color:"#3b82f6",lineHeight:1.6}}>
                              ⚠️ <strong>Colunas PAG. DESCARGA / PAG. STRETCH ainda não sincronizadas.</strong><br/>
                              Atualize o Apps Script (adicione os campos ao <code>mapearColuna</code>) e rode uma sincronização para liberar a comparação completa.
                            </div>}
                            <table className="ds-table ds-table--compact">
                              <thead><tr style={{background:t.card2}}>
                                {["DT","NF","Dt Faturamento","Cliente","Desc.Plan","Desc.GSheets","Dif.Desc","Str.Plan","Str.GSheets","Dif.Str","Total Plan","Total GSheets","Status"].map(h=>(
                                  <th key={h} style={{padding:"7px 8px",textAlign:"left",fontSize:9,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:.4,borderBottom:`1px solid ${t.borda}`,whiteSpace:"nowrap"}}>{h}</th>
                                ))}
                              </tr></thead>
                              <tbody>
                                {filtrado.map((row,i)=>{
                                  const cor = STATUS_COR[row.conf]||t.txt2;
                                  const fV = v => v!==0?"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
                                  const fD = v => Math.abs(v||0)<0.5?"—":(v>0?"+":"")+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
                                  const cDesc = _confCor(row.confDesc); const cStr = _confCor(row.confStr);
                                  return (
                                    <tr key={i} style={{borderBottom:`1px solid ${t.borda}`,background:i%2===0?t.bg:t.card}}>
                                      <td style={{padding:"5px 8px",fontWeight:700,color:t.ouro,whiteSpace:"nowrap"}}>{row.dt}{row.semStrech&&<span title="Sem Stretch" style={{marginLeft:4,fontSize:8,color:"#f6465d"}}>▲</span>}{row.semDescarga&&<span title="Sem Descarga" style={{marginLeft:4,fontSize:8,color:"#f0b90b"}}>▲</span>}</td>
                                      <td style={{padding:"5px 8px",color:t.azulLt,whiteSpace:"nowrap",fontSize:10}}>{row.nf||"—"}</td>
                                      <td style={{padding:"5px 8px",color:t.txt2,whiteSpace:"nowrap",fontSize:10}}>{row.dtCarregamento||"—"}</td>
                                      <td style={{padding:"5px 8px",color:t.txt,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:10}}>{row.cliente||"—"}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",color:t.txt}}>{fV(row.descarga)}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",color:cDesc}}>{row.temDados?fV(row.appDesc):"—"}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:600,color:cDesc}}>{row.temDados&&syncOk?fD(row.diffDesc):"—"}{" "}<span style={{fontSize:8}}>{_confLbl(row.confDesc)}</span></td>
                                      <td style={{padding:"5px 8px",textAlign:"right",color:t.txt}}>{fV(row.stretch)}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",color:cStr}}>{row.temDados?fV(row.appStr):"—"}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:600,color:cStr}}>{row.temDados&&syncOk?fD(row.diffStr):"—"}{" "}<span style={{fontSize:8}}>{_confLbl(row.confStr)}</span></td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:t.txt}}>{fV(row.totalPlan)}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:row.temDados?t.txt:t.txt2}}>{row.temDados?fV(row.totalApp):"—"}</td>
                                      <td style={{padding:"5px 8px"}}><span style={{fontSize:9,fontWeight:700,color:cor,background:`${cor}18`,border:`1px solid ${cor}44`,borderRadius:5,padding:"2px 6px",whiteSpace:"nowrap"}}>{STATUS_LABEL[row.conf]||row.conf}</span></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {!filtrado.length&&<div style={{textAlign:"center",padding:"32px 0",color:t.txt2,fontSize:12}}>Nenhum resultado para o período selecionado</div>}
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
