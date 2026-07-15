import { expect, test } from "@playwright/test";

// Fluxo do assistente flutuante. Precisa de credenciais reais:
// E2E_EMAIL / E2E_PASS no ambiente — sem elas o teste é pulado.
const EMAIL = process.env.E2E_EMAIL;
const SENHA = process.env.E2E_PASS;

test.describe("assistente de IA flutuante", () => {
  test.skip(!EMAIL || !SENHA, "defina E2E_EMAIL e E2E_PASS para este fluxo");

  test("aparece em todas as telas autenticadas e abre o painel", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill("#email", EMAIL!);
    await page.fill("#password", SENHA!);
    await Promise.all([
      page.waitForURL(/\/painel/, { timeout: 30_000 }),
      page.click('button[type="submit"]'),
    ]);

    const fab = page.getByRole("button", { name: /abrir assistente de ia/i });
    await expect(fab).toBeVisible();

    await fab.click();
    const painel = page.getByRole("dialog", { name: /assistente de ia/i });
    await expect(painel).toBeVisible();
    await expect(painel).toContainText("Assistente CSMG");

    // Esc fecha
    await page.keyboard.press("Escape");
    await expect(painel).not.toBeVisible();
  });
});
