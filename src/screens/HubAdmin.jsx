import React, { useEffect, useState, useCallback, useMemo } from "react";
import Toast from "../components/Toast.jsx";
import { hexRgb, BASES, PERMS_PADRAO } from "../constants.js";
import { getSupaAuth, createTestViewer, gerarSenhaAleatoria, isTestUserEmail } from "../supabaseAuth.js";

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

function normalizarUsername(v) {
  return (v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
}

export default function HubAdmin({ t, css, showToast, toast, onVoltar }) {
  const [perfis, setPerfis] = useState(null);   // [{id,nome,email, acessos:[]}]
  const [catalogo, setCatalogo] = useState([]); // hub_modulos ativos
  const [aberto, setAberto] = useState(null);
  const [novo, setNovo] = useState({});         // por user: {slug, role}
  const [busca, setBusca] = useState("");
  const [criandoTeste, setCriandoTeste] = useState(false);
  const [formTeste, setFormTeste] = useState({ username:"", password: gerarSenhaAleatoria(), slug:"controle_op", bases:[] });
  const [salvandoTeste, setSalvandoTeste] = useState(false);
  const [credenciaisCriadas, setCredenciaisCriadas] = useState(null); // {username,password,email} — mostrado 1x

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

  const criarUsuarioTeste = async () => {
    const username = normalizarUsername(formTeste.username);
    if (username.length < 3) { showToast?.("Usuário precisa ter ao menos 3 letras", "err"); return; }
    if (!formTeste.password || formTeste.password.length < 6) { showToast?.("Senha precisa ter ao menos 6 caracteres", "err"); return; }
    if (formTeste.slug === "controle_op" && formTeste.bases.length === 0) { showToast?.("Selecione ao menos uma base", "err"); return; }
    setSalvandoTeste(true);
    const r = await createTestViewer({
      username, password: formTeste.password, moduloSlug: formTeste.slug,
      nomeExibicao: `Teste — ${username}`, bases: formTeste.bases,
    });
    setSalvandoTeste(false);
    if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
    setCredenciaisCriadas({ username, password: formTeste.password, email: r.email, needsEmailConfirm: r.needsEmailConfirm });
    setCriandoTeste(false);
    setFormTeste({ username:"", password: gerarSenhaAleatoria(), slug:"controle_op", bases:[] });
    showToast?.("Usuário de teste criado", "ok");
    carregar();
  };

  const card = { background:t.card, border:`1px solid ${t.borda}`, borderRadius:12, overflow:"hidden" };
  const chip = (on) => ({ fontSize:10, padding:"3px 8px", borderRadius:20, fontWeight:700, cursor:"pointer",
    border:`1px solid ${on?hexRgb(t.ouro,.5):t.borda2}`, background:on?hexRgb(t.ouro,.14):"transparent", color:on?t.ouro:t.txt2 });
  const sel = { background:t.inputBg, border:`1px solid ${t.borda2}`, borderRadius:8, padding:"4px 8px", color:t.txt, fontSize:11 };
  const inp = { ...sel, padding:"7px 10px", fontSize:12, width:"100%" };

  const filtrados = useMemo(() => {
    if (!perfis) return null;
    const q = busca.trim().toLowerCase();
    if (!q) return perfis;
    return perfis.filter(p => (p.nome||"").toLowerCase().includes(q) || (p.email||"").toLowerCase().includes(q));
  }, [perfis, busca]);

  const pendentes = (filtrados || []).filter(p => p.acessos.length === 0);
  const comAcesso = (filtrados || []).filter(p => p.acessos.length > 0);

  const renderUserCard = (p) => {
    const exp = aberto === p.id;
    const usados = new Set(p.acessos.map(a => a.modulo_slug));
    const n = novo[p.id] || { slug:"", role:"viewer" };
    const ehTeste = isTestUserEmail(p.email);
    return (
      <div key={p.id} style={card}>
        <button onClick={()=>setAberto(exp?null:p.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:hexRgb(t.ouro,.18),color:t.ouro,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0}}>{(p.nome||p.email||"?").charAt(0).toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:13,color:t.txt,display:"flex",alignItems:"center",gap:6}}>
              {p.nome}
              {ehTeste && <span style={{fontSize:8.5,padding:"1px 6px",borderRadius:5,fontWeight:800,letterSpacing:".04em",background:"#4338ca",color:"#ffffff"}}>TESTE</span>}
            </div>
            <div style={{fontSize:11,color:t.txt2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.email}</div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
            {p.acessos.length === 0 ? <span style={{fontSize:10,color:t.txt2,fontStyle:"italic"}}>sem acesso</span>
              : p.acessos.map(a => <span key={a.id} style={{fontSize:9,padding:"2px 6px",borderRadius:5,fontWeight:700,background:a.ativo?"#047857":"#dc2626",color:"#ffffff"}}>{catalogo.find(c=>c.slug===a.modulo_slug)?.nome || a.modulo_slug}</span>)}
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
                    <button onClick={()=>patch(a.id,{ativo:!a.ativo})} style={{...chip(a.ativo),color:"#ffffff",borderColor:a.ativo?"#047857":"#dc2626",background:a.ativo?"#047857":"#dc2626"}}>{a.ativo?"Ativo":"Inativo"}</button>
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
  };

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

        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou email…" style={{...inp,flex:1,minWidth:180}} />
          <button onClick={()=>{setCriandoTeste(v=>!v); setCredenciaisCriadas(null);}}
            style={{background:criandoTeste?t.borda2:hexRgb(t.roxo,.14),color:criandoTeste?t.txt2:t.roxo,border:`1px solid ${criandoTeste?t.borda2:hexRgb(t.roxo,.4)}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
            {criandoTeste ? "Cancelar" : "+ Usuário de teste"}
          </button>
        </div>

        {criandoTeste && (
          <div style={{...card,padding:"14px",marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:12,fontWeight:700,color:t.txt}}>Criar usuário de teste (usuário + senha, sem email)</div>
            <div style={{fontSize:10.5,color:t.txt2,lineHeight:1.5}}>Login só-leitura: entra pelo botão "Usuário de teste" na tela de login, não altera nada nas telas.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:140}}>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:t.txt2,marginBottom:4}}>Usuário</div>
                <input value={formTeste.username} onChange={e=>setFormTeste(f=>({...f,username:normalizarUsername(e.target.value)}))} placeholder="ex: cliente_demo" style={inp} />
              </div>
              <div style={{flex:1,minWidth:140}}>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:t.txt2,marginBottom:4}}>Senha</div>
                <div style={{display:"flex",gap:6}}>
                  <input value={formTeste.password} onChange={e=>setFormTeste(f=>({...f,password:e.target.value}))} style={inp} />
                  <button onClick={()=>setFormTeste(f=>({...f,password:gerarSenhaAleatoria()}))} title="Gerar nova senha" style={{...css.hBtn,padding:"0 10px",fontSize:12}}>↻</button>
                </div>
              </div>
            </div>
            <div>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:t.txt2,marginBottom:4}}>Módulo</div>
              <select value={formTeste.slug} onChange={e=>setFormTeste(f=>({...f,slug:e.target.value,bases:[]}))} style={{...sel,width:"100%"}}>
                {catalogo.map(c=><option key={c.slug} value={c.slug}>{c.nome}</option>)}
              </select>
            </div>
            {formTeste.slug === "controle_op" && (
              <div>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:t.txt2,marginBottom:5}}>Bases que ele vai ver</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {BASE_LIST.map(b=>{const on=formTeste.bases.includes(b.id);return (
                    <button key={b.id} onClick={()=>setFormTeste(f=>({...f,bases:on?f.bases.filter(x=>x!==b.id):[...f.bases,b.id]}))} style={chip(on)}>{b.label}</button>
                  );})}
                </div>
              </div>
            )}
            <button disabled={salvandoTeste} onClick={criarUsuarioTeste}
              style={{background:t.ouro,color:t.onPrimary,border:"none",borderRadius:8,padding:"9px 12px",fontSize:12,fontWeight:700,cursor:salvandoTeste?"default":"pointer",opacity:salvandoTeste?.6:1,alignSelf:"flex-start"}}>
              {salvandoTeste ? "Criando…" : "Criar usuário de teste"}
            </button>
          </div>
        )}

        {credenciaisCriadas && (
          <div style={{...card,padding:"14px",marginBottom:16,border:`1px solid ${hexRgb(t.verde,.4)}`,background:hexRgb(t.verde,.06)}}>
            <div style={{fontSize:12,fontWeight:700,color:t.verde,marginBottom:6}}>✓ Usuário de teste criado — anote a senha, ela não aparece de novo</div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:12,color:t.txt,display:"flex",flexDirection:"column",gap:2}}>
              <div>usuário: <b>{credenciaisCriadas.username}</b></div>
              <div>senha: <b>{credenciaisCriadas.password}</b></div>
            </div>
            {credenciaisCriadas.needsEmailConfirm && (
              <div style={{fontSize:10.5,color:t.danger,marginTop:8,lineHeight:1.5}}>⚠ Este projeto Supabase exige confirmação de email — esse usuário fictício nunca vai confirmar. Peça pro admin do Supabase desativar "Confirm email" em Authentication → Providers → Email pra esse login funcionar.</div>
            )}
            <button onClick={()=>setCredenciaisCriadas(null)} style={{marginTop:8,background:"transparent",border:"none",color:t.txt2,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Fechar</button>
          </div>
        )}

        {perfis === null ? <div style={{fontSize:12,color:t.txt2}}>Carregando…</div>
        : filtrados.length === 0 ? <div style={{fontSize:12,color:t.txt2}}>{busca ? "Nenhum usuário encontrado." : "Nenhum usuário. Usuários aparecem após o 1º login via Google (ou crie um usuário de teste acima)."}</div>
        : <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {pendentes.length > 0 && (
            <div>
              <div style={{fontSize:11,fontWeight:700,color:t.laranja,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:t.laranja,display:"inline-block"}}/>
                Aguardando aprovação ({pendentes.length})
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>{pendentes.map(renderUserCard)}</div>
            </div>
          )}
          {comAcesso.length > 0 && (
            <div>
              {pendentes.length > 0 && <div style={{fontSize:11,fontWeight:700,color:t.txt2,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Com acesso ({comAcesso.length})</div>}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>{comAcesso.map(renderUserCard)}</div>
            </div>
          )}
        </div>}
      </div>
      <Toast {...toast}/>
    </div>
  );
}
