// Selos do fórum: tipo do post e status de moderação (visível pro autor).

export function BadgeTipo({ tipo }: { tipo: "duvida" | "enquete" }) {
  return tipo === "enquete" ? (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
      Enquete
    </span>
  ) : (
    <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200">
      Dúvida
    </span>
  );
}

export function BadgeStatus({
  status,
}: {
  status: "pendente" | "aprovado" | "rejeitado";
}) {
  if (status === "aprovado") return null;
  return status === "pendente" ? (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
      Em análise
    </span>
  ) : (
    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
      Não aprovado
    </span>
  );
}

export function BadgeEquipe() {
  return (
    <span className="rounded bg-brand-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-brand-100 dark:text-brand-900">
      Equipe
    </span>
  );
}

export function BadgeSolucao() {
  return (
    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
      ✓ Solução
    </span>
  );
}
