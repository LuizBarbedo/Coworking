import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Health check da produção: 200 com a latência do banco, 503 se ele não
// responder. Sem auth e sem dado sensível — só números agregados de saúde.
// O vigia do cron pode apontar pra cá (VIGIA_URL) em vez do /login.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("inscricoes").select("id").limit(1);
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, bancoMs: Date.now() - inicio });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
