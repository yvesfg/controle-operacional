-- =============================================
-- Migration 080: classifica papel × celulose no que já está importado
-- =============================================
-- A migration 079 passou a gravar tipo_carga na importação, mas na primeira reimportação real
-- (01/09/2026) o destinatário entrou em 247 fretes e o tipo ficou NULL em TODOS. Causa: o
-- perfil da base vem do código E do banco (co_bases.perfil, migration 043), e o getPerfil
-- substituía o objeto `classificador` inteiro pelo do banco — que foi gravado em 07/2026 e não
-- tem a chave `importFrete`. Corrigido no app (merge por seção, igual features/vocab).
--
-- Aqui o backfill do que já está na base: mesma regra do app — carga que sai e chega na MESMA
-- empresa é transferência da fábrica (celulose), o resto é venda (papel). Normalização igual à
-- do JS: só letras/números, maiúsculo, sem sufixo societário ("SUZANO SA" = "SUZANO S/A").
-- Idempotente: só toca linha com remetente E destinatário preenchidos, e só da base que tem
-- classificador (imperatriz_belem). Linha sem esses campos continua NULL e a tela cai no
-- cruzamento por DT, como antes.

CREATE OR REPLACE FUNCTION public._nome_empresa(p text)
 RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(regexp_replace(upper(coalesce(p,'')), '[^A-Z0-9]', '', 'g'),
                        '(SA|SAS|LTDA|EIRELI|ME|EPP)$', '');
$$;

UPDATE frete_conferencia SET
  tipo_carga = CASE
    WHEN _nome_empresa(remetente) = _nome_empresa(destinatario) THEN 'celulose'
    ELSE 'papel' END,
  atualizado_em = now()
WHERE base_id = 'imperatriz_belem'
  AND coalesce(btrim(remetente), '') <> ''
  AND coalesce(btrim(destinatario), '') <> ''
  AND tipo_carga IS DISTINCT FROM (CASE
    WHEN _nome_empresa(remetente) = _nome_empresa(destinatario) THEN 'celulose'
    ELSE 'papel' END);
