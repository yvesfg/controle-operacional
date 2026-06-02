import shutil, datetime

path = r'C:\Users\yvesf\DevYFGroup\controle-operacional\src\App.jsx'
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
shutil.copy(path, path + f'.bak_fix2_{ts}')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

applied = []

# ── Fix 1a: Dashboard — remover comment dentro de () ──
old = '''        {/* ═══ DASHBOARD ═══ */}
        {activeTab === "dashboard" && (
          {/* Roteador: AVB usa DashboardAVB; Suzano usa DashboardView */}
          {baseAtual?.id === "acailandia_avb"
            ? <DashboardAVB ctx={{'''
new = '''        {/* ═══ DASHBOARD ═══ */}
        {activeTab === "dashboard" && (
          baseAtual?.id === "acailandia_avb"
            ? <DashboardAVB ctx={{'''
if old in c:
    c = c.replace(old, new, 1); applied.append("dash-open")

# ── Fix 1b: Dashboard — remover } extra ──
old = '''            baseAtual,
          }} />
          }
        )}

        {/* ═══ PLANILHA ═══ */}'''
new = '''            baseAtual,
          }} />
        )}

        {/* ═══ PLANILHA ═══ */}'''
if old in c:
    c = c.replace(old, new, 1); applied.append("dash-close")

# ── Fix 2a: Planilha — remover comment dentro de () ──
old = '''        {/* ═══ PLANILHA ═══ */}
        {activeTab === "planilha" && (
          {/* Roteador: AVB usa PlanilhaAVB; Suzano usa PlanilhaView */}
          {baseAtual?.id === "acailandia_avb"
            ? <PlanilhaAVB ctx={{'''
new = '''        {/* ═══ PLANILHA ═══ */}
        {activeTab === "planilha" && (
          baseAtual?.id === "acailandia_avb"
            ? <PlanilhaAVB ctx={{'''
if old in c:
    c = c.replace(old, new, 1); applied.append("plan-open")

# ── Fix 2b: Planilha — remover } extra ──
old = '''            t, isMobile, ExportMenu,
            baseAtual,
          }} />
          }
        )}

        {/* ═══ DIÁRIAS ═══ */}'''
new = '''            t, isMobile, ExportMenu,
            baseAtual,
          }} />
        )}

        {/* ═══ DIÁRIAS ═══ */}'''
if old in c:
    c = c.replace(old, new, 1); applied.append("plan-close")

# ── Fix 3: Descarga — remover comentário redundante ──
old = '''        {/* ═══ DESCARGA / LOGÍSTICA ═══ */}
        {/* Roteador: AVB usa LogisticaAVB; Suzano usa DescargaView */}
        {baseAtual?.id === "acailandia_avb"'''
new = '''        {/* ═══ DESCARGA / LOGÍSTICA ═══ */}
        {baseAtual?.id === "acailandia_avb"'''
if old in c:
    c = c.replace(old, new, 1); applied.append("desc-comment")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f"OK — aplicados: {applied}")
print(f"Não encontrados (já corretos ou já aplicados): {[x for x in ['dash-open','dash-close','plan-open','plan-close','desc-comment'] if x not in applied]}")
