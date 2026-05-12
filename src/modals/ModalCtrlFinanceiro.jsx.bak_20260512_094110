import React from "react";

export default function ModalCtrlFinanceiro({ ctx }) {
  const pj = (v, def) => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : def); } catch { return def; } };

  const {
    relCtrlDccOpen, setRelCtrlDccOpen,
    relCtrlDccFrom, setRelCtrlDccFrom,
    relCtrlDccTo, setRelCtrlDccTo,
    DADOS, apontItems,
    t, hIco, fmtMoeda, showToast,
  } = ctx;

  return (
    <>
      {/* ═══ MODAL: PLANILHA CONTROLE FINANCEIRO OPERACIONAL ═══ */}
      {relCtrlDccOpen && (()=>{
        const gerarCtrlDcc = () => {
          if(!relCtrlDccFrom||!relCtrlDccTo){showToast("⚠️ Selecione o período","warn");return;}
          const [fyy,fmm,fdd] = relCtrlDccFrom.split("-").map(Number);
          const [tyy,tmm,tdd] = relCtrlDccTo.split("-").map(Number);
          const dFrom = new Date(fyy,fmm-1,fdd);
          const dTo   = new Date(tyy,tmm-1,tdd,23,59,59);
          const parseDataBr = s => {
            if(!s) return null;
            if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const p=s.split("/");return new Date(Number(p[2]),Number(p[1])-1,Number(p[0]));}
            if(/^\d{4}-\d{2}-\d{2}/.test(s)){const p=s.split("-");return new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));}
            return null;
          };
          const linhas = [];
          DADOS.forEach(reg=>{
            // Usa data_carr OU data_desc como referência do período
            const dataRef = reg.data_carr || reg.data_desc || "";
            const dtRef = parseDataBr(dataRef);
            if(!dtRef) return;
            if(dtRef<dFrom||dtRef>dTo) return;
            // Apontamento vinculado pela DT
            const apont = apontItems.find(a=>a.dt_rel===reg.dt)||null;
            // DCC minutas
            const dccs = pj(reg.minutas_dcc,[]);
            const dcc0 = dccs[0]||{};
            const dcc1 = dccs[1]||{};
            // CTE Complementares
            const cteCompObj = pj(reg.minutas_cte_comp,{});
            linhas.push({
              dt:           reg.dt||"",
              motorista:    reg.nome||"",
              cpf:          reg.cpf||"",
              placa:        reg.placa||"",
              status:       reg.status||"",
              data_carr:    reg.data_carr||"",
              data_desc:    reg.data_desc||"",
              origem:       reg.origem||"",
              destino:      reg.destino||"",
              cliente:      reg.cliente||"",
              vl_cte:       reg.vl_cte||"",
              vl_contrato:  reg.vl_contrato||"",
              adiant:       reg.adiant||"",
              saldo:        reg.saldo||"",
              diaria_prev:  reg.diaria_prev||"",
              diaria_pg:    reg.diaria_pg||"",
              data_manifesto: reg.data_manifesto||"",
              cte:          reg.cte||"",
              mdf:          reg.mdf||"",
              mat:          reg.mat||"",
              nf:           reg.nf||"",
              ro:           reg.ro||"",
              chegada:      reg.chegada||"",
              gerenc:       reg.gerenc||"",
              sgs:          reg.sgs||"",
              // CTE Complementares
              cte_comp:     cteCompObj.cte||"",
              mdf_comp:     cteCompObj.mdf||"",
              mat_comp:     cteCompObj.mat||"",
              // DCC D01-MAT (primeira minuta)
              dcc0_tipo:    dcc0.tipo||"",
              dcc0_cte:     dcc0.cte||"",
              dcc0_mdf:     dcc0.mdf||"",
              dcc0_num:     dcc0.num||"",
              dcc0_valor:   dcc0.valor||"",
              // DCC D05-MAR (segunda minuta)
              dcc1_tipo:    dcc1.tipo||"",
              dcc1_cte:     dcc1.cte||"",
              dcc1_mdf:     dcc1.mdf||"",
              dcc1_num:     dcc1.num||"",
              dcc1_valor:   dcc1.valor||"",
              // Apontamento vinculado
              apont_num:    apont?.numero||"",
              apont_frs:    apont?.frs_folha||"",
              apont_mes:    apont?.mes_ref||"",
              apont_filial: apont?.filial||"",
              apont_valor:  apont?.valor||"",
            });
          });
          if(linhas.length===0){showToast("Nenhum registro no período selecionado","warn");return;}
          const cols = [
            // Identificação
            {k:"dt",          l:"DT"},
            {k:"motorista",   l:"Motorista"},
            {k:"cpf",         l:"CPF"},
            {k:"placa",       l:"Placa"},
            {k:"status",      l:"Status"},
            // Datas e rota
            {k:"data_carr",   l:"Carregamento"},
            {k:"data_desc",   l:"Descarga"},
            {k:"origem",      l:"Origem"},
            {k:"destino",     l:"Destino"},
            {k:"cliente",     l:"Cliente"},
            // Financeiro
            {k:"vl_cte",      l:"Valor CTE (Empresa)"},
            {k:"vl_contrato", l:"Valor Motorista"},
            {k:"adiant",      l:"Adiantamento"},
            {k:"saldo",       l:"Saldo"},
            {k:"diaria_prev", l:"Diária Devida (R$)"},
            {k:"diaria_pg",   l:"Diária Paga (R$)"},
            // Documentação
            {k:"data_manifesto",l:"Data Manifesto"},
            {k:"cte",         l:"CTE"},
            {k:"mdf",         l:"MDF"},
            {k:"mat",         l:"MAT / Contrato"},
            {k:"nf",          l:"NF"},
            {k:"ro",          l:"RO"},
            {k:"chegada",     l:"Chegada no Cliente"},
            {k:"obs_chegada", l:"OBS Chegada"},
            {k:"obs_descarga",l:"OBS Descarga"},
            {k:"gerenc",      l:"Gerenciadora"},
            {k:"sgs",         l:"SGS"},
            // CTE Complementares
            {k:"cte_comp",    l:"CTE Comp."},
            {k:"mdf_comp",    l:"MDF Comp."},
            {k:"mat_comp",    l:"MAT Comp."},
            // DCC D01-MAT
            {k:"dcc0_tipo",   l:"DCC#1 Tipo"},
            {k:"dcc0_cte",    l:"DCC#1 CTE"},
            {k:"dcc0_mdf",    l:"DCC#1 MDF"},
            {k:"dcc0_num",    l:"DCC#1 Nº"},
            {k:"dcc0_valor",  l:"DCC#1 Valor"},
            // DCC D05-MAR
            {k:"dcc1_tipo",   l:"DCC#2 Tipo"},
            {k:"dcc1_cte",    l:"DCC#2 CTE"},
            {k:"dcc1_mdf",    l:"DCC#2 MDF"},
            {k:"dcc1_num",    l:"DCC#2 Nº"},
            {k:"dcc1_valor",  l:"DCC#2 Valor"},
            // Apontamento
            {k:"apont_num",   l:"Apontamento Nº"},
            {k:"apont_frs",   l:"FRS · Folha"},
            {k:"apont_mes",   l:"Mês Ref."},
            {k:"apont_filial",l:"Filial"},
            {k:"apont_valor", l:"Valor Apont."},
          ];
          const per = `${relCtrlDccFrom}_${relCtrlDccTo}`;
          exportODS(linhas, cols, `controle-financeiro-${per}`);
          showToast(`✅ Planilha gerada — ${linhas.length} registro(s)`,"ok");
          setRelCtrlDccOpen(false);
        };
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setRelCtrlDccOpen(false)}>
            <div style={{background:t.card,borderRadius:16,padding:20,width:"100%",maxWidth:440,border:`1px solid ${t.borda}`,boxShadow:"0 24px 64px rgba(0,0,0,.55)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(22,119,255,.12)",border:"1.5px solid rgba(22,119,255,.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {hIco(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></>,t.azulLt,20,1.8)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:t.txt}}>Planilha Controle Financeiro</div>
                  <div style={{fontSize:10,color:t.azulLt,fontWeight:600}}>Todos os dados operacionais do período</div>
                </div>
                <button onClick={()=>setRelCtrlDccOpen(false)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",padding:4}}>
                  {hIco(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,t.txt2,18,1.8)}
                </button>
              </div>
              <div style={{fontSize:10,color:t.txt2,marginBottom:14,background:t.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${t.borda}`,lineHeight:1.7}}>
                Exporta <strong style={{color:t.txt}}>todos os registros</strong> do período com todos os campos operacionais: DT, Motorista, CPF, Placa, Status, Datas, Origem/Destino, Cliente, <strong style={{color:t.verde}}>Financeiro</strong> (CTE, Contrato, ADT, Saldo, Diárias), Documentação (CTE, MDF, MAT, NF, RO), <strong style={{color:t.azulLt}}>CTE Comp.</strong>, DCC e Apontamentos vinculados.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:4}}>De (início)</label>
                  <input type="date" value={relCtrlDccFrom} onChange={e=>setRelCtrlDccFrom(e.target.value)} style={{width:"100%",background:t.bg,border:`1.5px solid ${t.borda2}`,borderRadius:8,padding:"9px 10px",color:t.txt,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:t.txt2,display:"block",marginBottom:4}}>Até (fim)</label>
                  <input type="date" value={relCtrlDccTo} onChange={e=>setRelCtrlDccTo(e.target.value)} style={{width:"100%",background:t.bg,border:`1.5px solid ${t.borda2}`,borderRadius:8,padding:"9px 10px",color:t.txt,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}} />
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setRelCtrlDccOpen(false)} style={{flex:"0 0 auto",background:"transparent",border:`1.5px solid ${t.borda}`,borderRadius:9,padding:"10px 16px",color:t.txt2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
                <button onClick={gerarCtrlDcc} style={{flex:1,background:`linear-gradient(135deg,rgba(22,119,255,.2),rgba(22,119,255,.1))`,border:`1.5px solid rgba(22,119,255,.5)`,borderRadius:9,padding:"10px",color:t.azulLt,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {hIco(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,t.azulLt,15,2)} Gerar Planilha .XLS
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
