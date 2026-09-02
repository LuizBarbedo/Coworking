# Landing de rolagem (agosto/2026)

Registro do que foi construído, por quê, e o que ficou em aberto. A landing
antiga era uma tela única (hero + formulário); esta é long-form, seguindo o
roteiro da marketing.

Convenções de código ficam em `AGENTS.md` (seção "Landing de rolagem"). O
ambiente para a marketing revisar antes do deploy está em
`docs/ambiente-de-teste-landing.md`.

## O que foi feito

**Conteúdo.** As nove seções do roteiro (`landing-material/roteiro.txt`,
extraído do PDF) viraram dado tipado em `lib/site/conteudo-landing.ts`: 11
temas, 11 especialistas, 5 motivos, 7 perfis de público, textos e chamadas.
Vive em código, não no banco, porque é copy de campanha na página que recebe o
tráfego pago — onde o LCP mais importa — e é revisada junto com o layout.

**Mídia.** `scripts/preparar-midia-landing.mjs` (idempotente, `--forcar` refaz)
gera três conjuntos:

- `public/palestrantes/*.webp` — 11 fotos extraídas com `pdfimages` do PDF de
  especialistas, cortadas em 4:5 com `sharp` (estratégia `attention`, que cai no
  rosto), sem EXIF. O casamento foto ↔ pessoa foi conferido **página a página**
  renderizando o PDF: a ordem das imagens embutidas segue a ordem do documento,
  e é isso que `ORDEM_PALESTRANTES` registra.
- `public/modulos/*.webp` — as 11 capas, reduzidas ao tamanho de card.
- `public/cortes/*.webp` — capas dos 5 cortes do canal, baixadas e guardadas
  local.

**Componentes** em `components/site/`: `Secao` (casca comum), `BotaoCTA`,
`icones-landing` (SVG de traço no lugar dos emoji do roteiro, que renderizam
diferente em cada sistema), `secoes-landing`, `especialistas`, `video-fachada`,
`cta-persistente`.

**Correção de atribuição institucional.** A landing antiga dizia "iniciativa da
Prefeitura e SEIM/Integra Rio · Oroborus". O roteiro é explícito: a **Oroborus
desenvolve**, com IVIG/COPPE/UFRJ e Fundação I²G; a **Prefeitura patrocina**, via
SEIM, no âmbito do Integra Rio.

## Decisões e o motivo

**Um único formulário, no fim.** Chegou a haver dois (hero e fim). Duas
instâncias idênticas eram repetição visual sem ganho, e o botão do hero ficava
incoerente: "Quero me inscrever" ao lado de um formulário, rolando 11.000 px até
outro igual. O roteiro pede **botão** na seção 1, não formulário. A barra fixa de
CTA mantém a inscrição a um toque durante toda a rolagem. O `RegistrationForm`
continua seguro para duas instâncias (ids por `useId`) e aceita
`mostrarTitulo={false}`, porque a seção que o contém já tem heading próprio —
dois `<h2>Faça sua inscrição</h2>` duplicavam a entrada no índice de headings.

**Fachada de vídeo, nunca embed direto.** `VideoFachada` só cria o `<iframe>`
depois do clique, no `youtube-nocookie.com`, com capa local. O motivo principal
não é peso: o embed do YouTube dispara cookie do Google no carregamento, o que
contradiria o `AvisoPrivacidade` da própria página. A capa é local pelo mesmo
motivo — pedir a thumb ao `i.ytimg.com` entregaria o IP de todo visitante antes
de qualquer consentimento.

**Cortes em 9:16.** São reels. O YouTube entrega capa 16:9 preenchendo as
laterais com o próprio conteúdo esticado (não com preto, então `trim()` não
resolve), o que gerava tarja. Recortamos a faixa central e o player também é
vertical: sem tarja, e o embed do Shorts preenche o quadro. Nos cards verticais o
título vive **fora** da imagem, como `figcaption`, porque sobreposto ele
atropelava o botão de play.

**Vídeo em destaque no hero.** `destaque: true` marca qual corte vai no hero;
mora no módulo de conteúdo porque é decisão de marketing, com teste garantindo
que existe exatamente um. Ele é excluído da grade da seção "Aprenda com
especialistas" para não repetir o mesmo reel na mesma página. Sem `priority`: o
LCP é a headline, e a imagem não deve disputar com ela.

**CTA fixo espera o aviso de privacidade.** Os dois são fixos no rodapé e o aviso
tem `z` maior — apareciam sobrepostos. A barra assina o mesmo store
(`lib/aviso-privacidade`) e só surge depois que o aviso é dispensado. A regra de
quando mostrar é função pura em `lib/site/cta-rolagem.ts`.

## O que foi verificado

Auditoria em Chromium headless a 1280, 768 e 390 px: nenhum estouro horizontal,
um único `h1`, zero saltos na hierarquia de headings, todas as imagens
carregando, nenhum erro de console, nenhuma resposta ≥ 400. Dois alvos de toque
abaixo de 24 px (WCAG 2.5.8) foram encontrados e corrigidos.

Suíte: 381 testes unitários, 8 E2E específicos da landing (`e2e/landing-rolagem.spec.ts`),
lint sem erros. O E2E prova, entre outras coisas, que **nenhuma requisição sai
para youtube/ytimg/googlevideo antes do clique**.

Peso: 29 KB comprimido no HTML. Altura: ~11.100 px no desktop, ~21.700 px no
mobile.

## Ordem das seções, e por quê

A ordem inicial era a do roteiro, seguida à risca. Foi reordenada pela leitura de
quem chega frio, num segundo passe:

| # | Seção | Papel |
| --- | --- | --- |
| 1 | `#inicio` | promessa, CTA e um corte em destaque |
| 2 | `#para-quem` | **"isso é para mim?"** — com os critérios do edital |
| 3 | `#como-funciona` | formato, ritmo e a declaração de participação |
| 4 | `#temas` | os 11 temas |
| 5 | `#aulas` | 4 cortes do canal como prova |
| 6 | `#especialistas` | quem ensina, com foto e cargo |
| 7 | `#por-que-participar` | benefício abstrato, depois do concreto |
| 8 | `#perguntas` | objeções + download do edital |
| 9 | `#sobre` | credibilidade institucional |
| 10 | `#inscricao` | faixa escura com o formulário |

O que mudou em relação ao roteiro, e o motivo:

- **"Para quem é" subiu da 7ª para a 2ª posição.** "Isso é para mim?" é a
  pergunta da primeira tela; enterrada na sétima seção, quem não se reconhece
  abandona antes de chegar nela.
- **"Sobre o projeto" desceu da 2ª para a 9ª.** Ocupava a tela mais valiosa
  depois do hero com texto institucional — fala do que a iniciativa é, não do que
  a pessoa ganha. Perto do rodapé institucional, credibilidade tem função.
- **"Uma formação gratuita" deixou de ser seção.** Era a quarta menção à
  gratuidade (headline, selo do hero, chamada final). O texto foi preservado
  dentro de `#sobre`.
- **"Chamada final" e "Inscrição" viraram uma seção.** Eram duas, empilhadas,
  fazendo o mesmo trabalho: a faixa escura com um CTA que rolava poucos pixels
  até o formulário logo abaixo. Agora a faixa contém o formulário.
- **Patrocinadores subiu para antes do formulário.** Logo institucional é sinal
  de confiança e vale quando a pessoa está decidindo, não depois de ela ter
  decidido.
- **O download do edital saiu do hero e foi para o FAQ.** No hero competia com o
  CTA principal e tirava a pessoa da página; é ação de quem quer checar
  legitimidade.

## Seções que não estavam no roteiro

**`#como-funciona`** — quatro cartões respondendo formato, material e avaliação,
fórum e assistente, e declaração de participação. Responde a objeção número um de
qualquer curso, que nem a landing antiga nem o roteiro respondiam. Só afirmações
verificáveis na plataforma.

**`#perguntas`** — seis perguntas em `<details>` nativo (acessível por teclado,
funciona sem JavaScript): é gratuito mesmo, por que o CPF, preciso de CNPJ, quem
pode se inscrever, tem certificado, como recebo o acesso. Respostas do edital e
do funcionamento real; nada inventado.

**Elegibilidade recuperada.** Os critérios do edital (15 a 65 anos, MEIs e
autônomos, moradores da Região Metropolitana do Rio) voltaram, em destaque na
seção `#para-quem`. Eram regressão em relação à landing antiga: sem eles a
campanha paga atrai quem não pode se inscrever, e a pessoa só descobre depois.
Há teste unitário e E2E travando isso.

**Declaração de participação recuperada**, em `#como-funciona` e no FAQ.

**Justificativa do CPF ao lado do campo** — o `Field` do `RegistrationForm`
ganhou a prop `ajuda`, ligada por `aria-describedby`.

## Melhorias que continuam em aberto

**Mobile de 27 para 15 telas.** Os 11 temas e os 11 especialistas passaram a
faixa de rolagem horizontal com `scroll-snap` até `lg`, e grade a partir de `lg`.

Por que **não** é carrossel: carrossel esconde. Nos dados públicos de clique em
carrossel a taxa fica perto de 1%, com a grande maioria no primeiro slide — o que
transformaria "11 especialistas" em três visíveis e oito invisíveis, matando a
prova social que a seção existe para dar. A faixa mantém os 11 no DOM, sem
`hidden` nem `aria-hidden`, com o card cortado na borda servindo de afordância, e
o contêiner recebe `tabIndex={0}` + `role="group"` rotulado para quem navega por
teclado. CSS puro: nenhum JavaScript, nenhum estado.

Medido: no celular as faixas rolam (`scrollWidth > clientWidth`), card de 248 px,
primeiro card encostando em `x=0` pela margem negativa; no desktop as duas viram
grade de três colunas e não rolam. A página caiu de 22.982 px para 12.537 px no
celular, sem alterar o desktop.

**Sem prova social acima da dobra.** Nada diz que outras pessoas já fizeram o
curso. Um número real ao lado dos selos do hero é o ponto de maior impacto — e o
dado existe (`Contador`, métricas de inscrição).

**Sem depoimento de aluno.** O feedback anônimo de disciplina (migração 0022)
vale mais que biografia de palestrante.

**Sem urgência.** `turmas.liberacao_em` está no banco e a página já lê turmas;
hoje o selo só diz "Inscrições abertas" quando a turma está liberada.

**Sem carga horária total.** "No seu ritmo" responde o formato, não o tamanho.
Precisa do número real, que não está no repo.

**Ritmo visual ainda repetitivo** em algumas passagens: sobretítulo, h2,
parágrafos, grade. Um bloco de respiro entre os dois grids consecutivos
(`#por-que-participar` e `#temas`) devolveria hierarquia.

## Pendências fora do código

- Registro DNS `teste.coworkingsocial.com.br` → tira a prévia da porta 8444.
- Cargo do José Pinto Monteiro: o documento da marketing diz "Presidente do CAMP
  Mangueira"; na transcrição da aula ele se apresenta como fundador e
  **vice-presidente**.
- Autorização de uso de imagem das 11 fotos.
- Retratos com corte e resolução ajustados: **Aurélio Murta** (barras pretas
  removidas), **Fábio Laje** (print do Instagram com interface removido),
  **Jorge Victor** (print do LinkedIn com "✕" e barras removidos), além de
  restauração de resolução via Nano Banana (Gemini) para **Maria da Penha**,
  **Renato Mansur** e **Jorge Bittencourt**. Todos os 11 palestrantes em
  proporção idêntica 4:5 (640×800) em `landing-material/palestrantes-ajustados/`.
- `scripts/baixar-aulas.sh` **desapareceu do repo**. Era ele que rodava o
  `yt-dlp` por proxy (o anti-bot do YouTube barra IP de VPS). Sem ele não há como
  transcrever as playlists, extrair frame de vídeo nem montar o reel próprio.
