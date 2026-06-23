/**
 * PlanilhaView.jsx — View de Planilha extraída do App.jsx
 * Props: ctx = { DADOS, planilhaSortKey, setPlanilhaSortKey, planilhaSortDir, setPlanilhaSortDir,
 *                planilhaPagina, setPlanilhaPagina, abrirDetalhe,
 *                planilhaFiltroAno, setPlanilhaFiltroAno, planilhaFiltroMes, setPlanilhaFiltroMes,
 *                planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
 *                t, isMobile, ExportMenu }
 */
import React from "react";

const MESES_PT = { "01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez" };
const REGISTROS_POR_PAGINA = 200;

const COLS = [
  {h:"DT",        k:"dt",         w:"11%"},
  {h:"Motorista", k:"nome",        w:"18%"},
  {h:"Placa",     k:"placa",       w:"11%"},
  {h:"Origem",    k:"origem",      w:"13%"},
  {h:"Destino",   k:"destino",     w:"13%"},
  {h:"Carreg.",   k:"data_carr",   w:"11%"},
  {h:"Agenda",    k:"data_agenda", w:"11%"},
  {h:"Desc.",     k:"data_desc",   w:"11%"},
  {h:"Status",    k:"status",      w:"11%"},
];

// Colunas exclusivas AVB (acailandia_avb)
const COLS_AVB = [
  {h:"Cód.",       k:"codigo",        w:"7%"},
  {h:"Carreg.",    k:"data_carr",     w:"8%"},
  {h:"Contratante",k:"contratante",   w:"14%"},
  {h:"Cliente",    k:"cliente",       w:"13%"},
  {h:"Motorista",  k:"nome",          w:"13%"},
  {h:"Placas",     k:"placa",         w:"9%"},
  {h:"Origem",     k:"origem",        w:"9%"},
  {h:"Destino",    k:"destino",       w:"9%"},
  {h:"Status",     k:"status",        w:"7%"},
  {h:"Gerenc.",    k:"gerenciadora",  w:"7%"},
  {h:"Contrato",   k:"vl_contrato",   w:"8%"},
  {h:"ADT",        k:"adiant",        w:"7%"},
  {h:"Saldo",      k:"saldo",         w:"6%"},
  {h:"CTE",        k:"cte",           w:"6%"},
  {h:"MDF",        k:"mdf",           w:"6%"},
];

function toISO(d) {
  if (!d) return "";
  const s = String(d).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return s;
}

function parseYMfilt(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) { const p = str.split("/"); return { ano: p[2], mes: p[1] }; }
  if (/^\d{4}-\d{2}-\d{2}/.test(str))   { const p = str.split("-"); return { ano: p[0], mes: p[1] }; }
  return null;
}

// AVB: extrai ano/mes tentando varios campos de data do registro
function parseYMfiltAvb(r) {
  const campos = [r.data_carr, r.data_homerico, r.data_manifesto, r.data_liberacao];
  for (const c of campos) {
    const ym = parseYMfilt(c);
    if (ym) return ym;
  }
  return null;
}

// ── Glass helpers ────────────────────────────────────────────────────────────
function usePvExpanded() {
  const [expanded, setExpanded] = React.useState(() => new Set());
  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  return [expanded, toggle];
}

function PvBadge({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "pv-badge pv-badge-default";
  if (s.includes("ok") || s.includes("concluí") || s.includes("normal")) cls = "pv-badge pv-badge-ok";
  else if (s.includes("pend") || s.includes("aguard")) cls = "pv-badge pv-badge-pend";
  else if (s.includes("atraso") || s.includes("atrasad")) cls = "pv-badge pv-badge-atraso";
  else if (s.includes("trânsito") || s.includes("transito") || s.includes("viagem")) cls = "pv-badge pv-badge-transito";
  return <span className={cls}>● {status || "—"}</span>;
}

function fmtR(v) {
  const n = parseFloat(String(v || "0").replace(/\./g,"").replace(",","."));
  if (isNaN(n)) return "—";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calcMargem(row) {
  const cte = parseFloat(String(row.vl_cte || row.cte || 0).replace(/\./g,"").replace(",",".")) || 0;
  const cont = parseFloat(String(row.vl_contrato || row.contrato || 0).replace(/\./g,"").replace(",",".")) || 0;
  if (!cte && !cont) return null;
  return cte - cont;
}

export default function PlanilhaView({ ctx }) {
  const {
    DADOS,
    planilhaSortKey, setPlanilhaSortKey,
    planilhaSortDir, setPlanilhaSortDir,
    planilhaPagina, setPlanilhaPagina,
    abrirDetalhe,
    planilhaFiltroAno, setPlanilhaFiltroAno,
    planilhaFiltroMes, setPlanilhaFiltroMes,
    planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
    planilhaFiltroDataDe, setPlanilhaFiltroDataDe,
    planilhaFiltroDataAte, setPlanilhaFiltroDataAte,
    planilhaBusca, setPlanilhaBusca,
    planilhaFiltroStatus, setPlanilhaFiltroStatus,
    t, isMobile,
    ExportMenu,
    baseAtual,
    planilhaFiltroContratante, setPlanilhaFiltroContratante,
    planilhaFiltroGerenciadora, setPlanilhaFiltroGerenciadora,
  } = ctx;

  // ── Filtros disponíveis ──────────────────────────────────────────────────
  const isAvb = baseAtual?.id === "acailandia_avb";
  const activeCols = isAvb ? COLS_AVB : COLS;
  const anosDisp = [...new Set(DADOS.map(r => {
    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");
    return ym?.ano;
  }).filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const mesesDisp = [...new Set(DADOS.filter(r => {
    if (!planilhaFiltroAno) return true;
    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");
    return ym?.ano === planilhaFiltroAno;
  }).map(r => {
    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");
    return ym?.mes;
  }).filter(Boolean))].sort();

  const origensDisp = [...new Set(DADOS.map(r => (r.origem || "").trim()).filter(Boolean))].sort();

  // ── Filtro e ordenação ────────────────────────────────────────────────────
  const dadosFiltrados = DADOS.filter(r => {
    const ym = isAvb ? parseYMfiltAvb(r) : parseYMfilt(r.data_carr || r.data_desc || "");
    if (planilhaFiltroAno   && ym?.ano !== planilhaFiltroAno)   return false;
    if (planilhaFiltroMes   && ym?.mes !== planilhaFiltroMes)   return false;
    if (planilhaFiltroOrigem && planilhaFiltroOrigem !== "todas"
        && (r.origem || "").trim() !== planilhaFiltroOrigem)    return false;
    if (planilhaFiltroDataDe && toISO(r.data_carr||r.data_agenda||"") < planilhaFiltroDataDe) return false;
    if (planilhaFiltroDataAte && toISO(r.data_carr||r.data_agenda||"") > planilhaFiltroDataAte) return false;
    // Filtros exclusivos AVB
    if (isAvb && planilhaFiltroContratante && (r.contratante||"").trim() !== planilhaFiltroContratante) return false;
    if (isAvb && planilhaFiltroGerenciadora && (r.gerenciadora||"").trim() !== planilhaFiltroGerenciadora) return false;
    if (planilhaBusca) {
      const q = planilhaBusca.trim().toLowerCase();
      const matchBase = (r.dt||"").toLowerCase().includes(q)
        || (r.placa||"").toLowerCase().includes(q)
        || (r.nome||"").toLowerCase().includes(q);
      // AVB: busca expandida
      const matchAvb = isAvb && (
        (r.codigo||"").toLowerCase().includes(q)
        || (r.cte||"").toLowerCase().includes(q)
        || (r.mdf||"").toLowerCase().includes(q)
        || (r.nf||"").toLowerCase().includes(q)
        || (r.cliente||"").toLowerCase().includes(q)
        || (r.contratante||"").toLowerCase().includes(q)
        || (r.gerenciadora||"").toLowerCase().includes(q)
        || (r.placa2||"").toLowerCase().includes(q)
      );
      if (!matchBase && !matchAvb) return false;
    }
    if (planilhaFiltroStatus) {
      const s = (r.status||"Sem Status");
      if (s !== planilhaFiltroStatus) return false;
    }
    return true;
  });

  const dadosSortados = planilhaSortKey
    ? [...dadosFiltrados].sort((a, b) => {
        const va = (a[planilhaSortKey] || "").toString().toLowerCase();
        const vb = (b[planilhaSortKey] || "").toString().toLowerCase();
        const isDate = /^\d{2}\/\d{2}\/\d{4}/.test(va) || /^\d{2}\/\d{2}\/\d{4}/.test(vb);
        if (isDate) {
          const toYMD = s => { if (!s) return ""; const p = s.split("/"); return p.length === 3 ? `${p[2]}${p[1]}${p[0]}` : s; };
          return planilhaSortDir === "asc" ? toYMD(va).localeCompare(toYMD(vb)) : toYMD(vb).localeCompare(toYMD(va));
        }
        return planilhaSortDir === "asc" ? va.localeCompare(vb, "pt-BR", { numeric: true }) : vb.localeCompare(va, "pt-BR", { numeric: true });
      })
    : dadosFiltrados;

  const totalPaginas = Math.ceil(dadosSortados.length / REGISTROS_POR_PAGINA);
  const paginaAtual  = Math.max(1, Math.min(planilhaPagina, totalPaginas || 1));
  const inicio       = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
  const dadosExibir  = dadosSortados.slice(inicio, inicio + REGISTROS_POR_PAGINA);

  const [pvExpanded, pvToggle] = usePvExpanded();

  const totalViagens = dadosFiltrados.length;
  const totalMargem = dadosFiltrados.reduce((acc, r) => { const m = calcMargem(r); return acc + (m || 0); }, 0);
  const pendentes = dadosFiltrados.filter(r => { const s = (r.status || "").toLowerCase(); return s.includes("pend") || s.includes("aguard") || s.includes("atraso"); }).length;
  const handleEditar = (row, e) => { e.stopPropagation(); if (abrirDetalhe) abrirDetalhe(row); };

  const toggleSort = k => {
    if (planilhaSortKey === k) {
      setPlanilhaSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setPlanilhaSortKey(k);
      setPlanilhaSortDir("asc");
    }
  };

  const temFiltro = planilhaFiltroAno || planilhaFiltroMes || planilhaFiltroOrigem !== "todas" || planilhaFiltroDataDe || planilhaFiltroDataAte || planilhaBusca || planilhaFiltroStatus;

  return (
    <div className="pv-shell">
      {/* ── Toolbar ── */}
      <div className="pv-toolbar">
        {baseAtual && (
          <span className="pv-filter-pill active">{baseAtual.nome || baseAtual.label || baseAtual.id} ▾</span>
        )}
        <select
          className="pv-filter-pill"
          value={planilhaFiltroAno || ""}
          onChange={e => { setPlanilhaFiltroAno(e.target.value); setPlanilhaPagina(1); }}
          style={{ appearance: "none", cursor: "pointer" }}
        >
          <option value="">Todos os anos</option>
          {anosDisp.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="pv-filter-pill"
          value={planilhaFiltroMes || ""}
          onChange={e => { setPlanilhaFiltroMes(e.target.value); setPlanilhaPagina(1); }}
          style={{ appearance: "none", cursor: "pointer" }}
        >
          <option value="">Todos os meses</option>
          {mesesDisp.map(m => <option key={m} value={m}>{MESES_PT[m] || m}</option>)}
        </select>
        <select
          className="pv-filter-pill"
          value={planilhaFiltroOrigem || "todas"}
          onChange={e => { setPlanilhaFiltroOrigem(e.target.value); setPlanilhaPagina(1); }}
          style={{ appearance: "none", cursor: "pointer" }}
        >
          <option value="todas">Todas as origens</option>
          {origensDisp.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {isAvb && (() => {
          const contrats = [...new Set(DADOS.map(r=>(r.contratante||"").trim()).filter(Boolean))].sort();
          const gerenc   = [...new Set(DADOS.map(r=>(r.gerenciadora||"").trim()).filter(Boolean))].sort();
          return (<>
            <select className="pv-filter-pill" value={planilhaFiltroContratante||""} onChange={e=>{setPlanilhaFiltroContratante(e.target.value);setPlanilhaPagina(1);}} style={{appearance:"none",cursor:"pointer"}}>
              <option value="">Contratante: Todos</option>
              {contrats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select className="pv-filter-pill" value={planilhaFiltroGerenciadora||""} onChange={e=>{setPlanilhaFiltroGerenciadora(e.target.value);setPlanilhaPagina(1);}} style={{appearance:"none",cursor:"pointer"}}>
              <option value="">Gerenc.: Todas</option>
              {gerenc.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </>);
        })()}
        <input
          type="text"
          placeholder="Buscar..."
          value={planilhaBusca}
          onChange={e => { setPlanilhaBusca(e.target.value); setPlanilhaPagina(1); }}
          className="pv-filter-pill"
          style={{ minWidth: 140, outline: "none" }}
        />
        {planilhaFiltroStatus && (
          <span className="pv-filter-pill active" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Status: {planilhaFiltroStatus}
            <button onClick={() => { setPlanilhaFiltroStatus(""); setPlanilhaPagina(1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 11, padding: 0, marginLeft: 2 }}>×</button>
          </span>
        )}
        {temFiltro && (
          <button className="pv-filter-pill" onClick={() => { setPlanilhaFiltroAno(""); setPlanilhaFiltroMes(""); setPlanilhaFiltroOrigem("todas"); setPlanilhaFiltroDataDe(""); setPlanilhaFiltroDataAte(""); setPlanilhaBusca(""); setPlanilhaFiltroStatus(""); if(setPlanilhaFiltroContratante)setPlanilhaFiltroContratante(""); if(setPlanilhaFiltroGerenciadora)setPlanilhaFiltroGerenciadora(""); setPlanilhaPagina(1); }}>
            ✕ Limpar
          </button>
        )}
        {ExportMenu && (
          <ExportMenu
            dados={dadosFiltrados}
            cols={[
              {k:"dt",l:"DT"},{k:"nome",l:"Motorista"},{k:"cpf",l:"CPF"},{k:"placa",l:"Placa"},
              {k:"origem",l:"Origem"},{k:"destino",l:"Destino"},{k:"data_carr",l:"Carregamento"},
              {k:"data_agenda",l:"Agenda"},{k:"data_desc",l:"Descarga"},{k:"status",l:"Status"},
              {k:"vl_cte",l:"VL CTE"},{k:"vl_contrato",l:"VL Contrato"},{k:"cte",l:"CTE"},{k:"mdf",l:"MDF"},
            ]}
            filename="planilha-operacional"
            titulo="Planilha Operacional"
          />
        )}
        <div className="pv-spacer" />
      </div>

      {/* ── KPI strip ── */}
      <div className="pv-kpi-strip">
        <div className="pv-kpi-chip">
          <span className="pv-kpi-value" style={{ color: "var(--color-info)" }}>{totalViagens}</span>
          <span className="pv-kpi-label">viagens</span>
        </div>
        <div className="pv-kpi-chip">
          <span className="pv-kpi-value" style={{ color: totalMargem >= 0 ? "var(--green)" : "var(--red)" }}>{fmtR(totalMargem)}</span>
          <span className="pv-kpi-label">margem total</span>
        </div>
        <div className="pv-kpi-chip">
          <span className="pv-kpi-value" style={{ color: pendentes > 0 ? "var(--red)" : "var(--green)" }}>{pendentes}</span>
          <span className="pv-kpi-label">pendentes/atraso</span>
        </div>
        <div className="pv-kpi-chip">
          <span className="pv-kpi-value" style={{ color: "var(--accent)" }}>{dadosExibir.length}</span>
          <span className="pv-kpi-label">nesta página</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text2)", fontWeight: 600 }}>
          {dadosFiltrados.length} de {DADOS.length} registros · pág. {paginaAtual}/{totalPaginas}
          {planilhaSortKey && (
            <span style={{ color: "var(--accent)", marginLeft: 8 }}>
              ord. por {planilhaSortKey} {planilhaSortDir === "asc" ? "↑" : "↓"}
              <button onClick={() => { setPlanilhaSortKey(null); setPlanilhaSortDir("asc"); }} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 10, padding: "0 3px" }}>✕</button>
            </span>
          )}
        </span>
      </div>

      {/* ── Cards ── */}
      <div className="pv-table-wrap">
        <div className="pv-table-header">
          <div className="pv-th" style={{ flex: "1.2" }}>Código</div>
          <div className="pv-th" style={{ flex: "2" }}>Motorista</div>
          <div className="pv-th" style={{ flex: "2" }}>Rota</div>
          <div className="pv-th" style={{ flex: "1.2" }}>Status</div>
          <div className="pv-th" style={{ flex: "1.2" }}>Margem</div>
          <div className="pv-th" style={{ width: 28 }}></div>
        </div>

        <div className="pv-rows">
          {dadosExibir.map((row, i) => {
            const rowId = row.id || row.codigo || i;
            const isExp = pvExpanded.has(rowId);
            const margem = calcMargem(row);
            const margemColor = margem == null ? "inherit" : margem >= 0 ? "var(--green)" : "var(--red)";
            const rota = [row.origem, row.destino].filter(Boolean).join(" → ") || "—";
            return (
              <div key={rowId} className={`pv-row-card${isExp ? " expanded" : ""}`}>
                <div className="pv-row-main" onClick={() => pvToggle(rowId)}>
                  <div style={{ flex: "1.2", fontSize: 11, color: "var(--color-info)", fontFamily: "var(--font-mono)" }}>
                    {row.codigo || row.dt || row.id || `#${i+1}`}
                  </div>
                  <div style={{ flex: 2, fontSize: 11, color: "var(--text)" }}>
                    {row.nome || row.motorista || "—"}
                  </div>
                  <div style={{ flex: 2, fontSize: 10, color: "var(--text3)" }}>{rota}</div>
                  <div style={{ flex: "1.2" }}><PvBadge status={row.status} /></div>
                  <div style={{ flex: "1.2", fontSize: 11, fontWeight: 600, color: margemColor }}>
                    {margem != null ? fmtR(margem) : "—"}
                  </div>
                  <div className="pv-toggle" style={{ width: 28, textAlign: "center" }}>
                    {isExp ? "▴" : "▾"}
                  </div>
                </div>
                <div className="pv-row-detail">
                  {row.placa && <div className="pv-detail-chip"><div className="dc-label">Placa</div><div className="dc-val">{isAvb ? [row.placa,row.placa2,row.placa3].filter(Boolean).join(" / ") : row.placa}</div></div>}
                  {(row.vl_cte || row.cte) && <div className="pv-detail-chip"><div className="dc-label">CTE</div><div className="dc-val">{fmtR(row.vl_cte || row.cte)}</div></div>}
                  {(row.vl_contrato || row.contrato) && <div className="pv-detail-chip"><div className="dc-label">Contrato</div><div className="dc-val">{fmtR(row.vl_contrato || row.contrato)}</div></div>}
                  {row.data_carr && <div className="pv-detail-chip"><div className="dc-label">Carreg.</div><div className="dc-val">{row.data_carr}</div></div>}
                  {(row.data_desc || row.data_final) && <div className="pv-detail-chip"><div className="dc-label">Descarga</div><div className="dc-val">{row.data_desc || row.data_final}</div></div>}
                  {row.contratante && <div className="pv-detail-chip"><div className="dc-label">Contratante</div><div className="dc-val">{row.contratante}</div></div>}
                  {row.gerenciadora && <div className="pv-detail-chip"><div className="dc-label">Gerenc.</div><div className="dc-val">{row.gerenciadora}</div></div>}
                  {row.mdf && <div className="pv-detail-chip"><div className="dc-label">MDF</div><div className="dc-val">{row.mdf}</div></div>}
                  <div className="pv-detail-actions">
                    {abrirDetalhe && (
                      <button className="pv-btn-action primary" onClick={e => handleEditar(row, e)}>Editar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {dadosExibir.length === 0 && (
            <div style={{ padding: "40px 14px", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
              Nenhum registro encontrado
            </div>
          )}
        </div>

        {dadosFiltrados.length > REGISTROS_POR_PAGINA && (
          <div className="pv-pagination">
            <button className="pv-page-btn" disabled={paginaAtual <= 1} onClick={() => setPlanilhaPagina(1)}>⏮</button>
            <button className="pv-page-btn" disabled={paginaAtual <= 1} onClick={() => setPlanilhaPagina(p => Math.max(1, p - 1))}>← Ant</button>
            <span>Pág {paginaAtual} / {totalPaginas}</span>
            <button className="pv-page-btn" disabled={paginaAtual >= totalPaginas} onClick={() => setPlanilhaPagina(p => Math.min(totalPaginas, p + 1))}>Próx →</button>
            <button className="pv-page-btn" disabled={paginaAtual >= totalPaginas} onClick={() => setPlanilhaPagina(totalPaginas)}>⏭</button>
            <div className="pv-spacer" />
            <span>{dadosFiltrados.length} registros</span>
          </div>
        )}
      </div>
    </div>
  );
}
