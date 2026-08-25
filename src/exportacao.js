// ── exportacao.js ──
// Um caminho só para levar dados da tela pra fora do app: .xlsx, .csv e .pdf.
//
// Por que existe: havia dois caminhos e nenhum completo. O `ExportMenu`
// (exportHelpers) mandava um XML do Excel 2003 com extensão .xls — o Excel abre
// reclamando e o Google Sheets recusa — e o "PDF" era uma janela de impressão.
// O `ModalRelatorio` fazia .xlsx e .csv certos, mas só ele. Agora os dois falam
// com este módulo, e quem exporta escolhe o formato, não a tela.
//
// A unidade de troca é uma MATRIZ (array de arrays), primeira linha = cabeçalho.
// Isso preserva o que o ModalRelatorio já sabe fazer (grupos, subtotais, total
// geral são só linhas da matriz) e aceita a lista simples de quem só tem colunas.
//
import * as XLSX from "xlsx";

// Números: a matriz pode trazer Number cru (o .xlsx precisa disso pra somar na
// planilha); .csv e .pdf formatam em pt-BR na hora de escrever.

export const nomeArquivo = (s) =>
  String(s || "relatorio").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "relatorio";

const baixar = (blob, nome) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

// Inteiro sai sem casas (contagem), fracionário sai com 2 (dinheiro).
const txt = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toLocaleString("pt-BR")
      : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
};

// Linhas de objeto + colunas [{k,l}] (ExportMenu) ou [{id,label,get}] (ModalRelatorio).
export function matrizDeColunas(linhas, cols) {
  const ler = (c, l) => {
    try { return typeof c.get === "function" ? c.get(l) : l?.[c.k]; } catch { return ""; }
  };
  return [
    cols.map((c) => c.l ?? c.label ?? c.k ?? c.id),
    ...(linhas || []).map((l) => cols.map((c) => {
      const v = ler(c, l);
      return v === null || v === undefined ? "" : v;
    })),
  ];
}

// Toda linha com o mesmo número de colunas do cabeçalho — linha de grupo tem uma
// célula só e, sem isso, o PDF desalinha a tabela inteira a partir dela.
const retangular = (matriz) => {
  const n = Math.max(...matriz.map((r) => r.length), 1);
  return matriz.map((r) => (r.length === n ? r : [...r, ...Array(n - r.length).fill("")]));
};

// Largura por coluna: sem isso tudo sai com 8 caracteres e o usuário arrasta
// coluna por coluna antes de conseguir ler.
const folhaDaMatriz = (matriz) => {
  const ws = XLSX.utils.aoa_to_sheet(matriz);
  ws["!cols"] = (matriz[0] || []).map((_, i) => ({
    wch: Math.min(42, Math.max(10, ...matriz.map((r) => txt(r[i]).length + 2))),
  }));
  return ws;
};

export function baixarXLSX(matriz, nome) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, folhaDaMatriz(matriz), "Dados");
  XLSX.writeFile(wb, `${nomeArquivo(nome)}.xlsx`);
}

// Arquivo com várias abas: [{nome, matriz}]. Existe pro cadastro da embarcadora,
// cujo modelo tem uma aba por tipo de registro (MOTORISTA / VEICULOS / CARRETA).
// O Excel recusa nome de aba com mais de 31 caracteres ou com : \ / ? * [ ].
export function baixarXLSXAbas(abas, nome) {
  const wb = XLSX.utils.book_new();
  (abas || []).forEach((aba, i) => {
    const limpo = String(aba.nome || `Aba ${i + 1}`).replace(/[:\\/?*[\]]/g, " ").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, folhaDaMatriz(aba.matriz || []), limpo);
  });
  XLSX.writeFile(wb, `${nomeArquivo(nome)}.xlsx`);
}

// Separador ";" e BOM: é o que o Excel em pt-BR abre sem tela de importação.
export function baixarCSV(matriz, nome) {
  const csv = matriz.map((linha) => linha.map((v) => {
    const s = txt(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(";")).join("\r\n");
  baixar(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `${nomeArquivo(nome)}.csv`);
}

// PDF de verdade (arquivo baixado), não janela de impressão: metade do uso do app
// é no celular, onde "imprimir → salvar como PDF" não existe direito.
// jsPDF entra por import dinâmico — só baixa pra quem clicar em PDF.
export async function baixarPDF(matriz, { nome, titulo, subtitulo, paisagem = true } = {}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const m = retangular(matriz);
  const doc = new jsPDF({ orientation: paisagem ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const larg = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(String(titulo || nome || "Relatório"), 32, 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110);
  doc.text(
    `${subtitulo ? subtitulo + " · " : ""}${Math.max(0, m.length - 1)} linha(s) · gerado em ${new Date().toLocaleString("pt-BR")}`,
    32, 47
  );

  // Coluna numérica alinha à direita — a decisão vem do CONTEÚDO, não do rótulo,
  // porque quem chama nem sempre declara tipo.
  const numerica = (i) => {
    const vals = m.slice(1).map((r) => r[i]).filter((v) => v !== "" && v !== null && v !== undefined);
    return vals.length > 0 && vals.every((v) => typeof v === "number" || /^-?[\d.,]+%?$/.test(String(v)));
  };
  const alinhamento = {};
  (m[0] || []).forEach((_, i) => { if (numerica(i)) alinhamento[i] = { halign: "right" }; });

  autoTable(doc, {
    head: [m[0].map(txt)],
    body: m.slice(1).map((r) => r.map(txt)),
    startY: 58,
    margin: { left: 32, right: 32, bottom: 34 },
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 3, overflow: "linebreak", textColor: 30 },
    headStyles: { fillColor: [40, 44, 52], textColor: 255, fontSize: 7, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 247, 249] },
    columnStyles: alinhamento,
    didDrawPage: (d) => {
      const alt = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(140);
      doc.text("Controle Operacional · YFGroup", 32, alt - 16);
      doc.text(`Página ${d.pageNumber}`, larg - 32, alt - 16, { align: "right" });
    },
  });

  doc.save(`${nomeArquivo(nome)}.pdf`);
}

// Atalho pra quem tem linhas + colunas e não quer montar a matriz.
export const exportar = (formato, linhas, cols, opts = {}) => {
  const matriz = matrizDeColunas(linhas, cols);
  if (formato === "csv") return baixarCSV(matriz, opts.nome);
  if (formato === "pdf") return baixarPDF(matriz, opts);
  return baixarXLSX(matriz, opts.nome);
};
