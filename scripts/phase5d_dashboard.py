from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# 1. Add imports
OLD_IMPORT = "import { useRelatoriosState } from './hooks/useRelatoriosState.js';"
NEW_IMPORT = """import { useRelatoriosState } from './hooks/useRelatoriosState.js';
import { useDashboardState } from './hooks/useDashboardState.js';
import { useDiariasState } from './hooks/useDiariasState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Replace dashboard state block (dashMes + dashOrigem)
OLD_DASH1 = """  // Dashboard state
  const [dashMes, setDashMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"00")+"/"+new Date().getFullYear());
  const [dashOrigem, setDashOrigem] = useState("todos");"""
# Try with literal string as it is in the file
import re
# Find the exact text
idx = content.find("  // Dashboard state\n  const [dashMes,")
assert idx > 0, "Dashboard state block not found"
# Find end of dashOrigem line
end_idx = content.find("\n", content.find("  const [dashOrigem,", idx)) + 1
old_text = content[idx:end_idx]
print(repr(old_text))

new_text = """  const {
    dashMes, setDashMes, dashOrigem, setDashOrigem,
    dashChartType, setDashChartType, dashGroupBy, setDashGroupBy,
    dashDrillModal, setDashDrillModal, dashHeroTab, setDashHeroTab,
    dashRecentesN, setDashRecentesN, dashRecCardRef,
  } = useDashboardState();
"""
content = content.replace(old_text, new_text, 1)

# 3. Replace diarias state block
OLD_DIARIAS = """  // Diarias state
  const [dFiltro, setDFiltro] = useState("todos");
  const [dSubTab, setDSubTab] = useState("resumo");
  const [dPlanFiltroAno, setDPlanFiltroAno] = useState(()=>String(new Date().getFullYear()));
  const [dPlanFiltroMes, setDPlanFiltroMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"00"));
  const [dPlanFiltroOrigem, setDPlanFiltroOrigem] = useState("todas");
  const [dPlanFiltroIni, setDPlanFiltroIni] = useState("");
  const [dPlanFiltroFim, setDPlanFiltroFim] = useState("");"""
# Find the exact text
idx2 = content.find("  // Diarias state\n  const [dFiltro,")
assert idx2 > 0, "Diarias state block not found"
end_idx2 = content.find("\n", content.find('  const [dPlanFiltroFim,', idx2)) + 1
old_diarias = content[idx2:end_idx2]
print(repr(old_diarias))

new_diarias = """  const {
    dFiltro, setDFiltro, dSubTab, setDSubTab,
    dPlanFiltroAno, setDPlanFiltroAno, dPlanFiltroMes, setDPlanFiltroMes,
    dPlanFiltroOrigem, setDPlanFiltroOrigem, dPlanFiltroIni, setDPlanFiltroIni,
    dPlanFiltroFim, setDPlanFiltroFim,
  } = useDiariasState();
"""
content = content.replace(old_diarias, new_diarias, 1)

# 4. Remove the Dashboard extras block (now redundant)
OLD_DASH_EXTRAS = """  // Dashboard extras
  const [dashChartType, setDashChartType] = useState("bar"); // bar | pie
  const [dashGroupBy, setDashGroupBy] = useState("mes"); // mes | motorista | destino | status
  const [dashDrillModal, setDashDrillModal] = useState(null); // {type, label, regs}
  const [dashHeroTab, setDashHeroTab] = useState("carr"); // 'carr' | 'cte'
  const [dashRecentesN, setDashRecentesN] = useState(8);
  const dashRecCardRef = useRef(null);"""

assert content.count(OLD_DASH_EXTRAS) == 1, f"Expected 1, found {content.count(OLD_DASH_EXTRAS)}"
content = content.replace(OLD_DASH_EXTRAS, "  // Dashboard state — via useDashboardState (above)", 1)

app.write_text(content, encoding="utf-8")
print("Done.")
