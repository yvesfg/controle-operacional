# -*- coding: utf-8 -*-
"""Unificacao auth: login Google-only via Supabase Auth, OAuth callback -> Hub."""
from pathlib import Path

ROOT = Path(__file__).parent.parent
app = ROOT / "src/App.jsx"
content = app.read_text(encoding="utf-8")
orig = content

def rep(old, new, n=1):
    global content
    c = content.count(old)
    assert c == n, f"esperado {n}, achei {c} para: {old[:70]!r}"
    content = content.replace(old, new, n)

# 1) import getSupaAuth
rep(
    "import HubScreen          from './screens/HubScreen.jsx';",
    "import HubScreen          from './screens/HubScreen.jsx';\n"
    "import { getSupaAuth } from './supabaseAuth.js';",
)

# 2) substituir todo o useEffect do callback OAuth pelo bootstrap de sessao
START = "  // ── Callback OAuth: detecta retorno do Google/Apple e loga automaticamente ──"
END   = "  }, []); // Roda uma única vez no mount — processa hash OAuth do redirect"
i = content.index(START)
j = content.index(END) + len(END)
bootstrap = (
    "  // ── Bootstrap sessão Supabase Auth (Google). Loga e cai no Hub. ──\n"
    "  useEffect(() => {\n"
    "    const sb = getSupaAuth();\n"
    "    if (!sb) return;\n"
    "    const aplicar = (sess) => {\n"
    "      if (!sess?.access_token) return;\n"
    "      try { sessionStorage.setItem(\"co_supa_tokens\", JSON.stringify({ access_token: sess.access_token, refresh_token: sess.refresh_token || \"\" })); } catch {}\n"
    "      const nome = sess.user?.user_metadata?.full_name || sess.user?.user_metadata?.name || sess.user?.email || \"\";\n"
    "      setUsuarioLogado(nome);\n"
    "      setAuthed(true);\n"
    "    };\n"
    "    sb.auth.getSession().then(({ data }) => aplicar(data?.session));\n"
    "    const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) => aplicar(sess));\n"
    "    return () => { try { sub?.subscription?.unsubscribe(); } catch {} };\n"
    "    // eslint-disable-next-line react-hooks/exhaustive-deps\n"
    "  }, []);"
)
content = content[:i] + bootstrap + content[j:]

# 3) LoginScreen: enxuga props (Google-only)
rep(
    "    return <LoginScreen\n"
    "      t={t} css={css} theme={theme} setTheme={setTheme}\n"
    "      authEmail={authEmail} setAuthEmail={setAuthEmail}\n"
    "      authSenha={authSenha} setAuthSenha={setAuthSenha}\n"
    "      authMsg={authMsg}\n"
    "      handleLogin={handleLogin} iniciarOAuth={iniciarOAuth}\n"
    "      toast={toast}\n"
    "    />;",
    "    return <LoginScreen\n"
    "      t={t} css={css} theme={theme} setTheme={setTheme}\n"
    "      authMsg={authMsg}\n"
    "      toast={toast}\n"
    "    />;",
)

# 4) HubScreen: novos props (dinamico + entrada nos modulos)
rep(
    "    return <HubScreen\n"
    "      t={t} css={css}\n"
    "      onSelectControleOp={() => setHubScreen(\"controle_op\")}\n"
    "      frotaUrl={import.meta.env.VITE_FROTA_URL || \"http://localhost:3000\"}\n"
    "      handleLogout={handleLogout}\n"
    "      toast={toast}\n"
    "    />;",
    "    return <HubScreen\n"
    "      t={t} css={css}\n"
    "      setHubScreen={setHubScreen}\n"
    "      setPerfil={setPerfil} setPerms={setPerms}\n"
    "      setBasesPermitidas={setBasesPermitidas} setBaseAtual={setBaseAtual}\n"
    "      frotaUrl={import.meta.env.VITE_FROTA_URL || \"http://localhost:3000\"}\n"
    "      handleLogout={handleLogout} showToast={showToast}\n"
    "      toast={toast}\n"
    "    />;",
)

assert content != orig
app.write_text(content, encoding="utf-8")
print("App.jsx patched. linhas:", len(content.splitlines()))
