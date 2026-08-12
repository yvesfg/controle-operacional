// ── ModalColarFaturamento.jsx ──
// Caminho INVERSO do card do WhatsApp: o analista cola o bloco que ele já digita
// hoje, o app acha a DT, mostra o que vai mudar e grava — primeiro na planilha
// (senão a sync de 15 min apagaria), depois no Supabase.
import React from "react";
import Icon from "../components/Icon.jsx";
import { parseFaturamento, compararComRegistro, paraDataBR, dataDeHojeBR, CAMPO_MANIFESTO } from "../faturamentoParse.js";
import { escreverFaturamentoNaPlanilha } from "../faturamentoSheets.js";

const EXEMPLO = `DT: 1348169
CTE: 34978
MDF: 29735
MAT: 26884
NF: 360525, 360526
CLIENTE: SUZANO`;

const isoParaBR = (iso) => (iso ? paraDataBR(iso) : "");
const brParaISO = (br) => {
  const m = String(br || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

export default function ModalColarFaturamento({ ctx }) {
  const {
    faturaColarOpen, setFaturaColarOpen,
    DADOS, baseAtual, t, css, showToast,
    patchOperacional, registrarLog,
  } = ctx;

  const [texto, setTexto] = React.useState("");
  const [manifestoISO, setManifestoISO] = React.useState("");
  const [sobrescrever, setSobrescrever] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);

  const { campos, avisos } = React.useMemo(() => parseFaturamento(texto), [texto]);
  const reg = React.useMemo(
    () => (campos.dt ? DADOS.find(r => String(r.dt).trim() === String(campos.dt).trim()) : null),
    [campos.dt, DADOS]
  );

  // Data do manifesto: vem da tela, não do texto. Começa na data do lançamento
  // (ou na que o registro já tem) e fica editável pra quando o faturamento foi
  // feito em outro dia.
  // Abre com o texto que veio de onde chamou (bloco colado na busca do WhatsApp
  // ou só "DT: xxxx" quando a DT já estava selecionada lá).
  React.useEffect(() => {
    setTexto(faturaColarOpen?.texto || "");
    setManifestoISO("");
    setSobrescrever(false);
  }, [faturaColarOpen]);

  React.useEffect(() => {
    if (!reg) return;
    setManifestoISO(prev => prev || brParaISO(campos.data_manifesto || reg.data_manifesto || dataDeHojeBR()));
  }, [reg, campos.data_manifesto]);

  if (!faturaColarOpen) return null;

  const manifestoBR = isoParaBR(manifestoISO);
  const camposFinais = { ...campos, ...(manifestoBR ? { data_manifesto: manifestoBR } : {}) };
  delete camposFinais.dt;

  const linhas = reg ? compararComRegistro(reg, camposFinais) : [];
  const conflitos = linhas.filter(l => l.estado === "conflito");
  const aGravar = linhas.filter(l => l.estado === "preenche" || (l.estado === "conflito" && sobrescrever));

  const corEstado = { preenche: t.verde, igual: t.txt2, conflito: t.warn };
  const rotuloEstado = { preenche: "PREENCHE", igual: "JÁ IGUAL", conflito: "DIFERENTE" };

  const gravar = async () => {
    if (!reg || !aGravar.length) return;
    const payload = {};
    aGravar.forEach(l => { payload[l.k] = l.novo; });
    setSalvando(true);
    try {
      // 1) Planilha primeiro. Se ela não receber, NÃO grava no app: a sync de 15
      //    min traria a célula vazia por cima e o trabalho sumiria sem aviso.
      const res = await escreverFaturamentoNaPlanilha({
        base: baseAtual?.id, dt: reg.dt, aba: reg.sheet || "", campos: payload,
      });
      // 2) Supabase — só os campos que a planilha aceitou.
      const gravados = Array.isArray(res.escritos) && res.escritos.length
        ? Object.fromEntries(res.escritos.map(k => [k, payload[k]]))
        : payload;
      await patchOperacional(reg.dt, gravados);
      if (registrarLog) {
        await registrarLog("FATURAMENTO_COLADO", `DT ${reg.dt} — ${Object.keys(gravados).join(", ")}`, reg, { ...reg, ...gravados });
      }
      const extra = res.ignorados?.length ? ` (sem coluna na planilha: ${res.ignorados.join(", ")})` : "";
      showToast(`✅ DT ${reg.dt} atualizada na planilha (${res.aba}, linha ${res.linha}) e no app${extra}`, "ok");
      setFaturaColarOpen(null);
    } catch (e) {
      showToast("❌ " + (e.message || e), "err");
    } finally {
      setSalvando(false);
    }
  };

  const lbl = { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.2, color: t.txt2, fontWeight: 600, display: "block", marginBottom: 3 };

  return (
    <div style={css.overlay} onClick={e => e.target === e.currentTarget && !salvando && setFaturaColarOpen(null)}>
      <div style={{ ...css.modal, maxWidth: 640, maxHeight: "96vh" }}>
        {/* Header */}
        <div style={{ padding: "13px 16px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${t.borda}`, flexShrink: 0, background: "rgba(217,98,43,.06)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(217,98,43,.15)", border: "1px solid rgba(217,98,43,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="clipboard" s={18} c={t.ouro} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 2, color: t.ouro }}>COLAR FATURAMENTO</div>
            <div style={{ fontSize: 9, color: t.txt2 }}>Cole o bloco do WhatsApp — o app preenche a DT e grava na planilha</div>
          </div>
          <button onClick={() => setFaturaColarOpen(null)} disabled={salvando} style={{ background: "rgba(128,128,128,.1)", border: "none", borderRadius: 7, width: 44, height: 44, cursor: salvando ? "not-allowed" : "pointer", color: t.txt2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="x" s={16} c={t.txt2} sw={2} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={lbl}>Bloco colado</label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={7}
              placeholder={EXEMPLO}
              autoFocus
              style={{ ...css.inp, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.7, resize: "vertical" }}
            />
            <div style={{ fontSize: 9, color: t.txt2, marginTop: 4 }}>Ordem esperada: DT · CTE · MDF · MAT · NF · CLIENTE. A data do manifesto é preenchida abaixo, não no texto. ID saiu do bloco — quem preenche é o contratante.</div>
          </div>

          {avisos.map((a, i) => (
            <div key={i} style={{ fontSize: 10, color: t.warn, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon n="alert" s={11} c={t.warn} /> {a}
            </div>
          ))}

          {/* Registro encontrado */}
          {campos.dt && !reg && (
            <div style={{ background: "rgba(246,70,93,.07)", border: "1px solid rgba(246,70,93,.3)", borderRadius: 10, padding: "10px 12px", fontSize: 11, color: t.danger, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon n="alert" s={12} c={t.danger} /> DT {campos.dt} não existe nesta base ({baseAtual?.nome || baseAtual?.id || "—"}).
            </div>
          )}

          {reg && (
            <div style={{ background: t.card2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${t.borda}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 2, color: t.ouro }}>DT {reg.dt}</div>
                <div style={{ flex: 1, fontSize: 11, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reg.nome || "—"}</div>
                <div style={{ fontSize: 10, color: t.txt2, fontFamily: "var(--font-mono)" }}>{reg.placa || "—"}</div>
              </div>
              <div style={{ fontSize: 10, color: t.txt2, marginTop: 3 }}>{reg.origem || "—"} → {reg.destino || "—"} · aba {reg.sheet || "?"}</div>
            </div>
          )}

          {/* Data do manifesto — vem da tela */}
          {reg && (
            <div>
              <label style={lbl}>{CAMPO_MANIFESTO.l} <span style={{ color: t.verde, fontSize: 8 }}>(data do lançamento — editável)</span></label>
              <input type="date" value={manifestoISO} onChange={e => setManifestoISO(e.target.value)} style={{ ...css.inp, fontSize: 12, padding: "7px 10px" }} />
            </div>
          )}

          {/* Conferência */}
          {reg && linhas.length > 0 && (
            <div style={{ background: t.card2, borderRadius: 10, border: `1px solid ${t.borda}`, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", borderBottom: `1px solid ${t.borda}`, fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: t.txt2, fontWeight: 700 }}>Conferência</div>
              {linhas.map(l => (
                <div key={l.k} style={{ display: "grid", gridTemplateColumns: "58px 1fr 1fr 78px", gap: 8, alignItems: "center", padding: "7px 12px", borderBottom: `1px solid ${t.borda}`, fontSize: 11 }}>
                  <div style={{ fontWeight: 700, color: t.txt2 }}>{l.l}</div>
                  <div style={{ color: t.txt2, textDecoration: l.estado === "conflito" && sobrescrever ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>{l.atual || "—"}</div>
                  <div style={{ color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{l.novo}</div>
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .5, color: corEstado[l.estado], textAlign: "right" }}>{rotuloEstado[l.estado]}</div>
                </div>
              ))}
              {conflitos.length > 0 && (
                <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, background: "rgba(217,98,43,.06)" }}>
                  <Icon n="alert" s={12} c={t.warn} />
                  <span style={{ flex: 1, fontSize: 10, color: t.warn }}>{conflitos.length} campo{conflitos.length > 1 ? "s já têm" : " já tem"} outro valor gravado.</span>
                  <button onClick={() => setSobrescrever(v => !v)} style={{ background: sobrescrever ? "rgba(246,70,93,.12)" : "transparent", border: `1.5px solid ${sobrescrever ? t.danger : t.borda}`, borderRadius: 7, padding: "4px 9px", color: sobrescrever ? t.danger : t.txt2, fontSize: 9.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {sobrescrever ? "SOBRESCREVENDO" : "SOBRESCREVER"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{ padding: "10px 14px 18px", borderTop: `1px solid ${t.borda}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => setFaturaColarOpen(null)} disabled={salvando} style={{ flex: "0 0 auto", background: "transparent", border: `1.5px solid ${t.borda}`, borderRadius: 9, padding: "10px 14px", color: t.txt2, fontSize: 11, fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer", fontFamily: "inherit" }}>CANCELAR</button>
          <button
            onClick={gravar}
            disabled={salvando || !reg || !aGravar.length}
            style={{ flex: 1, borderRadius: 10, padding: "12px 18px", cursor: salvando ? "wait" : (!reg || !aGravar.length ? "not-allowed" : "pointer"), background: !reg || !aGravar.length ? "rgba(128,128,128,.15)" : "rgba(2,192,118,.15)", border: `1.5px solid ${!reg || !aGravar.length ? t.borda : "rgba(2,192,118,.4)"}`, color: !reg || !aGravar.length ? t.txt2 : t.verde, fontWeight: 700, fontSize: 13, letterSpacing: .5, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            <Icon n="save" s={15} c="currentColor" />
            {salvando ? "GRAVANDO…" : aGravar.length ? `GRAVAR ${aGravar.length} CAMPO${aGravar.length > 1 ? "S" : ""}` : "NADA A GRAVAR"}
          </button>
        </div>
      </div>
    </div>
  );
}
