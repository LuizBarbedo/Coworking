# Plataforma de Educação

Plataforma pública de educação online voltada à comunidade. Fase atual: página
de inscrição (nome, CPF, e-mail, telefone), com geração de número de matrícula
único por aluno. Próximas fases incluirão catálogo de cursos e área autenticada
do aluno.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS 4**
- **Supabase** (banco + auth futuramente)
- Deploy planejado: Vercel ou Hostinger VPS

## Rodando localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.local.example .env.local
# edite .env.local com sua URL e anon key do Supabase

# 3. Aplicar o schema no Supabase
# cole o conteúdo de supabase/schema.sql no SQL Editor do seu projeto
# e, em seguida, as migrações em supabase/migrations/ (em ordem)

# 4. Rodar dev server
npm run dev
```

Acesse http://localhost:3000.

## Estrutura

```
src/
├── app/
│   ├── actions.ts          # Server Actions (insert no Supabase)
│   ├── globals.css         # paleta brand (azul escuro)
│   ├── layout.tsx
│   └── page.tsx            # landing + formulário
├── components/
│   └── registration-form.tsx
└── lib/
    ├── cpf.ts              # máscara + validação CPF
    ├── phone.ts            # máscara + validação telefone
    └── supabase.ts         # cliente lazy

supabase/
├── schema.sql              # tabela inscricoes + RLS
└── migrations/
    └── 0001_matricula.sql  # coluna matrícula + função criar_inscricao
```

## Próximos passos

- [ ] Criar projeto no Supabase e preencher `.env.local`
- [ ] Executar `supabase/schema.sql` e depois `supabase/migrations/0001_matricula.sql`
- [ ] Definir campos adicionais do formulário de inscrição
- [ ] Substituir o placeholder "ED" do header pela logo real
- [ ] Painel administrativo (área autenticada)
- [ ] Catálogo de cursos
