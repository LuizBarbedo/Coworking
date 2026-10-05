// URL base da PLATAFORMA (área logada) — não confundir com a landing.
// Todo link que leva alguém pra dentro do AVA (convites, notificações,
// primeiro acesso) parte daqui: em produção é o subdomínio app.<domínio>,
// que a raiz redireciona pro /login.

// Índice de strings pra aceitar tanto process.env quanto objetos de teste.
type EnvUrls = { [chave: string]: string | undefined };

export function urlDaPlataforma(env: EnvUrls = process.env): string {
  if (env.DOMINIO_LANDING) return `https://app.${env.DOMINIO_LANDING}`;
  return env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Garante que URLs de arquivos do Storage apontem pro endpoint correto
 * (Supabase self-hosted local), reescrevendo URLs legadas do projeto na nuvem
 * (xbyhwzzaoxvyluuerttr) que podem ter ficado em cache ou no banco.
 */
export function normalizarUrlStorage(
  url: string | null | undefined,
  env: EnvUrls = process.env,
): string | null {
  if (!url) return null;
  const legado = "https://xbyhwzzaoxvyluuerttr.supabase.co";
  if (!url.includes(legado)) return url;
  const baseAtual =
    env.NEXT_PUBLIC_SUPABASE_URL ?? "https://app.coworkingsocial.com.br/supabase";
  return url.replace(legado, baseAtual);
}

