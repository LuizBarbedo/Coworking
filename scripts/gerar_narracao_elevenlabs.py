#!/usr/bin/env python3
"""Gera a narração do tour com a API do ElevenLabs (voz feminina pt-BR).

Voz escolhida: "Jessica" (expressiva), modelo eleven_multilingual_v2 — o melhor
do ElevenLabs para português do Brasil.

A chave da API é lida da variável de ambiente ELEVENLABS_API_KEY (nunca fica no
repositório). Uso:

    ELEVENLABS_API_KEY=xxxx python scripts/gerar_narracao_elevenlabs.py

Saída: public/tour/{aluno,master}/<passo>.mp3
"""

import json
import os
import pathlib
import urllib.request

VOICE_ID = "cgSgspJ2msm6clMCkdW9"  # Jessica
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"
VOICE_SETTINGS = {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.35,
    "use_speaker_boost": True,
}

# Roteiros em tom conversacional e caloroso — a pontuação guia a entonação.
NARRACAO = [
    ("aluno", "bemvindo",
     "Oi! Que bom te ver por aqui. Seja muito bem-vindo à plataforma do "
     "Coworking Social! Vem comigo, que eu vou te mostrar como tudo "
     "funciona… é rapidinho, viu?"),
    ("aluno", "progresso",
     "Olha só: aqui em cima você acompanha o seu progresso. Dá pra ver "
     "quantas aulas você já assistiu e quantas avaliações já passou. "
     "Legal, né?"),
    ("aluno", "modulos",
     "Estes aqui são os seus módulos. É só clicar em um deles pra abrir "
     "as disciplinas, os vídeos das aulas e os materiais de estudo."),
    ("aluno", "assistente",
     "E ó: sempre que bater uma dúvida, fala com o assistente aqui no "
     "cantinho. Ele conhece todo o conteúdo do curso e te responde na "
     "hora. Bons estudos, tá?"),
    ("master", "bemvindo",
     "Seja bem-vindo à Área do Master! É aqui que você cria e organiza "
     "todo o conteúdo do curso, do seu jeito."),
    ("master", "modulos",
     "Comece pelos módulos. Dentro de cada um você monta as disciplinas… "
     "e, dentro delas, as aulas, os materiais e as avaliações."),
    ("master", "conhecimento",
     "Aqui, na base de conhecimento, você envia documentos pra treinar o "
     "assistente de inteligência artificial daquela disciplina."),
    ("master", "assistente",
     "E o assistente também fica à sua disposição, pra você testar as "
     "respostas antes de liberar para os alunos."),
]


def sintetizar(texto: str, chave: str) -> bytes:
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        f"?output_format={OUTPUT_FORMAT}"
    )
    corpo = json.dumps(
        {"text": texto, "model_id": MODEL_ID, "voice_settings": VOICE_SETTINGS}
    ).encode()
    req = urllib.request.Request(
        url,
        data=corpo,
        headers={"xi-api-key": chave, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return resp.read()


def main() -> None:
    chave = os.environ.get("ELEVENLABS_API_KEY")
    if not chave:
        raise SystemExit("Defina ELEVENLABS_API_KEY no ambiente.")
    base = pathlib.Path("public/tour")
    for perfil, passo, texto in NARRACAO:
        destino = base / perfil
        destino.mkdir(parents=True, exist_ok=True)
        arquivo = destino / f"{passo}.mp3"
        arquivo.write_bytes(sintetizar(texto, chave))
        print(f"salvo {arquivo}")


if __name__ == "__main__":
    main()
