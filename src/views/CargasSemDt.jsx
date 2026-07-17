import React from "react";
import useModalEsc from "../hooks/useModalEsc.js";
import { parseValorBR } from "../utils.js";
import {
  listarSemDt, contarSemDtPorStatus, decidirSemDt, reabrirSemDt, atualizarSemDt, excluirSemDt,
} from "../cargasSemDt.js";

// Fila de revisão das cargas SEM DT (base Imperatriz/Belém). Ver cargasSemDt.js pro contexto.
// Renderizada acima da Planilha, só pra imperatriz_belem. Não mexe em controle_operacional:
// a conciliação (quando o DT verdadeiro chega) é automática no banco. Cada card abre um modal
// com o registro completo pra editar/corrigir/excluir, além de confirmar ou marcar erro.

// parseValorBR (utils.js) reconhece BR ("12.341,85") E "americano" ("12341.85") — a mesma
// tabela é alimentada pelo SyncSupabase.gs, que tinha o bug de gravar número cru do Sheets
// sem reformatar (ver PlanilhaView.jsx pro detalhe completo).
const num = parseValorBR;
const money = (v) => "R$ " + num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ABAS = [
  { k: "pendente", l: "Pendentes" },
  { k: "confirmado", l: "Confirmadas" },
  { k: "erro", l: "Erros" },
  { k: "conciliado", l: "Conciliadas" },
];

// Campos editáveis no modal. Origem e tipo_carga são selects (valores controlados);
// o resto é texto livre, preservando o formato que veio da planilha.
const CAMPOS_TEXTO = [
  ["nome", "Motorista"], ["cpf", "CPF"], ["placa", "Placa"],
  ["destino", "Destino"], ["data_carr", "Data carreg."], ["data_agenda", "Data agenda"],
  ["vl_cte", "Valor CTe"], ["vl_contrato", "Valor contrato"], ["adiant", "Adiantamento"], ["saldo", "Saldo"],
];

export default function CargasSemDt({ conn, ctx }) {
  const { t, hexRgb, showToast, usuarioLogado } = ctx;
  const [aba, setAba] = React.useState("pendente");
  const [linhas, setLinhas] = React.useState([]);
  const [contagem, setContagem] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [aberto, setAberto] = React.useState(true);
  const [modal, setModal] = React.useState(null); // { ...linha } em edição
  const [salvando, setSalvando] = React.useState(false);

  useModalEsc(!!modal, () => setModal(null));

  const carregar = React.useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    try {
      const [ls, cont] = await Promise.all([listarSemDt(conn, aba), contarSemDtPorStatus(conn)]);
      setLinhas(ls);
      setContagem(cont);
    } catch (e) { showToast?.("Erro ao carregar cargas sem DT: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, [conn, aba, showToast]);

  React.useEffect(() => { carregar(); }, [carregar]);

  const pendentes = contagem.pendente || 0;

  // Move a contagem de um status pra outro sem refetch.
  const moverContagem = (de, para) => setContagem((c) => ({
    ...c, [de]: Math.max(0, (c[de] || 1) - 1), [para]: (c[para] || 0) + 1,
  }));

  const decidir = async (p, status) => {
    const obs = status === "confirmado" ? "confirmada como carga real (sem DT)"
      : status === "erro" ? "marcada como erro — descartada" : null;
    setSalvando(true);
    try {
      await decidirSemDt(conn, p.id, status, obs, usuarioLogado);
      setLinhas((arr) => arr.filter((l) => l.id !== p.id));
      moverContagem(aba, status);
      setModal(null);
      showToast?.(status === "confirmado" ? "Carga confirmada." : "Marcada como erro.", "ok");
    } catch (e) { showToast?.("Erro ao registrar decisão: " + e.message, "erro"); }
    finally { setSalvando(false); }
  };

  const reabrir = async (p) => {
    setSalvando(true);
    try {
      await reabrirSemDt(conn, p.id);
      setLinhas((arr) => arr.filter((l) => l.id !== p.id));
      moverContagem(aba, "pendente");
      setModal(null);
      showToast?.("Devolvida para pendentes.", "ok");
    } catch (e) { showToast?.("Erro ao reabrir: " + e.message, "erro"); }
    finally { setSalvando(false); }
  };

  const salvar = async (p) => {
    setSalvando(true);
    try {
      const patch = {
        nome: p.nome, cpf: p.cpf, placa: p.placa, origem: p.origem, destino: p.destino,
        data_carr: p.data_carr, data_agenda: p.data_agenda, vl_cte: p.vl_cte, vl_contrato: p.vl_contrato,
        adiant: p.adiant, saldo: p.saldo, tipo_carga: p.tipo_carga,
      };
      const atualizado = await atualizarSemDt(conn, p.id, patch);
      setLinhas((arr) => arr.map((l) => (l.id === p.id ? { ...l, ...patch, ...(atualizado || {}) } : l)));
      setModal(null);
      showToast?.("Carga atualizada.", "ok");
    } catch (e) { showToast?.("Erro ao salvar: " + e.message, "erro"); }
    finally { setSalvando(false); }
  };

  const excluir = async (p) => {
    if (!window.confirm(`Excluir definitivamente a carga de ${p.nome || "sem motorista"} (placa ${p.placa || "—"})?\n\nSe a linha ainda estiver na planilha sem DT, o próximo sync a captura de novo. Para descartar de vez, use "Marcar erro".`)) return;
    setSalvando(true);
    try {
      await excluirSemDt(conn, p.id);
      setLinhas((arr) => arr.filter((l) => l.id !== p.id));
      setContagem((c) => ({ ...c, [aba]: Math.max(0, (c[aba] || 1) - 1) }));
      setModal(null);
      showToast?.("Carga excluída.", "ok");
    } catch (e) { showToast?.("Erro ao excluir: " + e.message, "erro"); }
    finally { setSalvando(false); }
  };

  // Não ocupa espaço quando não há nada em nenhum status.
  const totalGeral = Object.values(contagem).reduce((s, n) => s + n, 0);
  if (!loading && totalGeral === 0) return null;

  const acaoBtn = (label, cor, onClick, opts = {}) => (
    <button onClick={onClick} disabled={salvando}
      style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: salvando ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        border: opts.fill ? "none" : `1px solid ${cor}`, background: opts.fill ? cor : "transparent", color: opts.fill ? "#fff" : cor, opacity: salvando ? 0.5 : 1 }}>
      {label}
    </button>
  );

  return (
    <div style={{ marginBottom: 14, border: `1.5px solid ${hexRgb(t.warn, 0.45)}`, borderRadius: 12, background: hexRgb(t.warn, 0.05), overflow: "hidden" }}>
      <div onClick={() => setAberto((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: t.txt }}>Cargas sem DT</span>
        {pendentes > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: t.warn, background: hexRgb(t.warn, 0.15), border: `1px solid ${hexRgb(t.warn, 0.35)}`, borderRadius: 20, padding: "1px 9px" }}>
            {pendentes} a revisar
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: t.txt2 }}>{aberto ? "▴" : "▾"}</span>
      </div>

      {aberto && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ fontSize: 11, color: t.txt2, marginBottom: 10, lineHeight: 1.5 }}>
            Cargas carregadas sem DT (a Suzano às vezes carrega assim). Clique numa carga para revisar, corrigir os dados,
            confirmar, marcar erro ou excluir. Quando o DT verdadeiro entrar na planilha, elas se conciliam sozinhas.
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {ABAS.map((a) => {
              const ativo = aba === a.k;
              const n = contagem[a.k] || 0;
              return (
                <button key={a.k} onClick={() => setAba(a.k)}
                  style={{ fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    border: `1px solid ${ativo ? t.ouro : t.borda}`, background: ativo ? hexRgb(t.ouro, 0.12) : "transparent", color: ativo ? t.ouro : t.txt2 }}>
                  {a.l} {n > 0 && <span style={{ opacity: 0.8 }}>({n})</span>}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ fontSize: 12, color: t.txt2, padding: "8px 0" }}>Carregando…</div>
          ) : linhas.length === 0 ? (
            <div style={{ fontSize: 12, color: t.txt2, padding: "8px 0" }}>Nada em “{ABAS.find((a) => a.k === aba)?.l}”.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {linhas.map((p) => (
                <div key={p.id} onClick={() => setModal({ ...p })} title="Clique para revisar / corrigir"
                  style={{ border: `1px solid ${hexRgb(t.borda, 0.5)}`, borderRadius: 10, background: t.card, padding: "10px 12px", cursor: "pointer", transition: "border-color .12s, background .12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = hexRgb(t.ouro, 0.5); }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = hexRgb(t.borda, 0.5); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: t.txt }}>{p.nome || "sem motorista"}</span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: t.txt2 }}>{p.placa || "sem placa"}</span>
                    {p.tipo_carga === "celulose" && (
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: t.azul, background: hexRgb(t.azul, 0.12), border: `1px solid ${hexRgb(t.azul, 0.3)}`, borderRadius: 20, padding: "1px 8px" }}>Celulose</span>
                    )}
                    {p.status === "conciliado" && p.dt_conciliado && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.verde, background: hexRgb(t.verde, 0.12), border: `1px solid ${hexRgb(t.verde, 0.3)}`, borderRadius: 20, padding: "1px 8px" }}>
                        conciliada · DT {p.dt_conciliado}
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: t.txt2 }}>›</span>
                  </div>
                  <div style={{ fontSize: 11, color: t.txt2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>{[p.origem, p.destino].filter(Boolean).join(" → ") || "—"}</span>
                    {p.data_carr && <span>carreg. {p.data_carr}</span>}
                    {(p.vl_cte || p.vl_contrato) && <span>CTe {money(p.vl_cte)} · contrato {money(p.vl_contrato)}</span>}
                    {p.saldo && <span>saldo {money(p.saldo)}</span>}
                  </div>
                  {p.revisado_por && (
                    <div style={{ fontSize: 10, color: t.txt2, marginTop: 6 }}>
                      por {p.revisado_por}{p.revisado_obs ? ` · ${p.revisado_obs}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: registro completo — editar / corrigir / confirmar / marcar erro / excluir */}
      {modal && (() => {
        const p = modal;
        const set = (k, v) => setModal((m) => ({ ...m, [k]: v }));
        const inp = { width: "100%", padding: "7px 10px", fontSize: 12.5, borderRadius: 8, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", outline: "none" };
        const lbl = { fontSize: 10.5, color: t.txt2, marginBottom: 3, display: "block" };
        return (
          <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1.5px solid ${t.borda}`, borderRadius: 16, padding: "22px 22px 18px", minWidth: 340, maxWidth: 600, width: "92vw", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: t.txt }}>Carga sem DT</span>
                {p.tipo_carga === "celulose" && (
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: t.azul, background: hexRgb(t.azul, 0.12), border: `1px solid ${hexRgb(t.azul, 0.3)}`, borderRadius: 20, padding: "1px 8px" }}>Celulose</span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 10.5, color: t.txt2, textTransform: "capitalize" }}>{p.status}</span>
              </div>
              <div style={{ fontSize: 11, color: t.txt2, marginBottom: 14 }}>Corrija o que veio errado da planilha antes de confirmar. Origem e tipo de carga são controlados.</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>Motorista</label>
                  <input value={p.nome || ""} onChange={(e) => set("nome", e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Origem</label>
                  <select value={p.origem || ""} onChange={(e) => set("origem", e.target.value)} style={inp}>
                    <option value="IMPERATRIZ-MA">IMPERATRIZ-MA</option>
                    <option value="BELEM-PA">BELEM-PA</option>
                    {p.origem && !["IMPERATRIZ-MA", "BELEM-PA"].includes(p.origem) && <option value={p.origem}>{p.origem}</option>}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tipo de carga</label>
                  <select value={p.tipo_carga || "papel"} onChange={(e) => set("tipo_carga", e.target.value)} style={inp}>
                    <option value="papel">Papel</option>
                    <option value="celulose">Celulose</option>
                  </select>
                </div>
                {CAMPOS_TEXTO.filter(([k]) => k !== "nome").map(([k, label]) => (
                  <div key={k}>
                    <label style={lbl}>{label}</label>
                    <input value={p[k] || ""} onChange={(e) => set(k, e.target.value)} style={inp} />
                  </div>
                ))}
              </div>

              {p.revisado_por && (
                <div style={{ fontSize: 10.5, color: t.txt2, marginBottom: 12 }}>Última revisão por {p.revisado_por}{p.revisado_obs ? ` · ${p.revisado_obs}` : ""}</div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {acaoBtn("Excluir", t.danger, () => excluir(p))}
                <span style={{ flex: 1 }} />
                {acaoBtn("Fechar", t.txt2, () => setModal(null))}
                {acaoBtn("Salvar correções", t.ouro, () => salvar(p))}
                {(p.status === "confirmado" || p.status === "erro") && acaoBtn("Reabrir", t.txt2, () => reabrir(p))}
                {p.status !== "erro" && acaoBtn("Marcar erro", t.danger, () => decidir(p, "erro"))}
                {p.status !== "confirmado" && acaoBtn("Confirmar carga", t.verde, () => decidir(p, "confirmado"), { fill: true })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
