#!/usr/bin/env bash
# Backup diário do Postgres de produção (R-01 do documento técnico).
# Dump em formato custom (pg_restore) com retenção dos últimos 14; qualquer
# falha dispara e-mail de alerta pro Gmail da operação. Agendado no cron do
# root às 03:30. O mesmo dump serve de mecanismo pra migração/redundância.
set -euo pipefail

RAIZ="/home/projetos/Coworking"
DESTINO="/var/backups/coworking"
PG_DUMP="/usr/lib/postgresql/17/bin/pg_dump"
RETENCAO=14
TAMANHO_MINIMO=100000 # bytes — dump menor que isso é sinal de problema

# Lê uma variável do .env.local sem despejar os segredos no ambiente.
ler_env() {
  grep -E "^$1=" "$RAIZ/.env.local" | head -1 | cut -d= -f2- | tr -d '"'
}

DATABASE_URL="$(ler_env DATABASE_URL)"
GMAIL_USER="$(ler_env GMAIL_USER)"
GMAIL_APP_PASSWORD="$(ler_env GMAIL_APP_PASSWORD)"

alerta() {
  local assunto="$1" corpo="$2"
  [ -n "$GMAIL_USER" ] && [ -n "$GMAIL_APP_PASSWORD" ] || return 0
  printf 'From: %s\nTo: %s\nSubject: %s\n\n%s\n' \
    "$GMAIL_USER" "$GMAIL_USER" "$assunto" "$corpo" |
    curl -s --ssl-reqd "smtps://smtp.gmail.com:465" \
      --mail-from "$GMAIL_USER" --mail-rcpt "$GMAIL_USER" \
      --user "$GMAIL_USER:$GMAIL_APP_PASSWORD" -T - || true
}

falhou() {
  alerta "[CSMG] FALHA no backup do banco de producao" \
    "O backup de $(date '+%d/%m %H:%M') falhou na etapa: $1. Conferir /var/log/coworking-backup.log na VPS."
  echo "ERRO: $1" >&2
  exit 1
}

[ -n "$DATABASE_URL" ] || falhou "DATABASE_URL ausente no .env.local"

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"

ARQUIVO="$DESTINO/coworking-$(date +%F-%H%M).dump"
"$PG_DUMP" -Fc --no-owner --no-privileges -d "$DATABASE_URL" \
  -n public -n auth -n storage -f "$ARQUIVO" || falhou "pg_dump"

TAMANHO=$(stat -c%s "$ARQUIVO")
[ "$TAMANHO" -ge "$TAMANHO_MINIMO" ] || falhou "dump suspeito de truncado (${TAMANHO} bytes)"

# Retenção: mantém os N mais novos.
ls -1t "$DESTINO"/coworking-*.dump | tail -n +$((RETENCAO + 1)) | xargs -r rm --

echo "$(date '+%F %H:%M') backup ok: $ARQUIVO (${TAMANHO} bytes)"
