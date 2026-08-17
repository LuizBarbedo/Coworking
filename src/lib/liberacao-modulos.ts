// Liberação de módulos por turma (migração 0026). Uma turma pode receber o
// conteúdo aos poucos: `turmas.conteudo_restrito` liga o recorte e a tabela
// `turma_modulos` diz QUANDO cada módulo abre para ela (liberacao_em no
// passado = aberto; no futuro = agenda; sem linha = fechado).
//
// Quem decide de verdade é o banco — o RLS de módulos/disciplinas/aulas/
// materiais/chunks consulta `modulos_liberados_do_aluno()`. Este módulo é a
// mesma regra em TypeScript, para a tela do master (planejar) e para o painel
// do aluno (anunciar "Em breve · 24/08 às 8h" sem expor o conteúdo).
//
// Fail-open deliberado no eixo da turma: turma sem restrição enxerga tudo —
// é o caso da turma 1, que não pode ser afetada por nada disto. Fail-closed no
// eixo do módulo: data ausente ou ilegível mantém o módulo fechado.

export type EstadoModuloTurma = "liberado" | "agendado" | "bloqueado";

/** Linha crua de turma_modulos, como vem do Supabase. */
export type LinhaPlano = { modulo_id: string; liberacao_em: string | null };

/** Estado de um módulo no plano de uma turma restrita. */
export function estadoDoModulo(
  liberacaoEm: string | null | undefined,
  agora: Date = new Date(),
): EstadoModuloTurma {
  if (!liberacaoEm) return "bloqueado";
  const data = new Date(liberacaoEm);
  if (Number.isNaN(data.getTime())) return "bloqueado";
  return data.getTime() <= agora.getTime() ? "liberado" : "agendado";
}

/** O aluno desta turma já pode entrar no módulo? */
export function moduloLiberadoParaTurma(
  conteudoRestrito: boolean,
  liberacaoEm: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!conteudoRestrito) return true;
  return estadoDoModulo(liberacaoEm, agora) === "liberado";
}

/** "2026-08-24T11:00:00Z" → "24/08 às 8h" (Brasília); null se não houver data. */
export function formatarQuandoLibera(
  liberacaoEm: string | null | undefined,
): string | null {
  if (!liberacaoEm) return null;
  const data = new Date(liberacaoEm);
  if (Number.isNaN(data.getTime())) return null;
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(data);
  // "08:00" vira "8h"; "08:30" vira "8h30".
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(data)
    .replace(":00", "h")
    .replace(":", "h");
  return `${dia} às ${hora}`;
}

/** Plano da turma indexado por módulo (valor = liberacao_em, pode ser null). */
export function planoPorModulo(
  linhas: LinhaPlano[] | null | undefined,
): Map<string, string | null> {
  return new Map((linhas ?? []).map((l) => [l.modulo_id, l.liberacao_em]));
}
