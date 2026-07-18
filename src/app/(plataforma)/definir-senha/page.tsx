import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { DefinirSenhaForm } from "@/components/auth/definir-senha-form";

export const metadata: Metadata = {
  title: "Definir senha — CSMG",
  robots: { index: false, follow: false },
};

// O token chega na URL do convite (?token_hash=...&tipo=invite|recovery);
// a troca por sessão acontece no cliente, direto com o Supabase.
export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; tipo?: string }>;
}) {
  const parametros = await searchParams;
  return (
    <AuthShell
      titulo="Definir sua senha"
      subtitulo="Você recebeu um convite de acesso. Escolha a senha da sua conta."
    >
      <DefinirSenhaForm
        tokenHash={parametros.token_hash ?? null}
        tipo={parametros.tipo === "recovery" ? "recovery" : "invite"}
      />
    </AuthShell>
  );
}
