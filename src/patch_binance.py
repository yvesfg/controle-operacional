"""
patch_binance.py — Adapta App.jsx ao Binance Design System.

Mudancas:
  1. Botao btnGold: color:"#ffffff" → color:t.onPrimary  (preto sobre amarelo)
  2. Botoes de gradiente de login: color:"#ffffff" → color:t.onPrimary
  3. Gradiente linear dos botoes de login usa t.ouroDk → t.ouro solido
     (Binance usa botao solido amarelo, nao gradiente)
"""

PATH = "src/App.jsx"

with open(PATH, encoding="utf-8") as fh:
    src = fh.read()

changes = 0

# 1. btnGold definition: cor do texto sobre o botao accent
#    Contexto unico: esta na definicao do objeto css.btnGold
old1 = 'borderRadius:DESIGN.r.btn, padding:"11px 20px", color:"#ffffff"'
new1 = 'borderRadius:DESIGN.r.btn, padding:"11px 20px", color:t.onPrimary'
if old1 in src:
    src = src.replace(old1, new1)
    changes += 1
    print("OK: btnGold color")
else:
    print("SKIP: btnGold color nao encontrado (ja corrigido ou diferente)")

# 2. Botoes de gradiente de login (podem ter 2 ocorrencias)
#    Padrao: background:linear-gradient com t.ouroDk,t.ouro + color="#ffffff"
old2 = 'background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:DESIGN.r.btn,color:"#ffffff"'
new2 = 'background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:DESIGN.r.btn,color:t.onPrimary'
count2 = src.count(old2)
if count2 > 0:
    src = src.replace(old2, new2)
    changes += count2
    print(f"OK: {count2}x botao gradiente login color")
else:
    print("SKIP: botao gradiente nao encontrado")

# 3. Versao com borderRadius:12 (pode ainda existir antes do patch anterior)
old3 = 'background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:12,color:"#ffffff"'
new3 = 'background:`linear-gradient(135deg,${t.ouroDk},${t.ouro})`,border:"none",borderRadius:DESIGN.r.btn,color:t.onPrimary'
count3 = src.count(old3)
if count3 > 0:
    src = src.replace(old3, new3)
    changes += count3
    print(f"OK: {count3}x botao borderRadius:12 color")

print(f"\nTotal de mudancas: {changes}")

with open(PATH, "w", encoding="utf-8") as fh:
    fh.write(src)
print("App.jsx salvo.")
