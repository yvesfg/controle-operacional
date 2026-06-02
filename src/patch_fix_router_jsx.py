import shutil, datetime, sys

path = r'C:\Users\yvesf\DevYFGroup\controle-operacional\src\App.jsx'
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
shutil.copy(path, path + f'.bak_fix_router_{ts}')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── Fix 1: Dashboard router ──
old1 = '''        {/* ═══ DASHBOARD ═══ */}
        {activeTab === "dashboard" && (
          {/* Roteador: AVB usa DashboardAVB; Suzano usa DashboardView */}
          {baseAtual?.id === "acailandia_avb"
            ? <DashboardAVB ctx={{'''

new1 = '''        {/* ═══ DASHBOARD ═══ */}
        {activeTab === "dashboard" && (
          baseAtual?.id === "acailandia_avb"
            ? <DashboardAVB ctx={{'''

if old1 not in c: errors.append("fix1-dash-open")
else: c = c.replace(old1, new1, 1)

# Fechar o bloco Dashboard — remover o `}` extra do ternário
old1b = '''          }} />
          }
        )}

        {/* ═══ PLANILHA ═══ */}'''

new1b = '''          }} />
        )}

        {/* ═══ PLANILHA ═══ */}'''

if old1b not in c: errors.append("fix1-dash-close")
else: c = c.replace(old1b, new1b, 1)

# ── Fix 2: Planilha router ──
old2 = '''        {/* ═══ PLANILHA ═══ */}
        {activeTab === "planilha" && (
          {/* Roteador: AVB usa PlanilhaAVB; Suzano usa PlanilhaView */}
          {baseAtual?.id === "acailandia_avb"
            ? <PlanilhaAVB ctx={{'''

new2 = '''        {/* ═══ PLANILHA ═══ */}
        {activeTab === "planilha" && (
          baseAtual?.id === "acailandia_avb"
            ? <PlanilhaAVB ctx={{'''

if old2 not in c: errors.append("fix2-plan-open")
else: c = c.replace(old2, new2, 1)

old2b = '''            t, isMobile, ExportMenu,
            baseAtual,
          }} />
          }
        )}

        {/* ═══ DIÁRIAS ═══ */}'''

new2b = '''            t, isMobile, ExportMenu,
            baseAtual,
          }} />
        )}

        {/* ═══ DIÁRIAS ═══ */}'''

if old2b not in c: errors.append("fix2-plan-close")
else: c = c.replace(old2b, new2b, 1)

# ── Fix 3: Descarga router ──
old3 = '''        {/* ═══ DESCARGA / LOGÍSTICA ═══ */}
        {/* Roteador: AVB usa LogisticaAVB; Suzano usa DescargaView */}
        {baseAtual?.id === "acailandia_avb"
          ? <LogisticaAVB ctx={{'''

new3 = '''        {/* ═══ DESCARGA / LOGÍSTICA ═══ */}
        {baseAtual?.id === "acailandia_avb"
          ? <LogisticaAVB ctx={{'''

if old3 not in c: errors.append("fix3-desc-open")
else: c = c.replace(old3, new3, 1)

old3b = '''          DADOS,
        }} />
        }

        {/* ═══ OPERACIONAL ═══ */}'''

new3b = '''          DADOS,
        }} />

        {/* ═══ OPERACIONAL ═══ */}'''

if old3b not in c: errors.append("fix3-desc-close")
else: c = c.replace(old3b, new3b, 1)

if errors:
    print(f"ERROS: {errors}")
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("OK: JSX de roteamento corrigido (comentários removidos de dentro de expressões)")
