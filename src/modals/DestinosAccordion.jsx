// src/modals/DestinosAccordion.jsx
// Lista TODOS os destinos do período, cada um colapsável com os motoristas que
// rodaram a rota. Usado pelo ModalDashDrill (type "destinos"), aberto ao clicar
// em qualquer linha do bloco "Top Destinos" do Dashboard.
import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import { clickable } from "../utils.js";
import Icon from "../components/Icon.jsx";

const cap = (s) => (s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const primeiroNome = (n) => (n || "").split(" ").filter(Boolean).slice(0, 2).join(" ");

export default function DestinosAccordion({ regs, destaque, t, isMobile, onMotorista, onPlanilha }) {
  const [abertos, setAbertos] = React.useState(() => new Set(destaque ? [destaque] : []));
  const toggle = (d) => setAbertos((prev) => {
    const n = new Set(prev);
    if (n.has(d)) n.delete(d); else n.add(d);
    return n;
  });

  const destinos = React.useMemo(() => {
    const map = {};
    regs.forEach((r) => {
      if (!r.destino) return;
      const d = r.destino.trim().toUpperCase();
      if (!map[d]) map[d] = { total: 0, bases: {}, mots: {} };
      map[d].total++;
      if (r._baseLabel) map[d].bases[r._baseLabel] = (map[d].bases[r._baseLabel] || 0) + 1;
      if (r.nome) {
        if (!map[d].mots[r.nome]) map[d].mots[r.nome] = { count: 0, dts: [], placa: r.placa || "" };
        map[d].mots[r.nome].count++;
        if (r.dt) map[d].mots[r.nome].dts.push(r.dt);
        if (!map[d].mots[r.nome].placa && r.placa) map[d].mots[r.nome].placa = r.placa;
      }
    });
    return Object.entries(map)
      .map(([dest, info]) => ({
        dest,
        total: info.total,
        bases: Object.entries(info.bases).sort((a, b) => b[1] - a[1]),
        mots: Object.entries(info.mots).sort((a, b) => b[1].count - a[1].count),
      }))
      .sort((a, b) => b.total - a.total);
  }, [regs]);

  const max = destinos[0]?.total || 1;

  if (!destinos.length) {
    return <div style={{ textAlign: "center", color: t.txt2, fontSize: 12, padding: 20 }}>Nenhum destino no período.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {destinos.map(({ dest, total, bases, mots }, i) => {
        const aberto = abertos.has(dest);
        const partes = dest.split(/\s*[-–,]\s*/);
        const cidade = cap(partes[0].trim());
        const uf = (partes[1] || "").trim();
        const pct = Math.round((total / max) * 100);
        return (
          <div key={dest} style={{
            background: t.card2, border: `1px solid ${aberto ? "var(--accent)" : t.borda}`,
            borderRadius: 12, overflow: "hidden", transition: "border-color .15s",
          }}>
            {/* Cabeçalho do destino */}
            <div {...clickable(() => toggle(dest))} aria-expanded={aberto}
              style={{ padding: isMobile ? "12px 12px" : "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, color: t.ouro,
                minWidth: 18, textAlign: "center", flexShrink: 0,
              }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Icon n="map-pin" s={12} c={t.txt2} />
                  <span style={{ fontSize: isMobile ? 13 : 12, fontWeight: 700, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cidade}{uf ? ` - ${uf}` : ""}
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: t.bg, overflow: "hidden", marginBottom: bases.length ? 4 : 0 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: t.ouro, borderRadius: 2 }} />
                </div>
                {bases.length > 0 && (
                  <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bases.slice(0, 2).map(([b, n]) => `${b} ${n}`).join(" · ")}{bases.length > 2 ? ` · +${bases.length - 2}` : ""}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, color: t.txt, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{total}</div>
                <div style={{ fontSize: 8, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>viagens</div>
              </div>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={aberto ? t.ouro : "var(--text3)"} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transform: aberto ? "rotate(90deg)" : "none", transition: "transform .18s" }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {/* Motoristas da rota */}
            {aberto && (
              <div style={{ borderTop: `1px solid ${t.borda}`, background: t.bg, padding: isMobile ? 10 : 12, animation: "fadeIn .18s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)" }}>
                    {mots.length} motorista{mots.length !== 1 ? "s" : ""}
                  </span>
                  {onPlanilha && (
                    <Button variant="secondary" size="sm" onClick={() => onPlanilha(dest)}>
                      Ver na planilha ›
                    </Button>
                  )}
                </div>
                {mots.length === 0 ? (
                  <div style={{ fontSize: 11, color: t.txt2, padding: "6px 2px" }}>Sem motorista informado nestas cargas.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 7 }}>
                    {mots.map(([nome, { count, dts, placa }]) => (
                      <div key={nome} {...clickable(onMotorista ? () => onMotorista(nome, dest) : undefined)}
                        title={onMotorista ? `Histórico de ${nome}` : undefined}
                        style={{
                          background: t.card2, border: `1px solid ${t.borda}`, borderRadius: 10,
                          padding: isMobile ? "10px 10px" : "8px 10px", display: "flex", alignItems: "center", gap: 9,
                          cursor: onMotorista ? "pointer" : "default", minHeight: 44, transition: "background .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = t.card2; }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", background: "var(--accent2)",
                          border: "1.5px solid var(--accent2)", display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, fontSize: 12, color: t.ouro, flexShrink: 0,
                        }}>{nome.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: t.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {cap(primeiroNome(nome))}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                            {placa ? `${placa} · ` : ""}{dts.slice(0, 2).join(", ")}{dts.length > 2 ? ` +${dts.length - 2}` : ""}
                          </div>
                        </div>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, color: t.ouro, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
