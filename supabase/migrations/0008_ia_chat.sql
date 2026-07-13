-- Migração 0008 — Assistente de IA por disciplina (chat de dúvidas)
-- Execute no SQL Editor do Supabase APÓS 0005_disciplinas.sql. Idempotente.
--
-- Recuperação (RAG) por busca full-text em português — NÃO usa embeddings, então
-- não depende de nenhum modelo extra: só do modelo de chat do Ollama Cloud.
--
-- O que faz:
--   1. disciplina_conhecimento — a "base de conhecimento" editável pelo master
--      (o material de treino que a IA usa para responder).
--   2. disciplina_chunks — o conteúdo picado em trechos, com tsvector (GIN) para
--      recuperação. Reconstruído pela aplicação a cada alteração de conteúdo.
--   3. ia_mensagens — log das conversas (auditoria).
--   4. buscar_chunks() — RPC de recuperação (SECURITY INVOKER: respeita o RLS do
--      aluno, então só devolve trechos de disciplina + módulo publicados).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Base de conhecimento (editada pelo master)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.disciplina_conhecimento (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.disciplinas (id) on delete cascade,
  titulo text not null,
  conteudo text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disciplina_conhecimento_disc_idx
  on public.disciplina_conhecimento (disciplina_id, ordem);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Trechos indexados para recuperação (FTS português)
--    A coluna `busca` é gerada: to_tsvector é imutável quando o config é literal.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.disciplina_chunks (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.disciplinas (id) on delete cascade,
  fonte text not null,            -- 'conhecimento' | 'aula' | 'material' | 'disciplina'
  titulo text,
  conteudo text not null,
  busca tsvector generated always as (
    to_tsvector('portuguese', coalesce(titulo, '') || ' ' || conteudo)
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists disciplina_chunks_disc_idx
  on public.disciplina_chunks (disciplina_id);
create index if not exists disciplina_chunks_busca_idx
  on public.disciplina_chunks using gin (busca);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Log de conversas (auditoria; útil numa plataforma pública)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.ia_mensagens (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references auth.users (id) on delete cascade,
  disciplina_id uuid not null references public.disciplinas (id) on delete cascade,
  pergunta text not null,
  resposta text,
  contexto_encontrado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ia_mensagens_aluno_idx
  on public.ia_mensagens (aluno_id, created_at desc);
create index if not exists ia_mensagens_disc_idx
  on public.ia_mensagens (disciplina_id, created_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ───────────────────────────────────────────────────────────────────────────
alter table public.disciplina_conhecimento enable row level security;
alter table public.disciplina_chunks       enable row level security;
alter table public.ia_mensagens            enable row level security;

do $$
begin
  -- A base de conhecimento só é manipulada pelo service_role (páginas do master).
  -- Sem policy para authenticated ⇒ nenhum aluno lê o material bruto direto.

  -- Trechos: legíveis pelo aluno só se disciplina + módulo pai estiverem publicados
  -- (mesma regra de aulas/materiais em 0005).
  if not exists (
    select 1 from pg_policies where policyname = 'disciplina_chunks_leitura_aluno'
  ) then
    create policy "disciplina_chunks_leitura_aluno" on public.disciplina_chunks
      for select to authenticated
      using (
        exists (
          select 1
          from public.disciplinas d
          join public.modulos m on m.id = d.modulo_id
          where d.id = disciplina_chunks.disciplina_id
            and d.publicado = true
            and m.publicado = true
        )
      );
  end if;

  -- O aluno lê apenas o próprio histórico. Os inserts são feitos pelo service_role
  -- (route handler), então não há policy de insert para authenticated.
  if not exists (
    select 1 from pg_policies where policyname = 'ia_mensagens_proprias'
  ) then
    create policy "ia_mensagens_proprias" on public.ia_mensagens
      for select to authenticated
      using (auth.uid() = aluno_id);
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Recuperação por full-text (ranqueada). SECURITY INVOKER ⇒ respeita o RLS
--    de disciplina_chunks: o aluno só recupera trechos que tem permissão de ver.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.buscar_chunks(
  p_disciplina_id uuid,
  p_consulta text,
  p_limite int default 6
)
returns table (titulo text, conteudo text, fonte text, score real)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.titulo,
    c.conteudo,
    c.fonte,
    ts_rank_cd(c.busca, websearch_to_tsquery('portuguese', p_consulta)) as score
  from public.disciplina_chunks c
  where c.disciplina_id = p_disciplina_id
    and c.busca @@ websearch_to_tsquery('portuguese', p_consulta)
  order by score desc
  limit greatest(1, least(coalesce(p_limite, 6), 20));
$$;
