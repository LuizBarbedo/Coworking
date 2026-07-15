import { defineConfig, devices } from "@playwright/test";

// Testes E2E (fluxos reais no navegador). Rodam contra o servidor local que
// estiver de pé (produção via systemd ou `next start`); se não houver, o
// Playwright sobe o dev server. ATENÇÃO: os specs escrevem no banco do
// .env.local — os dados são marcados (e2e-*@example.com, utm_source=e2e) e
// apagados pelo teardown global.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalTeardown: "./e2e/teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Cria o aluno de teste e salva a sessão antes dos specs.
    { name: "setup", testMatch: /setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
