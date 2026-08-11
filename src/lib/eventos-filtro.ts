// Filtro de "contas removidas" da trilha de auditoria (/master/eventos).
//
// Por que existe: a suíte E2E cria contas efêmeras, age com elas (login,
// post no fórum, moderação) e as apaga no teardown. Os eventos ficam, mas
// o ator some — a tela mostrava dezenas de linhas "conta removida" que não
// são atividade real da plataforma.
//
// O filtro é DELIBERADAMENTE visível e reversível: um aluno que exercer o
// direito de exclusão (LGPD art. 18) também vira ator removido, e nesse
// caso a trilha precisa continuar acessível. Por isso a tela sempre informa
// quantos eventos estão escondidos e oferece o link pra mostrá-los.
//
// Limite conhecido: a lista de atores removidos cresce a cada rodada de E2E
// contra produção. A cura de raiz é apontar os E2E pra homologação.

/**
 * Ids de atores que aparecem nos eventos mas não têm mais conta.
 * Eventos do sistema (ator nulo) não contam. O resultado é deduplicado e
 * mantém a ordem de primeira aparição.
 */
export function atoresRemovidos(
  atoresDosEventos: (string | null)[],
  idsComConta: Set<string>,
): string[] {
  const removidos: string[] = [];
  const vistos = new Set<string>();
  for (const ator of atoresDosEventos) {
    if (!ator || idsComConta.has(ator) || vistos.has(ator)) continue;
    vistos.add(ator);
    removidos.push(ator);
  }
  return removidos;
}

/** Resolve o ?removidos= da URL. Padrão: esconder. */
export function resolverMostrarRemovidos(valor: string | undefined): boolean {
  return valor === "1";
}
