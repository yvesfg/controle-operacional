import { useState, useEffect } from "react";
import { loadJSON, saveJSON } from "../utils.js";

export function useUIState() {
  // Painéis admin
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [baseMenuOpen, setBaseMenuOpen] = useState(false);
  const [conexoesOpen, setConexoesOpen] = useState(false);
  const [contatosAdminOpen, setContatosAdminOpen] = useState(false);
  const [gsheetsOpen, setGsheetsOpen] = useState(false);
  const [oauthAccessOpen, setOauthAccessOpen] = useState(false);
  // "Colar faturamento" — caminho inverso do card do WhatsApp.
  // null = fechado; { texto } = aberto com o bloco que veio de quem chamou.
  const [faturaColarOpen, setFaturaColarOpen] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [adminEmailVal, setAdminEmailVal] = useState(() => loadJSON("co_admin_email", "yvesfg@gmail.com"));

  // Dimensões e sidebar
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 768);
  // Terceira faixa, acima de isWide: largura em que um modal cabe em DUAS colunas
  // lado a lado sem espremer nenhuma. Em 768 (isWide) daria ~370px por coluna,
  // estreito demais pra tabela de conferência — por isso 1024 e não 768.
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadJSON("co_sidebar_collapsed", window.innerWidth >= 768 && window.innerWidth < 1200));
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);

  useEffect(() => {
    const fn = () => {
      setIsMobile(window.innerWidth <= 600);
      setIsWide(window.innerWidth >= 768);
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => { saveJSON("co_sidebar_collapsed", sidebarCollapsed); }, [sidebarCollapsed]);

  return {
    alertasOpen, setAlertasOpen, baseMenuOpen, setBaseMenuOpen,
    conexoesOpen, setConexoesOpen, contatosAdminOpen, setContatosAdminOpen,
    gsheetsOpen, setGsheetsOpen, oauthAccessOpen, setOauthAccessOpen,
    faturaColarOpen, setFaturaColarOpen,
    syncStatus, setSyncStatus, syncStatusLoading, setSyncStatusLoading,
    adminEmailVal, setAdminEmailVal,
    isMobile, setIsMobile, isWide, setIsWide, isDesktop, setIsDesktop,
    sidebarCollapsed, setSidebarCollapsed, mobileSidebarExpanded, setMobileSidebarExpanded,
  };
}
