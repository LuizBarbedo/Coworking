import { expect, test } from "@playwright/test";

import { criarMembroEquipe, emailDeTeste } from "./helpers/dados";

// Specs de nível de acesso logam com contas próprias — sem a sessão de
// aluno compartilhada do setup.
test.use({ storageState: { cookies: [], origins: [] } });

async function logar(
  page: import("@playwright/test").Page,
  email: string,
  senha: string,
) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", senha);
  await page.click('button[type="submit"]');
}

test.describe("níveis de acesso da equipe", () => {
  test("monitor só alcança o que foi concedido", async ({ page }) => {
    const email = emailDeTeste("monitor");
    const senha = `E2e!${Date.now()}`;
    await criarMembroEquipe(email, senha, "monitor", ["ver_relatorios"]);

    // Sem visao_aluno o layout do AVA manda pro hub; sem editar_conteudo a
    // home do hub manda pra primeira aba permitida: os relatórios.
    await logar(page, email, senha);
    await page.waitForURL(/\/master\/relatorios/, { timeout: 30_000 });
    await expect(
      page.getByText("Acompanhamento de inscrições"),
    ).toBeVisible();

    // A aba Equipe (só de admin) não aparece pra monitor.
    await expect(page.getByRole("link", { name: "Equipe" })).toHaveCount(0);

    // Acesso direto ao AVA de aluno volta pro hub.
    await page.goto("/painel");
    await page.waitForURL(/\/master\/relatorios/, { timeout: 30_000 });

    // Acesso direto à gestão de equipe idem.
    await page.goto("/master/equipe");
    await page.waitForURL(/\/master\/relatorios/, { timeout: 30_000 });
  });

  test("admin vê as abas e gerencia a equipe", async ({ page }) => {
    const email = emailDeTeste("admin");
    const senha = `E2e!${Date.now()}`;
    await criarMembroEquipe(email, senha, "admin");

    // Admin pode ver como aluno: o login cai no /painel normalmente.
    await logar(page, email, senha);
    await page.waitForURL(/\/painel/, { timeout: 30_000 });

    await page.goto("/master/equipe");
    await expect(
      page.getByRole("heading", { name: "Equipe", exact: true }),
    ).toBeVisible();
    // Abas do hub completas pra admin.
    await expect(page.getByRole("link", { name: "Conteúdo" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Relatórios" }),
    ).toBeVisible();
    // Formulários de cadastro presentes.
    await expect(
      page.getByRole("button", { name: "Cadastrar e convidar" }),
    ).toHaveCount(2);
  });
});
