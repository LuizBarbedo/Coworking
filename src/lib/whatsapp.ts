// Link wa.me pra equipe avisar aluno que ainda não ativou a conta: abre a
// conversa com a mensagem pronta (convite no spam é o principal motivo de
// aluno "sem acesso"). Lógica pura — a URL da plataforma vem de fora porque
// lib/urls lê env que só existe no servidor.

export type AlunoParaAviso = {
  nome: string;
  email: string;
  matricula: string;
  telefone: string | null;
  /** Convite quicou (envio 'devolvido'): a mensagem pede o e-mail correto. */
  emailDevolvido?: boolean;
};

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0];
}

export function linkConviteWhatsApp(
  aluno: AlunoParaAviso,
  urlPlataforma: string,
): string | null {
  const digitos = (aluno.telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const numero =
    digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;

  const abertura =
    `Oi, ${primeiroNome(aluno.nome)}! Aqui é da equipe do Coworking Social ` +
    `de Mudanças Globais. `;
  const texto = aluno.emailDevolvido
    ? abertura +
      `Seu acesso à plataforma do curso foi liberado, mas o e-mail do seu ` +
      `cadastro parece ter um erro de digitação e a mensagem voltou. Pode me ` +
      `confirmar seu e-mail certinho? Aí corrijo aqui e te reenvio o acesso ` +
      `na hora.`
    : abertura +
      `Seu acesso à plataforma do curso foi liberado! Enviamos um e-mail pra ` +
      `${aluno.email} com o passo a passo — se não achar na caixa de ` +
      `entrada, procura por "Coworking Social" no spam ou na aba Promoções ` +
      `e marca como "não é spam". Se preferir entrar direto: acesse ` +
      `${urlPlataforma}/primeiro-acesso , informe seu e-mail e a ` +
      `matrícula ${aluno.matricula}, e crie sua senha. Qualquer dúvida, ` +
      `responde aqui!`;

  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
