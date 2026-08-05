import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AvisoSpam } from "@/components/ui/aviso-spam";
import { buscarTurmas } from "@/lib/turmas-dados";
import { dataLiberacaoFormatada, turmaLiberada } from "@/lib/turmas";

// Página pública de espera: quem é de turma que ainda não abriu cai aqui ao
// tentar entrar (primeiro acesso ou login). Nenhum dado pessoal na URL — só
// o número da turma. Depois da data, a própria página manda pro login.

export const metadata: Metadata = {
  title: "Aguardando liberação — CSMG",
};

export const dynamic = "force-dynamic";

export default async function AguardandoLiberacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string }>;
}) {
  const { turma: turmaParam } = await searchParams;
  const aguardando = (await buscarTurmas())
    .filter((t) => !turmaLiberada(t))
    .sort((a, b) => a.numero - b.numero);

  const numero = Number(turmaParam);
  const turma =
    aguardando.find((t) => t.numero === numero) ?? aguardando[0] ?? null;

  // Turma inexistente ou já liberada: nada a esperar — a página se desativa.
  if (!turma) redirect("/login");

  const nome = turma.nome ?? `Turma ${turma.numero}`;
  const data = dataLiberacaoFormatada(turma);

  return (
    <AuthShell
      titulo={`Você faz parte da ${nome}`}
      subtitulo="Sua vaga está garantida — falta pouco pro seu acesso abrir."
      rodape={
        <>
          Ainda não se inscreveu?{" "}
          <Link href="/" className="font-semibold text-white underline">
            Faça sua inscrição
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-center dark:border-brand-700 dark:bg-brand-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-800/70 dark:text-brand-100/70">
            Seu acesso será liberado em
          </p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
            {data}
          </p>
        </div>
        <p className="text-sm text-brand-800/80 dark:text-brand-100/80">
          Nesse dia você recebe um e-mail com o passo a passo de entrada:
          basta informar seu e-mail e o número de matrícula da inscrição e
          criar sua senha. Até lá, não precisa fazer nada.
        </p>
        <p className="text-sm text-brand-800/80 dark:text-brand-100/80">
          Lá dentro te esperam videoaulas, e-books, avaliações, fórum de
          dúvidas e um assistente de IA — tudo gratuito.
        </p>
        <AvisoSpam titulo="No dia, não achou o e-mail?" />
      </div>
    </AuthShell>
  );
}
