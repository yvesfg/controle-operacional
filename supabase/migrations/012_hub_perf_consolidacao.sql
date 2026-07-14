-- =============================================
-- Migration 012: consolidação de policies + índices do Hub (performance)
-- =============================================
-- Continuação da 011 (que envolveu auth.uid()/auth.role() em subquery).
-- Advisor ainda acusava, no schema public:
--   * multiple_permissive_policies em hub_profiles (5) e hub_user_modulos (5)
--   * unindexed_foreign_keys em hub_user_modulos.modulo_slug
--   * duplicate_index em co_config
-- Tudo isso está no CAMINHO CRÍTICO do login/Hub (queixa real: "demorado pra
-- abrir o Hub e o Gerenciar acessos").
--
-- Multiple permissive policies: quando 2+ policies PERMISSIVAS cobrem o mesmo
-- comando, o Postgres avalia TODAS e faz OR do resultado. Em hub_profiles e
-- hub_user_modulos o SELECT batia em 2 policies, e a segunda chamava
-- is_hub_admin() (que por dentro faz outro SELECT) sem subquery — reavaliado
-- por linha. Consolidar em UMA policy por comando, com o mesmo OR explícito,
-- é semanticamente equivalente (mesmo resultado) e avalia uma vez só.
--
-- NÃO mexe no schema `frota` (85 dos 95 avisos de policy e 26 dos 27 FKs sem
-- índice estão lá): é o app frota-pro, tabelas vazias, projeto separado —
-- mexer ali é risco sem ganho pra este app.

-- ── hub_profiles ──────────────────────────────────────────────────────────
-- Antes: hub_profiles_own (ALL, próprio) + hub_profiles_admin_read (SELECT, admin).
-- Depois: SELECT = próprio OR admin; escrita continua só do próprio (admin
-- nunca teve write aqui — a RPC hub_admin_set_status é SECURITY DEFINER e
-- bypassa RLS, então não depende destas policies).
DROP POLICY IF EXISTS hub_profiles_own        ON hub_profiles;
DROP POLICY IF EXISTS hub_profiles_admin_read ON hub_profiles;

CREATE POLICY hub_profiles_select ON hub_profiles FOR SELECT
  USING ((select auth.uid()) = id OR (select is_hub_admin()));
CREATE POLICY hub_profiles_insert ON hub_profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY hub_profiles_update ON hub_profiles FOR UPDATE
  USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
CREATE POLICY hub_profiles_delete ON hub_profiles FOR DELETE
  USING ((select auth.uid()) = id);

-- ── hub_user_modulos ──────────────────────────────────────────────────────
-- Antes: hub_user_modulos_own (SELECT, próprio) + hub_user_modulos_admin (ALL, admin).
-- Depois: SELECT = próprio OR admin; escrita só admin (igual antes).
DROP POLICY IF EXISTS hub_user_modulos_own   ON hub_user_modulos;
DROP POLICY IF EXISTS hub_user_modulos_admin ON hub_user_modulos;

CREATE POLICY hub_user_modulos_select ON hub_user_modulos FOR SELECT
  USING ((select auth.uid()) = user_id OR (select is_hub_admin()));
CREATE POLICY hub_user_modulos_insert ON hub_user_modulos FOR INSERT
  WITH CHECK ((select is_hub_admin()));
CREATE POLICY hub_user_modulos_update ON hub_user_modulos FOR UPDATE
  USING ((select is_hub_admin())) WITH CHECK ((select is_hub_admin()));
CREATE POLICY hub_user_modulos_delete ON hub_user_modulos FOR DELETE
  USING ((select is_hub_admin()));

-- ── Índices ───────────────────────────────────────────────────────────────
-- FK sem índice: todo JOIN hub_user_modulos -> hub_modulos (o que meus_modulos()
-- faz a CADA login) varria a tabela.
CREATE INDEX IF NOT EXISTS idx_hub_user_modulos_modulo_slug ON hub_user_modulos (modulo_slug);

-- idx_config_chave é idêntico ao índice da PK (co_config_pkey) — puro custo de
-- escrita e espaço, zero benefício de leitura.
DROP INDEX IF EXISTS idx_config_chave;
