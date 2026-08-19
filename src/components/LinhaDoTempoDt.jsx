// ── LinhaDoTempoDt.jsx ──
// A viagem de uma DT como trilha de etapas, na ordem em que a planilha as conta.
// Ver ocorrenciaEtapas.js para a regra de cada estado.
//
// Leitura em um passe de olho: ponto cheio = aconteceu, ponto vazado = ainda não
// chegou a vez, ponto vermelho = era esperado e não veio. O texto da observação
// aparece embaixo da etapa a que pertence, em vez de numa caixa solta no rodapé
// do card — que era como a tela mostrava antes, sem dizer de qual momento era.
import React from "react";

const COR = {
  feito: "var(--green)",
  pendente: "var(--red)",
  aguardando: "var(--text3)",
  vazio: "var(--border2)",
};

function Ponto({ estado, excecao }) {
  const cor = excecao ? "var(--cat-tangerine)" : COR[estado];
  const cheio = estado === "feito";
  return (
    <span style={{
      width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
      background: cheio ? cor : "transparent",
      border: `1.5px solid ${cor}`,
      boxShadow: estado === "pendente" ? `0 0 0 3px color-mix(in srgb, ${cor} 18%, transparent)` : "none",
    }} />
  );
}

export default function LinhaDoTempoDt({ etapas, isMobile }) {
  if (!etapas?.length) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 0 : 2,
      alignItems: isMobile ? "stretch" : "flex-start",
    }}>
      {etapas.map((e, i) => {
        const ultima = i === etapas.length - 1;
        const apagada = e.estado === "vazio";
        const cor = e.excecao ? "var(--cat-tangerine)" : COR[e.estado];
        return (
          <div key={e.id} style={{
            display: "flex",
            flexDirection: isMobile ? "row" : "column",
            gap: isMobile ? 8 : 5,
            flex: isMobile ? "none" : 1,
            minWidth: 0,
            opacity: apagada ? 0.42 : 1,
          }}>
            {/* Trilho: ponto + linha até a próxima etapa */}
            <div style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              gap: 0,
              flexShrink: 0,
              paddingTop: isMobile ? 3 : 0,
            }}>
              <Ponto estado={e.estado} excecao={e.excecao} />
              {!ultima && (
                <span style={{
                  background: "var(--border)",
                  ...(isMobile
                    ? { width: 1.5, flex: 1, minHeight: 14, marginTop: 2 }
                    : { height: 1.5, flex: 1, marginLeft: 2, marginRight: 2 }),
                }} />
              )}
            </div>

            <div style={{ minWidth: 0, paddingBottom: isMobile ? 9 : 0 }}>
              <div style={{
                fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                letterSpacing: "0.05em", color: e.estado === "pendente" ? cor : "var(--text3)",
                fontWeight: e.estado === "pendente" ? 700 : 400, lineHeight: 1.3,
              }}>
                {e.label}
              </div>
              <div style={{
                fontSize: 10.5, lineHeight: 1.35, marginTop: 1,
                color: e.estado === "feito" ? "var(--text2)" : "var(--text3)",
                overflow: "hidden", textOverflow: "ellipsis",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
              }} title={e.valor || ""}>
                {e.valor
                  ? (e.data && e.valor !== e.data ? `${e.data} · ${e.valor}` : e.valor)
                  : e.estado === "pendente" ? "falta registrar"
                  : e.estado === "aguardando" ? "—"
                  : "sem registro"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
