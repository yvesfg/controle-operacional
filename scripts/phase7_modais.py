from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── 1. Add imports ──────────────────────────────────────────────────────────
OLD_IMPORT = "import { criarMotoresRelatorio } from './relatorios/relatorioEngine.js';"
NEW_IMPORT = """import { criarMotoresRelatorio } from './relatorios/relatorioEngine.js';
import ModalMotoristaImport from './modals/ModalMotoristaImport.jsx';
import ModalMotoristasAdmin from './modals/ModalMotoristasAdmin.jsx';"""

assert content.count(OLD_IMPORT) == 1, "Import anchor not found"
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# ── 2. Replace motImportOpen IIFE ───────────────────────────────────────────
IIFE_START = '      {/* ═══ IMPORT CONTACTS MODAL (Item 1 Sessão 4) ═══ */}\n      {motImportOpen && motImportData && (()=>{\n'
IIFE_END   = '      })()}\n'

s = content.find(IIFE_START)
assert s >= 0, "IIFE start not found"
e = content.find(IIFE_END, s) + len(IIFE_END)
assert e > s, "IIFE end not found"

old_iife = content[s:e]
assert content.count(old_iife) == 1

NEW_IIFE = """      <ModalMotoristaImport ctx={{
        motImportOpen, setMotImportOpen,
        motImportData, setMotImportData,
        motImportConfirm, setMotImportConfirm,
        motImportStep, setMotImportStep,
        motoristas, DADOS, dadosExtras, setDadosBase,
        saveMotoristasLS, registrarLog, showToast,
        t, css,
      }} />
"""
content = content.replace(old_iife, NEW_IIFE, 1)
print(f"motImportOpen IIFE replaced ({old_iife.count(chr(10))} lines -> 10 lines)")

# ── 3. Replace motExcluirTodosOpen block with ModalMotoristasAdmin ──────────
TODOS_START = '      {/* ═══ MODAL EXCLUIR TODOS (admin) ═══ */}\n'
TODOS_END   = '      )}\n\n      <ModalMotorista ctx={{'

s2 = content.find(TODOS_START)
assert s2 >= 0, "motExcluirTodosOpen start not found"
e2 = content.find(TODOS_END, s2)
assert e2 >= 0, "motExcluirTodosOpen end not found"
e2 += len('      )}\n')  # include only the closing )} and newline

old_todos = content[s2:e2]
assert content.count(old_todos) == 1, "motExcluirTodosOpen block not unique"
print(f"motExcluirTodosOpen: {old_todos.count(chr(10))} lines")

NEW_TODOS = """      <ModalMotoristasAdmin ctx={{
        motExcluirTodosOpen, setMotExcluirTodosOpen,
        motExcluirTodosTexto, setMotExcluirTodosTexto,
        motSugestOpen, setMotSugestOpen,
        motSugestData, setMotSugestData,
        motExcluirLoteOpen, setMotExcluirLoteOpen,
        motExcluirLoteTexto, setMotExcluirLoteTexto,
        motoristas, motSelecionados, setMotSelecionados,
        DADOS, setDadosBase,
        saveMotoristasLS, registrarLog, showToast,
        t, css, hIco,
      }} />
"""
content = content.replace(old_todos, NEW_TODOS, 1)

# ── 4. Remove motSugestOpen inline block (now in ModalMotoristasAdmin) ───────
SUGEST_START = '      {/* ═══ MODAL SUGERIR COMPATÍVEIS ═══ */}\n      {motSugestOpen && ('
SUGEST_END   = '      )}\n\n      {/* ═══ MODAL EXCLUSÃO EM LOTE ═══ */}'

s3 = content.find(SUGEST_START)
assert s3 >= 0, "motSugestOpen start not found"
e3 = content.find(SUGEST_END, s3)
assert e3 >= 0, "motSugestOpen end not found"
e3 += len('      )}\n')  # up to and including )}

old_sugest = content[s3:e3]
assert content.count(old_sugest) == 1
print(f"motSugestOpen: {old_sugest.count(chr(10))} lines")
content = content.replace(old_sugest, '', 1)

# ── 5. Remove motExcluirLoteOpen inline block ────────────────────────────────
LOTE_START = '      {/* ═══ MODAL EXCLUSÃO EM LOTE ═══ */}\n      {motExcluirLoteOpen && ('
LOTE_END   = '      )}\n\n      {modalOpen === "detalhe"'

s4 = content.find(LOTE_START)
assert s4 >= 0, "motExcluirLoteOpen start not found"
e4 = content.find(LOTE_END, s4)
assert e4 >= 0, "motExcluirLoteOpen end not found"
e4 += len('      )}\n')

old_lote = content[s4:e4]
assert content.count(old_lote) == 1
print(f"motExcluirLoteOpen: {old_lote.count(chr(10))} lines")
content = content.replace(old_lote, '', 1)

# ── 6. Write ─────────────────────────────────────────────────────────────────
app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
