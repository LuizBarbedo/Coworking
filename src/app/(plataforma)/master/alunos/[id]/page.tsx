import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Trilha } from "@/components/ui/trilha";
import {
  desempenhoDoAluno,
  type DadosTurma,
} from "@/lib/relatorios-turma";

export const metadata: Metadata = { title: "Aluno — CSMG Master" };
export const dynamic = "force-dynamic";

const ROTULO_EVENTO: Record<string, string> = {
  "inscricao.criada": "Fez a inscrição",
  "conta.ativada": "Ativou a conta",
  "sessao.login": "Entrou na plataforma",
  "sessao.logout": "Saiu da plataforma",
  "aula.assistida": "Concluiu uma aula",
  "quiz.tentativa": "Fez uma avaliação",
  "disciplina.avaliada": "Avaliou uma disciplina",
  "forum.post_criado": "Publicou no fórum",
  "forum.post_editado": "Editou uma publicação no fórum",
  "forum.resposta_criada": "Respondeu no fórum",
};

const ROTULO_ENVIO: Record<string, string> = {
  enviado: "enviado",
  falha: "falhou",
  devolvido: "devolvido (e-mail quicou)",
};

function dataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AlunoMasterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPermissao("gerenciar_emails");
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: inscricao } = await admin
    .from("inscricoes")
    .select(
      "id, nome, cpf, email, telefone, matricula, selecionado, ativado_em, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!inscricao) notFound();

  // O vínculo inscrição → conta é por e-mail (inscricoes não tem FK de user).
  const [conviteRes, usuariosRes] = await Promise.all([
    admin
      .from("envios_email")
      .select("status, created_at, erro")
      .eq("email", inscricao.email.toLowerCase())
      .eq("tipo", "convite_acesso")
      .order("created_at", { ascending: false })
      .limit(10),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const usuario = (usuariosRes.data?.users ?? []).find(
    (u) => u.email?.toLowerCase() === inscricao.email.toLowerCase(),
  );

  // Sem conta ativada não há o que agregar — a página mostra só o cadastro.
  let desempenho: ReturnType<typeof desempenhoDoAluno> | null = null;
  let eventos: { acao: string; created_at: string }[] = [];
  if (usuario) {
    const [
      modulosRes,
      disciplinasRes,
      aulasRes,
      quizzesRes,
      progressoRes,
      tentativasRes,
      postsRes,
      respostasRes,
      eventosRes,
    ] = await Promise.all([
      admin.from("modulos").select("id, titulo, publicado"),
      admin.from("disciplinas").select("id, titulo, modulo_id, ordem"),
      admin.from("aulas").select("id, disciplina_id"),
      admin.from("quizzes").select("id, disciplina_id"),
      admin
        .from("progresso_aula")
        .select("aluno_id, aula_id")
        .eq("aluno_id", usuario.id),
      admin
        .from("quiz_tentativas")
        .select("aluno_id, quiz_id, nota, aprovado")
        .eq("aluno_id", usuario.id),
      admin
        .from("forum_posts")
        .select("id", { count: "exact", head: true })
        .eq("autor_id", usuario.id),
      admin
        .from("forum_respostas")
        .select("id", { count: "exact", head: true })
        .eq("autor_id", usuario.id),
      admin
        .from("eventos")
        .select("acao, created_at")
        .eq("ator_id", usuario.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    eventos = (eventosRes.data ?? []) as typeof eventos;
    const ultimoLogin = eventos.find((e) => e.acao === "sessao.login");

    // Mesma régua do relatório Turma: só módulos publicados contam.
    const modulosPublicados = new Map(
      (modulosRes.data ?? [])
        .filter((m) => m.publicado)
        .map((m) => [m.id as string, m.titulo as string]),
    );
    const aulasPorDisciplina = new Map<string, string[]>();
    for (const a of aulasRes.data ?? []) {
      const lista = aulasPorDisciplina.get(a.disciplina_id as string) ?? [];
      lista.push(a.id as string);
      aulasPorDisciplina.set(a.disciplina_id as string, lista);
    }
    const quizPorDisciplina = new Map(
      (quizzesRes.data ?? []).map((q) => [
        q.disciplina_id as string,
        q.id as string,
      ]),
    );
    const participacoesForum = Array.from(
      { length: (postsRes.count ?? 0) + (respostasRes.count ?? 0) },
      () => ({ autor_id: usuario.id }),
    );

    const dados: DadosTurma = {
      alunos: [
        { id: usuario.id, nome: inscricao.nome, email: inscricao.email },
      ],
      disciplinas: (disciplinasRes.data ?? [])
        .filter((d) => modulosPublicados.has(d.modulo_id as string))
        .map((d) => ({
          id: d.id as string,
          titulo: d.titulo as string,
          modulo: modulosPublicados.get(d.modulo_id as string) ?? "",
          ordem: (d.ordem as number) ?? 0,
          aulas: aulasPorDisciplina.get(d.id as string) ?? [],
          quizId: quizPorDisciplina.get(d.id as string) ?? null,
        })),
      progresso: (progressoRes.data ?? []) as DadosTurma["progresso"],
      tentativas: (tentativasRes.data ?? []) as DadosTurma["tentativas"],
      ultimoLoginPorAluno: ultimoLogin
        ? { [usuario.id]: ultimoLogin.created_at }
        : {},
      participacoesForum,
    };
    desempenho = desempenhoDoAluno(dados, usuario.id);
  }

  const status = inscricao.ativado_em
    ? { rotulo: "Ativo", cor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" }
    : inscricao.selecionado
      ? { rotulo: "Convidado", cor: "bg-ambar-100/60 text-ambar-700 dark:bg-brand-900/40 dark:text-ambar-400" }
      : { rotulo: "Aguardando liberação", cor: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };

  const cadastro: [string, string][] = [
    ["E-mail", inscricao.email],
    ["Telefone", inscricao.telefone ?? "—"],
    ["CPF", inscricao.cpf ?? "—"],
    ["Matrícula", inscricao.matricula],
    ["Inscrição em", dataHora(inscricao.created_at)],
    ["Conta ativada em", dataHora(inscricao.ativado_em)],
  ];

  return (
    <div className="animate-aparecer">
      <Trilha
        itens={[
          { titulo: "Alunos", href: "/master/alunos" },
          { titulo: inscricao.nome },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          {inscricao.nome}
        </h1>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${status.cor}`}
        >
          {status.rotulo}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Cadastro
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              {cadastro.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="text-xs text-slate-500">{rotulo}</dt>
                  <dd className="break-words text-slate-700 dark:text-slate-200">
                    {valor}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Convites de acesso
            </h2>
            {(conviteRes.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Nenhum convite enviado ainda.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(conviteRes.data ?? []).map((e, i) => (
                  <li key={i} className="text-slate-700 dark:text-slate-200">
                    {dataHora(e.created_at)} —{" "}
                    {ROTULO_ENVIO[e.status] ?? e.status}
                    {e.erro ? (
                      <span className="block text-xs text-red-600 dark:text-red-400">
                        {e.erro}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {!desempenho ? (
            <div className="rounded-xl border border-slate-200 bg-superficie p-6 text-sm text-slate-500 shadow-sm">
              Este aluno ainda não ativou a conta — as estatísticas aparecem
              aqui depois do primeiro acesso.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(
                  [
                    ["Avanço no curso", `${desempenho.resumo.avancoPct}%`],
                    [
                      "Aulas assistidas",
                      `${desempenho.resumo.aulasVistas}/${desempenho.resumo.totalAulas}`,
                    ],
                    [
                      "Avaliações aprovadas",
                      `${desempenho.resumo.quizzesAprovados}/${desempenho.resumo.quizzesTentados}`,
                    ],
                    [
                      "Nota média",
                      desempenho.resumo.notaMedia === null
                        ? "—"
                        : `${desempenho.resumo.notaMedia}%`,
                    ],
                    ["Fórum", desempenho.resumo.participacoesForum],
                  ] as const
                ).map(([rotulo, valor]) => (
                  <div
                    key={rotulo}
                    className="rounded-xl border border-slate-200 bg-superficie p-4 text-center shadow-sm"
                  >
                    <p className="font-display text-2xl font-bold text-brand-900 dark:text-brand-100">
                      {valor}
                    </p>
                    <p className="text-xs text-slate-500">{rotulo}</p>
                  </div>
                ))}
              </div>

              <section>
                <h2 className="font-display text-lg font-semibold text-brand-900 dark:text-brand-100">
                  Avanço por disciplina
                </h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-superficie shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="px-4 py-2.5 font-medium">Disciplina</th>
                        <th className="px-4 py-2.5 font-medium">Aulas</th>
                        <th className="px-4 py-2.5 font-medium">Avaliação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desempenho.porDisciplina.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-brand-900 dark:text-brand-100">
                              {d.disciplina}
                            </p>
                            <p className="text-xs text-slate-500">{d.modulo}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-300">
                            {d.aulasVistas}/{d.totalAulas}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-300">
                            {d.quiz
                              ? `${d.quiz.aprovado ? "aprovado" : "reprovado"} · nota ${d.quiz.nota}% · ${d.quiz.tentativas} tentativa(s)`
                              : "não tentou"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h2 className="font-display text-lg font-semibold text-brand-900 dark:text-brand-100">
                  Atividade recente
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Último acesso: {dataHora(desempenho.resumo.ultimoLogin)}
                </p>
                {eventos.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Nenhuma atividade registrada.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-1.5 rounded-xl border border-slate-200 bg-superficie p-4 text-sm shadow-sm">
                    {eventos.slice(0, 12).map((e, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-slate-700 dark:text-slate-200">
                          {ROTULO_EVENTO[e.acao] ?? e.acao}
                        </span>
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {dataHora(e.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
