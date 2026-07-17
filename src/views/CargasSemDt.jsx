import React from "react";
import { listarSemDt, contarSemDtPorStatus, decidirSemDt, reabrirSemDt } from "../cargasSemDt.js";

// Fila de revisão das cargas SEM DT (base Imperatriz/Belém). Ver cargasSemDt.js pro contexto.
// Renderizada acima da Planilha, só pra imperatriz_belem. Não mexe em controle_operacional:
// a conciliação (quando o DT verdadeiro chega) é automática no banco.

const num = (v) => { const n = parseFloat(String(v ?? "").replace(/\./g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };
const money = (v) => "R$ " + num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ABAS = [
  { k: "pendente", l: "Pendentes" },
  { k: "confirmado", l: "Confirmadas" },
  { k: "erro", l: "Erros" },
  { k: "conciliado", l: "Conciliadas" },
];

export default function CargasSemDt({ conn, ctx }) {
  const { t, hexRgb, showToast, usuarioLogado } = ctx;
  const [aba, setAba] = React.useState("pendente");
  const [linhas, setLinhas] = React.useState([]);
  const [contagem, setContagem] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [aberto, setAberto] = React.useState(true);
  const [agindo, setAgindo] = React.useState(null); // id em ação (spinner do botão)

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

  const decidir = async (p, status) => {
    const obs = status === "confirmado" ? "confirmada como carga real (sem DT)"
      : status === "erro" ? "marcada como erro — descartada"
      : null;
    setAgindo(p.id);
    try {
      await decidirSemDt(conn, p.id, status, obs, usuarioLogado);
      // Sai da lista atual e atualiza as contagens sem refetch completo.
      setLinhas((arr) => arr.filter((l) => l.id !== p.id));
      setContagem((c) => ({ ...c, [aba]: Math.max(0, (c[aba] || 1) - 1), [status]: (c[status] || 0) + 1 }));
      showToast?.(status === "confirmado" ? "Carga confirmada." : status === "erro" ? "Marcada como erro." : "Reaberta.", "ok");
    } catch (e) { showToast?.("Erro ao registrar decisão: " + e.message, "erro"); }
    finally { setAgindo(null); }
  };

  const reabrir = async (p) => {
    setAgindo(p.id);
    try {
      await reabrirSemDt(conn, p.id);
      setLinhas((arr) => arr.filter((l) => l.id !== p.id));
      setContagem((c) => ({ ...c, [aba]: Math.max(0, (c[aba] || 1) - 1), pendente: (c.pendente || 0) + 1 }));
      showToast?.("Devolvida para pendentes.", "ok");
    } catch (e) { showToast?.("Erro ao reabrir: " + e.message, "erro"); }
    finally { setAgindo(null); }
  };

  // Não ocupa espaço quando não há nada em nenhum status (base sem histórico de sem-DT).
  const totalGeral = Object.values(contagem).reduce((s, n) => s + n, 0);
  if (!loading && totalGeral === 0) return null;

  const btn = (label, cor, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled}
      style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 12px", borderRadius: 8, cursor: disabled ? "default" : "pointer",
        border: `1px solid ${cor}`, background: "transparent", color: cor, opacity: disabled ? 0.5 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );

  return (
    <div style={{ marginBottom: 14, border: `1.5px solid ${hexRgb(t.warn, 0.45)}`, borderRadius: 12, background: hexRgb(t.warn, 0.05), overflow: "hidden" }}>
      {/* Cabeçalho da fila */}
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
            Cargas carregadas sem DT (a Suzano às vezes carrega assim). Confirme as reais ou marque erro para descartar —
            quando o DT verdadeiro entrar na planilha, elas se conciliam sozinhas.
          </div>

          {/* Abas por status */}
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
                <div key={p.id} style={{ border: `1px solid ${hexRgb(t.borda, 0.5)}`, borderRadius: 10, background: t.card, padding: "10px 12px" }}>
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
                  </div>
                  <div style={{ fontSize: 11, color: t.txt2, marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>{[p.origem, p.destino].filter(Boolean).join(" → ") || "—"}</span>
                    {p.data_carr && <span>carreg. {p.data_carr}</span>}
                    {(p.vl_cte || p.vl_contrato) && <span>CTe {money(p.vl_cte)} · contrato {money(p.vl_contrato)}</span>}
                    {p.saldo && <span>saldo {money(p.saldo)}</span>}
                  </div>
                  {p.revisado_por && (
                    <div style={{ fontSize: 10, color: t.txt2, marginBottom: 8 }}>
                      por {p.revisado_por}{p.revisado_obs ? ` · ${p.revisado_obs}` : ""}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {aba === "pendente" && (
                      <>
                        {btn("Marcar erro", t.danger, () => decidir(p, "erro"), agindo === p.id)}
                        {btn("Confirmar carga", t.verde, () => decidir(p, "confirmado"), agindo === p.id)}
                      </>
                    )}
                    {(aba === "confirmado" || aba === "erro") && btn("Reabrir", t.txt2, () => reabrir(p), agindo === p.id)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
