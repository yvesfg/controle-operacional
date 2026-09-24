-- 080 — Rodada do sync sem mudança não escreve NADA (Disk IO) + coluna sgs
--
-- CAUSA DO DISK IO (medida em 24/09/2026, depois da queda de 23/09)
-- O Postgres em si mal toca o disco: o banco tem 28 MB, cabe inteiro em memória
-- (blks_read = 2.019 desde fevereiro) e o WAL "de verdade" é ~120 MB/dia.
-- O que come o budget é o archive_timeout = 120 s do Supabase: em toda janela de
-- 2 minutos em que houve QUALQUER escrita, o Postgres fecha o segmento de WAL
-- (16 MB) e o WAL-G lê e sobe esse arquivo pro backup. pg_stat_archiver:
-- 69.547 segmentos desde 12/02 = ~310/dia = ~5 GB/dia de arquivo, 40x o WAL real.
--
-- Toda rodada do sync escrevia pelo menos 1 linha mesmo sem nada mudar:
--   * co_config (status com timestamp novo) — os 3 .gs, cada um num minuto;
--   * upsert_sem_dt — regravava toda pendência 'pendente' com atualizado_em = now().
-- 3 scripts x 4 rodadas/hora = até 12 segmentos/hora só pra dizer "rodei".
-- O .gs passa a gravar status só quando muda (ou de 2 em 2 h); aqui o
-- upsert_sem_dt passa a só gravar quando algum campo mudou de fato.
--
-- SGS
-- Os 3 .gs mandam `sgs` (coluna "ALGUMA OCORRÊNCIA / SGS" da planilha) e o app
-- inteiro usa r.sgs (Ocorrências, Relatórios, ModalEdit), mas a coluna nunca
-- existiu: upsert_co_lote descarta chave desconhecida e patch_operacional ignora,
-- tudo calado. listar_operacional/patch_operacional são dinâmicos (SELECT * e
-- information_schema), então basta a coluna existir.

alter table public.controle_operacional           add column if not exists sgs text;
alter table public.controle_operacional_avb       add column if not exists sgs text;
alter table public.controle_operacional_maracanau add column if not exists sgs text;


create or replace function public.upsert_sem_dt(p_rows jsonb)
returns integer
language plpgsql
as $function$
declare
  r jsonb;
  v_id bigint;
  v_status text;
  n integer := 0;
begin
  for r in select value from jsonb_array_elements(p_rows) loop
    select id, status into v_id, v_status
      from controle_operacional_sem_dt
     where upper(btrim(coalesce(placa,'')))  = upper(btrim(coalesce(r->>'placa','')))
       and btrim(coalesce(cpf,''))           = btrim(coalesce(r->>'cpf',''))
       and upper(btrim(coalesce(origem,''))) = upper(btrim(coalesce(r->>'origem','')))
     order by (status = 'pendente') desc, id desc
     limit 1;

    if v_id is null then
      insert into controle_operacional_sem_dt
        (chave_natural, nome, cpf, placa, origem, destino, data_carr, data_agenda,
         vl_cte, vl_contrato, adiant, saldo, tipo_carga, status)
      values
        (r->>'chave_natural', r->>'nome', r->>'cpf', r->>'placa', r->>'origem', r->>'destino',
         r->>'data_carr', r->>'data_agenda', r->>'vl_cte', r->>'vl_contrato', r->>'adiant',
         r->>'saldo', coalesce(nullif(r->>'tipo_carga',''),'papel'), 'pendente')
      on conflict (chave_natural) do nothing;
      n := n + 1;
    elsif v_status = 'pendente' then
      -- Só grava se algum campo mudou. Antes regravava toda rodada (atualizado_em
      -- = now()), e essa escrita sozinha já fazia o WAL virar segmento novo.
      update controle_operacional_sem_dt set
        nome        = r->>'nome',
        destino     = r->>'destino',
        data_carr   = r->>'data_carr',
        data_agenda = r->>'data_agenda',
        vl_cte      = r->>'vl_cte',
        vl_contrato = r->>'vl_contrato',
        adiant      = r->>'adiant',
        saldo       = r->>'saldo',
        tipo_carga  = coalesce(nullif(r->>'tipo_carga',''),'papel'),
        atualizado_em = now()
      where id = v_id
        and (nome, destino, data_carr, data_agenda, vl_cte, vl_contrato, adiant, saldo, tipo_carga)
            is distinct from
            (r->>'nome', r->>'destino', r->>'data_carr', r->>'data_agenda', r->>'vl_cte',
             r->>'vl_contrato', r->>'adiant', r->>'saldo', coalesce(nullif(r->>'tipo_carga',''),'papel'));
      n := n + 1;
    end if;
    -- v_status decidido (confirmado/erro/conciliado) => congela, nao faz nada
  end loop;
  return n;
end;
$function$;
