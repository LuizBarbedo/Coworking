// Turmas de alunos (migração 0023): cada inscrição pertence a uma turma e o
// acesso só abre quando a turma está liberada — liberacao_em null ou no
// passado. A liberação é automática por comparação de data (sem cron): em
// 17/08 a turma 2 abre sozinha; o e-mail de convite continua saindo pelo
// botão da aba E-mails.
//
// Tudo aqui é tolerante à migração pendente: sem turma, sem tabela ou com
// dado ilegível, o comportamento é o de antes (liberado). Falhar fechado
// trancaria a turma 1 inteira pra fora por causa de um deploy fora de ordem.

export type Turma = {
  numero: number;
  nome?: string | null;
  liberacao_em: string | null;
};

/** A turma já abriu? (null/ilegível = sim — fail-open deliberado) */
export function turmaLiberada(
  turma: Turma | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!turma || !turma.liberacao_em) return true;
  const liberacao = new Date(turma.liberacao_em);
  if (Number.isNaN(liberacao.getTime())) return true;
  return liberacao.getTime() <= agora.getTime();
}

/** Números das turmas já abertas. */
export function numerosLiberados(
  turmas: Turma[],
  agora: Date = new Date(),
): Set<number> {
  return new Set(turmas.filter((t) => turmaLiberada(t, agora)).map((t) => t.numero));
}

/** "17/08/2026" (Brasília) — vazio se a turma não tem data (já liberada). */
export function dataLiberacaoFormatada(turma: Turma): string {
  if (!turma.liberacao_em) return "";
  const data = new Date(turma.liberacao_em);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

/**
 * Separa inscrições entre quem já pode entrar e quem espera a turma abrir.
 * Sem a lista de turmas (migração pendente), turma ausente ou desconhecida:
 * a inscrição passa como liberada.
 */
export function filtrarPorTurmaLiberada<T extends { turma?: number | null }>(
  inscricoes: T[],
  turmas: Turma[],
  agora: Date = new Date(),
): { liberadas: T[]; aguardando: T[] } {
  if (turmas.length === 0) return { liberadas: [...inscricoes], aguardando: [] };

  const porNumero = new Map(turmas.map((t) => [t.numero, t]));
  const liberadas: T[] = [];
  const aguardando: T[] = [];
  for (const inscricao of inscricoes) {
    const turma = inscricao.turma == null ? null : porNumero.get(inscricao.turma);
    (turmaLiberada(turma, agora) ? liberadas : aguardando).push(inscricao);
  }
  return { liberadas, aguardando };
}
