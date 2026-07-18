"use client";

import { useActionState, useState } from "react";
import {
  cadastrarAluno,
  type EquipeState,
} from "@/app/(plataforma)/master/equipe/actions";
import { maskCPF } from "@/lib/cpf";
import { maskPhone } from "@/lib/phone";
import { MensagemEquipe } from "@/components/master/form-cadastrar-monitor";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function FormCadastrarAluno() {
  const [state, action, pending] = useActionState<EquipeState, FormData>(
    cadastrarAluno,
    undefined,
  );
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");

  return (
    <form action={action} className="space-y-3">
      <div>
        <label
          htmlFor="aluno-nome"
          className="mb-1 block text-xs font-medium text-slate-500"
        >
          Nome completo
        </label>
        <input
          id="aluno-nome"
          name="nome"
          type="text"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="aluno-cpf"
          className="mb-1 block text-xs font-medium text-slate-500"
        >
          CPF
        </label>
        <input
          id="aluno-cpf"
          name="cpf"
          type="text"
          inputMode="numeric"
          required
          value={cpf}
          onChange={(e) => setCpf(maskCPF(e.target.value))}
          placeholder="000.000.000-00"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="aluno-email"
          className="mb-1 block text-xs font-medium text-slate-500"
        >
          E-mail
        </label>
        <input
          id="aluno-email"
          name="email"
          type="email"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="aluno-telefone"
          className="mb-1 block text-xs font-medium text-slate-500"
        >
          Telefone
        </label>
        <input
          id="aluno-telefone"
          name="telefone"
          type="tel"
          inputMode="numeric"
          required
          value={telefone}
          onChange={(e) => setTelefone(maskPhone(e.target.value))}
          placeholder="(00) 00000-0000"
          className={inputClass}
        />
      </div>

      <MensagemEquipe state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Cadastrando…" : "Cadastrar e convidar"}
      </button>
    </form>
  );
}
