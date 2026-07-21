-- =============================================
-- Migration 022: conciliação nunca trata 'x'/'X' como DT real
-- =============================================
-- Regra de negócio (Yves): 'x'/'X' na coluna DT = carga REAL que ficou SEM DT (ex.: sistema
-- da Suzano fora do ar). NÃO pode ser desconsiderada — fica na fila 'Cargas sem DT' pra
-- validação humana até o DT verdadeiro sair.
--
-- Bug corrigido aqui: o gatilho (018) e a RPC em lote (019/021) checavam só `dt <> ''` pra
-- considerar um DT "existente". Como 'x' não é vazio, uma linha-fantasma com dt='x' na
-- principal fazia a conciliação FECHAR por engano a pendência correspondente
-- (dt_conciliado='x'), SUMINDO a carga da fila de validação. Casos reais: ANTONIO, FLAVIO
-- (sem DT de verdade) e JOSUE (esse tinha DT real, mas casou com o 'x' antes).
--
-- Fix cirúrgico: adiciona `upper(btrim(dt)) <> 'X'` nos matches. Nada mais muda — DT real
-- continua conciliando igual; só o 'x'/'X' deixa de ser aceito como DT.

-- Gatilho por-linha (substitui a versão da 018)
CREATE OR REPLACE FUNCTION conciliar_sem_dt_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 'x'/'X' nao e DT real — nunca concilia.
  IF NEW.dt IS NULL OR btrim(NEW.dt) = '' OR upper(btrim(NEW.dt)) = 'X'
     OR NEW.placa IS NULL OR btrim(NEW.placa) = '' THEN
    RETURN NEW;
  END IF;
  UPDATE controle_operacional_sem_dt p
     SET status = 'conciliado', dt_conciliado = NEW.dt, atualizado_em = now()
   WHERE p.status IN ('pendente','confirmado')
     AND upper(btrim(p.placa))  = upper(btrim(NEW.placa))
     AND btrim(coalesce(p.data_carr,'')) = btrim(coalesce(NEW.data_carr,''))
     AND upper(btrim(coalesce(p.origem,''))) = upper(btrim(coalesce(NEW.origem,'')));
  RETURN NEW;
END;
$$;

-- Reconciliação em lote (substitui a versão da 021) — mesmos 2 passos + guarda 'x'/'X'
CREATE OR REPLACE FUNCTION conciliar_sem_dt_existentes()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE n integer; m integer;
BEGIN
  -- 1) Match forte: placa + data_carr + origem
  UPDATE controle_operacional_sem_dt p
     SET status = 'conciliado', dt_conciliado = o.dt, atualizado_em = now()
    FROM controle_operacional o
   WHERE p.status IN ('pendente','confirmado')
     AND o.dt IS NOT NULL AND btrim(o.dt) <> '' AND upper(btrim(o.dt)) <> 'X'
     AND o.placa IS NOT NULL AND btrim(o.placa) <> ''
     AND upper(btrim(o.placa)) = upper(btrim(p.placa))
     AND btrim(coalesce(o.data_carr,'')) = btrim(coalesce(p.data_carr,''))
     AND upper(btrim(coalesce(o.origem,''))) = upper(btrim(coalesce(p.origem,'')));
  GET DIAGNOSTICS n = ROW_COUNT;

  -- 2) Fallback p/ pendencia SEM data_carr (mesma placa+origem+tipo_carga com DT real)
  UPDATE controle_operacional_sem_dt p
     SET status = 'conciliado', dt_conciliado = o.dt, atualizado_em = now()
    FROM controle_operacional o
   WHERE p.status IN ('pendente','confirmado')
     AND btrim(coalesce(p.data_carr,'')) = ''
     AND o.dt IS NOT NULL AND btrim(o.dt) <> '' AND upper(btrim(o.dt)) <> 'X'
     AND o.placa IS NOT NULL AND btrim(o.placa) <> ''
     AND upper(btrim(o.placa)) = upper(btrim(p.placa))
     AND upper(btrim(coalesce(o.origem,''))) = upper(btrim(coalesce(p.origem,'')))
     AND lower(btrim(coalesce(o.tipo_carga,'papel'))) = lower(btrim(coalesce(p.tipo_carga,'papel')));
  GET DIAGNOSTICS m = ROW_COUNT;

  RETURN n + m;
END;
$$;
