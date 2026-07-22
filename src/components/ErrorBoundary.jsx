import React from "react";

// Captura erros de render em qualquer lugar da árvore e mostra um fallback em vez
// da tela branca. Propositalmente sem dependências do app (usa CSS vars direto),
// para não quebrar junto caso o erro venha de constants/design-system.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // Log no console (não há coletor de erros server-side neste app).
    console.error("[ErrorBoundary]", erro, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, background: "var(--bg, #111)", color: "var(--text, #eee)",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          maxWidth: 440, width: "100%", textAlign: "center",
          background: "var(--card, #1c1c1c)", border: "1px solid var(--border, #333)",
          borderRadius: 16, padding: "32px 28px",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden="true">⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
            Algo deu errado nesta tela
          </h1>
          <p style={{ fontSize: 13, color: "var(--text2, #999)", lineHeight: 1.6, margin: "0 0 20px" }}>
            O restante do sistema segue funcionando. Recarregue a página; se o erro
            persistir, avise o suporte com o horário em que aconteceu.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "11px 20px", background: "var(--accent, #f0b90b)",
              color: "var(--on-primary, #111)", border: "none", borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Recarregar
          </button>
          {import.meta.env?.DEV && (
            <pre style={{
              marginTop: 20, textAlign: "left", fontSize: 11, color: "var(--red, #e66)",
              background: "var(--card2, #262626)", padding: 12, borderRadius: 8,
              overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap",
            }}>
              {String(this.state.erro?.stack || this.state.erro)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
