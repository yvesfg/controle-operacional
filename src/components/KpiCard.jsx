// src/components/KpiCard.jsx
// Tile de indicador único usado em todos os dashboards do app (Dashboard, Relatórios,
// Painel Financeiro, etc). Mudar aqui propaga para todos — não duplicar este markup.
import React from "react";
import Icon from "./Icon.jsx";
import { clickable } from "../utils.js";

// Sparkline em SVG puro (sem libs) — última barra em destaque, mesmo padrão do modelo de referência.
function Sparkline({ data, compact }) {
  if (!data || data.length < 2) return null;
  const w = compact ? 44 : 56, h = compact ? 20 : 26, gap = 2;
  const barW = (w - gap * (data.length - 1)) / data.length;
  const max = Math.max(...data, 1);
  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      {data.map((v, i) => {
        const barH = Math.max(2, (v / max) * h);
        const isLast = i === data.length - 1;
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={1}
            fill={isLast ? "var(--color-primary)" : "var(--text3)"}
            opacity={isLast ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}

export default function KpiCard({
  label,
  value,
  sub,
  color,
  danger = false,
  icon,
  iconTint,   // cor do sistema p/ realçar o ícone num badge (opt-in; sem ela, ícone flutua discreto)
  onClick,
  compact = false,
  trend,        // number[] opcional — histórico curto p/ sparkline (ex.: últimos 6 meses)
  deltaPct,     // number opcional — variação % vs período anterior (+/-)
  deltaLabel,   // string opcional — texto ao lado do delta (default: "vs período anterior")
}) {
  return (
    <div
      {...clickable(onClick)}
      style={{
        position:     "relative",
        // Coluna flex de altura cheia: numa faixa de KPIs os cards têm conteúdo
        // de tamanhos diferentes (uns têm sub, outros têm delta) e sem isso a
        // faixa fica com cards visivelmente desalinhados.
        display:      "flex",
        flexDirection:"column",
        height:       "100%",
        boxSizing:    "border-box",
        background:   danger ? "color-mix(in srgb, var(--red) 5%, var(--card))" : "var(--card)",
        border:       danger ? "1.5px solid color-mix(in srgb, var(--red) 45%, transparent)" : "1px solid var(--border)",
        borderRadius: compact ? 8 : "var(--radius-card)",
        padding:      compact ? "14px" : "16px 18px",
        cursor:       onClick ? "pointer" : "default",
        transition:   "border-color .15s",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = danger ? "var(--red)" : "var(--border2)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = danger ? "color-mix(in srgb, var(--red) 45%, transparent)" : "var(--border)")}
    >
      {icon ? (iconTint ? (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: compact ? 26 : 30, height: compact ? 26 : 30,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 8,
          background: `color-mix(in srgb, ${iconTint} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${iconTint} 32%, transparent)`,
        }}>
          {icon}
        </div>
      ) : (
        <div style={{ position: "absolute", top: 10, right: 10, opacity: 0.5 }}>
          {icon}
        </div>
      )) : trend && (
        <div style={{ position: "absolute", top: compact ? 12 : 16, right: compact ? 12 : 16 }}>
          <Sparkline data={trend} compact={compact} />
        </div>
      )}
      <div style={{
        fontFamily:    "var(--font-mono)",
        fontSize:      compact ? 10 : 11,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color:         "var(--text3)",
        fontWeight:    400,
        lineHeight:    1.4,
        paddingRight:  icon ? (iconTint ? 38 : 20) : (trend ? (compact ? 50 : 62) : 0),
        marginBottom:  compact ? 3 : 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily:    "var(--font-heading)",
        fontSize:      compact ? 18 : 28,
        fontWeight:    700,
        letterSpacing: "-0.04em",
        color:         danger ? "var(--red)" : (color || "var(--text)"),
        lineHeight:    1,
        marginBottom:  2,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: compact ? 10 : 12, color: "var(--text2)", lineHeight: 1.3 }}>
          {sub}
        </div>
      )}
      {deltaPct != null && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          // `auto` gruda a variação no rodapé do card: com alturas iguais, as
          // linhas de delta da faixa inteira ficam na mesma régua.
          marginTop: "auto", paddingTop: compact ? 4 : 8,
          fontSize: compact ? 10 : 11,
          fontFamily: "var(--font-mono)",
          color: deltaPct >= 0 ? "var(--color-success)" : "var(--color-danger)",
        }}>
          <span><Icon n={deltaPct >= 0 ? "arrow-up" : "arrow-down"} s={11} /> {Math.abs(deltaPct).toFixed(0)}%</span>
          <span style={{ color: "var(--text3)" }}>{deltaLabel || "vs período anterior"}</span>
        </div>
      )}
    </div>
  );
}
