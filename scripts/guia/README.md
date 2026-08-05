# Guia de operação da plataforma (PDF)

Gera o manual de treinamento da equipe com prints reais das telas.
Resultado: `docs/Guia-de-Operacao-Plataforma-CSMG.pdf`.

## Como regerar

Com a produção no ar em `127.0.0.1:3000`:

```bash
export GUIA_SAIDA=/caminho/de/trabalho/prints/     # opcional
node scripts/guia/capturar.mjs                     # tira todos os prints
node scripts/guia/capturar.mjs --only=12,14        # só algumas telas
node scripts/guia/gerar-pdf.mjs <guia.html> <saida.pdf>
node scripts/guia/verificar-limpeza.mjs            # confere que não sobrou rastro
```

`guia.html` é o texto do manual. Para renderizar, ele precisa estar na mesma
pasta que `prints/` e `logo-roda.svg` (copiado de `public/`).

## O que o capturar.mjs faz

1. Cria uma conta de equipe temporária (`e2e-guia-*@example.com`) e loga por ela.
2. Percorre as telas e **troca todo dado pessoal real por fictício direto no
   navegador** (nomes, e-mails, CPF, telefone e matrícula vêm do banco e são
   substituídos antes do print) — nenhum dado de aluno vai pro PDF.
3. Desenha as marcações numeradas em laranja e salva os JPEGs.
4. No fim apaga a conta temporária, o post de exemplo do fórum e os eventos
   que a própria conta gerou.
