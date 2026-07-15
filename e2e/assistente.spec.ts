import { expect, test } from "@playwright/test";

// Fluxo do assistente flutuante, com a sessão do aluno de teste criada pelo
// projeto "setup" — não precisa mais de credenciais em E2E_EMAIL/E2E_PASS.
test.use({ storageState: "e2e/.auth/aluno.json" });

test.describe("assistente de IA flutuante", () => {
  test("aparece em todas as telas autenticadas e abre o painel", async ({
    page,
  }) => {
    await page.goto("/painel");

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
