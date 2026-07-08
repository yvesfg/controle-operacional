-- =============================================
-- Migration 004: Ranking de revisão (frete_conferencia.revisado_por)
-- =============================================
-- Quem (usuário logado no app) tomou a decisão manual em cada linha da fila
-- de revisão — distinto de `nome_usuario`, que é quem lançou o registro na
-- planilha bruta do TMS/ERP. Usado para montar o ranking de revisão em
-- ConferenciaFrete.jsx.

ALTER TABLE frete_conferencia ADD COLUMN IF NOT EXISTS revisado_por text;
