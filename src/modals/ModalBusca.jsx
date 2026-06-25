import React, { useEffect } from "react";
import { clickable } from "../utils.js";
import Icon from "../components/Icon.jsx";

export default function ModalBusca({ ctx }) {
  const {
    buscaModalOpen, setBuscaModalOpen,
    buscaTipo, setBuscaTipo,
    buscaInput, setBuscaInput,
    buscaResult, setBuscaResult,
    buscaRelacionados, setBuscaRelacionados,
    buscaError, setBuscaError,
    historico,
    buscar,
    DADOS, motoristas,
    canEdit, canFin, fmtMoeda,
    connStatus,
    setFormData, setEditIdx, setEditStep, setModalOpen,
    setWppFatModal, setWppModal, setWppTel, setWppPgto,
    setWppValCheque, setWppValConta, setWppObs,
    setWppModal2, setWpp2Ro, setWpp2IncluirObs,
    abrirWppPagModal, abrirOcorrModal,
    dtBase, parseData, saveJSON,
    t, css, hIco, DESIGN,
  } = ctx;

  if (!buscaModalOpen) return null;

  return (
    <div
      className="co-modal-overlay co-modal-overlay--top"
      style={{overflowY:"auto"}}
      onClick={e=>{if(e.target===e.currentTarget)setBuscaModalOpen(false);}}
    >
      <div style={{background:t.card,borderRadius:20,width:"100%",maxWidth:640,
                   border:`1px solid ${t.borda}`,boxShadow:"0 32px 64px rgba(0,0,0,.5)",
                   animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}}>
        {/* Header */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${t.borda}`,display:"flex",
                     alignItems:"center",gap:10,borderRadius:"20px 20px 0 0"}}>
          {hIco(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>,t.ouro,16,2)}
          <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:15,color:t.txt}}>Buscar Registro</span>
          <kbd style={{marginLeft:"auto",fontSize:9,padding:"2px 6px",borderRadius:4,
                       border:`1px solid ${t.borda}`,color:t.txt2,fontFamily:"var(--font-mono)",
                       background:t.card2}}>Ctrl+K</kbd>
          <button
            onClick={()=>setBuscaModalOpen(false)}
            style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:32,height:32,
                    cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}
          >
            {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,16)}
          </button>
        </div>
        {/* Body */}
        <div style={{padding:"20px 20px 20px",maxHeight:"calc(100vh - 180px)",overflowY:"auto"}}>
            <div style={{display:"flex",gap:6,marginBottom:12,justifyContent:"center"}}>
              {[
                {k:"dt",    ico:<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,    l:"DT"},
                {k:"cpf",   ico:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,                  l:"CPF"},
                {k:"placa", ico:<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>, l:"PLACA"},
              ].map(b => (
                <button key={b.k} onClick={()=>{setBuscaTipo(b.k);setBuscaInput("");setBuscaResult(null);setBuscaError(null)}} style={{padding:"10px 18px",fontSize:12,fontWeight:700,border:`1.5px solid ${buscaTipo===b.k?t.ouro:t.borda}`,borderRadius:DESIGN.r.btn,cursor:"pointer",background:buscaTipo===b.k?`rgba(240,185,11,.08)`:t.card2,color:buscaTipo===b.k?t.ouro:t.txt2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all .18s"}}>
                  {hIco(b.ico,buscaTipo===b.k?t.ouro:t.txt2,15,2)} {b.l}
                </button>
              ))}
            </div>

            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input value={buscaInput} onChange={e=>setBuscaInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscar()} placeholder={buscaTipo==="dt"?"00000000":buscaTipo==="cpf"?"000.000.000-00":"AAA0A00"} style={{...css.inp,flex:1,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:3,textTransform:buscaTipo==="placa"?"uppercase":"none"}} />
              <button onClick={buscar} style={{...css.btnGold,padding:"0 20px",display:"flex",alignItems:"center"}}><Icon n="search" s={20} c="currentColor" sw={2.2}/></button>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14,padding:"8px 12px",background:t.card,borderRadius:9,border:`1px solid ${t.verde}`}}>
              <span style={{width:6,height:6,background:t.verde,borderRadius:"50%",animation:"pulse 2s infinite"}} />
              <span style={{fontSize:11,color:t.txt2,fontWeight:500}}><strong style={{color:t.verde}}>{DADOS.length}</strong> registros · <span style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.2)`,borderRadius:4,padding:"1px 6px",fontSize:9,color:t.azulLt,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}>{connStatus==="online"?<><Icon n="dot" s={8} c={t.verde}/> ONLINE</>:<><Icon n="dot" s={8} c={t.txt2}/> LOCAL</>}</span></span>
            </div>

            {/* Result card */}
            {buscaResult && (
              <div className="co-card" style={{...css.card,animation:"slideUp .3s ease"}}>
                <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,background:t.headerBg}}>
                  <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 14px rgba(240,185,11,.3)`}}>
                    {hIco(<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,t.headerBg,18,2)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.txt,lineHeight:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{buscaResult.nome||"—"}</div>
                    <div style={{fontSize:9,color:t.txt2,fontWeight:600,letterSpacing:1.5,marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:DESIGN.r.badge,padding:"3px 10px",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:t.ouro,fontFamily:"'Bebas Neue',sans-serif"}}>DT {buscaResult.dt}</span>
                      {buscaResult.placa&&<span style={{background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:DESIGN.r.badge,padding:"3px 10px",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:t.verde,fontFamily:"'Bebas Neue',sans-serif"}}>{buscaResult.placa}</span>}
                      {buscaResult.data_desc?<span style={{...css.badge(t.verde,`rgba(2,192,118,.1)`,`rgba(2,192,118,.3)`)}}> DESCARREGADO</span>:buscaResult.data_agenda?<span style={{...css.badge(t.ouro,`rgba(240,185,11,.08)`,`rgba(240,185,11,.3)`)}}>AGUARDANDO</span>:<span style={{...css.badge(t.danger,`rgba(246,70,93,.08)`,`rgba(246,70,93,.3)`)}}>SEM AGENDA</span>}
                    </div>
                  </div>
                </div>
                <div style={{padding:14,display:"grid",gap:8}}>
                  {[
                    {ico:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,lbl:"CPF",val:buscaResult.cpf},
                    {ico:<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,lbl:"Placa",val:buscaResult.placa,highlight:true,cor:t.verde},
                    {ico:<><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></>,lbl:"Rota",val:`${buscaResult.origem||"—"} → ${buscaResult.destino||"—"}`},
                    {ico:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,lbl:"Status",val:buscaResult.status},
                  ].map((item,i)=>(
                    <div key={i} style={{...css.card,padding:"9px 11px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flexShrink:0}}>{hIco(item.ico,item.cor||t.txt2,16,1.8)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:700,marginBottom:2}}>{item.lbl}</div>
                        <div style={{fontWeight:600,color:item.cor||t.txt,fontFamily:item.highlight?"'Bebas Neue',sans-serif":"inherit",letterSpacing:item.highlight?3:0,fontSize:item.highlight?17:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.val||"—"}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{...css.kpi(t.ouro),padding:"12px 10px"}}>
                      {hIco(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,t.ouro,14,2)}
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.ouro,marginTop:4}}>{buscaResult.data_carr||"—"}</div>
                      <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Carregamento</div>
                    </div>
                    <div style={{...css.kpi(t.verde),padding:"12px 10px"}}>
                      {hIco(<><polyline points="20 6 9 17 4 12"/></>,t.verde,14,2)}
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:t.verde,marginTop:4}}>{buscaResult.data_agenda||"—"}</div>
                      <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.5,color:t.txt2,fontWeight:600,marginTop:4}}>Agenda Desc.</div>
                    </div>
                  </div>
                  {canFin && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[
                        {lbl:"Empresa",val:fmtMoeda(buscaResult.vl_cte),cor:t.verde},
                        {lbl:"Motorista",val:fmtMoeda(buscaResult.vl_contrato),cor:t.azulLt},
                        {lbl:"Adiantam.",val:fmtMoeda(buscaResult.adiant),cor:t.ouro},
                      ].map((f,i)=>(
                        <div key={i} style={{...css.kpi(f.cor),padding:"10px 8px"}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,color:f.cor,lineHeight:1}}>{f.val}</div>
                          <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginTop:4}}>{f.lbl}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* ── Banner: Motorista não cadastrado ── */}
                  {(() => {
                    const cpfN = buscaResult.cpf?.replace(/\D/g,"");
                    const placaN = buscaResult.placa?.toUpperCase().replace(/\W/g,"");
                    const motCadastrado = motoristas.find(m =>
                      (cpfN && m.cpf?.replace(/\D/g,"") === cpfN) ||
                      [m.placa1,m.placa2,m.placa3,m.placa4].some(p => p && p.toUpperCase().replace(/\W/g,"") === placaN)
                    );
                    if (motCadastrado) return null;
                    return (
                      <div style={{background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                        <div style={{flexShrink:0}}>{hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,t.ouro,18,2)}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:t.ouro}}>Motorista não cadastrado</div>
                          <div style={{fontSize:10,color:t.txt2,marginTop:2}}>Este motorista não está no cadastro. Deseja cadastrar?</div>
                        </div>
                        {canEdit && (
                          <button onClick={()=>{
                            setFormData({
                              nome: buscaResult.nome || "",
                              cpf: buscaResult.cpf || "",
                              placa1: buscaResult.placa || "",
                              vinculo: buscaResult.vinculo || "",
                            });
                            setEditIdx(-1);
                            setModalOpen("motorista");
                          }} style={{background:`rgba(240,185,11,.12)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:8,padding:"7px 11px",color:t.ouro,fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",flexShrink:0}}>
                            ＋ Cadastrar
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {canEdit && (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button onClick={()=>{
                        const idx = DADOS.findIndex(r=>r.dt===buscaResult.dt);
                        setEditIdx(idx);setFormData({...buscaResult});setEditStep(1);setModalOpen("edit");
                      }} style={{...css.btnGold,justifyContent:"center",padding:11,width:"100%"}}>
                        {hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,t.bg,16,2)} EDITAR
                      </button>

                      {/* WhatsApp - 4 modelos (css.btnCard — alteração aqui propaga para todos os tiles WPP) */}
                      <div style={{background:t.card2,borderRadius:12,padding:12,border:`1px solid rgba(37,211,102,.25)`}}>
                        <div style={{...css.secTitle,color:"#25D366",marginBottom:10}}>
                          {hIco(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.05-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,`#25D366`,13,2)}
                          WHATSAPP · Escolha o modelo
                          <span style={{flex:1,height:1,background:"rgba(37,211,102,.2)",marginLeft:4}}/>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {[
                            {l:"Faturamento", sub:"CTE · MDF · MAT",   cor:"#25D366",
                             ico:<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="16" y1="8" x2="8" y2="8"/><line x1="16" y1="12" x2="8" y2="12"/></>,
                             fn:(mot)=>setWppFatModal({reg:buscaResult,mot})},
                            {l:"Contratação", sub:"Pgto completo",     cor:"#25D366",
                             ico:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
                             fn:(mot)=>{setWppModal({reg:buscaResult,mot});setWppTel((mot?.tel||buscaResult.tel||""));setWppPgto("cheque");setWppValCheque("");setWppValConta("");setWppObs("");}},
                            {l:"Descarga",    sub:"Stretch",           cor:t.azulLt,
                             ico:<><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
                             fn:(mot)=>abrirWppPagModal(buscaResult,mot,"descarga")},
                            {l:"Diárias",    sub:"Pgto diária",        cor:t.danger,
                             ico:<><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></>,
                             fn:(mot)=>abrirWppPagModal(buscaResult,mot,"diarias")},
                          ].map((op,i)=>(
                            <button key={i} onClick={()=>{
                              const mot=motoristas.find(m=>(buscaResult.cpf&&m.cpf?.replace(/\D/g,"")===buscaResult.cpf?.replace(/\D/g,""))||(buscaResult.nome&&m.nome===buscaResult.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa));
                              op.fn(mot||null);
                            }} style={{...css.btnCard(op.cor)}}>
                              {hIco(op.ico, op.cor, 22, 2)}
                              <span>{op.l}</span>
                              <span style={{fontSize:9,opacity:.65,fontWeight:400,marginTop:-2}}>{op.sub}</span>
                            </button>
                          ))}
                        </div>
                        {/* DOC (com RO) */}
                        <button onClick={()=>{
                          const mot=motoristas.find(m=>(buscaResult.cpf&&m.cpf?.replace(/\D/g,"")===buscaResult.cpf?.replace(/\D/g,""))||(buscaResult.nome&&m.nome===buscaResult.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===buscaResult.placa));
                          setWppModal2({reg:buscaResult,mot:mot||null});setWpp2Ro(buscaResult.ro||"");setWpp2IncluirObs(false);
                        }} style={{...css.btnCard(t.txt2),width:"100%",marginTop:8,flexDirection:"row",justifyContent:"center",gap:8}}>
                          {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.txt2,16,2)} DOC (com RO)
                        </button>
                      </div>
                    </div>
                  )}
                  {/* ── Botão Ocorrências (visível para todos) ── */}
                  <button
                    onClick={()=>abrirOcorrModal(buscaResult.dt, buscaResult)}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(232,130,12,.2)";e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 12px rgba(232,130,12,.3)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(232,130,12,.08)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
                    style={{width:"100%",borderRadius:11,padding:"12px 8px",cursor:"pointer",background:"rgba(232,130,12,.08)",border:"1px solid rgba(232,130,12,.35)",color:"#E8820C",fontWeight:700,fontSize:12,fontFamily:"inherit",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .15s"}}>
                    {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,`#E8820C`,16,2)} Ocorrências
                  </button>
                </div>
              </div>
            )}

            {/* ── Outros registros (mesmo CPF / mesma Placa) ── */}
            {buscaResult && buscaRelacionados.length > 0 && (
              <div style={{marginTop:12,animation:"slideUp .3s"}}>
                <div style={{...css.secTitle,marginBottom:8}}>
                  {buscaTipo==="cpf"?<>{hIco(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,t.ouro,11,2)}&nbsp;Outros DTs com este CPF</>:buscaTipo==="placa"?<>{hIco(<><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,t.ouro,11,2)}&nbsp;Outros DTs com esta Placa</>:<>{hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.ouro,11,2)}&nbsp;Outros registros (mesmo CPF / Placa)</>}
                  <span style={{flex:1,height:1,background:t.borda}} />
                  <span style={{fontSize:10,color:t.txt2,fontWeight:600}}>{buscaRelacionados.length} registro{buscaRelacionados.length>1?"s":""}</span>
                </div>
                {buscaRelacionados.slice(0,10).map((r,i) => {
                  const statusC = r.data_desc ? t.verde : r.data_agenda ? t.ouro : t.txt2;
                  const statusL = r.data_desc ? "Descarregado" : r.data_agenda ? "Aguardando" : "—";
                  return (
                    <div key={i} {...clickable(()=>{
                      setBuscaInput(r.dt);
                      setBuscaTipo("dt");
                      setTimeout(()=>{
                        setBuscaResult(r);
                        // recalcular relacionados
                        const cpfN = r.cpf?.replace(/\D/g,"");
                        const placaN = r.placa?.toUpperCase().replace(/\W/g,"");
                        const rel = DADOS.filter(x =>
                          x.dt !== r.dt && (
                            (cpfN && x.cpf?.replace(/\D/g,"") === cpfN) ||
                            (placaN && x.placa?.toUpperCase().replace(/\W/g,"") === placaN)
                          )
                        ).sort((a,b) => { const da=parseData(a.data_carr),db=parseData(b.data_carr); return da&&db?db-da:0; });
                        setBuscaRelacionados(rel);
                      }, 0);
                    })} style={{background:t.card,borderRadius:10,padding:"10px 12px",marginBottom:6,border:`1px solid ${t.borda}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"border-color .2s"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:2,color:t.ouro}}>{r.dt}</span>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:t.verde}}>{r.placa||""}</span>
                        </div>
                        <div style={{fontSize:10,color:t.txt2,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                          <span style={{display:"flex",alignItems:"center",gap:3}}>{hIco(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,t.txt2,10,2)} {r.data_carr||"—"}</span>
                          <span style={{display:"flex",alignItems:"center",gap:3}}>{hIco(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,t.txt2,10,2)} {r.data_agenda||"—"}</span>
                          <span style={{color:statusC,fontWeight:600}}>{statusL}</span>
                        </div>
                      </div>
                      <span style={{color:t.txt2,fontSize:14,flexShrink:0}}>›</span>
                    </div>
                  );
                })}
                {buscaRelacionados.length > 10 && (
                  <div style={{fontSize:10,color:t.txt2,textAlign:"center",padding:"6px 0"}}>… e mais {buscaRelacionados.length-10} registro(s)</div>
                )}
              </div>
            )}

            {/* Error */}
            {buscaError && !buscaError.startsWith("__cpf_sem_dt__") && (
              <div style={{...css.card,padding:"24px 16px",textAlign:"center",borderTop:`3px solid ${t.danger}`,animation:"slideUp .3s"}}>
                <div style={{marginBottom:10,display:"flex",justifyContent:"center"}}>{hIco(<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,t.danger,32,2)}</div>
                <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.danger,marginBottom:5}}>NÃO ENCONTRADO</h3>
                <p style={{color:t.txt2,fontSize:11,marginBottom:4}}>Nenhum registro encontrado para <strong style={{color:t.txt}}>"{buscaError}"</strong></p>
                <p style={{color:t.txt2,fontSize:10,marginBottom:14}}>
                  {buscaTipo==="cpf"?"Nenhum motorista com este CPF nos registros.":buscaTipo==="placa"?"Nenhuma placa com este número nos registros.":"DT não localizada no sistema."}
                </p>
                {canEdit && (
                  <button onClick={()=>{
                    const fd = buscaTipo==="dt" ? {dt:buscaError}
                             : buscaTipo==="cpf" ? {cpf:buscaError}
                             : {placa:buscaError};
                    setFormData(fd); setEditIdx(-1); setEditStep(1); setModalOpen("edit");
                  }} style={{...css.btnGold,marginTop:4,background:`linear-gradient(135deg,${t.azul},${t.azulLt})`,color:"#fff",justifyContent:"center",width:"100%",fontSize:14}}>
                    ＋ CADASTRAR NOVO REGISTRO
                  </button>
                )}
              </div>
            )}

            {/* History */}
            {historico.length > 0 && !buscaResult && !buscaError && (
              <div style={{marginTop:16}}>
                <div style={css.secTitle}>Histórico Recente <span style={{flex:1,height:1,background:t.borda}} /></div>
                {historico.map((h,i) => (
                  <div key={i} {...clickable(()=>{
                    const dt=h.dt; setBuscaInput(dt); setBuscaTipo("dt");
                    setBuscaResult(null); setBuscaError(null); setBuscaRelacionados([]);
                    const c=dt.replace(/\D/g,"");
                    const found=DADOS.find(x=>x.dt?.replace(/\D/g,"")===c||dtBase(x.dt)?.replace(/\D/g,"")===c);
                    if(found){setBuscaResult(found);const cpfN=found.cpf?.replace(/\D/g,""),placaN=found.placa?.toUpperCase().replace(/\W/g,"");const rels=DADOS.filter(x=>x.dt!==found.dt&&((cpfN&&x.cpf?.replace(/\D/g,"")===cpfN)||(placaN&&x.placa?.toUpperCase().replace(/\W/g,"")===placaN))).sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return da&&db?db-da:0;});setBuscaRelacionados(rels);}else{setBuscaError(dt);}
                  })} style={{background:t.card,borderRadius:10,padding:"13px 12px",display:"flex",alignItems:"center",gap:10,border:`1px solid ${t.borda}`,cursor:"pointer",marginBottom:7}}>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,color:t.ouro,minWidth:80}}>{h.dt}</span>
                    <span style={{fontSize:11,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t.txt}}>{h.nome}</span>
                    <span style={{marginLeft:"auto",color:t.borda,fontSize:12}}>›</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
