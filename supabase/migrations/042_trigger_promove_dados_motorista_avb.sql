-- 042_trigger_promove_dados_motorista_avb.sql  (APLICADA em prod 2026-07-29)
--
-- Fecha a duplicação atacada pela 041. A planilha AVB continua sendo a entrada de
-- telefone/dados bancários (304 de 430 linhas têm telefone — é entrada de verdade),
-- mas o dado passa a POUSAR no cadastro `motoristas`, única fonte que o app lê.
--
-- Por que gatilho e não mudar o SyncSupabase_AVB.gs (opções avaliadas com o Yves):
--   (a) .gs parar de enviar → schema limpo, mas 304 telefones deixariam de chegar e
--       muda a rotina de quem opera a planilha. Descartada.
--   (b) .gs gravar direto em `motoristas` → o .gs só tem a anon key e `motoristas` foi
--       fechada na migration 027 (escrita só por RPC token-validada). Exigiria uma RPC
--       anon-chamável que grava dados bancários — reabrir a classe de buraco que a
--       auditoria fechou ("trocar a conta do motorista" é o alvo de fraude do app).
--       Descartada.
--   (c) ESTA: o .gs não muda (zero risco de repetir os 3 aborts do lockdown), o dado
--       flui igual, e o banco promove pro cadastro.
--
-- Regra: só PREENCHE o que está vazio. O que foi editado no app nunca é sobrescrito
-- pela planilha — o app vence, a planilha completa.
--
-- Testado em transação com ROLLBACK contra o schema real: campo já preenchido no
-- cadastro foi preservado; tel/agência/conta/favorecido/PIX vieram da planilha;
-- pix_tipo inferido como 'CPF'. Prod ficou intacta (0 linhas de teste).

CREATE OR REPLACE FUNCTION public.promover_dados_motorista_avb()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_cpf text;
BEGIN
  v_cpf := regexp_replace(coalesce(NEW.cpf,''), '\D', '', 'g');
  IF v_cpf = '' THEN RETURN NEW; END IF;

  UPDATE motoristas m SET
    tel        = coalesce(nullif(btrim(coalesce(m.tel,'')),''),        nullif(btrim(coalesce(NEW.telefone,'')),'')),
    banco      = coalesce(nullif(btrim(coalesce(m.banco,'')),''),      nullif(btrim(coalesce(NEW.banco,'')),'')),
    agencia    = coalesce(nullif(btrim(coalesce(m.agencia,'')),''),    nullif(btrim(coalesce(NEW.agencia,'')),'')),
    conta      = coalesce(nullif(btrim(coalesce(m.conta,'')),''),      nullif(btrim(coalesce(NEW.conta,'')),'')),
    favorecido = coalesce(nullif(btrim(coalesce(m.favorecido,'')),''), nullif(btrim(coalesce(NEW.favorecido,'')),'')),
    pix_chave  = coalesce(nullif(btrim(coalesce(m.pix_chave,'')),''),  nullif(btrim(coalesce(NEW.chave_pix,'')),'')),
    pix_tipo   = coalesce(nullif(btrim(coalesce(m.pix_tipo,'')),''),
                   CASE WHEN nullif(btrim(coalesce(NEW.chave_pix,'')),'') IS NULL THEN NULL
                        WHEN regexp_replace(NEW.chave_pix,'\D','','g') = v_cpf THEN 'CPF'
                        WHEN length(regexp_replace(NEW.chave_pix,'\D','','g')) IN (10,11) THEN 'Telefone'
                        ELSE 'Chave' END)
  WHERE regexp_replace(coalesce(m.cpf,''), '\D', '', 'g') = v_cpf
    -- Só grava se houver de fato algo a completar. Sem esta guarda, cada sync (a cada
    -- 15 min, ~430 linhas) reescreveria as mesmas linhas de `motoristas` à toa.
    AND ((nullif(btrim(coalesce(m.tel,'')),'')        IS NULL AND nullif(btrim(coalesce(NEW.telefone,'')),'')   IS NOT NULL)
      OR (nullif(btrim(coalesce(m.banco,'')),'')      IS NULL AND nullif(btrim(coalesce(NEW.banco,'')),'')      IS NOT NULL)
      OR (nullif(btrim(coalesce(m.agencia,'')),'')    IS NULL AND nullif(btrim(coalesce(NEW.agencia,'')),'')    IS NOT NULL)
      OR (nullif(btrim(coalesce(m.conta,'')),'')      IS NULL AND nullif(btrim(coalesce(NEW.conta,'')),'')      IS NOT NULL)
      OR (nullif(btrim(coalesce(m.favorecido,'')),'') IS NULL AND nullif(btrim(coalesce(NEW.favorecido,'')),'') IS NOT NULL)
      OR (nullif(btrim(coalesce(m.pix_chave,'')),'')  IS NULL AND nullif(btrim(coalesce(NEW.chave_pix,'')),'')  IS NOT NULL));

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_promover_dados_motorista_avb ON controle_operacional_avb;
CREATE TRIGGER trg_promover_dados_motorista_avb
AFTER INSERT OR UPDATE ON controle_operacional_avb
FOR EACH ROW
WHEN (coalesce(NEW.telefone,'') || coalesce(NEW.banco,'') || coalesce(NEW.agencia,'')
   || coalesce(NEW.conta,'') || coalesce(NEW.chave_pix,'') || coalesce(NEW.favorecido,'') <> '')
EXECUTE FUNCTION promover_dados_motorista_avb();

-- NÃO tratado de propósito: 40 CPFs que aparecem no AVB não têm cadastro em
-- `motoristas` — o gatilho só COMPLETA cadastro existente, não cria. Criar motorista
-- automaticamente a partir de linha de viagem é decisão de produto (risco de poluir o
-- cadastro com nome/CPF digitados errado na planilha).
