-- =============================================
-- Migration 059: reimportação corretiva (atualizar linhas já importadas)
-- =============================================
-- A importação só INSERE o que é novo (chave cnpj+categoria+ctrc+periodo). Quando um arquivo
-- ERRADO entra antes do certo, a linha fica gravada mutilada pra sempre: reimportar o
-- relatório completo não muda nada, porque a chave já existe. Foi o que aconteceu com um
-- export reduzido do TMS (15 colunas, sem Data Emissão/Total do Frete/Trecho/NFS/Placa) —
-- CTes ficaram sem data, sem placa e com total zerado (ex.: CTRC 35012).
--
-- Esta RPC sobrescreve SÓ os campos do documento (os que vêm do TMS a cada exportação) mais
-- as flags automáticas. Fica de fora tudo que é decisão do app e foi construído em cima da
-- linha: decisao_manual/revisado_*, categoria e categoria_manual, tipo_doc/status_doc/ctrc_ref,
-- competencia_ref, contrato_ref. Sem isso, corrigir o arquivo apagaria o trabalho de revisão.

CREATE OR REPLACE FUNCTION public.atualizar_frete_lote(p_token text, p_rows jsonb)
 RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN PERFORM _validar_token_e_base(p_token, null);
  RETURN QUERY
    UPDATE frete_conferencia f SET
      data_emissao         = nullif(e->>'data_emissao','')::date,
      trecho               = e->>'trecho',
      nfs                  = e->>'nfs',
      placa                = e->>'placa',
      nome_usuario         = e->>'nome_usuario',
      numero_manifesto     = e->>'numero_manifesto',
      numero_contrato      = e->>'numero_contrato',
      valor_nf             = (e->>'valor_nf')::numeric,
      peso_nf              = (e->>'peso_nf')::numeric,
      frete_peso           = (e->>'frete_peso')::numeric,
      total_frete          = (e->>'total_frete')::numeric,
      valor_contrato_frete = (e->>'valor_contrato_frete')::numeric,
      saldo                = (e->>'saldo')::numeric,
      margem_lucro         = (e->>'margem_lucro')::numeric,
      flag_negativa        = coalesce((e->>'flag_negativa')::boolean,false),
      flag_baixa           = coalesce((e->>'flag_baixa')::boolean,false),
      flag_ambigua         = coalesce((e->>'flag_ambigua')::boolean,false),
      -- Contrato apontado à mão continua valendo: se alguém já resolveu qual era, o arquivo
      -- novo não devolve a linha pra fila.
      flag_sem_contrato    = CASE WHEN f.contrato_ref IS NOT NULL THEN false
                                  ELSE coalesce((e->>'flag_sem_contrato')::boolean,false) END,
      flag_duplicidade     = coalesce((e->>'flag_duplicidade')::boolean,false),
      dup_grupo_chave      = e->>'dup_grupo_chave',
      atualizado_em        = now()
    FROM jsonb_array_elements(p_rows) e
    WHERE f.id = (e->>'id')::uuid
    RETURNING row_to_json(f.*); END; $function$;

REVOKE ALL ON FUNCTION public.atualizar_frete_lote(text,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.atualizar_frete_lote(text,jsonb) TO anon;
