# Ambiente de homologação (Supabase local na VPS)

Stack Supabase completo (Postgres 17 + Auth + API + Storage + Studio)
rodando em Docker na própria VPS, via Supabase CLI. Resolve o R-03 do
documento técnico (dev e produção compartilhavam o mesmo banco) e o R-04
(migração agora é testada aqui ANTES de ir pra produção).

## Subir / parar

```bash
cd /home/projetos/Coworking
supabase start    # sobe os containers (~2 GB de RAM)
supabase status   # mostra URLs e chaves locais
supabase stop     # derruba e libera a memória (dados persistem em volume)
```

Serviços (só em 127.0.0.1, nada exposto pra internet):

| Serviço | Endereço |
|---|---|
| API (Kong — o "Supabase URL") | http://127.0.0.1:54321 |
| Postgres direto | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio (SQL Editor local) | http://127.0.0.1:54323 |
| Inbucket (e-mails capturados) | http://127.0.0.1:54324 |

As chaves locais (anon/service_role) são as de desenvolvimento do CLI —
`supabase status` imprime; estão também no `.env.homologacao` (não
commitado). E-mails de auth não saem pra internet: caem no Inbucket.

## Rodar o app contra a homologação

O `npm run dev` lê o `.env.local` (produção). Pra apontar pro stack
local, exporte as variáveis por cima (env do shell vence o arquivo):

```bash
cd /home/projetos/Coworking
set -a; source .env.homologacao; set +a
PORT=3001 npm run dev   # 3001 pra não conflitar com a produção na 3000
```

## Fluxo de migração (novo, obrigatório)

1. Escrever a migração em `supabase/migrations/00XX_*.sql` (idempotente,
   comentário de intenção no topo — convenção de sempre).
2. **Testar na homologação**: `supabase db reset` (recria o banco local
   aplicando 0001→última em ordem) e exercitar o fluxo afetado com
   `npm run dev` apontando pro local.
3. Só então aplicar em produção:
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/00XX_*.sql`
4. Deploy (`bash scripts/deploy.sh`) se houver código junto.

## Observações

- `supabase db reset` **apaga os dados locais** e reaplica tudo + seed
  demo (0006). É o comportamento desejado: homologação é descartável.
- O projeto foi iniciado com `supabase init` (config em
  `supabase/config.toml`, commitada; `major_version = 17`, igual à
  produção).
- Dados reais NÃO entram aqui — pra ensaio de migração de produção,
  ver `docs/migracao-banco-vps.md`.
