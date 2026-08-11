// Frase do recorte ativo na barra de filtros dos relatórios. Existe pra que
// o master saiba de cara o que está olhando: as pílulas sozinhas exigem
// varrer três linhas pra montar a mesma conclusão na cabeça.

export function resumoDoRecorte({
  nomeDaTurma,
  dias,
}: {
  /** Nome da turma no recorte, ou null pra "todas". */
  nomeDaTurma: string | null;
  /** Janela em dias, ou null quando a visão não tem período. */
  dias: number | null;
}): string {
  const partes = [nomeDaTurma ?? "todas as turmas"];
  if (dias !== null) partes.push(`últimos ${dias} dias`);
  return partes.join(" · ");
}
