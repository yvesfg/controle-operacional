import React from "react";

// ModalDespesa — criar/editar uma única despesa (CRUD da planilha de débitos).
// Props: { open, onClose, onSave, onDelete, inicial, t, isMobile }
// `inicial` = null → nova despesa manual; objeto → edição.

const GRUPOS = ["ENCARGOS", "DESPESAS C/ PESSOAL", "DESPESAS FIXAS", "DESPESAS VARIAVEIS"];

export default function ModalDespesa({ open, onClose, onSave, onDelete, inicial, t, isMobile }) {
  const ehEdicao = !!(inicial && inicial.id);
  const [form, setForm] = React.useState({
    grupo: "DESPESAS VARIAVEIS", dt_mov: "", valor: "", natureza: "", conta: "", historico: "", incluir: true, indevida: false,
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
    });
  }, [open, inicial]);

  // Despesa "indevida" só faz sentido para débitos (valor positivo)
  const ehDebito = parseFloat(String(form.valor).replace(/[R$\s]/g, "").replace(",", ".")) >= 0;

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = () => {
    const valorNum = parseFloat(String(form.valor).replace(/[R$\s]/g, "").replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) { alert("Informe um valor válido."); return; }
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
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.borda}`,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.txt }}>
            {ehEdicao ? "Editar despesa" : "Nova despesa"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.txt2, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

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
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.txt, cursor: "pointer" }}>
            <input type="checkbox" checked={form.incluir} onChange={(e) => set("incluir", e.target.checked)} />
            Incluir no cálculo do resultado
          </label>
          {ehDebito ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.danger, cursor: "pointer" }}>
              <input type="checkbox" checked={form.indevida} onChange={(e) => set("indevida", e.target.checked)} />
              Despesa indevida — aguardar crédito no mês seguinte
            </label>
          ) : (
            <div style={{ fontSize: 11, color: t.txt2 }}>Valor negativo = crédito (abate a despesa do mês).</div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.borda}`, display: "flex", gap: 10, justifyContent: "space-between" }}>
          <div>
            {ehEdicao && onDelete && (
              <button onClick={() => { if (confirm("Excluir esta despesa definitivamente?")) onDelete(inicial.id); }}
                style={{ fontSize: 13, fontWeight: 600, padding: "9px 14px", borderRadius: 9, cursor: "pointer",
                  border: `1px solid ${t.danger}`, background: "transparent", color: t.danger }}>Excluir</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ fontSize: 13, fontWeight: 600, padding: "9px 14px", borderRadius: 9, cursor: "pointer",
              border: `1px solid ${t.borda}`, background: "transparent", color: t.txt2 }}>Cancelar</button>
            <button onClick={salvar} style={{ fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 9, cursor: "pointer",
              border: "none", background: "var(--accent)", color: "#fff" }}>{ehEdicao ? "Salvar" : "Adicionar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
