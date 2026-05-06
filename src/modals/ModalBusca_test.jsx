import React, { useEffect } from "react";

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
    canEdit,
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
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",zIndex:5000,
              display:"flex",alignItems:"flex-start",justifyContent:"center",
              padding:"48px 16px 16px",overflowY:"auto"}}
      onClick={e=>{if(e.target===e.currentTarget)setBuscaModalOpen(false);}}
    >
      <div style={{background:t.card,borderRadius:20,width:"100%",maxWidth:640,
                   border:`1px solid ${t.borda}`,boxShadow:"0 32px 64px rgba(0,0,0,.5)",
                   animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}}>
        {/* Header */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${t.borda}`,display:"flex",
                     alignItems:"center",gap:10,position:"sticky",top:48,background:t.card,
                     zIndex:1,borderRadius:"20px 20px 0 0"}}>
          {hIco(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>,t.ouro,16,2)}
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:t.txt}}>Buscar Registro</span>
          <kbd style={{marginLeft:"auto",fontSize:9,padding:"2px 6px",borderRadius:4,
                       border:`1px solid ${t.borda}`,color:t.txt2,fontFamily:"'DM Mono',monospace",
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
        <div style={{padding:"16px 20px 20px",maxHeight:"calc(100vh - 180px)",overflowY:"auto"}}>
            <div style={{...css.secTitle,marginBottom:12}}>
              {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.ouro,13,2)} Buscar Registro
              <span style={{flex:1,height:1,background:t.borda,marginLeft:4}}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:10,justifyContent:"center"}}>
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
              <button onClick={buscar} style={{...css.btnGold,padding:"0 20px",fontSize:20}}>🔍</button>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14,padding:"8px 12px",background:t.card,borderRadius:9,borderLeft:`3px solid ${t.verde}`}}>
              <span style={{width:6,height:6,background:t.verde,borderRadius:"50%",animation:"pulse 2s infinite"}} />
              <span style={{fontSize:11,color:t.txt2,fontWeight:500}}><strong style={{color:t.verde}}>{DADOS.length}</strong> registros · <span style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.2)`,borderRadius:4,padding:"1px 6px",fontSize:9,color:t.azulLt,fontWeight:700}}>{connStatus==="online"?"🟢 ONLINE":"⚫ LOCAL"}</span></span>
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
