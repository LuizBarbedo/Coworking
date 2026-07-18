import { expect, test } from "@playwright/test";

import { perfilDisponivel } from "./helpers/dados";

// Usa a sessão do aluno do setup. A suíte pula com aviso enquanto a
// migração 0016 (perfis) não for aplicada.
test.use({ storageState: "e2e/.auth/aluno.json" });

let migracaoAplicada = false;
test.beforeAll(async () => {
  migracaoAplicada = await perfilDisponivel();
});
test.beforeEach(() => {
  test.skip(
    !migracaoAplicada,
    "Migração 0016 (perfis) ainda não aplicada no Supabase.",
  );
});

// PNG de 1x1 pixel pro teste de upload da foto.
const PNG_MINUSCULO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("perfil do aluno", () => {
  test("edita bio e foto e vê o perfil como a turma vê", async ({ page }) => {
    // A bio passa pela moderação de políticas (IA real) — texto inocente.
    test.setTimeout(90_000);
    await page.goto("/perfil");
    await page.fill(
      "#perfil-bio",
      "Estudante da primeira turma, apaixonado por direitos humanos e mudanças globais.",
    );
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByText("Perfil salvo.")).toBeVisible({
      timeout: 60_000,
    });

    await page.setInputFiles("#perfil-foto", {
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PNG_MINUSCULO,
    });
    await page.getByRole("button", { name: "Atualizar foto" }).click();
    await expect(page.getByText("Foto atualizada.")).toBeVisible({
      timeout: 30_000,
    });

    // Visão pública: bio, números do fórum e progresso.
    await page.getByRole("link", { name: "Ver como a turma vê" }).click();
    await expect(page.getByText("apaixonado por direitos humanos")).toBeVisible();
    await expect(page.getByText("Participação no fórum")).toBeVisible();
    await expect(page.getByText("Progresso no curso")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Editar perfil" }),
    ).toBeVisible();
  });

  test("perfil do autor é acessível pelo fórum", async ({ page }) => {
    await page.goto("/forum");
    // Abre a primeira publicação aprovada (o post de boas-vindas garante uma).
    await page
      .locator('a[href^="/forum/"]')
      .filter({ hasNotText: "Nova publicação" })
      .first()
      .click();
    await page.waitForURL(/\/forum\/[0-9a-f-]+/);
    // O nome do autor linka pro perfil público.
    await page.locator('a[href^="/perfil/"]').first().click();
    await page.waitForURL(/\/perfil\/[0-9a-f-]+/);
    await expect(page.getByText("Participação no fórum")).toBeVisible();
  });
});
