# Transcodificação de vídeo na Modal, SOB DEMANDA (sem polling → ~US$0 parado).
#
# Fluxo:
#   1. O app sobe o original pro R2 e chama o web endpoint `disparar` (POST,
#      protegido por VIDEO_WEBHOOK_SECRET) com {jobId, aulaId, chaveOriginal}.
#   2. `disparar` dispara `transcodificar` em background e responde na hora.
#   3. `transcodificar` baixa do R2, normaliza p/ 720p (ffmpeg), gera thumbnail,
#      sobe a versão servível e CHAMA DE VOLTA o webhook do app (/api/video/
#      concluir) — que atualiza o banco. A Modal nunca vê a service-role key.
#
# Deploy:  modal deploy scripts/modal/transcode.py
#
# Secret "csmg-video" (na Modal) — só o necessário, SEM service-role:
#   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_VIDEOS,
#   VIDEO_WEBHOOK_SECRET, APP_WEBHOOK_URL

import os
import subprocess
import tempfile

import modal

app = modal.App("csmg-transcode")

imagem = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install("boto3==1.35.99", "requests==2.32.3", "fastapi[standard]==0.115.6")
)

segredo = modal.Secret.from_name("csmg-video")


def _s3():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def _chave_aula(aula_id: str) -> str:
    return f"aulas/{aula_id}/video.mp4"


def _chave_thumb(aula_id: str) -> str:
    return f"aulas/{aula_id}/thumb.jpg"


@app.function(image=imagem, secrets=[segredo], timeout=3600, cpu=4.0)
def transcodificar(job: dict) -> None:
    import requests

    s3 = _s3()
    bucket = os.environ["R2_BUCKET_VIDEOS"]
    aula_id = job["aulaId"]
    resultado = {"jobId": job.get("jobId"), "aulaId": aula_id}

    with tempfile.TemporaryDirectory() as d:
        orig = os.path.join(d, "original")
        mp4 = os.path.join(d, "video.mp4")
        jpg = os.path.join(d, "thumb.jpg")
        try:
            s3.download_file(bucket, job["chaveOriginal"], orig)

            dur = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", orig],
                capture_output=True, text=True,
            ).stdout.strip()
            duracao = int(float(dur)) if dur else 0

            subprocess.run(
                ["ffmpeg", "-y", "-i", orig, "-vf",
                 "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,"
                 "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "23",
                 "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", mp4],
                check=True, capture_output=True,
            )

            tem_thumb = True
            try:
                subprocess.run(
                    ["ffmpeg", "-y", "-ss", "3" if duracao > 4 else "0", "-i", orig,
                     "-vframes", "1", "-vf", "scale=640:-2", jpg],
                    check=True, capture_output=True,
                )
            except Exception:
                tem_thumb = False

            s3.upload_file(mp4, bucket, _chave_aula(aula_id),
                           ExtraArgs={"ContentType": "video/mp4"})
            if tem_thumb:
                s3.upload_file(jpg, bucket, _chave_thumb(aula_id),
                               ExtraArgs={"ContentType": "image/jpeg"})
            try:
                s3.delete_object(Bucket=bucket, Key=job["chaveOriginal"])
            except Exception:
                pass

            resultado.update({
                "status": "pronta",
                "duracao": duracao,
                "thumb": _chave_thumb(aula_id) if tem_thumb else None,
            })
        except Exception as e:
            print(f"falha na aula {aula_id}: {str(e)[:300]}")
            resultado.update({"status": "erro", "erro": str(e)[:500]})

    # Callback para o app atualizar o banco (service-role fica só do lado deles).
    try:
        requests.post(
            os.environ["APP_WEBHOOK_URL"],
            json=resultado,
            headers={"x-webhook-secret": os.environ["VIDEO_WEBHOOK_SECRET"]},
            timeout=30,
        )
    except Exception as e:
        print(f"callback falhou (aula {aula_id}): {str(e)[:200]}")


@app.function(image=imagem, secrets=[segredo])
@modal.fastapi_endpoint(method="POST", docs=False)
def disparar(job: dict):
    from fastapi import HTTPException

    # O segredo vem no corpo (evita depender de Header/Request na assinatura).
    if job.get("secret") != os.environ["VIDEO_WEBHOOK_SECRET"]:
        raise HTTPException(status_code=401, detail="não autorizado")
    if not job.get("aulaId") or not job.get("chaveOriginal"):
        raise HTTPException(status_code=400, detail="payload inválido")
    transcodificar.spawn(job)
    return {"ok": True}
