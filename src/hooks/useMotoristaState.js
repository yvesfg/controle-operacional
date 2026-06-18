import { useState } from "react";

export function useMotoristaState() {
  const [motBusca, setMotBusca] = useState("");

  // Importação de contatos
  const [motImportOpen, setMotImportOpen] = useState(false);
  const [motImportData, setMotImportData] = useState(null);
  const [motImportConfirm, setMotImportConfirm] = useState("");
  const [motImportStep, setMotImportStep] = useState(1);

  // Sugestão de compatíveis
  const [motSugestOpen, setMotSugestOpen] = useState(false);
  const [motSugestData, setMotSugestData] = useState([]);

  // Seleção em lote
  const [motSelecionados, setMotSelecionados] = useState(new Set());
  const [motExcluirLoteTexto, setMotExcluirLoteTexto] = useState("");
  const [motExcluirLoteOpen, setMotExcluirLoteOpen] = useState(false);

  // Excluir TODOS (admin)
  const [motExcluirTodosOpen, setMotExcluirTodosOpen] = useState(false);
  const [motExcluirTodosTexto, setMotExcluirTodosTexto] = useState("");

  // Paginação + filtro de prefixos na importação
  const [motPagina, setMotPagina] = useState(1);
  const [motImportPrefOpen, setMotImportPrefOpen] = useState(false);
  const [motImportRaw, setMotImportRaw] = useState([]);
  const [motImportPrefSel, setMotImportPrefSel] = useState(new Set());
  const [motImportPrefBusca, setMotImportPrefBusca] = useState("");

  // Duplicata no cadastro
  const [motDupSugest, setMotDupSugest] = useState(null);

  return {
    motBusca, setMotBusca,
    motImportOpen, setMotImportOpen, motImportData, setMotImportData,
    motImportConfirm, setMotImportConfirm, motImportStep, setMotImportStep,
    motSugestOpen, setMotSugestOpen, motSugestData, setMotSugestData,
    motSelecionados, setMotSelecionados, motExcluirLoteTexto, setMotExcluirLoteTexto,
    motExcluirLoteOpen, setMotExcluirLoteOpen, motExcluirTodosOpen, setMotExcluirTodosOpen,
    motExcluirTodosTexto, setMotExcluirTodosTexto, motPagina, setMotPagina,
    motImportPrefOpen, setMotImportPrefOpen, motImportRaw, setMotImportRaw,
    motImportPrefSel, setMotImportPrefSel, motImportPrefBusca, setMotImportPrefBusca,
    motDupSugest, setMotDupSugest,
  };
}
