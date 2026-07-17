-- =============================================
-- Migration 019: conciliar_sem_dt_existentes() — reconciliação em lote
-- =============================================
-- O gatilho trg_conciliar_sem_dt (018) só fecha uma pendência quando um DT NOVO entra em
-- controle_operacional. Mas a captura do sync gera pendências para linhas-espelho SEM DT
-- cuja carga JÁ tinha entrado com DT em outra linha da planilha — essas não passam pelo
-- gatilho e ficariam 'pendente' pra sempre (na 1ª rodada real foram 133 de 142 assim).
--
-- Esta função concilia em lote contra os DTs já existentes (match placa+data_carr+origem,
-- ignorando caixa/espaços). O SyncSupabase.gs a chama a cada rodada (self-heal). Retorna
-- quantas conciliou. Rodada inicial fechou as 133 linhas-espelho, deixando 9 pendências
-- reais (6 celulose de julho + 3 papel antigas).

CREATE OR REPLACE FUNCTION conciliar_sem_dt_existentes()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE n integer;
BEGIN
  UPDATE controle_operacional_sem_dt p
     SET status = 'conciliado', dt_conciliado = o.dt, atualizado_em = now()
    FROM controle_operacional o
   WHERE p.status IN ('pendente','confirmado')
     AND o.dt IS NOT NULL AND btrim(o.dt) <> ''
     AND o.placa IS NOT NULL AND btrim(o.placa) <> ''
     AND upper(btrim(o.placa)) = upper(btrim(p.placa))
     AND btrim(coalesce(o.data_carr,'')) = btrim(coalesce(p.data_carr,''))
     AND upper(btrim(coalesce(o.origem,''))) = upper(btrim(coalesce(p.origem,'')));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
