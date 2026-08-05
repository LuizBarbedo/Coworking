#!/usr/bin/env bash
# Vigia de produção (R-05 do documento técnico). Roda no cron a cada 5 min:
# confere o /login e o espaço em disco; duas falhas seguidas disparam e-mail
# de alerta pro Gmail da operação, com trava de 1 alerta por hora pra não
# inundar a caixa. Limitação conhecida: se a VPS inteira cair, o vigia cai
# junto — verificação externa (UptimeRobot ou similar) segue recomendada.
set -uo pipefail

RAIZ="/home/projetos/Coworking"
URL="${VIGIA_URL:-https://app.coworkingsocial.com.br/login}"
ESTADO="/var/run/coworking-vigia" # contador de falhas seguidas
TRAVA="/var/run/coworking-vigia-alertado-em"
LIMITE_DISCO=85 # % de uso que dispara aviso

ler_env() {
  grep -E "^$1=" "$RAIZ/.env.local" | head -1 | cut -d= -f2- | tr -d '"'
}
GMAIL_USER="$(ler_env GMAIL_USER)"
GMAIL_APP_PASSWORD="$(ler_env GMAIL_APP_PASSWORD)"

alerta() {
  local assunto="$1" corpo="$2" agora ultimo
  agora=$(date +%s)
  ultimo=$(cat "$TRAVA" 2>/dev/null || echo 0)
  [ $((agora - ultimo)) -ge 3600 ] || return 0 # no máximo 1 alerta/hora
  printf 'From: %s\nTo: %s\nSubject: %s\n\n%s\n' \
    "$GMAIL_USER" "$GMAIL_USER" "$assunto" "$corpo" |
    curl -s --ssl-reqd "smtps://smtp.gmail.com:465" \
      --mail-from "$GMAIL_USER" --mail-rcpt "$GMAIL_USER" \
      --user "$GMAIL_USER:$GMAIL_APP_PASSWORD" -T - && echo "$agora" > "$TRAVA"
}

# 1) disponibilidade da plataforma
CODIGO=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$URL" || echo 000)
if [ "$CODIGO" = "200" ]; then
  rm -f "$ESTADO"
else
  FALHAS=$(($(cat "$ESTADO" 2>/dev/null || echo 0) + 1))
  echo "$FALHAS" > "$ESTADO"
  echo "$(date '+%F %H:%M') falha $FALHAS: HTTP $CODIGO em $URL"
  if [ "$FALHAS" -ge 2 ]; then
    alerta "[CSMG] PLATAFORMA FORA DO AR (HTTP $CODIGO)" \
      "O vigia recebeu HTTP $CODIGO em $URL por $FALHAS verificações seguidas ($(date '+%d/%m %H:%M')). Conferir: systemctl status coworking.service e journalctl -u coworking.service na VPS."
  fi
fi

# 2) espaço em disco (crítico com banco/backup locais)
USO=$(df --output=pcent / | tail -1 | tr -dc 0-9)
if [ "$USO" -ge "$LIMITE_DISCO" ]; then
  alerta "[CSMG] Disco da VPS em ${USO}%" \
    "O uso do disco raiz chegou a ${USO}% (limite de aviso: ${LIMITE_DISCO}%). Conferir /var/backups/coworking e volumes do Docker."
fi
