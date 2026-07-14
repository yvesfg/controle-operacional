// Hook de motoristas — substitui o antigo estado local (localStorage `co_motoristas`)
// por Supabase, MAS mantém a mesma assinatura que os ~15 arquivos consumidores já
// usam: array `motoristas` (com placa1..placa4 "achatados") + `saveMotoristasLS(novoArray)`.
// Por baixo, motorista e veículo são tabelas separadas (migrations 007/008); este hook
// faz o join na leitura e o diff (insere/atualiza/desvincula) na escrita.
import React from "react";
import { listarMotoristas, criarMotorista, atualizarMotorista, excluirMotorista } from "../motoristas.js";
import { listarVeiculos, criarVeiculo, atualizarVeiculo, desvincularVeiculosDoMotorista, soDigitosPlaca } from "../veiculos.js";
import { getCached, invalidar, inscrever, CHAVES } from "../dataCache.js";

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

  // Depende da URL/key (primitivos), NÃO do objeto conn: getConexao() devolve um
  // objeto novo a cada chamada, então usar `conn` como dep fazia o efeito rodar
  // de novo a cada render de quem chama — refetch em loop das duas tabelas.
  const url = conn?.url, key = conn?.key;
  const connRef = React.useRef(conn);
  connRef.current = conn;
  const onErroRef = React.useRef(onErro);
  onErroRef.current = onErro;

  const recarregar = React.useCallback(async (forcar = false) => {
    const c = connRef.current;
    if (!c) return;
    if (forcar) invalidar(CHAVES.motoristas, CHAVES.veiculos);
    setLoading(true);
    try {
      const [ms, vs] = await Promise.all([
        getCached(CHAVES.motoristas, () => listarMotoristas(c)),
        getCached(CHAVES.veiculos, () => listarVeiculos(c)),
      ]);
      setMotoristas(montarView(ms, vs));
    } catch (e) { onErroRef.current?.("Erro ao carregar motoristas: " + e.message); }
    finally { setLoading(false); }
  }, [url, key]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  // Outra tela gravou (ex.: Veículos mudou o vínculo) -> recarrega desta também.
  React.useEffect(() => {
    const off1 = inscrever(CHAVES.motoristas, () => recarregar());
    const off2 = inscrever(CHAVES.veiculos, () => recarregar());
    return () => { off1(); off2(); };
  }, [recarregar]);

  // Substitui saveMotoristasLS(novoArray) de antes: recebe o array inteiro já editado
  // (mesmo padrão que o código legado usa — `updated=[...motoristas]; ...; saveMotoristasLS(updated)`)
  // e faz o diff contra o que tinha antes pra gravar só o que mudou.
  const saveMotoristasLS = React.useCallback(async (novoArray) => {
    const antigos = motoristas;
    const porIdAntigo = new Map(antigos.filter((m) => m.id).map((m) => [m.id, m]));
    const idsNovos = new Set(novoArray.filter((m) => m.id).map((m) => m.id));

    // Estado atual dos veículos: precisa saber se a placa digitada JÁ existe (e de
    // quem é) antes de gravar. `reatribuidas` volta pra tela avisar o usuário.
    const veiculosAtuais = await getCached(CHAVES.veiculos, () => listarVeiculos(conn));
    const veiculosPorPlaca = new Map(veiculosAtuais.map((v) => [v.placa, v]));
    const nomePorId = new Map(antigos.map((m) => [m.id, m.nome]));
    const reatribuidas = [];

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
        ...adicionadas.map(async (p) => {
          const existente = veiculosPorPlaca.get(p);
          if (existente) {
            // Placa JÁ CADASTRADA: só reatribui o vínculo, preservando tipo/eixos/
            // carroceria/capacidade do veículo. Antes isto era um criarVeiculo(), que
            // é upsert por PK — sobrescrevia o veículo como "cavalo" sem specs e roubava
            // a placa do dono anterior sem avisar ninguém.
            if (existente.motorista_id && existente.motorista_id !== id) {
              reatribuidas.push({ placa: p, deMotoristaId: existente.motorista_id });
            }
            await atualizarVeiculo(conn, p, { motorista_id: id });
          } else {
            // Placa nova: 1ª = cavalo, demais = carreta (antes criava TUDO como cavalo).
            const tipo = placasNovas.indexOf(p) === 0 ? "cavalo" : "carreta";
            await criarVeiculo(conn, { placa: p, tipo, motorista_id: id });
          }
        }),
        ...removidas.map((p) => atualizarVeiculo(conn, p, { motorista_id: null })),
      ]);
    }));

    // forcar=true: invalida o cache e avisa as outras telas inscritas (senão
    // Veículos continuaria mostrando o vínculo antigo depois de salvar aqui).
    await recarregar(true);

    return {
      reatribuidas: reatribuidas.map((r) => ({ ...r, deMotorista: nomePorId.get(r.deMotoristaId) || "outro motorista" })),
    };
  }, [conn, motoristas, recarregar]);

  return { motoristas, setMotoristas: saveMotoristasLS, saveMotoristasLS, loading, recarregar };
}
