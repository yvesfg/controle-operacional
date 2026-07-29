-- 044_listar_bases_sem_token_bootstrap.sql  (APLICADA em prod 2026-07-29)
--
-- `listar_bases` deixa de exigir token (a 043 a criou token-validada).
--
-- Motivo (bootstrap): o app mapeia id -> base no LOGIN (useAuthHandlers) e no Hub,
-- que acontecem ANTES de existir sessao — exigir token ali e impossivel, ja que o token
-- e o RESULTADO do login. Sem isso, base nova cadastrada no banco nunca apareceria
-- para o usuario escolher, e a Fase 4 perderia o proposito.
--
-- Por que e seguro: o conteudo e o MESMO que ja viaja no bundle publico hoje
-- (constants.js BASES: id, label, nome da tabela) mais flags de feature. Nao ha dado
-- operacional, pessoal nem financeiro. A ESCRITA continua fechada em admin (043).

DROP FUNCTION IF EXISTS public.listar_bases(text);

CREATE OR REPLACE FUNCTION public.listar_bases()
 RETURNS SETOF json LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT row_to_json(b) FROM (
    SELECT id, label, tabela, perfil, ordem FROM co_bases
     WHERE ativo ORDER BY ordem, label
  ) b;
$function$;

REVOKE ALL ON FUNCTION public.listar_bases() FROM public;
GRANT EXECUTE ON FUNCTION public.listar_bases() TO anon;
