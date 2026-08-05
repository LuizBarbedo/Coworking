import "server-only";

// Liberação de acesso em massa: marca inscrições como selecionadas, envia o
// convite com a matrícula e registra CADA tentativa em envios_email
// ('enviado' | 'falha'); a checagem de devoluções (bounce) lê a caixa do
// Gmail via IMAP e marca 'devolvido'. Usado pela aba E-mails do master e
// pelos scripts de disparo em background (scripts/disparo-*.ts).
// Inscrição de turma que ainda não abriu (migração 0023) fica FORA do
// disparo — ela entra sozinha a partir da data de liberação da turma.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enviarEmailConviteAluno } from "@/lib/email";
import { extrairEmailDevolvido } from "@/lib/devolucoes";
import { filtrarPorTurmaLiberada } from "@/lib/turmas";
import { buscarTurmas } from "@/lib/turmas-dados";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

async function registrarEnvio(
  admin: Admin,
  dados: {
    inscricao_id: string | null;
    email: string;
    status: "enviado" | "falha";
    erro?: string;
    /** Default convite_acesso. A confirmação de turma usa tipo próprio —
     *  senão a idempotência do disparo pularia quem só recebeu confirmação. */
    tipo?: string;
  },
): Promise<void> {
  await admin.from("envios_email").insert({
    inscricao_id: dados.inscricao_id,
    email: dados.email.toLowerCase(),
    tipo: dados.tipo ?? "convite_acesso",
    status: dados.status,
    erro: dados.erro ?? null,
  });
}

/** Registro avulso (cadastro manual / reenvio individual da aba Equipe). */
export async function registrarConviteIndividual(dados: {
  inscricaoId: string | null;
  email: string;
  ok: boolean;
  erro?: string;
  tipo?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  await registrarEnvio(admin, {
    inscricao_id: dados.inscricaoId,
    email: dados.email,
    status: dados.ok ? "enviado" : "falha",
    erro: dados.erro,
    tipo: dados.tipo,
  });
}

export type ResultadoDisparo = {
  liberadas: number;
  enviados: number;
  falhas: number;
  pulados: number;
  /** Inscrições de turma que ainda não abriu — ficam fora do disparo. */
  aguardandoTurma: number;
};

/**
 * Libera e convida todo mundo que ainda não ativou a conta.
 * - `apenasSemConvite`: pula quem já tem envio 'enviado' registrado (pra
 *   rodadas de retomada não duplicarem e-mail de quem já recebeu).
 */
export async function liberarEDispararConvites(opcoes?: {
  apenasSemConvite?: boolean;
  /** Pausa entre envios. Rodadas grandes pedem intervalo maior (ex.: 9s) pra
   *  não parecer rajada pro filtro de spam do Gmail. */
  intervaloMs?: number;
  /** Callback de progresso (usado pelo script de disparo em background). */
  aoEnviar?: (email: string, status: "enviado" | "falha" | "pulado") => void;
}): Promise<ResultadoDisparo> {
  const admin = createSupabaseAdminClient();
  const apenasSemConvite = opcoes?.apenasSemConvite ?? true;
  const intervaloMs = opcoes?.intervaloMs ?? 300;

  // A coluna turma só existe com a 0023 aplicada — sem ela, refaz a busca
  // sem a coluna e ninguém fica retido (comportamento antigo).
  type InscricaoPendente = {
    id: string;
    nome: string;
    email: string;
    matricula: string;
    selecionado: boolean;
    ativado_em: string | null;
    turma?: number | null;
  };
  let inscricoes: InscricaoPendente[] | null = null;
  const primeira = await admin
    .from("inscricoes")
    .select("id, nome, email, matricula, selecionado, ativado_em, turma")
    .is("ativado_em", null)
    .order("created_at", { ascending: true });
  if (primeira.error) {
    const segunda = await admin
      .from("inscricoes")
      .select("id, nome, email, matricula, selecionado, ativado_em")
      .is("ativado_em", null)
      .order("created_at", { ascending: true });
    if (segunda.error) {
      throw new Error(`Falha ao listar inscrições: ${segunda.error.message}`);
    }
    inscricoes = segunda.data;
  } else {
    inscricoes = primeira.data;
  }

  const { data: jaEnviados } = await admin
    .from("envios_email")
    .select("email")
    .eq("tipo", "convite_acesso")
    .eq("status", "enviado");
  const comConvite = new Set((jaEnviados ?? []).map((e) => e.email));

  // Quem é de turma ainda fechada não é selecionado nem recebe convite —
  // entra no próximo disparo depois que a turma abrir.
  const { liberadas: aptas, aguardando } = filtrarPorTurmaLiberada(
    inscricoes ?? [],
    await buscarTurmas(),
  );

  const resultado: ResultadoDisparo = {
    liberadas: 0,
    enviados: 0,
    falhas: 0,
    pulados: 0,
    aguardandoTurma: aguardando.length,
  };

  for (const inscricao of aptas) {
    // teste interno não recebe convite
    if (inscricao.email.endsWith("@coworkingsocial.com.br")) continue;

    if (!inscricao.selecionado) {
      const { error: erroSel } = await admin
        .from("inscricoes")
        .update({ selecionado: true })
        .eq("id", inscricao.id);
      if (!erroSel) resultado.liberadas++;
    }

    if (apenasSemConvite && comConvite.has(inscricao.email.toLowerCase())) {
      resultado.pulados++;
      opcoes?.aoEnviar?.(inscricao.email, "pulado");
      continue;
    }

    try {
      await enviarEmailConviteAluno({
        nome: inscricao.nome,
        email: inscricao.email,
        matricula: inscricao.matricula,
      });
      await registrarEnvio(admin, {
        inscricao_id: inscricao.id,
        email: inscricao.email,
        status: "enviado",
      });
      resultado.enviados++;
      opcoes?.aoEnviar?.(inscricao.email, "enviado");
    } catch (erro) {
      await registrarEnvio(admin, {
        inscricao_id: inscricao.id,
        email: inscricao.email,
        status: "falha",
        erro: erro instanceof Error ? erro.message.slice(0, 500) : "erro",
      });
      resultado.falhas++;
      opcoes?.aoEnviar?.(inscricao.email, "falha");
    }
    // respiro entre envios: gentil com o SMTP do Gmail
    await new Promise((r) => setTimeout(r, intervaloMs));
  }

  return resultado;
}

/**
 * Lê a caixa do Gmail (IMAP) atrás de avisos do mailer-daemon e marca os
 * envios correspondentes como 'devolvido'. Devolve quantos marcou.
 */
export async function verificarDevolucoes(desdeDias = 2): Promise<number> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER/GMAIL_APP_PASSWORD ausentes.");

  const { ImapFlow } = await import("imapflow");
  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const admin = createSupabaseAdminClient();
  let marcados = 0;
  const desde = new Date(Date.now() - desdeDias * 24 * 60 * 60 * 1000);

  await cliente.connect();
  try {
    await cliente.mailboxOpen("INBOX");
    for await (const msg of cliente.fetch(
      { from: "mailer-daemon", since: desde },
      { source: true },
    )) {
      const texto = msg.source?.toString("utf-8") ?? "";
      const devolvido = extrairEmailDevolvido(
        // cabeçalho X-Failed-Recipients vem primeiro quando existe
        texto.match(/X-Failed-Recipients:\s*(.+)/i)?.[1] ?? texto,
      );
      if (!devolvido) continue;
      const { data } = await admin
        .from("envios_email")
        .update({ status: "devolvido", updated_at: new Date().toISOString() })
        .eq("email", devolvido)
        .eq("status", "enviado")
        .select("id");
      marcados += data?.length ?? 0;
    }
  } finally {
    await cliente.logout().catch(() => {});
  }
  return marcados;
}
