import React, { useEffect, useState, useCallback } from "react";
import Toast from "../components/Toast.jsx";
import { hexRgb, BASES, PERMS_PADRAO } from "../constants.js";
import { getSupaAuth } from "../supabaseAuth.js";

const PERFIS = ["admin", "gerente", "operador", "visualizador"];
// controle_op: o "role" (usado pela RLS) é derivado do Perfil — evita controle redundante
const PERFIL_TO_ROLE = { admin:"admin", gerente:"editor", operador:"editor", visualizador:"viewer" };
const PERM_KEYS = ["financeiro","editar","importar","dashboard","diarias","descarga","planilha","config_db","usuarios","ocorrencias"];
const PERM_LABEL = {
  financeiro:"Financeiro", editar:"Editar", importar:"Importar", dashboard:"Dashboard",
  diarias:"Diárias", descarga:"Descarga", planilha:"Planilha", config_db:"Config BD",
  usuarios:"Usuários", ocorrencias:"Ocorrências",
};
const BASE_LIST = Object.values(BASES);

export default function HubAdmin({ t, css, showToast, toast, onVoltar }) {
  const [perfis, setPerfis] = useState(null);   // [{id,nome,email, acessos:[]}]
  const [catalogo, setCatalogo] = useState([]); // hub_modulos ativos
  const [aberto, setAberto] = useState(null);
  const [novo, setNovo] = useState({});         // por user: {slug, role}

  const carregar = useCallback(async () => {
    const sb = getSupaAuth();
    if (!sb) return;
    const [{ data: profs }, { data: acessos }, { data: cat }] = await Promise.all([
      sb.from("hub_profiles").select("*").order("created_at"),
      sb.from("hub_user_modulos").select("*"),
      sb.from("hub_modulos").select("slug,nome,ordem,ativo").eq("ativo", true).order("ordem"),
    ]);
    const mapa = new Map();
    (acessos || []).forEach(a => { if (!mapa.has(a.user_id)) mapa.set(a.user_id, []); mapa.get(a.user_id).push(a); });
    setPerfis((profs || []).map(p => ({ ...p, acessos: mapa.get(p.id) || [] })));
    setCatalogo(cat || []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const sb = getSupaAuth();

  const concederModulo = async (userId, slug, role) => {
    let finalRole = role || "viewer";
    let config = {};
    if (slug === "controle_op") {
      const perfil = "operador";                 // padrão; ajusta depois no Perfil
      finalRole = PERFIL_TO_ROLE[perfil];
      config = { bases: [], perfil, perms: PERMS_PADRAO[perfil] };
    }
    const { error } = await sb.from("hub_user_modulos").upsert(
      { user_id: userId, modulo_slug: slug, role: finalRole, ativo: true, config },
      { onConflict: "user_id,modulo_slug" });
    if (error) showToast?.("Erro: " + error.message, "err");
    else { showToast?.("Acesso concedido", "ok"); carregar(); }
  };

  const patch = async (id, campos) => {
    const { error } = await sb.from("hub_user_modulos").update(campos).eq("id", id);
    if (error) showToast?.("Erro: " + error.message, "err"); else carregar();
  };
  const remover = async (id) => {
    if (!window.confirm("Remover este acesso?")) return;
    const { error } = await sb.from("hub_user_modulos").delete().eq("id", id);
    if (error) showToast?.("Erro: " + error.message, "err"); else { showToast?.("Removido", "ok"); carregar(); }
  };

  const setConfig = (acesso, novoConfig) => patch(acesso.id, { config: { ...(acesso.config||{}), ...novoConfig } });

  const card = { background:t.card, border:`1px solid ${t.borda}`, borderRadius:12, overflow:"hidden" };
  const chip = (on) => ({ fontSize:10, padding:"3px 8px", borderRadius:20, fontWeight:700, cursor:"pointer",
    border:`1px solid ${on?hexRgb(t.ouro,.5):t.borda2}`, background:on?hexRgb(t.ouro,.14):"transparent", color:on?t.ouro:t.txt2 });
  const sel = { background:t.inputBg, border:`1px solid ${t.borda2}`, borderRadius:8, padding:"4px 8px", color:t.txt, fontSize:11 };

  return (
    <div style={{...css.app,background:t.bg,minHeight:"100vh",padding:"24px 18px"}}>
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button onClick={onVoltar} style={{...css.hBtn,padding:"7px 12px",fontSize:12}}>← Voltar</button>
          <div>
            <div style={{fontFamily:"var(--font-heading)",fontSize:17,fontWeight:700,color:t.txt}}>Gerenciar acessos</div>
            <div style={{fontSize:11,color:t.txt2}}>Libere módulos e defina permissões por usuário</div>
          </div>
        </div>

        {perfis === null ? <div style={{fontSize:12,color:t.txt2}}>Carregando…</div>
        : perfis.length === 0 ? <div style={{fontSize:12,color:t.txt2}}>Nenhum usuário. Usuários aparecem após o 1º login via Google.</div>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {perfis.map(p => {
            const exp = aberto === p.id;
            const usados = new Set(p.acessos.map(a => a.modulo_slug));
            const n = novo[p.id] || { slug:"", role:"viewer" };
            return (
              <div key={p.id} style={card}>
                <button onClick={()=>setAberto(exp?null:p.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:hexRgb(t.ouro,.18),color:t.ouro,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0}}>{(p.nome||p.email||"?").charAt(0).toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:t.txt}}>{p.nome}</div>
                    <div style={{fontSize:11,color:t.txt2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.email}</div>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {p.acessos.length === 0 ? <span style={{fontSize:10,color:t.txt2,fontStyle:"italic"}}>sem acesso</span>
                      : p.acessos.map(a => <span key={a.id} style={{fontSize:9,padding:"2px 6px",borderRadius:5,fontWeight:700,background:a.ativo?hexRgb(t.verde,.14):hexRgb(t.danger,.12),color:a.ativo?t.verde:t.danger}}>{catalogo.find(c=>c.slug===a.modulo_slug)?.nome || a.modulo_slug}</span>)}
                  </div>
                  <span style={{color:t.txt2,fontSize:12}}>{exp?"▲":"▼"}</span>
                </button>

                {exp && (
                  <div style={{borderTop:`1px solid ${t.borda}`,padding:"14px",display:"flex",flexDirection:"column",gap:14}}>
                    {p.acessos.map(a => {
                      const cfg = a.config || {};
                      const isCO = a.modulo_slug === "controle_op";
                      const perfilCO = cfg.perfil || "operador";
                      const permsCO = cfg.perms || PERMS_PADRAO[perfilCO] || {};
                      const bases = Array.isArray(cfg.bases) ? cfg.bases : [];
                      return (
                        <div key={a.id} style={{border:`1px solid ${a.ativo?t.borda2:hexRgb(t.danger,.3)}`,borderRadius:10,padding:"10px 12px",opacity:a.ativo?1:.65}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <span style={{fontWeight:700,fontSize:12,color:t.txt,flex:1}}>{catalogo.find(c=>c.slug===a.modulo_slug)?.nome || a.modulo_slug}</span>
                            {!isCO && (
                              <select value={a.role} onChange={e=>patch(a.id,{role:e.target.value})} style={sel}>
                                {["admin","editor","viewer"].map(r=><option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                            <button onClick={()=>patch(a.id,{ativo:!a.ativo})} style={{...chip(a.ativo),color:a.ativo?t.verde:t.danger,borderColor:a.ativo?hexRgb(t.verde,.5):hexRgb(t.danger,.4),background:a.ativo?hexRgb(t.verde,.12):hexRgb(t.danger,.1)}}>{a.ativo?"Ativo":"Inativo"}</button>
                            <button onClick={()=>remover(a.id)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",fontSize:14}} title="Remover">✕</button>
                          </div>

                          {isCO && (
                            <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:10}}>
                              <div>
                                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:t.txt2,marginBottom:5}}>Perfil</div>
                                <select value={perfilCO} onChange={e=>{const pf=e.target.value; patch(a.id,{role:PERFIL_TO_ROLE[pf]||"viewer",config:{...(a.config||{}),perfil:pf,perms:PERMS_PADRAO[pf]}});}} style={sel}>
                                  {PERFIS.map(pf=><option key={pf} value={pf}>{pf}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:t.txt2,marginBottom:5}}>Bases permitidas</div>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                  {BASE_LIST.map(b=>{const on=bases.includes(b.id);return (
                                    <button key={b.id} onClick={()=>setConfig(a,{bases:on?bases.filter(x=>x!==b.id):[...bases,b.id]})} style={chip(on)}>{b.label}</button>
                                  );})}
                                </div>
                                {bases.length===0 && <div style={{fontSize:9,color:t.danger,marginTop:4}}>⚠ Sem base — usuário não verá dados</div>}
                              </div>
                              <div>
                                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:t.txt2,marginBottom:5}}>Permissões finas</div>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                  {PERM_KEYS.map(k=>{const on=!!permsCO[k];return (
                                    <button key={k} onClick={()=>setConfig(a,{perms:{...permsCO,[k]:!on}})} style={chip(on)}>{PERM_LABEL[k]}</button>
                                  );})}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <select value={n.slug} onChange={e=>setNovo(s=>({...s,[p.id]:{...n,slug:e.target.value}}))} style={{...sel,flex:1,minWidth:140}}>
                        <option value="">+ Conceder módulo…</option>
                        {catalogo.filter(c=>!usados.has(c.slug)).map(c=><option key={c.slug} value={c.slug}>{c.nome}</option>)}
                      </select>
                      {n.slug !== "controle_op" && (
                        <select value={n.role} onChange={e=>setNovo(s=>({...s,[p.id]:{...n,role:e.target.value}}))} style={sel}>
                          {["admin","editor","viewer"].map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                      <button disabled={!n.slug} onClick={()=>{concederModulo(p.id,n.slug,n.role);setNovo(s=>({...s,[p.id]:{slug:"",role:"viewer"}}));}}
                        style={{background:n.slug?t.ouro:t.borda2,color:n.slug?t.onPrimary:t.txt2,border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:n.slug?"pointer":"not-allowed"}}>Conceder</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>}
      </div>
      <Toast {...toast}/>
    </div>
  );
}
