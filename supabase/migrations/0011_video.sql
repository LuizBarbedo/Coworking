-- 0011_video.sql
--
-- Pipeline de vídeo próprio (Cloudflare R2 + transcodificação sob demanda na Modal):
--   1. O master sobe o original direto pro R2 (presigned PUT, prefixo raw/).
--   2. A Modal (ffmpeg, disparada sob demanda) normaliza para 720p + thumbnail,
--      sobe a versão servível e apaga o original.
--   3. O aluno assiste via presigned GET (privado, expira).
--
-- YouTube e URL externa continuam funcionando (provider = 'youtube' | 'url').
-- Para vídeo hospedado por nós, provider = 'r2' e video_uid = chave no bucket.
--
-- Idempotente.

-- Estado do processamento do vídeo hospedado (R2). Nulo para youtube/url.
alter table public.aulas
  add column if not exists video_status text
    check (video_status in ('processando', 'pronta', 'erro')),
  add column if not exists video_thumbnail text,
  add column if not exists video_pronto_em timestamptz,
  add column if not exists video_duracao_seg int;

-- Fila/registro de transcodificação (jobs disparados sob demanda na Modal).
create table if not exists public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas (id) on delete cascade,
  chave_original text not null,     -- objeto em raw/ no R2
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'concluido', 'erro')),
  erro text,
  tentativas int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists video_jobs_pendentes_idx
  on public.video_jobs (status, criado_em)
  where status in ('pendente', 'erro');

-- RLS: a fila é privada. Só o service_role (server actions e o worker) mexe;
-- nenhuma policy para anon/authenticated => acesso negado por padrão.
alter table public.video_jobs enable row level security;
