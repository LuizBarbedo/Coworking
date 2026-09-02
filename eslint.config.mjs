import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Diretórios de build alternativos: .next-nova (deploy atômico) e
    // qualquer .next-<algo> usado pra verificar um build sem tocar o que a
    // produção está servindo.
    ".next-*/**",
    // Artefatos do Supabase CLI (`supabase start`): código minificado de
    // terceiro que gerava 150+ erros e escondia os avisos do nosso código.
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
