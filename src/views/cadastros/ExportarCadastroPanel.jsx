import React from "react";
import { listarTemplates } from "../../cadastroTemplates.js";
import { itensDoEnvio, matrizesDoTemplate, nomeDoArquivo } from "../../cadastroExport.js";
import { listarEnvios, registrarEnvios, situacaoDoEnvio, indexarEnvios } from "../../cadastroEnvios.js";
import { diasParaVencerCnh, DIAS_AVISO_CNH } from "../../cadastroEmbarcadora.js";
import { baixarXLSXAbas } from "../../exportacao.js";

// Painel de geração do cadastro da embarcadora — mora dentro de Cadastros >
// Motoristas, no mesmo lugar (e no mesmo padrão) do "Importar agenda".
//
// Cada linha é um CADASTRO (motorista + conjunto), não uma viagem: o mesmo
// motorista com o mesmo conjunto roda várias DTs e a embarcadora quer isso uma
// vez só. Trocou uma peça, é outra linha — outro conjunto, outro cadastro.
// As DTs aparecem na linha porque é por elas que o analista se orienta e busca.
// Quem tem pendência aparece, mas não pode ser marcado: arquivo incompleto volta
// da embarcadora e o trabalho é refeito.

// "novo" chama atenção (é o que precisa ir), "mudou" alerta (foi, mas mudou) e
// "enviado" fica apagado — já resolvido.
const ESTADO_COR = (t) => ({ novo: t.azul, mudou: t.warn, igual: t.txt2 });
const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");

export default function ExportarCadastroPanel({ ctx, conn, motoristas, veiculos, onFechar }) {
  const { t, DADOS, showToast, usuarioLogado } = ctx;

  const [templates, setTemplates] = React.useState([]);
  const [templateId, setTemplateId] = React.useState("");
  const [busca, setBusca] = React.useState("");
  const [marcadas, setMarcadas] = React.useState(new Set());
  const [soCompletos, setSoCompletos] = React.useState(true);
  const [soPendentes, setSoPendentes] = React.useState(true);
  const [envios, setEnvios] = React.useState([]);
  const [gerando, setGerando] = React.useState(false);

  React.useEffect(() => {
    let vivo = true;
    listarTemplates(conn).then((lista) => {
      if (!vivo) return;
      setTemplates(lista);
      setTemplateId((id) => id || lista[0]?.id || "");
    });
    return () => { vivo = false; };
  }, [conn]);

  const template = templates.find((x) => x.id === templateId) || null;
  const embarcadora = template?.embarcadora || "";

  // O histórico é por embarcadora: mandar a mesma DT pra Suzano e pra outra é
  // envio diferente, não repetido.
  React.useEffect(() => {
    let vivo = true;
    if (!embarcadora) return;
    listarEnvios(conn, embarcadora).then((linhas) => { if (vivo) setEnvios(linhas); });
    return () => { vivo = false; };
  }, [conn, embarcadora]);

  const indiceEnvios = React.useMemo(() => indexarEnvios(envios), [envios]);

  const itens = React.useMemo(() => itensDoEnvio(DADOS, motoristas, veiculos).map((i) => ({
    ...i,
    situacao: situacaoDoEnvio(indiceEnvios, i),
    diasCnh: diasParaVencerCnh(i.motorista?.cnh_validade),
  })), [DADOS, motoristas, veiculos, indiceEnvios]);

  const contagem = React.useMemo(() => itens.reduce((acc, i) => {
    acc[i.situacao.estado] = (acc[i.situacao.estado] || 0) + 1;
    return acc;
  }, {}), [itens]);

  const visiveis = React.useMemo(() => {
    const q = busca.trim().toUpperCase();
    return itens.filter((i) => {
      if (soCompletos && i.pendencias.length) return false;
      // "igual" = já foi e nada mudou. Reenviar só faz a embarcadora receber
      // repetido, então some por padrão — mas o filtro é destravável.
      if (soPendentes && i.situacao.estado === "igual") return false;
      if (!q) return true;
      return i.dts.some((d) => d.toUpperCase().includes(q))
        || i.nome.toUpperCase().includes(q)
        || i.veiculos.some((v) => v.placa.includes(q.replace(/[^A-Z0-9]/g, "")));
    });
  }, [itens, busca, soCompletos, soPendentes]);
  const selecionados = itens.filter((i) => marcadas.has(i.chave));
  const comPendencia = itens.filter((i) => i.pendencias.length).length;

  const alternar = (chave) => setMarcadas((s) => {
    const n = new Set(s);
    n.has(chave) ? n.delete(chave) : n.add(chave);
    return n;
  });

  const marcarVisiveis = () => setMarcadas((s) => {
    const n = new Set(s);
    visiveis.filter((i) => !i.pendencias.length).forEach((i) => n.add(i.chave));
    return n;
  });

  const gerar = async () => {
    if (!template) { showToast?.("Escolha o modelo da embarcadora.", "erro"); return; }
    if (!selecionados.length) { showToast?.("Marque ao menos um cadastro.", "erro"); return; }
    const travados = selecionados.filter((i) => i.pendencias.length);
    if (travados.length) {
      showToast?.(`${travados.length} cadastro(s) marcado(s) ainda têm pendência — complete antes.`, "erro");
      return;
    }
    setGerando(true);
    try {
      const abas = matrizesDoTemplate(template, selecionados);
      baixarXLSXAbas(abas, nomeDoArquivo(template));
      showToast?.(`Arquivo gerado com ${selecionados.length} cadastro(s).`, "ok");

      // O registro vem DEPOIS do arquivo e não derruba a geração se falhar: o
      // que o analista precisa é do .xlsx; o histórico é conveniência.
      const agora = new Date().toISOString();
      const linhas = selecionados.map((i) => ({
        embarcadora, dts: i.dts.join(", "), template: template.nome,
        motorista_id: i.motorista?.id || null,
        nome: i.nome, placas: i.veiculos.map((v) => v.placa).join(" / "),
        assinatura: i.assinatura, enviado_em: agora, enviado_por: usuarioLogado?.nome || null,
      }));
      try {
        await registrarEnvios(conn, linhas);
        setEnvios((antes) => [...antes.filter((e) => !marcadas.has(e.assinatura)), ...linhas]);
        setMarcadas(new Set());
      } catch (e) {
        showToast?.("Arquivo pronto, mas o histórico de envio não foi gravado: " + e.message, "warn");
      }
    } finally { setGerando(false); }
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
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
          title="Esconde os cadastros já mandados com este mesmo conjunto — reenviar igual só faz a embarcadora receber repetido">
          <input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} />
          Esconder o que já foi com este mesmo conjunto
        </label>
        <span>{visiveis.length} cadastro(s) na lista · {marcadas.size} marcado(s)</span>
        {comPendencia > 0 && <span style={{ color: t.warn }}>{comPendencia} com pendência</span>}
        {(contagem.mudou > 0 || contagem.igual > 0) && (
          <span>{contagem.novo || 0} novo(s) · {contagem.mudou || 0} com conjunto novo · {contagem.igual || 0} já enviado(s)</span>
        )}
        <button onClick={marcarVisiveis} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt, border: `1px solid ${t.borda}` }}>Marcar visíveis</button>
        {marcadas.size > 0 && (
          <button onClick={() => setMarcadas(new Set())} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", color: t.txt2, border: `1px solid ${t.borda}` }}>Desmarcar</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 320, overflowY: "auto", marginBottom: 10 }}>
        {!visiveis.length && (
          <div style={{ fontSize: 11.5, color: t.txt2, padding: 8 }}>
            Nenhum cadastro {soCompletos ? "completo " : ""}nesta base — desmarque o filtro pra ver o que falta.
          </div>
        )}
        {visiveis.slice(0, 300).map((i) => (
          <label key={i.chave} title={i.pendencias.length ? `Falta: ${i.pendencias.join(", ")}` : ""}
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "7px 10px", borderRadius: 8,
              background: t.card2, border: `1px solid ${marcadas.has(i.chave) ? t.azul : t.borda}`, cursor: i.pendencias.length ? "not-allowed" : "pointer", opacity: i.pendencias.length ? .65 : 1 }}>
            <input type="checkbox" checked={marcadas.has(i.chave)} disabled={i.pendencias.length > 0}
              onChange={() => alternar(i.chave)} style={{ cursor: "inherit" }} />
            {/* Uma linha cobre TODAS as viagens do mesmo conjunto — mostra a
                primeira DT e conta o resto, com a lista inteira no título. */}
            <span title={i.dts.length > 1 ? `DTs: ${i.dts.join(", ")}` : ""}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: t.ouro, fontWeight: 700 }}>
              DT {i.dts[0]}{i.dts.length > 1 ? ` +${i.dts.length - 1}` : ""}
            </span>
            <span style={{ fontSize: 12, color: t.txt, flex: "1 1 180px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nome}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: t.txt2 }}>{i.veiculos.map((v) => v.placa).join(" · ") || "sem placa"}</span>
            {/* CNH que vence logo passa, mas avisada: ela volta como problema
                pouco depois de o cadastro ter sido aceito. */}
            {i.diasCnh !== null && i.diasCnh >= 0 && i.diasCnh <= DIAS_AVISO_CNH && (
              <span style={{ fontSize: 10, fontWeight: 700, color: t.warn, whiteSpace: "nowrap" }}>
                CNH vence em {i.diasCnh}d
              </span>
            )}
            <span title={i.situacao.em
              ? `Enviado em ${new Date(i.situacao.em).toLocaleString("pt-BR")}${i.situacao.por ? " por " + i.situacao.por : ""}${i.situacao.antes ? ` · conjunto enviado antes: ${i.situacao.antes}` : ""}`
              : "Este motorista com este conjunto nunca foi enviado"}
              style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
                color: ESTADO_COR(t)[i.situacao.estado], border: `1px solid ${ESTADO_COR(t)[i.situacao.estado]}` }}>
              {i.situacao.estado === "novo" ? "cadastro novo"
                : i.situacao.estado === "mudou" ? `conjunto mudou desde ${dataCurta(i.situacao.em)}`
                : `enviado ${dataCurta(i.situacao.em)}`}
            </span>
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
        <button onClick={gerar} disabled={!selecionados.length || gerando}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: selecionados.length ? "pointer" : "not-allowed",
            background: "var(--accent)", color: "#fff", border: "none", opacity: selecionados.length && !gerando ? 1 : .45 }}>
          {gerando ? "Gerando…" : `Gerar .xlsx (${selecionados.length})`}
        </button>
      </div>
    </div>
  );
}
