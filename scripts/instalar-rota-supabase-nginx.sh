#!/usr/bin/env bash
# Adiciona a rota /supabase/ → Kong (127.0.0.1:8000) no site do nginx.
# O navegador dos alunos precisa alcançar auth/storage do stack self-hosted
# (verifyOtp do definir-senha); todo o resto do stack segue só em localhost.
# Idempotente: não duplica se a rota já existir. Faz backup, testa e recarrega.
set -euo pipefail

SITE="/etc/nginx/sites-enabled/coworkingsocial.com.br"

if grep -q "location /supabase/" "$SITE"; then
  echo "rota /supabase/ já existe — nada a fazer"
  exit 0
fi

# Backup FORA de sites-enabled — o nginx carrega tudo daquela pasta, e um
# .bak lá dentro vira config duplicada (derruba o nginx -t).
mkdir -p /etc/nginx/backups
cp "$SITE" "/etc/nginx/backups/$(basename "$SITE").bak-$(date +%F-%H%M)"

BLOCO='    # Supabase self-hosted (Kong em 127.0.0.1:8000). O navegador precisa\n    # alcancar auth/storage (verifyOtp do definir-senha), entao a API sai\n    # pela web SO por esta rota; o prefixo /supabase/ e removido no proxy.\n    location /supabase/ {\n        proxy_pass http://127.0.0.1:8000/;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_read_timeout 300s;\n        proxy_buffer_size 32k;\n        proxy_buffers 8 32k;\n        proxy_busy_buffers_size 64k;\n    }\n'

# Insere o bloco logo antes do "location / {" do server principal.
awk -v bloco="$BLOCO" '
  !feito && /^    location \/ \{/ { printf "%s\n", bloco; feito = 1 }
  { print }
' "$SITE" > "$SITE.novo" && mv "$SITE.novo" "$SITE"

nginx -t
systemctl reload nginx
echo "rota /supabase/ instalada e nginx recarregado"
