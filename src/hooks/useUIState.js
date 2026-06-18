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
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [adminEmailVal, setAdminEmailVal] = useState(() => loadJSON("co_admin_email", "yvesfg@gmail.com"));

  // Dimensões e sidebar
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadJSON("co_sidebar_collapsed", window.innerWidth >= 768 && window.innerWidth < 1200));
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(false);

  useEffect(() => {
    const fn = () => { setIsMobile(window.innerWidth <= 600); setIsWide(window.innerWidth >= 768); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => { saveJSON("co_sidebar_collapsed", sidebarCollapsed); }, [sidebarCollapsed]);

  return {
    alertasOpen, setAlertasOpen, baseMenuOpen, setBaseMenuOpen,
    conexoesOpen, setConexoesOpen, contatosAdminOpen, setContatosAdminOpen,
    gsheetsOpen, setGsheetsOpen, oauthAccessOpen, setOauthAccessOpen,
    syncStatus, setSyncStatus, syncStatusLoading, setSyncStatusLoading,
    adminEmailVal, setAdminEmailVal,
    isMobile, setIsMobile, isWide, setIsWide,
    sidebarCollapsed, setSidebarCollapsed, mobileSidebarExpanded, setMobileSidebarExpanded,
  };
}
