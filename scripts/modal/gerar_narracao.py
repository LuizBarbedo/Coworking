# Gera a narração do tour guiado com Kokoro-82M (voz feminina pt-BR pf_dora).
# Roda em CPU na Modal — não exige GPU nem método de pagamento.
#
# Uso:
#   modal run scripts/modal/gerar_narracao.py
#
# Saída: public/tour/{aluno,master}/<passo>.wav
# (o front-end toca esses arquivos sincronizados com o driver.js)

import pathlib

import modal

app = modal.App("csmg-narracao")

imagem = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("espeak-ng")
    .pip_install("kokoro==0.9.4", "soundfile==0.13.1", "misaki[en]==0.9.4")
    .env({"HF_HOME": "/cache/hf"})
)

cache_hf = modal.Volume.from_name("csmg-hf-cache", create_if_missing=True)

# Voz feminina pt-BR do Kokoro. lang_code "p" = português brasileiro.
VOZ = "pf_dora"
LANG = "p"

# (perfil, passo, texto) — o texto é o roteiro falado de cada etapa.
NARRACAO = [
    ("aluno", "bemvindo",
     "Olá! Seja bem-vindo à plataforma do Coworking Social. "
     "Vou te mostrar rapidinho como ela funciona."),
    ("aluno", "progresso",
     "Aqui em cima você acompanha o seu progresso geral: "
     "quantas aulas já assistiu e quantas avaliações já passou."),
    ("aluno", "modulos",
     "Estes são os seus módulos. Clique em um deles para abrir as "
     "disciplinas, as aulas em vídeo e os materiais."),
    ("aluno", "assistente",
     "E sempre que tiver uma dúvida, fale com o assistente aqui no canto. "
     "Ele conhece o conteúdo do curso e responde na hora. Bons estudos!"),
    ("master", "bemvindo",
     "Bem-vindo à Área do Master. Aqui é onde você cria e organiza "
     "todo o conteúdo do curso."),
    ("master", "modulos",
     "Comece pelos módulos. Dentro de cada módulo você cria as "
     "disciplinas, e dentro delas as aulas, os materiais e as avaliações."),
    ("master", "conhecimento",
     "Na base de conhecimento você envia documentos para treinar o "
     "assistente de inteligência artificial daquela disciplina."),
    ("master", "assistente",
     "O assistente também fica disponível para você testar as respostas "
     "antes de liberar para os alunos."),
]


@app.function(image=imagem, volumes={"/cache/hf": cache_hf}, cpu=4.0, timeout=1200)
def sintetizar(itens: list) -> list:
    import io

    import soundfile as sf
    from kokoro import KPipeline

    pipe = KPipeline(lang_code=LANG)
    saida = []
    for perfil, passo, texto in itens:
        # Kokoro devolve a fala em trechos; concatenamos num só clipe.
        audios = [audio for _, _, audio in pipe(texto, voice=VOZ, speed=1.0)]
        import numpy as np

        completo = np.concatenate(audios) if len(audios) > 1 else audios[0]
        buf = io.BytesIO()
        sf.write(buf, completo, 24000, format="WAV")
        saida.append((perfil, passo, buf.getvalue()))
        print(f"gerado {perfil}/{passo}.wav ({len(completo) / 24000:.1f}s)")
    return saida


@app.local_entrypoint()
def main():
    base = pathlib.Path("public/tour")
    for perfil, passo, dados in sintetizar.remote(NARRACAO):
        destino = base / perfil
        destino.mkdir(parents=True, exist_ok=True)
        (destino / f"{passo}.wav").write_bytes(dados)
        print(f"salvo {destino / passo}.wav")
