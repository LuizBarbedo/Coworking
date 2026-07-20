-- Migração 0022 — Feedback do aluno ao concluir a disciplina
-- Execute no SQL Editor do Supabase APÓS a 0021.
--
-- O que faz: tabela avaliacoes_disciplina — 1 a 5 estrelas + comentário
-- opcional, uma avaliação por aluno por disciplina (pode editar a própria).
-- O card de avaliação aparece pro aluno quando ele conclui a disciplina;
-- o relatório Turma mostra a média e os comentários SEM identificar quem
-- escreveu (feedback anônimo pra equipe).
--
-- É idempotente: pode ser reexecutada sem erro.

create table if not exists public.avaliacoes_disciplina (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.disciplinas (id) on delete cascade,
  aluno_id uuid not null,
  estrelas int not null check (estrelas between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (disciplina_id, aluno_id)
);

create index if not exists avaliacoes_disciplina_disc_idx
  on public.avaliacoes_disciplina (disciplina_id);

alter table public.avaliacoes_disciplina enable row level security;

do $$
begin
  -- O aluno cria, edita e enxerga só a própria avaliação; as médias e os
  -- comentários agregados saem pelo service_role no relatório.
  if not exists (select 1 from pg_policies where policyname = 'avaliacao_propria_select') then
    create policy "avaliacao_propria_select" on public.avaliacoes_disciplina
      for select to authenticated using (aluno_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'avaliacao_propria_insert') then
    create policy "avaliacao_propria_insert" on public.avaliacoes_disciplina
      for insert to authenticated with check (aluno_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'avaliacao_propria_update') then
    create policy "avaliacao_propria_update" on public.avaliacoes_disciplina
      for update to authenticated
      using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());
  end if;
end $$;
