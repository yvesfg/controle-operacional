import React from "react";

// PlanilhaAVB — Planilha exclusiva Açailândia AVB
// Sem código Suzano. Colunas, filtros e busca específicos AVB.

const MESES_PT = { "01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez" };
const REGISTROS_POR_PAGINA = 200;

const COLS = [
  {h:"Cód.",        k:"codigo",       w:"6%"},
  {h:"Carreg.",     k:"data_carr",    w:"7%"},
  {h:"Contratante", k:"contratante",  w:"12%"},
  {h:"Cliente",     k:"cliente",      w:"11%"},
  {h:"Motorista",   k:"nome",         w:"13%"},
  {h:"Placas",      k:"placa",        w:"9%"},
  {h:"Destino",     k:"destino",      w:"10%"},
  {h:"Status",      k:"status",       w:"7%"},
  {h:"Gerenc.",     k:"gerenc",       w:"7%"},
  {h:"Contrato",    k:"vl_contrato",  w:"7%"},
  {h:"ADT",         k:"adiant",       w:"6%"},
  {h:"Saldo",       k:"saldo",        w:"6%"},
  {h:"CTE",         k:"cte",          w:"5%"},
  {h:"MDF",         k:"mdf",          w:"5%"},
  {h:"NF",          k:"nf",           w:"4%"},
];

function toISO(d) {
  if (!d) return "";
  const s = String(d).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return s;
}

function parseYM(r) {
  const campos = [r.data_carr, r.data_homerico, r.data_manifesto, r.data_liberacao];
  for (const c of campos) {
    if (!c) continue;
    const str = String(c).trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) { const p = str.split("/"); return { ano: p[2], mes: p[1] }; }
    if (/^\d{4}-\d{2}-\d{2}/.test(str))   { const p = str.split("-"); return { ano: p[0], mes: p[1] }; }
  }
  return null;
}

export default function PlanilhaAVB({ ctx }) {
  const {
    DADOS,
    planilhaSortKey, setPlanilhaSortKey,
    planilhaSortDir, setPlanilhaSortDir,
    planilhaPagina, setPlanilhaPagina,
    abrirDetalhe,
    planilhaFiltroAno, setPlanilhaFiltroAno,
    planilhaFiltroMes, setPlanilhaFiltroMes,
    planilhaFiltroDataDe, setPlanilhaFiltroDataDe,
    planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
    planilhaBusca, setPlanilhaBusca,
    planilhaFiltroStatus, setPlanilhaFiltroStatus,
    planilhaFiltroContratante, setPlanilhaFiltroContratante,
    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,
    t, isMobile, ExportMenu,
  } = ctx;

  // ── Opções de filtro ────────────────────────────────────────
  const anosDisp = [...new Set(DADOS.map(r => parseYM(r)?.ano).filter(Boolean))].sort((a,b)=>b.localeCompare(a));

  const mesesDisp = [...new Set(
    DADOS.filter(r => !planilhaFiltroAno || parseYM(r)?.ano === planilhaFiltroAno)
         .map(r => parseYM(r)?.mes).filter(Boolean)
  )].sort();

  const contrats = [...new Set(DADOS.map(r=>(r.contratante||"").trim()).filter(Boolean))].sort();
  const gerencas = [...new Set(DADOS.map(r=>(r.gerenc||"").trim()).filter(Boolean))].sort();

  // ── Filtrar ─────────────────────────────────────────────────
  const dadosFiltrados = DADOS.filter(r => {
    const ym = parseYM(r);
    if (planilhaFiltroAno  && ym?.ano !== planilhaFiltroAno)  return false;
    if (planilhaFiltroMes  && ym?.mes !== planilhaFiltroMes)  return false;
    if (planilhaFiltroDataDe && toISO(r.data_carr||"") < planilhaFiltroDataDe) return false;
    if (planilhaFiltroDataAte && toISO(r.data_carr||"") > planilhaFiltroDataAte) return false;
    if (planilhaFiltroContratante && (r.contratante||"").trim() !== planilhaFiltroContratante) return false;
    if (planilhaFiltroGerenciadora && (r.gerenc||"").trim() !== planilhaFiltroGerenciadora) return false;
    if (planilhaBusca) {
      const q = planilhaBusca.trim().toLowerCase();
      const match = [r.codigo, r.nome, r.placa, r.placa2, r.cte, r.mdf, r.nf,
                     r.cliente, r.contratante, r.gerenc, r.destino, r.dt]
        .some(v => (v||"").toLowerCase().includes(q));
      if (!match) return false;
    }
    if (planilhaFiltroStatus && (r.status||"Sem Status") !== planilhaFiltroStatus) return false;
    return true;
  });

  // ── Ordenar ─────────────────────────────────────────────────
  const dadosSortados = planilhaSortKey
    ? [...dadosFiltrados].sort((a,b) => {
        const va = (a[planilhaSortKey]||"").toString().toLowerCase();
        const vb = (b[planilhaSortKey]||"").toString().toLowerCase();
        const isDate = /^\d{2}\/\d{2}\/\d{4}/.test(va)||/^\d{2}\/\d{2}\/\d{4}/.test(vb);
        if (isDate) {
          const toYMD = s => { const p=s.split("/"); return p.length===3?`${p[2]}${p[1]}${p[0]}`:s; };
          return planilhaSortDir==="asc" ? toYMD(va).localeCompare(toYMD(vb)) : toYMD(vb).localeCompare(toYMD(va));
        }
        return planilhaSortDir==="asc"
          ? va.localeCompare(vb,"pt-BR",{numeric:true})
          : vb.localeCompare(va,"pt-BR",{numeric:true});
      })
    : dadosFiltrados;

  const totalPaginas = Math.ceil(dadosSortados.length/REGISTROS_POR_PAGINA)||1;
  const paginaAtual  = Math.max(1, Math.min(planilhaPagina, totalPaginas));
  const inicio       = (paginaAtual-1)*REGISTROS_POR_PAGINA;
  const dadosExibir  = dadosSortados.slice(inicio, inicio+REGISTROS_POR_PAGINA);

  const toggleSort = k => {
    if (planilhaSortKey===k) setPlanilhaSortDir(d=>d==="asc"?"desc":"asc");
    else { setPlanilhaSortKey(k); setPlanilhaSortDir("asc"); }
  };

  const temFiltro = planilhaFiltroAno||planilhaFiltroMes||planilhaFiltroDataDe||planilhaFiltroDataAte
                  ||planilhaBusca||planilhaFiltroStatus||planilhaFiltroContratante||planilhaFiltroGerenciadora;

  const limparFiltros = () => {
    setPlanilhaFiltroAno(""); setPlanilhaFiltroMes("");
    setPlanilhaFiltroDataDe(""); setPlanilhaFiltroDataAte("");
    setPlanilhaBusca(""); setPlanilhaFiltroStatus("");
    setPlanilhaFiltroContratante(""); setPlanilhaFiltroGerenciadora("");
    setPlanilhaPagina(1);
  };

  const selStyle = active => ({
    fontSize:11, fontWeight:700, padding:"4px 8px", borderRadius:6,
    fontFamily:"var(--font-heading)",
    border:`1.5px solid ${active?"var(--accent)":"var(--border)"}`,
    background:active?"rgba(255,107,53,.1)":"var(--card)",
    color:active?"var(--accent)":"var(--text)", cursor:"pointer",
  });

  const pagBtn = disabled => ({
    padding:"4px 8px", fontSize:9,
    border:`1px solid ${disabled?"var(--border)":"var(--accent)"}`,
    borderRadius:4, cursor:disabled?"not-allowed":"pointer",
    background:"transparent",
    color:disabled?"var(--text3)":"var(--accent)", fontWeight:600,
  });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>

      {/* ── Barra de filtros ── */}
      <div className="co-filter-bar" style={{flexShrink:0}}>
        <span className="co-filter-bar__label">Filtrar:</span>

        <select value={planilhaFiltroAno}
          onChange={e=>{setPlanilhaFiltroAno(e.target.value);setPlanilhaPagina(1);}}
          style={selStyle(!!planilhaFiltroAno)}>
          <option value="">Todos os Anos</option>
          {anosDisp.map(a=><option key={a} value={a}>{a}</option>)}
        </select>

        <select value={planilhaFiltroMes}
          onChange={e=>{setPlanilhaFiltroMes(e.target.value);setPlanilhaPagina(1);}}
          style={selStyle(!!planilhaFiltroMes)}>
          <option value="">Todos os Meses</option>
          {mesesDisp.map(m=><option key={m} value={m}>{MESES_PT[m]||m}</option>)}
        </select>

        <select value={planilhaFiltroContratante||""}
          onChange={e=>{setPlanilhaFiltroContratante(e.target.value);setPlanilhaPagina(1);}}
          style={selStyle(!!planilhaFiltroContratante)}>
          <option value="">Contratante: Todos</option>
          {contrats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>

        <select value={planilhaFiltroGerenciadora||""}
          onChange={e=>{setPlanilhaFiltroGerenciadora(e.target.value);setPlanilhaPagina(1);}}
          style={selStyle(!!planilhaFiltroGerenciadora)}>
          <option value="">Gerenc.: Todas</option>
          {gerencas.map(g=><option key={g} value={g}>{g}</option>)}
        </select>

        <span style={{fontSize:9,color:"var(--text3)",fontFamily:"var(--font-mono)",letterSpacing:"0.08em",textTransform:"uppercase"}}>De:</span>
        <input type="date" value={planilhaFiltroDataDe}
          onChange={e=>{setPlanilhaFiltroDataDe(e.target.value);setPlanilhaPagina(1);}}
          style={{fontSize:11,fontWeight:600,padding:"4px 8px",borderRadius:6,
            border:`1.5px solid ${planilhaFiltroDataDe?"var(--accent)":"var(--border)"}`,
            background:planilhaFiltroDataDe?"rgba(255,107,53,.1)":"var(--card)",
            color:"var(--text)",height:28,width:130,cursor:"pointer"}}/>
        <span style={{fontSize:10,color:"var(--text3)"}}>até</span>
        <input type="date" value={planilhaFiltroDataAte}
          onChange={e=>{setPlanilhaFiltroDataAte(e.target.value);setPlanilhaPagina(1);}}
          style={{fontSize:11,fontWeight:600,padding:"4px 8px",borderRadius:6,
            border:`1.5px solid ${planilhaFiltroDataAte?"var(--accent)":"var(--border)"}`,
            background:planilhaFiltroDataAte?"rgba(255,107,53,.1)":"var(--card)",
            color:"var(--text)",height:28,width:130,cursor:"pointer"}}/>

        <input type="text"
          placeholder="Buscar código, motorista, placa, cliente, CTE..."
          value={planilhaBusca}
          onChange={e=>{setPlanilhaBusca(e.target.value);setPlanilhaPagina(1);}}
          style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:6,
            border:`1.5px solid ${planilhaBusca?"var(--accent)":"var(--border)"}`,
            background:planilhaBusca?"rgba(255,107,53,.1)":"var(--card)",
            color:"var(--text)",height:28,width:220,outline:"none",fontFamily:"var(--font-heading)"}}/>

        {planilhaFiltroStatus && (
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:9,fontWeight:700,
            padding:"3px 8px",borderRadius:6,background:"rgba(255,107,53,.12)",
            border:"1px solid rgba(255,107,53,.3)",color:"var(--accent)",fontFamily:"var(--font-heading)"}}>
            Status: {planilhaFiltroStatus}
            <button onClick={()=>{setPlanilhaFiltroStatus("");setPlanilhaPagina(1);}}
              style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",fontSize:11,lineHeight:1,padding:0,marginLeft:2}}>×</button>
          </span>
        )}

        {temFiltro && (
          <button onClick={limparFiltros}
            style={{fontSize:9,padding:"4px 8px",borderRadius:6,
              border:"1px solid var(--border)",background:"transparent",
              color:"var(--text2)",cursor:"pointer"}}>
            ✕ Limpar
          </button>
        )}

        <span style={{marginLeft:"auto",fontSize:10,fontFamily:"var(--font-mono)",color:"var(--text2)",fontWeight:600}}>
          {dadosFiltrados.length} de {DADOS.length} registros
        </span>
      </div>

      {/* ── Toolbar ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"8px 12px",background:"var(--surface)",borderBottom:"1px solid var(--border)",
        flexShrink:0,flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:10,fontFamily:"var(--font-mono)",color:"var(--text2)",fontWeight:600,letterSpacing:"0.02em"}}>
          {dadosFiltrados.length} registros · pág. {paginaAtual}/{totalPaginas}
          {planilhaSortKey && (
            <span style={{color:"var(--accent)",marginLeft:8}}>
              ord. por {planilhaSortKey} {planilhaSortDir==="asc"?"↑":"↓"}
              <button onClick={()=>{setPlanilhaSortKey(null);setPlanilhaSortDir("asc");}}
                style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:10,padding:"0 3px"}}>✕</button>
            </span>
          )}
        </span>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <button onClick={()=>setPlanilhaPagina(1)} disabled={paginaAtual===1} style={pagBtn(paginaAtual===1)}>⏮</button>
          <button onClick={()=>setPlanilhaPagina(p=>Math.max(1,p-1))} disabled={paginaAtual===1} style={pagBtn(paginaAtual===1)}>◀</button>
          <button onClick={()=>setPlanilhaPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaAtual===totalPaginas} style={pagBtn(paginaAtual===totalPaginas)}>▶</button>
          <button onClick={()=>setPlanilhaPagina(totalPaginas)} disabled={paginaAtual===totalPaginas} style={pagBtn(paginaAtual===totalPaginas)}>⏭</button>
        </div>
        {ExportMenu && (
          <ExportMenu
            dados={dadosFiltrados}
            cols={[
              {k:"codigo",l:"Código"},{k:"data_carr",l:"Carregamento"},{k:"contratante",l:"Contratante"},
              {k:"cliente",l:"Cliente"},{k:"nome",l:"Motorista"},{k:"cpf",l:"CPF"},
              {k:"placa",l:"Placa"},{k:"placa2",l:"Placa 2"},{k:"destino",l:"Destino"},
              {k:"status",l:"Status"},{k:"gerenc",l:"Gerenciadora"},
              {k:"vl_contrato",l:"VL Contrato"},{k:"adiant",l:"Adiantamento"},{k:"saldo",l:"Saldo"},
              {k:"cte",l:"CTE"},{k:"mdf",l:"MDF"},{k:"nf",l:"NF"},
              {k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"},
            ]}
            filename="planilha-avb"
            titulo="Planilha AVB — Açailândia"
          />
        )}
      </div>

      {/* ── Tabela ── */}
      <div style={{flex:1,overflowX:"auto",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <table className="ds-table ds-table--compact" style={{tableLayout:"fixed",minWidth:900}}>
          <colgroup>{COLS.map(c=><col key={c.k} style={{width:c.w}}/>)}</colgroup>
          <thead>
            <tr style={{background:"var(--surface)"}}>
              {COLS.map(c=>{
                const ativo = planilhaSortKey===c.k;
                return (
                  <th key={c.k} onClick={()=>toggleSort(c.k)}
                    style={{padding:"9px 6px",textAlign:"center",fontSize:9,fontFamily:"var(--font-mono)",
                      letterSpacing:"0.06em",textTransform:"uppercase",
                      color:ativo?"var(--accent)":"var(--text3)",
                      borderBottom:`2px solid ${ativo?"var(--accent)":"var(--border)"}`,
                      whiteSpace:"nowrap",position:"sticky",top:0,zIndex:1,
                      background:"var(--surface)",overflow:"hidden",textOverflow:"ellipsis",
                      cursor:"pointer",userSelect:"none",transition:"color .15s,border-color .15s",fontWeight:400}}>
                    <span style={{display:"flex",alignItems:"center",gap:3}}>
                      {c.h}
                      <span style={{fontSize:9,lineHeight:1,opacity:ativo?1:.35}}>
                        {ativo?(planilhaSortDir==="asc"?"▲":"▼"):"⇅"}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {dadosExibir.map((r,i)=>(
              <tr key={i}
                style={{cursor:"pointer",background:i%2===0?"transparent":"var(--bg)"}}
                onClick={()=>abrirDetalhe(r)}
                onMouseOver={e=>e.currentTarget.style.background="var(--surface)"}
                onMouseOut={e=>e.currentTarget.style.background=i%2===0?"transparent":"var(--bg)"}>
                {COLS.map(c=>{
                  let val = r[c.k];

                  // Placas agrupadas
                  if (c.k==="placa") val=[r.placa,r.placa2,r.placa3].filter(Boolean).join(" / ")||"—";

                  // Saldo: formatar número (sem zeros excessivos)
                  if (c.k==="saldo"||c.k==="adiant"||c.k==="vl_contrato") {
                    const n=parseFloat(String(val||"").replace(/[R$\s]/g,"").replace(",","."));
                    if (!isNaN(n) && n!==0) val="R$"+n.toFixed(2).replace(/(\.\d*?)0+$/,"$1").replace(/\.$/,"");
                  }

                  const isDocCol = ["cte","mdf","nf"].includes(c.k);
                  const isStatus = c.k==="status";
                  const statusUpper=(val||"").toUpperCase();
                  const isPend    = isStatus&&statusUpper==="PENDENTE";
                  const isCarreg  = isStatus&&statusUpper==="CARREGADO";
                  const hasVal    = val&&val!=="—"&&val!=="";

                  const cellColor = c.k==="codigo"       ? "var(--accent)"
                    : c.k==="placa"         ? "var(--green)"
                    : c.k==="data_carr"     ? "var(--yellow)"
                    : c.k==="contratante"   ? "var(--text)"
                    : isDocCol              ? (hasVal?"var(--green)":"var(--red)")
                    : isStatus              ? (isPend?"var(--yellow)":isCarreg?"var(--green)":"var(--text2)")
                    : "var(--text2)";

                  const isMono = ["codigo","placa","data_carr","data_agenda","cte","mdf","nf","adiant","saldo","vl_contrato"].includes(c.k);

                  return (
                    <td key={c.k} title={String(val||"")}
                      style={{padding:"7px 6px",borderBottom:"1px solid var(--border)",
                        fontSize:c.k==="codigo"?11:10,textAlign:"center",
                        fontFamily:isMono?"var(--font-mono)":"inherit",
                        color:cellColor,
                        fontWeight:c.k==="codigo"?700:400,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                        letterSpacing:c.k==="codigo"?"0.06em":0}}>
                      {isDocCol ? (hasVal ? "✓" : "✗") : (val||"—")}
                    </td>
                  );
                })}
              </tr>
            ))}
            {dadosExibir.length===0&&(
              <tr><td colSpan={COLS.length} style={{padding:24,textAlign:"center",color:"var(--text3)",fontSize:11}}>
                Nenhum registro encontrado
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
