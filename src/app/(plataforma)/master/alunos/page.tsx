import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { urlDaPlataforma } from "@/lib/urls";
import { linkConviteWhatsApp } from "@/lib/whatsapp";
import { FormCadastrarAluno } from "@/components/master/form-cadastrar-aluno";
import { LinhaAluno } from "@/components/master/linha-aluno";

export const metadata: Metadata = { title: "Alunos — CSMG Master" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

const STATUS = [
  { valor: "", rotulo: "Todos" },
  { valor: "aguardando", rotulo: "Aguardando liberação" },
  { valor: "convidado", rotulo: "Convite enviado" },
  { valor: "ativado", rotulo: "Ativos" },
] as const;

type Busca = { q?: string; status?: string; pagina?: string };

export default async function AlunosMasterPage({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  await exigirAdmin();
  const { q = "", status = "", pagina = "1" } = await searchParams;
  const paginaAtual = Math.max(1, Number.parseInt(pagina, 10) || 1);
  const admin = createSupabaseAdminClient();

  let consulta = admin
    .from("inscricoes")
    .select("id, nome, email, telefone, matricula, selecionado, ativado_em", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  const termo = q.trim();
  if (termo) {
    const seguro = termo.replace(/[%,()]/g, "");
    consulta = consulta.or(
      `nome.ilike.%${seguro}%,email.ilike.%${seguro}%,matricula.ilike.%${seguro}%`,
    );
  }
  if (status === "aguardando") consulta = consulta.eq("selecionado", false);
  else if (status === "convidado")
    consulta = consulta.eq("selecionado", true).is("ativado_em", null);
  else if (status === "ativado") consulta = consulta.not("ativado_em", "is", null);

  const de = (paginaAtual - 1) * POR_PAGINA;
  const [{ data: inscricoes, count }, devolvidosRes] = await Promise.all([
    consulta.range(de, de + POR_PAGINA - 1),
    // Convites que quicaram: muda a mensagem do WhatsApp (pedir e-mail certo).
    admin
      .from("envios_email")
      .select("email")
      .eq("tipo", "convite_acesso")
      .eq("status", "devolvido"),
  ]);
  const emailsDevolvidos = new Set(
    (devolvidosRes.data ?? []).map((e) => e.email as string),
  );
  const urlApp = urlDaPlataforma();
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function link(params: Partial<Busca>): string {
    const query = new URLSearchParams();
    const final = { q: termo, status, pagina: "1", ...params };
    if (final.q) query.set("q", final.q);
    if (final.status) query.set("status", final.status);
    if (final.pagina !== "1") query.set("pagina", final.pagina);
    const s = query.toString();
    return s ? `/master/alunos?${s}` : "/master/alunos";
  }

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Alunos
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Inscrições da plataforma: busque, acompanhe o status e reenvie
        convites. O disparo em massa fica na aba E-mails.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <form action="/master/alunos" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={termo}
              placeholder="Buscar por nome, e-mail ou matrícula…"
              className="w-full min-w-0 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Buscar
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {STATUS.map((s) => (
              <Link
                key={s.valor}
                href={link({ status: s.valor })}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  status === s.valor
                    ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200"
                    : "border-slate-200 text-slate-500 hover:border-brand-300"
                }`}
              >
                {s.rotulo}
              </Link>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              {total} inscrição(ões){termo ? ` pra “${termo}”` : ""} — página{" "}
              {paginaAtual} de {paginas}
            </p>
            {(inscricoes ?? []).length === 0 ? (
              <p className="py-4 text-sm text-slate-500">
                Nada por aqui com esses filtros.
              </p>
            ) : (
              <ul className="mt-2">
                {(inscricoes ?? []).map((i) => (
                  <LinhaAluno
                    key={i.id}
                    id={i.id}
                    nome={i.nome}
                    email={i.email}
                    matricula={i.matricula}
                    ativado={i.ativado_em !== null}
                    linkWhatsApp={
                      i.ativado_em === null
                        ? linkConviteWhatsApp(
                            {
                              nome: i.nome,
                              email: i.email,
                              matricula: i.matricula,
                              telefone: i.telefone,
                              emailDevolvido: emailsDevolvidos.has(
                                i.email.toLowerCase(),
                              ),
                            },
                            urlApp,
                          )
                        : null
                    }
                  />
                ))}
              </ul>
            )}
            {paginas > 1 ? (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                {paginaAtual > 1 ? (
                  <Link
                    href={link({ pagina: String(paginaAtual - 1) })}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:text-slate-200"
                  >
                    Anterior
                  </Link>
                ) : (
                  <span />
                )}
                {paginaAtual < paginas ? (
                  <Link
                    href={link({ pagina: String(paginaAtual + 1) })}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:text-slate-200"
                  >
                    Próxima
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Novo aluno
          </h2>
          <div className="mt-3 rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
            <FormCadastrarAluno />
          </div>
        </div>
      </div>
    </div>
  );
}
