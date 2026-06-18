from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── 1. Imports ──────────────────────────────────────────────────────────────
OLD_IMPORT = "import { useOperacionalState } from './hooks/useOperacionalState.js';"
NEW_IMPORT = """import { useOperacionalState } from './hooks/useOperacionalState.js';
import { useBuscaState } from './hooks/useBuscaState.js';
import { useViewPrefsState } from './hooks/useViewPrefsState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# ── 2. Replace Search state block + useEffect + historico ───────────────────
OLD_BUSCA = """  // Search state
  const [buscaTipo, setBuscaTipo] = useState("dt");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaResult, setBuscaResult] = useState(null);
  const [buscaRelacionados, setBuscaRelacionados] = useState([]);
  const [buscaError, setBuscaError] = useState(null);
  const [buscaModalOpen, setBuscaModalOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); setBuscaModalOpen(v=>!v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [historico, setHistorico] = useState(() => loadJSON("hist",[]));"""

NEW_BUSCA = """  const {
    buscaTipo, setBuscaTipo, buscaInput, setBuscaInput,
    buscaResult, setBuscaResult, buscaRelacionados, setBuscaRelacionados,
    buscaError, setBuscaError, buscaModalOpen, setBuscaModalOpen,
    historico, setHistorico,
  } = useBuscaState();"""

assert content.count(OLD_BUSCA) == 1, "Busca block not found/unique"
content = content.replace(OLD_BUSCA, NEW_BUSCA, 1)
print("useBuscaState extracted")

# ── 3. Replace ViewPrefs state block ────────────────────────────────────────
OLD_VIEW = """  // View mode state (linhas | blocos) + colunas para Diarias e Descarga
  const [diariaView, setDiariaView] = useState(() => loadJSON("co_diaria_view","blocos"));
  const [diariaCols, setDiariaCols] = useState(() => {
    // Migration: padroniza diariaCols para 3 (Abr 2026)
    const MK = "co_diaria_cols_migv3";
    if (!loadJSON(MK, false)) {
      saveJSON("co_diaria_cols", 3);
      saveJSON(MK, true);
      return 3;
    }
    return loadJSON("co_diaria_cols", 3);
  });
  const [descargaView, setDescargaView] = useState(() => loadJSON("co_descarga_view","blocos"));
  const [descargaCols, setDescargaCols] = useState(() => loadJSON("co_descarga_cols", 2));
  const [diariaNavDT, setDiariaNavDT] = useState(null);    // DT destacada ao navegar do modal
  const [descargaNavDT, setDescargaNavDT] = useState(null); // DT destacada ao navegar do modal"""

NEW_VIEW = """  const {
    diariaView, setDiariaView, diariaCols, setDiariaCols,
    descargaView, setDescargaView, descargaCols, setDescargaCols,
    diariaNavDT, setDiariaNavDT, descargaNavDT, setDescargaNavDT,
  } = useViewPrefsState();"""

assert content.count(OLD_VIEW) == 1, "ViewPrefs block not found/unique"
content = content.replace(OLD_VIEW, NEW_VIEW, 1)
print("useViewPrefsState extracted")

# ── 4. Write ─────────────────────────────────────────────────────────────────
app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
