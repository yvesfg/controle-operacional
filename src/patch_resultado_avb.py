# Patch cirúrgico: registra o módulo ResultadoAVB no App.jsx
# - import do módulo
# - item de aba "resultado" (perm financeiro, bases AVB + Imperatriz/Belém)
# - filtro de base para a aba
# - bloco de render
import io, os, sys, datetime, shutil

APP = os.path.join(os.path.dirname(__file__), "App.jsx")
src = io.open(APP, encoding="utf-8").read()

edits = []

def apply(anchor, addition, where="after", label=""):
    global src
    n = src.count(anchor)
    if n != 1:
        print(f"[ABORTADO] '{label}': anchor encontrado {n}x (esperado 1). Nada gravado.")
        sys.exit(1)
    if where == "after":
        src = src.replace(anchor, anchor + addition, 1)
    else:
        src = src.replace(anchor, addition + anchor, 1)
    edits.append(label)

# já aplicado?
if "ResultadoAVB" in src:
    print("[SKIP] ResultadoAVB já referenciado no App.jsx — nada a fazer.")
    sys.exit(0)

# 1) import
apply(
    "import GestaoAVB    from './views/avb/GestaoAVB.jsx';",
    "\nimport ResultadoAVB from './views/avb/ResultadoAVB.jsx';",
    "after", "import",
)

# 2) item de aba (antes de Motoristas)
tab_item = (
    '    {k:"resultado", l:"Resultado", perm:"financeiro", resultadoBases:true,\n'
    '      ico:(a)=>svgIco(a,<><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></>)},\n'
)
apply('    {k:"motoristas", l:"Motori.",', tab_item, "before", "tab-item")

# 3) filtro de base para a aba resultado
apply(
    '    .filter(tb => !tb.avbOnly || baseAtual?.id === "acailandia_avb")',
    '\n    .filter(tb => !tb.resultadoBases || baseAtual?.id === "acailandia_avb" || baseAtual?.id === "imperatriz_belem")',
    "after", "tab-filter",
)

# 4) bloco de render (após o bloco GESTÃO AVB)
gestao_block = (
    '        {/* ═══ GESTÃO AVB ═══ */}\n'
    '        {baseAtual?.id === "acailandia_avb" && (\n'
    '          <GestaoAVB ctx={{\n'
    '            activeTab, DADOS,\n'
    '            t, css, DESIGN, hexRgb, hIco, isMobile,\n'
    '            abrirDetalhe,\n'
    '          }} />\n'
    '        )}\n'
)
resultado_block = (
    '\n        {/* ═══ RESULTADO (Margem × Despesas) ═══ */}\n'
    '        {activeTab === "resultado" && (\n'
    '          <ResultadoAVB ctx={{\n'
    '            activeTab, baseAtual, DADOS, getConexao,\n'
    '            t, isMobile, showToast, canFin,\n'
    '          }} />\n'
    '        )}\n'
)
apply(gestao_block, resultado_block, "after", "render-block")

# backup + gravação
bak = APP + ".bak_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
shutil.copy2(APP, bak)
io.open(APP, "w", encoding="utf-8").write(src)
print("[OK] Patch aplicado:", ", ".join(edits))
print("[OK] Backup:", os.path.basename(bak))
