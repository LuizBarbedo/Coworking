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
# O tour é um passeio guiado, que navega painel → módulo → disciplina.
NARRACAO = [
    # --- Aluno ---
    ("aluno", "bemvindo",
     "Oi! Que bom te ver por aqui. Seja muito bem-vindo à plataforma do "
     "Coworking Social! Vem comigo, que eu vou te mostrar tudo que dá pra "
     "fazer por aqui… é rapidinho, viu?"),
    ("aluno", "progresso",
     "Olha só: aqui em cima você acompanha o seu progresso. Dá pra ver "
     "quantas aulas você já assistiu e quantas avaliações já passou. "
     "Legal, né?"),
    ("aluno", "modulos",
     "Estes aqui são os seus módulos, o coração do curso. Deixa que eu "
     "abro um pra você ver o que tem dentro."),
    ("aluno", "disciplinas",
     "Prontinho! Cada módulo reúne várias disciplinas. Vou entrar numa "
     "delas pra te mostrar o conteúdo por dentro."),
    ("aluno", "abas",
     "Repara nessas abas: é aqui que tudo se organiza. Você tem as aulas, "
     "os materiais pra baixar, a avaliação e o assistente de inteligência "
     "artificial da disciplina."),
    ("aluno", "aulas",
     "Nesta aba ficam as aulas em vídeo. Quando terminar de assistir uma, "
     "é só marcar como concluída, que a plataforma registra o seu "
     "progresso automaticamente."),
    ("aluno", "avaliacao",
     "E na avaliação você testa o que aprendeu. Fica tranquilo: dá pra "
     "refazer quantas vezes precisar até mandar bem."),
    ("aluno", "assistente",
     "E ó, o melhor: esse assistente aqui no cantinho te acompanha em "
     "todas as telas. Bateu uma dúvida, é só chamar que ele responde na "
     "hora. Bons estudos, tá?"),
    # --- Master ---
    ("master", "bemvindo",
     "Seja bem-vindo à Área do Master! É aqui que você cria e organiza "
     "todo o conteúdo do curso, do seu jeito. Vou te mostrar o caminho."),
    ("master", "modulos",
     "Tudo começa pelos módulos. Cada módulo é uma grande área do curso. "
     "Deixa eu abrir um pra você ver as disciplinas dentro dele."),
    ("master", "disciplinas",
     "Aqui estão as disciplinas do módulo. É dentro de cada uma que você "
     "cadastra as aulas, os materiais e as avaliações. Vou entrar numa."),
    ("master", "aulas",
     "É aqui que você adiciona as videoaulas da disciplina. É bem "
     "simples: dá pra colar um link do vídeo ou enviar o arquivo "
     "direto. Fácil, né?"),
    ("master", "materiais",
     "Nesta parte você anexa os materiais de apoio: apostilas, PDFs e "
     "links pra os alunos baixarem e estudarem com calma."),
    ("master", "avaliacao",
     "E aqui você monta a avaliação final, com as perguntas e as "
     "alternativas. O aluno precisa passar nela pra concluir a "
     "disciplina."),
    ("master", "conhecimento",
     "E este é um recurso poderoso: a base de conhecimento. Você envia "
     "documentos aqui pra treinar o assistente de inteligência artificial "
     "daquela disciplina, com o conteúdo que você escolher."),
    ("master", "assistente",
     "O assistente também fica à sua disposição, pra você testar as "
     "respostas antes de liberar para os alunos. Bom trabalho!"),
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
