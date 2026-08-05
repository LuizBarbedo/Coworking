import { expect, test } from "@playwright/test";

import {
  criarInscricaoNaTurma,
  emailDeTeste,
  listarTurmas,
} from "./helpers/dados";

// Turmas (migração 0023): quem é de turma que ainda não abriu não ativa a
// conta — cai na página de espera com a data. Os testes pulam sozinhos
// quando a 0023 não está aplicada ou não existe turma com liberação futura.
test.describe("turmas — acesso por data de liberação", () => {
  test("página de espera mostra a data (ou manda pro login)", async ({
    page,
  }) => {
    const turmas = await listarTurmas();
    test.skip(turmas === null, "migração 0023 não aplicada");

    const fechadas = (turmas ?? []).filter(
      (t) => t.liberacao_em && new Date(t.liberacao_em) > new Date(),
    );
    await page.goto("/aguardando-liberacao");
    if (fechadas.length === 0) {
      // Sem turma fechada a página se desativa sozinha.
      await page.waitForURL(/\/login/);
    } else {
      await expect(
        page.getByText(/seu acesso será liberado em/i),
      ).toBeVisible();
    }
  });

  test("primeiro acesso de turma fechada cai na página de espera", async ({
    page,
  }) => {
    const turmas = await listarTurmas();
    const fechada = (turmas ?? []).find(
      (t) => t.liberacao_em && new Date(t.liberacao_em) > new Date(),
    );
    test.skip(!fechada, "nenhuma turma com liberação futura");

    const email = emailDeTeste("turma-fechada");
    const matricula = await criarInscricaoNaTurma(email, fechada!.numero);
    const senha = `E2e!${Date.now()}`;

    await page.goto("/primeiro-acesso");
    await page.fill("#matricula", matricula);
    await page.fill("#email", email);
    await page.fill("#password", senha);
    await page.fill("#confirmar", senha);
    await page.getByRole("button", { name: /ativar meu acesso/i }).click();

    await page.waitForURL(/\/aguardando-liberacao/, { timeout: 30_000 });
    await expect(page.getByText(/seu acesso será liberado em/i)).toBeVisible();
  });
});
