// Correção pontual: a videoaula de introdução de "Técnicas de Compra e Venda"
// (módulo 6) não entrou na carga de 27/07 — a disciplina ficou com 8 das 9
// aulas enviadas pela professora, começando direto na segunda.
//
// Este script insere a aula que falta na primeira posição e renumera as demais
// (2..9), preservando a sequência atual, que já está correta.
//
//   simulação (não grava nada):
//     npx tsx --conditions=react-server scripts/corrigir-aulas-compra-venda.ts --simular
//   correção de verdade:
//     npx tsx --conditions=react-server scripts/corrigir-aulas-compra-venda.ts
//
// IDEMPOTENTE: se a aula já existir, apenas confere a numeração.

process.loadEnvFile(".env.local");

export {}; // módulo isolado: os scripts daqui declaram `main` no escopo global

const SIMULAR = process.argv.includes("--simular");

const MODULO_ORDEM = 6;
const INTRODUCAO = {
  titulo: "Introdução ao módulo",
  url: "https://youtu.be/NnSbmlDaol4",
};

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { classificarVideo } = await import("@/lib/video");
  const { planejarReordenacao } = await import("@/lib/reordenar");

  const admin = createSupabaseAdminClient();

  const { data: modulo } = await admin
    .from("modulos")
    .select("id, titulo")
    .eq("ordem", MODULO_ORDEM)
    .single();
  if (!modulo) throw new Error(`Módulo de ordem ${MODULO_ORDEM} não encontrado.`);

  const { data: disciplina } = await admin
    .from("disciplinas")
    .select("id, titulo")
    .eq("modulo_id", modulo.id)
    .order("ordem")
    .limit(1)
    .maybeSingle();
  if (!disciplina) throw new Error(`${modulo.titulo}: sem disciplina.`);

  const discId = disciplina.id as string;
  console.log(`[${MODULO_ORDEM}] ${disciplina.titulo}`);
  if (SIMULAR) console.log("MODO SIMULAÇÃO — nada é gravado.\n");

  const { provider, uid } = classificarVideo(INTRODUCAO.url);

  const { data: antes } = await admin
    .from("aulas")
    .select("id, titulo, video_uid, ordem")
    .eq("disciplina_id", discId)
    .order("ordem");
  const aulas = antes ?? [];

  // ── 1. a aula de introdução ──────────────────────────────────────────────
  let idIntroducao = aulas.find((a) => a.video_uid === uid)?.id as
    | string
    | undefined;

  if (idIntroducao) {
    console.log(`   aula "${INTRODUCAO.titulo}": já existe — só renumera`);
  } else if (SIMULAR) {
    console.log(`   aula "${INTRODUCAO.titulo}": criaria [${provider}] ${uid}`);
  } else {
    // ordem 0 apenas como posição provisória: a renumeração abaixo fecha 1..9.
    const { data, error } = await admin
      .from("aulas")
      .insert({
        disciplina_id: discId,
        titulo: INTRODUCAO.titulo,
        provider,
        video_uid: uid,
        ordem: 0,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`falha ao inserir a aula — ${error?.message}`);
    idIntroducao = data.id as string;
    console.log(`   aula "${INTRODUCAO.titulo}": criada`);
  }

  // ── 2. renumeração: introdução na frente, resto na sequência atual ────────
  const idsAtuais = aulas.map((a) => a.id as string);
  if (idIntroducao && !idsAtuais.includes(idIntroducao)) idsAtuais.push(idIntroducao);

  const desejada = [
    ...(idIntroducao ? [idIntroducao] : []),
    ...aulas.filter((a) => a.id !== idIntroducao).map((a) => a.id as string),
  ];

  if (SIMULAR && !idIntroducao) {
    console.log(`   ordem: as ${aulas.length} aulas atuais virariam 2..${aulas.length + 1}`);
  } else {
    const plano = planejarReordenacao(idsAtuais, desejada);
    if ("erro" in plano) throw new Error(`renumeração inválida — ${plano.erro}`);

    for (const { id, ordem } of plano.atualizacoes) {
      if (SIMULAR) continue;
      const { error } = await admin.from("aulas").update({ ordem }).eq("id", id);
      if (error) console.error(`   ordem: falha na aula ${id} — ${error.message}`);
    }
    console.log(`   ordem: ${plano.atualizacoes.length} aula(s) renumerada(s) 1..${plano.atualizacoes.length}`);
  }

  // ── 3. conferência ───────────────────────────────────────────────────────
  const { data: depois } = await admin
    .from("aulas")
    .select("titulo, provider, video_uid, ordem")
    .eq("disciplina_id", discId)
    .order("ordem");
  console.log("\n   estado final:");
  for (const a of depois ?? []) {
    console.log(`      ${a.ordem}. ${a.titulo} [${a.provider}] ${a.video_uid ?? ""}`);
  }
}

main();
