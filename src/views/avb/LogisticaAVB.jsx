import React from "react";
import { calcAgendaAvb, fmtDataAvb } from "../../utils_avb.js";
import { clickable } from "../../utils.js";

// LogisticaAVB — Tela de logística exclusiva Açailândia AVB
// Sem código Suzano (descargaData, rodorrica, Conferência, Sem Motorista).
// Foco: rastreamento de cargas em trânsito, pendências documentais e financeiras.

export default function LogisticaAVB({ ctx }) {
  const {
    activeTab,
    DADOS,
    isMobile,
    hIco,
    t, css, DESIGN,
    hexRgb,
    abrirDetalhe,
  } = ctx;

  if (activeTab !== "descarga") return null;

  const hoje = new Date(); hoje.setHours(0,0,0,0);

  const parseDMY = s => {
    if (!s) return null;
    const str = String(s).trim();
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str+"T00:00:00");
    return null;
  };

  const parseMoeda = v => {
    if (!v) return null;
    const s = String(v).trim();
    if (s==="-"||s==="R$ -"||s==="R$-"||s==="0"||s==="") return null;
    let clean = s.replace(/[R$\s]/g,"");
    if (clean.includes(",")) clean = clean.replace(/\./g,"").replace(",",".");
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  };

  const fmtMoeda = v => v===null?"—":v>=1000?"R$"+(v/1000).toFixed(1)+"k":"R$"+Math.round(v).toLocaleString("pt-BR");

  const regs = DADOS||[];

  // ── Classificações ────────────────────────────────────────
  // Em trânsito = CARREGADO e ainda SEM data_final (descarregamento). Ao preencher data_final, encerra.
  const emTransito   = regs.filter(r=>(r.status||"").toUpperCase()==="CARREGADO"&&!r.data_final);
  const prevHoje     = regs.filter(r=>{ const da=parseDMY(r.data_agenda); return da&&da.getTime()===hoje.getTime(); });
  const pendentes    = regs.filter(r=>(r.status||"").toUpperCase()==="PENDENTE");
  const docIncompleta= regs.filter(r=>(r.status||"").toUpperCase()==="CARREGADO"&&(!r.cte||!r.mdf||!r.nf));
  const finPendente  = regs.filter(r=>{ const s=parseMoeda(r.saldo); return s!==null&&s>0&&(r.status||"").toUpperCase()!=="PENDENTE"; });

  const TILES = [
    { k:"transito", l:"Em Trânsito",      ct:emTransito.length,    cor:"var(--accent)", corLt:"var(--accent)", bg:"rgba(255,107,53,.07)", list:emTransito,
      svg:<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></> },
    { k:"prevHoje", l:"Prev. Hoje",        ct:prevHoje.length,      cor:t.ouro,          corLt:"#ffe57a",       bg:"rgba(240,185,11,.07)", list:prevHoje,
      svg:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
    { k:"pendente", l:"Pendentes",         ct:pendentes.length,     cor:"#f59e0b",        corLt:"#fde68a",       bg:"rgba(245,158,11,.07)", list:pendentes,
      svg:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></> },
    { k:"docInc",   l:"Doc. Incompleta",   ct:docIncompleta.length, cor:t.danger,         corLt:"#f6465d",       bg:"rgba(246,70,93,.07)",  list:docIncompleta,
      svg:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="9.01" y2="13"/><line x1="9" y1="17" x2="9.01" y2="17"/></> },
    { k:"finPend",  l:"Fin. Pendente",     ct:finPendente.length,   cor:"#a855f7",        corLt:"#c084fc",       bg:"rgba(168,85,247,.07)", list:finPendente,
      svg:<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></> },
  ];

  const [avbTile, setAvbTile] = React.useState("transito");
  const [avbBusca, setAvbBusca] = React.useState("");

  const tileAtual = TILES.find(tb=>tb.k===avbTile)||TILES[0];
  const lista = tileAtual.list.filter(r=>{
    if (!avbBusca) return true;
    const q = avbBusca.toLowerCase();
    return [r.nome, r.placa, r.placa2, r.contratante, r.destino, r.codigo, r.gerenc, r.cte, r.mdf, r.nf]
      .some(v=>(v||"").toLowerCase().includes(q));
  });

  const chip = (label, value, color) => (
    <div style={{background:t.card2,borderRadius:6,padding:"4px 8px",fontSize:10}}>
      <span style={{color:"var(--text3)",fontSize:9}}>{label} </span>
      <span style={{color:color||t.txt,fontWeight:600}}>{value||"—"}</span>
    </div>
  );

  return (
    <div style={{padding:isMobile?"12px":"16px 20px"}}>

      {/* ── Tiles ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(5,1fr)",
        gap:isMobile?4:8,marginBottom:16}}>
        {TILES.map(tb=>(
          <div key={tb.k} {...clickable(()=>setAvbTile(tb.k))}
            style={{border:`1.5px solid ${avbTile===tb.k?tb.cor:t.borda}`,borderRadius:10,
              padding:isMobile?"10px 5px":"16px 8px",cursor:"pointer",
              background:avbTile===tb.k?tb.bg:t.card2,
              display:"flex",flexDirection:"column",alignItems:"center",gap:5,
              transition:"all .2s"}}>
            {hIco(tb.svg, avbTile===tb.k?tb.corLt:t.txt2, isMobile?18:22)}
            <span style={{fontFamily:"var(--font-mono)",fontSize:isMobile?8:10,fontWeight:400,
              textTransform:"uppercase",letterSpacing:"0.05em",
              color:avbTile===tb.k?tb.corLt:t.txt2,textAlign:"center",lineHeight:1.2}}>
              {tb.l}
            </span>
            <span style={{fontFamily:"var(--font-heading)",fontSize:isMobile?22:32,fontWeight:700,
              letterSpacing:"-0.04em",color:avbTile===tb.k?tb.corLt:t.txt2,lineHeight:1}}>
              {tb.ct}
            </span>
          </div>
        ))}
      </div>

      {/* ── Busca ── */}
      <div style={{marginBottom:10}}>
        <input type="text"
          placeholder="Buscar motorista, placa, contratante, destino, código, CTE..."
          value={avbBusca} onChange={e=>setAvbBusca(e.target.value)}
          style={{width:"100%",fontSize:11,padding:"8px 12px",borderRadius:8,
            border:`1.5px solid ${avbBusca?"var(--accent)":t.borda}`,
            background:t.card,color:t.txt,outline:"none",fontFamily:"inherit",
            boxSizing:"border-box"}}/>
      </div>
      <div style={{fontSize:10,color:"var(--text3)",marginBottom:12,fontFamily:"var(--font-mono)"}}>
        {lista.length} de {tileAtual.list.length} registros
      </div>

      {/* ── Lista vazia ── */}
      {lista.length===0&&(
        <div style={{textAlign:"center",padding:"48px 0",color:t.txt2}}>
          <div style={{fontSize:36,marginBottom:10}}>✅</div>
          <div style={{fontSize:13,fontWeight:600,color:t.txt}}>Nenhum registro nesta categoria</div>
          <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>Tudo em ordem por aqui.</div>
        </div>
      )}

      {/* ── Cards ── */}
      {lista.map((r,i)=>{
        const placas  = [r.placa,r.placa2,r.placa3].filter(Boolean).join(" / ")||"—";
        const saldo   = parseMoeda(r.saldo);
        const hasCte  = !!(r.cte&&r.cte.trim());
        const hasMdf  = !!(r.mdf&&r.mdf.trim());
        const hasNf   = !!(r.nf &&r.nf.trim());
        const docOk   = hasCte&&hasMdf&&hasNf;
        const isPend  = (r.status||"").toUpperCase()==="PENDENTE";
        const borderColor = docOk ? "var(--accent)" : t.danger;

        return (
          <div key={i} {...clickable(()=>abrirDetalhe(r))}
            style={{background:t.card,borderRadius:12,border:`1px solid ${t.borda}`,
              padding:14,cursor:"pointer",marginBottom:8,transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=t.borda}>

            {/* Linha 1: nome + status */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{flex:1,fontSize:14,fontWeight:700,color:t.txt,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {(r.nome||"—").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
              </div>
              <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,
                background:isPend?"rgba(245,158,11,.1)":"rgba(255,107,53,.1)",
                color:isPend?t.ouro:"var(--accent)",
                border:`1px solid ${isPend?t.ouro+"44":"rgba(255,107,53,.3)"}`}}>
                {r.status||"—"}
              </span>
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="var(--text3)"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            {/* Linha 2: contratante · gerenciadora */}
            {(r.contratante||r.gerenc)&&(
              <div style={{fontSize:11,color:t.txt2,marginBottom:8}}>
                {r.contratante&&<span style={{color:t.txt,fontWeight:600}}>{r.contratante}</span>}
                {r.contratante&&r.gerenc&&<span style={{color:"var(--text3)"}}> · </span>}
                {r.gerenc&&<span>{r.gerenc}</span>}
              </div>
            )}

            {/* Chips */}
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {r.codigo&&chip("Cód.", r.codigo, "var(--accent)")}
              {chip("Placas", placas, t.verde)}
              {r.destino&&chip("Destino", r.destino.split(/\s*[-–]\s*/)[0].trim(), t.txt2)}
              {r.data_carr&&chip("Carreg.", r.data_carr, t.ouro)}
              {(()=>{
                if (r.data_agenda) return chip("Prev. Chegada", r.data_agenda, t.ouro);
                const ag = calcAgendaAvb(r.data_carr, r.destino);
                if (!ag) return null;
                return chip(`Prev. (${ag.dias}d)`, fmtDataAvb(ag.data), "#f59e0b");
              })()}
              {r.data_final&&chip("Descarregado", r.data_final, t.verde)}

              {/* Status documental */}
              <div style={{background:t.card2,borderRadius:6,padding:"4px 8px",
                fontSize:10,display:"flex",gap:5,alignItems:"center"}}>
                <span style={{color:"var(--text3)",fontSize:9}}>Docs </span>
                {[["CTE",hasCte],["MDF",hasMdf],["NF",hasNf]].map(([lbl,ok])=>(
                  <span key={lbl} style={{color:ok?"var(--green,#22c55e)":"var(--red,#ef4444)",fontWeight:700,fontSize:9}}>
                    {lbl}{ok?"✓":"✗"}
                  </span>
                ))}
              </div>

              {saldo!==null&&saldo>0&&chip("Saldo", fmtMoeda(saldo), t.danger)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
