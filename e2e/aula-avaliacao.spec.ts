import { expect, test } from "@playwright/test";
import { criarAdmin } from "./helpers/dados";

// Jornada do aluno na disciplina do seed demo (migration 0006): abre a aula,
// marca como assistida e passa na avaliação com o gabarito conhecido.
test.use({ storageState: "e2e/.auth/aluno.json" });

// O módulo demo pode ser removido em produção (conteúdo real no lugar);
// sem ele não há gabarito estável — os testes pulam com aviso.
let seedPresente = false;
test.beforeAll(async () => {
  const { data } = await criarAdmin()
    .from("modulos")
    .select("id")
    .eq("slug", "fundamentos")
    .maybeSingle();
  seedPresente = Boolean(data);
});

test.describe("aula e avaliação", () => {
  test.beforeEach(() => {
    test.skip(
      !seedPresente,
      "Módulo demo 'fundamentos' (seed 0006) não existe neste ambiente.",
    );
  });

  test("marca aula como assistida", async ({ page }) => {
    await page.goto("/modulos/fundamentos/introducao");

    // A aula já vem aberta: o player (ou o placeholder de vídeo em preparação)
    // aparece sem clique nenhum. O cabeçalho segue servindo de fechar/abrir, e
    // fechar registra a aula na URL (link compartilhável).
    const video = page.locator('[data-tour="video"]').first();
    await expect(video).toBeVisible();

    const cabecalho = page
      .locator('[data-tour="aulas"] > li')
      .first()
      .getByRole("button")
      .first();
    await cabecalho.click();
    await expect(video).toBeHidden();
    await cabecalho.click();
    await expect(video).toBeVisible();
    await expect(page).toHaveURL(/[?&]aula=/);

    const marcar = page.getByRole("button", { name: /marcar como assistida/i });
    if (await marcar.isVisible().catch(() => false)) {
      await marcar.click();
    }
    await expect(page.getByText(/aula concluída/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("responde a avaliação e é aprovado", async ({ page }) => {
    await page.goto("/modulos/fundamentos/introducao");
    await page.locator('[data-aba="avaliacao"]').click();

    // Gabarito do seed (0006): 2 perguntas, respostas corretas conhecidas.
    // O radio é sr-only; o clique vai no label (que inclui a letra "A/B/C").
    for (const resposta of [
      "Coworking Social de Mudanças Globais",
      "Atuação em rede e colaboração",
    ]) {
      await page.locator("label").filter({ hasText: resposta }).click();
      await expect(
        page.getByRole("radio", { name: new RegExp(resposta) }),
      ).toBeChecked();
    }
    await page.getByRole("button", { name: /enviar respostas/i }).click();

    await expect(page.getByText(/aprovado/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
  });
});
