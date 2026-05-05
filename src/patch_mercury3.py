"""patch_mercury3.py — corrige color:#000 hardcoded em botoes de gradiente."""

PATH = "src/App.jsx"

with open(PATH, encoding="utf-8") as fh:
    src = fh.read()

# Linha 1796: borderRadius:12 hardcoded + color:#000
# Linha 1902: color:#000 em botao primario
# Ambos usam linear-gradient com t.ouroDk/t.ouro (Mercury Blue) -> texto branco

# Fix 1: borderRadius:12 hardcoded no primeiro botao de login
src = src.replace(
    "background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:\"none\",borderRadius:12,color:\"#000\"",
    "background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:\"none\",borderRadius:DESIGN.r.btn,color:\"#ffffff\""
)

# Fix 2: color:#000 no segundo botao (linha 1902)
src = src.replace(
    "background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:\"none\",borderRadius:DESIGN.r.btn,color:\"#000\"",
    "background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:\"none\",borderRadius:DESIGN.r.btn,color:\"#ffffff\""
)

remaining = src.count('color:"#000"')
print(f"color:#000 restantes: {remaining}")

with open(PATH, "w", encoding="utf-8") as fh:
    fh.write(src)
print("App.jsx salvo.")
