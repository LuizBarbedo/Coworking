import "server-only";

import nodemailer from "nodemailer";
import {
  assuntoAviso,
  listaModulosHtml,
  type ResumoModulo,
} from "@/lib/avisos-modulos";
import { resolverRemetente, resolverSmtp } from "@/lib/email-config";
import { urlDaPlataforma } from "@/lib/urls";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(resolverSmtp(process.env));
  }

  return transporter;
}

/** Cabeçalhos de identidade (From e Reply-To), iguais em todos os envios. */
function cabecalho() {
  return resolverRemetente(process.env);
}

/** Aviso curto do fórum (aprovação, resposta nova) com link pro post. */
export async function enviarEmailForum(dados: {
  nome: string;
  email: string;
  assunto: string;
  corpo: string;
  link: string;
}) {
  await getTransporter().sendMail({
    ...cabecalho(),
    to: dados.email,
    subject: `${dados.assunto} — Fórum CSMG`,
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>${dados.corpo}</p>
      <p><a href="${dados.link}">Abrir no fórum</a></p>
    `,
  });
}

/** Convite de aluno cadastrado manualmente: matrícula + link do 1º acesso. */
export async function enviarEmailConviteAluno(dados: {
  nome: string;
  email: string;
  matricula: string;
}) {
  const app = urlDaPlataforma();

  await getTransporter().sendMail({
    ...cabecalho(),
    to: dados.email,
    subject: "Chegou a hora! Seu acesso à plataforma CSMG está liberado",
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>A 1ª turma do curso de mentoria do <strong>Coworking Social de
      Mudanças Globais</strong> começou — e o seu acesso está liberado.
      <strong>As primeiras aulas já estão disponíveis</strong> na plataforma:
      a apresentação do curso e as mentorias de Empreendedorismo com Legado
      Cultural, Empreender com Organização e Contabilidade e Noções
      Financeiras. Os demais módulos serão liberados ao longo das próximas
      semanas.</p>
      <p><strong>Para entrar (leva 1 minuto):</strong></p>
      <ol>
        <li>Acesse <a href="${app}/primeiro-acesso">${app}/primeiro-acesso</a></li>
        <li>Informe este e-mail e sua matrícula: <strong>${dados.matricula}</strong></li>
        <li>Crie sua senha — e pronto, você cai direto nas aulas.</li>
      </ol>
      <p>Depois disso, seu acesso é sempre por
      <a href="${app}/login">${app}/login</a> (guarde este e-mail: a matrícula
      é o seu número de identificação no curso).</p>
      <p><strong>O que te espera lá dentro:</strong> videoaulas dos
      professores, e-books pra baixar, avaliações pra acompanhar seu
      progresso, um fórum de dúvidas com a turma e um assistente de IA
      disponível a qualquer hora pra te ajudar com o conteúdo. E nas manhãs
      de aula (9h às 12h), os monitores do curso respondem ao vivo pelo
      fórum.</p>
      <p>Qualquer dificuldade pra entrar, é só responder este e-mail.</p>
      <p>Bons estudos!<br/>Equipe CSMG · Coworking Social de Mudanças
      Globais</p>
    `,
  });
}

/**
 * Confirmação de inscrição em turma que ainda não abriu: a pessoa guarda a
 * matrícula e sabe QUANDO entra — o convite com o passo a passo só sai no
 * disparo da data de liberação da turma.
 */
export async function enviarEmailInscricaoAguardandoTurma(dados: {
  nome: string;
  email: string;
  matricula: string;
  nomeTurma: string;
  /** Já formatada: "17/08/2026". */
  dataLiberacao: string;
}) {
  await getTransporter().sendMail({
    ...cabecalho(),
    to: dados.email,
    subject: `Inscrição confirmada — seu acesso abre em ${dados.dataLiberacao}`,
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>Sua inscrição no curso do <strong>Coworking Social de Mudanças
      Globais</strong> está confirmada: você faz parte da
      <strong>${dados.nomeTurma}</strong>.</p>
      <p>O acesso da sua turma à plataforma abre em
      <strong>${dados.dataLiberacao}</strong>. Nesse dia você recebe um novo
      e-mail com o passo a passo de entrada — até lá, não precisa fazer
      nada.</p>
      <p>Sua matrícula é <strong>${dados.matricula}</strong>. Guarde este
      e-mail: ela é o seu número de identificação no curso e será pedida no
      primeiro acesso.</p>
      <p><strong>O que te espera lá dentro:</strong> videoaulas dos
      professores, e-books pra baixar, avaliações pra acompanhar seu
      progresso, um fórum de dúvidas com a turma e um assistente de IA
      disponível a qualquer hora — tudo gratuito.</p>
      <p>Qualquer dúvida, é só responder este e-mail.</p>
      <p>Até ${dados.dataLiberacao}!<br/>Equipe CSMG · Coworking Social de
      Mudanças Globais</p>
    `,
  });
}

/**
 * Convite de membro da equipe (monitor/admin): link único pra definir a
 * senha — nenhuma credencial viaja no corpo do e-mail.
 */
export async function enviarEmailConviteMonitor(dados: {
  nome: string;
  email: string;
  linkConvite: string;
}) {
  await getTransporter().sendMail({
    ...cabecalho(),
    to: dados.email,
    subject: "Convite pra equipe da plataforma CSMG",
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>Você foi convidado pra equipe da plataforma do Coworking Social de
      Mudanças Globais.</p>
      <p>Para ativar sua conta e escolher sua senha, use este link (válido
      por 24 horas e de uso único):</p>
      <p><a href="${dados.linkConvite}">Ativar minha conta</a></p>
      <p>Depois disso, seu acesso à plataforma é sempre por
      <a href="${urlDaPlataforma()}/login">${urlDaPlataforma()}/login</a>.</p>
      <p>Se você não esperava este convite, ignore este e-mail.</p>
    `,
  });
}

/**
 * Aviso de módulo liberado. O corpo é montado a partir do banco
 * (`lib/avisos-modulos`): nenhum nome de módulo, professor ou contagem de aula
 * vive aqui — foi isso que travou o aviso anterior, que exigia editar este
 * arquivo e fazer deploy a cada liberação.
 *
 * Com `matricula`, inclui o passo a passo do primeiro acesso: serve pra quem
 * foi convidado e nunca entrou, num disparo manual. O fluxo automático só
 * avisa quem já ativou a conta.
 */
export async function enviarEmailModuloLiberado(dados: {
  nome: string;
  email: string;
  modulos: ResumoModulo[];
  matricula?: string;
}) {
  const app = urlDaPlataforma();
  const umSo = dados.modulos.length === 1;

  const acesso = dados.matricula
    ? `
      <p>Você foi convidado e ainda não entrou na plataforma. Se o convite
      anterior não chegou ou foi parar na caixa de spam, este e-mail resolve.</p>
      <p><strong>Para entrar (leva 1 minuto):</strong></p>
      <ol>
        <li>Acesse <a href="${app}/primeiro-acesso">${app}/primeiro-acesso</a></li>
        <li>Informe este e-mail e sua matrícula: <strong>${dados.matricula}</strong></li>
        <li>Crie sua senha — e pronto, você cai direto nas aulas.</li>
      </ol>
      <p>Todo o conteúdo anterior continua disponível: você não perdeu nada e
      pode começar de onde quiser.</p>`
    : `<p><a href="${app}/painel">Entrar na plataforma</a></p>`;

  await getTransporter().sendMail({
    ...cabecalho(),
    to: dados.email,
    subject: assuntoAviso(dados.modulos),
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>${umSo ? "Liberamos um módulo novo" : "Liberamos módulos novos"} na
      plataforma, já ${umSo ? "disponível" : "disponíveis"} pra você:</p>
      ${listaModulosHtml(dados.modulos)}
      <p>O assistente de IA da plataforma já leu todo o material novo — pode
      perguntar à vontade.</p>
      ${acesso}
      <p>Bons estudos!<br/>Equipe CSMG · Coworking Social de Mudanças Globais</p>
    `,
  });
}

export async function enviarEmailConfirmacaoInscricao(dados: {
  nome: string;
  email: string;
  matricula: string;
}) {
  await getTransporter().sendMail({
    ...cabecalho(),
    to: dados.email,
    subject: "Inscrição confirmada",
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>Sua inscrição foi recebida com sucesso.</p>
      <p>Seu número de matrícula é: <strong>${dados.matricula}</strong></p>
      <p>Guarde este número: ele identifica você na plataforma. Em breve
      enviaremos os próximos passos para acessar os cursos.</p>
    `,
  });
}
