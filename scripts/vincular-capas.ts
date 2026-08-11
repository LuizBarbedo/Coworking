// Sobe as capas geradas (capas-geradas/<slug>.png) pro bucket público
// materiais e vincula em modulos.capa_url.
//
//   simulação: npx tsx --conditions=react-server scripts/vincular-capas.ts --simular
//   valendo:   npx tsx --conditions=react-server scripts/vincular-capas.ts [slug ...]
//
// Sem slug, percorre todo módulo que ainda não tem capa e cuja imagem existe
// na pasta. O PNG do SDXL tem ~1,2 MB: vira WebP (~45 KB) antes de subir, se
// não o painel fica pesado no celular. O `?v=` no fim da URL fura o cache do
// CDN quando a capa é regerada.

export {}; // módulo isolado: os scripts daqui declaram `main` no escopo global

process.loadEnvFile(".env.local");

import { readFile } from "node:fs/promises";

const SIMULAR = process.argv.includes("--simular");
const SLUGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const sharp = (await import("sharp")).default;
  const admin = createSupabaseAdminClient();

  const { data: modulos } = await admin
    .from("modulos")
    .select("id, slug, titulo, capa_url")
    .order("ordem");

  for (const modulo of modulos ?? []) {
    if (SLUGS.length ? !SLUGS.includes(modulo.slug) : modulo.capa_url) continue;

    let png: Buffer;
    try {
      png = await readFile(`capas-geradas/${modulo.slug}.png`);
    } catch {
      console.log(`[${modulo.slug}] sem imagem em capas-geradas — pulado`);
      continue;
    }

    // 960 px de largura e qualidade 80: é o formato das capas que já estão no
    // ar (~45 KB), o suficiente pro card do painel sem pesar no celular.
    const webp = await sharp(png).resize({ width: 960 }).webp({ quality: 80 }).toBuffer();
    const caminho = `capas/${modulo.id}.webp`;
    const url =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/materiais/` +
      `${caminho}?v=${webp.length}`;

    if (SIMULAR) {
      console.log(
        `[${modulo.slug}] subiria ${Math.round(webp.length / 1024)} KB → ${caminho}`,
      );
      continue;
    }

    const { error: erroUp } = await admin.storage
      .from("materiais")
      .upload(caminho, webp, { contentType: "image/webp", upsert: true });
    if (erroUp) {
      console.error(`[${modulo.slug}] falha no upload — ${erroUp.message}`);
      continue;
    }
    const { error } = await admin
      .from("modulos")
      .update({ capa_url: url })
      .eq("id", modulo.id);
    console.log(
      error
        ? `[${modulo.slug}] capa subiu, vínculo falhou — ${error.message}`
        : `[${modulo.slug}] ok (${Math.round(webp.length / 1024)} KB)`,
    );
  }
}

main();
