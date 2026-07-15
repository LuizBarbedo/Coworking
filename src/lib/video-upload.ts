import {
  finalizarUploadVideo,
  iniciarUploadVideo,
} from "@/app/(plataforma)/master/actions";

/**
 * Envia um arquivo de vídeo direto para o R2 (presigned PUT com progresso) e
 * enfileira a transcodificação. Usado tanto ao adicionar uma aula quanto ao
 * editá-la. Roda no navegador (usa XMLHttpRequest).
 */
export async function enviarVideo(
  aulaId: string,
  disciplinaId: string,
  arquivo: File,
  onProgress?: (pct: number) => void,
): Promise<{ ok: true } | { erro: string }> {
  const inicio = await iniciarUploadVideo(
    aulaId,
    arquivo.name,
    arquivo.type || "video/mp4",
  );
  if ("erro" in inicio) return { erro: inicio.erro };

  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", inicio.url);
      xhr.setRequestHeader("Content-Type", arquivo.type || "video/mp4");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`R2 respondeu ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Falha de rede no envio."));
      xhr.send(arquivo);
    });
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha no envio." };
  }

  await finalizarUploadVideo(aulaId, inicio.chave, disciplinaId);
  return { ok: true };
}
