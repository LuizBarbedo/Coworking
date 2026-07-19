// Portão de lançamento: enquanto PLATAFORMA_LIBERADA != "sim", o domínio
// principal (DOMINIO_LANDING) serve só a landing de inscrição; a plataforma
// completa fica no subdomínio de preview (ex.: app.coworkingsocial.com.br).
// Sem DOMINIO_LANDING configurado o portão fica desligado (dev, outros deploys).

const ROTAS_DA_PLATAFORMA = [
  "/login",
  "/primeiro-acesso",
  "/painel",
  "/modulos",
  "/master",
];

type EnvLancamento = {
  DOMINIO_LANDING?: string;
  PLATAFORMA_LIBERADA?: string;
};

export function bloquearRotaNaLanding(
  hostname: string,
  pathname: string,
  env: EnvLancamento,
): boolean {
  const dominio = env.DOMINIO_LANDING;
  if (!dominio) return false;
  if (env.PLATAFORMA_LIBERADA === "sim") return false;

  const host = hostname.replace(/^www\./, "");
  if (host !== dominio) return false;

  return ROTAS_DA_PLATAFORMA.some((rota) => pathname.startsWith(rota));
}

/**
 * A raiz do subdomínio da plataforma (app.<domínio>) leva direto ao login:
 * é o link que o aluno recebe, não faz sentido cair na landing de inscrição.
 * Quem já tem sessão é redirecionado do /login pro /painel pelo proxy.
 */
export function raizDaPlataformaVaiProLogin(
  hostname: string,
  pathname: string,
  env: EnvLancamento,
): boolean {
  const dominio = env.DOMINIO_LANDING;
  if (!dominio) return false;
  return hostname === `app.${dominio}` && pathname === "/";
}
