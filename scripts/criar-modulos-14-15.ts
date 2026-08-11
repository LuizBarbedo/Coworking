// Cria os módulos (e a disciplina de cada um) das duas matérias novas do lote
// de agosto, que não existiam na sequência original de 10 disciplinas.
//
//   simulação: npx tsx --conditions=react-server scripts/criar-modulos-14-15.ts --simular
//   valendo:   npx tsx --conditions=react-server scripts/criar-modulos-14-15.ts
//
// Nasce DESPUBLICADO, como todo módulo criado pelo master — a publicação é
// decisão da coordenação. A capa fica pra depois (scripts/modal/gerar_capas.py).
//
// IDEMPOTENTE: confere por `ordem` antes de inserir; rodar de novo não duplica.

export {}; // módulo isolado: os scripts daqui declaram `main` no escopo global

process.loadEnvFile(".env.local");

const SIMULAR = process.argv.includes("--simular");

const NOVOS = [
  {
    ordem: 14,
    slug: "empreendedorismo-social",
    titulo: "Empreendedorismo Social",
    instrutor: "José Pinto Monteiro",
  },
  {
    ordem: 15,
    slug: "cooperativismo-principios-e-aplicacoes",
    titulo: "Cooperativismo: Princípios e Aplicações",
    instrutor: "Valdinei Calixto",
  },
];

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();

  if (SIMULAR) console.log("MODO SIMULAÇÃO — nada é gravado.\n");

  for (const novo of NOVOS) {
    const { data: existente } = await admin
      .from("modulos")
      .select("id, titulo")
      .eq("ordem", novo.ordem)
      .maybeSingle();

    if (existente) {
      console.log(`[${novo.ordem}] já existe: ${existente.titulo} — pulado`);
      continue;
    }
    if (SIMULAR) {
      console.log(`[${novo.ordem}] criaria módulo + disciplina "${novo.titulo}"`);
      continue;
    }

    const { data: modulo, error } = await admin
      .from("modulos")
      .insert({
        slug: novo.slug,
        titulo: novo.titulo,
        instrutor: novo.instrutor,
        ordem: novo.ordem,
        publicado: false,
      })
      .select("id")
      .single();
    if (error || !modulo) {
      console.error(`[${novo.ordem}] falha ao criar módulo — ${error?.message}`);
      continue;
    }

    // Uma disciplina por módulo, publicada: é o padrão de todo o curso — quem
    // controla o acesso do aluno é o `publicado` do módulo.
    const { error: erroDisc } = await admin.from("disciplinas").insert({
      modulo_id: modulo.id,
      slug: novo.slug,
      titulo: novo.titulo,
      ordem: 1,
      publicado: true,
    });
    console.log(
      erroDisc
        ? `[${novo.ordem}] módulo criado, disciplina falhou — ${erroDisc.message}`
        : `[${novo.ordem}] ${novo.titulo}: módulo + disciplina criados (despublicado)`,
    );
  }
}

main();
