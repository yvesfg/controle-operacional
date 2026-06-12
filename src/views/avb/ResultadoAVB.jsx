import React from "react";
import ModalDespesa from "../../modals/ModalDespesa.jsx";
import {
  parseDespesasXLSX, diffImport, inserirImportadas, listarDespesas,
  inserirManual, atualizarDespesa, deletarDespesa,
  listarIndevidasPendentes, vincularCredito,
} from "../../despesas.js";

// ResultadoAVB — confronta a margem operacional (Σ vl_cte − Σ vl_contrato) com as
// despesas mensais persistidas (tabela despesas_filial). Aba por base, gated por canFin.
// Bases atendidas: acailandia_avb e imperatriz_belem.

const BASES_OK = ["acailandia_avb", "imperatriz_belem"];

// parsers numéricos espelhando o App: vl_cte/vl_cte_comp já vêm decimais; vl_contrato pode vir pt-BR.
const nCte = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const nContrato = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).replace(/[R$\s]/g, "");
  // pt-BR (tem vírgula): ponto=milhar, vírgula=decimal. Sem vírgula: já é decimal — NÃO remove pontos.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const mesDe = (s) => { if (!s) return null; const p = String(s).split("/"); return p.length >= 3 ? `${p[2]}-${p[1].padStart(2, "0")}` : null; };
const money = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mesLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${mo}/${y}`; };

export default function ResultadoAVB({ ctx }) {
  const { activeTab, baseAtual, DADOS, getConexao, t, isMobile, showToast, canFin } = ctx;
  if (activeTab !== "resultado") return null;
  const baseId = baseAtual?.id;
  if (!BASES_OK.includes(baseId)) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Resultado disponível apenas para Açailândia (AVB) e Imperatriz/Belém.</div>;
  }
  if (canFin === false) {
    return <div style={{ padding: 24, color: t.txt2, fontSize: 13 }}>Sem permissão financeira para visualizar o Resultado.</div>;
  }

  // Meses disponíveis a partir dos dados operacionais
  const mesesDisp = React.useMemo(() => {
    const s = new Set();
    (DADOS || []).forEach((r) => { const m = mesDe(r.data_carr); if (m) s.add(m); });
    return [...s].sort().reverse();
  }, [DADOS]);

  const [mesRef, setMesRef] = React.useState("");
  React.useEffect(() => { if (!mesRef && mesesDisp.length) setMesRef(mesesDisp[0]); }, [mesesDisp, mesRef]);

  // Complementar: default ON para Suzano (imperatriz_belem), OFF para AVB
  const [incluirComp, setIncluirComp] = React.useState(baseId === "imperatriz_belem");
  React.useEffect(() => { setIncluirComp(baseId === "imperatriz_belem"); }, [baseId]);

  const [despesas, setDespesas] = React.useState([]);
  const [indevidas, setIndevidas] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [modal, setModal] = React.useState({ open: false, inicial: null });
  const fileRef = React.useRef(null);

  // getConexao() devolve um objeto NOVO a cada chamada; memoiza p/ não recriar `carregar`
  // a cada render (senão o useEffect re-dispara em loop → "Carregando..." piscando).
  const conn = React.useMemo(() => (getConexao ? getConexao() : null), [getConexao]);

  const carregar = React.useCallback(async () => {
    if (!conn || !baseId || !mesRef) return;
    setLoading(true);
    try {
      const [d, ind] = await Promise.all([
        listarDespesas(conn, baseId, mesRef),
        listarIndevidasPendentes(conn, baseId),
      ]);
      setDespesas(d); setIndevidas(ind);
    }
    catch (e) { showToast?.("Erro ao carregar despesas: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, [conn, baseId, mesRef, showToast]);

  React.useEffect(() => { carregar(); }, [carregar]);

  // ── Receita / custo / margem (exclui PENDENTE) ──
  const fin = React.useMemo(() => {
    const regs = (DADOS || []).filter((r) => mesDe(r.data_carr) === mesRef && (r.status || "").toUpperCase() !== "PENDENTE");
    let receita = 0, custo = 0, comp = 0;
    regs.forEach((r) => { receita += nCte(r.vl_cte); custo += nContrato(r.vl_contrato); comp += nCte(r.vl_cte_comp); });
    if (incluirComp) {
      if (baseId === "acailandia_avb") { receita += comp; custo += comp; } // margem zero (repasse)
      else { receita += comp; } // Suzano: margem cheia
    }
    const margem = receita - custo;
    return { receita, custo, comp, margem, n: regs.length };
  }, [DADOS, mesRef, incluirComp, baseId]);

  const creditos = despesas.filter((d) => d.tipo === "credito");
  const debitos = despesas.filter((d) => d.tipo !== "credito");
  const despDebInc = debitos.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0);
  const credInc = creditos.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0); // negativo
  const despLiq = despDebInc + credInc;
  const resultado = fin.margem - despLiq;
  const pct = (v) => (fin.receita ? (v / fin.receita * 100) : 0).toFixed(1) + "%";

  // ── Ações ──
  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !conn || !mesRef) return;
    setImporting(true);
    try {
      const linhas = await parseDespesasXLSX(file);
      const porBase = {};
      linhas.forEach((l) => { (porBase[l.base_id] = porBase[l.base_id] || []).push(l); });
      // Diff por base: descobre só as linhas novas, preservando as existentes (e flags)
      let novasTodas = [], jaTotal = 0, existiaAlgum = false;
      const resumo = [];
      for (const b of Object.keys(porBase)) {
        const { novas, jaExistem, existentesTotal } = await diffImport(conn, b, mesRef, porBase[b]);
        novasTodas = novasTodas.concat(novas); jaTotal += jaExistem;
        if (existentesTotal > 0) existiaAlgum = true;
        resumo.push(`${b === "acailandia_avb" ? "AVB" : "IMP/BEL"}: ${novas.length} novas`);
      }
      if (existiaAlgum) {
        const msg = `Mês ${mesLabel(mesRef)} já tem despesas importadas.\n\n`
          + `Novas linhas: ${novasTodas.length} (${resumo.join(" · ")})\n`
          + `Já existentes (mantidas com flags): ${jaTotal}\n\n`
          + `Adicionar só as novas e preservar as existentes?`;
        if (!window.confirm(msg)) { showToast?.("Importação cancelada.", "erro"); return; }
      }
      if (novasTodas.length === 0) { showToast?.("Nenhuma novidade — tudo já estava importado.", "ok"); return; }
      await inserirImportadas(conn, mesRef, novasTodas);
      showToast?.(`${novasTodas.length} novas despesas adicionadas (${mesLabel(mesRef)}).`, "ok");
      await carregar();
    } catch (err) { showToast?.("Erro na importação: " + err.message, "erro"); }
    finally { setImporting(false); }
  };

  const salvar = async (dados) => {
    try {
      if (modal.inicial?.id) await atualizarDespesa(conn, modal.inicial.id, dados);
      else await inserirManual(conn, { ...dados, base_id: baseId, mes_ref: mesRef });
      setModal({ open: false, inicial: null });
      await carregar();
    } catch (e) { showToast?.("Erro ao salvar: " + e.message, "erro"); }
  };
  const excluir = async (id) => {
    try { await deletarDespesa(conn, id); setModal({ open: false, inicial: null }); await carregar(); }
    catch (e) { showToast?.("Erro ao excluir: " + e.message, "erro"); }
  };
  const toggleIncluir = async (d) => {
    try {
      setDespesas((arr) => arr.map((x) => x.id === d.id ? { ...x, incluir: !x.incluir } : x));
      await atualizarDespesa(conn, d.id, { incluir: !d.incluir });
    } catch (e) { showToast?.("Erro: " + e.message, "erro"); carregar(); }
  };
  const vincular = async (indId, credId) => {
    try { await vincularCredito(conn, indId, credId); showToast?.("Crédito vinculado à indevida.", "ok"); await carregar(); }
    catch (e) { showToast?.("Erro ao vincular: " + e.message, "erro"); }
  };

  // Agrupa despesas por grupo p/ exibição
  const porGrupo = {};
  despesas.forEach((d) => { (porGrupo[d.grupo || "—"] = porGrupo[d.grupo || "—"] || []).push(d); });

  const card = { background: t.card, borderRadius: 12, border: `1px solid ${t.borda}`, padding: isMobile ? 14 : 18 };
  const kpi = (l, v, sub, cor) => (
    <div style={{ ...card, padding: isMobile ? "12px 10px" : "14px 16px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text3)", marginBottom: 5 }}>{l}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: isMobile ? 17 : 21, fontWeight: 800, letterSpacing: "-0.03em", color: cor || t.txt, lineHeight: 1 }}>{v}</div>
      {sub && <div style={{ fontSize: 10, color: t.txt2, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 12 : "20px 24px" }}>
      {/* Controles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <select value={mesRef} onChange={(e) => setMesRef(e.target.value)}
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt }}>
          {mesesDisp.length === 0 && <option value="">— sem dados —</option>}
          {mesesDisp.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: t.txt, cursor: "pointer",
          padding: "8px 11px", border: `1px solid ${t.borda}`, borderRadius: 8 }}>
          <input type="checkbox" checked={incluirComp} onChange={(e) => setIncluirComp(e.target.checked)} />
          Incluir complementar {baseId === "acailandia_avb" ? "(margem zero)" : "(margem cheia)"}
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods" onChange={onImport} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={importing || !mesRef}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid var(--accent)`, background: "transparent", color: "var(--accent)", opacity: importing ? .6 : 1 }}>
            {importing ? "Importando..." : "⬆ Importar planilha"}
          </button>
          <button onClick={() => setModal({ open: true, inicial: null })}
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              border: "none", background: "var(--accent)", color: "#fff" }}>+ Despesa</button>
        </div>
      </div>

      {/* KPIs do resultado */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        {kpi("Faturamento (CTE)", money(fin.receita), `${fin.n} viagens`, t.verde)}
        {kpi("Pago motorista", money(fin.custo), "vl. contrato", t.txt)}
        {kpi("Margem bruta", money(fin.margem), pct(fin.margem), t.ouro)}
        {kpi("Despesas (débito)", money(despDebInc), "incluídas", t.danger)}
        {kpi("Créditos", money(Math.abs(credInc)), "abatem despesa", t.verde)}
        {kpi("Resultado", money(resultado), pct(resultado), resultado >= 0 ? t.verde : t.danger)}
      </div>

      {/* Conciliação de indevidas → crédito */}
      {indevidas.length > 0 && (
        <div style={{ ...card, marginBottom: 16, border: `1px solid ${t.danger}55` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.txt, marginBottom: 3 }}>Indevidas aguardando crédito ({indevidas.length})</div>
          <div style={{ fontSize: 11, color: t.txt2, marginBottom: 10 }}>
            Despesas marcadas como indevidas que ainda não voltaram como crédito. Sugestões por valor entre os créditos de {mesLabel(mesRef)}.
          </div>
          {indevidas.map((ind) => {
            const cand = creditos.find((c) => Math.abs(Number(c.valor)) === Math.abs(Number(ind.valor)));
            return (
              <div key={ind.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: `1px solid ${t.borda}55` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ind.natureza || ind.historico || "—"}</div>
                  <div style={{ fontSize: 10, color: t.txt2 }}>{mesLabel(ind.mes_ref)} · {money(Number(ind.valor || 0))}</div>
                </div>
                {cand ? (
                  <button onClick={() => vincular(ind.id, cand.id)}
                    style={{ fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 7, cursor: "pointer", border: "none", background: t.verde, color: "#fff", whiteSpace: "nowrap" }}>
                    ✓ Vincular crédito {money(Math.abs(Number(cand.valor || 0)))}
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: t.txt2, whiteSpace: "nowrap" }}>sem crédito igual neste mês</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de despesas */}
      <div style={{ ...card }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Despesas · {mesLabel(mesRef)}</div>
          <div style={{ fontSize: 11, color: t.txt2, fontFamily: "var(--font-mono)" }}>{despesas.length} lançamentos</div>
        </div>

        {loading && <div style={{ color: t.txt2, fontSize: 13, padding: 16, textAlign: "center" }}>Carregando...</div>}
        {!loading && despesas.length === 0 && (
          <div style={{ color: t.txt2, fontSize: 13, padding: 24, textAlign: "center" }}>
            Nenhuma despesa neste mês. Importe a planilha ou adicione manualmente.
          </div>
        )}

        {!loading && Object.keys(porGrupo).map((g) => {
          const linhas = porGrupo[g];
          const subt = linhas.filter((d) => d.incluir).reduce((s, d) => s + Number(d.valor || 0), 0);
          return (
            <div key={g} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700,
                color: t.txt2, textTransform: "uppercase", letterSpacing: "0.04em", padding: "6px 0", borderBottom: `1px solid ${t.borda}` }}>
                <span>{g}</span><span>{money(subt)}</span>
              </div>
              {linhas.map((d) => (
                <div key={d.id} onClick={() => setModal({ open: true, inicial: d })}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: `1px solid ${t.borda}55`,
                    cursor: "pointer", opacity: d.incluir ? 1 : .45 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.natureza || d.historico || "—"}
                      {d.origem === "manual" && <span style={{ marginLeft: 6, fontSize: 9, color: "#a855f7", fontWeight: 700 }}>MANUAL</span>}
                      {d.tipo === "credito" && <span style={{ marginLeft: 6, fontSize: 9, color: t.verde, fontWeight: 700 }}>CRÉDITO</span>}
                      {d.indevida && <span style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>{d.credito_match_id ? "✓ RECUPERADA" : "INDEVIDA"}</span>}
                      {d.dup_flag && <span style={{ marginLeft: 6, fontSize: 9, color: t.danger, fontWeight: 700 }}>DUPLICIDADE?</span>}
                    </div>
                    {d.historico && d.natureza && (
                      <div style={{ fontSize: 10, color: t.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.historico}</div>
                    )}
                  </div>
                  {/* Toggle incluir só nas linhas marcadas como duplicidade */}
                  {d.dup_flag && (
                    <label onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.txt2 }}>
                      <input type="checkbox" checked={d.incluir} onChange={() => toggleIncluir(d)} /> incl.
                    </label>
                  )}
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: d.tipo === "credito" ? t.verde : t.txt, whiteSpace: "nowrap" }}>{money(Number(d.valor || 0))}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <ModalDespesa open={modal.open} inicial={modal.inicial} t={t} isMobile={isMobile}
        onClose={() => setModal({ open: false, inicial: null })} onSave={salvar} onDelete={excluir} />
    </div>
  );
}
