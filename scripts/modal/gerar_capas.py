# Gerador de capas dos módulos — job avulso na Modal (GPU serverless).
#
# Roda o FLUX.1-schnell (Apache 2.0) e grava os PNGs 16:9 em ./capas-geradas/.
# Os pesos ficam cacheados num Volume ("csmg-hf-cache"): só o primeiro run
# baixa o modelo. Depois de gerar, o upload pro bucket e o vínculo capa_url
# são feitos fora daqui (service_role do Supabase).
#
# Uso:
#   modal run scripts/modal/gerar_capas.py            # todas as capas
#   modal run scripts/modal/gerar_capas.py --so legado-cultural  # só uma
#
# Estilo: ilustração flat na paleta da marca (verde-mar + âmbar), sem texto —
# modelos de imagem erram texto; o título já aparece no card do painel.

import io
import json
from pathlib import Path

import modal

app = modal.App("csmg-capas")

imagem = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch==2.7.1",
        "diffusers==0.34.0",
        "transformers==4.53.1",
        "accelerate==1.8.1",
        "sentencepiece",
        "protobuf",
    )
    .env({"HF_HOME": "/cache"})
)
cache = modal.Volume.from_name("csmg-hf-cache", create_if_missing=True)

ESTILO = (
    "Flat vector illustration, online course cover art. Deep teal (#17605B) "
    "background, warm amber (#D98E1B) and cream accents, modern minimal "
    "Brazilian design, subtle geometric shapes, soft lighting. "
    "No text, no letters, no words, no numbers."
)

# Um tema por módulo (slug → cena). Módulo novo? É só acrescentar aqui.
TEMAS: dict[str, str] = {
    "teste-de-modulo": "A friendly laptop showing a learning platform interface, play button, progress bars, welcoming atmosphere",
    "apresentacao-do-curso": "A diverse group of Brazilian entrepreneurs gathered in a welcoming circle, handshake, community spirit, Rio de Janeiro skyline silhouette",
    "empreendendo-com-legado-cultural": "A cavaquinho (small Brazilian guitar) surrounded by musical notes, choro music atmosphere, cultural heritage",
    "empreender-com-organizacao": "An organized kanban board with neat columns, gears turning smoothly, clock, order emerging from chaos",
    "contabilidade-e-nocoes-financeiras": "A balance scale with coins, calculator, ascending bar chart, ledger book",
    "tecnicas-de-compra-e-venda": "A market stall with goods, two hands exchanging a package, shopping bag, fair trade",
    "estrategias-de-marketing-digital": "A megaphone radiating social media icons, smartphone, growth arrows, engagement hearts",
    "planejamento-e-precificacao": "A price tag on a balance with a compass and ruler, strategic planning grid",
    "empreendendo-com-inteligencia-artificial": "A friendly robot hand and human hand reaching toward each other, neural network constellation",
    "gestao-e-planejamento-financeiro": "A safe vault with a growing plant on top, cash flow river, upward chart",
    "aspectos-juridicos-e-formalizacao": "A scale of justice with a signed document and official stamp, pillars",
    "financiamento-e-cooperativismo-de-credito": "Many hands joined in a circle around a coin, cooperative unity, credit union spirit",
    "empreendedorismo-social": "A young apprentice in work uniform receiving a badge, a hillside community of small houses behind, open door to a first job, hopeful atmosphere",
    "cooperativismo-principios-e-aplicacoes": "A circle of people holding hands around two simple wheat stalks, one raised hand voting, simple composition, plenty of empty background",
}


@app.function(
    image=imagem,
    # A10G (24 GB): cabe o FLUX.1-schnell com offload de CPU e é a GPU
    # disponível no free tier da Modal (L40S exige método de pagamento).
    gpu="A10G",
    volumes={"/cache": cache},
    timeout=1800,
)
def gerar(temas: dict[str, str]) -> dict[str, bytes]:
    import torch
    from diffusers import StableDiffusionXLPipeline

    # SDXL base: aberto (sem gate no Hugging Face) e cabe folgado na A10G.
    # O FLUX.1-schnell passou a exigir aceite de licença autenticado.
    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.bfloat16,
        variant="fp16",
        use_safetensors=True,
    )
    pipe.to("cuda")

    capas: dict[str, bytes] = {}
    for slug, tema in temas.items():
        img = pipe(
            prompt=f"{tema}. {ESTILO}",
            negative_prompt=(
                "text, letters, words, numbers, watermark, signature, "
                "photo, photorealistic, 3d render, blurry, low quality"
            ),
            num_inference_steps=28,
            guidance_scale=7.0,
            width=1344,
            height=768,
            generator=torch.Generator("cuda").manual_seed(len(slug)),
        ).images[0]
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        capas[slug] = buf.getvalue()
        print(f"gerada: {slug} ({len(capas[slug]) // 1024} KB)")
    return capas


@app.local_entrypoint()
def main(so: str = ""):
    temas = {so: TEMAS[so]} if so else TEMAS
    saida = Path("capas-geradas")
    saida.mkdir(exist_ok=True)
    capas = gerar.remote(temas)
    for slug, png in capas.items():
        (saida / f"{slug}.png").write_bytes(png)
    print(json.dumps({"geradas": sorted(capas)}, ensure_ascii=False))
