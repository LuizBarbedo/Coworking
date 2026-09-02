@AGENTS.md

<!-- ==========================================================================
     NOTA LOCAL — NÃO COMMITAR (fora dos PRs)
     ========================================================================== -->

## Estado atual (2026-08-05 noite — PRODUÇÃO MIGROU pro Supabase self-hosted da VPS)

- MIGRAÇÃO EXECUTADA 05/08 (decisão do Marcus): produção agora é o stack
  self-hosted em /opt/coworking-supabase (11 containers, segredos próprios,
  portas só em localhost; API pública via rota nginx
  app.coworkingsocial.com.br/supabase → Kong). Nuvem = SÓ redundância
  (espelho diário 04:00, scripts/redundancia-nuvem.sh). Motivo: REST do
  free tier levava 0,7–1,3s/chamada; local ~10ms. 78 contas migradas COM
  hashes (ninguém redefiniu senha); E2E completos verdes pós-virada (24).
  Doc/runbook: docs/migracao-banco-vps.md (rollback em minutos:
  .env.local.antes-da-virada + deploy). Homologação: stack do CLI
  (supabase start; docs/homologacao.md) — migração nova TESTA lá antes
  (supabase db reset) e aplica com psql na DATABASE_URL (pooler local).
  Backup diário 03:30 + vigia 5min + espelho 04:00 no cron do root
  (docs/backups-e-monitoramento.md) — espelho validado (295 inscrições +
  50 arquivos na nuvem). GRANTs a anon/authenticated NÃO estão
  nas migrações — vieram no dump com ACL; migração nova que crie tabela
  precisa dos grants explícitos.
- PÓS-MIGRAÇÃO validado: 219 unit + 24 E2E verdes contra a produção nova;
  containers saudáveis, logs limpos. Documento Técnico-Funcional v1.1
  regenerado e commitado (fonte scripts/guia/tecnico.html → PDF em docs/;
  regerar: node scripts/guia/gerar-pdf.mjs tecnico.html <saida.pdf>).
  Riscos: R-01/R-03 tratados, R-04/R-05/R-13 mitigados.
- RISCOS EM ABERTO (avaliação 05/08): ÚNICO urgente = R-12
  (entregabilidade; convites da turma 2 saem 17/08 pelo Gmail → spam).
  Destrava com o Marcus: conta Resend + SPF/DKIM no registro.br + API key
  (transporte já abstraído em lib/, implemento na hora; plano B = WhatsApp
  + AvisoSpam). Três itens de minutos, sem data: rotacionar senha do
  Postgres da NUVEM (passou pelo chat e o espelho tem TODOS os dados),
  ativar snapshot da VPS na Hostinger, UptimeRobot externo no /login.
  R-06 (root) subiu de relevância (app e banco na mesma máquina) — janela
  calma. Governança/LGPD (R-09/R-10/R-11): processo, não código; ofereci
  redigir minutas (procedimento de titular + política de retenção; R-10
  tem expurgo automático pra eu implementar depois que a coordenação
  definir prazos). Obs: edital aceita 15-65 anos → possíveis menores na
  base (art. 14 LGPD).

## Estado anterior (2026-08-05 — turmas NO AR: 0023 aplicada + deploy feito)

- TURMAS (05/08, pedido do Aurélio): turma 1 = inscritos até 05/08 (acesso
  total, intocado); turma 2 = inscrições novas, BLOQUEADAS até 17/08 (caem
  em /aguardando-liberacao; liberação automática por data, SEM cron; convite
  sai pelo botão da aba E-mails no dia). Doc completa em
  docs/adaptacoes-para-a-turma-2.md (runbook do dia 17/08).
  FEITO 05/08: migração 0023 aplicada via psql (295 inscrições na turma 1,
  turma_atual()=2, liberação 17/08 00:00 Brasília) e deploy ok (health 200).
  Migrações agora dão pra aplicar daqui: `DATABASE_URL` no .env.local
  (psql direto no Postgres do Supabase; senha URL-encoded).
  Gestão: /master/turmas (admin) edita a data.
  Fase 2 FEITA e no ar (08a0a75): filtro ?turma= na visão Turma dos
  relatórios (pílulas; recorte cruza conta ↔ inscrição por e-mail;
  fail-open pré-0023). E2E completos rodados contra produção: verdes
  (equipe.spec estava desatualizado desde a separação da aba Alunos —
  corrigido). Cast de select condicional do supabase-js: fixar a forma
  base, como na aba Alunos — senão o build quebra.

## Estado anterior (2026-07-21 — pós-lançamento de 20/07)

- Produção roda NESTA VPS (`coworking.service`); deploy = `bash
  scripts/deploy.sh` (atômico: builda em .next-nova com produção no ar e
  troca com o serviço parado ~2s; health check no fim). NUNCA `npm run
  build` direto com o serviço servindo o mesmo .next — já causou página sem
  estilo pra usuário real e derrubou produção com build quebrado.
- Marcus é colaborador do upstream: trabalho vai DIRETO na main
  (branch → rebase em upstream/main → merge ff → push upstream e origin).
  Sem PRs. Commits atômicos + testes verdes antes de cada push continuam.
- LANÇAMENTO EXECUTADO 20/07: 192 convites enviados (0 falhas) via
  scripts/disparo-lancamento.ts; 2 typos de e-mail (Sara e Synthia)
  aguardam confirmação por WhatsApp. ATENÇÃO entregabilidade: remetente é
  Gmail pessoal sem domínio próprio → convites caindo no SPAM; migração
  pra Resend decidida pra semana de 27/07 (DNS no registro.br). Mitigação:
  equipe avisando por WhatsApp + AvisoSpam nas telas.
- Migrations: aplicadas até a 0021; a 0022 (feedback de disciplina) foi
  criada — VERIFICAR se está aplicada (sem ela o card não aparece,
  tolerante). Lote de conteúdo de 23/07 (disciplinas 9–10) ainda a
  publicar; capas via scripts/modal/gerar_capas.py (token em ~/.modal.toml).
- Link dos alunos: https://app.coworkingsocial.com.br (raiz → /login).
  URLs internas SEMPRE via lib/urls.urlDaPlataforma() — nunca
  NEXT_PUBLIC_SITE_URL, que é a landing e tem portão de lançamento.
- `next.config.ts` tem `allowedDevOrigins` LOCAL — não commitar (nem este
  bloco do CLAUDE.md).
- E2E rodam contra a porta 3000 (produção): buildar antes. Specs pulam
  sozinhos quando falta dependência (seed demo, migração).
- A memória persistente tem o estado completo do lançamento
  (conteudo-curso.md): equipe de monitores cadastrada, entregabilidade,
  bounces, decisões do Marcus.
