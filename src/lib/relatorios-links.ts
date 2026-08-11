// Helpers puros dos relatórios: resolvem o ?turma= da URL e montam links
// preservando os filtros ativos (dias/turma/visão). Sem server-only de
// propósito — segue o padrão de urls.ts pra ser testável sem mock.
import type { Turma } from "@/lib/turmas";

/** Resolve o ?turma= da URL: inteiro positivo ou null (padrão "todas"). */
export function resolverTurma(valor: string | undefined): number | null {
  if (!valor || !/^\d+$/.test(valor)) return null;
  const numero = Number.parseInt(valor, 10);
  return numero > 0 ? numero : null;
}

/** Valida a turma da URL contra a lista real (fail-open: lista vazia → null). */
export function turmaValida(turma: number | null, turmas: Turma[]): number | null {
  if (turma === null) return null;
  return turmas.some((t) => t.numero === turma) ? turma : null;
}

/** Opção "Todas" + uma por turma, pro grupo de pílulas do filtro. */
export function opcoesDeTurma(
  turmas: Turma[],
): { valor: number | null; rotulo: string }[] {
  if (turmas.length === 0) return [];
  return [
    { valor: null, rotulo: "Todas" },
    ...turmas.map((t) => ({
      valor: t.numero as number | null,
      rotulo: t.nome ?? `Turma ${t.numero}`,
    })),
  ];
}

/** Nome da turma no recorte ativo — null quando são todas. */
export function nomeDaTurma(turma: number | null, turmas: Turma[]): string | null {
  if (turma === null) return null;
  return turmas.find((t) => t.numero === turma)?.nome ?? `Turma ${turma}`;
}

/**
 * Monta o link de relatório/exportação preservando os filtros. Omite os
 * padrões (turma null, visão "inscricoes") pra manter as URLs atuais limpas.
 */
export function linkRelatorio(
  basePath: string,
  params: {
    dias?: number;
    turma?: number | null;
    visao?: "inscricoes" | "turma";
    tipo?: "origens" | "serie";
  },
): string {
  const query = new URLSearchParams();
  if (params.tipo) query.set("tipo", params.tipo);
  if (params.visao && params.visao !== "inscricoes") query.set("visao", params.visao);
  if (params.dias !== undefined) query.set("dias", String(params.dias));
  if (params.turma != null) query.set("turma", String(params.turma));
  const texto = query.toString();
  return texto ? `${basePath}?${texto}` : basePath;
}
