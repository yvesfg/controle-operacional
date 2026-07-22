import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './design-system/tokens.css'
import './design-system/theme-dark.css'
import './design-system/theme-light.css'
import './design-system/components.css'
import './design-system/layout.css'

// Auto-reload quando um chunk lazy falha (deploy novo invalida hashes antigos).
// Recarrega 1x pra pegar o index.html novo; guard evita loop.
function _recarregarSeChunkVelho(msg) {
  if (!/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg || "")) return;
  if (sessionStorage.getItem("co_chunk_reloaded")) return;
  sessionStorage.setItem("co_chunk_reloaded", "1");
  window.location.reload();
}
window.addEventListener("vite:preloadError", () => _recarregarSeChunkVelho("dynamically imported module"));
window.addEventListener("unhandledrejection", (e) => _recarregarSeChunkVelho(e?.reason?.message));
window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem("co_chunk_reloaded"), 5000));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
