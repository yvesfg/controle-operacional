-- =============================================
-- Migration 024: fixa search_path nas funções SECURITY DEFINER (hardening)
-- =============================================
-- APLICADA EM PROD 2026-07-22 (via MCP). Fecha o advisor "Function Search Path
-- Mutable" para as 7 funções SECURITY DEFINER que estavam sem search_path fixo.
-- Elas rodam como owner; sem search_path pinado, um search_path malicioso do
-- chamador poderia resolver um objeto plantado em outro schema (privesc).
--
-- Sem behavior change: todas só usam objetos de public (qualificados ou não),
-- auth.uid() (qualificado) e built-ins de pg_catalog. Verificado: após aplicar,
-- 0 funções SECURITY DEFINER sem search_path.

ALTER FUNCTION public.handle_hub_new_user()                            SET search_path = public;
ALTER FUNCTION public.listar_ocorrencias(text, text)                   SET search_path = public;
ALTER FUNCTION public.listar_ocorrencias_bulk(text, text[])            SET search_path = public;
ALTER FUNCTION public.listar_operacional(text, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.listar_usuarios(text)                            SET search_path = public;
ALTER FUNCTION public.listar_usuarios_pendentes(text)                  SET search_path = public;
ALTER FUNCTION public.meus_modulos()                                   SET search_path = public;
