# Plataforma de Capacitação — CSMG

Ambiente Virtual de Aprendizagem (AVA) do **Coworking Social de Mudanças
Globais (CSMG)**. Um único projeto Next.js com áreas isoladas por _route
groups_, que sobem juntas para a Vercel:

- **`(site)`** — inscrição pública (nome, CPF, e-mail, telefone) com matrícula
  única e e-mail de confirmação. Rota `/`.
- **`(plataforma)`** — área autenticada: login, primeiro acesso, painel do
  aluno com módulos → disciplinas → aulas, materiais, avaliações (quiz) e
  **chat de IA por disciplina**. Rotas `/login`, `/primeiro-acesso`, `/painel`,
  `/modulos/...`. Protegida pelo `src/proxy.ts`.
- **`(plataforma)/master`** — autoria de conteúdo (módulos, disciplinas,
  aulas, materiais, quizzes e base de conhecimento da IA). Exige papel
  `master`. Rotas `/master/...`.
- **`(painel)`** — relatórios de inscrição para a coordenação, protegidos por
  senha única (sem conta). Rota `/relatorios`.

## Stack

- **Next.js 16** (App Router, TypeScript, `proxy.ts`)
- **Tailwind CSS 4** — design system próprio (paleta da marca, **tema
  claro/escuro**, tipografia Bricolage Grotesque + Figtree, micro-animações)
- **Supabase** (Postgres + Auth + Storage via `@supabase/ssr`, modelo RLS-first)
- **IA**: Ollama Cloud (chat com RAG por full-text do Postgres; upload de
  PDF/DOCX/XLSX/TXT/MD/CSV como base de conhecimento — unpdf/mammoth/exceljs).
  **Assistente flutuante** disponível em todas as telas autenticadas.
- **Tour guiado**: driver.js + narração em voz (ElevenLabs) — passeio
  automático e multi-página que abre no primeiro acesso.
- **Vídeo das aulas**: Cloudflare R2 (armazenamento, egress grátis) +
  transcodificação para 720p **sob demanda na Modal**; playback privado por
  URL assinada. YouTube/URL externa também são suportados.
- **E-mail**: Nodemailer + Gmail SMTP (confirmação de inscrição)
- **Testes**: Vitest (unit) + Playwright (E2E)
- Deploy: Vercel (via GitHub)

## Experiência (redesign)

- **Identidade visual própria** — a *Roda* CSMG (releitura vetorial do
  logotipo) em SVG, favicons e OG image geradas em código; ilustrações
  originais para estados vazios/404.
- **Tema claro/escuro** com alternância no header (persistido, sem flash).
- **Assistente de IA flutuante** (canto inferior direito) em toda a área
  autenticada; dentro de uma disciplina responde no contexto dela, fora dela
  atua em modo geral.
- **Tour guiado com narração** (voz feminina pt-BR): abre automaticamente no
  primeiro acesso, avança sozinho e percorre módulo → disciplina → recursos.
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
#   schema.sql e depois supabase/migrations/0001 ... 0010

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
```

## Variáveis de ambiente

| Variável | Onde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + servidor | chave pública (respeita RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | conta do aluno no 1º acesso, métricas, IA — nunca expor nem prefixar com `NEXT_PUBLIC_` |
| `PAINEL_SENHA` | **só servidor** | senha única do painel `/relatorios` (cookie de 12h) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | **só servidor** | envio do e-mail de confirmação (senha de app, não a da conta) |
| `OLLAMA_API_KEY` | **só servidor** | chave do Ollama Cloud (chat de IA) |
| `OLLAMA_MODEL` | **só servidor** | modelo de chat (padrão `gpt-oss:20b`) |
| `OLLAMA_BASE_URL` | **só servidor** | padrão `https://ollama.com` (nuvem) |
| `OLLAMA_THINK` | **só servidor** | `"true"` liga o modo raciocínio |
| `ELEVENLABS_API_KEY` | **offline** | só para regerar a narração do tour (não é lida em runtime) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | **só servidor** | Cloudflare R2 (vídeo das aulas): presigned PUT/GET |
| `R2_BUCKET_VIDEOS` | **só servidor** | bucket privado dos vídeos (`csmg-videos`) |
| `MODAL_TRANSCODE_URL` | **só servidor** | web endpoint da Modal que transcodifica sob demanda |
| `VIDEO_WEBHOOK_SECRET` | **só servidor** | autentica o disparo da Modal e o callback `/api/video/concluir` |

Configure as de runtime também na Vercel (Project Settings → Environment
Variables). O `.env.local.example` traz o modelo comentado. Os áudios do tour
já vêm prontos em `public/tour/`; para regerá-los, veja
`scripts/gerar_narracao_elevenlabs.py`.

## Estrutura

```
src/
├── app/
│   ├── actions.ts                    # Server Action da inscrição
│   ├── layout.tsx · globals.css      # shell raiz + paleta brand
│   ├── (site)/page.tsx               # landing + formulário de inscrição
│   ├── (painel)/                     # relatórios da coordenação (PAINEL_SENHA)
│   │   ├── actions.ts                # entrar/sair do painel
│   │   └── relatorios/page.tsx       # métricas de inscrição + gráfico
│   ├── (plataforma)/
│   │   ├── actions.ts                # login / primeiroAcesso / logout
│   │   ├── login/ · primeiro-acesso/
│   │   ├── (aluno)/                  # exige login (layout → exigirAluno)
│   │   │   ├── actions.ts            # marcarAulaAssistida / submeterQuiz
│   │   │   ├── painel/page.tsx       # módulos + progresso geral
│   │   │   └── modulos/[modulo]/[disciplina]/  # aulas, materiais, quiz, chat IA
│   │   └── master/                   # exige papel master (layout → exigirMaster)
│   │       ├── actions.ts            # CRUD de conteúdo + base de conhecimento
│   │       ├── modulos/[id]/ · disciplinas/[id]/
│   │       └── page.tsx
│   ├── api/ia/chat/route.ts          # chat IA (streaming; RAG por disciplina ou geral)
│   ├── layout.tsx · globals.css      # fontes, tema, tokens e keyframes
│   ├── icon.svg · favicon.ico · apple-icon.png · opengraph-image.tsx
│   └── not-found.tsx                 # 404 com ilustração
├── components/                       # auth/ · ava/ · master/ · painel/ · ui/
│   ├── ava/                          # abas, aulas, quiz, chat-ia, assistente-flutuante, useChatIA
│   ├── tour/                         # botao-tour (driver.js) + tour.css
│   ├── marca/                        # roda-animada · roda-spinner
│   ├── ilustracoes/                  # spot-illustrations dos estados vazios/404
│   └── ui/                           # barra-progresso · contador · tema-toggle · som-toggle
├── lib/
│   ├── auth.ts · painel-auth.ts      # DAL de sessão + gate do painel
│   ├── cpf.ts · phone.ts (+ testes)  # helpers puros
│   ├── email.ts · metricas.ts · progresso.ts
│   ├── ia/                           # chunking · conhecimento · extrair-texto
│   ├── ollama.ts                     # cliente Ollama Cloud (streaming)
│   ├── som/                          # sons de conquista (Web Audio) + preferência
│   ├── tour/                         # passos do tour por perfil
│   └── supabase/                     # server.ts · client.ts · admin.ts (+ supabase.ts anon)
└── proxy.ts                          # renova sessão + protege rotas autenticadas

e2e/                                  # testes Playwright
supabase/
├── schema.sql                        # tabela inscricoes + RLS
└── migrations/
    ├── 0001_matricula.sql            # matrícula única + RPC criar_inscricao
    ├── 0002_plataforma_ensino.sql    # módulos, aulas, quizzes, progresso + RLS
    ├── 0003_seguranca_inscricoes.sql # LGPD: view de export sem leitura pública
    ├── 0004_painel_metricas.sql      # RPC metricas_painel (só service_role)
    ├── 0005_disciplinas.sql          # camada disciplina entre módulo e conteúdo
    ├── 0006_seed_demo.sql            # conteúdo de demonstração
    ├── 0007_fix_alternativas_publicas.sql  # alternativas visíveis sem o gabarito
    ├── 0008_ia_chat.sql              # conhecimento, chunks (tsvector) e log da IA
    ├── 0009_conhecimento_arquivos.sql # bucket privado p/ arquivos da base
    ├── 0010_busca_geral.sql          # RPC buscar_chunks_geral (assistente global)
    └── 0011_video.sql                # status de vídeo em aulas + fila video_jobs
```

## Como o aluno entra

1. A coordenação marca `selecionado = true` na linha do aluno em `inscricoes`.
2. O aluno acessa `/primeiro-acesso`, informa **matrícula + e-mail** e cria a
   senha. O servidor valida a elegibilidade com a `service_role`, cria a conta
   no Supabase Auth e registra `ativado_em`.
3. Acessos seguintes: `/login` com e-mail + senha.

Quem tem `app_metadata.role = "master"` (gravado só pelo service_role) vê
também a **Área do Master** para cadastrar conteúdo.

## Vídeo das aulas (Cloudflare R2 + Modal)

O master pode **enviar um arquivo de vídeo** (além de colar link do YouTube/URL):

1. O navegador sobe o original direto pro **R2** (presigned PUT — contorna o
   limite de corpo da Vercel). A aula fica `processando`.
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

## Documentação para contribuidores

Fluxo de trabalho (TDD, commits atômicos, fork + PR), arquitetura detalhada e
convenções: **`AGENTS.md`** (carregado automaticamente por agentes de código
via `CLAUDE.md`).
