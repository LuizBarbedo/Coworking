// Aviso automático de módulo novo liberado, fora do Next (imune a timeout HTTP
// e ao restart do coworking.service). Roda na VPS pelo cron, de hora em hora,
// a partir da raiz do projeto:
//
//   contagem (não envia nada):
//     npx tsx --conditions=react-server scripts/disparo-avisos-automatico.ts --contar
//   um teste só pra você, com o conteúdo real do que abriu:
//     npx tsx --conditions=react-server scripts/disparo-avisos-automatico.ts --teste voce@exemplo.com
//   rodada normal (é o que o cron chama):
//     npx tsx --conditions=react-server scripts/disparo-avisos-automatico.ts
//
// Retomável e idempotente: cada módulo é anunciado uma vez por turma, e o
// controle é o `tipo` em envios_email ('aviso_modulo:<modulo_id>:t<turma>').
// Não há janela de tempo — se o cron ficar parado, a rodada seguinte recupera.
//
// Só avisa quem JÁ ATIVOU a conta. Lista fria (convidado que nunca entrou) é
// campanha manual e deliberada: aviso recorrente pra base fria é o que mais
// rápido derruba reputação de remetente.
//
// AVISOS_DESDE (AAAA-MM-DD) é o corte de ativação do recurso. Sem ele a
// primeira rodada anunciaria todo o catálogo que já está no ar.

// Sem import estático o TypeScript trataria este arquivo como script de
// escopo global — e as constantes colidiriam com as dos outros disparos.
export {};

process.loadEnvFile(".env.local");

const INTERVALO_MS = Number(process.env.DISPARO_INTERVALO_MS ?? 9_000);
const BATIMENTO = "avisos-modulos";

const arg = (nome: string) => {
  const i = process.argv.indexOf(nome);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

function lerCorte(): Date {
  const bruto = (process.env.AVISOS_DESDE ?? "").trim();
  if (!bruto) {
    throw new Error(
      "AVISOS_DESDE ausente no .env.local. Defina a data de ativação do recurso " +
        "(AAAA-MM-DD) — sem ela a primeira rodada anunciaria o catálogo inteiro.",
    );
  }
  const corte = new Date(`${bruto}T00:00:00Z`);
  if (Number.isNaN(corte.getTime())) {
    throw new Error(`AVISOS_DESDE inválido: "${bruto}". Use o formato AAAA-MM-DD.`);
  }
  return corte;
}

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { chaveAviso, detectarLiberacoes, montarResumoModulo } = await import(
    "@/lib/avisos-modulos"
  );
  const { separarDestinatarios } = await import("@/lib/avisos");
  const { enviarEmailModuloLiberado } = await import("@/lib/email");

  const admin = createSupabaseAdminClient();
  const desde = lerCorte();
  const agora = new Date();

  /** Batimento pro card "Saúde da operação". Best-effort: nunca derruba o disparo. */
  const baterPonto = async (ok: boolean, detalhes: string) => {
    try {
      await admin.from("ops_heartbeats").upsert({
        id: BATIMENTO,
        ok,
        detalhes,
        atualizado_em: new Date().toISOString(),
      });
    } catch (e) {
      console.error(`  (aviso) batimento não gravado: ${String(e).slice(0, 120)}`);
    }
  };

  // ── Estado do curso e do que já foi anunciado ────────────────────────────
  const [turmas, modulos, planos, disciplinas, aulas, anunciados] = await Promise.all([
    admin.from("turmas").select("numero, conteudo_restrito").order("numero"),
    admin.from("modulos").select("id, titulo, ordem, publicado, publicar_em").order("ordem"),
    admin.from("turma_modulos").select("turma, modulo_id, liberacao_em"),
    admin.from("disciplinas").select("id, modulo_id, titulo, ordem, publicado").order("ordem"),
    admin.from("aulas").select("id, disciplina_id"),
    admin
      .from("envios_email")
      .select("tipo")
      .like("tipo", "aviso_modulo:%")
      .eq("status", "enviado"),
  ]);

  for (const r of [turmas, modulos, planos, disciplinas, aulas, anunciados]) {
    if (r.error) throw new Error(r.error.message);
  }

  const jaAvisados = new Set((anunciados.data ?? []).map((e) => String(e.tipo)));

  const liberacoes = detectarLiberacoes({
    turmas: turmas.data ?? [],
    modulos: modulos.data ?? [],
    turmaModulos: planos.data ?? [],
    jaAvisados,
    agora,
    desde,
  });

  if (!liberacoes.length) {
    console.log(
      `[${agora.toISOString()}] 0 avisos a enviar — nada abriu desde ` +
        `${desde.toISOString().slice(0, 10)} que ainda não tenha sido anunciado.`,
    );
    await baterPonto(true, "nada a avisar");
    return;
  }

  // ── Resumo de cada módulo, montado do banco ──────────────────────────────
  const aulasPorDisciplina: Record<string, number> = {};
  for (const aula of aulas.data ?? []) {
    const chave = String(aula.disciplina_id);
    aulasPorDisciplina[chave] = (aulasPorDisciplina[chave] ?? 0) + 1;
  }

  const resumoDoModulo = new Map(
    (modulos.data ?? []).map((modulo) => [
      modulo.id,
      montarResumoModulo({
        modulo,
        disciplinas: (disciplinas.data ?? []).filter((d) => d.modulo_id === modulo.id),
        aulasPorDisciplina,
      }),
    ]),
  );

  // Módulos que abriram juntos na mesma turma viram um único e-mail.
  const porTurma = new Map<number, typeof liberacoes>();
  for (const liberacao of liberacoes) {
    const lista = porTurma.get(liberacao.turma) ?? [];
    lista.push(liberacao);
    porTurma.set(liberacao.turma, lista);
  }

  for (const [turma, lista] of porTurma) {
    console.log(
      `turma ${turma}: ${lista.length} módulo(s) — ${lista.map((l) => l.titulo).join(", ")}`,
    );
  }

  // ── Amostra de conferência, sem registrar nada ───────────────────────────
  const teste = arg("--teste");
  if (teste) {
    const [turma, lista] = [...porTurma][0];
    await enviarEmailModuloLiberado({
      nome: "Equipe",
      email: teste,
      modulos: lista.map((l) => resumoDoModulo.get(l.moduloId)!),
    });
    console.log(`e-mail de teste (turma ${turma}) enviado para ${teste} — nada registrado.`);
    return;
  }

  // ── Destinatários por turma: só quem já ativou a conta ───────────────────
  const planoDeEnvio: Array<{
    turma: number;
    destinatario: { nome: string; email: string };
    modulos: ReturnType<typeof montarResumoModulo>[];
    chaves: string[];
  }> = [];

  for (const [turma, lista] of porTurma) {
    const { data: inscricoes, error } = await admin
      .from("inscricoes")
      .select("nome, email, matricula, ativado_em")
      .eq("turma", turma)
      .not("ativado_em", "is", null);
    if (error) throw new Error(error.message);

    const chaves = lista.map((l) => chaveAviso(turma, l.moduloId));
    const jaRecebeu = new Set(
      (
        await admin
          .from("envios_email")
          .select("email")
          .in("tipo", chaves)
          .eq("status", "enviado")
      ).data?.map((e) => String(e.email).trim().toLowerCase()) ?? [],
    );

    const { ativados } = separarDestinatarios({
      inscricoes: inscricoes ?? [],
      jaAvisados: jaRecebeu,
    });

    for (const destinatario of ativados) {
      planoDeEnvio.push({
        turma,
        destinatario,
        modulos: lista.map((l) => resumoDoModulo.get(l.moduloId)!),
        chaves,
      });
    }
  }

  console.log(
    `${planoDeEnvio.length} e-mail(s) a enviar. Intervalo ${INTERVALO_MS / 1000}s ` +
      `=> ~${Math.ceil((planoDeEnvio.length * (INTERVALO_MS + 2000)) / 60000)}min`,
  );

  if (process.argv.includes("--contar")) return;

  // ── Envio espaçado, registrando antes de dormir ──────────────────────────
  let ok = 0;
  let falhas = 0;

  for (const item of planoDeEnvio) {
    let status: "enviado" | "falha" = "enviado";
    try {
      await enviarEmailModuloLiberado({
        nome: item.destinatario.nome,
        email: item.destinatario.email,
        modulos: item.modulos,
      });
      ok += 1;
    } catch (e) {
      status = "falha";
      falhas += 1;
      console.error(`  erro em ${item.destinatario.email}: ${String(e).slice(0, 160)}`);
    }

    // Registra ANTES de dormir: se o processo morrer no meio, o retomar sabe
    // exatamente onde parou. Uma linha por módulo anunciado.
    await admin.from("envios_email").insert(
      item.chaves.map((tipo) => ({ email: item.destinatario.email, tipo, status })),
    );
    console.log(`[${new Date().toISOString()}] ${status}: ${item.destinatario.email}`);
    await dormir(INTERVALO_MS);
  }

  console.log(`[${new Date().toISOString()}] fim — ${ok} enviado(s), ${falhas} falha(s)`);
  await baterPonto(falhas === 0, `${ok} enviado(s), ${falhas} falha(s)`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
