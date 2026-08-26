import React, { useEffect, useState, useCallback, useMemo } from "react";
import Icon from "../components/Icon.jsx";
import Toast from "../components/Toast.jsx";
import { hexRgb, BASES, PERMS_PADRAO, PERMS_LISTA } from "../constants.js";
import { DASH_KPIS, DASH_BLOCOS } from "../dashboardConfig.js";
import { getPerfil } from "../operacao/perfil.js";
import {
  getSupaAuth, createTestViewer, gerarSenhaAleatoria, isTestUserEmail,
  hubAdminSetStatus, resetTestUserPassword, deleteTestUser,
  hubAdminConvidar, hubAdminListarConvites, hubAdminCancelarConvite, hubAdminSetAcesso,
} from "../supabaseAuth.js";

// Perfil descrito, não só nomeado: quem concede acesso precisa saber o que está
// entregando sem ter que abrir a lista de permissões pra conferir.
const PERFIS = [
  { k:"admin",        l:"Admin",        d:"Tudo, inclusive usuários e config do sistema" },
  { k:"gerente",      l:"Gerente",      d:"Opera tudo e vê financeiro; sem config de sistema" },
  { k:"operador",     l:"Operador",     d:"Opera o dia a dia da base" },
  { k:"gestor",       l:"Gestor",       d:"Só Dashboard + Financeiro, sem editar nada" },
  { k:"visualizador", l:"Visualizador", d:"Leitura das telas operacionais" },
];
// controle_op: o "role" (usado pela RLS) é derivado do Perfil — evita controle redundante
const PERFIL_TO_ROLE = { admin:"admin", gerente:"editor", operador:"editor", gestor:"viewer", visualizador:"viewer" };
const BASE_LIST = Object.values(BASES);
const NEGADOS_PREVIA = 5; // "breve histórico" — o resto fica atrás de "ver todos"

function normalizarUsername(v) {
  return (v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
}
const emailValido = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v || "").trim());

// Quantos pedaços do dashboard estão desligados — resumo pro botão, pra dar
// pra ver que existe configuração ali sem precisar abrir.
const contarOcultos = (dash) => {
  if (!dash) return 0;
  return ["kpis", "blocos"].reduce((n, g) =>
    n + Object.values(dash[g] || {}).filter(v => v === false).length, 0);
};

// Um KPI/bloco só entra na lista se ao menos UMA das bases do usuário tem a
// feature que ele exige (ex.: "Ranking por cliente" só existe onde a operação
// declara rankingCliente). Sem base escolhida ainda, mostra tudo.
const itemCabeNasBases = (item, bases) => {
  if (!item.req) return true;
  if (!bases?.length) return true;
  return bases.some(id => getPerfil(id).features?.[item.req] === true);
};

const FORM_VAZIO = () => ({
  nome: "", email: "", username: "", password: gerarSenhaAleatoria(),
  entrada: "google",          // "google" (convite pré-aprovado) | "teste" (usuário+senha)
  modulos: ["controle_op"],
  perfil: "visualizador",
  bases: [],
  perms: null,                // null = herda do perfil; objeto = admin ajustou na mão
  permsAberto: false,
  dash: {},                   // {kpis:{id:false}, blocos:{id:false}} — ver dashboardConfig.js
  dashAberto: false,
});

export default function HubAdmin({ t, css, showToast, toast, onVoltar }) {
  const [perfis, setPerfis] = useState(null);   // [{id,nome,email,status, acessos:[]}]
  const [convites, setConvites] = useState([]); // e-mails pré-aprovados aguardando 1º login
  const [catalogo, setCatalogo] = useState([]); // hub_modulos ativos
  const [aberto, setAberto] = useState(null);
  const [novo, setNovo] = useState({});         // por user: {slug, role}
  const [busca, setBusca] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [credenciaisCriadas, setCredenciaisCriadas] = useState(null); // {username,password} — mostrado 1x
  const [conviteCriado, setConviteCriado] = useState(null);           // {email} — passo "avise a pessoa"
  const [verTodosNegados, setVerTodosNegados] = useState(false);
  const [resetSenha, setResetSenha] = useState(null); // {userId, senha}
  const [painelAberto, setPainelAberto] = useState(null); // id do acesso com o configurador de painel aberto
  const [processando, setProcessando] = useState(null); // id em request, pra desabilitar botão

  const carregar = useCallback(async () => {
    const sb = getSupaAuth();
    if (!sb) return;
    const [{ data: profs }, { data: acessos }, { data: cat }, convs] = await Promise.all([
      sb.from("hub_profiles").select("*").order("created_at"),
      sb.from("hub_user_modulos").select("*"),
      sb.from("hub_modulos").select("slug,nome,ordem,ativo").eq("ativo", true).order("ordem"),
      hubAdminListarConvites(),
    ]);
    const mapa = new Map();
    (acessos || []).forEach(a => { if (!mapa.has(a.user_id)) mapa.set(a.user_id, []); mapa.get(a.user_id).push(a); });
    setPerfis((profs || []).map(p => ({ ...p, acessos: mapa.get(p.id) || [] })));
    setCatalogo(cat || []);
    setConvites(convs || []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const sb = getSupaAuth();
  const nomeModulo = (slug) => catalogo.find(c => c.slug === slug)?.nome || slug;

  // ── Escrita de acesso ─────────────────────────────────────────────────────
  // SEMPRE via hub_admin_set_acesso: é a RPC que também atualiza co_usuarios
  // (perfil + bases_permitidas). Gravar direto na tabela deixava os chips de
  // base decorativos — quem manda na leitura é o co_usuarios.
  const salvarAcesso = async (acesso, campos) => {
    const r = await hubAdminSetAcesso({
      userId: acesso.user_id,
      slug: acesso.modulo_slug,
      role: campos.role ?? acesso.role,
      config: campos.config ?? acesso.config ?? {},
      ativo: campos.ativo ?? acesso.ativo,
    });
    if (!r.ok) showToast?.("Erro: " + r.error, "err"); else carregar();
  };
  const setConfig = (acesso, novoConfig) =>
    salvarAcesso(acesso, { config: { ...(acesso.config || {}), ...novoConfig } });

  const concederModulo = async (userId, slug, role) => {
    const ehCO = slug === "controle_op";
    const perfil = "visualizador"; // ponto de partida seguro; ajusta logo abaixo na tela
    const r = await hubAdminSetAcesso({
      userId, slug,
      role: ehCO ? PERFIL_TO_ROLE[perfil] : (role || "viewer"),
      config: ehCO ? { bases: [], perfil, perms: PERMS_PADRAO[perfil] } : {},
    });
    if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
    await hubAdminSetStatus(userId, "aprovado"); // conceder módulo É a aprovação
    showToast?.("Acesso concedido — ajuste perfil e bases abaixo", "ok");
    carregar();
  };

  const remover = async (id) => {
    if (!window.confirm("Remover este registro de módulo? (isso não muda o status geral do usuário — pra negar acesso, use o botão \"Negar\" no card dele)")) return;
    const { error } = await sb.from("hub_user_modulos").delete().eq("id", id);
    if (error) showToast?.("Erro: " + error.message, "err"); else { showToast?.("Removido", "ok"); carregar(); }
  };

  // ── Aprovar / Negar / Reativar (status do perfil, não de um módulo) ──
  const aprovar = async (p) => {
    setProcessando(p.id);
    const r = await hubAdminSetStatus(p.id, "aprovado");
    setProcessando(null);
    if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
    showToast?.(`"${p.nome}" aprovado`, "ok");
    setAberto(p.id); // já abre pra admin conceder o módulo
    carregar();
  };
  const negar = async (p) => {
    if (!window.confirm(`Negar acesso a "${p.nome}"? Os módulos que ele tinha ficam desativados (não apagados — dá pra reativar depois).`)) return;
    setProcessando(p.id);
    const r = await hubAdminSetStatus(p.id, "negado");
    setProcessando(null);
    if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
    showToast?.(`Acesso de "${p.nome}" negado`, "ok");
    carregar();
  };
  const marcarPendente = async (p) => {
    setProcessando(p.id);
    const r = await hubAdminSetStatus(p.id, "pendente");
    setProcessando(null);
    if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
    showToast?.(`"${p.nome}" voltou pra aguardando aprovação`, "ok");
    carregar();
  };

  const abrirResetSenha = (userId) => setResetSenha({ userId, senha: gerarSenhaAleatoria() });
  const confirmarResetSenha = async () => {
    if (!resetSenha) return;
    setProcessando(resetSenha.userId);
    const r = await resetTestUserPassword(resetSenha.userId, resetSenha.senha);
    setProcessando(null);
    if (!r.ok) { showToast?.("Erro ao resetar senha: " + r.error, "err"); return; }
    showToast?.("Senha resetada — anote antes de fechar", "ok");
  };
  const excluirTeste = async (p) => {
    if (!window.confirm(`Excluir DE VEZ a conta de teste "${p.nome}"? Não dá pra desfazer.`)) return;
    setProcessando(p.id);
    const r = await deleteTestUser(p.id);
    setProcessando(null);
    if (!r.ok) { showToast?.("Erro ao excluir: " + r.error, "err"); return; }
    showToast?.("Usuário de teste excluído", "ok");
    carregar();
  };

  // ── Adicionar usuário (fluxo único) ───────────────────────────────────────
  // Primeiro se define QUEM e O QUE ele acessa; só no fim se escolhe COMO ele
  // entra (convite por e-mail x usuário de teste). O caminho do convite é o que
  // permite liberar alguém antes de a pessoa existir: ela loga com o Google e
  // já cai nas telas, sem fila de aprovação.
  const permsForm = form.perms || PERMS_PADRAO[form.perfil] || {};
  const temCO = form.modulos.includes("controle_op");

  const salvarNovo = async () => {
    const ehTeste = form.entrada === "teste";
    if (!form.modulos.length) { showToast?.("Escolha ao menos um módulo", "err"); return; }
    if (temCO && form.bases.length === 0) { showToast?.("Selecione ao menos uma base", "err"); return; }

    if (ehTeste) {
      const username = normalizarUsername(form.username);
      if (username.length < 3) { showToast?.("Usuário precisa ter ao menos 3 letras", "err"); return; }
      if (!form.password || form.password.length < 6) { showToast?.("Senha precisa ter ao menos 6 caracteres", "err"); return; }
      setSalvando(true);
      const r = await createTestViewer({
        username, password: form.password,
        moduloSlug: form.modulos[0],
        nomeExibicao: form.nome?.trim() || `Teste — ${username}`,
        bases: form.bases, perfil: form.perfil, perms: permsForm,
      });
      setSalvando(false);
      if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
      setCredenciaisCriadas({ username, password: form.password, needsEmailConfirm: r.needsEmailConfirm });
      setAddOpen(false); setForm(FORM_VAZIO());
      showToast?.("Usuário de teste criado", "ok");
      carregar();
      return;
    }

    if (!emailValido(form.email)) { showToast?.("E-mail inválido", "err"); return; }
    const modulos = form.modulos.map(slug => ({
      slug,
      role: slug === "controle_op" ? PERFIL_TO_ROLE[form.perfil] : "viewer",
      config: slug === "controle_op" ? { bases: form.bases, perfil: form.perfil, perms: permsForm, dash: form.dash || {} } : {},
    }));
    setSalvando(true);
    const r = await hubAdminConvidar({ email: form.email.trim().toLowerCase(), nome: form.nome, modulos });
    setSalvando(false);
    if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
    showToast?.(r.aplicado
      ? "Esse e-mail já tinha conta — acesso aplicado agora"
      : "Convite criado — falta avisar a pessoa", "ok");
    // Só o convite precisa do passo de aviso: quem já tinha conta ganhou o acesso agora
    // e vai ver na próxima vez que entrar, sem depender de ninguém avisar.
    if (!r.aplicado) setConviteCriado({ email: form.email.trim().toLowerCase() });
    setAddOpen(false); setForm(FORM_VAZIO());
    carregar();
  };

  const cancelarConvite = async (email) => {
    if (!window.confirm(`Cancelar o convite de ${email}?`)) return;
    const r = await hubAdminCancelarConvite(email);
    if (!r.ok) { showToast?.("Erro: " + r.error, "err"); return; }
    showToast?.("Convite cancelado", "ok"); carregar();
  };
  // O convite NÃO dispara e-mail: `hub_admin_convidar` só pré-autoriza o endereço em
  // hub_convites, e o acesso entra no 1º login com o Google. Quem avisa a pessoa é o
  // admin — então o aviso pronto mora aqui, em vez de virar serviço de e-mail.
  const AVISO_ASSUNTO = "Seu acesso ao YFGroup";
  const avisoDe = (email) => {
    const url = window.location.origin + window.location.pathname;
    return { url, texto: `Seu acesso ao YFGroup está liberado.\nEntre em ${url} e clique em "Entrar com Google" usando o e-mail ${email}.` };
  };
  const copiarLink = async (email) => {
    const { texto, url } = avisoDe(email);
    try { await navigator.clipboard.writeText(texto); showToast?.("Aviso copiado — é só colar pro usuário", "ok"); }
    catch { showToast?.("Não consegui copiar. Link: " + url, "warn"); }
  };
  // wa.me sem número: abre o WhatsApp com o texto pronto e você escolhe o contato.
  const abrirWpp = (email) => window.open(`https://wa.me/?text=${encodeURIComponent(avisoDe(email).texto)}`, "_blank");
  // Compose do Gmail já preenchido — quem clica em Enviar é você, o app não manda nada.
  const abrirGmail = (email) => window.open(
    `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(AVISO_ASSUNTO)}&body=${encodeURIComponent(avisoDe(email).texto)}`,
    "_blank");

  // ── Estilos ───────────────────────────────────────────────────────────────
  const card = { background:t.card, border:`1px solid ${t.borda}`, borderRadius:12, overflow:"hidden" };
  const chip = (on) => ({ fontSize:10, padding:"3px 8px", borderRadius:20, fontWeight:700, cursor:"pointer",
    border:`1px solid ${on?hexRgb(t.ouro,.5):t.borda2}`, background:on?hexRgb(t.ouro,.14):"transparent", color:on?t.ouro:t.txt2 });
  const tag = (cor) => ({ fontSize:9, padding:"2px 6px", borderRadius:5, fontWeight:700, whiteSpace:"nowrap",
    border:`1px solid ${hexRgb(cor,.35)}`, background:hexRgb(cor,.12), color:cor });
  const sel = { background:t.inputBg, border:`1px solid ${t.borda2}`, borderRadius:8, padding:"4px 8px", color:t.txt, fontSize:11 };
  const inp = { ...sel, padding:"7px 10px", fontSize:12, width:"100%" };
  const btnAcao = (cor) => ({ fontSize:11, fontWeight:700, padding:"6px 12px", borderRadius:8, cursor:"pointer", border:`1.5px solid ${cor}`, background:hexRgb(cor,.12), color:cor, whiteSpace:"nowrap" });
  const rotulo = { fontSize:9, textTransform:"uppercase", letterSpacing:".06em", color:t.txt2, marginBottom:5 };
  const secTitulo = (cor, texto) => (
    <div style={{fontSize:11,fontWeight:700,color:cor,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:cor,display:"inline-block"}}/>{texto}
    </div>
  );

  const filtrados = useMemo(() => {
    if (!perfis) return null;
    const q = busca.trim().toLowerCase();
    if (!q) return perfis;
    return perfis.filter(p => (p.nome||"").toLowerCase().includes(q) || (p.email||"").toLowerCase().includes(q));
  }, [perfis, busca]);

  const convitesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return convites;
    return convites.filter(c => (c.email||"").toLowerCase().includes(q) || (c.nome||"").toLowerCase().includes(q));
  }, [convites, busca]);

  // Status é campo PRÓPRIO agora (migration 010) — não deriva mais de acessos.length.
  const pendentes  = (filtrados || []).filter(p => p.status === "pendente");
  const comAcesso  = (filtrados || []).filter(p => p.status === "aprovado");
  const negadosTd  = (filtrados || []).filter(p => p.status === "negado");
  const negados    = verTodosNegados ? negadosTd : negadosTd.slice(0, NEGADOS_PREVIA);

  // ── Card de usuário ───────────────────────────────────────────────────────
  const renderUserCard = (p) => {
    const exp = aberto === p.id;
    const usados = new Set(p.acessos.map(a => a.modulo_slug));
    const n = novo[p.id] || { slug:"", role:"viewer" };
    const ehTeste = isTestUserEmail(p.email);
    const buscando = processando === p.id;
    const acessoCO = p.acessos.find(a => a.modulo_slug === "controle_op");
    const cfgCO = acessoCO?.config || {};
    const basesCO = Array.isArray(cfgCO.bases) ? cfgCO.bases : [];
    const semBase = !!acessoCO && acessoCO.ativo && basesCO.length === 0;

    return (
      <div key={p.id} style={{...card, borderColor: semBase ? hexRgb(t.danger,.4) : t.borda}}>
        <div style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",flexWrap:"wrap"}}>
          <button onClick={()=>setAberto(exp?null:p.id)} style={{display:"flex",alignItems:"center",gap:10,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",flex:1,minWidth:200,padding:0}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:hexRgb(t.ouro,.18),color:t.ouro,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0}}>{(p.nome||p.email||"?").charAt(0).toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:t.txt,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                {p.nome}
                {ehTeste && <span style={{...tag(t.roxo)}}>TESTE</span>}
                {acessoCO && <span style={{...tag(t.azulLt)}}>{(cfgCO.perfil || "operador").toUpperCase()}</span>}
              </div>
              <div style={{fontSize:11,color:t.txt2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.email}</div>
              {/* Bases na linha fechada: dá pra varrer quem vê o quê sem abrir card por card */}
              {acessoCO && (
                <div style={{fontSize:10,color:semBase?t.danger:t.txt2,marginTop:2}}>
                  {semBase ? "sem base — não vai ver dado nenhum"
                           : basesCO.map(id => BASES[id]?.label || id).join(" · ")}
                </div>
              )}
            </div>
          </button>

          <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:260}}>
            {p.status === "aprovado" && (p.acessos.length === 0
              ? <span style={{fontSize:10,color:t.txt2,fontStyle:"italic"}}>sem módulo concedido</span>
              : p.acessos.map(a => <span key={a.id} style={{fontSize:9,padding:"2px 6px",borderRadius:5,fontWeight:700,background:a.ativo?"var(--chip-solid-success)":"var(--chip-solid-danger)",color:"var(--color-text-inverse)"}}>{nomeModulo(a.modulo_slug)}</span>))}
          </div>

          {/* Ações rápidas por status — sem precisar expandir o card */}
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {p.status === "pendente" && <>
              <button disabled={buscando} onClick={()=>aprovar(p)} style={btnAcao(t.verde)}>Aprovar</button>
              <button disabled={buscando} onClick={()=>negar(p)} style={btnAcao(t.danger)}>Negar</button>
            </>}
            {p.status === "aprovado" && (
              <button disabled={buscando} onClick={()=>negar(p)} style={btnAcao(t.danger)}>Negar acesso</button>
            )}
            {p.status === "negado" && (
              <button disabled={buscando} onClick={()=>marcarPendente(p)} style={btnAcao(t.laranja)}>Reabrir</button>
            )}
          </div>

          <button onClick={()=>setAberto(exp?null:p.id)} style={{background:"transparent",border:"none",color:t.txt2,fontSize:12,cursor:"pointer",padding:"4px"}}>{exp ? <Icon n="chevron-up" s={12} /> : <Icon n="chevron-down" s={12} />}</button>
        </div>

        {exp && (
          <div style={{borderTop:`1px solid ${t.borda}`,padding:"14px",display:"flex",flexDirection:"column",gap:14}}>
            {ehTeste && (
              <div style={{border:`1px solid ${t.borda2}`,borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:11.5,color:t.txt,flex:1}}>Credenciais de teste</span>
                  <button disabled={buscando} onClick={()=>abrirResetSenha(p.id)} style={{...css.hBtn,fontSize:11,padding:"5px 10px"}}><Icon n="key" s={13} /> Resetar senha</button>
                  <button disabled={buscando} onClick={()=>excluirTeste(p)} style={{...css.hBtn,fontSize:11,padding:"5px 10px",color:t.danger}}><Icon n="trash" s={13} /> Excluir conta</button>
                </div>
                {resetSenha?.userId === p.id && (
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",background:hexRgb(t.ouro,.06),border:`1px solid ${hexRgb(t.ouro,.3)}`,borderRadius:8,padding:"8px 10px"}}>
                    <span style={{fontSize:10.5,color:t.txt2}}>Nova senha:</span>
                    <input value={resetSenha.senha} onChange={e=>setResetSenha(s=>({...s,senha:e.target.value}))} style={{...inp,width:140,fontFamily:"var(--font-mono)"}} />
                    <button onClick={()=>setResetSenha(s=>({...s,senha:gerarSenhaAleatoria()}))} title="Gerar outra" style={{...css.hBtn,padding:"0 8px",fontSize:11}}><Icon n="refresh" s={13} /></button>
                    <button disabled={buscando} onClick={confirmarResetSenha} style={{...btnAcao(t.verde)}}>Salvar nova senha</button>
                    <button onClick={()=>setResetSenha(null)} style={{background:"transparent",border:"none",color:t.txt2,fontSize:11,cursor:"pointer"}}>Cancelar</button>
                  </div>
                )}
              </div>
            )}

            {p.acessos.map(a => {
              const cfg = a.config || {};
              const isCO = a.modulo_slug === "controle_op";
              const perfilCO = cfg.perfil || "operador";
              const permsCO = cfg.perms || PERMS_PADRAO[perfilCO] || {};
              const bases = Array.isArray(cfg.bases) ? cfg.bases : [];
              return (
                <div key={a.id} style={{border:`1px solid ${a.ativo?t.borda2:hexRgb(t.danger,.3)}`,borderRadius:10,padding:"10px 12px",opacity:a.ativo?1:.65}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:12,color:t.txt,flex:1}}>{nomeModulo(a.modulo_slug)}</span>
                    {!isCO && (
                      <select value={a.role} onChange={e=>salvarAcesso(a,{role:e.target.value})} style={sel}>
                        {["admin","editor","viewer"].map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                    <button onClick={()=>salvarAcesso(a,{ativo:!a.ativo})} style={{...chip(a.ativo),color:"var(--color-text-inverse)",borderColor:a.ativo?"var(--chip-solid-success)":"var(--chip-solid-danger)",background:a.ativo?"var(--chip-solid-success)":"var(--chip-solid-danger)"}}>{a.ativo?"Ativo":"Inativo"}</button>
                    <button onClick={()=>remover(a.id)} style={{background:"transparent",border:"none",color:t.txt2,cursor:"pointer",fontSize:14}} title="Remover este registro de módulo"><Icon n="x" s={13} /></button>
                  </div>

                  {isCO && (
                    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:10}}>
                      <div>
                        <div style={rotulo}>Perfil</div>
                        <select value={perfilCO}
                          onChange={e=>{const pf=e.target.value; salvarAcesso(a,{role:PERFIL_TO_ROLE[pf]||"viewer",config:{...cfg,perfil:pf,perms:PERMS_PADRAO[pf]}});}}
                          style={sel}>
                          {PERFIS.map(pf=><option key={pf.k} value={pf.k}>{pf.l}</option>)}
                        </select>
                        <div style={{fontSize:10,color:t.txt2,marginTop:4}}>{PERFIS.find(x=>x.k===perfilCO)?.d}</div>
                      </div>
                      <div>
                        <div style={rotulo}>Bases permitidas</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {BASE_LIST.map(b=>{const on=bases.includes(b.id);return (
                            <button key={b.id} onClick={()=>setConfig(a,{bases:on?bases.filter(x=>x!==b.id):[...bases,b.id]})} style={chip(on)}>{b.label}</button>
                          );})}
                        </div>
                        {bases.length===0 && <div style={{fontSize:9,color:t.danger,marginTop:4}}><Icon n="alert" s={13} /> Sem base — usuário não verá dados</div>}
                      </div>
                      <div>
                        <div style={rotulo}>Permissões finas</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {PERMS_LISTA.map(({key,lbl})=>{const on=permsCO[key]!==false;return (
                            <button key={key} onClick={()=>setConfig(a,{perms:{...permsCO,[key]:!on}})} style={chip(on)}>{lbl}</button>
                          );})}
                        </div>
                      </div>

                      {/* Painel: o que ele vê DENTRO do dashboard. Só aparece se ele
                          tem a aba — configurar KPI de quem não vê o dashboard é ruído. */}
                      {permsCO.dashboard !== false && (
                        <div>
                          <button onClick={()=>setPainelAberto(x=>x===a.id?null:a.id)}
                            style={{background:"transparent",border:"none",color:t.azulLt,fontSize:11,cursor:"pointer",padding:0}}>
                            {painelAberto===a.id ? "Esconder painel do dashboard" : "Configurar painel do dashboard"}
                            {contarOcultos(a.config?.dash) > 0 && <span style={{color:t.txt2}}> · {contarOcultos(a.config?.dash)} oculto(s)</span>}
                          </button>
                          {painelAberto===a.id && (
                            <div style={{marginTop:10,border:`1px solid ${t.borda2}`,borderRadius:10,padding:"10px 12px"}}>
                              <div style={{fontSize:10.5,color:t.txt2,marginBottom:10,lineHeight:1.5}}>
                                Ligado = ele vê. Desligar aqui não mexe no dado, só tira da tela dele.
                              </div>
                              {[["kpis","Indicadores (KPIs)",DASH_KPIS],["blocos","Blocos e painéis",DASH_BLOCOS]].map(([grupo,titulo,lista])=>(
                                <div key={grupo} style={{marginBottom:10}}>
                                  <div style={rotulo}>{titulo}</div>
                                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                    {lista.filter(it=>itemCabeNasBases(it, bases)).map(it=>{
                                      const dash = a.config?.dash || {};
                                      const on = dash[grupo]?.[it.k] !== false;
                                      return (
                                        <button key={it.k} title={it.d}
                                          onClick={()=>setConfig(a,{dash:{...dash,[grupo]:{...(dash[grupo]||{}),[it.k]:!on}}})}
                                          style={chip(on)}>{it.l}</button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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

  // ── Card de convite ───────────────────────────────────────────────────────
  const BotoesAviso = ({ email }) => (
    <>
      <button onClick={()=>copiarLink(email)} style={btnAcao(t.azulLt)}>Copiar aviso</button>
      <button onClick={()=>abrirWpp(email)}   style={btnAcao(t.verde)}>WhatsApp</button>
      <button onClick={()=>abrirGmail(email)} style={btnAcao(t.ouro)}>Gmail</button>
    </>
  );

  const renderConvite = (c) => {
    const cfgCO = (c.modulos || []).find(m => m.slug === "controle_op")?.config || {};
    const bases = Array.isArray(cfgCO.bases) ? cfgCO.bases : [];
    return (
      <div key={c.email} style={{...card, borderStyle:"dashed", borderColor:hexRgb(t.azulLt,.45)}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",flexWrap:"wrap"}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:hexRgb(t.azulLt,.15),color:t.azulLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}><Icon n="mail" s={13} /></div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontWeight:700,fontSize:13,color:t.txt,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {c.nome || c.email.split("@")[0]}
              {cfgCO.perfil && <span style={tag(t.azulLt)}>{String(cfgCO.perfil).toUpperCase()}</span>}
            </div>
            <div style={{fontSize:11,color:t.txt2}}>{c.email}</div>
            <div style={{fontSize:10,color:t.txt2,marginTop:2}}>
              {(c.modulos||[]).map(m=>nomeModulo(m.slug)).join(" · ")}
              {bases.length>0 && " — " + bases.map(id=>BASES[id]?.label||id).join(", ")}
            </div>
          </div>
          <span style={{fontSize:10,color:t.azulLt,fontStyle:"italic",whiteSpace:"nowrap"}}>aguardando 1º login</span>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <BotoesAviso email={c.email}/>
            <button onClick={()=>cancelarConvite(c.email)} style={btnAcao(t.danger)}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Painel "Adicionar usuário" ────────────────────────────────────────────
  const painelAdicionar = (
    <div style={{...card,padding:"16px",marginBottom:16,display:"flex",flexDirection:"column",gap:16}}>
      {/* 1. Quem */}
      <div>
        <div style={{fontSize:12,fontWeight:700,color:t.txt,marginBottom:8}}>1 · Quem é</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={rotulo}>Nome</div>
            <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="ex: Carlos — gestor operação" style={inp}/>
          </div>
        </div>
      </div>

      {/* 2. O que acessa */}
      <div>
        <div style={{fontSize:12,fontWeight:700,color:t.txt,marginBottom:8}}>2 · O que ele acessa</div>
        <div style={rotulo}>Módulos</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {catalogo.map(c=>{
            const on = form.modulos.includes(c.slug);
            return <button key={c.slug} onClick={()=>setForm(f=>({...f,modulos:on?f.modulos.filter(x=>x!==c.slug):[...f.modulos,c.slug]}))} style={chip(on)}>{c.nome}</button>;
          })}
        </div>

        {temCO && <>
          <div style={rotulo}>Perfil no Controle Operacional</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
            {PERFIS.map(pf=>(
              <button key={pf.k} onClick={()=>setForm(f=>({...f,perfil:pf.k,perms:null}))} style={chip(form.perfil===pf.k)}>{pf.l}</button>
            ))}
          </div>
          <div style={{fontSize:10.5,color:t.txt2,marginBottom:12}}>{PERFIS.find(x=>x.k===form.perfil)?.d}</div>

          <div style={rotulo}>Bases que ele vai ver</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {BASE_LIST.map(b=>{
              const on = form.bases.includes(b.id);
              return <button key={b.id} onClick={()=>setForm(f=>({...f,bases:on?f.bases.filter(x=>x!==b.id):[...f.bases,b.id]}))} style={chip(on)}>{b.label}</button>;
            })}
          </div>
          {form.bases.length===0 && <div style={{fontSize:9,color:t.danger,marginTop:4}}><Icon n="alert" s={13} /> Sem base ele não vê dado nenhum</div>}

          <button onClick={()=>setForm(f=>({...f,permsAberto:!f.permsAberto}))}
            style={{marginTop:10,background:"transparent",border:"none",color:t.azulLt,fontSize:11,cursor:"pointer",padding:0}}>
            {form.permsAberto ? "Esconder permissões" : "Ajustar permissões (opcional)"}
          </button>
          {form.permsAberto && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {PERMS_LISTA.map(({key,lbl})=>{
                const on = permsForm[key] !== false;
                return <button key={key} onClick={()=>setForm(f=>({...f,perms:{...permsForm,[key]:!on}}))} style={chip(on)}>{lbl}</button>;
              })}
            </div>
          )}

          {/* Painel já na criação: no caminho do convite a config viaja junto e é
              aplicada no 1º login — não dá pra ajustar depois sem reconvidar. */}
          {permsForm.dashboard !== false && <>
            <button onClick={()=>setForm(f=>({...f,dashAberto:!f.dashAberto}))}
              style={{marginTop:8,background:"transparent",border:"none",color:t.azulLt,fontSize:11,cursor:"pointer",padding:0,display:"block"}}>
              {form.dashAberto ? "Esconder painel do dashboard" : "Escolher o que ele vê no dashboard (opcional)"}
              {contarOcultos(form.dash) > 0 && <span style={{color:t.txt2}}> · {contarOcultos(form.dash)} oculto(s)</span>}
            </button>
            {form.dashAberto && (
              <div style={{marginTop:8,border:`1px solid ${t.borda2}`,borderRadius:10,padding:"10px 12px"}}>
                {[["kpis","Indicadores (KPIs)",DASH_KPIS],["blocos","Blocos e painéis",DASH_BLOCOS]].map(([grupo,titulo,lista])=>(
                  <div key={grupo} style={{marginBottom:10}}>
                    <div style={rotulo}>{titulo}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {lista.filter(it=>itemCabeNasBases(it, form.bases)).map(it=>{
                        const on = form.dash?.[grupo]?.[it.k] !== false;
                        return (
                          <button key={it.k} title={it.d}
                            onClick={()=>setForm(f=>({...f,dash:{...(f.dash||{}),[grupo]:{...(f.dash?.[grupo]||{}),[it.k]:!on}}}))}
                            style={chip(on)}>{it.l}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>}
        </>}
      </div>

      {/* 3. Como entra */}
      <div>
        <div style={{fontSize:12,fontWeight:700,color:t.txt,marginBottom:8}}>3 · Como ele entra</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[
            { k:"google", tit:"Convite por e-mail (Google)", des:"Ele loga com o Google e já cai nas telas — sem fila de aprovação." },
            { k:"teste",  tit:"Usuário de teste (senha)",    des:"Usuário + senha que você entrega. Não precisa de e-mail." },
          ].map(op=>{
            const on = form.entrada===op.k;
            return (
              <button key={op.k} onClick={()=>setForm(f=>({...f,entrada:op.k}))}
                style={{flex:1,minWidth:220,textAlign:"left",cursor:"pointer",borderRadius:10,padding:"10px 12px",
                  border:`1.5px solid ${on?t.ouro:t.borda2}`,background:on?hexRgb(t.ouro,.08):"transparent"}}>
                <div style={{fontSize:12,fontWeight:700,color:on?t.ouro:t.txt}}>{op.tit}</div>
                <div style={{fontSize:10.5,color:t.txt2,marginTop:3,lineHeight:1.45}}>{op.des}</div>
              </button>
            );
          })}
        </div>

        <div style={{marginTop:12}}>
          {form.entrada === "google" ? (
            <div style={{maxWidth:340}}>
              <div style={rotulo}>E-mail do Google</div>
              <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="nome@empresa.com.br" style={inp}/>
            </div>
          ) : (
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:150}}>
                <div style={rotulo}>Usuário</div>
                <input value={form.username} onChange={e=>setForm(f=>({...f,username:normalizarUsername(e.target.value)}))} placeholder="ex: cliente_demo" style={inp}/>
              </div>
              <div style={{flex:1,minWidth:150}}>
                <div style={rotulo}>Senha</div>
                <div style={{display:"flex",gap:6}}>
                  <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={inp}/>
                  <button onClick={()=>setForm(f=>({...f,password:gerarSenhaAleatoria()}))} title="Gerar nova senha" style={{...css.hBtn,padding:"0 10px",fontSize:12}}><Icon n="refresh" s={13} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button disabled={salvando} onClick={salvarNovo}
          style={{background:t.ouro,color:t.onPrimary,border:"none",borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:salvando?"default":"pointer",opacity:salvando?.6:1}}>
          {salvando ? "Salvando…" : form.entrada === "google" ? "Liberar acesso por e-mail" : "Criar usuário de teste"}
        </button>
        <button onClick={()=>{setAddOpen(false); setForm(FORM_VAZIO());}}
          style={{background:"transparent",border:"none",color:t.txt2,fontSize:12,cursor:"pointer"}}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div style={{...css.app,background:t.bg,minHeight:"100vh",padding:"24px 18px"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={onVoltar} style={{...css.hBtn,padding:"7px 12px",fontSize:12}}><Icon n="arrow-left" s={13} /> Voltar</button>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontFamily:"var(--font-heading)",fontSize:17,fontWeight:700,color:t.txt}}>Gerenciar acessos</div>
            <div style={{fontSize:11,color:t.txt2}}>Libere módulos e defina permissões por usuário</div>
          </div>
          <button onClick={()=>{setAddOpen(v=>!v); setCredenciaisCriadas(null); setConviteCriado(null);}}
            style={{background:addOpen?"transparent":t.ouro,color:addOpen?t.txt2:t.onPrimary,border:addOpen?`1px solid ${t.borda2}`:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
            {addOpen ? "Fechar" : "+ Adicionar usuário"}
          </button>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou email…" style={{...inp,flex:1,minWidth:180}} />
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {convitesFiltrados.length>0 && <span style={tag(t.azulLt)}>{convitesFiltrados.length} convite{convitesFiltrados.length>1?"s":""}</span>}
            {pendentes.length>0 && <span style={tag(t.laranja)}>{pendentes.length} aguardando</span>}
            <span style={tag(t.verde)}>{comAcesso.length} com acesso</span>
          </div>
        </div>

        {addOpen && painelAdicionar}

        {/* Passo que faltava: o convite era criado e a tela dava "ok", mas ninguém
            avisava a pessoa — e o app não envia e-mail. Agora o aviso pronto aparece
            junto com a confirmação, no momento em que dá pra mandar. */}
        {conviteCriado && (
          <div style={{...card,padding:"14px",marginBottom:16,border:`1px solid ${hexRgb(t.azulLt,.4)}`,background:hexRgb(t.azulLt,.06)}}>
            <div style={{fontSize:12,fontWeight:700,color:t.azulLt,marginBottom:6}}><Icon n="check" s={13} /> Convite criado para {conviteCriado.email} — falta avisar a pessoa</div>
            <div style={{fontSize:11,color:t.txt2,lineHeight:1.5,marginBottom:8}}>
              O sistema <b>não envia e-mail</b>: o convite libera esse endereço aqui dentro e o acesso entra no 1º login —
              e só se ela entrar com o Google <b>desse mesmo e-mail</b>. Mande o aviso abaixo:
            </div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:t.txt,background:t.inputBg,border:`1px solid ${t.borda}`,borderRadius:8,padding:"8px 10px",whiteSpace:"pre-wrap",marginBottom:8}}>
              {avisoDe(conviteCriado.email).texto}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><BotoesAviso email={conviteCriado.email}/></div>
            <button onClick={()=>setConviteCriado(null)} style={{marginTop:8,background:"transparent",border:"none",color:t.txt2,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Fechar</button>
          </div>
        )}

        {credenciaisCriadas && (
          <div style={{...card,padding:"14px",marginBottom:16,border:`1px solid ${hexRgb(t.verde,.4)}`,background:hexRgb(t.verde,.06)}}>
            <div style={{fontSize:12,fontWeight:700,color:t.verde,marginBottom:6}}><Icon n="check" s={13} /> Usuário de teste criado — anote a senha, ela não aparece de novo (a menos que você resete depois)</div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:12,color:t.txt,display:"flex",flexDirection:"column",gap:2}}>
              <div>usuário: <b>{credenciaisCriadas.username}</b></div>
              <div>senha: <b>{credenciaisCriadas.password}</b></div>
            </div>
            {credenciaisCriadas.needsEmailConfirm && (
              <div style={{fontSize:10.5,color:t.danger,marginTop:8,lineHeight:1.5}}><Icon n="alert" s={13} /> Este projeto Supabase exige confirmação de email — esse usuário fictício nunca vai confirmar. Peça pro admin do Supabase desativar "Confirm email" em Authentication <Icon n="arrow-right" s={13} /> Providers <Icon n="arrow-right" s={13} /> Email pra esse login funcionar.</div>
            )}
            <button onClick={()=>setCredenciaisCriadas(null)} style={{marginTop:8,background:"transparent",border:"none",color:t.txt2,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Fechar</button>
          </div>
        )}

        {perfis === null ? <div style={{fontSize:12,color:t.txt2}}>Carregando…</div>
        : (filtrados.length === 0 && convitesFiltrados.length === 0)
          ? <div style={{fontSize:12,color:t.txt2}}>{busca ? "Nenhum usuário encontrado." : "Nenhum usuário ainda. Use \"+ Adicionar usuário\" pra liberar um e-mail — a pessoa loga com o Google e já entra."}</div>
        : <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {convitesFiltrados.length > 0 && (
            <div>
              {secTitulo(t.azulLt, `Convites — acesso já definido (${convitesFiltrados.length})`)}
              <div style={{fontSize:10.5,color:t.txt2,marginTop:-4,marginBottom:8,lineHeight:1.5}}>
                O app não envia e-mail — quem avisa é você. Se a pessoa disser que não recebeu nada, é isto: mande o aviso por WhatsApp ou Gmail.
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>{convitesFiltrados.map(renderConvite)}</div>
            </div>
          )}
          {pendentes.length > 0 && (
            <div>
              {secTitulo(t.laranja, `Aguardando aprovação (${pendentes.length})`)}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>{pendentes.map(renderUserCard)}</div>
            </div>
          )}
          {comAcesso.length > 0 && (
            <div>
              {secTitulo(t.verde, `Com acesso (${comAcesso.length})`)}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>{comAcesso.map(renderUserCard)}</div>
            </div>
          )}
          {negadosTd.length > 0 && (
            <div>
              {secTitulo(t.danger, `Acesso negado (${negadosTd.length})`)}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>{negados.map(renderUserCard)}</div>
              {negadosTd.length > NEGADOS_PREVIA && (
                <button onClick={()=>setVerTodosNegados(v=>!v)} style={{marginTop:8,background:"transparent",border:"none",color:t.azulLt,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>
                  {verTodosNegados ? "Mostrar só os últimos" : `Ver todos (${negadosTd.length})`}
                </button>
              )}
            </div>
          )}
        </div>}
      </div>
      <Toast {...toast}/>
    </div>
  );
}
