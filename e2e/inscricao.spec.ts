import { expect, test } from "@playwright/test";

import { emailDeTeste, gerarCpfValido, UTM_TESTE } from "./helpers/dados";

// Fluxo mais crítico do lançamento: a inscrição pública na landing.
// A visita usa UTMs de teste pra limpeza (utm_source=e2e).
const URL_LANDING = `/?utm_source=${UTM_TESTE}&utm_medium=teste&utm_campaign=${UTM_TESTE}`;

function mascararCpf(cpf: string): string {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

test.describe("inscrição na landing", () => {
  test("aviso de privacidade aparece e some no Entendi", async ({ page }) => {
    await page.goto(URL_LANDING);
    const aviso = page.getByRole("region", { name: /aviso de privacidade/i });
    await expect(aviso).toBeVisible();
    await aviso.getByRole("button", { name: /entendi/i }).click();
    await expect(aviso).toBeHidden();
    // A escolha persiste no reload.
    await page.reload();
    await expect(
      page.getByRole("region", { name: /aviso de privacidade/i }),
    ).toBeHidden();
  });

  test("CPF inválido é barrado com erro inline", async ({ page }) => {
    await page.goto(URL_LANDING);
    await page.fill("#nome", "Aluno E2E Inválido");
    await page.fill("#cpf", "111.111.111-11");
    await page.fill("#email", emailDeTeste("cpf-invalido"));
    await page.fill("#telefone", "(21) 99999-8888");
    await page.getByRole("button", { name: /quero me inscrever/i }).click();
    await expect(page.locator("#cpf-error")).toHaveText(/cpf inválido/i);
  });

  test("inscrição completa gera matrícula e bloqueia duplicata", async ({
    page,
  }) => {
    const cpf = gerarCpfValido();
    const email = emailDeTeste("inscricao");

    await page.goto(URL_LANDING);
    await page.fill("#nome", "Aluno E2E Inscrição");
    await page.fill("#cpf", mascararCpf(cpf));
    await page.fill("#email", email);
    await page.fill("#telefone", "(21) 99999-8888");
    await page.getByRole("button", { name: /quero me inscrever/i }).click();

    // Sucesso navega pra página de conversão (o Google Ads conta a URL).
    await page.waitForURL(/\/inscricao-realizada/, { timeout: 20_000 });
    await expect(page.getByText("Inscrição recebida!")).toBeVisible();
    await expect(page.getByText(/seu número de matrícula/i)).toBeVisible();

    // Mesmo CPF/e-mail de novo → recusa com a mensagem certa.
    await page.goto(URL_LANDING);
    await page.fill("#nome", "Aluno E2E Inscrição");
    await page.fill("#cpf", mascararCpf(cpf));
    await page.fill("#email", email);
    await page.fill("#telefone", "(21) 99999-8888");
    await page.getByRole("button", { name: /quero me inscrever/i }).click();
    await expect(
      page.getByText(/já existe uma inscrição com esse cpf ou e-mail/i),
    ).toBeVisible({ timeout: 20_000 });
  });
});
