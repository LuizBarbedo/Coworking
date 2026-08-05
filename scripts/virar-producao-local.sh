#!/usr/bin/env bash
# A VIRADA: migra a produção do Supabase cloud pro stack self-hosted da VPS.
# Pré-requisitos: stack de /opt/coworking-supabase saudável e rota /supabase/
# no nginx (scripts/instalar-rota-supabase-nginx.sh). Sequência: dump FRESCO
# da nuvem → restore local → arquivos do storage → troca do .env.local →
# deploy atômico → smoke test. Rollback: restaurar o .env.local.antes-da-virada
# e rodar bash scripts/deploy.sh de novo (a nuvem fica intacta).
set -euo pipefail

RAIZ="/home/projetos/Coworking"
ENV_APP="$RAIZ/.env.local"
ENV_STACK="/opt/coworking-supabase/.env"
D="/var/backups/coworking/migracao"
URL_PUBLICA="https://app.coworkingsocial.com.br/supabase"

ler_env() { grep -E "^$1=" "$2" | head -1 | cut -d= -f2- | tr -d '"'; }

echo "== 0/5 pré-checagens"
docker exec supabase-db true || { echo "stack local fora do ar"; exit 1; }
ANON_NOVA=$(ler_env ANON_KEY "$ENV_STACK")
CODIGO=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $ANON_NOVA" "$URL_PUBLICA/auth/v1/health")
[ "$CODIGO" = "200" ] || { echo "rota nginx /supabase/ não responde (HTTP $CODIGO) — rode scripts/instalar-rota-supabase-nginx.sh antes"; exit 1; }

NUVEM_URL=$(ler_env DATABASE_URL "$ENV_APP")
case "$NUVEM_URL" in
  *supabase.co*) ;;
  *) echo "DATABASE_URL do .env.local já não aponta pra nuvem — virada já feita?"; exit 1;;
esac

echo "== 1/5 dump fresco da nuvem"
mkdir -p "$D" && chmod 700 "$D"
PGD=/usr/lib/postgresql/17/bin/pg_dump
$PGD -Fc --no-owner -n public -d "$NUVEM_URL" -f "$D/public-com-acl.dump"
$PGD -Fc --no-owner --data-only -t auth.users -t auth.identities -d "$NUVEM_URL" -f "$D/auth-dados.dump"
$PGD -Fc --no-owner --data-only -t storage.buckets -d "$NUVEM_URL" -f "$D/storage-buckets.dump"

echo "== 2/5 restore no stack local"
bash "$RAIZ/scripts/migrar-dados-nuvem-local.sh" "$D"

echo "== 3/5 arquivos do storage"
node "$RAIZ/scripts/migrar-storage.mjs" | tail -1

echo "== 4/5 troca do .env.local (backup em .env.local.antes-da-virada)"
cp "$ENV_APP" "$RAIZ/.env.local.antes-da-virada"
chmod 600 "$RAIZ/.env.local.antes-da-virada"
SERVICE_NOVA=$(ler_env SERVICE_ROLE_KEY "$ENV_STACK")
SENHA_DB=$(ler_env POSTGRES_PASSWORD "$ENV_STACK")
sed -i \
  -e "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$URL_PUBLICA|" \
  -e "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_NOVA|" \
  -e "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_NOVA|" \
  "$ENV_APP"
# DATABASE_URL (migrações via psql) passa a apontar pro Postgres local, via
# pooler em modo sessão (usuário postgres.<tenant>). A URL antiga da nuvem
# fica guardada como DATABASE_URL_NUVEM (redundância).
TENANT=$(ler_env POOLER_TENANT_ID "$ENV_STACK")
sed -i -e "s|^DATABASE_URL=|DATABASE_URL_NUVEM=|" "$ENV_APP"
printf 'DATABASE_URL="postgresql://postgres.%s:%s@127.0.0.1:5433/postgres"\n' "$TENANT" "$SENHA_DB" >> "$ENV_APP"

echo "== 5/5 deploy + smoke test"
bash "$RAIZ/scripts/deploy.sh"
sleep 2
curl -s -o /dev/null -w "login: HTTP %{http_code}\n" https://app.coworkingsocial.com.br/login
curl -s -o /dev/null -w "auth via nginx: HTTP %{http_code}\n" "$URL_PUBLICA/auth/v1/health"
echo "VIRADA CONCLUÍDA. Rollback: cp .env.local.antes-da-virada .env.local && bash scripts/deploy.sh"
