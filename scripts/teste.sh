#!/usr/bin/env bash
# Ambiente de TESTE da landing (efêmero) — ver docs/ambiente-de-teste-landing.md
#
#   bash scripts/teste.sh subir build   # build de produção (padrão): mede velocidade
#   bash scripts/teste.sh subir dev     # dev server: hot reload pra iterar texto
#   bash scripts/teste.sh parar [--tudo]
#   bash scripts/teste.sh status
#
# Dois modos porque servem a coisas diferentes:
#
#   build — mesmo pipeline da produção (minificado, imagem otimizada, ISR). É o
#           único modo em que faz sentido julgar velocidade/LCP. Cada mudança
#           pede rebuild.
#   dev   — hot reload: a marketing vê a alteração no minuto em que ela é feita.
#           NÃO serve pra julgar velocidade (compila sob demanda, sem minificar).
#
# Em nenhum dos dois tocamos o processo de produção (coworking.service na 3000)
# nem o `.next` que ele serve: o build de teste vai pra .next-teste.
set -euo pipefail
cd "$(dirname "$0")/.."

PORTA="${PORTA_TESTE:-3002}"
DIST=".next-teste"
# A prévia é servida em coworkingsocial.com.br/teste — domínio que já resolve e
# já tem certificado válido, o que dispensa DNS novo e aviso de navegador.
# Sem basePath: a prévia é servida no mesmo nome, em outra porta TLS.
URL_PREVIA="https://coworkingsocial.com.br:8444"
SESSAO="csmg-teste"
ENV_TESTE=".env.teste"

cor() { printf '\033[1;36m%s\033[0m\n' "$1"; }
erro() { printf '\033[1;31m%s\033[0m\n' "$1" >&2; }

ip_publico() { curl -s -4 --max-time 5 ifconfig.me || echo 127.0.0.1; }

# As chaves do CLI mudam a cada `supabase start` em ambiente novo, e o IP do
# container de e-mail muda a cada restart — por isso o env é regerado aqui.
#
# Importante: o Next carrega o .env.local (PRODUÇÃO) também em dev/start. O que
# vale é a variável já exportada no shell, então este arquivo precisa
# sobrescrever TUDO que for perigoso — não só o que a landing usa. Daí os
# campos zerados no fim: sem eles, um segredo de produção vazaria do .env.local
# para dentro da prévia.
regerar_env() {
  local tmp ip_mail
  tmp="$(mktemp)"
  supabase status -o env > "$tmp" 2>/dev/null || {
    erro "o stack local não está de pé; rode: supabase start"
    rm -f "$tmp"; exit 1
  }
  # shellcheck disable=SC1090
  set -a; source "$tmp"; set +a
  rm -f "$tmp"

  ip_mail="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
    supabase_inbucket_Coworking 2>/dev/null || true)"
  if [ -z "$ip_mail" ]; then
    erro "não achei o container de e-mail do stack local."
    erro "Abortando: com SMTP vazio o lib/email.ts cai no Gmail e envia de verdade."
    exit 1
  fi

  cat > "$ENV_TESTE" <<EOF
# Ambiente de TESTE da landing (efêmero). Gerado por scripts/teste.sh.
# Ver docs/ambiente-de-teste-landing.md. NENHUM segredo de produção aqui.

NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
DATABASE_URL=$DB_URL

NEXT_PUBLIC_SITE_URL=$URL_PREVIA

# Portão de lançamento desligado na prévia.
DOMINIO_LANDING=
PLATAFORMA_LIBERADA=sim

# E-mail preso no Mailpit do stack (web em http://127.0.0.1:54324).
SMTP_HOST=$ip_mail
SMTP_PORT=1025
EMAIL_REMETENTE=teste@coworkingsocial.com.br
EMAIL_REMETENTE_NOME="CSMG (ambiente de teste)"

# Zerados de propósito: o .env.local de produção seria lido junto, e sem isto
# a prévia herdaria credencial de verdade.
GMAIL_USER=
GMAIL_APP_PASSWORD=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_VIDEOS=
MODAL_TRANSCODE_URL=
VIDEO_WEBHOOK_SECRET=
OLLAMA_API_KEY=
AVISOS_DESDE=
PAINEL_SENHA=previa-landing
EOF
  chmod 600 "$ENV_TESTE"
}

subir() {
  local modo="${1:-build}"
  if ss -ltn | grep -q ":${PORTA} "; then
    erro "porta ${PORTA} já ocupada — pare a prévia antes (scripts/teste.sh parar)"
    exit 1
  fi
  regerar_env
  tmux kill-session -t "$SESSAO" 2>/dev/null || true

  local comando
  case "$modo" in
    build)
      cor "== build de produção em ${DIST} (a produção segue no ar, no .next)"
      # shellcheck disable=SC1090
      ( set -a; source "$ENV_TESTE"; set +a
        NEXT_DIST_DIR="$DIST" npm run build )
      comando="NEXT_DIST_DIR=${DIST} node node_modules/.bin/next start -H 127.0.0.1 -p ${PORTA}"
      ;;
    dev)
      cor "== dev server (hot reload; NÃO use pra julgar velocidade)"
      comando="PORT=${PORTA} npm run dev"
      ;;
    *)
      erro "modo desconhecido: ${modo} (use build ou dev)"; exit 1 ;;
  esac

  tmux new-session -d -s "$SESSAO" \
    "set -a; source ${ENV_TESTE}; set +a; ${comando} 2>&1 | tee /tmp/${SESSAO}.log"

  for _ in $(seq 1 45); do
    sleep 2
    if curl -s -o /dev/null "http://127.0.0.1:${PORTA}/"; then break; fi
  done
  if ! curl -s -o /dev/null "http://127.0.0.1:${PORTA}/"; then
    erro "não respondeu na ${PORTA}; veja: tail -30 /tmp/${SESSAO}.log"
    exit 1
  fi

  cor "== prévia no ar (modo ${modo})"
  echo "  público : ${URL_PREVIA}   (usuário marketing)"
  echo "  local   : http://127.0.0.1:${PORTA}"
  echo "  e-mails : http://127.0.0.1:54324   (nada sai pra internet)"
  echo "  log     : tail -f /tmp/${SESSAO}.log"
}

case "${1:-subir}" in
  subir) subir "${2:-build}" ;;
  parar)
    tmux kill-session -t "$SESSAO" 2>/dev/null && cor "prévia derrubada" \
      || cor "nenhuma prévia rodando"
    rm -rf "$DIST"
    if [ "${2:-}" = "--tudo" ]; then
      cor "== parando o stack local (libera ~2 GB de RAM)"
      supabase stop
    else
      echo "  stack local segue de pé; para liberar a RAM: scripts/teste.sh parar --tudo"
    fi
    ;;
  status)
    ss -ltn | grep -q ":${PORTA} " && cor "prévia: NO AR (${PORTA})" || cor "prévia: parada"
    supabase status >/dev/null 2>&1 && cor "stack local: no ar" || cor "stack local: parado"
    systemctl is-active --quiet coworking.service \
      && cor "produção (3000): no ar" || erro "produção (3000): FORA"
    ;;
  *) erro "uso: bash scripts/teste.sh [subir [build|dev]|parar [--tudo]|status]"; exit 1 ;;
esac
