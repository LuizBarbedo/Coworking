-- Migração 0015 — Fórum educacional com moderação prévia
-- Execute no SQL Editor do Supabase APÓS a 0014.
--
-- O que faz:
--   1. Posts (dúvida/enquete) e respostas: TUDO que aluno publica nasce
--      'pendente'; o moderador IA (ou um humano na caixa de entrada) é que
--      aprova. A policy de insert impede nascer aprovado — a moderação é
--      incontornável no banco, não só na aplicação.
--   2. Leitura: aprovados para qualquer aluno logado; o autor também vê os
--      próprios pendentes/rejeitados (acompanha o status).
--   3. Mudança de status/veredito: NENHUMA policy de update — só o
--      service_role (server actions com guard de permissão).
--   4. Votos "útil" (up-only) em posts e respostas; voto de enquete com
--      opção única por aluno. Contagens agregadas são lidas no servidor.
--   5. Busca full-text (tsvector 'portuguese') + RPC buscar_posts_similares
--      pro "posts semelhantes" na criação (deflection).
--
-- É idempotente: pode ser reexecutada sem erro.

-- 1. Posts ------------------------------------------------------------------

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references auth.users (id) on delete cascade,
  disciplina_id uuid references public.disciplinas (id) on delete cascade,
  tipo text not null check (tipo in ('duvida', 'enquete')),
  titulo text not null check (char_length(titulo) between 3 and 200),
  corpo text check (corpo is null or char_length(corpo) <= 5000),
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'rejeitado')),
  veredito_ia text check (veredito_ia in ('aprovado', 'suspeito', 'erro')),
  motivo_ia text,
  moderado_por uuid references auth.users (id) on delete set null,
  moderado_em timestamptz,
  motivo_rejeicao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  busca tsvector generated always as (
    to_tsvector('portuguese', titulo || ' ' || coalesce(corpo, ''))
  ) stored
);

create table if not exists public.forum_enquete_opcoes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 200),
  ordem int not null default 0,
  unique (id, post_id) -- alvo do FK composto dos votos de enquete
);

create table if not exists public.forum_respostas (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  autor_id uuid not null references auth.users (id) on delete cascade,
  corpo text not null check (char_length(corpo) between 1 and 5000),
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'rejeitado')),
  veredito_ia text check (veredito_ia in ('aprovado', 'suspeito', 'erro')),
  motivo_ia text,
  moderado_por uuid references auth.users (id) on delete set null,
  moderado_em timestamptz,
  motivo_rejeicao text,
  created_at timestamptz not null default now()
);

-- Resposta marcada como solução pelo autor do post (FK circular: só depois
-- que as duas tabelas existem).
alter table public.forum_posts
  add column if not exists resposta_solucao_id uuid
    references public.forum_respostas (id) on delete set null;

-- 2. Votos ------------------------------------------------------------------

create table if not exists public.forum_votos_posts (
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  aluno_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, aluno_id)
);

create table if not exists public.forum_votos_respostas (
  resposta_id uuid not null references public.forum_respostas (id) on delete cascade,
  aluno_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resposta_id, aluno_id)
);

create table if not exists public.forum_votos_enquete (
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  opcao_id uuid not null,
  aluno_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, aluno_id), -- uma opção por aluno por enquete
  foreign key (opcao_id, post_id)
    references public.forum_enquete_opcoes (id, post_id) on delete cascade
);

-- 3. Índices ----------------------------------------------------------------

create index if not exists forum_posts_lista_idx
  on public.forum_posts (status, created_at desc);
create index if not exists forum_posts_disciplina_idx
  on public.forum_posts (disciplina_id, status, created_at desc);
create index if not exists forum_posts_busca_idx
  on public.forum_posts using gin (busca);
create index if not exists forum_respostas_post_idx
  on public.forum_respostas (post_id, status, created_at);
create index if not exists forum_votos_enquete_opcao_idx
  on public.forum_votos_enquete (opcao_id);

-- 4. RLS --------------------------------------------------------------------

alter table public.forum_posts enable row level security;

drop policy if exists forum_posts_select on public.forum_posts;
create policy forum_posts_select on public.forum_posts
  for select to authenticated
  using (status = 'aprovado' or autor_id = auth.uid());

drop policy if exists forum_posts_insert on public.forum_posts;
create policy forum_posts_insert on public.forum_posts
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and status = 'pendente'
    and veredito_ia is null
    and moderado_por is null
  );

alter table public.forum_enquete_opcoes enable row level security;

drop policy if exists forum_opcoes_select on public.forum_enquete_opcoes;
create policy forum_opcoes_select on public.forum_enquete_opcoes
  for select to authenticated
  using (exists (
    select 1 from public.forum_posts p
    where p.id = post_id and (p.status = 'aprovado' or p.autor_id = auth.uid())
  ));

drop policy if exists forum_opcoes_insert on public.forum_enquete_opcoes;
create policy forum_opcoes_insert on public.forum_enquete_opcoes
  for insert to authenticated
  with check (exists (
    select 1 from public.forum_posts p
    where p.id = post_id and p.autor_id = auth.uid() and p.status = 'pendente'
  ));

alter table public.forum_respostas enable row level security;

drop policy if exists forum_respostas_select on public.forum_respostas;
create policy forum_respostas_select on public.forum_respostas
  for select to authenticated
  using (status = 'aprovado' or autor_id = auth.uid());

drop policy if exists forum_respostas_insert on public.forum_respostas;
create policy forum_respostas_insert on public.forum_respostas
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and status = 'pendente'
    and veredito_ia is null
    and moderado_por is null
    and exists (
      select 1 from public.forum_posts p
      where p.id = post_id and p.status = 'aprovado'
    )
  );

-- Votos: cada um mexe só no próprio; item precisa estar aprovado. As
-- contagens agregadas são lidas no servidor (service_role) — quem votou em
-- quê não vaza pela API.

alter table public.forum_votos_posts enable row level security;
drop policy if exists fvp_select on public.forum_votos_posts;
create policy fvp_select on public.forum_votos_posts
  for select to authenticated using (aluno_id = auth.uid());
drop policy if exists fvp_insert on public.forum_votos_posts;
create policy fvp_insert on public.forum_votos_posts
  for insert to authenticated
  with check (aluno_id = auth.uid() and exists (
    select 1 from public.forum_posts p
    where p.id = post_id and p.status = 'aprovado'
  ));
drop policy if exists fvp_delete on public.forum_votos_posts;
create policy fvp_delete on public.forum_votos_posts
  for delete to authenticated using (aluno_id = auth.uid());

alter table public.forum_votos_respostas enable row level security;
drop policy if exists fvr_select on public.forum_votos_respostas;
create policy fvr_select on public.forum_votos_respostas
  for select to authenticated using (aluno_id = auth.uid());
drop policy if exists fvr_insert on public.forum_votos_respostas;
create policy fvr_insert on public.forum_votos_respostas
  for insert to authenticated
  with check (aluno_id = auth.uid() and exists (
    select 1 from public.forum_respostas r
    where r.id = resposta_id and r.status = 'aprovado'
  ));
drop policy if exists fvr_delete on public.forum_votos_respostas;
create policy fvr_delete on public.forum_votos_respostas
  for delete to authenticated using (aluno_id = auth.uid());

-- Voto de enquete é definitivo: sem delete/update.
alter table public.forum_votos_enquete enable row level security;
drop policy if exists fve_select on public.forum_votos_enquete;
create policy fve_select on public.forum_votos_enquete
  for select to authenticated using (aluno_id = auth.uid());
drop policy if exists fve_insert on public.forum_votos_enquete;
create policy fve_insert on public.forum_votos_enquete
  for insert to authenticated
  with check (aluno_id = auth.uid() and exists (
    select 1 from public.forum_posts p
    where p.id = post_id and p.status = 'aprovado' and p.tipo = 'enquete'
  ));

-- 5. Busca de posts semelhantes (deflection na criação) ----------------------

create or replace function public.buscar_posts_similares(
  p_consulta text,
  p_limite int default 5
)
returns table (id uuid, titulo text, tipo text)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.titulo, p.tipo
  from public.forum_posts p
  where p.status = 'aprovado'
    and p.busca @@ websearch_to_tsquery('portuguese', p_consulta)
  order by ts_rank_cd(p.busca, websearch_to_tsquery('portuguese', p_consulta)) desc
  limit least(greatest(coalesce(p_limite, 5), 1), 10);
$$;

grant execute on function public.buscar_posts_similares(text, int) to authenticated;
