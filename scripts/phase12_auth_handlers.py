"""
Phase 12: Extract getConfigRemoto, setConfigRemoto, handleLogin, handleLogout,
handlePrimeiroLoginSalvar into src/hooks/useAuthHandlers.js

Two separate blocks in App.jsx:
  Block A: getConfigRemoto + setConfigRemoto (lines ~573-595)
  Block B: handleLogin + handleLogout + handlePrimeiroLoginSalvar (lines ~720-874)
"""
from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── Block A: getConfigRemoto + setConfigRemoto ────────────────────────────────
blkA_start = "  // ── Helpers para co_config no Supabase ──"
blkA_end   = "  }, [getConexao]);\n\n  const { registrarLog"  # ends before useAdminHandlers call

idx_As = content.index(blkA_start)
idx_Ae = content.index(blkA_end) + len("  }, [getConexao]);")

blkA = content[idx_As:idx_Ae]
print(f"Block A (config helpers): {blkA.count(chr(10))} lines")

# ── Block B: handleLogin + handleLogout + handlePrimeiroLoginSalvar ───────────
blkB_start = "  // Login handler\n  const handleLogin"
blkB_end   = "  };\n\n  // Search\n"

idx_Bs = content.index(blkB_start)
idx_Be = content.index(blkB_end) + len("  };")

blkB = content[idx_Bs:idx_Be]
print(f"Block B (auth handlers): {blkB.count(chr(10))} lines")

# ── Helper: strip 2-space indent ──────────────────────────────────────────────
def deindent(block):
    return "\n".join(
        line[2:] if line.startswith("  ") else line
        for line in block.splitlines()
    )

# ── Build hook file ────────────────────────────────────────────────────────────
hook_js = (
    'import { useCallback } from "react";\n'
    'import { loadJSON, saveJSON, hashSenha, verificarSenha } from "../utils.js";\n'
    'import { supaFetch } from "../supabase.js";\n'
    'import { BASES, TABLE_CONFIG, ENV_SUPA_URL, ENV_SUPA_KEY, PERMS_PADRAO } from "../constants.js";\n'
    '\n'
    'export function useAuthHandlers({\n'
    '  getConexao, showToast, registrarLog,\n'
    '  sessionToken, usuarioLogado, perfil,\n'
    '  authEmail, authSenha, setAuthEmail, setAuthSenha, setAuthMsg,\n'
    '  setPerfil, setPerms, setAuthed, setUsuarioLogado,\n'
    '  usuarios, setUsuarios,\n'
    '  setAguardandoAprovacao, setPendingUserInfo,\n'
    '  setPrimeiroLogin, primLoginSenha, primLoginSenha2, setPrimLoginSenha, setPrimLoginSenha2,\n'
    '  setSessionToken, setBasesPermitidas, setBaseAtual, setHubScreen, setActiveTab,\n'
    '}) {\n'
    + deindent(blkA) + "\n\n"
    + deindent(blkB) + "\n\n"
    '  return { getConfigRemoto, setConfigRemoto, handleLogin, handleLogout, handlePrimeiroLoginSalvar };\n'
    '}\n'
)

Path("src/hooks/useAuthHandlers.js").write_text(hook_js, encoding="utf-8")
print("Created src/hooks/useAuthHandlers.js")

# ── Modify App.jsx ─────────────────────────────────────────────────────────────
# 1. Add import after useAdminHandlers
OLD_IMPORT = "import { useAdminHandlers } from './hooks/useAdminHandlers.js';"
NEW_IMPORT = (
    "import { useAdminHandlers } from './hooks/useAdminHandlers.js';\n"
    "import { useAuthHandlers } from './hooks/useAuthHandlers.js';"
)
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Replace Block A with the hook destructuring call
idx_As2 = content.index(blkA_start)
idx_Ae2 = content.index(blkA_end) + len("  }, [getConexao]);")
old_A = content[idx_As2:idx_Ae2]

new_A = (
    "  const { getConfigRemoto, setConfigRemoto, handleLogin, handleLogout, handlePrimeiroLoginSalvar } = useAuthHandlers({\n"
    "    getConexao, showToast, registrarLog,\n"
    "    sessionToken, usuarioLogado, perfil,\n"
    "    authEmail, authSenha, setAuthEmail, setAuthSenha, setAuthMsg,\n"
    "    setPerfil, setPerms, setAuthed, setUsuarioLogado,\n"
    "    usuarios, setUsuarios,\n"
    "    setAguardandoAprovacao, setPendingUserInfo,\n"
    "    setPrimeiroLogin, primLoginSenha, primLoginSenha2, setPrimLoginSenha, setPrimLoginSenha2,\n"
    "    setSessionToken, setBasesPermitidas, setBaseAtual, setHubScreen, setActiveTab,\n"
    "  });"
)

assert content.count(old_A) == 1
content = content.replace(old_A, new_A, 1)

# 3. Remove Block B (handleLogin/Logout/PrimeiroLogin) from App.jsx
idx_Bs2 = content.index(blkB_start)
idx_Be2 = content.index(blkB_end) + len("  };")
old_B = content[idx_Bs2:idx_Be2]

assert content.count(old_B) == 1
content = content.replace(old_B, "  // handleLogin / handleLogout / handlePrimeiroLoginSalvar — via useAuthHandlers", 1)

app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
