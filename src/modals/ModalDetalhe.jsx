import React from "react";
import OcorrModal from "../components/OcorrModal.jsx";
import Icon from "../components/Icon.jsx";

export default function ModalDetalhe({ ctx }) {
  const {
    detalheDT, setModalOpen,
    DADOS,
    t, css, DESIGN,
    hIco,
    fmtMoeda,
    showToast,
    setFormData, setEditIdx,
    ocorrencias,
    acompImagens, setAcompImagens,
    acompTexto, setAcompTexto,
    excluirConfirm, setExcluirConfirm,
    excluirTexto, setExcluirTexto,
    ocorrListExpanded, setOcorrListExpanded,
    acompDiaSel, setAcompDiaSel,
    activeTab, setActiveTab,
    detalheCteComp, setDetalheCteComp,
    detalheMinDcc, setDetalheMinDcc,
    detalheMinDsc, setDetalheMinDsc,
    detalheSecCteComp, setDetalheSecCteComp,
    detalheSecDcc, setDetalheSecDcc,
    detalheSecMinDsc, setDetalheSecMinDsc,
    detalheTemDcc, setDetalheTemDcc,
    salvandoMins, setSalvandoMins,
    isAdmin,
    theme,
    perms,
    setEditStep,
    diariasData,
    deletarRegistro,
    salvarMinutasDetalhe,
    acompDias, setAcompDias,
    usuarioLogado,
    getConexao, supaFetch,
    ocorrLoading,
    adicionarOcorrencia,
    abrirOcorrModal,
  } = ctx;

  if (!detalheDT) return null;

  const [ocorrModalLocalOpen, setOcorrModalLocalOpen] = React.useState(false);
  const [dadosExpanded, setDadosExpanded] = React.useState(false);

  // ── Variáveis locais computadas a partir do contexto ──
  const r = detalheDT;
  const canEditDetalhe = isAdmin || perms.editar;
  const canOcorr = isAdmin || perms.ocorrencias;
  const steps = [
    {ico:"package",lbl:"Carregamento",val:r.data_carr,  c:t.ouro,  done:!!r.data_carr},
    {ico:"map-pin",lbl:"Em Trânsito",  val:r.origem&&r.destino?`${r.origem}→${r.destino}`:r.origem||r.destino||null, c:t.azulLt,done:!!r.data_carr},
    {ico:"calendar",lbl:"Agenda Desc.", val:r.data_agenda,c:t.warn,  done:!!r.data_agenda},
    {ico:"flag",lbl:"Descarga",     val:r.data_desc,  c:t.verde, done:!!r.data_desc},
  ];
  const tipoColors = {info:"var(--cat-blue)", alerta:t.danger, status:t.verde, falta:"var(--cat-red)", avaria:"var(--cat-orange)", dev_total:"var(--cat-purple)", dev_parcial:"var(--cat-pink)", desacordo:"var(--cat-gold)", rod:"var(--cat-coral)", sobra:"var(--cat-mint)"};
  const tipoIcos   = {info:"message", alerta:"alert-octagon", status:"check-circle"};
  const ocorrSinteticas = [
    ...(r.obs_chegada  ? [{tipo:"info",   texto:r.obs_chegada,  _origem:"chegada",  usuario:"—", data_hora:r.data_obs_chegada||r.chegada||""}]  : []),
    ...(r.obs_descarga ? [{tipo:"status", texto:r.obs_descarga, _origem:"descarga", usuario:"—", data_hora:r.data_obs_descarga||r.data_desc||""}] : []),
  ];
  const ocorrAll = [...ocorrSinteticas, ...ocorrencias];
  return (

          <div className="co-dt-overlay" onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
            <div className="co-dt-modal">
              {/* Header */}
              <div style={{flexShrink:0,background:theme==="dark"?"linear-gradient(135deg,#161a1e,#1e2026)":`linear-gradient(135deg,#f8f9fa,#fff)`}}>
                <div style={{padding:"10px 14px 8px",display:"flex",alignItems:"center",gap:9,borderBottom:excluirConfirm==="detalhe"?`1px solid rgba(220,38,38,.25)`:`1px solid ${t.borda}`}}>
                  <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="truck" s={18} c="#fff"/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,color:t.txt,lineHeight:1}}>{r.nome||"—"}</div>
                    <div style={{fontSize:9,color:t.txt2,letterSpacing:.5}}>DT {r.dt} · {r.placa||"—"} · {r.cpf||"—"}{r.data_criacao&&<span style={{opacity:.6}}> · {new Date(r.data_criacao).toLocaleDateString("pt-BR")}</span>}</div>
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    {canEditDetalhe && (
                      <button onClick={()=>{
                        const idx=DADOS.findIndex(x=>x.dt===r.dt);
                        setEditIdx(idx);setFormData({...r});setEditStep(1);setModalOpen("edit");
                      }} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:7,padding:"7px 12px",color:t.ouro,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>{hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,t.ouro,13)} Editar</button>
                    )}
                    {canEditDetalhe && excluirConfirm!=="detalhe" && (
                      <button onClick={()=>{setExcluirConfirm("detalhe");setExcluirTexto("");}} style={{background:"rgba(220,38,38,.08)",border:`1px solid rgba(220,38,38,.3)`,borderRadius:7,padding:"7px 10px",color:"var(--red)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>, "var(--red)", 14)}</button>
                    )}
                    <button onClick={()=>{setModalOpen(null);setExcluirConfirm(null);setExcluirTexto("");}} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:34,height:34,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
                  </div>
                </div>
                {excluirConfirm==="detalhe" && (
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"rgba(220,38,38,.06)",borderBottom:`1px solid rgba(220,38,38,.2)`}}>
                    <span style={{fontSize:11,color:"var(--red)",fontWeight:600,whiteSpace:"nowrap"}}>Digite EXCLUIR para confirmar:</span>
                    <input
                      autoFocus
                      value={excluirTexto}
                      onChange={e=>setExcluirTexto(e.target.value.toUpperCase())}
                      onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setExcluirConfirm(null);setExcluirTexto("");}}}
                      placeholder="EXCLUIR"
                      style={{flex:1,background:"rgba(220,38,38,.08)",border:`1.5px solid ${excluirTexto==="EXCLUIR"?"var(--red)":"rgba(220,38,38,.3)"}`,borderRadius:7,padding:"7px 10px",color:"var(--red)",fontSize:12,fontFamily:"inherit",fontWeight:700,letterSpacing:1,outline:"none"}}
                    />
                    <button
                      onClick={()=>{ if(excluirTexto==="EXCLUIR") deletarRegistro(r.dt); }}
                      disabled={excluirTexto!=="EXCLUIR"}
                      style={{background:excluirTexto==="EXCLUIR"?"var(--red)":"rgba(220,38,38,.2)",border:"none",borderRadius:7,padding:"7px 14px",color:"#fff",fontSize:11,fontWeight:700,cursor:excluirTexto==="EXCLUIR"?"pointer":"not-allowed",fontFamily:"inherit",opacity:excluirTexto==="EXCLUIR"?1:.6}}
                    >CONFIRMAR</button>
                    <button onClick={()=>{setExcluirConfirm(null);setExcluirTexto("");}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:7,padding:"7px 10px",color:t.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center"}}><Icon n="x" s={14} c={t.txt2} sw={2}/></button>
                  </div>
                )}
              </div>

              <div className="co-dt-body" style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
              {/* ── PAINEL ESQUERDO: Timeline + Dados + Minutas ── */}
              <div className="co-dt-panel">

                {/* ── Timeline ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:10}}>{hIco(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,t.ouro,12)} Timeline <span style={{flex:1,height:1,background:t.borda}} /></div>
                  <div style={{display:"flex",alignItems:"flex-start",gap:0,position:"relative",padding:"0 8px"}}>
                    {steps.map((s,si) => (
                      <div key={si} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
                        {/* Linha conectora */}
                        {si < steps.length-1 && (
                          <div style={{position:"absolute",top:14,left:"50%",width:"100%",height:2,background:steps[si+1].done?s.c:`${t.borda}`,zIndex:0,transition:"background .3s"}} />
                        )}
                        {/* Círculo */}
                        <div style={{width:28,height:28,borderRadius:"50%",background:s.done?s.c:t.card2,border:`2px solid ${s.done?s.c:t.borda}`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,flexShrink:0,transition:"all .3s"}}>{s.done?<Icon n="check" s={14} c="#fff" sw={2.4}/>:<Icon n={s.ico} s={13} c={t.txt2}/>}</div>
                        <div style={{fontSize:8,color:s.done?s.c:t.txt2,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginTop:4,textAlign:"center",lineHeight:1.3}}>{s.lbl}</div>
                        {s.val && <div style={{fontSize:8,color:t.txt2,marginTop:2,textAlign:"center",maxWidth:60,wordBreak:"break-word"}}>{s.val}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Dados completos ── */}
                {(()=>{
                  const dadosTodos = [
                    {l:"Motorista",v:r.nome},{l:"CPF",v:r.cpf},{l:"Placa",v:r.placa},{l:"Vínculo",v:r.vinculo},
                    {l:"Origem",v:r.origem},{l:"Destino",v:r.destino},{l:"Status",v:r.status},{l:"Dias",v:r.dias},
                    {l:"Carregamento",v:r.data_carr},{l:"Agenda",v:r.data_agenda},{l:"Descarga",v:r.data_desc},{l:"Chegada",v:r.chegada},
                    ...(isAdmin||perms.financeiro?[{l:"VL CTE",v:fmtMoeda(r.vl_cte)},{l:"VL Contrato",v:fmtMoeda(r.vl_contrato)},{l:"Adiant.",v:fmtMoeda(r.adiant)},{l:"Saldo",v:fmtMoeda(r.saldo)}]:[]),
                    {l:"CTE",v:r.cte},{l:"MDF",v:r.mdf},{l:"NF",v:r.nf},{l:"MAT",v:r.mat},
                    {l:"RO",v:r.ro},{l:"Status RO",v:r.ro_status},{l:"SGS",v:r.sgs},{l:"Gerenciadora",v:r.gerenc},{l:"Cliente",v:r.cliente},
                    {l:"ID (Shipmente)",v:r.id_doc},
                  ].filter(f=>f.v);
                  const VISIBLE = 16;
                  const shown = dadosExpanded ? dadosTodos : dadosTodos.slice(0, VISIBLE);
                  const hidden = dadosTodos.length - VISIBLE;
                  return (
                    <div>
                      <div style={{...css.secTitle,marginBottom:8}}>{hIco(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/></>,t.ouro,12)} Dados do Registro <span style={{flex:1,height:1,background:t.borda}} /></div>
                      <div className="co-dados-grid">
                        {shown.map((f,fi)=>(
                          <div key={fi} style={{background:t.bg,borderRadius:6,padding:"4px 8px",border:`1px solid ${t.borda}`}}>
                            <div style={{fontSize:7.5,textTransform:"uppercase",letterSpacing:.8,color:t.txt2,fontWeight:600}}>{f.l}</div>
                            <div style={{fontSize:11,fontWeight:600,color:t.txt,marginTop:1,wordBreak:"break-word"}}>{f.v}</div>
                          </div>
                        ))}
                      </div>
                      {dadosTodos.length > VISIBLE && (
                        <button onClick={()=>setDadosExpanded(v=>!v)} style={{width:"100%",marginTop:6,padding:"5px 0",borderRadius:7,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:.5}}>
                          {dadosExpanded ? "▲ Recolher" : `▼ Ver mais (${hidden} campo${hidden>1?"s":""})`}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Acompanhamento Dia a Dia */}
                {(()=>{
                  const dcArr = acompDias;
                  const toISO = s => { if(!s)return null; const p=s.split("/"); return p.length===3?p[2]+"-"+p[1]+"-"+p[0]:s; };
                  const dIni = toISO(detalheDT.data_carr); const dFimS = toISO(detalheDT.data_desc);
                  const dFim = dFimS ? new Date(dFimS+"T12:00:00") : new Date();
                  const dias = []; if(dIni){let c=new Date(dIni+"T12:00:00");while(c<=dFim&&dias.length<60){dias.push(c.toISOString().slice(0,10));c.setDate(c.getDate()+1);}}
                  const getE = d => dcArr.find(x=>x.data===d)||null;
                  const salvarDia = (data,texto,imgs) => {
                    const e={data,texto,imagens:imgs||[],usuario:usuarioLogado||"sistema",at:new Date().toISOString()};
                    const nv=(texto.trim()||imgs.length)?[...dcArr.filter(x=>x.data!==data),e].sort((a,b)=>a.data.localeCompare(b.data)):dcArr.filter(x=>x.data!==data);
                    setAcompDias(nv); localStorage.setItem("co_acomp_"+detalheDT.dt,JSON.stringify(nv));
                    const conn2=getConexao(); if(conn2&&(texto.trim()||imgs.length)){supaFetch(conn2.url,conn2.key,"POST","co_acompanhamento_dt",[{dt:detalheDT.dt,data,texto,imagens:JSON.stringify(imgs||[]),usuario:e.usuario,atualizado_em:e.at}]).catch(()=>{});}
                  };
                  return (
                    <div>
                      <div style={{...css.secTitle,marginBottom:10}}>
                        {hIco(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,t.ouro,12)} Acompanhamento Dia a Dia
                        {dias.length>0&&<span style={{fontSize:9,color:t.txt2,fontWeight:400,marginLeft:4}}>{dias.length} dias</span>}
                        <span style={{flex:1,height:1,background:t.borda}} />
                      </div>
                      {dias.length===0?(
                        <div style={{fontSize:11,color:t.txt2,textAlign:"center",padding:"8px 0"}}>Informe data de carregamento para ver o acompanhamento.</div>
                      ):(
                        <div>
                          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,marginBottom:8,scrollbarWidth:"none"}}>
                            {dias.map(d=>{
                              const ent=getE(d);const isHoje=d===new Date().toISOString().slice(0,10);const isSel=acompDiaSel===d;
                              return(<button key={d} onClick={()=>{setAcompDiaSel(isSel?null:d);setAcompTexto(ent?ent.texto:"");setAcompImagens(ent?ent.imagens:[]);}} style={{flexShrink:0,padding:"5px 7px",borderRadius:8,border:"1.5px solid "+(isSel?t.azul:ent?t.verde:t.borda),background:isSel?"rgba(22,119,255,.1)":ent?"rgba(2,192,118,.06)":"transparent",cursor:"pointer",minWidth:46,textAlign:"center"}}>
                                <div style={{fontSize:8,color:isSel?t.azulLt:ent?t.verde:t.txt2,fontWeight:700}}>{new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</div>
                                {isHoje&&<div style={{fontSize:11,color:t.ouro,fontWeight:700}}>HOJE</div>}
                                {ent&&<div style={{display:"flex",justifyContent:"center",marginTop:1}}><Icon n="check" s={11} c={t.verde} sw={2.4}/></div>}
                              </button>);
                            })}
                          </div>
                          {acompDiaSel&&(
                            <div style={{background:t.card2,borderRadius:10,padding:12,border:"1px solid "+t.borda,marginBottom:6}}>
                              <div style={{fontSize:10,fontWeight:700,color:t.azulLt,marginBottom:8,display:"flex",alignItems:"center",gap:5}}><Icon n="calendar" s={12} c={t.azulLt}/> {new Date(acompDiaSel+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</div>
                              <textarea value={acompTexto} onChange={e=>setAcompTexto(e.target.value)} placeholder="Status, localização, ocorrências deste dia..." rows={3} style={{...css.inp,resize:"vertical",fontSize:12,lineHeight:1.5,marginBottom:8}} />
                              <label style={{fontSize:9,color:t.txt2,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Anexar Fotos</label>
                              <input type="file" accept="image/*" multiple onChange={e=>{Array.from(e.target.files||[]).forEach(f=>{const rd=new FileReader();rd.onload=ev=>setAcompImagens(p=>[...p,{nome:f.name,base64:ev.target.result}]);rd.readAsDataURL(f);});e.target.value="";}} style={{...css.inp,padding:"7px 10px",fontSize:11,marginBottom:8}} />
                              {acompImagens.length>0&&(
                                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                                  {acompImagens.map((img,ii)=>(
                                    <div key={ii} style={{position:"relative"}}>
                                      <img src={img.base64} alt={img.nome} style={{width:60,height:60,objectFit:"cover",borderRadius:8,border:"1px solid "+t.borda}} />
                                      <button onClick={()=>setAcompImagens(p=>p.filter((_,j)=>j!==ii))} style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:t.danger,border:"none",color:"#fff",fontSize:9,cursor:"pointer",lineHeight:"1"}}>{"x"}</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <button onClick={()=>{salvarDia(acompDiaSel,acompTexto,acompImagens);showToast("{"+"\u2705"+"} Dia salvo!","ok");}} style={{...css.btnGreen,width:"100%",justifyContent:"center",fontSize:12,gap:6}}><Icon n="save" s={14} c="currentColor"/> Salvar Dia</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Histórico de Ocorrências ── */}
                <div>
                  <div style={{...css.secTitle,marginBottom:8}}>
                    {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.ouro,12)} Histórico de Ocorrências
                    {ocorrLoading && <span style={{fontSize:9,color:t.txt2,fontWeight:400}}> carregando…</span>}
                    <span style={{flex:1,height:1,background:t.borda}} />
                  </div>

                  {/* Lista de ocorrências */}
                  {ocorrAll.length === 0 ? (
                    <div style={{fontSize:11,color:t.txt2,textAlign:"center",padding:"12px 0"}}>Nenhuma ocorrência registrada.</div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {(ocorrListExpanded ? ocorrAll : ocorrAll.slice(0,3)).map((o,oi,arr)=>(
                        <div key={oi} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                            <div style={{width:24,height:24,borderRadius:"50%",background:`${tipoColors[o.tipo]||t.azulLt}18`,border:`1.5px solid ${tipoColors[o.tipo]||t.azulLt}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n={tipoIcos[o.tipo]||"message"} s={12} c={tipoColors[o.tipo]||t.azulLt}/></div>
                            {oi < arr.length-1 && <div style={{width:1,flex:1,minHeight:12,background:t.borda,margin:"3px 0"}} />}
                          </div>
                          <div style={{flex:1,background:t.card2,borderRadius:8,padding:"8px 10px",border:`1px solid ${t.borda}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:3}}>
                              <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:tipoColors[o.tipo]||t.azulLt}}>{o.tipo||"info"}</span>
                              <span style={{fontSize:8,color:t.txt2,whiteSpace:"nowrap"}}>{o.usuario||"—"}{o.data_hora?" · "+new Date(o.data_hora).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):""}</span>
                            </div>
                            <div style={{fontSize:12,color:t.txt,lineHeight:1.5}}>{o.texto}</div>
                            {o._origem && <div style={{fontSize:9,color:t.txt2,marginTop:4,fontStyle:"italic",opacity:.8}}>obs de {o._origem==="chegada"?"chegada":"descarga"}</div>}
                          </div>
                        </div>
                      ))}
                      {ocorrAll.length > 3 && (
                        <button onClick={()=>setOcorrListExpanded(v=>!v)} style={{fontSize:11,color:"#E8820C",background:"transparent",border:"none",cursor:"pointer",padding:"4px 0",textAlign:"center",fontFamily:"inherit",fontWeight:700}}>
                          {ocorrListExpanded ? "▲ Ver menos" : `▼ Ver mais (${ocorrAll.length - 3} ocultas)`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Adicionar nova ocorrência */}
                  {canOcorr && (
                    <>
                      <button
                        onClick={()=>setOcorrModalLocalOpen(true)}
                        style={{width:"100%",padding:"9px 14px",borderRadius:9,border:`1.5px dashed ${t.borda}`,background:"transparent",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit",marginTop:8}}
                      >
                        + Nova Ocorrência
                      </button>
                      <OcorrModal
                        open={ocorrModalLocalOpen}
                        onClose={()=>setOcorrModalLocalOpen(false)}
                        onSave={({tipo,texto,nfs,localizacao})=>{
                          adicionarOcorrencia({dt:r?.dt, tipo, texto, nfs, localizacao});
                          setOcorrModalLocalOpen(false);
                        }}
                        dtRecord={r}
                        t={t} hIco={hIco} css={css}
                      />
                    </>
                  )}
                </div>
              </div>{/* fim co-dt-panel (esquerdo) */}

              {/* ── PAINEL DIREITO: Acompanhamento + Ocorrências ── */}
              <div className="co-dt-right">

                {/* ── Documentos / Minutas ── */}
                {(()=>{
                  const isDiariaReg = diariasData.items.some(it=>it.r.dt===r.dt&&(it.tipo==="diaria"||it.tipo==="atraso"));
                  const isDescargaReg = !!(r.data_agenda||r.data_desc);
                  const lblP2 = {fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:t.txt2,marginBottom:3};
                  const inpP2 = {...css.inp,fontSize:12,padding:"7px 9px",height:"auto"};
                  return (
                    <div>
                      <div style={{...css.secTitle,marginBottom:10}}>
                        {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.azulLt,12)} Documentos / Minutas
                        {isDiariaReg&&<span style={{fontSize:9,background:"rgba(240,185,11,.15)",border:"1px solid rgba(240,185,11,.3)",borderRadius:4,padding:"1px 6px",color:t.ouro,fontWeight:700,marginLeft:4,display:"inline-flex",alignItems:"center",gap:3}}><Icon n="bed" s={10} c={t.ouro}/> DIÁRIA</span>}
                        {isDescargaReg&&<span style={{fontSize:9,background:"rgba(22,119,255,.12)",border:"1px solid rgba(22,119,255,.25)",borderRadius:4,padding:"1px 6px",color:t.azulLt,fontWeight:700,marginLeft:4,display:"inline-flex",alignItems:"center",gap:3}}><Icon n="package" s={10} c={t.azulLt}/> DESCARGA</span>}
                        <span style={{flex:1,height:1,background:t.borda}} />
                      </div>

                      {/* ─ Pergunta DCC ─ */}
                      <div style={{background:`rgba(240,185,11,.05)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:9,padding:"9px 12px",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,fontWeight:700,color:t.ouro,display:"inline-flex",alignItems:"center",gap:5}}><Icon n="dot" s={9} c={t.ouro}/> Existe DCC?</span>
                          <span style={{fontSize:9,color:t.txt2,flex:1}}>Documento de Cobrança Complementar</span>
                          {["sim","nao"].map(op=>(
                            <button key={op} onClick={()=>setDetalheTemDcc(op)} style={{padding:"5px 14px",borderRadius:7,border:`1.5px solid ${detalheTemDcc===op?(op==="sim"?t.ouro:t.danger):t.borda}`,background:detalheTemDcc===op?(op==="sim"?`rgba(240,185,11,.12)`:`rgba(246,70,93,.08)`):`transparent`,color:detalheTemDcc===op?(op==="sim"?t.ouro:t.danger):t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:11,textTransform:"uppercase",transition:"all .15s",display:"inline-flex",alignItems:"center",gap:5}}>{op==="sim"?<><Icon n="check-circle" s={12} c="currentColor"/> Sim</>:<><Icon n="x-circle" s={12} c="currentColor"/> Não</>}</button>
                          ))}
                        </div>
                        {detalheTemDcc===null&&<div style={{fontSize:9,color:t.txt2,marginTop:5}}>Informe se há DCC para liberar o formulário de minutas.</div>}
                      </div>

                      {/* ─ Minutas DCC — colapsável (aberto por padrão) ─ */}
                      {detalheTemDcc==="sim"&&<div style={{marginBottom:10}}>
                        <button onClick={()=>setDetalheSecDcc(p=>!p)} style={{width:"100%",background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.2)`,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontFamily:"inherit",marginBottom:detalheSecDcc?6:0}}>
                          {hIco(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,t.ouro,13,2)}
                          <span style={{fontSize:10,fontWeight:700,color:t.ouro,letterSpacing:.5,flex:1,textAlign:"left"}}>MINUTAS DCC</span>
                          <span style={{fontSize:9,color:t.txt2,fontWeight:400}}>{detalheMinDcc.length} minuta(s)</span>
                          {hIco(detalheSecDcc?<><polyline points="18 15 12 9 6 15"/></>:<><polyline points="6 9 12 15 18 9"/></>,t.txt2,13,2)}
                        </button>
                        {detalheSecDcc&&<div>
                          {detalheMinDcc.map((mn,idx)=>(
                            <div key={idx} style={{background:`rgba(240,185,11,.05)`,border:`1px solid rgba(240,185,11,.18)`,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                                <div style={{display:"flex",gap:5}}>
                                  {["D01-MAT","D05-MAR"].map(tp=>(
                                    <button key={tp} onClick={()=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,tipo:tp}:m))} style={{padding:"4px 10px",borderRadius:6,border:`1.5px solid ${mn.tipo===tp?t.ouro:t.borda}`,background:mn.tipo===tp?`rgba(240,185,11,.15)`:t.card,color:mn.tipo===tp?t.ouro:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:11}}>{tp}</button>
                                  ))}
                                  <span style={{fontSize:10,color:t.txt2,marginLeft:4,alignSelf:"center"}}>Minuta {detalheMinDcc.length>1?idx+1:""}</span>
                                </div>
                                {detalheMinDcc.length>1&&<button onClick={()=>setDetalheMinDcc(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",padding:2,display:"inline-flex",alignItems:"center"}}><Icon n="x" s={13} c={t.danger} sw={2}/></button>}
                              </div>
                              <div className="co-min-g4">
                                <div><div style={lblP2}>CTE DCC</div><input value={mn.cte} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>MDF DCC</div><input value={mn.mdf} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>{mn.tipo} (nº)</div><input value={mn.num} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>Valor</div><input value={mn.valor} onChange={e=>setDetalheMinDcc(p=>p.map((m,i)=>i===idx?{...m,valor:e.target.value}:m))} style={inpP2} placeholder="0,00" /></div>
                              </div>
                            </div>
                          ))}
                          <button onClick={()=>setDetalheMinDcc(p=>[...p,{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}])} style={{background:`rgba(240,185,11,.06)`,border:`1px dashed rgba(240,185,11,.35)`,borderRadius:7,padding:"5px 10px",color:t.ouro,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>＋ Outra Minuta DCC</button>
                        </div>}
                      </div>}

                      {/* ─ CTE Complementar — colapsável (fechado por padrão) ─ */}
                      <div style={{marginBottom:10}}>
                        <button onClick={()=>setDetalheSecCteComp(p=>!p)} style={{width:"100%",background:`rgba(22,119,255,.06)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontFamily:"inherit",marginBottom:detalheSecCteComp?6:0}}>
                          {hIco(<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,t.azulLt,13,2)}
                          <span style={{fontSize:10,fontWeight:700,color:t.azulLt,letterSpacing:.5,flex:1,textAlign:"left"}}>CTE COMPLEMENTAR</span>
                          {(detalheCteComp.cte||detalheCteComp.mdf||detalheCteComp.mat)&&<span style={{fontSize:8,background:"rgba(22,119,255,.12)",borderRadius:8,padding:"1px 6px",color:t.azulLt,fontWeight:700}}>preenchido</span>}
                          {hIco(detalheSecCteComp?<><polyline points="18 15 12 9 6 15"/></>:<><polyline points="6 9 12 15 18 9"/></>,t.txt2,13,2)}
                        </button>
                        {detalheSecCteComp&&<div style={{background:`rgba(22,119,255,.04)`,border:`1px solid rgba(22,119,255,.15)`,borderRadius:8,padding:"8px 10px"}}>
                          <div className="co-min-g3">
                            <div><div style={lblP2}>CTE COMP</div><input value={detalheCteComp.cte} onChange={e=>setDetalheCteComp(p=>({...p,cte:e.target.value}))} style={inpP2} /></div>
                            <div><div style={lblP2}>MDF COMP</div><input value={detalheCteComp.mdf} onChange={e=>setDetalheCteComp(p=>({...p,mdf:e.target.value}))} style={inpP2} /></div>
                            <div><div style={lblP2}>MAT COMP</div><input value={detalheCteComp.mat} onChange={e=>setDetalheCteComp(p=>({...p,mat:e.target.value}))} style={inpP2} /></div>
                          </div>
                        </div>}
                      </div>

                      {/* ─ Minutas Descarga — colapsável (aberto por padrão) ─ */}
                      <div style={{marginBottom:10}}>
                        <button onClick={()=>setDetalheSecMinDsc(p=>!p)} style={{width:"100%",background:`rgba(22,119,255,.06)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontFamily:"inherit",marginBottom:detalheSecMinDsc?6:0}}>
                          {hIco(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04M12 22V12"/></>,t.azulLt,13,2)}
                          <span style={{fontSize:10,fontWeight:700,color:t.azulLt,letterSpacing:.5,flex:1,textAlign:"left"}}>MINUTAS DESCARGA</span>
                          <span style={{fontSize:9,color:t.txt2,fontWeight:400}}>{detalheMinDsc.length} minuta(s)</span>
                          {hIco(detalheSecMinDsc?<><polyline points="18 15 12 9 6 15"/></>:<><polyline points="6 9 12 15 18 9"/></>,t.txt2,13,2)}
                        </button>
                        {detalheSecMinDsc&&<div>
                          {detalheMinDsc.map((mn,idx)=>(
                            <div key={idx} style={{background:`rgba(22,119,255,.04)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                                <div style={{display:"flex",gap:5}}>
                                  {["MAM","MRM"].map(tp=>(
                                    <button key={tp} onClick={()=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,tipo:tp}:m))} style={{padding:"4px 10px",borderRadius:6,border:`1.5px solid ${mn.tipo===tp?t.azulLt:t.borda}`,background:mn.tipo===tp?`rgba(22,119,255,.12)`:t.card,color:mn.tipo===tp?t.azulLt:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:11}}>{tp}</button>
                                  ))}
                                  <span style={{fontSize:10,color:t.txt2,marginLeft:4,alignSelf:"center"}}>Minuta {detalheMinDsc.length>1?idx+1:""}</span>
                                </div>
                                {detalheMinDsc.length>1&&<button onClick={()=>setDetalheMinDsc(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",padding:2,display:"inline-flex",alignItems:"center"}}><Icon n="x" s={13} c={t.danger} sw={2}/></button>}
                              </div>
                              <div className="co-min-g3">
                                <div><div style={lblP2}>CTE {mn.tipo}</div><input value={mn.cte} onChange={e=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>MDF {mn.tipo}</div><input value={mn.mdf} onChange={e=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP2} /></div>
                                <div><div style={lblP2}>{mn.tipo} (nº)</div><input value={mn.num} onChange={e=>setDetalheMinDsc(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP2} /></div>
                              </div>
                            </div>
                          ))}
                          <button onClick={()=>setDetalheMinDsc(p=>[...p,{tipo:"MAM",cte:"",mdf:"",num:""}])} style={{background:`rgba(22,119,255,.05)`,border:`1px dashed rgba(22,119,255,.35)`,borderRadius:7,padding:"5px 10px",color:t.azulLt,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>＋ Outra Minuta Descarga</button>
                        </div>}
                      </div>

                      {/* ─ Diárias & Descargas desta DT ─ */}
                      {(()=>{
                        const diariaItem = diariasData.items.find(it=>it.r.dt===r.dt);
                        const tipoLabel = {ok:{i:"check-circle",l:"No Prazo"},atraso:{i:"alert",l:"Perdeu Agenda"},diaria:{i:"bed",l:"Com Diária"},sem_diaria:{i:"check",l:"Sem Diária"},pendente:{i:"clock",l:"Aguardando"}};
                        const tipoColor = {ok:t.verde,atraso:t.danger,diaria:t.danger,sem_diaria:t.verde,pendente:t.ouro};
                        const temDescarga = !!(r.data_agenda||r.data_desc);
                        const hoje = new Date().toISOString().slice(0,10);
                        const toISO = s=>{if(!s)return null;const p=s.split("/");return p.length===3?p[2]+"-"+p[1]+"-"+p[0]:s;};
                        const agendaISO = toISO(r.data_agenda);
                        const descISO = toISO(r.data_desc);
                        let descStatus = null, descColor = t.txt2;
                        if(descISO){descStatus={i:"check-circle",l:"Descarregado"};descColor=t.verde;}
                        else if(agendaISO&&agendaISO<hoje){descStatus={i:"dot",l:"Em Atraso"};descColor=t.danger;}
                        else if(agendaISO){descStatus={i:"calendar",l:"Agendado"};descColor=t.ouro;}
                        else if(r.status==="CARREGADO"){descStatus={i:"clock",l:"Aguardando Agenda"};descColor=t.ouro;}
                        if(!diariaItem && !temDescarga) return null;
                        return (
                          <div style={{background:`rgba(240,185,11,.04)`,border:`1px solid rgba(240,185,11,.18)`,borderRadius:9,padding:"10px 12px",marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                              {hIco(<><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></>,t.ouro,12)} Diárias & Descargas
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                              {diariaItem && (
                                <div style={{background:t.bg,borderRadius:8,padding:"8px 10px",border:`1px solid ${tipoColor[diariaItem.tipo]||t.borda}33`}}>
                                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginBottom:4}}>Status Diária</div>
                                  <div style={{fontSize:11,fontWeight:700,color:tipoColor[diariaItem.tipo]||t.txt,display:"flex",alignItems:"center",gap:5}}>{tipoLabel[diariaItem.tipo]?<><Icon n={tipoLabel[diariaItem.tipo].i} s={12} c="currentColor"/> {tipoLabel[diariaItem.tipo].l}</>:diariaItem.tipo}</div>
                                  {diariaItem.dias!=null&&diariaItem.dias>0&&<div style={{fontSize:9,color:t.danger,marginTop:2}}>{diariaItem.dias} dia(s) de atraso</div>}
                                  {r.diaria_prev&&<div style={{fontSize:9,color:t.txt2,marginTop:4}}>Devida: <strong style={{color:t.ouro}}>{fmtMoeda(r.diaria_prev)}</strong></div>}
                                  {r.diaria_pg&&<div style={{fontSize:9,color:t.txt2,marginTop:2}}>Paga: <strong style={{color:t.verde}}>{fmtMoeda(r.diaria_pg)}</strong></div>}
                                  {r.diaria_prev&&r.diaria_pg&&(()=>{const saldo=(parseFloat(r.diaria_pg)||0)-(parseFloat(r.diaria_prev)||0);return saldo!==0&&<div style={{fontSize:9,color:saldo<0?t.danger:t.verde,marginTop:2,fontWeight:700}}>Saldo: {fmtMoeda(Math.abs(saldo))} {saldo<0?"a pagar":"a favor"}</div>;})()}
                                  <button onClick={()=>{setModalOpen(null);setActiveTab("diarias");}} style={{marginTop:8,width:"100%",padding:"5px 0",borderRadius:6,border:`1px solid ${t.ouro}44`,background:`rgba(240,185,11,.08)`,color:t.ouro,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:.3,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon n="clipboard" s={11} c="currentColor"/> Ver Diárias <Icon n="arrow-right" s={11} c="currentColor"/></button>
                                </div>
                              )}
                              {temDescarga && (
                                <div style={{background:t.bg,borderRadius:8,padding:"8px 10px",border:`1px solid ${descColor}33`}}>
                                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:600,marginBottom:4}}>Status Descarga</div>
                                  {descStatus&&<div style={{fontSize:11,fontWeight:700,color:descColor,display:"flex",alignItems:"center",gap:5}}><Icon n={descStatus.i} s={12} c="currentColor"/> {descStatus.l}</div>}
                                  {r.data_agenda&&<div style={{fontSize:9,color:t.txt2,marginTop:4}}>Agenda: <strong style={{color:t.txt}}>{r.data_agenda}</strong></div>}
                                  {r.data_desc&&<div style={{fontSize:9,color:t.txt2,marginTop:2}}>Descarga: <strong style={{color:t.verde}}>{r.data_desc}</strong></div>}
                                  {r.chegada&&<div style={{fontSize:9,color:t.txt2,marginTop:2}}>Chegada: <strong style={{color:t.txt}}>{r.chegada}</strong></div>}
                                  {r.destino&&<div style={{fontSize:9,color:t.txt2,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Destino: <strong style={{color:t.txt}}>{r.destino}</strong></div>}
                                  <button onClick={()=>{setModalOpen(null);setActiveTab("descarga");}} style={{marginTop:8,width:"100%",padding:"5px 0",borderRadius:6,border:`1px solid ${t.azulLt}44`,background:`rgba(22,119,255,.08)`,color:t.azulLt,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:.3,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon n="package" s={11} c="currentColor"/> Ver Descargas <Icon n="arrow-right" s={11} c="currentColor"/></button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ─ Botão Salvar ─ */}
                      <button onClick={salvarMinutasDetalhe} disabled={salvandoMins} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:salvandoMins?t.card:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,color:salvandoMins?t.txt2:"#fff",fontWeight:700,fontSize:13,cursor:salvandoMins?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:.5}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6}}>{salvandoMins?<><Icon n="clock" s={14} c="currentColor"/> Salvando...</>:<><Icon n="save" s={14} c="currentColor"/> SALVAR DOCUMENTOS</>}</span>
                      </button>
                    </div>
                  );
                })()}

              </div>{/* fim co-dt-right */}
            </div>{/* fim co-dt-body */}

            {/* Botão fechar — sticky no fundo, visível no mobile */}
            <div style={{flexShrink:0,padding:"10px 16px",borderTop:`1px solid ${t.borda}`,background:t.modalBg,display:"none"}} className="co-dt-close-bar">
              <button onClick={()=>{setModalOpen(null);setExcluirConfirm(null);setExcluirTexto("");}} style={{width:"100%",padding:"13px",background:"rgba(128,128,128,.12)",border:`1px solid ${t.borda2}`,borderRadius:DESIGN.r.btn,color:t.txt2,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Icon n="x" s={14} c="currentColor" sw={2}/> FECHAR</button>
            </div>
          </div>{/* fim co-dt-modal */}
        </div>
  );
}
