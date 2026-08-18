import { parseData, dtBase, saveJSON } from "../utils.js";

const soDigitos = (v) => (v || "").replace(/\D/g, "");
const soPlaca   = (v) => (v || "").toUpperCase().replace(/\W/g, "");
// Nome sem acento/caixa/espaço duplo — a mesma pessoa chega grafada de N jeitos.
const normNome  = (v) => (v || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().trim().replace(/\s+/g, " ");
const maisRecentePrimeiro = (a, b) => {
  const da = parseData(a.data_carr), db = parseData(b.data_carr);
  return da && db ? db - da : 0;
};

// Chave da pessoa: CPF quando existe, senão o nome normalizado. Placa não entra —
// o caminhão troca de motorista e as viagens do outro não são "dele".
const chavePessoa = (r) => soDigitos(r.cpf) || normNome(r.nome);

export function useBuscarHandlers({
  DADOS, buscaInput, buscaTipo,
  setBuscaResult, setBuscaError, setBuscaRelacionados,
  setBuscaMesmaPlaca, setBuscaCandidatos,
  historico, setHistorico,
}) {
  // Todas as viagens da pessoa do registro + as da mesma placa com outro motorista.
  const viagensDe = (reg) => {
    const chave = chavePessoa(reg);
    const placaN = soPlaca(reg.placa);
    const daPessoa = DADOS.filter(r => chave && chavePessoa(r) === chave).sort(maisRecentePrimeiro);
    const daPlaca  = placaN
      ? DADOS.filter(r => soPlaca(r.placa) === placaN && chavePessoa(r) !== chave).sort(maisRecentePrimeiro)
      : [];
    return { daPessoa, daPlaca };
  };

  const mostrar = (reg) => {
    const { daPessoa, daPlaca } = viagensDe(reg);
    setBuscaResult(reg);
    setBuscaRelacionados(daPessoa.filter(r => r.dt !== reg.dt));
    setBuscaMesmaPlaca(daPlaca);
    const newH = [{ dt: reg.dt, nome: reg.nome || "—" }, ...historico.filter(h => h.dt !== reg.dt)].slice(0, 5);
    setHistorico(newH);
    saveJSON("hist", newH);
  };

  const limpar = () => {
    setBuscaResult(null); setBuscaError(null);
    setBuscaRelacionados([]); setBuscaMesmaPlaca([]); setBuscaCandidatos([]);
  };

  const buscar = () => {
    limpar();
    const v = buscaInput.trim();
    if (!v) return;

    if (buscaTipo === "nome") {
      const termo = normNome(v);
      const achou = DADOS.filter(r => normNome(r.nome).includes(termo)).sort(maisRecentePrimeiro);
      if (!achou.length) { setBuscaError(v); return; }
      // Agrupa por pessoa: "silva" casa com vários, então a escolha é do usuário.
      const grupos = new Map();
      achou.forEach(r => {
        const k = chavePessoa(r);
        if (!grupos.has(k)) grupos.set(k, { reg: r, nome: r.nome || "—", cpf: r.cpf || "", placa: r.placa || "", viagens: 0 });
        grupos.get(k).viagens++;
      });
      const lista = [...grupos.values()].sort((a, b) => b.viagens - a.viagens);
      if (lista.length === 1) mostrar(lista[0].reg);
      else setBuscaCandidatos(lista);
      return;
    }

    let found = null;
    if (buscaTipo === "dt") {
      const c = soDigitos(v);
      found = DADOS.find(r => soDigitos(r.dt) === c || soDigitos(dtBase(r.dt)) === c);
    } else if (buscaTipo === "cpf") {
      const cpfN = soDigitos(v);
      found = DADOS.filter(r => soDigitos(r.cpf) === cpfN).sort(maisRecentePrimeiro)[0] || null;
    } else {
      const placaN = soPlaca(v);
      found = DADOS.filter(r => soPlaca(r.placa) === placaN).sort(maisRecentePrimeiro)[0] || null;
    }

    if (found) { mostrar(found); return; }

    // CPF/Placa não achou registro — checar se existe em dados com info parcial
    if (buscaTipo === "cpf") {
      const cpfN = soDigitos(v);
      const temCpf = DADOS.some(r => soDigitos(r.cpf) === cpfN);
      setBuscaError(temCpf ? `__cpf_sem_dt__${v}` : v);
    } else {
      setBuscaError(v);
    }
  };

  return { buscar, mostrarRegistro: mostrar };
}
