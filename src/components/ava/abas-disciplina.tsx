"use client";

import { useState } from "react";

type Aba = "aulas" | "materiais" | "avaliacao" | "assistente";

export function AbasDisciplina({
  aulas,
  materiais,
  avaliacao,
  assistente,
  contadores,
}: {
  aulas: React.ReactNode;
  materiais: React.ReactNode;
  avaliacao: React.ReactNode;
  assistente: React.ReactNode;
  contadores: { aulas: number; materiais: number };
}) {
  const [ativa, setAtiva] = useState<Aba>("aulas");

  const abas: { id: Aba; label: string; count?: number }[] = [
    { id: "aulas", label: "Aulas", count: contadores.aulas },
    { id: "materiais", label: "Materiais", count: contadores.materiais },
    { id: "avaliacao", label: "Avaliação final" },
    { id: "assistente", label: "Tirar dúvidas (IA)" },
  ];

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-slate-200"
      >
        {abas.map((aba) => {
          const ativo = ativa === aba.id;
          return (
            <button
              key={aba.id}
              role="tab"
              aria-selected={ativo}
              type="button"
              onClick={() => setAtiva(aba.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                ativo
                  ? "border-brand-600 text-brand-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {aba.label}
              {typeof aba.count === "number" ? (
                <span className="ml-1.5 text-xs text-slate-400">
                  {aba.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {ativa === "aulas" ? aulas : null}
        {ativa === "materiais" ? materiais : null}
        {ativa === "avaliacao" ? avaliacao : null}
        {ativa === "assistente" ? assistente : null}
      </div>
    </div>
  );
}
