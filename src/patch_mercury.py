"""
patch_mercury.py — Correcoes pontuais no App.jsx para o Mercury design system.
  1. Substitui hexRgb("#7c3aed", alpha) por hexRgb(t.ouro, alpha)
  2. Substitui stroke/fill "#7c3aed" hardcoded por t.ouro (via {t.ouro})
  3. Corrige cor de texto hardcoded no btnGold (preto sobre ouro -> branco)
"""

PATH = "src/App.jsx"

with open(PATH, encoding="utf-8") as fh:
    src = fh.read()

# 1. hexRgb com violet antiga (sem espaco apos virgula)
src = src.replace('hexRgb("#7c3aed",.06)', "hexRgb(t.ouro, .06)")
src = src.replace('hexRgb("#7c3aed",.15)', "hexRgb(t.ouro, .15)")
src = src.replace('hexRgb("#7c3aed",.5)',  "hexRgb(t.ouro, .5)")

# 2. stroke="#7c3aed" hardcoded em SVG -> usa accent via t.ouro
src = src.replace('stroke="#7c3aed"', 'stroke={t.ouro}')

# 3. texto preto hardcoded no botao primario
src = src.replace(
    'color:theme==="dark"?"#0a0a0a":"#ffffff"',
    'color:"#ffffff"'
)

remaining = src.count("#7c3aed")
print(f"#7c3aed restantes: {remaining}")

with open(PATH, "w", encoding="utf-8") as fh:
    fh.write(src)
print("App.jsx salvo.")
