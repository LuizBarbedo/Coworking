"use client";

// Troca o token do convite por sessão (verifyOtp) e grava a senha escolhida.
// Usado pelo convite de monitor e reaproveitável como "esqueci a senha".

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function DefinirSenhaForm({
  tokenHash,
  tipo,
}: {
  tokenHash: string | null;
  tipo: "invite" | "recovery";
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!tokenHash) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        Link de convite inválido ou incompleto. Peça um novo convite a um
        administrador.
      </p>
    );
  }

  async function definir(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const senha = String(form.get("senha") ?? "");
    const confirmar = String(form.get("confirmar") ?? "");

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }

    setEnviando(true);
    setErro(null);
    const supabase = createSupabaseBrowserClient();
    const { error: erroToken } = await supabase.auth.verifyOtp({
      type: tipo,
      token_hash: tokenHash!,
    });
    if (erroToken) {
      setErro(
        "Este link expirou ou já foi usado. Peça um novo convite a um administrador.",
      );
      setEnviando(false);
      return;
    }
    const { error: erroSenha } = await supabase.auth.updateUser({
      password: senha,
    });
    if (erroSenha) {
      setErro("Não foi possível salvar a senha. Tente de novo.");
      setEnviando(false);
      return;
    }
    router.push("/master");
    router.refresh();
  }

  return (
    <form onSubmit={definir} className="space-y-4">
      <div>
        <label
          htmlFor="senha"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
          placeholder="Pelo menos 8 caracteres"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="confirmar"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Confirmar a senha
        </label>
        <input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      {erro ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {enviando ? "Salvando…" : "Salvar senha e entrar"}
      </button>
    </form>
  );
}
