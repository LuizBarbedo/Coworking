# Transcrição de áudio das videoaulas na Modal (faster-whisper em GPU).
#
# Serve pra preparar o cadastro de uma aula: com a transcrição em mãos dá pra
# escrever título e descrição fiéis ao que o professor falou, e alimentar a
# base de conhecimento da IA nas disciplinas que não têm apostila.
#
# O download do YouTube acontece FORA daqui (yt-dlp na VPS, por proxy): o
# anti-bot barra tanto o IP da VPS quanto o de datacenter da Modal. A Modal
# recebe só o áudio.
#
# Deploy:  modal deploy scripts/modal/transcrever.py
# Uso:     python scripts/transcrever-aulas.py AUDIO_DIR SAIDA_DIR
#
# Sem segredos: esta função não toca no R2, no Supabase nem no app.

import modal

app = modal.App("csmg-transcrever")

MODELO = "large-v3"

# Duas pegadinhas nesta imagem, ambas já mordidas:
#   - o faster-whisper importa `requests` mas não o declara como dependência;
#   - o ctranslate2 em GPU precisa do cuDNN 9, que não vem no debian_slim —
#     por isso as libs da NVIDIA e o LD_LIBRARY_PATH apontando pra elas.
imagem = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "faster-whisper==1.1.1",
        "requests==2.32.3",
        "nvidia-cublas-cu12==12.4.5.8",
        "nvidia-cudnn-cu12==9.1.0.70",
    )
    .env(
        {
            "HF_HUB_CACHE": "/cache",
            "LD_LIBRARY_PATH": (
                "/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:"
                "/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib"
            ),
        }
    )
)

# O modelo tem ~3 GB: fica num volume pra não baixar de novo a cada contêiner.
cache = modal.Volume.from_name("csmg-whisper-cache", create_if_missing=True)


@app.cls(
    image=imagem,
    gpu="A10G",
    volumes={"/cache": cache},
    timeout=3600,
    scaledown_window=120,
    # Teto de GPU do plano da conta é 10; 8 deixa folga pros outros apps do
    # workspace. O excedente do lote enfileira e entra conforme libera.
    max_containers=8,
)
class Transcritor:
    @modal.enter()
    def carregar(self):
        """Carrega o modelo uma vez por contêiner, não a cada áudio."""
        from faster_whisper import WhisperModel

        self.modelo = WhisperModel(MODELO, device="cuda", compute_type="float16")

    @modal.method()
    def transcrever(self, audio: bytes, nome: str = "audio") -> dict:
        """Devolve {nome, texto, trechos[], duracao, idioma} do áudio recebido."""
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as d:
            caminho = os.path.join(d, "entrada")
            with open(caminho, "wb") as f:
                f.write(audio)

            segmentos, info = self.modelo.transcribe(
                caminho,
                language="pt",
                beam_size=5,
                vad_filter=True,
                condition_on_previous_text=False,
            )

            trechos = [
                {
                    "inicio": round(s.start, 2),
                    "fim": round(s.end, 2),
                    "texto": s.text.strip(),
                }
                for s in segmentos
            ]

        texto = " ".join(t["texto"] for t in trechos).strip()
        print(f"{nome}: {len(texto)} caracteres, {round(info.duration)}s")
        return {
            "nome": nome,
            "texto": texto,
            "trechos": trechos,
            "duracao": round(info.duration),
            "idioma": info.language,
        }
