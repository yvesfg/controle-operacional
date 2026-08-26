/**
 * OcorrenciasView.jsx
 */
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Button } from "../design-system/components/Button.jsx";
import Icon from "../components/Icon.jsx";
import OcorrModal from "../components/OcorrModal.jsx";
import { clickable } from "../utils.js";
import LinhaDoTempoDt from "../components/LinhaDoTempoDt.jsx";
import { resumoDt, temOcorrencia } from "../ocorrenciaEtapas.js";

const Ico = ({ size=16, color="currentColor", sw=1.8, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{display:"block",flexShrink:0,...style}}>
    {children}
  </svg>
);

function OcorrBadge({ label, color }) {
  return (
    <span style={{
      fontSize:9, fontFamily:"var(--font-mono)", fontWeight:500,
      letterSpacing:"0.06em", textTransform:"uppercase",
      background:color+"22", border:`1px solid ${color}44`,
      borderRadius:4, padding:"2px 7px", color,
    }}>{label}</span>
  );
}

function OcorrCard({ entry, onOpen, motInfo, onAddOcorrencia, isMobile }) {
  const { r, badges, resumo } = entry;
  const topBadge = badges[0];
  const hasChegada  = !!r.obs_chegada;
  const hasDescarga = !!r.obs_descarga;
  const showObs = hasChegada || hasDescarga;

  return (
    <div
      {...clickable(() => onOpen(r))}
      style={{
        background:"var(--card)", border:"1px solid var(--border)",
        borderRadius:"var(--radius-card,12px)", padding:"10px 12px",
        cursor:"pointer", transition:"border-color 0.15s,background 0.15s",
        display:"flex", flexDirection:"column", gap:7,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor=topBadge.color}
      onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}
    >
      {/* Row 1 */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:13,color:"var(--text)",letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {r.nome || "—"}
          </div>
          <div style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--font-mono)",letterSpacing:"0.04em",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            DT {r.dt}
            {r.nf && <span style={{marginLeft:5,color:"var(--text3)"}}>· NF {r.nf}</span>}
            {r.placa  && <span style={{marginLeft:6}}>{r.placa}</span>}
            {r.origem && <span style={{marginLeft:6,color:"var(--text3)"}}>{r.origem}</span>}
          </div>
          {motInfo?.tel && (
            <div style={{fontSize:10,color:"var(--cyan)",fontFamily:"var(--font-mono)",marginTop:2,display:"flex",alignItems:"center",gap:4}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6.29 6.29l1.19-1.19a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {motInfo.tel}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",flexShrink:0}}>
          {badges.map((b,i) => <OcorrBadge key={i} label={b.label} color={b.color}/>)}
        </div>
      </div>

      {/* Row 2: a viagem como linha do tempo (substitui as duas caixas de obs
          soltas, que não diziam de que momento eram) + botão de ocorrência */}
      <div style={{
        display:"grid",
        gridTemplateColumns: onAddOcorrencia ? "1fr auto" : "1fr",
        gap:10, borderTop:"1px solid var(--border)", paddingTop:10, alignItems:"start",
      }}>
        <LinhaDoTempoDt etapas={resumo.etapas} isMobile={isMobile} />
        {onAddOcorrencia && (
          <Button variant="primary" size="sm" onClick={e => { e.stopPropagation(); onAddOcorrencia(r); }}
            title="Nova Ocorrência" style={{ minWidth: 44, alignSelf: "center" }}>
            <Ico size={16} color="var(--accent)" sw={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>
            <span style={{fontSize:8,fontFamily:"var(--font-mono)",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Ocorr.</span>
          </Button>
        )}
      </div>

      {/* Row 3: RO / NFD */}
      {(r.ro||r.nfd?.numero)&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",borderTop:"1px solid var(--border)",paddingTop:8}}>
          {r.ro&&(<span style={{fontSize:10,fontFamily:"var(--font-mono)",background:"rgba(249,115,22,.1)",border:"1px solid rgba(249,115,22,.3)",borderRadius:5,padding:"2px 8px",color:"var(--cat-tangerine)",fontWeight:700}}>RO {r.ro}</span>)}
          {r.ro_status&&<span style={{padding:'2px 6px',borderRadius:4,fontSize:9,fontWeight:700,
            background:r.ro_status==='FINALIZADO'?'rgba(2,192,118,.1)':'rgba(217,98,43,.1)',
            color:r.ro_status==='FINALIZADO'?'var(--cat-green)':'var(--cat-gold)',
            border:`1px solid ${r.ro_status==='FINALIZADO'?'rgba(2,192,118,.3)':'rgba(217,98,43,.3)'}`}}>
            {r.ro_status}
          </span>}
          {r.nfd?.numero&&(<span style={{fontSize:10,fontFamily:"var(--font-mono)",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:5,padding:"2px 8px",color:"var(--red)",fontWeight:700}}>NFD {r.nfd.tipo?.toUpperCase()||"NFD"} · Nº {r.nfd.numero}{r.nfd.valor?` · R$ ${r.nfd.valor}`:""}</span>)}
        </div>
      )}
      {/* As datas de carregamento/agenda/descarga saíram daqui: viraram etapas
          da linha do tempo acima, com a mesma informação em ordem. */}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = (status||"").toUpperCase();
  const map = {
    "ENTREGUE":   { color:"var(--green)",   bg:"rgba(34,197,94,.12)"   },
    "CANCELADA":  { color:"var(--red)",      bg:"rgba(239,68,68,.12)"   },
    "AGUARDANDO": { color:"var(--yellow)",   bg:"rgba(234,179,8,.12)"   },
    "CARREGADO":  { color:"var(--cyan)",     bg:"rgba(6,182,212,.12)"   },
    "VIAGEM":     { color:"var(--cyan)",     bg:"rgba(6,182,212,.12)"   },
  };
  const c = map[s] || { color:"var(--text3)", bg:"var(--card2)" };
  return (
    <span style={{fontSize:9,fontFamily:"var(--font-mono)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 9px",borderRadius:99,background:c.bg,color:c.color,border:`1px solid ${c.color}44`}}>
      {s || "—"}
    </span>
  );
}

// ── Modal Nova Ocorrência (melhorado) ────────────────────────────────────────
export default function OcorrenciasView({ dados=[], diariasData, filtroOcorr, setFiltroOcorr, abrirDetalhe, t, isMobile, motoristas=[], onSalvarOcorrencia, css={} }) {
  const [filtroIni, setFiltroIni] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [busca, setBusca] = useState(""); // busca por DT, motorista, placa
  const [ocorrCols, setOcorrCols] = useState(2);
  const [ocorrModalState, setOcorrModalState] = useState({open:false, dt:null, record:null});

  const openModal = (entry=null) => { setOcorrModalState({open:true, dt:entry?.dt||null, record:entry}); };
  const closeModal = () => { setOcorrModalState({open:false, dt:null, record:null}); };

  const BADGE_COLORS = {
    SGS:              "var(--yellow)",
    "Ocorrência":"var(--orange)",
    "Diária":    "var(--red)",
    DCC:              "var(--cyan)",
    Atraso:           "var(--red)",
    RO:               "var(--cat-orange)",
    NFD:              "var(--red)",
    Sobra:            "var(--cat-purple)",
    "Sem relato":     "var(--red)",
  };

  const { entries, stats } = useMemo(() => {
    const pj=(v,def)=>{ try{ return Array.isArray(v)?v:(v?JSON.parse(v):def); }catch{ return def; } };
    const diariasSet=new Set((diariasData?.items||[]).filter(it=>it.tipo==="diaria"||it.tipo==="atraso").map(it=>it.r.dt));
    const dccSet=new Set(dados.filter(r=>{
      if((r.status||"").toUpperCase()==="CANCELADA") return false;
      const dccs=pj(r.minutas_dcc,[]);
      return dccs.some(m=>m.cte||m.mdf||m.num||m.valor)||(r.cte_comp||r.mdf_comp);
    }).map(r=>r.dt));

    const prioScore=b=>{
      if(b.label.startsWith("Atraso")||b.label==="Diária") return 0;
      if(b.label==="Sem relato") return 1;
      if(b.label.startsWith("NFD:")) return 2;
      if(b.label.startsWith("RO:"))  return 3;
      if(b.label.startsWith("SGS")) return 4;
      if(b.label==="DCC") return 5;
      return 6;
    };

    const raw=dados
      // SGS entrou no filtro: e ocorrencia aberta igual a RO/NFD e ficava de fora.
      // As duas colunas de obs continuam aqui, mas hoje nao trazem ninguem — o
      // sync nao mapeia essas colunas da planilha (ver ocorrenciaEtapas.js).
      .filter(r=>(r.status||"").toUpperCase()!=="CANCELADA"&&(r.obs_chegada||r.obs_descarga||r.ro||r.sgs||(r.nfd&&r.nfd.numero)))
      .map(r=>{
        const badges=[];
        // ANTES: este badge saia de localStorage.getItem(`co_ocorr_${dt}`), entao
        // uma ocorrencia registrada por outra pessoa (ou no celular) nao aparecia
        // pra mais ninguem — o alerta so existia na maquina de quem digitou.
        // Agora sai do proprio registro, que e o que todo mundo enxerga.
        const resumo = resumoDt(r);
        const hasRelato = !!(r.obs_chegada || r.obs_descarga);
        if(r.ro)                   badges.push({label:`RO: ${r.ro}`,     color:BADGE_COLORS.RO});
        if(r.nfd?.numero)          badges.push({label:`NFD: ${(r.nfd.tipo||"NFD").toUpperCase()}`, color:BADGE_COLORS.NFD});
        if(r.sgs)                  badges.push({label:`SGS: ${r.sgs}`,   color:BADGE_COLORS.SGS});
        if(hasRelato) badges.push({label:"Ocorrência", color:BADGE_COLORS["Ocorrência"]});
        // Ocorrencia aberta (RO/NFD/SGS) e ninguem escreveu o que aconteceu:
        // e a pendencia mais util da tela e nao existia antes.
        if(resumo.semRelato) badges.push({label:"Sem relato", color:BADGE_COLORS["Sem relato"]});
        if(diariasSet.has(r.dt))   badges.push({label:"Diária",      color:BADGE_COLORS["Diária"]});
        if(dccSet.has(r.dt))       badges.push({label:"DCC",              color:BADGE_COLORS.DCC});
        if(r.data_agenda&&!r.data_desc){
          const da=(()=>{const s=r.data_agenda;if(!s)return null;if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const[d,m,y]=s.split("/");return new Date(`${y}-${m}-${d}`);}if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s);return null;})();
          if(da){const hoje=new Date();hoje.setHours(0,0,0,0);const dif=Math.floor((hoje-da)/(86400000));if(dif>=1)badges.push({label:`Atraso ${dif}d`,color:BADGE_COLORS.Atraso});}
        }
        if(badges.length===0) return null;
        badges.sort((a,b)=>prioScore(a)-prioScore(b));
        return {r,badges,resumo};
      }).filter(Boolean);

    // Quem tem pendencia sobe; entre iguais, vale a prioridade do badge.
    raw.sort((a,b)=>(b.resumo.peso-a.resumo.peso)||(prioScore(a.badges[0])-prioScore(b.badges[0])));

    const stats={
      total:raw.length,
      sgs:raw.filter(e=>e.badges.some(b=>b.label.startsWith("SGS"))).length,
      diaria:raw.filter(e=>e.badges.some(b=>b.label==="Diária"||b.label.startsWith("Atraso"))).length,
      dcc:raw.filter(e=>e.badges.some(b=>b.label==="DCC")).length,
      ocorr:raw.filter(e=>e.badges.some(b=>b.label==="Ocorrência")).length,
      ro:raw.filter(e=>e.badges.some(b=>b.label.startsWith("RO:"))).length,
      nfd:raw.filter(e=>e.badges.some(b=>b.label.startsWith("NFD:"))).length,
      sobra:raw.filter(e=>e.badges.some(b=>b.label==="Sobra")).length,
      semRelato:raw.filter(e=>e.resumo.semRelato).length,
      obsChegada:raw.filter(e=>!!e.r.obs_chegada).length,
      obsDescarga:raw.filter(e=>!!e.r.obs_descarga).length,
    };
    return {entries:raw,stats};
  },[dados,diariasData]);

  const FILTROS=[
    {k:null,               l:"Todos",          color:"var(--text2)"},
    {k:"RO",               l:"RO",             color:"var(--cat-tangerine)"},
    {k:"NFD",              l:"NFD",            color:"var(--red)"},
    {k:"Sem relato",       l:"Sem relato",     color:"var(--red)"},
    {k:"Sobra",            l:"Sobra",          color:"var(--cat-violet)"},
    {k:"SGS",              l:"SGS",            color:"var(--yellow)"},
    {k:"Ocorrência",  l:"Ocorrência",color:"var(--orange)"},
    {k:"Diária/Atraso",l:"Diária/Atraso",color:"var(--red)"},
    {k:"DCC",              l:"DCC",            color:"var(--cyan)"},
  ];
  const labelMap={
    "RO":b=>b.label.startsWith("RO:"),
    "NFD":b=>b.label.startsWith("NFD:"),
    "Sem relato":b=>b.label==="Sem relato",
    "Sobra":b=>b.label==="Sobra",
    "SGS":b=>b.label.startsWith("SGS"),
    "Ocorrência":b=>b.label==="Ocorrência",
    "Diária/Atraso":b=>b.label==="Diária"||b.label.startsWith("Atraso"),
    "DCC":b=>b.label==="DCC",
  };

  const _iniD=filtroIni?new Date(filtroIni+"T00:00:00"):null;
  const _fimD=filtroFim?new Date(filtroFim+"T23:59:59"):null;
  // Converte dd/MM/yyyy ou yyyy-MM-dd → Date
  const _toD=s=>{if(!s)return null;const m=String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(m)return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s.slice(0,10)+"T00:00:00");return null;};
  const filtered=(filtroOcorr?entries.filter(e=>e.badges.some(labelMap[filtroOcorr]||(()=>false))):entries).filter(e=>{
    // Filtro de busca (DT, motorista, placa)
    if(busca.trim()){
      const q=busca.trim().toLowerCase();
      const r=e.r;
      if(!( String(r.dt||"").toLowerCase().includes(q)||String(r.nome||"").toLowerCase().includes(q)||String(r.placa||"").toLowerCase().includes(q)||String(r.ro||"").toLowerCase().includes(q)||String(r.nfd?.numero||"").toLowerCase().includes(q)||String(r.sgs||"").toLowerCase().includes(q) )) return false;
    }
    if(!_iniD&&!_fimD) return true;
    // Filtro de data: aceita se QUALQUER data relevante do registro cai no intervalo
    const r=e.r;
    const datas=[r.data_obs_chegada,r.data_obs_descarga,r.data_carr,r.data_agenda,r.data_desc].map(_toD).filter(Boolean);
    if(!datas.length) return true;
    return datas.some(d=>(!_iniD||d>=_iniD)&&(!_fimD||d<=_fimD));
  });

  return (
    <div style={{padding:isMobile?"12px":"16px 24px",width:"100%",boxSizing:"border-box"}}>

      {ocorrModalState.open&&onSalvarOcorrencia&&(
        <OcorrModal
          open={ocorrModalState.open}
          onClose={closeModal}
          onSave={({tipo,texto,nfs,localizacao})=>{
            onSalvarOcorrencia(ocorrModalState.dt, tipo, texto, nfs, localizacao);
            closeModal();
          }}
          dtRecord={ocorrModalState.record}
          t={t} hIco={null} css={css}
        />
      )}

      {/* Sem isto, "126 de 126 sem relato" parece defeito da tela. A causa e
          conhecida e fica escrita: as colunas de observacao da planilha nao sobem. */}
      {stats.semRelato>0 && stats.obsChegada===0 && stats.obsDescarga===0 && (
        <div style={{
          display:"flex",gap:9,alignItems:"flex-start",marginBottom:14,padding:"10px 12px",
          borderRadius:10,background:"var(--chip-warning-bg)",border:"1px solid var(--chip-warning-border)",
        }}>
          <span style={{color:"var(--chip-warning-text)",fontSize:13,lineHeight:1.1}}>!</span>
          <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.5}}>
            <b style={{color:"var(--text)"}}>Nenhuma observacao da planilha chegou ao app.</b>{" "}
            As {stats.semRelato} ocorrencias abaixo aparecem sem relato porque a sincronizacao
            nao mapeia as colunas de <i>obs da chegada</i> e <i>obs da descarga</i> — o que a
            equipe escreve na planilha nao sobe. Corrigido o mapeamento, o texto aparece
            sozinho na etapa a que pertence.
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,flex:1,minWidth:0}}>
          {[
            {label:"Total Alertas", value:stats.total,  color:"var(--text2)"},
            {label:"Com SGS",       value:stats.sgs,    color:"var(--yellow)"},
            {label:"Com Diária",value:stats.diaria,color:"var(--red)"},
            {label:"Com DCC",       value:stats.dcc,    color:"var(--cyan)"},
          ].map(s=>(
            <div key={s.label} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--radius-card,12px)",padding:"12px 14px"}}>
              <div style={{fontSize:9,fontFamily:"var(--font-mono)",letterSpacing:"0.06em",color:"var(--text3)",textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
              <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:24,color:s.color,letterSpacing:"-0.04em",lineHeight:1}}>{s.value}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Obs summary + Nova Ocorrência na mesma linha */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        {stats.obsChegada>0&&(<div style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.25)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"var(--cyan)"}}><span style={{fontWeight:700}}>{stats.obsChegada}</span><span style={{color:"var(--text2)",marginLeft:6}}>com Obs Chegada</span></div>)}
        {stats.obsDescarga>0&&(<div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"var(--green)"}}><span style={{fontWeight:700}}>{stats.obsDescarga}</span><span style={{color:"var(--text2)",marginLeft:6}}>com Obs Descarga</span></div>)}
        {onSalvarOcorrencia&&(
          <Button variant="primary" size="sm" onClick={()=>openModal(null)}>
            <Ico size={13} color="var(--accent)" sw={2.2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>
            Nova Ocorrência
          </Button>
        )}
      </div>

      {/* Busca + Filters row */}
      <div className="co-filter-bar">
        <div style={{position:"relative",flexShrink:0}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",opacity:.5}}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            value={busca}
            onChange={e=>setBusca(e.target.value)}
            placeholder="DT, motorista, placa, RO, NFD..."
            style={{fontSize:11,padding:"5px 9px 5px 26px",borderRadius:7,border:`1.5px solid ${busca?"var(--accent)":"var(--border)"}`,background:busca?"var(--accent2,rgba(124,58,237,0.07))":"var(--card)",color:"var(--text)",width:180,outline:"none"}}
          />
        </div>
        <span style={{fontSize:9,fontFamily:"var(--font-mono)",letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--text3)",marginLeft:4}}>Data:</span>
        <input type="date" value={filtroIni} onChange={e=>setFiltroIni(e.target.value)}
          style={{fontSize:11,fontWeight:600,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${filtroIni?"var(--accent)":"var(--border)"}`,background:filtroIni?"var(--accent2,rgba(124,58,237,0.07))":"var(--card)",color:"var(--text)",height:28,width:130,cursor:"pointer"}}/>
        <span style={{fontSize:10,color:"var(--text3)"}}>até</span>
        <input type="date" value={filtroFim} onChange={e=>setFiltroFim(e.target.value)}
          style={{fontSize:11,fontWeight:600,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${filtroFim?"var(--accent)":"var(--border)"}`,background:filtroFim?"var(--accent2,rgba(124,58,237,0.07))":"var(--card)",color:"var(--text)",height:28,width:130,cursor:"pointer"}}/>
        {(filtroIni||filtroFim||busca)&&(<Button variant="secondary" size="sm" onClick={()=>{setFiltroIni("");setFiltroFim("");setBusca("");}}><Icon n="x" s={13} /> Limpar</Button>)}
        <span style={{marginLeft:"auto",fontSize:9,fontFamily:"var(--font-mono)",color:"var(--text2)",fontWeight:600}}>{filtered.length} reg</span>
      </div>

      {/* Filter pills */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
        {FILTROS.map(f=>{
          const ativo=filtroOcorr===f.k;
          return (
            <button key={String(f.k)} onClick={()=>setFiltroOcorr(ativo?null:f.k)}
              style={{fontSize:10,fontFamily:"var(--font-mono)",fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase",background:ativo?f.color+"22":"var(--card)",border:`1.5px solid ${ativo?f.color:"var(--border)"}`,borderRadius:6,padding:"4px 10px",color:ativo?f.color:"var(--text2)",cursor:"pointer",transition:"all 0.15s"}}>
              {f.l}
              {f.k&&(<span style={{marginLeft:4,opacity:0.65}}>{f.k==="RO"?stats.ro:f.k==="NFD"?stats.nfd:f.k==="Sobra"?stats.sobra:f.k==="SGS"?stats.sgs:f.k==="Ocorrência"?stats.ocorr:f.k==="Diária/Atraso"?stats.diaria:stats.dcc}</span>)}
            </button>
          );
        })}
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {(isMobile?[1,2]:[1,2,3,4]).map(n=>(
            <button key={n} onClick={()=>setOcorrCols(n)} style={{width:26,height:26,fontSize:10,fontWeight:700,border:`1.5px solid ${ocorrCols===n?"var(--accent)":"var(--border)"}`,borderRadius:6,cursor:"pointer",background:ocorrCols===n?"var(--accent2,rgba(124,58,237,0.1))":"var(--card2)",color:ocorrCols===n?"var(--accent)":"var(--text2)"}}>{n}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"48px 20px",color:"var(--text3)"}}>
          <Ico size={32} color="var(--green)" style={{margin:"0 auto 12px"}}><polyline points="20 6 9 17 4 12"/></Ico>
          <div style={{fontFamily:"var(--font-heading)",fontSize:14,fontWeight:600,color:"var(--text2)",marginBottom:4}}>
            {filtroOcorr?`Nenhum DT com "${filtroOcorr}"`:"Nenhuma ocorrência registrada"}
          </div>
          <div style={{fontSize:12,color:"var(--text3)"}}>Todos os DTs estão sem pendências.</div>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?Math.min(ocorrCols,2):ocorrCols},minmax(0,1fr))`,gap:isMobile?6:8}}>
          {filtered.map((entry,i)=>{
            const motInfo=motoristas.find(m=>(entry.r.cpf&&m.cpf?.replace(/\D/g,"")===entry.r.cpf?.replace(/\D/g,""))||(entry.r.nome&&m.nome===entry.r.nome)||[m.placa1,m.placa2,m.placa3,m.placa4].some(p=>p&&p===entry.r.placa));
            return <OcorrCard key={i} entry={entry} onOpen={abrirDetalhe} motInfo={motInfo} onAddOcorrencia={onSalvarOcorrencia?r=>openModal(r):null} isMobile={isMobile}/>;
          })}
        </div>
      )}
    </div>
  );
}
