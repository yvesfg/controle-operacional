"""
Phase 11c: Extract sincronizar, carregarAponts, syncUsuariosRemoto, carregarPendentes
into src/hooks/useSyncHandlers.js
"""
from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── Extract sincronizar block ──────────────────────────────────────────────────
sinc_start  = "  // Sync\n  const sincronizar = useCallback"
sinc_anchor = "  }, [getConexao, dadosExtras, showToast]);\n\n  // Auto-login from session"
idx_s  = content.index(sinc_start)
idx_se = content.index(sinc_anchor) + len("  }, [getConexao, dadosExtras, showToast]);")
sinc_block = content[idx_s:idx_se]
print(f"sincronizar: {sinc_block.count(chr(10))} lines")

# ── Extract carregarAponts + syncUsuariosRemoto + carregarPendentes ────────────
# All three sit between "apontToSupabase comment" and "// ── Ocorrências ──"
caponts_start = "  const carregarAponts = useCallback"
pend_anchor   = "  }, [getConexao]);\n\n  // ── Ocorrências ──"
idx_ca  = content.index(caponts_start)
idx_cpe = content.index(pend_anchor) + len("  }, [getConexao]);")
caponts_pend_block = content[idx_ca:idx_cpe]
print(f"carregarAponts+sync+pendentes: {caponts_pend_block.count(chr(10))} lines")

# ── Helper: strip 2-space indent ──────────────────────────────────────────────
def deindent(block):
    return "\n".join(
        line[2:] if line.startswith("  ") else line
        for line in block.splitlines()
    )

# ── Build hook file ────────────────────────────────────────────────────────────
hook_js = (
    'import { useCallback } from "react";\n'
    'import { loadJSON, saveJSON, supaFetch } from "../utils.js";\n'
    'import { TABLE_APOINTS, TABLE_USUARIOS } from "../constants.js";\n'
    'import { apontFromSupabase } from "../utils/apontMappers.js";\n'
    '\n'
    'export function useSyncHandlers({\n'
    '  getConexao, showToast, tblRef, sessionToken, baseAtual,\n'
    '  dadosExtras, setDadosBase, setDadosExtras, setConnStatus, setUltimaSync,\n'
    '  setApontItems, setApontLoading, setUsuarios, setUsuariosPendentes,\n'
    '}) {\n'
    + deindent(sinc_block) + "\n\n"
    + deindent(caponts_pend_block) + "\n\n"
    '  return { sincronizar, carregarAponts, syncUsuariosRemoto, carregarPendentes };\n'
    '}\n'
)

Path("src/hooks/useSyncHandlers.js").write_text(hook_js, encoding="utf-8")
print("Created src/hooks/useSyncHandlers.js")

# ── Modify App.jsx ─────────────────────────────────────────────────────────────
# 1. Add import (after useAdminHandlers import)
OLD_IMPORT = "import { useAdminHandlers } from './hooks/useAdminHandlers.js';"
NEW_IMPORT = (
    "import { useAdminHandlers } from './hooks/useAdminHandlers.js';\n"
    "import { useSyncHandlers } from './hooks/useSyncHandlers.js';"
)
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Replace sincronizar with hook call
idx_s2  = content.index(sinc_start)
idx_se2 = content.index("  }, [getConexao, dadosExtras, showToast]);\n\n  // Auto-login") + len("  }, [getConexao, dadosExtras, showToast]);")
old_sinc = content[idx_s2:idx_se2]

new_sinc = (
    "  const { sincronizar, carregarAponts, syncUsuariosRemoto, carregarPendentes } = useSyncHandlers({\n"
    "    getConexao, showToast, tblRef, sessionToken, baseAtual,\n"
    "    dadosExtras, setDadosBase, setDadosExtras, setConnStatus, setUltimaSync,\n"
    "    setApontItems, setApontLoading, setUsuarios, setUsuariosPendentes,\n"
    "  });"
)

assert content.count(old_sinc) == 1, "sincronizar block not unique"
content = content.replace(old_sinc, new_sinc, 1)

# 3. Remove carregarAponts + syncUsuariosRemoto + carregarPendentes
idx_ca2  = content.index(caponts_start)
idx_cpe2 = content.index("  }, [getConexao]);\n\n  // ── Ocorrências ──") + len("  }, [getConexao]);")
old_ca_pend = content[idx_ca2:idx_cpe2]
assert content.count(old_ca_pend) == 1, "carregarAponts..pend block not unique"
content = content.replace(old_ca_pend, "  // carregarAponts / syncUsuariosRemoto / carregarPendentes — via useSyncHandlers", 1)

# 4. Remove apontMappers import from App.jsx (now only used by useSyncHandlers)
OLD_MAPPERS_IMPORT = "\nimport { apontToSupabase, apontFromSupabase } from './utils/apontMappers.js';"
if content.count(OLD_MAPPERS_IMPORT) == 1:
    content = content.replace(OLD_MAPPERS_IMPORT, "", 1)
    print("Removed apontMappers import from App.jsx")

# 5. Remove apontMappers placeholder comment
OLD_MAPPERS_CMT = "\n  // apontToSupabase / apontFromSupabase — via src/utils/apontMappers.js"
if content.count(OLD_MAPPERS_CMT) == 1:
    content = content.replace(OLD_MAPPERS_CMT, "", 1)
    print("Removed apontMappers comment from App.jsx")

app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
