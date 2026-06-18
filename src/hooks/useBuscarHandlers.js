import { parseData, dtBase, saveJSON } from "../utils.js";

export function useBuscarHandlers({
  DADOS, buscaInput, buscaTipo,
  setBuscaResult, setBuscaError, setBuscaRelacionados,
  historico, setHistorico,
}) {
  const buscar = () => {
    setBuscaResult(null); setBuscaError(null); setBuscaRelacionados([]);
    const v = buscaInput.trim();
    if (!v) return;
    let found = null;
    let relacionados = [];

    if (buscaTipo === "dt") {
      const c = v.replace(/\D/g,"");
      found = DADOS.find(r => r.dt?.replace(/\D/g,"") === c || dtBase(r.dt)?.replace(/\D/g,"") === c);
      if (found) {
        // Buscar outros registros com mesmo CPF ou mesma Placa
        const cpfN = found.cpf?.replace(/\D/g,"");
        const placaN = found.placa?.toUpperCase().replace(/\W/g,"");
        relacionados = DADOS.filter(r =>
          r.dt !== found.dt && (
            (cpfN && r.cpf?.replace(/\D/g,"") === cpfN) ||
            (placaN && r.placa?.toUpperCase().replace(/\W/g,"") === placaN)
          )
        ).sort((a,b) => {
          const da = parseData(a.data_carr), db = parseData(b.data_carr);
          return da && db ? db - da : 0; // mais recente primeiro
        });
      }
    } else if (buscaTipo === "cpf") {
      const cpfN = v.replace(/\D/g,"");
      const todos = DADOS.filter(r => r.cpf?.replace(/\D/g,"") === cpfN)
        .sort((a,b) => { const da=parseData(a.data_carr),db=parseData(b.data_carr); return da&&db?db-da:0; });
      found = todos[0] || null;
      relacionados = todos.slice(1);
    } else {
      const placaN = v.toUpperCase().replace(/\W/g,"");
      const todos = DADOS.filter(r => r.placa?.toUpperCase().replace(/\W/g,"") === placaN)
        .sort((a,b) => { const da=parseData(a.data_carr),db=parseData(b.data_carr); return da&&db?db-da:0; });
      found = todos[0] || null;
      relacionados = todos.slice(1);
    }

    if (found) {
      setBuscaResult(found);
      setBuscaRelacionados(relacionados);
      const newH = [{dt:found.dt,nome:found.nome||"—"},...historico.filter(h=>h.dt!==found.dt)].slice(0,5);
      setHistorico(newH);
      saveJSON("hist",newH);
    } else {
      // CPF/Placa não achou registro — checar se existe em dados com info parcial
      if (buscaTipo === "cpf") {
        const cpfN = v.replace(/\D/g,"");
        const temCpf = DADOS.some(r => r.cpf?.replace(/\D/g,"") === cpfN);
        setBuscaError(temCpf ? `__cpf_sem_dt__${v}` : v);
      } else {
        setBuscaError(v);
      }
    }
  };

  return { buscar };
}
