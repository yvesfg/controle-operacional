import { useCallback } from "react";
import { loadJSON, saveJSON } from "../utils.js";
import { supaFetch } from "../supabase.js";
import { TABLE_LOGS } from "../constants.js";

export function useAdminHandlers({ getConexao, showToast, emailTemplate, setLogsData, usuarioLogado, perfil }) {
// ── Log de alterações (Item 8) ──
const registrarLog = useCallback(async (acao, descricao, dados_antes = null, dados_depois = null) => {
  const conn = getConexao();
  const entrada = {
    data_hora: new Date().toISOString(),
    usuario: usuarioLogado || perfil || "sistema",
    perfil_usuario: perfil || "desconhecido",
    acao,
    descricao,
    dados_antes: dados_antes ? JSON.stringify(dados_antes) : null,
    dados_depois: dados_depois ? JSON.stringify(dados_depois) : null,
  };
  // Salva local como fallback
  const logsLocal = loadJSON("co_logs_local", []);
  logsLocal.unshift(entrada);
  saveJSON("co_logs_local", logsLocal.slice(0, 200)); // máximo 200 entradas locais
  // Salva no Supabase
  if (conn) {
    try { await supaFetch(conn.url, conn.key, "POST", TABLE_LOGS, [entrada]); } catch { /* silencioso */ }
  }
}, [getConexao, usuarioLogado, perfil]);

// Item 7 — Gerar email de boas-vindas
const gerarCorpoEmail = useCallback((template, usuario, senhaPlain = "") => {
  return (template.corpo || "")
    .replace(/{nome}/g, usuario.nome || "")
    .replace(/{email}/g, usuario.email || "")
    .replace(/{senha}/g, senhaPlain || "(senha definida no cadastro)")
    .replace(/{perfil}/g, usuario.perfil || "operador");
}, []);

const enviarEmailBoasVindas = useCallback((usuario, senhaPlain = "", forcarExterno = false) => {
  const corpo = gerarCorpoEmail(emailTemplate, usuario, senhaPlain);
  const assunto = (emailTemplate.assunto || "").replace(/{nome}/g, usuario.nome || "");
  if (forcarExterno) {
    // Abre cliente de email externo (Mail, Outlook, etc)
    const mailtoLink = `mailto:${usuario.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.open(mailtoLink, "_blank");
  } else {
    // Abre Gmail diretamente
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(usuario.email)}&su=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.open(gmailUrl, "_blank");
  }
  showToast(`📧 Email preparado para ${usuario.email}`,"ok");
}, [emailTemplate, gerarCorpoEmail, showToast]);

// Item 8 — Carregar logs do Supabase
const carregarLogs = useCallback(async () => {
  const conn = getConexao();
  if (!conn) {
    setLogsData(loadJSON("co_logs_local", []));
    return;
  }
  try {
    const data = await supaFetch(conn.url, conn.key, "GET",
      `${TABLE_LOGS}?order=data_hora.desc&limit=100&select=*`);
    if (Array.isArray(data)) setLogsData(data);
  } catch {
    setLogsData(loadJSON("co_logs_local", []));
  }
}, [getConexao]);

  return { registrarLog, gerarCorpoEmail, enviarEmailBoasVindas, carregarLogs };
}
