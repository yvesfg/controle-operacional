from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# Find the exact block to extract
START_MARKER = "  // ══════════════════════════════════════════════════════\n  // RELATÓRIOS PDF — gera HTML completo em nova janela\n  // ══════════════════════════════════════════════════════\n  const relHtmlBase ="
END_MARKER = "    setTimeout(()=>URL.revokeObjectURL(_urlOp),120000);\n  };"

start_pos = content.find(START_MARKER)
assert start_pos > 0, "Start marker not found"

end_pos = content.find(END_MARKER, start_pos)
assert end_pos > start_pos, "End marker not found"
end_pos += len(END_MARKER)

# The block we'll replace
old_block = content[start_pos:end_pos]
print(f"Block length: {len(old_block)} chars, ~{old_block.count(chr(10))} lines")

# Verify it's unique
assert content.count(old_block) == 1, "Block not unique"

# Create the new relatorioEngine.js content
# The block uses: customLogo, DADOS, motoristas, baseAtual, fmtMoeda, parseData, diffDias, brToInput
# We'll wrap it in a factory function

engine_content = '''import { fmtMoeda, parseData, diffDias, brToInput } from '../utils.js';

/**
 * Factory que recebe os dados de contexto e retorna as funções de geração de relatório.
 * Chamado no render do App.jsx para que as funções sempre tenham acesso aos dados atuais.
 */
export function criarMotoresRelatorio({ customLogo, DADOS, motoristas, baseAtual }) {
''' + old_block.replace(
    "  // ══════════════════════════════════════════════════════\n  // RELATÓRIOS PDF — gera HTML completo em nova janela\n  // ══════════════════════════════════════════════════════\n  const relHtmlBase",
    "  const relHtmlBase"
).replace(
    # Convert all "  const gerarRel" and "  const relHtml" to 2-space indent (already have 2)
    "", ""
) + '''

  return {
    relHtmlBase,
    gerarRelatorioGeral,
    gerarRelatorioDiarias,
    gerarRelatorioDescargas,
    gerarRelatorioOperacional,
  };
}
'''

# Write the engine file
engine_path = Path("src/relatorios/relatorioEngine.js")
engine_path.parent.mkdir(exist_ok=True)
engine_path.write_text(engine_content, encoding="utf-8")
print(f"Created {engine_path}")

# Replace the block in App.jsx
new_block = """  // RELATÓRIOS PDF — via criarMotoresRelatorio (src/relatorios/relatorioEngine.js)
  const { relHtmlBase, gerarRelatorioGeral, gerarRelatorioDiarias, gerarRelatorioDescargas, gerarRelatorioOperacional } =
    criarMotoresRelatorio({ customLogo, DADOS, motoristas, baseAtual });"""

content = content.replace(old_block, new_block, 1)

# Add import
OLD_IMPORT_ANCHOR = "import Toast from './components/Toast.jsx';"
NEW_IMPORT_ANCHOR = """import Toast from './components/Toast.jsx';
import { criarMotoresRelatorio } from './relatorios/relatorioEngine.js';"""
assert content.count(OLD_IMPORT_ANCHOR) == 1
content = content.replace(OLD_IMPORT_ANCHOR, NEW_IMPORT_ANCHOR, 1)

app.write_text(content, encoding="utf-8")
print("Done. App.jsx updated.")
print(f"App.jsx now has {content.count(chr(10))} lines")
