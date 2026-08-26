import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import { useDragOrdem } from "../hooks/useDragOrdem.js";
import { ordenar, setOrdem, setVisivel, getTamanho, setTamanho, TAMANHOS, TAMANHO_ROTULO } from "../dashboardConfig.js";
import Icon from "./Icon.jsx";

// Peças do modo "Organizar painel" do Dashboard: o usuário arrasta pra
// reordenar, ✕ tira da tela e a gaveta devolve o que saiu. O layout vive em
// config.dash (hub_user_modulos) — ver dashboardConfig.js.

// ── Moldura de um card em edição: borda tracejada + botão de tirar ──────────
// Usada solta pelos blocos que não têm vizinhos pra trocar de lugar (eles
// ficam num ponto fixo da página), e por dentro da GradeEditavel.
export function CardEditavel({ id, label, tipo, cfg, editando, onSalvar, t, style, children }) {
  if (!editando) return style ? <div style={style}>{children}</div> : children;
  return (
    <div style={{ position: "relative", ...style }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none", border: `1.5px dashed ${t.borda}`, zIndex: 2 }} />
      <button data-nodrag onClick={() => onSalvar(setVisivel(cfg, tipo, id, false))}
        title={`Tirar ${label} do painel`}
        style={{
          position: "absolute", top: -8, right: -8, zIndex: 3,
          width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
          background: t.card, border: `1px solid ${t.borda}`, color: t.danger,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}>
        <Icon n="x" s={12} c={t.danger} sw={2.4} />
      </button>
      {children}
    </div>
  );
}

// ── Gaveta: o que está fora do painel, pronto pra voltar ────────────────────
export function GavetaOcultos({ ocultos, tipo, cfg, onSalvar, t, isMobile, vazioTexto = "Arraste os cards para reordenar" }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
      padding: isMobile ? 10 : "10px 12px", marginBottom: 14, borderRadius: 12,
      background: "var(--card2)", border: `1px dashed ${t.borda}`,
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)", marginRight: 2 }}>
        {ocultos.length ? "Fora do painel" : vazioTexto}
      </span>
      {ocultos.map(o => (
        <Button variant="secondary" size="sm" key={o.id} onClick={() => onSalvar(setVisivel(cfg, tipo, o.id, true))}
          title={`Colocar ${o.label} de volta`}>
          <span style={{ color: t.ouro, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>+</span> {o.label}
        </Button>
      ))}
    </div>
  );
}

// ── Grade reordenável ───────────────────────────────────────────────────────
// `itens`: [{ id, label, node, style? }] — só os que EXISTEM no contexto atual
// (um KPI financeiro não deve aparecer na gaveta de quem não vê valores).
// `style` do item vai pro wrapper: é como o card do gráfico mantém o flex 2:1.
// `redimensionavel`: a grade é de 12 colunas e cada card declara quantas ocupa.
// A escala vem de fora porque KPI e bloco não medem igual — ver TAMANHOS e
// TAMANHOS_BLOCO em dashboardConfig.js.
//
// `tamanhoPadrao` aceita uma string (mesmo padrão pra todos) OU um mapa por id,
// que é como a linha do meio preserva a proporção que já tinha (gráfico maior
// que os dois vizinhos) sem ninguém precisar configurar nada.
//
// No celular o tamanho escolhido é ignorado: a tela não tem largura pra três
// larguras diferentes, e `spanMobile` decide quantos cabem por linha.
export default function GradeEditavel({
  itens, tipo, cfg, editando, onSalvar, gridStyle, t, isMobile, gaveta = true,
  redimensionavel = false, tamanhoPadrao = "p", escala = TAMANHOS, spanMobile = 6,
}) {
  const visiveis = ordenar(cfg, tipo, itens.filter(i => cfg?.[tipo]?.[i.id] !== false));
  const ocultos  = itens.filter(i => cfg?.[tipo]?.[i.id] === false);

  const { ordem, arrastando, dragProps } = useDragOrdem(
    visiveis.map(i => i.id),
    (ids) => onSalvar(setOrdem(cfg, tipo, ids)),
    editando,
  );

  const porId = new Map(itens.map(i => [i.id, i]));
  // Durante o arrasto a ordem local manda; fora dele, a ordem salva.
  const naTela = (editando ? ordem : visiveis.map(i => i.id)).map(id => porId.get(id)).filter(Boolean);

  if (!naTela.length && !editando) return null;

  return (
    <>
      <div style={gridStyle}>
        {naTela.map(item => {
          const eu = arrastando === item.id;
          const props = dragProps(item.id);
          const padraoDoItem = typeof tamanhoPadrao === "string"
            ? tamanhoPadrao
            : (tamanhoPadrao?.[item.id] || "m");
          const tam = redimensionavel ? getTamanho(cfg, tipo, item.id, padraoDoItem) : null;
          return (
            <div key={item.id} {...props}
              style={{
                ...item.style,
                ...props.style,
                ...(redimensionavel ? { gridColumn: `span ${isMobile ? spanMobile : escala[tam]}` } : null),
                position: "relative",
                ...(editando ? { cursor: eu ? "grabbing" : "grab" } : null),
                ...(eu ? { opacity: .5, transform: "scale(.97)" } : null),
                transition: "transform .12s, opacity .12s",
              }}>
              {editando && (
                <>
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none",
                    border: `1.5px dashed ${eu ? "var(--accent)" : t.borda}`, zIndex: 2,
                  }} />
                  <button data-nodrag onClick={() => onSalvar(setVisivel(cfg, tipo, item.id, false))}
                    title={`Tirar ${item.label} do painel`}
                    style={{
                      position: "absolute", top: -8, right: -8, zIndex: 3,
                      width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                      background: t.card, border: `1px solid ${t.borda}`, color: t.danger,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}>
                    <Icon n="x" s={12} c={t.danger} sw={2.4} />
                  </button>
                  {redimensionavel && !isMobile && (
                    <div data-nodrag style={{
                      position: "absolute", bottom: -9, left: 8, zIndex: 3, display: "flex", gap: 2,
                      background: t.card, border: `1px solid ${t.borda}`, borderRadius: 6, padding: 1,
                    }}>
                      {Object.keys(escala).map(k => (
                        <button key={k} data-nodrag
                          onClick={() => onSalvar(setTamanho(cfg, tipo, item.id, k))}
                          title={`Largura ${TAMANHO_ROTULO[k]} (${escala[k]} de 12 colunas)`}
                          style={{
                            width: 17, height: 15, borderRadius: 4, cursor: "pointer", border: "none",
                            fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)", padding: 0,
                            background: tam === k ? "var(--accent)" : "transparent",
                            color: tam === k ? "var(--on-primary)" : t.txt2,
                          }}>
                          {TAMANHO_ROTULO[k]}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {item.node}
            </div>
          );
        })}
      </div>

      {editando && gaveta && (
        <GavetaOcultos ocultos={ocultos} tipo={tipo} cfg={cfg} onSalvar={onSalvar} t={t} isMobile={isMobile} />
      )}
    </>
  );
}
