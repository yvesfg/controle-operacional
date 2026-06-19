# -*- coding: utf-8 -*-
"""Fase 5: remove Gestao de Usuarios do AdminView (migrou pro Hub)."""
from pathlib import Path

ROOT = Path(__file__).parent.parent
f = ROOT / "src/views/AdminView.jsx"
content = f.read_text(encoding="utf-8")

START = "            {/* ── GESTÃO DE USUÁRIOS ─────────────────────────── */}"
END   = "            {/* Conexões Supabase — colapsável */}"

i = content.index(START)
j = content.index(END)
assert i < j, "anchors fora de ordem"

NOTE = (
    "            {/* Gestão de usuários migrada para o Hub (Gerenciar acessos) */}\n"
    "            <div style={{...css.card,marginBottom:12,padding:\"14px\",fontSize:11,color:t.txt2,lineHeight:1.6,display:\"flex\",gap:10,alignItems:\"flex-start\"}}>\n"
    "              {hIco(<><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/></>,t.ouro,16)}\n"
    "              <span>A gestão de <b style={{color:t.ouro}}>usuários, perfis e permissões</b> agora fica no <b style={{color:t.ouro}}>Hub → Gerenciar acessos</b>. Saia para o Hub para liberar módulos, definir perfil/bases e permissões finas.</span>\n"
    "            </div>\n\n"
)

content = content[:i] + NOTE + content[j:]
f.write_text(content, encoding="utf-8")
print("AdminView.jsx: bloco de usuarios removido. linhas:", len(content.splitlines()))
