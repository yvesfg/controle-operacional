import React from "react";
import { clickable } from "../utils.js";
import Icon from "../components/Icon.jsx";

export default function ModalWhatsApp({ ctx }) {
  const {
    wppTipoOpen, setWppTipoOpen,
    wppSearchTxt, setWppSearchTxt,
    wppSearchReg, setWppSearchReg,
    buscaResult,
    wppModal, setWppModal,
    wppTel, setWppTel,
    wppPgto, setWppPgto,
    wppValCheque, setWppValCheque,
    wppValConta, setWppValConta,
    wppObs, setWppObs,
    wppModal2, setWppModal2,
    wpp2Ro, setWpp2Ro,
    wpp2Obs, setWpp2Obs,
    wpp2IncluirObs, setWpp2IncluirObs,
    wppFatModal, setWppFatModal,
    wppPagModal, setWppPagModal,
    wppFortes, setWppFortes,
    wppDccMinutas, setWppDccMinutas,
    wppCteComp, setWppCteComp,
    wppDscMinutas, setWppDscMinutas,
    wppConfirmModal, setWppConfirmModal,
    DADOS, motoristas,
    t, css, hIco, fmtMoeda, showToast, DESIGN,
    abrirWppPagModal,
  } = ctx;

  return (
    <>
      {/* ═══ WPP SELECT MODAL ═══ */}
      {wppTipoOpen && (
        <div
          onClick={e=>{if(e.target===e.currentTarget)setWppTipoOpen(false);}}
          className="co-modal-overlay co-modal-overlay--center"
        >
          <div style={{background:t.card,border:`1px solid ${t.borda}`,borderRadius:20,width:"100%",maxWidth:460,boxShadow:`0 32px 64px rgba(0,0,0,.4)`,overflow:"hidden",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${t.borda}`,background:"rgba(37,211,102,.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {hIco(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </>,"#25D366",20)}
                <div>
                  <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:15,color:t.txt}}>WhatsApp</div>
                  <div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)",letterSpacing:"0.06em",textTransform:"uppercase",marginTop:1}}>Selecione o modelo</div>
                </div>
              </div>
              <button onClick={()=>setWppTipoOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:t.txt2,padding:6,borderRadius:8}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18)}
              </button>
            </div>
            {/* Search / DT Context */}
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${t.borda}`}}>
              {(wppSearchReg||buscaResult) ? (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(37,211,102,.09)",border:"1px solid rgba(37,211,102,.22)",borderRadius:10}}>
                  {hIco(<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,"#25D366",14)}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#25D366"}}>DT {(wppSearchReg||buscaResult).dt} · {(wppSearchReg||buscaResult).nome||"—"}</div>
                    {(wppSearchReg||buscaResult).placa&&<div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)"}}>{(wppSearchReg||buscaResult).placa}</div>}
                  </div>
                  <button onClick={()=>{setWppSearchReg(null);setWppSearchTxt("");}} style={{background:"none",border:"none",cursor:"pointer",color:t.txt2,padding:4,borderRadius:6,flexShrink:0}}>
                    {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,14)}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{position:"relative"}}>
                    <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex",alignItems:"center"}}>
                      {hIco(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,t.txt2,14)}
                    </span>
                    <input
                      value={wppSearchTxt}
                      onChange={e=>setWppSearchTxt(e.target.value)}
                      placeholder="DT, motorista ou placa…"
                      style={{width:"100%",padding:"9px 10px 9px 34px",border:`1px solid ${t.borda}`,borderRadius:9,background:t.card2,color:t.txt,fontSize:13,fontFamily:"inherit",outline:"none"}}
                      onFocus={e=>{e.target.style.borderColor=t.azulLt;}}
                      onBlur={e=>{e.target.style.borderColor=t.borda;}}
                    />
                  </div>
                  {wppSearchTxt.length>=2 && (() => {
                    const _q=wppSearchTxt.toLowerCase();
                    const _res=DADOS.filter(r=>(r.dt&&String(r.dt).toLowerCase().includes(_q))||(r.nome&&r.nome.toLowerCase().includes(_q))||(r.placa&&r.placa.toLowerCase().includes(_q))).slice(0,5);
                    if(!_res.length) return <div style={{fontSize:11,color:t.txt2,marginTop:6,textAlign:"center",padding:"6px 0"}}>Nenhum resultado</div>;
                    return (<div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3,maxHeight:180,overflowY:"auto"}}>
                      {_res.map((r,i)=>(
                        <button key={i} onClick={()=>{setWppSearchReg(r);setWppSearchTxt("");}}
                          style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:t.card2,border:`1px solid ${t.borda}`,borderRadius:8,cursor:"pointer",textAlign:"left",width:"100%"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=t.surface;}}
                          onMouseLeave={e=>{e.currentTarget.style.background=t.card2;}}
                        >
                          <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:t.ouro,fontWeight:700,flexShrink:0}}>DT {r.dt}</div>
                          <div style={{fontSize:12,color:t.txt,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nome||"—"}</div>
                          {r.placa&&<div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)",flexShrink:0}}>{r.placa}</div>}
                        </button>
                      ))}
                    </div>);
                  })()}
                </div>
              )}
            </div>
            {/* Options */}
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {[
                {k:"faturamento", ico:<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="16" y1="8" x2="8" y2="8"/><line x1="16" y1="12" x2="8" y2="12"/></>, color:t.ouro, l:"Faturamento", sub:"CTE · MDF · MAT · CODIGO · NF"},
                {k:"contratacao",ico:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>, color:t.azulLt, l:"Contratação", sub:"Modelo completo de pagamento"},
              ].map((op)=>(
                <button key={op.k} onClick={()=>{
                  const _reg=wppSearchReg||buscaResult;
                  if(!_reg){showToast("Busque um registro primeiro","warn");return;}
                  const mot=motoristas.find(m=>(_reg.cpf&&m.cpf?.replace(/\D/g,"")===_reg.cpf?.replace(/\D/g,""))||(_reg.nome&&m.nome===_reg.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===_reg.placa));
                  setWppTipoOpen(false);setWppSearchTxt("");setWppSearchReg(null);
                  if(op.k==="faturamento"){setWppFatModal({reg:_reg,mot:mot||null});}
                  else if(op.k==="contratacao"){setWppModal({reg:_reg,mot:mot||null});setWppTel((mot?.tel||_reg.tel||""));setWppPgto("cheque");setWppValCheque("");setWppValConta("");setWppObs("");}
                  else if(op.k==="descarga"){abrirWppPagModal(_reg,mot,"descarga");}
                  else if(op.k==="diarias"){abrirWppPagModal(_reg,mot,"diarias");}
                }}
                style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:t.card2,border:`1px solid ${t.borda}`,borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=`rgba(${op.color.includes("#7c")?'124,58,237':op.color===t.azulLt?'22,119,255':op.color===t.verde?'34,197,94':'240,185,11'},.1)`;e.currentTarget.style.borderColor=op.color}}
                onMouseLeave={e=>{e.currentTarget.style.background=t.card2;e.currentTarget.style.borderColor=t.borda}}
                >
                  <div style={{width:42,height:42,borderRadius:11,background:op.color+"18",border:`1px solid ${op.color}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {hIco(op.ico,op.color,18)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:t.txt,fontFamily:"var(--font-heading)"}}>{op.l}</div>
                    <div style={{fontSize:11,color:t.txt2,marginTop:2}}>{op.sub}</div>
                  </div>
                  {hIco(<><polyline points="9 18 15 12 9 6"/></>,t.txt3||t.txt2,14)}
                </button>
              ))}
            </div>
            <div style={{height:8}}/>
          </div>
        </div>
      )}

      {/* ═══ WHATSAPP CARD MODAL (Item 4) ═══ */}
      {wppModal && (()=>{
        const {reg, mot} = wppModal;
        const adtNum = parseFloat(reg.adiant||0)||0;
        const chequeNum = parseFloat(wppValCheque||0)||0;
        const contaNum = parseFloat(wppValConta||0)||0;
        const somaExcede = wppPgto==="ambos" && (chequeNum+contaNum) > adtNum && adtNum > 0;
        const temConta = !!(mot?.banco || mot?.conta);
        const placas = [mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).join(" / ") || reg.placa || "—";

        const gerarMsg = () => {
          const ln = "\n";
          let msg = `DT: ${reg.dt||"—"}    DESTINO: ${reg.destino||"—"}${ln}`;
          msg += `NOME: ${reg.nome||"—"}${ln}`;
          msg += `CPF: ${reg.cpf||"—"}${ln}`;
          msg += `TELEFONE: ${wppTel||"—"}${ln}`;
          msg += `PLACAS: ${placas}${ln}`;
          msg += `CARREGAR: ${reg.data_carr||"—"}${ln}`;
          msg += `AG DESCARGA: ${reg.data_agenda||"—"}${ln}`;
          msg += `VLR EMPRESA: ${fmtMoeda(reg.vl_cte)}${ln}`;
          msg += `VLR MOT: ${fmtMoeda(reg.vl_contrato)}${ln}`;
          msg += `ADT: ${fmtMoeda(reg.adiant)}${ln}`;
          if (wppPgto==="cheque") {
            msg += `PGTO: ✅ CHEQUE${ln}`;
          } else if (wppPgto==="conta") {
            msg += `PGTO: ✅ CONTA${ln}`;
            if (temConta) {
              msg += `  BCO: ${mot.banco||"—"}${ln}`;
              msg += `  AGE: ${mot.agencia||"—"}${ln}`;
              msg += `  C/C: ${mot.conta||"—"}${ln}`;
              msg += `  FAV: ${mot.favorecido||mot?.nome||reg.nome||"—"}${ln}`;
              if (mot?.pix_tipo) msg += `  PIX (${mot.pix_tipo}): ${mot.pix_chave||"—"}${ln}`;
            }
          } else {
            msg += `PGTO: ✅ CHEQUE + CONTA${ln}`;
            msg += `  Cheque: ${fmtMoeda(wppValCheque)}${ln}`;
            msg += `  Conta: ${fmtMoeda(wppValConta)}${ln}`;
            if (temConta) {
              msg += `  BCO: ${mot.banco||"—"}${ln}`;
              msg += `  AGE: ${mot.agencia||"—"}${ln}`;
              msg += `  C/C: ${mot.conta||"—"}${ln}`;
              msg += `  FAV: ${mot.favorecido||mot?.nome||reg.nome||"—"}${ln}`;
              if (mot?.pix_tipo) msg += `  PIX (${mot.pix_tipo}): ${mot.pix_chave||"—"}${ln}`;
            }
          }
          if (wppObs.trim()) msg += `OBSERVAÇÃO: ${wppObs.trim()}${ln}`;
          msg += `${ln}YFGroup · Controle Operacional`;
          return msg;
        };

        const enviar = () => {
          if (somaExcede) { showToast("⚠️ Soma Cheque + Conta excede o ADT!","warn"); return; }
          const tel = wppTel.replace(/\D/g,"");
          const rawMsg = gerarMsg();
          const url = tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(rawMsg)}` : `https://wa.me/?text=${encodeURIComponent(rawMsg)}`;
          const displayText = rawMsg.replace(/%0A/g,"\n");
          setWppModal(null);
          setWppConfirmModal({url, displayText});
        };

        const inpStyle = {...css.inp, fontSize:12, padding:"7px 10px"};
        const labelStyle = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};
        const pgtoOptions = [{k:"cheque",ic:["edit"],l:"Cheque"},{k:"conta",ic:["bank"],l:"Conta"},{k:"ambos",ic:["edit","bank"],l:"Ambos"}];

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppModal(null)}>
            <div style={{...css.modal,maxHeight:"96vh"}}>
              {/* Header */}
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:"rgba(37,211,102,.06)"}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(37,211,102,.15)",border:"1px solid rgba(37,211,102,.3)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="smartphone" s={18} c="#25D366"/></div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:"#25D366"}}>WHATSAPP</div>
                  <div style={{fontSize:9,color:t.txt2}}>Revise os dados antes de enviar</div>
                </div>
                <button onClick={()=>setWppModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
              </div>

              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>

                {/* Linha DT + DESTINO */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={labelStyle}>DT</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,color:t.ouro}}>{reg.dt||"—"}</div></div>
                  <div><label style={labelStyle}>Destino</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontSize:11,color:t.txt}}>{reg.destino||"—"}</div></div>
                </div>

                {/* Nome, CPF */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={labelStyle}>Nome</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontSize:12,color:t.txt,fontWeight:700}}>{reg.nome||"—"}</div></div>
                  <div><label style={labelStyle}>CPF</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontSize:11,color:t.txt}}>{reg.cpf||"—"}</div></div>
                </div>

                {/* Telefone — editável */}
                <div>
                  <label style={labelStyle}>Telefone <span style={{color:t.verde,fontSize:8}}>(editável)</span></label>
                  <input value={wppTel} onChange={e=>setWppTel(e.target.value)} placeholder="(XX) XXXXX-XXXX" style={inpStyle} />
                  {!wppTel && <div style={{fontSize:9,color:t.warn,marginTop:3,display:"flex",alignItems:"center",gap:5}}><Icon n="alert" s={11} c={t.warn}/> Motorista sem telefone cadastrado — o WhatsApp abrirá sem número</div>}
                </div>

                {/* Placas */}
                <div>
                  <label style={labelStyle}>Placas</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {[mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).map((p,j)=>(
                      <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:2.5,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:DESIGN.r.badge,padding:"3px 9px"}}>{p}</span>
                    ))}
                  </div>
                </div>

                {/* Datas + Financeiro */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {l:"Carregar",v:reg.data_carr},
                    {l:"Ag. Descarga",v:reg.data_agenda},
                  ].map(f=>(
                    <div key={f.l}><label style={labelStyle}>{f.l}</label><div style={{...inpStyle,background:t.card2,borderRadius:9,display:"flex",alignItems:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1.5,color:t.ouro}}>{f.v||"—"}</div></div>
                  ))}
                </div>
                {canFin && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{l:"VLR EMPRESA",v:reg.vl_cte,c:t.verde},{l:"VLR MOT",v:reg.vl_contrato,c:t.azulLt},{l:"ADT",v:reg.adiant,c:t.ouro}].map(f=>(
                      <div key={f.l} style={{background:t.card2,borderRadius:9,padding:"8px 10px",border:`1px solid ${t.borda}`,textAlign:"center"}}>
                        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:3}}>{f.l}</div>
                        <div style={{fontSize:11,fontWeight:700,color:f.c}}>{fmtMoeda(f.v)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PGTO */}
                <div>
                  <label style={{...labelStyle,marginBottom:7}}>PGTO · Forma de Pagamento</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {pgtoOptions.map(op=>(
                      <button key={op.k} onClick={()=>setWppPgto(op.k)} style={{padding:"9px 6px",borderRadius:DESIGN.r.btn,border:`1.5px solid ${wppPgto===op.k?t.verde:t.borda}`,background:wppPgto===op.k?`rgba(2,192,118,.1)`:t.card2,color:wppPgto===op.k?t.verde:t.txt2,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,textAlign:"center",transition:"all .2s",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        {op.ic.map((nm,ix)=><Icon key={ix} n={nm} s={12} c="currentColor"/>)} {op.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conta — verificar dados bancários */}
                {(wppPgto==="conta" || wppPgto==="ambos") && (
                  <div style={{background:t.card2,borderRadius:10,padding:12,border:`1px solid ${temConta?t.verde:t.warn}`}}>
                    {temConta ? (
                      <>
                        <div style={{fontSize:10,fontWeight:700,color:t.verde,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="check-circle" s={12} c={t.verde}/> Conta bancária cadastrada</div>
                        <div style={{display:"grid",gap:3,fontSize:10,color:t.txt2}}>
                          <div>BCO: <strong style={{color:t.txt}}>{mot.banco||"—"}</strong></div>
                          <div>AGE: <strong style={{color:t.txt}}>{mot.agencia||"—"}</strong> · C/C: <strong style={{color:t.txt}}>{mot.conta||"—"}</strong></div>
                          <div>FAV: <strong style={{color:t.txt}}>{mot.favorecido||mot?.nome||reg.nome||"—"}</strong></div>
                          {mot?.pix_tipo && <div style={{color:t.azulLt}}>PIX ({mot.pix_tipo}): <strong>{mot.pix_chave||"—"}</strong></div>}
                        </div>
                      </>
                    ) : (
                      <div style={{fontSize:10,color:t.warn,display:"flex",alignItems:"flex-start",gap:5}}><Icon n="alert" s={11} c={t.warn} style={{marginTop:1}}/><span>Motorista sem conta bancária cadastrada. Cadastre na aba Motoristas antes de enviar.</span></div>
                    )}
                  </div>
                )}

                {/* Valores Cheque + Conta */}
                {wppPgto==="ambos" && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div>
                      <label style={labelStyle}>Valor Cheque (R$)</label>
                      <input type="number" value={wppValCheque} onChange={e=>setWppValCheque(e.target.value)} placeholder="0,00" style={inpStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Valor Conta (R$)</label>
                      <input type="number" value={wppValConta} onChange={e=>setWppValConta(e.target.value)} placeholder="0,00" style={inpStyle} />
                    </div>
                    {somaExcede && (
                      <div style={{gridColumn:"1/-1",background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.25)`,borderRadius:8,padding:"8px 10px",fontSize:11,color:t.danger,fontWeight:600}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon n="alert" s={12} c={t.danger}/> Soma ({fmtMoeda((chequeNum+contaNum).toFixed(2))}) excede o ADT ({fmtMoeda(reg.adiant)})!</span>
                      </div>
                    )}
                    {!somaExcede && (chequeNum+contaNum)>0 && adtNum>0 && (
                      <div style={{gridColumn:"1/-1",background:`rgba(2,192,118,.06)`,border:`1px solid rgba(2,192,118,.2)`,borderRadius:8,padding:"8px 10px",fontSize:11,color:t.verde}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon n="check-circle" s={12} c={t.verde}/> Total: {fmtMoeda((chequeNum+contaNum).toFixed(2))} de {fmtMoeda(reg.adiant)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Observação */}
                <div>
                  <label style={labelStyle}>Observação</label>
                  <textarea value={wppObs} onChange={e=>setWppObs(e.target.value)} rows={2} placeholder="Qualquer observação relevante..." style={{...inpStyle,resize:"vertical",lineHeight:1.5}} />
                </div>

              </div>

              {/* Botão enviar */}
              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8}}>
                <button onClick={()=>setWppModal(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={enviar} disabled={somaExcede} style={{flex:1,borderRadius:10,padding:"12px 18px",cursor:somaExcede?"not-allowed":"pointer",background:somaExcede?`rgba(128,128,128,.2)`:`rgba(37,211,102,.15)`,border:`1.5px solid ${somaExcede?t.borda:"rgba(37,211,102,.4)"}`,color:somaExcede?t.txt2:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  <Icon n="smartphone" s={15} c="currentColor"/> ENVIAR NO WHATSAPP
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ WHATSAPP DOC MODAL (Item 3 Sessão 4) ═══ */}
      {wppModal2 && (()=>{
        const {reg, mot} = wppModal2;
        const nomeMotorista = mot?.nome || reg.nome || "";
        const placas = [mot?.placa1||reg.placa, mot?.placa2, mot?.placa3, mot?.placa4].filter(Boolean).join(" / ") || reg.placa || "—";
        const telMot = mot?.tel || reg.tel || "";
        const roOk = wpp2Ro.trim().length > 0;

        const inpStyle2 = {...css.inp, fontSize:12, padding:"7px 10px"};
        const lbl2 = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};

        const gerarMsgDoc = () => {
          const ln = "%0A";
          const b = (s) => `*${s}*`;
          let msg = `${b("📄 DOCUMENTO")}${ln}`;
          msg += `────────────────${ln}`;
          msg += `${b("MOT:")} ${nomeMotorista}${ln}`;
          msg += `${b("CTE:")} ${reg.cte||"—"}${ln}`;
          msg += `${b("MDF:")} ${reg.mdf||"—"}${ln}`;
          msg += `${b("MAT:")} ${reg.mat||"—"}${ln}`;
          msg += `${b("PLACAS:")} ${placas}${ln}`;
          msg += `────────────────${ln}`;
          msg += `${b("DT:")} ${reg.dt||"—"}  ${b("NF:")} ${reg.nf||"—"}  ${b("ID:")} ${reg.id_doc||"—"}${ln}`;
          msg += `${b("RO:")} ${wpp2Ro.trim()}${ln}`;
          if (wpp2IncluirObs && wpp2Obs.trim()) msg += `${b("OBS:")} ${wpp2Obs.trim()}${ln}`;
          msg += `────────────────${ln}`;
          msg += `YFGroup · Controle Operacional`;
          return msg;
        };

        const enviarDoc = () => {
          if (!roOk) { showToast("⚠️ RO é obrigatório","warn"); return; }
          // Memoriza OBS se preenchido e incluído
          if (wpp2IncluirObs && wpp2Obs.trim()) saveJSON("co_wpp2_obs_last", wpp2Obs.trim());
          const tel = telMot.replace(/\D/g,"");
          const rawMsg = gerarMsgDoc();
          const url = tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(rawMsg)}` : `https://wa.me/?text=${encodeURIComponent(rawMsg)}`;
          const displayText = rawMsg.replace(/%0A/g,"\n");
          setWppModal2(null);
          setWppConfirmModal({url, displayText});
        };

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppModal2(null)}>
            <div style={{...css.modal, maxHeight:"96vh"}}>
              {/* Header */}
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:`rgba(22,119,255,.06)`}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(22,119,255,.15)",border:"1px solid rgba(22,119,255,.3)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="file-text" s={18} c={t.azulLt}/></div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.azulLt}}>WHATSAPP DOC</div>
                  <div style={{fontSize:9,color:t.txt2}}>Mensagem documentária · RO obrigatório</div>
                </div>
                <button onClick={()=>setWppModal2(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
              </div>

              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>

                {/* Motorista + Placas */}
                <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700}}>Motorista</div>
                    {telMot && <div style={{fontSize:9,color:t.txt2,display:"flex",alignItems:"center",gap:4}}><Icon n="phone" s={10} c={t.txt2}/> {telMot}</div>}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:3}}>{nomeMotorista||"—"}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                    {[mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).map((p,j)=>(
                      <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:DESIGN.r.badge,padding:"2px 8px"}}>{p}</span>
                    ))}
                  </div>
                </div>

                {/* Documentos */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {[{l:"CTE",v:reg.cte},{l:"MDF",v:reg.mdf},{l:"MAT",v:reg.mat}].map(f=>(
                    <div key={f.l} style={{background:t.card2,borderRadius:8,padding:"7px 9px",border:`1px solid ${t.borda}`,textAlign:"center"}}>
                      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                      <div style={{fontSize:11,fontWeight:700,color:f.v?t.txt:t.txt2}}>{f.v||"—"}</div>
                    </div>
                  ))}
                </div>

                {/* DT / NF / ID */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {[{l:"DT",v:reg.dt},{l:"NF",v:reg.nf},{l:"ID",v:reg.id_doc}].map(f=>(
                    <div key={f.l} style={{background:t.card2,borderRadius:8,padding:"7px 9px",border:`1px solid ${t.borda}`,textAlign:"center"}}>
                      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1.5,color:t.ouro}}>{f.v||"—"}</div>
                    </div>
                  ))}
                </div>

                {/* RO — obrigatório */}
                <div>
                  <label style={{...lbl2,color:roOk?t.verde:t.danger}}>RO — Registro de Ocorrência <span style={{color:t.danger}}>*obrigatório</span></label>
                  <input value={wpp2Ro} onChange={e=>setWpp2Ro(e.target.value)} placeholder="Nº do Registro de Ocorrência" style={{...inpStyle2,border:`1.5px solid ${roOk?t.verde:t.danger}`,width:"100%",boxSizing:"border-box"}} />
                  {!roOk && <div style={{fontSize:9,color:t.danger,marginTop:3,display:"flex",alignItems:"center",gap:5}}><Icon n="alert" s={11} c={t.danger}/> Informe o número do RO para prosseguir</div>}
                </div>

                {/* OBS — opcional com memória */}
                <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <label style={{...lbl2,margin:0,flex:1}}>OBS — Observação <span style={{color:t.txt2,fontSize:11}}>(opcional)</span></label>
                    <button onClick={()=>setWpp2IncluirObs(v=>!v)} style={{background:wpp2IncluirObs?`rgba(2,192,118,.12)`:`rgba(128,128,128,.08)`,border:`1.5px solid ${wpp2IncluirObs?t.verde:t.borda}`,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:9,fontWeight:700,color:wpp2IncluirObs?t.verde:t.txt2,fontFamily:"inherit"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4}}>{wpp2IncluirObs?<Icon n="check-circle" s={11} c={t.verde}/>:<Icon n="square" s={11} c={t.txt2}/>} Incluir</span>
                    </button>
                  </div>
                  <textarea value={wpp2Obs} onChange={e=>setWpp2Obs(e.target.value)} rows={2} placeholder={wpp2Obs?"Última OBS salva — edite se necessário":"Digite uma observação..."}
                    style={{...inpStyle2,resize:"vertical",lineHeight:1.5,width:"100%",boxSizing:"border-box",opacity:wpp2IncluirObs?1:.55}} />
                  {!wpp2IncluirObs && wpp2Obs && (
                    <div style={{fontSize:8,color:t.txt2,marginTop:3,display:"flex",alignItems:"center",gap:4}}><Icon n="save" s={10} c={t.txt2}/> Última OBS salva — clique em "Incluir" para adicionar à mensagem</div>
                  )}
                </div>

                {/* Preview da mensagem */}
                <div style={{background:t.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:7}}>Preview da mensagem</div>
                  <div style={{fontFamily:"monospace",fontSize:9,color:t.txt,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
                    {`📄 DOCUMENTO\n────────────────\nMOT: ${nomeMotorista||"—"}\nCTE: ${reg.cte||"—"}\nMDF: ${reg.mdf||"—"}\nMAT: ${reg.mat||"—"}\nPLACAS: ${placas}\n────────────────\nDT: ${reg.dt||"—"}  NF: ${reg.nf||"—"}  ID: ${reg.id_doc||"—"}\nRO: ${wpp2Ro||"[obrigatório]"}${wpp2IncluirObs&&wpp2Obs?`\nOBS: ${wpp2Obs}`:""}\n────────────────\nYFGroup · Controle Operacional`}
                  </div>
                </div>

              </div>

              {/* Botão enviar */}
              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8,flexShrink:0}}>
                <button onClick={()=>setWppModal2(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={enviarDoc} disabled={!roOk} style={{flex:1,border:`1.5px solid ${roOk?"rgba(37,211,102,.4)":t.borda}`,borderRadius:10,padding:"12px 18px",cursor:roOk?"pointer":"not-allowed",background:roOk?`rgba(37,211,102,.15)`:`rgba(128,128,128,.08)`,color:roOk?"#25D366":t.txt2,fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  <Icon n="file-text" s={15} c="currentColor"/> ENVIAR DOC NO WHATSAPP
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ WHATSAPP FATURAMENTO MODAL ═══ */}
      {wppFatModal && (()=>{
        const {reg,mot,base} = wppFatModal;
        const isAvb = base === "acailandia_avb";
        const placas = [mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).join(" / ")||reg.placa||"—";
        const inpF = {...css.inp,fontSize:12,padding:"7px 10px"};
        const lblF = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};

        const gerarFat = () => {
          const cleanNome = s => (s||"").replace(/^[^a-zA-ZÀ-ÿ0-9]+/,"").trim();
          const ln = "\n";
          let m = `MOT: ${cleanNome(reg.nome)||"—"}${ln}`;
          m += `CTE: ${reg.cte||"—"}${ln}`;
          m += `MDF: ${reg.mdf||"—"}${ln}`;
          m += `MAT: ${reg.mat||"—"}${ln}`;
          if (isAvb) {
            m += `CODIGO: ${reg.codigo||"—"}${ln}`;
          } else {
            m += `DT: ${reg.dt||"—"}${ln}`;
            m += `ID: ${reg.id_doc||"—"}${ln}`;
          }
          m += `NF: ${reg.nf||"—"}${ln}`;
          return m;
        };

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppFatModal(null)}>
            <div style={{...css.modal,maxHeight:"90vh"}}>
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:"rgba(37,211,102,.05)"}}>
                <div style={{width:36,height:36,borderRadius:9,background:"rgba(37,211,102,.15)",border:"1px solid rgba(37,211,102,.3)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="receipt" s={18} c="#25D366"/></div>
                <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:"#25D366"}}>FATURAMENTO</div><div style={{fontSize:9,color:t.txt2}}>{isAvb ? "CTE · MDF · MAT · CODIGO · NF" : "CTE · MDF · MAT · DT · NF · ID"}</div></div>
                <button onClick={()=>setWppFatModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
              </div>
              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:"calc(96vh - 120px)"}}>
                <div style={{background:t.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:8}}>Preview</div>
                  <div style={{fontFamily:"monospace",fontSize:11,color:t.txt,lineHeight:2,whiteSpace:"pre"}}>
                    {(()=>{const cn=s=>(s||"").replace(/^[^a-zA-ZÀ-ÿ0-9]+/,"").trim();let p=`MOT: ${cn(reg.nome)||"—"}\nCTE: ${reg.cte||"—"}\nMDF: ${reg.mdf||"—"}\nMAT: ${reg.mat||"—"}\n`;p+=isAvb?`CODIGO: ${reg.codigo||"—"}\n`:`DT: ${reg.dt||"—"}\nID: ${reg.id_doc||"—"}\n`;p+=`NF: ${reg.nf||"—"}`;return p;})()}
                  </div>
                </div>
                {(()=>{
                  const faltando=[];
                  if(!reg.nome)faltando.push("Motorista");if(!reg.cte)faltando.push("CTE");if(!reg.mdf)faltando.push("MDF");if(!reg.mat)faltando.push("MAT");if(!reg.nf)faltando.push("NF");if(isAvb){if(!reg.codigo)faltando.push("CODIGO");}else{if(!reg.dt)faltando.push("DT");}
                  return faltando.length>0?(
                    <div style={{background:`rgba(246,70,93,.07)`,border:`1.5px solid rgba(246,70,93,.3)`,borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,fontWeight:700,color:t.danger,marginBottom:5,display:"flex",alignItems:"center",gap:5}}><Icon n="alert" s={12} c={t.danger}/> Campos obrigatórios vazios — edite o registro antes de enviar:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {faltando.map(f=><span key={f} style={{background:`rgba(246,70,93,.12)`,border:`1px solid rgba(246,70,93,.3)`,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,color:t.danger}}>{f}</span>)}
                      </div>
                    </div>
                  ):(<div style={{background:`rgba(2,192,118,.07)`,border:`1px solid rgba(2,192,118,.25)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.verde,fontWeight:700,display:"flex",alignItems:"center",gap:5}}><Icon n="check-circle" s={12} c={t.verde}/> Todos os campos estão preenchidos!</div>);
                })()}
              </div>
              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8}}>
                <button onClick={()=>setWppFatModal(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={()=>{
                  const faltando=[];
                  if(!reg.cte)faltando.push("CTE");if(!reg.mdf)faltando.push("MDF");if(!reg.nf)faltando.push("NF");if(isAvb&&!reg.codigo)faltando.push("CODIGO");
                  if(faltando.length>0){if(!window.confirm(`⚠️ Campos vazios: ${faltando.join(", ")}.\nEnviar mesmo assim?`))return;}
                  const tel=(mot?.tel||"").replace(/\D/g,"");
                  const rawMsg=gerarFat();
                  const url=tel?`https://wa.me/55${tel}?text=${encodeURIComponent(rawMsg)}`:`https://wa.me/?text=${encodeURIComponent(rawMsg)}`;
                  setWppFatModal(null);
                  setWppConfirmModal({url, displayText:rawMsg});
                }} style={{flex:1,borderRadius:10,padding:"12px 18px",cursor:"pointer",background:`rgba(37,211,102,.15)`,border:`1.5px solid rgba(37,211,102,.4)`,color:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  <Icon n="smartphone" s={15} c="currentColor"/> PREPARAR MENSAGEM
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ WHATSAPP PAGAMENTO (Descarga / Diárias) MODAL ═══ */}
      {wppPagModal && (()=>{
        const {reg,mot,tipo} = wppPagModal;
        const isDiaria = tipo === "diarias";
        const nomeLabel = isDiaria ? "DIÁRIAS" : "DESCARGA / STRETCH";
        const headerColor = isDiaria ? t.danger : t.azulLt;
        const headerBg = isDiaria ? "rgba(246,70,93,.06)" : "rgba(22,119,255,.06)";
        const placas = [mot?.placa1||reg.placa,mot?.placa2,mot?.placa3,mot?.placa4].filter(Boolean).join(" / ")||reg.placa||"—";
        const pixLabel = mot?.pix_tipo ? `${mot.pix_tipo}: ${mot.pix_chave||"—"}` : "—";
        const inpP = {...css.inp,fontSize:12,padding:"7px 10px"};
        const lblP = {fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"block",marginBottom:3};

        const cleanNome = s => (s||"").replace(/^[^a-zA-ZÀ-ÿ0-9]+/,"").trim();
        const gerarPag = () => {
          const ln = "\n";
          let m = `PREZADAS,${ln}SOLICITO O PAGAMENTO:${ln}`;
          m += `MOT: ${cleanNome(reg.nome)||"—"}${ln}`;
          m += `CTE: ${reg.cte||"—"}${ln}`;
          m += `MDF: ${reg.mdf||"—"}${ln}`;
          m += `MAR: ${reg.mat||"—"}${ln}`;
          m += `PLACAS: ${placas}${ln}`;
          m += `DT: ${reg.dt||"—"} NF: ${reg.nf||"—"} ID: ${reg.id_doc||"—"}${ln}`;
          m += `${ln}`;
          m += `BCO: ${mot?.banco||"—"}${ln}`;
          m += `FAV: ${cleanNome(mot?.favorecido||mot?.nome||reg.nome)||"—"}${ln}`;
          m += `PIX: ${pixLabel}${ln}`;
          m += `AGE: ${mot?.agencia||"—"}${ln}`;
          m += `C/C: ${mot?.conta||"—"}${ln}`;
          if (wppFortes) {
            m += `${ln}`;
            if (isDiaria) {
              wppDccMinutas.forEach((mn,idx)=>{
                const td = mn.tipo||"D01-MAT";
                m += `MINUTA DCC${wppDccMinutas.length>1?` (${idx+1})`:""}${ln}`;
                m += `CTE ${td}: ${mn.cte||"—"}${ln}`;
                m += `MDF ${td}: ${mn.mdf||"—"}${ln}`;
                m += `${td}: ${mn.num||"—"}${ln}`;
                if(mn.valor) m += `VALOR: ${fmtMoeda(mn.valor)}${ln}`;
                m += `${ln}`;
              });
              if(wppCteComp.cte||wppCteComp.mdf||wppCteComp.mat){
                m += `CTE COMPLEMENTAR:${ln}`;
                if(wppCteComp.cte) m += `CTE COMP: ${wppCteComp.cte}${ln}`;
                if(wppCteComp.mdf) m += `MDF COMP: ${wppCteComp.mdf}${ln}`;
                if(wppCteComp.mat) m += `MAT COMP: ${wppCteComp.mat}${ln}`;
              }
            } else {
              wppDscMinutas.forEach((mn,idx)=>{
                const tp = mn.tipo||"MAM";
                m += `MINUTA ${tp}${wppDscMinutas.length>1?` (${idx+1})`:""}${ln}`;
                m += `CTE ${tp}: ${mn.cte||"—"}${ln}`;
                m += `MDF ${tp}: ${mn.mdf||"—"}${ln}`;
                m += `${tp}: ${mn.num||"—"}${ln}`;
                m += `${ln}`;
              });
            }
          }
          return m.trim();
        };

        return (
          <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setWppPagModal(null)}>
            <div style={{...css.modal,maxHeight:"96vh"}}>
              <div style={{padding:"13px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0,background:headerBg}}>
                <div style={{width:36,height:36,borderRadius:9,background:`${headerColor}22`,border:`1px solid ${headerColor}44`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n={isDiaria?"bed":"package"} s={18} c={headerColor}/></div>
                <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:headerColor}}>{nomeLabel}</div><div style={{fontSize:9,color:t.txt2}}>Solicitar pagamento · {reg.nome||"—"}</div></div>
                <button onClick={()=>setWppPagModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c={t.txt2} sw={2}/></button>
              </div>

              <div style={{flex:1,minHeight:0,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14,display:"flex",flexDirection:"column",gap:10}}>
                {/* Dados do registro */}
                <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {[{l:"DT",v:reg.dt,c:t.ouro},{l:"NF",v:reg.nf,c:t.txt},{l:"ID",v:reg.id_doc,c:t.txt}].map(f=>(
                      <div key={f.l} style={{textAlign:"center"}}>
                        <div style={{fontSize:11,textTransform:"uppercase",color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1,color:f.c}}>{f.v||"—"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                    {[{l:"CTE",v:reg.cte},{l:"MDF",v:reg.mdf},{l:"MAR/MAT",v:reg.mat}].map(f=>(
                      <div key={f.l} style={{textAlign:"center"}}>
                        <div style={{fontSize:11,textTransform:"uppercase",color:t.txt2,fontWeight:700,marginBottom:2}}>{f.l}</div>
                        <div style={{fontSize:11,fontWeight:600,color:t.txt}}>{f.v||"—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dados bancários */}
                {mot?.banco ? (
                  <div style={{background:t.card2,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.verde}33`}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.verde,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="check-circle" s={12} c={t.verde}/> Dados bancários</div>
                    <div style={{display:"grid",gap:3,fontSize:10,color:t.txt2}}>
                      <div>BCO: <strong style={{color:t.txt}}>{mot.banco}</strong></div>
                      <div>FAV: <strong style={{color:t.txt}}>{mot.favorecido||mot.nome||reg.nome||"—"}</strong></div>
                      {mot.pix_tipo && <div style={{color:t.azulLt}}>PIX ({mot.pix_tipo}): <strong>{mot.pix_chave||"—"}</strong></div>}
                      <div>AGE: <strong style={{color:t.txt}}>{mot.agencia||"—"}</strong> · C/C: <strong style={{color:t.txt}}>{mot.conta||"—"}</strong></div>
                    </div>
                  </div>
                ):(
                  <div style={{background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:10,padding:"10px 12px",fontSize:10,color:t.ouro,display:"flex",alignItems:"flex-start",gap:5}}><Icon n="alert" s={11} c={t.ouro} style={{marginTop:1}}/><span>Motorista sem dados bancários. Cadastre na aba Motoristas.</span></div>
                )}

                {/* ── Minutas (DCC para Diárias / MAM-MRM para Descarga) ── */}
                <div style={{background:t.card2,borderRadius:10,border:`1px solid ${t.borda}`,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}} {...clickable(()=>setWppFortes(v=>!v))}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${wppFortes?t.verde:t.borda}`,background:wppFortes?t.verde:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                      {wppFortes && <Icon n="check" s={11} c="#fff" sw={2.6}/>}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:wppFortes?t.verde:t.txt2}}>{isDiaria?"Incluir Minuta DCC + CTE Complementar":"Incluir Minuta Descarga (MAM/MRM)"}</span>
                  </div>
                  {wppFortes && (
                    <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:10,borderTop:`1px solid ${t.borda}`}}>
                      {isDiaria ? (<>
                        {/* Minutas DCC */}
                        {wppDccMinutas.map((mn,idx)=>(
                          <div key={idx} style={{background:`rgba(240,185,11,.04)`,borderRadius:8,border:`1px solid rgba(240,185,11,.2)`,padding:"8px 10px",marginTop:idx===0?8:0}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                              <span style={{fontSize:10,fontWeight:700,color:t.ouro}}>{"MINUTA DCC "+(wppDccMinutas.length>1?"("+(idx+1)+")":"")}</span>
                              {wppDccMinutas.length>1 && <button onClick={()=>setWppDccMinutas(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",padding:2,display:"inline-flex",alignItems:"center"}}><Icon n="x" s={13} c={t.danger} sw={2}/></button>}
                            </div>
                            <div style={{display:"flex",gap:6,marginBottom:6}}>
                              {["D01-MAT","D05-MAR"].map(d=>(
                                <button key={d} onClick={()=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,tipo:d}:m))} style={{flex:1,padding:"6px",borderRadius:7,border:`1.5px solid ${mn.tipo===d?t.ouro:t.borda}`,background:mn.tipo===d?`rgba(240,185,11,.12)`:t.card,color:mn.tipo===d?t.ouro:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{d}</button>
                              ))}
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                              <div><label style={lblP}>CTE {mn.tipo}</label><input value={mn.cte} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>MDF {mn.tipo}</label><input value={mn.mdf} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>{mn.tipo} (nº)</label><input value={mn.num} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>Valor (R$)</label><input type="number" value={mn.valor} onChange={e=>setWppDccMinutas(p=>p.map((m,i)=>i===idx?{...m,valor:e.target.value}:m))} placeholder="0,00" style={inpP} /></div>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>setWppDccMinutas(p=>[...p,{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}])} style={{background:`rgba(240,185,11,.07)`,border:`1px dashed rgba(240,185,11,.4)`,borderRadius:8,padding:"7px",color:t.ouro,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ Outra Minuta DCC</button>
                        {/* CTE Complementar */}
                        <div style={{background:`rgba(22,119,255,.04)`,borderRadius:8,border:`1px solid rgba(22,119,255,.2)`,padding:"8px 10px"}}>
                          <div style={{fontSize:10,fontWeight:700,color:t.azulLt,marginBottom:8}}>CTE COMPLEMENTAR DE DIÁRIAS</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                            <div><label style={lblP}>CTE COMP</label><input value={wppCteComp.cte} onChange={e=>setWppCteComp(p=>({...p,cte:e.target.value}))} style={inpP} /></div>
                            <div><label style={lblP}>MDF COMP</label><input value={wppCteComp.mdf} onChange={e=>setWppCteComp(p=>({...p,mdf:e.target.value}))} style={inpP} /></div>
                            <div><label style={lblP}>MAT COMP</label><input value={wppCteComp.mat} onChange={e=>setWppCteComp(p=>({...p,mat:e.target.value}))} style={inpP} /></div>
                          </div>
                        </div>
                      </>) : (<>
                        {/* Minutas Descarga MAM/MRM */}
                        {wppDscMinutas.map((mn,idx)=>(
                          <div key={idx} style={{background:`rgba(22,119,255,.04)`,borderRadius:8,border:`1px solid rgba(22,119,255,.2)`,padding:"8px 10px",marginTop:idx===0?8:0}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                              <span style={{fontSize:10,fontWeight:700,color:t.azulLt}}>{"MINUTA DESCARGA "+(wppDscMinutas.length>1?"("+(idx+1)+")":"")}</span>
                              {wppDscMinutas.length>1 && <button onClick={()=>setWppDscMinutas(p=>p.filter((_,i)=>i!==idx))} style={{background:"transparent",border:"none",color:t.danger,cursor:"pointer",padding:2,display:"inline-flex",alignItems:"center"}}><Icon n="x" s={13} c={t.danger} sw={2}/></button>}
                            </div>
                            <div style={{display:"flex",gap:6,marginBottom:6}}>
                              {["MAM","MRM"].map(tp=>(
                                <button key={tp} onClick={()=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,tipo:tp}:m))} style={{flex:1,padding:"6px",borderRadius:7,border:`1.5px solid ${mn.tipo===tp?t.azulLt:t.borda}`,background:mn.tipo===tp?`rgba(22,119,255,.12)`:t.card,color:mn.tipo===tp?t.azulLt:t.txt2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{tp}</button>
                              ))}
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                              <div><label style={lblP}>CTE {mn.tipo}</label><input value={mn.cte} onChange={e=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,cte:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>MDF {mn.tipo}</label><input value={mn.mdf} onChange={e=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,mdf:e.target.value}:m))} style={inpP} /></div>
                              <div><label style={lblP}>{mn.tipo} (nº)</label><input value={mn.num} onChange={e=>setWppDscMinutas(p=>p.map((m,i)=>i===idx?{...m,num:e.target.value}:m))} style={inpP} /></div>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>setWppDscMinutas(p=>[...p,{tipo:"MAM",cte:"",mdf:"",num:""}])} style={{background:`rgba(22,119,255,.07)`,border:`1px dashed rgba(22,119,255,.4)`,borderRadius:8,padding:"7px",color:t.azulLt,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ Outra Minuta Descarga</button>
                      </>)}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div style={{background:t.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.borda}`}}>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.txt2,fontWeight:700,marginBottom:7}}>Preview da mensagem</div>
                  <div style={{fontFamily:"monospace",fontSize:9,color:t.txt,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{gerarPag()}</div>
                </div>
              </div>

              <div style={{padding:"10px 14px 18px",borderTop:`1px solid ${t.borda}`,display:"flex",gap:8,flexShrink:0}}>
                <button onClick={()=>setWppPagModal(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
                <button onClick={()=>{
                  const tel=(mot?.tel||"").replace(/\D/g,"");
                  const rawMsg=gerarPag();
                  const url=tel?`https://wa.me/55${tel}?text=${encodeURIComponent(rawMsg)}`:`https://wa.me/?text=${encodeURIComponent(rawMsg)}`;
                  setWppPagModal(null); setWppFortes(false); setWppDccMinutas([{tipo:"D01-MAT",cte:"",mdf:"",num:"",valor:""}]); setWppCteComp({cte:"",mdf:"",mat:""}); setWppDscMinutas([{tipo:"MAM",cte:"",mdf:"",num:""}]);
                  setWppConfirmModal({url, displayText:rawMsg});
                }} style={{flex:1,borderRadius:10,padding:"12px 18px",cursor:"pointer",background:`rgba(37,211,102,.15)`,border:`1.5px solid rgba(37,211,102,.4)`,color:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  <Icon n="smartphone" s={15} c="currentColor"/> PREPARAR MENSAGEM
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ WHATSAPP CONFIRM MODAL ═══ */}
      {wppConfirmModal && (
        <div className="co-modal-overlay co-modal-overlay--center" style={{zIndex:"calc(var(--z-modal) + 10)"}} onClick={e=>{if(e.target===e.currentTarget)setWppConfirmModal(null);}}>
          <div style={{background:"var(--card)",border:"1px solid var(--borda)",borderRadius:20,width:"100%",maxWidth:460,boxShadow:"0 32px 64px rgba(0,0,0,.5)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"96vh"}}>
            {/* Header */}
            <div style={{padding:"14px 18px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid var(--borda)",background:"rgba(37,211,102,.06)",flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:9,background:"rgba(37,211,102,.15)",border:"1px solid rgba(37,211,102,.3)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="smartphone" s={18} c="#25D366"/></div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:"#25D366"}}>MENSAGEM WHATSAPP</div>
                <div style={{fontSize:9,color:"var(--text2)"}}>Copie o texto ou clique em Abrir no WhatsApp</div>
              </div>
              <button onClick={()=>setWppConfirmModal(null)} style={{background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",color:"var(--text2)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="x" s={16} c="var(--text2)" sw={2}/></button>
            </div>
            {/* Texto */}
            <div style={{flex:1,overflowY:"auto",padding:14}}>
              <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:"var(--text2)",fontWeight:700,marginBottom:6}}>Texto da mensagem</div>
              <pre style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text)",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"var(--bg)",border:"1px solid var(--borda)",borderRadius:10,padding:"12px 14px",margin:0}}>{wppConfirmModal.displayText}</pre>
            </div>
            {/* Botões */}
            <div style={{padding:"10px 14px 18px",borderTop:"1px solid var(--borda)",display:"flex",gap:8,flexShrink:0}}>
              <button onClick={()=>{navigator.clipboard.writeText(wppConfirmModal.displayText);showToast("✅ Texto copiado!","ok");}} style={{flex:"0 0 auto",background:"transparent",border:"1.5px solid var(--borda)",borderRadius:9,padding:"10px 14px",color:"var(--text2)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}><Icon n="clipboard" s={14} c="currentColor"/> COPIAR</button>
              <button onClick={()=>{window.open(wppConfirmModal.url,"_blank");setWppConfirmModal(null);}} style={{flex:1,borderRadius:10,padding:"12px 18px",cursor:"pointer",background:"rgba(37,211,102,.15)",border:"1.5px solid rgba(37,211,102,.4)",color:"#25D366",fontWeight:700,fontSize:14,letterSpacing:.5,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}><Icon n="smartphone" s={15} c="currentColor"/> ABRIR NO WHATSAPP</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
