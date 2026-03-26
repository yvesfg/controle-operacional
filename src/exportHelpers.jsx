// ── exportHelpers.jsx — gerado automaticamente ──
import React, { useState } from 'react';
import { themes } from './constants.js';
import { esc } from './utils.js';

export function exportCSV(dados, cols, filename) {
  const header = cols.map(c => c.l).join(";");
  const rows = dados.map(r => cols.map(c => {
    const v = String(r[c.k] || "").replace(/"/g,'""');
    return `"${v}"`;
  }).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + [header,...rows].join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename+".csv"; a.click();
}

export function exportODS(dados, cols, filename) {
  // ODS via XML spreadsheet (compatível com LibreOffice)
  const rows = dados.map(r =>
    `<Row>${cols.map(c => `<Cell><Data ss:Type="String">${esc(String(r[c.k]||""))}</Data></Cell>`).join("")}</Row>`
  ).join("");
  const header = `<Row>${cols.map(c=>`<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(c.l)}</Data></Cell>`).join("")}</Row>`;
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/></Style></Styles>
<Worksheet ss:Name="Dados"><Table>${header}${rows}</Table></Worksheet></Workbook>`;
  const blob = new Blob([xml], {type:"application/vnd.ms-excel"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename+".xls"; a.click();
}

export function exportPDF(dados, cols, titulo) {
  const rows = dados.map(r =>
    `<tr>${cols.map(c=>`<td>${esc(String(r[c.k]||"—"))}</td>`).join("")}</tr>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title>
<style>
  @page{size:landscape;margin:12mm}
  body{font-family:Arial,sans-serif;font-size:10px;color:#222;padding:12px;margin:0}
  h1{font-size:16px;margin-bottom:4px}h2{font-size:10px;color:#666;font-weight:normal;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#1a1a2e;color:#fff;padding:7px 5px;font-size:8px;text-transform:uppercase;letter-spacing:.8px;text-align:left;border:1px solid #333}
  td{padding:5px;border:1px solid #ddd;font-size:9px}
  tr:nth-child(even){background:#f8f8f8}
  .footer{margin-top:14px;font-size:8px;color:#999;border-top:1px solid #ddd;padding-top:6px}
  @media print{body{padding:0}button{display:none}}
</style></head><body>
<h1>${titulo}</h1><h2>Exportado em ${new Date().toLocaleString("pt-BR")} — ${dados.length} registros</h2>
<table><thead><tr>${cols.map(c=>`<th>${c.l}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Controle Operacional · YFGroup — Gerado automaticamente</div>
<script>setTimeout(()=>window.print(),400)<\/script></body></html>`;
  const _blob2 = new Blob([html], {type:"text/html;charset=utf-8"});
  const _url2 = URL.createObjectURL(_blob2);
  window.open(_url2, "_blank", "width=960,height=720");
  setTimeout(()=>URL.revokeObjectURL(_url2), 120000);
}

export function ExportMenu({ dados, cols, filename, titulo }) {
  const [open, setOpen] = useState(false);
  const t = themes.dark;
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(!open)} style={{background:`rgba(240,185,11,.1)`,border:`1px solid rgba(240,185,11,.3)`,borderRadius:9,padding:"8px 12px",color:t.ouro,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
        📥 Exportar ▾
      </button>
      {open && (
        <div style={{position:"absolute",right:0,top:"110%",background:t.card,border:`1px solid ${t.borda}`,borderRadius:10,overflow:"hidden",zIndex:50,minWidth:150,boxShadow:`0 8px 24px rgba(0,0,0,.4)`}}>
          {[
            {ico:"📄",l:"CSV (.csv)",fn:()=>exportCSV(dados,cols,filename)},
            {ico:"📝",l:"Planilha (.xls)",fn:()=>exportODS(dados,cols,filename)},
            {ico:"📕",l:"PDF (impressão)",fn:()=>exportPDF(dados,cols,titulo)},
          ].map((opt,i,arr) => (
            <button key={opt.l} onClick={()=>{opt.fn();setOpen(false);}} style={{width:"100%",background:"transparent",border:"none",borderBottom:i<arr.length-1?`1px solid ${t.borda}`:"none",padding:"10px 14px",color:t.txt,fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
              {opt.ico} {opt.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
//  CALENDAR HELPERS (Item 1)
// ══════════════════════════════════════════════
export function gerarICS(titulo, data, descricao, local) {
  // data no formato dd/mm/yyyy
  const parts = String(data).split("/");
  const dtStr = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : data.replace(/\D/g,"");
  const uid = `co-${Date.now()}@yfgroup.com`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YFGroup//ControleOperacional//PT",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${dtStr}`,
    `DTEND;VALUE=DATE:${dtStr}`,
    `SUMMARY:${titulo}`,
    `DESCRIPTION:${descricao.replace(/\n/g,"\\n")}`,
    local ? `LOCATION:${local}` : "",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete de descarga",
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([ics], {type:"text/calendar;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `descarga_${dtStr}.ics`;
  a.click();
}

export function abrirGoogleCalendar(titulo, data, descricao) {
  const parts = String(data).split("/");
  const dtStr = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : data.replace(/\D/g,"");
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent(titulo)}`
    + `&dates=${dtStr}/${dtStr}`
    + `&details=${encodeURIComponent(descricao)}`;
  window.open(url, "_blank");
}

