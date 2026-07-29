-- 046_embarcadoras_regra_de_inatividade.sql  (APLICADA em prod 2026-07-29)
--
-- Regra do Yves para o cadastro de embarcadoras:
--   (a) regra de devolucao/FOB fica DESATIVADA -- so o cliente final importa;
--   (b) cliente sem movimento em 15 dias fica DESATIVADO.
--
-- ⚠️ PRE-REQUISITO no front (useEmbarcadoras.js, mesmo commit): o mapa CNPJ->embarcadora
-- usado pela IMPORTACAO passou a ser montado a partir de TODAS (inclusive inativas).
-- Antes vinha da lista filtrada por `ativo` -- e como o import resolve o CNPJ por esse
-- mapa (ConferenciaFrete -> parseFreteXLSX -> clienteEfetivo), desativar uma regra de
-- devolucao faria o CNPJ voltar a cair em "nao cadastrado" no proximo arquivo e a
-- receita deixaria de ser roteada pro cliente final -- o oposto do pedido.
-- `ativo` controla o que APARECE na tela; nunca como o arquivo e lido.

-- ── Reativacao automatica: voltou a ter movimento, volta a aparecer ─────────
-- Contrapartida necessaria da regra dos 15 dias: sem isto, cliente desativado por
-- inatividade sumiria da tela mesmo depois de voltar a rodar.
CREATE OR REPLACE FUNCTION public.reativar_embarcadora_com_movimento()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE embarcadoras
     SET ativo = true
   WHERE cnpj = NEW.cnpj_remetente
     AND coalesce(tipo,'cliente') <> 'devolucao'   -- FOB permanece desativada de proposito
     AND ativo IS DISTINCT FROM true;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reativar_embarcadora_com_movimento ON frete_conferencia;
CREATE TRIGGER trg_reativar_embarcadora_com_movimento
AFTER INSERT ON frete_conferencia
FOR EACH ROW EXECUTE FUNCTION reativar_embarcadora_com_movimento();

-- ── Regra dos 15 dias, aplicavel quando quiser (idempotente) ────────────────
-- Nao mexe em regra de devolucao e nao reativa ninguem -- so desliga quem passou do
-- prazo. Devolve quantas desligou. Rodar: select desativar_embarcadoras_sem_movimento();
CREATE OR REPLACE FUNCTION public.desativar_embarcadoras_sem_movimento(p_dias int DEFAULT 15)
 RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_n int;
BEGIN
  WITH ult AS (
    SELECT e.cnpj, max(f.data_emissao)::date AS ultimo
      FROM embarcadoras e
      LEFT JOIN frete_conferencia f ON f.cnpj_remetente = e.cnpj
     WHERE coalesce(e.tipo,'cliente') <> 'devolucao' AND e.ativo
     GROUP BY e.cnpj
  )
  UPDATE embarcadoras e SET ativo = false
    FROM ult
   WHERE e.cnpj = ult.cnpj
     AND (ult.ultimo IS NULL OR ult.ultimo < current_date - p_dias);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$function$;

REVOKE ALL ON FUNCTION public.desativar_embarcadoras_sem_movimento(int) FROM public;

-- ── Aplicacao ──────────────────────────────────────────────────────────────
UPDATE embarcadoras SET ativo = false WHERE tipo = 'devolucao' AND ativo;
SELECT desativar_embarcadoras_sem_movimento(15);

-- Estado resultante: 3 ativas (SUZANO FAB IMPERATRIZ / AVB - ACAILANDIA /
-- SUZANO FAB BELEM, todas com movimento de 1 dia atras); 3 regras de devolucao
-- inativas; MARANHAO IND DE COUROS inativa (nunca teve CTe).
-- Testado em transacao com ROLLBACK: movimento novo REATIVA cliente comum e NAO
-- reativa regra de devolucao. Prod ficou intacta.
