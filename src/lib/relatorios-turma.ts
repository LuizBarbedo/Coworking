// Agregações do relatório "Turma" (desempenho e avanço dos alunos).
// Lógica pura — quem busca os dados é o componente do relatório. Volumes
// pequenos (centenas de alunos × dezenas de aulas): agregar em memória.

export type DadosTurma = {
  alunos: { id: string; nome: string; email: string }[];
  disciplinas: {
    id: string;
    titulo: string;
    modulo: string;
    ordem: number;
    aulas: string[];
    quizId: string | null;
  }[];
  progresso: { aluno_id: string; aula_id: string }[];
  tentativas: {
    aluno_id: string;
    quiz_id: string;
    nota: number;
    aprovado: boolean;
  }[];
  /** iso da última sessao.login por aluno (da trilha de auditoria). */
  ultimoLoginPorAluno: Record<string, string>;
  participacoesForum: { autor_id: string }[];
};

const pct = (parte: number, todo: number) =>
  todo === 0 ? 0 : Math.round((parte / todo) * 100);

/** Melhor tentativa de cada aluno em cada quiz (nota mais alta). */
function melhoresTentativas(dados: DadosTurma) {
  const melhor = new Map<string, { nota: number; aprovado: boolean }>();
  for (const t of dados.tentativas) {
    const chave = `${t.aluno_id}:${t.quiz_id}`;
    const atual = melhor.get(chave);
    if (!atual || t.nota > atual.nota) {
      melhor.set(chave, { nota: t.nota, aprovado: t.aprovado });
    }
  }
  return melhor;
}

function aulasVistasPorAluno(dados: DadosTurma) {
  const vistas = new Map<string, Set<string>>();
  for (const p of dados.progresso) {
    if (!vistas.has(p.aluno_id)) vistas.set(p.aluno_id, new Set());
    vistas.get(p.aluno_id)!.add(p.aula_id);
  }
  return vistas;
}

export function resumoGeral(dados: DadosTurma) {
  const totalAulas = dados.disciplinas.reduce(
    (acc, d) => acc + d.aulas.length,
    0,
  );
  const vistas = aulasVistasPorAluno(dados);
  const avancoPorAluno = dados.alunos.map((a) =>
    pct(vistas.get(a.id)?.size ?? 0, totalAulas),
  );
  const melhor = melhoresTentativas(dados);
  const resultados = [...melhor.values()];

  return {
    totalAlunos: dados.alunos.length,
    aulasAssistidas: dados.progresso.length,
    avancoMedioPct:
      avancoPorAluno.length === 0
        ? 0
        : Math.round(
            avancoPorAluno.reduce((a, b) => a + b, 0) / avancoPorAluno.length,
          ),
    aprovacaoPct: pct(
      resultados.filter((r) => r.aprovado).length,
      resultados.length,
    ),
  };
}

export function avancoPorDisciplina(dados: DadosTurma) {
  const vistas = aulasVistasPorAluno(dados);
  const melhor = melhoresTentativas(dados);

  return [...dados.disciplinas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((d) => {
      let comecaram = 0;
      let concluiram = 0;
      for (const aluno of dados.alunos) {
        const doAluno = vistas.get(aluno.id);
        const nAulas = d.aulas.filter((a) => doAluno?.has(a)).length;
        if (nAulas > 0) comecaram++;
        if (d.aulas.length > 0 && nAulas === d.aulas.length) concluiram++;
      }
      const notas = d.quizId
        ? dados.alunos
            .map((a) => melhor.get(`${a.id}:${d.quizId}`))
            .filter((r): r is { nota: number; aprovado: boolean } => Boolean(r))
        : [];
      return {
        id: d.id,
        disciplina: d.titulo,
        modulo: d.modulo,
        quizId: d.quizId,
        comecaramPct: pct(comecaram, dados.alunos.length),
        concluiramPct: pct(concluiram, dados.alunos.length),
        tentaram: notas.length,
        aprovadas: notas.filter((n) => n.aprovado).length,
        notaMedia:
          notas.length === 0
            ? null
            : Math.round(notas.reduce((a, n) => a + n.nota, 0) / notas.length),
      };
    });
}

export type AvaliacaoDisciplina = {
  disciplina_id: string;
  estrelas: number;
  comentario: string | null;
};

/** Média de estrelas e total de avaliações por disciplina (feedback anônimo). */
export function resumoFeedback(avaliacoes: AvaliacaoDisciplina[]) {
  const soma = new Map<string, { total: number; estrelas: number }>();
  for (const a of avaliacoes) {
    const atual = soma.get(a.disciplina_id) ?? { total: 0, estrelas: 0 };
    atual.total += 1;
    atual.estrelas += a.estrelas;
    soma.set(a.disciplina_id, atual);
  }
  const saida = new Map<string, { media: number; total: number }>();
  for (const [id, s] of soma) {
    saida.set(id, {
      media: Math.round((s.estrelas / s.total) * 10) / 10,
      total: s.total,
    });
  }
  return saida;
}

export function linhasDosAlunos(dados: DadosTurma) {
  const vistas = aulasVistasPorAluno(dados);
  const melhor = melhoresTentativas(dados);
  const forum = new Map<string, number>();
  for (const p of dados.participacoesForum) {
    forum.set(p.autor_id, (forum.get(p.autor_id) ?? 0) + 1);
  }
  const totalAulas = dados.disciplinas.reduce(
    (acc, d) => acc + d.aulas.length,
    0,
  );

  return dados.alunos
    .map((a) => {
      const resultados = dados.disciplinas
        .filter((d) => d.quizId)
        .map((d) => melhor.get(`${a.id}:${d.quizId}`))
        .filter((r): r is { nota: number; aprovado: boolean } => Boolean(r));
      return {
        id: a.id,
        nome: a.nome,
        email: a.email,
        aulasVistas: vistas.get(a.id)?.size ?? 0,
        totalAulas,
        quizzesAprovados: resultados.filter((r) => r.aprovado).length,
        notaMedia:
          resultados.length === 0
            ? null
            : Math.round(
                resultados.reduce((acc, r) => acc + r.nota, 0) /
                  resultados.length,
              ),
        participacoesForum: forum.get(a.id) ?? 0,
        ultimoLogin: dados.ultimoLoginPorAluno[a.id] ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.aulasVistas - a.aulasVistas ||
        b.quizzesAprovados - a.quizzesAprovados ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}
