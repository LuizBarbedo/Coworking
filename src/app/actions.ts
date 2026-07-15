"use server";

import { getSupabase } from "@/lib/supabase";
import { isValidCPF, unmaskCPF } from "@/lib/cpf";
import { isValidPhone, unmaskPhone } from "@/lib/phone";
import { enviarEmailConfirmacaoInscricao } from "@/lib/email";
import { sanitizarOrigem, type Origem } from "@/lib/origem";

export type RegistrationPayload = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  /** Origem de tráfego (UTMs) capturada na landing — opcional. */
  origem?: Partial<Origem>;
};

export type RegistrationResult =
  | { ok: true; matricula: string }
  | { ok: false; error: string; field?: keyof RegistrationPayload };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Conta uma visita à landing (anônima: só data + UTMs, nenhum dado pessoal).
 * Nunca propaga erro — medição não pode atrapalhar a página; sem a migração
 * 0013 a RPC não existe e a chamada é simplesmente ignorada.
 */
export async function registrarVisita(
  origem: Partial<Origem> | null | undefined,
): Promise<void> {
  const { source, medium, campaign } = sanitizarOrigem(origem);
  const { error } = await getSupabase().rpc("registrar_visita", {
    p_utm_source: source,
    p_utm_medium: medium,
    p_utm_campaign: campaign,
  });
  // PGRST202 = RPC ainda não existe (migração pendente) — silencioso.
  if (error && error.code !== "PGRST202") {
    console.error("Falha ao registrar visita da landing:", error.message);
  }
}

export async function registerInscription(
  data: RegistrationPayload,
): Promise<RegistrationResult> {
  const nome = data.nome?.trim() ?? "";
  if (nome.length < 3) {
    return { ok: false, error: "Informe seu nome completo.", field: "nome" };
  }

  const cpf = unmaskCPF(data.cpf ?? "");
  if (!isValidCPF(cpf)) {
    return { ok: false, error: "CPF inválido.", field: "cpf" };
  }

  const email = (data.email ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "E-mail inválido.", field: "email" };
  }

  const telefone = unmaskPhone(data.telefone ?? "");
  if (!isValidPhone(telefone)) {
    return { ok: false, error: "Telefone inválido.", field: "telefone" };
  }

  const origem = sanitizarOrigem(data.origem);
  const comOrigem = origem.source || origem.medium || origem.campaign;

  let { data: matricula, error } = await getSupabase().rpc("criar_inscricao", {
    p_nome: nome,
    p_cpf: cpf,
    p_email: email,
    p_telefone: telefone,
    ...(comOrigem
      ? {
          p_utm_source: origem.source,
          p_utm_medium: origem.medium,
          p_utm_campaign: origem.campaign,
        }
      : {}),
  });

  // Migração 0012 ainda não aplicada: a função só existe com 4 parâmetros.
  // Refaz a chamada sem a origem pra não perder a inscrição.
  if (error?.code === "PGRST202" && comOrigem) {
    ({ data: matricula, error } = await getSupabase().rpc("criar_inscricao", {
      p_nome: nome,
      p_cpf: cpf,
      p_email: email,
      p_telefone: telefone,
    }));
  }

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Já existe uma inscrição com esse CPF ou e-mail.",
      };
    }
    return {
      ok: false,
      error: "Não foi possível concluir a inscrição. Tente novamente.",
    };
  }

  try {
    await enviarEmailConfirmacaoInscricao({
      nome,
      email,
      matricula: matricula as string,
    });
  } catch (emailError) {
    console.error("Falha ao enviar e-mail de confirmação de inscrição:", emailError);
  }

  return { ok: true, matricula: matricula as string };
}
