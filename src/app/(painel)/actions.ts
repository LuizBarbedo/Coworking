"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  senhaConfere,
  abrirSessaoPainel,
  fecharSessaoPainel,
} from "@/lib/painel-auth";
import { criarLimitador } from "@/lib/limite-taxa";
import { ipDeCabecalhos } from "@/lib/ip-cliente";

export type PainelState = { error?: string } | undefined;

// O painel é senha única, sem conta: sem trava, dá pra tentar senha até
// acertar. 10 tentativas por IP a cada 15 min mantêm o uso normal (errar a
// senha uma ou duas vezes) e inviabilizam a força bruta.
const limitadorPainel = criarLimitador({ limite: 10, janelaMs: 15 * 60 * 1000 });

/** Valida a senha do painel e abre a sessão. */
export async function entrarPainel(
  _prev: PainelState,
  formData: FormData,
): Promise<PainelState> {
  const senha = String(formData.get("senha") ?? "");

  const ip = ipDeCabecalhos(await headers());
  if (!limitadorPainel.consumir(ip)) {
    console.warn(`Força bruta no painel barrada (${ip}).`);
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  if (!senha || !senhaConfere(senha)) {
    return { error: "Senha incorreta." };
  }

  await abrirSessaoPainel();
  redirect("/relatorios");
}

/** Encerra a sessão do painel. */
export async function sairPainel() {
  await fecharSessaoPainel();
  redirect("/relatorios");
}
