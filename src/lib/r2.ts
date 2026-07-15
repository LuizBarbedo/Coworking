import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cliente S3 apontando para o Cloudflare R2. As credenciais são server-only
// (nunca chegam ao browser). O R2 usa region "auto" e um endpoint por conta.

function env(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável de ambiente ${nome} ausente.`);
  return v;
}

let cliente: S3Client | null = null;
function r2(): S3Client {
  if (cliente) return cliente;
  const accountId = env("R2_ACCOUNT_ID");
  cliente = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cliente;
}

export function bucketVideos(): string {
  return env("R2_BUCKET_VIDEOS");
}

/** Chave do objeto final (servível) de uma aula. */
export function chaveAula(aulaId: string): string {
  return `aulas/${aulaId}/video.mp4`;
}

/** Chave do thumbnail de uma aula. */
export function chaveThumb(aulaId: string): string {
  return `aulas/${aulaId}/thumb.jpg`;
}

/** Chave do original recém-enviado, aguardando transcodificação. */
export function chaveOriginal(aulaId: string, nomeArquivo: string): string {
  const partes = nomeArquivo.split(".");
  const ext =
    partes.length > 1
      ? partes.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
      : "";
  return `raw/${aulaId}/original.${ext || "mp4"}`;
}

/** URL assinada para o master ENVIAR o original direto do navegador (PUT). */
export function urlUploadOriginal(
  chave: string,
  contentType: string,
  expiraEmSeg = 3600,
): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: bucketVideos(),
      Key: chave,
      ContentType: contentType,
    }),
    { expiresIn: expiraEmSeg },
  );
}

/** URL assinada para o aluno ASSISTIR (GET), curta e por requisição. */
export function urlAssistir(chave: string, expiraEmSeg = 4 * 3600): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: bucketVideos(), Key: chave }),
    { expiresIn: expiraEmSeg },
  );
}

/** Usada pelo worker: baixar o original e apagar depois de transcodificar. */
export function urlBaixarOriginal(chave: string, expiraEmSeg = 3600): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: bucketVideos(), Key: chave }),
    { expiresIn: expiraEmSeg },
  );
}

export async function apagarObjeto(chave: string): Promise<void> {
  await r2().send(
    new DeleteObjectCommand({ Bucket: bucketVideos(), Key: chave }),
  );
}
