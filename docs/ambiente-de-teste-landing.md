# Ambiente de teste da landing (efêmero)

URL para a marketing conferir a landing **antes** de ir pra produção. No ar só
enquanto alguém está trabalhando — não é serviço do systemd de propósito.

Diferente do `docs/homologacao.md`, que trata do stack de banco. Aqui o assunto
é **expor a landing** para revisão.

## Como está agora

| | |
| --- | --- |
| URL | **https://coworkingsocial.com.br:8444/** |
| Atalho | `https://coworkingsocial.com.br/teste` redireciona pra lá |
| Usuário | `marketing` |
| Senha | em `/root/.senha-previa-landing` |
| Certificado | o mesmo Let's Encrypt da produção (nome idêntico, só a porta muda) |
| Porta interna | 3002 (`.next-teste`, processo separado) |
| E-mails capturados | http://127.0.0.1:54324 (nada sai pra internet) |
| Banco | stack Supabase do CLI (127.0.0.1:54321) |

Sem DNS novo, sem editar `hosts`, sem aviso de navegador.

### Por que porta, e não subdomínio nem caminho

Tentei as duas alternativas antes; ficam registradas para ninguém repetir:

**Subdomínio** (`teste.coworkingsocial.com.br`) — o nome **não existe no DNS**.
A zona é do registro.br (NS `d.sec.dns.br`, SOA `hostmaster.registro.br`),
painel web, sem API e sem credencial na máquina. Não há curinga, e o
certificado de produção cobre só `coworkingsocial.com.br`, `app.` e `www.`. O
Let's Encrypt não emite para nome que não resolve. Se algum dia o registro A for
criado, aí vale trocar: `certbot --nginx -d teste.coworkingsocial.com.br`.

**Caminho** (`/teste` com `basePath`) — o `next/image` **não prefixa o `src`**
com o basePath. Com otimização ligada, o otimizador monta
`url=/modulos/x.webp` (sem prefixo) e responde 400 "isn't a valid image"; com
`unoptimized: true`, o `<img>` aponta para a raiz do domínio e dá 404. As duas
saídas quebram as 27 imagens da página.

**Mesma porta TLS, nome idêntico** resolve tudo: o certificado que já existe
vale, não precisa de basePath, e a prévia se comporta exatamente como a produção
vai se comportar.

> A porta é **8444**, não 8443: a 8443 é do **Kong**, o gateway do Supabase
> self-hosted da produção. Abrir 8443 no firewall expõe o Kong à internet.

### A pegadinha do `Host`

O vhost da prévia usa `proxy_set_header Host $http_host`, não `$host`. `$host`
descarta a porta, e aí o `Origin` do navegador (`https://host:8444`) não casa com
o `Host` que o Next vê — a proteção CSRF de Server Actions rejeita com
`Invalid Server Actions request`, o que derruba o **formulário de inscrição** e o
registro de visita.

```bash
bash scripts/teste.sh subir build   # padrão: build de produção
bash scripts/teste.sh subir dev     # hot reload pra iterar texto
bash scripts/teste.sh status
bash scripts/teste.sh parar [--tudo]
```

## Dois modos, porque servem a coisas diferentes

**build** — mesmo pipeline da produção: minificado, `next/image` otimizando,
ISR. É o **único** modo em que faz sentido julgar velocidade e LCP. Cada
alteração pede rebuild (~15 s).

**dev** — hot reload: a marketing vê a mudança no minuto em que ela é feita.
Compila sob demanda, sem minificar. Se alguém disser "está lento" neste modo, é
artefato do modo, não da página.

Em nenhum dos dois tocamos o processo de produção (`coworking.service`, porta
3000) nem o `.next` que ele serve — o build de teste vai pra `.next-teste`.

> Nunca rode `npm run build` direto: reescreveria o `.next` que a produção está
> servindo, e quem estiver navegando recebe HTML apontando pra assets que já não
> existem.


## Banco: por que não restauramos a produção

A intenção original era `pg_restore` do dump diário para a prévia ter módulos e
capas reais. **Não é necessário**: o conteúdo da landing (11 temas, 11
especialistas) é estático, vindo de `lib/site/conteudo-landing.ts`. A única
leitura de banco é `buscarTurmas()`, para o aviso de turma — e o stack local já
tem Turma 1 e Turma 2.

Se algum dia a landing passar a ler o catálogo do banco, aí sim:

```bash
ls -t /var/backups/coworking | head -3
pg_restore --clean --if-exists --no-owner \
  -d "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  /var/backups/coworking/<dump>
```

Como as escritas caem no banco local descartável, **não precisa de flag** para
proteger o funil nem a tabela de inscrições. É mais seguro que uma trava
condicional, porque não depende de ninguém ter acertado a condição.

## A armadilha do e-mail

O Next carrega o `.env.local` (**produção**) também em dev e em `next start`. O
que vence é a variável já exportada no shell — então o `.env.teste` sobrescreve
tudo que é perigoso, não só o que a landing usa:

- `SMTP_HOST` aponta para o container do Mailpit (`supabase_inbucket_Coworking`,
  porta 1025 — o container **não publica** essa porta no host, então o script
  resolve o IP dele a cada subida, porque muda a cada restart).
- `GMAIL_USER` e `GMAIL_APP_PASSWORD` **zerados**: SMTP vazio faz o
  `lib/email.ts` cair no Gmail e enviar de verdade, em silêncio, para o endereço
  que a pessoa digitar no formulário.
- `R2_*`, `MODAL_TRANSCODE_URL`, `VIDEO_WEBHOOK_SECRET`, `OLLAMA_API_KEY`,
  `AVISOS_DESDE` zerados pelo mesmo motivo.

O `scripts/teste.sh` aborta se não encontrar o container de e-mail, em vez de
subir com o envio apontado pro Gmail.

## Segurança da exposição

- **Basic auth é requisito, não zelo**: no modo dev o Next mostra stack trace e
  source map. Arquivo de senha em `/etc/nginx/senhas/previa-landing`.
- **`X-Robots-Tag: noindex, nofollow, noarchive`** em toda resposta: a prévia
  está no domínio canônico e seria conteúdo duplicado competindo com a landing.
- O vhost fica em **arquivo separado**
  (`/etc/nginx/sites-available/previa-landing`), sem encostar no de produção. O
  único toque no vhost de produção é um `include` de duas linhas que redireciona
  `/teste` para a porta da prévia. Backup em
  `/root/backup-vhost-producao-*.conf`.
- **Firewall**: só a **8444** foi liberada no ufw. Ao desmontar a prévia:
  `ufw delete allow 8444/tcp`.
- **Pixel da Meta e Google Ads**: `src/app/(site)/layout.tsx` monta as tags só
  quando `NODE_ENV === "production"`. ⚠️ No modo **build** o `NODE_ENV` **é**
  production — as tags sobem. Para revisão de layout é irrelevante; se incomodar,
  use o modo dev.

## Notas de operação

- Havia um `next dev` esquecido de 22 dias ocupando a **3001**, que respawnava
  filhos e impedia outro dev server no mesmo diretório ("Another next dev server
  is already running"). Foi encerrado; a produção (`coworking.service`, 3000)
  nunca foi afetada. A prévia usa a **3002**.
- `supabase start` custa ~2 GB de RAM e a máquina divide com o Supabase
  self-hosted da produção, o Next e o Ollama. `scripts/teste.sh parar --tudo`
  devolve a memória.
- Mídia da landing é reprodutível: `node scripts/preparar-midia-landing.mjs`
  (idempotente, `--forcar` refaz).
