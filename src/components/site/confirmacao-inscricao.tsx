"use client";

// Confirmação da inscrição na página de conversão. A matrícula chega por
// sessionStorage (gravada pelo formulário); acesso direto sem inscrição
// mostra a mensagem genérica.

import { useEffect, useState } from "react";
import Link from "next/link";

export const CHAVE_MATRICULA = "csmg-matricula";

export function ConfirmacaoInscricao() {
  const [matricula, setMatricula] = useState<string | null>(null);

  useEffect(() => {
    // Adiado pra fora do render do effect (regra react-hooks do projeto).
    const timer = setTimeout(() => {
      try {
        setMatricula(sessionStorage.getItem(CHAVE_MATRICULA));
      } catch {
        // sessionStorage indisponível: segue sem a matrícula (vai por e-mail)
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="animate-escalar rounded-2xl border border-brand-200 bg-superficie p-8 shadow-sm dark:border-brand-700">
      <h1 className="font-display text-2xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Inscrição recebida!
      </h1>
      <p className="mt-3 text-brand-800/80 dark:text-brand-100/80">
        Em breve você receberá no seu e-mail os próximos passos para acessar
        os cursos.
      </p>
      {matricula ? (
        <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-700 dark:bg-brand-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-800/70 dark:text-brand-100/70">
            Seu número de matrícula
          </p>
          <p className="mt-2 inline-block rounded-lg bg-ambar-100/60 px-3 py-2 font-display text-2xl font-bold tracking-wide text-brand-900 dark:bg-brand-800 dark:text-brand-100">
            {matricula}
          </p>
          <p className="mt-2 text-xs text-brand-800/70 dark:text-brand-100/70">
            Guarde este número: ele identifica você na plataforma.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-brand-800/70 dark:text-brand-100/70">
          Sua matrícula foi enviada pro seu e-mail.
        </p>
      )}
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium text-brand-700 underline-offset-4 transition hover:underline dark:text-brand-300"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
