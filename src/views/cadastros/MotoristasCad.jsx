import React from "react";
import useMotoristas from "../../hooks/useMotoristas.js";
import useVeiculos from "../../hooks/useVeiculos.js";
import { parseAgendaCSV, classificarContatos, aplicarEnriquecimentoLote, confirmarNovosLote } from "../../motoristasImport.js";
import EmptyState from "../../components/EmptyState.jsx";
import ExportarCadastroPanel from "./ExportarCadastroPanel.jsx";
import {
  GENEROS, FUNCOES, UFS, normalizarGenero, normalizarFuncao, normalizarUF,
  normalizarRenavam, pendenciasCadastro, cnhVencida, cpfDigitos, formatarCPF,
  viagensDoMotorista,
} from "../../cadastroEmbarcadora.js";

// Motoristas — tela ÚNICA do cadastro de motorista (a aba do sidebar foi removida:
// era redundante, tratava vínculo num segundo lugar). Reúne tudo:
//   * lista/busca/edição (useMotoristas, mesmo hook e cache do resto do app)
//   * ciclo da agenda do Google: IMPORTAR csv (enriquece quem veio do Sheets, ver
//     migration 009) e EXPORTAR vCard de volta pros contatos
//   * "Sugerir vínculos": cruza as placas do cadastro com as viagens reais (DADOS,
//     que vem do Sheets) e preenche o motorista nas DTs que estão sem nome
//   * relatório PDF por motorista e exclusão em lote (vieram da tela antiga)
//
// Fluxo completo: Sheets (fonte automática) -> Supabase (fonte real) -> app (entrada
// manual) -> agenda do Google (enriquecimento e volta).

const STATUS_LABEL = { bom: "Bom", vermelho: "Vermelho", bloqueado: "Bloqueado", golpe: "Golpe" };
const STATUS_COR = { bom: "var(--color-info)", vermelho: "var(--warn)", bloqueado: "var(--red, #e5484d)", golpe: "var(--red, #e5484d)" };

const VAZIO = { nome: "", cpf: "", tel: "", vinculo: "", banco: "", agencia: "", conta: "", favorecido: "", status_risco: "", observacao: "", placa1: "", placa2: "", placa3: "", placa4: "",
  cnh_numero: "", cnh_categoria: "", cnh_validade: "", cnh_primeira_habilitacao: "", cnh_uf: "", genero: "", data_nascimento: "", funcao: "", qualificacao: "" };

// Os 4 lugares do conjunto. A ordem é a MESMA que useMotoristas usa ao criar o
// veículo (1ª placa = cavalo, resto = carreta) — se divergir, o tipo gravado no
// banco não bate com o rótulo da tela.
const SLOTS = [
  { k: "placa1", label: "Cavalo",    tipo: "cavalo"  },
  { k: "placa2", label: "Carreta 1", tipo: "carreta" },
  { k: "placa3", label: "Carreta 2", tipo: "carreta" },
  { k: "placa4", label: "Carreta 3", tipo: "carreta" },
];

// O que o CRLV preenche, mais o tanque (que NÃO está no documento e é digitado
// uma vez por cavalo).
const CAMPOS_VEICULO = ["marca", "modelo", "cor", "ano", "renavam", "chassi", "especie", "tanque_litros", "cpf_cnpj_responsavel"];

const normPlaca = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

export default function MotoristasCad({ ctx, conn }) {
  const {
    t, showToast, usuarioLogado,
    // Vindos do App: necessários pro "Sugerir vínculos" (cruza com as viagens) e
    // pro relatório PDF por motorista — as duas funções que existiam só na tela antiga.
    DADOS, setDadosBase, dadosExtras, gerarRelatorioMotorista, registrarLog,
    motSugestOpen, setMotSugestOpen, motSugestData, setMotSugestData,
    openDocIntake,
  } = ctx;
  const onErro = React.useCallback((msg) => showToast?.(msg, "erro"), [showToast]);
  const { motoristas, saveMotoristasLS, loading, recarregar } = useMotoristas(conn, { onErro });
  // Lista completa de veículos: a placa digitada pode já existir (troca de conjunto
  // entre motoristas), e aí os dados do CRLV dela já estão no banco.
  const { lista: veiculosTodos, atualizar: atualizarVeiculo } = useVeiculos(conn, { onErro });
  const veicPorPlaca = React.useMemo(() => new Map(veiculosTodos.map((v) => [v.placa, v])), [veiculosTodos]);

  const [busca, setBusca] = React.useState("");
  const [form, setForm] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);
  const [importAberto, setImportAberto] = React.useState(false);
  const [envioAberto, setEnvioAberto] = React.useState(false);
  const [selecionados, setSelecionados] = React.useState(new Set()); // ids p/ exclusão em lote
  const [excluindoLote, setExcluindoLote] = React.useState(false);

  // Última DT de cada motorista: a DT é como o analista chama a carga, então ela
  // é o que ele digita na busca e o que precisa enxergar na linha. Um passo só
  // sobre DADOS (o cruzamento por motorista é caro pra rodar por linha).
  const dtsPorMotorista = React.useMemo(() => {
    const porCpf = new Map(), porNome = new Map(), porPlaca = new Map();
    motoristas.forEach((m) => {
      const cpf = cpfDigitos(m.cpf);
      if (cpf) porCpf.set(cpf, m.id);
      if (m.nome) porNome.set(m.nome.toUpperCase().trim(), m.id);
      [m.placa1, m.placa2, m.placa3, m.placa4].filter(Boolean).forEach((p) => porPlaca.set(normPlaca(p), m.id));
    });
    const mapa = new Map(); // id -> [{dt, data, destino}]
    (DADOS || []).forEach((reg) => {
      const id = porCpf.get(cpfDigitos(reg.cpf))
        || porNome.get(String(reg.nome || "").toUpperCase().trim())
        || porPlaca.get(normPlaca(reg.placa));
      if (!id || !reg.dt) return;
      const lista = mapa.get(id) || [];
      lista.push({ dt: String(reg.dt), destino: reg.destino || "", data: reg.data_carr || reg.data || "" });
      mapa.set(id, lista);
    });
    return mapa;
  }, [motoristas, DADOS]);

  const filtrados = React.useMemo(() => {
    const q = busca.trim().toUpperCase();
    if (!q) return motoristas;
    const qDigitos = q.replace(/[^A-Z0-9]/g, "");
    return motoristas.filter((m) =>
      (m.nome || "").toUpperCase().includes(q) ||
      (m.cpf || "").includes(q) ||
      [m.placa1, m.placa2, m.placa3, m.placa4].some((p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "").includes(qDigitos)) ||
      // Busca por DT: é a chave que o analista tem em mãos quando vai completar
      // o cadastro pra enviar à embarcadora.
      (dtsPorMotorista.get(m.id) || []).some((v) => v.dt.toUpperCase().includes(q))
    );
  }, [motoristas, busca, dtsPorMotorista]);

  // Peças do conjunto que o form está editando: o que já veio do banco, coberto
  // pelo que foi digitado/lido agora (form._veic, indexado por placa).
  const veicDoForm = React.useCallback((placa) => {
    const p = normPlaca(placa);
    if (!p) return {};
    return { ...(veicPorPlaca.get(p) || {}), ...((form?._veic || {})[p] || {}) };
  }, [form, veicPorPlaca]);

  const setVeic = (placa, patch) => {
    const p = normPlaca(placa);
    if (!p) return;
    setForm((f) => ({ ...f, _veic: { ...(f._veic || {}), [p]: { ...((f._veic || {})[p] || {}), ...patch } } }));
  };

  // Conjunto do form como o resto do módulo espera: [{placa, tipo, ...campos}].
  const conjuntoDoForm = React.useCallback(() => (
    SLOTS.map((s) => ({ slot: s, placa: normPlaca(form?.[s.k]) }))
      .filter((x) => x.placa)
      .map((x) => ({ ...veicDoForm(x.placa), placa: x.placa, tipo: veicPorPlaca.get(x.placa)?.tipo || x.slot.tipo }))
  ), [form, veicDoForm, veicPorPlaca]);

  const pendencias = form ? pendenciasCadastro(form, conjuntoDoForm()) : [];

  // Mesmo CPF já cadastrado = é a segunda vez que este motorista chega. Avisa e
  // oferece abrir o cadastro que existe, em vez de criar um duplicado.
  const jaCadastrado = React.useMemo(() => {
    if (!form?.__novo) return null;
    const cpf = cpfDigitos(form.cpf);
    if (cpf.length !== 11) return null;
    return motoristas.find((m) => cpfDigitos(m.cpf) === cpf) || null;
  }, [form, motoristas]);

  const editar = (m) => setForm({ ...VAZIO, ...m, _veic: {} });
  const novo = () => setForm({ ...VAZIO, __novo: true, funcao: "MOTORISTA", _veic: {} });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Preenche o form com o que a IA leu do documento. Nada é gravado aqui: o
  // analista revisa e salva — documento borrado erra, e errar calado é pior.
  const aplicarCnh = (d) => {
    setForm((f) => ({
      ...f,
      nome:            f.nome || d.nome || "",
      cpf:             f.cpf || (d.cpf ? formatarCPF(d.cpf) : ""),
      cnh_numero:      d.numero_registro || f.cnh_numero,
      cnh_categoria:   (d.categoria || f.cnh_categoria || "").toUpperCase(),
      cnh_validade:    d.validade || f.cnh_validade,
      cnh_primeira_habilitacao: d.primeira_habilitacao || f.cnh_primeira_habilitacao,
      cnh_uf:          normalizarUF(d.cnh_uf) || f.cnh_uf,
      data_nascimento: d.data_nascimento || f.data_nascimento,
      funcao:          f.funcao || "MOTORISTA",
    }));
    showToast?.("CNH lida — confira os campos antes de salvar.", "ok");
  };

  const aplicarCrlv = (slot, d) => {
    const placa = normPlaca(d.placa) || normPlaca(form?.[slot.k]);
    if (!placa) { showToast?.("O CRLV não trouxe a placa — digite a placa antes.", "erro"); return; }
    setForm((f) => ({
      ...f,
      [slot.k]: placa,
      _veic: { ...(f._veic || {}), [placa]: {
        ...((f._veic || {})[placa] || {}),
        marca: d.marca || "", modelo: d.modelo || "", cor: d.cor || "",
        ano: d.ano || "", renavam: normalizarRenavam(d.renavam),
        chassi: d.chassi || "", especie: d.especie || "",
        cpf_cnpj_responsavel: d.cpf_cnpj || "",
      } },
    }));
    showToast?.(`CRLV lido — ${slot.label} ${placa}.`, "ok");
  };

  const salvar = async ({ concluir = false } = {}) => {
    if (!form.nome.trim()) { showToast?.("Informe o nome do motorista.", "erro"); return; }
    if (concluir && pendencias.length) {
      showToast?.(`Ainda falta: ${pendencias.slice(0, 3).join(", ")}${pendencias.length > 3 ? "…" : ""}`, "erro");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        ...form,
        nome: form.nome.trim(),
        cpf: form.cpf ? formatarCPF(form.cpf) : "",
        genero: normalizarGenero(form.genero),
        funcao: normalizarFuncao(form.funcao),
        cnh_uf: normalizarUF(form.cnh_uf),
        ...(concluir ? { cadastro_concluido_em: new Date().toISOString() } : {}),
      };
      delete dados._veic;
      const atualizado = form.__novo
        ? [...motoristas, dados]
        : motoristas.map((m) => (m.id === form.id ? { ...m, ...dados } : m));
      const r = await saveMotoristasLS(atualizado);
      // Placa que já pertencia a outro motorista foi reatribuída — avisa, senão o
      // vínculo do outro sumia em silêncio.
      (r?.reatribuidas || []).forEach(({ placa, deMotorista }) => {
        showToast?.(`Placa ${placa} estava com "${deMotorista}" e passou para "${dados.nome}".`, "warn");
      });
      // Os dados do CRLV vão DEPOIS: saveMotoristasLS é quem cria o veículo da
      // placa nova (e define cavalo/carreta), então antes dele não há o que patchar.
      for (const [placa, patch] of Object.entries(form._veic || {})) {
        const atual = veicPorPlaca.get(placa) || {};
        const limpo = {};
        CAMPOS_VEICULO.forEach((k) => {
          const v = k === "renavam" ? normalizarRenavam(patch[k]) : patch[k];
          if (v !== undefined && String(v ?? "") !== String(atual[k] ?? "")) limpo[k] = v === "" ? null : v;
        });
        if (Object.keys(limpo).length) await atualizarVeiculo(placa, limpo);
      }
      showToast?.(`"${dados.nome}" ${concluir ? "com cadastro concluído" : form.__novo ? "cadastrado" : "atualizado"}.`, "ok");
      setForm(null);
    } catch (e) { showToast?.("Erro ao salvar: " + e.message, "erro"); }
    finally { setSalvando(false); }
  };

  const excluir = async (m) => {
    if (!window.confirm(`Excluir "${m.nome}"? Os veículos dele ficam sem motorista vinculado.`)) return;
    try { await saveMotoristasLS(motoristas.filter((x) => x.id !== m.id)); showToast?.("Motorista excluído.", "ok"); }
    catch (e) { showToast?.("Erro ao excluir: " + e.message, "erro"); }
  };

  const excluirSelecionados = async () => {
    if (!selecionados.size) return;
    if (!window.confirm(`Excluir ${selecionados.size} motorista(s)? Os veículos deles ficam sem vínculo.`)) return;
    setExcluindoLote(true);
    try {
      await saveMotoristasLS(motoristas.filter((m) => !selecionados.has(m.id)));
      showToast?.(`${selecionados.size} motorista(s) excluído(s).`, "ok");
      setSelecionados(new Set());
    } catch (e) { showToast?.("Erro ao excluir: " + e.message, "erro"); }
    finally { setExcluindoLote(false); }
  };

  // Exporta o cadastro como vCard (.vcf) — é o caminho de VOLTA pro Google Contacts,
  // fechando o ciclo com a importação da agenda.
  const exportarVCard = () => {
    const vcf = motoristas.map((m) => {
      const tel = (m.tel || "").replace(/\D/g, "");
      const partes = (m.nome || "").split(" ");
      const sobrenome = partes.pop() || "";
      const primeiro = partes.join(" ");
      const placas = [m.placa1, m.placa2, m.placa3, m.placa4].filter(Boolean).join(" | ");
      return [
        "BEGIN:VCARD", "VERSION:3.0",
        `FN:${m.nome || ""}`, `N:${sobrenome};${primeiro};;;`,
        tel ? `TEL;TYPE=CELL:+55${tel}` : "",
        m.cpf ? `X-CPF:${m.cpf}` : "",
        placas ? `NOTE:Placa: ${placas} | Vínculo: ${m.vinculo || "—"}${m.status_risco ? " | Status: " + STATUS_LABEL[m.status_risco] : ""}` : "",
        "END:VCARD",
      ].filter(Boolean).join("\r\n");
    }).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vcf], { type: "text/vcard;charset=utf-8" }));
    a.download = "motoristas_yfgroup.vcf";
    a.click();
    showToast?.(`${motoristas.length} contatos exportados (.vcf).`, "ok");
  };

  // Cruza as placas do cadastro com as VIAGENS reais (DADOS, vindo do Sheets) e
  // sugere preencher o motorista nas DTs que estão sem nome ou com nome divergente.
  const sugerirVinculos = () => {
    const sugs = [];
    motoristas.forEach((mot) => {
      const placas = [mot.placa1, mot.placa2, mot.placa3, mot.placa4]
        .filter(Boolean).map((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, ""));
      if (!placas.length) return;
      (DADOS || []).forEach((reg) => {
        const placaReg = (reg.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!placaReg || !placas.includes(placaReg)) return;
        const nomeReg = (reg.nome || "").toUpperCase().trim();
        if (nomeReg && nomeReg === (mot.nome || "").toUpperCase().trim()) return; // já bate
        sugs.push({ mot, reg, placa: placaReg, aceito: null });
      });
    });
    const unicas = sugs.filter((s, i) => sugs.findIndex((x) => x.reg.dt === s.reg.dt && x.mot.nome === s.mot.nome) === i);
    if (!unicas.length) { showToast?.("Nenhuma nova sugestão de vínculo encontrada.", "ok"); return; }
    setMotSugestData?.(unicas);
    setMotSugestOpen?.(true);
  };

  const inp = { fontSize: 12.5, padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", width: "100%" };
  const lbl = { fontSize: 10.5, color: t.txt2, marginBottom: 3, display: "block" };
  const campo = (label, k, extra = {}) => (
    <div style={{ flex: extra.flex || "1 1 140px" }}>
      <label style={lbl}>{label}</label>
      <input value={form[k] ?? ""} placeholder={extra.placeholder} onChange={(e) => set(k, e.target.value)} style={inp} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CPF, placa ou DT"
          style={{ ...inp, flex: "1 1 220px", width: "auto" }} />
        <button onClick={sugerirVinculos} title="Cruza as placas do cadastro com as viagens e sugere preencher o motorista nas DTs sem nome"
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.verde, border: `1.5px solid ${t.verde}` }}>
          🔗 Sugerir vínculos
        </button>
        <button onClick={() => setImportAberto(true)} title="Google Contacts → cadastro (enriquece quem já existe)"
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt, border: `1.5px solid ${t.borda}` }}>
          📥 Importar agenda (CSV)
        </button>
        <button onClick={() => setEnvioAberto((v) => !v)} title="Gera o .xlsx no modelo da embarcadora, escolhendo as DTs"
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.azul, border: `1.5px solid ${t.azul}` }}>
          📤 Cadastro embarcadora
        </button>
        <button onClick={exportarVCard} title="Cadastro → Google Contacts (.vcf)"
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt, border: `1.5px solid ${t.borda}` }}>
          📤 Exportar vCard
        </button>
        <button onClick={novo}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: t.ouro, color: "#1a1a1a", border: "none" }}>
          + Novo motorista
        </button>
      </div>

      {selecionados.size > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: t.card2, border: `1px solid ${t.borda}` }}>
          <span style={{ fontSize: 11.5, color: t.txt, flex: 1 }}>{selecionados.size} selecionado(s)</span>
          <button onClick={() => setSelecionados(new Set())} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Desmarcar</button>
          <button onClick={excluirSelecionados} disabled={excluindoLote}
            style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.danger, border: `1.5px solid ${t.danger}`, opacity: excluindoLote ? .5 : 1 }}>
            {excluindoLote ? "Excluindo…" : "Excluir selecionados"}
          </button>
        </div>
      )}

      {importAberto && (
        <ImportarAgenda ctx={ctx} conn={conn} motoristas={motoristas} usuarioLogado={usuarioLogado}
          onFechar={() => setImportAberto(false)} onConcluido={() => { setImportAberto(false); recarregar(); }} />
      )}

      {envioAberto && (
        <ExportarCadastroPanel ctx={ctx} conn={conn} motoristas={motoristas} veiculos={veiculosTodos}
          onFechar={() => setEnvioAberto(false)} />
      )}

      {form && (
        <div style={{ marginBottom: 14, border: `1.5px solid ${t.ouro}`, borderRadius: 10, background: t.card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.txt }}>
              {form.__novo ? "Novo motorista" : `Editando: ${form.nome}`}
            </div>
            {/* O selo responde a "este cadastro já está pronto pra enviar?" — é a
                mesma conta que a exportação usa, então não há como divergir. */}
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
              color: pendencias.length ? t.warn : t.verde, border: `1px solid ${pendencias.length ? t.warn : t.verde}` }}>
              {pendencias.length ? `Falta ${pendencias.length}: ${pendencias.slice(0, 3).join(", ")}${pendencias.length > 3 ? "…" : ""}` : "Cadastro completo"}
            </span>
            {form.cadastro_concluido_em && (
              <span style={{ fontSize: 10.5, color: t.txt2 }}>concluído em {dataBR(form.cadastro_concluido_em)}</span>
            )}
            {cnhVencida(form.cnh_validade) && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: t.danger }}>⚠ CNH vencida</span>
            )}
          </div>

          {/* Segunda vez que o mesmo CPF chega: o cadastro já existe. */}
          {jaCadastrado && (
            <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: t.card2, border: `1px solid ${t.warn}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: t.txt, flex: "1 1 240px" }}>
                Este CPF já está cadastrado como <strong>{jaCadastrado.nome}</strong> — completar o que existe evita duplicar o motorista.
              </span>
              <button onClick={() => editar(jaCadastrado)}
                style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.warn, border: `1.5px solid ${t.warn}` }}>
                Abrir cadastro existente
              </button>
            </div>
          )}

          {openDocIntake && (
            <button onClick={() => openDocIntake("cnh", aplicarCnh)}
              title="Envie foto ou PDF da CNH — a IA preenche número, categoria, validade, UF e nascimento"
              style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.verde, border: `1.5px solid ${t.verde}` }}>
              📄 Ler CNH (foto ou PDF)
            </button>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {campo("Nome", "nome", { flex: "1 1 220px" })}
            {campo("CPF", "cpf", { flex: "1 1 140px" })}
            {campo("Telefone", "tel", { flex: "1 1 140px" })}
            <div style={{ flex: "1 1 140px" }}>
              <label style={lbl}>Status</label>
              <select value={form.status_risco || ""} onChange={(e) => set("status_risco", e.target.value)} style={inp}>
                <option value="">—</option>
                {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
          {/* ── CNH — o bloco que a embarcadora exige e a planilha digitava à mão ── */}
          <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 4 }}>CNH e dados pessoais</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {campo("Nº da CNH", "cnh_numero", { flex: "1 1 140px" })}
            {campo("Categoria", "cnh_categoria", { flex: "1 1 80px", placeholder: "AE" })}
            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Validade</label>
              <input type="date" value={String(form.cnh_validade || "").slice(0, 10)} onChange={(e) => set("cnh_validade", e.target.value)} style={inp} />
            </div>
            <div style={{ flex: "1 1 100px" }}>
              <label style={lbl}>UF da CNH</label>
              <select value={normalizarUF(form.cnh_uf)} onChange={(e) => set("cnh_uf", e.target.value)} style={inp}>
                <option value="">—</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Nascimento</label>
              <input type="date" value={String(form.data_nascimento || "").slice(0, 10)} onChange={(e) => set("data_nascimento", e.target.value)} style={inp} />
            </div>
            {/* Gênero é escolhido, não lido: a CNH não imprime sexo. Era daqui que
                saíam "MAISCULINO" e "MAICULINO" na planilha. */}
            <div style={{ flex: "1 1 130px" }}>
              <label style={lbl}>Gênero</label>
              <select value={normalizarGenero(form.genero)} onChange={(e) => set("genero", e.target.value)} style={inp}>
                <option value="">—</option>
                {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 130px" }}>
              <label style={lbl}>Função</label>
              <select value={normalizarFuncao(form.funcao)} onChange={(e) => set("funcao", e.target.value)} style={inp}>
                <option value="">—</option>
                {FUNCOES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {campo("Qualificação", "qualificacao", { flex: "1 1 120px", placeholder: "X" })}
          </div>

          {/* ── Conjunto: uma peça por linha, cada uma com o próprio CRLV ──────── */}
          <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 4 }}>
            Conjunto — trocar a placa troca a peça; o que já estiver cadastrado nela vem junto
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {SLOTS.map((s) => {
              const placa = normPlaca(form[s.k]);
              const v = veicDoForm(placa);
              const conhecida = placa && veicPorPlaca.has(placa);
              return (
                <div key={s.k} style={{ border: `1px solid ${t.borda}`, borderRadius: 9, padding: 10, background: t.card2 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: v.placa || placa ? 8 : 0 }}>
                    <div style={{ flex: "0 0 130px" }}>
                      <label style={lbl}>{s.label}</label>
                      <input value={form[s.k] || ""} placeholder="AAA0000"
                        onChange={(e) => set(s.k, e.target.value.toUpperCase())}
                        style={{ ...inp, fontFamily: "var(--font-mono)", letterSpacing: 1 }} />
                    </div>
                    {conhecida && <span style={{ fontSize: 10.5, color: t.txt2, paddingBottom: 8 }}>já cadastrada</span>}
                    {placa && openDocIntake && (
                      <button onClick={() => openDocIntake("crlv", (d) => aplicarCrlv(s, d))}
                        title="Envie foto ou PDF do CRLV desta peça"
                        style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.azul, border: `1.5px solid ${t.azul}`, marginBottom: 1 }}>
                        📄 Ler CRLV
                      </button>
                    )}
                  </div>
                  {placa && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[["marca", "Marca", "1 1 120px"], ["modelo", "Modelo", "1 1 140px"], ["cor", "Cor", "1 1 100px"],
                        ["ano", "Ano", "0 0 80px"], ["renavam", "RENAVAM", "1 1 130px"]].map(([k, label, flex]) => (
                        <div key={k} style={{ flex }}>
                          <label style={lbl}>{label}</label>
                          <input value={v[k] ?? ""} onChange={(e) => setVeic(placa, { [k]: e.target.value })}
                            onBlur={k === "renavam" ? (e) => setVeic(placa, { renavam: normalizarRenavam(e.target.value) }) : undefined}
                            style={inp} />
                        </div>
                      ))}
                      {/* Tanque só do cavalo: na carreta a planilha da embarcadora escreve "X". */}
                      {(veicPorPlaca.get(placa)?.tipo || s.tipo) === "cavalo" && (
                        <div style={{ flex: "0 0 110px" }}>
                          <label style={lbl}>Tanque (L)</label>
                          <input value={v.tanque_litros ?? ""} placeholder="540"
                            onChange={(e) => setVeic(placa, { tanque_litros: e.target.value.replace(/\D/g, "") })} style={inp} />
                        </div>
                      )}
                      <div style={{ flex: "1 1 160px" }}>
                        <label style={lbl}>CPF/CNPJ do responsável</label>
                        <input value={v.cpf_cnpj_responsavel ?? ""} onChange={(e) => setVeic(placa, { cpf_cnpj_responsavel: e.target.value })} style={inp} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {campo("Vínculo", "vinculo", { flex: "1 1 140px" })}
            {campo("Banco", "banco", { flex: "1 1 160px" })}
            {campo("Agência", "agencia", { flex: "1 1 100px" })}
            {campo("Conta", "conta", { flex: "1 1 100px" })}
            {campo("Favorecido", "favorecido", { flex: "1 1 180px" })}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
            <button onClick={() => setForm(null)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Cancelar</button>
            <button onClick={() => salvar()} disabled={salvando} style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt, border: `1.5px solid ${t.borda}`, opacity: salvando ? .5 : 1 }}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            {/* Salvar guarda o que tem; Concluir afirma que está pronto pra enviar —
                e por isso recusa enquanto houver pendência. */}
            <button onClick={() => salvar({ concluir: true })} disabled={salvando || pendencias.length > 0}
              title={pendencias.length ? `Falta: ${pendencias.join(", ")}` : "Marca o cadastro como pronto pra enviar"}
              style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: pendencias.length ? "not-allowed" : "pointer", background: "var(--accent)", color: "#fff", border: "none", opacity: salvando || pendencias.length ? .45 : 1 }}>
              Concluir cadastro
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: t.txt2, padding: 8 }}>Carregando…</div>}
      {!loading && filtrados.length === 0 && <EmptyState title="Nenhum motorista" description={busca ? "Nada bate com essa busca." : "Cadastre o primeiro motorista ou importe a agenda."} />}

      <div style={{ fontSize: 11, color: t.txt2, marginBottom: 6 }}>{filtrados.length} de {motoristas.length} motorista(s)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 560, overflowY: "auto" }}>
        {filtrados.slice(0, 200).map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 12px", borderRadius: 10, background: t.card, border: `1px solid ${selecionados.has(m.id) ? t.ouro : t.borda}` }}>
            <input type="checkbox" checked={selecionados.has(m.id)}
              onChange={(e) => setSelecionados((s) => { const n = new Set(s); e.target.checked ? n.add(m.id) : n.delete(m.id); return n; })}
              style={{ flexShrink: 0, cursor: "pointer" }} />
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nome}</div>
              <div style={{ fontSize: 10.5, color: t.txt2 }}>{[m.cpf, m.tel].filter(Boolean).join(" · ") || "—"}</div>
            </div>
            <div style={{ flex: "1 1 160px", fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>
              {[m.placa1, m.placa2, m.placa3, m.placa4].filter(Boolean).join(" · ") || "sem placa"}
              {(() => {
                const vs = dtsPorMotorista.get(m.id) || [];
                if (!vs.length) return null;
                const ultima = vs[vs.length - 1];
                return <div style={{ color: t.ouro }}>DT {ultima.dt}{vs.length > 1 ? ` +${vs.length - 1}` : ""}</div>;
              })()}
            </div>
            {(() => {
              // Mesma conta do form: quem olha a lista já sabe de quem falta documento.
              const faltas = pendenciasCadastro(m, m._veiculos || []);
              return (
                <span title={faltas.length ? `Falta: ${faltas.join(", ")}` : "Pronto pra enviar à embarcadora"}
                  style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
                    color: faltas.length ? t.warn : t.verde, border: `1px solid ${faltas.length ? t.warn : t.verde}` }}>
                  {faltas.length ? `falta ${faltas.length}` : "completo"}
                </span>
              );
            })()}
            {m.status_risco && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: STATUS_COR[m.status_risco], border: `1px solid ${STATUS_COR[m.status_risco]}` }}>
                {STATUS_LABEL[m.status_risco]}
              </span>
            )}
            {gerarRelatorioMotorista && (
              <button onClick={() => gerarRelatorioMotorista(m)} title="Relatório PDF deste motorista"
                style={{ fontSize: 11, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.ouro, border: `1px solid ${t.borda}` }}>📄</button>
            )}
            <button onClick={() => editar(m)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt, border: `1px solid ${t.borda}` }}>Editar</button>
            <button onClick={() => excluir(m)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Excluir</button>
          </div>
        ))}
        {filtrados.length > 200 && <div style={{ fontSize: 11, color: t.txt2, textAlign: "center", padding: 8 }}>mostrando 200 de {filtrados.length} — refine a busca pra ver os demais</div>}
      </div>
    </div>
  );
}

// ── Fluxo de importação da agenda ──────────────────────────────────────────
function ImportarAgenda({ ctx, conn, motoristas, usuarioLogado, onFechar, onConcluido }) {
  const { t, showToast } = ctx;
  const [etapa, setEtapa] = React.useState("upload"); // upload | revisao | aplicando
  const [classificado, setClassificado] = React.useState(null); // {enriquecer, novos, semSinal}
  const [selecionados, setSelecionados] = React.useState(new Set());
  const [pagina, setPagina] = React.useState(0);
  const [buscaNovos, setBuscaNovos] = React.useState("");
  const [progresso, setProgresso] = React.useState("");

  const onArquivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const contatos = parseAgendaCSV(ev.target.result);
        if (!contatos.length) { showToast?.("Nenhum contato encontrado no CSV.", "erro"); return; }
        const result = classificarContatos(contatos, motoristas);
        setClassificado(result);
        setSelecionados(new Set(result.novos.map((_, i) => i)));
        setEtapa("revisao");
      } catch (err) { showToast?.("Erro ao ler CSV: " + err.message, "erro"); }
    };
    reader.readAsText(file, "utf-8");
  };

  const aplicarEnriquecer = async () => {
    setEtapa("aplicando"); setProgresso("Enriquecendo motoristas já cadastrados...");
    try {
      const r = await aplicarEnriquecimentoLote(conn, classificado.enriquecer, {
        onProgresso: (f, tt) => setProgresso(`Enriquecendo ${f}/${tt}...`),
      });
      showToast?.(`${r.motoristasAtualizados} motorista(s) enriquecido(s), ${r.veiculosCriados} veículo(s) novo(s).`, "ok");
      setClassificado((c) => ({ ...c, enriquecer: [] }));
    } catch (e) { showToast?.("Erro ao enriquecer: " + e.message, "erro"); }
    finally { setEtapa("revisao"); setProgresso(""); }
  };

  const confirmarNovos = async () => {
    const escolhidos = classificado.novos.filter((_, i) => selecionados.has(i));
    if (!escolhidos.length) { showToast?.("Nenhum contato selecionado.", "erro"); return; }
    setEtapa("aplicando"); setProgresso(`Importando ${escolhidos.length} motorista(s) novo(s)...`);
    try {
      const r = await confirmarNovosLote(conn, escolhidos, usuarioLogado);
      showToast?.(`${r.motoristasCriados} motorista(s) novo(s) importado(s), ${r.veiculosCriados} veículo(s).`, "ok");
      onConcluido();
    } catch (e) { showToast?.("Erro ao importar: " + e.message, "erro"); setEtapa("revisao"); }
    finally { setProgresso(""); }
  };

  const novosFiltrados = React.useMemo(() => {
    if (!classificado) return [];
    const q = buscaNovos.trim().toUpperCase();
    return classificado.novos
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !q || c.nome.toUpperCase().includes(q) || c.placas.some((p) => p.includes(q)));
  }, [classificado, buscaNovos]);

  const porPagina = 50;
  const pageItems = novosFiltrados.slice(pagina * porPagina, (pagina + 1) * porPagina);

  const box = { border: `1.5px solid ${t.borda}`, borderRadius: 10, background: t.card, padding: 14, marginBottom: 14 };

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.txt }}>Importar agenda (Google Contacts CSV)</div>
        <button onClick={onFechar} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Fechar</button>
      </div>

      {etapa === "upload" && (
        <div>
          <div style={{ fontSize: 11.5, color: t.txt2, marginBottom: 10, lineHeight: 1.5 }}>
            Exporte os contatos do Google (Google Contacts → Exportar → formato Google CSV) e envie o arquivo aqui.
            Contatos com placa reconhecível no nome que já batem com um motorista existente (por placa ou nome) viram
            enriquecimento; os que sobrarem entram numa fila de revisão antes de criar cadastro novo.
          </div>
          <input type="file" accept=".csv" onChange={onArquivo} style={{ fontSize: 12, color: t.txt }} />
        </div>
      )}

      {etapa === "aplicando" && <div style={{ fontSize: 12, color: t.txt2 }}>{progresso || "Processando..."}</div>}

      {etapa === "revisao" && classificado && (
        <div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, fontSize: 11.5, color: t.txt2 }}>
            <span><strong style={{ color: t.txt }}>{classificado.enriquecer.length}</strong> pra enriquecer (já cadastrados)</span>
            <span><strong style={{ color: t.txt }}>{classificado.novos.length}</strong> candidatos novos</span>
            <span><strong style={{ color: t.txt }}>{classificado.semSinal.length}</strong> ignorados (sem placa reconhecível)</span>
            {classificado.conflitos.length > 0 && (
              <span title="Placa já pertence a outro motorista com nome bem diferente — provavelmente trocou de dono. Não alterado automaticamente; a placa em conflito ficou de fora do candidato novo. Resolva manualmente em Veículos se for o caso.">
                <strong style={{ color: t.warn }}>{classificado.conflitos.length}</strong> conflito(s) de placa (não alterados — ver detalhe)
              </span>
            )}
          </div>

          {classificado.enriquecer.length > 0 && (
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${t.borda}` }}>
              <button onClick={aplicarEnriquecer}
                style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none" }}>
                Aplicar enriquecimento em {classificado.enriquecer.length} motorista(s)
              </button>
              <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 6 }}>Completa telefone/status e adiciona placas de carreta que ainda não estavam no cadastro. Não sobrescreve o que já existe.</div>
            </div>
          )}

          {classificado.novos.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input value={buscaNovos} onChange={(e) => { setBuscaNovos(e.target.value); setPagina(0); }} placeholder="Filtrar candidatos por nome/placa"
                  style={{ fontSize: 12, padding: "6px 10px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, flex: "1 1 200px" }} />
                <button onClick={() => setSelecionados(new Set(classificado.novos.map((_, i) => i)))} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Marcar todos</button>
                <button onClick={() => setSelecionados(new Set())} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Desmarcar todos</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto", marginBottom: 8 }}>
                {pageItems.map(({ c, i }) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, background: t.card2, fontSize: 11.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={selecionados.has(i)} onChange={(e) => {
                      setSelecionados((s) => { const n = new Set(s); e.target.checked ? n.add(i) : n.delete(i); return n; });
                    }} />
                    <span style={{ flex: "1 1 200px", fontWeight: 600, color: t.txt }}>{c.nome}</span>
                    <span style={{ flex: "0 0 auto", color: t.txt2, fontFamily: "var(--font-mono)" }}>{c.placas.join(" · ")}</span>
                    <span style={{ flex: "0 0 auto", color: t.txt2 }}>{[c.configEixos, c.carroceria, c.capacidadeM3 && c.capacidadeM3 + "m³"].filter(Boolean).join(" ")}</span>
                    {c.statusRisco && <span style={{ flex: "0 0 auto", fontWeight: 700, color: STATUS_COR[c.statusRisco] }}>{STATUS_LABEL[c.statusRisco]}</span>}
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10.5, color: t.txt2 }}>
                  página {pagina + 1} de {Math.max(1, Math.ceil(novosFiltrados.length / porPagina))} · {selecionados.size} selecionado(s)
                  {" · "}
                  <button disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} style={{ border: "none", background: "transparent", color: pagina === 0 ? t.txt2 : t.txt, cursor: pagina === 0 ? "default" : "pointer" }}>‹ anterior</button>
                  {" "}
                  <button disabled={(pagina + 1) * porPagina >= novosFiltrados.length} onClick={() => setPagina((p) => p + 1)} style={{ border: "none", background: "transparent", color: (pagina + 1) * porPagina >= novosFiltrados.length ? t.txt2 : t.txt, cursor: (pagina + 1) * porPagina >= novosFiltrados.length ? "default" : "pointer" }}>próxima ›</button>
                </div>
                <button onClick={confirmarNovos} disabled={!selecionados.size}
                  style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, cursor: "pointer", background: t.ouro, color: "#1a1a1a", border: "none", opacity: selecionados.size ? 1 : .5 }}>
                  Importar {selecionados.size} selecionado(s)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
