-- Migração 0026 — Liberação de módulos por turma
-- Execute no SQL Editor / psql APÓS a 0025.
--
-- O que faz: deixa cada turma receber o conteúdo no seu próprio ritmo, sem
-- mexer no que as outras já enxergam (a turma 1 tem o curso inteiro e não
-- pode ser afetada).
--   1. turmas.conteudo_restrito: liga o recorte para aquela turma.
--   2. turma_modulos (turma, modulo_id, liberacao_em): QUANDO cada módulo
--      abre para a turma. Sem linha = fechado; data no passado = aberto;
--      data no futuro = abre sozinho na hora (comparação com now(), sem cron,
--      igual à liberação da própria turma na 0023).
--   3. modulos_liberados_do_aluno(): o conjunto de módulos que a sessão atual
--      pode ver, usado pelo RLS de modulos/disciplinas/aulas/materiais/
--      disciplina_chunks. Como o gate está no RLS, ele vale para TUDO de uma
--      vez — painel, página da disciplina, navegação, materiais e também o
--      assistente de IA (buscar_chunks é SECURITY INVOKER).
--   4. Seed da turma 2: os 3 primeiros módulos abrem junto com a turma; o
--      resto fica fechado até o master liberar em /master/turmas.
--
-- Fail-open no eixo da turma (aluno sem inscrição/turma, ou turma sem
-- restrição, enxerga tudo): fechar por engano trancaria o curso inteiro para
-- as 295 pessoas da turma 1. Fail-closed no eixo do módulo: linha ausente
-- não abre nada.
--
-- É idempotente: pode ser reexecutada (o seed não sobrescreve um plano que a
-- equipe já tenha editado).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Colunas e tabela
-- ───────────────────────────────────────────────────────────────────────────
alter table public.turmas
  add column if not exists conteudo_restrito boolean not null default false;

comment on column public.turmas.conteudo_restrito is
  'true = a turma só enxerga os módulos já abertos em turma_modulos; false = todo o conteúdo publicado';

create table if not exists public.turma_modulos (
  turma int not null references public.turmas (numero) on delete cascade,
  modulo_id uuid not null references public.modulos (id) on delete cascade,
  liberacao_em timestamptz,
  created_at timestamptz not null default now(),
  primary key (turma, modulo_id)
);

comment on column public.turma_modulos.liberacao_em is
  'quando este módulo abre para esta turma; null = fechado sem data marcada';

create index if not exists turma_modulos_modulo_idx
  on public.turma_modulos (modulo_id);

-- RLS ligado SEM policies: o plano é assunto do master (service_role) e das
-- funções SECURITY DEFINER abaixo. O aluno nunca lê esta tabela.
alter table public.turma_modulos enable row level security;

grant select, insert, update, delete on public.turma_modulos to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Funções de leitura da sessão
-- ───────────────────────────────────────────────────────────────────────────

-- Turma do aluno logado. O vínculo conta ↔ inscrição é o e-mail (mesmo
-- critério dos relatórios por turma). Sem e-mail no JWT, sem inscrição ou
-- antes da 0023: null → nenhum recorte.
-- Empate (a mesma pessoa inscrita duas vezes): vale a turma MAIS ANTIGA, a
-- mais permissiva — quem já é veterano não perde o curso por ter se
-- reinscrito.
create or replace function public.turma_do_aluno()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select i.turma
    from public.inscricoes i
   where lower(i.email) = lower(auth.jwt() ->> 'email')
   order by i.turma asc
   limit 1
$$;

-- Módulos que a sessão atual pode enxergar. Devolve um CONJUNTO (usado como
-- `id in (select ...)`) para o Postgres avaliar uma vez por consulta, e não
-- por linha.
create or replace function public.modulos_liberados_do_aluno()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with turma as (
    select t.numero, t.conteudo_restrito
      from public.turmas t
     where t.numero = public.turma_do_aluno()
  )
  select m.id
    from public.modulos m
   where not exists (select 1 from turma where turma.conteudo_restrito)
      or exists (
        select 1
          from public.turma_modulos tm
         where tm.turma = (select numero from turma)
           and tm.modulo_id = m.id
           and tm.liberacao_em is not null
           and tm.liberacao_em <= now()
      )
$$;

grant execute on function public.turma_do_aluno() to authenticated, service_role;
grant execute on function public.modulos_liberados_do_aluno()
  to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. RLS: o recorte entra em todas as leituras do aluno
--    (as policies já exigiam módulo publicado; agora exigem também liberado)
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists "modulos_leitura_aluno" on public.modulos;
create policy "modulos_leitura_aluno" on public.modulos
  for select to authenticated
  using (
    publicado = true
    and id in (select public.modulos_liberados_do_aluno())
  );

drop policy if exists "disciplinas_leitura_aluno" on public.disciplinas;
create policy "disciplinas_leitura_aluno" on public.disciplinas
  for select to authenticated
  using (
    publicado = true
    and exists (
      select 1 from public.modulos m
       where m.id = disciplinas.modulo_id
         and m.publicado = true
         and m.id in (select public.modulos_liberados_do_aluno())
    )
  );

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
         and m.id in (select public.modulos_liberados_do_aluno())
    )
  );

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
         and m.id in (select public.modulos_liberados_do_aluno())
    )
  );

-- Conteúdo da IA: sem isto o assistente responderia sobre módulo fechado.
drop policy if exists "disciplina_chunks_leitura_aluno" on public.disciplina_chunks;
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
         and m.id in (select public.modulos_liberados_do_aluno())
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Seed da turma 2 — 3 primeiros módulos, abrindo junto com a turma
--    (só quando ela ainda não tem plano; não desfaz edição da equipe)
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  v_abertura timestamptz;
begin
  if not exists (select 1 from public.turmas where numero = 2) then
    return;
  end if;
  if exists (select 1 from public.turma_modulos where turma = 2) then
    return;
  end if;

  select coalesce(liberacao_em, now()) into v_abertura
    from public.turmas where numero = 2;

  insert into public.turma_modulos (turma, modulo_id, liberacao_em)
  select 2, m.id, v_abertura
    from (
      select id from public.modulos
       where publicado = true
       order by ordem, created_at
       limit 3
    ) m;

  update public.turmas set conteudo_restrito = true where numero = 2;
end $$;

-- PostgREST precisa reler o schema por causa da tabela nova.
notify pgrst, 'reload schema';
