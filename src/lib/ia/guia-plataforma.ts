// Guia de navegação injetado no prompt do assistente: os lugares da
// plataforma com links em markdown (caminhos internos) e o catálogo de
// módulos/disciplinas publicados do aluno. Lógica pura — quem busca os
// módulos é a rota do chat (cliente SSR, RLS aplica).

export type ModuloGuia = {
  slug: string;
  titulo: string;
  disciplinas: { slug: string; titulo: string }[];
};

export function montarGuiaPlataforma(modulos: ModuloGuia[]): string {
  const linhas = [
    "LUGARES DA PLATAFORMA (use estes links em markdown ao orientar o aluno):",
    "- [Meus módulos](/painel) — página inicial, com todos os módulos e o progresso geral.",
    "- [Fórum de dúvidas](/forum) — perguntas, enquetes e ajuda entre colegas; publicações passam por moderação.",
    "- [Meu perfil](/perfil) — foto, bio e os números de participação.",
    "- Dentro de cada disciplina há abas: Aulas (vídeos, com o botão “Marcar como assistida”), Materiais (e-books pra baixar), Avaliação final (quiz que pode ser refeito; a aprovação conta no progresso) e Tirar dúvidas (assistente de IA da disciplina).",
    "- No topo: o ícone “?” refaz o tour guiado; sol/lua troca o tema; “Sair” encerra a sessão.",
    "",
    "MÓDULOS E DISCIPLINAS DISPONÍVEIS AGORA (links diretos):",
  ];

  if (modulos.length === 0) {
    linhas.push("- (nenhum módulo publicado no momento)");
  }
  for (const m of modulos) {
    for (const d of m.disciplinas) {
      linhas.push(`- [${d.titulo}](/modulos/${m.slug}/${d.slug}) — módulo ${m.titulo}`);
    }
  }
  return linhas.join("\n");
}
