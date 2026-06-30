-- Migração 0003 — Fecha exposição de dados pessoais (LGPD) antes do lançamento
-- Execute no SQL Editor do Supabase APÓS as migrações anteriores. Idempotente.
--
-- PROBLEMA:
--   A view public.inscricoes_export foi criada sem `security_invoker`. Como
--   views rodam com os privilégios do dono (postgres) e ignoram o RLS da tabela
--   por baixo, o papel `anon` (chave pública, embarcada no navegador) conseguia
--   ler TODA a tabela de inscrições via PostgREST:
--     GET /rest/v1/inscricoes_export   ->  nome, CPF, e-mail e telefone de todos.
--   A tabela em si está protegida por RLS; o vazamento era só pela view.

-- 1. (OBRIGATÓRIO) A view passa a respeitar o RLS de quem consulta (Postgres 15+).
--    Quem consulta como `anon` deixa de enxergar as linhas; a exportação pelo
--    SQL Editor / service_role continua funcionando.
alter view public.inscricoes_export set (security_invoker = true);

-- 2. (OBRIGATÓRIO) Defesa em profundidade: remove o acesso de leitura público
--    à view. A exportação deve ser feita pelo Dashboard do Supabase (postgres).
revoke all on public.inscricoes_export from anon;
revoke all on public.inscricoes_export from authenticated;

-- 3. (RECOMENDADO — teste o formulário depois de aplicar) Toda inscrição entra
--    pela função criar_inscricao() (SECURITY DEFINER, validada no servidor). A
--    policy de insert direto para `anon` permitia gravar dados crus, sem
--    validação, direto pela API. Removida. A RPC continua funcionando porque
--    roda como o dono da função (ignora o RLS).
drop policy if exists "permitir_insercao_publica" on public.inscricoes;
