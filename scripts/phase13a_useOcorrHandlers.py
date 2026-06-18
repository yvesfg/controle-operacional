"""Phase 13a: extract useOcorrHandlers from App.jsx"""
from pathlib import Path

ROOT = Path(__file__).parent.parent
app = ROOT / "src/App.jsx"
content = app.read_text(encoding="utf-8")

HOOK_CONTENT = '''\
import { useCallback } from "react";
import { loadJSON, saveJSON } from "../utils.js";
import { supaFetch } from "../supabase.js";
import { TABLE_OCORR } from "../constants.js";

export function useOcorrHandlers({
  getConexao, showToast, sessionToken, usuarioLogado, perfil, DADOS,
  setDetalheDT, setOcorrencias, setNovaOcorr, setOcorrListExpanded,
  setAcompDias, setAcompDiaSel, setAcompTexto, setAcompImagens, setModalOpen,
  setOcorrLoading,
  detalheDT, ocorrencias,
  ocorrModalNova, ocorrModalTipo, ocorrModalDT, ocorrModalList,
  setOcorrModalList, setOcorrModalNova, setOcorrModalDT, setOcorrModalRecord, setOcorrModalOpen,
}) {
  const abrirDetalhe = useCallback(async (reg) => {
    setDetalheDT(reg);
    setOcorrencias([]);
    setNovaOcorr("");
    setOcorrListExpanded(false);
    setAcompDias([]);
    setAcompDiaSel(null);
    setAcompTexto("");
    setAcompImagens([]);
    setModalOpen("detalhe");
    // Carregar acompanhamento local
    const acompLocal = JSON.parse(localStorage.getItem("co_acomp_"+reg.dt) || "[]");
    setAcompDias(acompLocal);
    // Carregar ocorrências locais
    const local = loadJSON(`co_ocorr_${reg.dt}`, []);
    setOcorrencias(local);
    // Carregar do Supabase
    const conn = getConexao();
    if (conn) {
      setOcorrLoading(true);
      try {
        const raw5 = sessionToken
          ? await supaFetch(conn.url, conn.key, "POST", "rpc/listar_ocorrencias",
              {p_token: sessionToken, p_dt: reg.dt})
          : await supaFetch(conn.url, conn.key, "GET",
              `${TABLE_OCORR}?dt=eq.${encodeURIComponent(reg.dt)}&order=data_hora.asc&select=*`);
        const data = Array.isArray(raw5) ? raw5.map(x => typeof x === "string" ? JSON.parse(x) : x) : [];
        if (Array.isArray(data)) {
          setOcorrencias(data);
          saveJSON(`co_ocorr_${reg.dt}`, data);
        }
      } catch { /* usa local */ }
      finally { setOcorrLoading(false); }
    }
  }, [getConexao]);

  const adicionarOcorrencia = useCallback(async ({dt, tipo, texto, nfs, localizacao}) => {
    if (!texto || !texto.trim() || !dt) return;
    const nova = {
      dt,
      data_hora: new Date().toISOString(),
      texto: texto.trim(),
      tipo: tipo || "info",
      usuario: usuarioLogado || perfil || "sistema",
      ...(nfs ? { nfs } : {}),
      ...(localizacao ? { localizacao } : {}),
    };
    // Se for o DT aberto no modal de detalhe, atualiza a lista local
    if (detalheDT && detalheDT.dt === dt) {
      const updated = [...ocorrencias, nova];
      setOcorrencias(updated);
      saveJSON(`co_ocorr_${dt}`, updated);
    } else {
      const existing = loadJSON(`co_ocorr_${dt}`, []);
      saveJSON(`co_ocorr_${dt}`, [...existing, nova]);
    }
    // Salvar no Supabase
    const conn = getConexao();
    if (conn) {
      try {
        await supaFetch(conn.url, conn.key, "POST", TABLE_OCORR, [nova]);
      } catch { /* silencioso */ }
    }
    showToast("✅ Ocorrência registrada","ok");
  }, [detalheDT, ocorrencias, getConexao, usuarioLogado, perfil, showToast]);

  // Salvar ocorrencia a partir de modal externo (OcorrenciasView)
  const salvarOcorrenciaExterna = useCallback(async (dt, tipo, texto, nfs, localizacao) => {
    if (!dt || !texto.trim()) return;
    const nova = {
      dt,
      data_hora: new Date().toISOString(),
      texto: texto.trim(),
      tipo,
      usuario: usuarioLogado || perfil || "sistema",
    };
    const existing = loadJSON(`co_ocorr_${dt}`, []);
    const updated = [...existing, nova];
    saveJSON(`co_ocorr_${dt}`, updated);
    const conn = getConexao();
    if (conn) {
      try { await supaFetch(conn.url, conn.key, "POST", TABLE_OCORR, [nova]); }
      catch { /* silencioso */ }
    }
    showToast("✅ Ocorrência registrada", "ok");
  }, [getConexao, usuarioLogado, perfil, showToast]);

  // Abre OcorrModal para nova ocorrência
  const abrirOcorrModal = (dt, record=null) => {
    setOcorrModalDT(dt);
    setOcorrModalRecord(record || DADOS.find(d=>d.dt===dt) || null);
    setOcorrModalOpen(true);
  };

  const adicionarOcorrenciaModal = useCallback(async () => {
    if (!ocorrModalNova.trim() || !ocorrModalDT) return;
    const nova = {
      dt: ocorrModalDT.dt,
      data_hora: new Date().toISOString(),
      texto: ocorrModalNova.trim(),
      tipo: ocorrModalTipo,
      usuario: usuarioLogado || perfil || "sistema",
    };
    const updated = [...ocorrModalList, nova];
    setOcorrModalList(updated);
    saveJSON(`co_ocorr_${ocorrModalDT.dt}`, updated);
    setOcorrModalNova("");
    const conn = getConexao();
    if (conn) {
      try { await supaFetch(conn.url, conn.key, "POST", TABLE_OCORR, [nova]); }
      catch { /* silencioso */ }
    }
    showToast("✅ Ocorrência registrada","ok");
  }, [ocorrModalNova, ocorrModalTipo, ocorrModalDT, ocorrModalList, getConexao, usuarioLogado, perfil, showToast]);

  return { abrirDetalhe, adicionarOcorrencia, salvarOcorrenciaExterna, abrirOcorrModal, adicionarOcorrenciaModal };
}
'''

hook_path = ROOT / "src/hooks/useOcorrHandlers.js"
hook_path.write_text(HOOK_CONTENT, encoding="utf-8")
print("Hook file written:", hook_path)

# ── Patch App.jsx using range-based replacement ──
# Find start and end anchors
START_ANCHOR = "  // ── Ocorrências ──\n  const abrirDetalhe"
END_ANCHOR = "  // handleLogin / handleLogout / handlePrimeiroLoginSalvar — via useAuthHandlers"

idx_start = content.index(START_ANCHOR)
idx_end = content.index(END_ANCHOR)

# Verify nothing unexpected between
block = content[idx_start:idx_end]
print(f"Block to replace: {len(block)} chars, first line: {block.splitlines()[0]!r}")

REPLACEMENT = '''  // ── Ocorrências ── via useOcorrHandlers
  const { abrirDetalhe, adicionarOcorrencia, salvarOcorrenciaExterna, abrirOcorrModal, adicionarOcorrenciaModal } = useOcorrHandlers({
    getConexao, showToast, sessionToken, usuarioLogado, perfil, DADOS,
    setDetalheDT, setOcorrencias, setNovaOcorr, setOcorrListExpanded,
    setAcompDias, setAcompDiaSel, setAcompTexto, setAcompImagens, setModalOpen,
    setOcorrLoading,
    detalheDT, ocorrencias,
    ocorrModalNova, ocorrModalTipo, ocorrModalDT, ocorrModalList,
    setOcorrModalList, setOcorrModalNova, setOcorrModalDT, setOcorrModalRecord, setOcorrModalOpen,
  });
  '''

content = content[:idx_start] + REPLACEMENT + content[idx_end:]

# 2. Add import after useAuthHandlers import
OLD_IMPORT = "import { useAuthHandlers } from './hooks/useAuthHandlers.js';"
NEW_IMPORT = (OLD_IMPORT + "\n"
              "import { useOcorrHandlers } from './hooks/useOcorrHandlers.js';")
assert content.count(OLD_IMPORT) == 1, "Import anchor not found exactly once"
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

app.write_text(content, encoding="utf-8")
print("App.jsx patched successfully")
print(f"New line count: {len(content.splitlines())}")
