import type { Metadata } from "next";
import Link from "next/link";
import { exigirMaster, getSessaoEquipe } from "@/lib/auth";
import { temPermissao, type Permissao } from "@/lib/permissoes";

export const metadata: Metadata = { title: "Área do Master — CSMG" };

// Visão operacional: números ao vivo a cada visita.
export const dynamic = "force-dynamic";

type Atalho = {
  href: string;
  rotulo: string;
  descricao: string;
  /** Permissão que libera o atalho — ausente = só admin. */
  permissao?: Permissao;
  dataTour?: string;
};

const ATALHOS: Atalho[] = [
  {
    href: "/master/conteudo",
    rotulo: "Conteúdo",
    descricao: "Módulos, disciplinas, aulas, materiais e avaliações.",
    permissao: "editar_conteudo",
    dataTour: "master-conteudo",
  },
  {
    href: "/master/relatorios",
    rotulo: "Relatórios",
    descricao: "Inscrições, funil e desempenho da turma.",
    permissao: "ver_relatorios",
  },
  {
    href: "/master/forum",
    rotulo: "Fórum de dúvidas",
    descricao: "Fila de moderação e publicações dos alunos.",
    permissao: "moderar_forum",
  },
  {
    href: "/master/alunos",
    rotulo: "Alunos",
    descricao: "Contas, matrículas e reenvio de convites.",
    permissao: "gerenciar_emails",
  },
  {
    href: "/master/emails",
    rotulo: "E-mails",
    descricao: "Convites de acesso, falhas e devoluções.",
    permissao: "gerenciar_emails",
  },
  {
    href: "/master/turmas",
    rotulo: "Turmas",
    descricao: "Datas de liberação de cada turma.",
  },
];

export default async function MasterInicioPage() {
  await exigirMaster();
  const sessao = await getSessaoEquipe();

  const atalhos = ATALHOS.filter((a) =>
    a.permissao ? temPermissao(sessao, a.permissao) : sessao?.nivel === "admin",
  );

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Início
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Visão geral da operação — cada área em detalhe fica nas abas.
      </p>

      {atalhos.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          Sua conta ainda não tem nenhuma área liberada — peça a um admin
          para conceder as permissões na aba Equipe.
        </p>
      ) : (
        <div className="escalonado mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {atalhos.map((a) => (
            <div key={a.href} data-tour={a.dataTour}>
              <Link
                href={a.href}
                className="block h-full rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">
                  {a.rotulo}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{a.descricao}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
