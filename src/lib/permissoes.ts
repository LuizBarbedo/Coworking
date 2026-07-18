// Níveis e permissões da equipe (papel "master" no app_metadata, que só o
// service_role escreve e vem assinado no JWT). Admin = tudo; monitor = só o
// que um admin concedeu. Lógica pura, usada no servidor (auth.ts) e na UI
// da aba Equipe.

export const PERMISSOES = [
  "visao_aluno",
  "moderar_forum",
  "editar_conteudo",
  "ver_relatorios",
] as const;

export type Permissao = (typeof PERMISSOES)[number];

export type NivelEquipe = "admin" | "monitor";

export type SessaoEquipe = {
  nivel: NivelEquipe;
  permissoes: Permissao[];
};

export const ROTULOS_PERMISSOES: Record<Permissao, string> = {
  visao_aluno: "Visão de aluno",
  moderar_forum: "Moderação do fórum",
  editar_conteudo: "Edição de conteúdo",
  ver_relatorios: "Ver relatórios",
};

function ehPermissao(valor: unknown): valor is Permissao {
  return (
    typeof valor === "string" && (PERMISSOES as readonly string[]).includes(valor)
  );
}

/**
 * Interpreta o app_metadata do usuário. Não-master = null (aluno comum).
 * Nível ausente = admin: as contas master criadas antes dos níveis
 * continuam com acesso total sem mexer no banco.
 */
export function lerSessaoEquipe(appMetadata: unknown): SessaoEquipe | null {
  if (typeof appMetadata !== "object" || appMetadata === null) return null;
  const meta = appMetadata as Record<string, unknown>;
  if (meta.role !== "master") return null;

  const nivel: NivelEquipe = meta.nivel === "monitor" ? "monitor" : "admin";
  const permissoes = Array.isArray(meta.permissoes)
    ? meta.permissoes.filter(ehPermissao)
    : [];
  return { nivel, permissoes };
}

/** Admin tem tudo; monitor só o concedido; quem não é equipe, nada. */
export function temPermissao(
  sessao: SessaoEquipe | null,
  permissao: Permissao,
): boolean {
  if (!sessao) return false;
  if (sessao.nivel === "admin") return true;
  return sessao.permissoes.includes(permissao);
}

/** Aluno comum sempre navega como aluno; equipe precisa de visao_aluno. */
export function podeVerComoAluno(sessao: SessaoEquipe | null): boolean {
  if (!sessao) return true;
  return temPermissao(sessao, "visao_aluno");
}

/** Rotas do hub em ordem de prioridade — permissão que libera cada aba. */
const ROTAS_HUB: Array<[Permissao, string]> = [
  ["editar_conteudo", "/master"],
  ["ver_relatorios", "/master/relatorios"],
  ["moderar_forum", "/master/forum"],
];

/**
 * Primeira aba do hub que a sessão pode ver, ou null se nenhuma (ex.:
 * monitor só com visao_aluno) — quem chama decide o destino.
 */
export function primeiraRotaPermitida(sessao: SessaoEquipe): string | null {
  for (const [permissao, rota] of ROTAS_HUB) {
    if (temPermissao(sessao, permissao)) return rota;
  }
  return null;
}
