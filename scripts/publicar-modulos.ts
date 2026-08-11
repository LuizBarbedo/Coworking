// Publica módulos (e as disciplinas dentro deles) pelo número da ordem.
//
//   simulação:  npx tsx --conditions=react-server scripts/publicar-modulos.ts 10 11 --simular
//   valendo:    npx tsx --conditions=react-server scripts/publicar-modulos.ts 10 11
//
// Publicar é o que efetivamente libera o conteúdo para os alunos: a RLS filtra
// por `publicado` tanto em modulos quanto em disciplinas, então as duas flags
// precisam estar ligadas. Confere antes de gravar se o módulo tem aula e
// avaliação — módulo publicado vazio aparece quebrado pro aluno.

process.loadEnvFile(".env.local");

const SIMULAR = process.argv.includes("--simular");
const ORDENS = process.argv
  .slice(2)
  .filter((a) => /^\d+$/.test(a))
  .map(Number);

async function main() {
  if (!ORDENS.length) throw new Error("informe a ordem dos módulos, ex.: ... 10 11");

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();

  if (SIMULAR) console.log("MODO SIMULAÇÃO — nada é gravado.\n");

  for (const ordem of ORDENS) {
    const { data: modulo } = await admin
      .from("modulos")
      .select("id, titulo, publicado")
      .eq("ordem", ordem)
      .single();
    if (!modulo) {
      console.error(`[${ordem}] módulo não encontrado — pulando.`);
      continue;
    }

    const { data: disciplinas } = await admin
      .from("disciplinas")
      .select("id, titulo, publicado")
      .eq("modulo_id", modulo.id)
      .order("ordem");

    console.log(`\n[${ordem}] ${modulo.titulo}`);

    let impedido = false;
    for (const d of disciplinas ?? []) {
      const [{ count: aulas }, { data: quiz }] = await Promise.all([
        admin
          .from("aulas")
          .select("*", { count: "exact", head: true })
          .eq("disciplina_id", d.id),
        admin.from("quizzes").select("id").eq("disciplina_id", d.id).maybeSingle(),
      ]);
      console.log(
        `   ${d.titulo}: ${aulas} aula(s), ${quiz ? "com" : "SEM"} avaliação` +
          `${d.publicado ? "" : " — disciplina despublicada"}`,
      );
      if (!aulas) {
        console.error(`   ⚠ sem aula nenhuma — não vou publicar este módulo.`);
        impedido = true;
      }
    }
    if (impedido) continue;

    if (SIMULAR) {
      console.log(`   publicaria o módulo e ${disciplinas?.length ?? 0} disciplina(s).`);
      continue;
    }

    const { error: erroDisc } = await admin
      .from("disciplinas")
      .update({ publicado: true })
      .eq("modulo_id", modulo.id);
    const { error: erroMod } = await admin
      .from("modulos")
      .update({ publicado: true })
      .eq("id", modulo.id);

    console.log(
      erroMod || erroDisc
        ? `   falha: ${erroMod?.message ?? erroDisc?.message}`
        : `   PUBLICADO`,
    );
  }
}

main();
