-- Migração 0005 — Camada "Disciplina" entre Módulo e Aulas/Quiz
-- Execute no SQL Editor do Supabase APÓS 0002_plataforma_ensino.sql. Idempotente.
--
-- O que faz:
--   1. Cria a tabela public.disciplinas (Módulo → várias Disciplinas → Aulas/Quiz).
--   2. Re-aponta aulas, materiais e quizzes de modulo_id para disciplina_id.
--      (Seguro: o conteúdo ainda está vazio — nada a migrar.)
--   3. Habilita RLS na nova tabela e endurece a leitura de aulas/materiais para
--      só expor conteúdo de disciplina + módulo publicados (defesa em profundidade).
--
-- A função corrigir_quiz() NÃO muda: ela opera por quiz_id / quiz_perguntas /
-- quiz_alternativas, que continuam iguais.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Nova tabela de disciplinas
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.disciplinas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos (id) on delete cascade,
  -- slug único POR módulo: a rota /modulos/[modulo]/[disciplina] resolve o
  -- módulo primeiro e então a disciplina por (modulo_id, slug).
  slug text not null,
  titulo text not null,
  descricao text,
  ordem int not null default 0,
  publicado boolean not null default true,
  created_at timestamptz not null default now(),
  unique (modulo_id, slug)
);

create index if not exists disciplinas_modulo_idx
  on public.disciplinas (modulo_id, ordem);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Re-apontar as tabelas-filhas: modulo_id → disciplina_id
--    (add nullable + drop antigo; NOT NULL fica de fora porque no futuro o
--     cadastro pode criar a linha antes de vincular — a app sempre grava o vínculo.)
-- ───────────────────────────────────────────────────────────────────────────
alter table public.aulas
  add column if not exists disciplina_id uuid
    references public.disciplinas (id) on delete cascade;
alter table public.materiais
  add column if not exists disciplina_id uuid
    references public.disciplinas (id) on delete cascade;
alter table public.quizzes
  add column if not exists disciplina_id uuid
    references public.disciplinas (id) on delete cascade;

drop index if exists public.aulas_modulo_idx;
drop index if exists public.materiais_modulo_idx;

create index if not exists aulas_disciplina_idx
  on public.aulas (disciplina_id, ordem);
create index if not exists materiais_disciplina_idx
  on public.materiais (disciplina_id, ordem);
create index if not exists quizzes_disciplina_idx
  on public.quizzes (disciplina_id);

alter table public.aulas     drop column if exists modulo_id;
alter table public.materiais drop column if exists modulo_id;
alter table public.quizzes   drop column if exists modulo_id;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ───────────────────────────────────────────────────────────────────────────
alter table public.disciplinas enable row level security;

do $$
begin
  -- Disciplina legível só se ela e o módulo pai estiverem publicados.
  if not exists (select 1 from pg_policies where policyname = 'disciplinas_leitura_aluno') then
    create policy "disciplinas_leitura_aluno" on public.disciplinas
      for select to authenticated
      using (
        publicado = true
        and exists (
          select 1 from public.modulos m
          where m.id = disciplinas.modulo_id and m.publicado = true
        )
      );
  end if;

  -- Endurece aulas: substitui a policy antiga using(true) por uma que exige
  -- disciplina + módulo publicados (o gabarito de quiz já era protegido à parte).
  drop policy if exists "aulas_leitura_aluno" on public.aulas;
  create policy "aulas_leitura_aluno" on public.aulas
    for select to authenticated
    using (
      exists (
        select 1
        from public.disciplinas d
        join public.modulos m on m.id = d.modulo_id
        where d.id = aulas.disciplina_id
          and d.publicado = true
          and m.publicado = true
      )
    );

  -- Mesmo endurecimento para materiais.
  drop policy if exists "materiais_leitura_aluno" on public.materiais;
  create policy "materiais_leitura_aluno" on public.materiais
    for select to authenticated
    using (
      exists (
        select 1
        from public.disciplinas d
        join public.modulos m on m.id = d.modulo_id
        where d.id = materiais.disciplina_id
          and d.publicado = true
          and m.publicado = true
      )
    );
end $$;
