import { useState } from "react";
import { loadJSON } from "../utils.js";

export function useCoreState() {
  // Dados base
  const [dadosBase, setDadosBase] = useState([]);
  const [dadosExtras, setDadosExtras] = useState(() => loadJSON("dados_extras", []));
  const [motoristas, setMotoristas] = useState(() => loadJSON("co_motoristas", []));
  const [conexoes, setConexoes] = useState(() => loadJSON("co_conexoes", []));

  // Navegação e status
  const [activeTab, setActiveTab] = useState("planilha");
  const [toast, setToast] = useState({msg:"", type:"", visible:false});
  const [connStatus, setConnStatus] = useState("offline");
  const [ultimaSync, setUltimaSync] = useState(loadJSON("ultima_sync", ""));

  return {
    dadosBase, setDadosBase, dadosExtras, setDadosExtras,
    motoristas, setMotoristas, conexoes, setConexoes,
    activeTab, setActiveTab, toast, setToast,
    connStatus, setConnStatus, ultimaSync, setUltimaSync,
  };
}
