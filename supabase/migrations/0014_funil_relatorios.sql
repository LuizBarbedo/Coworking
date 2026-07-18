-- Migração 0014 — Funil ao longo do tempo e comparativo de períodos no painel
-- Execute no SQL Editor do Supabase APÓS a 0013.
--
-- O que faz: recria metricas_painel() com três acréscimos:
--   1. Cada ponto de "serie" ganha "visitas" (contagem de visitas_landing do
--      dia, fuso de São Paulo) — o gráfico do /relatorios passa a mostrar
--      visitas × inscrições por dia.
--   2. Chave "ontem": inscrições do dia anterior (comparativo do cartão Hoje).
--   3. Chave "semana_anterior": inscrições de 8 a 14 dias atrás (comparativo
--      do cartão Últimos 7 dias).
-- Sem esta migração o painel segue funcionando, só sem essas leituras.
--
-- É idempotente: pode ser reexecutada sem erro.

create or replace function public.metricas_painel(p_dias int default 30)
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
                 'total', coalesce(c.total, 0),
                 'visitas', coalesce(vd.total, 0)
               )
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
    'visitas_periodo', (select coalesce(sum(total), 0) from visita_origem),
    'origens', coalesce((
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
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.metricas_painel(int) from public, anon, authenticated;
grant execute on function public.metricas_painel(int) to service_role;
