import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  atoresRemovidos,
  resolverMostrarRemovidos,
} from "@/lib/eventos-filtro";
import { Paginacao } from "@/components/master/paginacao";
import { GrupoPilulas } from "@/components/ui/pilulas";

export const metadata: Metadata = { title: "Eventos — CSMG Master" };
export const dynamic = "force-dynamic";

const FILTROS = [
  { valor: "", rotulo: "Tudo" },
  { valor: "sessao.", rotulo: "Sessões" },
  { valor: "conta.", rotulo: "Ativações" },
  { valor: "aula.", rotulo: "Aulas" },
  { valor: "quiz.", rotulo: "Avaliações" },
  { valor: "forum.", rotulo: "Fórum" },
  { valor: "moderacao.", rotulo: "Moderação" },
  { valor: "conteudo.", rotulo: "Conteúdo" },
  { valor: "equipe.", rotulo: "Equipe" },
] as const;

// Cor por família de ação: deixa a coluna escaneável sem precisar ler cada
// rótulo. Só tom de fundo — a ação em texto segue sendo a informação.
const COR_DA_FAMILIA: Record<string, string> = {
  sessao:
    "bg-slate-100 text-slate-700",
  conta:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  aula: "bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200",
  quiz: "bg-violet-50 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  forum: "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  moderacao:
    "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  conteudo:
    "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
  equipe: "bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200",
};

const POR_PAGINA = 50;

export default async function EventosMasterPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    q?: string;
    pagina?: string;
    removidos?: string;
  }>;
}) {
  await exigirAdmin();
  const {
    tipo = "",
    q = "",
    pagina = "1",
    removidos: paramRemovidos,
  } = await searchParams;
  const paginaAtual = Math.max(1, Number.parseInt(pagina, 10) || 1);
  const mostrarRemovidos = resolverMostrarRemovidos(paramRemovidos);
  const admin = createSupabaseAdminClient();

  const { data: usuarios } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const nomePorId = new Map(
    (usuarios?.users ?? []).map((u) => [
      u.id,
      (u.user_metadata as { nome?: string })?.nome ?? u.email ?? u.id,
    ]),
  );

  // Atores sem conta: quase sempre as contas efêmeras dos E2E, que sujam a
  // trilha com atividade que nunca existiu. Ver lib/eventos-filtro.
  const { data: atores } = await admin
    .from("eventos")
    .select("ator_id")
    .not("ator_id", "is", null)
    .limit(20000);
  const semConta = atoresRemovidos(
    (atores ?? []).map((e) => e.ator_id as string | null),
    new Set(nomePorId.keys()),
  );

  const termo = q.trim();
  // Busca por ação OU por quem fez (nome/e-mail resolvido pra ids).
  const seguro = termo ? termo.replace(/[%,()]/g, "").toLowerCase() : "";
  const atoresQueBatem = seguro
    ? (usuarios?.users ?? [])
        .filter((u) => {
          const nome = (
            (u.user_metadata as { nome?: string })?.nome ?? ""
          ).toLowerCase();
          return nome.includes(seguro) || (u.email ?? "").includes(seguro);
        })
        .map((u) => u.id)
        .slice(0, 50)
    : [];
  const buscaOr = `acao.ilike.%${seguro}%,ator_id.in.(${atoresQueBatem.join(",")})`;
  const esconderOr = `ator_id.is.null,ator_id.not.in.(${semConta.join(",")})`;
  const esconder = !mostrarRemovidos && semConta.length > 0;

  let consulta = admin
    .from("eventos")
    .select(
      "id, ator_id, ator_papel, acao, alvo_tipo, alvo_id, detalhes, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (tipo) consulta = consulta.like("acao", `${tipo}%`);
  if (seguro) {
    consulta = atoresQueBatem.length
      ? consulta.or(buscaOr)
      : consulta.ilike("acao", `%${seguro}%`);
  }
  // Um segundo `or` combina com o da busca por AND (verificado no PostgREST).
  if (esconder) consulta = consulta.or(esconderOr);

  // Quantos ficaram de fora — a tela nunca esconde sem dizer quanto. Mesmos
  // filtros da lista, só que olhando exatamente pra quem foi escondido.
  let escondidos = 0;
  if (esconder) {
    let contagem = admin
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .in("ator_id", semConta);
    if (tipo) contagem = contagem.like("acao", `${tipo}%`);
    if (seguro) {
      contagem = atoresQueBatem.length
        ? contagem.or(buscaOr)
        : contagem.ilike("acao", `%${seguro}%`);
    }
    const { count } = await contagem;
    escondidos = count ?? 0;
  }

  const de = (paginaAtual - 1) * POR_PAGINA;
  const {
    data: eventos,
    error,
    count,
  } = await consulta.range(de, de + POR_PAGINA - 1);
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function link(params: {
    tipo?: string;
    q?: string;
    pagina?: string;
    removidos?: string;
  }): string {
    const query = new URLSearchParams();
    const final = {
      tipo,
      q: termo,
      pagina: "1",
      removidos: mostrarRemovidos ? "1" : "",
      ...params,
    };
    if (final.tipo) query.set("tipo", final.tipo);
    if (final.q) query.set("q", final.q);
    if (final.pagina !== "1") query.set("pagina", final.pagina);
    if (final.removidos) query.set("removidos", final.removidos);
    const s = query.toString();
    return s ? `/master/eventos?${s}` : "/master/eventos";
  }

  const temFiltro = Boolean(tipo || termo);

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Eventos
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Trilha de auditoria: quem fez o quê e quando, em toda a plataforma.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
        <form action="/master/eventos" className="flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            defaultValue={termo}
            placeholder="Buscar por ação (ex.: quiz) ou por pessoa…"
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          {tipo ? <input type="hidden" name="tipo" value={tipo} /> : null}
          {mostrarRemovidos ? (
            <input type="hidden" name="removidos" value="1" />
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            Buscar
          </button>
        </form>

        <div className="mt-3">
          <GrupoPilulas
            rotuloDoGrupo="Tipo de evento"
            opcoes={FILTROS.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
            ativo={tipo}
            hrefPara={(v) => link({ tipo: String(v) })}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
          <p className="text-slate-500">
            <span className="font-medium tabular-nums text-slate-700">
              {total}
            </span>{" "}
            evento{total === 1 ? "" : "s"}
            {termo ? ` para “${termo}”` : ""} — página {paginaAtual} de{" "}
            {paginas}
          </p>
          {temFiltro ? (
            <Link
              href={link({ tipo: "", q: "" })}
              className="text-slate-500 underline underline-offset-2 transition hover:text-brand-700 dark:hover:text-brand-300"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </div>

      {escondidos > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
          <span>
            <span className="font-medium tabular-nums">{escondidos}</span>{" "}
            evento{escondidos === 1 ? "" : "s"} de contas que não existem mais
            {escondidos === 1 ? " está" : " estão"} fora desta lista — quase
            sempre as contas temporárias dos testes automatizados.
          </span>
          <Link
            href={link({ removidos: "1", pagina: "1" })}
            className="font-medium text-brand-700 underline underline-offset-2 transition hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-100"
          >
            Mostrar mesmo assim
          </Link>
        </p>
      ) : null}

      {mostrarRemovidos && semConta.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-300 bg-amber-50/60 px-3.5 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <span>
            Mostrando também a atividade de contas removidas (testes
            automatizados e exclusões de conta).
          </span>
          <Link
            href={link({ removidos: "", pagina: "1" })}
            className="font-medium underline underline-offset-2"
          >
            Voltar a esconder
          </Link>
        </p>
      ) : null}

      {error ? (
        <p className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          A migração 0021 (trilha de auditoria) ainda não foi aplicada no
          Supabase — os eventos aparecem aqui depois dela.
        </p>
      ) : (eventos ?? []).length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          Nenhum evento registrado
          {temFiltro ? " com esses filtros" : " ainda"}.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-superficie shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Quando</th>
                <th className="px-4 py-2.5 font-medium">Quem</th>
                <th className="px-4 py-2.5 font-medium">Ação</th>
                <th className="px-4 py-2.5 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {(eventos ?? []).map((e) => {
                const familia = String(e.acao).split(".")[0];
                const semDono = Boolean(e.ator_id) && !nomePorId.has(e.ator_id);
                return (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-500">
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }).format(new Date(e.created_at))}
                    </td>
                    <td className="max-w-44 truncate px-4 py-2 text-slate-700">
                      {!e.ator_id ? (
                        <span className="text-slate-400">sistema</span>
                      ) : semDono ? (
                        <span className="text-slate-400 italic">
                          conta removida
                        </span>
                      ) : (
                        nomePorId.get(e.ator_id)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          COR_DA_FAMILIA[familia] ??
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {e.acao}
                      </span>
                    </td>
                    <td className="max-w-80 truncate px-4 py-2 text-xs text-slate-500">
                      {[
                        e.alvo_tipo
                          ? `${e.alvo_tipo} ${String(e.alvo_id).slice(0, 8)}`
                          : null,
                        e.detalhes ? JSON.stringify(e.detalhes) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Paginacao
        pagina={paginaAtual}
        paginas={paginas}
        hrefPara={(p) => link({ pagina: String(p) })}
      />
    </div>
  );
}
