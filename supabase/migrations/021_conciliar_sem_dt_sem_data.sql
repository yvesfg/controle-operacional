-- =============================================
-- Migration 021: conciliar_sem_dt_existentes() — fallback p/ pendência SEM data_carr
-- =============================================
-- O match da 019 (e do gatilho 018) exige placa+data_carr+origem iguais. Isso deixou 4
-- pendências de celulose PRESAS: foram capturadas SEM data_carr (aba geral de verificação,
-- jul/2026) e a mesma carga depois entrou com DT real na aba dedicada '07/2026 CELULOSE'
-- (indo direto pra principal). Como a pendência ficou com data_carr vazio, nunca casava.
--
-- Fix: um 2º passo que fecha SÓ pendências com data_carr vazio quando a MESMA
-- placa+origem+tipo_carga já tem carga com DT real na principal. Pendência COM data_carr
-- continua exigindo o match exato do passo 1 — nada muda pra elas. "Reabrir" reverte
-- qualquer conciliação equivocada. Roda a cada sync (self-heal), junto com o passo 1.
--
-- Nota: com o fix de duplicidade da celulose no SyncSupabase.gs (celulose só da aba
-- dedicada, que já traz DT+data), esse órfão não deve se repetir — isto é blindagem.

CREATE OR REPLACE FUNCTION conciliar_sem_dt_existentes()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE n integer; m integer;
BEGIN
  -- 1) Match forte: placa + data_carr + origem (comportamento original da 019)
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

  -- 2) Fallback p/ pendência SEM data_carr — não casaria no passo 1. Fecha quando a MESMA
  --    placa+origem+tipo_carga já tem carga com DT real na principal. Restrito a data_carr
  --    vazio de propósito: pendência com data segue exigindo match exato.
  UPDATE controle_operacional_sem_dt p
     SET status = 'conciliado', dt_conciliado = o.dt, atualizado_em = now()
    FROM controle_operacional o
   WHERE p.status IN ('pendente','confirmado')
     AND btrim(coalesce(p.data_carr,'')) = ''
     AND o.dt IS NOT NULL AND btrim(o.dt) <> ''
     AND o.placa IS NOT NULL AND btrim(o.placa) <> ''
     AND upper(btrim(o.placa)) = upper(btrim(p.placa))
     AND upper(btrim(coalesce(o.origem,''))) = upper(btrim(coalesce(p.origem,'')))
     AND lower(btrim(coalesce(o.tipo_carga,'papel'))) = lower(btrim(coalesce(p.tipo_carga,'papel')));
  GET DIAGNOSTICS m = ROW_COUNT;

  RETURN n + m;
END;
$$;
