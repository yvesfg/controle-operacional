from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── 1. Imports ──────────────────────────────────────────────────────────────
OLD_IMPORT = "import { useWppState } from './hooks/useWppState.js';"
NEW_IMPORT = """import { useWppState } from './hooks/useWppState.js';
import { useUIState } from './hooks/useUIState.js';
import { useAdminState } from './hooks/useAdminState.js';
import { useOperacionalState } from './hooks/useOperacionalState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# ── 2. Replace Alerts + UI block (incl. 2 useEffects) ───────────────────────
OLD_UI = """  // Alerts
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [baseMenuOpen, setBaseMenuOpen] = useState(false);
  const [conexoesOpen, setConexoesOpen] = useState(false);
  const [contatosAdminOpen, setContatosAdminOpen] = useState(false);
  const [gsheetsOpen, setGsheetsOpen] = useState(false);
  const [oauthAccessOpen, setOauthAccessOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);       // último status gravado pelo Apps Script
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [adminEmailVal, setAdminEmailVal] = useState(()=>loadJSON("co_admin_email","yvesfg@gmail.com"));
  const [isMobile, setIsMobile] = useState(()=>window.innerWidth<=600);
  const [isWide,   setIsWide]   = useState(()=>window.innerWidth>=768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(()=>loadJSON("co_sidebar_collapsed", window.innerWidth>=768&&window.innerWidth<1200));
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);
  useEffect(()=>{
    const fn=()=>{setIsMobile(window.innerWidth<=600);setIsWide(window.innerWidth>=768);};
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  useEffect(()=>{ saveJSON("co_sidebar_collapsed", sidebarCollapsed); },[sidebarCollapsed]);"""

NEW_UI = """  const {
    alertasOpen, setAlertasOpen, baseMenuOpen, setBaseMenuOpen,
    conexoesOpen, setConexoesOpen, contatosAdminOpen, setContatosAdminOpen,
    gsheetsOpen, setGsheetsOpen, oauthAccessOpen, setOauthAccessOpen,
    syncStatus, setSyncStatus, syncStatusLoading, setSyncStatusLoading,
    adminEmailVal, setAdminEmailVal,
    isMobile, setIsMobile, isWide, setIsWide,
    sidebarCollapsed, setSidebarCollapsed, mobileSidebarExpanded, setMobileSidebarExpanded,
  } = useUIState();"""

assert content.count(OLD_UI) == 1, "UI block not found/unique"
content = content.replace(OLD_UI, NEW_UI, 1)
print("useUIState extracted")

# ── 3. Replace Email + Logs block ───────────────────────────────────────────
OLD_ADMIN = """  // Item 7 — Email template e envio
  const [emailTemplateOpen, setEmailTemplateOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(() => loadJSON("co_email_template", {
    assunto: "Bem-vindo ao Controle Operacional — YFGroup",
    corpo: `Olá {nome},\\n\\nSeu acesso ao sistema de Controle Operacional da YFGroup foi criado com sucesso!\\n\\nSeus dados de acesso:\\n- Email: {email}\\n- Senha temporária: {senha}\\n- Perfil: {perfil}\\n\\nAcesse o sistema em: https://controle-operacional-omega.vercel.app\\n\\nRecomendamos trocar sua senha no primeiro acesso.\\n\\nAtenciosamente,\\nAdministração — YFGroup`,
  }));
  const [usuarioEmailPreview, setUsuarioEmailPreview] = useState(null);

  // Item 8 — Log de alterações
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [logsSubTab, setLogsSubTab] = useState("dev"); // 'dev' | 'op'"""

NEW_ADMIN = """  const {
    emailTemplateOpen, setEmailTemplateOpen, emailTemplate, setEmailTemplate,
    usuarioEmailPreview, setUsuarioEmailPreview,
    logsOpen, setLogsOpen, logsData, setLogsData, logsSubTab, setLogsSubTab,
  } = useAdminState();"""

assert content.count(OLD_ADMIN) == 1, f"Admin block not found/unique"
content = content.replace(OLD_ADMIN, NEW_ADMIN, 1)
print("useAdminState extracted")

# ── 4. Replace Operacional block ─────────────────────────────────────────────
OLD_OPER = """  // ── Aba Operacional ──
  const [operSubTab, setOperSubTab] = useState("sgs");
  const [filtroOcorr, setFiltroOcorr] = useState(null); // null = todos | "SGS" | "Ocorrência" | "Diária/Atraso" | "DCC"
  const [sgsItems, setSgsItems] = useState(() => loadJSON("co_sgs", []));
  const [sgsFormOpen, setSgsFormOpen] = useState(false);
  const [sgsForm, setSgsForm] = useState({numero:"", data_chamado:"", ultimo_retorno:"", descricao:"", dt_rel:"", status:"aberto"});
  const [apontItems, setApontItems] = useState(() => loadJSON("co_aponts", []));
  const [apontFormOpen, setApontFormOpen] = useState(false);
  const [apontLoading, setApontLoading] = useState(false);
  const [apontForm, setApontForm] = useState({
    numero:"", item:"", linha:"", descricao_apontamento:"",
    pedido:"", mes_ref:"", filial:"", valor:"", frs_folha:"",
    tipo:"descarga", dt_rel:"", cidade:"",
    nf_numero:"", data_emissao:"",
    data_apontamento: new Date().toISOString().split("T")[0],
  });

  // wppTipoOpen/wppDccMinutas state — via useWppState (above)
  // SGS: retornos interativos
  const [expandedSgsId, setExpandedSgsId] = useState(null);
  const [sgsRetornoForm, setSgsRetornoForm] = useState({data:"",descricao:""});"""

NEW_OPER = """  const {
    operSubTab, setOperSubTab, filtroOcorr, setFiltroOcorr,
    sgsItems, setSgsItems, sgsFormOpen, setSgsFormOpen, sgsForm, setSgsForm,
    expandedSgsId, setExpandedSgsId, sgsRetornoForm, setSgsRetornoForm,
    apontItems, setApontItems, apontFormOpen, setApontFormOpen,
    apontLoading, setApontLoading, apontForm, setApontForm,
  } = useOperacionalState();"""

assert content.count(OLD_OPER) == 1, f"Operacional block not found/unique"
content = content.replace(OLD_OPER, NEW_OPER, 1)
print("useOperacionalState extracted")

# ── 5. Write ─────────────────────────────────────────────────────────────────
app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
