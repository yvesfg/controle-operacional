import shutil, datetime, sys

path = r'C:\Users\yvesf\DevYFGroup\controle-operacional\src\App.jsx'
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
shutil.copy(path, path + f'.bak_avb_router_{ts}')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# 1. Adicionar imports das views AVB logo após os imports existentes de views
old_imports = "import AdminView       from './views/AdminView.jsx';"
new_imports = """import AdminView       from './views/AdminView.jsx';

// ── Views exclusivas AVB — isoladas para não impactar Suzano ──
import DashboardAVB from './views/avb/DashboardAVB.jsx';
import PlanilhaAVB  from './views/avb/PlanilhaAVB.jsx';
import LogisticaAVB from './views/avb/LogisticaAVB.jsx';"""

if old_imports not in c: errors.append("imports")
else: c = c.replace(old_imports, new_imports, 1)

# 2. Substituir renderização do Dashboard — usa DashboardAVB para AVB
old_dash = """        {activeTab === "dashboard" && (
          <DashboardView ctx={{"""
new_dash = """        {activeTab === "dashboard" && (
          {/* Roteador: AVB usa DashboardAVB; Suzano usa DashboardView */}
          {baseAtual?.id === "acailandia_avb"
            ? <DashboardAVB ctx={{"""
if old_dash not in c: errors.append("dashboard-open")
else: c = c.replace(old_dash, new_dash, 1)

# Fechar o bloco Dashboard com ternário
old_dash_close = """            baseAtual,
          }} />
        )}

        {/* ═══ PLANILHA ═══ */}"""
new_dash_close = """            baseAtual,
          }} />
            : <DashboardView ctx={{
            dashMes, setDashMes,
            dashOrigem, setDashOrigem,
            dashHeroTab, setDashHeroTab,
            dashRecentesN, setDashRecentesN,
            dashRecCardRef,
            dashData,
            canFin,
            parseData,
            t, css, DESIGN, hexRgb, hIco, showToast,
            setActiveTab,
            chartAreaRef, chartDonutRef,
            diariasData, motoristas,
            alertas, alertasOpen, setAlertasOpen,
            fmtMoeda, isMobile,
            setDetalheDT, setModalOpen,
            descargaData,
            setPlanilhaFiltroStatus,
            setBuscaInput, setBuscaTipo, setBuscaModalOpen,
            baseAtual,
          }} />
          }
        )}

        {/* ═══ PLANILHA ═══ */}"""
if old_dash_close not in c: errors.append("dashboard-close")
else: c = c.replace(old_dash_close, new_dash_close, 1)

# 3. Substituir renderização da Planilha — usa PlanilhaAVB para AVB
old_plan = """        {activeTab === "planilha" && (
          <PlanilhaView ctx={{"""
new_plan = """        {activeTab === "planilha" && (
          {/* Roteador: AVB usa PlanilhaAVB; Suzano usa PlanilhaView */}
          {baseAtual?.id === "acailandia_avb"
            ? <PlanilhaAVB ctx={{"""
if old_plan not in c: errors.append("planilha-open")
else: c = c.replace(old_plan, new_plan, 1)

old_plan_close = """            t, isMobile, ExportMenu,
            baseAtual,
          }} />
        )}

        {/* ═══ DIÁRIAS ═══ */}"""
new_plan_close = """            t, isMobile, ExportMenu,
            baseAtual,
          }} />
            : <PlanilhaView ctx={{
            DADOS,
            planilhaSortKey, setPlanilhaSortKey,
            planilhaSortDir, setPlanilhaSortDir,
            planilhaPagina, setPlanilhaPagina,
            abrirDetalhe,
            planilhaFiltroAno, setPlanilhaFiltroAno,
            planilhaFiltroMes, setPlanilhaFiltroMes,
            planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
            planilhaFiltroDataDe, setPlanilhaFiltroDataDe,
            planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
            planilhaBusca, setPlanilhaBusca,
            planilhaFiltroStatus, setPlanilhaFiltroStatus,
            planilhaFiltroContratante, setPlanilhaFiltroContratante,
            planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,
            t, isMobile, ExportMenu,
            baseAtual,
          }} />
          }
        )}

        {/* ═══ DIÁRIAS ═══ */}"""
if old_plan_close not in c: errors.append("planilha-close")
else: c = c.replace(old_plan_close, new_plan_close, 1)

# 4. DescargaView — adicionar roteamento para LogisticaAVB
old_desc = """        {/* ═══ DESCARGA ═══ */}
        <DescargaView ctx={{"""
new_desc = """        {/* ═══ DESCARGA / LOGÍSTICA ═══ */}
        {/* Roteador: AVB usa LogisticaAVB; Suzano usa DescargaView */}
        {baseAtual?.id === "acailandia_avb"
          ? <LogisticaAVB ctx={{"""
if old_desc not in c: errors.append("descarga-open")
else: c = c.replace(old_desc, new_desc, 1)

old_desc_close = """          DADOS,
        }} />

        {/* ═══ OPERACIONAL ═══ */}"""
new_desc_close = """          DADOS,
        }} />
          : <DescargaView ctx={{
          activeTab,
          descargaData,
          descargaNavDT, setDescargaNavDT,
          descargaCols, setDescargaCols,
          descargaView, setDescargaView,
          dscTab, setDscTab,
          dscData, setDscData,
          dscFiltroAno, setDscFiltroAno,
          dscFiltroMes, setDscFiltroMes,
          dscFiltroIni, setDscFiltroIni,
          dscFiltroFim, setDscFiltroFim,
          dscFiltroOrigem, setDscFiltroOrigem,
          rodorricaRows, setRodorricaRows,
          rodorricaFileName, setRodorricaFileName,
          rodorricaFiltro, setRodorricaFiltro,
          rodorricaPeriodoIni, setRodorricaPeriodoIni,
          rodorricaPeriodoFim, setRodorricaPeriodoFim,
          rodorricaPeriodoModal, setRodorricaPeriodoModal,
          rodorricaResultado,
          isMobile,
          hIco,
          diffDias,
          parseData,
          t, css, DESIGN,
          hexRgb,
          abrirDetalhe,
          showToast,
          parseRodorricaXLSX,
          motoristas,
          baseAtual,
          DADOS,
        }} />
        }

        {/* ═══ OPERACIONAL ═══ */}"""
if old_desc_close not in c: errors.append("descarga-close")
else: c = c.replace(old_desc_close, new_desc_close, 1)

if errors:
    print(f"ERROS — trechos não encontrados: {errors}")
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("OK: roteador AVB configurado no App.jsx")
