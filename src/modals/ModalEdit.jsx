import React from "react";

function ModalEditComponent({ ctx }) {
  const {
    formData, setFormData,
    modalOpen, setModalOpen,
    editIdx,
    excluirConfirm, setExcluirConfirm,
    excluirTexto, setExcluirTexto,
    DADOS, canFin,
    t, css, DESIGN,
    hIco,
    brToInput, brToInputDT, inputToBr, inputToBrDT,
    setNfdForm, setNfdFotos, setNfdAlertOpen,
    setOcorrChegadaAlert,
    salvarRegistro, deletarRegistro,
    baseAtual,
  } = ctx;

  if (modalOpen !== "edit") return null;

  const isWide = typeof window !== "undefined" && window.innerWidth >= 768;
  const isAvb = baseAtual?.id === "acailandia_avb";

  // ── ÍCONES ────────────────────────────────────────────────────────────
  const icoIdent = <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>;
  const icoRota  = <><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></>;
  const icoDocs  = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>;
  const icoFin   = <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>;
  const icoOp    = <><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></>;

  // ── SEÇÕES: COLUNA ESQUERDA — Quem / Onde ────────────────────────────
  const LEFT_SECTIONS = [
    {s:"Identificação", ico:icoIdent, fields:[
      {k:"nome",      l:"Motorista",   span:2},
      {k:"cpf",       l:"CPF"},
      {k:"placa",     l:"PLACA 01"},
      {k:"placa2",    l:"PLACA 02"},
      {k:"placa3",    l:"PLACA 03"},
      {k:"dt",        l:"DT / Espelho", lock:editIdx>=0},
      {k:"vinculo",   l:"Vínculo", type:"select_opts", opts:["TERCEIRO","FROTA","AGREGADO"]},
    ]},
    {s:"Rota", ico:icoRota, fields:[
      {k:"origem",    l:"Origem", type:"select_opts", opts:["IMPERATRIZ-MA","BELEM-PA"]},
      {k:"destino",   l:"Destino"},
    ]},
    {s:"Documentação", ico:icoDocs, fields:[
      {k:"cte",       l:"CTE"},
      {k:"mdf",       l:"MDF"},
      {k:"nf",        l:"Nota Fiscal"},
      {k:"mat",       l:"MAT"},
      {k:"ro",        l:"RO (Reg. Ocorrência)"},
      {k:"ro_hora",   l:"Hora RO"},
      {k:"ro_status", l:"Status RO", type:"select_opts", opts:["EM TRATATIVA","FINALIZADO"]},
      {k:"cliente",   l:"Cliente"},
      {k:"sgs",       l:"Chamado SGS"},
    ]},
  ];

  // ── SEÇÕES: COLUNA DIREITA — Quando / Quanto ─────────────────────────
  const RIGHT_SECTIONS = [
    {s:"Agenda", ico:icoRota, fields:[
      {k:"data_carr",   l:"Carregamento",                        type:"date"},
      {k:"data_agenda", l:"Agenda (DT PRV. P/ DESCARREGAR)",     type:"date_or_oc"},
      {k:"status",      l:"Status",                              type:"select_status"},
      ...(isAvb ? [{k:"data_final", l:"Data Final (Descarregado — encerra trânsito)", type:"date"}] : []),
      {k:"dias",        l:"Dias",                                type:"computed_dias", lock:true},
    ]},
    {s:"Financeiro", ico:icoFin, fields:[
      {k:"vl_cte",      l:"Valor CTE"},
      {k:"vl_contrato", l:"Valor Contrato"},
      {k:"adiant",      l:"Adiantamento"},
      {k:"saldo",       l:"Saldo"},
      {k:"diaria_prev", l:"Diária Devida (R$)"},
      {k:"diaria_pg",   l:"Diária Paga (R$)"},
      {k:"vl_cte_comp", l:"Valor CTE Comp."},
    ]},
    {s:"Operacional", ico:icoOp, fields:[
      {k:"chegada",          l:"Chegada (data real de chegada)",               type:"date"},
      {k:"desc_aguardando",  l:"Aguardando Descarga (marcar enquanto aguarda)",type:"checkbox", span:2},
      {k:"data_desc",        l:"Data e Hora da Descarga",                      type:"datetime"},
      {k:"informou_analista",l:"Informou analista até 9h?",                    type:"select_sim_nao"},
      {k:"data_manifesto",   l:"Manifesto",                                    type:"date"},
      {k:"gerenc",           l:"Gerenciadora", type:"select_opts", opts:["SKYMARK (FRETEBRAS)","INFINITY","MUNDIAL","OPENTECH"], span:2},
      {k:"forms",            l:"FORMS",                                        type:"select_sim_nao"},
    ]},
  ];

  // Mobile: coluna única na ordem lógica
  const ALL_SECTIONS = [
    LEFT_SECTIONS[0],   // Identificação
    LEFT_SECTIONS[1],   // Rota
    RIGHT_SECTIONS[0],  // Agenda
    RIGHT_SECTIONS[1],  // Financeiro
    LEFT_SECTIONS[2],   // Documentação
    RIGHT_SECTIONS[2],  // Operacional
  ];

  // ── RENDERIZA CAMPO ───────────────────────────────────────────────────
  function renderField(f, sectionName) {
    const isLocked = f.lock || (sectionName === "Financeiro" && !canFin);
    const isDescAguardando = f.k === "data_desc" && formData.desc_aguardando === "sim";
    const fieldVal = f.type === "date" ? brToInput(formData[f.k])
                   : f.type === "datetime" ? brToInputDT(formData[f.k])
                   : (formData[f.k] || "");
    return (
      <div key={f.k} style={{gridColumn:f.span===2?"1/-1":"auto",display:"flex",flexDirection:"column",gap:3}}>
        <label style={{fontSize:8,textTransform:"uppercase",letterSpacing:1.2,color:t.txt2,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
          {f.l} {isLocked && <span style={{color:t.ouro,fontSize:9}}>🔒</span>}
        </label>

        {f.type==="checkbox" ? (
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",borderRadius:DESIGN.r.inp,border:`1.5px solid ${formData[f.k]==="sim"?t.ouro:t.borda}`,background:formData[f.k]==="sim"?`rgba(240,185,11,.07)`:t.inputBg,transition:"border-color .15s"}}>
            <input type="checkbox" checked={formData[f.k]==="sim"} onChange={e=>{const checked=e.target.checked;setFormData(p=>({...p,[f.k]:checked?"sim":"", ...(checked?{data_desc:""}:{})}));}} style={{width:15,height:15,accentColor:t.ouro,cursor:"pointer"}} />
            <span style={{fontSize:11,color:formData[f.k]==="sim"?t.ouro:t.txt2,fontWeight:formData[f.k]==="sim"?700:400}}>
              {formData[f.k]==="sim" ? "⏳ Aguardando descarga" : "Marcar como Aguardando"}
            </span>
          </label>

        ) : f.type==="select_sim_nao" ? (
          <select value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} disabled={isLocked} style={{...css.inp,padding:"8px 10px",fontSize:12,appearance:"none",cursor:isLocked?"not-allowed":"pointer",opacity:isLocked?0.6:1}}>
            <option value="">— Selecione —</option>
            <option value="sim">✅ Sim</option>
            <option value="nao">❌ Não</option>
          </select>

        ) : f.type==="select_status" ? (
          <select value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} disabled={isLocked} style={{...css.inp,padding:"8px 10px",fontSize:12,appearance:"none",cursor:isLocked?"not-allowed":"pointer",opacity:isLocked?0.6:1}}>
            <option value="">— Selecione —</option>
            <option value="CARREGADO">📦 CARREGADO</option>
            <option value="PENDENTE">⏳ PENDENTE</option>
            <option value="NO-SHOW">🚫 NO-SHOW</option>
            <option value="NÃO ACEITE">❌ NÃO ACEITE</option>
            <option value="EM ABERTO">🔓 EM ABERTO</option>
            <option value="CANCELADO">🛑 CANCELADO</option>
          </select>

        ) : f.type==="select_opts" ? (
          <select value={formData[f.k]||""} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.value}))} disabled={isLocked} style={{...css.inp,padding:"8px 10px",fontSize:12,appearance:"none",cursor:isLocked?"not-allowed":"pointer",opacity:isLocked?0.6:1}}>
            <option value="">— Selecione —</option>
            {(f.opts||[]).map(o=><option key={o} value={o}>{o}</option>)}
          </select>

        ) : f.type==="date_or_oc" ? (
          (() => {
            const isOC = (formData[f.k]||"").toUpperCase().trim() === "OC";
            return (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={{display:"flex",alignItems:"center",gap:7,cursor:isLocked?"not-allowed":"pointer",padding:"6px 10px",borderRadius:DESIGN.r.inp,border:`1.5px solid ${isOC?t.ouro:t.borda}`,background:isOC?`rgba(240,185,11,.07)`:t.inputBg,transition:"border-color .15s"}}>
                  <input type="checkbox" disabled={isLocked} checked={isOC} onChange={e=>setFormData(p=>({...p,[f.k]:e.target.checked?"OC":""}))} style={{width:13,height:13,accentColor:t.ouro,cursor:isLocked?"not-allowed":"pointer"}} />
                  <span style={{fontSize:10,color:isOC?t.ouro:t.txt2,fontWeight:isOC?700:400,letterSpacing:.3}}>
                    {isOC ? "📋 OC – Ordem de Chegada" : "OC (sem data fixa)"}
                  </span>
                  {isLocked && <span style={{color:t.ouro,fontSize:9,marginLeft:"auto"}}>🔒</span>}
                </label>
                {!isOC && (
                  <input type="date" value={brToInput(formData[f.k])} readOnly={isLocked}
                    onClick={isLocked?()=>alert(`🔒 Este campo não pode ser alterado por este perfil.\nContate o administrador para realizar esta alteração.`):undefined}
                    onChange={isLocked?undefined:e=>setFormData(p=>({...p,[f.k]:inputToBr(e.target.value)}))}
                    style={{...css.inp,padding:"8px 10px",fontSize:12,cursor:isLocked?"not-allowed":"text",opacity:isLocked?0.5:1,background:t.inputBg}} />
                )}
              </div>
            );
          })()

        ) : f.type==="computed_dias" ? (
          (() => {
            const parseD = s => {
              if (!s) return null;
              if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const p=s.split("/"); return new Date(`${p[2]}-${p[1]}-${p[0]}`); }
              if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
              return null;
            };
            const da = parseD(formData.data_agenda);
            const dd = parseD(formData.data_desc);
            const diasCalc = da ? Math.max(0, Math.floor(((dd||new Date()) - da) / 86400000)) : null;
            const diasColor = diasCalc===null ? t.txt2 : diasCalc>3 ? t.danger : diasCalc>1 ? t.ouro : t.verde;
            return (
              <div style={{...css.inp,padding:"8px 10px",fontSize:12,cursor:"default",color:diasColor,fontWeight:700,background:t.inputBg,display:"flex",alignItems:"center",gap:6}}>
                📅 {diasCalc!==null ? diasCalc : "—"} {diasCalc!==null && (diasCalc===1?"dia":"dias")}
                <span style={{fontSize:9,color:t.txt2,fontWeight:400,marginLeft:4}}>auto</span>
              </div>
            );
          })()

        ) : (
          <input
            type={f.type==="datetime" ? "datetime-local" : (f.type||"text")}
            value={fieldVal}
            readOnly={isLocked || isDescAguardando}
            onClick={
              isLocked ? ()=>alert(`🔒 Este campo não pode ser alterado por este perfil.\nContate o administrador para realizar esta alteração.`)
              : isDescAguardando ? ()=>alert("⏳ Desmarque 'Aguardando Descarga' para inserir a data/hora.")
              : undefined
            }
            onChange={(isLocked||isDescAguardando) ? undefined : e => {
              const v = e.target.value;
              const newVal = f.type==="date" ? inputToBr(v) : f.type==="datetime" ? inputToBrDT(v) : v;
              setFormData(p=>({...p,[f.k]:newVal}));
              if (f.k==="data_desc" && v) {
                setNfdForm({numero:"",valor:"",tipo:"avaria"});
                setNfdFotos([]);
                setNfdAlertOpen(true);
                setFormData(p=>({...p,[f.k]:newVal, desc_aguardando:""}));
              }
              if (f.k==="chegada" && v) setOcorrChegadaAlert(true);
            }}
            style={{...css.inp,padding:"8px 10px",fontSize:12,cursor:(isLocked||isDescAguardando)?"not-allowed":"text",opacity:(isLocked||isDescAguardando)?0.5:1,background:isDescAguardando?`rgba(240,185,11,.04)`:t.inputBg}}
          />
        )}
      </div>
    );
  }

  // ── RENDERIZA SEÇÃO ───────────────────────────────────────────────────
  function renderSection(section, si) {
    return (
      <div key={si}>
        <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:2,color:t.azulLt,fontWeight:700,margin:"14px 0 8px",display:"flex",alignItems:"center",gap:6}}>
          {hIco(section.ico, t.azulLt, 10)} {section.s}
          <span style={{flex:1,height:1,background:`rgba(22,119,255,.12)`}} />
        </div>
        {section.s==="Financeiro" && !canFin && (
          <div style={{background:`rgba(240,185,11,.07)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:8,padding:"8px 10px",fontSize:10,color:t.ouro,marginBottom:8}}>
            🔒 Campos financeiros visíveis apenas para Admin/Gerente. Contate o administrador para alterar.
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          {section.fields.map(f => renderField(f, section.s))}
        </div>
      </div>
    );
  }

  // ── ESTILOS DO MODAL ──────────────────────────────────────────────────
  const modalStyle = isWide
    ? {...css.modal, width:"min(920px, 95vw)", maxWidth:"95vw", maxHeight:"96vh", display:"flex", flexDirection:"column"}
    : css.modal;

  return (
    <div style={css.overlay} onClick={e=>e.target===e.currentTarget&&setModalOpen(null)}>
      <div style={modalStyle}>

        {/* ── HEADER ── */}
        <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${t.borda}`,flexShrink:0}}>
          <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${editIdx>=0?t.ouroDk:t.azul},${editIdx>=0?t.ouro:t.azulLt})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {editIdx>=0
              ? hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>, null, 18, 2)
              : hIco(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="8 2 8 6 16 6 16 2"/></>, null, 18, 2)
            }
          </div>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:t.txt}}>{editIdx>=0 ? "EDITAR" : "NOVO REGISTRO"}</div>
            <div style={{fontSize:9,color:t.txt2}}>Preencha os dados</div>
          </div>
          <button onClick={()=>setModalOpen(null)} style={{marginLeft:"auto",background:"rgba(128,128,128,.1)",border:"none",borderRadius:7,width:44,height:44,cursor:"pointer",fontSize:16,color:t.txt2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* ── BODY ── */}
        {isWide ? (
          // Desktop: duas colunas lado a lado, cada uma com scroll independente
          <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>
            <div style={{flex:"0 0 50%",overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"4px 16px 16px",borderRight:`1px solid ${t.borda}`}}>
              {LEFT_SECTIONS.map((s, si) => renderSection(s, si))}
            </div>
            <div style={{flex:"0 0 50%",overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"4px 16px 16px"}}>
              {RIGHT_SECTIONS.map((s, si) => renderSection(s, si))}
            </div>
          </div>
        ) : (
          // Mobile: coluna única com scroll
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16,maxHeight:"calc(96vh - 120px)"}}>
            {ALL_SECTIONS.map((s, si) => renderSection(s, si))}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{display:"flex",flexDirection:"column",gap:0,flexShrink:0,borderTop:`1px solid ${t.borda}`}}>
          {excluirConfirm==="edit" && (
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px 8px",background:"rgba(220,38,38,.06)",borderBottom:`1px solid rgba(220,38,38,.2)`}}>
              <span style={{fontSize:11,color:"#ef4444",fontWeight:600,whiteSpace:"nowrap"}}>Digite EXCLUIR para confirmar:</span>
              <input
                autoFocus
                value={excluirTexto}
                onChange={e=>setExcluirTexto(e.target.value.toUpperCase())}
                onKeyDown={e=>{if(e.key==="Escape"){setExcluirConfirm(null);setExcluirTexto("");}}}
                placeholder="EXCLUIR"
                style={{flex:1,background:"rgba(220,38,38,.08)",border:`1.5px solid ${excluirTexto==="EXCLUIR"?"#ef4444":"rgba(220,38,38,.3)"}`,borderRadius:7,padding:"7px 10px",color:"#ef4444",fontSize:12,fontFamily:"inherit",fontWeight:700,letterSpacing:1,outline:"none"}}
              />
              <button onClick={()=>{if(excluirTexto==="EXCLUIR") deletarRegistro(DADOS[editIdx]?.dt);}} disabled={excluirTexto!=="EXCLUIR"} style={{background:excluirTexto==="EXCLUIR"?"#ef4444":"rgba(220,38,38,.2)",border:"none",borderRadius:7,padding:"7px 14px",color:"#fff",fontSize:11,fontWeight:700,cursor:excluirTexto==="EXCLUIR"?"pointer":"not-allowed",fontFamily:"inherit",opacity:excluirTexto==="EXCLUIR"?1:.6}}>CONFIRMAR</button>
              <button onClick={()=>{setExcluirConfirm(null);setExcluirTexto("");}} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:7,padding:"7px 10px",color:t.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
            </div>
          )}
          <div style={{display:"flex",gap:8,padding:"10px 16px 18px"}}>
            <button onClick={()=>setModalOpen(null)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 14px",color:t.txt2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>
            {editIdx>=0 && excluirConfirm!=="edit" && (
              <button onClick={()=>{setExcluirConfirm("edit");setExcluirTexto("");}} style={{flex:"0 0 auto",background:"rgba(220,38,38,.08)",border:`1.5px solid rgba(220,38,38,.3)`,borderRadius:9,padding:"10px 14px",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🗑️ EXCLUIR</button>
            )}
            <button onClick={salvarRegistro} style={{...css.btnGreen,flex:1,justifyContent:"center"}}>💾 SALVAR</button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ModalEditComponent;
