// Cards do Início da área master. Cada um busca os próprios números
// (service_role, server component) e some sozinho quando a migração que o
// alimenta não existe — mesmo padrão do CardSaudeForum.

import Link from "next/link";
import { resumoConvitesPorTurma } from "@/lib/convites-resumo";
import { obterMetricas } from "@/lib/metricas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buscarTurmas } from "@/lib/turmas-dados";

function CartaoLink({
  href,
  titulo,
  valor,
  detalhe,
  alerta = false,
}: {
  href: string;
  titulo: string;
  valor: string;
  detalhe: string;
  /** Pinta o valor de âmbar — estado que pede atenção. */
  alerta?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p
        className={`mt-2 font-display text-3xl font-bold ${
          alerta
            ? "text-amber-600 dark:text-amber-400"
            : "text-brand-900 dark:text-brand-100"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-xs text-slate-400">{detalhe}</p>
    </Link>
  );
}

/** Próxima turma com data de liberação: inscritos acumulados e convites. */
export async function CardTurmaProxima() {
  const admin = createSupabaseAdminClient();
  const [turmas, inscricoesRes, convidadosRes] = await Promise.all([
    buscarTurmas(),
    admin.from("inscricoes").select("email, ativado_em, turma"),
    admin
      .from("envios_email")
      .select("email")
      .eq("tipo", "convite_acesso")
      .eq("status", "enviado"),
  ]);
  if (inscricoesRes.error) return null;

  const convidados = new Set(
    (convidadosRes.data ?? []).map((e) => e.email.toLowerCase()),
  );
  const comData = resumoConvitesPorTurma(
    inscricoesRes.data ?? [],
    convidados,
    turmas,
  ).filter((t) => t.dataLiberacao !== "");
  // Destaque pra turma que ainda vai abrir; depois da liberação, a mais nova.
  const turma = comData.find((t) => !t.liberada) ?? comData.at(-1);
  if (!turma) return null;

  return (
    <CartaoLink
      href="/master/emails"
      titulo={turma.nome}
      valor={`${turma.inscritos} ${turma.inscritos === 1 ? "inscrito" : "inscritos"}`}
      detalhe={
        turma.liberada
          ? `Liberada em ${turma.dataLiberacao} · ${turma.semConvite} sem convite`
          : `Libera em ${turma.dataLiberacao} · ${turma.semConvite} sem convite`
      }
    />
  );
}

/** Fila de moderação do fórum (posts + respostas pendentes). */
export async function CardModeracao() {
  const admin = createSupabaseAdminClient();
  const contar = (tabela: string) =>
    admin
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
  const [posts, respostas] = await Promise.all([
    contar("forum_posts"),
    contar("forum_respostas"),
  ]);
  if (posts.error || respostas.error) return null;

  const total = (posts.count ?? 0) + (respostas.count ?? 0);
  return (
    <CartaoLink
      href="/master/forum"
      titulo="Moderação do fórum"
      valor={String(total)}
      detalhe={
        total === 0
          ? "Nenhuma publicação aguardando revisão"
          : total === 1
            ? "Publicação aguardando revisão"
            : "Publicações aguardando revisão"
      }
      alerta={total > 0}
    />
  );
}

/** Vídeos em transcodificação (ou com erro) — só aparece quando há algum. */
export async function CardVideos() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("aulas")
    .select("id, video_status")
    .in("video_status", ["processando", "erro"]);
  if (error || !data || data.length === 0) return null;

  const erros = data.filter((a) => a.video_status === "erro").length;
  return (
    <CartaoLink
      href="/master/conteudo"
      titulo="Vídeos das aulas"
      valor={String(data.length)}
      detalhe={
        erros > 0
          ? `${erros} com erro — abra a disciplina pra reenviar`
          : "Em processamento na transcodificação"
      }
      alerta={erros > 0}
    />
  );
}

/** Resumo de inscrições (hoje / 7 dias) — espelho da aba Relatórios. */
export async function CardInscricoes() {
  let hoje = 0;
  let semana = 0;
  try {
    const metricas = await obterMetricas(30);
    hoje = metricas.hoje;
    semana = metricas.semana;
  } catch {
    return null;
  }

  return (
    <CartaoLink
      href="/master/relatorios"
      titulo="Inscrições"
      valor={String(hoje)}
      detalhe={`Hoje · ${semana} nos últimos 7 dias`}
    />
  );
}
