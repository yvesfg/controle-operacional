import re, shutil, sys
from pathlib import Path
from datetime import datetime

app = Path("src/App.jsx")
assert app.exists(), "App.jsx not found"

# Backup
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
bak = Path(f"src/App.jsx.bak_{ts}")
shutil.copy2(app, bak)
print(f"Backup: {bak}")

content = app.read_text(encoding="utf-8")

# ─── 1. Add imports after last import line ───────────────────────────────────
# Insert after "import OcorrModal from './components/OcorrModal.jsx';"
OLD_IMPORT_ANCHOR = "import OcorrModal from './components/OcorrModal.jsx';"
NEW_IMPORTS = """import OcorrModal from './components/OcorrModal.jsx';
import AprovacaoScreen    from './screens/AprovacaoScreen.jsx';
import LoginScreen        from './screens/LoginScreen.jsx';
import HubScreen          from './screens/HubScreen.jsx';
import BaseSelectorScreen from './screens/BaseSelectorScreen.jsx';
import PrimeiroLoginScreen from './screens/PrimeiroLoginScreen.jsx';"""

assert content.count(OLD_IMPORT_ANCHOR) == 1, f"Expected 1 occurrence of import anchor, found {content.count(OLD_IMPORT_ANCHOR)}"
content = content.replace(OLD_IMPORT_ANCHOR, NEW_IMPORTS, 1)
print("Imports added")

# ─── 2. Replace AprovacaoScreen block ────────────────────────────────────────
OLD_APROV_START = "  if (aguardandoAprovacao && !authed) {"
OLD_APROV_END   = "  }"  # ends after the Toast line

# Find the block from start to its closing brace (after the Toast)
# The block ends at line containing "  }" after "  }" + empty lines
# Strategy: find the exact block using known start and known unique end marker
APROV_BLOCK_START = "  // ══════════════════════════════════════════════\n  //  TELA: AGUARDANDO APROVAÇÃO\n  // ══════════════════════════════════════════════\n  if (aguardandoAprovacao && !authed) {"
assert content.count(APROV_BLOCK_START) == 1, "AprovacaoScreen block not found uniquely"

# Find start position
start_pos = content.find(APROV_BLOCK_START)

# Find the end: the closing "  }" that ends this if block
# We know it's after "<Toast {...toast} />" and "</div>\n    );\n  }"
end_marker = "  }\n\n  // ══════════════════════════════════════════════\n  //  AUTH SCREEN"
end_pos = content.find(end_marker, start_pos)
assert end_pos > start_pos, "Could not find end of AprovacaoScreen block"

old_aprov_block = content[start_pos:end_pos]
new_aprov_block = """  // ══════════════════════════════════════════════
  //  TELA: AGUARDANDO APROVAÇÃO
  // ══════════════════════════════════════════════
  if (aguardandoAprovacao && !authed) {
    return <AprovacaoScreen
      t={t} css={css} theme={theme} setTheme={setTheme}
      pendingUserInfo={pendingUserInfo} setPendingUserInfo={setPendingUserInfo}
      setAguardandoAprovacao={setAguardandoAprovacao}
      setPerfil={setPerfil} setPerms={setPerms} setAuthed={setAuthed}
      setUsuarioLogado={setUsuarioLogado}
      getConexao={getConexao} showToast={showToast}
      toast={toast}
    />;
  }"""

assert content.count(old_aprov_block) == 1
content = content.replace(old_aprov_block, new_aprov_block, 1)
print("AprovacaoScreen replaced")

# ─── 3. Replace LoginScreen block ────────────────────────────────────────────
LOGIN_BLOCK_START = "  // ══════════════════════════════════════════════\n  //  AUTH SCREEN\n  // ══════════════════════════════════════════════\n  if (!authed) {"
assert content.count(LOGIN_BLOCK_START) == 1, "LoginScreen block not found uniquely"
start_pos = content.find(LOGIN_BLOCK_START)

end_marker_login = "  // ── Hub: Seletor de Módulo ────────────────────────────────────"
end_pos = content.find(end_marker_login, start_pos)
assert end_pos > start_pos, "Could not find end of LoginScreen block"

old_login_block = content[start_pos:end_pos]
new_login_block = """  // ══════════════════════════════════════════════
  //  AUTH SCREEN
  // ══════════════════════════════════════════════
  if (!authed) {
    return <LoginScreen
      t={t} css={css} theme={theme} setTheme={setTheme}
      authEmail={authEmail} setAuthEmail={setAuthEmail}
      authSenha={authSenha} setAuthSenha={setAuthSenha}
      authMsg={authMsg}
      handleLogin={handleLogin} iniciarOAuth={iniciarOAuth}
      toast={toast}
    />;
  }

"""

assert content.count(old_login_block) == 1
content = content.replace(old_login_block, new_login_block, 1)
print("LoginScreen replaced")

# ─── 4. Replace HubScreen block ──────────────────────────────────────────────
HUB_BLOCK_START = "  // ── Hub: Seletor de Módulo ────────────────────────────────────\n  if (authed && !hubScreen) {"
assert content.count(HUB_BLOCK_START) == 1, "HubScreen block not found uniquely"
start_pos = content.find(HUB_BLOCK_START)

end_marker_hub = "  // ── Seletor de Base Operacional ───────────────────────────────"
end_pos = content.find(end_marker_hub, start_pos)
assert end_pos > start_pos, "Could not find end of HubScreen block"

old_hub_block = content[start_pos:end_pos]
new_hub_block = """  // ── Hub: Seletor de Módulo ────────────────────────────────────
  if (authed && !hubScreen) {
    return <HubScreen
      t={t} css={css}
      onSelectControleOp={() => setHubScreen("controle_op")}
      frotaUrl={import.meta.env.VITE_FROTA_URL || "http://localhost:3000"}
      handleLogout={handleLogout}
      toast={toast}
    />;
  }
"""

assert content.count(old_hub_block) == 1
content = content.replace(old_hub_block, new_hub_block, 1)
print("HubScreen replaced")

# ─── 5. Replace BaseSelectorScreen block ─────────────────────────────────────
BASE_BLOCK_START = "  // ── Seletor de Base Operacional ───────────────────────────────\n  if (authed && hubScreen === \"controle_op\" && !baseAtual && basesPermitidas.length > 1) {"
assert content.count(BASE_BLOCK_START) == 1, "BaseSelectorScreen block not found uniquely"
start_pos = content.find(BASE_BLOCK_START)

end_marker_base = "  // ══════════════════════════════════════════════\n  //  MODAL PRIMEIRO LOGIN"
end_pos = content.find(end_marker_base, start_pos)
assert end_pos > start_pos, "Could not find end of BaseSelectorScreen block"

old_base_block = content[start_pos:end_pos]
new_base_block = """  // ── Seletor de Base Operacional ───────────────────────────────
  if (authed && hubScreen === "controle_op" && !baseAtual && basesPermitidas.length > 1) {
    return <BaseSelectorScreen
      t={t} css={css}
      basesPermitidas={basesPermitidas} setBaseAtual={setBaseAtual}
      handleLogout={handleLogout}
      toast={toast}
    />;
  }

"""

assert content.count(old_base_block) == 1
content = content.replace(old_base_block, new_base_block, 1)
print("BaseSelectorScreen replaced")

# ─── 6. Replace PrimeiroLoginScreen block ────────────────────────────────────
PRIM_BLOCK_START = "  // ══════════════════════════════════════════════\n  //  MODAL PRIMEIRO LOGIN (troca de senha + logo)\n  // ══════════════════════════════════════════════\n  if (primeiroLogin) {"
assert content.count(PRIM_BLOCK_START) == 1, "PrimeiroLoginScreen block not found uniquely"
start_pos = content.find(PRIM_BLOCK_START)

end_marker_prim = "  // ══════════════════════════════════════════════\n  //  MAIN APP RENDER"
end_pos = content.find(end_marker_prim, start_pos)
assert end_pos > start_pos, "Could not find end of PrimeiroLoginScreen block"

old_prim_block = content[start_pos:end_pos]
new_prim_block = """  // ══════════════════════════════════════════════
  //  MODAL PRIMEIRO LOGIN (troca de senha + logo)
  // ══════════════════════════════════════════════
  if (primeiroLogin) {
    return <PrimeiroLoginScreen
      t={t} css={css}
      primLoginSenha={primLoginSenha} setPrimLoginSenha={setPrimLoginSenha}
      primLoginSenha2={primLoginSenha2} setPrimLoginSenha2={setPrimLoginSenha2}
      customLogo={customLogo} setCustomLogo={setCustomLogo}
      handlePrimeiroLoginSalvar={handlePrimeiroLoginSalvar}
      toast={toast}
    />;
  }

"""

assert content.count(old_prim_block) == 1
content = content.replace(old_prim_block, new_prim_block, 1)
print("PrimeiroLoginScreen replaced")

# ─── Write ───────────────────────────────────────────────────────────────────
app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx updated. Backup at {bak}")
