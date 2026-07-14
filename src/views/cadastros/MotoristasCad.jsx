import React from "react";
import useMotoristas from "../../hooks/useMotoristas.js";
import { parseAgendaCSV, classificarContatos, aplicarEnriquecimentoLote, confirmarNovosLote } from "../../motoristasImport.js";
import EmptyState from "../../components/EmptyState.jsx";

// Motoristas — lista/edição do cadastro (useMotoristas, mesmo hook que o resto do
// app usa) + importação da agenda de contatos (Google Contacts CSV) por cima,
// enriquecendo quem já existe (veio do Sheets, ver migration 009) e propondo os
// que sobraram como novos numa fila de revisão em lote.

const STATUS_LABEL = { bom: "Bom", vermelho: "Vermelho", bloqueado: "Bloqueado", golpe: "Golpe" };
const STATUS_COR = { bom: "var(--color-info)", vermelho: "var(--warn)", bloqueado: "var(--red, #e5484d)", golpe: "var(--red, #e5484d)" };

const VAZIO = { nome: "", cpf: "", tel: "", vinculo: "", banco: "", agencia: "", conta: "", favorecido: "", status_risco: "", observacao: "", placa1: "", placa2: "", placa3: "", placa4: "" };

export default function MotoristasCad({ ctx, conn }) {
  const { t, showToast, usuarioLogado } = ctx;
  const onErro = React.useCallback((msg) => showToast?.(msg, "erro"), [showToast]);
  const { motoristas, saveMotoristasLS, loading, recarregar } = useMotoristas(conn, { onErro });

  const [busca, setBusca] = React.useState("");
  const [form, setForm] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);
  const [importAberto, setImportAberto] = React.useState(false);

  const filtrados = React.useMemo(() => {
    const q = busca.trim().toUpperCase();
    if (!q) return motoristas;
    const qDigitos = q.replace(/[^A-Z0-9]/g, "");
    return motoristas.filter((m) =>
      (m.nome || "").toUpperCase().includes(q) ||
      (m.cpf || "").includes(q) ||
      [m.placa1, m.placa2, m.placa3, m.placa4].some((p) => (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "").includes(qDigitos))
    );
  }, [motoristas, busca]);

  const editar = (m) => setForm({ ...VAZIO, ...m });
  const novo = () => setForm({ ...VAZIO, __novo: true });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    if (!form.nome.trim()) { showToast?.("Informe o nome do motorista.", "erro"); return; }
    setSalvando(true);
    try {
      const dados = { ...form, nome: form.nome.trim() };
      const atualizado = form.__novo
        ? [...motoristas, dados]
        : motoristas.map((m) => (m.id === form.id ? { ...m, ...dados } : m));
      const r = await saveMotoristasLS(atualizado);
      // Placa que já pertencia a outro motorista foi reatribuída — avisa, senão o
      // vínculo do outro sumia em silêncio.
      (r?.reatribuidas || []).forEach(({ placa, deMotorista }) => {
        showToast?.(`Placa ${placa} estava com "${deMotorista}" e passou para "${dados.nome}".`, "warn");
      });
      showToast?.(`"${dados.nome}" ${form.__novo ? "cadastrado" : "atualizado"}.`, "ok");
      setForm(null);
    } catch (e) { showToast?.("Erro ao salvar: " + e.message, "erro"); }
    finally { setSalvando(false); }
  };

  const excluir = async (m) => {
    if (!window.confirm(`Excluir "${m.nome}"? Os veículos dele ficam sem motorista vinculado.`)) return;
    try { await saveMotoristasLS(motoristas.filter((x) => x.id !== m.id)); showToast?.("Motorista excluído.", "ok"); }
    catch (e) { showToast?.("Erro ao excluir: " + e.message, "erro"); }
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
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CPF ou placa"
          style={{ ...inp, flex: "1 1 220px", width: "auto" }} />
        <button onClick={() => setImportAberto(true)}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt, border: `1.5px solid ${t.borda}` }}>
          📥 Importar agenda (CSV)
        </button>
        <button onClick={novo}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: t.ouro, color: "#1a1a1a", border: "none" }}>
          + Novo motorista
        </button>
      </div>

      {importAberto && (
        <ImportarAgenda ctx={ctx} conn={conn} motoristas={motoristas} usuarioLogado={usuarioLogado}
          onFechar={() => setImportAberto(false)} onConcluido={() => { setImportAberto(false); recarregar(); }} />
      )}

      {form && (
        <div style={{ marginBottom: 14, border: `1.5px solid ${t.ouro}`, borderRadius: 10, background: t.card, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 10 }}>
            {form.__novo ? "Novo motorista" : `Editando: ${form.nome}`}
          </div>
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
          <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 4 }}>Placas (cavalo + carretas)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {campo("Placa 1", "placa1", { flex: "1 1 100px" })}
            {campo("Placa 2", "placa2", { flex: "1 1 100px" })}
            {campo("Placa 3", "placa3", { flex: "1 1 100px" })}
            {campo("Placa 4", "placa4", { flex: "1 1 100px" })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {campo("Vínculo", "vinculo", { flex: "1 1 140px" })}
            {campo("Banco", "banco", { flex: "1 1 160px" })}
            {campo("Agência", "agencia", { flex: "1 1 100px" })}
            {campo("Conta", "conta", { flex: "1 1 100px" })}
            {campo("Favorecido", "favorecido", { flex: "1 1 180px" })}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setForm(null)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", opacity: salvando ? .5 : 1 }}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: t.txt2, padding: 8 }}>Carregando…</div>}
      {!loading && filtrados.length === 0 && <EmptyState title="Nenhum motorista" description={busca ? "Nada bate com essa busca." : "Cadastre o primeiro motorista ou importe a agenda."} />}

      <div style={{ fontSize: 11, color: t.txt2, marginBottom: 6 }}>{filtrados.length} de {motoristas.length} motorista(s)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 560, overflowY: "auto" }}>
        {filtrados.slice(0, 200).map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 12px", borderRadius: 10, background: t.card, border: `1px solid ${t.borda}` }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nome}</div>
              <div style={{ fontSize: 10.5, color: t.txt2 }}>{[m.cpf, m.tel].filter(Boolean).join(" · ") || "—"}</div>
            </div>
            <div style={{ flex: "1 1 160px", fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>
              {[m.placa1, m.placa2, m.placa3, m.placa4].filter(Boolean).join(" · ") || "sem placa"}
            </div>
            {m.status_risco && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: STATUS_COR[m.status_risco], border: `1px solid ${STATUS_COR[m.status_risco]}` }}>
                {STATUS_LABEL[m.status_risco]}
              </span>
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
