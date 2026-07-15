import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Webhook chamado pela Modal ao terminar de transcodificar um vídeo. Atualiza
// o banco com a service-role (que nunca sai daqui). Autenticado por um segredo
// compartilhado — a Modal só conhece esse segredo, não a service-role key.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const segredo = process.env.VIDEO_WEBHOOK_SECRET;
  if (!segredo || req.headers.get("x-webhook-secret") !== segredo) {
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

  if (status === "pronta") {
    await admin
      .from("aulas")
      .update({
        video_status: "pronta",
        video_duracao_seg: corpo.duracao || null,
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
