import React from "react";
import { clickable } from "../../utils.js";
import KpiCard from "../../components/KpiCard.jsx";

// GestaoAVB — Gestão operacional Açailândia AVB
// Acompanha cada carga pelas etapas do fluxo real do embarcador:
// Homérico → Gerenciadora → Fortes (CTE/MDF) → NF → ADT → Viagem

const ETAPAS = [
  { k:"homerico",  l:"Homérico",    check: r => !!(r.codigo&&r.codigo.trim()),                             cor:"var(--cyan)"  },
  { k:"gerenc",    l:"Gerenciadora",check: r => !!(r.gerenc&&r.gerenc.trim()),                              cor:"#a855f7"  },
  { k:"fortes",    l:"Fortes",      check: r => !!(r.cte&&r.mdf),                                          cor:"var(--accent)" },
  { k:"nf",        l:"NF Recebida", check: r => !!(r.nf&&r.nf.trim()),                                     cor:"#22c55e"  },
  { k:"adt",       l:"ADT Pago",    check: r => { const n=parseFloat(String(r.adiant||"").replace(/[R$\s]/g,"").replace(",",".")); return !isNaN(n)&&n>0; }, cor:"var(--orange)" },
  { k:"viagem",    l:"Em Viagem",   check: r => (r.status||"").toUpperCase()==="CARREGADO",                 cor:"var(--green)"  },
];

// Índice da etapa em que a carga está travada (primeira não concluída)
function etapaPendente(r) {
  const idx = ETAPAS.findIndex(e => !e.check(r));
  return idx === -1 ? ETAPAS.length : idx; // -1 = todas concluídas
}

// Filtros de visualização
const FILTROS = [
  { k:"todos",      l:"Todas",              fn: ()=>true },
  { k:"semGerenc",  l:"Aguard. Gerenc.",    fn: r=>!!(r.codigo)&&!(r.gerenc&&r.gerenc.trim()) },
  { k:"semFortes",  l:"Aguard. Fortes",     fn: r=>!!(r.gerenc)&&!(r.cte&&r.mdf) },
  { k:"semNF",      l:"Aguard. NF",         fn: r=>(r.status||"").toUpperCase()==="CARREGADO"&&!(r.nf&&r.nf.trim()) },
  { k:"semADT",     l:"Aguard. ADT",        fn: r=>!!(r.nf)&&!( parseFloat(String(r.adiant||"").replace(/[R$\s]/g,"").replace(",","."))||0 ) },
  { k:"viagem",     l:"Em Viagem",          fn: r=>(r.status||"").toUpperCase()==="CARREGADO"&&r.cte&&r.mdf&&r.nf },
  { k:"cteComp",    l:"CTE Compl.",         fn: r=>!!(r.cte_comp&&r.cte_comp.trim()) },
  { k:"pendente",   l:"Pendentes",          fn: r=>(r.status||"").toUpperCase()==="PENDENTE" },
];

export default function GestaoAVB({ ctx }) {
  const {
    activeTab, DADOS,
    t, css, DESIGN, hexRgb, hIco, isMobile,
    abrirDetalhe,
  } = ctx;

  if (activeTab !== "gestao") return null;

  const [filtro, setFiltro]   = React.useState("todos");
  const [busca,  setBusca]    = React.useState("");
  const [ordem,  setOrdem]    = React.useState("etapa"); // "etapa" | "data" | "nome"

  const regs = DADOS || [];

  // Contadores por filtro
  const contadores = {};
  FILTROS.forEach(f => { contadores[f.k] = regs.filter(f.fn).length; });

  const fnAtual = FILTROS.find(f=>f.k===filtro)?.fn || (()=>true);

  const dadosFiltrados = regs.filter(r => {
    if (!fnAtual(r)) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return [r.codigo,r.nome,r.contratante,r.gerenc,r.placa,r.destino,r.cte,r.nf]
        .some(v=>(v||"").toLowerCase().includes(q));
    }
    return true;
  });

  const dadosOrdenados = [...dadosFiltrados].sort((a,b) => {
    if (ordem === "etapa") return etapaPendente(a) - etapaPendente(b);
    if (ordem === "nome")  return (a.nome||"").localeCompare(b.nome||"","pt-BR");
    // data: mais recente primeiro
    const da = (a.data_carr||"").split("/").reverse().join("") || "0";
    const db = (b.data_carr||"").split("/").reverse().join("") || "0";
    return db.localeCompare(da);
  });

  const parseMoeda = v => {
    if (!v) return null;
    let s = String(v).replace(/[R$\s]/g,"");
    if (s.includes(",")) s = s.replace(/\./g,"").replace(",",".");
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };
  const fmtM = v => v>=1000?"R$"+(v/1000).toFixed(1)+"k":"R$"+Math.round(v).toLocaleString("pt-BR");

  // ── KPI strip: quantas em cada estágio crítico
  const kpis = [
    { l:"Total",          v:regs.length,                                      c:t.txt    },
    { l:"Pendentes",      v:regs.filter(r=>(r.status||"").toUpperCase()==="PENDENTE").length,  c:t.ouro   },
    { l:"Em Viagem",      v:regs.filter(r=>(r.status||"").toUpperCase()==="CARREGADO"&&r.cte&&r.mdf&&r.nf).length, c:t.verde  },
    { l:"Doc Completa",   v:regs.filter(r=>r.cte&&r.mdf&&r.nf).length,       c:t.verde  },
    { l:"Sem Doc",        v:regs.filter(r=>!r.cte||!r.mdf||!r.nf).length,    c:t.danger },
    { l:"Aguard. ADT",    v:regs.filter(r=>r.nf&&!(parseMoeda(r.adiant)||0)).length, c:t.laranja},
    { l:"CTE Compl.",     v:regs.filter(r=>r.cte_comp&&r.cte_comp.trim()).length, c:"#a855f7"},
  ];

  return (
    <div style={{padding:isMobile?"12px":"20px 24px"}}>

      {/* ── KPI Strip ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(4,1fr)":`repeat(${kpis.length},1fr)`,gap:isMobile?5:8,marginBottom:18}}>
        {kpis.map((k,i)=>(
          <KpiCard key={i} label={k.l} value={k.v} color={k.c} compact={isMobile} />
        ))}
      </div>

      {/* ── Filtros de etapa ── */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
        {FILTROS.map(f=>(
          <button key={f.k} onClick={()=>setFiltro(f.k)}
            style={{fontSize:10,fontWeight:700,padding:"5px 12px",borderRadius:20,cursor:"pointer",
              fontFamily:DESIGN.fnt.b,transition:"all .15s",
              border:`1.5px solid ${filtro===f.k?"var(--accent)":t.borda}`,
              background:filtro===f.k?"rgba(255,107,53,.12)":"transparent",
              color:filtro===f.k?"var(--accent)":t.txt2}}>
            {f.l}
            <span style={{marginLeft:5,fontSize:9,opacity:.7}}>{contadores[f.k]}</span>
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:9,color:"var(--text3)"}}>Ordem:</span>
          {[["etapa","Etapa"],["data","Data"],["nome","Nome"]].map(([k,l])=>(
            <button key={k} onClick={()=>setOrdem(k)}
              style={{fontSize:9,padding:"4px 9px",borderRadius:6,cursor:"pointer",fontFamily:DESIGN.fnt.b,
                border:`1px solid ${ordem===k?"var(--accent)":t.borda}`,
                background:ordem===k?"rgba(255,107,53,.1)":"transparent",
                color:ordem===k?"var(--accent)":t.txt2}}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Busca ── */}
      <div style={{marginBottom:12}}>
        <input type="text" placeholder="Buscar código, motorista, contratante, placa, destino..."
          value={busca} onChange={e=>setBusca(e.target.value)}
          style={{width:"100%",fontSize:11,padding:"8px 12px",borderRadius:8,
            border:`1.5px solid ${busca?"var(--accent)":t.borda}`,
            background:t.card,color:t.txt,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>

      <div style={{fontSize:10,color:"var(--text3)",marginBottom:12,fontFamily:"var(--font-mono)"}}>
        {dadosOrdenados.length} registros
      </div>

      {/* ── Lista ── */}
      {dadosOrdenados.length===0&&(
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <div style={{fontSize:36,marginBottom:8}}>✅</div>
          <div style={{fontSize:13,fontWeight:600,color:t.txt}}>Nenhum registro neste filtro</div>
        </div>
      )}

      {dadosOrdenados.map((r,i)=>{
        const pendIdx = etapaPendente(r);
        const completo = pendIdx === ETAPAS.length;
        const proxEtapa = completo ? null : ETAPAS[pendIdx];
        const saldo = parseMoeda(r.saldo);
        const adiant = parseMoeda(r.adiant);
        const temCteComp = !!(r.cte_comp&&r.cte_comp.trim());
        const isPend = (r.status||"").toUpperCase()==="PENDENTE";

        return (
          <div key={i} {...clickable(()=>abrirDetalhe(r))}
            style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,
              padding:14,marginBottom:8,cursor:"pointer",transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=t.borda}>

            {/* Linha 1: Código + Nome + Status */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              {r.codigo&&(
                <span style={{fontFamily:"var(--font-mono)",fontSize:11,fontWeight:800,
                  color:"var(--accent)",flexShrink:0,letterSpacing:"0.04em"}}>{r.codigo}</span>
              )}
              <div style={{flex:1,fontSize:13,fontWeight:700,color:t.txt,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {(r.nome||"—").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
              </div>
              {r.contratante&&(
                <span style={{fontSize:10,color:t.txt2,fontWeight:600,flexShrink:0}}>{r.contratante}</span>
              )}
              <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,flexShrink:0,
                background:isPend?"rgba(245,158,11,.1)":completo?"rgba(16,185,129,.1)":"rgba(255,107,53,.1)",
                color:isPend?t.ouro:completo?t.verde:"var(--accent)",
                border:`1px solid ${isPend?t.ouro+"44":completo?"rgba(16,185,129,.3)":"rgba(255,107,53,.3)"}`}}>
                {r.status||"—"}
              </span>
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="var(--text3)"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            {/* Linha 2: Checklist de etapas */}
            <div style={{display:"flex",alignItems:"center",gap:isMobile?4:6,flexWrap:"wrap",marginBottom:8}}>
              {ETAPAS.map((e,ei)=>{
                const ok = e.check(r);
                const isProx = ei === pendIdx;
                return (
                  <React.Fragment key={e.k}>
                    <div style={{display:"flex",alignItems:"center",gap:3,
                      opacity:ok?1:isProx?1:.4}}>
                      <span style={{width:16,height:16,borderRadius:"50%",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,
                        background:ok?e.cor:isProx?"rgba(255,107,53,.15)":"transparent",
                        border:`1.5px solid ${ok?e.cor:isProx?"var(--accent)":"var(--border)"}`,
                        color:ok?"#fff":isProx?"var(--accent)":"var(--text3)"}}>
                        {ok?"✓":ei+1}
                      </span>
                      <span style={{fontSize:isMobile?8:9,color:ok?e.cor:isProx?"var(--accent)":"var(--text3)",
                        fontFamily:"var(--font-mono)",fontWeight:isProx?700:400,
                        textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>
                        {e.l}
                      </span>
                    </div>
                    {ei<ETAPAS.length-1&&(
                      <span style={{fontSize:9,color:"var(--text3)",opacity:.4,flexShrink:0}}>›</span>
                    )}
                  </React.Fragment>
                );
              })}
              {completo&&(
                <span style={{fontSize:9,fontWeight:700,color:t.verde,fontFamily:"var(--font-mono)",
                  marginLeft:4,letterSpacing:"0.04em"}}>✓ COMPLETO</span>
              )}
            </div>

            {/* Linha 3: Info operacional + alertas */}
            <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
              {r.placa&&(
                <span style={{fontSize:9,color:t.verde,fontFamily:"var(--font-mono)",
                  background:`rgba(16,185,129,.08)`,border:"1px solid rgba(16,185,129,.2)",
                  borderRadius:4,padding:"2px 6px"}}>{r.placa}</span>
              )}
              {r.destino&&(
                <span style={{fontSize:9,color:t.txt2,background:t.card2,borderRadius:4,padding:"2px 6px"}}>
                  {r.destino.split(/\s*[-–]\s*/)[0].trim()}
                </span>
              )}
              {r.data_carr&&(
                <span style={{fontSize:9,color:t.ouro,fontFamily:"var(--font-mono)",
                  background:"rgba(217,98,43,.07)",borderRadius:4,padding:"2px 6px"}}>
                  ↑ {r.data_carr.slice(0,5)}
                </span>
              )}
              {adiant&&adiant>0&&(
                <span style={{fontSize:9,color:t.laranja,fontFamily:"var(--font-mono)",
                  background:"rgba(245,158,11,.08)",borderRadius:4,padding:"2px 6px"}}>
                  ADT {fmtM(adiant)}
                </span>
              )}
              {saldo&&saldo>0&&(
                <span style={{fontSize:9,color:t.danger,fontFamily:"var(--font-mono)",fontWeight:700,
                  background:"rgba(246,70,93,.08)",border:"1px solid rgba(246,70,93,.2)",
                  borderRadius:4,padding:"2px 6px"}}>
                  Saldo {fmtM(saldo)}
                </span>
              )}
              {temCteComp&&(
                <span style={{fontSize:9,fontWeight:700,color:"#a855f7",
                  background:"rgba(168,85,247,.08)",border:"1px solid rgba(168,85,247,.2)",
                  borderRadius:4,padding:"2px 6px",fontFamily:"var(--font-mono)"}}>
                  CTE COMPL.
                </span>
              )}
              {/* Próxima ação em destaque */}
              {!completo&&proxEtapa&&(
                <span style={{marginLeft:"auto",fontSize:9,fontWeight:700,
                  color:"var(--accent)",fontFamily:"var(--font-mono)",
                  letterSpacing:"0.04em",flexShrink:0}}>
                  ▶ {proxEtapa.l}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
