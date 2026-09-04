import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import Toggle from "../components/Toggle.jsx";
import ModalHeader from "../components/ModalHeader.jsx";

// ModalDespesa — criar/editar uma única despesa (CRUD da planilha de débitos).
// Props: { open, onClose, onSave, onDelete, inicial, t, isMobile }
// `inicial` = null → nova despesa manual; objeto → edição.

const GRUPOS = ["ENCARGOS", "DESPESAS C/ PESSOAL", "DESPESAS FIXAS", "DESPESAS VARIAVEIS"];

export default function ModalDespesa({ open, onClose, onSave, onDelete, inicial, t, isMobile, usuarioLogado }) {
  const ehEdicao = !!(inicial && inicial.id);
  const [form, setForm] = React.useState({
    grupo: "DESPESAS VARIAVEIS", dt_mov: "", valor: "", natureza: "", conta: "", historico: "",
    incluir: true, indevida: false, classe_credito: "estorno",
    em_revisao: false, revisao_obs: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      grupo: inicial?.grupo || "DESPESAS VARIAVEIS",
      dt_mov: inicial?.dt_mov || "",
      valor: inicial?.valor != null ? String(inicial.valor) : "",
      natureza: inicial?.natureza || "",
      conta: inicial?.conta || "",
      historico: inicial?.historico || "",
      incluir: inicial?.incluir !== false,
      indevida: inicial?.indevida === true,
      // Crédito gravado antes da migration 050 não tem classe: vale estorno, que era o
      // comportamento da época.
      classe_credito: inicial?.classe_credito || "estorno",
      em_revisao: inicial?.em_revisao === true,
      revisao_obs: inicial?.revisao_obs || "",
    });
  }, [open, inicial]);

  // Despesa "indevida" só faz sentido para débitos (valor positivo)
  const ehDebito = parseFloat(String(form.valor).replace(/[R$\s]/g, "").replace(",", ".")) >= 0;

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = () => {
    const valorNum = parseFloat(String(form.valor).replace(/[R$\s]/g, "").replace(",", "."));
    // Valor negativo é crédito e sempre foi previsto aqui (o `tipo` abaixo já trata),
    // mas a validação barrava tudo <= 0 — na prática nenhum crédito podia ser editado.
    if (isNaN(valorNum) || valorNum === 0) { alert("Informe um valor válido."); return; }
    onSave({
      grupo: form.grupo,
      dt_mov: form.dt_mov || null,
      valor: Math.round((valorNum + Number.EPSILON) * 100) / 100,
      natureza: form.natureza.trim() || null,
      conta: form.conta.trim() || null,
      historico: form.historico.trim() || null,
      tipo: valorNum < 0 ? "credito" : "debito",
      incluir: form.incluir,
      indevida: valorNum >= 0 ? form.indevida : false,
      classe_credito: valorNum < 0 ? form.classe_credito : null,
      // Marcar indevida É a decisão, então encerra a revisão (ver toggle abaixo).
      em_revisao: form.em_revisao,
      revisao_obs: form.em_revisao ? (form.revisao_obs.trim() || null) : null,
      revisao_em: form.em_revisao ? (inicial?.revisao_em || new Date().toISOString()) : null,
      revisao_por: form.em_revisao ? (inicial?.revisao_por || usuarioLogado || null) : null,
    });
  };

  const lbl = { fontSize: 11, fontWeight: 600, color: t.txt2, marginBottom: 4, display: "block" };
  const inp = {
    width: "100%", fontSize: 13, padding: "9px 11px", borderRadius: 8,
    border: `1.5px solid ${t.borda}`, background: t.card, color: t.txt,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.borda}`,
          width: isMobile ? "100%" : 460, maxWidth: "100%", maxHeight: "90vh", overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        <ModalHeader tom="accent" icone="receipt"
          titulo={ehEdicao ? "EDITAR DESPESA" : "NOVA DESPESA"}
          onFechar={onClose} />

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={lbl}>Grupo</label>
            <select value={form.grupo} onChange={(e) => set("grupo", e.target.value)} style={inp}>
              {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Data</label>
              <input type="date" value={form.dt_mov || ""} onChange={(e) => set("dt_mov", e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Valor (R$)</label>
              <input type="text" inputMode="decimal" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Natureza</label>
            <input type="text" value={form.natureza} onChange={(e) => set("natureza", e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Conta bancária</label>
            <input type="text" value={form.conta} onChange={(e) => set("conta", e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Histórico</label>
            <textarea value={form.historico} onChange={(e) => set("historico", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
          </div>
          <div style={{ fontSize: 13, color: t.txt }}>
            <Toggle checked={form.incluir} onChange={(v) => set("incluir", v)} label="Incluir no cálculo do resultado" />
          </div>
          {ehDebito ? (
            <div style={{ fontSize: 13, color: t.danger }}>
              <Toggle checked={form.indevida} color={t.danger}
                // Marcar indevida É a decisão: encerra a revisão junto.
                onChange={(v) => setForm((f) => ({ ...f, indevida: v, incluir: v ? false : f.incluir, em_revisao: v ? false : f.em_revisao }))}
                label="Despesa indevida — aguardar crédito no mês seguinte" />
            </div>
          ) : (
            // Crédito: estorno abate a despesa; receita fica fora do cálculo (ver migration 050).
            // Vem classificado pela natureza no import — aqui é a correção manual.
            <div>
              <label style={lbl}>Este crédito é</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["estorno", "Estorno de despesa", "Dinheiro que volta de uma despesa paga — abate a despesa do mês.", t.verde],
                  ["receita", "Receita", "Entra por outra via (sinistro, venda, CTe) — fica fora do cálculo de despesa.", t.azul],
                ].map(([v, titulo, ajuda, cor]) => {
                  const ativo = form.classe_credito === v;
                  return (
                    <Button variant="secondary" size="sm" key={v} onClick={() => set("classe_credito", v)} title={ajuda} style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: ativo ? cor : t.txt }}>{titulo}</div>
                      <div style={{ fontSize: 10, color: t.txt2, marginTop: 2, lineHeight: 1.35 }}>{ajuda}</div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estado intermediário (migration 060): "achei estranho, decido depois". Não muda
              o cálculo — a despesa segue como está — mas fica marcada na lista e some quando
              alguém decide (correta ou indevida). */}
          <div style={{ borderTop: `1px solid ${t.borda}`, paddingTop: 12, fontSize: 13, color: t.ouro }}>
            <Toggle checked={form.em_revisao} color={t.ouro}
              onChange={(v) => setForm((f) => ({ ...f, em_revisao: v, revisao_obs: v ? f.revisao_obs : "" }))}
              label="Em revisão — conferir antes de decidir" />
            {form.em_revisao && (
              <>
                <input type="text" value={form.revisao_obs} onChange={(e) => set("revisao_obs", e.target.value)}
                  placeholder="O que precisa ser conferido? (ex.: parece duplicada, confirmar com o financeiro)"
                  style={{ ...inp, marginTop: 8 }} />
                <div style={{ fontSize: 10.5, color: t.txt2, marginTop: 6, lineHeight: 1.45 }}>
                  Não altera o resultado do mês: a despesa continua {form.incluir ? "entrando" : "fora"} do cálculo.
                  Ao decidir depois, marque como indevida (aguarda crédito) ou desligue este aviso.
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.borda}`, display: "flex", gap: 10, justifyContent: "space-between" }}>
          <div>
            {ehEdicao && onDelete && (
              <Button variant="danger-ghost" size="sm" onClick={() => { if (confirm("Excluir esta despesa definitivamente?")) onDelete(inicial.id); }}>Excluir</Button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={salvar}>{ehEdicao ? "Salvar" : "Adicionar"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
