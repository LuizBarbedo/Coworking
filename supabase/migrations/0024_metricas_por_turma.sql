-- Migração 0024 — metricas_painel com filtro opcional por turma
-- Execute APÓS a 0023 (coluna inscricoes.turma). Aplicar com psql -1
-- (transação única: o drop e o create precisam ser atômicos).
--
-- O que faz: recria metricas_painel com a assinatura (p_dias, p_turma).
--   * p_turma null → comportamento idêntico ao da 0014 (todas as turmas).
--   * p_turma preenchido → inscrições recortadas pela turma; os campos de
--     visitas (visitas_periodo, serie[].visitas, origens[].visitas) são
--     OMITIDOS do retorno — visitas_landing não tem turma e a UI já
--     degrada sem eles.
--
-- ATENÇÃO: a assinatura antiga (int) é DERRUBADA aqui. Nunca reexecute a
-- 0014 depois desta — recriaria a sobrecarga (int) e deixaria a RPC
-- ambígua pro PostgREST (PGRST203). O notify no fim recarrega o cache de
-- schema do PostgREST; se um PGRST202 persistir, reinicie o container rest.
--
-- É idempotente: pode ser reexecutada sem erro.

drop function if exists public.metricas_painel(int);

create or replace function public.metricas_painel(
  p_dias int default 30,
  p_turma int default null
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with base as (
    select
      (created_at at time zone 'America/Sao_Paulo')::date as dia,
      created_at,
      utm_source,
      utm_medium,
      utm_campaign
    from public.inscricoes
    where p_turma is null or turma = p_turma
  ),
  ref as (
    select (now() at time zone 'America/Sao_Paulo')::date as hoje
  ),
  insc_origem as (
    select
      coalesce(utm_source, '') as s,
      coalesce(utm_medium, '') as m,
      coalesce(utm_campaign, '') as c,
      count(*) as total
    from base, ref
    where base.dia > ref.hoje - greatest(p_dias, 1)
    group by 1, 2, 3
  ),
  visita_origem as (
    select
      coalesce(utm_source, '') as s,
      coalesce(utm_medium, '') as m,
      coalesce(utm_campaign, '') as c,
      count(*) as total
    from public.visitas_landing, ref
    where (created_at at time zone 'America/Sao_Paulo')::date
            > ref.hoje - greatest(p_dias, 1)
    group by 1, 2, 3
  ),
  visita_dia as (
    select (created_at at time zone 'America/Sao_Paulo')::date as dia,
           count(*) as total
    from public.visitas_landing
    group by 1
  )
  select jsonb_build_object(
    'total',  (select count(*) from base),
    'hoje',   (select count(*) from base, ref where base.dia = ref.hoje),
    'ontem',  (select count(*) from base, ref where base.dia = ref.hoje - 1),
    'semana', (select count(*) from base, ref where base.dia > ref.hoje - 7),
    'semana_anterior',
              (select count(*) from base, ref
               where base.dia > ref.hoje - 14 and base.dia <= ref.hoje - 7),
    'ultima', (select max(created_at) from base),
    'serie',  coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'dia', d.dia,
                 'total', coalesce(c.total, 0)
               )
               || case when p_turma is null
                    then jsonb_build_object('visitas', coalesce(vd.total, 0))
                    else '{}'::jsonb end
               order by d.dia
             )
      from (
        select generate_series(
                 (select hoje from ref) - (greatest(p_dias, 1) - 1),
                 (select hoje from ref),
                 interval '1 day'
               )::date as dia
      ) d
      left join (
        select dia, count(*) as total from base group by dia
      ) c on c.dia = d.dia
      left join visita_dia vd on vd.dia = d.dia
    ), '[]'::jsonb),
    'origens', coalesce(
      case when p_turma is null then (
        select jsonb_agg(
                 jsonb_build_object(
                   'source',   nullif(k.s, ''),
                   'medium',   nullif(k.m, ''),
                   'campaign', nullif(k.c, ''),
                   'total',    coalesce(i.total, 0),
                   'visitas',  coalesce(v.total, 0)
                 )
                 order by coalesce(i.total, 0) desc, coalesce(v.total, 0) desc
               )
        from (
          select s, m, c from (
            select s, m, c, coalesce((select i2.total from insc_origem i2
                     where i2.s = u.s and i2.m = u.m and i2.c = u.c), 0) as peso
            from (
              select s, m, c from insc_origem
              union
              select s, m, c from visita_origem
            ) u
            order by peso desc
            limit 20
          ) topo
        ) k
        left join insc_origem   i on i.s = k.s and i.m = k.m and i.c = k.c
        left join visita_origem v on v.s = k.s and v.m = k.m and v.c = k.c
      ) else (
        select jsonb_agg(
                 jsonb_build_object(
                   'source',   nullif(t.s, ''),
                   'medium',   nullif(t.m, ''),
                   'campaign', nullif(t.c, ''),
                   'total',    t.total
                 )
                 order by t.total desc
               )
        from (
          select s, m, c, total from insc_origem
          order by total desc
          limit 20
        ) t
      ) end,
    '[]'::jsonb)
  )
  || case when p_turma is null
       then jsonb_build_object(
              'visitas_periodo',
              (select coalesce(sum(total), 0) from visita_origem)
            )
       else '{}'::jsonb end;
$$;

revoke all on function public.metricas_painel(int, int)
  from public, anon, authenticated;
grant execute on function public.metricas_painel(int, int) to service_role;

-- Recarrega o cache de schema do PostgREST (o drop invalida o OID antigo).
notify pgrst, 'reload schema';
