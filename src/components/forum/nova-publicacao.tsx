"use client";

// Junta o formulário de criação com o painel de deflection (posts
// parecidos + assistente), que reage ao título digitado.

import { useState } from "react";
import { FormPost, type DisciplinaOpcao } from "@/components/forum/form-post";
import { Deflection } from "@/components/forum/deflection";

export function NovaPublicacao({
  disciplinas,
  disciplinaInicial,
}: {
  disciplinas: DisciplinaOpcao[];
  disciplinaInicial?: string;
}) {
  const [titulo, setTitulo] = useState("");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <FormPost
        disciplinas={disciplinas}
        disciplinaInicial={disciplinaInicial}
        aoMudarTitulo={setTitulo}
      />
      <aside>
        <Deflection titulo={titulo} />
      </aside>
    </div>
  );
}
