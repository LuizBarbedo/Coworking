import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Testes unitários/integração (Vitest). Os testes E2E ficam em `e2e/`
// e são executados pelo Playwright — por isso são excluídos aqui.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // "server-only" lança erro fora de um bundle de servidor; nos testes
      // resolvemos para um stub vazio.
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
