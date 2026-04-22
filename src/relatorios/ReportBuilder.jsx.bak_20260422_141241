/**
 * ReportBuilder.jsx — Módulo de relatórios dinâmicos configuráveis.
 * Props: dados, motoristas, apontItems, sgsItems, t, DESIGN, isMobile, isWide
 *
 * Arquitetura:
 *   - Painel esquerdo: seletor de campos agrupados por módulo
 *   - Painel direito: configurações (título, filtros, ordenação, agrupamento)
 *   - Área inferior/full: pré-visualização da tabela com dados reais
 *   - Exportação: print (A4 landscape) via nova janela
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  FIELD_CATALOG,
  FIELD_GROUPS,
  DEFAULT_VISIBLE,
  STATUS_OPCOES,
  applyFormat,
  getFieldValue,
} from "./fieldCatalog.js";

// ── Ícones SVG inline ──────────────────────────────────────────────────────
const Ico = ({ size = 16, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
    strokeLinejoin="round" style={style}>{children}</svg>
);
const IcoCheck    = () => <Ico><polyline points="20 6 9 17 4 12"/></Ico>;
const IcoPrint    = () => <Ico><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></Ico>;
const IcoCSV      = () => <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Ico>;
const IcoFilter   = () => <Ico><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Ico>;
const IcoReset    = () => <Ico><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></Ico>;
const IcoEye      = () => <Ico><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Ico>;
const IcoChevronD = () => <Ico size={14}><polyline points="6 9 12 15 18 9"/></Ico>;
const IcoChevronR = () => <Ico size={14}><polyline points="9 18 15 12 9 6"/></Ico>;
const IcoSortAsc  = () => <Ico size={13}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></Ico>;
const IcoSortDesc = () => <Ico size={13}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></Ico>;

// ── Utilitário: gerar CSV ──────────────────────────────────────────────────
function buildCSV(fields, rows) {
  const header = fields.map(f => `"${f.label}"`).join(",");
  const body = rows.map(row =>
    fields.map(f => {
      const v = applyFormat(f, getFieldValue(f, row));
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")
  ).join("\n");
  return header + "\n" + body;
}

function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Utilitário: abrir janela de impressão ──────────────────────────────────
function printReport(fields, rows, title, geradoEm) {
  const tableRows = rows.map(row => {
    const cells = fields.map(f => {
      const v = applyFormat(f, getFieldValue(f, row));
      return `<td style="text-align:${f.alinhamento};padding:4px 8px;border-bottom:1px solid #333;font-size:11px;white-space:nowrap;max-width:${f.largura}px;overflow:hidden;text-overflow:ellipsis;">${v}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  const headers = fields.map(f =>
    `<th style="text-align:${f.alinhamento};padding:5px 8px;background:#1a1a2e;color:#F3BA2F;font-size:11px;font-weight:600;white-space:nowrap;border-bottom:2px solid #F3BA2F;">${f.label}</th>`
  ).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; border-bottom: 2px solid #F3BA2F; padding-bottom: 6px; }
  .report-title { font-size: 15px; font-weight: 700; color: #111; }
  .report-meta  { font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; }
  tr:nth-child(even) td { background: #f8f8f8; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { background: #1a1a2e !important; color: #F3BA2F !important; }
  }
</style>
</head><body>
<div class="report-header">
  <div class="report-title">${title}</div>
  <div class="report-meta">Gerado em: ${geradoEm} &nbsp;|&nbsp; ${rows.length} registro(s)</div>
</div>
<table>
  <thead><tr>${headers}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body></html>`;

  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) { alert("Permita pop-ups para imprimir."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ReportBuilder({ dados = [], motoristas = [], apontItems = [], sgsItems = [], t, DESIGN, isMobile }) {
  // ── Estado de configuração ───────────────────────────────────────────────
  const [selectedFields, setSelectedFields] = useState(DEFAULT_VISIBLE);
  const [reportTitle, setReportTitle]       = useState("Relatório Operacional");
  const [filterStatus, setFilterStatus]     = useState([]);
  const [filterNome, setFilterNome]         = useState("");
  const [filterOrigem, setFilterOrigem]     = useState("");
  const [filterDestino, setFilterDestino]   = useState("");
  const [filterDtDe, setFilterDtDe]         = useState("");
  const [filterDtAte, setFilterDtAte]       = useState("");
  const [filterModulo, setFilterModulo]     = useState("planilha");
  const [sortField, setSortField]           = useState("dt");
  const [sortDir, setSortDir]               = useState("desc");
  const [groupBy, setGroupBy]               = useState("");
  const [showPreview, setShowPreview]       = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [previewPage, setPreviewPage]       = useState(1);
  const PREVIEW_PAGE_SIZE = 50;

  // ── Campos selecionados e ordenados ───────────────────────────────────────
  const activeFields = useMemo(() =>
    selectedFields
      .map(id => FIELD_CATALOG.find(f => f.id === id))
      .filter(Boolean)
      .filter(f => f.modulo === filterModulo || f.origem === "calculado")
  , [selectedFields, filterModulo]);

  // ── Dataset pela origem do módulo ─────────────────────────────────────────
  const sourceData = useMemo(() => {
    if (filterModulo === "apontamentos") return apontItems;
    if (filterModulo === "sgs")          return sgsItems;
    if (filterModulo === "motoristas")   return motoristas;
    return dados; // planilha + diarias usa DADOS
  }, [filterModulo, dados, apontItems, sgsItems, motoristas]);

  // ── Filtragem ─────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let rows = [...sourceData];

    if (filterModulo === "planilha" || filterModulo === "diarias") {
      if (filterStatus.length)
        rows = rows.filter(r => filterStatus.includes(r.status));
      if (filterNome.trim())
        rows = rows.filter(r => String(r.nome||"").toLowerCase().includes(filterNome.toLowerCase()));
      if (filterOrigem.trim())
        rows = rows.filter(r => String(r.origem||"").toLowerCase().includes(filterOrigem.toLowerCase()));
      if (filterDestino.trim())
        rows = rows.filter(r => String(r.destino||"").toLowerCase().includes(filterDestino.toLowerCase()));
      if (filterDtDe)
        rows = rows.filter(r => (r.data_agenda||r.dt||"") >= filterDtDe);
      if (filterDtAte)
        rows = rows.filter(r => (r.data_agenda||r.dt||"") <= filterDtAte);
    }

    // Ordenação
    const sf = FIELD_CATALOG.find(f => f.id === sortField);
    if (sf) {
      rows.sort((a, b) => {
        const va = String(getFieldValue(sf, a) ?? "");
        const vb = String(getFieldValue(sf, b) ?? "");
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return rows;
  }, [sourceData, filterModulo, filterStatus, filterNome, filterOrigem, filterDestino, filterDtDe, filterDtAte, sortField, sortDir]);

  // ── Agrupamento ───────────────────────────────────────────────────────────
  const groupedData = useMemo(() => {
    if (!groupBy) return null;
    const gf = FIELD_CATALOG.find(f => f.id === groupBy);
    if (!gf) return null;
    const map = new Map();
    filteredData.forEach(row => {
      const k = applyFormat(gf, getFieldValue(gf, row)) || "(vazio)";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(row);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredData, groupBy]);

  // ── Paginação do preview ──────────────────────────────────────────────────
  const pagedRows = useMemo(() => {
    if (groupedData) return null; // agrupado não pagina
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return filteredData.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [filteredData, groupedData, previewPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PREVIEW_PAGE_SIZE));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleField = useCallback((id) => {
    setSelectedFields(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleStatus = useCallback((s) => {
    setFilterStatus(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }, []);

  const toggleGroupCollapse = useCallback((key) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterStatus([]);
    setFilterNome("");
    setFilterOrigem("");
    setFilterDestino("");
    setFilterDtDe("");
    setFilterDtAte("");
    setSortField("dt");
    setSortDir("desc");
    setGroupBy("");
    setPreviewPage(1);
  }, []);

  const handlePrint = useCallback(() => {
    const geradoEm = new Date().toLocaleString("pt-BR");
    printReport(activeFields, filteredData, reportTitle, geradoEm);
  }, [activeFields, filteredData, reportTitle]);

  const handleCSV = useCallback(() => {
    const csv = buildCSV(activeFields, filteredData);
    const fname = `${reportTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.csv`;
    downloadCSV(csv, fname);
  }, [activeFields, filteredData, reportTitle]);

  // ── Estilos derivados do tema ──────────────────────────────────────────────
  const S = {
    wrap: {
      display: "flex", flexDirection: isMobile ? "column" : "row",
      gap: 0, height: isMobile ? "auto" : "100%", minHeight: 0,
      overflow: isMobile ? "visible" : "hidden",
      background: t.bg,
    },
    sidebar: {
      width: isMobile ? "100%" : 260,
      flexShrink: 0,
      background: t.card,
      borderRight: `1px solid ${t.borda}`,
      borderBottom: isMobile ? `1px solid ${t.borda}` : "none",
      display: isMobile ? (mobilePanelOpen ? "flex" : "none") : "flex",
      flexDirection: "column",
      overflow: "hidden",
      maxHeight: isMobile ? 320 : "none",
    },
    sidebarHeader: {
      padding: "14px 16px 10px",
      borderBottom: `1px solid ${t.borda}`,
      fontWeight: 700, fontSize: 13, color: t.ouro,
      letterSpacing: ".4px", flexShrink: 0,
    },
    sidebarScroll: {
      flex: 1, overflowY: "auto", padding: "8px 0",
    },
    groupHeader: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 16px 4px",
      fontSize: 11, fontWeight: 700, color: t.txt2,
      textTransform: "uppercase", letterSpacing: ".5px",
      cursor: "pointer", userSelect: "none",
    },
    fieldItem: {
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 16px 5px 24px",
      fontSize: 12, color: t.txt,
      cursor: "pointer",
      borderRadius: 0,
      transition: "background .12s",
    },
    checkbox: (checked) => ({
      width: 14, height: 14, flexShrink: 0,
      border: `1.5px solid ${checked ? t.ouro : t.borda2}`,
      borderRadius: 3, background: checked ? t.ouro : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#111", transition: "all .12s",
    }),
    main: {
      flex: isMobile ? "none" : 1,
      display: "flex", flexDirection: "column",
      overflow: isMobile ? "visible" : "hidden",
      minWidth: 0,
    },
    toolbar: {
      padding: "10px 16px",
      borderBottom: `1px solid ${t.borda}`,
      display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
      background: t.card, flexShrink: 0,
    },
    input: {
      background: t.inputBg || t.bgAlt,
      border: `1px solid ${t.borda}`,
      borderRadius: 6,
      color: t.txt,
      fontSize: 12,
      padding: "5px 9px",
      outline: "none",
    },
    select: {
      background: t.inputBg || t.bgAlt,
      border: `1px solid ${t.borda}`,
      borderRadius: 6,
      color: t.txt,
      fontSize: 12,
      padding: "5px 9px",
      outline: "none",
      cursor: "pointer",
    },
    btn: (variant = "default") => ({
      display: "flex", alignItems: "center", gap: 5,
      padding: "5px 12px",
      borderRadius: 6,
      fontSize: 12, fontWeight: 600,
      cursor: "pointer",
      border: variant === "primary"
        ? `1px solid ${t.ouro}`
        : `1px solid ${t.borda}`,
      background: variant === "primary"
        ? t.ouro
        : "transparent",
      color: variant === "primary" ? "#111" : t.txt2,
      transition: "opacity .12s",
      whiteSpace: "nowrap",
    }),
    tableWrap: {
      flex: isMobile ? "none" : 1,
      overflow: "auto", padding: "0",
      maxHeight: isMobile ? "60vh" : "none",
    },
    table: {
      width: "100%", borderCollapse: "collapse", fontSize: 12,
    },
    th: (f) => ({
      padding: "7px 10px",
      background: t.tableHeader || t.bgAlt,
      color: t.txt2,
      fontWeight: 600, fontSize: 11,
      textAlign: f.alinhamento,
      whiteSpace: "nowrap",
      borderBottom: `2px solid ${t.borda}`,
      position: "sticky", top: 0, zIndex: 2,
      cursor: "pointer",
      userSelect: "none",
    }),
    td: (f, i) => ({
      padding: "6px 10px",
      color: t.txt,
      textAlign: f.alinhamento,
      borderBottom: `1px solid ${t.borda}`,
      background: i % 2 === 0 ? "transparent" : (t.bgAlt + "55"),
      maxWidth: f.largura,
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }),
    groupRowHeader: {
      padding: "8px 12px",
      background: t.bgAlt,
      color: t.ouro,
      fontWeight: 700, fontSize: 12,
      borderBottom: `1px solid ${t.borda}`,
      cursor: "pointer",
    },
    statusPill: (s) => {
      const map = {
        "CARREGADO":   ["#02C076","#02C07622"],
        "PENDENTE":    ["#F3BA2F","#F3BA2F22"],
        "NO-SHOW":     ["#F6465D","#F6465D22"],
        "NÃO ACEITE":  ["#F6465D","#F6465D22"],
        "EM ABERTO":   ["#848E9C","#848E9C22"],
        "CANCELADO":   ["#F6465D","#F6465D22"],
      };
      const [c, bg] = map[s] || [t.txt2, t.borda + "44"];
      return {
        display: "inline-block",
        padding: "2px 8px", borderRadius: 20,
        fontSize: 10, fontWeight: 700,
        color: c, background: bg,
        border: `1px solid ${c}33`,
        whiteSpace: "nowrap",
      };
    },
    emptyState: {
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      flex: 1, padding: 40,
      color: t.txt2, fontSize: 13,
    },
    pagination: {
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 16px",
      borderTop: `1px solid ${t.borda}`,
      background: t.card, flexShrink: 0,
      fontSize: 12, color: t.txt2,
    },
  };

  // ── Render célula com badge de status ──────────────────────────────────────
  const renderCell = useCallback((field, row, rowIdx) => {
    const raw = getFieldValue(field, row);
    const v   = applyFormat(field, raw);
    if (field.id === "status" && v) {
      return <td key={field.id} style={S.td(field, rowIdx)}>
        <span style={S.statusPill(v)}>{v}</span>
      </td>;
    }
    return <td key={field.id} style={S.td(field, rowIdx)} title={v}>{v}</td>;
  }, [t]);

  // ── Render linha de cabeçalho com sort ────────────────────────────────────
  const renderTh = useCallback((f) => (
    <th key={f.id} style={S.th(f)}
      onClick={() => {
        if (sortField === f.id) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(f.id); setSortDir("asc"); }
        setPreviewPage(1);
      }}>
      <span style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: f.alinhamento === "right" ? "flex-end" : f.alinhamento === "center" ? "center" : "flex-start" }}>
        {f.label}
        {sortField === f.id && (sortDir === "asc" ? <IcoSortAsc/> : <IcoSortDesc/>)}
      </span>
    </th>
  ), [sortField, sortDir]);

  // ── Grupos de campos (sidebar) ────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState({});
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const toggleSidebarGroup = useCallback((mod) => {
    setSidebarCollapsed(p => ({ ...p, [mod]: !p[mod] }));
  }, []);

  const fieldsForModule = (mod) => FIELD_CATALOG.filter(f => f.modulo === mod);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>

      {/* ── Mobile toggle: mostrar/ocultar seletor de campos ── */}
      {isMobile && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 12px", background: t.card, borderBottom:`1px solid ${t.borda}`,
          cursor:"pointer" }} onClick={()=>setMobilePanelOpen(p=>!p)}>
          <span style={{fontSize:12,fontWeight:700,color:t.txt}}>
            {mobilePanelOpen ? "▲ Ocultar campos" : "▼ Selecionar campos"} · {activeFields.length} campo{activeFields.length!==1?"s":""}
          </span>
          <div style={{display:"flex",gap:6}}>
            <button style={{...S.btn("primary"),padding:"3px 10px",fontSize:11}} onClick={e=>{e.stopPropagation();handlePrint();}} disabled={!activeFields.length}>
              <IcoPrint/> Imprimir
            </button>
            <button style={{...S.btn(),padding:"3px 10px",fontSize:11}} onClick={e=>{e.stopPropagation();handleCSV();}} disabled={!activeFields.length}>
              <IcoCSV/> CSV
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar: Seletor de campos ─────────────────────────────────── */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>Campos do Relatório</div>

        {/* Módulo fonte */}
        <div style={{ padding: "8px 12px 4px", borderBottom: `1px solid ${t.borda}`, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: t.txt2, marginBottom: 4, fontWeight: 600 }}>MÓDULO / ORIGEM</div>
          <select value={filterModulo} onChange={e => { setFilterModulo(e.target.value); setPreviewPage(1); }}
            style={{ ...S.select, width: "100%" }}>
            {FIELD_GROUPS.map(g => (
              <option key={g.modulo} value={g.modulo}>{g.label}</option>
            ))}
          </select>
        </div>

        <div style={S.sidebarScroll}>
          {FIELD_GROUPS.map(g => {
            const fields = fieldsForModule(g.modulo);
            if (!fields.length) return null;
            const isCollapsed = sidebarCollapsed[g.modulo];
            return (
              <div key={g.modulo}>
                <div style={S.groupHeader} onClick={() => toggleSidebarGroup(g.modulo)}>
                  <span>{g.label}</span>
                  {isCollapsed ? <IcoChevronR/> : <IcoChevronD/>}
                </div>
                {!isCollapsed && fields.map(f => {
                  const checked = selectedFields.includes(f.id);
                  return (
                    <div key={f.id} style={{ ...S.fieldItem, background: checked ? t.ouro + "12" : "transparent" }}
                      onClick={() => toggleField(f.id)}>
                      <div style={S.checkbox(checked)}>
                        {checked && <IcoCheck/>}
                      </div>
                      <span style={{ flex: 1 }}>{f.label}</span>
                      {f.filtravel && <span style={{ fontSize: 9, color: t.txt2 }} title="Filtrável">F</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Ações da sidebar */}
        <div style={{ padding: "8px 12px", borderTop: `1px solid ${t.borda}`, flexShrink: 0, display: "flex", gap: 6 }}>
          <button style={{ ...S.btn(), flex: 1, justifyContent: "center" }}
            onClick={() => setSelectedFields(DEFAULT_VISIBLE)}>
            Padrão
          </button>
          <button style={{ ...S.btn(), flex: 1, justifyContent: "center" }}
            onClick={() => setSelectedFields(FIELD_CATALOG.filter(f => f.modulo === filterModulo).map(f => f.id))}>
            Todos
          </button>
          <button style={{ ...S.btn(), flex: 1, justifyContent: "center" }}
            onClick={() => setSelectedFields([])}>
            Nenhum
          </button>
        </div>
      </div>

      {/* ── Área principal ────────────────────────────────────────────── */}
      <div style={S.main}>

        {/* ── Toolbar: título + filtros + exportação ───────────────────── */}
        <div style={S.toolbar}>

          {/* Título */}
          <input value={reportTitle} onChange={e => setReportTitle(e.target.value)}
            placeholder="Título do relatório"
            style={{ ...S.input, minWidth: 180, fontWeight: 700, fontSize: 13, color: t.ouro }} />

          {/* Separador */}
          <div style={{ width: 1, height: 24, background: t.borda, flexShrink: 0 }} />

          {/* Filtros — só para planilha/diarias */}
          {(filterModulo === "planilha" || filterModulo === "diarias") && <>
            <input value={filterNome} onChange={e => setFilterNome(e.target.value)}
              placeholder="Motorista…" style={{ ...S.input, width: 120 }} />
            <input value={filterOrigem} onChange={e => setFilterOrigem(e.target.value)}
              placeholder="Origem…" style={{ ...S.input, width: 100 }} />
            <input value={filterDestino} onChange={e => setFilterDestino(e.target.value)}
              placeholder="Destino…" style={{ ...S.input, width: 100 }} />
            <input type="date" value={filterDtDe} onChange={e => { setFilterDtDe(e.target.value); setPreviewPage(1); }}
              style={{ ...S.input, width: 130 }} title="Data de (agenda/DT)" />
            <input type="date" value={filterDtAte} onChange={e => { setFilterDtAte(e.target.value); setPreviewPage(1); }}
              style={{ ...S.input, width: 130 }} title="Data até" />

            {/* Status pills */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              {STATUS_OPCOES.map(s => (
                <button key={s} onClick={() => toggleStatus(s)}
                  style={{
                    ...S.btn(filterStatus.includes(s) ? "primary" : "default"),
                    padding: "3px 8px", fontSize: 10,
                    background: filterStatus.includes(s) ? t.ouro + "33" : "transparent",
                    border: `1px solid ${filterStatus.includes(s) ? t.ouro : t.borda}`,
                    color: filterStatus.includes(s) ? t.ouro : t.txt2,
                  }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 24, background: t.borda, flexShrink: 0 }} />
          </>}

          {/* Agrupar por */}
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
            style={S.select} title="Agrupar por campo">
            <option value="">Sem agrupamento</option>
            {FIELD_CATALOG
              .filter(f => f.agrupavel && (f.modulo === filterModulo || f.origem === "calculado"))
              .map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Reset */}
          <button style={S.btn()} onClick={resetFilters} title="Limpar filtros">
            <IcoReset/> Limpar
          </button>

          {/* Preview toggle */}
          <button style={S.btn(showPreview ? "primary" : "default")}
            onClick={() => setShowPreview(p => !p)}>
            <IcoEye/> {showPreview ? "Ocultar" : "Preview"}
          </button>

          {/* CSV */}
          <button style={S.btn()} onClick={handleCSV} disabled={!activeFields.length}>
            <IcoCSV/> CSV
          </button>

          {/* Print / PDF */}
          <button style={S.btn("primary")} onClick={handlePrint} disabled={!activeFields.length}>
            <IcoPrint/> Imprimir
          </button>
        </div>

        {/* ── Contagem ─────────────────────────────────────────────────── */}
        <div style={{
          padding: "5px 16px", flexShrink: 0,
          display: "flex", alignItems: "center", gap: 12,
          fontSize: 11, color: t.txt2,
          borderBottom: `1px solid ${t.borda}`,
          background: t.bg,
        }}>
          <span>
            <strong style={{ color: t.ouro }}>{filteredData.length}</strong> registro(s)
            {filterStatus.length > 0 && ` · ${filterStatus.join(", ")}`}
            {filterNome && ` · Motorista: "${filterNome}"`}
          </span>
          <span style={{ marginLeft: "auto" }}>
            {activeFields.length} campo(s) selecionado(s)
          </span>
        </div>

        {/* ── Tabela de preview ─────────────────────────────────────────── */}
        {showPreview && (
          <div style={S.tableWrap}>
            {activeFields.length === 0 ? (
              <div style={S.emptyState}>
                <IcoFilter/>
                <p style={{ marginTop: 12 }}>Selecione campos no painel esquerdo para gerar o relatório.</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div style={S.emptyState}>
                <p>Nenhum registro encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>{activeFields.map(renderTh)}</tr>
                </thead>
                <tbody>
                  {groupedData ? (
                    groupedData.map(([groupKey, groupRows]) => {
                      const isCollapsed = collapsedGroups[groupKey];
                      return (
                        <React.Fragment key={groupKey}>
                          <tr>
                            <td colSpan={activeFields.length} style={S.groupRowHeader}
                              onClick={() => toggleGroupCollapse(groupKey)}>
                              {isCollapsed ? "▶" : "▼"} {groupKey}
                              <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: t.txt2 }}>
                                ({groupRows.length})
                              </span>
                            </td>
                          </tr>
                          {!isCollapsed && groupRows.map((row, ri) => (
                            <tr key={ri}>
                              {activeFields.map(f => renderCell(f, row, ri))}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    pagedRows.map((row, ri) => (
                      <tr key={ri}>
                        {activeFields.map(f => renderCell(f, row, ri))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Paginação ─────────────────────────────────────────────────── */}
        {showPreview && !groupedData && filteredData.length > PREVIEW_PAGE_SIZE && (
          <div style={S.pagination}>
            <button style={S.btn()} onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
              disabled={previewPage <= 1}>‹ Ant.</button>
            <span>Pág. {previewPage} / {totalPages}</span>
            <button style={S.btn()} onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
              disabled={previewPage >= totalPages}>Próx. ›</button>
            <span style={{ marginLeft: 8 }}>
              ({((previewPage-1)*PREVIEW_PAGE_SIZE)+1}–{Math.min(previewPage*PREVIEW_PAGE_SIZE, filteredData.length)} de {filteredData.length})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
