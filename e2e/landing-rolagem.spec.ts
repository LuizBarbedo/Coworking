import { expect, test } from "@playwright/test";

// Landing de rolagem: o que precisa continuar verdadeiro na página que recebe o
// tráfego pago. Só leitura — nenhum spec aqui envia o formulário, então nada é
// gravado no banco.

const SECOES = [
  "inicio",
  "para-quem",
  "como-funciona",
  "temas",
  "aulas",
  "especialistas",
  "por-que-participar",
  "perguntas",
  "sobre",
  "inscricao",
];

test.beforeEach(async ({ page }) => {
  // Dispensa o aviso de privacidade antes de carregar: ele é fixo no rodapé e
  // esconde a barra de CTA de propósito (os dois disputariam a mesma faixa).
  await page.addInitScript(() =>
    window.localStorage.setItem("csmg-aviso-privacidade", "visto"),
  );
});

test("todas as seções do roteiro existem e são alcançáveis por âncora", async ({
  page,
}) => {
  await page.goto("/");
  for (const id of SECOES) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test("o CTA do hero leva ao formulário de inscrição", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Quero me inscrever", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#inscricao$/);
  await expect(page.locator("#inscricao")).toBeInViewport();
});

test("a página tem um único formulário, no fim", async ({ page }) => {
  await page.goto("/");
  // Um formulário só: numa landing de rolagem a inscrição fecha o argumento, e
  // duas instâncias iguais eram repetição visual sem ganho.
  await expect(page.getByLabel("Nome completo")).toHaveCount(1);
  await expect(page.locator("form")).toHaveCount(1);
  // E ele vive dentro da seção de inscrição, não no hero.
  await expect(page.locator("#inscricao form")).toHaveCount(1);
});

test("nenhum vídeo do YouTube carrega antes do clique", async ({ page }) => {
  const pedidosAoGoogle: string[] = [];
  page.on("request", (pedido) => {
    const url = pedido.url();
    if (/youtube|ytimg|googlevideo/.test(url)) pedidosAoGoogle.push(url);
  });

  await page.goto("/");
  await page.locator("#aulas").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await expect(page.locator("iframe")).toHaveCount(0);
  expect(pedidosAoGoogle).toEqual([]);
});

test("clicar na fachada carrega o player no domínio sem cookie", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#aulas").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /^Assistir:/ }).first().click();

  const player = page.locator("iframe").first();
  await expect(player).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/[\w-]{11}/,
  );
});

test("a barra de CTA aparece ao rolar e desaparece sobre o formulário", async ({
  page,
}) => {
  await page.goto("/");
  const barra = page.locator("a", { hasText: "Quero me inscrever" }).last();

  await page.locator("#temas").scrollIntoViewIfNeeded();
  await expect(barra).toBeVisible();

  await page.locator("#inscricao").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  // Com o formulário na tela a barra sai: quem já chegou nele não precisa dela.
  await expect(page.locator("#inscricao")).toBeInViewport();
});

test("toda foto de especialista tem descrição com nome e cargo", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#especialistas").scrollIntoViewIfNeeded();

  const fotos = page.locator("#especialistas img");
  await expect(fotos).toHaveCount(11);

  for (const foto of await fotos.all()) {
    const alt = await foto.getAttribute("alt");
    expect(alt?.trim()).toBeTruthy();
    expect(alt).toContain("—");
  }
});

test("o rodapé credita quem desenvolve e quem patrocina", async ({ page }) => {
  await page.goto("/");
  const rodape = page.locator("footer");
  await expect(rodape).toContainText("desenvolvida pela OROBORUS");
  await expect(rodape).toContainText("Patrocínio da Prefeitura do Rio de Janeiro");
});

test("diz quem pode participar, com idade e região", async ({ page }) => {
  await page.goto("/");
  // Sem os critérios do edital, a campanha paga atrai inscrição inelegível.
  const secao = page.locator("#para-quem");
  await expect(secao).toContainText("15 a 65");
  await expect(secao).toContainText("Região Metropolitana do Rio de Janeiro");
});

test("responde às objeções no FAQ e oferece o edital", async ({ page }) => {
  await page.goto("/");
  const faq = page.locator("#perguntas");
  await expect(faq.locator("details")).toHaveCount(6);

  // <details> nativo: acessível e funciona sem JavaScript.
  const primeira = faq.locator("details").first();
  await expect(primeira.locator("p")).toBeHidden();
  await primeira.locator("summary").click();
  await expect(primeira.locator("p")).toBeVisible();

  await expect(
    faq.getByRole("link", { name: /Baixar edital/ }),
  ).toBeVisible();
});

test("mostra os logos institucionais antes do formulário", async ({ page }) => {
  await page.goto("/");
  // Sinal de confiança vale quando a pessoa está decidindo, não depois.
  const posicao = await page.evaluate(() => {
    const patrocinio = document.querySelector('img[alt*="Patrocínio"]');
    const form = document.querySelector("form");
    if (!patrocinio || !form) return null;
    return {
      patrocinio: patrocinio.getBoundingClientRect().top + window.scrollY,
      formulario: form.getBoundingClientRect().top + window.scrollY,
    };
  });
  expect(posicao).not.toBeNull();
  expect(posicao!.patrocinio).toBeLessThan(posicao!.formulario);
});

test("o hero não tem o download do edital competindo com o CTA", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator("#inicio").getByRole("link", { name: /Baixar edital/ }),
  ).toHaveCount(0);
});
