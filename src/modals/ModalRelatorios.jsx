import React from "react";
import Toggle from "../components/Toggle.jsx";
import Icon from "../components/Icon.jsx";

export default function ModalRelatorios({ ctx }) {
  const {
    relGeralOpen, setRelGeralOpen,
    relGeralFrom, setRelGeralFrom, relGeralTo, setRelGeralTo,
    relGeralMotorista, setRelGeralMotorista, relGeralStatus, setRelGeralStatus,
    relGeralOrigem, setRelGeralOrigem, relGeralDestino, setRelGeralDestino,
    relGeralVinculo, setRelGeralVinculo, relGeralSecoes, setRelGeralSecoes,
    relGeralLoading, setRelGeralLoading, relGeralStatusOper, setRelGeralStatusOper,
    relDiariaOpen, setRelDiariaOpen,
    relDiariaFrom, setRelDiariaFrom, relDiariaTo, setRelDiariaTo,
    relDiariaMotorista, setRelDiariaMotorista, relDiariaVinculo, setRelDiariaVinculo,
    relDiariaStatus, setRelDiariaStatus,
    relDescargaOpen, setRelDescargaOpen,
    relDescargaFrom, setRelDescargaFrom, relDescargaTo, setRelDescargaTo,
    relDescargaMotorista, setRelDescargaMotorista, relDescargaStatus, setRelDescargaStatus,
    relOperOpen, setRelOperOpen,
    relOperFrom, setRelOperFrom, relOperTo, setRelOperTo,
    relOperSecoes, setRelOperSecoes,
    DADOS, motoristas,
    gerarRelatorioGeral, gerarRelatorioDiarias, gerarRelatorioDescargas, gerarRelatorioOperacional,
    t, hIco, css,
  } = ctx;

  return (
    <>
      {/* ═══ MODAL: RELATÓRIO GERAL ═══ */}
      {relGeralOpen && (
        <div className="co-modal-overlay co-modal-overlay--center" onClick={()=>setRelGeralOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:600,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}} onClick={e=>e.stopPropagation()}>
            {/* Cabeçalho */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(217,98,43,.12)`,border:`1.5px solid rgba(217,98,43,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {hIco(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,t.ouro,20,1.8)}
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório Geral de Operações</div>
                <div style={{fontSize:10,color:t.txt2}}>Configure os filtros e seções do relatório PDF</div>
              </div>
              <button onClick={()=>setRelGeralOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>

            {/* Período */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relGeralFrom} onChange={e=>setRelGeralFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relGeralTo} onChange={e=>setRelGeralTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>

            {/* Filtros */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Filtros</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {(()=>{
                const _uniq=(arr)=>[...new Set(arr.filter(Boolean))].sort();
                const _nomes=_uniq(DADOS.map(r=>(r.nome||"").trim()));
                const _origens=_uniq(DADOS.map(r=>(r.origem||"").trim()));
                const _destinos=_uniq(DADOS.map(r=>(r.destino||r.cidade||"").trim()));
                const _statuses=_uniq(DADOS.map(r=>(r.status||"").trim().toUpperCase()));
                const _vinculos=_uniq(motoristas.map(m=>(m.vinculo||"").trim()));
                return (<>
                  <div>
                    <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Motorista</label>
                    <select value={relGeralMotorista} onChange={e=>setRelGeralMotorista(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                      <option value="">Todos</option>
                      {_nomes.map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status Operacional</label>
                    <select value={relGeralStatusOper} onChange={e=>setRelGeralStatusOper(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                      <option value="">Todos</option>
                      {_statuses.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status Diária</label>
                    <select value={relGeralStatus} onChange={e=>setRelGeralStatus(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                      <option value="">Todos</option>
                      <option value="diaria">Com Diária</option>
                      <option value="sem_diaria">Sem Diária</option>
                      <option value="atraso">Perdeu Agenda</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Origem</label>
                    <select value={relGeralOrigem} onChange={e=>setRelGeralOrigem(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                      <option value="">Todas</option>
                      {_origens.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Destino</label>
                    <select value={relGeralDestino} onChange={e=>setRelGeralDestino(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                      <option value="">Todos</option>
                      {_destinos.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Vínculo</label>
                    <select value={relGeralVinculo} onChange={e=>setRelGeralVinculo(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                      <option value="">Todos</option>
                      {_vinculos.filter(v=>v).map(v=><option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </>);
              })()}
            </div>

            {/* Seções */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Seções do Relatório</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
              {[
                {k:"kpi",l:"Indicadores / KPIs"},
                {k:"sumario",l:"Resumo por Motorista"},
                {k:"registros",l:"Tabela de Registros"},
                {k:"sgs",l:"Ocorrências SGS"},
                {k:"ocorr_dt",l:"Ocorrências por DT"},
                {k:"diarias",l:"Diárias do Período"},
                {k:"descargas",l:"Descargas do Período"},
              ].map(({k,l})=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:`rgba(128,128,128,.05)`,borderRadius:8,border:`1px solid ${relGeralSecoes[k]?t.ouro+"44":t.borda}`,cursor:"pointer",transition:"all .15s"}}>
                  <Toggle checked={!!relGeralSecoes[k]} color={t.ouro} onChange={v=>setRelGeralSecoes(p=>({...p,[k]:v}))} />
                  <span style={{fontSize:11,fontWeight:600,color:relGeralSecoes[k]?t.txt:t.txt2}}>{l}</span>
                </label>
              ))}
            </div>

            {/* Colunas da Tabela de Registros */}
            {relGeralSecoes.registros&&(
              <details style={{marginBottom:16}}>
                <summary style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,cursor:"pointer",userSelect:"none",listStyle:"none",display:"flex",alignItems:"center",gap:6}}>
                  {hIco(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,t.ouro,13,1.8)}
                  Colunas da Tabela de Registros
                  <span style={{marginLeft:"auto",fontSize:9,color:t.txt2,fontWeight:400}}>({Object.values(relGeralColunas).filter(Boolean).length} selecionadas)</span>
                </summary>
                <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap",paddingLeft:4}}>
                  <button onClick={()=>setRelGeralColunas(p=>Object.fromEntries(Object.keys(p).map(k=>[k,true])))} style={{fontSize:9,padding:"2px 7px",borderRadius:5,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer"}}>Todas</button>
                  <button onClick={()=>setRelGeralColunas(p=>Object.fromEntries(Object.keys(p).map(k=>[k,false])))} style={{fontSize:9,padding:"2px 7px",borderRadius:5,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer"}}>Nenhuma</button>
                </div>
                <div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                  {[
                    {k:"dt",l:"Espelho"},
                    {k:"nome",l:"Motorista"},
                    {k:"placa",l:"Placa"},
                    {k:"origem",l:"Origem"},
                    {k:"destino",l:"Destino"},
                    {k:"cliente",l:"Cliente"},
                    {k:"data_carr",l:"Carregamento"},
                    {k:"data_agenda",l:"Agenda"},
                    {k:"chegada",l:"Chegada"},
                    {k:"data_desc",l:"Descarga"},
                    {k:"dias",l:"Dias"},
                    {k:"status",l:"Status Oper."},
                    {k:"vl_cte",l:"Vl. CTE"},
                    {k:"vl_contrato",l:"Vl. Contrato"},
                    {k:"adiant",l:"Adiantamento"},
                    {k:"saldo",l:"Saldo"},
                    {k:"diaria_prev",l:"Diária Prev."},
                    {k:"diaria_pg",l:"Diária Paga"},
                    {k:"cte",l:"CTE"},
                    {k:"mdf",l:"MDF-e"},
                    {k:"nf",l:"NF"},
                    {k:"mat",l:"MAT"},
                    {k:"ro",l:"RO"},
                    {k:"sgs",l:"SGS"},
                    {k:"obs",l:"Observação"},
                  ].map(({k,l})=>(
                    <label key={k} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 6px",borderRadius:6,border:`1px solid ${relGeralColunas[k]?t.ouro+"44":t.borda}`,cursor:"pointer",fontSize:10,background:relGeralColunas[k]?"rgba(217,98,43,.05)":"transparent",transition:"all .12s"}}>
                      <Toggle checked={!!relGeralColunas[k]} color={t.ouro} size={0.72} onChange={v=>setRelGeralColunas(p=>({...p,[k]:v}))} />
                      <span style={{color:relGeralColunas[k]?t.txt:t.txt2}}>{l}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}
            {/* Aviso */}
            <div style={{background:`rgba(217,98,43,.06)`,border:`1px solid rgba(217,98,43,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span style={{marginLeft:6}}>Deixe datas em branco para incluir <strong style={{color:t.ouro}}>todos os registros</strong>. Filtros podem ser combinados.</span>
            </div>

            {/* Botões */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelGeralOpen(false)}
                style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>
                Cancelar
              </button>
              <button
                disabled={relGeralLoading}
                onClick={async ()=>{
                  setRelGeralOpen(false);
                  // Se seção de ocorrências estiver ativa, pré-carrega do Supabase
                  if (relGeralSecoes.ocorr_dt !== false) {
                    setRelGeralLoading(true);
                    try {
                      // Calcula os DTs do período para pré-carregar suas ocorrências
                      const parseD2 = s => { if(!s)return null; if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(`${p[2]}-${p[1]}-${p[0]}`);} if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s); return null; };
                      const fromD2 = relGeralFrom ? new Date(relGeralFrom) : null;
                      const toD2 = relGeralTo ? new Date(relGeralTo) : null;
                      if(toD2) toD2.setHours(23,59,59,999);
                      const dtsNoPeriodo = DADOS.filter(r => {
                        const d = parseD2(r.data_carr || r.data_desc || r.chegada || "");
                        if(!d) return !fromD2 && !toD2;
                        if(fromD2 && d < fromD2) return false;
                        if(toD2 && d > toD2) return false;
                        return true;
                      }).map(r => r.dt).filter(Boolean);
                      await preCarregarOcorrencias(dtsNoPeriodo);
                    } catch { /* silencioso */ }
                    finally { setRelGeralLoading(false); }
                  }
                  gerarRelatorioGeral(relGeralFrom,relGeralTo,{
                    motorista:relGeralMotorista,statusDiaria:relGeralStatus,
                    statusOper:relGeralStatusOper,
                    origem:relGeralOrigem,destino:relGeralDestino,
                    vinculo:relGeralVinculo,secoes:relGeralSecoes,colunas:relGeralColunas
                  });
                  if(relGeralSecoes.apontamentos) setTimeout(()=>gerarRelatorioOperacional(relGeralFrom,relGeralTo,{sgs:false,apontamentos:true}),800);
                }}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:relGeralLoading?`rgba(217,98,43,.06)`:`rgba(217,98,43,.13)`,color:t.ouro,cursor:relGeralLoading?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s",opacity:relGeralLoading?.6:1}}>
                {relGeralLoading
                  ? <><span style={{fontSize:14,animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span> Buscando ocorrências...</>
                  : <>{hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,t.ouro,15,1.8)}Gerar Relatório PDF</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RELATÓRIO DIÁRIAS ═══ */}
      {relDiariaOpen && (
        <div className="co-modal-overlay co-modal-overlay--center" onClick={()=>setRelDiariaOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:560,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(217,98,43,.12)`,border:`1.5px solid rgba(217,98,43,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="bed" s={20} c={t.ouro}/></div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório de Diárias</div>
                <div style={{fontSize:10,color:t.txt2}}>Financeiro e status de diárias por período</div>
              </div>
              <button onClick={()=>setRelDiariaOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relDiariaFrom} onChange={e=>setRelDiariaFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relDiariaTo} onChange={e=>setRelDiariaTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Filtros</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Motorista</label>
                <input type="text" value={relDiariaMotorista} onChange={e=>setRelDiariaMotorista(e.target.value)} placeholder="Nome..." style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Vínculo</label>
                <select value={relDiariaVinculo} onChange={e=>setRelDiariaVinculo(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="Agregado">Agregado</option>
                  <option value="Terceiro">Terceiro</option>
                  <option value="Frota">Frota</option>
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status da Diária</label>
                <select value={relDiariaStatus} onChange={e=>setRelDiariaStatus(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="diaria">Com Diária</option>
                  <option value="sem_diaria">Sem Diária</option>
                  <option value="atraso">Perdeu Agenda</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
            </div>
            <div style={{background:`rgba(217,98,43,.06)`,border:`1px solid rgba(217,98,43,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span>Deixe datas em branco para <strong style={{color:t.ouro}}>todos os registros</strong>.</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelDiariaOpen(false)} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>Cancelar</button>
              <button onClick={()=>{setRelDiariaOpen(false);gerarRelatorioDiarias(relDiariaFrom,relDiariaTo,{motorista:relDiariaMotorista,vinculo:relDiariaVinculo,status:relDiariaStatus});}}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:`rgba(217,98,43,.13)`,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.ouro,15,1.8)}
                Gerar Relatório PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RELATÓRIO DESCARGAS ═══ */}
      {relDescargaOpen && (
        <div className="co-modal-overlay co-modal-overlay--center" onClick={()=>setRelDescargaOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:520,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(217,98,43,.12)`,border:`1.5px solid rgba(217,98,43,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="package" s={20} c={t.ouro}/></div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório de Descargas</div>
                <div style={{fontSize:10,color:t.txt2}}>Agenda, status e atrasos de descarga</div>
              </div>
              <button onClick={()=>setRelDescargaOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relDescargaFrom} onChange={e=>setRelDescargaFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relDescargaTo} onChange={e=>setRelDescargaTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Filtros</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Motorista</label>
                <input type="text" value={relDescargaMotorista} onChange={e=>setRelDescargaMotorista(e.target.value)} placeholder="Nome..." style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Status</label>
                <select value={relDescargaStatus} onChange={e=>setRelDescargaStatus(e.target.value)} style={{...css.inp,width:"100%",appearance:"none",cursor:"pointer"}}>
                  <option value="">Todos</option>
                  <option value="descarregado">Descarregado</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="pendente">Aguardando</option>
                </select>
              </div>
            </div>
            <div style={{background:`rgba(217,98,43,.06)`,border:`1px solid rgba(217,98,43,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span>Deixe datas em branco para <strong style={{color:t.ouro}}>todos os registros</strong>.</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelDescargaOpen(false)} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>Cancelar</button>
              <button onClick={()=>{setRelDescargaOpen(false);gerarRelatorioDescargas(relDescargaFrom,relDescargaTo,{motorista:relDescargaMotorista,status:relDescargaStatus});}}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:`rgba(217,98,43,.13)`,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,t.ouro,15,1.8)}
                Gerar Relatório PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RELATÓRIO OPERACIONAL ═══ */}
      {relOperOpen && (
        <div className="co-modal-overlay co-modal-overlay--center" onClick={()=>setRelOperOpen(false)}>
          <div style={{background:t.card,borderRadius:18,padding:28,width:"100%",maxWidth:500,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .22s cubic-bezier(.34,1.1,.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
              <div style={{width:42,height:42,borderRadius:11,background:`rgba(217,98,43,.12)`,border:`1.5px solid rgba(217,98,43,.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="clipboard" s={20} c={t.ouro}/></div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:t.txt,letterSpacing:.3}}>Relatório Operacional</div>
                <div style={{fontSize:10,color:t.txt2}}>SGS, Apontamentos e ID Diárias por período</div>
              </div>
              <button onClick={()=>setRelOperOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
              </button>
            </div>
            {/* Período */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Período</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Inicial</label>
                <input type="date" value={relOperFrom} onChange={e=>setRelOperFrom(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:9,fontWeight:600,color:t.txt2,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Data Final</label>
                <input type="date" value={relOperTo} onChange={e=>setRelOperTo(e.target.value)} style={{...css.inp,width:"100%"}} />
              </div>
            </div>
            {/* Seções */}
            <div style={{fontSize:10,fontWeight:700,color:t.ouro,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Seções do Relatório</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
              {[
                {k:"sgs",l:"Chamados SGS"},
                {k:"apontamentos",l:"Apontamentos (Descarga/Stretch)"},
              ].map(({k,l})=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:`rgba(128,128,128,.05)`,borderRadius:8,border:`1px solid ${relOperSecoes[k]?t.ouro+"44":t.borda}`,cursor:"pointer",transition:"all .15s"}}>
                  <Toggle checked={!!relOperSecoes[k]} color={t.ouro} onChange={v=>setRelOperSecoes(p=>({...p,[k]:v}))} />
                  <span style={{fontSize:11,fontWeight:600,color:relOperSecoes[k]?t.txt:t.txt2}}>{l}</span>
                </label>
              ))}
            </div>
            {/* Info */}
            <div style={{background:`rgba(217,98,43,.06)`,border:`1px solid rgba(217,98,43,.2)`,borderRadius:8,padding:"8px 12px",fontSize:10,color:t.txt2,marginBottom:18,display:"flex",alignItems:"flex-start",gap:6}}>
              {hIco(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,t.ouro,13,1.8)}
              <span>Deixe datas em branco para incluir <strong style={{color:t.ouro}}>todos os registros</strong>.</span>
            </div>
            {/* Botões */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setRelOperOpen(false)}
                style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${t.borda}`,background:"transparent",color:t.txt2,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>
                Cancelar
              </button>
              <button onClick={()=>{setRelOperOpen(false);gerarRelatorioOperacional(relOperFrom,relOperTo,relOperSecoes);}}
                style={{flex:2,padding:"11px",borderRadius:10,border:`1.5px solid ${t.ouro}44`,background:`rgba(217,98,43,.13)`,color:t.ouro,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,letterSpacing:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {hIco(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,t.ouro,15,1.8)}
                Gerar Relatório PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
