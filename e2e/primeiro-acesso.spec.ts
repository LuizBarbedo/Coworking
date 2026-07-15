import { expect, test } from "@playwright/test";

import { criarAlunoSemAtivacao, emailDeTeste } from "./helpers/dados";

// Ativação da conta: matrícula + e-mail da inscrição selecionada viram senha.
test.describe("primeiro acesso", () => {
  test("ativa a conta e entra no painel", async ({ page }) => {
    const email = emailDeTeste("ativacao");
    const matricula = await criarAlunoSemAtivacao(email);
    const senha = `E2e!${Date.now()}`;

    await page.goto("/primeiro-acesso");
    await page.fill("#matricula", matricula);
    await page.fill("#email", email);
    await page.fill("#password", senha);
    await page.fill("#confirmar", senha);
    await page.getByRole("button", { name: /ativar meu acesso/i }).click();

    await page.waitForURL(/\/painel/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/painel/);
  });

  test("matrícula que não confere é recusada", async ({ page }) => {
    const senha = `E2e!${Date.now()}`;
    await page.goto("/primeiro-acesso");
    await page.fill("#matricula", "0000000000");
    await page.fill("#email", emailDeTeste("nao-existe"));
    await page.fill("#password", senha);
    await page.fill("#confirmar", senha);
    await page.getByRole("button", { name: /ativar meu acesso/i }).click();

    await expect(
      page.getByText(/não encontramos uma inscrição com essa matrícula/i),
    ).toBeVisible({ timeout: 20_000 });
  });
});
