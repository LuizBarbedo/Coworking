<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Plataforma CSMG — Guia para agentes e contribuidores

AVA (Ambiente Virtual de Aprendizagem) do **Coworking Social de Mudanças
Globais**. Next.js 16 (App Router) + Supabase (Postgres/Auth/Storage, RLS-first)
+ IA de apoio ao aluno via Ollama Cloud. Deploy na Vercel.

## Comandos

```bash
npm run dev         # dev server (porta 3000)
npm run build       # build de produção
npm run lint        # eslint
npm test            # testes unitários/integração (Vitest, src/**/*.test.ts[x])
npm run test:watch  # Vitest em modo watch (use durante o TDD)
npm run test:e2e    # E2E (Playwright, e2e/*.spec.ts; sobe o dev server se preciso)
```

## Fluxo de trabalho (obrigatório)

### TDD

Desenvolvimento orientado a testes — **escreva o teste antes do código**:

1. **Red** — escreva um teste que descreve o comportamento desejado e veja-o
   falhar (`npm run test:watch`).
2. **Green** — implemente o mínimo para o teste passar.
3. **Refactor** — melhore o código mantendo os testes verdes.

- Lógica pura (`src/lib/**`) e Server Actions → teste unitário Vitest ao lado
  do arquivo (`foo.test.ts`).
- Fluxos de usuário (login, inscrição, navegação) → E2E Playwright em `e2e/`.
- Nunca abra PR com testes quebrando; rode `npm test` antes de cada commit.

### Commits atômicos

- **Um assunto por commit** — cada commit compila e passa nos testes sozinho.
- Não misture refactor + feature + docs no mesmo commit; separe.
- Mensagens em Conventional Commits, como já é o padrão do histórico:
  `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` (escopo opcional,
  ex.: `feat(master): ...`). Corpo em pt-BR quando precisar de contexto.

### Contribuição via fork

Colaboradores sem escrita no repositório trabalham em fork + branch + PR para
`LuizBarbedo/Coworking` (`origin` = fork, `upstream` = repo principal).

## Arquitetura

### Route groups (`src/app/`)

| Grupo | Rotas | Acesso |
|---|---|---|
| `(site)` | `/` — landing + inscrição pública | público |
| `(plataforma)` | `/login`, `/primeiro-acesso` | público (entrada) |
| `(plataforma)/(aluno)` | `/painel`, `/modulos/[modulo]/[disciplina]` | aluno logado (`exigirAluno` no layout) |
| `(plataforma)/master` | `/master/**` — autoria de conteúdo | papel `master` (`exigirMaster` no layout) |
| `(painel)` | `/relatorios` — métricas de inscrição | senha única `PAINEL_SENHA` (sem conta) |

- **Proteção de rotas** em `src/proxy.ts` (Next 16 usa `proxy.ts`, sucessor do
  `middleware.ts`): renova a sessão Supabase a cada request e redireciona
  visitante de rota protegida para `/login`. O papel `master` é checado no
  layout, não no proxy.
- **Auth** (`src/lib/auth.ts`, tudo `server-only`): `getAluno` / `exigirAluno` /
  `getPapel` / `exigirMaster`. O papel vive em `app_metadata.role` (só o
  service_role escreve; vai no JWT). O painel administrativo usa outro
  mecanismo (`src/lib/painel-auth.ts`): cookie httpOnly com hash da
  `PAINEL_SENHA`, comparação em tempo constante.

### Supabase — três clientes, escolha é decisão de segurança

| Cliente | Arquivo | Quando usar |
|---|---|---|
| anon lazy | `src/lib/supabase.ts` | chamadas públicas (RPC `criar_inscricao`) |
| SSR (anon + cookies) | `src/lib/supabase/server.ts` | agir **como o usuário logado** — RLS aplica |
| admin (service_role) | `src/lib/supabase/admin.ts` | operações privilegiadas server-only — **ignora RLS**, jamais importar no cliente |

- Modelo **RLS-first**: toda tabela nova precisa de policy. Leituras do aluno
  passam pelo cliente SSR para o RLS filtrar (conteúdo publicado, progresso
  próprio via `auth.uid()`).
- Segredos nunca saem do servidor: gabarito de quiz corrigido via RPC
  `corrigir_quiz`, alternativas expostas por view sem a coluna `correta`,
  métricas agregadas via RPC restrita ao service_role.
- Migrations em `supabase/migrations/` (0001–0009): idempotentes, com
  comentário de intenção no topo, aplicadas manualmente no SQL Editor.

### IA / RAG (`src/lib/ia/`, `src/lib/ollama.ts`, `src/app/api/ia/chat/route.ts`)

- Modelo de chat no **Ollama Cloud** (`OLLAMA_BASE_URL`, `OLLAMA_API_KEY`,
  `OLLAMA_MODEL`); resposta em streaming NDJSON. Sem embeddings.
- Base de conhecimento por disciplina: upload (PDF/DOCX/XLSX/TXT/MD/CSV, 20 MB)
  → extração de texto (`extrair-texto.ts`: unpdf/mammoth/exceljs) → arquivo
  original no bucket privado `conhecimento` → texto em `disciplina_conhecimento`.
- Toda mudança de conteúdo dispara `reconstruirChunks` (`conhecimento.ts`),
  que refaz `disciplina_chunks` (~700 chars por trecho, `chunking.ts`).
- Retrieval por full-text do Postgres: RPC `buscar_chunks` (SECURITY INVOKER,
  respeita RLS), 6 chunks; o prompt confina o modelo ao CONTEXTO recuperado.

### Server Actions

`src/app/actions.ts` (inscrição) · `(plataforma)/actions.ts` (login/1º acesso/
logout) · `(aluno)/actions.ts` (progresso, quiz) · `master/actions.ts` (CRUD de
conteúdo + base de conhecimento) · `(painel)/actions.ts` (senha do painel).

### UX / design system

- **Tema**: tokens semânticos em `globals.css` com par claro/escuro; dark mode
  por classe `.dark` (variante `dark:`) e `@custom-variant`. A escala `slate`
  é revestida no escuro; superfícies usam o token `bg-superficie` (nunca
  `bg-white` sólido). Toggle `TemaToggle` (useSyncExternalStore) + script
  anti-flash no root layout.
- **Tipografia**: Figtree (corpo) + Bricolage Grotesque (`font-display`), via
  `next/font`.
- **Motion**: keyframes utilitários (`animate-surgir/aparecer/escalar`,
  `.escalonado`, `animate-girar-roda`), sempre sob `prefers-reduced-motion`.
  `RodaSpinner` (loading), `Contador` (count-up), traço ✓/✗ do quiz.
- **Assistente flutuante**: `AssistenteFlutuante` + hook `useChatIA` +
  `ContextoIA` (registra a disciplina atual). Rota `api/ia/chat` aceita
  `disciplinaId` opcional (modo geral usa `buscar_chunks_geral`, migration 0010).
- **Tour guiado**: `components/tour/botao-tour.tsx` (driver.js) roda os passos
  de `lib/tour/passos.ts` por perfil; navega entre páginas seguindo `linkDe`
  (o 1º link do contêiner) e troca abas via `data-aba`. Marque elementos com
  `data-tour="..."` e listas navegáveis com `data-conteudo` (o tour prioriza
  itens com conteúdo). Narração em `public/tour/` (voz ElevenLabs; regerar com
  `scripts/gerar_narracao_elevenlabs.py`, chave em `ELEVENLABS_API_KEY`).
- **Som**: `lib/som/sons.ts` sintetiza feedback de conquista (Web Audio, sem
  arquivos); só em marcos reais (aula concluída, avaliação aprovada), atrás do
  `SomToggle` (desligado por padrão). Nunca em navegação/erro.
- **Ilustrações**: `components/ilustracoes/` — SVG inline, herdam o tema via
  `currentColor`; usadas em estados vazios e no 404.

### Vídeo das aulas (R2 + Modal)

- Provedor por aula: `aulas.provider` = `youtube` | `url` | `cloudflare` | `r2`
  (+ `video_uid`). O upload próprio usa `r2`; YouTube/URL seguem por embed.
- **Upload**: `iniciarUploadVideo`/`finalizarUploadVideo` (`master/actions.ts`)
  + `components/master/upload-video.tsx`: presigned PUT direto pro R2
  (`lib/r2.ts`, server-only), fila `video_jobs`, aula fica `processando`.
- **Transcodificação SOB DEMANDA na Modal** (`scripts/modal/transcode.py`, web
  endpoint): baixa do R2, `ffmpeg` cap **720p** (teto, não upscale) + thumbnail,
  sobe a versão servível, apaga o original e chama `/api/video/concluir`.
- **Segurança**: a Modal só tem R2 + `VIDEO_WEBHOOK_SECRET` — **nunca** a
  service-role. O banco é atualizado no webhook (`api/video/concluir`).
- **Playback**: a página da disciplina gera URL R2 **assinada** (curta) no
  servidor; `VideoPlayer` toca `r2` num `<video>` nativo com poster.

## Convenções

- **Tudo em pt-BR**: comentários, nomes de arquivos, funções, variáveis,
  tabelas (`exigirAluno`, `reconstruirChunks`, `marcarAulaAssistida`).
- `import "server-only"` no topo de todo módulo que não pode chegar ao browser
  (auth, admin, email, métricas, IA).
- Env vars lidas com `process.env.*` no ponto de uso, com erro claro se
  ausente. Público = prefixo `NEXT_PUBLIC_`; segredo = sem prefixo, nunca
  expor (`SUPABASE_SERVICE_ROLE_KEY`, `PAINEL_SENHA`, `OLLAMA_*`, `GMAIL_*`).
- Variáveis documentadas em `.env.local.example` e no README — ao criar uma
  nova, atualize os dois.
