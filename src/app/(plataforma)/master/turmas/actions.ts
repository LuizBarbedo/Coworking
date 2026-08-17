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
 * Salva o plano de liberação de conteúdo de uma turma (migração 0026):
 * quais módulos ela já enxerga, quais abrem em data marcada e quais ficam
 * fechados. Quem esconde o conteúdo é o RLS — aqui só se escreve o plano.
 */
export async function salvarLiberacaoConteudo(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const executor = await exigirAdmin();
  const numero = Number(formData.get("numero"));
  if (!Number.isInteger(numero) || numero < 1) {
    return { error: "Turma inválida." };
  }
  const restrito = formData.get("restrito") === "on";

  const admin = createSupabaseAdminClient();
  const { data: modulos, error: erroModulos } = await admin
    .from("modulos")
    .select("id, titulo, ordem")
    .order("ordem", { ascending: true });
  if (erroModulos) return { error: "Não foi possível ler os módulos." };

  const agora = new Date().toISOString();
  const linhas: { turma: number; modulo_id: string; liberacao_em: string | null }[] =
    [];
  for (const modulo of modulos ?? []) {
    const id = modulo.id as string;
    const estado = String(formData.get(`estado-${id}`) ?? "");
    if (!estado) continue; // módulo criado depois que a página carregou
    if (estado === "liberado") {
      linhas.push({ turma: numero, modulo_id: id, liberacao_em: agora });
    } else if (estado === "agendado") {
      const bruto = String(formData.get(`data-${id}`) ?? "").trim();
      const quando = bruto ? timestampDeSaoPaulo(bruto) : null;
      if (!quando) {
        return {
          error: `Informe a data de abertura de "${modulo.titulo as string}".`,
        };
      }
      linhas.push({ turma: numero, modulo_id: id, liberacao_em: quando });
    } else {
      linhas.push({ turma: numero, modulo_id: id, liberacao_em: null });
    }
  }

  if (linhas.length > 0) {
    const { error } = await admin
      .from("turma_modulos")
      .upsert(linhas, { onConflict: "turma,modulo_id" });
    if (error) {
      return { error: "A migração 0026 já foi aplicada no banco?" };
    }
  }

  const { error: erroTurma } = await admin
    .from("turmas")
    .update({ conteudo_restrito: restrito })
    .eq("numero", numero);
  if (erroTurma) return { error: "Não foi possível salvar o recorte da turma." };

  const abertos = linhas.filter(
    (l) => l.liberacao_em !== null && l.liberacao_em <= agora,
  ).length;
  const agendados = linhas.filter(
    (l) => l.liberacao_em !== null && l.liberacao_em > agora,
  ).length;

  await registrarEvento({
    acao: "turma.conteudo_alterado",
    atorId: executor.id,
    atorPapel: "equipe",
    alvoTipo: "turma",
    detalhes: { numero, restrito, abertos, agendados, total: linhas.length },
  });
  revalidatePath("/master/turmas");
  revalidatePath("/painel");
  return {
    ok: restrito
      ? `Turma ${numero}: ${abertos} módulo(s) abertos${
          agendados > 0 ? ` e ${agendados} agendado(s)` : ""
        }.`
      : `Turma ${numero} sem recorte — ela enxerga todo o conteúdo publicado.`,
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

  // Turma nova nasce com o conteúdo fechado (0026): ninguém entra em módulo
  // nenhum até o master planejar a liberação. Errar para o lado de fechado é
  // reversível num clique; abrir o curso inteiro por engano, não. Best-effort
  // porque antes da 0026 a coluna não existe.
  await admin
    .from("turmas")
    .update({ conteudo_restrito: true })
    .eq("numero", numero);

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
    ok: `Turma ${numero} criada — inscrições novas caem nela e o conteúdo começa fechado; libere os módulos abaixo.`,
  };
}
