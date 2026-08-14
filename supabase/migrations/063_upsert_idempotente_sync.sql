-- 063 — Upsert idempotente do sync Sheets -> Supabase (corta o Disk IO)
--
-- PROBLEMA
-- O SyncSupabase*.gs manda TODAS as linhas de TODAS as abas a cada 15 min via
-- PostgREST com `resolution=merge-duplicates`. O PostgREST vira um
-- `ON CONFLICT DO UPDATE` incondicional: linha idêntica é reescrita do mesmo
-- jeito. Em 152 dias isso deu ~16 MILHÕES de UPDATE em ~2.200 linhas reais:
--
--   controle_operacional            1.234 linhas   11.978.597 updates   23.043 autovacuums
--   controle_operacional_avb          486 linhas    2.355.111 updates
--   controle_operacional_maracanau    515 linhas    1.616.415 updates
--
-- Cada UPDATE grava uma nova versão da tupla + WAL + acorda o autovacuum. Em
-- controle_operacional só 0,03% eram HOT (o trigger de updated_at mexe numa
-- coluna indexada), então cada um reescrevia também as 10 entradas de índice.
-- É isso que estourava o Disk IO Budget do projeto — não o volume de dados
-- (as tabelas somam menos de 5 MB).
--
-- SOLUÇÃO
-- RPC que faz o mesmo upsert, mas só grava quando o conteúdo mudou de fato.
-- Linha idêntica = zero UPDATE, zero trigger, zero WAL, zero autovacuum.
--
-- SEMÂNTICA — idêntica à do PostgREST, de propósito:
--   * coluna AUSENTE no payload não é tocada (o .gs de Imperatriz manda só as
--     colunas mapeadas na aba; o de AVB normaliza tudo pra '' antes de mandar);
--   * coluna presente sobrescreve, inclusive com string vazia;
--   * conflito por `dt` (Imperatriz/Maracanaú) ou `codigo` (AVB).
-- O estado final da linha é o mesmo de hoje. O que some é só a escrita à toa.
--
-- MUDANÇA DE COMPORTAMENTO (uma, e é pra melhor): `updated_at` para de avançar
-- em sync sem alteração. Hoje ele avança a cada 15 min e significa "o sync
-- rodou"; passa a significar "o dado mudou". Quem quer saber quando o sync
-- rodou já tem `co_config.gsheet_sync_status_*`, gravado pelo próprio .gs.
--
-- SECURITY DEFINER: o anon já tem INSERT/UPDATE/SELECT direto nestas tabelas
-- (policies anon_write_*/anon_upd_*/anon_read_*), então a função não concede
-- poder novo — só concentra a escrita num caminho que sabe comparar antes.

create or replace function public.upsert_co_lote(p_tabela text, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $fn$
declare
  v_chave   text;
  v_sig     text;
  v_grupo   jsonb;
  v_cols    text[];
  v_lista   text;   -- "col_a, col_b"
  v_sel     text;   -- "p.col_a, p.col_b"
  v_set     text;   -- "col_a = p.col_a, col_b = p.col_b"
  v_sql     text;
  v_rc      integer;
  n_ins     integer := 0;
  n_upd     integer := 0;
  n_igual   integer := 0;
begin
  -- Whitelist. Sem isto a função viraria porta genérica de escrita em qualquer tabela.
  v_chave := case p_tabela
               when 'controle_operacional'           then 'dt'
               when 'controle_operacional_maracanau' then 'dt'
               when 'controle_operacional_avb'       then 'codigo'
             end;
  if v_chave is null then
    raise exception 'upsert_co_lote: tabela nao permitida (%)', p_tabela;
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'upsert_co_lote: p_rows precisa ser um array jsonb';
  end if;

  -- Cada aba manda um conjunto de colunas diferente, e o SET tem que cobrir
  -- exatamente o que veio (coluna ausente não pode virar NULL). Então agrupa
  -- o lote por assinatura de colunas e monta um comando por grupo.
  for v_sig, v_grupo in
    select sig, jsonb_agg(obj)
      from (
        select value as obj,
               (select string_agg(k, ',' order by k) from jsonb_object_keys(value) k) as sig
          from jsonb_array_elements(p_rows)
      ) s
     group by sig
  loop
    -- Só nomes que são coluna de verdade nesta tabela. Chave inventada no
    -- payload é descartada aqui, antes de chegar no SQL dinâmico.
    select array_agg(c.column_name order by c.column_name)
      into v_cols
      from unnest(string_to_array(v_sig, ',')) k
      join information_schema.columns c
        on c.table_schema = 'public'
       and c.table_name   = p_tabela
       and c.column_name  = k
     where c.column_name not in ('id', 'created_at', 'updated_at');

    -- Lote sem a coluna-chave não tem como casar linha: ignora o grupo inteiro.
    if v_cols is null or not (v_chave = any(v_cols)) then
      continue;
    end if;

    select string_agg(quote_ident(c), ', ' order by c),
           string_agg('p.' || quote_ident(c), ', ' order by c)
      into v_lista, v_sel
      from unnest(v_cols) c;

    select string_agg(format('%I = p.%I', c, c), ', ' order by c)
      into v_set
      from unnest(v_cols) c
     where c <> v_chave;

    -- 1) Linhas novas. jsonb_populate_record converte cada campo pro tipo real
    --    da coluna (o payload é quase todo texto, mas fora_planilha é boolean).
    --    O `not exists` não é otimização cosmética: sem ele o ON CONFLICT DO
    --    NOTHING faria inserção ESPECULATIVA das 1.234 linhas já existentes a
    --    cada rodada (grava a tupla no heap + índices e mata depois), ou seja,
    --    continuaria queimando IO. O ON CONFLICT fica só como guarda de corrida.
    v_sql := format($q$
      insert into public.%I (%s)
      select %s
        from jsonb_array_elements($1) e(obj),
             lateral jsonb_populate_record(null::public.%I, e.obj) p
       where nullif(btrim(coalesce(p.%I::text, '')), '') is not null
         and not exists (select 1 from public.%I x where x.%I = p.%I)
      on conflict (%I) do nothing
    $q$, p_tabela, v_lista, v_sel, p_tabela, v_chave,
         p_tabela, v_chave, v_chave, v_chave);
    execute v_sql using v_grupo;
    get diagnostics v_rc = row_count;
    n_ins := n_ins + v_rc;

    -- 2) Linhas existentes — SÓ as que mudaram.
    --    A guarda projeta a linha atual sobre exatamente as chaves que vieram no
    --    payload e compara com o payload. Idêntico => nenhum UPDATE é emitido.
    if v_set is not null then
      v_sql := format($q$
        update public.%I t
           set %s
          from jsonb_array_elements($1) e(obj),
               lateral jsonb_populate_record(null::public.%I, e.obj) p
         where t.%I = p.%I
           and (select jsonb_object_agg(k, to_jsonb(t) -> k)
                  from jsonb_object_keys(e.obj) k
                 where k = any (%L::text[]))
               is distinct from
               (select jsonb_object_agg(k, e.obj -> k)
                  from jsonb_object_keys(e.obj) k
                 where k = any (%L::text[]))
      $q$, p_tabela, v_set, p_tabela, v_chave, v_chave, v_cols, v_cols);
      execute v_sql using v_grupo;
      get diagnostics v_rc = row_count;
      n_upd := n_upd + v_rc;
    end if;

    n_igual := n_igual + jsonb_array_length(v_grupo);
  end loop;

  return jsonb_build_object(
    'inseridos',  n_ins,
    'atualizados', n_upd,
    'sem_mudanca', n_igual - n_ins - n_upd
  );
end;
$fn$;

comment on function public.upsert_co_lote(text, jsonb) is
  'Upsert idempotente do sync do Sheets: mesma semantica do PostgREST merge-duplicates, mas so grava quando a linha mudou. Ver migration 063.';

revoke all on function public.upsert_co_lote(text, jsonb) from public;
grant execute on function public.upsert_co_lote(text, jsonb) to anon, authenticated;


-- ── Trigger duplicada ────────────────────────────────────────────────────────
-- trg_updated_at (fn_set_updated_at) e trg_co_updated_at (update_updated_at_co)
-- fazem exatamente a mesma coisa: NEW.updated_at = now(). Sobra uma.
drop trigger if exists trg_co_updated_at on public.controle_operacional;


-- ── Índices que nunca foram usados ───────────────────────────────────────────
-- Todo UPDATE não-HOT reescreve TODOS os índices da tabela. Estes tinham 0 ou 1
-- scan desde 15/03 (pg_stat_user_indexes), então só custavam escrita.
-- idx_co_dt / _maracanau_dt_idx são redundantes com o índice UNIQUE em `dt`.
drop index if exists public.idx_co_data_agenda;
drop index if exists public.idx_co_obs_chegada;
drop index if exists public.idx_co_obs_descarga;
drop index if exists public.idx_co_status;
drop index if exists public.idx_co_status_agenda;
drop index if exists public.idx_co_dt;

drop index if exists public.controle_operacional_maracanau_status_data_agenda_idx;
drop index if exists public.controle_operacional_maracanau_sheet_idx;
drop index if exists public.controle_operacional_maracanau_data_agenda_idx;
drop index if exists public.controle_operacional_maracanau_obs_chegada_idx;
drop index if exists public.controle_operacional_maracanau_obs_descarga_idx;
drop index if exists public.controle_operacional_maracanau_status_idx;
drop index if exists public.controle_operacional_maracanau_dt_idx;


-- ── Índices de expressão para os gatilhos ────────────────────────────────────
-- Os dois gatilhos comparam com função aplicada na coluna, o que invalida
-- qualquer índice comum e força seq scan da tabela inteira a cada disparo:
--   promover_dados_motorista_avb  -> 572.461 seq scans em motoristas (486M tuplas)
--   conciliar_sem_dt_trg          -> 917.141 seq scans em controle_operacional_sem_dt
-- Com o upsert idempotente eles quase não disparam mais, mas quando dispararem
-- devem casar por índice.
create index if not exists idx_motoristas_cpf_digitos
  on public.motoristas ((regexp_replace(coalesce(cpf, ''), '\D', '', 'g')));

create index if not exists idx_sem_dt_conciliacao
  on public.controle_operacional_sem_dt (
    upper(btrim(coalesce(placa, ''))),
    upper(btrim(coalesce(origem, '')))
  )
  where status in ('pendente', 'confirmado');
