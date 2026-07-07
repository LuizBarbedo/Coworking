-- Migração 0006 — Conteúdo de demonstração (seed) para testar o fluxo do aluno
-- Execute no SQL Editor do Supabase APÓS 0005_disciplinas.sql.
--
-- Cria 1 módulo publicado → 3 disciplinas → aulas (sem vídeo ainda), materiais
-- e um quiz por disciplina, para exercitar as telas do aluno sem depender do
-- Cloudflare nem da UI do master.
--
-- IDEMPOTÊNCIA: as tabelas-filhas (aulas, materiais, quiz_perguntas,
-- quiz_alternativas) não têm chave natural, então uma reexecução duplicaria
-- linhas. Por isso o bloco inteiro só roda se o módulo 'fundamentos' ainda não
-- existir. Para re-semear do zero: delete from public.modulos where slug='fundamentos';
-- (o ON DELETE CASCADE limpa disciplinas/aulas/materiais/quizzes juntos).

do $$
declare
  v_mod  uuid;
  v_disc uuid;
  v_quiz uuid;
  v_p    uuid;
begin
  if exists (select 1 from public.modulos where slug = 'fundamentos') then
    raise notice 'Seed já aplicado (módulo fundamentos existe). Nada a fazer.';
    return;
  end if;

  -- Módulo
  insert into public.modulos (slug, titulo, descricao, instrutor, ordem, publicado)
  values (
    'fundamentos',
    'Fundamentos do Coworking Social',
    'Conceitos essenciais do Coworking Social de Mudanças Globais: propósito, atuação em rede e primeiros passos como agente de mudança.',
    'Equipe CSMG',
    1,
    true
  )
  returning id into v_mod;

  -- ── Disciplina 1 ──────────────────────────────────────────────────────────
  insert into public.disciplinas (modulo_id, slug, titulo, descricao, ordem, publicado)
  values (v_mod, 'introducao', 'Introdução ao Coworking Social',
          'O que é, por que existe e como você participa.', 1, true)
  returning id into v_disc;

  insert into public.aulas (disciplina_id, titulo, descricao, provider, video_uid, duracao_seg, ordem)
  values
    (v_disc, 'Boas-vindas',        'Apresentação da jornada de formação.', 'cloudflare', null, 480, 1),
    (v_disc, 'O que é o CSMG',      'História, missão e valores.',          'cloudflare', null, 720, 2);

  insert into public.materiais (disciplina_id, titulo, tipo, url, ordem)
  values (v_disc, 'Apostila — Introdução', 'pdf',
          'https://www.gov.br/pt-br/servicos/servicos-em-destaque/arquivos/exemplo.pdf', 1);

  insert into public.quizzes (disciplina_id, titulo, nota_minima)
  values (v_disc, 'Avaliação — Introdução', 70)
  returning id into v_quiz;

  insert into public.quiz_perguntas (quiz_id, enunciado, ordem)
  values (v_quiz, 'O que significa a sigla CSMG?', 1)
  returning id into v_p;
  insert into public.quiz_alternativas (pergunta_id, texto, correta, ordem) values
    (v_p, 'Coworking Social de Mudanças Globais', true, 1),
    (v_p, 'Centro de Serviços Municipais Gerais', false, 2),
    (v_p, 'Comitê Social de Mobilização Geral', false, 3);

  insert into public.quiz_perguntas (quiz_id, enunciado, ordem)
  values (v_quiz, 'O Coworking Social atua principalmente por meio de:', 2)
  returning id into v_p;
  insert into public.quiz_alternativas (pergunta_id, texto, correta, ordem) values
    (v_p, 'Atuação em rede e colaboração', true, 1),
    (v_p, 'Trabalho isolado e individual', false, 2),
    (v_p, 'Somente doações financeiras', false, 3);

  -- ── Disciplina 2 ──────────────────────────────────────────────────────────
  insert into public.disciplinas (modulo_id, slug, titulo, descricao, ordem, publicado)
  values (v_mod, 'atuacao-em-rede', 'Atuação em Rede',
          'Como colaborar e multiplicar impacto em conjunto.', 2, true)
  returning id into v_disc;

  insert into public.aulas (disciplina_id, titulo, descricao, provider, video_uid, duracao_seg, ordem)
  values (v_disc, 'Trabalhando em rede', 'Princípios da colaboração em rede.', 'cloudflare', null, 900, 1);

  insert into public.materiais (disciplina_id, titulo, tipo, url, ordem)
  values (v_disc, 'Guia — Atuação em Rede', 'pdf',
          'https://www.gov.br/pt-br/servicos/servicos-em-destaque/arquivos/exemplo.pdf', 1);

  insert into public.quizzes (disciplina_id, titulo, nota_minima)
  values (v_disc, 'Avaliação — Atuação em Rede', 70)
  returning id into v_quiz;

  insert into public.quiz_perguntas (quiz_id, enunciado, ordem)
  values (v_quiz, 'Atuar em rede significa:', 1)
  returning id into v_p;
  insert into public.quiz_alternativas (pergunta_id, texto, correta, ordem) values
    (v_p, 'Somar esforços com outros agentes', true, 1),
    (v_p, 'Competir por recursos', false, 2);

  -- ── Disciplina 3 ──────────────────────────────────────────────────────────
  insert into public.disciplinas (modulo_id, slug, titulo, descricao, ordem, publicado)
  values (v_mod, 'primeiros-passos', 'Primeiros Passos',
          'Da inscrição à sua primeira ação como agente de mudança.', 3, true)
  returning id into v_disc;

  insert into public.aulas (disciplina_id, titulo, descricao, provider, video_uid, duracao_seg, ordem)
  values (v_disc, 'Sua primeira ação', 'Colocando o aprendizado em prática.', 'cloudflare', null, 660, 1);

  insert into public.quizzes (disciplina_id, titulo, nota_minima)
  values (v_disc, 'Avaliação — Primeiros Passos', 70)
  returning id into v_quiz;

  insert into public.quiz_perguntas (quiz_id, enunciado, ordem)
  values (v_quiz, 'O primeiro passo como agente de mudança é:', 1)
  returning id into v_p;
  insert into public.quiz_alternativas (pergunta_id, texto, correta, ordem) values
    (v_p, 'Identificar uma necessidade da comunidade', true, 1),
    (v_p, 'Esperar instruções externas', false, 2);

  raise notice 'Seed de demonstração aplicado: módulo fundamentos com 3 disciplinas.';
end $$;
