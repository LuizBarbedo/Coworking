-- 0010_busca_geral.sql
--
-- Assistente de IA global (botão flutuante em todas as telas): fora da página
-- de disciplina o chat busca em TODAS as disciplinas visíveis ao aluno.
--
-- 1. `buscar_chunks_geral`: variante da RPC 0008 sem filtro de disciplina.
--    SECURITY INVOKER — o RLS de disciplina_chunks/disciplinas continua
--    decidindo o que cada aluno enxerga (conteúdo publicado).
-- 2. `ia_mensagens.disciplina_id` passa a aceitar NULL para registrar as
--    conversas do modo geral no mesmo log de auditoria.
--
-- Idempotente: pode ser reexecutada sem efeitos colaterais.

alter table public.ia_mensagens
  alter column disciplina_id drop not null;

create or replace function public.buscar_chunks_geral(
  p_consulta text,
  p_limite int default 6
)
returns table (titulo text, conteudo text, fonte text, disciplina text, score real)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.titulo,
    c.conteudo,
    c.fonte,
    d.titulo as disciplina,
    ts_rank_cd(c.busca, websearch_to_tsquery('portuguese', p_consulta)) as score
  from public.disciplina_chunks c
  join public.disciplinas d on d.id = c.disciplina_id
  where c.busca @@ websearch_to_tsquery('portuguese', p_consulta)
  order by score desc
  limit greatest(1, least(coalesce(p_limite, 6), 20));
$$;

grant execute on function public.buscar_chunks_geral(text, int) to authenticated;
