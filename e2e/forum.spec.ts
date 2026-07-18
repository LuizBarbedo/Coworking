import { expect, test, type Page } from "@playwright/test";

import {
  criarAlunoAtivado,
  criarMembroEquipe,
  emailDeTeste,
  forumDisponivel,
  moderarPostDeTeste,
} from "./helpers/dados";

// A suíte precisa da migração 0015; sem ela, pula com aviso (não quebra o
// pipeline antes do Luiz aplicar).
//
// O ambiente tem OLLAMA_API_KEY real, então a moderação IA RODA nos testes.
// Pra ser determinístico: publicações que devem cair na caixa são spam
// comercial explícito (a IA marca suspeito; na dúvida, o prompt manda
// suspeitar), e o que não é sobre moderação aprova/rejeita direto no banco.

test.use({ storageState: "e2e/.auth/aluno.json" });

let migracaoAplicada = false;
test.beforeAll(async () => {
  migracaoAplicada = await forumDisponivel();
});
test.beforeEach(() => {
  test.skip(
    !migracaoAplicada,
    "Migração 0015 (fórum) ainda não aplicada no Supabase.",
  );
});

const SPAM = {
  titulo: "PROMOÇÃO imperdível de rifas e créditos",
  corpo:
    "Estou vendendo rifas e créditos de jogos com desconto! Me chama no zap 21 99999-0000 e aproveita. Nada a ver com o curso, é renda extra.",
};

async function logarNumaNovaSessao(
  page: Page,
  email: string,
  senha: string,
): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", senha);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(painel|master)/, { timeout: 30_000 });
}

function idDoPost(page: Page): string {
  const partes = new URL(page.url()).pathname.split("/");
  return partes[partes.indexOf("forum") + 1];
}

test.describe("fórum com moderação prévia", () => {
  test("post suspeito fica invisível até a aprovação humana; resposta segue a mesma fila", async ({
    page,
    browser,
  }) => {
    // Fluxo longo: 3 sessões e 2 moderações de IA reais (até 20s cada).
    test.setTimeout(180_000);
    // Aluno do setup (sessão compartilhada) publica o spam.
    await page.goto("/forum/novo");
    await page.fill("#post-titulo", SPAM.titulo);
    await page.fill("#post-corpo", SPAM.corpo);
    await page.getByRole("button", { name: "Publicar" }).click();
    await page.waitForURL(/\/forum\/[0-9a-f-]+/, { timeout: 60_000 });
    const postId = idDoPost(page);

    // A IA deve mandar pra caixa — o autor vê o banner de análise.
    await expect(page.getByText("está em análise")).toBeVisible();

    // Outro aluno NÃO vê o post pendente.
    const outroEmail = emailDeTeste("forum-leitor");
    const outraSenha = `E2e!${Date.now()}`;
    await criarAlunoAtivado(outroEmail, outraSenha);
    // newContext herda o storageState do test.use — zera pra logar de novo.
    const contextoLeitor = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const paginaLeitor = await contextoLeitor.newPage();
    await logarNumaNovaSessao(paginaLeitor, outroEmail, outraSenha);
    await paginaLeitor.goto("/forum");
    await expect(paginaLeitor.getByText(SPAM.titulo)).toHaveCount(0);
    await paginaLeitor.goto(`/forum/${postId}`);
    await expect(
      paginaLeitor.getByText("não existe ou foi movido"),
    ).toBeVisible();

    // Moderador aprova pela caixa de entrada.
    const modEmail = emailDeTeste("forum-mod");
    const modSenha = `E2e!${Date.now()}`;
    await criarMembroEquipe(modEmail, modSenha, "monitor", ["moderar_forum"]);
    const contextoMod = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const paginaMod = await contextoMod.newPage();
    await logarNumaNovaSessao(paginaMod, modEmail, modSenha);
    await paginaMod.waitForURL(/\/master\/forum/, { timeout: 30_000 });
    const itemSpam = paginaMod
      .locator("li", { hasText: SPAM.titulo })
      .first();
    await expect(itemSpam).toBeVisible();
    await itemSpam.getByRole("button", { name: "Aprovar" }).click();
    await expect(itemSpam).toHaveCount(0, { timeout: 15_000 });

    // Agora o outro aluno vê e responde — com spam, pra cair na fila também.
    await paginaLeitor.goto(`/forum/${postId}`);
    await expect(paginaLeitor.getByText(SPAM.titulo)).toBeVisible();
    await paginaLeitor.fill(
      'textarea[name="corpo"]',
      "Também vendo créditos baratos, me chama no zap 21 88888-0000!",
    );
    await paginaLeitor.getByRole("button", { name: "Responder" }).click();
    // A resposta pendente aparece só pro próprio autor, marcada.
    await expect(
      paginaLeitor.getByText("Em análise").first(),
    ).toBeVisible({ timeout: 60_000 });

    // Voto útil alterna no post aprovado.
    const botaoUtil = paginaLeitor.getByRole("button", { name: /Útil/ }).first();
    await botaoUtil.click();
    await expect(botaoUtil).toHaveText(/Útil\s*1/, { timeout: 15_000 });
    await botaoUtil.click();
    await expect(botaoUtil).toHaveText(/Útil\s*0/, { timeout: 15_000 });

    await contextoLeitor.close();
    await contextoMod.close();
  });

  test("equipe publica sem fila de moderação e com o selo Equipe", async ({
    browser,
  }) => {
    const email = emailDeTeste("forum-equipe");
    const senha = `E2e!${Date.now()}`;
    await criarMembroEquipe(email, senha, "monitor", ["moderar_forum"]);
    const contexto = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const pagina = await contexto.newPage();
    await logarNumaNovaSessao(pagina, email, senha);

    await pagina.goto("/forum/novo");
    await pagina.fill(
      "#post-titulo",
      `Aviso da equipe ${Date.now()}: calendário da semana`,
    );
    await pagina.fill(
      "#post-corpo",
      "As aulas novas do módulo entram no ar na segunda-feira.",
    );
    await pagina.getByRole("button", { name: "Publicar" }).click();
    await pagina.waitForURL(/\/forum\/[0-9a-f-]+/, { timeout: 30_000 });

    // Sem "em análise": entrou direto, com o selo da equipe.
    await expect(pagina.getByText("está em análise")).toHaveCount(0);
    await expect(pagina.getByText("Equipe", { exact: true })).toBeVisible();

    await contexto.close();
  });

  test("enquete aprovada tem voto único e mostra resultados", async ({
    page,
  }) => {
    const titulo = `Enquete e2e ${Date.now()}: melhor horário de estudo?`;
    await page.goto("/forum/novo");
    await page.getByRole("button", { name: "Enquete" }).click();
    await page.fill("#post-titulo", titulo);
    await page.getByPlaceholder("Opção 1").fill("Manhã");
    await page.getByPlaceholder("Opção 2").fill("Noite");
    await page.getByRole("button", { name: "Publicar" }).click();
    await page.waitForURL(/\/forum\/[0-9a-f-]+/, { timeout: 60_000 });
    const postId = idDoPost(page);

    // Aprova direto no banco (o teste é sobre a enquete, não a moderação).
    await moderarPostDeTeste(postId, "aprovado");
    await page.reload();

    // O autor vê os resultados direto (regra mostrarResultado) com o aviso
    // de voto definitivo e as duas opções nas barras.
    await expect(page.getByText("o voto é definitivo")).toBeVisible();
    await expect(page.getByText("Manhã")).toBeVisible();
    await expect(page.getByText("Noite")).toBeVisible();
  });

  test("post rejeitado com motivo pode ser editado e reenviado", async ({
    page,
  }) => {
    const titulo = `Post e2e reenvio ${Date.now()}`;
    await page.goto("/forum/novo");
    await page.fill("#post-titulo", titulo);
    await page.fill("#post-corpo", SPAM.corpo);
    await page.getByRole("button", { name: "Publicar" }).click();
    await page.waitForURL(/\/forum\/[0-9a-f-]+/, { timeout: 60_000 });
    const postId = idDoPost(page);

    // Rejeita direto no banco com motivo (o teste é sobre o recurso).
    await moderarPostDeTeste(postId, "rejeitado", "Conteúdo fora do escopo");
    await page.reload();
    await expect(page.getByText("não foi aprovada")).toBeVisible();
    await expect(page.getByText("Conteúdo fora do escopo")).toBeVisible();

    // Edita e reenvia — volta pra análise.
    await page
      .getByRole("button", { name: "Editar e reenviar pra moderação" })
      .click();
    await page.fill(
      'input[name="titulo"]',
      `Dúvida sobre a avaliação ${Date.now()}`,
    );
    await page.fill(
      'textarea[name="corpo"]',
      "Reescrevi: como funciona a nota mínima da avaliação final do módulo?",
    );
    await page.getByRole("button", { name: "Reenviar" }).click();
    // Reenviado passa pela IA de novo: em análise OU já aprovado (se a IA
    // aprovar a versão nova, que agora é legítima) — os dois são sucesso.
    await expect(
      page
        .getByText("está em análise")
        .or(page.getByRole("button", { name: /Útil/ }).first()),
    ).toBeVisible({ timeout: 60_000 });
  });
});
