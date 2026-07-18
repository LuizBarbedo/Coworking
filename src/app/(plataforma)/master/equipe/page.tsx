import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { lerSessaoEquipe, type Permissao } from "@/lib/permissoes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FormCadastrarMonitor } from "@/components/master/form-cadastrar-monitor";
import { FormCadastrarAluno } from "@/components/master/form-cadastrar-aluno";
import { LinhaMonitor } from "@/components/master/linha-monitor";
import { LinhaAluno } from "@/components/master/linha-aluno";

export const metadata: Metadata = { title: "Equipe — CSMG" };
export const dynamic = "force-dynamic";

type MembroEquipe = {
  id: string;
  nome: string;
  email: string;
  nivel: "admin" | "monitor";
  permissoes: Permissao[];
};

type Inscricao = {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  ativado_em: string | null;
};

export default async function EquipePage() {
  await exigirAdmin();
  const admin = createSupabaseAdminClient();

  const [{ data: lista }, { data: inscricoes }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin
      .from("inscricoes")
      .select("id, nome, email, matricula, ativado_em")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Inscricao[]>(),
  ]);

  const equipe: MembroEquipe[] = (lista?.users ?? [])
    .map((u) => {
      const sessao = lerSessaoEquipe(u.app_metadata);
      if (!sessao || !u.email) return null;
      return {
        id: u.id,
        nome: (u.user_metadata as { nome?: string })?.nome ?? u.email,
        email: u.email,
        nivel: sessao.nivel,
        permissoes: sessao.permissoes,
      };
    })
    .filter((m): m is MembroEquipe => m !== null)
    .sort((a, b) =>
      a.nivel === b.nivel
        ? a.nome.localeCompare(b.nome, "pt-BR")
        : a.nivel === "admin"
          ? -1
          : 1,
    );

  return (
    <div className="animate-aparecer space-y-10">
      <section>
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          Equipe
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Administradores têm acesso total; monitores só ao que for concedido
          aqui.
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {equipe.map((m) => (
              <LinhaMonitor key={m.id} {...m} />
            ))}
          </ul>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Novo monitor
            </h2>
            <div className="mt-3 rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
              <FormCadastrarMonitor />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          Alunos
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Cadastro manual: o aluno recebe a matrícula por e-mail e ativa a
          conta no primeiro acesso, definindo a própria senha.
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
            {(inscricoes ?? []).length === 0 ? (
              <p className="py-4 text-sm text-slate-500">
                Nenhuma inscrição ainda.
              </p>
            ) : (
              <ul>
                {(inscricoes ?? []).map((i) => (
                  <LinhaAluno
                    key={i.id}
                    id={i.id}
                    nome={i.nome}
                    email={i.email}
                    matricula={i.matricula}
                    ativado={i.ativado_em !== null}
                  />
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Novo aluno
            </h3>
            <div className="mt-3 rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
              <FormCadastrarAluno />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
