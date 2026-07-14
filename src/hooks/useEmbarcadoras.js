// Hook do cadastro de embarcadoras — carrega a lista uma vez e expõe as operações.
// É o ponto de entrada pra QUALQUER tela que precise de embarcadora (não só a
// Conferência de Faturamento): `const { lista, mapa, criar } = useEmbarcadoras(conn)`.
import React from "react";
import {
  listarEmbarcadoras, criarEmbarcadora, atualizarEmbarcadora, setAtivoEmbarcadora, mapaEmbarcadoras,
} from "../embarcadoras.js";

export default function useEmbarcadoras(conn, { incluirInativas = false, onErro } = {}) {
  const [lista, setLista] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    try { setLista(await listarEmbarcadoras(conn, { incluirInativas })); }
    catch (e) { onErro?.("Erro ao carregar embarcadoras: " + e.message); }
    finally { setLoading(false); }
  }, [conn, incluirInativas, onErro]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const mapa = React.useMemo(() => mapaEmbarcadoras(lista), [lista]);

  // Atualizam o estado local no lugar de refetchar — a tela reflete na hora.
  const criar = React.useCallback(async (dados) => {
    const nova = await criarEmbarcadora(conn, dados);
    setLista((arr) => [...arr, nova].sort((a, b) => a.nome.localeCompare(b.nome)));
    return nova;
  }, [conn]);

  const atualizar = React.useCallback(async (cnpj, patch) => {
    const upd = await atualizarEmbarcadora(conn, cnpj, patch);
    setLista((arr) => arr.map((e) => (e.cnpj === upd.cnpj ? upd : e)).sort((a, b) => a.nome.localeCompare(b.nome)));
    return upd;
  }, [conn]);

  const setAtivo = React.useCallback(async (cnpj, ativo) => {
    const upd = await setAtivoEmbarcadora(conn, cnpj, ativo);
    // incluirInativas=false: a desativada some da lista; =true: fica, só muda o toggle.
    setLista((arr) => (!incluirInativas && !ativo
      ? arr.filter((e) => e.cnpj !== cnpj)
      : arr.map((e) => (e.cnpj === upd.cnpj ? upd : e))));
    return upd;
  }, [conn, incluirInativas]);

  return { lista, mapa, loading, recarregar, criar, atualizar, setAtivo };
}
