// Hook de motoristas — substitui o antigo estado local (localStorage `co_motoristas`)
// por Supabase, MAS mantém a mesma assinatura que os ~15 arquivos consumidores já
// usam: array `motoristas` (com placa1..placa4 "achatados") + `saveMotoristasLS(novoArray)`.
// Por baixo, motorista e veículo são tabelas separadas (migrations 007/008); este hook
// faz o join na leitura e o diff (insere/atualiza/desvincula) na escrita.
import React from "react";
import { listarMotoristas, criarMotorista, atualizarMotorista, excluirMotorista } from "../motoristas.js";
import { listarVeiculos, criarVeiculo, atualizarVeiculo, desvincularVeiculosDoMotorista, soDigitosPlaca } from "../veiculos.js";

const CAMPOS_MOTORISTA = ["nome", "cpf", "tel", "vinculo", "banco", "agencia", "conta", "favorecido", "status_risco", "observacao"];

// [{...motorista}] x [{...veiculo, motorista_id}] -> array achatado com placa1..placa4.
// Cavalo(s) primeiro, depois carretas — cada grupo em ordem alfabética de placa.
function montarView(motoristasRows, veiculosRows) {
  const porMotorista = {};
  veiculosRows.forEach((v) => {
    if (!v.motorista_id) return;
    (porMotorista[v.motorista_id] = porMotorista[v.motorista_id] || []).push(v);
  });
  return motoristasRows.map((m) => {
    const vs = (porMotorista[m.id] || []).slice().sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "cavalo" ? -1 : 1;
      return (a.placa || "").localeCompare(b.placa || "");
    });
    const placas = vs.map((v) => v.placa);
    return { ...m, placa1: placas[0] || "", placa2: placas[1] || "", placa3: placas[2] || "", placa4: placas[3] || "", _veiculos: vs };
  });
}

export default function useMotoristas(conn, { onErro } = {}) {
  const [motoristas, setMotoristas] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    try {
      const [ms, vs] = await Promise.all([listarMotoristas(conn), listarVeiculos(conn)]);
      setMotoristas(montarView(ms, vs));
    } catch (e) { onErro?.("Erro ao carregar motoristas: " + e.message); }
    finally { setLoading(false); }
  }, [conn, onErro]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  // Substitui saveMotoristasLS(novoArray) de antes: recebe o array inteiro já editado
  // (mesmo padrão que o código legado usa — `updated=[...motoristas]; ...; saveMotoristasLS(updated)`)
  // e faz o diff contra o que tinha antes pra gravar só o que mudou.
  const saveMotoristasLS = React.useCallback(async (novoArray) => {
    const antigos = motoristas;
    const porIdAntigo = new Map(antigos.filter((m) => m.id).map((m) => [m.id, m]));
    const idsNovos = new Set(novoArray.filter((m) => m.id).map((m) => m.id));

    const excluidos = antigos.filter((m) => m.id && !idsNovos.has(m.id));
    await Promise.all(excluidos.map(async (m) => {
      await desvincularVeiculosDoMotorista(conn, m.id);
      await excluirMotorista(conn, m.id);
    }));

    await Promise.all(novoArray.map(async (m) => {
      const antigo = m.id ? porIdAntigo.get(m.id) : null;
      let id = m.id;
      if (!antigo) {
        const dados = {};
        CAMPOS_MOTORISTA.forEach((k) => { if (m[k] !== undefined && m[k] !== "") dados[k] = m[k]; });
        const criado = await criarMotorista(conn, dados);
        id = criado.id;
      } else {
        const patch = {};
        CAMPOS_MOTORISTA.forEach((k) => { if ((m[k] ?? "") !== (antigo[k] ?? "")) patch[k] = m[k] ?? null; });
        if (Object.keys(patch).length) await atualizarMotorista(conn, id, patch);
      }
      const placasNovas = [m.placa1, m.placa2, m.placa3, m.placa4].map((p) => soDigitosPlaca(p)).filter(Boolean);
      const placasAntigas = (antigo?._veiculos || []).map((v) => v.placa);
      const adicionadas = placasNovas.filter((p) => !placasAntigas.includes(p));
      const removidas = placasAntigas.filter((p) => !placasNovas.includes(p));
      await Promise.all([
        ...adicionadas.map((p) => criarVeiculo(conn, { placa: p, tipo: "cavalo", motorista_id: id })),
        ...removidas.map((p) => atualizarVeiculo(conn, p, { motorista_id: null })),
      ]);
    }));

    await recarregar();
  }, [conn, motoristas, recarregar]);

  return { motoristas, setMotoristas: saveMotoristasLS, saveMotoristasLS, loading, recarregar };
}
