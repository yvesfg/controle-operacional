-- =============================================
-- Migration 020: Devolução (FOB) na Conferência de Faturamento
-- =============================================
-- Algumas cargas voltam. Nessa volta o CNPJ Remetente da planilha bruta NÃO é o
-- cliente — é quem está devolvendo a carga (frete FOB, não CIF). Economicamente o
-- faturamento pertence ao CLIENTE correto (ex.: Suzano Imperatriz), não a uma
-- embarcadora nova. Sem isso, o CNPJ da devolução caía em "não cadastrado" e as
-- únicas saídas erravam: cadastrar (criava embarcadora fantasma e rachava o
-- faturamento) ou ignorar (sumia com a receita).
--
-- Modelo: o CNPJ de devolução vira um registro em `embarcadoras` com tipo
-- 'devolucao' apontando (devolucao_de_cnpj) para o cliente-alvo. Os códigos de
-- Empresa (frete_cod/desc_local_cod/diaria_cod) são os que aparecem NAS LINHAS da
-- devolução; nome/base do lançamento vêm do cliente-alvo. Assim `mapaEmbarcadoras`
-- já cobre esse CNPJ e as próximas importações reclassificam sozinhas.

-- embarcadoras: distingue cliente de regra de devolução + ponteiro pro cliente-alvo
ALTER TABLE embarcadoras
  ADD COLUMN IF NOT EXISTS tipo              text NOT NULL DEFAULT 'cliente',  -- 'cliente' | 'devolucao'
  ADD COLUMN IF NOT EXISTS devolucao_de_cnpj text;                            -- alvo (CNPJ só-dígitos do cliente) quando tipo='devolucao'

-- frete_conferencia: marca a linha como devolução (FOB) sem tirá-la do total do cliente.
-- Entra no faturamento do cliente-alvo, mas dá pra filtrar/relatar separado.
ALTER TABLE frete_conferencia
  ADD COLUMN IF NOT EXISTS is_devolucao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modalidade   text    NOT NULL DEFAULT 'CIF';       -- 'CIF' | 'FOB'
