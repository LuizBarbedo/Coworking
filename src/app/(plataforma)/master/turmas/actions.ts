"use server";

// Gestão de turmas (migração 0023) — só admin. A data de liberação é o
// interruptor do acesso: os gates comparam com o relógio, então salvar a
// data muda o comportamento na hora (sem cron). O e-mail de convite continua
// saindo pelo botão da aba E-mails.

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import type { AcaoState } from "@/lib/acao";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { timestampDeSaoPaulo } from "@/lib/datas";
import { registrarEvento } from "@/lib/auditoria";
import { dataLiberacaoFormatada } from "@/lib/turmas";

function lerDataDoForm(formData: FormData):
  | { ok: true; liberacao: string | null }
  | { ok: false } {
  const bruto = String(formData.get("liberacao") ?? "").trim();
  if (!bruto) return { ok: true, liberacao: null };
  const liberacao = timestampDeSaoPaulo(bruto);
  return liberacao ? { ok: true, liberacao } : { ok: false };
}

/** Salva a data de liberação de uma turma (vazio = liberada agora). */
export async function salvarTurma(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const executor = await exigirAdmin();
  const numero = Number(formData.get("numero"));
  if (!Number.isInteger(numero) || numero < 1) {
    return { error: "Turma inválida." };
  }
  const data = lerDataDoForm(formData);
  if (!data.ok) return { error: "Data de liberação inválida." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("turmas")
    .update({ liberacao_em: data.liberacao })
    .eq("numero", numero);
  if (error) return { error: "Não foi possível salvar a turma." };

  await registrarEvento({
    acao: "turma.alterada",
    atorId: executor.id,
    atorPapel: "equipe",
    alvoTipo: "turma",
    detalhes: { numero, liberacaoEm: data.liberacao },
  });
  revalidatePath("/master/turmas");
  revalidatePath("/master/alunos");
  return {
    ok: data.liberacao
      ? `Turma ${numero}: acesso abre em ${dataLiberacaoFormatada({
          numero,
          liberacao_em: data.liberacao,
        })}.`
      : `Turma ${numero} liberada — o acesso já está aberto.`,
  };
}

/**
 * Cria a próxima turma (max + 1). ATENÇÃO: a partir daí toda inscrição nova
 * cai nela (default turma_atual() no banco) — crie só quando a virada for
 * pra valer.
 */
export async function criarTurma(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const executor = await exigirAdmin();
  const data = lerDataDoForm(formData);
  if (!data.ok) return { error: "Data de liberação inválida." };

  const admin = createSupabaseAdminClient();
  const { data: existentes, error: erroLista } = await admin
    .from("turmas")
    .select("numero");
  if (erroLista) {
    return { error: "A migração 0023 (turmas) já foi aplicada no Supabase?" };
  }

  const numero =
    Math.max(0, ...(existentes ?? []).map((t) => t.numero as number)) + 1;
  const { error } = await admin
    .from("turmas")
    .insert({ numero, nome: `Turma ${numero}`, liberacao_em: data.liberacao });
  if (error) return { error: "Não foi possível criar a turma." };

  await registrarEvento({
    acao: "turma.criada",
    atorId: executor.id,
    atorPapel: "equipe",
    alvoTipo: "turma",
    detalhes: { numero, liberacaoEm: data.liberacao },
  });
  revalidatePath("/master/turmas");
  revalidatePath("/master/alunos");
  return {
    ok: `Turma ${numero} criada — inscrições novas caem nela a partir de agora.`,
  };
}
