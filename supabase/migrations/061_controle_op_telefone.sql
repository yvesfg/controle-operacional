-- 061_controle_op_telefone.sql
--
-- PROBLEMA (Yves, 12/08/2026): o modal do WhatsApp > Contratação abria sem número
-- mesmo com o telefone preenchido na planilha. Motivo: a planilha de Imperatriz/Belém
-- tem a coluna TELEFONE, mas `mapearColuna()` do SyncSupabase.gs nunca a mapeou e a
-- tabela não tinha onde guardar — o app só achava telefone quando o motorista estava
-- no cadastro (`motoristas.tel`), que hoje cobre 188 de 849 registros. O caso do
-- reporte (DT 1348169, CPF 21297595807) nem existe no cadastro.
--
-- A base AVB já resolvia isso: controle_operacional_avb.telefone existe desde a 041 e
-- é promovido pra motoristas.tel pelo gatilho da 042. Aqui só falta a coluna — quem lê
-- é o front (select=*), que passou a usar reg.telefone como fallback de mot.tel.
--
-- Sem gatilho de promoção de propósito: o modal lê direto da linha da operação, então
-- não precisa passar pelo cadastro. Se um dia quisermos completar o cadastro a partir
-- daqui, o modelo a copiar é o da migration 042.

ALTER TABLE controle_operacional      ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE controle_operacional_maracanau ADD COLUMN IF NOT EXISTS telefone text;

COMMENT ON COLUMN controle_operacional.telefone IS
  'Telefone do motorista como veio da planilha (coluna TELEFONE). Fonte de verdade da operação; motoristas.tel é o cadastro.';
