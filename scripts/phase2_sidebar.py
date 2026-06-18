from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

# 1. Add import after AppSidebar
OLD_IMPORT = "import PrimeiroLoginScreen from './screens/PrimeiroLoginScreen.jsx';"
NEW_IMPORT = """import PrimeiroLoginScreen from './screens/PrimeiroLoginScreen.jsx';
import AppSidebar from './components/AppSidebar.jsx';"""
assert content.count(OLD_IMPORT) == 1
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)
print("Import added")

# 2. Replace the sidebar block
OLD_SIDEBAR_START = "      {/* ════════════════════════════════════════════\n          SIDEBAR — sempre visível; icons no mobile, expand ao clicar\n      ════════════════════════════════════════════ */}\n      <aside"
OLD_SIDEBAR_END = "      </aside>"

start_pos = content.find(OLD_SIDEBAR_START)
assert start_pos > 0, "Could not find sidebar start"

end_pos = content.find(OLD_SIDEBAR_END, start_pos)
assert end_pos > start_pos, "Could not find </aside>"
# Include the </aside> itself
end_pos += len(OLD_SIDEBAR_END)

old_sidebar = content[start_pos:end_pos]
new_sidebar = """      {/* ════════════════════════════════════════════
          SIDEBAR — sempre visível; icons no mobile, expand ao clicar
      ════════════════════════════════════════════ */}
      <AppSidebar
        t={t}
        isWide={isWide} mobileSidebarExpanded={mobileSidebarExpanded} setMobileSidebarExpanded={setMobileSidebarExpanded}
        sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
        hIco={hIco}
        tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}
        setWppTipoOpen={setWppTipoOpen}
        theme={theme} setTheme={setTheme}
        isAdmin={isAdmin} setModalOpen={setModalOpen}
        usuarioLogado={usuarioLogado} perfil={perfil}
        handleLogout={handleLogout}
      />"""

assert content.count(old_sidebar) == 1, f"sidebar block not unique: {content.count(old_sidebar)}"
content = content.replace(old_sidebar, new_sidebar, 1)
print("Sidebar replaced")

app.write_text(content, encoding="utf-8")
print("Done")
