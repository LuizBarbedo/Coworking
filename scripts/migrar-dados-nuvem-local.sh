#!/usr/bin/env bash
# Migração de dados: Supabase cloud → stack self-hosted local (/opt/coworking-supabase).
# Ordem que respeita as FKs: derruba public → restaura auth (contas + hashes)
# → restaura public completo (com ACLs) → buckets do storage. Os ARQUIVOS do
# storage são copiados por scripts/migrar-storage.mjs. Idempotente.
#
# Uso: bash scripts/migrar-dados-nuvem-local.sh /var/backups/coworking/migracao
set -euo pipefail

DUMPS="${1:?informe o diretório com os dumps (public-com-acl, auth-dados, storage-buckets)}"
ENV_STACK="/opt/coworking-supabase/.env"

SENHA=$(grep "^POSTGRES_PASSWORD=" "$ENV_STACK" | cut -d= -f2)
PSQL=(docker exec -i -e PGPASSWORD="$SENHA" supabase-db psql -h localhost -U supabase_admin -d postgres -v ON_ERROR_STOP=1)
RESTORE=(docker exec -i -e PGPASSWORD="$SENHA" supabase-db pg_restore -h localhost -U supabase_admin -d postgres --no-owner)

echo "== 1/4 derruba o schema public (as FKs pro auth caem junto)"
"${PSQL[@]}" -c "drop schema if exists public cascade; create schema public;
  grant usage on schema public to postgres, anon, authenticated, service_role;"

echo "== 2/4 dados do auth (users + identities, hashes de senha inclusos)"
"${PSQL[@]}" -c "truncate auth.identities, auth.users cascade;"
"${RESTORE[@]}" --disable-triggers < "$DUMPS/auth-dados.dump"

echo "== 3/4 schema public completo (tabelas, dados, RPCs, policies, ACLs)"
"${RESTORE[@]}" < "$DUMPS/public-com-acl.dump" || true # avisos de extensão são tolerados; a conferência abaixo é o veredito

echo "== 4/4 buckets do storage"
"${PSQL[@]}" -c "truncate storage.buckets cascade;"
"${RESTORE[@]}" --disable-triggers < "$DUMPS/storage-buckets.dump"

echo "== conferência"
"${PSQL[@]}" -t -c "select 'inscricoes: '||count(*) from public.inscricoes;
select 'contas auth: '||count(*) from auth.users;
select 'buckets: '||count(*) from storage.buckets;
select 'FKs pro auth.users: '||count(*) from pg_constraint c
  join pg_class t on t.oid=c.confrelid
  join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='auth' and t.relname='users';
select 'turma_atual(): '||public.turma_atual();"
