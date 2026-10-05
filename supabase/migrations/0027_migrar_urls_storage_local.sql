-- Migração 0027 — Migração de URLs legadas do storage cloud pro stack local
-- Execute no SQL Editor / psql APÓS a 0026.
--
-- O que faz:
-- Atualiza as URLs estáticas apontando para o antigo projeto na nuvem
-- (https://xbyhwzzaoxvyluuerttr.supabase.co) para o endpoint do Supabase
-- self-hosted da VPS (https://app.coworkingsocial.com.br/supabase), onde os
-- arquivos já estão persistidos. Corrige o erro 402 ("exceed_storage_size_quota")
-- do Supabase cloud nos cards de módulos, avatares de perfil e materiais.
--
-- É idempotente: pode ser reexecutada sem efeitos colaterais.

update public.modulos
set capa_url = replace(
  capa_url,
  'https://xbyhwzzaoxvyluuerttr.supabase.co',
  'https://app.coworkingsocial.com.br/supabase'
)
where capa_url like '%xbyhwzzaoxvyluuerttr.supabase.co%';

update public.perfis
set avatar_url = replace(
  avatar_url,
  'https://xbyhwzzaoxvyluuerttr.supabase.co',
  'https://app.coworkingsocial.com.br/supabase'
)
where avatar_url like '%xbyhwzzaoxvyluuerttr.supabase.co%';

update public.materiais
set url = replace(
  url,
  'https://xbyhwzzaoxvyluuerttr.supabase.co',
  'https://app.coworkingsocial.com.br/supabase'
)
where url like '%xbyhwzzaoxvyluuerttr.supabase.co%';
