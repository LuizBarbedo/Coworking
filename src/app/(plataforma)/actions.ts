"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registrarEvento } from "@/lib/auditoria";
import { turmaLiberada } from "@/lib/turmas";
import {
  buscarInscricaoPorEmail,
  buscarTurmaDaInscricao,
} from "@/lib/turmas-dados";

export type AuthState = { error?: string } | undefined;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Login do aluno já ativado (e-mail + senha). */
export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/painel") || "/painel";

  if (!EMAIL_REGEX.test(email) || password.length < 1) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Antes do erro genérico: quem é de turma que ainda não abriu não tem
    // conta nenhuma — explicar a espera vale mais que "senha incorreta".
    const inscricao = await buscarInscricaoPorEmail(email);
    if (
      inscricao &&
      !inscricao.ativadoEm &&
      !inscricao.selecionado &&
      inscricao.turma &&
      !turmaLiberada(inscricao.turma)
    ) {
      redirect(`/aguardando-liberacao?turma=${inscricao.turma.numero}`);
    }
    return { error: "E-mail ou senha incorretos." };
  }

  await registrarEvento({ acao: "sessao.login", atorId: data.user?.id });
  redirect(redirectTo.startsWith("/") ? redirectTo : "/painel");
}

/**
 * Primeiro acesso: o aluno selecionado cria sua conta definindo uma senha.
 * Valida a inscrição (matrícula + e-mail) e o status de seleção pelo cliente
 * administrativo (service_role) — anon não tem leitura da tabela de inscrições.
 */
export async function primeiroAcesso(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const matricula = String(formData.get("matricula") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (!EMAIL_REGEX.test(email)) {
    return { error: "E-mail inválido." };
  }
  if (!matricula) {
    return { error: "Informe o número de matrícula recebido na inscrição." };
  }
  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (password !== confirmar) {
    return { error: "As senhas não conferem." };
  }

  const admin = createSupabaseAdminClient();

  const { data: inscricao, error: buscaErro } = await admin
    .from("inscricoes")
    .select("id, nome, email, selecionado, ativado_em")
    .eq("matricula", matricula)
    .maybeSingle();

  if (buscaErro) {
    return { error: "Não foi possível validar sua inscrição. Tente novamente." };
  }

  // Mensagem genérica para matrícula+e-mail que não batem (evita enumeração).
  if (!inscricao || inscricao.email.toLowerCase() !== email) {
    return {
      error:
        "Não encontramos uma inscrição com essa matrícula e e-mail. Confira os dados.",
    };
  }

  if (!inscricao.selecionado) {
    const turma = await buscarTurmaDaInscricao(inscricao.id);
    if (turma && !turmaLiberada(turma)) {
      // Turma ainda fechada: a página de espera explica a data.
      redirect(`/aguardando-liberacao?turma=${turma.numero}`);
    }
    if (turma) {
      // Turma já aberta, mas o disparo de convites ainda não passou (ex.:
      // manhã do dia da liberação): seleciona na hora e a ativação segue —
      // o disparo depois pula quem já ativou.
      const { error: erroSelecao } = await admin
        .from("inscricoes")
        .update({ selecionado: true })
        .eq("id", inscricao.id);
      if (erroSelecao) {
        return {
          error:
            "Não foi possível validar sua inscrição. Tente novamente.",
        };
      }
    } else {
      // Sem informação de turma (migração 0023 pendente): comportamento
      // antigo — só entra quem foi selecionado.
      return {
        error:
          "Sua inscrição ainda não consta como selecionada para esta turma.",
      };
    }
  }

  if (inscricao.ativado_em) {
    return {
      error: "Esta conta já foi ativada. Use a tela de login para entrar.",
    };
  }

  const { error: criarErro } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome: inscricao.nome, matricula },
  });

  if (criarErro) {
    // Caso a conta de auth já exista por algum motivo.
    return {
      error:
        "Não foi possível criar sua conta. É possível que ela já exista — tente fazer login.",
    };
  }

  await admin
    .from("inscricoes")
    .update({ ativado_em: new Date().toISOString() })
    .eq("id", inscricao.id);
  await registrarEvento({
    acao: "conta.ativada",
    alvoTipo: "inscricao",
    alvoId: inscricao.id,
  });

  // Já autentica o aluno e grava a sessão nos cookies.
  const supabase = await createSupabaseServerClient();
  const { data: sessaoNova, error: loginErro } =
    await supabase.auth.signInWithPassword({ email, password });

  if (loginErro) {
    // Conta criada, mas falhou o login automático: manda para o login manual.
    redirect("/login");
  }

  // O primeiro acesso também é um login — sem isso o aluno que só entrou por
  // aqui aparecia como "nunca entrou" no relatório.
  await registrarEvento({
    acao: "sessao.login",
    atorId: sessaoNova.user?.id,
    detalhes: { primeiroAcesso: true },
  });
  redirect("/painel");
}

/** Encerra a sessão do aluno. */
export async function logout() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  await registrarEvento({ acao: "sessao.logout", atorId: user?.id });
  redirect("/login");
}
