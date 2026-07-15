import { test as setup } from "@playwright/test";

import { criarAlunoAtivado, emailDeTeste } from "./helpers/dados";

// Cria um aluno de teste já ativado, loga pela UI e guarda a sessão em
// e2e/.auth/aluno.json — os specs autenticados reaproveitam o cookie em vez
// de logar de novo a cada teste. O teardown global apaga o aluno.
export const ARQUIVO_SESSAO = "e2e/.auth/aluno.json";

setup("prepara o aluno de teste e a sessão", async ({ page }) => {
  const email = emailDeTeste("aluno");
  const senha = `E2e!${Date.now()}`;
  await criarAlunoAtivado(email, senha);

  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", senha);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/painel/, { timeout: 30_000 });
  await page.context().storageState({ path: ARQUIVO_SESSAO });
});
