"""
Fix: salvar bases_permitidas na sessão e restaurar no auto-login.
Problema: após reload/auto-login, basesPermitidas=[] e baseAtual=null → sem dados.
"""
import re, shutil, datetime

SRC = r"C:\Users\yvesf\DevYFGroup\controle-operacional\src\App.jsx"
bak = SRC + ".bak_fix_session_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
shutil.copy2(SRC, bak)
print(f"Backup: {bak}")

with open(SRC, "r", encoding="utf-8") as f:
    code = f.read()

# ── 1. Salvar bases_permitidas ao fazer login (linha ~1057) ──
OLD_SAVE = "saveJSON(\"co_sessao\",{perfil:p,nome:found.nome||found.email,ts:Date.now()});"
NEW_SAVE = "saveJSON(\"co_sessao\",{perfil:p,nome:found.nome||found.email,ts:Date.now(),baseIds:_idsUsr,perms:PERMS_PADRAO[p]||{}});"

if OLD_SAVE not in code:
    print("ERRO: trecho de saveJSON não encontrado!")
    exit(1)
code = code.replace(OLD_SAVE, NEW_SAVE, 1)
print("OK Patch 1: saveJSON atualizado")

# ── 2. Restaurar bases no auto-login (após setAuthed(true)) ──
OLD_RESTORE = """        setPerfil(s.perfil);
        setPerms(PERMS_PADRAO[s.perfil] || {});
        setUsuarioLogado(s.nome || s.perfil);
        setAuthed(true);
        return; // sessão válida — não verifica pendentes"""

NEW_RESTORE = """        setPerfil(s.perfil);
        setPerms(s.perms || PERMS_PADRAO[s.perfil] || {});
        setUsuarioLogado(s.nome || s.perfil);
        // Restaurar bases da sessão
        if (Array.isArray(s.baseIds) && s.baseIds.length) {
          const _bs = s.baseIds.map(id => BASES[id]).filter(Boolean);
          if (_bs.length) {
            setBasesPermitidas(_bs);
            setBaseAtual(_bs.length === 1 ? _bs[0] : null);
          }
        }
        setAuthed(true);
        return; // sessão válida — não verifica pendentes"""

if OLD_RESTORE not in code:
    print("ERRO: trecho de auto-login não encontrado!")
    # Tentar com espaços diferentes
    print("Conteúdo próximo:")
    idx = code.find("setAuthed(true);")
    print(repr(code[idx-300:idx+100]))
    exit(1)
code = code.replace(OLD_RESTORE, NEW_RESTORE, 1)
print("OK Patch 2: auto-login restaura bases")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(code)

print("DONE: Patches aplicados com sucesso!")
