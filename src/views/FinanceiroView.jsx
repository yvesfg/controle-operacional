import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import PainelFinanceiro from "./PainelFinanceiro.jsx";
import Resultado from "./Resultado.jsx";
import CreditosPendentes from "./CreditosPendentes.jsx";
import ResumoFinanceiro from "./ResumoFinanceiro.jsx";
import { getPerfil } from "../operacao/perfil.js";

const LS_TAB  = "co_fin_tab";

export default function FinanceiroView({ ctx }) {
  const { activeTab, t, DESIGN, css, baseAtual, perms } = ctx;
  // "Todas as bases": só o Resumo soma entre bases. As outras leem despesas e
  // conferências de UMA base — juntar tudo ali daria número sem dono.
  const consolidado = baseAtual?.consolidado === true;
  if (activeTab !== "financeiro") return null;

  // Créditos Pendentes é tela de cobrança (marcar cobrado, vincular crédito) —
  // não entra pra quem só acompanha resultado. Chave ausente = visível, então
  // ninguém que já usa perde a aba.
  const podeCreditos = perms?.creditos !== false;
  // Quem não tem Planilha não opera: abre no Resumo em vez do Painel, que é tela
  // de trabalho. Vale pro perfil "gestor" e pra qualquer perm equivalente.
  const soAcompanha = perms?.planilha === false;

  const [finTab, setFinTabRaw] = React.useState(() => {
    const salvo = localStorage.getItem(LS_TAB);
    if (salvo === "creditos" && !podeCreditos) return soAcompanha ? "resumo" : "painel";
    return salvo || (soAcompanha ? "resumo" : "painel");
  });
  // Trocar pro consolidado com o Painel aberto deixaria a tela vazia.
  React.useEffect(() => { if (consolidado && finTab !== "resumo") setFinTabRaw("resumo"); }, [consolidado, finTab]);

  const setFinTab = (v) => { setFinTabRaw(v); localStorage.setItem(LS_TAB, v); };

  // Mês de referência e "incluir complementar" compartilhados entre Painel Financeiro e
  // Resultado — antes cada aba tinha seu próprio estado e trocar de aba resetava a seleção,
  // podendo mostrar números "diferentes" pro mesmo período (achado de auditoria).
  const [mesRefFin, setMesRefFin] = React.useState("");
  const baseId = baseAtual?.id;
  // Default do toggle vem do perfil da operacao, nao do id da base.
  const compPadrao = getPerfil(baseId).financeiro.incluirComplementarPadrao;
  const [incluirCompFin, setIncluirCompFin] = React.useState(compPadrao);
  React.useEffect(() => { setIncluirCompFin(compPadrao); }, [compPadrao]);

  // Navegação Resultado → Créditos Pendentes (achado de auditoria: "indevidas aguardando
  // crédito" existia duplicado nas duas telas; agora Resultado só resume e linka pra cá,
  // com filtro de filial pré-selecionado quando dá pra mapear 1:1 a partir da base atual).
  const [filtroFilialInicial, setFiltroFilialInicial] = React.useState(null);
  const irParaCreditos = (filial) => { setFiltroFilialInicial(filial || null); setFinTab("creditos"); };

  // Faixa única: o segmentado Operacional/Faturamento (antes dentro do Resultado) sobe pra
  // cá, e os filtros da sub-tela são portalizados pro slot — tudo na mesma linha da nav.
  const [segmento, setSegmento] = React.useState("operacional");
  const [toolbarEl, setToolbarEl] = React.useState(null);

  const finCtx = { ...ctx, mesRefFin, setMesRefFin, incluirCompFin, setIncluirCompFin, irParaCreditos, segmento, setSegmento, filaSlot: toolbarEl };

  const tabBtn = (key, label) => {
    const active = finTab === key;
    return (
      <button
        key={key}
        onClick={() => setFinTab(key)}
        style={{
          padding: "7px 18px",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: DESIGN?.fnt?.b || "inherit",
          cursor: "pointer",
          borderRadius: 8,
          border: `1px solid ${active ? t.azulLt : t.borda}`,
          background: active ? t.azulLt : "transparent",
          color: active ? "#fff" : t.txt2,
          transition: "all .15s",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Top bar com tabs — seletor de base fica só no topbar global ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 16px 0",
        gap: 6,
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {tabBtn("resumo", "Resumo")}
        {!consolidado && tabBtn("painel", "Painel Financeiro")}
        {!consolidado && tabBtn("resultado", "Resultado")}
        {!consolidado && podeCreditos && tabBtn("creditos", "Créditos Pendentes")}
        {consolidado && (
          <span style={{ fontSize: 10.5, color: t.txt2, marginLeft: 4 }}>
            Painel, Resultado e Créditos são por base — escolha uma no topo.
          </span>
        )}

        {/* Segmentado Operacional/Faturamento — só na aba Resultado, na mesma faixa */}
        {finTab === "resultado" && !consolidado && (
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 9, background: t.card2, border: `1px solid ${t.borda}` }}>
            {[["operacional", "Operacional"], ["faturamento", "Conferência de Faturamento"], ["contratos", "Contratos"], ["conciliacao", "Conciliação"]].map(([id, label]) => (
              <Button variant={segmento === id ? "primary" : "ghost"} size="sm" key={id} onClick={() => setSegmento(id)}>
                {label}
              </Button>
            ))}
          </div>
        )}

        {/* Slot pros filtros da sub-tela (portalizados) — display:contents faz virarem itens da faixa */}
        <div ref={setToolbarEl} style={{ display: "contents" }} />
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {finTab === "resumo" && (
          <ResumoFinanceiro ctx={{ ...finCtx, activeTab: "resumo" }} />
        )}
        {finTab === "painel" && !consolidado && (
          <PainelFinanceiro ctx={{ ...finCtx, activeTab: "painel_financeiro" }} />
        )}
        {finTab === "resultado" && !consolidado && (
          <Resultado ctx={{ ...finCtx, activeTab: "resultado" }} />
        )}
        {finTab === "creditos" && podeCreditos && !consolidado && (
          <CreditosPendentes ctx={{ ...ctx, activeTab: "creditos_pendentes", filtroFilialInicial }} />
        )}
      </div>
    </div>
  );
}
