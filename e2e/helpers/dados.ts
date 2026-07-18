// Dados de teste dos E2E. Tudo que os specs criam é identificável (e-mails
// e2e-*@example.com, utm_source=e2e) e apagado no teardown — os E2E rodam
// contra o banco configurado no .env.local, que não tem ambiente separado.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const DOMINIO_TESTE = "example.com";
export const PREFIXO_TESTE = "e2e-";
export const UTM_TESTE = "e2e";

/** Carrega o .env.local na mão (mesmo padrão dos scripts de seed). */
function carregarEnv(): Record<string, string> {
  // O Playwright roda a partir da raiz do projeto.
  return Object.fromEntries(
    readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

export function criarAdmin(): SupabaseClient {
  const env = carregarEnv();
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** E-mail de teste único e reconhecível pela limpeza. */
export function emailDeTeste(rotulo: string): string {
  return `${PREFIXO_TESTE}${rotulo}-${Date.now()}@${DOMINIO_TESTE}`;
}

/** CPF matematicamente válido (dígitos verificadores corretos), único. */
export function gerarCpfValido(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (nums: number[]) => {
    const soma = nums.reduce(
      (acc, n, i) => acc + n * (nums.length + 1 - i),
      0,
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  const cpf = [...base, d1, d2].join("");
  // CPFs de dígitos todos iguais são rejeitados pela validação — regenera.
  return /^(\d)\1{10}$/.test(cpf) ? gerarCpfValido() : cpf;
}

/**
 * Aluno pronto pra logar: inscrição selecionada + conta de auth com senha.
 * Usado pelo setup (storageState) e pelos specs autenticados.
 */
export async function criarAlunoAtivado(
  email: string,
  senha: string,
): Promise<void> {
  const admin = criarAdmin();
  const { error: erroInscricao } = await admin.from("inscricoes").insert({
    nome: "Aluno E2E",
    cpf: gerarCpfValido(),
    email,
    telefone: "21999999999",
    selecionado: true,
    ativado_em: new Date().toISOString(),
  });
  if (erroInscricao) {
    throw new Error(`Falha ao criar inscrição de teste: ${erroInscricao.message}`);
  }
  const { error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Aluno E2E" },
  });
  if (erroAuth) {
    throw new Error(`Falha ao criar conta de teste: ${erroAuth.message}`);
  }
}

/**
 * Membro da equipe (admin ou monitor com permissões) pronto pra logar —
 * pro spec dos níveis de acesso da administração.
 */
export async function criarMembroEquipe(
  email: string,
  senha: string,
  nivel: "admin" | "monitor",
  permissoes: string[] = [],
): Promise<void> {
  const admin = criarAdmin();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nivel === "admin" ? "Admin E2E" : "Monitor E2E" },
    app_metadata: { role: "master", nivel, permissoes },
  });
  if (error) {
    throw new Error(`Falha ao criar membro de equipe: ${error.message}`);
  }
}

/** true se a migração 0016 (perfis) já foi aplicada no banco. */
export async function perfilDisponivel(): Promise<boolean> {
  const admin = criarAdmin();
  const { error } = await admin.from("perfis").select("aluno_id").limit(1);
  return !error;
}

/** true se a migração 0015 (fórum) já foi aplicada no banco. */
export async function forumDisponivel(): Promise<boolean> {
  const admin = criarAdmin();
  // GET de verdade (HEAD não devolve o erro de tabela inexistente).
  const { error } = await admin.from("forum_posts").select("id").limit(1);
  return !error;
}

/**
 * Modera um post de teste direto no banco (aprova/rejeita) — pros specs que
 * não são sobre a moderação em si não dependerem do veredito da IA.
 */
export async function moderarPostDeTeste(
  postId: string,
  status: "aprovado" | "rejeitado",
  motivo?: string,
): Promise<void> {
  const admin = criarAdmin();
  const { error } = await admin
    .from("forum_posts")
    .update({
      status,
      motivo_rejeicao: status === "rejeitado" ? (motivo ?? null) : null,
    })
    .eq("id", postId);
  if (error) {
    throw new Error(`Falha ao moderar post de teste: ${error.message}`);
  }
}

/**
 * Aluno selecionado mas SEM conta — pro spec exercitar o /primeiro-acesso.
 * Devolve a matrícula gerada pelo banco.
 */
export async function criarAlunoSemAtivacao(email: string): Promise<string> {
  const admin = criarAdmin();
  const { data, error } = await admin
    .from("inscricoes")
    .insert({
      nome: "Aluno E2E Primeiro Acesso",
      cpf: gerarCpfValido(),
      email,
      telefone: "21999999999",
      selecionado: true,
    })
    .select("matricula")
    .single();
  if (error || !data) {
    throw new Error(`Falha ao criar inscrição de teste: ${error?.message}`);
  }
  return data.matricula as string;
}

/** Apaga tudo que os E2E criaram (contas, inscrições, visitas marcadas). */
export async function limparDadosDeTeste(): Promise<void> {
  const admin = criarAdmin();

  // Contas de auth dos e-mails de teste (progresso/tentativas caem junto
  // quando houver FK; os agregados do painel não guardam nada por aluno).
  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const usuario of lista?.users ?? []) {
    const email = usuario.email?.toLowerCase() ?? "";
    if (email.startsWith(PREFIXO_TESTE) && email.endsWith(`@${DOMINIO_TESTE}`)) {
      await admin.auth.admin.deleteUser(usuario.id);
    }
  }

  await admin
    .from("inscricoes")
    .delete()
    .like("email", `${PREFIXO_TESTE}%@${DOMINIO_TESTE}`);

  // Visitas marcadas pelos specs (a migration 0013 pode não estar aplicada —
  // tabela ausente é tolerada).
  await admin.from("visitas_landing").delete().eq("utm_source", UTM_TESTE);
}
