import { expect, test } from "@playwright/test";

// Smoke tests: garantem que as rotas principais respondem e que o
// proxy.ts protege a área autenticada. Não dependem de credenciais.

test("landing pública carrega com o formulário de inscrição", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("form")).toBeVisible();
});

test("página de login renderiza os campos de e-mail e senha", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
});

test("rota protegida redireciona visitante para /login", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login/);
});
