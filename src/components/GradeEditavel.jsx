import React from "react";
import { useDragOrdem } from "../hooks/useDragOrdem.js";
import { ordenar, setOrdem, setVisivel } from "../dashboardConfig.js";
import Icon from "./Icon.jsx";

// Grade de cards do Dashboard que o próprio usuário organiza: arrasta pra
// reordenar, ✕ tira da tela, e o que saiu volta pela gaveta de baixo.
// O layout vive em config.dash (hub_user_modulos) — ver dashboardConfig.js.
//
// `itens`: [{ id, label, node }] — só os que EXISTEM no contexto atual (um KPI
// financeiro não deve aparecer na gaveta de quem não vê valores).
export default function GradeEditavel({
  itens, tipo, cfg, editando, onSalvar, gridStyle, t, isMobile,
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
          return (
            <div key={item.id} {...dragProps(item.id)}
              style={{
                position: "relative",
                ...(editando ? { cursor: "grab", touchAction: "none" } : null),
                ...(eu ? { opacity: .5, transform: "scale(.97)", cursor: "grabbing" } : null),
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
                </>
              )}
              {item.node}
            </div>
          );
        })}
      </div>

      {editando && (
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
          padding: isMobile ? 10 : "10px 12px", marginBottom: 14, borderRadius: 12,
          background: t.card2, border: `1px dashed ${t.borda}`,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)", marginRight: 2 }}>
            {ocultos.length ? "Fora do painel" : "Arraste os cards para reordenar"}
          </span>
          {ocultos.map(o => (
            <button key={o.id} onClick={() => onSalvar(setVisivel(cfg, tipo, o.id, true))}
              title={`Colocar ${o.label} de volta`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer",
                background: "transparent", border: `1px solid ${t.borda}`, borderRadius: 8,
                color: t.txt2, fontSize: 11, fontFamily: "inherit",
                padding: isMobile ? "10px 12px" : "6px 10px",
              }}>
              <span style={{ color: t.ouro, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>+</span> {o.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
