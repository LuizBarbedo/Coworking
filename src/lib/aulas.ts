/** Regras de exibição da lista de aulas de uma disciplina. */

type AulaAbrivel = { id: string; jaAssistida: boolean };

/**
 * Qual aula já vem aberta ao entrar na disciplina.
 *
 * A maioria das disciplinas tem uma aula só: deixar o vídeo fechado atrás de
 * um botão é um clique sem escolha nenhuma. Nas disciplinas com várias aulas,
 * abrir todas montaria uma dúzia de players de uma vez — então abre a próxima
 * que o aluno ainda não assistiu, que é também o "continue de onde parou".
 *
 * `pedida` vem da URL (?aula=...) e ganha de tudo, para o link que um monitor
 * manda apontar exatamente para a aula que ele citou.
 */
export function aulaInicial(
  aulas: AulaAbrivel[],
  pedida?: string | null,
): string | null {
  if (aulas.length === 0) return null;
  if (pedida && aulas.some((a) => a.id === pedida)) return pedida;
  return (aulas.find((a) => !a.jaAssistida) ?? aulas[0]).id;
}
