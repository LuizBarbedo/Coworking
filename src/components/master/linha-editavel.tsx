"use client";

import { useState } from "react";

/**
 * Linha de item (aula/material/pergunta) com os botões "Editar" e "Excluir"
 * lado a lado. Ao clicar em Editar, o formulário (server-rendered) aparece
 * abaixo. `excluir` e `formulario` são nós vindos do Server Component.
 */
export function LinhaEditavel({
  resumo,
  excluir,
  formulario,
}: {
  resumo: React.ReactNode;
  excluir: React.ReactNode;
  formulario: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{resumo}</div>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 active:scale-[0.98] dark:text-brand-300 dark:hover:bg-brand-900/40"
          >
            {aberto ? "Fechar" : "Editar"}
          </button>
          {excluir}
        </div>
      </div>
      {aberto ? <div className="mt-3">{formulario}</div> : null}
    </div>
  );
}
