import { expect, test } from "@playwright/test";

// Jornada do aluno na disciplina do seed demo (migration 0006): abre a aula,
// marca como assistida e passa na avaliação com o gabarito conhecido.
test.use({ storageState: "e2e/.auth/aluno.json" });

test.describe("aula e avaliação", () => {
  test("marca aula como assistida", async ({ page }) => {
    await page.goto("/modulos/fundamentos/introducao");

    const aulas = page.locator('[data-tour="aulas"]');
    await aulas.getByRole("button", { name: /assistir/i }).first().click();
    // Player (ou placeholder de vídeo em preparação) visível na aula aberta.
    await expect(page.locator('[data-tour="video"]').first()).toBeVisible();

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
