from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# 1. Add import
OLD_IMPORT = "import { usePlanilhaState } from './hooks/usePlanilhaState.js';"
NEW_IMPORT = """import { usePlanilhaState } from './hooks/usePlanilhaState.js';
import { useDescargaState } from './hooks/useDescargaState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Remove the descarga useState block and replace with hook call
OLD_STATES = """  const [extratoRows, setExtratoRows] = useState([]);
  const [extratoFileName, setExtratoFileName] = useState(null);
  const [prevExtratoSnap, setPrevExtratoSnap] = useState(null);
  const [extratoSheetInfo, setExtratoSheetInfo] = useState(null);
  const [extratoFiltro, setExtratoFiltro] = useState("todos");
  const [extratoDataIni, setExtratoDataIni] = useState("");
  const [extratoDataFim, setExtratoDataFim] = useState("");

  // Descarga state
  const [dscTab, setDscTab] = useState("hoje");
  const [dscFiltroAno, setDscFiltroAno] = useState(()=>String(new Date().getFullYear()));
  const [dscFiltroMes, setDscFiltroMes] = useState(()=>String(new Date().getMonth()+1).padStart(2,"0"));
  const [dscFiltroOrigem, setDscFiltroOrigem] = useState("todas");
  const [dscFiltroIni, setDscFiltroIni] = useState("");
  const [dscFiltroFim, setDscFiltroFim] = useState("");
  const [dscData, setDscData] = useState(new Date().toISOString().slice(0,10));
  // Conferência Planilha RODORRICA
  const [rodorricaRows, setRodorricaRows] = useState([]);
  const [rodorricaFileName, setRodorricaFileName] = useState(null);
  const [prevRodorricaSnap, setPrevRodorricaSnap] = useState(null);
  const [rodorricaSheetInfo, setRodorricaSheetInfo] = useState(null);
  const [rodorricaFiltro, setRodorricaFiltro] = useState("todos");
  const [rodorricaPeriodoIni, setRodorricaPeriodoIni] = useState("");
  const [rodorricaPeriodoFim, setRodorricaPeriodoFim] = useState("");
  const [rodorricaPeriodoModal, setRodorricaPeriodoModal] = useState(false);"""

NEW_STATES = """  const {
    extratoRows, setExtratoRows, extratoFileName, setExtratoFileName,
    prevExtratoSnap, setPrevExtratoSnap, extratoSheetInfo, setExtratoSheetInfo,
    extratoFiltro, setExtratoFiltro, extratoDataIni, setExtratoDataIni, extratoDataFim, setExtratoDataFim,
    dscTab, setDscTab, dscFiltroAno, setDscFiltroAno, dscFiltroMes, setDscFiltroMes,
    dscFiltroOrigem, setDscFiltroOrigem, dscFiltroIni, setDscFiltroIni, dscFiltroFim, setDscFiltroFim,
    dscData, setDscData,
    rodorricaRows, setRodorricaRows, rodorricaFileName, setRodorricaFileName,
    prevRodorricaSnap, setPrevRodorricaSnap, rodorricaSheetInfo, setRodorricaSheetInfo,
    rodorricaFiltro, setRodorricaFiltro, rodorricaPeriodoIni, setRodorricaPeriodoIni,
    rodorricaPeriodoFim, setRodorricaPeriodoFim, rodorricaPeriodoModal, setRodorricaPeriodoModal,
  } = useDescargaState();"""

assert content.count(OLD_STATES) == 1, f"Expected 1, found {content.count(OLD_STATES)}"
content = content.replace(OLD_STATES, NEW_STATES, 1)

app.write_text(content, encoding="utf-8")
print("Done. useDescargaState extracted.")
