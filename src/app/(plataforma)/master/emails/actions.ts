"use server";

// Ações da aba E-mails — admin ou monitor com a permissão gerenciar_emails.
// Disparo em massa, retomada de falhas e checagem de devoluções, sempre com
// registro em envios_email.

import { revalidatePath } from "next/cache";
import { exigirPermissao } from "@/lib/auth";
import type { AcaoState } from "@/lib/acao";
import { liberarEDispararConvites, verificarDevolucoes } from "@/lib/convites";

export async function dispararConvites(
  _prev: AcaoState,
  _formData: FormData,
): Promise<AcaoState> {
  await exigirPermissao("gerenciar_emails");
  try {
    const r = await liberarEDispararConvites({ apenasSemConvite: true });
    revalidatePath("/master/emails");
    return {
      ok: `Liberadas ${r.liberadas} inscrições · ${r.enviados} convites enviados · ${r.falhas} falhas · ${r.pulados} já tinham convite.${
        r.aguardandoTurma > 0
          ? ` ${r.aguardandoTurma} aguardando a turma abrir (fora do disparo).`
          : ""
      }`,
    };
  } catch (erro) {
    return {
      error:
        erro instanceof Error && erro.message.includes("envios_email")
          ? "A migração 0020 (registro de e-mails) já foi aplicada no Supabase?"
          : "O disparo falhou no meio — veja o registro abaixo e rode de novo (quem já recebeu não recebe duplicado).",
    };
  }
}

export async function conferirDevolucoes(
  _prev: AcaoState,
  _formData: FormData,
): Promise<AcaoState> {
  await exigirPermissao("gerenciar_emails");
  try {
    const marcados = await verificarDevolucoes();
    revalidatePath("/master/emails");
    return {
      ok:
        marcados === 0
          ? "Nenhuma devolução nova na caixa do Gmail."
          : `${marcados} envio(s) marcados como devolvidos.`,
    };
  } catch {
    return { error: "Não foi possível ler a caixa do Gmail (IMAP)." };
  }
}
