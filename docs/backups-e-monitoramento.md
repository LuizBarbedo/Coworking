# Backups, monitoramento e segredos da VPS

Registro operacional dos controles criados em 05/08/2026 em resposta aos
riscos R-01 (backup não verificado), R-05 (sem monitoramento) e R-13
(segredos na VPS) do Documento Técnico-Funcional.

> **Desde a virada de 05/08/2026** a produção é o Supabase SELF-HOSTED da
> VPS (`/opt/coworking-supabase`); o projeto Supabase cloud é só cópia de
> segurança. Ver `docs/migracao-banco-vps.md`. As camadas de proteção:
> 1. dump diário local (03:30, este doc);
> 2. espelho diário na nuvem (04:00, `scripts/redundancia-nuvem.sh` —
>    banco + arquivos do storage; RPO de até 24h);
> 3. snapshot da VPS no provedor (Hostinger — conferir/ativar no painel).

## Backup do banco (R-01)

- **O quê**: dump diário do Postgres de produção (o stack local, via
  pooler em 127.0.0.1:5433), esquemas `public` + `auth` + `storage`,
  formato custom do `pg_restore`.
- **Como**: `scripts/backup-banco.sh`, agendado no cron do root às
  **03:30** (`crontab -l`). Log em `/var/log/coworking-backup.log`.
- **Onde**: `/var/backups/coworking/coworking-AAAA-MM-DD-HHMM.dump`,
  retenção dos **14** mais recentes (~600 KB cada hoje).
- **Alerta**: qualquer falha (dump, tamanho suspeito) manda e-mail pro
  Gmail da operação.
- **Ferramenta**: `pg_dump` 17 (pacote `postgresql-client-17`, repositório
  PGDG) — o cliente 16 da distro não fala com o servidor 17.6.

### Teste de restauração (executado em 05/08/2026)

Restaurado o dump do dia num Postgres 17 descartável (Docker):
**295 inscrições, 78 contas do auth (hashes de senha inclusos), 84
progressos de aula e 2 turmas** — contagens idênticas à produção.
Únicos erros: policies de RLS referenciando a role `authenticated`, que
não existe em Postgres puro mas existe em qualquer stack Supabase (o
destino real de uma restauração). Repetir este teste **a cada trimestre**
ou após mudança grande de esquema:

```bash
docker run -d --name teste-restauracao -e POSTGRES_PASSWORD=teste \
  -p 127.0.0.1:55432:5432 postgres:17-alpine
PGPASSWORD=teste /usr/lib/postgresql/17/bin/pg_restore --no-owner \
  --no-privileges -h 127.0.0.1 -p 55432 -U postgres -d postgres \
  /var/backups/coworking/<dump-mais-recente>
PGPASSWORD=teste psql -h 127.0.0.1 -p 55432 -U postgres \
  -c "select count(*) from inscricoes;"   # conferir com a produção
docker rm -f teste-restauracao
```

## Vigia de produção (R-05)

- `scripts/vigiar-producao.sh` no cron a cada **5 minutos**: confere o
  `/login` da plataforma e o disco raiz (aviso em 85%).
- Duas falhas seguidas → e-mail de alerta (máximo 1 por hora, trava em
  `/var/run/coworking-vigia-alertado-em`). Log em
  `/var/log/coworking-vigia.log`.
- **Limitação conhecida**: o vigia mora na própria VPS — se a máquina
  inteira cair, o alerta cai junto. Recomendação registrada: contratar
  verificação externa gratuita (UptimeRobot ou similar) apontando pra
  `https://app.coworkingsocial.com.br/login`.

## Segredos (R-13)

- `.env.local` e `~/.modal.toml` com permissão **600** desde 05/08/2026.
- A `DATABASE_URL` (conexão direta ao Postgres) vive só no `.env.local`
  da VPS; a senha é URL-encoded (contém `@`).
- **Pendente**: rotacionar a Database Password no painel do Supabase
  (Settings → Database) — ela transitou por canal de chat em 05/08.
  Após rotacionar, atualizar a `DATABASE_URL` no `.env.local`. Registrar
  aqui a data de cada rotação.
- Histórico de rotações: (nenhuma ainda)

## E-mail de alerta

Os dois scripts usam a mesma conta Gmail dos convites (`GMAIL_USER` /
`GMAIL_APP_PASSWORD` do `.env.local`), enviando de si pra si via SMTP.
Quando a migração pra Resend acontecer (R-12), os alertas podem continuar
no Gmail — são internos, entregabilidade não é problema.
