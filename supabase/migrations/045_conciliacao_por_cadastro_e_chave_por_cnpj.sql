-- 045_conciliacao_por_cadastro_e_chave_por_cnpj.sql  (APLICADA em prod 2026-07-29)
--
-- "Por cliente" da Conferencia de Faturamento mostrava o MESMO cliente duas vezes
-- (Suzano Imperatriz + SUZANO FAB IMPERATRIZ, Suzano Belem + SUZANO FAB BELEM,
-- AVB Acailandia + AVB - ACAILANDIA). O cadastro de embarcadoras sempre esteve certo
-- (1 linha por CNPJ) -- o problema era o historico com dois textos para o mesmo CNPJ.
--
-- CAUSA RAIZ (achada ao tentar normalizar e bater na unique): a chave era
--   unique (cliente, categoria, ctrc, periodo_ref)
-- ou seja, usava o NOME (mutavel) em vez do CNPJ (identidade real). Quando a
-- embarcadora foi renomeada no cadastro, a importacao seguinte deixou de reconhecer
-- os CTes ja gravados e INSERIU linhas novas em vez de atualizar.
-- => 7 CTes de 07/2026 gravados em dobro. Nao era so rotulo: inflava o faturamento.
--
-- Conferido antes de apagar: os 7 pares sao IDENTICOS em placa/trecho/valor_nf/peso/
-- total_frete/valor_contrato/saldo/data_emissao -- diferem so em `cliente` e `criado_em`
-- (27/07 x 28/07). Zero grupos ambiguos; zero linhas sem cnpj_remetente.
--
-- Conferencia dos totais de 07/2026 (bate com a tela):
--   antes: 463 CTRCs | 6.983.462 kg | R$ 2.802.623,25 | saldo R$ 424.322,45
--   apos:  456 CTRCs | 6.792.669 kg | R$ 2.728.812,96 | saldo R$ 408.265,39
--   backup:  7 CTRCs |   190.793 kg | R$    73.810,29 | saldo R$  16.057,06

-- ── 1) Backup das linhas removidas (decisao do Yves: apagar COM copia) ──────
CREATE TABLE IF NOT EXISTS frete_conferencia_removidas
  (LIKE frete_conferencia INCLUDING DEFAULTS);
ALTER TABLE frete_conferencia_removidas
  ADD COLUMN IF NOT EXISTS removido_em timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS removido_motivo text;
ALTER TABLE frete_conferencia_removidas ENABLE ROW LEVEL SECURITY;

WITH dups AS (
  SELECT cnpj_remetente, categoria, ctrc, periodo_ref
    FROM frete_conferencia
   WHERE coalesce(cnpj_remetente,'') <> ''
   GROUP BY 1,2,3,4 HAVING count(*) > 1
), perdedoras AS (
  -- mantem a linha MAIS RECENTE (ja com o nome do cadastro); remove a antiga
  SELECT f.id
    FROM frete_conferencia f
    JOIN dups d ON d.cnpj_remetente=f.cnpj_remetente AND d.categoria=f.categoria
               AND d.ctrc=f.ctrc AND d.periodo_ref=f.periodo_ref
   WHERE f.id NOT IN (
     SELECT DISTINCT ON (f2.cnpj_remetente, f2.categoria, f2.ctrc, f2.periodo_ref) f2.id
       FROM frete_conferencia f2
       JOIN dups d2 ON d2.cnpj_remetente=f2.cnpj_remetente AND d2.categoria=f2.categoria
                   AND d2.ctrc=f2.ctrc AND d2.periodo_ref=f2.periodo_ref
      ORDER BY f2.cnpj_remetente, f2.categoria, f2.ctrc, f2.periodo_ref, f2.criado_em DESC, f2.id DESC
   )
)
INSERT INTO frete_conferencia_removidas
SELECT f.*, now(), 'duplicata por renomeacao de embarcadora (migration 045)'
  FROM frete_conferencia f WHERE f.id IN (SELECT id FROM perdedoras);

DELETE FROM frete_conferencia
 WHERE id IN (SELECT id FROM frete_conferencia_removidas
               WHERE removido_motivo = 'duplicata por renomeacao de embarcadora (migration 045)');

-- ── 2) SENDAS vira regra de devolucao apontando para Suzano Belem ──────────
-- O CTe dela ja era is_devolucao/FOB, mas o cadastro dizia "cliente normal", entao
-- virava linha propria no Por cliente. Em devolucao quem fatura e o destinatario.
-- Codigos de Empresa (frete_cod) preservados: sao os da propria devolucao.
UPDATE embarcadoras
   SET tipo = 'devolucao',
       devolucao_de_cnpj = '16404287069864',   -- SUZANO FAB BELEM
       base_id = NULL,
       razao_social = coalesce(razao_social, 'SENDAS DISTRIBUIDORA SA'),
       nome = 'Devolucao - SUZANO FAB BELEM'
 WHERE cnpj = '06057223032103';

-- ── 3) Chave unica passa a ser por CNPJ (identidade estavel) ───────────────
ALTER TABLE frete_conferencia
  DROP CONSTRAINT IF EXISTS frete_conferencia_cliente_categoria_ctrc_periodo_ref_key;
ALTER TABLE frete_conferencia
  ADD CONSTRAINT frete_conferencia_cnpj_categoria_ctrc_periodo_key
  UNIQUE (cnpj_remetente, categoria, ctrc, periodo_ref);

-- ── 4) Normaliza o historico: cliente = nome do cadastro ──────────────────
UPDATE frete_conferencia f
   SET cliente = e.nome
  FROM embarcadoras e
 WHERE e.cnpj = f.cnpj_remetente
   AND coalesce(e.tipo,'cliente') <> 'devolucao'
   AND NOT coalesce(f.is_devolucao, false)
   AND f.cliente IS DISTINCT FROM e.nome;

-- linhas de devolucao faturam no nome do cliente-ALVO
UPDATE frete_conferencia f
   SET cliente = alvo.nome,
       base_id = coalesce(alvo.base_id, f.base_id)
  FROM embarcadoras d
  JOIN embarcadoras alvo ON alvo.cnpj = d.devolucao_de_cnpj
 WHERE d.cnpj = f.cnpj_remetente
   AND d.tipo = 'devolucao'
   AND f.cliente IS DISTINCT FROM alvo.nome;

-- ── 5) Gatilho: renomear no cadastro propaga pro historico ────────────────
-- Sem isto, renomear amanha racharia o Por cliente de novo. Testado em transacao
-- com ROLLBACK: renomear propagou pras 2.092 linhas, incluindo as 2 de devolucao
-- que faturam no nome do alvo.
CREATE OR REPLACE FUNCTION public.propagar_nome_embarcadora()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.nome IS NOT DISTINCT FROM OLD.nome THEN RETURN NEW; END IF;

  UPDATE frete_conferencia
     SET cliente = NEW.nome
   WHERE cnpj_remetente = NEW.cnpj
     AND NOT coalesce(is_devolucao, false)
     AND cliente IS DISTINCT FROM NEW.nome;

  UPDATE frete_conferencia
     SET cliente = NEW.nome
   WHERE coalesce(is_devolucao, false)
     AND cliente IS DISTINCT FROM NEW.nome
     AND cnpj_remetente IN (
       SELECT cnpj FROM embarcadoras
        WHERE tipo = 'devolucao' AND devolucao_de_cnpj = NEW.cnpj);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_propagar_nome_embarcadora ON embarcadoras;
CREATE TRIGGER trg_propagar_nome_embarcadora
AFTER UPDATE OF nome ON embarcadoras
FOR EACH ROW EXECUTE FUNCTION propagar_nome_embarcadora();
