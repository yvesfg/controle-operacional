#!/usr/bin/env python3
"""
patch_avb_descarga.py — Etapa 7: Layout Logística AVB no DescargaView
ESCOPO: somente acailandia_avb. Layout original para outras bases intocado.
"""
import sys

SRC = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/views/DescargaView.jsx"

with open(SRC, encoding="utf-8") as f:
    txt = f.read()

original = txt

# 1. Adicionar baseAtual e DADOS no destructuring
OLD_DEST = '    motoristas,\n  } = ctx;'
NEW_DEST = '    motoristas,\n    baseAtual,\n    DADOS,\n  } = ctx;'
if OLD_DEST in txt:
    txt = txt.replace(OLD_DEST, NEW_DEST, 1)
    print("OK 1: baseAtual e DADOS no destructuring")
else:
    print("FAIL 1: destructuring nao encontrado")

# 2. Inserir layout AVB logo após o guard de activeTab
OLD_GUARD = "  if (activeTab !== \"descarga\") return null;\n  return (\n          <div>"
NEW_GUARD = """  if (activeTab !== "descarga") return null;

  // ── Layout Logística AVB (somente acailandia_avb) ──────────────────────
  if (baseAtual?.id === "acailandia_avb") {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const parseDMY = s => {
      if (!s) return null;
      const str = String(s).trim();
      const m = str.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})/);
      if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);
      if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) return new Date(str+"T00:00:00");
      return null;
    };
    const parseMoeda = v => {
      if (!v) return null;
      const s = String(v).trim();
      if (s==="-"||s==="R$ -"||s==="R$-"||s==="0"||s==="") return null;
      const n = parseFloat(s.replace(/[R$\\s.]/g,"").replace(",","."));
      return isNaN(n)?null:n;
    };
    const fmtMoedaAvb = v => v===null?"—":v>=1000?"R$"+(v/1000).toFixed(1)+"k":"R$"+Math.round(v).toLocaleString("pt-BR");

    // Classificar registros
    const regs = (DADOS||[]);
    const emTransito = regs.filter(r=>(r.status||"").toUpperCase()==="CARREGADO"&&!r.chegada);
    const prevHoje = regs.filter(r=>{const da=parseDMY(r.data_agenda);return da&&da.getTime()===hoje.getTime();});
    const pendentes = regs.filter(r=>(r.status||"").toUpperCase()==="PENDENTE");
    const docIncompleta = regs.filter(r=>(r.status||"").toUpperCase()==="CARREGADO"&&(!r.cte||!r.mdf||!r.nf));
    const finPendente = regs.filter(r=>{const s=parseMoeda(r.saldo);return s!==null&&s>0&&(r.status||"").toUpperCase()!=="PENDENTE";});

    const TILES = [
      {k:"transito", l:"Em Trânsito", ct:emTransito.length,   cor:t.azul,   corLt:t.azulLt, bg:"rgba(22,119,255,.07)",  list:emTransito,
       svg:<><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>},
      {k:"prevHoje", l:"Prev. Hoje",  ct:prevHoje.length,     cor:t.ouro,   corLt:"#ffe57a", bg:"rgba(240,185,11,.07)", list:prevHoje,
       svg:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>},
      {k:"pendente", l:"Pendentes",   ct:pendentes.length,    cor:"#f59e0b", corLt:"#fde68a", bg:"rgba(245,158,11,.07)", list:pendentes,
       svg:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>},
      {k:"docInc",   l:"Doc. Incompleta", ct:docIncompleta.length, cor:t.danger, corLt:"#f6465d", bg:"rgba(246,70,93,.07)", list:docIncompleta,
       svg:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="9.01" y2="13"/><line x1="9" y1="17" x2="9.01" y2="17"/></>},
      {k:"finPend",  l:"Fin. Pendente", ct:finPendente.length, cor:"#a855f7", corLt:"#c084fc", bg:"rgba(168,85,247,.07)", list:finPendente,
       svg:<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>},
    ];

    const [avbTile, setAvbTile] = React.useState("transito");
    const tileAtual = TILES.find(tb=>tb.k===avbTile)||TILES[0];
    const [avbBusca, setAvbBusca] = React.useState("");
    const lista = tileAtual.list.filter(r=>{
      if(!avbBusca) return true;
      const q=avbBusca.toLowerCase();
      return (r.nome||"").toLowerCase().includes(q)||(r.placa||"").toLowerCase().includes(q)
        ||(r.contratante||"").toLowerCase().includes(q)||(r.destino||"").toLowerCase().includes(q)
        ||(r.codigo||"").toLowerCase().includes(q)||(r.gerenciadora||"").toLowerCase().includes(q);
    });

    const cardStyle = r => {
      const isPend = (r.status||"").toUpperCase()==="PENDENTE";
      return {
        background: t.card, borderRadius:12, border:`1px solid ${t.borda}`,
        borderLeft:`4px solid ${isPend?"#f59e0b":t.azul}`,
        padding:12, cursor:"pointer", marginBottom:8, transition:"border-color .15s",
      };
    };

    const chip = (label, value, color) => (
      <div style={{background:t.card2,borderRadius:6,padding:"4px 8px",fontSize:10}}>
        <span style={{color:t.txt2,fontSize:9}}>{label} </span>
        <span style={{color:color||t.txt,fontWeight:600}}>{value||"—"}</span>
      </div>
    );

    return (
      <div style={{padding:isMobile?"12px":"16px 20px"}}>
        {/* Tiles */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(5,1fr)",gap:isMobile?4:6,marginBottom:14}}>
          {TILES.map(tb=>(
            <div key={tb.k} onClick={()=>setAvbTile(tb.k)}
              style={{border:`1.5px solid ${avbTile===tb.k?tb.cor:t.borda}`,borderRadius:8,
                padding:isMobile?"10px 5px":"16px 8px",cursor:"pointer",
                background:avbTile===tb.k?tb.bg:t.card2,
                display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .2s"}}>
              {hIco(tb.svg,avbTile===tb.k?tb.corLt:t.txt2,20)}
              <span style={{fontFamily:"var(--font-mono)",fontSize:isMobile?8:10,fontWeight:400,
                textTransform:"uppercase",letterSpacing:"0.05em",
                color:avbTile===tb.k?tb.corLt:t.txt2,textAlign:"center",lineHeight:1.2}}>{tb.l}</span>
              <span style={{fontFamily:"var(--font-heading)",fontSize:isMobile?20:30,fontWeight:700,
                letterSpacing:"-0.04em",color:avbTile===tb.k?tb.corLt:t.txt2,lineHeight:1}}>{tb.ct}</span>
            </div>
          ))}
        </div>

        {/* Busca */}
        <div style={{marginBottom:10}}>
          <input type="text" placeholder="Buscar motorista, placa, contratante, destino, código..."
            value={avbBusca} onChange={e=>setAvbBusca(e.target.value)}
            style={{width:"100%",fontSize:11,padding:"7px 12px",borderRadius:8,
              border:`1.5px solid ${avbBusca?"var(--accent)":t.borda}`,
              background:t.card,color:t.txt,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
        </div>
        <div style={{fontSize:10,color:t.txt2,marginBottom:10,fontFamily:"var(--font-mono)"}}>
          {lista.length} de {tileAtual.list.length} registros
        </div>

        {/* Cards */}
        {lista.length===0&&(
          <div style={{textAlign:"center",padding:"40px 0",color:t.txt2}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            <div style={{fontSize:13,fontWeight:600,color:t.txt2}}>Nenhum registro nesta categoria</div>
          </div>
        )}
        {lista.map((r,i)=>{
          const placas=[r.placa,r.placa2,r.placa3].filter(Boolean).join(" / ")||"—";
          const saldo=parseMoeda(r.saldo);
          const hasCte=!!r.cte, hasMdf=!!r.mdf, hasNf=!!r.nf;
          const isPend=(r.status||"").toUpperCase()==="PENDENTE";
          return (
            <div key={i} style={cardStyle(r)} onClick={()=>abrirDetalhe(r)}>
              {/* Linha 1: motorista + status */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{flex:1,fontSize:14,fontWeight:700,color:t.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {r.nome||"—"}
                </div>
                <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,
                  background:isPend?"rgba(245,158,11,.1)":"rgba(22,119,255,.1)",
                  color:isPend?"#f59e0b":t.azulLt,border:`1px solid ${isPend?"#f59e0b33":t.azulLt+"33"}`}}>
                  {r.status||"—"}
                </span>
                <span style={{fontSize:12,color:t.txt2}}>›</span>
              </div>
              {/* Linha 2: contratante + gerenciadora */}
              {(r.contratante||r.gerenciadora)&&(
                <div style={{fontSize:11,color:t.txt2,marginBottom:6}}>
                  {r.contratante&&<span style={{color:t.txt,fontWeight:600}}>{r.contratante}</span>}
                  {r.contratante&&r.gerenciadora&&<span style={{color:t.txt2}}> · </span>}
                  {r.gerenciadora&&<span>{r.gerenciadora}</span>}
                </div>
              )}
              {/* Chips */}
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {chip("Cód.", r.codigo, t.ouro)}
                {chip("Placas", placas, t.verde)}
                {chip("Origem", r.origem, t.txt2)}
                {chip("Destino", r.destino, t.txt2)}
                {chip("Carreg.", r.data_carr, "#eab308")}
                {r.data_agenda&&chip("Prev. Chegada", r.data_agenda, t.ouro)}
                {/* Status documental */}
                <div style={{background:t.card2,borderRadius:6,padding:"4px 8px",fontSize:10,display:"flex",gap:5}}>
                  <span style={{color:t.txt2,fontSize:9}}>Docs </span>
                  <span style={{color:hasCte?"var(--green,#22c55e)":"var(--red,#ef4444)",fontWeight:600}}>CTE{hasCte?"✓":"✗"}</span>
                  <span style={{color:hasMdf?"var(--green,#22c55e)":"var(--red,#ef4444)",fontWeight:600}}>MDF{hasMdf?"✓":"✗"}</span>
                  <span style={{color:hasNf?"var(--green,#22c55e)":"var(--red,#ef4444)",fontWeight:600}}>NF{hasNf?"✓":"✗"}</span>
                </div>
                {saldo!==null&&saldo>0&&chip("Saldo", fmtMoedaAvb(saldo), t.danger)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  // ── Fim layout AVB ──────────────────────────────────────────────────────

  return (
          <div>"""

if OLD_GUARD in txt:
    txt = txt.replace(OLD_GUARD, NEW_GUARD, 1)
    print("OK 2: layout Logistica AVB inserido")
else:
    print("FAIL 2: guard de activeTab nao encontrado")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(txt)

if txt == original:
    print("NENHUMA ALTERACAO APLICADA")
    sys.exit(1)

print(f"DescargaView.jsx salvo ({txt.count(chr(10))} linhas)")
