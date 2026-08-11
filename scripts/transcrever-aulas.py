"""Transcreve os áudios das videoaulas chamando o app csmg-transcrever na Modal.

    modal deploy scripts/modal/transcrever.py            # uma vez
    python scripts/transcrever-aulas.py AUDIO_DIR SAIDA_DIR

Os áudios vêm do yt-dlp (scripts/baixar-aulas.sh). O download não acontece aqui
nem na Modal: o anti-bot do YouTube barra IP de VPS e de datacenter, então o
yt-dlp roda por proxy na VPS e a Modal recebe só o arquivo.

Grava, por áudio, um .txt (texto corrido, pra redigir título/descrição e
alimentar a base da IA) e um .json com os trechos cronometrados.
"""

import json
import sys
from pathlib import Path

import modal

EXTENSOES = {".m4a", ".mp3", ".webm", ".opus", ".wav", ".mp4"}


def main() -> int:
    entrada = Path(sys.argv[1] if len(sys.argv) > 1 else "audio")
    saida = Path(sys.argv[2] if len(sys.argv) > 2 else "conteudo/transcricoes")
    saida.mkdir(parents=True, exist_ok=True)

    audios = sorted(p for p in entrada.iterdir() if p.suffix.lower() in EXTENSOES)
    if not audios:
        print(f"nenhum áudio em {entrada}")
        return 1

    # Idempotente: pula o que já foi transcrito.
    pendentes = [p for p in audios if not (saida / f"{p.stem}.txt").exists()]
    for p in audios:
        if p not in pendentes:
            print(f"[{p.stem}] já transcrito — pulado")
    if not pendentes:
        return 0

    Transcritor = modal.Cls.from_name("csmg-transcrever", "Transcritor")
    transcritor = Transcritor()

    # starmap roda os áudios em paralelo (a Modal escala os contêineres de GPU).
    entradas = [(p.read_bytes(), p.stem) for p in pendentes]
    print(f"transcrevendo {len(entradas)} áudio(s) na Modal...")

    for resultado in transcritor.transcrever.starmap(entradas, order_outputs=True):
        nome = resultado["nome"]
        (saida / f"{nome}.txt").write_text(resultado["texto"], encoding="utf-8")
        (saida / f"{nome}.json").write_text(
            json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(
            f"[{nome}] {len(resultado['texto'])} caracteres, "
            f"{resultado['duracao']}s, idioma {resultado['idioma']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
