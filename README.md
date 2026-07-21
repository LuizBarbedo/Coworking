# Plataforma de Capacitação — CSMG

Ambiente Virtual de Aprendizagem (AVA) do **Coworking Social de Mudanças
Globais (CSMG)**. Um único projeto Next.js com áreas isoladas por _route
groups_:

- **`(site)`** — inscrição pública (nome, CPF, e-mail, telefone) com matrícula
  única; quem se inscreve já nasce liberado e recebe o acesso por e-mail.
  Rotas `/`, `/inscricao-realizada`, `/privacidade`.
- **`(plataforma)`** — área autenticada: login, primeiro acesso, definição de
  senha por convite, painel do aluno com módulos → disciplinas → aulas,
  materiais, avaliações (quiz), **feedback ao concluir a disciplina**,
  **fórum de dúvidas** (com moderação prévia por IA), **perfil do aluno**
  (bio + foto) e **chat de IA por disciplina**. Rotas `/login`,
  `/primeiro-acesso`, `/definir-senha`, `/painel`, `/modulos/...`, `/forum`,
  `/perfil`. Protegida pelo `src/proxy.ts`.
- **`(plataforma)/master`** — área da equipe (papel `master`, com níveis
  **admin/monitor** e permissões granulares): autoria de conteúdo (módulos com
  capa e agendamento de publicação, disciplinas, aulas, materiais, quizzes,
  base de conhecimento da IA), moderação do fórum, gestão de **alunos**
  (busca, detalhe com estatísticas), **equipe**, **e-mails/convites de
  acesso**, **relatórios** e **trilha de auditoria** (eventos). Rotas
  `/master/...`.
- **`(painel)`** — relatórios de inscrição para a coordenação, protegidos por
  senha única (sem conta). Rota `/relatorios` (+ exportação CSV).

## Stack

- **Next.js 16** (App Router, TypeScript, `proxy.ts`)
- **Tailwind CSS 4** — design system próprio (paleta da marca, **tema
  claro/escuro**, tipografia Bricolage Grotesque + Figtree, micro-animações)
- **Supabase** (Postgres + Auth + Storage via `@supabase/ssr`, modelo RLS-first)
- **IA**: Ollama Cloud — chat com RAG por full-text do Postgres (upload de
  PDF/DOCX/XLSX/TXT/MD/CSV como base de conhecimento — unpdf/mammoth/exceljs),
  **assistente flutuante** em todas as telas autenticadas (orienta a navegação
  com links internos clicáveis) e **moderação prévia do fórum**.
- **Tour guiado**: driver.js + narração em voz (ElevenLabs) — passeio
  automático e multi-página que abre no primeiro acesso.
- **Vídeo das aulas**: Cloudflare R2 (armazenamento, egress grátis) +
  transcodificação para 720p **sob demanda na Modal**; playback privado por
  URL assinada. YouTube/URL externa também são suportados. Capas dos módulos
  geradas com SDXL na Modal (`scripts/modal/gerar_capas.py`).
- **E-mail**: Nodemailer + Gmail SMTP (confirmação de inscrição, boas-vindas
  com acesso, convites de equipe), com registro de envios e verificação de
  devoluções (bounces via IMAP).
- **Testes**: Vitest (unit) + Playwright (E2E)
- **Deploy**: VPS própria (systemd `coworking.service` + nginx), deploy
  atômico via `bash scripts/deploy.sh` — builda em `.next-nova` com a
  produção no ar e troca com o serviço parado (~2s), com health check no fim.
  **Nunca** rode `npm run build` direto com o serviço servindo o mesmo
  `.next`.

## Experiência (redesign)

- **Identidade visual própria** — a *Roda* CSMG (releitura vetorial do
  logotipo) em SVG, favicons e OG image geradas em código; ilustrações
  originais para estados vazios/404.
- **Tema claro/escuro** com alternância no header (persistido, sem flash).
- **Assistente de IA flutuante** (canto inferior direito) em toda a área
  autenticada; dentro de uma disciplina responde no contexto dela, fora dela
  atua em modo geral e orienta a navegação com links internos.
- **Tour guiado com narração** (voz feminina pt-BR): abre automaticamente no
  primeiro acesso, avança sozinho e percorre módulo → disciplina → recursos.
- **Navegação de curso**: trilha (breadcrumb) nas páginas de disciplina,
  navegação sequencial entre disciplinas e botão Voltar consistente.
- **Micro-animações** sóbrias (Roda animada no hero, count-up, spinner da
  marca, feedback ✓/✗ do quiz) e **feedback sonoro** opcional em conquistas.
- Tudo respeita `prefers-reduced-motion` e mantém contraste AA.

## Rodando localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.local.example .env.local
# preencha com as chaves do Supabase e demais segredos (tabela abaixo)

# 3. Aplicar o schema no Supabase (SQL Editor, em ordem)
#   schema.sql e depois supabase/migrations/0001 ... 0022

# 4. Rodar dev server
npm run dev
```

Acesse http://localhost:3000.

## Testes

O projeto segue **TDD** (veja `AGENTS.md`):

```bash
npm test            # unitários (Vitest) — src/**/*.test.ts[x]
npm run test:watch  # modo watch, para o ciclo red → green → refactor
npm run test:e2e    # E2E (Playwright) — e2e/*.spec.ts, sobe o dev server se preciso
                    # ATENÇÃO: escreve no banco do .env.local (dados marcados
                    # e2e-*@example.com, apagados no teardown automático)
```

Os specs E2E pulam sozinhos quando falta uma dependência (seed demo apagado,
migração não aplicada).

## Variáveis de ambiente

| Variável | Onde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + servidor | chave pública (respeita RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | conta do aluno no 1º acesso, métricas, IA — nunca expor nem prefixar com `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | cliente + servidor | URL pública canônica da landing (`metadataBase` das OG images) |
| `DOMINIO_LANDING` | **só servidor** | domínio que serve só a landing (a plataforma vive em `app.<dominio>`; vazio = portão desligado). URLs internas sempre via `lib/urls.urlDaPlataforma()` |
| `PLATAFORMA_LIBERADA` | **só servidor** | `"sim"` libera a plataforma no domínio principal (lida em runtime) |
| `PAINEL_SENHA` | **só servidor** | senha única do painel `/relatorios` (cookie de 12h) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | **só servidor** | envio de e-mails (senha de app, não a da conta) |
| `OLLAMA_API_KEY` | **só servidor** | chave do Ollama Cloud (chat de IA) |
| `OLLAMA_MODEL` | **só servidor** | modelo de chat (padrão `gpt-oss:20b`) |
| `OLLAMA_BASE_URL` | **só servidor** | padrão `https://ollama.com` (nuvem) |
| `OLLAMA_THINK` | **só servidor** | `"true"` liga o modo raciocínio |
| `ELEVENLABS_API_KEY` | **offline** | só para regerar a narração do tour (não é lida em runtime) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | **só servidor** | Cloudflare R2 (vídeo das aulas): presigned PUT/GET |
| `R2_BUCKET_VIDEOS` | **só servidor** | bucket privado dos vídeos (`csmg-videos`) |
| `MODAL_TRANSCODE_URL` | **só servidor** | web endpoint da Modal que transcodifica sob demanda |
| `VIDEO_WEBHOOK_SECRET` | **só servidor** | autentica o disparo da Modal e o callback `/api/video/concluir` |

O `.env.local.example` traz o modelo comentado. Os áudios do tour já vêm
prontos em `public/tour/`; para regerá-los, veja
`scripts/gerar_narracao_elevenlabs.py`.

## Estrutura

```
src/
├── app/
│   ├── actions.ts                    # Server Action da inscrição
│   ├── layout.tsx · globals.css      # fontes, tema, tokens e keyframes
│   ├── (site)/                       # landing + inscrição, privacidade
│   ├── (painel)/                     # relatórios da coordenação (PAINEL_SENHA)
│   │   ├── actions.ts                # entrar/sair do painel
│   │   └── relatorios/               # métricas + funil + visão Turma + CSV
│   ├── (plataforma)/
│   │   ├── actions.ts                # login / primeiroAcesso / logout
│   │   ├── login/ · primeiro-acesso/ · definir-senha/
│   │   ├── (aluno)/                  # exige login (layout → exigirAluno)
│   │   │   ├── actions.ts            # progresso, quiz, fórum, perfil, feedback
│   │   │   ├── painel/               # trilha completa (capas, "Em breve", progresso)
│   │   │   ├── modulos/[modulo]/[disciplina]/  # aulas, materiais, quiz, chat IA
│   │   │   ├── forum/                # fórum de dúvidas (novo tópico, respostas)
│   │   │   └── perfil/               # perfil próprio e público ([id])
│   │   └── master/                   # papel master (layout → exigirMaster)
│   │       ├── actions.ts            # CRUD de conteúdo + conhecimento + gestão
│   │       ├── modulos/[id]/ · disciplinas/[id]/
│   │       ├── alunos/ · alunos/[id]/  # gestão de alunos + detalhe (admin)
│   │       ├── equipe/               # níveis admin/monitor + permissões
│   │       ├── emails/               # convites de acesso em massa + devoluções
│   │       ├── forum/                # fila de moderação
│   │       ├── relatorios/           # métricas (permissão ver_relatorios)
│   │       └── eventos/              # trilha de auditoria (admin)
│   ├── api/ia/chat/route.ts          # chat IA (streaming; RAG por disciplina ou geral)
│   ├── api/video/concluir/route.ts   # webhook da Modal (VIDEO_WEBHOOK_SECRET)
│   ├── icon.svg · favicon.ico · apple-icon.png · opengraph-image.tsx
│   └── not-found.tsx                 # 404 com ilustração
├── components/                       # auth/ · ava/ · forum/ · master/ · painel/
│   ├── ava/                          # abas, aulas, quiz, chat-ia, assistente, avaliação
│   ├── tour/ · marca/ · ilustracoes/ # tour guiado, Roda CSMG, spot-illustrations
│   ├── perfil/ · metricas/ · site/   # perfil do aluno, gráficos, landing
│   └── ui/                           # barra-progresso · contador · tema/som-toggle
├── lib/
│   ├── auth.ts · painel-auth.ts      # DAL de sessão + gate do painel
│   ├── permissoes.ts                 # níveis admin/monitor + permissões da equipe
│   ├── auditoria.ts                  # registrarEvento (trilha de eventos)
│   ├── convites.ts · devolucoes.ts   # convites de acesso + bounces (IMAP)
│   ├── email.ts · metricas.ts · progresso.ts · relatorios-turma.ts
│   ├── forum/                        # moderação IA, rate-limit, saúde, notificações
│   ├── ia/                           # chunking · conhecimento · extrair-texto · guia
│   ├── perfil/                       # avatar, estatísticas, validação
│   ├── ollama.ts                     # cliente Ollama Cloud (streaming)
│   ├── r2.ts · video.ts              # presigned URLs + fila de vídeo (server-only)
│   ├── urls.ts                       # urlDaPlataforma() — base app.<dominio>
│   ├── som/ · tour/                  # sons de conquista + passos do tour
│   └── supabase/                     # server.ts · client.ts · admin.ts (+ supabase.ts anon)
└── proxy.ts                          # renova sessão + protege rotas autenticadas

e2e/                                  # Playwright: inscrição, 1º acesso, aula/quiz,
                                      # fórum, perfil, equipe, assistente, smoke
scripts/
├── deploy.sh                         # deploy atômico na VPS (build + troca + health)
├── disparo-lancamento.ts             # disparo de convites fora do Next (retomável)
├── criar-master.mjs · seed-aluno-teste.mjs · testar-email.mjs
├── gerar_narracao_elevenlabs.py      # narração do tour (offline)
└── modal/                            # transcode.py (vídeo 720p) · gerar_capas.py (SDXL)
supabase/
├── schema.sql                        # tabela inscricoes + RLS
└── migrations/                       # 0001–0022, idempotentes, aplicadas no SQL Editor
```

As migrations cobrem, em ordem: matrícula/RPC de inscrição (0001), plataforma
de ensino (0002), segurança LGPD (0003), métricas do painel (0004),
disciplinas (0005), seed demo (0006), gabarito protegido (0007), IA/chat
(0008–0010), vídeo (0011), origem de tráfego/visitas/funil (0012–0014),
fórum (0015, 0017), perfis (0016), capa e agendamento de módulos (0018–0019),
registro de e-mails (0020), auditoria (0021) e feedback de disciplina (0022).

## Como o aluno entra

1. **Inscrição pela landing** — já nasce liberada e dispara na hora o e-mail
   de boas-vindas com o link de acesso (registrado em `envios_email`).
2. **Convite da equipe** — a aba **E-mails** do master libera e dispara
   convites em massa (idempotente: pula quem já recebeu/ativou), com registro
   por envio (enviado/falha/devolvido) e verificação de bounces.
3. O aluno acessa `/primeiro-acesso`, informa **matrícula + e-mail** e cria a
   senha (o servidor valida a elegibilidade com a `service_role`). Convites de
   equipe usam `/definir-senha` com token (`invite`/`recovery`).
4. Acessos seguintes: `/login` com e-mail + senha, sempre em
   `app.<dominio>` (`lib/urls.urlDaPlataforma()`).

## Equipe e permissões

Quem tem `app_metadata.role = "master"` (gravado só pelo service_role) acessa
a área do master. Há dois níveis (`lib/permissoes.ts`):

- **admin** — tudo, inclusive equipe, detalhe de alunos e auditoria.
- **monitor** — só o que um admin concedeu: `visao_aluno`, `moderar_forum`,
  `editar_conteudo`, `ver_relatorios`, `gerenciar_emails`.

## Fórum de dúvidas

Tópicos e respostas dos alunos passam por **moderação prévia com IA**
(`lib/forum/moderacao.ts`): o modelo recebe o catálogo real do curso e emite
um veredito antes da publicação; a equipe revisa a fila em `/master/forum`.
Há rate-limit, notificações e um indicador de saúde do fórum nos relatórios.

## Relatórios e auditoria

- **`/relatorios`** (senha única): métricas de inscrição, funil de conversão
  ao longo do tempo (visitas → inscrições), origem de tráfego (UTMs),
  comparativo de períodos, exportação CSV e **visão Turma** (avanço por
  disciplina, desempenho e feedback anônimo dos alunos, com busca/paginação).
- **`/master/relatorios`** (permissão `ver_relatorios`): as mesmas métricas
  dentro da área logada, mais a saúde do fórum.
- **`/master/eventos`** (admin): trilha de auditoria — sessão, aula, quiz,
  fórum, moderação, conteúdo e equipe passam por `registrarEvento`
  (`lib/auditoria.ts`, à prova de falha), com filtros, busca e paginação.

## Vídeo das aulas (Cloudflare R2 + Modal)

O master pode **enviar um arquivo de vídeo** (além de colar link do YouTube/URL):

1. O navegador sobe o original direto pro **R2** (presigned PUT — contorna o
   limite de corpo do servidor). A aula fica `processando`.
2. `finalizarUploadVideo` dispara **sob demanda** o web endpoint da **Modal**
   (`scripts/modal/transcode.py`), que baixa do R2, normaliza para **720p**
   (ffmpeg), gera thumbnail, sobe a versão servível e apaga o original.
3. A Modal chama de volta **`/api/video/concluir`** (autenticado por
   `VIDEO_WEBHOOK_SECRET`) — só aí o banco é atualizado, com a service-role
   **que nunca sai do nosso lado**.
4. O aluno assiste por **URL assinada** (privada, expira) num player nativo.

**Ativar em um ambiente novo:**
- [ ] Aplicar a migration `supabase/migrations/0011_video.sql` no SQL Editor.
- [ ] Criar o bucket R2 privado + chaves S3 (Object Read & Write) e configurar
      o **CORS** do bucket (PUT/GET/HEAD para as origens do app).
- [ ] Definir as envs `R2_*`, `MODAL_TRANSCODE_URL`, `VIDEO_WEBHOOK_SECRET`.
- [ ] Criar o secret `csmg-video` na Modal (R2 + `VIDEO_WEBHOOK_SECRET` +
      `APP_WEBHOOK_URL`, **sem** a service-role) e `modal deploy
      scripts/modal/transcode.py`.
- [ ] Ajustar `APP_WEBHOOK_URL` (no secret da Modal) para a URL pública do app.

## Deploy (produção na VPS)

A produção roda numa VPS própria: `next start` sob o systemd
(`coworking.service`) atrás do nginx. Deploy:

```bash
bash scripts/deploy.sh
```

O script builda em `.next-nova` com a produção no ar, para o serviço, troca o
diretório e religa (~2s fora do ar), terminando com health check no `/login`.
Rode `npm test` antes; os E2E rodam contra a porta 3000 (produção).

## Documentação para contribuidores

Fluxo de trabalho (TDD, commits atômicos), arquitetura detalhada e
convenções: **`AGENTS.md`** (carregado automaticamente por agentes de código
via `CLAUDE.md`).
