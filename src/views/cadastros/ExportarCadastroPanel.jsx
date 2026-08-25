import React from "react";
import { listarTemplates } from "../../cadastroTemplates.js";
import { itensDoEnvio, matrizesDoTemplate, nomeDoArquivo } from "../../cadastroExport.js";
import { baixarXLSXAbas } from "../../exportacao.js";

// Painel de geração do cadastro da embarcadora — mora dentro de Cadastros >
// Motoristas, no mesmo lugar (e no mesmo padrão) do "Importar agenda".
//
// A seleção é por DT porque é assim que o analista pensa a carga, e porque o
// conjunto que vai no arquivo é o da VIAGEM: o motorista troca de carreta entre
// uma DT e outra. Quem tem pendência aparece, mas não pode ser marcado — o
// arquivo incompleto volta da embarcadora e o trabalho é refeito.

export default function ExportarCadastroPanel({ ctx, conn, motoristas, veiculos, onFechar }) {
  const { t, DADOS, showToast, usuarioLogado } = ctx;

  const [templates, setTemplates] = React.useState([]);
  const [templateId, setTemplateId] = React.useState("");
  const [busca, setBusca] = React.useState("");
  const [marcadas, setMarcadas] = React.useState(new Set());
  const [soCompletos, setSoCompletos] = React.useState(true);

  React.useEffect(() => {
    let vivo = true;
    listarTemplates(conn).then((lista) => {
      if (!vivo) return;
      setTemplates(lista);
      setTemplateId((id) => id || lista[0]?.id || "");
    });
    return () => { vivo = false; };
  }, [conn]);

  const itens = React.useMemo(
    () => itensDoEnvio(DADOS, motoristas, veiculos),
    [DADOS, motoristas, veiculos]
  );

  const visiveis = React.useMemo(() => {
    const q = busca.trim().toUpperCase();
    return itens.filter((i) => {
      if (soCompletos && i.pendencias.length) return false;
      if (!q) return true;
      return i.dt.toUpperCase().includes(q)
        || i.nome.toUpperCase().includes(q)
        || i.veiculos.some((v) => v.placa.includes(q.replace(/[^A-Z0-9]/g, "")));
    });
  }, [itens, busca, soCompletos]);

  const template = templates.find((x) => x.id === templateId) || null;
  const selecionados = itens.filter((i) => marcadas.has(i.dt));
  const comPendencia = itens.filter((i) => i.pendencias.length).length;

  const alternar = (dt) => setMarcadas((s) => {
    const n = new Set(s);
    n.has(dt) ? n.delete(dt) : n.add(dt);
    return n;
  });

  const marcarVisiveis = () => setMarcadas((s) => {
    const n = new Set(s);
    visiveis.filter((i) => !i.pendencias.length).forEach((i) => n.add(i.dt));
    return n;
  });

  const gerar = () => {
    if (!template) { showToast?.("Escolha o modelo da embarcadora.", "erro"); return; }
    if (!selecionados.length) { showToast?.("Marque ao menos uma DT.", "erro"); return; }
    const travados = selecionados.filter((i) => i.pendencias.length);
    if (travados.length) {
      showToast?.(`${travados.length} DT(s) marcada(s) ainda têm pendência — complete o cadastro antes.`, "erro");
      return;
    }
    const abas = matrizesDoTemplate(template, selecionados);
    baixarXLSXAbas(abas, nomeDoArquivo(template));
    showToast?.(`Arquivo gerado com ${selecionados.length} DT(s) por ${usuarioLogado?.nome || "—"}.`, "ok");
  };

  const inp = { fontSize: 12.5, padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${t.borda}`, background: t.bg, color: t.txt, fontFamily: "inherit", width: "100%" };

  return (
    <div style={{ marginBottom: 14, border: `1.5px solid ${t.azul}`, borderRadius: 10, background: t.card, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.txt, flex: "1 1 auto" }}>Gerar cadastro da embarcadora</div>
        <button onClick={onFechar} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Fechar</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: "1 1 260px" }}>
          <label style={{ fontSize: 10.5, color: t.txt2, marginBottom: 3, display: "block" }}>Modelo</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={inp}>
            {!templates.length && <option value="">carregando…</option>}
            {templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.embarcadora} · {tp.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ fontSize: 10.5, color: t.txt2, marginBottom: 3, display: "block" }}>Buscar DT, motorista ou placa</label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} style={inp} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8, fontSize: 11.5, color: t.txt2 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={soCompletos} onChange={(e) => setSoCompletos(e.target.checked)} />
          Só cadastros completos
        </label>
        <span>{visiveis.length} DT(s) na lista · {marcadas.size} marcada(s)</span>
        {comPendencia > 0 && <span style={{ color: t.warn }}>{comPendencia} com pendência</span>}
        <button onClick={marcarVisiveis} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt, border: `1px solid ${t.borda}` }}>Marcar visíveis</button>
        {marcadas.size > 0 && (
          <button onClick={() => setMarcadas(new Set())} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Desmarcar</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 320, overflowY: "auto", marginBottom: 10 }}>
        {!visiveis.length && (
          <div style={{ fontSize: 11.5, color: t.txt2, padding: 8 }}>
            Nenhuma DT {soCompletos ? "com cadastro completo " : ""}nesta base — desmarque o filtro pra ver o que falta.
          </div>
        )}
        {visiveis.slice(0, 300).map((i) => (
          <label key={i.dt} title={i.pendencias.length ? `Falta: ${i.pendencias.join(", ")}` : ""}
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "7px 10px", borderRadius: 8,
              background: t.card2, border: `1px solid ${marcadas.has(i.dt) ? t.azul : t.borda}`, cursor: i.pendencias.length ? "not-allowed" : "pointer", opacity: i.pendencias.length ? .65 : 1 }}>
            <input type="checkbox" checked={marcadas.has(i.dt)} disabled={i.pendencias.length > 0}
              onChange={() => alternar(i.dt)} style={{ cursor: "inherit" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: t.ouro, fontWeight: 700 }}>DT {i.dt}</span>
            <span style={{ fontSize: 12, color: t.txt, flex: "1 1 180px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nome}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: t.txt2 }}>{i.veiculos.map((v) => v.placa).join(" · ") || "sem placa"}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
              color: i.pendencias.length ? t.warn : t.verde, border: `1px solid ${i.pendencias.length ? t.warn : t.verde}` }}>
              {i.pendencias.length ? `falta ${i.pendencias.length}` : "completo"}
            </span>
          </label>
        ))}
        {visiveis.length > 300 && <div style={{ fontSize: 11, color: t.txt2, textAlign: "center", padding: 6 }}>mostrando 300 de {visiveis.length} — refine a busca</div>}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
        {template && (
          <span style={{ fontSize: 11, color: t.txt2, marginRight: "auto" }}>
            {template.layout === "blocos" ? "Uma aba, um bloco por motorista" : `${template.definicao?.secoes?.length || 0} abas`}
          </span>
        )}
        <button onClick={gerar} disabled={!selecionados.length}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: selecionados.length ? "pointer" : "not-allowed",
            background: "var(--accent)", color: "#fff", border: "none", opacity: selecionados.length ? 1 : .45 }}>
          Gerar .xlsx ({selecionados.length})
        </button>
      </div>
    </div>
  );
}
