"use client";

import { useFormStatus } from "react-dom";

/**
 * Botão de submit que mostra "Enviando…" enquanto a Server Action roda. Útil em
 * uploads (PDF/DOCX/XLSX), que levam um instante para processar. Deve ficar
 * dentro do <form>.
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
      className={className}
      aria-busy={pending}
    >
      {pending ? pendente : children}
    </button>
  );
}
