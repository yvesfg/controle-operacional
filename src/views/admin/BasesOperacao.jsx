import React from "react";
import { Button } from "../../design-system/components/Button.jsx";
import Icon from "../../components/Icon.jsx";
import Toggle from "../../components/Toggle.jsx";
import { FEATURES_META, ALERTAS_OPCOES } from "../../operacao/perfil.js";
import { formDaBase, perfilDoForm } from "../../operacao/basesForm.js";
import { carregarBases, salvarBase } from "../../operacao/bases.js";
import { supaFetch } from "../../supabase.js";

// ── BasesOperacao ──
// Tela de Bases/Operações no Admin (Fase 4b). Edita a tabela `co_bases` (migration 043):
// cada base declara o que TEM (features), como CHAMA as coisas (rótulos) e como se separa
// internamente (classificador) — em vez de isso virar `if` no código.
//
// O que é gravado aqui é só o que DIVERGE do padrão embutido em operacao/perfil.js.
// Campo deixado no valor padrão não vai pro banco, pra não congelar no banco um default
// que amanhã pode mudar no código.

export default function BasesOperacao({ ctx }) {
  const { t, css, DESIGN, hIco, getConexao, sessionToken, showToast, isAdmin } = ctx;
  const [aberto, setAberto] = React.useState(false);
  const [bases, setBases] = React.useState([]);
  const [carregando, setCarregando] = React.useState(false);
  const [sel, setSel] = React.useState(null);   // id em edição ou "__nova__"
  const [form, setForm] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    const conn = getConexao();
    if (!conn) return;
    setCarregando(true);
    try {
      const r = await supaFetch(conn.url, conn.key, "POST", "rpc/listar_bases", {});
      const lista = Array.isArray(r) ? r.map((x) => (typeof x === "string" ? JSON.parse(x) : x)) : [];
      setBases(lista);
    } catch (e) {
      showToast(`Não foi possível carregar as bases: ${e.message}`, "warn");
    } finally { setCarregando(false); }
  }, [getConexao, showToast]);

  React.useEffect(() => { if (aberto && !bases.length) recarregar(); }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirEdicao = (b) => { setSel(b?.id || "__nova__"); setForm(formDaBase(b)); };

  const salvar = async () => {
    const conn = getConexao();
    if (!conn) return showToast("Sem conexão", "warn");
    const id = form.id.trim();
    if (!id) return showToast("Informe o id da base (ex.: acailandia_avb)", "warn");
    if (!/^[a-z0-9_]+$/.test(id)) return showToast("id deve ter só letras minúsculas, números e _", "warn");
    setSalvando(true);
    try {
      await salvarBase(conn, sessionToken, id, {
        label: form.label.trim() || id,
        tabela: form.tabela.trim(),
        ordem: Number(form.ordem) || 0,
        ativo: true,
        perfil: perfilDoForm(form),
      });
      // Reaplica no app inteiro sem recarregar a página.
      await carregarBases(conn);
      await recarregar();
      setSel(null); setForm(null);
      showToast("Base salva. Recarregue a página para as telas assumirem o perfil novo.", "ok");
    } catch (e) {
      showToast(`Erro ao salvar: ${e.message}`, "warn");
    } finally { setSalvando(false); }
  };

  if (!isAdmin) return null;

  const lbl = { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.2, color: t.txt2, fontWeight: 600, display: "block", marginBottom: 3 };
  const secao = { fontSize: 8, textTransform: "uppercase", letterSpacing: 2, color: t.ouro, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 2 };
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <>
      <div onClick={() => setAberto((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, color: t.txt, marginBottom: 10 }}>
        {hIco(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 17h7" /></>, t.ouro, 12)}
        Bases / Operações <span style={{ fontSize: 11, color: t.txt2, marginLeft: 4 }}>{aberto ? <Icon n="chevron-up" s={11} /> : <Icon n="chevron-down" s={11} />}</span>
        <span style={{ flex: 1, height: 1, background: t.borda }} />
      </div>

      {aberto && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <div style={{ ...css.card, padding: 12 }}>
            <div style={{ fontSize: 10, color: t.txt2, lineHeight: 1.6, marginBottom: 10 }}>
              Cada base descreve <strong style={{ color: t.txt }}>o que a operação tem</strong> — em vez de virar código.
              Cadastrar uma transportadora nova aqui não exige deploy. Só é gravado o que
              diverge do padrão, então o que ficar no valor padrão continua acompanhando o app.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Button variant="secondary" size="xs" onClick={recarregar}>
                {carregando ? <Icon n="clock" s={12} /> : <><Icon n="refresh" s={12} /> Atualizar</>}
              </Button>
              <Button variant="secondary" size="xs" onClick={() => abrirEdicao(null)} style={{ marginLeft: "auto" }}>
                + Nova base
              </Button>
            </div>

            {!carregando && !bases.length && (
              <div style={{ fontSize: 10, color: t.txt2 }}>
                Nenhuma base cadastrada no banco — o app está usando os perfis embutidos no código.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bases.map((b) => (
                <div key={b.id} onClick={() => abrirEdicao(b)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${sel === b.id ? t.ouro : t.borda}`,
                    borderRadius: DESIGN.r.sm, cursor: "pointer" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.txt }}>{b.label}</div>
                  <div style={{ fontSize: 9, color: t.txt2, fontFamily: "var(--font-mono)" }}>{b.id}</div>
                  <div style={{ marginLeft: "auto", fontSize: 9, color: t.txt2 }}>{b.tabela}</div>
                </div>
              ))}
            </div>
          </div>

          {form && (
            <div style={{ ...css.card, padding: 12, border: `1px solid ${t.ouro}55`, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.txt }}>
                {sel === "__nova__" ? "Nova base" : `Editando: ${form.label || form.id}`}
              </div>

              <div style={secao}>Identificação<span style={{ flex: 1, height: 1, background: t.borda }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lbl}>ID (interno, não muda depois)</label>
                  <input value={form.id} disabled={sel !== "__nova__"}
                    onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                    placeholder="ex: ferro_exportacao" style={{ ...css.inp, opacity: sel !== "__nova__" ? 0.6 : 1 }} />
                </div>
                <div>
                  <label style={lbl}>Nome exibido</label>
                  <input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="ex: Ferro / Exportação" style={css.inp} />
                </div>
                <div>
                  <label style={lbl}>Tabela no banco</label>
                  <input value={form.tabela} onChange={(e) => set("tabela", e.target.value)} style={css.inp} />
                </div>
                <div>
                  <label style={lbl}>Ordem na lista</label>
                  <input type="number" value={form.ordem} onChange={(e) => set("ordem", e.target.value)} style={css.inp} />
                </div>
              </div>

              <div style={secao}>Funcionalidades<span style={{ flex: 1, height: 1, background: t.borda }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {FEATURES_META.map((f) => (
                  <div key={f.k} title={f.d} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", border: `1px solid ${t.borda}`, borderRadius: DESIGN.r.sm }}>
                    <Toggle checked={!!form.features[f.k]}
                      onChange={(v) => setForm((p) => ({ ...p, features: { ...p.features, [f.k]: v } }))}
                      label={f.l} />
                  </div>
                ))}
              </div>

              <div style={secao}>Rótulos e vocabulário<span style={{ flex: 1, height: 1, background: t.borda }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lbl}>Âncora do registro</label>
                  <select value={form.ancora} onChange={(e) => set("ancora", e.target.value)} style={{ ...css.inp, appearance: "none", cursor: "pointer" }}>
                    <option value="dt">DT</option>
                    <option value="codigo">Código</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Como chamar quem paga</label>
                  <input value={form.rotuloCliente} onChange={(e) => set("rotuloCliente", e.target.value)} placeholder="Cliente / Contratante" style={css.inp} />
                </div>
                <div>
                  <label style={lbl}>Motor de alertas</label>
                  <select value={form.alertas} onChange={(e) => set("alertas", e.target.value)} style={{ ...css.inp, appearance: "none", cursor: "pointer" }}>
                    {ALERTAS_OPCOES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Origens válidas (vazio = livre)</label>
                  <input value={form.origem} onChange={(e) => set("origem", e.target.value)} placeholder="IMPERATRIZ-MA, BELEM-PA" style={css.inp} />
                </div>
              </div>

              <div style={secao}>Financeiro<span style={{ flex: 1, height: 1, background: t.borda }} /></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", border: `1px solid ${t.borda}`, borderRadius: DESIGN.r.sm }}>
                  <Toggle checked={form.complementarMargemZero} onChange={(v) => set("complementarMargemZero", v)} label="Complementar com margem zero" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", border: `1px solid ${t.borda}`, borderRadius: DESIGN.r.sm }}>
                  <Toggle checked={form.incluirComplementarPadrao} onChange={(v) => set("incluirComplementarPadrao", v)} label="Já vem marcado" />
                </div>
                <div style={{ minWidth: 150 }}>
                  <label style={lbl}>Sigla da filial nas despesas</label>
                  <input value={form.filialDespesas} onChange={(e) => set("filialDespesas", e.target.value)} placeholder="ex: AÇA" style={css.inp} />
                </div>
              </div>

              {form.features.classificadores && (
                <>
                  <div style={secao}>Classificador da operação<span style={{ flex: 1, height: 1, background: t.borda }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={lbl}>Campo no registro</label>
                      <input value={form.clfCampo} onChange={(e) => set("clfCampo", e.target.value)} style={css.inp} />
                    </div>
                    <div>
                      <label style={lbl}>Título do seletor</label>
                      <input value={form.clfLabel} onChange={(e) => set("clfLabel", e.target.value)} style={css.inp} />
                    </div>
                    <div>
                      <label style={lbl}>Valor padrão</label>
                      <input value={form.clfPadrao} onChange={(e) => set("clfPadrao", e.target.value)} placeholder="1º da lista" style={css.inp} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Opções — uma por linha, no formato valor:Rótulo</label>
                    <textarea value={form.clfValores} onChange={(e) => set("clfValores", e.target.value)} rows={4}
                      placeholder={"padrao:Padrão\nexportacao:Exportação"}
                      style={{ ...css.inp, fontFamily: "var(--font-mono)", fontSize: 11, resize: "vertical" }} />
                  </div>
                </>
              )}

              <div style={secao}>Campos extras da operação<span style={{ flex: 1, height: 1, background: t.borda }} /></div>
              <div>
                <label style={lbl}>Um por linha — coluna|Rótulo|tipo|Seção (tipo e seção opcionais)</label>
                <textarea value={form.camposExtras} onChange={(e) => set("camposExtras", e.target.value)} rows={4}
                  placeholder={"data_final|Data Final|date|Agenda\nganchos|Ganchos||Operacional"}
                  style={{ ...css.inp, fontFamily: "var(--font-mono)", fontSize: 11, resize: "vertical" }} />
                <div style={{ fontSize: 9, color: t.txt2, marginTop: 4, lineHeight: 1.5 }}>
                  Aparecem no modal de edição do registro. A coluna precisa existir na tabela da base —
                  campo sem coluna correspondente é ignorado ao salvar, sem erro.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Button variant="outline" size="xs" onClick={salvar} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar base"}
                </Button>
                <Button variant="secondary" size="xs" onClick={() => { setSel(null); setForm(null); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
