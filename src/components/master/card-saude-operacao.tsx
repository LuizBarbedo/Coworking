// Card "Saúde da operação" do Início (só admin): batimentos do backup e do
// espelho pra nuvem (tabela ops_heartbeats, 0025) + latência do banco medida
// na hora. Sem a migração, mostra só a latência — os batimentos aparecem
// como "sem registro" a partir da primeira rodada do cron.

import { avaliarHeartbeats, type Heartbeat } from "@/lib/ops-saude";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const COR_ESTADO = {
  ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  atrasado: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  falhou: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  "sem-registro": "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
} as const;

const ROTULO_ESTADO = {
  ok: "ok",
  atrasado: "atrasado",
  falhou: "falhou",
  "sem-registro": "sem registro",
} as const;

/** Uma query trivial cronometrada — a latência real que o app está vendo. */
async function medirBanco(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<{ ok: boolean; ms: number }> {
  const inicio = Date.now();
  const { error } = await admin.from("inscricoes").select("id").limit(1);
  return { ok: !error, ms: Date.now() - inicio };
}

function formatarQuando(iso: string | null): string {
  if (!iso) return "nunca rodou (ou a 0025 acabou de entrar)";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export async function CardSaudeOperacao() {
  const admin = createSupabaseAdminClient();

  const banco = await medirBanco(admin);
  // Banco fora do ar: o resto da página já terá quebrado antes deste card.
  if (!banco.ok) return null;
  const bancoMs = banco.ms;

  const heartbeatsRes = await admin
    .from("ops_heartbeats")
    .select("id, ok, detalhes, atualizado_em");
  const batimentos = avaliarHeartbeats(
    heartbeatsRes.error ? [] : ((heartbeatsRes.data ?? []) as Heartbeat[]),
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
          Saúde da operação
        </h2>
        <p className="text-xs text-slate-400">
          Banco respondendo em{" "}
          <span className="font-medium text-slate-500">{bancoMs} ms</span>
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {batimentos.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="text-slate-600 dark:text-slate-300">{b.rotulo}</span>
            <span className="flex items-center gap-2 text-xs text-slate-400">
              {b.detalhes ? <span className="max-w-48 truncate">{b.detalhes}</span> : null}
              <span>{formatarQuando(b.atualizadoEm)}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${COR_ESTADO[b.estado]}`}
              >
                {ROTULO_ESTADO[b.estado]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
