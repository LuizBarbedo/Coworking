"use server";

import { getSupabase } from "@/lib/supabase";
import { isValidCPF, unmaskCPF } from "@/lib/cpf";
import { isValidPhone, unmaskPhone } from "@/lib/phone";

export type RegistrationPayload = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
};

export type RegistrationResult =
  | { ok: true; matricula: string }
  | { ok: false; error: string; field?: keyof RegistrationPayload };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { data: matricula, error } = await getSupabase().rpc(
    "criar_inscricao",
    {
      p_nome: nome,
      p_cpf: cpf,
      p_email: email,
      p_telefone: telefone,
    },
  );

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

  return { ok: true, matricula: matricula as string };
}
