// Confere que a captura do guia não deixou rastro: conta temporária,
// post de exemplo no fórum e eventos da conta.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync("/home/projetos/Coworking/.env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
const sobrando = data.users.filter((u) =>
  (u.email ?? "").startsWith("e2e-guia-"),
);
console.log("contas temporárias sobrando:", sobrando.length);

const { data: posts } = await admin
  .from("forum_posts")
  .select("id, titulo, status")
  .ilike("titulo", "%margem de lucro de um produto artesanal%");
console.log("posts de exemplo sobrando:", posts?.length ?? 0);

const { count } = await admin
  .from("forum_posts")
  .select("id", { count: "exact", head: true })
  .eq("status", "pendente");
console.log("fila de moderação (pendentes):", count);
