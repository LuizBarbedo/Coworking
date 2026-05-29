-- Migração 0001 — Número de matrícula do aluno
-- Execute este SQL no SQL Editor do Supabase APÓS o schema.sql.
-- Pré-requisito: a tabela public.inscricoes já deve existir.
--
-- O que faz:
--   1. Cria a coluna `matricula` (única e permanente) na tabela inscricoes.
--   2. Gera matrícula automaticamente em cada nova inscrição (ano + sequência).
--   3. Faz backfill da matrícula nos inscritos já existentes.
--   4. Cria a função criar_inscricao(), usada pelo app para inserir e devolver
--      a matrícula sem expor leitura pública da tabela (RLS preservado).
--   5. Recria a view de exportação incluindo a coluna "Matrícula".
--
-- É idempotente: pode ser executado mais de uma vez sem erro.

-- Sequência usada para gerar o número de matrícula.
-- Global (não reseta por ano) para garantir unicidade ao longo do tempo.
create sequence if not exists public.matricula_seq;

-- 1. Coluna matricula (criada como nullable para permitir o backfill).
alter table public.inscricoes
  add column if not exists matricula text;

-- 2. Default: ano de inscrição (fuso de São Paulo) + sequência de 6 dígitos.
--    Ex.: 2026000001
alter table public.inscricoes
  alter column matricula set default (
    to_char(now() at time zone 'America/Sao_Paulo', 'YYYY')
    || lpad(nextval('public.matricula_seq')::text, 6, '0')
  );

-- 3. Backfill dos registros antigos, na ordem de inscrição (mais antigo = menor nº).
update public.inscricoes i
set matricula = (
  to_char(i.created_at at time zone 'America/Sao_Paulo', 'YYYY')
  || lpad(nextval('public.matricula_seq')::text, 6, '0')
)
from (
  select id from public.inscricoes where matricula is null order by created_at
) ordenadas
where i.id = ordenadas.id;

-- Trava a coluna como obrigatória e única.
alter table public.inscricoes
  alter column matricula set not null;

create unique index if not exists inscricoes_matricula_key
  on public.inscricoes (matricula);

-- 4. Função que cria a inscrição e devolve a matrícula gerada.
--    SECURITY DEFINER: devolve a matrícula sem abrir leitura pública da tabela.
create or replace function public.criar_inscricao(
  p_nome text,
  p_cpf text,
  p_email text,
  p_telefone text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula text;
begin
  insert into public.inscricoes (nome, cpf, email, telefone)
  values (p_nome, p_cpf, p_email, p_telefone)
  returning matricula into v_matricula;

  return v_matricula;
end;
$$;

grant execute on function public.criar_inscricao(text, text, text, text) to anon;

-- 5. Recria a view de exportação incluindo a coluna "Matrícula".
--    drop + create porque create or replace view não permite reordenar colunas.
drop view if exists public.inscricoes_export;
create view public.inscricoes_export as
select
  row_number() over (order by created_at) as "Nº",
  matricula as "Matrícula",
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
