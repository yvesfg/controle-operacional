-- 062_forma_pgto.sql
--
-- PEDIDO (Yves, 13/08/2026): o bloco de contratação colado passa a trazer a forma
-- de pagamento. Levantamento antes de criar: NÃO existia onde guardar isso.
--   · controle_operacional* : só pag_desc / pag_stretch, que são VALORES de
--     descarga e stretch, não método de pagamento;
--   · motoristas            : banco/agencia/conta/pix_* — dados bancários de quem
--     recebe, não a decisão daquela viagem;
--   · card do WhatsApp       : cheque / conta / ambos existia só no estado da tela
--     (wppPgto) e morria ao fechar o modal.
--
-- Vocabulário = o mesmo dos 3 botões que a equipe já usa no card, pra não nascer
-- um segundo jeito de dizer a mesma coisa. PIX hoje mora dentro de 'conta' (o card
-- imprime banco + PIX juntos); virar valor próprio é decisão de operação, não de schema.
--
-- A planilha NÃO tem essa coluna, e é por isso que ela é segura de manter só aqui:
-- o sync do Sheets monta o upsert apenas com as colunas que mapearColuna() conhece,
-- então coluna que não existe lá nunca é sobrescrita pela rodada de 15 min.

ALTER TABLE controle_operacional            ADD COLUMN IF NOT EXISTS forma_pgto text;
ALTER TABLE controle_operacional_maracanau  ADD COLUMN IF NOT EXISTS forma_pgto text;

COMMENT ON COLUMN controle_operacional.forma_pgto IS
  'Forma de pagamento da contratação: cheque | conta | ambos. Só no app — a planilha não tem esta coluna.';
