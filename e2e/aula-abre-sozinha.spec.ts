import { expect, test } from "@playwright/test";
import { criarAdmin } from "./helpers/dados";

// A aula da disciplina abre sozinha — sem depender do seed demo: pega a
// primeira disciplina publicada que tenha aula e entra nela como aluno.
test.use({ storageState: "e2e/.auth/aluno.json" });

let caminho: string | null = null;

test.beforeAll(async () => {
  const admin = criarAdmin();
  const { data: modulos } = await admin
    .from("modulos")
    .select("slug, publicado, disciplinas(slug, ordem, publicado)")
    .eq("publicado", true)
    .order("ordem");

  for (const modulo of modulos ?? []) {
    for (const disciplina of (modulo.disciplinas ?? []) as {
      slug: string;
      publicado: boolean;
    }[]) {
      if (!disciplina.publicado) continue;
      const { data: disc } = await admin
        .from("disciplinas")
        .select("id")
        .eq("slug", disciplina.slug)
        .maybeSingle();
      if (!disc) continue;
      const { count } = await admin
        .from("aulas")
        .select("*", { count: "exact", head: true })
        .eq("disciplina_id", disc.id);
      if (count) {
        caminho = `/modulos/${modulo.slug}/${disciplina.slug}`;
        return;
      }
    }
  }
});

test("o vídeo da aula já vem aberto ao entrar na disciplina", async ({
  page,
}) => {
  test.skip(!caminho, "Nenhuma disciplina publicada com aula neste ambiente.");

  await page.goto(caminho!);
  // Sem nenhum clique: o player está na tela e o cabeçalho está expandido.
  await expect(page.locator('[data-tour="video"]').first()).toBeVisible();
  await expect(
    page.locator('[data-tour="aulas"]').getByRole("button", { expanded: true }),
  ).toHaveCount(1);
});
