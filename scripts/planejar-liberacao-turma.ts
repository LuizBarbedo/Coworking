// Planeja a liberação de módulos de uma turma em lotes semanais — o mesmo que
// a tela /master/turmas grava, mas sem clicar em 15 seletores.
//
// Prévia (não escreve nada):
//   npx tsx --conditions=react-server scripts/planejar-liberacao-turma.ts \
//     --turma 2 --abertos 6 --por-semana 3 --primeira 2026-08-31T08:00
//
// Aplicar (grava turma_modulos e liga o recorte da turma):
//   ... mesmos argumentos + --aplicar
//
// Efeitos de aplicar:
//   - módulos já abertos ficam liberados (data de agora);
//   - os demais viram "Em breve · dd/mm às 8h" no painel do aluno e abrem
//     sozinhos na data (o RLS é quem esconde o conteúdo);
//   - o aviso automático de módulo novo sai na hora seguinte a cada abertura
//     (cron horário), uma vez por turma e por módulo.
//
// Cuidado: religar o recorte esconde de novo o que estiver agendado. Módulo
// que já foi anunciado NÃO é anunciado outra vez (a chave em envios_email
// garante isso).

export {};

process.loadEnvFile(".env.local");

const arg = (nome: string) => {
  const i = process.argv.indexOf(nome);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function main() {
  const turma = Number(arg("--turma"));
  const jaAbertos = Number(arg("--abertos") ?? 0);
  const porSemana = Number(arg("--por-semana") ?? 3);
  const primeiraSemana = arg("--primeira");
  const aplicar = process.argv.includes("--aplicar");

  if (!Number.isInteger(turma) || turma < 1) throw new Error("Use --turma <n>.");
  if (!primeiraSemana) throw new Error("Use --primeira AAAA-MM-DDTHH:MM (Brasília).");

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { montarCronogramaSemanal } = await import("@/lib/cronograma-turma");
  const { formatarQuandoLibera } = await import("@/lib/liberacao-modulos");

  const admin = createSupabaseAdminClient();

  const { data: modulos, error } = await admin
    .from("modulos")
    .select("id, titulo, ordem, publicado")
    .order("ordem");
  if (error) throw new Error(error.message);

  // Módulo não publicado não abre pra ninguém — fica fora do cronograma.
  const publicados = (modulos ?? []).filter((m) => m.publicado) as Array<{
    id: string;
    titulo: string;
    ordem: number;
  }>;

  const plano = montarCronogramaSemanal({
    modulos: publicados,
    jaAbertos,
    porSemana,
    primeiraSemana,
  });

  const titulo = new Map(publicados.map((m) => [m.id, m.titulo]));
  const agora = new Date();

  console.log(`Turma ${turma} — ${plano.length} módulo(s) publicados\n`);
  for (const linha of plano) {
    const data = new Date(linha.liberacao_em);
    const estado = data <= agora ? "LIBERADO" : `em breve · ${formatarQuandoLibera(linha.liberacao_em)}`;
    console.log(`  ${estado.padEnd(26)} ${titulo.get(linha.modulo_id)}`);
  }

  if (!aplicar) {
    console.log("\nPrévia — nada foi gravado. Repita com --aplicar para valer.");
    return;
  }

  const { error: erroPlano } = await admin
    .from("turma_modulos")
    .upsert(plano.map((l) => ({ turma, ...l })), { onConflict: "turma,modulo_id" });
  if (erroPlano) throw new Error(`turma_modulos: ${erroPlano.message}`);

  const { error: erroTurma } = await admin
    .from("turmas")
    .update({ conteudo_restrito: true })
    .eq("numero", turma);
  if (erroTurma) throw new Error(`turmas: ${erroTurma.message}`);

  console.log(`\nAplicado: plano gravado e recorte de conteúdo ligado na turma ${turma}.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  },
);
