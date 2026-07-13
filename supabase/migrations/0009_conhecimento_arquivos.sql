-- Migração 0009 — Arquivos anexados na base de conhecimento da IA
-- Execute no SQL Editor do Supabase APÓS 0008_ia_chat.sql. Idempotente.
--
-- O que faz:
--   1. Cria um bucket PRIVADO "conhecimento" no Supabase Storage para guardar os
--      arquivos originais (PDF/DOCX/XLSX…) que o master anexa à base.
--   2. Adiciona em disciplina_conhecimento os metadados do arquivo.
--
-- Acesso: todo upload/download/remoção é feito pelo service_role (páginas do
-- master, admin client), que ignora o RLS do Storage. Por isso o bucket é
-- privado e NÃO precisa de policies em storage.objects — nenhum aluno acessa os
-- arquivos direto; o master baixa via URL assinada gerada no servidor.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Bucket privado para os arquivos da base de conhecimento
-- ───────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('conhecimento', 'conhecimento', false)
on conflict (id) do nothing;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Metadados do arquivo na linha da base de conhecimento
-- ───────────────────────────────────────────────────────────────────────────
alter table public.disciplina_conhecimento
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_path text,     -- caminho no bucket 'conhecimento'
  add column if not exists arquivo_mime text,
  add column if not exists arquivo_tamanho int;
