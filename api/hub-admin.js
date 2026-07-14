// ─────────────────────────────────────────────────────────
//  Ações administrativas do Hub que exigem a Admin API do Supabase (service
//  role) — a chave anon do app não tem permissão pra isso. Hoje só reset de
//  senha de usuário de teste; segue o mesmo padrão de api/ai-extract.js.
//
//  Auth: exige o access_token (JWT) de quem chama no header Authorization,
//  e confirma no PRÓPRIO Supabase que esse usuário é admin do hub
//  (is_hub_admin()) antes de fazer qualquer coisa com a service role.
//  Sem SUPABASE_SERVICE_ROLE_KEY configurada, o endpoint responde 500 com
//  uma mensagem clara em vez de falhar silencioso.
// ─────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) { res.status(500).json({ error: "Supabase não configurado no servidor" }); return; }
  if (!serviceKey) { res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada — peça pro admin adicionar essa variável de ambiente (Supabase > Settings > API > service_role)." }); return; }

  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) { res.status(401).json({ error: "Sem sessão" }); return; }

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: souAdmin, error: errAdmin } = await callerClient.rpc("is_hub_admin");
  if (errAdmin || !souAdmin) { res.status(403).json({ error: "Apenas admin do Hub pode fazer isso" }); return; }

  const { action, userId, newPassword } = req.body || {};
  const admin = createClient(url, serviceKey);

  try {
    if (action === "reset_password") {
      if (!userId || !newPassword || newPassword.length < 6) { res.status(400).json({ error: "userId e newPassword (mín. 6 caracteres) são obrigatórios" }); return; }
      const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }
    if (action === "delete_test_user") {
      if (!userId) { res.status(400).json({ error: "userId é obrigatório" }); return; }
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ error: "Ação desconhecida" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Falha ao processar" });
  }
}
