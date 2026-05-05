"""patch_mercury2.py — remove ultimo #7c3aed hardcoded (color em item de tab)"""
import re

PATH = "src/App.jsx"

with open(PATH, encoding="utf-8") as fh:
    src = fh.read()

# Substitui color:"#7c3aed" hardcoded em objetos de dados (tabs)
src = src.replace('color:"#7c3aed"', "color:t.ouro")

remaining = src.count("#7c3aed")
print(f"#7c3aed restantes: {remaining}")

with open(PATH, "w", encoding="utf-8") as fh:
    fh.write(src)
print("App.jsx salvo.")
