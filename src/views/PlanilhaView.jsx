/**
 * PlanilhaView.jsx — View de Planilha extraída do App.jsx
 * Props: ctx = { DADOS, planilhaSortKey, setPlanilhaSortKey, planilhaSortDir, setPlanilhaSortDir,
 *                planilhaPagina, setPlanilhaPagina, abrirDetalhe,
 *                planilhaFiltroAno, setPlanilhaFiltroAno, planilhaFiltroMes, setPlanilhaFiltroMes,
 *                planilhaFiltroOrigem, setPlanilhaFiltroOrigem,
 *                t, isMobile, ExportMenu }
 */
import React from "react";
import { Button } from "../design-system/components/Button.jsx";
import Icon from "../components/Icon.jsx";
import { getPerfil } from "../operacao/perfil.js";
import { parseValorBR } from "../utils.js";

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
  return <span className={cls}><Icon n="dot" s={13} /> {status || "—"}</span>;
}

// Antes assumia formato BR sempre (stripava TODO ponto como milhar); ~489 linhas no banco
// vieram do Sheets como número "cru" (célula não-texto), gravadas pelo sync com ponto
// decimal americano ("12341.85") em vez de vírgula — stripar aquele ponto único inflava o
// valor ~100x-1000x (ex.: saldo "3702.5599999999995" virava 37 quatrilhões). parseValorBR
// (utils.js) reconhece as duas grafias. Ver SyncSupabase.gs pro fix na origem.
function fmtR(v) {
  const n = parseValorBR(v);
  if (!v && n === 0) return "—";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calcMargem(row) {
  const cte = parseValorBR(row.vl_cte || row.cte);
  const cont = parseValorBR(row.vl_contrato || row.contrato);
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
    planilhaFiltroDestino, setPlanilhaFiltroDestino,
    t, isMobile,
    ExportMenu,
    baseAtual,
    setPlanilhaFiltroContratante,
    setPlanilhaFiltroGerenciadora,
  } = ctx;

  // ── Filtros disponíveis ──────────────────────────────────────────────────
  const activeCols = COLS;
  // Classificador da operacao (ex.: papel x celulose; padrao x exportacao). O chip so
  // aparece no valor NAO-padrao — marcar toda linha com o valor comum seria ruido.
  const clf = getPerfil(baseAtual?.id).classificador;
  const rotuloClf = (row) => {
    if (!clf) return null;
    const v = row[clf.campo];
    if (!v || v === clf.padrao) return null;
    return (clf.valores.find((o) => o.valor === v) || {}).label || v;
  };
  const anosDisp = [...new Set(DADOS.map(r => {
    const ym = parseYMfilt(r.data_carr || r.data_desc || "");
    return ym?.ano;
  }).filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const mesesDisp = [...new Set(DADOS.filter(r => {
    if (!planilhaFiltroAno) return true;
    const ym = parseYMfilt(r.data_carr || r.data_desc || "");
    return ym?.ano === planilhaFiltroAno;
  }).map(r => {
    const ym = parseYMfilt(r.data_carr || r.data_desc || "");
    return ym?.mes;
  }).filter(Boolean))].sort();

  const origensDisp = [...new Set(DADOS.map(r => (r.origem || "").trim()).filter(Boolean))].sort();

  // ── Filtro e ordenação ────────────────────────────────────────────────────
  const dadosFiltrados = DADOS.filter(r => {
    const ym = parseYMfilt(r.data_carr || r.data_desc || "");
    if (planilhaFiltroAno   && ym?.ano !== planilhaFiltroAno)   return false;
    if (planilhaFiltroMes   && ym?.mes !== planilhaFiltroMes)   return false;
    if (planilhaFiltroOrigem && planilhaFiltroOrigem !== "todas"
        && (r.origem || "").trim() !== planilhaFiltroOrigem)    return false;
    if (planilhaFiltroDataDe && toISO(r.data_carr||r.data_agenda||"") < planilhaFiltroDataDe) return false;
    if (planilhaFiltroDataAte && toISO(r.data_carr||r.data_agenda||"") > planilhaFiltroDataAte) return false;
    if (planilhaBusca) {
      const q = planilhaBusca.trim().toLowerCase();
      const matchBase = (r.dt||"").toLowerCase().includes(q)
        || (r.placa||"").toLowerCase().includes(q)
        || (r.nome||"").toLowerCase().includes(q);
      if (!matchBase) return false;
    }
    if (planilhaFiltroStatus) {
      const s = (r.status||"Sem Status");
      if (s !== planilhaFiltroStatus) return false;
    }
    if (planilhaFiltroDestino && (r.destino||"").trim().toUpperCase() !== planilhaFiltroDestino) return false;
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

  const temFiltro = planilhaFiltroAno || planilhaFiltroMes || planilhaFiltroOrigem !== "todas" || planilhaFiltroDataDe || planilhaFiltroDataAte || planilhaBusca || planilhaFiltroStatus || planilhaFiltroDestino;

  return (
    <div className="pv-shell">
      {/* ── Toolbar ── */}
      <div className="pv-toolbar">
        {baseAtual && (
          <span className="pv-filter-pill active">{baseAtual.nome || baseAtual.label || baseAtual.id} <Icon n="chevron-down" s={13} /></span>
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
            <Button variant="ghost" size="sm" onClick={() => { setPlanilhaFiltroStatus(""); setPlanilhaPagina(1); }} style={{ marginLeft: 2 }}>×</Button>
          </span>
        )}
        {planilhaFiltroDestino && (
          <span className="pv-filter-pill active" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Destino: {planilhaFiltroDestino}
            <Button variant="ghost" size="sm" onClick={() => { setPlanilhaFiltroDestino(""); setPlanilhaPagina(1); }} style={{ marginLeft: 2 }}>×</Button>
          </span>
        )}
        {temFiltro && (
          <button className="pv-filter-pill" onClick={() => { setPlanilhaFiltroAno(""); setPlanilhaFiltroMes(""); setPlanilhaFiltroOrigem("todas"); setPlanilhaFiltroDataDe(""); setPlanilhaFiltroDataAte(""); setPlanilhaBusca(""); setPlanilhaFiltroStatus(""); setPlanilhaFiltroDestino(""); if(setPlanilhaFiltroContratante)setPlanilhaFiltroContratante(""); if(setPlanilhaFiltroGerenciadora)setPlanilhaFiltroGerenciadora(""); setPlanilhaPagina(1); }}>
            <Icon n="x" s={13} /> Limpar
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
              ord. por {planilhaSortKey} <Icon n={planilhaSortDir === "asc" ? "arrow-up" : "arrow-down"} s={11} />
              <Button variant="ghost" size="sm" onClick={() => { setPlanilhaSortKey(null); setPlanilhaSortDir("asc"); }}><Icon n="x" s={13} /></Button>
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
                  <div style={{ flex: 2, fontSize: 10, color: "var(--text3)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{rota}</span>
                    {rotuloClf(row) && (
                      <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--color-info)", background: "color-mix(in srgb, var(--color-info) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--color-info) 30%, transparent)", borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap" }}>{rotuloClf(row)}</span>
                    )}
                    {row._semDt && (
                      <span title="Carga carregada sem DT (aguardando o DT da Suzano) — confirmada e contando nos totais" style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)", borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap" }}>Sem DT</span>
                    )}
                  </div>
                  <div style={{ flex: "1.2" }}><PvBadge status={row.status} /></div>
                  <div style={{ flex: "1.2", fontSize: 11, fontWeight: 600, color: margemColor }}>
                    {margem != null ? fmtR(margem) : "—"}
                  </div>
                  <div className="pv-toggle" style={{ width: 28, textAlign: "center" }}>
                    {isExp ? <Icon n="chevron-up" s={11} /> : <Icon n="chevron-down" s={11} />}
                  </div>
                </div>
                <div className="pv-row-detail">
                  {row.placa && <div className="pv-detail-chip"><div className="dc-label">Placa</div><div className="dc-val">{row.placa}</div></div>}
                  {(row.vl_cte || row.cte) && <div className="pv-detail-chip"><div className="dc-label">CTE</div><div className="dc-val">{fmtR(row.vl_cte || row.cte)}</div></div>}
                  {(row.vl_contrato || row.contrato) && <div className="pv-detail-chip"><div className="dc-label">Contrato</div><div className="dc-val">{fmtR(row.vl_contrato || row.contrato)}</div></div>}
                  {row.data_carr && <div className="pv-detail-chip"><div className="dc-label">Carreg.</div><div className="dc-val">{row.data_carr}</div></div>}
                  {(row.data_desc || row.data_final) && <div className="pv-detail-chip"><div className="dc-label">Descarga</div><div className="dc-val">{row.data_desc || row.data_final}</div></div>}
                  {row.contratante && <div className="pv-detail-chip"><div className="dc-label">Contratante</div><div className="dc-val">{row.contratante}</div></div>}
                  {row.gerenciadora && <div className="pv-detail-chip"><div className="dc-label">Gerenc.</div><div className="dc-val">{row.gerenciadora}</div></div>}
                  {row.mdf && <div className="pv-detail-chip"><div className="dc-label">MDF</div><div className="dc-val">{row.mdf}</div></div>}
                  <div className="pv-detail-actions">
                    {row._semDt ? (
                      <span style={{ fontSize: 10.5, color: "var(--text3)", fontStyle: "italic" }}>
                        Carga sem DT — edite ou decida na fila “Cargas sem DT” no topo desta tela.
                      </span>
                    ) : abrirDetalhe && (
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
            <button className="pv-page-btn" disabled={paginaAtual <= 1} onClick={() => setPlanilhaPagina(1)}><Icon n="chevron-left" s={12} /><Icon n="chevron-left" s={12} style={{marginLeft:-6}} /></button>
            <button className="pv-page-btn" disabled={paginaAtual <= 1} onClick={() => setPlanilhaPagina(p => Math.max(1, p - 1))}><Icon n="arrow-left" s={13} /> Ant</button>
            <span>Pág {paginaAtual} / {totalPaginas}</span>
            <button className="pv-page-btn" disabled={paginaAtual >= totalPaginas} onClick={() => setPlanilhaPagina(p => Math.min(totalPaginas, p + 1))}>Próx <Icon n="arrow-right" s={13} /></button>
            <button className="pv-page-btn" disabled={paginaAtual >= totalPaginas} onClick={() => setPlanilhaPagina(totalPaginas)}><Icon n="chevron-right" s={12} /><Icon n="chevron-right" s={12} style={{marginLeft:-6}} /></button>
            <div className="pv-spacer" />
            <span>{dadosFiltrados.length} registros</span>
          </div>
        )}
      </div>
    </div>
  );
}
