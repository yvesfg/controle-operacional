// ── ModalColarFaturamento.jsx ──
// Caminho INVERSO dos cards do WhatsApp: o analista cola o bloco que já digita
// hoje (faturamento ou contratação), o app acha a DT, mostra o que vai mudar e
// grava — primeiro na planilha (senão a sync de 15 min apagaria), depois no
// Supabase. Qual bloco é, o app reconhece pelo próprio texto.
//
// LAYOUT — as duas metades (colar × conferir) rolam SEPARADAS, nunca a página
// inteira, pra você não perder o texto colado de vista ao conferir os campos:
//   desktop (≥1024)  lado a lado, cada coluna com sua rolagem
//   tablet / mobile  empilhado, o painel de cima limitado a ~metade da altura
//                    pra nunca empurrar a conferência pra fora da tela
import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import Icon from "../components/Icon.jsx";
import {
  BLOCOS, MODO_PADRAO, detectarModo, parseBloco, compararComRegistro,
  paraDataBR, dataDeHojeBR, CAMPO_MANIFESTO, CAMPOS_SO_APP,
} from "../faturamentoParse.js";
import { escreverFaturamentoNaPlanilha, sincronizarDTDaPlanilha } from "../faturamentoSheets.js";

const isoParaBR = (iso) => (iso ? paraDataBR(iso) : "");
const brParaISO = (br) => {
  const m = String(br || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

export default function ModalColarFaturamento({ ctx }) {
  const {
    faturaColarOpen, setFaturaColarOpen,
    DADOS, baseAtual, t, css, showToast,
    patchOperacional, registrarLog, isMobile, isDesktop, setDadosBase,
  } = ctx;

  const [texto, setTexto] = React.useState("");
  const [modo, setModo] = React.useState(MODO_PADRAO);
  const [modoManual, setModoManual] = React.useState(false);
  const [manifestoISO, setManifestoISO] = React.useState("");
  const [sobrescrever, setSobrescrever] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [buscandoDT, setBuscandoDT] = React.useState(false);
  const txtRef = React.useRef(null);

  // Abre com o texto que veio de quem chamou (bloco colado na busca do WhatsApp
  // ou só "DT: xxxx" quando a DT já estava selecionada lá).
  React.useEffect(() => {
    setTexto(faturaColarOpen?.texto || "");
    setModo(faturaColarOpen?.modo || MODO_PADRAO);
    setModoManual(!!faturaColarOpen?.modo);
    setManifestoISO("");
    setSobrescrever(false);
  }, [faturaColarOpen]);

  // Enquanto ninguém escolher na mão, o modo segue o que o texto parece ser.
  React.useEffect(() => {
    if (modoManual) return;
    const det = detectarModo(texto);
    if (det && det !== modo) setModo(det);
  }, [texto, modoManual, modo]);

  const def = BLOCOS[modo] || BLOCOS[MODO_PADRAO];
  const { campos, avisos } = React.useMemo(() => parseBloco(texto, modo), [texto, modo]);
  const reg = React.useMemo(
    () => (campos.dt ? DADOS.find(r => String(r.dt).trim() === String(campos.dt).trim()) : null),
    [campos.dt, DADOS]
  );

  // Data do manifesto (só no faturamento): vem da tela, não do texto. Começa na
  // data do lançamento (ou na que o registro já tem) e fica editável.
  React.useEffect(() => {
    if (!reg || !def.perguntaManifesto) return;
    setManifestoISO(prev => prev || brParaISO(campos.data_manifesto || reg.data_manifesto || dataDeHojeBR()));
  }, [reg, campos.data_manifesto, def.perguntaManifesto]);

  if (!faturaColarOpen) return null;

  const manifestoBR = def.perguntaManifesto ? isoParaBR(manifestoISO) : "";
  const camposFinais = { ...campos, ...(manifestoBR ? { data_manifesto: manifestoBR } : {}) };
  delete camposFinais.dt;

  const linhas = reg ? compararComRegistro(reg, camposFinais, modo) : [];
  const conflitos = linhas.filter(l => l.estado === "conflito");
  const aGravar = linhas.filter(l => l.estado === "preenche" || (l.estado === "conflito" && sobrescrever));

  const corEstado = { preenche: t.verde, igual: t.txt2, conflito: t.warn };
  const rotuloEstado = { preenche: "PREENCHE", igual: "JÁ IGUAL", conflito: "DIFERENTE" };

  // "NADA A GRAVAR" com conflitos na lista fazia parecer que não havia o que
  // fazer, quando na verdade há uma decisão esperando o SOBRESCREVER.
  const rotuloGravar = salvando ? "GRAVANDO…"
    : aGravar.length ? `GRAVAR ${aGravar.length} CAMPO${aGravar.length > 1 ? "S" : ""}`
    : conflitos.length ? `${conflitos.length} CAMPO${conflitos.length > 1 ? "S DIFERENTES" : " DIFERENTE"} — MARQUE SOBRESCREVER`
    : "NADA A GRAVAR";

  // Zera o formulário SEM fechar: quem lança várias DTs seguidas cola a próxima
  // aqui mesmo. modoManual volta a false de propósito — assim colar um bloco de
  // Faturamento depois de um de Contratação troca o tipo sozinho.
  const limpar = () => {
    setTexto("");
    setModoManual(false);
    setManifestoISO("");
    setSobrescrever(false);
    txtRef.current?.focus();
  };

  // DT digitada na planilha há pouco: a rodada automática é de 15 em 15 min, então
  // ela ainda não existe aqui. Puxa SÓ essa linha na hora, em vez de esperar (ou
  // de reprocessar as ~850 linhas da planilha).
  const buscarDTNaPlanilha = async () => {
    if (!campos.dt) return;
    setBuscandoDT(true);
    try {
      const res = await sincronizarDTDaPlanilha({ base: baseAtual?.id, dt: campos.dt });
      const novo = res.registro || {};
      if (!novo.dt) throw new Error("A planilha respondeu sem DT");
      setDadosBase?.(prev => {
        const semEla = prev.filter(r => String(r.dt).trim() !== String(novo.dt).trim());
        return [...semEla, novo];
      });
      showToast(`DT ${novo.dt} trazida da planilha (${res.aba}, linha ${res.linha})`, "ok");
    } catch (e) {
      showToast(String(e.message || e), "err");
    } finally {
      setBuscandoDT(false);
    }
  };

  const gravar = async () => {
    if (!reg || !aGravar.length) return;
    const payload = {};
    aGravar.forEach(l => { payload[l.k] = l.novo; });
    // Campos que a planilha não tem (hoje: forma de pagamento) vão direto pro
    // Supabase. É seguro: o sync só sobrescreve coluna que existe na planilha.
    const soApp = {}, paraPlanilha = {};
    Object.entries(payload).forEach(([k, v]) => {
      (CAMPOS_SO_APP.includes(k) ? soApp : paraPlanilha)[k] = v;
    });
    setSalvando(true);
    try {
      // 1) Planilha primeiro. Se ela não receber, NÃO grava no app: a sync de 15
      //    min traria a célula vazia por cima e o trabalho sumiria sem aviso.
      const res = Object.keys(paraPlanilha).length
        ? await escreverFaturamentoNaPlanilha({ base: baseAtual?.id, dt: reg.dt, aba: reg.sheet || "", campos: paraPlanilha })
        : { ok: true, aba: reg.sheet || "—", linha: "—", escritos: [], ignorados: [] };
      // 2) Supabase — o que a planilha aceitou + o que só existe aqui.
      const gravados = {
        ...(Array.isArray(res.escritos) && res.escritos.length
          ? Object.fromEntries(res.escritos.map(k => [k, paraPlanilha[k]]))
          : paraPlanilha),
        ...soApp,
      };
      await patchOperacional(reg.dt, gravados);
      if (registrarLog) {
        await registrarLog(`BLOCO_${modo.toUpperCase()}_COLADO`, `DT ${reg.dt} — ${Object.keys(gravados).join(", ")}`, reg, { ...reg, ...gravados });
      }
      const extra = res.ignorados?.length ? ` (sem coluna na planilha: ${res.ignorados.join(", ")})` : "";
      showToast(`DT ${reg.dt} atualizada na planilha (${res.aba}, linha ${res.linha}) e no app${extra}`, "ok");
      // Fica aberto e limpo pro próximo bloco — fechar é no X do cabeçalho.
      limpar();
    } catch (e) {
      showToast(String(e.message || e), "err");
    } finally {
      setSalvando(false);
    }
  };

  const lbl = { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.2, color: t.txt2, fontWeight: 600, display: "block", marginBottom: 3 };

  // Cada painel rola por conta própria. minHeight:0 é o que permite isso dentro
  // de flex/grid — sem ele o painel cresce e quem rola vira a página toda.
  const painel = { minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: 14, display: "flex", flexDirection: "column", gap: 10 };
  // Empilhado, quando os dois juntos não cabem: quem cede é o painel de cima.
  // (maxHeight em % não resolve aqui — a altura do corpo é indefinida no flex,
  // então a porcentagem é ignorada e o painel fica com a altura natural.)
  const painelEsq = isDesktop
    ? { ...painel }
    : { ...painel, flex: "0 1 auto", minHeight: 96 };
  const painelDir = isDesktop
    ? { ...painel, borderLeft: `1px solid ${t.borda}` }
    : { ...painel, flex: "1 1 auto", minHeight: 140, borderTop: `1px solid ${t.borda}` };
  const alturaTexto = isDesktop ? "clamp(220px, 34vh, 420px)" : (isMobile ? 150 : 190);

  return (
    <div style={css.overlay} onClick={e => e.target === e.currentTarget && !salvando && setFaturaColarOpen(null)}>
      <div style={{ ...css.modal, maxWidth: isDesktop ? 1040 : 640 }}>
        {/* Header */}
        <div style={{ padding: "13px 16px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${t.borda}`, flexShrink: 0, background: "rgba(217,98,43,.06)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(217,98,43,.15)", border: "1px solid rgba(217,98,43,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="clipboard" s={18} c={t.ouro} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 2, color: t.ouro }}>PREENCHER PELO BLOCO</div>
            <div style={{ fontSize: 9, color: t.txt2 }}>Cole o texto do WhatsApp — grava na DT e na planilha</div>
          </div>
          <Button variant="ghost" size="touch" iconOnly onClick={() => setFaturaColarOpen(null)} disabled={salvando} title="Fechar" style={{ flexShrink: 0 }}><Icon n="x" s={16} c={t.txt2} sw={2} /></Button>
        </div>

        {/* Corpo — 2 colunas no desktop, empilhado abaixo disso */}
        <div style={{
          flex: "1 1 auto", minHeight: 0, display: isDesktop ? "grid" : "flex",
          ...(isDesktop ? { gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)" } : { flexDirection: "column" }),
        }}>
          {/* ── Coluna 1: o que se cola ── */}
          <div style={painelEsq}>
            {/* Modo — detectado pelo texto, trocável na mão */}
            <div>
              <label style={lbl}>Tipo do bloco {!modoManual && texto.trim() && <span style={{ color: t.verde, fontSize: 8 }}>(reconhecido pelo texto)</span>}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.entries(BLOCOS).map(([k, b]) => (
                  <button className={`co-choice${modo === k ? " co-choice--active" : ""}`} key={k} onClick={() => { setModo(k); setModoManual(true); }}>
                    <span className="co-choice__txt">
                      <span className="co-choice__nome">{b.l}</span>
                      <span className="co-choice__desc">{b.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={lbl}>Bloco colado</label>
              <textarea
                ref={txtRef}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder={def.exemplo}
                autoFocus
                style={{ ...css.inp, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.7, resize: "vertical", height: alturaTexto, overflowY: "auto" }}
              />
              <div style={{ fontSize: 9, color: t.txt2, marginTop: 4 }}>
                {def.perguntaManifesto
                  ? "A data do manifesto é preenchida ao lado, não no texto. ID saiu do faturamento — agora é campo da contratação."
                  : "Placas podem vir juntas (KEW9943 / KQW5I51). Valores entram como estão no texto. PGTO aceita cheque, conta ou ambos — e fica só no app, porque a planilha não tem essa coluna."}
              </div>
            </div>

            {avisos.map((a, i) => (
              <div key={i} style={{ fontSize: 10, color: t.warn, display: "flex", alignItems: "flex-start", gap: 5 }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}><Icon n="alert" s={11} c={t.warn} /></span>
                <span>{a}</span>
              </div>
            ))}
          </div>

          {/* ── Coluna 2: o que vai ser gravado ── */}
          <div style={painelDir}>
            {!campos.dt && (
              <div style={{ margin: "auto", textAlign: "center", padding: "18px 12px", color: t.txt2 }}>
                <Icon n="clipboard" s={22} c={t.txt2} />
                <div style={{ fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
                  {isDesktop ? "Cole o bloco ao lado." : "Cole o bloco acima."}<br />
                  A DT e a conferência campo a campo aparecem aqui.
                </div>
              </div>
            )}

            {campos.dt && !reg && (
              <div style={{ background: "rgba(246,70,93,.07)", border: "1px solid rgba(246,70,93,.3)", borderRadius: 10, padding: "10px 12px", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: t.danger, display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}><Icon n="alert" s={12} c={t.danger} /></span>
                  <span>DT {campos.dt} ainda não está nesta base ({baseAtual?.nome || baseAtual?.id || "—"}). Se você acabou de lançá-la na planilha, a rodada automática é de 15 em 15 min.</span>
                </div>
                <Button variant="outline" size="sm" onClick={buscarDTNaPlanilha} disabled={buscandoDT} style={{ width: "100%", marginTop: 9 }}>
                  <Icon n={buscandoDT ? "clock" : "download"} s={13} c="currentColor" />
                  {buscandoDT ? "BUSCANDO NA PLANILHA…" : "BUSCAR ESTA DT NA PLANILHA AGORA"}
                </Button>
              </div>
            )}

            {reg && (
              <div style={{ background: t.card2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${t.borda}`, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 2, color: t.ouro }}>DT {reg.dt}</div>
                  <div style={{ flex: 1, fontSize: 11, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reg.nome || "—"}</div>
                  <div style={{ fontSize: 10, color: t.txt2, fontFamily: "var(--font-mono)" }}>{reg.placa || "—"}</div>
                </div>
                <div style={{ fontSize: 10, color: t.txt2, marginTop: 3 }}>{reg.origem || "—"} <Icon n="arrow-right" s={13} /> {reg.destino || "—"} · aba {reg.sheet || "?"}</div>
              </div>
            )}

            {/* Data do manifesto — vem da tela, só no faturamento */}
            {reg && def.perguntaManifesto && (
              <div style={{ flexShrink: 0 }}>
                <label style={lbl}>{CAMPO_MANIFESTO.l} <span style={{ color: t.verde, fontSize: 8 }}>(data do lançamento — editável)</span></label>
                <input type="date" value={manifestoISO} onChange={e => setManifestoISO(e.target.value)} style={{ ...css.inp, fontSize: 12, padding: "7px 10px" }} />
              </div>
            )}

            {/* Conferência */}
            {reg && linhas.length > 0 && (
              <div style={{ background: t.card2, borderRadius: 10, border: `1px solid ${t.borda}`, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${t.borda}`, fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: t.txt2, fontWeight: 700 }}>Conferência</div>
                {linhas.map(l => (
                  isMobile ? (
                    // Telas estreitas: rótulo + estado em cima, atual → novo embaixo.
                    // Em 4 colunas os valores viravam reticências e a linha não dizia nada.
                    <div key={l.k} style={{ padding: "7px 12px", borderBottom: `1px solid ${t.borda}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, fontWeight: 700, color: t.txt2, fontSize: 10 }}>{l.l}</div>
                        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .5, color: corEstado[l.estado] }}>{rotuloEstado[l.estado]}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontSize: 11 }}>
                        <span style={{ color: t.txt2, textDecoration: l.estado === "conflito" && sobrescrever ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.atual || "—"}</span>
                        <span style={{ color: t.txt2, flexShrink: 0 }}><Icon n="arrow-right" s={13} /></span>
                        <span style={{ color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.novo}</span>
                        {l.anoAssumido && <span title="O texto veio sem o ano e a DT não tinha data gravada — assumi o ano corrente" style={{ color: t.warn, fontSize: 9, flexShrink: 0 }}>ano assumido</span>}
                      </div>
                    </div>
                  ) : (
                    <div key={l.k} style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr 78px", gap: 8, alignItems: "center", padding: "7px 12px", borderBottom: `1px solid ${t.borda}`, fontSize: 11 }}>
                      <div style={{ fontWeight: 700, color: t.txt2, fontSize: 10 }}>{l.l}</div>
                      <div style={{ color: t.txt2, textDecoration: l.estado === "conflito" && sobrescrever ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>{l.atual || "—"}</div>
                      <div style={{ color: t.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {l.novo}
                        {l.anoAssumido && <span title="O texto veio sem o ano e a DT não tinha data gravada — assumi o ano corrente" style={{ color: t.warn, fontSize: 9, fontWeight: 600, marginLeft: 5 }}>ano assumido</span>}
                      </div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .5, color: corEstado[l.estado], textAlign: "right" }}>{rotuloEstado[l.estado]}</div>
                    </div>
                  )
                ))}
                {conflitos.length > 0 && (
                  <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, background: "rgba(217,98,43,.06)", flexWrap: "wrap" }}>
                    <Icon n="alert" s={12} c={t.warn} />
                    <span style={{ flex: 1, minWidth: 140, fontSize: 10, color: t.warn }}>{conflitos.length} campo{conflitos.length > 1 ? "s já têm" : " já tem"} outro valor gravado.</span>
                    <Button variant={sobrescrever ? "danger-ghost" : "secondary"} size="sm" onClick={() => setSobrescrever(v => !v)}>
                      {sobrescrever ? "SOBRESCREVENDO" : "SOBRESCREVER"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ padding: "10px 14px 18px", borderTop: `1px solid ${t.borda}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <Button variant="secondary" size="md" onClick={limpar}
            disabled={salvando || !texto.trim()}
            title="Esvazia o bloco pra colar o próximo — não fecha a tela" style={{ flex: "0 0 auto" }}>LIMPAR</Button>
          <Button variant={!reg || !aGravar.length ? "secondary" : "success-outline"} size="sm" onClick={gravar}
            disabled={salvando || !reg || !aGravar.length} style={{ flex: 1 }}>
            <Icon n="save" s={15} c="currentColor" />
            {rotuloGravar}
          </Button>
        </div>
      </div>
    </div>
  );
}
