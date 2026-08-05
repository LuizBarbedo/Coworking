-- Migração 0025 — batimentos da operação (backup e espelho pra nuvem)
-- Os scripts de cron (backup-banco.sh 03:30, redundancia-nuvem.sh 04:00)
-- gravam aqui o resultado de cada rodada; o card "Saúde da operação" do
-- Início do master lê e avisa quando um batimento atrasa (>26h) ou falha.
-- Uma linha por rotina (upsert pela id) — sem histórico, os logs em
-- /var/log/coworking-*.log continuam sendo a fonte detalhada.
--
-- É idempotente: pode ser reexecutada sem erro.

create table if not exists public.ops_heartbeats (
  id text primary key,
  ok boolean not null,
  detalhes text,
  atualizado_em timestamptz not null default now()
);

-- RLS ligado sem policy nenhuma: só o service_role (card do master) e o
-- psql dos scripts tocam na tabela. Grants explícitos porque neste banco
-- não há default privileges pros papéis do Supabase (armadilha do restore).
alter table public.ops_heartbeats enable row level security;
grant select, insert, update on public.ops_heartbeats to service_role;
