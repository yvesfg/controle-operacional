import React from "react";

export default function ModalOcorrChegada({ ctx }) {
  const {
    ocorrChegadaAlert, setOcorrChegadaAlert,
    formData, setFormData,
    showToast,
    t, hIco, css, DESIGN,
  } = ctx;

  if (!ocorrChegadaAlert) return null;

  return (
    <div
      className="co-modal-overlay co-modal-overlay--center"
      onClick={()=>setOcorrChegadaAlert(false)}
    >
      <div style={{background:t.card,borderRadius:DESIGN.r.modal,padding:20,width:"100%",maxWidth:420,border:`1.5px solid rgba(232,130,12,.35)`,boxShadow:"0 24px 64px rgba(0,0,0,.6)",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:42,height:42,borderRadius:DESIGN.r.ico,background:"rgba(232,130,12,.12)",border:"1.5px solid rgba(232,130,12,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {hIco(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,"var(--cat-amber)",20,2)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:t.txt,letterSpacing:.3}}>Motorista Chegou ao Cliente</div>
            <div style={{fontSize:10,color:"var(--cat-amber)",fontWeight:600}}>{"Ocorrência/RO — registrar agora?"}</div>
          </div>
          <button onClick={()=>setOcorrChegadaAlert(false)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
            {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
          </button>
        </div>
        <div style={{fontSize:10,color:t.txt2,marginBottom:14,background:t.bg,borderRadius:DESIGN.r.sm,padding:"8px 12px",border:`1px solid ${t.borda}`,lineHeight:1.7}}>
          A <strong style={{color:t.txt}}>{"Ocorrência (RO)"}</strong> é inerente à existência de NFD e deve ser registrada a partir da chegada do motorista ao cliente. Se houver RO, preencha o número abaixo.
        </div>
        {/* Campo RO */}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:5}}>{"Nº RO (Registro de Ocorrência)"}</label>
          <input
            value={formData.ro||""}
            onChange={e=>setFormData(p=>({...p,ro:e.target.value}))}
            placeholder="Ex: RO-2024-001 ou deixe vazio se não houver"
            style={{...css.inp,fontSize:12,padding:"10px 12px"}}
            autoFocus
          />
        </div>
        {/* Ações */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setOcorrChegadaAlert(false)} style={{flex:1,background:`rgba(128,128,128,.08)`,border:`1.5px solid ${t.borda}`,borderRadius:DESIGN.r.inp,padding:"10px",color:t.txt2,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:DESIGN.fnt.b}}>
            Sem Ocorrência
          </button>
          <button onClick={()=>{
            setOcorrChegadaAlert(false);
            if(formData.ro) showToast(`✅ RO registrado: ${formData.ro}`,"ok");
          }} style={{flex:1,background:`linear-gradient(135deg,rgba(232,130,12,.2),rgba(232,130,12,.1))`,border:`1.5px solid rgba(232,130,12,.5)`,borderRadius:DESIGN.r.inp,padding:"10px",color:"var(--cat-amber)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:DESIGN.fnt.b,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {hIco(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,"var(--cat-amber)",14,2)} Confirmar RO
          </button>
        </div>
      </div>
    </div>
  );
}
