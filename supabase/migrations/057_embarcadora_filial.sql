-- =============================================
-- Migration 057: filial da embarcadora (Imperatriz × Belém)
-- =============================================
-- A base `imperatriz_belem` é UMA base com duas filiais, e cada tela resolvia esse recorte
-- do seu jeito: Resultado/Painel por origemBate() (despesa pela aba, receita pela cidade da
-- viagem) e a Conferência pelo NOME do cliente ("SUZANO FAB IMPERATRIZ" × "SUZANO FAB BELEM").
-- Com o seletor de filial subindo pro topbar, a Conferência precisa de um mapeamento
-- explícito — inferir pelo nome quebraria assim que entrasse embarcadora nova.
--
-- filial: 'IMP' | 'BELÉM' | NULL (não se aplica / outra base). Os mesmos valores que
-- origemBate() já usa, pra não inventar um terceiro vocabulário.

ALTER TABLE embarcadoras
  ADD COLUMN IF NOT EXISTS filial text;

COMMENT ON COLUMN embarcadoras.filial IS
  'Filial da base imperatriz_belem: IMP | BELEM. NULL = nao se aplica (outra base).';

UPDATE embarcadoras SET filial = 'IMP'
 WHERE base_id = 'imperatriz_belem' AND filial IS NULL AND upper(nome) LIKE '%IMPERATRIZ%';
UPDATE embarcadoras SET filial = 'BELÉM'
 WHERE base_id = 'imperatriz_belem' AND filial IS NULL AND upper(nome) LIKE '%BELEM%';
