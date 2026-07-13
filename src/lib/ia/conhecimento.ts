import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dividirEmTrechos } from "./chunking";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

type LinhaChunk = { fonte: string; titulo: string | null; conteudo: string };

/**
 * Reconstrói os trechos (disciplina_chunks) que alimentam o assistente de IA de
 * uma disciplina. É chamado sempre que o conteúdo muda (base de conhecimento,
 * aulas, materiais ou dados da disciplina) — assim a IA "se treina" sozinha.
 *
 * Estratégia: apaga tudo da disciplina e reinsere. O catálogo por disciplina é
 * pequeno, então o rebuild completo é simples e sempre consistente.
 */
export async function reconstruirChunks(
  admin: Admin,
  disciplinaId: string,
): Promise<void> {
  const [disc, conhecimento, aulas, materiais] = await Promise.all([
    admin
      .from("disciplinas")
      .select("titulo, descricao")
      .eq("id", disciplinaId)
      .maybeSingle(),
    admin
      .from("disciplina_conhecimento")
      .select("titulo, conteudo")
      .eq("disciplina_id", disciplinaId)
      .order("ordem", { ascending: true }),
    admin
      .from("aulas")
      .select("titulo, descricao")
      .eq("disciplina_id", disciplinaId)
      .order("ordem", { ascending: true }),
    admin
      .from("materiais")
      .select("titulo, tipo")
      .eq("disciplina_id", disciplinaId)
      .order("ordem", { ascending: true }),
  ]);

  const linhas: LinhaChunk[] = [];

  // Dados da própria disciplina (título + descrição).
  if (disc.data) {
    const texto = [disc.data.titulo, disc.data.descricao]
      .filter(Boolean)
      .join(" — ")
      .trim();
    if (texto) {
      linhas.push({
        fonte: "disciplina",
        titulo: disc.data.titulo as string,
        conteudo: texto,
      });
    }
  }

  // Aulas: título + descrição (o vídeo em si não é lido).
  for (const a of aulas.data ?? []) {
    const texto = [a.titulo, a.descricao].filter(Boolean).join(" — ").trim();
    if (texto) {
      linhas.push({
        fonte: "aula",
        titulo: a.titulo as string,
        conteudo: `Aula: ${texto}`,
      });
    }
  }

  // Materiais: só há título/tipo (o arquivo é um link externo, não é baixado).
  for (const m of materiais.data ?? []) {
    const titulo = (m.titulo as string | null)?.trim();
    if (titulo) {
      linhas.push({
        fonte: "material",
        titulo,
        conteudo: `Material (${(m.tipo as string | null) ?? "arquivo"}): ${titulo}`,
      });
    }
  }

  // Base de conhecimento: a principal fonte, picada em trechos.
  for (const k of conhecimento.data ?? []) {
    const titulo = (k.titulo as string | null) ?? null;
    for (const trecho of dividirEmTrechos(String(k.conteudo ?? ""))) {
      linhas.push({ fonte: "conhecimento", titulo, conteudo: trecho });
    }
  }

  // Substitui por completo.
  await admin.from("disciplina_chunks").delete().eq("disciplina_id", disciplinaId);
  if (linhas.length > 0) {
    await admin.from("disciplina_chunks").insert(
      linhas.map((l) => ({
        disciplina_id: disciplinaId,
        fonte: l.fonte,
        titulo: l.titulo,
        conteudo: l.conteudo,
      })),
    );
  }
}
