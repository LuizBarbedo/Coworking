// Imprime o guia (HTML) em PDF A4 com numeração de páginas.
// Uso: node scripts/guia/gerar-pdf.mjs [caminho-do-html] [caminho-do-pdf]

import { chromium } from "@playwright/test";

const BASE =
  "/tmp/claude-0/-home-projetos-Coworking/f71d88e1-e47f-4dab-b001-5fbbb001bed9/scratchpad/guia";
const HTML = process.argv[2] ?? `${BASE}/guia.html`;
const PDF = process.argv[3] ?? `${BASE}/Guia-de-Operacao-Plataforma-CSMG.pdf`;

const navegador = await chromium.launch();
const page = await navegador.newPage();
await page.goto(`file://${HTML}`, { waitUntil: "load" });
// Garante que todas as imagens terminaram de carregar antes de imprimir.
await page.evaluate(() =>
  Promise.all(
    [...document.images]
      .filter((i) => !i.complete)
      .map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
  ),
);
await page.emulateMedia({ media: "print" });

// O rodapé leva o título do próprio documento — o script serve pros dois PDFs.
const titulo = (await page.title()).replace(/[<>&]/g, "");
const rodape = `
  <div style="width:100%;font-family:Arial,sans-serif;font-size:8pt;color:#64748b;
              padding:0 15mm;display:flex;justify-content:space-between;">
    <span>${titulo}</span>
    <span class="pageNumber"></span>
  </div>`;

await page.pdf({
  path: PDF,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: rodape,
});

await navegador.close();
console.log("PDF gerado em", PDF);
