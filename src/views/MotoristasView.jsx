import React from "react";
import Toggle from "../components/Toggle.jsx";

export default function MotoristasView({ ctx }) {
  const {
    motoristas,
    motBusca, setMotBusca,
    motPagina, setMotPagina,
    motSelecionados, setMotSelecionados,
    motSugestOpen, setMotSugestOpen,
    motSugestData, setMotSugestData,
    motExcluirLoteTexto, setMotExcluirLoteTexto,
    motExcluirLoteOpen, setMotExcluirLoteOpen,
    motExcluirTodosOpen, setMotExcluirTodosOpen,
    motExcluirTodosTexto, setMotExcluirTodosTexto,
    motDupSugest, setMotDupSugest,
    relGeralOpen, setRelGeralOpen,
    DADOS,
    canEdit,
    hIco,
    gerarRelatorioMotorista,
    saveMotoristasLS,
    showToast,
    setFormData, setEditIdx, setModalOpen,
    t, css, DESIGN,
    perfil,
  } = ctx;

  // filtro de busca por nome ou placa (Item 3)
  const motFiltrados = motoristas.filter(m => {
    if (!motBusca.trim()) return true;
    const q = motBusca.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
    const nome = (m.nome||"").toUpperCase();
    const placas = [m.placa1,m.placa2,m.placa3,m.placa4].map(p=>(p||"").toUpperCase().replace(/[^A-Z0-9]/g,""));
    return nome.includes(motBusca.trim().toUpperCase()) || placas.some(p=>p.includes(q));
  });

  // exportar vCard
  const exportarVCard = () => {
    const vCards = motoristas.map(m => {
      const tel = (m.tel||"").replace(/\D/g,"");
      const nomeN = (m.nome||"").split(" "); const sobrenome = nomeN.pop()||""; const primeiro = nomeN.join(" ");
      return [
        "BEGIN:VCARD","VERSION:3.0",
        `FN:${m.nome||""}`,`N:${sobrenome};${primeiro};;;`,
        tel?`TEL;TYPE=CELL:+55${tel}`:"",
        m.cpf?`X-CPF:${m.cpf}`:"",
        m.placa1?`NOTE:Placa: ${[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).join(" | ")} | Vínculo: ${m.vinculo||"—"}`:"",
        "END:VCARD"
      ].filter(Boolean).join("\r\n");
    }).join("\r\n");
    const blob = new Blob([vCards], {type:"text/vcard;charset=utf-8"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "motoristas_yfgroup.vcf"; a.click();
    showToast(`📤 ${motoristas.length} contatos exportados!`,"ok");
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <input
          value={motBusca}
          onChange={e=>{setMotBusca(e.target.value);setMotPagina(1);}}
          placeholder="Buscar por nome ou placa cavalo..."
          style={{...css.inp,flex:1,minWidth:140}}
        />
        <button onClick={exportarVCard} title="Exportar todos como vCard (.vcf) para importar no Google Contacts" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11}}>📤 vCard</button>
        <button onClick={()=>{
          const PLACA_RE=/\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/g;
          const sugs=[];
          motoristas.forEach(mot=>{
            const impPlacas=[mot.placa1,mot.placa2,mot.placa3,mot.placa4].filter(Boolean).map(p=>p.toUpperCase().replace(/[^A-Z0-9]/g,""));
            if(!impPlacas.length)return;
            DADOS.forEach(reg=>{
              const regPlaca=(reg.placa||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
              if(!regPlaca||!impPlacas.includes(regPlaca))return;
              const nomeReg=(reg.nome||"").toUpperCase().trim();
              const nomeM=(mot.nome||"").toUpperCase().trim();
              if(nomeReg&&nomeReg===nomeM)return;
              sugs.push({mot,reg,placa:regPlaca,aceito:null});
            });
          });
          const uniq=sugs.filter((s,i)=>sugs.findIndex(x=>x.reg.dt===s.reg.dt&&x.mot.nome===s.mot.nome)===i);
          if(!uniq.length){showToast("✅ Nenhuma nova sugestão de vínculo encontrada","ok");return;}
          setMotSugestData(uniq.map(s=>({...s,aceito:null})));
          setMotSugestOpen(true);
        }} title="Cruzar placas dos motoristas com registros de viagem e sugerir vínculos" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11,background:`rgba(2,192,118,.1)`,border:`1px solid rgba(2,192,118,.25)`,color:t.verde}}>🔗 Sugerir Compatíveis</button>
        <button onClick={()=>setRelGeralOpen(true)} title="Gerar relatório geral de operações em PDF" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11,background:`rgba(240,185,11,.12)`,border:`1px solid rgba(240,185,11,.3)`,color:t.ouro}}>📊 Rel. Geral</button>
        {canEdit && <button onClick={()=>{setFormData({});setEditIdx(-1);setMotDupSugest(null);setModalOpen("motorista")}} style={{...css.btnGold,whiteSpace:"nowrap"}}>＋ NOVO</button>}
        {perfil==="admin" && motoristas.length>0 && (
          <button onClick={()=>{setMotExcluirTodosTexto("");setMotExcluirTodosOpen(true);}} title="Excluir TODOS os motoristas salvos" style={{...css.hBtn,whiteSpace:"nowrap",fontSize:11,background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.3)`,color:t.danger}}>
            🗑️ Excluir Todos
          </button>
        )}
      </div>
      {canEdit && motSelecionados.size > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:`rgba(246,70,93,.07)`,border:`1px solid rgba(246,70,93,.25)`,borderRadius:9,padding:"8px 12px"}}>
          <span style={{fontSize:11,fontWeight:700,color:t.danger,flex:1}}>{motSelecionados.size} selecionado(s)</span>
          {motSelecionados.size >= 2 && motSelecionados.size < motoristas.length && (
            <button onClick={()=>setMotSelecionados(new Set(motFiltrados.map(m=>motoristas.indexOf(m))))} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:6,padding:"4px 12px",fontSize:10,color:t.ouro,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Selecionar Todos ({motFiltrados.length})</button>
          )}
          <button onClick={()=>setMotSelecionados(new Set())} style={{background:"transparent",border:`1px solid ${t.borda}`,borderRadius:6,padding:"4px 10px",fontSize:10,color:t.txt2,cursor:"pointer",fontFamily:"inherit"}}>Desmarcar</button>
          <button onClick={()=>{setMotExcluirLoteTexto("");setMotExcluirLoteOpen(true);}} style={{background:`rgba(246,70,93,.1)`,border:`1px solid rgba(246,70,93,.3)`,borderRadius:6,padding:"4px 12px",fontSize:10,color:t.danger,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,12)} Excluir selecionados</button>
        </div>
      )}
      <div style={{fontSize:10,color:t.txt2,marginBottom:8,display:"flex",gap:8,alignItems:"center"}}>
        {motBusca
          ? <span>{motFiltrados.length} resultado{motFiltrados.length!==1?"s":""}</span>
          : <span>{motoristas.length} motorista{motoristas.length!==1?"s":""} cadastrado{motoristas.length!==1?"s":""}</span>
        }
        {motoristas.length>0 && <span style={{opacity:.6}}>· exibindo {Math.min(motPagina*50,motFiltrados.length)} de {motFiltrados.length}</span>}
      </div>
      {motoristas.length === 0 ? (
        <div style={css.empty}><div style={{fontSize:36,marginBottom:10}}>🚛</div><h3 style={{fontFamily:"var(--font-heading)",fontSize:15,fontWeight:600,letterSpacing:"-0.02em",color:"var(--text2)"}}>SEM MOTORISTAS</h3><p style={{fontSize:11,color:t.txt2}}>Clique em + NOVO para cadastrar.</p></div>
      ) : motFiltrados.length === 0 ? (
        <div style={css.empty}><div style={{fontSize:30,marginBottom:8}}>🔍</div><p style={{fontSize:12,color:t.txt2}}>Nenhum motorista encontrado para "{motBusca}"</p></div>
      ) : motFiltrados.slice(0, motPagina * 50).map((m,i) => {
        const idxReal = motoristas.indexOf(m);
        const selecionado = motSelecionados.has(idxReal);
        const vincBadgeC = m.vinculo==="Frota"?t.azulLt:m.vinculo==="Agregado"?t.ouro:m.vinculo==="Terceiro"?t.verde:t.txt2;
        const vincBadgeBg = m.vinculo==="Frota"?`rgba(22,119,255,.08)`:m.vinculo==="Agregado"?`rgba(240,185,11,.08)`:m.vinculo==="Terceiro"?`rgba(2,192,118,.08)`:`rgba(128,128,128,.06)`;
        return (
          <div key={i} className="co-card" style={{background:t.card,borderRadius:12,border:`1px solid ${selecionado?t.danger:vincBadgeC}`,padding:12,marginBottom:10,transition:"border .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              {canEdit && (
                <Toggle checked={selecionado} color={t.danger} size={0.85} onChange={()=>{
                  const ns=new Set(motSelecionados);
                  if(ns.has(idxReal))ns.delete(idxReal);else ns.add(idxReal);
                  setMotSelecionados(ns);
                }} />
              )}
              <div style={{width:38,height:38,borderRadius:9,background:`linear-gradient(135deg,${t.verdeDk},${t.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#000",flexShrink:0}}>{(m.nome||"M")[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:t.txt}}>{m.nome||"—"}</div>
                <div style={{fontSize:10,color:t.txt2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {m.cpf && <span>{m.cpf}</span>}
                  {m.vinculo && <span style={{background:vincBadgeBg,border:`1px solid ${vincBadgeC}33`,borderRadius:4,padding:"1px 6px",color:vincBadgeC,fontWeight:700,fontSize:9,textTransform:"uppercase"}}>{m.vinculo}</span>}
                </div>
              </div>
              <button onClick={()=>gerarRelatorioMotorista(m)} title="Relatório PDF deste motorista" style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.25)`,borderRadius:6,width:36,height:36,minWidth:36,minHeight:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,t.ouro,14)}</button>
              {canEdit && <>
                <button onClick={()=>{setFormData({...m});setEditIdx(idxReal);setMotDupSugest(null);setModalOpen("motorista")}} style={{background:`rgba(22,119,255,.1)`,border:`1px solid rgba(22,119,255,.18)`,borderRadius:6,width:36,height:36,minWidth:36,minHeight:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,t.azulLt,14)}</button>
                <button onClick={()=>{if(window.confirm(`Excluir "${m.nome}"?`)){const nm=[...motoristas];nm.splice(idxReal,1);saveMotoristasLS(nm);showToast("🗑️ Removido");}}} style={{background:`rgba(246,70,93,.08)`,border:`1px solid rgba(246,70,93,.18)`,borderRadius:6,width:36,height:36,minWidth:36,minHeight:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{hIco(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,t.danger,14)}</button>
              </>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:m.tel||m.banco?6:0}}>
              {[m.placa1,m.placa2,m.placa3,m.placa4].filter(Boolean).map((p,j) => (
                <span key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:j===0?t.ouro:t.verde,background:j===0?`rgba(240,185,11,.07)`:`rgba(2,192,118,.07)`,border:`1px solid ${j===0?`rgba(240,185,11,.2)`:`rgba(2,192,118,.15)`}`,borderRadius:4,padding:"2px 7px"}}>{p}</span>
              ))}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,fontSize:10,color:t.txt2}}>
              {m.tel && (m.tel.split(/[,;\n\/\\|]+/).map(s=>s.trim()).filter(Boolean)).map((tel,ti)=>(
                <span key={ti}>📞 {tel}</span>
              ))}
              {m.banco && <span>🏦 {m.banco}{m.agencia?` · Ag ${m.agencia}`:""}{m.conta?` · CC ${m.conta}`:""}</span>}
              {m.pix_tipo && <span style={{color:t.azulLt}}>PIX {m.pix_tipo}: {m.pix_chave||"—"}</span>}
            </div>
          </div>
        );
      })}
      {motFiltrados.length > motPagina * 50 && (
        <button onClick={()=>setMotPagina(p=>p+1)} style={{width:"100%",padding:12,borderRadius:10,border:`1px solid ${t.borda}`,background:t.card2,color:t.ouro,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
          ▼ Carregar mais ({motFiltrados.length - motPagina*50} restantes)
        </button>
      )}
    </div>
  );
}
