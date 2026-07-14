// ── supabaseAuth.js — cliente Supabase Auth (identidade única do Hub YFGroup) ──
// Login só via Google. A sessão (JWT) é o que dá acesso ao Hub e o SSO da Frota.
import { createClient } from "@supabase/supabase-js";
import { ENV_SUPA_URL, ENV_SUPA_KEY } from "./constants.js";

// Dominio ficticio -- nunca recebe email de verdade. Usuario de teste digita
// so o "usuario"; aqui vira um email sintetico pro Supabase Auth aceitar.
export const TEST_USER_DOMAIN = "teste.yfgroup.internal";
export const testUserEmail = (username) => `${username}@${TEST_USER_DOMAIN}`;
export const isTestUserEmail = (email) => (email || "").endsWith(`@${TEST_USER_DOMAIN}`);

export function gerarSenhaAleatoria() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Singleton — persiste sessão no localStorage e captura o #access_token do redirect OAuth.
let _client = null;
export function getSupaAuth() {
  if (_client) return _client;
  if (!ENV_SUPA_URL || !ENV_SUPA_KEY) return null;
  _client = createClient(ENV_SUPA_URL, ENV_SUPA_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "co_supa_auth",
    },
  });
  return _client;
}

// Inicia login Google (redireciona). redirectTo volta pra raiz do app.
export async function loginGoogle() {
  const sb = getSupaAuth();
  if (!sb) throw new Error("Supabase não configurado");
  return sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export async function getSessao() {
  const sb = getSupaAuth();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session ?? null;
}

export async function logoutSupa() {
  const sb = getSupaAuth();
  if (sb) { try { await sb.auth.signOut(); } catch {} }
}

// Módulos liberados ao usuário logado (RPC roda com o JWT → RLS via auth.uid()).
export async function fetchMeusModulos() {
  const sb = getSupaAuth();
  if (!sb) return [];
  const { data, error } = await sb.rpc("meus_modulos");
  if (error) { console.error("[hub] meus_modulos:", error.message); return []; }
  return data ?? [];
}

// Acesso do próprio usuário a um módulo (traz config: bases, perfil, perms finas).
export async function fetchMeuAcesso(slug) {
  const sb = getSupaAuth();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("hub_user_modulos")
    .select("role, ativo, config")
    .eq("user_id", user.id)
    .eq("modulo_slug", slug)
    .maybeSingle();
  if (error) { console.error("[hub] meu_acesso:", error.message); return null; }
  return data;
}

// Cria um usuario de teste (usuario+senha, sem email real) com acesso
// SOMENTE LEITURA (perfil "visualizador") a um modulo. Usa um client
// temporario (nao o singleton) pra nao derrubar a sessao do admin logado.
// Retorna { ok, error?, needsEmailConfirm? }.
export async function createTestViewer({ username, password, moduloSlug, nomeExibicao, bases = [] }) {
  if (!ENV_SUPA_URL || !ENV_SUPA_KEY) return { ok: false, error: "Supabase nao configurado" };
  const email = testUserEmail(username);
  const tempClient = createClient(ENV_SUPA_URL, ENV_SUPA_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "co_supa_test_tmp" },
  });
  const { data, error } = await tempClient.auth.signUp({
    email, password,
    options: { data: { full_name: nomeExibicao || `Teste - ${username}` } },
  });
  if (error) return { ok: false, error: error.message };
  const userId = data?.user?.id;
  if (!userId) return { ok: false, error: "Supabase nao retornou o id do usuario" };

  const sb = getSupaAuth();
  const role = moduloSlug === "controle_op" ? "viewer" : "viewer";
  const config = moduloSlug === "controle_op"
    ? { bases, perfil: "visualizador", perms: { financeiro:false, editar:false, importar:false, dashboard:true, diarias:true, descarga:true, planilha:true, config_db:false, usuarios:false, ocorrencias:false } }
    : {};
  const { error: errModulo } = await sb.from("hub_user_modulos").upsert(
    { user_id: userId, modulo_slug: moduloSlug, role, ativo: true, config },
    { onConflict: "user_id,modulo_slug" });
  if (errModulo) return { ok: false, error: errModulo.message };

  return { ok: true, needsEmailConfirm: !data?.session, email };
}

// Login do usuario de teste — mesmo client singleton do Google, pra a sessao
// persistir e o resto do app (Hub/App.jsx) tratar igual a qualquer login.
export async function loginTestUser(username, password) {
  const sb = getSupaAuth();
  if (!sb) return { ok: false, error: "Supabase nao configurado" };
  const { error } = await sb.auth.signInWithPassword({ email: testUserEmail(username), password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Status do perfil no Hub (aprova/nega) — RPC privilegiada (ver migration
// 010): decide o acesso por um campo PRÓPRIO em hub_profiles, não pela
// existência de linha em hub_user_modulos (era a causa do usuário ficar
// preso em "aguardando aprovação" depois de ter o acesso removido).
export async function hubAdminSetStatus(userId, status) {
  const sb = getSupaAuth();
  if (!sb) return { ok: false, error: "Supabase nao configurado" };
  const { error } = await sb.rpc("hub_admin_set_status", { p_user_id: userId, p_status: status });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Ações que exigem a Admin API do Supabase (service role) — via api/hub-admin.js,
// que confirma que quem chama é admin do hub antes de fazer qualquer coisa.
async function chamarHubAdminApi(body) {
  const sb = getSupaAuth();
  if (!sb) return { ok: false, error: "Supabase nao configurado" };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "Sem sessão" };
  const r = await fetch("/api/hub-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: data.error || `Erro ${r.status}` };
  return { ok: true, ...data };
}

// Reseta a senha de um usuário de teste — a senha nova fica visível pro admin
// (é ele quem escolhe/gera), diferente do fluxo de recuperação por email
// (que não existe pra esses usuários, o email é fictício).
export function resetTestUserPassword(userId, newPassword) {
  return chamarHubAdminApi({ action: "reset_password", userId, newPassword });
}

// Apaga de vez a conta de um usuário de teste (auth.users) — diferente de
// "negar acesso" (que só desativa os módulos, mantém a conta pra reativar
// depois). Usar quando o usuário de teste não serve mais pra nada.
export function deleteTestUser(userId) {
  return chamarHubAdminApi({ action: "delete_test_user", userId });
}
