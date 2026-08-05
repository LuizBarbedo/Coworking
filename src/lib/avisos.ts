/**
 * Aviso em massa de conteúdo novo para a turma.
 *
 * Dois públicos, dois textos: quem já ativou a conta só precisa saber que
 * chegou módulo novo; quem nunca entrou precisa do passo a passo de acesso de
 * novo — no lançamento, 4 em cada 5 convites não viraram conta, e mandar só
 * "tem aula nova" pra essa gente não resolve nada.
 *
 * Sem `server-only`: aqui é lógica pura, testada em avisos.test.ts. Quem toca
 * banco e SMTP é o script de disparo.
 */

export type InscricaoParaAviso = {
  nome: string;
  email: string;
  matricula: string | null;
  ativado_em: string | null;
};

/** Domínio da própria equipe: não recebe aviso de aluno. */
const DOMINIO_INTERNO = "@coworkingsocial.com.br";

function normalizar(email: string): string {
  return email.trim().toLowerCase();
}

function utilizavel(email: string): boolean {
  // Validação deliberadamente frouxa: só barra o que nem endereço é. Quem
  // decide se entrega é o SMTP, e a devolução volta em envios_email.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith(DOMINIO_INTERNO);
}

/**
 * Separa quem recebe qual versão do aviso, pulando quem já foi avisado.
 *
 * `jaAvisados` vem de envios_email (mesmo `tipo`, status 'enviado'), com os
 * e-mails já normalizados — é o que torna o disparo retomável sem duplicar.
 */
export function separarDestinatarios(dados: {
  inscricoes: InscricaoParaAviso[];
  jaAvisados: Set<string>;
}): { ativados: InscricaoParaAviso[]; pendentes: InscricaoParaAviso[] } {
  const ativados: InscricaoParaAviso[] = [];
  const pendentes: InscricaoParaAviso[] = [];

  for (const inscricao of dados.inscricoes) {
    const email = normalizar(inscricao.email ?? "");
    if (!utilizavel(email)) continue;
    if (dados.jaAvisados.has(email)) continue;

    const destinatario = { ...inscricao, email };
    if (inscricao.ativado_em) ativados.push(destinatario);
    else pendentes.push(destinatario);
  }

  return { ativados, pendentes };
}
