// Levantamento do conteúdo cadastrado, por módulo/disciplina.
// Uso: npx tsx --conditions=react-server scripts/verificar-conteudo.ts
//
// Só lê — serve pra conferir o estado antes/depois de uma carga de conteúdo.

export {}; // módulo isolado: os scripts daqui declaram `main` no escopo global

process.loadEnvFile(".env.local");

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();

  const { count: totalAulas } = await admin
    .from("aulas")
    .select("*", { count: "exact", head: true });
  console.log(`Total de aulas na base: ${totalAulas}\n`);

  const { data: modulos } = await admin
    .from("modulos")
    .select("id, titulo, ordem, publicado")
    .order("ordem");

  for (const m of modulos ?? []) {
    const { data: disciplinas } = await admin
      .from("disciplinas")
      .select("id, titulo, slug")
      .eq("modulo_id", m.id)
      .order("ordem");

    console.log(
      `[${m.ordem}] ${m.titulo} ${m.publicado ? "(publicado)" : "(despublicado)"}`,
    );

    for (const d of disciplinas ?? []) {
      const [aulas, materiais, conhecimento, quiz] = await Promise.all([
        admin.from("aulas").select("titulo, provider, video_uid, ordem")
          .eq("disciplina_id", d.id).order("ordem"),
        admin.from("materiais").select("titulo").eq("disciplina_id", d.id),
        admin.from("disciplina_conhecimento").select("titulo")
          .eq("disciplina_id", d.id),
        admin.from("quizzes").select("id").eq("disciplina_id", d.id).maybeSingle(),
      ]);

      let perguntas = 0;
      if (quiz.data) {
        const { count } = await admin
          .from("quiz_perguntas")
          .select("*", { count: "exact", head: true })
          .eq("quiz_id", quiz.data.id);
        perguntas = count ?? 0;
      }

      console.log(
        `   ${d.titulo}: ${aulas.data?.length ?? 0} aula(s), ` +
          `${materiais.data?.length ?? 0} material(is), ` +
          `${conhecimento.data?.length ?? 0} doc(s) de IA, ${perguntas} pergunta(s)`,
      );
      for (const a of aulas.data ?? []) {
        console.log(
          `      ${a.ordem}. ${a.titulo} [${a.provider}] ${a.video_uid ?? ""}`,
        );
      }
    }
  }
}

main();
