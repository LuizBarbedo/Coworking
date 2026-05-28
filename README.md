# Plataforma de Educação — Prefeitura

Plataforma pública de educação online voltada à comunidade. Fase atual: página
de inscrição (nome, CPF, e-mail, telefone). Próximas fases incluirão
catálogo de cursos e área autenticada do aluno.

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

# 3. Aplicar schema no Supabase
# cole o conteúdo de supabase/schema.sql no SQL Editor do seu projeto

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
└── schema.sql              # tabela inscricoes + RLS
```

## Próximos passos

- [ ] Criar projeto no Supabase e preencher `.env.local`
- [ ] Executar `supabase/schema.sql` no projeto
- [ ] Definir campos adicionais do formulário de inscrição
- [ ] Substituir o placeholder "PM" do header pela logo real
- [ ] Painel administrativo da prefeitura (área autenticada)
- [ ] Catálogo de cursos
