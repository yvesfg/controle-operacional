import { useState, useEffect } from "react";
import { loadJSON } from "../utils.js";

export function useBuscaState() {
  const [buscaTipo, setBuscaTipo] = useState("dt");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaResult, setBuscaResult] = useState(null);
  const [buscaRelacionados, setBuscaRelacionados] = useState([]);
  // Viagens da mesma placa feitas por OUTRO motorista — separadas das da pessoa.
  const [buscaMesmaPlaca, setBuscaMesmaPlaca] = useState([]);
  // Busca por nome que casou com mais de um motorista: lista pra escolher.
  const [buscaCandidatos, setBuscaCandidatos] = useState([]);
  const [buscaError, setBuscaError] = useState(null);
  const [buscaModalOpen, setBuscaModalOpen] = useState(false);
  const [historico, setHistorico] = useState(() => loadJSON("hist", []));

  useEffect(() => {
    // Captura na fase de captura e aceita 'K'/'k'/code, senão o Ctrl+K vaza pro Chrome (omnibox).
    const onKey = (e) => {
      const ehK = e.code === 'KeyK' || (e.key || '').toLowerCase() === 'k';
      if ((e.ctrlKey || e.metaKey) && !e.altKey && ehK) { e.preventDefault(); setBuscaModalOpen(v => !v); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return {
    buscaTipo, setBuscaTipo, buscaInput, setBuscaInput,
    buscaResult, setBuscaResult, buscaRelacionados, setBuscaRelacionados,
    buscaMesmaPlaca, setBuscaMesmaPlaca, buscaCandidatos, setBuscaCandidatos,
    buscaError, setBuscaError, buscaModalOpen, setBuscaModalOpen,
    historico, setHistorico,
  };
}
