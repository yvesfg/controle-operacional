import { useState } from "react";
import { loadJSON, saveJSON } from "../utils.js";

export function useAuthState() {
  const [authed, setAuthed] = useState(false);
  const [hubScreen, setHubScreen] = useState(null);
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
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [usuarios, setUsuarios] = useState(() => loadJSON("co_usuarios_local", []));

  // Aprovação de acesso Google
  const [aguardandoAprovacao, setAguardandoAprovacao] = useState(false);
  const [pendingUserInfo, setPendingUserInfo] = useState(null);
  const [usuariosPendentes, setUsuariosPendentes] = useState([]);
  const [aprovarModal, setAprovarModal] = useState(null);
  const [aprovarPerfil, setAprovarPerfil] = useState("operador");

  return {
    authed, setAuthed, hubScreen, setHubScreen, perfil, setPerfil, perms, setPerms,
    authEmail, setAuthEmail, authSenha, setAuthSenha, authMsg, setAuthMsg,
    primeiroLogin, setPrimeiroLogin, primLoginSenha, setPrimLoginSenha, primLoginSenha2, setPrimLoginSenha2,
    customLogo, setCustomLogo,
    usuarioLogado, setUsuarioLogado, usuarios, setUsuarios,
    aguardandoAprovacao, setAguardandoAprovacao, pendingUserInfo, setPendingUserInfo,
    usuariosPendentes, setUsuariosPendentes, aprovarModal, setAprovarModal, aprovarPerfil, setAprovarPerfil,
  };
}
