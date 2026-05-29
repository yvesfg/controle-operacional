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

  const toggleSort = k => {
    if (planilhaSortKey === k) {
      setPlanilhaSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setPlanilhaSortKey(k);
      setPlanilhaSortDir("asc");
    }
  };

  const temFiltro = planilhaFiltroAno || planilhaFiltroMes || planilhaFiltroOrigem !== "todas" || planilhaFiltroDataDe || planilhaFiltroDataAte || planilhaBusca || planilhaFiltroStatus;

  // ── Styles locais usando CSS variables ───────────────────────────────────
  const selectStyle = active => ({
    fontSize: 11, fontWeight: 700, padding: "4px 8px",
    borderRadius: 6, fontFamily: "var(--font-heading)",
    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
    background: active ? "var(--accent2, rgba(124,58,237,0.1))" : "var(--card)",
    color: active ? "var(--accent)" : "var(--text)", cursor: "pointer",
  });

  const paginaBtnStyle = disabled => ({
    padding: "4px 8px", fontSize: 9,
    border: `1px solid ${disabled ? "var(--border)" : "var(--accent)"}`,
    borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
    background: "transparent",
    color: disabled ? "var(--text3)" : "var(--accent)",
    fontWeight: 600,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>

      {/* ── Barra de filtros ── */}
      <div className="co-filter-bar" style={{flexShrink:0}}>
        <span className="co-filter-bar__label">Filtrar:</span>

        <select value={planilhaFiltroAno}
          onChange={e => { setPlanilhaFiltroAno(e.target.value); setPlanilhaPagina(1); }}
          style={selectStyle(!!planilhaFiltroAno)}>
          <option value="">Todos os Anos</option>
          {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={planilhaFiltroMes}
          onChange={e => { setPlanilhaFiltroMes(e.target.value); setPlanilhaPagina(1); }}
          style={selectStyle(!!planilhaFiltroMes)}>
          <option value="">Todos os Meses</option>
          {mesesDisp.map(m => <option key={m} value={m}>{MESES_PT[m] || m}</option>)}
        </select>

        <select value={planilhaFiltroOrigem}
          onChange={e => { setPlanilhaFiltroOrigem(e.target.value); setPlanilhaPagina(1); }}
          style={{ ...selectStyle(planilhaFiltroOrigem !== "todas"), maxWidth: 200 }}>
          <option value="todas">Todas as Origens</option>
          {origensDisp.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {/* Filtros exclusivos AVB */}
        {isAvb && (() => {
          const contrats = [...new Set(DADOS.map(r=>(r.contratante||"").trim()).filter(Boolean))].sort();
          const gerenc   = [...new Set(DADOS.map(r=>(r.gerenciadora||"").trim()).filter(Boolean))].sort();
          return (<>
            <select value={planilhaFiltroContratante||""}
              onChange={e=>{setPlanilhaFiltroContratante(e.target.value);setPlanilhaPagina(1);}}
              style={selectStyle(!!planilhaFiltroContratante)}>
              <option value="">Contratante: Todos</option>
              {contrats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={planilhaFiltroGerenciadora||""}
              onChange={e=>{setPlanilhaFiltroGerenciadora(e.target.value);setPlanilhaPagina(1);}}
              style={selectStyle(!!planilhaFiltroGerenciadora)}>
              <option value="">Gerenc.: Todas</option>
              {gerenc.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </>);
        })()}

        <span style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginLeft:4 }}>De:</span>
        <input type="date" value={planilhaFiltroDataDe}
          onChange={e=>{ setPlanilhaFiltroDataDe(e.target.value); setPlanilhaPagina(1); }}
          style={{ fontSize:11, fontWeight:600, padding:"4px 8px", borderRadius:6,
            border:`1.5px solid ${planilhaFiltroDataDe?"var(--accent)":"var(--border)"}`,
            background: planilhaFiltroDataDe?"var(--accent2,rgba(124,58,237,0.1))":"var(--card)",
            color:"var(--text)", height:28, width:130, cursor:"pointer" }} />
        <span style={{ fontSize:10, color:"var(--text3)" }}>até</span>
        <input type="date" value={planilhaFiltroDataAte}
          onChange={e=>{ setPlanilhaFiltroDataAte(e.target.value); setPlanilhaPagina(1); }}
          style={{ fontSize:11, fontWeight:600, padding:"4px 8px", borderRadius:6,
            border:`1.5px solid ${planilhaFiltroDataAte?"var(--accent)":"var(--border)"}`,
            background: planilhaFiltroDataAte?"var(--accent2,rgba(124,58,237,0.1))":"var(--card)",
            color:"var(--text)", height:28, width:130, cursor:"pointer" }} />

        <input
          type="text"
          placeholder="Buscar DT, Placa ou Nome..."
          value={planilhaBusca}
          onChange={e => { setPlanilhaBusca(e.target.value); setPlanilhaPagina(1); }}
          style={{
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
            border: `1.5px solid ${planilhaBusca ? "var(--accent)" : "var(--border)"}`,
            background: planilhaBusca ? "var(--accent2, rgba(124,58,237,0.1))" : "var(--card)",
            color: "var(--text)", height: 28, width: 210, outline: "none",
            fontFamily: "var(--font-heading)",
          }}
        />

        {planilhaFiltroStatus && (
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.3)",color:"var(--accent)",fontFamily:"var(--font-heading)"}}>
            Status: {planilhaFiltroStatus}
            <button onClick={()=>{setPlanilhaFiltroStatus("");setPlanilhaPagina(1);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",fontSize:11,lineHeight:1,padding:0,marginLeft:2}}>×</button>
          </span>
        )}
        {temFiltro && (
          <button onClick={() => { setPlanilhaFiltroAno(""); setPlanilhaFiltroMes(""); setPlanilhaFiltroOrigem("todas"); setPlanilhaFiltroDataDe(""); setPlanilhaFiltroDataAte(""); setPlanilhaBusca(""); setPlanilhaFiltroStatus(""); if(setPlanilhaFiltroContratante)setPlanilhaFiltroContratante(""); if(setPlanilhaFiltroGerenciadora)setPlanilhaFiltroGerenciadora(""); setPlanilhaPagina(1); }}
            style={{
              fontSize: 9, padding: "4px 8px", borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text2)", cursor: "pointer",
            }}>
            ✕ Limpar
          </button>
        )}

        <span style={{
          marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)",
          color: "var(--text2)", fontWeight: 600,
        }}>
          {dadosFiltrados.length} de {DADOS.length} registros
        </span>
      </div>

      {/* ── Toolbar: paginação + exportar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 12px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0, flexWrap: "wrap", gap: 8,
      }}>
        <span style={{
          fontSize: 10, fontFamily: "var(--font-mono)",
          color: "var(--text2)", fontWeight: 600, letterSpacing: "0.02em",
        }}>
          {dadosFiltrados.length} registros · pág. {paginaAtual}/{totalPaginas}
          {planilhaSortKey && (
            <span style={{ color: "var(--accent)", marginLeft: 8 }}>
              ord. por {planilhaSortKey} {planilhaSortDir === "asc" ? "↑" : "↓"}
              <button onClick={() => { setPlanilhaSortKey(null); setPlanilhaSortDir("asc"); }}
                style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 10, padding: "0 3px" }}>
                ✕
              </button>
            </span>
          )}
        </span>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => setPlanilhaPagina(1)}                      disabled={paginaAtual === 1}           style={paginaBtnStyle(paginaAtual === 1)}>⏮</button>
          <button onClick={() => setPlanilhaPagina(p => Math.max(1, p-1))}  disabled={paginaAtual === 1}           style={paginaBtnStyle(paginaAtual === 1)}>◀</button>
          <button onClick={() => setPlanilhaPagina(p => Math.min(totalPaginas, p+1))} disabled={paginaAtual === totalPaginas} style={paginaBtnStyle(paginaAtual === totalPaginas)}>▶</button>
          <button onClick={() => setPlanilhaPagina(totalPaginas)}            disabled={paginaAtual === totalPaginas} style={paginaBtnStyle(paginaAtual === totalPaginas)}>⏭</button>
        </div>

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
      </div>

      {/* ── Tabela ── */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="ds-table ds-table--compact" style={{ tableLayout: "fixed", minWidth: 480 }}>
          <colgroup>
            {activeCols.map(c => <col key={c.k} style={{ width: c.w }} />)}
          </colgroup>
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              {activeCols.map(c => {
                const ativo = planilhaSortKey === c.k;
                return (
                  <th key={c.k}
                    onClick={() => toggleSort(c.k)}
                    title={`Ordenar por ${c.h}`}
                    style={{
                      padding: "9px 6px", textAlign: "center",
                      fontSize: 9, fontFamily: "var(--font-mono)",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      color: ativo ? "var(--accent)" : "var(--text3)",
                      borderBottom: `2px solid ${ativo ? "var(--accent)" : "var(--border)"}`,
                      whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1,
                      background: "var(--surface)",
                      overflow: "hidden", textOverflow: "ellipsis",
                      cursor: "pointer", userSelect: "none",
                      transition: "color 0.15s, border-color 0.15s",
                      fontWeight: 400,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {c.h}
                      <span style={{ fontSize: 9, lineHeight: 1, opacity: ativo ? 1 : 0.35 }}>
                        {ativo ? (planilhaSortDir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {dadosExibir.map((r, i) => (
              <tr key={i}
                style={{ cursor: "pointer", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}
                onClick={() => abrirDetalhe(r)}
                onMouseOver={e => e.currentTarget.style.background = "var(--surface)"}
                onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "var(--bg)"}
              >
                {activeCols.map(c => {
                  let val = r[c.k];
                  // AVB: placas agrupadas
                  if (isAvb && c.k === "placa") val = [r.placa, r.placa2, r.placa3].filter(Boolean).join(" / ") || "—";
                  // AVB: status badge simplificado
                  const isStatus = c.k === "status";
                  const isPend = isStatus && (val||"").toUpperCase() === "PENDENTE";
                  const isCarreg = isStatus && (val||"").toUpperCase() === "CARREGADO";
                  // AVB: flags documentais na coluna CTE/MDF
                  const isCte = c.k === "cte", isMdf = c.k === "mdf";
                  const hasVal = val && val !== "—" && val !== "";
                  return (
                    <td key={c.k} style={{
                      padding: "7px 6px", borderBottom: "1px solid var(--border)",
                      fontSize: c.k === "dt" ? 11 : 10, textAlign: "center",
                      fontFamily: ["dt","codigo","placa","data_carr","data_agenda","cte","mdf","adiant","saldo","vl_contrato"].includes(c.k) ? "var(--font-mono)" : "inherit",
                      color: c.k === "dt" ? "var(--accent)"
                        : c.k === "placa" ? "var(--green, #22c55e)"
                        : c.k === "data_carr" ? "var(--yellow, #eab308)"
                        : (isCte || isMdf) ? (hasVal ? "var(--green, #22c55e)" : "var(--red, #ef4444)")
                        : isStatus ? (isPend ? "var(--yellow, #eab308)" : isCarreg ? "var(--green, #22c55e)" : "var(--text2)")
                        : "var(--text2)",
                      fontWeight: c.k === "dt" ? 700 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      letterSpacing: c.k === "dt" ? "0.06em" : 0,
                    }} title={String(val||"")}>
                      {(isCte || isMdf) ? (hasVal ? val : "✗") : (val || "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
