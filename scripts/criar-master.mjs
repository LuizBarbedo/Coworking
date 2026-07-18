// Cria (ou promove) o usuário master, que administra o conteúdo do AVA.
// Uso: node scripts/criar-master.mjs <email> <senha> ["Nome"]
//
// O papel fica em app_metadata.role = 'master' — só o service_role escreve isso,
// não é editável pelo usuário e já vem no JWT (getUser()).
//
// Idempotente: se a conta já existe, apenas garante o papel master (e reseta a
// senha se informada). Não usa /primeiro-acesso: o master não precisa de inscrição.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Carrega variáveis do .env.local (node não faz isso sozinho).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const email = (process.argv[2] ?? "").trim().toLowerCase();
const senha = process.argv[3] ?? "";
const nome = process.argv[4] ?? "Master";
if (!email || !senha) {
  console.error('Uso: node scripts/criar-master.mjs <email> <senha> ["Nome"]');
  process.exit(1);
}

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Procura conta existente pelo e-mail.
const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
const existente = lista?.users?.find((u) => u.email?.toLowerCase() === email);

if (existente) {
  const { error } = await admin.auth.admin.updateUserById(existente.id, {
    password: senha,
    app_metadata: { role: "master", nivel: "admin" },
    user_metadata: { ...existente.user_metadata, nome },
  });
  if (error) {
    console.error("Erro ao promover master:", error.message);
    process.exit(1);
  }
  console.log("\n✅ Conta existente promovida a master.");
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { role: "master", nivel: "admin" },
    user_metadata: { nome },
  });
  if (error) {
    console.error("Erro ao criar master:", error.message);
    process.exit(1);
  }
  console.log("\n✅ Usuário master criado.");
}

console.log("   E-mail: ", email);
console.log("   Papel:  ", "master, nível admin (app_metadata)");
console.log("\nEntre em http://localhost:3000/login com esse e-mail e senha.\n");
