import React from "react";
import { getPerfil } from "../operacao/perfil.js";
import KpiCard     from '../components/KpiCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import DataRow     from '../components/DataRow.jsx';
import SectionCard from '../components/SectionCard.jsx';
import PageHeader  from '../components/PageHeader.jsx';
import { Table }   from '../design-system/components/Table.jsx';
import { Badge }   from '../design-system/components/Badge.jsx';
import { parseData, clickable, ultimasViagens } from "../utils.js";
import { contarSemDtAguardando } from "../cargasSemDt.js";
import { verKpi, verBloco } from "../dashboardConfig.js";

export default function DashboardView({ ctx }) {
  const {
    dashMes, setDashMes,
    dashOrigem, setDashOrigem,
    dashHeroTab, setDashHeroTab,
    dashRecentesN, setDashRecentesN,
    dashRecCardRef,
    dashData,
    canFin,
    parseData: parseDataCtx,
    t, css, DESIGN, hexRgb, hIco, showToast,
    setActiveTab,
    chartAreaRef, chartDonutRef,
    diariasData, motoristas,
    alertas, alertasOpen, setAlertasOpen,
    fmtMoeda, isMobile,
    setDetalheDT, setModalOpen,
    setDashDrillModal,
    descargaData,
    setPlanilhaFiltroStatus,
    setPlanilhaFiltroDestino,
    setBuscaInput, setBuscaTipo, setBuscaModalOpen,
    baseAtual, filtroTipoCarga, getConexao,
    setPlanilhaFiltroContratante,
    perms, dashCfg, setBaseAtual, basesPermitidas,
  } = ctx;

  // Painel por usuario (hub_user_modulos.config.dash) -- ver dashboardConfig.js.
  // Chave ausente = visivel, entao quem nao tem config segue com o painel cheio.
  const verK = (k) => verKpi(dashCfg, k);
  const verB = (k) => verBloco(dashCfg, k);

  // Navegacao so quando o usuario TEM a aba de destino. Um perfil sem Planilha
  // (gestor) clicava num KPI e caia numa tela vazia -- e "Motoristas Ativos"
  // apontava pra "motoristas", que nunca foi aba: e secao dentro de Cadastros.
  const podeAba = (k) => !k || perms?.[k] !== false;
  const nav = (tab) => (podeAba(tab) ? () => setActiveTab(tab) : undefined);
  const navProps = (tab, antes) => (podeAba(tab)
    ? clickable(() => { antes?.(); setActiveTab(tab); })
    : {});

  // Indicador "Sem DT" — cargas reais que ficaram sem DT (ex.: sistema Suzano fora do ar).
  // Lê a fila controle_operacional_sem_dt (pendente+confirmado) SEM tocar no DADOS global.
  // Só na base Imperatriz/Belém (única com a fila); segue o filtro de tipo de carga do topo.
  const [semDtAguardando, setSemDtAguardando] = React.useState(0);
  React.useEffect(() => {
    if (!getPerfil(baseAtual?.id).features.semDt || !getConexao) { setSemDtAguardando(0); return; }
    const conn = getConexao();
    if (!conn) return;
    let cancel = false;
    const tipo = filtroTipoCarga && filtroTipoCarga !== "todos" ? filtroTipoCarga : null;
    // Só PENDENTES (a revisar): as confirmadas já entram no DADOS/Carregamentos (com badge),
    // então contá-las aqui seria dobrar. Este card é o que ainda espera a sua decisão.
    contarSemDtAguardando(conn, tipo, dashMes, ["pendente"]).then(n => { if (!cancel) setSemDtAguardando(n); }).catch(() => {});
    return () => { cancel = true; };
  }, [baseAtual, filtroTipoCarga, getConexao, dashMes]);

  // Perfil da operacao: cada KPI/bloco declara a feature que exige, em vez de existir
  // um dashboard por base. Antes disso a AVB tinha tela propria (views/avb/DashboardAVB).
  const perfil = getPerfil(baseAtual?.id);
  const temDoc = perfil.features.rastreamentoDocumental;

  // Efetivada = saiu do status PENDENTE. Base do rastreamento documental.
  const efet    = dashData.filtrado.filter(r=>(r.status||"").toUpperCase()!=="PENDENTE");
  const pendN   = dashData.filtrado.length - efet.length;
  const semCTE  = efet.filter(r=>!r.cte||!String(r.cte).trim());
  const semMDF  = efet.filter(r=>!r.mdf||!String(r.mdf).trim());
  const semNF   = efet.filter(r=>!r.nf ||!String(r.nf ).trim());
  const docOk   = efet.filter(r=>r.cte&&r.mdf&&r.nf).length;
  const taxaDoc = efet.length>0 ? Math.round(docOk/efet.length*100) : 0;
  const docColor= taxaDoc>=95 ? t.verde : taxaDoc>=80 ? t.ouro : t.danger;
  const incompletas = efet.filter(r=>!r.cte||!r.mdf||!r.nf)
    .map(r=>({...r, falta:[!r.cte&&"CTE",!r.mdf&&"MDF",!r.nf&&"NF"].filter(Boolean)}))
    .slice(0,20);

  // Ranking por cliente/contratante (feature rankingCliente). O campo depende da
  // operacao: quem chama de "Contratante" grava em `contratante`; o resto usa `cliente`.
  const campoCli = perfil.rotuloCliente === "Contratante" ? "contratante" : "cliente";
  const normC = x => (x||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().trim().replace(/\s+/g," ");
  const fmtV  = v => v>=1000 ? "R$"+(v/1000).toFixed(1)+"k" : v>0 ? "R$"+Math.round(v).toLocaleString("pt-BR") : "R$ 0";
  const cMap = {};
  if (perfil.features.rankingCliente) efet.forEach(r=>{
    const raw=(r[campoCli]||"").trim(); const c=normC(raw); if(!c) return;
    if(!cMap[c]) cMap[c]={viagens:0,comDoc:0,vlr:0,raw};
    cMap[c].viagens++;
    if(r.cte&&r.mdf&&r.nf) cMap[c].comDoc++;
    const v=parseFloat(String(r.vl_contrato||"").replace(/[R$\s]/g,"").replace(",","."));
    if(!isNaN(v)) cMap[c].vlr+=v;
  });
  const topCli = Object.entries(cMap).sort((a,b)=>b[1].viagens-a[1].viagens);
  const maxVg = topCli[0]?.[1]?.viagens || 1;
  const medalhas = ["🥇","🥈","🥉"];
  const podColors = ["var(--accent)","var(--rank-silver)","var(--rank-bronze)"];

  const motsUniq = new Set(dashData.filtrado.map(r=>r.nome).filter(Boolean));
  const carregadosN = dashData.filtrado.length;
  const heroNum = dashHeroTab==="cte" && canFin
    ? (dashData.cteT>=1000 ? "R$ "+(dashData.cteT/1000).toFixed(1)+"k" : "R$ "+Math.round(dashData.cteT).toLocaleString("pt-BR"))
    : String(carregadosN);
  const heroLabel = dashHeroTab==="cte" ? "Receita CTE no Período" : "Carregamentos no Período";

  const statusMapDash={};
  dashData.filtrado.forEach(r=>{const s=(r.status||"Sem Status");statusMapDash[s]=(statusMapDash[s]||0)+1;});
  const statusArrDash = Object.entries(statusMapDash).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const DONUT_LEGEND = [t.azul, t.laranja, t.danger, t.verde]; // fallback chart — tokens (ver DESIGN.md Status)
  const totalStatusDash = statusArrDash.reduce((a,[,v])=>a+v,0);

  const STATUS_COLOR_MAP = {
    Carregado: t.azul,    CARREGADO: t.azul,
    Pendente:  t.laranja, PENDENTE:  t.laranja,
    "No-Show": t.danger, "NO-SHOW": t.danger,
    "Não aceite": "var(--text3)", "NÃO ACEITE": "var(--text3)",
  };

  const recentesDash = [...dashData.filtrado]
    .filter(r=>r.nome)
    .sort((a,b)=>{const da=parseData(a.data_carr),db=parseData(b.data_carr);return db&&da?db-da:0;})
    .slice(0,10);

  const statusVariant = s => {
    const u=(s||"").toUpperCase();
    if(u.includes("CARREGAD")) return "info";
    if(u.includes("ENTREG")) return "success";
    if(u.includes("AGUARD")||u.includes("PEND")) return "warning";
    if(u.includes("CANCEL")||u.includes("NO-SHOW")) return "danger";
    return "default";
  };
  const recentesColumns = [
    {
      key: "nome", label: "Motorista", sortable: true,
      render: (_, r) => {
        const partes = (r.nome||"").split(" ").filter(Boolean);
        const nomeExib = partes.length>=2 ? `${partes[0]} ${partes[1]}` : partes[0]||"?";
        const initials = partes.map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
        return (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:t.card2,border:`1px solid ${t.borda}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:t.txt2,flexShrink:0}}>{initials}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,color:t.txt,textTransform:"capitalize",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nomeExib.toLowerCase()}</div>
              {r.placa && <div style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--font-mono)"}}>{r.placa}</div>}
            </div>
          </div>
        );
      },
    },
    { key: "dt", label: "DT", sortable: true, mono: true },
    {
      key: "rota", label: "Rota",
      render: (_, r) => {
        const origemCurta=(r.origem||"").split(/[-–\s]+/)[0].trim();
        const destinoCurto=(r.destino||"").split(/[-–\s]+/)[0].trim();
        return origemCurta&&destinoCurto ? `${origemCurta} → ${destinoCurto}` : (origemCurta||destinoCurto||"—");
      },
    },
    {
      key: "status", label: "Status", sortable: true,
      render: v => <Badge variant={statusVariant(v)} dot size="sm">{v||"—"}</Badge>,
    },
    ...(canFin ? [{
      key: "vl_cte", label: "Valor", align: "right", sortable: true, mono: true,
      render: v => v && parseFloat(v)>0 ? fmtMoeda(parseFloat(v)) : "—",
    }] : []),
  ];

  return (
    <div style={{padding:isMobile?"16px 12px":"24px"}}>

      {/* ── Filtros ── */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
        <select value={dashMes} onChange={e=>setDashMes(e.target.value)} style={{...css.inp,width:"auto",padding:"3px 8px",fontSize:10,height:26,cursor:"pointer",border:`1.5px solid ${dashMes!=="todos"?t.ouro:t.borda}`,color:dashMes!=="todos"?t.ouro:t.txt2,fontWeight:700,fontFamily:DESIGN.fnt.b}}>
          <option value="todos">Mês: Todos</option>
          {dashData.meses.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        {dashOrigem!=="todos" && (
          <button onClick={()=>setDashOrigem("todos")} style={{marginLeft:4,fontSize:10,background:"transparent",border:`1px solid ${hexRgb(t.danger,.3)}`,borderRadius:DESIGN.r.tag,color:t.danger,cursor:"pointer",padding:"3px 9px",fontFamily:DESIGN.fnt.b}}>✕ {dashOrigem==="BELEM"?"BELEM-PA":dashOrigem==="IMPERATRIZ"?"IMPERATRIZ-MA":dashOrigem}</button>
        )}
        {dashOrigem==="todos" && dashData.cidades.length>0 && (
          <select onChange={e=>setDashOrigem(e.target.value)} value={dashOrigem} style={{...css.inp,width:"auto",padding:"3px 8px",fontSize:10,height:26,cursor:"pointer",marginLeft:4}}>
            <option value="todos">Origem: Todas</option>
            {dashData.cidades.map(c=><option key={c} value={c}>{c==="BELEM"?"BELEM-PA":c==="IMPERATRIZ"?"IMPERATRIZ-MA":c}</option>)}
          </select>
        )}
      </div>

      {/* ── KPI Strip ── */}
      {(()=>{
        const carregadoN = statusMapDash["Carregado"]||statusMapDash["CARREGADO"]||0;
        const taxaEfic = totalStatusDash>0?Math.round(carregadoN/totalStatusDash*100):0;
        const cteMed = dashData.filtrado.length>0&&canFin ? dashData.cteT/dashData.filtrado.length : 0;
        const comD = diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso");
        const totalDevD = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_prev)||0),0);
        const totalPgD  = comD.reduce((s,{r})=>s+(parseFloat(r.diaria_pg)||0),0);
        const saldoD = totalDevD-totalPgD;

        // Tendência mensal (últimos 6 meses) — vem de dashData.grupos, que é global (não filtrado
        // por mês/origem do dashboard), então o sparkline sempre mostra o histórico completo.
        const mesesT = dashData.meses.slice(-6);
        const pctDelta = arr => {
          if (arr.length < 2) return null;
          const prev = arr[arr.length-2], cur = arr[arr.length-1];
          if (!prev) return null;
          return ((cur-prev)/prev)*100;
        };
        const carregTrend = mesesT.map(m=>dashData.grupos[m].regs.length);
        const cteTrend     = mesesT.map(m=>Math.round(dashData.grupos[m].cte));
        const dtsTrend     = mesesT.map(m=>dashData.grupos[m].dts.size);
        const motsTrend    = mesesT.map(m=>dashData.grupos[m].mots.size);
        const cteMedTrend  = mesesT.map(m=>{const r=dashData.grupos[m].regs.length; return r?dashData.grupos[m].cte/r:0;});
        const efic = m => {const regs=dashData.grupos[m].regs; if(!regs.length) return 0; const ok=regs.filter(r=>(r.status||"")==="Carregado"||(r.status||"")==="CARREGADO").length; return Math.round(ok/regs.length*100);};
        const eficTrend    = mesesT.map(efic);

        const kpis = [
          {id:"hero",label:dashHeroTab==="cte"?"Receita CTE":"Carregamentos",value:heroNum,sub:"no período",trend:dashHeroTab==="cte"?cteTrend:carregTrend,delta:pctDelta(dashHeroTab==="cte"?cteTrend:carregTrend),click:()=>setDashHeroTab(dashHeroTab==="cte"?"carr":"cte")},
          {id:"eficiencia",label:"Taxa Eficiência",value:`${taxaEfic}%`,sub:`${carregadoN} carregados`,trend:eficTrend,delta:pctDelta(eficTrend)},
          // "DTs Únicas" so faz sentido onde a ancora do registro E o DT (AVB ancora por codigo).
          ...(perfil.ancora==="dt"?[{id:"dts",label:"DTs Únicas",value:String(dashData.dtsU.size),sub:"documentos",trend:dtsTrend,delta:pctDelta(dtsTrend),click:nav("planilha")}]:[]),
          ...(temDoc?[
            {id:"efetivadas",label:"Cargas Efetivadas",value:String(efet.length),sub:`${pendN} pendente${pendN!==1?"s":""}`,color:t.verde},
            {id:"taxa_doc",label:"Taxa Documental",value:`${taxaDoc}%`,sub:`${docOk}/${efet.length} doc completa`,color:docColor},
          ]:[]),
          // "Sem DT" — carga real aguardando DT (fila separada; NÃO entra no DADOS/nos totais acima).
          ...(getPerfil(baseAtual?.id).features.semDt && semDtAguardando>0 ? [{id:"sem_dt",label:"Sem DT · revisar",value:String(semDtAguardando),sub:(filtroTipoCarga&&filtroTipoCarga!=="todos"?filtroTipoCarga+" · ":"")+"clique p/ decidir",danger:true,icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="12" y1="9" x2="12.01" y2="9"/></>,click:nav("planilha")}]:[]),
          {id:"motoristas",label:"Motoristas Ativos",value:String(motsUniq.size),sub:`de ${motoristas.length} cadastrados`,trend:motsTrend,delta:pctDelta(motsTrend),click:nav("cadastros")},
          ...(canFin?[{id:"cte_medio",label:"CTE Médio/Viagem",value:cteMed>=1000?"R$"+(cteMed/1000).toFixed(1)+"k":cteMed>0?"R$"+Math.round(cteMed).toLocaleString("pt-BR"):"—",sub:"por carregamento",trend:cteMedTrend,delta:pctDelta(cteMedTrend)}]:[]),
          ...(canFin && perfil.features.diarias?[{id:"diarias",label:"Diárias a Pagar",value:saldoD>0?(saldoD>=1000?"R$"+(saldoD/1000).toFixed(1)+"k":"R$"+Math.round(saldoD).toLocaleString("pt-BR")):"Quitado",sub:`de ${fmtMoeda(totalDevD)} devido`,danger:saldoD>0,icon:<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,click:nav("diarias")}]:[]),
          {id:"alertas",label:"Alertas Ativos",value:String(alertas.length),sub:alertas.length===0?"tudo em ordem":"atenção necessária",danger:alertas.length>0,icon:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,click:()=>setAlertasOpen(!alertasOpen)},
        ].filter(k=>verK(k.id));
        if (!kpis.length) return null;
        return (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":`repeat(${kpis.length},1fr)`,gap:isMobile?6:10,marginBottom:14}}>
            {kpis.map((k,i)=>(
              <KpiCard key={i} label={k.label} value={k.value} sub={k.sub} danger={k.danger}
                icon={k.icon && hIco(k.icon,"var(--text3)",isMobile?10:11)} trend={k.trend} deltaPct={k.delta}
                deltaLabel="vs mês anterior" onClick={k.click} compact={isMobile} />
            ))}
          </div>
        );
      })()}

      {/* -- Comparativo por base (so no modo "Todas as bases") --
           O consolidado sem esta tabela responde "quanto deu no total" mas nao
           "qual base puxou pra baixo", que e a pergunta seguinte de quem olha. */}
      {baseAtual?.consolidado && verB("por_base") && (()=>{
        const porBase = {};
        dashData.filtrado.forEach(r=>{
          const id = r._baseId || "—";
          if(!porBase[id]) porBase[id] = { id, label: r._baseLabel || id, n:0, cte:0, contrato:0 };
          porBase[id].n++;
          const c = parseFloat(r.vl_cte); if(!isNaN(c)) porBase[id].cte += c;
          let vc = String(r.vl_contrato||"").replace(/[R$\s]/g,"");
          if (vc.includes(",")) vc = vc.replace(/\./g,"").replace(",",".");
          const k = parseFloat(vc); if(!isNaN(k)) porBase[id].contrato += k;
        });
        const linhas = Object.values(porBase).sort((a,b)=>b.n-a.n);
        if(!linhas.length) return null;
        const irParaBase = (id) => {
          const b = (basesPermitidas||[]).find(x=>x.id===id);
          if (b && setBaseAtual) setBaseAtual(b);
        };
        return (
          <div style={{...css.card,padding:18,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Por base</span>
              <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>clique para abrir a base</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:420}}>
                <thead>
                  <tr style={{color:t.txt2,fontSize:10,textTransform:"uppercase",letterSpacing:".05em"}}>
                    <th style={{textAlign:"left",padding:"6px 4px"}}>Base</th>
                    <th style={{textAlign:"right",padding:"6px 4px"}}>Cargas</th>
                    {canFin && <th style={{textAlign:"right",padding:"6px 4px"}}>Receita CTE</th>}
                    {canFin && <th style={{textAlign:"right",padding:"6px 4px"}}>Margem</th>}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(l=>{
                    const margem = l.cte - l.contrato;
                    return (
                      <tr key={l.id} {...clickable(()=>irParaBase(l.id))}
                        style={{borderTop:`1px solid ${t.borda}`,cursor:"pointer"}}
                        onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.06)}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{padding:"8px 4px",color:t.txt,fontWeight:600}}>{l.label}</td>
                        <td style={{padding:"8px 4px",textAlign:"right",color:t.txt}}>{l.n}</td>
                        {canFin && <td style={{padding:"8px 4px",textAlign:"right",color:t.txt}}>{fmtMoeda(l.cte)}</td>}
                        {canFin && <td style={{padding:"8px 4px",textAlign:"right",fontWeight:700,color:margem<0?t.danger:t.verde}}>{fmtMoeda(margem)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Main Grid: Chart | Status DTs | Top Motoristas ── */}
      {(verB("grafico")||verB("status")||verB("motoristas"))&&(()=>{
        const motCount={};
        dashData.filtrado.forEach(r=>{if(r.nome){if(!motCount[r.nome])motCount[r.nome]={ct:0,placa:r.placa||""};motCount[r.nome].ct++;if(!motCount[r.nome].placa&&r.placa)motCount[r.nome].placa=r.placa;}});
        const topMot=Object.entries(motCount).sort((a,b)=>b[1].ct-a[1].ct).slice(0,5);
        const maxMot=topMot[0]?.[1]?.ct||1;
        return (
          <div style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:"stretch",gap:14,marginBottom:14}}>

            {/* ─ Area Chart ─ */}
            {verB("grafico")&&<div style={{...css.card,padding:18,display:"flex",flexDirection:"column",minWidth:0,flex:isMobile?"none":"2 1 0"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Evolução do Período</div>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button onClick={()=>setDashHeroTab("carr")} style={{padding:"3px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,borderRadius:20,border:`1px solid ${dashHeroTab==="carr"?t.txt:hexRgb(t.txt,.18)}`,background:dashHeroTab==="carr"?t.txt:"transparent",color:dashHeroTab==="carr"?t.bg:t.txt2}}>Carregamentos</button>
                    {canFin&&<button onClick={()=>setDashHeroTab("cte")} style={{padding:"3px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:DESIGN.fnt.b,borderRadius:20,border:`1px solid ${dashHeroTab==="cte"?t.txt:hexRgb(t.txt,.18)}`,background:dashHeroTab==="cte"?t.txt:"transparent",color:dashHeroTab==="cte"?t.bg:t.txt2}}>Receita CTE</button>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:28,fontWeight:700,letterSpacing:"-0.04em",color:"var(--text)",lineHeight:1}}>{heroNum}</div>
                  <div style={{fontSize:10,color:t.verde}}>↗ {heroLabel}</div>
                </div>
              </div>
              <div style={{height:200}}><canvas ref={chartAreaRef} /></div>
            </div>}

            {/* ─ Status DTs — barra horizontal stacked ─ */}
            {verB("status")&&<div style={{...css.card,padding:18,display:"flex",flexDirection:"column",minWidth:0,flex:isMobile?"none":"1 1 0"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>{perfil.ancora==="dt"?"Status das DTs":"Status das Cargas"}</span>
                <span style={{fontFamily:DESIGN.fnt.h,fontSize:14,fontWeight:700,color:t.txt,letterSpacing:"-0.02em"}}>{totalStatusDash}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{height:10,background:t.bg,borderRadius:4,overflow:"hidden",display:"flex",gap:2}}>
                  {statusArrDash.map(([nome,val],i)=>(
                    <div key={nome} title={nome} aria-label={`${nome}: ${val} (${totalStatusDash>0?((val/totalStatusDash)*100).toFixed(0):0}%)`} {...navProps("planilha",()=>setPlanilhaFiltroStatus(nome))} style={{width:`${totalStatusDash>0?(val/totalStatusDash)*100:0}%`,background:STATUS_COLOR_MAP[nome]||DONUT_LEGEND[i],height:"100%",cursor:"pointer"}}/>
                  ))}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {statusArrDash.map(([nome,val],i)=>(
                    <div key={nome} {...navProps("planilha",()=>setPlanilhaFiltroStatus(nome))} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderRadius:6,padding:"2px 4px",margin:"0 -4px",transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:STATUS_COLOR_MAP[nome]||DONUT_LEGEND[i],flexShrink:0}}/>
                      <span style={{flex:1,fontSize:13,color:t.txt2}}>{nome}</span>
                      <span style={{fontFamily:DESIGN.fnt.b,fontVariantNumeric:"tabular-nums",fontSize:13,fontWeight:500}}>{val}</span>
                      <span style={{fontFamily:DESIGN.fnt.b,fontSize:11,color:"var(--text3)",minWidth:34,textAlign:"right"}}>{totalStatusDash>0?((val/totalStatusDash)*100).toFixed(0):0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>}

            {/* ─ Top Motoristas ─ */}
            {verB("motoristas")&&<div style={{...css.card,padding:18,display:"flex",flexDirection:"column",minWidth:0,flex:isMobile?"none":"1 1 0"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Top Motoristas</span>
                <button onClick={()=>setDashDrillModal({type:"motoristas",label:"Todos os Motoristas",regs:dashData.filtrado})} style={{fontSize:10,color:"var(--text3)",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:isMobile?"15px 10px":"6px 4px",margin:isMobile?"-15px -10px":"-6px -4px",display:"inline-flex",alignItems:"center"}}>Ver todos ›</button>
              </div>
              {topMot.length===0?(
                <div style={{textAlign:"center",padding:20,color:t.txt2,fontSize:11}}>Sem dados</div>
              ):topMot.map(([nome,{ct,placa}],i)=>{
                const initials=(nome||"?").split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase();
                const pct=Math.round(ct/maxMot*100);
                const nomeCompleto=(nome||"").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
                const handleClickMot=()=>{
                  const ultimas=ultimasViagens(dashData.filtrado,nome,5);
                  if(!ultimas.length)return;
                  setDashDrillModal({type:"motorista",label:nomeCompleto,regs:ultimas});
                };
                return (
                  <div key={nome} {...clickable(handleClickMot)} style={{marginBottom:i<topMot.length-1?14:0,cursor:"pointer",borderRadius:8,padding:"6px 6px 8px",margin:`0 -6px ${i<topMot.length-1?14:0}px`,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:t.card2,border:`1px solid ${t.borda}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:t.txt2,flexShrink:0}}>{initials}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:600,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeCompleto}</div>
                        {placa&&<div style={{fontSize:10,color:t.txt2,fontFamily:"var(--font-mono)",letterSpacing:.5,marginTop:1}}>{placa}</div>}
                      </div>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:13,fontWeight:600,color:t.txt,fontVariantNumeric:"tabular-nums",flexShrink:0}}>{ct}</span>
                    </div>
                    <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:t.ouro,borderRadius:2}}/>
                    </div>
                  </div>
                );
              })}
            </div>}

          </div>
        );
      })()}

      {/* -- Rastreamento Documental (feature rastreamentoDocumental) --
           Painel CTE/MDF/NF: nasceu na tela exclusiva da AVB e virou feature, porque
           qualquer operacao documental precisa disso. */}
      {temDoc && verB("documental") && (
        <div style={{...css.card,padding:18,marginBottom:14,border:`1px solid ${hexRgb(docColor,.5)}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Rastreamento Documental</div>
              <div style={{fontSize:10,color:t.txt2,marginTop:3}}>Cargas efetivadas com documento faltante — clique para abrir</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:800,color:docColor,letterSpacing:"-0.04em",lineHeight:1}}>{taxaDoc}%</div>
              <div style={{fontSize:9,color:"var(--text3)"}}>cobertura doc.</div>
            </div>
          </div>
          <div style={{height:6,borderRadius:3,background:t.card2,overflow:"hidden",marginBottom:14}}>
            <div style={{height:"100%",width:"100%",transform:`scaleX(${taxaDoc/100})`,transformOrigin:"left",
              background:`linear-gradient(90deg,var(--accent),${t.verde})`,borderRadius:3,transition:"transform .5s"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:incompletas.length>0?14:0}}>
            {[{label:"Sem CTE",count:semCTE.length},{label:"Sem MDF",count:semMDF.length},{label:"Sem NF",count:semNF.length}].map(({label,count})=>(
              <KpiCard key={label} label={label} value={count} sub={count>0?"cargas pendentes":"✓ completo"}
                color={count>0?undefined:t.verde} danger={count>0} compact />
            ))}
          </div>
          {incompletas.length > 0 && (
            <div style={{borderTop:`1px solid ${t.borda}`,paddingTop:12}}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:9,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",marginBottom:8}}>Cargas com pendência documental</div>
              <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:200,overflowY:"auto"}}>
                {incompletas.map((r,i)=>{
                  const nomeExib=(r.nome||"").split(" ").filter(Boolean).slice(0,2).join(" ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
                  const destCurto=(r.destino||"—").split(/\s*[-–]\s*/)[0].trim();
                  return (
                    <div key={i} {...clickable(()=>{setDetalheDT(r);setModalOpen("detalhe");})}
                      style={{display:"flex",alignItems:"center",gap:8,padding:isMobile?"14px 8px":"5px 8px",borderRadius:6,cursor:"pointer",background:"transparent",transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=t.card2}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        {r.falta.map(doc=>(
                          <span key={doc} style={{background:"rgba(246,70,93,.1)",border:"1px solid rgba(246,70,93,.3)",borderRadius:3,padding:"1px 5px",fontSize:8,fontWeight:700,color:t.danger,fontFamily:"var(--font-mono)"}}>{doc}</span>
                        ))}
                      </div>
                      <span style={{flex:1,fontSize:10,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeExib}</span>
                      <span style={{fontSize:9,color:t.txt2,flexShrink:0}}>{destCurto}</span>
                      {r.data_carr&&<span style={{fontSize:9,color:"var(--text3)",fontFamily:"var(--font-mono)",flexShrink:0}}>{String(r.data_carr).slice(0,5)}</span>}
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {incompletas.length === 0 && efet.length > 0 && (
            <div style={{textAlign:"center",padding:"12px 0",color:t.verde,fontSize:11,fontWeight:600}}>
              ✓ Toda documentação completa no período
            </div>
          )}
        </div>
      )}

      {/* -- Ranking por cliente/contratante (feature rankingCliente) -- */}
      {perfil.features.rankingCliente && verB("ranking") && topCli.length > 0 && (
        <div style={{...css.card,padding:18,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>{perfil.rotuloCliente}s</span>
            <span style={{fontSize:9,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{topCli.length} ativos</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(topCli.length,3)},1fr)`,gap:8,marginBottom:topCli.length>3?14:0}}>
            {topCli.slice(0,3).map(([nome,{viagens,comDoc,vlr,raw}],i)=>{
              const ef=viagens>0?Math.round(comDoc/viagens*100):0;
              const abrir=()=>{ setPlanilhaFiltroContratante?.(raw); setActiveTab("planilha"); };
              return (
                <div key={nome} {...clickable(abrir)} title={`Ver cargas de ${raw}`}
                  style={{background:t.bg,border:`2px solid ${i===0?"var(--accent)":t.borda}`,borderRadius:10,padding:"12px 8px",textAlign:"center",cursor:"pointer",transition:"background .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.06)}
                  onMouseLeave={e=>e.currentTarget.style.background=t.bg}>
                  <div style={{fontSize:20,marginBottom:4,lineHeight:1}}>{medalhas[i]}</div>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:i===0?13:11,fontWeight:700,color:podColors[i],letterSpacing:"-0.02em",lineHeight:1.2,marginBottom:6,textTransform:"capitalize",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nome.toLowerCase()}</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:i===0?24:18,fontWeight:800,color:t.txt,lineHeight:1,marginBottom:2}}>{viagens}</div>
                  <div style={{fontSize:8,color:t.txt2,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>viagens</div>
                  {i===0&&canFin&&<div style={{fontSize:10,color:t.verde,fontFamily:"var(--font-mono)",fontWeight:600,marginBottom:3}}>{fmtV(vlr)}</div>}
                  <div style={{fontSize:8,color:ef>=90?t.verde:ef>=70?t.ouro:t.danger}}>{ef}% doc</div>
                </div>
              );
            })}
          </div>
          {topCli.slice(3).map(([nome,{viagens,comDoc,raw}],i,arr)=>{
            const pct=Math.round(viagens/maxVg*100);
            const ef=viagens>0?Math.round(comDoc/viagens*100):0;
            const abrir=()=>{ setPlanilhaFiltroContratante?.(raw); setActiveTab("planilha"); };
            return (
              <div key={nome} {...clickable(abrir)} title={`Ver cargas de ${raw}`}
                style={{cursor:"pointer",borderRadius:6,padding:"3px 6px",margin:i<arr.length-1?"0 -6px 5px -6px":"0 -6px",transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.06)}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:10,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6,textTransform:"capitalize"}}>{nome.toLowerCase()}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                    <span style={{fontSize:9,color:ef>=90?t.verde:ef>=70?t.ouro:t.danger}}>{ef}% doc</span>
                    <span style={{fontSize:10,fontWeight:600,color:t.txt,fontFamily:"var(--font-mono)"}}>{viagens}</span>
                  </div>
                </div>
                <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"var(--accent)",borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom: Registros Recentes + Painel Operacional ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 2fr",gap:14,alignItems:"start"}}>

        {/* Registros Recentes */}
        {verB("recentes")&&<div ref={dashRecCardRef} style={{display:"flex",flexDirection:"column",minHeight:0}}>
          <Table
            columns={recentesColumns}
            data={recentesDash.slice(0,dashRecentesN)}
            onRowClick={r=>{setDetalheDT(r);setModalOpen("detalhe");}}
            compact
            emptyText="Sem dados no período"
            toolbar={
              <div className="ds-table-toolbar">
                <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Registros Recentes</span>
                <button onClick={()=>setActiveTab("planilha")} style={{fontSize:10,color:"var(--text3)",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,display:"inline-flex",alignItems:"center"}}>Ver Tudo ›</button>
              </div>
            }
          />
        </div>}

        {/* Painel Operacional: Diárias + Descargas + Top Pendentes */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          <>
          {/* Diárias */}
          {verB("diarias")&&<div style={{...css.card,padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Diárias</span>
              <button onClick={()=>setActiveTab("diarias")} style={{fontSize:10,color:"var(--text3)",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:isMobile?"15px 10px":"6px 4px",margin:isMobile?"-15px -10px":"-6px -4px",display:"inline-flex",alignItems:"center"}}>Ver ›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[
                {l:"No Prazo",       v:diariasData.ok,    tag:"● ok",       tagC:t.verde},
                {l:"Perdeu Agenda",  v:diariasData.atraso, tag:"● atenção",  tagC:t.ouro},
                {l:"Aguardando",     v:diariasData.pend,  tag:"● pendente", tagC:"var(--text3)"},
              ].map(d=>(
                <div key={d.l} {...clickable(()=>setActiveTab("diarias"))} style={{background:t.bg,border:`1px solid ${t.borda}`,borderRadius:8,padding:12,cursor:"pointer"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-0.03em",color:t.txt,lineHeight:1,marginBottom:3,fontVariantNumeric:"tabular-nums"}}>{d.v}</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text3)",lineHeight:1.3}}>{d.l}</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.04em",color:d.tagC,marginTop:3}}>{d.tag}</div>
                </div>
              ))}
            </div>
            {canFin&&(()=>{
              const comD2=diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso");
              const dev2=comD2.reduce((s,{r})=>s+(parseFloat(r.diaria_prev)||0),0);
              const pg2=comD2.reduce((s,{r})=>s+(parseFloat(r.diaria_pg)||0),0);
              const sld2=dev2-pg2;
              if(!dev2)return null;
              const pct=dev2>0?Math.min(100,Math.round(pg2/dev2*100)):0;
              return (
                <div>
                  <div style={{padding:"7px 10px",borderRadius:8,background:t.card2,border:`1px solid ${t.borda}`,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:12,color:t.txt2}}>Saldo a pagar</div>
                    <div style={{fontSize:13,fontWeight:700,color:sld2>0?t.danger:t.verde,fontFamily:DESIGN.fnt.b}}>{fmtMoeda(Math.abs(sld2))}</div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text3)",fontFamily:"var(--font-mono)",letterSpacing:"0.04em",marginBottom:4}}>
                    <span>Pago: {fmtMoeda(pg2)}</span><span>{pct}%</span>
                  </div>
                  <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:"100%",transform:`scaleX(${pct/100})`,transformOrigin:"left",background:t.verde,borderRadius:2,transition:"transform .4s"}}/>
                  </div>
                </div>
              );
            })()}
          </div>}

          {/* Descargas */}
          {verB("descargas")&&<div style={{...css.card,padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Descargas</span>
              <button onClick={()=>setActiveTab("descarga")} style={{fontSize:10,color:"var(--text3)",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:isMobile?"15px 10px":"6px 4px",margin:isMobile?"-15px -10px":"-6px -4px",display:"inline-flex",alignItems:"center"}}>Ver ›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[
                {l:"Hoje",       v:descargaData.hoje.length},
                {l:"Em Atraso",  v:descargaData.atrasados.length,  tag:"● atraso", tagC:t.danger},
                {l:"Aguardando", v:descargaData.aguardando.length},
              ].map(d=>(
                <div key={d.l} {...clickable(()=>setActiveTab("descarga"))} style={{background:t.bg,border:`1px solid ${t.borda}`,borderRadius:8,padding:12,cursor:"pointer"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-0.03em",color:t.txt,lineHeight:1,marginBottom:3,fontVariantNumeric:"tabular-nums"}}>{d.v}</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text3)",lineHeight:1.3}}>{d.l}</div>
                  {d.tag&&<div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.04em",color:d.tagC,marginTop:3}}>{d.tag}</div>}
                </div>
              ))}
            </div>
            {descargaData.atrasados.length>0&&(
              <div>
                {descargaData.atrasados.slice(0,3).map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderTop:i>0?`1px solid ${hexRgb(t.borda,.4)}`:"none"}}>
                    <span style={{background:"var(--chip-solid-danger)",border:"1px solid var(--chip-solid-danger)",borderRadius:4,padding:"1px 4px",fontSize:9,fontWeight:700,color:"var(--color-text-inverse)",whiteSpace:"nowrap",flexShrink:0}}>ATR</span>
                    <span style={{fontSize:10,color:t.txt,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textTransform:"capitalize"}}>{(r.nome||"—").split(" ").slice(0,2).join(" ").toLowerCase()}</span>
                    <span style={{fontSize:10,color:t.txt2,whiteSpace:"nowrap",flexShrink:0}}>{(r.destino||"—").split(/[-–]/)[0].trim()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {/* Top Destinos */}
          {verB("destinos")&&(()=>{
            const destMap={};
            dashData.filtrado.forEach(r=>{
              if(!r.destino) return;
              const d=r.destino.trim().toUpperCase();
              destMap[d]=(destMap[d]||0)+1;
            });
            const topDestinos=Object.entries(destMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
            if(!topDestinos.length) return null;
            const maxDest=topDestinos[0][1]||1;
            return (
              <div style={{...css.card,padding:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Top Destinos</span>
                  <span style={{fontSize:10,color:"var(--text3)",fontFamily:DESIGN.fnt.b}}>{topDestinos.length} destinos</span>
                </div>
                {topDestinos.map(([dest,ct],i)=>{
                  const pct=Math.round(ct/maxDest*100);
                  const partes=dest.split(/\s*[-–,]\s*/);
                  const destCurto=partes[0].trim();
                  const uf=partes[1]?.trim()||"";
                  const handleClick=()=>{ setPlanilhaFiltroDestino(dest); setActiveTab("planilha"); };
                  return (
                    <div key={dest} {...clickable(handleClick)} title={`Ver cargas para ${destCurto}`}
                      style={{marginBottom:i<topDestinos.length-1?10:0,cursor:"pointer",borderRadius:6,padding:"4px 6px",margin:i<topDestinos.length-1?"0 -6px 4px -6px":"0 -6px",transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.06)}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
                          <span style={{fontFamily:"var(--font-mono)",fontSize:10,fontWeight:800,color:t.ouro,minWidth:14}}>{i+1}</span>
                          <span style={{fontSize:11,color:t.txt,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{destCurto}{uf?` - ${uf}`:""}</span>
                        </div>
                        <span style={{fontSize:11,fontWeight:600,color:t.txt,fontFamily:"var(--font-mono)",flexShrink:0}}>{ct}</span>
                      </div>
                      <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:t.ouro,borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Top Diárias Pendentes */}
          {canFin&&verB("diarias_pend")&&(()=>{
            const pendMap={};
            diariasData.items.filter(i=>i.tipo==="diaria"||i.tipo==="atraso").forEach(({r})=>{
              if(!r.nome)return;
              const prev=parseFloat(r.diaria_prev)||0;
              const pg=parseFloat(r.diaria_pg)||0;
              const sld=prev-pg;
              if(sld<=0)return;
              if(!pendMap[r.nome]){pendMap[r.nome]={total:0,dt:r.dt};}
              pendMap[r.nome].total+=sld;
            });
            const topPend=Object.entries(pendMap).map(([nome,{total,dt}])=>({nome,total,dt})).sort((a,b)=>b.total-a.total).slice(0,4);
            if(!topPend.length)return null;
            const maxPend=topPend[0].total||1;
            return (
              <div style={{...css.card,padding:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text3)",fontWeight:400}}>Top Diárias Pendentes</span>
                  <button onClick={()=>setActiveTab("diarias")} style={{fontSize:10,color:"var(--text3)",background:"transparent",border:"none",cursor:"pointer",fontFamily:DESIGN.fnt.b,padding:isMobile?"15px 10px":"6px 4px",margin:isMobile?"-15px -10px":"-6px -4px",display:"inline-flex",alignItems:"center"}}>Ver ›</button>
                </div>
                {topPend.map(({nome,total:sld,dt},i)=>{
                  const partes=nome.split(" ").filter(Boolean);
                  const nomeExib=partes.length>=2?`${partes[0]} ${partes[1]}`:partes[0];
                  const pct=Math.round(sld/maxPend*100);
                  const handleClick=()=>{ setBuscaInput(dt); setBuscaTipo("dt"); setBuscaModalOpen(true); };
                  return (
                    <div key={nome} {...clickable(handleClick)} title={`Abrir DT ${dt}`}
                      style={{marginBottom:i<topPend.length-1?10:0,cursor:"pointer",borderRadius:6,padding:"4px 6px",margin:i<topPend.length-1?"0 -6px 4px -6px":"0 -6px",transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=hexRgb(t.ouro,.06)}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:11,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6,textTransform:"capitalize"}}>{nomeExib.toLowerCase()}</span>
                        <span style={{fontSize:11,fontWeight:600,color:t.ouro,fontFamily:"var(--font-mono)",fontVariantNumeric:"tabular-nums",flexShrink:0}}>{fmtMoeda(sld)}</span>
                      </div>
                      <div style={{height:3,borderRadius:2,background:t.card2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:t.ouro,borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
            </>

        </div>

      </div>
    </div>
  );
}
