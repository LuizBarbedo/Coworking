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

process.loadEnvFile(".env.local");

const INTERVALO_MS = Number(process.env.DISPARO_INTERVALO_MS ?? 9_000);

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();

  const { data: pendentes, error } = await admin
    .from("inscricoes")
    .select("email")
    .is("ativado_em", null);
  if (error) throw new Error(error.message);

  const { data: jaEnviados } = await admin
    .from("envios_email")
    .select("email")
    .eq("tipo", "convite_acesso")
    .eq("status", "enviado");
  const comConvite = new Set((jaEnviados ?? []).map((e) => e.email));

  const aEnviar = (pendentes ?? []).filter(
    (i) =>
      !i.email.endsWith("@coworkingsocial.com.br") &&
      !comConvite.has(i.email.toLowerCase()),
  ).length;

  console.log(
    `${aEnviar} convites a enviar (${pendentes?.length ?? 0} não ativados, ` +
      `${comConvite.size} já convidados). Intervalo: ${INTERVALO_MS / 1000}s ` +
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
