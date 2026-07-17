-- =============================================
-- Migration 017: marcar_fora_planilha com WHERE (fix HTTP 400 no sync)
-- =============================================
-- A RPC fazia UPDATE controle_operacional SET fora_planilha = ... SEM cláusula WHERE,
-- ou seja, reescrevia a tabela inteira a cada rodada do sync (15 min). O Postgres/Supabase
-- passou a bloquear UPDATE sem WHERE (erro 21000: "UPDATE requires a WHERE clause"), então
-- o flag fora_planilha deixou de ser atualizado — aparecia em erros_detalhes do painel de sync.
--
-- Pré-existente, sem relação com a coluna tipo_carga (016). O WHERE abaixo restringe às
-- linhas cujo valor REALMENTE mudaria: mesma semântica de antes, satisfaz o guard e evita
-- reescrever ~1030 linhas (e gerar WAL) toda rodada quando nada mudou.

CREATE OR REPLACE FUNCTION public.marcar_fora_planilha(p_dts text[])
RETURNS void
LANGUAGE sql
AS $function$
  UPDATE controle_operacional
  SET fora_planilha = NOT (dt = ANY(p_dts))
  WHERE fora_planilha IS DISTINCT FROM NOT (dt = ANY(p_dts));
$function$;
