import React, { useEffect, useRef, useState } from "react";
import Toast from "../components/Toast.jsx";
import { hexRgb, BASES, PERMS_PADRAO } from "../constants.js";
import { fetchMeusModulos, fetchMeuAcesso } from "../supabaseAuth.js";
import HubAdmin from "./HubAdmin.jsx";
import loginLogo from "../../assets/images/logo-login.png";

// SVG por slug (catálogo visual local; o que aparece vem de meus_modulos)
const SVGS = {
  controle_op: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></>,
  frota:       <><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2 3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  calculadora: <><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 7h6M9 12h6M9 17h3"/></>,
  antt:        <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></>,
  financeiro:  <><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="4" width="3" height="13"/></>,
};
const DESCS = {
  controle_op:"Cargas · Operações · Relatórios", frota:"Veículos · Pneus · Viagens",
  calculadora:"Custo · Margem · Tabela", antt:"RNTRC · CIOT · Rastreio",
  financeiro:"DRE · Contas · Fluxo de Caixa",
};
const ROLE_TO_PERFIL = { admin:"admin", editor:"operador", viewer:"visualizador" };

export default function HubScreen({
  t, css,
  setHubScreen, setPerfil, setPerms, setBasesPermitidas, setBaseAtual,
  frotaUrl, handleLogout, showToast, toast,
}) {
  const [mods, setMods] = useState(null);   // null = carregando
  const [showAdmin, setShowAdmin] = useState(false);
  const frotaIframeRef = useRef(null);
  const [showFrotaModal, setShowFrotaModal] = useState(false);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [iframeTitle, setIframeTitle] = useState("");
  const acessoCORef = useRef(null);

  useEffect(() => {
    let cancel = false;
    fetchMeusModulos().then(d => {
      if (cancel) return;
      setMods(d || []);
      // Pré-carrega acesso ao CO em background para eliminar latência no clique
      if ((d || []).some(m => m.slug === "controle_op")) {
        fetchMeuAcesso("controle_op").then(a => { if (!cancel) acessoCORef.current = a; });
      }
    });
    return () => { cancel = true; };
  }, []);

  const ehAdmin = (mods || []).some(m => m.slug === "controle_op" && m.role === "admin");

  // ── Entrar no Controle Operacional: deriva perfil/perms/bases do hub ──
  const entrarControleOp = async () => {
    const acesso = acessoCORef.current ?? await fetchMeuAcesso("controle_op");
    const cfg = acesso?.config || {};
    const perfil = cfg.perfil || ROLE_TO_PERFIL[acesso?.role] || "visualizador";
    const perms = cfg.perms || PERMS_PADRAO[perfil] || PERMS_PADRAO.visualizador;
    let baseIds = Array.isArray(cfg.bases) ? cfg.bases : [];
    if (perfil === "admin" && baseIds.length === 0) baseIds = Object.keys(BASES);
    const bases = baseIds.map(id => BASES[id]).filter(Boolean);
    const permitidas = bases.length ? bases : [BASES.imperatriz_belem];
    setPerfil(perfil); setPerms(perms);
    setBasesPermitidas(permitidas);
    setBaseAtual(permitidas.length === 1 ? permitidas[0] : null);
    setHubScreen("controle_op");
  };

  // ── SSO Frota: iframe + postMessage ──
  const entrarFrota = () => {
    setShowFrotaModal(true);

    const _handler = (e) => {
      if (!frotaUrl.startsWith(e.origin)) return;
      if (e.data?.type !== "REQUEST_CO_TOKENS") return;

      try {
        const _raw = sessionStorage.getItem("co_supa_tokens");
        const _tk = _raw ? JSON.parse(_raw) : null;
        if (_tk?.access_token) {
          try {
            const _pay = JSON.parse(atob(_tk.access_token.split(".")[1]));
            if (_pay.exp && _pay.exp * 1000 < Date.now()) {
              frotaIframeRef.current?.contentWindow?.postMessage({ type: "SUPA_TOKENS", expired: true }, e.origin);
              return;
            }
          } catch {}
          frotaIframeRef.current?.contentWindow?.postMessage({ type: "SUPA_TOKENS", access_token: _tk.access_token, refresh_token: _tk.refresh_token || "" }, e.origin);
        } else {
          frotaIframeRef.current?.contentWindow?.postMessage({ type: "SUPA_TOKENS", access_token: null }, e.origin);
        }
      } catch (err) { console.error("[SSO iframe] erro ao enviar tokens:", err); }
    };

    window.addEventListener("message", _handler);

    // Cleanup ao fechar modal
    return () => window.removeEventListener("message", _handler);
  };

  const fecharFrota = () => {
    setShowFrotaModal(false);
    frotaIframeRef.current = null;
  };

  const entrarExterno = (m) => {
    let url = m.url || '';
    try {
      const raw = sessionStorage.getItem("co_supa_tokens");
      const tk  = raw ? JSON.parse(raw) : null;
      if (tk?.access_token) {
        url += (url.includes('?') ? '&' : '?') + 'hub_token=' + encodeURIComponent(tk.access_token);
      }
    } catch {}
    setIframeUrl(url);
    setIframeTitle(m.nome || m.slug);
  };
  const fecharExterno = () => { setIframeUrl(null); setIframeTitle(""); };

  const abrir = (m) => {
    if (m.slug === "controle_op") entrarControleOp();
    else if (m.slug === "frota") entrarFrota();
    else if (m.slug === "antt" || m.slug === "calculadora") entrarExterno(m);
    else if (m.url && /^https?:/.test(m.url)) window.open(m.url, "_blank");
    else showToast?.("⏳ Módulo em breve", "warn");
  };

  if (showAdmin) {
    return <HubAdmin t={t} css={css} showToast={showToast} toast={toast} onVoltar={() => setShowAdmin(false)} />;
  }

  if (iframeUrl) {
    return (
      <div style={{position:"relative",width:"100%",height:"100vh"}}>
        <iframe src={iframeUrl} style={{width:"100%",height:"100%",border:"none",display:"block"}} title={iframeTitle} allow="camera" />
        <button
          onClick={fecharExterno}
          title="Voltar ao Hub"
          style={{position:"absolute",top:12,right:12,zIndex:10,background:"rgba(20,24,29,.85)",backdropFilter:"blur(6px)",border:`1px solid ${t.borda}`,borderRadius:8,padding:"6px 12px",fontSize:11,color:t.txt2,cursor:"pointer",fontWeight:600,lineHeight:1}}
        >← Hub</button>
      </div>
    );
  }

  if (showFrotaModal) {
    return (
      <div style={{position:"relative",width:"100%",height:"100vh"}}>
        <iframe ref={frotaIframeRef} src={`${frotaUrl}/auth/hub`} style={{width:"100%",height:"100%",border:"none",display:"block"}}/>
        <button
          onClick={fecharFrota}
          title="Voltar ao Hub"
          style={{position:"absolute",top:12,right:12,zIndex:10,background:"rgba(20,24,29,.85)",backdropFilter:"blur(6px)",border:`1px solid ${t.borda}`,borderRadius:8,padding:"6px 12px",fontSize:11,color:t.txt2,cursor:"pointer",fontWeight:600,lineHeight:1}}
        >← Hub</button>
      </div>
    );
  }

  return (
    <div style={{...css.app,background:t.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <style>{`@keyframes hubUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes hubPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{position:"absolute",top:"-5%",left:"50%",transform:"translateX(-50%)",width:"700px",height:"380px",background:`radial-gradient(ellipse,${hexRgb(t.ouro,.07)} 0%,transparent 68%)`,pointerEvents:"none"}}/>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:32,animation:"hubPop .4s ease-out",position:"relative",zIndex:1}}>
        <img src={loginLogo} alt="YFGroup" width="68" height="68" style={{marginBottom:12,borderRadius:"50%"}}/>
        <div style={{fontFamily:"var(--font-heading)",fontSize:22,fontWeight:700,letterSpacing:"-.03em",color:t.txt,lineHeight:1}}>YFGroup</div>
        <div style={{width:32,height:2,background:t.ouro,borderRadius:1,margin:"6px 0"}}/>
        <div style={{fontSize:9,color:t.txt2,letterSpacing:".14em",textTransform:"uppercase"}}>Selecione o módulo</div>
      </div>

      {mods === null ? (
        <div style={{fontSize:12,color:t.txt2,position:"relative",zIndex:1}}>Carregando módulos…</div>
      ) : mods.length === 0 ? (
        <div style={{maxWidth:380,textAlign:"center",position:"relative",zIndex:1,background:t.card,border:`1px solid ${t.borda}`,borderRadius:14,padding:"28px 24px"}}>
          <div style={{fontSize:13,fontWeight:700,color:t.txt,marginBottom:6}}>Nenhum módulo liberado ainda</div>
          <div style={{fontSize:11,color:t.txt2,lineHeight:1.6}}>Sua conta foi criada. Aguarde o administrador liberar o acesso aos módulos.</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:520,width:"100%",animation:"hubUp .38s ease-out",position:"relative",zIndex:1}}>
          {mods.filter(m => m.slug !== 'financeiro').map(m => (
            <button key={m.slug} onClick={()=>abrir(m)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"20px 10px 18px",background:t.card,
                border:`1.5px solid ${t.borda2||t.borda}`,borderRadius:14,cursor:"pointer",
                transition:"border-color .18s, transform .18s, background .18s",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=hexRgb(t.ouro,.6);e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.background=t.bgAlt||t.card2;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borda2||t.borda;e.currentTarget.style.transform="none";e.currentTarget.style.background=t.card;}}
            >
              <span className="co-sidebar__ico" style={{width:52,height:52,borderRadius:13,flexShrink:0,
                background:`linear-gradient(135deg,${hexRgb(t.ouro,.16)},${hexRgb(t.ouro,.05)})`,
                border:`1.5px solid ${hexRgb(t.ouro,.22)}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={t.ouro} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {SVGS[m.slug] || <circle cx="12" cy="12" r="9"/>}
                </svg>
              </span>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-heading)",fontSize:12,fontWeight:700,color:t.txt,letterSpacing:"-.01em",lineHeight:1.2}}>{m.nome}</div>
                <div style={{fontSize:8.5,color:t.txt2,marginTop:3,lineHeight:1.4}}>{m.descricao || DESCS[m.slug] || ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:18,marginTop:24,position:"relative",zIndex:1}}>
        {ehAdmin && (
          <button onClick={()=>setShowAdmin(true)} style={{background:"transparent",border:"none",fontSize:11,color:t.ouro,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Gerenciar acessos
          </button>
        )}
        <button onClick={handleLogout} style={{background:"transparent",border:"none",fontSize:11,color:t.txt2,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
          Sair e trocar conta
        </button>
      </div>
      <Toast {...toast}/>
    </div>
  );
}
