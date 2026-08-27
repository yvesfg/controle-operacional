// ── exportHelpers.jsx ──
// O menu "Exportar" das telas com tabela (Planilha, Diárias, Descarga, AVB) e os
// atalhos de calendário. Os formatos em si moram em `exportacao.js` — aqui é só
// o botão. Antes este arquivo tinha a própria implementação, e ela mandava um XML
// do Excel 2003 com extensão .xls (o Excel abre reclamando, o Sheets recusa) e um
// "PDF" que era janela de impressão.
import React, { useState } from 'react';
import { Button } from "./design-system/components/Button.jsx";
import { baixarXLSX, baixarCSV, baixarPDF, matrizDeColunas } from './exportacao.js';

// cols: [{ k, l }] — k é a chave na linha, l o rótulo da coluna.
export function ExportMenu({ dados, cols, filename, titulo }) {
  const [open, setOpen] = useState(false);
  const [ocupado, setOcupado] = useState("");

  const rodar = async (formato) => {
    const matriz = matrizDeColunas(dados, cols);
    setOcupado(formato);
    try {
      if (formato === "csv") baixarCSV(matriz, filename);
      else if (formato === "pdf") await baixarPDF(matriz, { nome: filename, titulo });
      else await baixarXLSX(matriz, filename);
      setOpen(false);
    } finally { setOcupado(""); }
  };

  const opcoes = [
    { id: "xlsx", l: "Excel (.xlsx)",  d: "abre no Excel e no Sheets" },
    { id: "csv",  l: "CSV (.csv)",     d: "separado por ponto e vírgula" },
    { id: "pdf",  l: "PDF (.pdf)",     d: "arquivo pronto, sem imprimir" },
  ];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <Button variant="info-outline" size="sm" onClick={() => setOpen(!open)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Exportar
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </Button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
          <div style={{
            position: "absolute", right: 0, top: "110%", background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-card, 10px)",
            overflow: "hidden", zIndex: 50, minWidth: 190, boxShadow: "0 8px 24px var(--color-shadow)",
          }}>
            {opcoes.map((o, i) => (
              <Button variant="ghost" size="sm" key={o.id} onClick={() => rodar(o.id)} disabled={!!ocupado} style={{ width: "100%" }}>
                {ocupado === o.id ? "gerando…" : o.l}
                <div style={{ fontSize: 9.5, color: "var(--text3)", fontWeight: 400, marginTop: 1 }}>{o.d}</div>
              </Button>
            ))}
          </div>
        </>
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
