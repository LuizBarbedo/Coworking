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
- **Tailwind CSS 4**
- **Supabase** (Postgres + Auth + Storage via `@supabase/ssr`, modelo RLS-first)
- **IA**: Ollama Cloud (chat com RAG por full-text do Postgres; upload de
  PDF/DOCX/XLSX/TXT/MD/CSV como base de conhecimento — unpdf/mammoth/exceljs)
- **E-mail**: Nodemailer + Gmail SMTP (confirmação de inscrição)
- **Testes**: Vitest (unit) + Playwright (E2E)
- Deploy: Vercel (via GitHub)

## Rodando localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.local.example .env.local
# preencha com as chaves do Supabase e demais segredos (tabela abaixo)

# 3. Aplicar o schema no Supabase (SQL Editor, em ordem)
#   schema.sql e depois supabase/migrations/0001 ... 0009

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

Configure todas também na Vercel (Project Settings → Environment Variables).
O `.env.local.example` traz o modelo comentado.

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
│   └── api/ia/chat/route.ts          # chat IA (streaming, RAG por disciplina)
├── components/                       # auth/ · ava/ · master/ · painel/ · ui/
├── lib/
│   ├── auth.ts · painel-auth.ts      # DAL de sessão + gate do painel
│   ├── cpf.ts · phone.ts (+ testes)  # helpers puros
│   ├── email.ts · metricas.ts · progresso.ts
│   ├── ia/                           # chunking · conhecimento · extrair-texto
│   ├── ollama.ts                     # cliente Ollama Cloud (streaming)
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
    └── 0009_conhecimento_arquivos.sql # bucket privado p/ arquivos da base
```

## Como o aluno entra

1. A coordenação marca `selecionado = true` na linha do aluno em `inscricoes`.
2. O aluno acessa `/primeiro-acesso`, informa **matrícula + e-mail** e cria a
   senha. O servidor valida a elegibilidade com a `service_role`, cria a conta
   no Supabase Auth e registra `ativado_em`.
3. Acessos seguintes: `/login` com e-mail + senha.

Quem tem `app_metadata.role = "master"` (gravado só pelo service_role) vê
também a **Área do Master** para cadastrar conteúdo.

## Documentação para contribuidores

Fluxo de trabalho (TDD, commits atômicos, fork + PR), arquitetura detalhada e
convenções: **`AGENTS.md`** (carregado automaticamente por agentes de código
via `CLAUDE.md`).
