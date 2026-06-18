from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# ── 1. Import ────────────────────────────────────────────────────────────────
OLD_IMPORT = "import { useViewPrefsState } from './hooks/useViewPrefsState.js';"
NEW_IMPORT = """import { useViewPrefsState } from './hooks/useViewPrefsState.js';
import { useAuthState } from './hooks/useAuthState.js';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# ── 2. Replace auth state block ──────────────────────────────────────────────
OLD_AUTH = """  // Auth state
  const [authed, setAuthed] = useState(false);
  const [hubScreen, setHubScreen] = useState(null); // null = hub | "controle_op" = app principal
  const [perfil, setPerfil] = useState(null);
  const [perms, setPerms] = useState({});
  const [authEmail, setAuthEmail] = useState("");
  const [authSenha, setAuthSenha] = useState("");
  const [authMsg, setAuthMsg] = useState(null);
  const [primeiroLogin, setPrimeiroLogin] = useState(false);
  const [primLoginSenha, setPrimLoginSenha] = useState("");
  const [primLoginSenha2, setPrimLoginSenha2] = useState("");
  const [customLogo, setCustomLogo] = useState(() => {
    // Logo migration v1 (Apr 2026): limpa logo pre-YFGroup armazenada no localStorage
    const MK = "co_logo_migrated_v1";
    if (!loadJSON(MK, false)) {
      saveJSON("co_custom_logo", null);
      saveJSON(MK, true);
      return null;
    }
    return loadJSON("co_custom_logo", null);
  });
  const [usuarioLogado, setUsuarioLogado] = useState(null); // nome do usuário logado
  const [usuarios, setUsuarios] = useState(() => loadJSON("co_usuarios_local",[]));
  // Aprovação de acesso Google
  const [aguardandoAprovacao, setAguardandoAprovacao] = useState(false);
  const [pendingUserInfo, setPendingUserInfo] = useState(null); // {email, nome}
  const [usuariosPendentes, setUsuariosPendentes] = useState([]);
  const [aprovarModal, setAprovarModal] = useState(null); // usuário pendente a ser aprovado
  const [aprovarPerfil, setAprovarPerfil] = useState("operador");"""

NEW_AUTH = """  const {
    authed, setAuthed, hubScreen, setHubScreen, perfil, setPerfil, perms, setPerms,
    authEmail, setAuthEmail, authSenha, setAuthSenha, authMsg, setAuthMsg,
    primeiroLogin, setPrimeiroLogin, primLoginSenha, setPrimLoginSenha, primLoginSenha2, setPrimLoginSenha2,
    customLogo, setCustomLogo,
    usuarioLogado, setUsuarioLogado, usuarios, setUsuarios,
    aguardandoAprovacao, setAguardandoAprovacao, pendingUserInfo, setPendingUserInfo,
    usuariosPendentes, setUsuariosPendentes, aprovarModal, setAprovarModal, aprovarPerfil, setAprovarPerfil,
  } = useAuthState();"""

assert content.count(OLD_AUTH) == 1, "Auth block not found/unique"
content = content.replace(OLD_AUTH, NEW_AUTH, 1)
print("useAuthState extracted")

app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
