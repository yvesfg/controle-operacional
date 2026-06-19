// ── supabaseAuth.js — cliente Supabase Auth (identidade única do Hub YFGroup) ──
// Login só via Google. A sessão (JWT) é o que dá acesso ao Hub e o SSO da Frota.
import { createClient } from "@supabase/supabase-js";
import { ENV_SUPA_URL, ENV_SUPA_KEY } from "./constants.js";

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
