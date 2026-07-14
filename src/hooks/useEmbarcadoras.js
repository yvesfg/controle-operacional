// Hook do cadastro de embarcadoras — carrega a lista uma vez e expõe as operações.
// É o ponto de entrada pra QUALQUER tela que precise de embarcadora (não só a
// Conferência de Faturamento): `const { lista, mapa, criar } = useEmbarcadoras(conn)`.
//
// Busca SEMPRE todas (inclusive inativas) e filtra no cliente: são poucas dezenas,
// e assim o cache (dataCache.js) tem uma chave só — a Conferência e a tela de
// Cadastros compartilham o mesmo fetch em vez de fazer um cada.
import React from "react";
import {
  listarEmbarcadoras, criarEmbarcadora, atualizarEmbarcadora, setAtivoEmbarcadora, mapaEmbarcadoras,
} from "../embarcadoras.js";
import { getCached, invalidar, inscrever, CHAVES } from "../dataCache.js";

export default function useEmbarcadoras(conn, { incluirInativas = false, onErro } = {}) {
  const [todas, setTodas] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Deps primitivas: getConexao() devolve objeto novo a cada chamada, e usar `conn`
  // como dep refazia o fetch a cada render de quem chama.
  const url = conn?.url, key = conn?.key;
  const connRef = React.useRef(conn);
  connRef.current = conn;
  const onErroRef = React.useRef(onErro);
  onErroRef.current = onErro;

  const recarregar = React.useCallback(async (forcar = false) => {
    const c = connRef.current;
    if (!c) return;
    if (forcar) invalidar(CHAVES.embarcadoras);
    setLoading(true);
    try { setTodas(await getCached(CHAVES.embarcadoras, () => listarEmbarcadoras(c, { incluirInativas: true }))); }
    catch (e) { onErroRef.current?.("Erro ao carregar embarcadoras: " + e.message); }
    finally { setLoading(false); }
  }, [url, key]);

  React.useEffect(() => { recarregar(); }, [recarregar]);
  React.useEffect(() => inscrever(CHAVES.embarcadoras, () => recarregar()), [recarregar]);

  const lista = React.useMemo(
    () => (incluirInativas ? todas : todas.filter((e) => e.ativo)),
    [todas, incluirInativas],
  );
  const mapa = React.useMemo(() => mapaEmbarcadoras(lista), [lista]);

  const criar = React.useCallback(async (dados) => {
    const nova = await criarEmbarcadora(connRef.current, dados);
    invalidar(CHAVES.embarcadoras);
    return nova;
  }, []);

  const atualizar = React.useCallback(async (cnpj, patch) => {
    const upd = await atualizarEmbarcadora(connRef.current, cnpj, patch);
    invalidar(CHAVES.embarcadoras);
    return upd;
  }, []);

  const setAtivo = React.useCallback(async (cnpj, ativo) => {
    const upd = await setAtivoEmbarcadora(connRef.current, cnpj, ativo);
    invalidar(CHAVES.embarcadoras);
    return upd;
  }, []);

  return { lista, mapa, loading, recarregar, criar, atualizar, setAtivo };
}
