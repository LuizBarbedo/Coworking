// Navegação sequencial do curso: dado o currículo publicado (módulos e
// disciplinas já na ordem do aluno), resolve a disciplina anterior e a
// próxima a partir da atual — cruzando a fronteira entre módulos.
// Lógica pura; quem busca os dados (via cliente SSR, RLS aplicado) é a página.

export type ModuloComDisciplinas = {
  slug: string;
  titulo: string;
  disciplinas: { slug: string; titulo: string }[];
};

export type Vizinha = {
  href: string;
  titulo: string;
  /** Título do módulo, presente só quando a vizinha pertence a OUTRO módulo. */
  modulo?: string;
};

export function vizinhasDe(
  modulos: ModuloComDisciplinas[],
  moduloSlug: string,
  disciplinaSlug: string,
): { anterior: Vizinha | null; proxima: Vizinha | null } {
  // Achata o currículo na ordem de leitura do aluno.
  const trilha = modulos.flatMap((m) =>
    m.disciplinas.map((d) => ({
      href: `/modulos/${m.slug}/${d.slug}`,
      titulo: d.titulo,
      moduloSlug: m.slug,
      moduloTitulo: m.titulo,
    })),
  );

  const i = trilha.findIndex(
    (d) => d.moduloSlug === moduloSlug && d.href.endsWith(`/${disciplinaSlug}`),
  );
  if (i < 0) return { anterior: null, proxima: null };

  const converter = (
    alvo: (typeof trilha)[number] | undefined,
  ): Vizinha | null =>
    alvo
      ? {
          href: alvo.href,
          titulo: alvo.titulo,
          ...(alvo.moduloSlug !== moduloSlug
            ? { modulo: alvo.moduloTitulo }
            : {}),
        }
      : null;

  return {
    anterior: converter(trilha[i - 1]),
    proxima: converter(trilha[i + 1]),
  };
}
