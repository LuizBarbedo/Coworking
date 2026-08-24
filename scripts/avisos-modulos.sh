#!/usr/bin/env bash
# Aviso automático de módulo novo liberado. Agendado no cron do root de hora em
# hora; o trabalho de verdade está em scripts/disparo-avisos-automatico.ts.
#
# Existe como wrapper por dois motivos: o cron roda com PATH mínimo (sem node
# nem npx) e precisa entrar na raiz do projeto para o tsx resolver os imports
# com alias "@/".
#
# Idempotente por natureza: se nada abriu desde AVISOS_DESDE, ou se tudo que
# abriu já foi anunciado, a rodada não envia nada e sai em silêncio.
set -euo pipefail

RAIZ="/home/projetos/Coworking"
export PATH="/usr/bin:/usr/local/bin:$PATH"

cd "$RAIZ"

# Uma rodada por vez: rajada de 78 e-mails espaçados de 9s passa de 10 minutos,
# e sem esta trava o cron da hora seguinte poderia entrar em cima.
exec 9>"/var/run/coworking-avisos.lock"
if ! flock -n 9; then
  echo "[$(date -Is)] rodada anterior ainda em andamento — saindo"
  exit 0
fi

npx tsx --conditions=react-server scripts/disparo-avisos-automatico.ts
