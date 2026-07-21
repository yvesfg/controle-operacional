import React from "react";
import useEmbarcadoras from "../../hooks/useEmbarcadoras.js";
import { formatCNPJ, soDigitosCNPJ } from "../../embarcadoras.js";
import { consultarCNPJ, nomeSugerido } from "../../receitaCnpj.js";
import Toggle from "../../components/Toggle.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { BASES } from "../../constants.js";

// Cadastro de embarcadoras — lista + edição da tabela `embarcadoras`.
// Antes só dava pra cadastrar durante a importação da Conferência de Faturamento
// (CNPJ desconhecido); aqui dá pra revisar, corrigir e desativar sem mexer em SQL.
//
// frete_cod / desc_local_cod / diaria_cod são os códigos da coluna "Empresa" da
// planilha do TMS — só a Conferência usa. Ficam num bloco à parte no formulário
// justamente porque não fazem sentido pras outras telas.

const VAZIO = {
  cnpj: "", nome: "", razao_social: "", cidade: "", uf: "", base_id: "",
  frete_cod: "", desc_local_cod: "", diaria_cod: "", ativo: true,
};

export default function EmbarcadorasCad({ ctx, conn }) {
  const { t, showToast, usuarioLogado, isMobile } = ctx;

  const onErro = React.useCallback((msg) => showToast?.(msg, "erro"), [showToast]);
  // incluirInativas: esta é a única tela que precisa ver (e reativar) as desligadas.
  const { lista, loading, criar, atualizar, setAtivo } = useEmbarcadoras(conn, { incluirInativas: true, onErro });

  const [busca, setBusca] = React.useState("");
  const [form, setForm] = React.useState(null);   // null = form fechado; {...} = editando/criando
  const [salvando, setSalvando] = React.useState(false);

  const [cnpjBusca, setCnpjBusca] = React.useState({ estado: "idle", msg: "" }); // idle | buscando | ok | erro

  const novo = () => { setCnpjBusca({ estado: "idle", msg: "" }); setForm({ ...VAZIO, __novo: true }); };
  const editar = (e) => { setCnpjBusca({ estado: "idle", msg: "" }); setForm({ ...VAZIO, ...e, base_id: e.base_id || "", __novo: false }); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Consulta os dados oficiais assim que os 14 dígitos do CNPJ estão completos (só em
  // cadastro NOVO — na edição o CNPJ é imutável). Como o CNPJ é o primeiro campo do
  // formulário, os demais ainda estão vazios; ainda assim o "nome" só é sugerido se
  // estiver em branco, porque o apelido curto usado nas telas é escolha humana.
  // Debounce de 400ms + abort: evita disparar a cada tecla digitada.
  React.useEffect(() => {
    if (!form?.__novo) return;
    const digitos = soDigitosCNPJ(form.cnpj);
    if (String(form.cnpj || "").replace(/\D/g, "").length !== 14) { setCnpjBusca({ estado: "idle", msg: "" }); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setCnpjBusca({ estado: "buscando", msg: "" });
      try {
        const d = await consultarCNPJ(digitos, { signal: ctrl.signal });
        setForm((f) => (f && soDigitosCNPJ(f.cnpj) === digitos ? {
          ...f,
          razao_social: d.razao_social || f.razao_social,
          cidade: d.cidade || f.cidade,
          uf: d.uf || f.uf,
          nome: f.nome?.trim() ? f.nome : nomeSugerido(d),
        } : f));
        setCnpjBusca({ estado: "ok", msg: `${d.fonte} · situação: ${d.situacao || "não informada"}` });
      } catch (e) {
        if (e.name === "AbortError") return;
        setCnpjBusca({ estado: "erro", msg: e.message });
      }
    }, 400);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [form?.cnpj, form?.__novo]);

  const filtradas = React.useMemo(() => {
    // Regras de devolução (tipo='devolucao') moram na mesma tabela, mas são roteamento
    // FOB da Conferência — não são embarcadoras/clientes, então não aparecem neste cadastro.
    const base = lista.filter((e) => e.tipo !== "devolucao");
    const q = busca.trim().toLowerCase();
    if (!q) return base;
    const qd = q.replace(/\D/g, "");
    return base.filter((e) =>
      e.nome?.toLowerCase().includes(q) ||
      e.razao_social?.toLowerCase().includes(q) ||
      e.cidade?.toLowerCase().includes(q) ||
      (qd && e.cnpj.includes(qd))
    );
  }, [lista, busca]);

  const salvar = async () => {
    const cnpj = soDigitosCNPJ(form.cnpj);
    if (form.__novo && cnpj.replace(/0/g, "") === "") { showToast?.("Informe o CNPJ.", "erro"); return; }
    if (!form.nome.trim()) { showToast?.("Informe o nome da embarcadora.", "erro"); return; }
    if (!form.frete_cod.trim()) { showToast?.('O código de Empresa do Frete é obrigatório — é o que classifica as linhas da planilha do TMS.', "erro"); return; }
    const dados = {
      nome: form.nome.trim(),
      razao_social: form.razao_social?.trim() || null,
      cidade: form.cidade?.trim() || null,
      uf: form.uf?.trim().toUpperCase() || null,
      base_id: form.base_id || null,
      frete_cod: form.frete_cod.trim().toUpperCase(),
      desc_local_cod: form.desc_local_cod?.trim().toUpperCase() || null,
      diaria_cod: form.diaria_cod?.trim().toUpperCase() || null,
      ativo: !!form.ativo,
    };
    setSalvando(true);
    try {
      if (form.__novo) await criar({ ...dados, cnpj, criado_por: usuarioLogado || null });
      else await atualizar(form.cnpj, dados);
      showToast?.(`"${dados.nome}" ${form.__novo ? "cadastrada" : "atualizada"}.`, "ok");
      setForm(null);
    } catch (e) {
      // 23505 = PK duplicada: o CNPJ já está cadastrado (talvez inativo).
      const dup = /duplicate key|23505/i.test(e.message);
      showToast?.(dup ? "Esse CNPJ já está cadastrado — procure na lista (pode estar inativo)." : "Erro ao salvar: " + e.message, "erro");
    } finally { setSalvando(false); }
  };

  const inp = { fontSize: 12.5, padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", width: "100%" };
  const lbl = { fontSize: 10.5, color: t.txt2, marginBottom: 3, display: "block" };
  const campo = (label, k, extra = {}) => (
    <div style={{ flex: extra.flex || "1 1 160px" }}>
      <label style={lbl}>{label}</label>
      <input value={form[k] ?? ""} placeholder={extra.placeholder}
        maxLength={extra.maxLength}
        onChange={(ev) => set(k, extra.upper ? ev.target.value.toUpperCase() : ev.target.value)}
        disabled={extra.disabled}
        style={{ ...inp, ...(extra.disabled ? { opacity: .6, cursor: "not-allowed" } : {}) }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CNPJ ou cidade"
          style={{ ...inp, flex: "1 1 220px", width: "auto" }} />
        <button onClick={novo}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer", background: t.ouro, color: "#1a1a1a", border: "none" }}>
          + Nova embarcadora
        </button>
      </div>

      {form && (
        <div style={{ marginBottom: 14, border: `1.5px solid ${t.ouro}`, borderRadius: 10, background: t.card, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, marginBottom: 10 }}>
            {form.__novo ? "Nova embarcadora" : `Editando: ${form.nome}`}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {/* CNPJ é a PK e o vínculo com o histórico já importado (frete_conferencia.cnpj_remetente):
                não dá pra trocar depois — pra corrigir, desativa esta e cadastra outra. */}
            {campo("CNPJ", "cnpj", { flex: "1 1 170px", placeholder: "só números", disabled: !form.__novo })}
            {campo("Nome (exibição)", "nome", { flex: "1 1 200px", placeholder: "Suzano Imperatriz" })}
            {campo("Razão social", "razao_social", { flex: "1 1 220px", placeholder: "opcional" })}
          </div>

          {form.__novo && cnpjBusca.estado !== "idle" && (
            <div style={{ fontSize: 10.5, marginTop: -4, marginBottom: 10, color: cnpjBusca.estado === "erro" ? t.warn : t.txt2 }}>
              {cnpjBusca.estado === "buscando" ? "Consultando os dados oficiais do CNPJ…"
                : cnpjBusca.estado === "ok" ? `Preenchido com os dados oficiais (${cnpjBusca.msg}). Ajuste o que quiser.`
                : `${cnpjBusca.msg} Preencha na mão.`}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {campo("Cidade de origem", "cidade", { flex: "1 1 180px" })}
            {campo("UF", "uf", { flex: "0 0 70px", maxLength: 2, upper: true })}
            <div style={{ flex: "1 1 180px" }}>
              <label style={lbl}>Base vinculada</label>
              <select value={form.base_id} onChange={(e) => set("base_id", e.target.value)} style={inp}>
                <option value="">Sem base vinculada</option>
                {Object.values(BASES).map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>
            <div style={{ flex: "0 0 auto", alignSelf: "flex-end", paddingBottom: 6 }}>
              <Toggle checked={!!form.ativo} onChange={(v) => set("ativo", v)} label="Ativa" />
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 6, marginTop: 4 }}>
            Códigos da coluna "Empresa" na planilha do TMS — usados só pela Conferência de Faturamento.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {campo("Frete (obrigatório)", "frete_cod", { flex: "1 1 120px", placeholder: "MAT", upper: true })}
            {campo("Descarga/Local", "desc_local_cod", { flex: "1 1 120px", placeholder: "MAM", upper: true })}
            {campo("Diária", "diaria_cod", { flex: "1 1 120px", placeholder: "D01", upper: true })}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={() => setForm(null)}
              style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando}
              style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", opacity: salvando ? .5 : 1 }}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: t.txt2, padding: 8 }}>Carregando…</div>}

      {!loading && filtradas.length === 0 && (
        <EmptyState title="Nenhuma embarcadora" description={busca ? "Nada bate com essa busca." : "Cadastre a primeira embarcadora."} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtradas.map((e) => (
          <div key={e.cnpj}
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              padding: "10px 12px", borderRadius: 10, background: t.card, border: `1px solid ${t.borda}`, opacity: e.ativo ? 1 : .55 }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.nome} {!e.ativo && <span style={{ fontSize: 10, fontWeight: 600, color: t.txt2 }}>· inativa</span>}
              </div>
              <div style={{ fontSize: 11, color: t.txt2, fontFamily: "var(--font-mono)" }}>{formatCNPJ(e.cnpj)}</div>
            </div>
            <div style={{ flex: "1 1 140px", fontSize: 11.5, color: t.txt2 }}>
              {[e.cidade, e.uf].filter(Boolean).join(" / ") || "—"}
              <div style={{ fontSize: 10.5 }}>{BASES[e.base_id]?.label || "sem base"}</div>
            </div>
            {!isMobile && (
              <div style={{ flex: "0 0 auto", fontSize: 10.5, color: t.txt2, fontFamily: "var(--font-mono)" }}>
                {[e.frete_cod, e.desc_local_cod, e.diaria_cod].filter(Boolean).join(" · ")}
              </div>
            )}
            <Toggle checked={!!e.ativo} onChange={(v) => setAtivo(e.cnpj, v).catch((err) => onErro("Erro: " + err.message))} />
            <button onClick={() => editar(e)}
              style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt, border: `1px solid ${t.borda}` }}>
              Editar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
