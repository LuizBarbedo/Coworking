"use client";

import { useFormStatus } from "react-dom";
import { RodaSpinner } from "@/components/marca/roda-spinner";

/**
 * Botão de submit que mostra "Enviando…" com um spinner enquanto a Server
 * Action roda. Útil em uploads (PDF/DOCX/XLSX), que levam um instante para
 * processar. Deve ficar dentro do <form>.
 */
export function BotaoEnviar({
  children,
  className,
  pendente = "Enviando…",
}: {
  children: React.ReactNode;
  className?: string;
  pendente?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 ${className ?? ""}`}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <RodaSpinner className="h-4 w-4" />
          {pendente}
        </>
      ) : (
        children
      )}
    </button>
  );
}
