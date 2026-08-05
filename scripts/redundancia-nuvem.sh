#!/usr/bin/env bash
# Redundância diária: espelha o banco LOCAL de produção no projeto Supabase
# cloud (que desde a virada de 05/08/2026 é só cópia de segurança). Sequência
# igual à da migração, no sentido inverso: derruba o public da NUVEM →
# restaura auth → public completo → buckets → arquivos do storage. RPO: 24h.
# Falha dispara e-mail de alerta. Agendado no cron do root às 04:00.
set -euo pipefail

RAIZ="/home/projetos/Coworking"
D="/var/backups/coworking/redundancia"
PGD=/usr/lib/postgresql/17/bin/pg_dump
PGR=/usr/lib/postgresql/17/bin/pg_restore

ler_env() { grep -E "^$1=" "$RAIZ/.env.local" | head -1 | cut -d= -f2- | tr -d '"'; }
LOCAL_URL="$(ler_env DATABASE_URL)"
NUVEM_URL="$(ler_env DATABASE_URL_NUVEM)"
GMAIL_USER="$(ler_env GMAIL_USER)"
GMAIL_APP_PASSWORD="$(ler_env GMAIL_APP_PASSWORD)"

alerta() {
  [ -n "$GMAIL_USER" ] || return 0
  printf 'From: %s\nTo: %s\nSubject: %s\n\n%s\n' \
    "$GMAIL_USER" "$GMAIL_USER" "$1" "$2" |
    curl -s --ssl-reqd "smtps://smtp.gmail.com:465" \
      --mail-from "$GMAIL_USER" --mail-rcpt "$GMAIL_USER" \
      --user "$GMAIL_USER:$GMAIL_APP_PASSWORD" -T - || true
}
falhou() {
  alerta "[CSMG] FALHA na redundancia pra nuvem" \
    "A copia diaria local->nuvem de $(date '+%d/%m %H:%M') falhou na etapa: $1. Ver /var/log/coworking-redundancia.log."
  echo "ERRO: $1" >&2
  exit 1
}

[ -n "$NUVEM_URL" ] || falhou "DATABASE_URL_NUVEM ausente"

mkdir -p "$D" && chmod 700 "$D"

echo "== dump do banco local"
$PGD -Fc --no-owner -n public -d "$LOCAL_URL" -f "$D/public.dump" || falhou "dump public"
$PGD -Fc --no-owner --data-only -t auth.users -t auth.identities -d "$LOCAL_URL" -f "$D/auth.dump" || falhou "dump auth"
$PGD -Fc --no-owner --data-only -t storage.buckets -d "$LOCAL_URL" -f "$D/buckets.dump" || falhou "dump buckets"

echo "== restore na nuvem (public do zero, auth antes das FKs)"
psql "$NUVEM_URL" -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public;
  grant usage on schema public to postgres, anon, authenticated, service_role;" || falhou "drop/create public na nuvem"
psql "$NUVEM_URL" -c "truncate auth.identities, auth.users cascade;" || falhou "truncate auth na nuvem"
$PGR --no-owner --disable-triggers -d "$NUVEM_URL" "$D/auth.dump" || falhou "restore auth"
$PGR --no-owner -d "$NUVEM_URL" "$D/public.dump" || true # avisos de extensão tolerados; conferência decide
psql "$NUVEM_URL" -c "truncate storage.buckets cascade;" || falhou "truncate buckets na nuvem"
$PGR --no-owner --disable-triggers -d "$NUVEM_URL" "$D/buckets.dump" || falhou "restore buckets"

echo "== arquivos do storage (local → nuvem, upsert)"
SENTIDO=local-nuvem node "$RAIZ/scripts/migrar-storage.mjs" | tail -1 || falhou "storage"

echo "== conferência"
LOCAL_N=$(psql "$LOCAL_URL" -t -c "select count(*) from public.inscricoes;" | tr -dc 0-9)
NUVEM_N=$(psql "$NUVEM_URL" -t -c "select count(*) from public.inscricoes;" | tr -dc 0-9)
[ "$LOCAL_N" = "$NUVEM_N" ] || falhou "contagens divergem (local=$LOCAL_N nuvem=$NUVEM_N)"
echo "$(date '+%F %H:%M') redundancia ok: $NUVEM_N inscricoes espelhadas na nuvem"
