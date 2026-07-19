-- Migração 0020 — Registro de e-mails enviados (convites de acesso)
-- Execute no SQL Editor do Supabase APÓS a 0019.
--
-- O que faz: tabela envios_email com um registro por tentativa de envio —
-- status 'enviado' (SMTP aceitou), 'falha' (SMTP recusou na hora) ou
-- 'devolvido' (bounce detectado depois, lendo a caixa do Gmail via IMAP).
-- Alimenta a aba "E-mails" da área do master (visão + reenvio).
--
-- RLS ligado SEM policies: só o service_role lê/escreve (dados de contato).
--
-- É idempotente: pode ser reexecutada sem erro.

create table if not exists public.envios_email (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid references public.inscricoes (id) on delete set null,
  email text not null,
  tipo text not null default 'convite_acesso',
  status text not null default 'enviado'
    check (status in ('enviado', 'falha', 'devolvido')),
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists envios_email_status_idx
  on public.envios_email (status, created_at desc);
create index if not exists envios_email_email_idx
  on public.envios_email (email);

alter table public.envios_email enable row level security;
