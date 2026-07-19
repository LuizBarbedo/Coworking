// Disparo do convite em massa por chamada interna (agendamento na VPS).
// Protegido por Bearer com a service key — a chamada nasce na própria
// máquina (systemd-run + curl em localhost); nada disso passa pelo browser.
import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { liberarEDispararConvites } from "@/lib/convites";

export const maxDuration = 300;

function autorizado(req: NextRequest): boolean {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const recebido = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!chave || !recebido) return false;
  const a = Buffer.from(chave);
  const b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  try {
    const resultado = await liberarEDispararConvites({ apenasSemConvite: true });
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "falha" },
      { status: 500 },
    );
  }
}
