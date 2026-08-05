// Aviso em massa de módulo novo, fora do Next (imune a timeout HTTP e ao
// restart do coworking.service). Roda na VPS, a partir da raiz do projeto:
//
//   contagem (não envia nada):
//     npx tsx --conditions=react-server scripts/disparo-aviso-modulos.ts --contar
//   um teste só pra você, antes de soltar pra turma:
//     npx tsx --conditions=react-server scripts/disparo-aviso-modulos.ts --teste voce@exemplo.com
//   disparo em background, espaçado:
//     nohup npx tsx --conditions=react-server scripts/disparo-aviso-modulos.ts \
//       > disparo-aviso.log 2>&1 &
//
// Retomável: quem já tem envio 'enviado' deste TIPO em envios_email é pulado,
// então rodar de novo depois de uma falha não manda e-mail repetido.
//
// O intervalo entre envios não é decoração: o remetente é uma conta Gmail
// comum, e rajada de e-mail idêntico é o que mais rápido derruba reputação de
// remetente — que aqui já está ruim (só 22% dos convidados ativaram a conta).

// Sem import estático o TypeScript trataria este arquivo como script de
// escopo global — e as constantes colidiriam com as dos outros disparos.
export {};

process.loadEnvFile(".env.local");

const TIPO = "aviso_modulos_10_11";
const INTERVALO_MS = Number(process.env.DISPARO_INTERVALO_MS ?? 9_000);

const arg = (nome: string) => {
  const i = process.argv.indexOf(nome);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { separarDestinatarios } = await import("@/lib/avisos");
  const { enviarEmailNovosModulos, enviarEmailNovosModulosPendente } = await import(
    "@/lib/email"
  );

  const admin = createSupabaseAdminClient();

  const { data: inscricoes, error } = await admin
    .from("inscricoes")
    .select("nome, email, matricula, ativado_em")
    .eq("selecionado", true);
  if (error) throw new Error(error.message);

  const { data: enviados } = await admin
    .from("envios_email")
    .select("email")
    .eq("tipo", TIPO)
    .eq("status", "enviado");
  const jaAvisados = new Set(
    (enviados ?? []).map((e) => String(e.email).trim().toLowerCase()),
  );

  const { ativados, pendentes } = separarDestinatarios({
    inscricoes: inscricoes ?? [],
    jaAvisados,
  });

  const total = ativados.length + pendentes.length;
  console.log(
    `${total} aviso(s) a enviar — ${ativados.length} pra quem já ativou, ` +
      `${pendentes.length} pra quem nunca entrou (com o passo a passo de acesso). ` +
      `${jaAvisados.size} já avisados. Intervalo ${INTERVALO_MS / 1000}s ` +
      `=> ~${Math.ceil((total * (INTERVALO_MS + 2000)) / 60000)}min`,
  );

  // Envia uma única mensagem de conferência e para.
  const teste = arg("--teste");
  if (teste) {
    await enviarEmailNovosModulos({ nome: "Marcus", email: teste });
    await enviarEmailNovosModulosPendente({
      nome: "Marcus",
      email: teste,
      matricula: "2026000",
    });
    console.log(`dois e-mails de teste enviados para ${teste} — nada registrado.`);
    return;
  }

  if (process.argv.includes("--contar")) return;

  console.log(`[${new Date().toISOString()}] iniciando disparo`);
  let ok = 0;
  let falhas = 0;

  const enviar = async (
    destinatario: { nome: string; email: string; matricula: string | null },
    pendente: boolean,
  ) => {
    let status: "enviado" | "falha" = "enviado";
    try {
      if (pendente) {
        await enviarEmailNovosModulosPendente({
          nome: destinatario.nome,
          email: destinatario.email,
          matricula: destinatario.matricula ?? "",
        });
      } else {
        await enviarEmailNovosModulos({
          nome: destinatario.nome,
          email: destinatario.email,
        });
      }
      ok += 1;
    } catch (e) {
      status = "falha";
      falhas += 1;
      console.error(`  erro em ${destinatario.email}: ${String(e).slice(0, 160)}`);
    }
    // Registra ANTES de dormir: se o processo morrer no meio, o retomar sabe
    // exatamente onde parou.
    await admin.from("envios_email").insert({
      email: destinatario.email,
      tipo: TIPO,
      status,
    });
    console.log(`[${new Date().toISOString()}] ${status}: ${destinatario.email}`);
    await dormir(INTERVALO_MS);
  };

  // Quem nunca entrou vem primeiro: é quem mais precisa do e-mail chegar.
  for (const p of pendentes) await enviar(p, true);
  for (const a of ativados) await enviar(a, false);

  console.log(`[${new Date().toISOString()}] fim — ${ok} enviado(s), ${falhas} falha(s)`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
