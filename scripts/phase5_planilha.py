from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# 1. Add import
OLD_IMPORT = "import useModalEsc      from './hooks/useModalEsc.js';"
NEW_IMPORT = """import useModalEsc      from './hooks/useModalEsc.js';
import { usePlanilhaState } from './hooks/usePlanilhaState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Remove 12 useState lines and replace with hook call
OLD_STATES = """  const [planilhaSortKey, setPlanilhaSortKey] = useState(null);   // coluna ativa: 'dt'|'nome'|'placa'|...
  const [planilhaSortDir, setPlanilhaSortDir] = useState("asc");  // 'asc'|'desc'
  const [planilhaPagina, setPlanilhaPagina] = useState(1);        // página atual (começa em 1)
  const [planilhaFiltroAno, setPlanilhaFiltroAno] = useState(()=>String(new Date().getFullYear()));
  const [planilhaFiltroMes, setPlanilhaFiltroMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [planilhaFiltroOrigem, setPlanilhaFiltroOrigem] = useState("todas"); // "todas" = sem filtro
  const [planilhaFiltroDataDe, setPlanilhaFiltroDataDe] = useState(""); // data inicio (yyyy-MM-dd)
  const [planilhaFiltroDataAte, setPlanilhaFiltroDataAte] = useState(""); // data fim (yyyy-MM-dd)
  const [planilhaFiltroStatus, setPlanilhaFiltroStatus] = useState(""); // status filter do dashboard
  const [planilhaFiltroContratante, setPlanilhaFiltroContratante] = useState(""); // AVB only
  const [planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora] = useState(""); // AVB only
  const [planilhaBusca, setPlanilhaBusca] = useState("");           // busca livre: dt|placa|nome"""

NEW_STATES = """  const {
    planilhaSortKey, setPlanilhaSortKey, planilhaSortDir, setPlanilhaSortDir,
    planilhaPagina, setPlanilhaPagina, planilhaFiltroAno, setPlanilhaFiltroAno,
    planilhaFiltroMes, setPlanilhaFiltroMes, planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
    planilhaFiltroDataDe, setPlanilhaFiltroDataDe, planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
    planilhaFiltroStatus, setPlanilhaFiltroStatus, planilhaFiltroContratante, setPlanilhaFiltroContratante,
    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora, planilhaBusca, setPlanilhaBusca,
  } = usePlanilhaState();"""

assert content.count(OLD_STATES) == 1, f"Expected 1, found {content.count(OLD_STATES)}"
content = content.replace(OLD_STATES, NEW_STATES, 1)

app.write_text(content, encoding="utf-8")
print("Done. usePlanilhaState extracted.")
