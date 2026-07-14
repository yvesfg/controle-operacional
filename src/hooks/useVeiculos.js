// Hook de veículos (cavalos/carretas) — tela de Cadastros usa direto (CRUD linha a
// linha); useMotoristas.js usa as funções de src/veiculos.js separadamente pra
// reconciliar placa1..placa4, não este hook (evita dois estados de veículos
// competindo pela mesma fonte).
import React from "react";
import { listarVeiculos, criarVeiculo, atualizarVeiculo, excluirVeiculo } from "../veiculos.js";

export default function useVeiculos(conn, { onErro } = {}) {
  const [lista, setLista] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    try { setLista(await listarVeiculos(conn)); }
    catch (e) { onErro?.("Erro ao carregar veículos: " + e.message); }
    finally { setLoading(false); }
  }, [conn, onErro]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const criar = React.useCallback(async (dados) => {
    const novo = await criarVeiculo(conn, dados);
    setLista((arr) => [...arr.filter((v) => v.placa !== novo.placa), novo].sort((a, b) => a.placa.localeCompare(b.placa)));
    return novo;
  }, [conn]);

  const atualizar = React.useCallback(async (placa, patch) => {
    const upd = await atualizarVeiculo(conn, placa, patch);
    setLista((arr) => arr.map((v) => (v.placa === upd.placa ? upd : v)));
    return upd;
  }, [conn]);

  const excluir = React.useCallback(async (placa) => {
    await excluirVeiculo(conn, placa);
    setLista((arr) => arr.filter((v) => v.placa !== placa));
  }, [conn]);

  return { lista, loading, recarregar, criar, atualizar, excluir };
}
