"use server";

// Gestão da equipe e cadastro manual de alunos — só admins. Contas e
// permissões vivem no Auth (app_metadata, service_role); aluno manual entra
// pela mesma porta do público: inscrição selecionada + primeiro acesso.

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import {
  lerSessaoEquipe,
  PERMISSOES,
  type Permissao,
} from "@/lib/permissoes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  enviarEmailConviteAluno,
  enviarEmailConviteMonitor,
} from "@/lib/email";
import { isValidCPF, unmaskCPF } from "@/lib/cpf";
import { isValidPhone, unmaskPhone } from "@/lib/phone";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EquipeState = { ok: string } | { error: string } | undefined;

function lerPermissoesDoForm(formData: FormData): Permissao[] {
  return formData
    .getAll("permissoes")
    .map(String)
    .filter((p): p is Permissao =>
      (PERMISSOES as readonly string[]).includes(p),
    );
}

/** Link de definição de senha (uso único) pro e-mail de convite. */
async function montarLinkConvite(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) return null;
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://coworkingsocial.com.br";
  return `${site}/definir-senha?token_hash=${hash}&tipo=recovery`;
}

export async function cadastrarMonitor(
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  await exigirAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const permissoes = lerPermissoesDoForm(formData);

  if (nome.length < 2) return { error: "Informe o nome do monitor." };
  if (!EMAIL_REGEX.test(email)) return { error: "E-mail inválido." };

  const admin = createSupabaseAdminClient();
  // Conta nasce sem senha: o convite (link de uso único) é que define.
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome },
    app_metadata: { role: "master", nivel: "monitor", permissoes },
  });
  if (error) {
    return {
      error: error.code === "email_exists"
        ? "Já existe uma conta com esse e-mail."
        : "Não foi possível criar a conta do monitor.",
    };
  }

  revalidatePath("/master/equipe");
  const link = await montarLinkConvite(admin, email);
  if (!link) {
    return {
      ok: "Conta criada, mas o convite falhou — use o botão de reenviar.",
    };
  }
  try {
    await enviarEmailConviteMonitor({ nome, email, linkConvite: link });
  } catch {
    return {
      ok: "Conta criada, mas o e-mail falhou — use o botão de reenviar.",
    };
  }
  return { ok: `Convite enviado pra ${email}.` };
}

export async function reenviarConviteMonitor(
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  await exigirAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Conta inválida." };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const usuario = data?.user;
  if (error || !usuario?.email) return { error: "Conta não encontrada." };

  const link = await montarLinkConvite(admin, usuario.email);
  if (!link) return { error: "Não foi possível gerar o link do convite." };
  try {
    await enviarEmailConviteMonitor({
      nome: (usuario.user_metadata as { nome?: string })?.nome ?? "colega",
      email: usuario.email,
      linkConvite: link,
    });
  } catch {
    return { error: "Falha ao enviar o e-mail do convite." };
  }
  return { ok: `Convite reenviado pra ${usuario.email}.` };
}

export async function atualizarPermissoesMonitor(
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  await exigirAdmin();
  const userId = String(formData.get("userId") ?? "");
  const permissoes = lerPermissoesDoForm(formData);
  if (!userId) return { error: "Conta inválida." };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return { error: "Conta não encontrada." };
  // Admin não é editável por aqui — só monitores.
  if (lerSessaoEquipe(data.user.app_metadata)?.nivel !== "monitor") {
    return { error: "Só as permissões de monitores podem ser alteradas." };
  }

  const { error: erroUpdate } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: "master", nivel: "monitor", permissoes },
  });
  if (erroUpdate) return { error: "Não foi possível salvar as permissões." };

  revalidatePath("/master/equipe");
  return { ok: "Permissões salvas." };
}

export async function removerMonitor(
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  await exigirAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Conta inválida." };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return { error: "Conta não encontrada." };
  if (lerSessaoEquipe(data.user.app_metadata)?.nivel !== "monitor") {
    return { error: "Contas de admin não são removíveis por aqui." };
  }

  // Tira da equipe sem apagar a conta (histórico e acesso de aluno ficam).
  const { error: erroUpdate } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: null, nivel: null, permissoes: null },
  });
  if (erroUpdate) return { error: "Não foi possível remover o monitor." };

  revalidatePath("/master/equipe");
  return { ok: "Monitor removido da equipe." };
}

export async function cadastrarAluno(
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  await exigirAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = unmaskCPF(String(formData.get("cpf") ?? ""));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const telefone = unmaskPhone(String(formData.get("telefone") ?? ""));

  if (nome.length < 2) return { error: "Informe o nome do aluno." };
  if (!isValidCPF(cpf)) return { error: "CPF inválido." };
  if (!EMAIL_REGEX.test(email)) return { error: "E-mail inválido." };
  if (!isValidPhone(telefone)) return { error: "Telefone inválido." };

  const admin = createSupabaseAdminClient();
  // Mesma porta do público: inscrição já selecionada; matrícula vem do
  // default da coluna; o aluno define a senha no /primeiro-acesso.
  const { data, error } = await admin
    .from("inscricoes")
    .insert({ nome, cpf, email, telefone, selecionado: true })
    .select("matricula")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe inscrição com esse CPF ou e-mail."
          : "Não foi possível cadastrar o aluno.",
    };
  }

  revalidatePath("/master/equipe");
  try {
    await enviarEmailConviteAluno({
      nome,
      email,
      matricula: data.matricula as string,
    });
  } catch {
    return {
      ok: `Aluno cadastrado (matrícula ${data.matricula}), mas o e-mail falhou — use o reenvio.`,
    };
  }
  return { ok: `Aluno cadastrado — convite enviado pra ${email}.` };
}

export async function reenviarConviteAluno(
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  await exigirAdmin();
  const inscricaoId = String(formData.get("inscricaoId") ?? "");
  if (!inscricaoId) return { error: "Inscrição inválida." };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("inscricoes")
    .select("nome, email, matricula, ativado_em, selecionado")
    .eq("id", inscricaoId)
    .single();

  if (error || !data) return { error: "Inscrição não encontrada." };
  if (!data.selecionado) return { error: "Inscrição ainda não selecionada." };
  if (data.ativado_em) return { error: "Esse aluno já ativou a conta." };

  try {
    await enviarEmailConviteAluno({
      nome: data.nome,
      email: data.email,
      matricula: data.matricula,
    });
  } catch {
    return { error: "Falha ao enviar o e-mail do convite." };
  }
  return { ok: `Convite reenviado pra ${data.email}.` };
}
