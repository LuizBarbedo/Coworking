-- Migração 0023 — Turmas de alunos (liberação de acesso por data)
-- Execute no SQL Editor do Supabase APÓS a 0022.
--
-- O que faz: divide os inscritos em turmas com data de liberação de acesso.
--   1. Tabela turmas: numero (PK), nome, liberacao_em (null = já liberada).
--      RLS ligado SEM policies — só o service_role lê/escreve.
--   2. Seeds: turma 1 (todo o legado, liberada) e turma 2 (libera 17/08/2026
--      à meia-noite de Brasília).
--   3. Função turma_atual() = max(numero), usada como DEFAULT da coluna nova
--      inscricoes.turma. O legado inteiro entra como turma 1 (o add column usa
--      default constante 1); só DEPOIS o default vira turma_atual(), então
--      inscrição nova cai na turma mais recente sem recriar criar_inscricao
--      (a assinatura da RPC não muda — sem risco de PGRST202 no cache).
--      Abrir uma turma 3 no futuro = um insert em turmas, mais nada.
--
-- É idempotente: pode ser reexecutada sem erro (o seed não sobrescreve
-- datas editadas depois pela equipe).

create table if not exists public.turmas (
  numero int primary key,
  nome text not null,
  liberacao_em timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.turmas.liberacao_em is
  'quando o acesso desta turma abre; null = já liberada';

alter table public.turmas enable row level security;

insert into public.turmas (numero, nome, liberacao_em) values
  (1, 'Turma 1', null),
  (2, 'Turma 2', '2026-08-17T00:00:00-03:00')
on conflict (numero) do nothing;

create or replace function public.turma_atual()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(numero), 1) from public.turmas
$$;

-- 1º passo: default constante 1 → backfill de todas as inscrições existentes
-- como turma 1. (Se fosse turma_atual() direto, o rewrite avaliaria a função
-- e o legado inteiro cairia na turma 2.)
alter table public.inscricoes
  add column if not exists turma int not null default 1
    references public.turmas (numero);

-- 2º passo: daqui em diante, inscrição nova cai na turma mais recente.
alter table public.inscricoes
  alter column turma set default public.turma_atual();

comment on column public.inscricoes.turma is
  'turma do aluno; o acesso só abre quando a turma está liberada (turmas.liberacao_em)';

create index if not exists inscricoes_turma_idx
  on public.inscricoes (turma);
