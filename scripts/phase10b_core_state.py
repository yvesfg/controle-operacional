from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── 1. Import ────────────────────────────────────────────────────────────────
OLD_IMPORT = "import { useAuthState } from './hooks/useAuthState.js';"
NEW_IMPORT = """import { useAuthState } from './hooks/useAuthState.js';
import { useCoreState } from './hooks/useCoreState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# ── 2. Replace Data state block ──────────────────────────────────────────────
OLD_DATA = """  // Data state
  const [dadosBase, setDadosBase] = useState([]);
  const [dadosExtras, setDadosExtras] = useState(() => loadJSON("dados_extras",[]));
  const [motoristas, setMotoristas] = useState(() => loadJSON("co_motoristas",[]));
  const [conexoes, setConexoes] = useState(() => loadJSON("co_conexoes",[]));

  // UI state
  const [activeTab, setActiveTab] = useState("planilha");"""

NEW_DATA_ANCHOR = """  const {
    dadosBase, setDadosBase, dadosExtras, setDadosExtras,
    motoristas, setMotoristas, conexoes, setConexoes,
    activeTab, setActiveTab, toast, setToast,
    connStatus, setConnStatus, ultimaSync, setUltimaSync,
  } = useCoreState();"""

assert content.count(OLD_DATA) == 1, "Data block not found/unique"
content = content.replace(OLD_DATA, NEW_DATA_ANCHOR, 1)
print("Data + activeTab extracted into useCoreState")

# ── 3. Remove toast/connStatus/ultimaSync (now in useCoreState) ──────────────
OLD_TOAST = """  const [toast, setToast] = useState({msg:"",type:"",visible:false});
  const [connStatus, setConnStatus] = useState("offline");
  const [ultimaSync, setUltimaSync] = useState(loadJSON("ultima_sync",""));"""

assert content.count(OLD_TOAST) == 1, "Toast block not found/unique"
content = content.replace(OLD_TOAST, "  // toast/connStatus/ultimaSync — via useCoreState (above)", 1)
print("toast/connStatus/ultimaSync removed (now in useCoreState)")

app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
