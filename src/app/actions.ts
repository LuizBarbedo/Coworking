"use server";

import { getSupabase } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidCPF, unmaskCPF } from "@/lib/cpf";
import { isValidPhone, unmaskPhone } from "@/lib/phone";
import {
  enviarEmailConfirmacaoInscricao,
  enviarEmailConviteAluno,
  enviarEmailInscricaoAguardandoTurma,
} from "@/lib/email";
import { turmaLiberada, dataLiberacaoFormatada } from "@/lib/turmas";
import { buscarInscricaoComTurmaPorMatricula } from "@/lib/turmas-dados";
import { registrarConviteIndividual } from "@/lib/convites";
import { registrarEvento } from "@/lib/auditoria";
import { sanitizarOrigem, type Origem } from "@/lib/origem";
import { criarLimitador } from "@/lib/limite-taxa";
import { ipDeCabecalhos } from "@/lib/ip-cliente";
import { headers } from "next/headers";

// Trava de abuso do formulário público. A inscrição dispara e-mail na hora
// pro endereço digitado, então sem limite qualquer um usaria o formulário pra
// mandar e-mail em massa saindo do nosso remetente — queimando a reputação de
// entrega. 10/hora por IP passa longe do uso real (inclusive vários alunos na
// mesma rede) e corta rajada automatizada.
const LIMITE_INSCRICAO_POR_IP = 10;
const limitadorInscricao = criarLimitador({
  limite: LIMITE_INSCRICAO_POR_IP,
  janelaMs: 60 * 60 * 1000,
});

export type RegistrationPayload = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  /** Origem de tráfego (UTMs) capturada na landing — opcional. */
  origem?: Partial<Origem>;
};

export type RegistrationResult =
  | {
      ok: true;
      matricula: string;
      /** Presente quando a turma da inscrição ainda não abriu: a confirmação
       *  mostra a data em vez de prometer o e-mail de acesso imediato. */
      aguardandoTurma?: { nome: string; dataLiberacao: string };
    }
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

  // Só depois de validar os campos: erro de digitação não gasta cota, e a
  // cota só é consumida por tentativa que de fato gravaria e mandaria e-mail.
  const ip = ipDeCabecalhos(await headers());
  if (!limitadorInscricao.consumir(ip)) {
    console.warn(`Limite de inscrições por IP atingido (${ip}).`);
    return {
      ok: false,
      error:
        "Muitas inscrições enviadas deste acesso. Tente de novo mais tarde ou fale com a gente.",
    };
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

  // Turma da inscrição recém-criada (migração 0023). Consulta separada e
  // best-effort: sem a migração ela devolve null e tudo segue como sempre.
  const criada = await buscarInscricaoComTurmaPorMatricula(matricula as string);

  if (criada?.turma && !turmaLiberada(criada.turma)) {
    // Turma ainda fechada: NÃO seleciona nem convida — o convite de acesso
    // sai no disparo da data de liberação (aba E-mails). A confirmação de
    // agora só garante a vaga e informa a data.
    const nomeTurma = criada.turma.nome ?? `Turma ${criada.turma.numero}`;
    const dataLiberacao = dataLiberacaoFormatada(criada.turma);
    try {
      await enviarEmailInscricaoAguardandoTurma({
        nome,
        email,
        matricula: matricula as string,
        nomeTurma,
        dataLiberacao,
      });
      await registrarConviteIndividual({
        inscricaoId: criada.id,
        email,
        ok: true,
        tipo: "confirmacao_turma",
      });
    } catch (emailError) {
      console.error("Falha ao enviar e-mail da inscrição:", emailError);
      await registrarConviteIndividual({
        inscricaoId: criada.id,
        email,
        ok: false,
        erro:
          emailError instanceof Error ? emailError.message.slice(0, 500) : "erro",
        tipo: "confirmacao_turma",
      });
    }
    await registrarEvento({
      acao: "inscricao.criada",
      atorPapel: "sistema",
      alvoTipo: "inscricao",
      alvoId: criada.id,
      detalhes: {
        liberadaAutomaticamente: false,
        turma: criada.turma.numero,
        aguardandoLiberacao: true,
      },
    });
    return {
      ok: true,
      matricula: matricula as string,
      aguardandoTurma: { nome: nomeTurma, dataLiberacao },
    };
  }

  // Turma liberada (ou migração pendente): quem se inscreve já entra — a
  // inscrição nasce liberada e o e-mail traz as instruções de acesso
  // (matrícula + primeiro acesso). Se a liberação falhar, cai no e-mail de
  // confirmação antigo e a pessoa entra pela liberação manual da aba E-mails.
  const admin = createSupabaseAdminClient();
  const { data: liberada } = await admin
    .from("inscricoes")
    .update({ selecionado: true })
    .eq("matricula", matricula as string)
    .select("id")
    .maybeSingle();

  try {
    if (liberada) {
      await enviarEmailConviteAluno({
        nome,
        email,
        matricula: matricula as string,
      });
      await registrarConviteIndividual({
        inscricaoId: liberada.id,
        email,
        ok: true,
      });
    } else {
      await enviarEmailConfirmacaoInscricao({
        nome,
        email,
        matricula: matricula as string,
      });
    }
  } catch (emailError) {
    console.error("Falha ao enviar e-mail da inscrição:", emailError);
    if (liberada) {
      await registrarConviteIndividual({
        inscricaoId: liberada.id,
        email,
        ok: false,
        erro: emailError instanceof Error ? emailError.message.slice(0, 500) : "erro",
      });
    }
  }

  await registrarEvento({
    acao: "inscricao.criada",
    atorPapel: "sistema",
    alvoTipo: "inscricao",
    alvoId: liberada?.id ?? null,
    detalhes: { liberadaAutomaticamente: Boolean(liberada) },
  });

  return { ok: true, matricula: matricula as string };
}
