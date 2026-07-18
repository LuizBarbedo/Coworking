// Formatação do catálogo vivo de cursos pro prompt do moderador IA.
// A montagem (queries) fica em moderacao.ts; aqui é só texto puro testável.

export type CatalogoModulo = {
  titulo: string;
  descricao: string | null;
  disciplinas: {
    titulo: string;
    descricao: string | null;
    aulas: { titulo: string }[];
  }[];
};

const DESCRICAO_MAX = 160;

function resumo(titulo: string, descricao: string | null): string {
  if (!descricao) return titulo;
  const curta =
    descricao.length > DESCRICAO_MAX
      ? `${descricao.slice(0, DESCRICAO_MAX)}…`
      : descricao;
  return `${titulo} — ${curta}`;
}

export function formatarCatalogo(modulos: CatalogoModulo[]): string {
  if (modulos.length === 0) {
    return "Nenhum curso publicado no momento.";
  }
  return modulos
    .map((m) => {
      const linhas = [`MÓDULO: ${resumo(m.titulo, m.descricao)}`];
      for (const d of m.disciplinas) {
        linhas.push(`  DISCIPLINA: ${resumo(d.titulo, d.descricao)}`);
        if (d.aulas.length > 0) {
          linhas.push(`    AULAS: ${d.aulas.map((a) => a.titulo).join("; ")}`);
        }
      }
      return linhas.join("\n");
    })
    .join("\n");
}
