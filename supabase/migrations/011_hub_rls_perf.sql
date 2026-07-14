-- =============================================
-- Migration 011: fix de performance nas policies do Hub
-- =============================================
-- Supabase Performance Advisor acusou "Auth RLS Initialization Plan" em
-- hub_profiles e hub_modulos: `auth.uid()`/`auth.role()` chamados direto na
-- policy fazem o Postgres reavaliar a função LINHA A LINHA em vez de uma vez
-- só por query. Fix documentado: envolver em subquery `(select auth.uid())`.
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Contexto: investigando lentidão relatada no Hub (login/Gerenciar acessos
-- "demorado" depois das mudanças da sessão 42) -- via EXPLAIN ANALYZE a
-- query em si sempre rodou em <10ms; a demora real (10-40s, medida via
-- REST) parece ligada ao cache de schema do PostgREST reconstruindo depois
-- de 5 migrations seguidas (006-010) nesta mesma sessão, já que a maioria
-- das tabelas normalizou sozinha depois de um tempo/reload manual
-- (NOTIFY pgrst, 'reload schema'). Esses dois achados de RLS são reais e
-- documentados pelo proprio Advisor, então corrigidos aqui de qualquer forma
-- -- não custam nada e são exatamente o tipo de coisa que piora com escala.

ALTER POLICY hub_profiles_own ON hub_profiles USING ((select auth.uid()) = id);
ALTER POLICY hub_modulos_read ON hub_modulos USING ((select auth.role()) = 'authenticated');
ALTER POLICY hub_user_modulos_own ON hub_user_modulos USING ((select auth.uid()) = user_id);
