// Resumo de convites por turma — lógica pura da aba E-mails e do card do
// dashboard. Recebe os dados já buscados (inscrições + Set de e-mails com
// convite enviado) e devolve um resumo por turma, na ordem da lista.
import {
  dataLiberacaoFormatada,
  turmaLiberada,
  type Turma,
} from "@/lib/turmas";

export type ResumoTurmaConvites = {
  numero: number;
  nome: string;
  liberada: boolean;
  /** "17/08/2026" — vazio quando a turma não tem data (liberada desde sempre). */
  dataLiberacao: string;
  inscritos: number;
  ativados: number;
  /** Sem convite E sem conta ativada — o que o botão de disparo vai cobrir. */
  semConvite: number;
};

/** Contas internas ficam fora dos números (mesma régua do disparo). */
const DOMINIO_INTERNO = "@coworkingsocial.com.br";

export function resumoConvitesPorTurma(
  inscricoes: { email: string; ativado_em?: string | null; turma?: number | null }[],
  emailsConvidados: Set<string>,
  turmas: Turma[],
  agora: Date = new Date(),
): ResumoTurmaConvites[] {
  return turmas.map((t) => {
    const daTurma = inscricoes.filter(
      (i) =>
        !i.email.toLowerCase().endsWith(DOMINIO_INTERNO) &&
        // Inscrição pré-0023 sem turma conta como turma 1 (backfill do legado).
        (typeof i.turma === "number" ? i.turma : 1) === t.numero,
    );
    const ativados = daTurma.filter((i) => i.ativado_em).length;
    const semConvite = daTurma.filter(
      (i) => !i.ativado_em && !emailsConvidados.has(i.email.toLowerCase()),
    ).length;

    return {
      numero: t.numero,
      nome: t.nome ?? `Turma ${t.numero}`,
      liberada: turmaLiberada(t, agora),
      dataLiberacao: dataLiberacaoFormatada(t),
      inscritos: daTurma.length,
      ativados,
      semConvite,
    };
  });
}
