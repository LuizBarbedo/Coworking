# Migração do Supabase pra VPS (executada em 05/08/2026)

Decisão do Marcus: a produção passou a rodar num **Supabase self-hosted**
na própria VPS (Hostinger São Paulo, 16 GB/4 núcleos), com o projeto
Supabase cloud rebaixado a **cópia de segurança diária**. Motivos: cada
chamada REST no free tier da nuvem levava 0,7–1,3 s (contra ~10 ms do
stack local — medido), ambiente de homologação de verdade e independência
do free tier.

## Arquitetura atual

| Peça | Onde | Observação |
|---|---|---|
| App Next.js | `coworking.service`, porta 3000 | inalterado |
| **Produção Supabase** | `/opt/coworking-supabase` (compose oficial, 11 containers) | segredos próprios; portas SÓ em 127.0.0.1 |
| API pública do stack | `https://app.coworkingsocial.com.br/supabase/` | rota nginx → Kong 127.0.0.1:8000 (o navegador precisa do auth/storage — verifyOtp, fotos) |
| Postgres direto | pooler `127.0.0.1:5433`, usuário `postgres.<tenant>` | é a `DATABASE_URL` do `.env.local` |
| Studio (SQL Editor da produção) | `https://app.coworkingsocial.com.br/supabase/` no navegador | basic auth: DASHBOARD_USERNAME/PASSWORD do `.env` do stack |
| Homologação | stack do Supabase CLI no repo (`supabase start`, portas 5432x) | `docs/homologacao.md` |
| Nuvem (antigo prod) | projeto xbyhwzzaoxvyluuerttr | recebe espelho diário às 04:00; NÃO usar pra escrita |

## O que foi migrado (e conferido)

- Schema `public` completo com ACLs/policies/RPCs (dump `-n public` SEM
  `--no-privileges` — os GRANTs a anon/authenticated não vêm nas
  migrações!), 295 inscrições, 84 progressos, turmas.
- `auth.users` + `auth.identities` (78 contas, hashes de senha juntos —
  ninguém precisou redefinir senha). Sessões antigas caíram (JWT novo).
- Storage: 3 buckets + 49 arquivos (~54 MB) via API.
- Validação: suíte E2E completa contra a produção nova — 24 passed.

## Scripts (todos idempotentes)

- `scripts/virar-producao-local.sh` — a virada completa (dump fresco →
  restore → storage → troca do .env.local → deploy → smoke).
- `scripts/migrar-dados-nuvem-local.sh` — só o restore (ordem: derruba
  public → auth → public com ACLs → buckets; a ordem importa por causa
  das FKs pro auth.users).
- `scripts/migrar-storage.mjs` — arquivos do storage; `SENTIDO=local-nuvem`
  inverte (usado pela redundância).
- `scripts/redundancia-nuvem.sh` — espelho diário local→nuvem (04:00).
- `scripts/instalar-rota-supabase-nginx.sh` — rota `/supabase/` no nginx.

## Rollback (enquanto a nuvem existir)

```bash
cd /home/projetos/Coworking
cp .env.local.antes-da-virada .env.local
bash scripts/deploy.sh
```

Minutos. ATENÇÃO: dados criados APÓS a virada só existem no stack local —
antes do rollback, rodar `scripts/redundancia-nuvem.sh` pra levar tudo
pra nuvem (é o espelho na direção certa).

## Operação

- Migrações de banco: testar na homologação (`supabase db reset`) e
  aplicar com `psql "$DATABASE_URL" -f supabase/migrations/00XX.sql`
  (agora aponta pro pooler local).
- `docker compose ps` em `/opt/coworking-supabase` pra saúde do stack;
  containers têm `restart: unless-stopped` (sobem sozinhos com o Docker).
- Atualização do stack: `docker compose pull && docker compose up -d`
  numa janela — NUNCA junto com deploy do app.
- Segredos do stack: `/opt/coworking-supabase/.env` (600) e cópia das
  chaves geradas em `/root/.supabase-prod-segredos.json` (600).
