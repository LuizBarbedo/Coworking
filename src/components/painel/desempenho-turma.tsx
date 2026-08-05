// Relatório "Turma": desempenho e avanço dos alunos no curso. Busca tudo
// via service_role (área restrita por ver_relatorios) e agrega com a lógica
// pura de lib/relatorios-turma.
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buscarTurmas } from "@/lib/turmas-dados";
import {
  avancoPorDisciplina,
  filtrarPorTurma,
  linhasDosAlunos,
  resumoFeedback,
  resumoGeral,
  type AvaliacaoDisciplina,
  type DadosTurma,
  type InscricaoDeTurma,
} from "@/lib/relatorios-turma";

/** Contas internas (equipe, testes) ficam fora das estatísticas da turma. */
function ehInterno(email: string): boolean {
  return (
    email.endsWith("@example.com") ||
    email.endsWith("@coworkingsocial.com.br")
  );
}

function dataCurta(iso: string | null): string {
  if (!iso) return "nunca entrou";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const ALUNOS_POR_PAGINA = 25;

export async function DesempenhoTurma({
  busca = "",
  pagina = 1,
  turma = null,
}: {
  busca?: string;
  pagina?: number;
  /** Recorte por turma (número) — null mostra todas. */
  turma?: number | null;
} = {}) {
  const admin = createSupabaseAdminClient();

  // Turmas (0023) — antes da migração a lista vem vazia, o filtro some e o
  // relatório segue mostrando todo mundo (mesmo padrão da aba Alunos).
  const turmas = await buscarTurmas();
  const temTurmas = turmas.length > 0;
  const turmaAtiva =
    temTurmas && turma != null && turmas.some((t) => t.numero === turma)
      ? turma
      : null;

  const [
    usuariosRes,
    modulosRes,
    disciplinasRes,
    aulasRes,
    quizzesRes,
    progressoRes,
    tentativasRes,
    loginsRes,
    postsRes,
    respostasRes,
    avaliacoesRes,
    inscricoesRes,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("modulos").select("id, titulo, publicado"),
    admin.from("disciplinas").select("id, titulo, modulo_id, ordem"),
    admin.from("aulas").select("id, disciplina_id"),
    admin.from("quizzes").select("id, disciplina_id"),
    admin.from("progresso_aula").select("aluno_id, aula_id"),
    admin.from("quiz_tentativas").select("aluno_id, quiz_id, nota, aprovado"),
    // Qualquer evento do aluno conta como presença — a sessão dura dias sem
    // novo login, então só "sessao.login" subestimava o último acesso.
    admin
      .from("eventos")
      .select("ator_id, created_at")
      .not("ator_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000),
    admin.from("forum_posts").select("autor_id"),
    admin.from("forum_respostas").select("autor_id"),
    // Feedback anônimo (0022) — sem a migração, segue vazio sem quebrar.
    admin
      .from("avaliacoes_disciplina")
      .select("disciplina_id, estrelas, comentario, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    // Vínculo pro detalhe do aluno (/master/alunos/[id]) — casa por e-mail.
    // A coluna turma só entra quando a 0023 existe (senão derruba a query);
    // o parser de tipos do supabase-js não aceita select condicional, então
    // o cast fixa a forma base e `turma` é lida com cast pontual abaixo.
    admin
      .from("inscricoes")
      .select((temTurmas ? "id, email, turma" : "id, email") as "id, email"),
  ]);

  const inscricoes = (inscricoesRes.data ?? []) as {
    id: string;
    email: string;
    turma?: number | null;
  }[];
  const inscricaoPorEmail = new Map(
    inscricoes.map((i) => [i.email.toLowerCase(), i.id]),
  );
  const inscricoesDeTurma: InscricaoDeTurma[] = inscricoes.flatMap((i) =>
    typeof i.turma === "number" ? [{ email: i.email, turma: i.turma }] : [],
  );

  // Alunos = contas que não são da equipe nem internas/de teste.
  const alunos = (usuariosRes.data?.users ?? [])
    .filter(
      (u) =>
        u.email &&
        !ehInterno(u.email) &&
        (u.app_metadata as { role?: string })?.role !== "master",
    )
    .map((u) => ({
      id: u.id,
      nome:
        (u.user_metadata as { nome?: string })?.nome ?? u.email ?? "aluno",
      email: u.email ?? "",
    }));

  // Só módulos publicados entram na régua de avanço.
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
  const disciplinas = (disciplinasRes.data ?? [])
    .filter((d) => modulosPublicados.has(d.modulo_id as string))
    .map((d) => ({
      id: d.id as string,
      titulo: d.titulo as string,
      modulo: modulosPublicados.get(d.modulo_id as string) ?? "",
      ordem: (d.ordem as number) ?? 0,
      aulas: aulasPorDisciplina.get(d.id as string) ?? [],
      quizId: quizPorDisciplina.get(d.id as string) ?? null,
    }));

  // Tudo filtrado pelo conjunto de alunos reais — equipe e contas de teste
  // não entram em nenhum número da turma.
  const idsDeAlunos = new Set(alunos.map((a) => a.id));

  // Último login por aluno (o select vem ordenado do mais novo pro mais velho).
  const ultimoLoginPorAluno: Record<string, string> = {};
  for (const l of loginsRes.data ?? []) {
    if (
      l.ator_id &&
      idsDeAlunos.has(l.ator_id) &&
      !ultimoLoginPorAluno[l.ator_id]
    ) {
      ultimoLoginPorAluno[l.ator_id] = l.created_at as string;
    }
  }

  const completos: DadosTurma = {
    alunos,
    disciplinas,
    progresso: ((progressoRes.data ?? []) as DadosTurma["progresso"]).filter(
      (p) => idsDeAlunos.has(p.aluno_id),
    ),
    tentativas: (
      (tentativasRes.data ?? []) as DadosTurma["tentativas"]
    ).filter((t) => idsDeAlunos.has(t.aluno_id)),
    ultimoLoginPorAluno,
    participacoesForum: [
      ...((postsRes.data ?? []) as { autor_id: string }[]),
      ...((respostasRes.data ?? []) as { autor_id: string }[]),
    ].filter((p) => idsDeAlunos.has(p.autor_id)),
  };
  const dados =
    turmaAtiva === null
      ? completos
      : filtrarPorTurma(completos, inscricoesDeTurma, turmaAtiva);

  const geral = resumoGeral(dados);
  const porDisciplina = avancoPorDisciplina(dados);
  const linhas = linhasDosAlunos(dados);

  // Busca e paginação da lista (a agregação é em memória, então filtra aqui).
  const termoAluno = busca.trim().toLowerCase();
  const linhasFiltradas = termoAluno
    ? linhas.filter(
        (a) =>
          a.nome.toLowerCase().includes(termoAluno) ||
          a.email.toLowerCase().includes(termoAluno),
      )
    : linhas;
  const totalPaginas = Math.max(
    1,
    Math.ceil(linhasFiltradas.length / ALUNOS_POR_PAGINA),
  );
  const paginaAlunos = Math.min(pagina, totalPaginas);
  const linhasDaPagina = linhasFiltradas.slice(
    (paginaAlunos - 1) * ALUNOS_POR_PAGINA,
    paginaAlunos * ALUNOS_POR_PAGINA,
  );
  const linkAlunos = (params: {
    aluno?: string;
    pagina?: number;
    turma?: number | null;
  }) => {
    const query = new URLSearchParams({ visao: "turma" });
    const final = { aluno: termoAluno, pagina: 1, turma: turmaAtiva, ...params };
    if (final.turma !== null) query.set("turma", String(final.turma));
    if (final.aluno) query.set("aluno", final.aluno);
    if (final.pagina > 1) query.set("pagina", String(final.pagina));
    return `/master/relatorios?${query.toString()}`;
  };
  const avaliacoes = (avaliacoesRes.data ?? []) as (AvaliacaoDisciplina & {
    created_at: string;
  })[];
  const feedback = resumoFeedback(avaliacoes);
  const tituloDaDisciplina = new Map(disciplinas.map((d) => [d.id, d.titulo]));
  const comentarios = avaliacoes.filter((a) => a.comentario);
  const seteDias = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const ativos7d = Object.values(dados.ultimoLoginPorAluno).filter(
    (iso) => new Date(iso).getTime() >= seteDias,
  ).length;

  return (
    <div className="space-y-8">
      {temTurmas ? (
        <nav aria-label="Filtro de turma" className="flex flex-wrap gap-1.5">
          {[{ valor: null as number | null, rotulo: "Todas as turmas" }]
            .concat(
              turmas.map((t) => ({
                valor: t.numero as number | null,
                rotulo: t.nome ?? `Turma ${t.numero}`,
              })),
            )
            .map((t) => (
              <Link
                key={t.rotulo}
                href={linkAlunos({ turma: t.valor, pagina: 1 })}
                aria-current={turmaAtiva === t.valor ? "page" : undefined}
                className={`rounded-full border px-3.5 py-1 text-xs transition ${
                  turmaAtiva === t.valor
                    ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200"
                    : "border-slate-200 text-slate-500 hover:border-brand-300"
                }`}
              >
                {t.rotulo}
              </Link>
            ))}
        </nav>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          [
            ["Alunos com conta", geral.totalAlunos],
            ["Ativos (7 dias)", ativos7d],
            ["Aulas assistidas", geral.aulasAssistidas],
            ["Avanço médio", `${geral.avancoMedioPct}%`],
            ["Aprovação nas avaliações", `${geral.aprovacaoPct}%`],
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
        <p className="mt-0.5 text-sm text-slate-500">
          Onde a turma está andando — e onde está travando.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-superficie shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Disciplina</th>
                <th className="px-4 py-2.5 font-medium">Começaram</th>
                <th className="px-4 py-2.5 font-medium">Concluíram as aulas</th>
                <th className="px-4 py-2.5 font-medium">Avaliação</th>
                <th className="px-4 py-2.5 font-medium">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {porDisciplina.map((d) => (
                <tr
                  key={d.disciplina}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-brand-900 dark:text-brand-100">
                      {d.disciplina}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {d.comecaramPct}%
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {d.concluiramPct}%
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {d.quizId
                      ? d.tentaram === 0
                        ? "ninguém tentou ainda"
                        : `${d.aprovadas}/${d.tentaram} aprovados · nota média ${d.notaMedia}%`
                      : "sem avaliação"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {feedback.has(d.id)
                      ? `★ ${feedback.get(d.id)!.media} (${feedback.get(d.id)!.total})`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {comentarios.length > 0 ? (
        <section>
          <h2 className="font-display text-lg font-semibold text-brand-900 dark:text-brand-100">
            Comentários da turma
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Feedback anônimo de quem concluiu as disciplinas.
          </p>
          <ul className="mt-3 space-y-2">
            {comentarios.slice(0, 30).map((c, i) => (
              <li
                key={i}
                className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm"
              >
                <p className="text-xs text-slate-500">
                  <span className="text-amber-500">
                    {"★".repeat(c.estrelas)}
                  </span>{" "}
                  · {tituloDaDisciplina.get(c.disciplina_id) ?? "disciplina"} ·{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                  }).format(new Date(c.created_at))}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {c.comentario}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-900 dark:text-brand-100">
          Alunos ({linhasFiltradas.length}
          {termoAluno ? ` de ${linhas.length}` : ""})
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Ordenados por avanço — os do fim da lista podem precisar de um
          empurrão da monitoria.
        </p>

        <form action="/master/relatorios" className="mt-3 flex max-w-xl gap-2">
          <input type="hidden" name="visao" value="turma" />
          {turmaAtiva !== null ? (
            <input type="hidden" name="turma" value={turmaAtiva} />
          ) : null}
          <input
            type="search"
            name="aluno"
            defaultValue={termoAluno}
            placeholder="Buscar aluno por nome ou e-mail…"
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            Buscar
          </button>
        </form>
        {totalPaginas > 1 ? (
          <p className="mt-2 text-xs text-slate-500">
            Página {paginaAlunos} de {totalPaginas}
          </p>
        ) : null}

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-superficie shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Aluno</th>
                <th className="px-4 py-2.5 font-medium">Aulas</th>
                <th className="px-4 py-2.5 font-medium">Avaliações</th>
                <th className="px-4 py-2.5 font-medium">Fórum</th>
                <th className="px-4 py-2.5 font-medium">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {linhasDaPagina.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-56 px-4 py-2">
                    {inscricaoPorEmail.has(a.email.toLowerCase()) ? (
                      <Link
                        href={`/master/alunos/${inscricaoPorEmail.get(a.email.toLowerCase())}`}
                        className="block truncate font-medium text-brand-900 underline-offset-4 transition hover:text-brand-700 hover:underline dark:text-brand-100 dark:hover:text-brand-300"
                      >
                        {a.nome}
                      </Link>
                    ) : (
                      <p className="truncate font-medium text-brand-900 dark:text-brand-100">
                        {a.nome}
                      </p>
                    )}
                    <p className="truncate text-xs text-slate-500">{a.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                    {a.aulasVistas}/{a.totalAulas}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                    {a.notaMedia === null
                      ? "—"
                      : `${a.quizzesAprovados} aprovadas · média ${a.notaMedia}%`}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {a.participacoesForum}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                    {dataCurta(a.ultimoLogin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            {paginaAlunos > 1 ? (
              <Link
                href={linkAlunos({ pagina: paginaAlunos - 1 })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:text-slate-200"
              >
                Anterior
              </Link>
            ) : (
              <span />
            )}
            {paginaAlunos < totalPaginas ? (
              <Link
                href={linkAlunos({ pagina: paginaAlunos + 1 })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:text-slate-200"
              >
                Próxima
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
