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

test("política de privacidade responde", async ({ page }) => {
  await page.goto("/privacidade");
  await expect(
    page.getByRole("heading", { name: /política de privacidade/i }),
  ).toBeVisible();
});

test("robots.txt esconde a plataforma dos buscadores", async ({ request }) => {
  const resposta = await request.get("/robots.txt");
  expect(resposta.ok()).toBe(true);
  const corpo = await resposta.text();
  expect(corpo).toContain("Disallow: /painel");
  expect(corpo).toContain("Disallow: /master");
});
