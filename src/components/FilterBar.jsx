import React from "react";
import { Button } from "../design-system/components/Button.jsx";

// FilterBar — barra de filtro padrão (Ano / Mês / Origem / Período + atalhos rápidos).
// Uso: <FilterBar ano={} onAno={} mes={} onMes={} origens={} origem={} onOrigem={}
//                  ini={} onIni={} fim={} onFim={} anos={[]} meses={[]}
//                  count={n} total={n} extra={<...>} />
// `origens` omitido/undefined esconde o select de origem.
// Selecionar Ano/Mês limpa o período (e vice-versa) — são modos alternativos do mesmo filtro.

const MESES_PT = { "01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez" };

const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function rangeHoje() { const d = new Date(); return [iso(d), iso(d)]; }
function rangeAmanha() { const d = new Date(); d.setDate(d.getDate() + 1); return [iso(d), iso(d)]; }
function rangeSemana() {
  const d = new Date(); const dow = (d.getDay() + 6) % 7; // 0 = segunda
  const ini = new Date(d); ini.setDate(d.getDate() - dow);
  const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
  return [iso(ini), iso(fim)];
}
function rangeMes() {
  const d = new Date();
  const ini = new Date(d.getFullYear(), d.getMonth(), 1);
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [iso(ini), iso(fim)];
}

const QUICK = [
  { k: "hoje",   l: "Hoje",        range: rangeHoje },
  { k: "amanha", l: "Amanhã",      range: rangeAmanha },
  { k: "semana", l: "Esta Semana", range: rangeSemana },
  { k: "mes",    l: "Este Mês",    range: rangeMes },
];

export default function FilterBar({
  ano, onAno, meses = [], mes, onMes,
  origens, origem, onOrigem,
  ini, onIni, fim, onFim,
  anos = [],
  quick = true,
  onQuickDate,
  count, total,
  extra,
  className = "",
  style,
}) {
  const temOrigem = Array.isArray(origens);

  const handleAno = v => { onAno(v); onMes(""); onIni(""); onFim(""); };
  const handleMes = v => { onMes(v); onIni(""); onFim(""); };
  const handleIni = v => { onIni(v); onAno(""); onMes(""); };
  const handleFim = v => { onFim(v); onAno(""); onMes(""); };

  const activeQuick = QUICK.find(q => { const [i, f] = q.range(); return i === ini && f === fim; })?.k;

  const handleQuick = k => {
    if (activeQuick === k) { onIni(""); onFim(""); return; }
    const q = QUICK.find(x => x.k === k);
    const [i, f] = q.range();
    onAno(""); onMes(""); onIni(i); onFim(f);
    if (onQuickDate && i === f) onQuickDate(i); // Hoje/Amanhã são dias únicos: também move a Referência
  };

  const handleClear = () => {
    onAno(""); onMes(""); onIni(""); onFim("");
    if (temOrigem) onOrigem("todas");
  };

  const temFiltro = !!(ano || mes || (temOrigem && origem !== "todas") || ini || fim);

  return (
    <div className={`co-filter-bar${className ? ` ${className}` : ""}`} style={style}>
      <span className="co-filter-bar__label">Filtrar:</span>
      <select className={`pv-filter-pill${ano ? " active" : ""}`} value={ano} onChange={e => handleAno(e.target.value)}
        style={{ fontWeight: 700, appearance: "none" }}>
        <option value="">Todos os Anos</option>
        {anos.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select className={`pv-filter-pill${mes ? " active" : ""}`} value={mes} onChange={e => handleMes(e.target.value)}
        style={{ fontWeight: 700, appearance: "none" }}>
        <option value="">Todos os Meses</option>
        {meses.map(m => <option key={m} value={m}>{MESES_PT[m] || m}</option>)}
      </select>
      {temOrigem && (
        <select className={`pv-filter-pill${origem !== "todas" ? " active" : ""}`} value={origem} onChange={e => onOrigem(e.target.value)}
          style={{ fontWeight: 700, appearance: "none", maxWidth: 180 }}>
          <option value="todas">Todas as Origens</option>
          {origens.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {quick && <span className="co-filter-bar__sep" />}
      {quick && QUICK.map(q => (
        <button key={q.k} type="button" className={`pv-filter-pill${activeQuick === q.k ? " active" : ""}`} onClick={() => handleQuick(q.k)}>
          {q.l}
        </button>
      ))}
      <span className="co-filter-bar__sep" />
      <span style={{ fontSize: 9, color: "var(--text3)", flexShrink: 0 }}>período:</span>
      <input type="date" className="ds-input ds-input--sm" value={ini} onChange={e => handleIni(e.target.value)}
        style={{ flex: "1 1 110px", minWidth: 0 }} />
      <span style={{ fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>até</span>
      <input type="date" className="ds-input ds-input--sm" value={fim} onChange={e => handleFim(e.target.value)}
        style={{ flex: "1 1 110px", minWidth: 0 }} />
      {temFiltro && (
        <Button variant="secondary" size="sm" type="button" onClick={handleClear}>
          &#10005; Limpar
        </Button>
      )}
      {extra}
      {count != null && (
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text3)", fontWeight: 600, whiteSpace: "nowrap" }}>
          {count} de {total}
        </span>
      )}
    </div>
  );
}
