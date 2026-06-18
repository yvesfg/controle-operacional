"""
Phase 11b: Extract registrarLog, gerarCorpoEmail, enviarEmailBoasVindas, carregarLogs
into src/hooks/useAdminHandlers.js
"""
from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── Find the block boundaries ─────────────────────────────────────────────────
anchor_start = "  // ── Log de alter"  # unique start
anchor_end   = "  }, [getConexao]);\n\n  // apontToSupabase"  # unique end after phase11a

idx_start = content.index(anchor_start)
idx_end   = content.index(anchor_end) + len("  }, [getConexao]);")

extracted = content[idx_start:idx_end]
print(f"Will extract {extracted.count(chr(10))} lines ({len(extracted)} bytes)")

# ── Helper: strip 2-space indent ──────────────────────────────────────────────
def deindent(block):
    return "\n".join(
        line[2:] if line.startswith("  ") else line
        for line in block.splitlines()
    )

# ── Build hook file ───────────────────────────────────────────────────────────
hook_js = (
    'import { useCallback } from "react";\n'
    'import { loadJSON, saveJSON, supaFetch } from "../utils.js";\n'
    'import { TABLE_LOGS } from "../constants.js";\n'
    '\n'
    'export function useAdminHandlers({ getConexao, showToast, emailTemplate, setLogsData, usuarioLogado, perfil }) {\n'
    + deindent(extracted) + "\n\n"
    '  return { registrarLog, gerarCorpoEmail, enviarEmailBoasVindas, carregarLogs };\n'
    '}\n'
)

Path("src/hooks/useAdminHandlers.js").write_text(hook_js, encoding="utf-8")
print("Created src/hooks/useAdminHandlers.js")

# ── Modify App.jsx ────────────────────────────────────────────────────────────
# 1. Add import
OLD_IMPORT = "import { useAdminState } from './hooks/useAdminState.js';"
NEW_IMPORT = (
    "import { useAdminState } from './hooks/useAdminState.js';\n"
    "import { useAdminHandlers } from './hooks/useAdminHandlers.js';"
)
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Re-find block after import change and replace
idx_start2 = content.index(anchor_start)
idx_end2   = content.index(anchor_end) + len("  }, [getConexao]);")
old_block  = content[idx_start2:idx_end2]

new_block = (
    "  const { registrarLog, gerarCorpoEmail, enviarEmailBoasVindas, carregarLogs } = useAdminHandlers({\n"
    "    getConexao, showToast, emailTemplate, setLogsData, usuarioLogado, perfil,\n"
    "  });"
)

assert content.count(old_block) == 1, f"Block not unique, count={content.count(old_block)}"
content = content.replace(old_block, new_block, 1)

app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
