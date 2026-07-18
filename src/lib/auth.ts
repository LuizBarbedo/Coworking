import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  lerSessaoEquipe,
  podeVerComoAluno,
  temPermissao,
  type Permissao,
  type SessaoEquipe,
} from "@/lib/permissoes";

/**
 * Retorna o usuário autenticado (ou null). Memoizado por render para evitar
 * múltiplas idas ao Supabase no mesmo ciclo de renderização.
 */
export const getAluno = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Garante login; caso contrário redireciona para /login. Use nas páginas do AVA. */
export async function exigirAluno() {
  const user = await getAluno();
  if (!user) redirect("/login");
  return user;
}

/**
 * Papel do usuário, guardado em app_metadata (só o service_role escreve; não é
 * editável pelo usuário e já vem no JWT). 'master' = quem cadastra conteúdo.
 */
export async function getPapel(): Promise<string | null> {
  const user = await getAluno();
  const role = (user?.app_metadata as { role?: string } | undefined)?.role;
  return role ?? null;
}

/**
 * Garante que o usuário é master; senão manda para /login (sem sessão) ou
 * /painel (logado, mas sem permissão). Guard das rotas de autoria (futuras).
 */
export async function exigirMaster() {
  const user = await getAluno();
  if (!user) redirect("/login");
  const role = (user.app_metadata as { role?: string } | undefined)?.role;
  if (role !== "master") redirect("/painel");
  return user;
}

/**
 * Sessão de equipe do usuário logado (admin/monitor + permissões), ou null
 * pra aluno comum. Memoizada por render, como getAluno.
 */
export const getSessaoEquipe = cache(
  async (): Promise<SessaoEquipe | null> => {
    const user = await getAluno();
    return lerSessaoEquipe(user?.app_metadata);
  },
);

/**
 * Garante acesso ao CONTEÚDO do curso como aluno: aluno comum e admin
 * passam; monitor precisa de visao_aluno. As áreas de comunidade (fórum,
 * perfil) não usam este guard — equipe navega nelas sem a permissão.
 */
export async function exigirVisaoAluno() {
  const user = await exigirAluno();
  const sessao = await getSessaoEquipe();
  if (!podeVerComoAluno(sessao)) redirect("/master");
  return user;
}

/** Garante membro da equipe COM a permissão; senão volta pro hub. */
export async function exigirPermissao(permissao: Permissao) {
  const user = await exigirMaster();
  const sessao = await getSessaoEquipe();
  if (!temPermissao(sessao, permissao)) redirect("/master");
  return user;
}

/** Garante nível admin (gestão de equipe); monitor volta pro hub. */
export async function exigirAdmin() {
  const user = await exigirMaster();
  const sessao = await getSessaoEquipe();
  if (sessao?.nivel !== "admin") redirect("/master");
  return user;
}
