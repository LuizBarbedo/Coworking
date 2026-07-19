-- Migração 0019 — Agendamento de publicação dos módulos
-- Execute no SQL Editor do Supabase APÓS a 0018.
--
-- O que faz:
--   1. Coluna publicar_em em modulos: data/hora (com fuso) em que o módulo
--      deve ficar disponível pros alunos.
--   2. Job no pg_cron (a cada minuto) que vira publicado = true quando a
--      hora chega. Assim "publicado" continua sendo a única fonte de verdade
--      — RLS, painel e teasers "Em breve" não mudam.
--
-- É idempotente: cron.schedule com o mesmo nome substitui o job.

alter table public.modulos
  add column if not exists publicar_em timestamptz;

create extension if not exists pg_cron;

select cron.schedule(
  'publicar-modulos-agendados',
  '* * * * *',
  $$
    update public.modulos
       set publicado = true
     where publicado = false
       and publicar_em is not null
       and publicar_em <= now()
  $$
);
