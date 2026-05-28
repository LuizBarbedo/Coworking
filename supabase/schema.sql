-- Schema inicial da plataforma de educação
-- Execute este SQL no SQL Editor do Supabase (https://supabase.com/dashboard/project/_/sql)

create table if not exists public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null unique,
  email text not null unique,
  telefone text not null,
  created_at timestamptz not null default now()
);

-- Habilita RLS (Row Level Security)
alter table public.inscricoes enable row level security;

-- Permite que o público (anon) crie inscrições, mas não leia/edite/apague
create policy "permitir_insercao_publica"
  on public.inscricoes
  for insert
  to anon
  with check (true);

-- Bloqueia leitura pública (apenas service_role ou usuários autenticados da prefeitura poderão ler)
-- Adicione policies adicionais quando criar o painel administrativo.

create index if not exists inscricoes_created_at_idx
  on public.inscricoes (created_at desc);

-- View formatada para exportação (CPF, telefone e data legíveis para Excel)
-- Use esta view ao exportar dados pelo dashboard do Supabase.
create or replace view public.inscricoes_export as
select
  row_number() over (order by created_at) as "Nº",
  nome as "Nome",
  regexp_replace(cpf, '(\d{3})(\d{3})(\d{3})(\d{2})', '\1.\2.\3-\4')
    as "CPF",
  email as "E-mail",
  case
    when length(telefone) = 11
      then regexp_replace(telefone, '(\d{2})(\d{5})(\d{4})', '(\1) \2-\3')
    when length(telefone) = 10
      then regexp_replace(telefone, '(\d{2})(\d{4})(\d{4})', '(\1) \2-\3')
    else telefone
  end as "Telefone",
  to_char(
    created_at at time zone 'America/Sao_Paulo',
    'DD/MM/YYYY HH24:MI'
  ) as "Data de inscrição"
from public.inscricoes
order by created_at desc;
