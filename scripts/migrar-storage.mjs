// Copia os ARQUIVOS do storage do Supabase cloud pro stack self-hosted local.
// Os buckets já devem existir no destino (migrar-dados-nuvem-local.sh).
// Lê cada objeto da nuvem com a service key antiga e sobe no local com a
// nova, preservando bucket, caminho e content-type. Idempotente (upsert).
//
// Uso: node scripts/migrar-storage.mjs
import { readFileSync } from "node:fs";

const lerEnv = (arquivo, chave) => {
  const m = readFileSync(arquivo, "utf8").match(
    new RegExp(`^${chave}=(.*)$`, "m"),
  );
  if (!m) throw new Error(`${chave} ausente em ${arquivo}`);
  return m[1].replace(/"/g, "");
};

// Sentido padrão: nuvem → local (migração). Com SENTIDO=local-nuvem inverte
// (redundância diária: espelha os arquivos do stack local pro projeto cloud).
const NUVEM_URL = lerEnv("/home/projetos/Coworking/.env.local", "SUPABASE_NUVEM_URL");
const NUVEM_KEY = lerEnv("/home/projetos/Coworking/.env.local", "SUPABASE_NUVEM_SERVICE_KEY");
const LOCAL_URL = "http://127.0.0.1:8000";
const LOCAL_KEY = lerEnv("/opt/coworking-supabase/.env", "SERVICE_ROLE_KEY");
const inverso = process.env.SENTIDO === "local-nuvem";
const [ORIGEM_URL, ORIGEM_KEY, DESTINO_URL, DESTINO_KEY] = inverso
  ? [LOCAL_URL, LOCAL_KEY, NUVEM_URL, NUVEM_KEY]
  : [NUVEM_URL, NUVEM_KEY, LOCAL_URL, LOCAL_KEY];

const cab = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

async function listar(bucket, prefixo = "") {
  const res = await fetch(`${ORIGEM_URL}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...cab(ORIGEM_KEY), "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: prefixo, limit: 1000 }),
  });
  if (!res.ok) throw new Error(`listar ${bucket}/${prefixo}: ${res.status}`);
  const itens = await res.json();
  const caminhos = [];
  for (const item of itens) {
    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.id === null) {
      caminhos.push(...(await listar(bucket, caminho))); // pasta: desce
    } else {
      caminhos.push(caminho);
    }
  }
  return caminhos;
}

const buckets = ["conhecimento", "avatares", "materiais"];
let total = 0;
for (const bucket of buckets) {
  const caminhos = await listar(bucket);
  console.log(`${bucket}: ${caminhos.length} objetos`);
  for (const caminho of caminhos) {
    const baixado = await fetch(
      `${ORIGEM_URL}/storage/v1/object/${bucket}/${caminho}`,
      { headers: cab(ORIGEM_KEY) },
    );
    if (!baixado.ok) throw new Error(`baixar ${bucket}/${caminho}: ${baixado.status}`);
    const corpo = Buffer.from(await baixado.arrayBuffer());
    const tipo = baixado.headers.get("content-type") ?? "application/octet-stream";
    const subida = await fetch(
      `${DESTINO_URL}/storage/v1/object/${bucket}/${caminho}`,
      {
        method: "POST",
        headers: { ...cab(DESTINO_KEY), "Content-Type": tipo, "x-upsert": "true" },
        body: corpo,
      },
    );
    if (!subida.ok) {
      throw new Error(`subir ${bucket}/${caminho}: ${subida.status} ${await subida.text()}`);
    }
    total++;
    console.log(`  ok ${bucket}/${caminho} (${corpo.length} bytes)`);
  }
}
console.log(`concluído: ${total} objetos copiados`);
