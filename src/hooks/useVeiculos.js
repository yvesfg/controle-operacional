// Hook de veículos (cavalos/carretas) — tela de Cadastros usa direto (CRUD linha a
// linha); useMotoristas.js usa as funções de src/veiculos.js separadamente pra
// reconciliar placa1..placa4, não este hook (evita dois estados de veículos
// competindo pela mesma fonte). Ambos compartilham o mesmo cache (dataCache.js).
import React from "react";
import { listarVeiculos, criarVeiculo, atualizarVeiculo, excluirVeiculo } from "../veiculos.js";
import { getCached, invalidar, inscrever, CHAVES } from "../dataCache.js";

export default function useVeiculos(conn, { onErro } = {}) {
  const [lista, setLista] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // url/key (primitivos) como deps, não o objeto conn — getConexao() devolve um
  // objeto novo a cada chamada e isso refazia o fetch a cada render.
  const url = conn?.url, key = conn?.key;
  const connRef = React.useRef(conn);
  connRef.current = conn;
  const onErroRef = React.useRef(onErro);
  onErroRef.current = onErro;

  const recarregar = React.useCallback(async (forcar = false) => {
    const c = connRef.current;
    if (!c) return;
    if (forcar) invalidar(CHAVES.veiculos);
    setLoading(true);
    try { setLista(await getCached(CHAVES.veiculos, () => listarVeiculos(c))); }
    catch (e) { onErroRef.current?.("Erro ao carregar veículos: " + e.message); }
    finally { setLoading(false); }
  }, [url, key]);

  React.useEffect(() => { recarregar(); }, [recarregar]);
  React.useEffect(() => inscrever(CHAVES.veiculos, () => recarregar()), [recarregar]);

  // Escrita invalida o cache (motoristas também: placa1..4 deriva de veiculos).
  const criar = React.useCallback(async (dados) => {
    const novo = await criarVeiculo(connRef.current, dados);
    invalidar(CHAVES.veiculos, CHAVES.motoristas);
    return novo;
  }, []);

  const atualizar = React.useCallback(async (placa, patch) => {
    const upd = await atualizarVeiculo(connRef.current, placa, patch);
    invalidar(CHAVES.veiculos, CHAVES.motoristas);
    return upd;
  }, []);

  const excluir = React.useCallback(async (placa) => {
    await excluirVeiculo(connRef.current, placa);
    invalidar(CHAVES.veiculos, CHAVES.motoristas);
  }, []);

  return { lista, loading, recarregar, criar, atualizar, excluir };
}
