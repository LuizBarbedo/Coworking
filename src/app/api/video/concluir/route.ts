import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { segredoConfere } from "@/lib/segredo";

// Webhook chamado pela Modal ao terminar de transcodificar um vídeo. Atualiza
// o banco com a service-role (que nunca sai daqui). Autenticado por um segredo
// compartilhado — a Modal só conhece esse segredo, não a service-role key.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Comparação em tempo constante: `!==` responde mais rápido quanto antes
  // diverge, o que dá pra medir e adivinhar o segredo caractere a caractere.
  if (
    !segredoConfere(
      process.env.VIDEO_WEBHOOK_SECRET,
      req.headers.get("x-webhook-secret"),
    )
  ) {
    return new Response("não autorizado", { status: 401 });
  }

  let corpo: {
    jobId?: string;
    aulaId?: string;
    status?: string;
    duracao?: number;
    thumb?: string | null;
    erro?: string;
  };
  try {
    corpo = await req.json();
  } catch {
    return new Response("payload inválido", { status: 400 });
  }

  const { jobId, aulaId, status } = corpo;
  if (!aulaId || (status !== "pronta" && status !== "erro")) {
    return new Response("dados incompletos", { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // A chamada precisa corresponder a um upload real desta aula. Sem isso,
  // quem tivesse o segredo marcaria QUALQUER aula como pronta (ou com erro)
  // mandando um aulaId avulso.
  if (jobId) {
    const { data: job } = await admin
      .from("video_jobs")
      .select("aula_id")
      .eq("id", jobId)
      .maybeSingle();
    if (!job || job.aula_id !== aulaId) {
      return new Response("job não confere com a aula", { status: 400 });
    }
  } else {
    // Sem jobId (o insert da fila pode ter falhado) exigimos ao menos que a
    // aula esteja de fato em transcodificação — quem não subiu vídeo agora
    // não pode ser alterado.
    const { data: aula } = await admin
      .from("aulas")
      .select("video_status")
      .eq("id", aulaId)
      .maybeSingle();
    if (aula?.video_status !== "processando") {
      return new Response("aula não está em transcodificação", { status: 400 });
    }
  }

  if (status === "pronta") {
    await admin
      .from("aulas")
      .update({
        video_status: "pronta",
        video_duracao_seg: corpo.duracao ?? null,
        video_thumbnail: corpo.thumb ?? null,
        video_pronto_em: new Date().toISOString(),
      })
      .eq("id", aulaId);
    if (jobId) {
      await admin.from("video_jobs").update({ status: "concluido" }).eq("id", jobId);
    }
  } else {
    await admin.from("aulas").update({ video_status: "erro" }).eq("id", aulaId);
    if (jobId) {
      await admin
        .from("video_jobs")
        .update({ status: "erro", erro: corpo.erro ?? "erro na transcodificação" })
        .eq("id", jobId);
    }
  }

  return Response.json({ ok: true });
}
