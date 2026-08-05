// Disparo dos convites do lançamento, fora do Next (imune a timeout HTTP e
// ao restart do coworking.service). Roda na VPS, a partir da raiz do projeto:
//
//   contagem (não envia nada):
//     npx tsx --conditions=react-server scripts/disparo-lancamento.ts --contar
//   disparo em background, espaçado (~9s entre envios):
//     nohup npx tsx --conditions=react-server scripts/disparo-lancamento.ts \
//       > disparo-lancamento.log 2>&1 &
//
// Retomável: quem já tem envio 'enviado' em envios_email é pulado, então
// rodar de novo depois de uma falha não duplica e-mail.

// Sem import estático o TypeScript trataria este arquivo como script de
// escopo global — e as constantes colidiriam com as dos outros disparos.
export {};

process.loadEnvFile(".env.local");

const INTERVALO_MS = Number(process.env.DISPARO_INTERVALO_MS ?? 9_000);

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();

  // Coluna turma só existe com a 0023 — sem ela, refaz sem a coluna.
  let pendentes: Array<{ email: string; turma?: number | null }> | null = null;
  const primeira = await admin
    .from("inscricoes")
    .select("email, turma")
    .is("ativado_em", null);
  if (primeira.error) {
    const segunda = await admin
      .from("inscricoes")
      .select("email")
      .is("ativado_em", null);
    if (segunda.error) throw new Error(segunda.error.message);
    pendentes = segunda.data;
  } else {
    pendentes = primeira.data;
  }

  const { data: jaEnviados } = await admin
    .from("envios_email")
    .select("email")
    .eq("tipo", "convite_acesso")
    .eq("status", "enviado");
  const comConvite = new Set((jaEnviados ?? []).map((e) => e.email));

  // Mesma régua do disparo real: turma que ainda não abriu fica de fora.
  const { filtrarPorTurmaLiberada } = await import("@/lib/turmas");
  const { buscarTurmas } = await import("@/lib/turmas-dados");
  const { liberadas: aptos, aguardando } = filtrarPorTurmaLiberada(
    (pendentes ?? []) as Array<{ email: string; turma?: number | null }>,
    await buscarTurmas(),
  );

  const aEnviar = aptos.filter(
    (i) =>
      !i.email.endsWith("@coworkingsocial.com.br") &&
      !comConvite.has(i.email.toLowerCase()),
  ).length;

  console.log(
    `${aEnviar} convites a enviar (${pendentes?.length ?? 0} não ativados, ` +
      `${comConvite.size} já convidados, ${aguardando.length} aguardando a ` +
      `turma abrir). Intervalo: ${INTERVALO_MS / 1000}s ` +
      `=> duração estimada ~${Math.ceil((aEnviar * (INTERVALO_MS + 2000)) / 60000)}min`,
  );

  if (process.argv.includes("--contar")) return;

  const { liberarEDispararConvites } = await import("@/lib/convites");
  console.log(`[${new Date().toISOString()}] iniciando disparo`);
  const resultado = await liberarEDispararConvites({
    apenasSemConvite: true,
    intervaloMs: INTERVALO_MS,
    aoEnviar: (email, status) =>
      console.log(`[${new Date().toISOString()}] ${status}: ${email}`),
  });
  console.log(`[${new Date().toISOString()}] fim`, resultado);
}

main().then(
  () => process.exit(0),
  (erro) => {
    console.error(`[${new Date().toISOString()}] erro fatal:`, erro);
    process.exit(1);
  },
);
