// Pílulas de filtro por turma, compartilhadas entre as visões dos
// relatórios. Fail-open: sem turmas (migração 0023 ausente) não renderiza
// nada e nenhum recorte é aplicado.

import Link from "next/link";
import type { Turma } from "@/lib/turmas";

export function FiltroTurma({
  turmas,
  turmaAtiva,
  hrefPara,
}: {
  turmas: Turma[];
  turmaAtiva: number | null;
  /** Monta o link de cada pílula preservando os demais filtros da tela. */
  hrefPara: (turma: number | null) => string;
}) {
  if (turmas.length === 0) return null;

  const opcoes = [{ valor: null as number | null, rotulo: "Todas as turmas" }].concat(
    turmas.map((t) => ({
      valor: t.numero as number | null,
      rotulo: t.nome ?? `Turma ${t.numero}`,
    })),
  );

  return (
    <nav aria-label="Filtro de turma" className="flex flex-wrap gap-1.5">
      {opcoes.map((t) => (
        <Link
          key={t.rotulo}
          href={hrefPara(t.valor)}
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
  );
}
