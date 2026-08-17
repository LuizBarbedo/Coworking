# Adaptações para a Turma 2

_2026-08-05 — divisão dos alunos em turmas com liberação de acesso por data._

## A regra

- **Turma 1** = todo mundo inscrito até a aplicação da migração 0023 (corte
  de 05/08). Nada muda: acesso total, contas ativadas continuam ativadas.
- **Turma 2** = inscrições novas a partir do deploy. **Não acessam a
  plataforma até 17/08/2026**; ao tentar entrar, caem na página
  `/aguardando-liberacao`, que mostra a data.
- Em 17/08 o acesso **abre sozinho** (comparação de data, sem cron). O
  e-mail de convite sai pelo botão manual da aba E-mails, como no
  lançamento. Depois disso, inscrição nova volta a ter acesso imediato.
- O modelo já suporta uma futura Turma 3: criar a turma na tela
  `/master/turmas` e pronto — inscrições novas passam a cair nela.

## Por que o bloqueio é simples

O único gate de acesso do sistema sempre foi `inscricoes.selecionado`,
checado **na criação da conta** (`/primeiro-acesso`). Quem é da turma 2
não ativa conta antes de 17/08 — logo não existe sessão pra bloquear, e o
acesso da turma 1 não é tocado em nenhum ponto.

## O que mudou no banco (migração 0023 — `supabase/migrations/0023_turmas.sql`)

- Tabela `turmas` (`numero` PK, `nome`, `liberacao_em`; **null = liberada**).
  RLS ligado sem policies (só service_role). Seeds: Turma 1 liberada,
  Turma 2 abre em `2026-08-17T00:00:00-03:00`.
- Coluna `inscricoes.turma` com backfill: **todo o legado vira turma 1**
  (default constante no `add column`); depois o default muda pra função
  `turma_atual()` (= `max(numero)`) — inscrição nova cai na turma mais
  recente **sem recriar a RPC `criar_inscricao`** (assinatura intacta, zero
  risco de PGRST202).

## O que mudou no código

| Área | Mudança |
|---|---|
| `src/lib/turmas.ts` (+ testes) | Helpers puros: `turmaLiberada` (data ≤ agora = aberta), `filtrarPorTurmaLiberada`, `turmaAtualDeInscricao`, `dataLiberacaoFormatada`. **Tudo fail-open**: sem a 0023, comportamento antigo. |
| `src/lib/turmas-dados.ts` | Consultas server-only best-effort, sempre separadas das queries críticas. |
| Inscrição (`src/app/actions.ts`) | Turma fechada: **não** seleciona nem convida — envia e-mail de confirmação com matrícula + data (registrado em `envios_email` como `confirmacao_turma`, tipo próprio pra não enganar a idempotência do disparo). Turma aberta: fluxo de sempre. |
| Landing (`(site)/page.tsx`) | Badge "Inscrições abertas para a Turma 2" + nota no formulário com a data. ISR 5 min — editar a data na gestão reflete sem deploy. Após 17/08 os textos voltam sozinhos ao padrão. |
| Confirmação (`/inscricao-realizada`) | Mostra turma + data em vez de "veja seu e-mail agora". |
| `/aguardando-liberacao` (nova) | Página pública com a data, sem dado pessoal na URL. Turma inexistente/liberada → redirect `/login` (se auto-desativa após 17/08). |
| `/primeiro-acesso` | Turma fechada → redirect pra página de espera. Turma aberta mas ainda sem `selecionado` (manhã de 17/08, antes do disparo) → **auto-seleciona e ativa**. `selecionado=true` manual (admin) → ativa sempre, mesmo antes da data. |
| `/login` | E-mail com inscrição de turma fechada (sem conta) → redirect pra espera em vez de "senha incorreta". |
| Disparo em massa (`src/lib/convites.ts`) | `liberarEDispararConvites` deixa turma fechada de fora (novo campo `aguardandoTurma` no resultado). Vale pro botão da aba E-mails **e** pro `scripts/disparo-lancamento.ts`. `scripts/disparo-aviso-modulos.ts` já era seguro (filtra `selecionado=true`). |
| Aba E-mails | Cartão "Aguardando turma", nota no botão, contagem no resultado do disparo. |
| Aba Alunos | Filtro por turma, "Turma 2 · abre 17/08" na linha, turma no detalhe. Cadastro manual ganhou **seletor de turma**: turma aberta = convite na hora; fechada = confirmação com a data (`selecionado=false`). Reenvio de convite explica a espera. |
| `/master/turmas` (nova, admin) | Contagens por turma, edição da data (vazio = liberada, muda o acesso na hora), criação da próxima turma (aviso: inscrições novas passam a cair nela). Auditoria: `turma.alterada`/`turma.criada`. |
| E2E | `e2e/turmas.spec.ts` (espera + primeiro acesso de turma fechada); specs pulam sem a 0023. |

## Runbook do deploy (a ordem importa)

1. **Aplicar a 0023 no SQL Editor** do Supabase (idempotente). Conferir:
   `select * from turmas;` · `select turma, count(*) from inscricoes group
   by 1;` (tudo turma 1) · `select public.turma_atual();` (= 2).
   Se o embed `turmas(...)` falhar logo depois: `notify pgrst, 'reload schema';`
2. `bash scripts/deploy.sh` logo em seguida.
   - Janela de minutos entre 1 e 2 degrada com segurança: código antigo +
     banco novo = inscrição já cai na turma 2 mas ainda ganha convite
     (pior caso: alguém entra cedo). Código novo + banco velho = tudo
     fail-open (comportamento atual).
3. Testar: inscrição pela landing → confirmação com a data → `/primeiro-acesso`
   e `/login` com esses dados redirecionam pra espera → aba E-mails mostra
   "Aguardando turma" e o disparo não envia pra turma 2.

## No dia 17/08

- O acesso abre sozinho à meia-noite (nada a fazer).
- De manhã, clicar **"Liberar inscrições e enviar convites"** na aba
  E-mails (ou rodar `scripts/disparo-lancamento.ts` se o volume pedir) —
  a turma 2 recebe o convite de acesso normal.
- Quem tentar o primeiro acesso antes do clique entra mesmo assim
  (auto-seleção). O disparo pula quem já ativou.
- Conferir devoluções algumas horas depois (botão da aba ou
  `verificarDevolucoes`).

## Conteúdo em conta-gotas (migração 0026 — 17/08)

A turma 2 não recebe o curso inteiro de uma vez: entra com os **3 primeiros
módulos** (Tutorial da plataforma, Apresentação do Curso e Empreendendo com
Legado Cultural), que abrem junto com a turma, às 8h de 17/08. Os outros 12
ficam fechados até alguém liberar.

- **Onde se mexe**: `/master/turmas` → bloco **"Conteúdo liberado"** de cada
  turma. Por módulo: *Liberado*, *Abre em `<data>`* (abre sozinho na hora,
  sem cron, igual à liberação da turma) ou *Fechado*. Um submit salva a turma
  inteira.
- **A chave geral** é a caixa "Liberar o conteúdo aos poucos para esta turma"
  (`turmas.conteudo_restrito`). Desmarcada, a turma volta a ver todo módulo
  publicado — é como a **turma 1** está, e nada nesta migração a toca.
- **Quem esconde é o banco**: o RLS de `modulos`, `disciplinas`, `aulas`,
  `materiais` e `disciplina_chunks` consulta `modulos_liberados_do_aluno()`.
  Vale para o painel, a página da disciplina, a navegação anterior/próxima,
  os materiais e também para o **assistente de IA** — ele não responde sobre
  módulo fechado porque não enxerga os trechos.
- **O aluno vê o card esmaecido** com "Em breve · 24/08 às 8h" quando há data
  marcada; sem data, só "Em breve". Título, instrutor e capa aparecem — o
  conteúdo, não.
- **Progresso**: as porcentagens contam só o que a turma enxerga, então quem
  está com 3 módulos pode chegar a 100% e voltar a subir quando o próximo
  lote abrir.
- **Turma nova nasce fechada**: criar a turma 3 em `/master/turmas` já vem com
  `conteudo_restrito` ligado e nenhum módulo liberado — planeje o lote antes
  de mandar os convites.
- **Módulo novo criado depois** não entra em turma restrita sozinho: ele
  aparece na lista como *Fechado* até ser liberado ali.

## Detalhes que valem saber

- Para **adiar** a liberação: mudar a data em `/master/turmas` — landing,
  e-mails e gates acompanham (landing em até 5 min).
- Para **liberar antes**: limpar a data (vazio = liberada agora).
- O redirect do `/login` revela que aquele e-mail tem inscrição na turma 2
  (só pra quem não ativou) — risco aceito, não expõe matrícula.
- `envios_email.tipo = 'confirmacao_turma'` ≠ `convite_acesso`: é isso que
  garante que o disparo de 17/08 **não pule** quem só recebeu a confirmação.
- Relatórios visão Turma: sem contas ativadas, a turma 2 não aparece nos
  números até 17/08. Depois disso as turmas se misturam — um filtro
  `?turma=` na visão Turma ficou desenhado como fase 2 (cruzar por e-mail
  com `inscricoes.turma`), implementar antes de 17/08 se o Aurélio quiser
  os números separados.
