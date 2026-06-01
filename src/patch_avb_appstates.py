#!/usr/bin/env python3
"""patch_avb_appstates.py — adiciona estados e ctx para filtros AVB na PlanilhaView"""
import sys

SRC = "C:/Users/yvesf/DevYFGroup/controle-operacional/src/App.jsx"

with open(SRC, encoding="utf-8") as f:
    txt = f.read()

original = txt

# 1. Adicionar estados planilhaFiltroContratante e planilhaFiltroGerenciadora
OLD_STATES = '  const [planilhaFiltroStatus, setPlanilhaFiltroStatus] = useState(""); // status filter do dashboard'
NEW_STATES = (
    '  const [planilhaFiltroStatus, setPlanilhaFiltroStatus] = useState(""); // status filter do dashboard\n'
    '  const [planilhaFiltroContratante, setPlanilhaFiltroContratante] = useState(""); // AVB only\n'
    '  const [planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora] = useState(""); // AVB only'
)
if OLD_STATES in txt:
    txt = txt.replace(OLD_STATES, NEW_STATES, 1)
    print("OK 1: estados AVB adicionados")
else:
    print("FAIL 1: linha de estado nao encontrada")

# 2. Passar novos estados no ctx da PlanilhaView
OLD_CTX = (
    '            planilhaFiltroStatus, setPlanilhaFiltroStatus,\n'
    '            t, isMobile, ExportMenu,\n'
    '          }} />'
)
NEW_CTX = (
    '            planilhaFiltroStatus, setPlanilhaFiltroStatus,\n'
    '            planilhaFiltroContratante, setPlanilhaFiltroContratante,\n'
    '            planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,\n'
    '            t, isMobile, ExportMenu,\n'
    '            baseAtual,\n'
    '          }} />'
)
if OLD_CTX in txt:
    txt = txt.replace(OLD_CTX, NEW_CTX, 1)
    print("OK 2: ctx PlanilhaView expandido com filtros AVB e baseAtual")
else:
    print("FAIL 2: ctx PlanilhaView nao encontrado")

# 3. Resetar filtros AVB ao trocar de base
# Ja existe useEffect para sincronizar ao trocar de base — adicionar reset de filtros
OLD_BASE_EFFECT = '  useEffect(() => { if (authed && baseAtual) sincronizar(); }, [baseAtual]);'
NEW_BASE_EFFECT = (
    '  useEffect(() => { if (authed && baseAtual) sincronizar(); }, [baseAtual]);\n'
    '  // Resetar filtros AVB ao trocar de base\n'
    '  useEffect(() => {\n'
    '    setPlanilhaFiltroContratante("");\n'
    '    setPlanilhaFiltroGerenciadora("");\n'
    '    setPlanilhaFiltroStatus("");\n'
    '    setPlanilhaBusca("");\n'
    '    setPlanilhaPagina(1);\n'
    '  }, [baseAtual?.id]); // eslint-disable-line react-hooks/exhaustive-deps'
)
if OLD_BASE_EFFECT in txt:
    txt = txt.replace(OLD_BASE_EFFECT, NEW_BASE_EFFECT, 1)
    print("OK 3: reset de filtros ao trocar de base adicionado")
else:
    print("FAIL 3: useEffect de base nao encontrado")

if txt == original:
    print("NENHUMA ALTERACAO APLICADA")
    sys.exit(1)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(txt)
print(f"App.jsx salvo ({txt.count(chr(10))} linhas)")
