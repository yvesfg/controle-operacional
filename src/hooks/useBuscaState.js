import { useState, useEffect } from "react";
import { loadJSON } from "../utils.js";

export function useBuscaState() {
  const [buscaTipo, setBuscaTipo] = useState("dt");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaResult, setBuscaResult] = useState(null);
  const [buscaRelacionados, setBuscaRelacionados] = useState([]);
  const [buscaError, setBuscaError] = useState(null);
  const [buscaModalOpen, setBuscaModalOpen] = useState(false);
  const [historico, setHistorico] = useState(() => loadJSON("hist", []));

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setBuscaModalOpen(v => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    buscaTipo, setBuscaTipo, buscaInput, setBuscaInput,
    buscaResult, setBuscaResult, buscaRelacionados, setBuscaRelacionados,
    buscaError, setBuscaError, buscaModalOpen, setBuscaModalOpen,
    historico, setHistorico,
  };
}
