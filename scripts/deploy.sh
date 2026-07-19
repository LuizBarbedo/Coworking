#!/usr/bin/env bash
# Deploy atômico da produção (roda NA VPS, na raiz do repo).
#
# O problema que isso resolve: `next build` reescreve o .next que o servidor
# está servindo — quem carrega uma página durante o build recebe HTML
# apontando pra CSS/JS que já não existem (página sem estilo). Aqui o build
# vai pra um diretório novo e a troca acontece com o serviço parado (~2s).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== build (em .next-nova, produção segue no ar)"
rm -rf .next-nova
NEXT_DIST_DIR=.next-nova npm run build

echo "== troca atômica + restart (~2s fora do ar)"
systemctl stop coworking.service
rm -rf .next
mv .next-nova .next
systemctl start coworking.service

sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login)
if [ "$STATUS" = "200" ]; then
  echo "== deploy ok (login respondendo 200)"
else
  echo "== ATENÇÃO: /login respondeu $STATUS — verifique o serviço" >&2
  exit 1
fi
