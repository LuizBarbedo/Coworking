import "server-only";

// Trilha de auditoria: registrarEvento grava em public.eventos (0021) e é
// À PROVA DE FALHA por contrato — auditoria nunca pode quebrar o fluxo do
// usuário. Sem a migração aplicada, o registro é perdido em silêncio.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizarEvento,
  type EventoBruto,
} from "@/lib/auditoria-normalizar";

export async function registrarEvento(bruto: EventoBruto): Promise<void> {
  try {
    const evento = normalizarEvento(bruto);
    if (!evento) return;
    const admin = createSupabaseAdminClient();
    await admin.from("eventos").insert(evento);
  } catch {
    // nunca propaga — auditoria é observação, não fluxo
  }
}
