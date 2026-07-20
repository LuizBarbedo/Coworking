import "server-only";

// Liberação de acesso em massa: marca inscrições como selecionadas, envia o
// convite com a matrícula e registra CADA tentativa em envios_email
// ('enviado' | 'falha'); a checagem de devoluções (bounce) lê a caixa do
// Gmail via IMAP e marca 'devolvido'. Usado pela aba E-mails do master e
// pelo disparo agendado (rota /api/admin/enviar-convites).

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enviarEmailConviteAluno } from "@/lib/email";
import { extrairEmailDevolvido } from "@/lib/devolucoes";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

async function registrarEnvio(
  admin: Admin,
  dados: {
    inscricao_id: string | null;
    email: string;
    status: "enviado" | "falha";
    erro?: string;
  },
): Promise<void> {
  await admin.from("envios_email").insert({
    inscricao_id: dados.inscricao_id,
    email: dados.email.toLowerCase(),
    tipo: "convite_acesso",
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
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  await registrarEnvio(admin, {
    inscricao_id: dados.inscricaoId,
    email: dados.email,
    status: dados.ok ? "enviado" : "falha",
    erro: dados.erro,
  });
}

export type ResultadoDisparo = {
  liberadas: number;
  enviados: number;
  falhas: number;
  pulados: number;
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

  const { data: inscricoes, error } = await admin
    .from("inscricoes")
    .select("id, nome, email, matricula, selecionado, ativado_em")
    .is("ativado_em", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Falha ao listar inscrições: ${error.message}`);

  const { data: jaEnviados } = await admin
    .from("envios_email")
    .select("email")
    .eq("tipo", "convite_acesso")
    .eq("status", "enviado");
  const comConvite = new Set((jaEnviados ?? []).map((e) => e.email));

  const resultado: ResultadoDisparo = {
    liberadas: 0,
    enviados: 0,
    falhas: 0,
    pulados: 0,
  };

  for (const inscricao of inscricoes ?? []) {
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
