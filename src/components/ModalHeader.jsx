// ── ModalHeader.jsx ──
// Cabeçalho único dos modais. Nasceu porque o mesmo desenho estava copiado em 9
// arquivos, cada um com o seu wash de cor a 5–6% escrito em hex solto no JSX
// (o DESIGN.md lista ModalWhatsApp entre os maiores ofensores de cor hardcoded).
// Além de repetir, o desenho não funcionava: fundo quase invisível e título na
// mesma cor do fundo — "o cabeção tá apagado" (Yves, 04/09/2026).
//
// Desenho escolhido entre 4 opções: superfície elevada + FAIXA DE 3px no topo,
// o mesmo recurso que os KPIs do dashboard usam. O título vai em texto primário;
// a cor fica só na faixa e no bloco do ícone, respeitando "accent escasso".
//
// `tom` diz o que aquele modal É, não que cor usar — quem traduz tom→cor é este
// arquivo. Trocar a cor de um estado passa a ser uma linha aqui.
import React from "react";
import Icon from "./Icon.jsx";

const TONS = {
  accent:   "var(--accent)",         // ação padrão do app (colar, editar, relatório)
  verde:    "var(--green)",          // confirmação / dinheiro recebido
  azul:     "var(--color-info-lt)",  // informação, importação, documento
  vermelho: "var(--red)",            // destrutivo / bloqueio
  laranja:  "var(--orange)",         // atenção
  whatsapp: "#25D366",               // exceção consciente: verde de marca do WhatsApp
};

// Sobre a faixa: `onFechar` ausente = modal sem X (confirmações que exigem uma
// escolha explícita no rodapé).
export default function ModalHeader({
  titulo,
  sub,
  icone,
  tom = "accent",
  onFechar,
  fecharDesabilitado = false,
  acoes = null,      // botões antes do X (Editar, Excluir…)
  esquerda = null,   // antes do ícone (o "Voltar" do drill do dashboard)
}) {
  const cor = TONS[tom] || TONS.accent;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11,
      padding: "13px 16px 11px", flexShrink: 0,
      background: "var(--card2)",
      borderTop: `3px solid ${cor}`,
      borderBottom: "1px solid var(--border)",
    }}>
      {esquerda}

      {icone && (
        <div style={{
          width: 38, height: 38, flexShrink: 0, borderRadius: "var(--radius-btn)",
          background: cor, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon n={icone} s={19} c="var(--on-primary)" />
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2, color: "var(--text)", lineHeight: 1.15 }}>
          {titulo}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 1 }}>{sub}</div>}
      </div>

      {acoes}

      {onFechar && (
        <button className="co-modal-close" onClick={onFechar} disabled={fecharDesabilitado} title="Fechar" aria-label="Fechar">
          <Icon n="x" s={17} c="currentColor" sw={2} />
        </button>
      )}
    </div>
  );
}
