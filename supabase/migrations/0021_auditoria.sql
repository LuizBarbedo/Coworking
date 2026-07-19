-- Migração 0021 — Trilha de auditoria (eventos da plataforma)
-- Execute no SQL Editor do Supabase APÓS a 0020.
--
-- O que faz: tabela eventos — um registro por ação relevante (login, aula
-- assistida, tentativa de quiz, publicações do fórum, moderação, mudanças
-- de conteúdo e de equipe). Alimenta a aba Eventos do master e futuras
-- análises de melhoria contínua.
--
-- RLS ligado SEM policies: só o service_role lê/escreve.
--
-- É idempotente: pode ser reexecutada sem erro.

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  ator_id uuid,
  ator_papel text,            -- 'aluno' | 'equipe' | 'sistema'
  acao text not null,         -- ex.: 'sessao.login', 'aula.assistida'
  alvo_tipo text,             -- 'aula' | 'quiz' | 'post' | 'modulo' | ...
  alvo_id text,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

create index if not exists eventos_acao_idx
  on public.eventos (acao, created_at desc);
create index if not exists eventos_ator_idx
  on public.eventos (ator_id, created_at desc);
create index if not exists eventos_criado_idx
  on public.eventos (created_at desc);

alter table public.eventos enable row level security;
